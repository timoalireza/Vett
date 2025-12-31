import { env } from "../env.js";

export const loggerOptions = {
  level: env.LOG_LEVEL,
  // Log enough request metadata to identify periodic traffic sources in production,
  // without logging sensitive headers (e.g. Authorization).
  serializers: {
    req: (req: any) => ({
      method: req.method,
      url: req.url,
      hostname: req.hostname,
      remoteAddress: req.remoteAddress,
      remotePort: req.remotePort,
      headers: {
        "user-agent": req.headers?.["user-agent"],
        // Most common client IP forwarding headers (behind Railway/Cloudflare/etc.)
        "x-forwarded-for": req.headers?.["x-forwarded-for"],
        "x-real-ip": req.headers?.["x-real-ip"],
        "cf-connecting-ip": req.headers?.["cf-connecting-ip"]
      }
    }),
    res: (res: any) => ({
      statusCode: res.statusCode
    })
  },
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard"
          }
        }
      : undefined
} as const;

