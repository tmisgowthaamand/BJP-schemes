import React, { useState, useEffect } from 'react';
import {
  Shield, Menu, X, LayoutDashboard, FileText, Key, MapPin,
  Building, CheckSquare, BarChart3, Award, RefreshCw, Users, Home, Activity, LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * AdminMobileNav - Shared mobile navigation for all 5 admin dashboards.
 *
 * Shows a sticky topbar (logo + title + hamburger) on screens <= 1023px.
 * Hamburger opens a slide-in drawer from the right with all nav items.
 *
 * Props:
 *   role     - 'SUPER_ADMIN' | 'STATE_ADMIN' | 'DISTRICT_ADMIN' | 'ASSEMBLY_ADMIN' | 'BOOTH_ADMIN'
 *   title    - Display title (e.g. "Super Admin Portal")
 *   subPage  - Current active page key
 *   onNavigate - (pageKey) => void — called when a nav item is tapped
 *   onRefresh  - () => void — called when "Refresh" is tapped
 *   navItems   - Array of { id, label, icon? } — nav menu items
 */

const ROLE_THEME = {
  SUPER_ADMIN:    { accent: '#a78bfa', label: 'SUPER ADMIN' },
  STATE_ADMIN:    { accent: '#34d399', label: 'STATE ADMIN' },
  DISTRICT_ADMIN: { accent: '#38bdf8', label: 'DISTRICT ADMIN' },
  ASSEMBLY_ADMIN: { accent: '#f97316', label: 'ASSEMBLY ADMIN' },
  BOOTH_ADMIN:    { accent: '#FF6B35', label: 'BOOTH ADMIN' },
};

const DEFAULT_NAV = {
  SUPER_ADMIN: [
    { id: 'dashboard', label: 'Overview Dashboard' },
    { id: 'applications', label: 'Scheme Applications' },
    { id: 'logins', label: 'Passcodes & Logins' },
    { id: 'districts', label: 'District Stats' },
    { id: 'assemblies', label: 'Assembly Stats' },
    { id: 'booths', label: 'Booth Stats' },
    { id: 'booth_president', label: 'Booth President Requests' },
    { id: 'reports', label: 'Reports & Export' },
  ],
  STATE_ADMIN: [
    { id: 'dashboard', label: 'Overview Dashboard' },
    { id: 'applications', label: 'Scheme Applications' },
    { id: 'districts', label: 'District Stats' },
    { id: 'assemblies', label: 'Assembly Stats' },
    { id: 'booths', label: 'Booth Stats' },
    { id: 'reports', label: 'Reports & Export' },
  ],
  DISTRICT_ADMIN: [
    { id: 'dashboard', label: 'Overview' },
    { id: 'applications', label: 'Applications' },
    { id: 'assemblies', label: 'Assembly Stats' },
    { id: 'booths', label: 'Booth Breakdown' },
    { id: 'reports', label: 'Reports & Export' },
  ],
  ASSEMBLY_ADMIN: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'applications', label: 'Applications' },
    { id: 'booths', label: 'Booth Breakdown' },
    { id: 'reports', label: 'Reports & Export' },
  ],
  BOOTH_ADMIN: [
    { id: 'dashboard', label: 'My Booth' },
    { id: 'applications', label: 'Applications' },
    { id: 'allvoters', label: 'All Voters' },
    { id: 'reports', label: 'Reports & Export' },
  ],
};

