"use client";

import { useEffect, useState } from "react";

import type { JobSearchResponse } from "@/lib/jobs/types";

const memory = new Map<string, JobSearchResponse>();

/**
 * Shared client fetch for `/api/jobs`. Discover and the dashboard ticker
 * both render from this — same route, same cache, no second data source.
 */
export function useJobSearch(queryString: string, retry = 0) {
  const requestKey = `${retry}:${queryString}`;

  const [result, setResult] = useState<{
    key: string;
    data: JobSearchResponse | null;
    error: string | null;
  } | null>(() => {
    const cached = memory.get(queryString);
    return cached
      ? { key: requestKey, data: cached, error: null }
      : null;
  });

  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      try {
        const response = await fetch(`/api/jobs?${queryString}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(body?.error ?? `Search failed (${response.status})`);
        }

        const payload = (await response.json()) as JobSearchResponse;
        memory.set(queryString, payload);
        setResult({ key: requestKey, data: payload, error: null });
      } catch (cause) {
        if (controller.signal.aborted) return;
        setResult({
          key: requestKey,
          data: memory.get(queryString) ?? null,
          error:
            cause instanceof Error
              ? cause.message
              : "Could not reach the job board.",
        });
      }
    };

    void run();

    return () => controller.abort();
  }, [queryString, requestKey]);

  const loading = result?.key !== requestKey && !memory.get(queryString);

  return {
    data: result?.data ?? memory.get(queryString) ?? null,
    error: result?.key === requestKey ? (result.error ?? null) : null,
    loading,
  };
}
