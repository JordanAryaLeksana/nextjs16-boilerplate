
## Frontend Architecture

- Use npm only.
- Follow Next.js App Router conventions.
- Keep routing and page composition inside `src/app`.
- Keep business logic inside `src/features/<feature>`.
- Keep reusable UI primitives inside `src/components/ui`.
- Keep shared UI compositions inside `src/components/shared`.
- Keep shared infrastructure inside `src/lib`.
- Use Axios for HTTP requests.
- Use TanStack Query for server state.
- Use Zustand for client state when needed.
- Use React Hook Form, Zod, and shadcn/ui Field for forms.

## Coding Style

- Prefer readable, straightforward TypeScript.
- Keep related logic together in cohesive files.
- Avoid unnecessary wrappers, factories, and abstractions.
- Write configuration inline when it is used only once.
- Preserve raw backend error responses for debugging.
- Do not introduce new dependencies without approval.
- Reuse existing components and project conventions.
- Inspect the affected files before editing.
- Do not commit, push, or perform destructive operations without approval.

## MCP Usage

- Use Next.js DevTools for runtime errors and route inspection.
- Use shadcn MCP for component discovery and registry documentation.
- Prefer documentation and text-based diagnostics.
- Do not use Playwright or capture screenshots by default.
- Do not generate browser videos or traces unless requested.
- Keep tool responses focused and concise.

## Verification

Run relevant checks after making code changes:

- `npm run lint`
- `npm run typecheck`
- `npm run format:check`
- `npm run build`

Report failures accurately. Do not claim a check passed unless it was executed successfully.
