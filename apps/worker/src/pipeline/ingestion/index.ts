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

  for (const attachment of attachments) {
    if (attachment.kind === "link") {
      processedLinks += 1;
      const result = await fetchLinkAttachment(attachment);
      if ("error" in result) {
        failed += 1;
        records.push({
          attachment,
          truncated: false,
          error: result.error
        });
        continue;
      }

      successful += 1;
      totalCharacters += result.text.length;
      textFragments.push(result.text);

      if (result.warnings) {
        warnings.push(...result.warnings);
      }

      let combinedWordCount = result.wordCount;
      let combinedTruncated = result.truncated;
      const recordSegments: string[] = [result.text];

      if (result.imageUrl) {
        const imageResult = await describeImageAttachment({
          kind: "image",
          url: result.imageUrl,
          mediaType: "image/jpeg"
        });

        if ("error" in imageResult) {
          warnings.push(`Image description failed for ${result.imageUrl}: ${imageResult.error}`);
        } else {
          totalCharacters += imageResult.text.length;
          textFragments.push(`Image summary: ${imageResult.text}`);
          combinedWordCount += imageResult.wordCount;
          combinedTruncated = combinedTruncated || imageResult.truncated;
          recordSegments.push(`Image summary: ${imageResult.text}`);
        }
      }

      records.push({
        attachment,
        text: recordSegments.join(SEPARATOR),
        truncated: combinedTruncated,
        wordCount: combinedWordCount,
        quality: result.quality
      });
    } else if (attachment.kind === "image") {
      processedImages += 1;
      const result = await describeImageAttachment(attachment);
      if ("error" in result) {
        failed += 1;
        warnings.push(`Image ingestion failed for ${attachment.url}: ${result.error}`);
        records.push({
          attachment,
          truncated: false,
          error: result.error
        });
        continue;
      }

      successful += 1;
      totalCharacters += result.text.length;
      textFragments.push(result.text);
      records.push({
        attachment,
        text: result.text,
        truncated: result.truncated,
        wordCount: result.wordCount
      });
    } else if (attachment.kind === "document") {
      processedDocuments += 1;
      failed += 1;
      warnings.push(`Document ingestion not yet implemented for ${attachment.url}`);
      records.push({
        attachment,
        truncated: false,
        error: "Document ingestion not yet implemented."
      });
    } else {
      failed += 1;
      warnings.push(`Unknown attachment kind ${(attachment as { kind?: string }).kind}`);
      records.push({
        attachment,
        truncated: false,
        error: "Unknown attachment kind."
      });
    }
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


