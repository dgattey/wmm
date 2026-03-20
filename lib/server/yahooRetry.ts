const YAHOO_RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = process.env.NODE_ENV === "test" ? 0 : 250;

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getNumericErrorCode(error: unknown): number | null {
  const record = error as Record<string, unknown> | null;
  const response = record?.response as Record<string, unknown> | undefined;
  const candidates = [
    record?.code,
    record?.status,
    record?.statusCode,
    response?.status,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
    }
    if (typeof candidate === "string") {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return null;
}

function isRetryableYahooError(error: unknown): boolean {
  if (getNumericErrorCode(error) === 429) return true;
  return error instanceof Error && /too many requests/i.test(error.message);
}

export async function withYahooRetry<T>(
  label: string,
  operation: () => Promise<T>
): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryableYahooError(error) || attempt >= YAHOO_RETRY_ATTEMPTS - 1) {
        throw error;
      }

      const delayMs = RETRY_BASE_DELAY_MS * 2 ** attempt;
      console.warn(`${label} hit Yahoo rate limits, retrying in ${delayMs}ms`, error);
      await sleep(delayMs);
      attempt += 1;
    }
  }
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;

      try {
        results[index] = { status: "fulfilled", value: await worker(items[index] as T) };
      } catch (error) {
        results[index] = { status: "rejected", reason: error };
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker())
  );

  return results;
}
