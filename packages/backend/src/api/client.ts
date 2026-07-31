/**
 * Purpose: Export Hono's type-safe client factory for frontend use.
 */
import { hc } from "hono/client";

import type { ApiRoutesType } from "./index.ts";

export type ApiClient = ReturnType<typeof hc<ApiRoutesType>>;

export const createApiClient = (
    baseUrl: string,
    init?: Parameters<typeof hc<ApiRoutesType>>[1],
): ApiClient => hc<ApiRoutesType>(baseUrl, init);
