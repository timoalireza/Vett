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

export async function ingestAttachments(attachments: AnalysisAttachmentInput[]): Promise<AttachmentIngestionOutput> {
  if (!attachments || attachments.length === 0) {
    return { combinedText: "", records: [] };
  }

  const records: IngestionRecord[] = [];
  const textFragments: string[] = [];
  let processedLinks = 0;
  let processedImages = 0;
  let processedDocuments = 0;
  let successful = 0;
  let failed = 0;
  let totalCharacters = 0;
  const warnings: string[] = [];

  // OPTIMIZATION: Process all attachments in parallel
  const attachmentResults = await Promise.all(
    attachments.map(async (attachment) => {
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
        if (result.imageUrl) {
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
          warnings: attachmentWarnings,
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
    totalAttachments: attachments.length,
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


