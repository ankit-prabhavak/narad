# ADR 0001: Foundation

Status: accepted

## Decisions

| Area | Choice | Why |
|---|---|---|
| Repo | npm workspaces | Ships with Node. pnpm 12 failed to install TypeScript correctly on the primary dev machine, so we dropped it. |
| API | NestJS 11 + Mongoose + Zod | Modular; Nest 11 is the line the CLI scaffolded. |
| Web | Next.js 16 (App Router), Tailwind v4 | Matches the spec. |
| Contracts | packages/contracts (Zod schemas, inferred types) | One source of truth for API and web. |
| TypeScript | Pinned to 5.9.3 everywhere | Version 7.0.2 installed without a working tsc binary. |
| Local DB | MongoDB single-node replica set | Needed for transactions. |
| Logging | pino + request ID per request | Structured logs from day one. |

## Consequences

- No microservices and no Kubernetes until measured need.
- Feeds are generated at read time.
- Dependency versions must be checked for peer compatibility. @nestjs/swagger must match the Nest major version.
- Develop outside OneDrive-synced folders (node_modules breakage).
