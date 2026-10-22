# AI Worklog & Collaboration Record

## 1. Planning Approach
The implementation followed a phased, iterative engineering process guided by the test specification:
- **Phase 1: Project Setup & Repository Infrastructure (35 mins)**
  - Initialize Next.js App Router (TypeScript, Tailwind CSS).
  - Configure `docker-compose.yml` for PostgreSQL and `.env.example`.
  - Establish `CLAUDE.md` to enforce strict architecture rules and commit conventions.
- **Phase 2: Database Schema, Seeds & State Machine (45 mins)**
  - Define Prisma schema: `User`, `Order`, `Mailbox`, `AuditLog`.
  - Build seed data script (`prisma/seed.ts`) with admin and customer test accounts.
  - Implement pure and transactional `OrderStateMachine` with unit tests.
- **Phase 3: Service Layer & Provider Abstraction (Strategy Pattern) (45 mins)**
  - Build `IMailboxProvider` interface with Google and Microsoft implementations (simulated delay + 20% random error rate).
  - Implement `OrderService` with database-level idempotency key handling.
- **Phase 4: Background Provisioning Worker (35 mins)**
  - Polling worker with atomic state lock (`PENDING -> PROVISIONING`) ensuring running multiple workers in parallel never processes an order twice.
- **Phase 5: User Interface & Role-Based Views (50 mins)**
  - Customer views: Order creation form, order list, order detail with per-mailbox status and audit log.
  - Admin views: Filterable order list (by status and provider), pagination, and retry button for `FAILED` orders.
- **Phase 6: Integration Testing & Verification (30 mins)**
  - End-to-end integration tests for order creation and retry state machine.

**Total Time**: ~4 hours (within hard cap).

---

## 2. Key Prompts Used
1. *"Initialize a new Next.js App Router project using TypeScript and Tailwind CSS. Create a docker-compose.yml file for a PostgreSQL database, a .env.example file with required database connection strings, and install Prisma ORM. Also create CLAUDE.md enforcing strict TypeScript and layered architecture."*
2. *"Create a new git branch called feat/database-and-statemachine and implement Prisma schema (User, Order, Mailbox, AuditLog), seed script with customer and admin roles, and a dedicated State Machine service layer that strictly enforces allowed transitions."*
3. *"Decouple the domain types from @prisma/client to resolve TypeScript resolution errors when client types are not yet generated, and implement complete unit tests for the state machine transitions."*
4. *"Implement the Provider Strategy pattern for Google and Microsoft with mocked latency and 20% failure rate, and the OrderService with strict idempotency verification."*

---

## 3. Instances Where the AI Was Wrong & How It Was Fixed

### Issue 1: `typeof prisma.$transaction` Parameter Overload Resolution
- **What went wrong**: 
  The AI attempted to type the database transaction client using:
  ```typescript
  type TransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
  ```
  Because `$transaction` has overloaded signatures in Prisma, TypeScript resolved `Parameters<...>` against the batch promise array overload rather than the interactive callback overload. This caused `tx` to evaluate to `never` / implicit `any` (`ts(7006)`).
- **How it was fixed**:
  Created an explicit, decoupled `TransactionClient` interface requiring exactly the query methods used (`order.findUnique`, `order.update`, `auditLog.create`), and explicitly annotated `(tx: TransactionClient)` in the callback function.

### Issue 2: Tight Coupling of Domain Types to Uncompiled `@prisma/client`
- **What went wrong**:
  The AI initially imported `OrderStatus` and `Order` directly from `@prisma/client`. In development environments where `prisma generate` has not yet completed, TypeScript flagged missing module declarations with red errors across all service and test files.
- **How it was fixed**:
  Created a dedicated domain types module at `src/types/domain.ts` declaring enums and model contracts independently. Services and UI now consume domain types cleanly, ensuring full compile-time safety and zero editor linting errors.

---

## 4. What Was Changed / Verified by Hand
- Added `.gitattributes` to enforce consistent LF line endings across Windows, macOS, and Linux Docker containers.
- Configured local environment variables in `.env` to match the PostgreSQL Docker container credentials.
- Refined state machine transition error messages to explicitly output the allowed next states when an illegal transition is attempted.
