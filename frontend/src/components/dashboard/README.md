# Dashboard Module

Self-contained Dashboard folder for the DCSP platform.
React + TypeScript + Axios + Recharts. No Redux.

## Folder structure

```
Dashboard/
├── Dashboard.tsx              ← main entry point (use this in App.tsx)
├── index.ts                   ← barrel exports
│
├── types/
│   └── dashboard.ts           ← TypeScript interfaces matching every C# DTO
│
├── services/
│   └── dashboardApi.ts        ← Axios calls to .NET API
│
├── hooks/
│   └── useDashboard.ts        ← generic data-fetch hook (loading/error/data)
│
└── components/
    ├── shared/
    │   ├── DashboardShared.tsx ← KpiCard, Card, Pill, Tooltip, helpers
    │   └── DashboardLayout.tsx ← sidebar + header + role switcher
    │
    ├── Management/
    │   └── ManagementDashboard.tsx   ← GET /api/dashboard/management
    ├── Operations/
    │   └── OperationsDashboard.tsx   ← GET /api/dashboard/operations
    ├── Collection/
    │   └── CollectionDashboard.tsx   ← GET /api/dashboard/collection
    └── Strategy/
        └── StrategyDashboard.tsx     ← GET /api/dashboard/strategy
```

## Setup

### 1. Copy this folder into your project
```
frontend/src/components/Dashboard/
```

### 2. Install dependencies (if not already installed)
```bash
npm install axios recharts
npm install -D @types/recharts
```

### 3. Set the API base URL
Create or update `frontend/.env`:
```
VITE_API_BASE_URL=http://localhost:5093
```

### 4. Use in App.tsx
```tsx
import Dashboard from './components/Dashboard'

function App() {
  return <Dashboard />
}
```

### 5. Or use individual pages in your router
```tsx
import { ManagementDashboard, OperationsDashboard } from './components/Dashboard'

// React Router example
<Route path="/dashboard/management" element={<ManagementDashboard />} />
<Route path="/dashboard/operations" element={<OperationsDashboard />} />
```

## API endpoints used

| Dashboard        | Endpoint                          | Method |
|-----------------|-----------------------------------|--------|
| Management      | `/api/dashboard/management`       | GET    |
| Operations      | `/api/dashboard/operations`       | GET    |
| Collection Mgr  | `/api/dashboard/collection`       | GET    |
| Strategy        | `/api/dashboard/strategy`         | GET    |
| Approve strategy| `/api/dashboard/strategy/approve/:id` | POST |
| Reject strategy | `/api/dashboard/strategy/reject/:id`  | POST |

## Color palette used

| Color    | Hex       | Usage                          |
|----------|-----------|--------------------------------|
| Navy     | `#050058` | Sidebar, primary text, borders |
| Blue     | `#000182` | Secondary accent, chart bars   |
| Ice Blue | `#D9EAF5` | Card backgrounds, hover states |
| White    | `#FFFFFF` | Cards                          |
| Gold     | `#CE9B01` | Active nav, CTAs, highlights   |

## Adding JWT auth later

When JWT is ready, update `dashboardApi.ts` — the interceptor
already reads from `localStorage.getItem('authToken')`:

```ts
// This is already in dashboardApi.ts:
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('authToken')
  if (token && cfg.headers) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})
```

Just store the token on login:
```ts
localStorage.setItem('authToken', response.data.token)
```

The role switcher in the header can then be hidden and the role
auto-detected from the JWT claims.
