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
// Both tokens stay in an httpOnly cookie that only these endpoints read. The
// browser keeps a copy of the access token in memory, inside the session query.
const authClient = axios.create({ baseURL: "/api/auth", timeout: 10_000 });

// Refresh tokens are single-use, so session requests must not overlap. The Web
// Lock queues them across tabs. A missing or rejected session resolves to null.
async function requestSession(
  path: "/session" | "/refresh",
): Promise<Session | null> {
  const post = () => authClient.post<Session>(path);

  try {
    const { data } = await ("locks" in navigator
      ? navigator.locks.request("auth-session", post)
      : post());

    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return null;
    }

    throw error;
  }
}

// Cross-Tab Sync
// Other tabs reload when the session changes here, so no tab keeps working as
// a user who has signed out or been replaced.
let sessionChannel: BroadcastChannel | null = null;

function getSessionChannel() {
  sessionChannel ??= new BroadcastChannel("auth-session");

  return sessionChannel;
}

export function watchSessionChanges() {
  getSessionChannel().onmessage = () => window.location.reload();
}

// Get Session
export function getSessionQueryOptions() {
  return queryOptions({
    queryKey: ["auth", "session"],
    queryFn: () => requestSession("/session"),
    // Renewed by the 401 interceptor, not by refetching.
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
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
// Waits for the session on the first request, so requests made while the page
// loads carry a token instead of failing with 401.
export async function getAccessToken() {
  const session = await getQueryClient().ensureQueryData(
    getSessionQueryOptions(),
  );

  return session?.accessToken ?? null;
}

// Called when the backend rejects the access token. Requests that fail
// together share one renewal.
let renewal: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  if (!renewal) {
    renewal = requestSession("/refresh")
      .then((session) => {
        getQueryClient().setQueryData(
          getSessionQueryOptions().queryKey,
          session,
        );

        return session?.accessToken ?? null;
      })
      .finally(() => {
        renewal = null;
      });
  }

  return renewal;
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
      getSessionChannel().postMessage("changed");

      await onSuccess?.(...args);
    },
  });
}

// OAuth Login
// The backend runs the OAuth 2.0 flow itself: the browser opens its login URL,
// and the backend sends the browser back to /oauth-success with the result in
// the URL fragment (#refresh_token=... or #error=...).
const OAUTH_STARTED_KEY = "oauth-started";

// Marks this tab as having started the login. Without the mark, a link to
// /oauth-success carrying someone else's token would sign the visitor in to
// that person's account.
export function startOAuthLogin(provider: "google") {
  sessionStorage.setItem(OAUTH_STARTED_KEY, "1");

  window.location.assign(apiClient.getUri({ url: `/auth/${provider}` }));
}

// Only the refresh token is passed on, and the server exchanges it for a new
// pair straight away, so the refresh token that appeared in the URL stops
// working. The access token from the URL is never used or stored.
export async function completeOAuth(fragment: string): Promise<Session> {
  const started = sessionStorage.getItem(OAUTH_STARTED_KEY);

  sessionStorage.removeItem(OAUTH_STARTED_KEY);

  if (!started) {
    throw new Error("oauth_not_started");
  }

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
      getSessionChannel().postMessage("changed");

      await onSuccess?.(...args);
    },
  });
}

// Logout
// Queued behind any session request in flight, so a renewal that is still
// running cannot bring the session back afterwards.
export async function logout(): Promise<void> {
  const post = () => authClient.post("/logout");

  await ("locks" in navigator
    ? navigator.locks.request("auth-session", post)
    : post());
}

type UseLogoutOptions = {
  mutationConfig?: MutationConfig<typeof logout>;
};

export function useLogout({ mutationConfig }: UseLogoutOptions = {}) {
  const { onSuccess, ...restConfig } = mutationConfig ?? {};

  return useMutation({
    ...restConfig,
    mutationFn: logout,
    onSuccess: async (...args) => {
      getSessionChannel().postMessage("changed");

      await onSuccess?.(...args);

      // A full page load, not a client navigation: it clears the token, every
      // cached response, and form values that Next.js keeps for visited pages.
      window.location.replace("/login");
    },
  });
}
