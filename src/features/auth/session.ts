import { cookies, headers } from "next/headers";

import { apiClient, getHttpErrorDetails } from "@/lib/axios";

import type { Session, User } from "./api";

// Server only: used by src/app/api/auth/[action]/route.ts and src/proxy.ts.

// Session Cookie
// Holds the refresh token, which JavaScript in the browser can never read,
// plus a snapshot of the user.
export const SESSION_COOKIE = "session";

// Keep in line with the lifetime of the backend's refresh token.
const SESSION_MAX_AGE = 60 * 60 * 24;

type StoredSession = {
  refreshToken: string;
  user: User;
};

type BackendSession = StoredSession & {
  accessToken: string;
};

async function readSession(): Promise<StoredSession | null> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as StoredSession;
  } catch {
    return null;
  }
}

async function startSession({
  accessToken,
  refreshToken,
  user,
}: BackendSession): Promise<Session> {
  const stored: StoredSession = { refreshToken, user };

  (await cookies()).set(SESSION_COOKIE, JSON.stringify(stored), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return { accessToken, user };
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

// Pass the visitor's IP on, so backend rate limits count per visitor instead
// of per Next.js server. The backend must trust this server as a proxy.
async function forwardedHeaders() {
  const forwardedFor = (await headers()).get("x-forwarded-for");

  return forwardedFor ? { "X-Forwarded-For": forwardedFor } : {};
}

async function backendLogin(input: {
  email: string;
  password: string;
}): Promise<BackendSession> {
  const { data } = await apiClient.post<Envelope<LoginData>>(
    "/auth/login",
    input,
    { headers: await forwardedHeaders() },
  );
  const { id, name, email, role, picture, access_token, refresh_token } =
    data.data;

  return {
    accessToken: access_token,
    refreshToken: refresh_token,
    user: { id: String(id), name, email, role, picture: picture || null },
  };
}

// The refresh response has no user, so id, email, and role are read from the
// access token (a JWT). Name and picture come from the snapshot when there is
// one, because the token does not carry them.
async function backendRefresh(
  refreshToken: string,
  knownUser?: User,
): Promise<BackendSession> {
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
  const claims = JSON.parse(
    Buffer.from(access_token.split(".")[1], "base64url").toString(),
  ) as { sub: number; email: string; role: string };

  return {
    accessToken: access_token,
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

export async function refresh(): Promise<Session | null> {
  const stored = await readSession();

  if (!stored) {
    return null;
  }

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
// token is missing or expired it is renewed first, so the refresh token is
// revoked either way.
export async function logout(accessToken: string | null) {
  const stored = await readSession();

  await clearSession();

  if (!stored) {
    return;
  }

  const revoked = accessToken
    ? await backendLogout(accessToken, stored.refreshToken).then(
        () => true,
        () => false,
      )
    : false;

  if (!revoked) {
    const renewed = await backendRefresh(stored.refreshToken);

    await backendLogout(renewed.accessToken, renewed.refreshToken);
  }
}
