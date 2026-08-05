/**
 * AdminNavbar.jsx
 * ──────────────────────────────────────────────────────────────────────────
 * Unified responsive navbar for all 5 BJP Nalam Thittam admin roles.
 *
 * Props:
 *   role      – 'SUPER_ADMIN' | 'STATE_ADMIN' | 'DISTRICT_ADMIN' |
 *               'ASSEMBLY_ADMIN' | 'BOOTH_ADMIN'
 *   title     – Contextual title string (e.g. "Chengalpattu District")
 *   onLogout  – Callback fired when the user clicks Logout
 *
 * Features:
 *   • Desktop (>1024px): full horizontal bar, role nav links, username badge
 *   • Mobile/Tablet (≤1024px): logo + title + three-dot → slide-in right panel
 *   • BOOTH_ADMIN: fixed bottom nav bar instead of three-dot on mobile
 *   • 300ms slide animation, backdrop, Escape-key close, body-scroll lock
 *   • All tap targets ≥ 44px, safe-area-inset support
 * ──────────────────────────────────────────────────────────────────────────
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, FileText, BookOpen, Key, BarChart3,
  Activity, LogOut, Map, Share2, Download, Building2, Grid,
  Home, User, MoreVertical, X, ChevronRight
} from 'lucide-react';

// ── Role theme colours ─────────────────────────────────────────────────────
const ROLE_THEME = {
  SUPER_ADMIN:    { label: 'Super Admin',    accent: '#a78bfa', bg: 'rgba(167,139,250,.18)', border: 'rgba(167,139,250,.3)', text: '#c4b5fd' },
  STATE_ADMIN:    { label: 'State Admin',    accent: '#34d399', bg: 'rgba(52,211,153,.18)',  border: 'rgba(52,211,153,.3)',  text: '#6ee7b7' },
  DISTRICT_ADMIN: { label: 'District Admin', accent: '#38bdf8', bg: 'rgba(56,189,248,.18)',  border: 'rgba(56,189,248,.3)',  text: '#7dd3fc' },
  ASSEMBLY_ADMIN: { label: 'Assembly Admin', accent: '#f97316', bg: 'rgba(249,115,22,.18)',  border: 'rgba(249,115,22,.3)',  text: '#ffb07c' },
  BOOTH_ADMIN:    { label: 'Booth Admin',    accent: '#FF6B35', bg: 'rgba(255,107,53,.18)',  border: 'rgba(255,107,53,.3)',  text: '#FF9933' },
};

// ── Nav items per role ─────────────────────────────────────────────────────
// Each item: { id, label, icon: LucideComponent, href?, isLogout? }
const NAV_ITEMS = {
  SUPER_ADMIN: [
    { id: 'dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
    { id: 'users',         label: 'Users',          icon: Users },
    { id: 'applications',  label: 'Applications',   icon: FileText },
    { id: 'schemes',       label: 'Schemes',        icon: BookOpen },
    { id: 'credentials',   label: 'Credentials',    icon: Key },
    { id: 'reports',       label: 'Reports',        icon: BarChart3 },
    { id: 'system',        label: 'System Health',  icon: Activity },
    { id: 'logout',        label: 'Logout',         icon: LogOut, isLogout: true },
  ],
  STATE_ADMIN: [
    { id: 'dashboard',     label: 'Dashboard',      icon: LayoutDashboard },
    { id: 'districts',     label: 'Districts',      icon: Map },
    { id: 'schemes',       label: 'Schemes',        icon: BookOpen },
    { id: 'referrals',     label: 'Referrals',      icon: Share2 },
    { id: 'export',        label: 'Export',         icon: Download },
    { id: 'logout',        label: 'Logout',         icon: LogOut, isLogout: true },
  ],
  DISTRICT_ADMIN: [
    { id: 'dashboard',     label: 'Overview',       icon: LayoutDashboard },
    { id: 'applications',  label: 'Applications',   icon: FileText },
    { id: 'assemblies',    label: 'Assemblies',     icon: Building2 },
    { id: 'credentials',   label: 'Credentials',    icon: Key },
    { id: 'export',        label: 'Export',         icon: Download },
    { id: 'logout',        label: 'Logout',         icon: LogOut, isLogout: true },
  ],
  ASSEMBLY_ADMIN: [
    { id: 'dashboard',     label: 'Dashboard',      icon: LayoutDashboard },
    { id: 'booths',        label: 'Booths',         icon: Grid },
    { id: 'applications',  label: 'Applications',   icon: FileText },
    { id: 'credentials',   label: 'Credentials',    icon: Key },
    { id: 'logout',        label: 'Logout',         icon: LogOut, isLogout: true },
  ],
  BOOTH_ADMIN: [
    { id: 'dashboard',     label: 'My Booth',       icon: Home },
    { id: 'voters',        label: 'Voters',         icon: Users },
    { id: 'activity',      label: "Today's Activity", icon: Activity },
    { id: 'logout',        label: 'Logout',         icon: LogOut, isLogout: true },
  ],
};

// Bottom-nav items for BOOTH_ADMIN mobile (4 tabs, no logout here)
const BOOTH_BOTTOM_ITEMS = [
  { id: 'dashboard', label: 'Home',     icon: Home },
  { id: 'voters',    label: 'Voters',   icon: Users },
  { id: 'activity',  label: 'Activity', icon: Activity },
  { id: 'profile',   label: 'Profile',  icon: User },
];

// ── Utility ────────────────────────────────────────────────────────────────
const truncate = (str, max) =>
  typeof str === 'string' && str.length > max ? str.slice(0, max) + '…' : str || '';

// ── Component ──────────────────────────────────────────────────────────────
const AdminNavbar = ({ role = 'SUPER_ADMIN', title = '', onLogout }) => {
  const { admin } = useAuth();

  const theme    = ROLE_THEME[role] || ROLE_THEME.SUPER_ADMIN;
  const navItems = NAV_ITEMS[role]  || NAV_ITEMS.SUPER_ADMIN;
  const isBooth  = role === 'BOOTH_ADMIN';

  // Active nav item (synced from URL path segment)
  const [activeId, setActiveId] = useState(() => {
    const seg = window.location.pathname.split('/').pop();
    const match = navItems.find(n => n.id === seg);
    return match ? match.id : navItems[0]?.id || 'dashboard';
  });

  // Mobile panel open state
  const [panelOpen, setPanelOpen] = useState(false);
  const overlayRef = useRef(null);

  // ── Lock body scroll when panel is open ──
  useEffect(() => {
    if (panelOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [panelOpen]);

  // ── Add bottom padding for booth bottom nav ──
  useEffect(() => {
    if (isBooth) {
      document.body.style.paddingBottom = '60px';
    }
    return () => { document.body.style.paddingBottom = ''; };
  }, [isBooth]);

  // ── Escape key closes panel ──
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setPanelOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const closePanel = useCallback(() => setPanelOpen(false), []);

  const handleNavClick = useCallback((item) => {
    if (item.isLogout) {
      setPanelOpen(false);
      onLogout?.();
      return;
    }
    setActiveId(item.id);
    setPanelOpen(false);
    // Emit a custom event so dashboards can react without props drilling
    window.dispatchEvent(new CustomEvent('admin-nav', { detail: { id: item.id } }));
    try {
      const base = window.location.pathname.replace(/\/[^/]+$/, '');
      window.history.pushState({}, '', `${base}/${item.id}`);
    } catch (_) {}
  }, [onLogout]);

  const username   = admin?.username || 'Admin';
  const displayTitle = truncate(title, 24);

  // ── Inline CSS via <style> tag (scoped by .anb- prefix) ───────────────
  const css = `
    /* ── root bar ── */
    .anb-bar {
      position: sticky;
      top: 0;
      z-index: 1000;
      width: 100%;
      height: 64px;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      background: var(--theme-bg-card, #141022);
      border-bottom: 1px solid var(--theme-border, #2b2242);
      box-shadow: 0 2px 12px rgba(0,0,0,.35);
      padding-left: max(24px, env(safe-area-inset-left));
      padding-right: max(24px, env(safe-area-inset-right));
    }
    /* ── left: logo + brand ── */
    .anb-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      flex-shrink: 0;
      text-decoration: none;
      cursor: pointer;
    }
    .anb-logo {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: contain;
      background: rgba(255,255,255,.06);
      padding: 3px;
      border: 1.5px solid var(--theme-border, #2b2242);
      flex-shrink: 0;
    }
    .anb-logo-fallback {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: ${theme.bg};
      border: 1.5px solid ${theme.border};
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${theme.accent};
      flex-shrink: 0;
    }
    .anb-brand-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    .anb-brand-name {
      font-size: 15px;
      font-weight: 800;
      color: var(--theme-text-main, #f5f3ff);
      white-space: nowrap;
      letter-spacing: -.02em;
      line-height: 1.2;
    }
    .anb-brand-sub {
      font-size: 11px;
      color: var(--theme-text-muted, #9d8ec4);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 220px;
    }
    /* ── center: desktop nav links ── */
    .anb-center {
      display: flex;
      align-items: center;
      gap: 2px;
      flex: 1;
      justify-content: center;
      overflow: hidden;
    }
    .anb-nav-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      color: var(--theme-text-muted, #9d8ec4);
      background: transparent;
      border: none;
      cursor: pointer;
      white-space: nowrap;
      transition: color .15s, background .15s;
      position: relative;
      min-height: 44px;
      -webkit-tap-highlight-color: transparent;
    }
    .anb-nav-link:hover { color: var(--theme-text-main, #f5f3ff); background: rgba(255,255,255,.06); }
    .anb-nav-link.active { color: ${theme.accent}; }
    .anb-nav-link.active::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 12px;
      right: 12px;
      height: 2px;
      border-radius: 2px;
      background: ${theme.accent};
    }
    /* ── right: username badge + logout ── */
    .anb-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
    .anb-username-badge {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 1px;
    }
    .anb-username {
      font-size: 13px;
      font-weight: 700;
      color: var(--theme-text-main, #f5f3ff);
      white-space: nowrap;
    }
    .anb-role-chip {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 20px;
      background: ${theme.bg};
      color: ${theme.text};
      border: 1px solid ${theme.border};
      text-transform: uppercase;
      letter-spacing: .05em;
      white-space: nowrap;
    }
    .anb-logout-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      color: var(--theme-text-muted, #9d8ec4);
      background: transparent;
      border: 1px solid var(--theme-border, #2b2242);
      cursor: pointer;
      white-space: nowrap;
      transition: all .15s;
      min-height: 44px;
      -webkit-tap-highlight-color: transparent;
    }
    .anb-logout-btn:hover { color: #f87171; border-color: rgba(248,113,113,.4); background: rgba(239,68,68,.08); }
    /* ── mobile three-dot button ── */
    .anb-dots-btn {
      display: none;
      width: 44px;
      height: 44px;
      align-items: center;
      justify-content: center;
      background: rgba(255,255,255,.06);
      border: 1px solid var(--theme-border, #2b2242);
      border-radius: 10px;
      color: var(--theme-text-main, #f5f3ff);
      cursor: pointer;
      flex-shrink: 0;
      -webkit-tap-highlight-color: transparent;
    }
    /* ── overlay ── */
    .anb-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.55);
      z-index: 1100;
      animation: anb-fade-in .2s ease;
    }
    /* ── slide-in panel ── */
    .anb-panel {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: 280px;
      background: var(--theme-bg-card, #141022);
      border-left: 1px solid var(--theme-border, #2b2242);
      z-index: 1200;
      display: flex;
      flex-direction: column;
      padding-top: env(safe-area-inset-top, 0px);
      padding-bottom: env(safe-area-inset-bottom, 0px);
      box-shadow: -8px 0 32px rgba(0,0,0,.6);
      animation: anb-slide-in .3s ease;
      overflow: hidden;
    }
    .anb-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 16px 12px 20px;
      border-bottom: 1px solid var(--theme-border, #2b2242);
      flex-shrink: 0;
    }
    .anb-panel-title {
      font-size: 14px;
      font-weight: 800;
      color: var(--theme-text-main, #f5f3ff);
      letter-spacing: -.01em;
    }
    .anb-panel-close {
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255,255,255,.06);
      border: 1px solid var(--theme-border, #2b2242);
      border-radius: 10px;
      color: var(--theme-text-main, #f5f3ff);
      cursor: pointer;
      flex-shrink: 0;
      -webkit-tap-highlight-color: transparent;
    }
    .anb-panel-close:hover { background: rgba(255,255,255,.1); }
    .anb-panel-body { flex: 1; overflow-y: auto; padding: 8px 0; }
    .anb-panel-item {
      display: flex;
      align-items: center;
      gap: 14px;
      width: 100%;
      height: 52px;
      padding: 0 16px 0 24px;
      background: transparent;
      border: none;
      color: var(--theme-text-muted, #9d8ec4);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      text-align: left;
      transition: background .15s, color .15s;
      box-sizing: border-box;
      -webkit-tap-highlight-color: transparent;
    }
    .anb-panel-item:hover { background: rgba(255,255,255,.05); color: var(--theme-text-main, #f5f3ff); }
    .anb-panel-item.active { color: ${theme.accent}; background: ${theme.bg}; }
    .anb-panel-item.logout { color: #f87171; }
    .anb-panel-item.logout:hover { background: rgba(239,68,68,.1); color: #fca5a5; }
    .anb-panel-divider { height: 1px; background: var(--theme-border, #2b2242); margin: 6px 0; }
    .anb-panel-item-arrow { margin-left: auto; opacity: .4; flex-shrink: 0; }
    /* ── BOOTH: bottom navigation bar ── */
    .anb-bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 60px;
      z-index: 900;
      display: none;
      align-items: stretch;
      background: var(--theme-bg-card, #141022);
      border-top: 1px solid var(--theme-border, #2b2242);
      box-shadow: 0 -4px 16px rgba(0,0,0,.35);
      padding-bottom: env(safe-area-inset-bottom, 0px);
    }
    .anb-bottom-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      background: transparent;
      border: none;
      color: var(--theme-text-muted, #9d8ec4);
      font-size: 10px;
      font-weight: 700;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transition: color .15s;
      text-transform: uppercase;
      letter-spacing: .04em;
      min-height: 44px;
    }
    .anb-bottom-item:active { opacity: .7; }
    .anb-bottom-item.active { color: #FF6B00; }
    /* ── keyframes ── */
    @keyframes anb-slide-in {
      from { transform: translateX(100%); }
      to   { transform: translateX(0); }
    }
    @keyframes anb-fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    /* ── responsive breakpoints ── */
    @media (max-width: 1024px) {
      .anb-center { display: none; }
      .anb-username-badge { display: none; }
      .anb-logout-btn { display: none; }
      .anb-dots-btn { display: flex; }
      .anb-bar { height: 56px; padding: 0 16px; padding-left: max(16px, env(safe-area-inset-left)); padding-right: max(16px, env(safe-area-inset-right)); padding-top: env(safe-area-inset-top, 0px); }
      .anb-logo { width: 32px; height: 32px; }
      .anb-logo-fallback { width: 32px; height: 32px; }
      .anb-brand-name { font-size: 13px; }
    }
    @media (max-width: 1024px) and (.anb-is-booth) {
      .anb-bottom-nav { display: flex; }
    }
    @media (max-width: 480px) {
      .anb-panel { width: min(280px, 90vw); }
      .anb-brand-sub { display: none; }
    }
    @media (max-width: 375px) {
      .anb-brand-name { font-size: 12px; }
      .anb-bar { padding: 0 12px; padding-top: env(safe-area-inset-top, 0px); }
    }
  `;

  return (
    <>
      <style>{css}</style>

      {/* ═══════════════════════════════════════════ */}
      {/* TOP BAR                                    */}
      {/* ═══════════════════════════════════════════ */}
      <header className="anb-bar" role="banner">

        {/* ── Left: Logo + Brand ── */}
        <div className="anb-brand" onClick={() => handleNavClick(navItems[0])} role="link" tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && handleNavClick(navItems[0])}>
          <img
            src="/bjp_logo.png"
            alt="BJP Nalam Thittam"
            className="anb-logo"
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
          <div className="anb-logo-fallback" style={{ display: 'none' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div className="anb-brand-text">
            <span className="anb-brand-name">BJP Nalam Thittam</span>
            {displayTitle && <span className="anb-brand-sub">{displayTitle}</span>}
          </div>
        </div>

        {/* ── Center: Desktop nav links (non-logout items only) ── */}
        <nav className="anb-center" aria-label="Primary navigation">
          {navItems.filter(n => !n.isLogout).map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`anb-nav-link${activeId === item.id ? ' active' : ''}`}
                onClick={() => handleNavClick(item)}
                aria-current={activeId === item.id ? 'page' : undefined}
              >
                <Icon size={14} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* ── Right: Username badge + logout (desktop) ── */}
        <div className="anb-right">
          <div className="anb-username-badge">
            <span className="anb-username">{username}</span>
            <span className="anb-role-chip">{theme.label}</span>
          </div>
          <button className="anb-logout-btn" onClick={() => onLogout?.()} aria-label="Logout">
            <LogOut size={15} />
            Logout
          </button>

          {/* ── Three-dot button (mobile/tablet) ── */}
          {!isBooth && (
            <button
              className="anb-dots-btn"
              onClick={() => setPanelOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={panelOpen}
              aria-controls="anb-panel"
            >
              <MoreVertical size={20} />
            </button>
          )}
          {isBooth && (
            <button
              className="anb-dots-btn"
              onClick={() => setPanelOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={panelOpen}
              aria-controls="anb-panel"
            >
              <MoreVertical size={20} />
            </button>
          )}
        </div>
      </header>

      {/* ═══════════════════════════════════════════ */}
      {/* SLIDE-IN PANEL + BACKDROP                  */}
      {/* ═══════════════════════════════════════════ */}
      {panelOpen && (
        <>
          {/* Backdrop */}
          <div
            className="anb-overlay"
            onClick={closePanel}
            aria-hidden="true"
            ref={overlayRef}
          />

          {/* Panel */}
          <nav
            id="anb-panel"
            className="anb-panel"
            role="navigation"
            aria-label="Mobile navigation"
          >
            {/* Panel header */}
            <div className="anb-panel-header">
              <div>
                <div className="anb-panel-title">{username}</div>
                <span className="anb-role-chip" style={{ marginTop: '4px', display: 'inline-block' }}>
                  {theme.label}
                </span>
              </div>
              <button
                className="anb-panel-close"
                onClick={closePanel}
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
            </div>

            {/* Nav items */}
            <div className="anb-panel-body">
              {navItems.map((item, idx) => {
                const Icon = item.icon;
                // Divider before logout
                const prevItem = navItems[idx - 1];
                const showDivider = item.isLogout && prevItem && !prevItem.isLogout;
                return (
                  <React.Fragment key={item.id}>
                    {showDivider && <div className="anb-panel-divider" />}
                    <button
                      className={[
                        'anb-panel-item',
                        item.isLogout ? 'logout' : '',
                        !item.isLogout && activeId === item.id ? 'active' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => handleNavClick(item)}
                      aria-current={!item.isLogout && activeId === item.id ? 'page' : undefined}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                      {!item.isLogout && (
                        <ChevronRight size={14} className="anb-panel-item-arrow" />
                      )}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </nav>
        </>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* BOOTH ADMIN — BOTTOM NAVIGATION BAR        */}
      {/* ═══════════════════════════════════════════ */}
      {isBooth && (
        <nav
          className="anb-bottom-nav"
          role="navigation"
          aria-label="Bottom navigation"
          style={{ display: 'flex' }}  /* override — always show for booth */
        >
          {BOOTH_BOTTOM_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                className={`anb-bottom-item${isActive ? ' active' : ''}`}
                onClick={() => {
                  setActiveId(item.id);
                  window.dispatchEvent(new CustomEvent('admin-nav', { detail: { id: item.id } }));
                  try {
                    const base = window.location.pathname.replace(/\/[^/]+$/, '');
                    window.history.pushState({}, '', `${base}/${item.id}`);
                  } catch (_) {}
                }}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
              >
                <Icon size={22} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </>
  );
};

export default AdminNavbar;
