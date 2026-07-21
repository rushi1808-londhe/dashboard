// ─────────────────────────────────────────────────────────────
//  Dashboard.tsx  —  main entry point
//
//  Drop this whole Dashboard/ folder into:
//    frontend/src/components/Dashboard/
//
//  Then in App.tsx (or your router) import and use:
//    import Dashboard from './components/Dashboard/Dashboard'
//    <Dashboard />
//
//  The role switcher in the header lets you switch between all
//  4 dashboards. Once JWT auth is added, the role will come
//  from the auth context automatically.
// ─────────────────────────────────────────────────────────────

import React, { useState, useCallback } from 'react'
import type { DashboardRole } from './types/dashboard'
import DashboardLayout    from './components/shared/DashboardLayout'
import ManagementDashboard from './components/Management/ManagementDashboard'
import CollectionDashboard from './components/Collection/CollectionDashboard'
import AdminDashboard from './components/Admin/AdminDashboard'

// ── Refresh key trick: incrementing forces the child to re-mount and re-fetch
function useRefreshKey() {
  const [key, setKey] = useState(0)
  const refresh = useCallback(() => setKey(k => k + 1), [])
  return { key, refresh }
}

export default function Dashboard() {
  const [role, setRole] = useState<DashboardRole>('management')
  const { key, refresh } = useRefreshKey()

  const renderPage = () => {
    switch (role) {
      case 'management': return <ManagementDashboard key={key}/>
      case 'collection': return <CollectionDashboard key={key}/>
      case 'admin':   return <AdminDashboard   key={key}/>
      default:           return <ManagementDashboard key={key}/>
    }
  }

  return (
    <DashboardLayout
      activeRole={role}
      onRoleChange={setRole}
      onRefresh={refresh}
    >
      {renderPage()}
    </DashboardLayout>
  )
}
