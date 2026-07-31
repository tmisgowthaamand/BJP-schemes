import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User as UserIcon, Shield } from 'lucide-react';

const Navbar = ({ activeTab, setActiveTab }) => {
  const { user, logoutUser, admin, logoutAdmin } = useAuth();

  const role = admin?.role || 'SUPER_ADMIN';

  const roleThemeInfo = {
    SUPER_ADMIN: { class: 'theme-superadmin', label: 'DARK LAVENDER', bg: 'rgba(167, 139, 250, 0.2)', color: '#c4b5fd', border: 'rgba(167, 139, 250, 0.3)' },
    STATE_ADMIN: { class: 'theme-stateadmin', label: 'DARK EMERALD', bg: 'rgba(52, 211, 153, 0.2)', color: '#6ee7b7', border: 'rgba(52, 211, 153, 0.3)' },
    DISTRICT_ADMIN: { class: 'theme-districtadmin', label: 'DARK SAPPHIRE', bg: 'rgba(56, 189, 248, 0.2)', color: '#7dd3fc', border: 'rgba(56, 189, 248, 0.3)' },
    ASSEMBLY_ADMIN: { class: 'theme-assemblyadmin', label: 'DARK SAFFRON', bg: 'rgba(249, 115, 22, 0.2)', color: '#ffb07c', border: 'rgba(249, 115, 22, 0.3)' },
    BOOTH_ADMIN: { class: 'theme-boothadmin', label: 'DARK ROSE', bg: 'rgba(251, 113, 133, 0.2)', color: '#fca5a5', border: 'rgba(251, 113, 133, 0.3)' },
  };

  const currentTheme = roleThemeInfo[role] || roleThemeInfo.SUPER_ADMIN;

  return (
    <header
      className={currentTheme.class}
      style={{
        background: 'var(--theme-bg-app)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--theme-border)',
        position: 'relative',
        zIndex: 100,
        padding: '14px 0',
        marginBottom: '10px',
        transition: 'all 0.3s ease'
      }}
    >
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        
        {/* BJP Brand Logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setActiveTab && setActiveTab('schemes')}>
          <img
            src="/bjp_logo.svg"
            alt="BJP Logo"
            style={{ height: '38px', width: 'auto', flexShrink: 0 }}
          />
          <div>
            <div style={{ fontSize: '17px', fontWeight: '700', color: 'var(--theme-text-main)', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>BJP Nalam Thittam</span>
              {admin && (
                <span style={{ fontSize: '10px', background: currentTheme.bg, color: currentTheme.color, padding: '2px 8px', borderRadius: '9999px', border: `1px solid ${currentTheme.border}`, fontWeight: 700 }}>
                  {currentTheme.label}
                </span>
              )}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--theme-text-muted)' }}>
              Direct Benefit Transfer Automation
            </div>
          </div>
        </div>

        {/* User Pill / Admin Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {user ? (
            <>
              <div className="tag-pill tag-sunlit" style={{ padding: '6px 14px', fontSize: '13px' }}>
                <UserIcon size={14} color="var(--theme-accent)" />
                <span style={{ fontWeight: '600', color: 'var(--theme-text-main)' }}>{user.voterName}</span>
                <span style={{ color: 'var(--theme-text-muted)', fontSize: '11px' }}>({user.epicNo})</span>
              </div>

              <button
                onClick={logoutUser}
                className="btn btn-ghost"
                title="Logout to restart flow"
                style={{ padding: '6px 14px', fontSize: '13px' }}
              >
                <LogOut size={14} />
                Logout
              </button>
            </>
          ) : admin ? (
            <>
              <div className="tag-pill tag-active" style={{ padding: '6px 14px', fontSize: '13px' }}>
                <Shield size={14} />
                <span>{admin.role} ({admin.username})</span>
              </div>

              <button
                onClick={logoutAdmin}
                className="btn btn-ghost"
                style={{ padding: '6px 14px', fontSize: '13px' }}
              >
                <LogOut size={14} />
                Admin Logout
              </button>
            </>
          ) : null}
        </div>

      </div>
    </header>
  );
};

export default Navbar;
