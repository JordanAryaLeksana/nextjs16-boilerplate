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

## 5. Implementation Standards

- Keep code readable, maintainable, and type-safe.
- Prefer cohesive files over unnecessary fragmentation.
- Write configuration inline when used only once.
- Preserve backend response details for debugging.
- Follow existing naming, imports, and formatting.
- Handle loading, error, empty, and success states where relevant.
- Consider accessibility and responsive behavior.
- Avoid unrelated refactors.

## 6. Use Tools Purposefully

- Use Next.js DevTools for relevant runtime diagnostics.
- Use shadcn MCP when inspecting or adding UI components.
- Use documentation tools when API compatibility is uncertain.
- Avoid screenshots, videos, and browser automation unless necessary.
- Keep tool output concise and relevant.

## 7. Verify and Report

Run checks relevant to the changes.

For this project, available checks include:

- npm run lint
- npm run typecheck
- npm run format:check
- npm run build

Run focused tests when available.

Report:

- What changed.
- Why the approach fits the project.
- Which checks passed or failed.
- Any remaining limitations.

Do not commit, push, or make destructive changes without approval.
