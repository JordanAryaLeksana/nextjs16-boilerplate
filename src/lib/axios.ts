import axios from "axios";

import { env } from "@/lib/env";

// Configuration & Types
type ApiAuth = {
  getAccessToken: () => Promise<string | null>;
  refreshAccessToken: () => Promise<string | null>;
};

// Without a backend URL, requests go to this app's own /api routes.
const apiBaseURL = env.NEXT_PUBLIC_API_BASE_URL ?? "/api";
let apiAuth: ApiAuth | null = null;

// Axios Instance
export const apiClient = axios.create({
  baseURL: apiBaseURL,
  allowAbsoluteUrls: false,
  headers: {
    Accept: "application/json",
  },
  timeout: 10_000,
  withCredentials: false,
});

// Access Token Management
export function setApiAuth(auth: ApiAuth | null) {
  if (typeof window === "undefined") {
    throw new Error("API auth is browser-only.");
  }

  apiAuth = auth;
}

// Request Interceptor
apiClient.interceptors.request.use(async (config) => {
  const url = config.url ?? "";

  // Validate trusted API destination
  if (
    config.baseURL !== apiBaseURL ||
    url !== url.trim() ||
    /^[a-z][a-z\d+.-]*:/i.test(url) ||
    url.startsWith("//") ||
    url.includes("\\")
  ) {
    throw new Error("Untrusted API destination.");
  }

  // Prevent path traversal and encoded separators
  const pathname = url.split(/[?#]/, 1)[0];

  for (const segment of pathname.split("/")) {
    let decoded: string;

    try {
      decoded = decodeURIComponent(segment);
    } catch {
      throw new Error("Invalid API path encoding.");
    }

    if (
      decoded === "." ||
      decoded === ".." ||
      decoded.includes("/") ||
      decoded.includes("\\")
    ) {
      throw new Error("Unsafe API path.");
    }
  }

  // Browser-only authentication
  if (typeof window === "undefined") {
    return config;
  }

  // Optional client identifier
  const clientCode = env.NEXT_PUBLIC_CLIENT_CODE;

  if (clientCode && !config.headers.has("X-Client-Code")) {
    config.headers.set("X-Client-Code", clientCode);
  }

  // Attach Bearer Token when available
  if (!config.headers.has("Authorization")) {
    // A session that cannot be loaded must not block public requests.
    const token = await apiAuth?.getAccessToken().catch(() => null);

    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
  }

  return config;
});

// Response Interceptor
// On 401, renew the access token once and repeat the request.
apiClient.interceptors.response.use(undefined, async (error: unknown) => {
  if (
    typeof window === "undefined" ||
    !apiAuth ||
    !axios.isAxiosError(error) ||
    error.response?.status !== 401 ||
    !error.config
  ) {
    throw error;
  }

  const token = await apiAuth.refreshAccessToken().catch(() => null);

  if (!token) {
    throw error;
  }

  error.config.headers.set("Authorization", `Bearer ${token}`);

  // Plain axios skips these interceptors, so a second 401 cannot loop.
  return axios.request(error.config);
});

// Error Utilities
export function getHttpErrorDetails(error: unknown) {
  if (axios.isAxiosError(error)) {
    return {
      status: error.response?.status ?? null,
      data: error.response?.data as unknown,
      code: error.code ?? null,
    };
  }

  return {
    status: null,
    data: null,
    code: null,
  };
}
