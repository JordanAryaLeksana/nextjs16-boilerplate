// Checks for the token handling in src/lib/axios.ts: attaching the access
// token, and renewing it once when the backend answers 401.
import { credentials } from "./mock-backend.mjs";

export async function checkInterceptor({ backend, check }) {
  // The module reads its base URL when it loads, and only attaches tokens in a
  // browser, so both are set up before importing it.
  process.env.NEXT_PUBLIC_API_BASE_URL = backend.url;
  globalThis.window = {};

  let apiClient;
  let setApiAuth;

  try {
    ({ apiClient, setApiAuth } = await import("../../src/lib/axios.ts"));
  } catch (error) {
    // Importing TypeScript directly needs Node 22.18 or newer.
    check("src/lib/axios.ts loads (needs Node 22.18+)", false, error.message);

    return;
  }

  const protectedCallsSince = (mark) =>
    backend.log
      .slice(mark)
      .filter((entry) => entry.path === "/protected")
      .map((entry) => entry.status)
      .join(",");
  const outcome = (request) =>
    request.then(
      (response) => response.status,
      (error) => error?.response?.status ?? error,
    );

  const loginResponse = await fetch(`${backend.url}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(credentials),
  });
  const validToken = (await loginResponse.json()).data.access_token;

  let renewals = 0;
  const setAuth = (currentToken, renewedToken) => {
    renewals = 0;
    setApiAuth({
      getAccessToken: async () => currentToken,
      refreshAccessToken: async () => {
        renewals += 1;

        return renewedToken;
      },
    });
  };

  setAuth(validToken, validToken);
  check(
    "a valid token is attached and nothing is renewed",
    (await outcome(apiClient.get("/protected"))) === 200 && renewals === 0,
  );

  let mark = backend.log.length;

  setAuth("stale-token", validToken);
  check(
    "a rejected token is renewed once and the request repeated",
    (await outcome(apiClient.get("/protected"))) === 200 &&
      renewals === 1 &&
      protectedCallsSince(mark) === "401,200",
  );

  mark = backend.log.length;
  setAuth("stale-token", null);
  check(
    "when the session is over, the original 401 surfaces without a retry",
    (await outcome(apiClient.get("/protected"))) === 401 &&
      renewals === 1 &&
      protectedCallsSince(mark) === "401",
  );

  mark = backend.log.length;
  setAuth("stale-token", "still-rejected");
  check(
    "a second 401 after renewing stops instead of looping",
    (await outcome(apiClient.get("/protected"))) === 401 &&
      renewals === 1 &&
      protectedCallsSince(mark) === "401,401",
  );

  setAuth(validToken, validToken);
  check(
    "errors other than 401 do not trigger a renewal",
    (await outcome(apiClient.get("/missing"))) === 404 && renewals === 0,
  );

  setAuth("stale-token", validToken);
  check(
    "a POST is repeated with its body after renewing",
    (await outcome(apiClient.post("/auth/logout", { refresh_token: "x" }))) ===
      204 && renewals === 1,
  );

  setApiAuth({
    getAccessToken: async () => {
      throw new Error("session endpoint down");
    },
    refreshAccessToken: async () => null,
  });
  check(
    "a session that cannot be loaded does not block public requests",
    (await outcome(apiClient.post("/auth/login", credentials))) === 200,
  );

  setAuth(null, null);
  check(
    "a signed-out request goes out without a token",
    (await outcome(apiClient.get("/protected"))) === 401,
  );
}
