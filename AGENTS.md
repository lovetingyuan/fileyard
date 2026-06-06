# AGENTS.md

This file provides guidance to AI coding agent when working with code in this repository.

# General principles

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

# Project Overview

Full-stack application built with React + Vite + Hono, deployed to Cloudflare Workers.

## npm commands

```bash
npm run dev        # Start Vite dev server (http://localhost:5173)
npm run build      # TypeScript compile + Vite build
npm run preview    # Build and preview locally
npm run deploy     # Deploy to Cloudflare Workers
npm run lint       # Run oxlint with auto-fix and format
npm run check      # Full check: tsc + build + dry-run deploy
npm run cf-typegen # Generate TypeScript types from wrangler config
```

## Architecture and tech-stack

```
src/
├── react-app/          # The main frontend React application
└── worker/             # Cloudflare Worker backend application
└── types.ts            # Common typescript types definition, used by frontend and backend.
```

- **Frontend**: React 19 with Vite, Tailwind CSS v4, DaisyUI components
- **Backend**: Hono framework running on Cloudflare Workers
- **Build**: Vite builds the client to `dist/client/`, wrangler serves it as static assets with SPA fallback
- **TypeScript**: Separate configs for app (`tsconfig.app.json`), worker (`tsconfig.worker.json`), and build tools (`tsconfig.node.json`)

# Coding rules

- **Common**:
  - Avoid over-encapsulation and the misuse of design patterns. A classic counterexample is when function A simply calls another function B; in that case, function A should not exist.
  - When using third-party APIs, you must first query the documentation for official usage.
- **CSS Style**:
  - Styles must be written using tailwindcss. Try to avoid using style and creating separate CSS files. If you must use them, you must ask the user and explain the reasons.
  - If you need to use variables or calculate class names in `className`, use the `clsx` or `clsx/lite` library to simplify the process. Refer to https://github.com/lukeed/clsx.
- **React**:
  - Try to keep each React component under 300 lines of code. Avoid making individual components overly complex by using hooks, encapsulating and extracting subcomponents, and extracting constants and common methods. Follow React best practices
  - This app has already been optimized using `react-compiler`, so there is no need to use optimization APIs such as `useMemo`, `memo`, or `useCallback`.
  - Try to avoid using `useEffect`, please refer to the corresponding best practices.
- **Honojs**:
  - Hono routes must use full path definitions, which means I can use the pathname of the HTTP request to directly locate the corresponding route registration point.
  - Route processing methods should be split into separate modules.
  - Security is critical for backend systems. Extra attention must be paid to authentication, API abuse, injection attacks, and data breaches, and industry-standard security best practices must be followed.
- **TypeScript**:
  - Place common and global types at src/types.ts.
  - Try to avoid using `as any`.
  - If type inference can be used with TypeScript, there is no need to declare the type separately.
  - Do not use type overrides or type assertions to modify the types in third-party libraries, to avoid introducing type definitions that conflict with the official ones.
- **State Management**: use `react-atomic-store` to manage app state. Refer to related skills.

## Debug and verify

- **use real browser**: local server is vite dev server(http://localhost:5173/), here are some accounts for test:
  - `test1@tingyuan.in`, password is `test1@tingyuan.inA`.
  - `test2@tingyuan.in`, password is `test2@tingyuan.inA`.
