import { Queue, QueueEvents, Worker } from "bullmq";
import IORedis from "ioredis";
import pino from "pino";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";

import { analysisJobPayloadSchema } from "@vett/shared";
import * as schema from "../../api/src/db/schema.js";
import { runAnalysisPipeline } from "./pipeline/index.js";
import { env } from "./env.js";

const logger = pino({
  level: env.NODE_ENV === "development" ? "debug" : "info"
});

const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});
const pool = new Pool({
  connectionString: env.DATABASE_URL
});
const db = drizzle(pool, { schema });

export const queues = {
  analysis: new Queue("analysis", { connection })
};

const analysisQueueEvents = new QueueEvents("analysis", { connection });
analysisQueueEvents.waitUntilReady().catch((err) => {
  logger.error({ err }, "Failed to initialize queue events");
});
analysisQueueEvents.on("completed", ({ jobId }) => {
  logger.debug({ jobId }, "Queue event: job completed");
});
analysisQueueEvents.on("failed", ({ jobId, failedReason }) => {
  logger.error({ jobId, failedReason }, "Queue event: job failed");
});
analysisQueueEvents.on("error", (err) => {
  logger.error({ err }, "Queue events errored");
});

export const worker = new Worker(
  "analysis",
  async (job) => {
    const payload = analysisJobPayloadSchema.parse(job.data);
    logger.info({ jobId: job.id, name: job.name, payload }, "Processing analysis job");

    await db
      .update(schema.analyses)
      .set({
        status: "PROCESSING",
        updatedAt: new Date()
      })
      .where(eq(schema.analyses.id, payload.analysisId));

    try {
      const pipelineResult = await runAnalysisPipeline(payload);

      await db.transaction(async (tx) => {
        const analysisUpdate = {
          status: "COMPLETED" as const,
          topic: pipelineResult.topic,
          bias: pipelineResult.bias,
          score: pipelineResult.score,
          verdict: pipelineResult.verdict,
          confidence: pipelineResult.confidence.toFixed(2),
          summary: pipelineResult.summary,
          recommendation: pipelineResult.recommendation,
          resultJson: JSON.stringify(pipelineResult.resultJson),
          imageUrl: pipelineResult.imageUrl ?? null,
          imageAttribution: pipelineResult.imageAttribution
            ? JSON.stringify(pipelineResult.imageAttribution)
            : null,
          updatedAt: new Date()
        };

        await tx
          .update(schema.analyses)
          .set(analysisUpdate)
          .where(eq(schema.analyses.id, payload.analysisId));

        const insertedSources = await Promise.all(
          pipelineResult.sources.map(async (source) => {
            const [row] = await tx
              .insert(schema.sources)
              .values({
                provider: source.provider,
                title: source.title,
                url: source.url,
                reliability: source.reliability.toFixed(2)
              })
              .returning({ id: schema.sources.id });

            return {
              id: row.id,
              key: source.key,
              reliability: source.reliability
            };
          })
        );

        const sourceMap = new Map(insertedSources.map((entry) => [entry.key, entry]));

        const insertedClaims = await Promise.all(
          pipelineResult.claims.map(async (claim) => {
            const [row] = await tx
              .insert(schema.claims)
              .values({
                analysisId: payload.analysisId,
                text: claim.text,
                extractionConfidence: claim.extractionConfidence.toFixed(2),
                verdict: claim.verdict,
                confidence: claim.confidence.toFixed(2)
              })
              .returning({ id: schema.claims.id });

            return {
              id: row.id,
              claim,
              sourceKeys: claim.sourceKeys
            };
          })
        );

        const analysisSourceValues = insertedClaims.flatMap(({ id: claimId, sourceKeys }) => {
          return sourceKeys
            .map((key) => {
              const sourceRecord = sourceMap.get(key);
              if (!sourceRecord) return null;
              return {
                analysisId: payload.analysisId,
                sourceId: sourceRecord.id,
                claimId,
                relevance: sourceRecord.reliability.toFixed(2)
              };
            })
            .filter((value): value is NonNullable<typeof value> => Boolean(value));
        });

        if (analysisSourceValues.length > 0) {
          await tx.insert(schema.analysisSources).values(analysisSourceValues);
        }

        if (pipelineResult.explanationSteps.length > 0) {
          await tx.insert(schema.explanationSteps).values(
            pipelineResult.explanationSteps.map((step) => ({
              analysisId: payload.analysisId,
              claimId:
                insertedClaims.find((item) => item.claim.id === step.id)?.id ??
                insertedClaims[0]?.id ??
                null,
              description: step.description,
              supportingSourceIds: step.sourceKeys.join(","),
              confidence: step.confidence.toFixed(2)
            }))
          );
        }
      });
    } catch (error) {
      logger.error({ jobId: job.id, err: error }, "Analysis pipeline failed");
      await db
        .update(schema.analyses)
        .set({
          status: "FAILED",
          updatedAt: new Date(),
          summary: "The automatic analysis pipeline encountered an error."
        })
        .where(eq(schema.analyses.id, payload.analysisId));
      throw error;
    }
  },
  { connection }
);

worker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "Analysis job completed");
});

worker.on("failed", (job, err) => {
  if (job?.data?.analysisId) {
    db
      .update(schema.analyses)
      .set({
        status: "FAILED",
        updatedAt: new Date()
      })
      .where(eq(schema.analyses.id, job.data.analysisId))
      .catch((error) => logger.error({ error }, "Failed to update analysis status to FAILED"));
  }

  logger.error({ jobId: job?.id, err }, "Analysis job failed");
});

process.on("SIGINT", async () => {
  logger.info("Shutting down worker...");
  await worker.close();
  await queues.analysis.close();
  await analysisQueueEvents.close();
  await pool.end();
  await connection.quit();
  process.exit(0);
});

