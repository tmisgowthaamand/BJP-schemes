import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../i18n/LanguageContext';
import { LogOut, User as UserIcon, Shield, ChevronRight, Home, Award } from 'lucide-react';

const Navbar = ({ activeTab, setActiveTab }) => {
  const { user, logoutUser, admin, logoutAdmin } = useAuth();
  const { t } = useLang();

  const role = admin?.role || 'SUPER_ADMIN';

  const roleThemeInfo = {
    SUPER_ADMIN: { class: 'theme-superadmin', label: 'SUPER ADMIN', bg: 'rgba(167, 139, 250, 0.15)', color: '#c4b5fd', border: 'rgba(167, 139, 250, 0.3)' },
    STATE_ADMIN: { class: 'theme-stateadmin', label: 'STATE ADMIN', bg: 'rgba(52, 211, 153, 0.15)', color: '#6ee7b7', border: 'rgba(52, 211, 153, 0.3)' },
    DISTRICT_ADMIN: { class: 'theme-districtadmin', label: 'DISTRICT ADMIN', bg: 'rgba(56, 189, 248, 0.15)', color: '#7dd3fc', border: 'rgba(56, 189, 248, 0.3)' },
    ASSEMBLY_ADMIN: { class: 'theme-assemblyadmin', label: 'ASSEMBLY ADMIN', bg: 'rgba(249, 115, 22, 0.15)', color: '#ffb07c', border: 'rgba(249, 115, 22, 0.3)' },
    BOOTH_ADMIN: { class: 'theme-boothadmin', label: 'BOOTH ADMIN', bg: 'rgba(255, 107, 53, 0.15)', color: '#FF9933', border: 'rgba(255, 107, 53, 0.3)' },
  };

  const currentTheme = roleThemeInfo[role] || roleThemeInfo.SUPER_ADMIN;

  // Generate breadcrumb for admin dashboards
  const getBreadcrumb = () => {
    if (!admin) return null;
    
    const parts = [];
    
    if (admin.district) parts.push(admin.district);
    if (admin.assemblyName) parts.push(admin.assemblyName);
    if (admin.boothNo) parts.push(`Booth ${admin.boothNo}`);
    
    return parts.length > 0 ? parts.join(' — ') : null;
  };

  const breadcrumb = getBreadcrumb();

  const handleBoothPresidentNav = () => {
    if (window.location.pathname !== '/') {
      window.location.href = '/?action=booth_president';
    } else if (window.dispatchBoothPresidentAction) {
      window.dispatchBoothPresidentAction();
    } else {
      const url = new URL(window.location.href);
      url.searchParams.set('action', 'booth_president');
      window.history.pushState({}, '', url);
      window.dispatchEvent(new Event('popstate'));
    }
  };

  return (
    <header
      className={currentTheme.class}
      style={{
        background: admin ? 'var(--bg-primary, #12101a)' : 'var(--theme-bg-app)',
        backdropFilter: 'blur(12px)',
        borderBottom: admin ? '1px solid var(--border-color, #332b47)' : '1px solid var(--theme-border)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        transition: 'all 0.3s ease'
      }}
    >
      <div 
        className="container" 
        style={{ 
          maxWidth: admin ? '100%' : '1400px',
          margin: '0 auto',
          padding: admin ? '12px 24px' : '14px 20px',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          flexWrap: 'wrap', 
          gap: '12px' 
        }}
      >
        
        {/* LEFT: BJP Brand Logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', minWidth: 0, flex: '0 1 auto' }} onClick={() => setActiveTab && setActiveTab('schemes')}>
          <img
            src="/bjp_logo.svg"
            alt="BJP Logo"
            style={{ height: admin ? '36px' : '38px', width: 'auto', flexShrink: 0 }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ 
              fontSize: admin ? '16px' : '17px', 
              fontWeight: '700', 
              color: admin ? 'var(--text-primary)' : 'var(--theme-text-main)', 
              letterSpacing: '-0.02em', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px',
              flexWrap: 'wrap'
            }}>
              <span style={{ whiteSpace: 'nowrap' }}>BJP Nalam Thittam</span>
              {admin && (
                <span style={{ 
                  fontSize: '10px', 
                  background: currentTheme.bg, 
                  color: currentTheme.color, 
                  padding: '4px 10px', 
                  borderRadius: '6px', 
                  border: `1px solid ${currentTheme.border}`, 
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  whiteSpace: 'nowrap'
                }}>
                  {currentTheme.label}
                </span>
              )}
            </div>
            {/* Breadcrumb for admin */}
            {breadcrumb && admin ? (
              <div style={{ 
                fontSize: '13px', 
                color: 'var(--text-secondary)', 
                marginTop: '2px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 500,
                letterSpacing: '-0.01em'
              }}>
                <Home size={12} style={{ color: 'var(--text-muted)' }} />
                {breadcrumb}
              </div>
            ) : !admin ? (
              <div style={{ fontSize: '12px', color: 'var(--theme-text-muted)', marginTop: '2px' }}>
                Direct Benefit Transfer Automation
              </div>
            ) : null}
          </div>
        </div>

        {/* RIGHT: User/Admin Info + Booth President Button + Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '0 0 auto' }}>
          {!admin && !window.location.pathname.startsWith('/admin') && (
            <button
              onClick={handleBoothPresidentNav}
              className="nav-booth-president-btn"
              title={t('Apply to lead your electoral booth')}
            >
              <Award size={14} style={{ color: '#f26522', flexShrink: 0 }} />
              <span>{t('Be a Booth President')}</span>
            </button>
          )}

          {user ? (
            <>
              <div className="tag-pill tag-sunlit" style={{ padding: '6px 14px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                <UserIcon size={14} color="var(--theme-accent)" />
                <span style={{ fontWeight: '600', color: 'var(--theme-text-main)' }}>{user.voterName}</span>
                <span style={{ color: 'var(--theme-text-muted)', fontSize: '11px' }}>({user.epicNo})</span>
              </div>

              <button
                onClick={logoutUser}
                className="btn btn-ghost"
                title="Logout to restart flow"
                style={{ padding: '6px 14px', fontSize: '13px', whiteSpace: 'nowrap' }}
              >
                <LogOut size={14} />
                Logout
              </button>
            </>
          ) : admin ? (
            <>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '2px'
              }}>
                <div style={{ 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.01em'
                }}>
                  {admin.username}
                </div>
                <div style={{ 
                  fontSize: '11px', 
                  color: 'var(--text-muted)',
                  fontWeight: 500
                }}>
                  {admin.assemblyName || admin.district || 'Admin Portal'}
                </div>
              </div>

              <button
                onClick={logoutAdmin}
                className="btn btn-ghost"
                style={{ 
                  padding: '8px 16px', 
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                  borderRadius: '8px'
                }}
              >
                <LogOut size={15} />
                Sign Out
              </button>
            </>
          ) : null}
        </div>

      </div>
    </header>
  );
};

export default Navbar;
