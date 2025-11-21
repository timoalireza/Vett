/**
 * Pagination utilities for GraphQL queries
 */

export interface PaginationArgs {
  first?: number | null;
  after?: string | null;
  last?: number | null;
  before?: string | null;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

export interface PaginatedResult<T> {
  edges: Array<{
    node: T;
    cursor: string;
  }>;
  pageInfo: PageInfo;
  totalCount?: number;
}

/**
 * Parse cursor (base64 encoded JSON)
 */
export function parseCursor(cursor: string | null | undefined): Record<string, unknown> | null {
  if (!cursor) {
    return null;
  }

  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
}

/**
 * Create cursor from data
 */
export function createCursor(data: Record<string, unknown>): string {
  const json = JSON.stringify(data);
  return Buffer.from(json).toString("base64");
}

/**
 * Validate pagination arguments
 */
export function validatePaginationArgs(args: PaginationArgs): {
  limit: number;
  offset: number;
  cursor: Record<string, unknown> | null;
  direction: "forward" | "backward";
} {
  const DEFAULT_LIMIT = 20;
  const MAX_LIMIT = 100;

  // Determine pagination direction
  const isForward = args.first !== null && args.first !== undefined;
  const isBackward = args.last !== null && args.last !== undefined;

  if (isForward && isBackward) {
    throw new Error("Cannot use both 'first' and 'last' arguments");
  }

  if (!isForward && !isBackward) {
    // Default to forward pagination
    return {
      limit: DEFAULT_LIMIT,
      offset: 0,
      cursor: parseCursor(args.after),
      direction: "forward"
    };
  }

  const limit = isForward ? args.first : args.last;
  if (limit !== null && limit !== undefined && (limit < 0 || limit > MAX_LIMIT)) {
    throw new Error(`Limit must be between 0 and ${MAX_LIMIT}`);
  }

  const cursor = isForward ? parseCursor(args.after) : parseCursor(args.before);

  return {
    limit: limit ?? DEFAULT_LIMIT,
    offset: 0, // Cursor-based pagination doesn't use offset
    cursor,
    direction: isForward ? "forward" : "backward"
  };
}

/**
 * Create page info from results
 */
export function createPageInfo<T extends { id: string }>(
  items: T[],
  hasMore: boolean,
  direction: "forward" | "backward"
): PageInfo {
  if (items.length === 0) {
    return {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null
    };
  }

  const startCursor = createCursor({ id: items[0]!.id });
  const endCursor = createCursor({ id: items[items.length - 1]!.id });

  if (direction === "forward") {
    return {
      hasNextPage: hasMore,
      hasPreviousPage: !!items[0],
      startCursor,
      endCursor
    };
  } else {
    return {
      hasNextPage: !!items[items.length - 1],
      hasPreviousPage: hasMore,
      startCursor,
      endCursor
    };
  }
}

