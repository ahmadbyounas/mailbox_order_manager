# Mailbox Order Manager - Developer Guidelines

## 1. Architectural Principles & Layered Code Structure
This project strictly enforces a clean **Layered Architecture**. Boundaries between layers must never be violated:

- **Presentation & Route Handlers (`src/app/api/...`, `src/app/...`)**:
  - Responsible ONLY for parsing/validating HTTP inputs (e.g. using Zod schemas), authenticating sessions, calling the Service Layer, and returning standard formatted responses.
  - **ABSOLUTE RULE**: ZERO business logic is permitted in Route Handlers or React UI Components.
- **Service Layer (`src/services/...`)**:
  - The single source of truth for business rules, idempotency verification, transaction orchestration, provider dispatching, and state machine lifecycle.
- **State Machine (`src/services/state-machine/...`)**:
  - Enforces valid order status transitions (`PENDING -> PROVISIONING -> ACTIVE | FAILED`, and admin retry `FAILED -> PENDING`).
  - Rejects illegal transitions and records every transition in the `AuditLog` within an atomic database transaction.
- **Data Access / Repository Layer (`src/repositories/...` or Prisma Client)**:
  - Encapsulates database queries, aggregations, and Prisma transactions.
- **Provider Abstraction (`src/providers/...`)**:
  - Implements the Strategy Pattern for mailbox provisioners (Google, Microsoft) with simulated delays and error rates.

## 2. Strict TypeScript Rules
- **No `any`**: The use of `any` is strictly prohibited throughout the codebase. Use explicit types, generics, or `unknown` with type narrowing.
- **Strict Null Checks**: Always handle `null` and `undefined` safely.
- **Zod Validation**: All external inputs (API payloads, query parameters) must be validated via Zod schemas and typed using `z.infer<typeof schema>`.

## 3. Git Commit Habits & Workflow
- **Small, Atomic Commits**: Never make a single giant commit. Each commit must represent a single logical change (e.g., schema migration, seed data, service implementation, UI screen).
- **Descriptive Conventional Commit Messages**:
  - `feat(...)`: New features
  - `fix(...)`: Bug fixes
  - `test(...)`: Unit and integration tests
  - `docs(...)`: Documentation updates
  - `chore(...)`: Dependency updates, configurations

## 4. Documentation & Evidence
- Keep `docs/ARCHITECTURE.md` up to date with design patterns used (Strategy, State Machine, Repository/Service Layer, Worker), where each lives, why it was chosen, and rejected alternatives.
- Keep `docs/AI_WORKLOG.md` updated with planning steps, prompts, corrections, manual changes, and phase timings.
