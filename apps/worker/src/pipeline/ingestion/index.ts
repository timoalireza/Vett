import { AnalysisAttachmentInput } from "@vett/shared";

import type { IngestionMetadata, IngestionRecord } from "../types.js";
import { fetchLinkAttachment } from "./link-fetcher.js";
import { describeImageAttachment } from "./image.js";

export interface AttachmentIngestionOutput {
  combinedText: string;
  records: IngestionRecord[];
  metadata?: IngestionMetadata;
}

const SEPARATOR = "\n\n";

function canonicalizeUrlForDedup(raw: string): string {
  const input = (raw ?? "").trim();
  if (!input) return input;
  try {
    const u = new URL(input);
    u.hash = "";
    u.hostname = u.hostname.toLowerCase();
    if (u.hostname.startsWith("www.")) u.hostname = u.hostname.slice(4);

    // Drop common tracking params (keep everything else).
    const dropKeys = new Set([
      "fbclid",
      "gclid",
      "mc_cid",
      "mc_eid",
      "ref",
      "ref_src",
      "igsh",
      "igshid",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content"
    ]);
    for (const key of Array.from(u.searchParams.keys())) {
      const k = key.toLowerCase();
      if (k.startsWith("utm_") || dropKeys.has(k)) {
        u.searchParams.delete(key);
      }
    }

    if (u.pathname.length > 1) {
      u.pathname = u.pathname.replace(/\/+$/, "");
    }

    return u.toString();
  } catch {
    return input;
  }
}

function dedupeAttachments(
  attachments: AnalysisAttachmentInput[]
): { attachments: AnalysisAttachmentInput[]; dropped: number } {
  const seen = new Set<string>();
  const out: AnalysisAttachmentInput[] = [];
  let dropped = 0;

  for (const att of attachments) {
    const url = att.kind === "link" ? canonicalizeUrlForDedup(att.url) : (att.url ?? "").trim();
    const key = `${att.kind}:${url}`;
    if (!url) {
      dropped += 1;
      continue;
    }
    if (seen.has(key)) {
      dropped += 1;
      continue;
    }
    seen.add(key);
    out.push({ ...att, url });
  }

  return { attachments: out, dropped };
}

