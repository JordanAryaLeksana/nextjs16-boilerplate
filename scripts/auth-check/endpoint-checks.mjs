// Checks for the session endpoints (src/app/api/auth/[action]/route.ts) and
// the route protection in src/proxy.ts, run against the mock backend.
import { credentials, rateLimitedEmail } from "./mock-backend.mjs";

export async function checkEndpoints({ app, backend, check }) {
  const sessionCookie = (response) =>
    response.headers.getSetCookie().find((c) => c.startsWith("session=")) ??
    null;
  const cookiePair = (setCookie) => setCookie.split(";")[0];
  const readCookie = (setCookie) =>
    JSON.parse(
      decodeURIComponent(cookiePair(setCookie).slice("session=".length)),
    );
  const writeCookie = (stored) =>
    `session=${encodeURIComponent(JSON.stringify(stored))}`;
  const wasCleared = (response) =>
    /session=;/.test(sessionCookie(response) ?? "");

  const post = (
    action,
    { body, cookie, headers, contentType = "application/json" } = {},
  ) =>
    fetch(`${app}/api/auth/${action}`, {
      method: "POST",
      redirect: "manual",
      headers: {
        ...(body ? { "content-type": contentType } : {}),
        ...(cookie ? { cookie } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

  const backendCallsSince = (mark) =>
    backend.log
      .slice(mark)
      .map((entry) => `${entry.path}:${entry.status}`)
      .join(" ");

  const loginAtBackend = async () => {
    const response = await fetch(`${backend.url}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(credentials),
    });

    return (await response.json()).data;
  };

  // Login
  let response = await post("login", {
    body: { ...credentials, password: "wrong" },
  });
  let json = await response.json();

  check(
    "login with a wrong password returns the backend's own 401 body",
    response.status === 401 && json.message === "Email atau password salah",
  );
  check("a failed login sets no cookie", sessionCookie(response) === null);

  response = await post("login", { body: { email: "x" } });
  check("login without a password is a 400", response.status === 400);

  response = await post("login", {
    body: credentials,
    contentType: "text/plain",
  });
  check("login that is not JSON is a 415", response.status === 415);

  response = await post("login", {
    body: { email: rateLimitedEmail, password: credentials.password },
  });
  check(
    "a backend 429 passes through with Retry-After",
    response.status === 429 && response.headers.get("retry-after") === "30",
  );

  response = await post("login", { body: credentials });
  json = await response.json();

  const loginCookie = sessionCookie(response);
  const loginAccessToken = json.accessToken;
  const stored = readCookie(loginCookie);

  check(
    "login returns an access token and the user",
    response.status === 200 &&
      typeof json.accessToken === "string" &&
      json.user?.name === "Jordan" &&
      json.user?.id === "7",
  );
  check(
    "the login response does not contain the refresh token",
    !JSON.stringify(json).includes(stored.refreshToken),
  );
  check(
    "the session cookie is HttpOnly, SameSite=Lax, Path=/, with a max age",
    /HttpOnly/i.test(loginCookie) &&
      /SameSite=lax/i.test(loginCookie) &&
      /Path=\//.test(loginCookie) &&
      /Max-Age=\d+/.test(loginCookie),
  );
  check(
    "the cookie holds both tokens, the expiry, and the user",
    typeof stored.refreshToken === "string" &&
      stored.accessToken === loginAccessToken &&
      stored.accessExpiresAt > Date.now() &&
      stored.user.email === credentials.email,
  );

  // Session: a page load must not spend the refresh token
  let mark = backend.log.length;

  response = await post("session", { cookie: cookiePair(loginCookie) });
  json = await response.json();
  check(
    "session reuses a fresh access token without calling the backend",
    response.status === 200 &&
      json.accessToken === loginAccessToken &&
      backendCallsSince(mark) === "" &&
      sessionCookie(response) === null,
  );

  mark = backend.log.length;
  response = await post("session", {
    cookie: writeCookie({ ...stored, accessExpiresAt: Date.now() + 30_000 }),
  });
  json = await response.json();

  const renewedCookie = sessionCookie(response);

  check(
    "session renews an access token that is about to expire, once",
    response.status === 200 &&
      json.accessToken !== loginAccessToken &&
      json.user?.name === "Jordan" &&
      backendCallsSince(mark) === "/auth/refresh:200" &&
      renewedCookie !== null,
  );

  // Refresh: always asks the backend
  mark = backend.log.length;
  response = await post("refresh", { cookie: cookiePair(renewedCookie) });
  json = await response.json();

  const refreshedCookie = sessionCookie(response);

  check(
    "refresh always asks the backend and rotates the cookie",
    response.status === 200 &&
      json.accessToken !== readCookie(renewedCookie).accessToken &&
      backendCallsSince(mark) === "/auth/refresh:200" &&
      cookiePair(refreshedCookie) !== cookiePair(renewedCookie),
  );

  response = await post("refresh", { cookie: cookiePair(renewedCookie) });
  json = await response.json();
  check(
    "a refresh token used twice returns the backend's 401 and clears the cookie",
    response.status === 401 &&
      json.message === "Sesi tidak valid, silakan login ulang" &&
      wasCleared(response),
  );

  response = await post("session");
  check("session without a cookie is a 401", response.status === 401);

  response = await post("refresh");
  check("refresh without a cookie is a 401", response.status === 401);

  // Cookies this code cannot read
  response = await post("session", { cookie: "session=not-json" });
  check(
    "an unreadable cookie is a 401 and is removed",
    response.status === 401 && wasCleared(response),
  );

  let direct = await loginAtBackend();

  response = await post("session", {
    cookie: writeCookie({
      refreshToken: direct.refresh_token,
      user: stored.user,
    }),
  });
  json = await response.json();
  check(
    "a cookie without an access token is renewed, not rejected",
    response.status === 200 && typeof json.accessToken === "string",
  );

  // Cross-site requests
  response = await post("refresh", {
    cookie: cookiePair(refreshedCookie),
    headers: { "sec-fetch-site": "cross-site" },
  });
  check("a cross-site request is a 403", response.status === 403);

  // OAuth completion
  direct = await loginAtBackend();
  response = await post("oauth", {
    body: { refreshToken: direct.refresh_token },
  });
  json = await response.json();

  const oauthCookie = sessionCookie(response);

  check(
    "oauth signs in with the user read from the token",
    response.status === 200 &&
      json.user?.email === credentials.email &&
      json.user?.id === "7",
  );
  check(
    "oauth exchanges the refresh token from the URL instead of storing it",
    readCookie(oauthCookie).refreshToken !== direct.refresh_token,
  );

  response = await post("oauth", {
    body: { refreshToken: direct.refresh_token },
  });
  check(
    "the refresh token from the URL cannot be used twice",
    response.status === 401,
  );

  response = await post("oauth", {
    body: { refreshToken: "x" },
    contentType: "text/plain",
  });
  check("oauth that is not JSON is a 415", response.status === 415);

  // Logout
  mark = backend.log.length;
  response = await post("logout", { cookie: cookiePair(oauthCookie) });
  check(
    "logout clears the cookie",
    response.status === 204 && wasCleared(response),
  );
  check(
    "logout revokes both tokens on the backend in one call",
    backendCallsSince(mark) === "/auth/logout:204" &&
      backend.log.at(-1).revokedRefresh === true,
  );

  response = await post("refresh", { cookie: cookiePair(oauthCookie) });
  check("refresh after logout is a 401", response.status === 401);

  mark = backend.log.length;
  response = await post("logout", {
    cookie: writeCookie({
      ...readCookie(refreshedCookie),
      accessToken: "expired-or-invalid",
    }),
  });
  check(
    "logout with an expired access token renews it, then revokes",
    response.status === 204 &&
      backendCallsSince(mark) ===
        "/auth/logout:401 /auth/refresh:200 /auth/logout:204",
  );

  response = await post("logout");
  check("logout without a session is a 204", response.status === 204);

  // Other
  response = await post("unknown-action");
  check("an unknown action is a 404", response.status === 404);

  response = await fetch(`${app}/api/auth/login`);
  check("GET on a session endpoint is a 405", response.status === 405);

  check(
    "the visitor's IP is forwarded to the backend",
    backend.log
      .filter((entry) => entry.path === "/auth/refresh")
      .every((entry) => entry.forwardedFor),
  );

  // Route protection
  const page = (path, cookie) =>
    fetch(`${app}${path}`, {
      redirect: "manual",
      headers: cookie ? { cookie } : {},
    });
  const redirectsTo = (res, path) =>
    res.status >= 300 &&
    res.status < 400 &&
    new URL(res.headers.get("location"), app).pathname === path;

  response = await page("/dashboard");
  check(
    "/dashboard without a session redirects to /login",
    redirectsTo(response, "/login"),
  );

  response = await page("/dashboard", "session=x");
  check("/dashboard with a session cookie is served", response.status === 200);

  response = await page("/login", "session=x");
  check(
    "/login with a session cookie redirects to /dashboard",
    redirectsTo(response, "/dashboard"),
  );

  response = await page("/login");
  check("/login without a session is served", response.status === 200);

  response = await page("/oauth-success");
  check("/oauth-success is served", response.status === 200);
}
