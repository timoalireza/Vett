---
title: "Vett Architecture and Implementation Plan"
status: "Draft"
last_updated: "2025-11-12"
---

## Overview

Vett is a cross-platform credibility analysis platform consisting of:

- `apps/mobile`: Expo React Native client for iOS/Android.
- `apps/api`: Fastify GraphQL API and orchestration services.
- `apps/worker`: BullMQ-driven background processors.
- `packages/shared`: Reusable TypeScript utilities, schema definitions, prompt templates.
- Managed services: PostgreSQL + pgvector, Redis, Pinecone, AWS S3/CloudFront, monitoring stack.

This document details the implementation plan across phases, key milestones, and technical considerations.

## Guiding Principles

- **Modularity**: Topic analyzers and retrieval adapters pluggable via interface contracts.
- **Observability-first**: Structured logging, tracing, metrics from day one.
- **Security & Compliance**: OAuth 2.0, end-to-end encryption of user data, GDPR support.
- **Scalability**: Queue-based processing, horizontal scaling for API/worker nodes.
- **LLM Transparency**: Persisted reasoning chains, user feedback loop for RLHF.

## Phase Breakdown

### Phase 0 – Foundations

- Business goals & KPIs documented.
- API licensing agreements secured (Brave, Serper, Pinecone, etc.).
- Data compliance checklist completed with legal counsel.

### Phase 1 – Architecture & Tooling

- Initialize mono-repo (`pnpm` workspaces).
- Configure shared TypeScript config, ESLint/Prettier, Husky hooks, commitlint.
- Set up GitHub Actions skeleton: lint, type-check, test.
- Deliverable: baseline repo with CI green.

### Phase 2 – Backend Scaffolding

- Fastify server with Apollo GraphQL.
- Clerk (or Firebase) auth integration for REST/GraphQL contexts.
- Database layer using Drizzle ORM targeting PostgreSQL with pgvector extension.
- Initial schema: `users`, `analyses`, `claims`, `sources`, `collections`, `feedback`, `explanation_steps`.
- Base resolvers/services for health checks, user profile, analysis submission (stub).
- Deliverable: API runs locally with seeded database and sample GraphQL queries.

### Phase 3 – AI & Retrieval Pipeline

#### Components

- **Content Ingestion**: 
  - Text extraction (OpenAI Whisper, Google Vision OCR).
  - Media upload to S3 via pre-signed URLs.
- **Topic Classification**:
  - Zero-shot classifier (OpenAI GPT-5 or Hugging Face) with caching in Redis.
- **Claim Extraction**:
  - Prompt-driven claim splitter; evaluation harness with labelled dataset.
- **Retrieval Orchestrator**:
  - Adapter pattern to integrate: Brave, Serper, Snopes, Google Fact Check, PubMed, Semantic Scholar, WHO, IMF, Sensity, etc.
  - Rate limiting and exponential backoff per provider.
- **Reasoning Chain**:
  - LangChain (or custom) pipeline combining evidence, computing Vett Score, bias, confidence, generating explanation chain.
- **Output Formatter**:
  - JSON schema persisted in database; GraphQL types for mobile client.

#### Milestones

- MVP pipeline for text-only content with Brave + Google Fact Check.
- Add topic-specific branches (Political, Health, News, Opinion, Image/Video).
- Implement evaluation suite measuring precision/recall, latency, cost.

### Phase 4 – Persistence & Analytics

- Implement caching of claims in Pinecone (pgvector fallback).
- Enable GDPR deletion workflows.
- Instrument Segment/Mixpanel events for key flows.
- Deliverable: analytics dashboards; compliance scripts.

### Phase 5 – Worker Services

- Create `apps/worker`: BullMQ consumers handling extraction, retrieval, reasoning, post-processing.
- Task lifecycle: enqueue → dedupe → process → persist → notify user.
- Scheduling tasks for dataset refresh, cache invalidation.
- Deliverable: monitored queue system with retry/dead-letter strategies.

### Phase 6 – Mobile App Scaffolding

- Expo project setup with TypeScript, React Navigation, Zustand (or Redux Toolkit).
- Global theming (color palette, typography), design tokens.
- Screens: Onboarding, Home (input options), Analysis Results, Collections, Profile, Settings.
- Deliverable: static navigation prototype matching design spec.

### Phase 7 – Core User Flow

- Implement API integration for content submission, polling analysis status, retrieving historical reports.
- Real-time updates via polling or WebSocket/GraphQL subscriptions.
- Shareable report card, collections management, notifications via OneSignal.
- Deliverable: end-to-end flow from content paste to score display.

### Phase 8 – Topic Modules & Visualizations

- Political bias slider, Health correlation chart, News consensus summary, Opinion context overlay, Image provenance timeline.
- Lottie animations for score ring, transitions.
- Deliverable: UX parity with blueprint.

### Phase 9 – Community & RLHF

- Feedback (Agree/Disagree) capture, contributor tiers, transparency mode.
- Pipeline to feed feedback into RLHF dataset and monitor drift.
- Deliverable: feedback dashboards, moderation safeguards.

### Phase 10 – Quality & Testing

- Expand automated test coverage (unit, integration, contract).
- Load testing (k6) for API and worker throughput.
- Security audits, pen-test remediation.
- Deliverable: go-live checklist complete.

### Phase 11 – Infrastructure & Operations

- Terraform/CDK scripts for AWS: VPC, ECS/Fargate, RDS, Redis, S3, CloudFront, CloudWatch, Secrets Manager.
- CI/CD pipeline: GitHub Actions → ECS deploys, Expo EAS builds.
- Observability stack: Datadog (logs/metrics/traces), PagerDuty integration.
- Deliverable: staging and production environments deployable on demand.

### Phase 12 – Launch & Iteration

- App Store/Play Store submissions, marketing site, onboarding content.
- Monitor KPIs, release cadence, feedback-driven roadmap.
- Deliverable: public launch readiness.

## Data Flow Summary

1. Mobile client submits content URI/media → API → storage + queue job.
2. Worker pipeline performs extraction, classification, claim splitting.
3. Retrieval orchestrator gathers evidence via adapters (with caching).
4. Reasoning chain synthesizes score, bias, explanation; stores results.
5. API exposes analysis summary via GraphQL; mobile updates UI.
6. User feedback recorded → RLHF training dataset.

## Security & Compliance Checklist

- OAuth 2.0 with Clerk/Firebase; MFA optional.
- Data encryption: TLS in transit, KMS at rest, secrets in AWS Secrets Manager.
- PII minimization, consent logging, age gating where required.
- GDPR support: right to access/delete, data portability.
- Audit logging for administrative actions and critical operations.

## Monitoring & Alerting

- Key metrics: analysis success rate, latency, cost per analysis, API error rate, queue depth, Pinecone/LLM usage.
- Alerts: on-call rotation, runbooks for incident response, synthetic health checks.
- Dashboards: real-time pipeline metrics, topic analyzer distribution, feedback sentiment.

## Risks & Mitigations

- **LLM hallucination**: enforce evidence grounding, confidence thresholds, human-in-the-loop feedback.
- **API quotas**: aggressive caching, fallback data sources, batch requests.
- **Latency**: progressive results (initial summary, later detailed), asynchronous notifications.
- **Compliance drift**: scheduled audits, automated policy checks.
- **Abuse & adversarial content**: content moderation filter, anomaly detection.

## Next Actions

1. Initialize monorepo tooling (Phase 1).
2. Draft API schema contracts, ERD diagrams (Phase 2 prerequisites).
3. Prepare evaluation dataset for AI pipeline benchmarking.


