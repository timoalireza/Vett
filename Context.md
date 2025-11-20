---
title: "Vett – Comprehensive App Blueprint"
---

## Core Mission

Vett analyzes any piece of content—from social media posts to scientific claims—and generates an adaptive validity score, contextual breakdown, and bias/accuracy profile powered by AI and verified data sources.

## 1. App Overview

- Real-time fact-checking, source validation, and contextual scoring across text, video, image, and audio.
- Dynamic analysis model that adapts to detected topic:
  - **Political**: bias detection (left, center, right) plus stance comparison.
  - **Health/Science**: correlation statistics with peer-reviewed research references.
  - **General News**: source aggregation with summary comparison.
  - **Visual/Video**: image provenance plus deepfake/manipulation detection.

## 2. User Flow

### Onboarding

- Minimal walkthrough: “Paste or share anything.” → “Get context, bias, and truth.” → “See how information connects.”
- Sign-in with Google/Apple; optional anonymous mode.
- Permissions for clipboard, media import, and browser sharing.

### Home Screen

- Input box: “Paste a link, image, or post.”
- Quick buttons: Instagram, TikTok, Twitter/X, YouTube, News Link, Upload Screenshot.
- Suggested recent analyses carousel for retention.

### Analysis Flow

1. **Extraction Layer**
   - Extracts text, captions, audio transcripts, and image OCR.
   - Performs zero-shot topic classification.
   - Identifies claims and factual statements.
2. **Topic-Specific Modules**
   - Selects sub-pipeline based on detected topic (see section 4).
3. **Result Presentation**
   - `Vett Score` (0–100) with color coding:
     - Green: Verified
     - Yellow: Partial/Mixed
     - Red: False/Misleading
   - Confidence bar plus summary card.
   - Tabs: Overview, Claims, Sources, AI Reasoning, Bias/Stats, Community Input.
   - Shareable report card with dynamic ring animation.
4. **Save / Share**
   - Add to `Collections`.
   - Export card or link; share to Instagram stories (“Vetted by AI — 82% Valid”).

## 3. Core AI Workflow

1. **Content Parsing**
   - NLP parses text from captions, transcripts, visible overlays.
   - Vision model (CLIP or Gemini-Vision) detects visual context clues.
2. **Topic Classification**
   - Uses OpenAI GPT-5 or Hugging Face zero-shot models to label content.
   - Activates the relevant sub-analyzer.
3. **Fact Extraction**
   - GPT-based claim splitter isolates factual statements.
   - Claims are vectorized and sent to the retrieval layer for verification.
4. **Retrieval (Cross-Verification)**
   - Fuses multiple APIs:
     - General: Brave Search API, Serper.dev.
     - Fact-checking: Google Fact Check Tools API, Snopes API, Poynter IFCN dataset, PolitiFact API, FactCheck.org RSS.
     - Science/Health: PubMed API, Semantic Scholar API, WHO/CDC Open Data, ClinicalTrials.gov.
     - Finance/Economics: IMF, World Bank, OECD APIs.
     - Political Bias: AllSides API, MediaBiasFactCheck DB.
     - Image/Video: Sensity.ai Deepfake API, Hive Moderation API, Google Reverse Image Search, TinEye API.
5. **Reasoning**
   - LLM synthesizes findings, calculates confidence, and generates a reasoning trace.
   - Stores a compact “explanation chain” for transparency.
6. **Output**
   - Structured JSON response:
```json
{
  "score": 82,
  "verdict": "Mostly Accurate",
  "reasoning": "The post correctly references a 2023 WHO report, though lacks updated context.",
  "sources": [
    {"title": "WHO Obesity Report 2023", "url": "...", "reliability": 0.94},
    {"title": "Reuters Health Summary", "url": "...", "reliability": 0.87}
  ],
  "bias": "Center-left",
  "confidence": 0.81,
  "timestamp": "2025-11-12T12:00:00Z"
}
```

## 4. Topic-Specific Pipelines

### Political Content

- Detects ideological bias via AllSides Bias API and LLM tone analysis.
- Generates “Bias Spectrum” indicator (Left–Center–Right).
- Compares claims against fact-checking sources and policy databases.
- Visual: horizontal slider with blue-to-red gradient.

### Health / Science

- Validates claims against PubMed, WHO, and Semantic Scholar.
- Displays `Correlation Stats`, e.g., “Green tea reduces risk of stroke — 2021 meta-analysis r = –0.22 (n = 11,000).”
- Flags pseudoscience or insufficient evidence.

### General News

