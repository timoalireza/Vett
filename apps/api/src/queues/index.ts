import { Queue } from "bullmq";
import IORedis from "ioredis";

import { env } from "../env.js";

const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

export const queues = {
  analysis: new Queue("analysis", {
    connection,
    defaultJobOptions: {
      removeOnComplete: 1000,
      removeOnFail: false
    }
  })
};

export type QueueName = keyof typeof queues;

