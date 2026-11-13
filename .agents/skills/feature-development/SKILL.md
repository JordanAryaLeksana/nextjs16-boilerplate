---
name: feature-development
description: Plan, implement, or refactor features according to the current project's architecture, conventions, and dependencies. Use when developing or modifying application features.
---

# Feature Development

## 1. Understand the Project

Before making changes:

- Read AGENTS.md and relevant project documentation.
- Inspect package.json and the existing folder structure.
- Review related features, components, and utilities.
- Check git status and preserve existing changes.
- Identify the current architecture and coding conventions.
- Do not assume a feature, library, or API already exists.

Follow the actual project, not a fixed implementation template.

## 2. Plan the Implementation

- Understand the requested behavior and acceptance criteria.
- Identify files that need to be created or modified.
- Reuse existing patterns where appropriate.
- Prefer the simplest implementation that meets the requirements.
- Explain significant architectural decisions.
- Respect planning-only requests.

Do not introduce unnecessary abstraction or dependencies.

## 3. Follow Existing Architecture

For this Next.js boilerplate:

- src/app: routing, layouts, and page composition.
- src/features: feature-specific logic and components.
- src/components/ui: reusable UI primitives.
- src/components/shared: shared UI compositions.
- src/lib: common infrastructure and utilities.

Reference implementations to copy from:

- src/features/demo-products: a query, a mutation, and a form.
- src/features/auth: session, sign in, sign out, and OAuth.

Adapt file organization to the complexity of each feature.

Do not create folders or layers that have no practical purpose.

## 4. Choose Technology by Responsibility

Use existing dependencies where suitable:

- Axios for HTTP communication.
- TanStack Query for asynchronous server state.
- Zustand for shared client state when necessary.
- React useState for local component state.
- React Hook Form and Zod for forms and validation.
- shadcn/ui for existing UI primitives.

Do not duplicate server state into client stores.

Add Providers, hooks, schemas, and other abstractions only when justified by the feature.

## 5. Data Fetching Pattern

Each feature keeps its server communication in `src/features/<feature>/api.ts`. For every endpoint that file has:

1. A request function that calls `apiClient` from `src/lib/axios.ts` and returns typed data.
2. For a query, a `get<Name>QueryOptions` function built with `queryOptions`.
3. A hook (`use<Name>`) whose options are typed with `QueryConfig` or `MutationConfig` from `src/lib/query-client.ts`.

Rules:

- Pages and components import the hook. They do not import `@tanstack/react-query`.
- A mutation hook invalidates the queries it affects, then calls the caller's `onSuccess`.
- The Zod schema for a form lives in `api.ts` next to the mutation it feeds, and the input type is inferred from it.
- Pass the `signal` from the query function to the request, so cancelled queries cancel the request.
- Show failures with `getHttpErrorDetails` so the backend's own response stays visible.

## 6. Authentication

- Read the signed-in user with `useSession` from `src/features/auth/api.ts`.
- Never read, store, or pass tokens in feature code. `apiClient` attaches the access token and renews it on 401.
- A page that needs a session is added to the matcher in `src/proxy.ts`.
- Backend-specific auth details belong only in the "Backend Contract" section of `src/features/auth/session.ts`.

## 7. Implementation Standards

- Keep code readable, maintainable, and type-safe.
- Prefer cohesive files over unnecessary fragmentation.
- Write configuration inline when used only once.
- Preserve backend response details for debugging.
- Follow existing naming, imports, and formatting.
- Handle loading, error, empty, and success states where relevant.
- Consider accessibility and responsive behavior.
- Avoid unrelated refactors.

## 8. Use Tools Purposefully

- Use Next.js DevTools for relevant runtime diagnostics.
- Use shadcn MCP when inspecting or adding UI components.
- Use Context7 when the API of another library is uncertain.
- Use the `playwright-cli` skill to check a user flow in the browser when a change affects one.
- Use the `impeccable` skill for design critique, audits, and polish.
- Keep tool output concise and relevant.

## 9. Verify and Report

Run checks relevant to the changes.

For this project, available checks include:

- npm run lint
- npm run typecheck
- npm run format:check
- npm run build
- npm run test:auth (when auth, `src/lib/axios.ts`, or `src/proxy.ts` changed)

Report:

- What changed.
- Why the approach fits the project.
- Which checks passed or failed.
- Any remaining limitations.

Do not commit, push, or make destructive changes without approval.
