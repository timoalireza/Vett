# Quality Assessment for Social Media Link Extraction

## Overview

The worker pipeline now assesses the quality of content extracted from social media links (X/Twitter, Instagram, Threads). When extraction quality is insufficient, the system recommends users upload a screenshot for better analysis accuracy.

## How It Works

### 1. Quality Assessment

When a social media link is processed, the system evaluates:

- **Word Count**: Minimum thresholds for different quality levels
- **Word Diversity**: Ratio of unique words to total words
- **Information Density**: Percentage of meaningful (non-whitespace, non-punctuation) characters
- **Low-Information Patterns**: Detection of repetitive or meaningless content
- **Metadata Completeness**: Presence of author, media references, etc.
- **Truncation**: Whether content was cut off

### 2. Quality Levels

- **Excellent** (score ≥ 0.8): High-quality extraction, sufficient for analysis
- **Good** (score ≥ 0.6): Good quality, minor improvements possible
- **Fair** (score ≥ 0.4): Acceptable but may benefit from API keys or screenshots
- **Poor** (score ≥ 0.2): Low quality, screenshot recommended
- **Insufficient** (score < 0.2): Very low quality, screenshot required

### 3. Recommendations

Based on quality assessment, the system provides:

- **`screenshot`**: Upload a screenshot of the post for better results
- **`api_key`**: Configure API credentials for better extraction (optional)
- **`none`**: No action needed

## API Response Structure

### GraphQL Query

```graphql
query GetAnalysis($id: ID!) {
  analysis(id: $id) {
    id
    ingestionRecords {
      attachment {
        url
        kind
      }
      wordCount
      truncated
      error
      quality {
        level
        score
        reasons
        recommendation
        message
      }
    }
  }
}
```

### Response Example

```json
{
  "data": {
    "analysis": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "ingestionRecords": [
        {
          "attachment": {
            "url": "https://x.com/username/status/1234567890",
            "kind": "LINK"
          },
          "wordCount": 5,
          "truncated": false,
          "error": null,
          "quality": {
            "level": "INSUFFICIENT",
            "score": 0.15,
            "reasons": [
              "Very low word count (5 words)",
              "Low word diversity (40% unique)",
              "Missing author information"
            ],
            "recommendation": "SCREENSHOT",
            "message": "The extracted content from this x link is insufficient for accurate analysis. Please upload a screenshot of the post for better results."
          }
        }
      ]
    }
  }
}
```

## Frontend Integration

### Checking Quality

After submitting an analysis, poll the analysis status and check `ingestionRecords`:

```typescript
interface IngestionRecord {
  attachment?: {
    url: string;
    kind: string;
  };
  wordCount?: number;
  truncated: boolean;
  error?: string;
  quality?: {
    level: "EXCELLENT" | "GOOD" | "FAIR" | "POOR" | "INSUFFICIENT";
    score: number;
    reasons?: string[];
    recommendation?: "SCREENSHOT" | "API_KEY" | "NONE";
    message?: string;
  };
}

// Check if screenshot is recommended
function needsScreenshot(record: IngestionRecord): boolean {
  return (
    record.quality?.recommendation === "SCREENSHOT" ||
    record.quality?.level === "INSUFFICIENT" ||
    record.quality?.level === "POOR"
  );
}

// Display quality message to user
function getQualityMessage(record: IngestionRecord): string | null {
  return record.quality?.message || null;
}
```

### User Flow

1. **User submits social media link**
2. **Analysis starts processing**
3. **When analysis completes, check `ingestionRecords[].quality`**
4. **If `recommendation === "SCREENSHOT"`:**
   - Display message: `quality.message`
   - Show "Upload Screenshot" button
   - Allow user to upload screenshot and re-submit
5. **If `recommendation === "API_KEY"`:**
   - Optionally show message about configuring API keys (admin/advanced users)
   - Still allow analysis to proceed

### Example UI Component

```tsx
function QualityAlert({ record }: { record: IngestionRecord }) {
  if (!record.quality || record.quality.recommendation === "NONE") {
    return null;
  }

  const { quality } = record;

  if (quality.recommendation === "SCREENSHOT") {
    return (
      <Alert severity="warning">
        <AlertTitle>Better Results Available</AlertTitle>
        <p>{quality.message}</p>
        <Button onClick={handleUploadScreenshot}>
          Upload Screenshot
        </Button>
      </Alert>
    );
  }

  if (quality.recommendation === "API_KEY") {
    return (
      <Alert severity="info">
        <AlertTitle>Quality Notice</AlertTitle>
        <p>{quality.message}</p>
      </Alert>
    );
  }

  return null;
}
```

## Quality Assessment Details

### Scoring Factors

| Factor | Weight | Description |
|--------|--------|-------------|
| Word Count | 0.4 | Very low word count significantly reduces score |
| Word Diversity | 0.2 | Low unique word ratio indicates repetitive content |
| Information Density | 0.15 | Low meaningful character ratio reduces score |
| Low-Info Patterns | 0.3 | Detects patterns like repeated list items |
| Truncation | 0.1 | Content cut-off reduces quality |
| Missing Metadata | 0.1 | Missing author/media info reduces score |

### Thresholds

- **Excellent**: ≥50 words, ≥0.8 score
- **Good**: ≥30 words, ≥0.6 score
- **Fair**: ≥15 words, ≥0.4 score
- **Poor**: ≥8 words, ≥0.2 score
- **Insufficient**: <8 words or <0.2 score

## Benefits

1. **Transparency**: Users understand why analysis quality might be limited
2. **Actionable**: Clear recommendations on how to improve results
3. **User Experience**: Proactive guidance instead of silent failures
4. **Quality Control**: Ensures analysis is based on sufficient information

## Future Enhancements

- Real-time quality assessment during extraction
- Progressive enhancement: start with link, upgrade to screenshot if needed
- Quality-based confidence adjustments in final verdict
- A/B testing different extraction methods

