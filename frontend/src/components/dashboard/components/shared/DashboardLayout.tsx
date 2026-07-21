import React, { useState } from 'react'
import type { DashboardRole } from '../../types/dashboard'
import {
  LayoutGrid, FolderKanban, Puzzle, CheckCircle2, BarChart3, LineChart,
  Users, Settings, Radio, Search, RefreshCw, Bell, ChevronDown,
  ChevronLeft, ChevronRight,
} from 'lucide-react'

// ── Palette ──────────────────────────────────────────────────
const C = {
  navy: '#050058', blue: '#000182', ice: '#D9EAF5',
  gold: '#CE9B01', bg: '#F0F4FA', white: '#FFFFFF',
}

// ── Role config ───────────────────────────────────────────────
const ROLES: {
  id: DashboardRole; label: string; short: string
  iconBg: string; iconColor: string; description: string
}[] = [
  { id:'management', label:'Management',       short:'MG', iconBg:'#D9EAF5', iconColor:'#050058', description:'Portfolio & recovery overview' },
  { id:'collection', label:'Collection Mgr',  short:'CM', iconBg:'#dcfce7', iconColor:'#16a34a', description:'Buckets, telecallers & agencies' },
  { id:'admin',   label:'Admin',         short:'AM', iconBg:'#fef9c3', iconColor:'#CE9B01', description:'Strategies & approvals'         },
]

const NAV_ITEMS = [
  { id:'dashboard', label:'Dashboard',        icon:LayoutGrid  },
  { id:'cases',     label:'Case Management',  icon:FolderKanban  },
  { id:'strategy',  label:'Strategy Builder', icon:Puzzle  },
  { id:'approvals', label:'Approvals',        icon:CheckCircle2, badge:3 },
  { id:'reports',   label:'Reports',          icon:BarChart3  },
  { id:'analytics', label:'Analytics',        icon:LineChart  },
  { id:'users',     label:'User Management',  icon:Users  },
  { id:'masters',   label:'Masters Config',   icon:Settings  },
  { id:'comms',     label:'Comm. Config',     icon:Radio  },
]

// ── Props ─────────────────────────────────────────────────────
interface DashboardLayoutProps {
  activeRole:    DashboardRole
  onRoleChange:  (r: DashboardRole) => void
  onRefresh:     () => void
  children:      React.ReactNode
}