- Aggregates 3–5 related articles from neutral outlets (Reuters, AP, BBC).
- Summarizes framing differences.
- Outputs a consensus summary.

### Opinion / Social Commentary

- Detects subjective language and marks as Opinion.
- Provides `Context Layer` instead of a punitive score.
- Surfaces related perspectives.

### Image / Video Posts

- Executes reverse image search.
- Checks for reuse, Photoshop edits, or AI synthesis.
- Verifies timestamps and locations when metadata is available.

## 5. Tech Stack

- **Frontend**
  - React Native (Expo)
  - TailwindCSS, React Native Paper
  - Zustand or Redux Toolkit for state
  - Reanimated 3, Lottie for animations
  - OneSignal SDK for notifications
  - React Native Share + deep links
- **Backend**
  - Node.js (Fastify) with TypeScript
  - PostgreSQL + pgvector for semantic search
  - AWS S3 for media storage; CloudFront CDN
  - Authentication via Clerk.dev or Firebase Auth
  - BullMQ + Redis for task queueing
  - Pinecone for vector search
  - GraphQL API with Apollo Server
  - Brave Search API, Serper.dev for external search
  - OpenAI GPT-5 API + Anthropic Claude 3.5 for ensemble reasoning
  - Sensity API, Hive AI Vision for media verification
  - AllSides API, MediaBias DB, Google Fact Check Tools API, PubMed API for bias/fact data
- **Security / Compliance**
  - HTTPS, OAuth 2.0
  - End-to-end encryption for user data
  - GDPR-compliant handling
  - Anonymized model reasoning logs

## 6. Design & UX

- Minimalist, verification-first aesthetic with generous breathing room and deliberate typography hierarchy.
- Color palette (ensure 4.5:1 contrast against adjacent surfaces):
  - Base: Carbon `#353535`
  - Primary: Deep Teal `#3C6E71`
  - Accent: Steel `#284B63`
  - Canvas: Mist `#D9D9D9`
  - Copy: Pure White `#FFFFFF`
- Text handling:
  - Use SF Pro / Inter with consistent letter spacing.
  - Disable hyphenation and prevent mid-word wrapping via `lineBreakStrategyIOS="hangul-word"` and `textBreakStrategy="simple"` on Android.
  - Truncate long strings with ellipses rather than clipping them across components.
- Surface system:
  - Apply frosted cards (blur + alpha) on top of the charcoal gradient; never pair identical foreground/background colors.
  - Buttons should use the teal or white fill with contrasting text (teal text on white, white text on teal).
- Layout:
  - Tab bar: Analyze • Collections • Profile.
  - Results presented as stacked cards with swipe-up expansion into bias chart and evidence tree.

## 7. Community & Gamification

- Users can `Agree` / `Disagree` with AI verdicts for RLHF data.
- Contributor tiers: Analyst, Researcher, Verifier.
- Optional `Transparency Mode` revealing reasoning tokens and data sources.

## 8. Future Integrations

- Browser extension overlay (Chrome, Safari, Firefox) with live `Vett Score`.
- API access for journalists, researchers, universities.
- Messaging app integrations (WhatsApp, Telegram).
- AR mode for live camera scanning of posters/headlines.
- Educational partnerships for digital literacy.

## 9. Example Use Case

1. User pastes a TikTok diet link.
2. NLP detects Health topic; extracts speech and captions.
3. Correlation check via PubMed API finds weak support.
4. Output: “Vett Score 64 – Partially True.”
5. Details: “Claim: Green tea reduces belly fat. Evidence: weak correlation (r = –0.12, n = 40). Sources: PubMed ID 34567812, Reuters Health Review.”

## 10. Report Output Schema

```json
{
  "id": "vett_20251112_001",
  "type": "health",
  "score": 64,
  "bias": null,
  "confidence": 0.78,
  "summary": "Claim partially supported by small-sample 2021 study.",
  "recommendation": "Treat as low-confidence correlation.",
  "sources": [
    {"title": "PubMed Study ID 34567812", "reliability": 0.91},
    {"title": "Reuters Health Review 2022", "reliability": 0.86}
  ],
  "media_check": {"ai_detected": false, "manipulation_score": 0.03},
  "created_at": "2025-11-12T12:00:00Z"
}
```

## 11. Developer Notes

- Modular architecture for pluggable `Topic Analyzer` components.
- Vector-store memory to cache previously verified claims.
- Feedback-driven fine-tuning via RLHF.
- Implement rate limiting and caching to respect API quotas.

## 12. Goal

Position Vett as the AI credibility layer of the internet—plug-and-play validation for anything humans share.

