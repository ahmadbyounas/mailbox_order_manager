# Mailbox Order Manager

> Internal operations provisioning tool for pre-warmed Google and Microsoft mailboxes with state machine lifecycle, asynchronous worker, idempotency, and full audit logging.

---

## 📹 Demo Video
* [Watch Demo Video Walkthrough](https://youtu.be/placeholder-demo-video)  
*(Includes: Customer creating an order, simulated success & failure outcomes, background worker provisioning, Admin viewing audit log & retrying, and test suite execution).*

---

## 🛠️ Stack & Architecture
- **Framework**: Next.js 16 (App Router, Strict TypeScript)
- **Styling**: Tailwind CSS with custom dark glassmorphism design system
- **Database**: PostgreSQL 16 via Prisma ORM
- **State Machine**: Finite State Machine enforcing `PENDING -> PROVISIONING -> ACTIVE | FAILED` and admin retry `FAILED -> PENDING`
- **Background Worker**: Safe asynchronous processor utilizing atomic compare-and-swap state transition locks (concurrency-safe: running multiple workers never double-processes an order)
- **Design Patterns**: Finite State Machine, Strategy Pattern (vendor abstraction), Layered Architecture (Routes -> Services -> Database), Queue/Worker Pattern, Idempotency Key Pattern

---

## 🚀 Quick Setup (Clean Clone in < 10 Minutes)

### 1. Prerequisites
- Node.js >= 20.x
- Docker & Docker Compose (or a local PostgreSQL instance)
- Git

### 2. Installation
```bash
# Clone repository
git clone https://github.com/ahmadbyounas/mailbox_order_manager.git
cd mailbox_order_manager

# Install dependencies
npm install
```

### 3. Environment Setup & Database
```bash
# Copy example environment configuration
cp .env.example .env

# Start PostgreSQL database in Docker
docker compose up -d

# Apply database schema and migrations
npx prisma db push

# Seed test accounts and sample order
npm run db:seed
```

---

## 🏃 Running the Application

### 1. Start the Next.js Web App
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Start the Background Provisioning Worker
In a separate terminal window:
```bash
npm run worker
```
The worker will poll for `PENDING` orders, acquire an atomic state lock (`PROVISIONING`), invoke the vendor strategy (Google/Microsoft with ~20% simulated failure and 2-3s delay per mailbox), update each mailbox, and finalize the order with an immutable audit log.

---

## 👥 Seeded User Accounts (Logins)

Use the built-in **"Simulate User"** switcher in the top navigation bar to seamlessly toggle between seeded accounts:

| Role | Email | Description |
| :--- | :--- | :--- |
| **Admin** | `admin@mailbox.test` | Sees **all** tenant orders, filters by status/provider, paginates, and can trigger **Retry** on `FAILED` orders. |
| **Customer 1** | `customer@mailbox.test` | Primary customer account. Sees own orders, submits new orders with idempotency keys. |
| **Customer 2** | `startup@mailbox.test` | Secondary customer for tenant isolation testing. |

---

## 🧪 Running Tests

```bash
# Run all unit and integration tests
npm test
```
The test suite validates:
1. **State Machine Unit Tests**: Asserts legal transitions, terminal states (`ACTIVE`), and rejects illegal jumps (e.g., `PENDING -> ACTIVE`).
2. **Order Creation Integration Test**: Validates domain regex formatting, mailbox count constraints (1–50), and idempotency deduplication contracts.

---

## 📁 Repository Structure

```
├── docs/
│   ├── ARCHITECTURE.md          # Design patterns (Strategy, State Machine, Worker, etc.)
│   └── AI_WORKLOG.md            # Worklog, prompts, AI corrections, phase timings
├── prisma/
│   ├── schema.prisma            # Database models (User, Order, Mailbox, AuditLog)
│   └── seed.ts                  # Test user accounts & sample data
├── src/
│   ├── app/                     # Next.js App Router (UI & API Routes)
│   │   ├── api/orders/          # Layered route handlers (no business logic)
│   │   ├── orders/[id]/         # Order detail view (per-mailbox & audit log)
│   │   ├── page.tsx             # Main dashboard (Customer view & Admin filters)
│   │   └── globals.css          # Styling & badge utility classes
│   ├── components/              # UI components (Navbar, Modal, StatusBadge)
│   ├── lib/                     # Utilities (Prisma client, Auth session, ApiResponse, Zod)
│   ├── providers/               # Strategy Pattern vendor abstractions (Google, Microsoft)
│   ├── services/                # Domain Service Layer & State Machine
│   ├── types/                   # Decoupled domain TypeScript interfaces
│   └── worker/                  # Safe asynchronous background provisioning worker
├── docker-compose.yml           # PostgreSQL Docker service
├── CLAUDE.md                    # Coding standards and architectural invariants
└── README.md
```

---

## ⚠️ Known Limitations
1. **Mocked Email Providers**: Google Workspace and Microsoft 365 APIs are simulated with realistic delays (2–3 seconds) and a 20% random failure rate, without making live billing calls to Google Cloud or Azure.
2. **Session Authentication**: Uses signed cookies and a development header switcher to allow testing both roles in a single browser session. In production, this would integrate with OAuth2/NextAuth.js.
