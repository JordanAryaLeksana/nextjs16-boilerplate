import axios from "axios";

// Configuration & Types
type AccessTokenGetter = () => string | null | undefined;
const apiBaseURL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";
let getAccessToken: AccessTokenGetter | null = null;

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
export function setAccessTokenGetter(getter: AccessTokenGetter | null) {
  if (typeof window === "undefined") {
    throw new Error("Token provider is browser-only.");
  }

  getAccessToken = getter;
}

// Request Interceptor
apiClient.interceptors.request.use((config) => {
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
  const clientCode = process.env.NEXT_PUBLIC_CLIENT_CODE;

  if (clientCode && !config.headers.has("X-Client-Code")) {
    config.headers.set("X-Client-Code", clientCode);
  }

  // Attach Bearer Token when available
  if (!config.headers.has("Authorization")) {
    const token = getAccessToken?.();

    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
  }

  return config;
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
