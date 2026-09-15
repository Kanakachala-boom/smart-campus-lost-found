/**
 * Mock transport helper.
 *
 * ALL mock data lives under src/services/mock/. No component imports from
 * this folder directly. Service modules branch on USE_MOCK and call these
 * helpers, so deleting this folder once FastAPI is live only touches services.
 */

import { ApiError } from "../api";

const DEFAULT_DELAY_MS = 350;

export function delay(ms = DEFAULT_DELAY_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Resolves with a deep copy so callers cannot mutate the fixtures. */
export async function mockResponse(data, ms = DEFAULT_DELAY_MS) {
  await delay(ms);
  return structuredClone(data);
}

/** Rejects with a realistic ApiError, for exercising error states. */
export async function mockError(message = "Something went wrong.", status = 500) {
  await delay();
  throw new ApiError(message, { status });
}