export async function ingestAttachments(attachments: AnalysisAttachmentInput[]): Promise<AttachmentIngestionOutput> {
  if (!attachments || attachments.length === 0) {
    return { combinedText: "", records: [] };
  }

  const { attachments: uniqueAttachments, dropped: droppedDuplicates } = dedupeAttachments(attachments);

  const records: IngestionRecord[] = [];
  const textFragments: string[] = [];
  let processedLinks = 0;
  let processedImages = 0;
  let processedDocuments = 0;
  let successful = 0;
  let failed = 0;
  let totalCharacters = 0;
  const warnings: string[] = [];
  if (droppedDuplicates > 0) {
    warnings.push(
      `Dropped ${droppedDuplicates} duplicate/invalid attachment(s) to avoid redundant ingestion work.`
    );
  }

  // OPTIMIZATION: Process all attachments in parallel
  const attachmentResults = await Promise.all(
    uniqueAttachments.map(async (attachment) => {
      if (attachment.kind === "link") {
        const result = await fetchLinkAttachment(attachment);
        if ("error" in result) {
          return {
            attachment,
            record: {
              attachment,
              truncated: false,
              error: result.error
            } as IngestionRecord,
            text: null,
            warnings: [],
            stats: { links: 1, images: 0, documents: 0, successful: 0, failed: 1, characters: 0 }
          };
        }

        let combinedWordCount = result.wordCount;
        let combinedTruncated = result.truncated;
        const recordSegments: string[] = [result.text];
        const attachmentWarnings: string[] = [];

        if (result.warnings) {
          attachmentWarnings.push(...result.warnings);
        }

        // Process image URL if present (sequential within this attachment)
        // This is expensive (vision model). Keep it off unless it’s likely to materially improve extraction quality.
        const imageSummaryMode = (process.env.LINK_IMAGE_SUMMARY_MODE ?? "auto").toLowerCase();
        const shouldSummarizeImage =
          imageSummaryMode === "always" ||
          (imageSummaryMode !== "never" &&
            (result.wordCount < 20 ||
              result.quality?.level === "poor" ||
              result.quality?.level === "insufficient"));

        if (result.imageUrl && shouldSummarizeImage) {
          const imageResult = await describeImageAttachment({
            kind: "image",
            url: result.imageUrl,
            mediaType: "image/jpeg"
          });

          if ("error" in imageResult) {
            attachmentWarnings.push(`Image description failed for ${result.imageUrl}: ${imageResult.error}`);
          } else {
            const imageText = `Image summary: ${imageResult.text}`;
            recordSegments.push(imageText);
            combinedWordCount += imageResult.wordCount;
            combinedTruncated = combinedTruncated || imageResult.truncated;
            return {
              attachment,
              record: {
                attachment,
                text: recordSegments.join(SEPARATOR),
                truncated: combinedTruncated,
                wordCount: combinedWordCount,
                quality: result.quality
              } as IngestionRecord,
              text: `${result.text}${SEPARATOR}${imageText}`,
              warnings: attachmentWarnings,
              stats: { links: 1, images: 1, documents: 0, successful: 1, failed: 0, characters: result.text.length + imageResult.text.length }
            };
          }
        }

        return {
          attachment,
          record: {
            attachment,
            text: recordSegments.join(SEPARATOR),
            truncated: combinedTruncated,
            wordCount: combinedWordCount,
            quality: result.quality
          } as IngestionRecord,
          text: result.text,
          warnings:
            result.imageUrl && !shouldSummarizeImage
              ? [...attachmentWarnings, "Skipped link preview image summary to reduce latency."]
              : attachmentWarnings,
          stats: { links: 1, images: 0, documents: 0, successful: 1, failed: 0, characters: result.text.length }
        };
      } else if (attachment.kind === "image") {
        const result = await describeImageAttachment(attachment);
        if ("error" in result) {
          return {
            attachment,
            record: {
              attachment,
              truncated: false,
              error: result.error
            } as IngestionRecord,
            text: null,
            warnings: [`Image ingestion failed for ${attachment.url}: ${result.error}`],
            stats: { links: 0, images: 1, documents: 0, successful: 0, failed: 1, characters: 0 }
          };
        }

        return {
          attachment,
          record: {
            attachment,
            text: result.text,
            truncated: result.truncated,
            wordCount: result.wordCount
          } as IngestionRecord,
          text: result.text,
          warnings: [],
          stats: { links: 0, images: 1, documents: 0, successful: 1, failed: 0, characters: result.text.length }
        };
      } else if (attachment.kind === "document") {
        return {
          attachment,
          record: {
            attachment,
            truncated: false,
            error: "Document ingestion not yet implemented."
          } as IngestionRecord,
          text: null,
          warnings: [`Document ingestion not yet implemented for ${attachment.url}`],
          stats: { links: 0, images: 0, documents: 1, successful: 0, failed: 1, characters: 0 }
        };
      } else {
        return {
          attachment,
          record: {
            attachment,
            truncated: false,
            error: "Unknown attachment kind."
          } as IngestionRecord,
          text: null,
          warnings: [`Unknown attachment kind ${(attachment as { kind?: string }).kind}`],
          stats: { links: 0, images: 0, documents: 0, successful: 0, failed: 1, characters: 0 }
        };
      }
    })
  );

  // Aggregate results
  for (const result of attachmentResults) {
    records.push(result.record);
    if (result.text) {
      textFragments.push(result.text);
    }
    warnings.push(...result.warnings);
    processedLinks += result.stats.links;
    processedImages += result.stats.images;
    processedDocuments += result.stats.documents;
    successful += result.stats.successful;
    failed += result.stats.failed;
    totalCharacters += result.stats.characters;
  }

  const combinedText = textFragments.join(SEPARATOR);

  if (combinedText.length > 0) {
    console.info(
      `[ingestion] Combined ${successful} attachment texts (links=${processedLinks}) totalling ${combinedText.length} characters.`
    );
  }

  const metadata: IngestionMetadata = {
    totalAttachments: uniqueAttachments.length,
    processedLinks,
    processedImages,
    processedDocuments,
    successful,
    failed,
    totalCharacters,
    warnings: warnings.length > 0 ? warnings : undefined
  };

  return { combinedText, records, metadata };
}


