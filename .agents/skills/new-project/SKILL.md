---
name: new-project
description: Turn this boilerplate into a real project by renaming it, connecting its backend, removing the demo, and setting the design direction. Use when starting a project from this boilerplate, or when asked to set up, bootstrap, or clean up the starter.
---

# New Project

Work through the steps in order. Each one leaves the four checks passing.

## 1. Ask What Only the User Knows

Get these answers before changing files. Do not guess them.

- Project name and a one-line description.
- Backend base URL, and where its API contract lives (an OpenAPI file or URL).
- How the backend signs users in: endpoints, token shape, OAuth providers. Or that the project has no sign in.
- Which pages need a session.
- Design direction: an existing brand, a reference site, or nothing yet.

## 2. Identity

- `package.json`: set `name`.
- `src/app/layout.tsx`: set the `metadata` title and description, and `lang`.
- `README.md`: replace the starter text with the project's own.
- `src/app/page.tsx`: replace the placeholder home page.
- `public/`: delete the starter SVGs that nothing uses any more.

## 3. Environment

- Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_BASE_URL`.
- Add a line to AGENTS.md saying where the backend contract lives, so later work reads the contract instead of guessing.

## 4. Sign In

If the project has sign in:

- Change only the "Backend Contract" section of `src/features/auth/session.ts`: paths, payloads, response mapping, and how the user is read.
- Set `SESSION_MAX_AGE` in that file to the lifetime of the backend's refresh token.
- If the backend finishes OAuth differently, adjust `startOAuthLogin` and `completeOAuth` in `src/features/auth/api.ts`.
- Mirror the same contract in `scripts/auth-check/mock-backend.mjs`, then run `npm run test:auth`.
- Tell the user what the backend needs: this app's origin allowed in CORS, this server trusted as a proxy for `X-Forwarded-For`, and its OAuth redirect pointing at `/oauth-success`.

If the project has no sign in, remove `src/features/auth`, `src/app/api/auth`, `src/app/login`, `src/app/oauth-success`, `src/app/dashboard`, `src/proxy.ts`, `scripts/auth-check`, the `test:auth` script, and the API auth block in `src/app/providers.tsx`. Then remove the `setApiAuth` code from `src/lib/axios.ts`.

## 5. Protected Pages

List every path that needs a session in the matcher in `src/proxy.ts`. `/dashboard` is only an example.

## 6. Remove the Demo

Delete these once the first real feature exists, so the pattern always has a working example:

- `src/features/demo-products` and `src/app/api/demo-products`
- `src/features/cart`
- `src/app/query-preview`, `src/app/ui-preview`, `src/app/zustand-preview`

## 7. Design Direction

- Fonts come from Google Fonts through `next/font`. Change them in `src/lib/fonts.ts`; colors and radius are in `src/app/globals.css`.
- Run `/impeccable init` to write `PRODUCT.md`, then `/impeccable document` to write `DESIGN.md` from the code. Both files are then the source of truth for design work.
- New components come from shadcn first. Use the shadcn MCP to find them.

Optional starting points, each run only when the user asks for it:

- A known look: copy one `DESIGN.md` from https://github.com/VoltAgent/awesome-design-md into the project root, then adapt it. It is a starting point, not a brand to clone.
- A reference site: `npx skillui --url <site>` writes that site's design system to a folder. Move what is useful into `DESIGN.md`.
- Layout exploration: Stitch (https://stitch.withgoogle.com) with the user's Google account. Rebuild the result with this project's components.
- Ready-made components: 21st.dev. Its MCP needs the user's own API key, kept in an environment variable and never in the repository.

## 8. Verify

- `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm run build`.
- `npm run test:auth` if the project has sign in.
- Walk through sign in and sign out in a browser with the `playwright-cli` skill.

Report what was changed, what was removed, and what the user still has to do on the backend.