const AdminMobileNav = ({ role = 'SUPER_ADMIN', title, subPage, onNavigate, onRefresh, navItems }) => {
  const [open, setOpen] = useState(false);
  const { admin, logoutAdmin } = useAuth();
  const theme = ROLE_THEME[role] || ROLE_THEME.SUPER_ADMIN;
  const items = navItems || DEFAULT_NAV[role] || DEFAULT_NAV.SUPER_ADMIN;

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) { document.body.style.overflow = 'hidden'; }
    else { document.body.style.overflow = ''; }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleNav = (id) => {
    setOpen(false);
    onNavigate?.(id);
  };

  return (
    <>
      <style>{`
        .amn-topbar{
          display:none;
          align-items:center;
          justify-content:space-between;
          padding:0 16px;
          padding-top:env(safe-area-inset-top,0px);
          height:calc(56px + env(safe-area-inset-top,0px));
          background:var(--theme-bg-card,#141022);
          border-bottom:1px solid var(--theme-border,#2b2242);
          position:sticky;
          top:0;
          left:0;
          right:0;
          z-index:200;
          gap:10px;
          width:100%;
          max-width:100vw;
          box-sizing:border-box;
          overflow:hidden;
        }
        .amn-topbar-title{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:800;color:var(--theme-text-main,#f5f3ff);min-width:0;flex:1;overflow:hidden}
        .amn-menu-btn{width:40px;height:40px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.07);border:1px solid var(--theme-border,#2b2242);border-radius:10px;color:var(--theme-text-main,#f5f3ff);cursor:pointer;flex-shrink:0;-webkit-tap-highlight-color:transparent}
        .amn-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:1300;animation:amn-fade .2s ease}
        .amn-drawer{position:fixed;top:0;right:0;bottom:0;width:72vw;max-width:300px;min-width:240px;background:var(--theme-bg-card,#141022);border-left:1px solid var(--theme-border,#2b2242);z-index:1400;display:flex;flex-direction:column;padding:0;overflow-y:auto;overflow-x:hidden;animation:amn-slide .28s cubic-bezier(.16,1,.3,1);box-shadow:-10px 0 40px rgba(0,0,0,.6)}
        .amn-drawer-head{display:flex;align-items:center;justify-content:space-between;padding:14px 14px 12px;border-bottom:1px solid var(--theme-border,#2b2242);flex-shrink:0;padding-top:calc(14px + env(safe-area-inset-top,0px))}
        .amn-drawer-head-info{min-width:0}
        .amn-drawer-role{font-size:10px;font-weight:800;padding:3px 8px;border-radius:20px;display:inline-block;margin-bottom:4px}
        .amn-drawer-title{font-size:14px;font-weight:800;color:var(--theme-text-main,#f5f3ff)}
        .amn-close-btn{width:40px;height:40px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.06);border:1px solid var(--theme-border,#2b2242);border-radius:8px;color:var(--theme-text-main,#f5f3ff);cursor:pointer;flex-shrink:0;-webkit-tap-highlight-color:transparent}
        .amn-nav-list{display:flex;flex-direction:column;gap:2px;padding:10px 8px;flex:1;padding-bottom:calc(10px + env(safe-area-inset-bottom,0px))}
        .amn-nav-item{display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;border-radius:10px;font-size:14px;font-weight:600;color:var(--theme-text-muted,#9d8ec4);background:transparent;border:none;cursor:pointer;text-align:left;transition:background .15s,color .15s;-webkit-tap-highlight-color:transparent;min-height:44px;box-sizing:border-box}
        .amn-nav-item:hover{background:rgba(255,255,255,0.05);color:var(--theme-text-main,#f5f3ff)}
        .amn-nav-item.active{background:var(--theme-accent-gradient,linear-gradient(135deg,#7c3aed,#a78bfa));color:#fff !important;font-weight:700}
        .amn-refresh-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:10px;margin-top:8px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid var(--theme-border,#2b2242);background:rgba(255,255,255,0.04);color:var(--theme-text-muted,#9d8ec4);-webkit-tap-highlight-color:transparent;min-height:44px}
        @keyframes amn-fade{from{opacity:0}to{opacity:1}}
        @keyframes amn-slide{from{transform:translateX(100%)}to{transform:translateX(0)}}
        @media(min-width:1024px){.amn-topbar{display:none !important}}
        @media(max-width:1023px){.amn-topbar{display:flex !important}}
      `}</style>

      {/* ── Sticky top bar ── */}
      <div className="amn-topbar">
        <div className="amn-topbar-title">
          <Shield size={18} color={theme.accent} style={{ flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {title || theme.label}
            </div>
            {admin && (admin.assemblyName || admin.district) && (
              <div style={{ fontSize: '11px', color: 'var(--theme-text-muted, #9d8ec4)', fontWeight: 500, marginTop: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {admin.assemblyName && <span>{admin.assemblyName}</span>}
                {admin.boothNo && (
                  <span style={{ background: `${theme.accent}22`, color: theme.accent, border: `1px solid ${theme.accent}44`, borderRadius: '20px', padding: '1px 7px', fontSize: '10px', fontWeight: 700 }}>
                    Booth #{admin.boothNo}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <button className="amn-menu-btn" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu size={20} />
        </button>
      </div>

      {/* ── Drawer ── */}
      {open && (
        <>
          <div className="amn-overlay" onClick={() => setOpen(false)} />
          <nav className="amn-drawer" role="navigation" aria-label="Admin navigation">
            <div className="amn-drawer-head">
              <div className="amn-drawer-head-info">
                <span className="amn-drawer-role" style={{ background: `${theme.accent}22`, color: theme.accent, border: `1px solid ${theme.accent}44` }}>
                  {theme.label}
                </span>
                <div className="amn-drawer-title">{title || 'Admin Portal'}</div>
              </div>
              <button className="amn-close-btn" onClick={() => setOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="amn-nav-list">
              {items.map((item) => (
                <button
                  key={item.id}
                  className={`amn-nav-item ${subPage === item.id ? 'active' : ''}`}
                  onClick={() => handleNav(item.id)}
                >
                  {item.label}
                </button>
              ))}
              {onRefresh && (
                <button className="amn-refresh-btn" onClick={() => { setOpen(false); onRefresh(); }}>
                  <RefreshCw size={14} /> Refresh Data
                </button>
              )}
              {/* Sign Out */}
              <button
                className="amn-refresh-btn"
                style={{ marginTop: '4px', color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }}
                onClick={() => { setOpen(false); logoutAdmin(); }}
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </nav>
        </>
      )}
    </>
  );
};

export default AdminMobileNav;
