// A stand-in for the backend's auth endpoints, used by `npm run test:auth`.
// It mirrors the "Backend Contract" section of src/features/auth/session.ts:
// keep the two in step when the contract changes.
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";

export const credentials = {
  email: "jordan@example.com",
  password: "password123",
};

// Signing in with this email is answered with 429 and a Retry-After header.
export const rateLimitedEmail = "limited@example.com";

const encode = (value) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

const decode = (token) => {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
  } catch {
    return null;
  }
};

const sign = (type, lifetimeSeconds) =>
  [
    encode({ alg: "HS256", typ: "JWT" }),
    encode({
      sub: 7,
      email: credentials.email,
      role: "user",
      token_type: type,
      jti: randomUUID(),
      exp: Math.floor(Date.now() / 1000) + lifetimeSeconds,
    }),
    "signature",
  ].join(".");

const bearer = (request) =>
  (request.headers.authorization ?? "").replace(/^Bearer /i, "");

// Resolves to { url, log, close }. `log` lists every request received, as
// { path, status, forwardedFor, revokedRefresh }.
export function startMockBackend() {
  const consumed = new Set();
  const revoked = new Set();
  const log = [];

  const server = createServer((request, response) => {
    let raw = "";

    request.on("data", (chunk) => (raw += chunk));
    request.on("end", () => {
      const body = raw ? JSON.parse(raw) : null;
      const path = request.url.replace("/api/v1", "");
      const entry = {
        path,
        status: 0,
        forwardedFor: request.headers["x-forwarded-for"] ?? null,
        revokedRefresh: false,
      };

      log.push(entry);

      const send = (status, payload, headers = {}) => {
        entry.status = status;
        response.writeHead(status, {
          "content-type": "application/json",
          ...headers,
        });
        response.end(payload === undefined ? "" : JSON.stringify(payload));
      };
      const fail = (status, message, headers) =>
        send(status, { error: "Error", message, status }, headers);

      if (request.method === "POST" && path === "/auth/login") {
        if (body?.email === rateLimitedEmail) {
          return fail(429, "Terlalu banyak percobaan. Coba lagi nanti.", {
            "retry-after": "30",
          });
        }

        if (body?.password !== credentials.password) {
          return fail(401, "Email atau password salah");
        }

        return send(200, {
          message: "User Logged In",
          data: {
            id: 7,
            name: "Jordan",
            email: body.email,
            role: "user",
            picture: "",
            provider: "local",
            sub: null,
            access_token: sign("access", 900),
            refresh_token: sign("refresh", 86400),
          },
        });
      }

      // Refresh tokens are single-use: a second use is rejected.
      if (request.method === "POST" && path === "/auth/refresh") {
        const claims = decode(bearer(request));

        if (
          claims?.token_type !== "refresh" ||
          consumed.has(claims.jti) ||
          revoked.has(claims.jti)
        ) {
          return fail(401, "Sesi tidak valid, silakan login ulang");
        }

        consumed.add(claims.jti);

        return send(200, {
          message: "Token Refreshed",
          data: {
            access_token: sign("access", 900),
            refresh_token: sign("refresh", 86400),
          },
        });
      }

      if (request.method === "POST" && path === "/auth/logout") {
        const claims = decode(bearer(request));

        if (claims?.token_type !== "access" || revoked.has(claims.jti)) {
          return fail(401, "Invalid token");
        }

        revoked.add(claims.jti);

        const refreshClaims = body?.refresh_token
          ? decode(body.refresh_token)
          : null;

        if (refreshClaims) {
          revoked.add(refreshClaims.jti);
          entry.revokedRefresh = true;
        }

        entry.status = 204;
        response.writeHead(204);

        return response.end();
      }

      // Any endpoint that needs a signed-in user.
      if (request.method === "GET" && path === "/protected") {
        const claims = decode(bearer(request));

        if (claims?.token_type !== "access") {
          return fail(401, "Invalid token");
        }

        return send(200, { message: "OK", data: { email: claims.email } });
      }

      return fail(404, "Not found");
    });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve({
        url: `http://127.0.0.1:${server.address().port}/api/v1`,
        log,
        close: () => server.close(),
      });
    });
  });
}
