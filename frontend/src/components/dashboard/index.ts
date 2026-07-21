// ─────────────────────────────────────────────────────────────
//  Dashboard module — barrel exports
//  Usage in App.tsx:
//    import Dashboard from './components/dashboard'
// ─────────────────────────────────────────────────────────────

export { default } from './Dashboard'
export { default as ManagementDashboard } from './components/Management/ManagementDashboard'
export { default as CollectionDashboard } from './components/Collection/CollectionDashboard'
export { default as AdminDashboard } from './components/Admin/AdminDashboard'
export { dashboardApi } from './services/dashboardApi'
export { useDashboard } from './hooks/useDashboard'
export type {
  DashboardRole,
  ManagementDashboard as ManagementDashboardType,
  CollectionManagerDashboard,
  AdminDashboard as AdminDashboardType,
} from './types/dashboard'
