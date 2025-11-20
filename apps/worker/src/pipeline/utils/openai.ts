function logParseWarning(context: string, details: Record<string, unknown>): void {
  // eslint-disable-next-line no-console
  console.warn(`[openai] ${context}: unable to parse JSON output`, details);
}

export async function parseJsonContent<T>(content: unknown, context: string): Promise<T | null> {
  if (!content || typeof content !== "object" || content === null) {
    logParseWarning(context, { reason: "content_not_object" });
    return null;
  }

  const payload = content as Record<string, unknown>;

  // SDK v4 exposes a .json() helper when using json_schema
  const jsonCandidate = payload.json as unknown;
  if (typeof jsonCandidate === "function") {
    try {
      const result = await (jsonCandidate as () => Promise<unknown>)();
      return (result ?? null) as T | null;
    } catch (error) {
      logParseWarning(context, {
        reason: "json_function_failed",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  if (jsonCandidate && typeof jsonCandidate === "object") {
    return jsonCandidate as T;
  }

  const textCandidate = payload.text;
  if (typeof textCandidate === "string" && textCandidate.trim().length > 0) {
    try {
      return JSON.parse(textCandidate) as T;
    } catch (error) {
      logParseWarning(context, {
        reason: "text_parse_failed",
        error: error instanceof Error ? error.message : String(error),
        preview: textCandidate.slice(0, 240)
      });
      return null;
    }
  }

  logParseWarning(context, {
    reason: "no_json_found",
    availableKeys: Object.keys(payload),
    descriptor: describeResponseOutput(content)
  });

  return null;
}

export function describeResponseOutput(output: unknown): Record<string, unknown> {
  if (!output || typeof output !== "object") {
    return { reason: "output_not_object" };
  }

  const base = output as Record<string, unknown>;
  const keys = Object.keys(base);
  const content = Array.isArray((base as { content?: unknown }).content)
    ? (base as { content: unknown[] }).content.map((entry, index) => {
        if (!entry || typeof entry !== "object") {
          return { index, type: typeof entry };
        }
        const entryRecord = entry as Record<string, unknown>;
        return {
          index,
          keys: Object.keys(entryRecord),
          hasJsonFunction: typeof entryRecord.json === "function",
          textLength:
            typeof entryRecord.text === "string" ? (entryRecord.text as string).length : undefined
        };
      })
    : undefined;

  return { keys, content };
}


