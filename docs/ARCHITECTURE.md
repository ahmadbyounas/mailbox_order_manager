# System Architecture & Design Patterns

## Overview
The **Mailbox Order Manager** is an enterprise-grade internal provisioning system built with Next.js (App Router, TypeScript) and PostgreSQL (Prisma ORM). It strictly enforces a layered architecture to ensure separation of concerns, testability, auditability, and idempotent operations.

---

## 1. Design Patterns Used

### 1. Finite State Machine (FSM)
- **Where it lives**: [`src/services/state-machine/order-state-machine.ts`](file:///c:/Users/abyru/Documents/NEXTJS/Mailbox/src/services/state-machine/order-state-machine.ts) and [`src/services/state-machine/types.ts`](file:///c:/Users/abyru/Documents/NEXTJS/Mailbox/src/services/state-machine/types.ts)
- **Why chosen**: 
  Order lifecycles have strict, non-linear business rules (`PENDING -> PROVISIONING -> ACTIVE | FAILED`, with an admin-only retry `FAILED -> PENDING`). An explicit state machine prevents invalid status leaps (e.g. `PENDING -> ACTIVE` or resurrecting an already `ACTIVE` order) and guarantees that every state transition is recorded in the `AuditLog` table within an atomic database transaction.
- **Alternative rejected**: 
  *Ad-hoc status updates in route handlers or ORM hooks*. Rejected because status logic becomes fragmented, prone to race conditions, and bypasses transactional audit logging.

---

### 2. Layered Architecture (Service & Data Access Layer)
- **Where it lives**:
  - Presentation / Route Handlers: `src/app/api/...`
  - Domain Service Layer: `src/services/...`
  - Database Client: [`src/lib/prisma.ts`](file:///c:/Users/abyru/Documents/NEXTJS/Mailbox/src/lib/prisma.ts)
- **Why chosen**:
  Ensures zero business logic exists in Next.js Route Handlers or React UI components. Route handlers solely validate HTTP requests (using Zod) and delegate to services. Services orchestrate transactions and business validation.
- **Alternative rejected**:
  *Fat Route Handlers / Smart UI Components*. Rejected because embedding database queries and domain logic directly in routes creates tight coupling, makes unit testing difficult, and violates the task requirements.

---

### 3. Strategy Pattern (Provider Abstraction)
- **Where it lives**: `src/providers/` (`mailbox-provider.interface.ts`, `google-provider.ts`, `microsoft-provider.ts`, `provider-factory.ts`)
- **Why chosen**:
  The system provisions mailboxes via multiple external email services (Google Workspace and Microsoft 365). Each provider has distinct API contracts, error shapes, and failure rates (mocked ~20% failure and simulated latency). The Strategy pattern allows the background worker to invoke a uniform `IMailboxProvider` interface without caring about vendor-specific implementation details.
- **Alternative rejected**:
  *Conditional switch/case statements inside the worker loop*. Rejected because adding new mailbox providers (e.g., Zoho, Proton) would require editing worker code, violating the Open/Closed Principle.

---

### 4. Background Worker & Queue Pattern (Idempotent Provisioning)
- **Where it lives**: `src/worker/` (`worker.ts`, `queue.ts`)
- **Why chosen**:
  Mailbox provisioning takes multiple seconds per mailbox and is subject to network/provider failures. Processing orders asynchronously keeps customer API responses instantaneous and decouples heavy operations. Using atomic database locks (`SELECT FOR UPDATE` / state transition from `PENDING` to `PROVISIONING`) guarantees that running the worker multiple times concurrently never provisions the same order twice.
- **Alternative rejected**:
  *Synchronous in-request provisioning during HTTP POST*. Rejected because long-running external API calls would cause HTTP timeouts, poor UX, and would fail if the client disconnected mid-request.

---

### 5. Idempotency Key Pattern
- **Where it lives**: `src/services/order.service.ts`
- **Why chosen**:
  Network retries or double form submissions must not create duplicate orders or bill customers twice. Each order creation accepts an `idempotencyKey` stored uniquely in PostgreSQL. Re-submitting an identical key returns the original order without side effects.
- **Alternative rejected**:
  *Client-side button disabling only*. Rejected because it is vulnerable to network replays, concurrent automated API calls, and browser refreshes.
