import {
  login,
  loginWithRefreshToken,
  logout,
  refresh,
} from "@/features/auth/session";
import { getHttpErrorDetails } from "@/lib/axios";

// Session Endpoints
// POST /api/auth/login | oauth | refresh | logout
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

      case "refresh": {
        const session = await refresh();

        return session
          ? Response.json(session)
          : Response.json({ message: "No session" }, { status: 401 });
      }

      case "logout": {
        const accessToken =
          request.headers.get("authorization")?.replace(/^Bearer /i, "") ??
          null;

        // The cookie is cleared even when the backend cannot be reached.
        await logout(accessToken).catch(() => undefined);

        return new Response(null, { status: 204 });
      }

      default:
        return Response.json({ message: "Not found" }, { status: 404 });
    }
  } catch (error) {
    const { status, data, code } = getHttpErrorDetails(error);

    // Pass the backend's own error through unchanged.
    if (status) {
      return Response.json(data ?? null, { status });
    }

    return Response.json(
      { message: "Auth backend unreachable", code },
      { status: 502 },
    );
  }
}
