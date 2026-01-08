export const schema = `
  type HealthCheck {
    status: String!
    timestamp: String!
  }

  type AnalysisSummary {
    id: ID!
    score: Int
    verdict: String
    confidence: Float
    bias: String
    topic: String
    status: String!
    createdAt: String!
    title: String
    summary: String
    recommendation: String
    backgroundContext: String
    rawInput: String
    complexity: String
    hasWatermark: Boolean!
    claims: [Claim!]!
    sources: [AnalysisSource!]!
    explanationSteps: [ExplanationStep!]!
    attachments: [AnalysisAttachment!]!
    ingestionMeta: IngestionMetadata
    ingestionRecords: [IngestionRecord!]!
    classificationMeta: ClassificationMeta
    claimExtractionMeta: ClaimExtractionMeta
    reasonerMeta: ReasonerMeta
    epistemic: EpistemicResult
  }

  # Epistemic Pipeline Result (Graded Evaluator)
  # This is the new primary scoring system
  type EpistemicResult {
    version: String!
    finalScore: Int!
    scoreBand: String!
    scoreBandDescription: String!
    penaltiesApplied: [EpistemicPenalty!]!
    evidenceSummary: String!
    confidenceInterval: EpistemicConfidenceInterval
    explanationText: String!
    keyReasons: [String!]!
    pipelineVersion: String!
    processedAt: String!
    totalProcessingTimeMs: Int!
  }

  type EpistemicPenalty {
    name: String!
    weight: Int!
    rationale: String!
    severity: EpistemicPenaltySeverity!
  }

  enum EpistemicPenaltySeverity {
    LOW
    MEDIUM
    HIGH
  }

  type EpistemicConfidenceInterval {
    low: Int!
    high: Int!
  }

  type Claim {
    id: ID!
    text: String!
    extractionConfidence: Float
    verdict: String
    confidence: Float
    createdAt: String!
  }

  type AnalysisSource {
    id: ID!
    provider: String!
    title: String!
    url: String!
    reliability: Float
    summary: String
    createdAt: String!
    evaluation: SourceEvaluation
  }

  type ExplanationStep {
    id: ID!
    claimId: ID
    description: String!
    supportingSourceIds: [String!]
    confidence: Float
    createdAt: String!
  }

  type ClassificationMeta {
    model: String!
    confidence: Float
    rationale: String
    fallbackUsed: Boolean!
  }

  type ClaimExtractionMeta {
    model: String!
    totalClaims: Int!
    usedFallback: Boolean!
    warnings: [String!]
  }

  type ReasonerMeta {
    model: String!
    confidence: Float
    fallbackUsed: Boolean!
    rationale: String
  }

  type SourceEvaluation {
    reliability: Float
    relevance: Float
    assessment: String
  }

  type AnalysisAttachment {
    id: ID!
    kind: String!
    url: String!
    mediaType: String
    title: String
    summary: String
    altText: String
    caption: String
    createdAt: String!
  }

  type IngestionMetadata {
    totalAttachments: Int!
    processedLinks: Int!
    processedImages: Int!
    processedDocuments: Int!
    successful: Int!
    failed: Int!
    totalCharacters: Int!
    warnings: [String!]
  }

  type IngestionRecord {
    attachment: AnalysisAttachment
    wordCount: Int
    truncated: Boolean!
    error: String
    quality: IngestionQuality
  }

  type IngestionQuality {
    level: IngestionQualityLevel!
    score: Float!
    reasons: [String!]
    recommendation: IngestionRecommendation
    message: String
  }

  enum IngestionQualityLevel {
    EXCELLENT
    GOOD
    FAIR
    POOR
    INSUFFICIENT
  }

  enum IngestionRecommendation {
    SCREENSHOT
    API_KEY
    NONE
  }

  enum AnalysisAttachmentKind {
    LINK
    IMAGE
    DOCUMENT
  }

  input AnalysisAttachmentInput {
    kind: AnalysisAttachmentKind!
    url: String!
    mediaType: String
    title: String
    summary: String
    altText: String
    caption: String
  }

  input SubmitAnalysisInput {
    contentUri: String
    text: String
    mediaType: String!
    topicHint: String
    attachments: [AnalysisAttachmentInput!]
  }

  type SubmitAnalysisPayload {
    analysisId: ID!
    status: String!
  }

  type SubscriptionInfo {
    plan: SubscriptionPlan!
    status: SubscriptionStatus!
    billingCycle: BillingCycle!
    currentPeriodStart: String!
    currentPeriodEnd: String!
    cancelAtPeriodEnd: Boolean!
    limits: PlanLimits!
    prices: PlanPrices!
    usage: UsageInfo!
  }

  type PlanLimits {
    maxAnalysesPerMonth: Int
    hasWatermark: Boolean!
    historyRetentionDays: Int
    hasPriorityProcessing: Boolean!
    hasAdvancedBiasAnalysis: Boolean!
    hasExtendedSummaries: Boolean!
    hasCrossPlatformSync: Boolean!
    hasCustomAlerts: Boolean!
    maxSources: Int!
    maxDailyChatMessages: Int
    hasVettChat: Boolean!
  }

  type PlanPrices {
    monthly: Float!
    annual: Float!
  }

  type UsageInfo {
    analysesCount: Int!
    maxAnalyses: Int
    periodStart: String!
    periodEnd: String!
    hasUnlimited: Boolean!
  }

  enum SubscriptionPlan {
    FREE
    PLUS
    PRO
  }

  enum SubscriptionStatus {
    ACTIVE
    CANCELLED
    PAST_DUE
    TRIALING
  }

  enum BillingCycle {
    MONTHLY
    ANNUAL
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  type AnalysisEdge {
    node: AnalysisSummary!
    cursor: String!
  }

  type AnalysisConnection {
    edges: [AnalysisEdge!]!
    pageInfo: PageInfo!
    totalCount: Int
  }


  type Feedback {
    id: ID!
    analysisId: ID!
    userId: ID
    isAgree: Boolean!
    comment: String
    createdAt: String!
  }

  input SubmitFeedbackInput {
    analysisId: ID!
    isAgree: Boolean!
    comment: String
  }

  type SubmitFeedbackPayload {
    feedback: Feedback!
  }

  input VettAIChatInput {
    message: String!
    analysisId: ID
  }

  type ChatUsageInfo {
    dailyCount: Int!
    maxDaily: Int
    remaining: Int
  }

  type VettAIChatPayload {
    response: String!
    citations: [String!]!
    chatUsage: ChatUsageInfo!
  }

  type DeleteAnalysisPayload {
    success: Boolean!
  }

  enum PrivacyRequestType {
    DATA_EXPORT
    DATA_DELETION
  }

  enum PrivacyRequestStatus {
    PENDING
    COMPLETED
    CANCELLED
  }

  type PrivacyRequest {
    id: ID!
    type: PrivacyRequestType!
    status: PrivacyRequestStatus!
    note: String
    createdAt: String!
    updatedAt: String!
  }

  type PrivacyRequestPayload {
    success: Boolean!
    request: PrivacyRequest
    error: String
  }

  type DeleteAccountPayload {
    success: Boolean!
    error: String
  }

  type SocialAccount {
    id: ID!
    platform: String!
    platformUserId: String!
    linkedAt: String
    createdAt: String!
  }

  type GenerateInstagramVerificationCodePayload {
    success: Boolean!
    verificationCode: String!
    error: String
  }

  type LinkInstagramAccountPayload {
    success: Boolean!
    verificationCode: String!
    error: String
  }

  type UnlinkInstagramAccountPayload {
    success: Boolean!
    error: String
  }

  type SyncSubscriptionPayload {
    success: Boolean!
    subscription: SubscriptionInfo
    error: String
  }

  input RealtimeVerificationInput {
    claim: String!
    context: String
  }

  enum VerificationVerdict {
    VERIFIED
    PARTIALLY_VERIFIED
    UNVERIFIED
    FALSE
    NEEDS_CONTEXT
  }

  type RealtimeVerificationPayload {
    summary: String!
    verdict: VerificationVerdict!
    confidence: Int!
    citations: [String!]!
    reasoning: String!
  }

  type Query {
    health: HealthCheck!
    analysis(id: ID!): AnalysisSummary
    analyses(
      first: Int
      after: String
      last: Int
      before: String
    ): AnalysisConnection!
    subscription: SubscriptionInfo!
    usage: UsageInfo!
    chatUsage: ChatUsageInfo!
    feedback(analysisId: ID!): Feedback
    instagramAccount: SocialAccount
    linkedSocialAccounts: [SocialAccount!]!
  }

  type Mutation {
    submitAnalysis(input: SubmitAnalysisInput!): SubmitAnalysisPayload!
    submitFeedback(input: SubmitFeedbackInput!): SubmitFeedbackPayload!
    chatWithVettAI(input: VettAIChatInput!): VettAIChatPayload!
    verifyClaimRealtime(input: RealtimeVerificationInput!): RealtimeVerificationPayload!
    deleteAnalysis(id: ID!): DeleteAnalysisPayload!
    requestDataExport(note: String): PrivacyRequestPayload!
    requestDataDeletion(note: String): PrivacyRequestPayload!
    deleteAccount: DeleteAccountPayload!
    generateInstagramVerificationCode: GenerateInstagramVerificationCodePayload!
    linkInstagramAccount(verificationCode: String!): LinkInstagramAccountPayload!
    unlinkInstagramAccount: UnlinkInstagramAccountPayload!
    syncSubscription: SyncSubscriptionPayload!
  }
`;

