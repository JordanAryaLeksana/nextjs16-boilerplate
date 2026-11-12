import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import axios from "axios";
import { z } from "zod";

import { apiClient } from "@/lib/axios";
import {
  getQueryClient,
  type MutationConfig,
  type QueryConfig,
} from "@/lib/query-client";

// Types
export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  picture: string | null;
};

export type Session = {
  accessToken: string;
  user: User;
};

// Session Endpoints (src/app/api/auth/[action]/route.ts)
// The refresh token stays in an httpOnly cookie that only these endpoints
// read. The browser keeps the access token in memory, inside the session query.
const authClient = axios.create({ baseURL: "/api/auth", timeout: 10_000 });

// Get Session
let refreshRequest: Promise<Session | null> | null = null;

// Refresh tokens are single-use. The Web Lock keeps other tabs from refreshing
// at the same moment; a missing or rejected session resolves to null.
async function requestRefresh(): Promise<Session | null> {
  const post = () => authClient.post<Session>("/refresh");

  try {
    const { data } = await ("locks" in navigator
      ? navigator.locks.request("auth-refresh", post)
      : post());

    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return null;
    }

    throw error;
  }
}

// Callers in this tab share one request.
export function refreshSession(): Promise<Session | null> {
  if (!refreshRequest) {
    refreshRequest = requestRefresh().finally(() => {
      refreshRequest = null;
    });
  }

  return refreshRequest;
}

export function getSessionQueryOptions() {
  return queryOptions({
    queryKey: ["auth", "session"],
    queryFn: refreshSession,
    // Renewed by the 401 interceptor, not by refetching.
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

type UseSessionOptions = {
  queryConfig?: QueryConfig<typeof getSessionQueryOptions>;
};

export function useSession({ queryConfig }: UseSessionOptions = {}) {
  return useQuery({
    ...getSessionQueryOptions(),
    ...queryConfig,
  });
}

// API Auth (registered with apiClient in src/app/providers.tsx)
export function getAccessToken() {
  return getQueryClient().getQueryData(getSessionQueryOptions().queryKey)
    ?.accessToken;
}

export async function refreshAccessToken() {
  const session = await refreshSession();

  getQueryClient().setQueryData(getSessionQueryOptions().queryKey, session);

  return session?.accessToken ?? null;
}

// Login
export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export async function login(payload: LoginInput): Promise<Session> {
  const { data } = await authClient.post<Session>("/login", payload);

  return data;
}

type UseLoginOptions = {
  mutationConfig?: MutationConfig<typeof login>;
};

export function useLogin({ mutationConfig }: UseLoginOptions = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig ?? {};

  return useMutation({
    ...restConfig,
    mutationFn: login,
    onSuccess: async (...args) => {
      queryClient.setQueryData(getSessionQueryOptions().queryKey, args[0]);
      await onSuccess?.(...args);
    },
  });
}

// OAuth Login
// The backend runs the OAuth 2.0 flow itself: the browser opens this URL, and
// the backend sends it back to /oauth-success with the result in the URL
// fragment (#refresh_token=... or #error=...).
export function getOAuthLoginUrl(provider: "google") {
  return apiClient.getUri({ url: `/auth/${provider}` });
}

// Only the refresh token is passed on. The server exchanges it for a new pair,
// which also invalidates the copy that appeared in the URL.
export async function completeOAuth(fragment: string): Promise<Session> {
  const params = new URLSearchParams(fragment.replace(/^#/, ""));
  const refreshToken = params.get("refresh_token");

  if (!refreshToken) {
    throw new Error(params.get("error") ?? "missing_token");
  }

  const { data } = await authClient.post<Session>("/oauth", { refreshToken });

  return data;
}

type UseCompleteOAuthOptions = {
  mutationConfig?: MutationConfig<typeof completeOAuth>;
};

export function useCompleteOAuth({
  mutationConfig,
}: UseCompleteOAuthOptions = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig ?? {};

  return useMutation({
    ...restConfig,
    mutationFn: completeOAuth,
    onSuccess: async (...args) => {
      queryClient.setQueryData(getSessionQueryOptions().queryKey, args[0]);
      await onSuccess?.(...args);
    },
  });
}

// Logout
export async function logout(): Promise<void> {
  const accessToken = getAccessToken();

  await authClient.post("/logout", null, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
}

type UseLogoutOptions = {
  mutationConfig?: MutationConfig<typeof logout>;
};

export function useLogout({ mutationConfig }: UseLogoutOptions = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig ?? {};

  return useMutation({
    ...restConfig,
    mutationFn: logout,
    onSuccess: async (...args) => {
      queryClient.setQueryData(getSessionQueryOptions().queryKey, null);

      // Drop cached responses that belonged to the signed-out user.
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== "auth",
      });

      await onSuccess?.(...args);
    },
  });
}
