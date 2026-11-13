import { cookies, headers } from "next/headers";

import { apiClient, getHttpErrorDetails } from "@/lib/axios";

import type { Session, User } from "./api";

// Server only: used by src/app/api/auth/[action]/route.ts and src/proxy.ts.

// Session Cookie
// Holds both tokens and a snapshot of the user. It is httpOnly, so JavaScript
// in the browser can never read it.
export const SESSION_COOKIE = "session";

// Keep in line with the lifetime of the backend's refresh token.
const SESSION_MAX_AGE = 60 * 60 * 24;

// An access token with less than this left is renewed instead of reused.
const ACCESS_TOKEN_MARGIN = 60 * 1000;

type StoredSession = {
  accessToken: string;
  accessExpiresAt: number;
  refreshToken: string;
  user: User;
};

async function readSession(): Promise<StoredSession | null> {
  const store = await cookies();
  const value = store.get(SESSION_COOKIE)?.value;

  if (!value) {
    return null;
  }

  try {
    const stored = JSON.parse(value) as Partial<StoredSession> | null;

    if (typeof stored?.refreshToken === "string" && stored.user) {
      return {
        // A cookie without a usable access token is renewed on first use.
        accessToken: stored.accessToken ?? "",
        accessExpiresAt: stored.accessExpiresAt ?? 0,
        refreshToken: stored.refreshToken,
        user: stored.user,
      };
    }
  } catch {
    // Not JSON: dropped below.
  }

  // A cookie this code cannot read would keep the proxy treating the visitor
  // as signed in, so remove it.
  store.delete(SESSION_COOKIE);

  return null;
}

async function startSession(stored: StoredSession): Promise<Session> {
  (await cookies()).set(SESSION_COOKIE, JSON.stringify(stored), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return { accessToken: stored.accessToken, user: stored.user };
}

async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

// Backend Contract
// Everything in this section is specific to one backend. For another backend,
// change the paths, payloads, and response mapping here and nothing else.
//
//   POST /auth/login    { email, password }
//                       -> { message, data: user fields + token pair }
//   POST /auth/refresh  Authorization: Bearer <refresh token>
//                       -> { message, data: token pair }, old token is consumed
//   POST /auth/logout   Authorization: Bearer <access token>, { refresh_token }
//                       -> 204
//
// The access token is a JWT carrying { sub, email, role, exp }.
type Envelope<T> = {
  message: string;
  data: T;
};

type TokenPair = {
  access_token: string;
  refresh_token: string;
};

type LoginData = TokenPair & {
  id: number;
  name: string;
  email: string;
  role: string;
  picture: string;
};

function readClaims(accessToken: string) {
  return JSON.parse(
    Buffer.from(accessToken.split(".")[1], "base64url").toString(),
  ) as { sub: number; email: string; role: string; exp: number };
}

// Passes the visitor's IP on, so backend rate limits count per visitor instead
// of per Next.js server. The backend must trust this server as a proxy.
//
// Deployment requirement: Next.js keeps an X-Forwarded-For header sent by the
// client, so this app must sit behind a reverse proxy that sets or appends the
// real address. Exposed directly, a client could fake its IP and dodge the
// backend's rate limits.
async function forwardedHeaders() {
  const forwardedFor = (await headers()).get("x-forwarded-for");

  return forwardedFor ? { "X-Forwarded-For": forwardedFor } : {};
}

async function backendLogin(input: {
  email: string;
  password: string;
}): Promise<StoredSession> {
  const { data } = await apiClient.post<Envelope<LoginData>>(
    "/auth/login",
    input,
    { headers: await forwardedHeaders() },
  );
  const { id, name, email, role, picture, access_token, refresh_token } =
    data.data;

  return {
    accessToken: access_token,
    accessExpiresAt: readClaims(access_token).exp * 1000,
    refreshToken: refresh_token,
    user: { id: String(id), name, email, role, picture: picture || null },
  };
}

// The refresh response has no user, so id, email, and role are read from the
// access token. Name and picture come from the snapshot when there is one,
// because the token does not carry them.
async function backendRefresh(
  refreshToken: string,
  knownUser?: User,
): Promise<StoredSession> {
  const { data } = await apiClient.post<Envelope<TokenPair>>(
    "/auth/refresh",
    null,
    {
      headers: {
        ...(await forwardedHeaders()),
        Authorization: `Bearer ${refreshToken}`,
      },
    },
  );
  const { access_token, refresh_token } = data.data;
  const claims = readClaims(access_token);

  return {
    accessToken: access_token,
    accessExpiresAt: claims.exp * 1000,
    refreshToken: refresh_token,
    user: {
      id: String(claims.sub),
      name: knownUser?.name ?? claims.email,
      email: claims.email,
      role: claims.role,
      picture: knownUser?.picture ?? null,
    },
  };
}

async function backendLogout(accessToken: string, refreshToken: string) {
  await apiClient.post(
    "/auth/logout",
    { refresh_token: refreshToken },
    {
      headers: {
        ...(await forwardedHeaders()),
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
}

// Session Actions
export async function login(input: { email: string; password: string }) {
  return startSession(await backendLogin(input));
}

// Used after an OAuth login, where the browser arrives holding a refresh token.
export async function loginWithRefreshToken(refreshToken: string) {
  return startSession(await backendRefresh(refreshToken));
}

// Returns the current session. The stored access token is reused while it has
// time left, so ordinary page loads do not spend the single-use refresh token.
export async function getSession(): Promise<Session | null> {
  const stored = await readSession();

  if (!stored) {
    return null;
  }

  if (stored.accessExpiresAt - Date.now() > ACCESS_TOKEN_MARGIN) {
    return { accessToken: stored.accessToken, user: stored.user };
  }

  return renewSession(stored);
}

// Always asks the backend for a new token pair. Used when the backend has
// rejected the current access token.
export async function refresh(): Promise<Session | null> {
  const stored = await readSession();

  return stored ? renewSession(stored) : null;
}

async function renewSession(stored: StoredSession): Promise<Session> {
  try {
    return await startSession(
      await backendRefresh(stored.refreshToken, stored.user),
    );
  } catch (error) {
    // The backend rejected the refresh token: the session is over.
    if (getHttpErrorDetails(error).status === 401) {
      await clearSession();
    }

    throw error;
  }
}

// Revokes both tokens on the backend, then drops the cookie. If the access
// token has expired it is renewed first, so the refresh token is revoked
// either way.
export async function logout() {
  const stored = await readSession();

  await clearSession();

  if (!stored) {
    return;
  }

  const revoked = await backendLogout(
    stored.accessToken,
    stored.refreshToken,
  ).then(
    () => true,
    () => false,
  );

  if (!revoked) {
    const renewed = await backendRefresh(stored.refreshToken);

    await backendLogout(renewed.accessToken, renewed.refreshToken);
  }
}