export default function DashboardLayout({
  activeRole, onRoleChange, onRefresh, children
}: DashboardLayoutProps) {
  const [collapsed,    setCollapsed]    = useState(false)
  const [roleOpen,     setRoleOpen]     = useState(false)
  const [activeNav,    setActiveNav]    = useState('dashboard')

  const currentRole = ROLES.find(r => r.id === activeRole)!

  const roleTitle: Record<DashboardRole, string> = {
    management: 'Management Dashboard',
    collection: 'Collection Manager Dashboard',
    admin:   'Admin Dashboard',
  }

  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })
  const dateStr = now.toLocaleDateString('en-IN',  { day:'2-digit', month:'short', year:'numeric' })

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:C.bg, fontFamily:'Inter, system-ui, sans-serif' }}>

      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      <aside style={{
        width: collapsed ? 64 : 240,
        minWidth: collapsed ? 64 : 240,
        background: `linear-gradient(180deg, ${C.navy} 0%, ${C.blue} 100%)`,
        display:'flex', flexDirection:'column',
        height:'100vh', position:'sticky', top:0,
        transition:'width .25s ease, min-width .25s ease',
        borderRight:'1px solid rgba(255,255,255,0.08)',
        zIndex:10,
      }}>

        {/* Logo */}
        <div style={{
          display:'flex', alignItems:'center', gap:10, padding:'20px 16px',
          borderBottom:'1px solid rgba(255,255,255,0.1)',
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          <div style={{
            width:36, height:36, borderRadius:10, flexShrink:0,
            background:`linear-gradient(135deg,${C.gold},#f0b800)`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:13, fontWeight:900, color:C.navy, boxShadow:'0 2px 8px rgba(206,155,1,.4)',
          }}>DC</div>
          {!collapsed && (
            <div>
              <p style={{ margin:0, color:'#fff', fontWeight:700, fontSize:13, lineHeight:1.2 }}>SBFC Finance</p>
              <p style={{ margin:0, color:`${C.gold}99`, fontSize:10, letterSpacing:'.04em' }}>Digital Collections</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex:1, overflowY:'auto', padding:'12px 8px' }}>
          {!collapsed && (
            <p style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.25)', textTransform:'uppercase', letterSpacing:'.1em', padding:'0 8px', marginBottom:6 }}>
              Main Menu
            </p>
          )}
          {NAV_ITEMS.map(item => {
            const isActive = activeNav === item.id
            return (
              <button
                key={item.id}
                title={collapsed ? item.label : undefined}
                onClick={() => setActiveNav(item.id)}
                style={{
                  width:'100%', display:'flex', alignItems:'center',
                  gap:10, padding:'9px 10px', borderRadius:10,
                  border:'none', cursor:'pointer', marginBottom:2,
                  textAlign:'left', transition:'all .15s',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  background: isActive
                    ? `linear-gradient(90deg,rgba(206,155,1,.22),rgba(206,155,1,.05))`
                    : 'transparent',
                  borderLeft: isActive ? `3px solid ${C.gold}` : '3px solid transparent',
                  color: isActive ? '#f0b800' : 'rgba(255,255,255,.55)',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.07)' }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >
                <span style={{ display:'flex', alignItems:'center', flexShrink:0 }}><item.icon size={16}/></span>
                {!collapsed && (
                  <>
                    <span style={{ fontSize:13, flex:1, fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
                    {item.badge && (
                      <span style={{
                        background:`linear-gradient(135deg,${C.gold},#f0b800)`,
                        color:C.navy, fontSize:10, fontWeight:800,
                        width:18, height:18, borderRadius:'50%',
                        display:'flex', alignItems:'center', justifyContent:'center',
                      }}>{item.badge}</span>
                    )}
                  </>
                )}
              </button>
            )
          })}
        </nav>

        {/* User strip */}
        <div style={{ borderTop:'1px solid rgba(255,255,255,.1)' }}>
          {!collapsed && (
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px' }}>
              <div style={{
                width:32, height:32, borderRadius:'50%', flexShrink:0,
                background:`linear-gradient(135deg,${C.gold},#f0b800)`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:11, fontWeight:800, color:C.navy,
              }}>RK</div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ margin:0, color:'#fff', fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>Rajesh Kumar</p>
                <p style={{ margin:0, color:`${C.gold}60`, fontSize:10 }}>Super Admin</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{ width:'100%', padding:'8px 0', background:'transparent', border:'none', cursor:'pointer', color:'rgba(255,255,255,.3)', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = C.gold }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,.3)' }}
          >
            {collapsed ? <ChevronRight size={15}/> : <ChevronLeft size={15}/>}
          </button>
        </div>
      </aside>

      {/* ── MAIN AREA ────────────────────────────────────────── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>

        {/* ── HEADER ── */}
        <header style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'0 24px', height:60, flexShrink:0,
          background:'#fff', borderBottom:'1px solid #E4EEF8',
          boxShadow:'0 1px 4px rgba(5,0,88,.06)', position:'sticky', top:0, zIndex:9,
        }}>
          <div>
            <h1 style={{ margin:0, fontSize:17, fontWeight:700, color:C.navy }}>{roleTitle[activeRole]}</h1>
            <p style={{ margin:0, fontSize:11, color:'#9ca3af' }}>
              Real-time data · Auto-refresh every 5 min · {timeStr}, {dateStr}
            </p>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {/* Search */}
            <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
              <Search size={13} color="#9ca3af" style={{ position:'absolute', left:10 }}/>
              <input
                placeholder="Search cases…"
                style={{
                  background:'#F8FAFD', border:'1px solid #E4EEF8', borderRadius:10,
                  padding:'7px 12px 7px 30px', fontSize:12, color:C.navy,
                  outline:'none', width:180,
                }}
                onFocus={e => (e.target.style.borderColor = `${C.navy}40`)}
                onBlur={e  => (e.target.style.borderColor = '#E4EEF8')}
              />
            </div>

            {/* Role Switcher */}
            <div style={{ position:'relative' }}>
              <button
                onClick={() => setRoleOpen(!roleOpen)}
                style={{
                  display:'flex', alignItems:'center', gap:8,
                  padding:'7px 12px', borderRadius:10,
                  border:'1px solid #E4EEF8', background:'#fff',
                  cursor:'pointer', fontSize:12, fontWeight:600, color:C.navy,
                }}
                onMouseEnter={e=>(e.currentTarget.style.borderColor=`${C.navy}40`)}
                onMouseLeave={e=>(e.currentTarget.style.borderColor='#E4EEF8')}
              >
                <span style={{
                  width:22, height:22, borderRadius:'50%', flexShrink:0,
                  background:currentRole.iconBg, color:currentRole.iconColor,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:9, fontWeight:800,
                }}>{currentRole.short}</span>
                {currentRole.label}
                <ChevronDown size={13} style={{ transform: roleOpen ? 'rotate(180deg)' : 'none', transition:'.15s' }}/>
              </button>

              {roleOpen && (
                <>
                  {/* backdrop */}
                  <div style={{ position:'fixed', inset:0, zIndex:19 }} onClick={() => setRoleOpen(false)}/>
                  <div style={{
                    position:'absolute', right:0, top:'calc(100% + 6px)',
                    width:220, background:'#fff', border:'1px solid #E4EEF8',
                    borderRadius:14, boxShadow:'0 8px 32px rgba(5,0,88,.14)',
                    zIndex:20, overflow:'hidden',
                  }}>
                    <p style={{ margin:0, padding:'8px 14px 6px', fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.07em' }}>
                      Switch Role
                    </p>
                    {ROLES.map(r => (
                      <button
                        key={r.id}
                        onClick={() => { onRoleChange(r.id); setRoleOpen(false) }}
                        style={{
                          width:'100%', display:'flex', alignItems:'center', gap:10,
                          padding:'10px 14px', border:'none', cursor:'pointer', textAlign:'left',
                          background: activeRole === r.id ? C.ice : 'transparent',
                          transition:'background .1s',
                        }}
                        onMouseEnter={e => { if (activeRole!==r.id)(e.currentTarget as HTMLButtonElement).style.background = '#F8FAFD' }}
                        onMouseLeave={e => { if (activeRole!==r.id)(e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                      >
                        <span style={{
                          width:28, height:28, borderRadius:'50%', flexShrink:0,
                          background:r.iconBg, color:r.iconColor,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:10, fontWeight:800,
                        }}>{r.short}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ margin:0, fontSize:13, fontWeight:600, color:C.navy }}>{r.label}</p>
                          <p style={{ margin:0, fontSize:10, color:'#9ca3af' }}>{r.description}</p>
                        </div>
                        {activeRole === r.id && (
                          <span style={{ width:8, height:8, borderRadius:'50%', background:C.navy, flexShrink:0 }}/>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Refresh */}
            <button
              onClick={onRefresh}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:10, border:'1px solid #E4EEF8', background:'#F8FAFD', cursor:'pointer', fontSize:12, color:C.navy, fontWeight:500 }}
              onMouseEnter={e=>(e.currentTarget.style.borderColor=`${C.navy}40`)}
              onMouseLeave={e=>(e.currentTarget.style.borderColor='#E4EEF8')}
            >
              <RefreshCw size={13}/> Refresh
            </button>

            {/* Bell */}
            <button style={{ position:'relative', width:36, height:36, borderRadius:10, border:'1px solid #E4EEF8', background:'#F8FAFD', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}
              onMouseEnter={e=>(e.currentTarget.style.borderColor=`${C.navy}40`)}
              onMouseLeave={e=>(e.currentTarget.style.borderColor='#E4EEF8')}>
              <Bell size={15}/>
              <span style={{ position:'absolute', top:4, right:4, width:8, height:8, borderRadius:'50%', background:'#dc2626', border:'2px solid #fff' }}/>
            </button>

            {/* Settings */}
            <button style={{ width:36, height:36, borderRadius:10, border:'1px solid #E4EEF8', background:'#F8FAFD', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}
              onMouseEnter={e=>(e.currentTarget.style.borderColor=`${C.navy}40`)}
              onMouseLeave={e=>(e.currentTarget.style.borderColor='#E4EEF8')}>
              <Settings size={15}/>
            </button>
          </div>
        </header>

        {/* ── PAGE CONTENT ── */}
        <main style={{ flex:1, overflowY:'auto' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
