import axios from "axios";

import {
  getSession,
  login,
  loginWithRefreshToken,
  logout,
  refresh,
} from "@/features/auth/session";
import { getHttpErrorDetails } from "@/lib/axios";
import { env } from "@/lib/env";

// Session Endpoints
// POST /api/auth/login | oauth | session | refresh | logout
export async function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;

  // Browsers label cross-site requests. Refuse them, so another site cannot
  // start or end a session here.
  const site = request.headers.get("sec-fetch-site");

  if (site && site !== "same-origin") {
    return Response.json(
      { message: "Cross-site request refused" },
      { status: 403 },
    );
  }

  // Older browsers send no such label. A cross-site form cannot post JSON, so
  // requiring it covers the two actions that take a body.
  if (
    (action === "login" || action === "oauth") &&
    !request.headers.get("content-type")?.includes("application/json")
  ) {
    return Response.json(
      { message: "Content-Type must be application/json" },
      { status: 415 },
    );
  }

  // Signing in needs a backend. Say so plainly when none is configured.
  if (
    (action === "login" || action === "oauth") &&
    !env.NEXT_PUBLIC_API_BASE_URL
  ) {
    return Response.json(
      {
        message:
          "NEXT_PUBLIC_API_BASE_URL is not set, so there is no backend to sign in to.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    password?: unknown;
    refreshToken?: unknown;
  } | null;

  try {
    switch (action) {
      case "login": {
        if (
          typeof body?.email !== "string" ||
          typeof body.password !== "string"
        ) {
          return Response.json(
            { message: "Email and password are required" },
            { status: 400 },
          );
        }

        return Response.json(
          await login({ email: body.email, password: body.password }),
        );
      }

      case "oauth": {
        if (typeof body?.refreshToken !== "string") {
          return Response.json(
            { message: "Refresh token is required" },
            { status: 400 },
          );
        }

        return Response.json(await loginWithRefreshToken(body.refreshToken));
      }

      case "session":
      case "refresh": {
        const session = await (action === "session" ? getSession() : refresh());

        return session
          ? Response.json(session)
          : Response.json({ message: "No session" }, { status: 401 });
      }

      case "logout": {
        // The cookie is cleared even when the backend cannot be reached.
        await logout().catch(() => undefined);

        return new Response(null, { status: 204 });
      }

      default:
        return Response.json({ message: "Not found" }, { status: 404 });
    }
  } catch (error) {
    const { status, data, code } = getHttpErrorDetails(error);

    // Pass the backend's own error through unchanged, including how long to
    // wait when it is rate limiting.
    if (status) {
      const retryAfter = axios.isAxiosError(error)
        ? (error.response?.headers["retry-after"] as string | undefined)
        : undefined;

      return Response.json(data ?? null, {
        status,
        headers: retryAfter ? { "Retry-After": retryAfter } : undefined,
      });
    }

    return Response.json(
      { message: "Auth backend unreachable", code },
      { status: 502 },
    );
  }
}
