# Frontend — React (Vite)

## Prerequisites

| Requirement | Verify with |
|---|---|
| Node.js (LTS) | `node -v` |
| npm | `npm -v` |

The backend API should be running first — see [`../backend/README.md`](../backend/README.md).

## Setup

### Step 1: Move into the frontend folder
```bash
cd frontend
```

### Step 2: Create your local environment file
```bash
cp .env.example .env
```

### Step 3: Confirm `.env` contains
```
VITE_API_BASE_URL=http://localhost:8000/api/v1
```
This should point to your locally running Laravel API.

### Step 4: Install dependencies
```bash
npm install
```

### Step 5: Start the dev server
```bash
npm run dev
```
It should print a local URL, typically:
```
http://localhost:5173
```
Open it in your browser to confirm the app loads.

## Source structure

```text
src/
├── app/          # Application shell and route composition
├── api/          # API client, auth context, and mock transport
├── components/   # Reusable UI primitives and layout components
│   ├── common/
│   ├── layout/
│   └── ui/
├── features/     # Domain-focused screens, components, and hooks
│   ├── alerts/
│   ├── auth/
│   ├── dashboard/
│   ├── inventory/
│   ├── orders/
│   ├── reports/
│   └── users/
└── lib/          # Shared, domain-independent helpers
```

Use the `@/` alias for imports that cross folder boundaries. Relative imports are
reserved for modules colocated within the same feature or component folder.
