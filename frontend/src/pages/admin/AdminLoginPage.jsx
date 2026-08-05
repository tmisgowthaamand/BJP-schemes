import React, { useState, useEffect, useRef, useCallback } from 'react';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Shield, Loader2, AlertTriangle, Clock } from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────────
const MAX_ATTEMPTS   = 3;     // lockout after this many consecutive failures
const LOCKOUT_SECS   = 30;    // client-side countdown duration
const ROLE_LABELS = {
  SUPER_ADMIN:    { label: 'Super Admin',    color: '#a78bfa' },
  STATE_ADMIN:    { label: 'State Admin',    color: '#34d399' },
  DISTRICT_ADMIN: { label: 'District Admin', color: '#38bdf8' },
  ASSEMBLY_ADMIN: { label: 'Assembly Admin', color: '#f97316' },
  BOOTH_ADMIN:    { label: 'Booth Admin',    color: '#fb7185' },
};

const AdminLoginPage = () => {
  const { loginAdmin } = useAuth();

  // ── Form state ──
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ── Async state ──
  const [loginError, setLoginError]   = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // ── Lockout state ──
  const [failCount, setFailCount]       = useState(0);
  const [lockedOut, setLockedOut]       = useState(false);
  const [countdown, setCountdown]       = useState(LOCKOUT_SECS);
  const countdownRef                    = useRef(null);

  // ── Detected role hint (shown after successful resolve) ──
  const [detectedRole, setDetectedRole] = useState(null);

  // Start / clear the lockout countdown
  const startLockout = useCallback(() => {
    setLockedOut(true);
    setCountdown(LOCKOUT_SECS);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          setLockedOut(false);
          setFailCount(0);
          setLoginError('');
          return LOCKOUT_SECS;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => clearInterval(countdownRef.current), []);

  const handleAdminLogin = async (e) => {
    if (e) e.preventDefault();
    if (lockedOut || loginLoading) return;

    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await API.post('/admin/login', {
        username: username.trim(),
        password: password.trim(),
      });

      if (res.data.success) {
        // Show role hint briefly before navigating
        const role = res.data.admin?.role;
        if (role && ROLE_LABELS[role]) setDetectedRole(role);

        // Clear sensitive fields before handing off
        setUsername('');
        setPassword('');
        setFailCount(0);

        // Small tick so cleared state renders before navigation
        setTimeout(() => loginAdmin(res.data.admin, res.data.token), 80);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid credentials. Please try again.';
      setLoginError(msg);

      const next = failCount + 1;
      setFailCount(next);
      if (next >= MAX_ATTEMPTS) {
        startLockout();
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const isDisabled = loginLoading || lockedOut;

  // ── Inline styles (all responsive via CSS inside <style>) ────────────────
  return (
    <div className="alp-root">
      <style>{`
        /* ── root wrapper ── */
        .alp-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: env(safe-area-inset-top, 20px) 16px env(safe-area-inset-bottom, 20px) 16px;
          box-sizing: border-box;
          background: var(--theme-bg-app, #090710);
        }

        /* ── card ── */
        .alp-card {
          width: 100%;
          max-width: 420px;
          background: var(--theme-bg-card, #141022);
          border: 1px solid var(--theme-border, #2b2242);
          border-radius: 20px;
          padding: clamp(24px, 6vw, 40px);
          box-sizing: border-box;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
        }

        /* ── logo ── */
        .alp-logo-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }
        .alp-logo {
          width: clamp(64px, 15vw, 88px);
          height: clamp(64px, 15vw, 88px);
          object-fit: contain;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
          padding: 6px;
          border: 1.5px solid var(--theme-border, #2b2242);
        }
        .alp-logo-fallback {
          width: clamp(64px, 15vw, 88px);
          height: clamp(64px, 15vw, 88px);
          border-radius: 50%;
          background: var(--theme-badge-bg, rgba(167,139,250,.18));
          border: 1.5px solid var(--theme-accent, #a78bfa);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--theme-accent, #a78bfa);
        }

        /* ── heading area ── */
        .alp-heading {
          text-align: center;
          margin-bottom: 28px;
        }
        .alp-title {
          font-size: clamp(1.1rem, 4vw, 1.4rem);
          font-weight: 800;
          color: var(--theme-text-main, #f5f3ff);
          margin: 0 0 6px 0;
          line-height: 1.25;
          letter-spacing: -0.02em;
        }
        .alp-subtitle {
          font-size: 13px;
          color: var(--theme-text-muted, #9d8ec4);
          margin: 0;
          line-height: 1.5;
        }

        /* ── error banner ── */
        .alp-error {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          width: 100%;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(248, 113, 113, 0.35);
          border-radius: 10px;
          padding: 10px 14px;
          margin-bottom: 18px;
          box-sizing: border-box;
          color: #f87171;
          font-size: 13.5px;
          font-weight: 600;
          line-height: 1.4;
          animation: alp-shake 0.35s ease;
        }
        .alp-error svg { flex-shrink: 0; margin-top: 1px; }

        /* ── lockout banner ── */
        .alp-lockout {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.35);
          border-radius: 10px;
          padding: 10px 14px;
          margin-bottom: 18px;
          box-sizing: border-box;
          color: #fbbf24;
          font-size: 13.5px;
          font-weight: 600;
          line-height: 1.4;
        }
        .alp-lockout svg { flex-shrink: 0; }
        .alp-countdown {
          margin-left: auto;
          font-size: 22px;
          font-weight: 800;
          color: #f59e0b;
          font-variant-numeric: tabular-nums;
          min-width: 36px;
          text-align: right;
        }

        /* ── role hint ── */
        .alp-role-hint {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-bottom: 18px;
          animation: alp-fadein 0.3s ease;
        }

        /* ── form ── */
        .alp-form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 16px;
        }
        .alp-label {
          font-size: 12.5px;
          font-weight: 700;
          color: var(--theme-badge-text, #c4b5fd);
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .alp-input-wrap {
          position: relative;
        }
        .alp-input {
          width: 100%;
          height: 48px;
          background: var(--theme-bg-subcard, #1b162b);
          border: 1.5px solid var(--theme-border, #2b2242);
          border-radius: 10px;
          padding: 0 14px;
          color: #ffffff;
          caret-color: var(--theme-accent, #a78bfa);
          font-size: 16px; /* must be 16px — prevents iOS auto-zoom */
          font-family: inherit;
          font-weight: 500;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
          -webkit-appearance: none;
        }
        .alp-input:focus {
          outline: none;
          border-color: var(--theme-accent, #a78bfa);
          box-shadow: 0 0 0 3px var(--theme-accent-glow, rgba(167,139,250,.25));
        }
        .alp-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .alp-input.has-toggle {
          padding-right: 52px;
        }
        .alp-pw-toggle {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: var(--theme-text-muted, #9d8ec4);
          cursor: pointer;
          border-radius: 0 10px 10px 0;
          transition: color 0.15s;
          -webkit-tap-highlight-color: transparent;
          min-width: 44px; /* 44px min tap target */
        }
        .alp-pw-toggle:hover { color: var(--theme-accent, #a78bfa); }
        .alp-pw-toggle:focus-visible {
          outline: 2px solid var(--theme-accent, #a78bfa);
          outline-offset: -2px;
          border-radius: 0 10px 10px 0;
        }

        /* ── submit button ── */
        .alp-submit {
          width: 100%;
          height: 52px;
          margin-top: 8px;
          background: var(--theme-accent-gradient, linear-gradient(135deg,#7c3aed,#a78bfa));
          color: #ffffff;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.01em;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 18px var(--theme-accent-glow, rgba(167,139,250,.35));
          transition: all 0.2s ease;
          -webkit-tap-highlight-color: transparent;
          box-sizing: border-box;
        }
        .alp-submit:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-1px);
          box-shadow: 0 6px 24px var(--theme-accent-glow, rgba(167,139,250,.45));
        }
        .alp-submit:active:not(:disabled) {
          transform: translateY(0);
        }
        .alp-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        /* ── spinner inside button ── */
        .alp-spinner {
          width: 18px;
          height: 18px;
          animation: alp-spin 0.75s linear infinite;
        }

        /* ── attempt warning ── */
        .alp-attempt-warn {
          text-align: center;
          font-size: 12px;
          color: #fbbf24;
          margin-top: 12px;
          font-weight: 600;
        }

        /* ── footer ── */
        .alp-footer {
          margin-top: 24px;
          padding-top: 18px;
          border-top: 1px solid var(--theme-border, #2b2242);
          text-align: center;
        }
        .alp-footer-text {
          font-size: 11.5px;
          color: var(--theme-text-muted, #9d8ec4);
          line-height: 1.5;
        }
        .alp-roles {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          justify-content: center;
          margin-top: 10px;
        }
        .alp-role-chip {
          font-size: 10px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 20px;
          border: 1px solid;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          opacity: 0.75;
        }

        /* ── keyframes ── */
        @keyframes alp-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes alp-shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-6px); }
          40%      { transform: translateX(6px); }
          60%      { transform: translateX(-4px); }
          80%      { transform: translateX(4px); }
        }
        @keyframes alp-fadein {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── responsive tweaks ── */
        @media (max-width: 480px) {
          .alp-card {
            max-width: 360px;
            border-radius: 16px;
          }
          .alp-roles { gap: 4px; }
        }
        @media (max-width: 360px) {
          .alp-card { border-radius: 14px; }
          .alp-submit { height: 48px; font-size: 14px; }
        }
        /* On very small devices ensure no horizontal overflow */
        @media (max-width: 320px) {
          .alp-root { padding: 12px 10px; }
          .alp-card { padding: 20px 16px; }
        }
      `}</style>

      <div className="alp-card">

        {/* ── Logo ── */}
        <div className="alp-logo-wrap">
          <img
            src="/bjp_logo.png"
            alt="BJP Nalam Thittam"
            className="alp-logo"
            onError={e => {
              // Fallback to shield icon if image fails
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="alp-logo-fallback" style={{ display: 'none' }}>
            <Shield size={36} />
          </div>
        </div>

        {/* ── Heading ── */}
        <div className="alp-heading">
          <h2 className="alp-title">BJP Nalam Thittam Admin</h2>
          <p className="alp-subtitle">Sign in to access your administrative workspace</p>
        </div>

        {/* ── Role hint (shown briefly on success) ── */}
        {detectedRole && ROLE_LABELS[detectedRole] && (
          <div
            className="alp-role-hint"
            style={{
              background: `${ROLE_LABELS[detectedRole].color}18`,
              border: `1px solid ${ROLE_LABELS[detectedRole].color}44`,
              color: ROLE_LABELS[detectedRole].color,
            }}
          >
            <Shield size={13} />
            {ROLE_LABELS[detectedRole].label} — Signing in…
          </div>
        )}

        {/* ── Lockout banner ── */}
        {lockedOut && (
          <div className="alp-lockout">
            <Clock size={16} />
            <span>Too many attempts. Try again in</span>
            <span className="alp-countdown">{countdown}s</span>
          </div>
        )}

        {/* ── Error banner ── */}
        {loginError && !lockedOut && (
          <div className="alp-error">
            <AlertTriangle size={16} />
            <span>{loginError}</span>
          </div>
        )}

        {/* ── Form ── */}
        <form onSubmit={handleAdminLogin} noValidate>

          {/* Username */}
          <div className="alp-form-group">
            <label htmlFor="alp-username" className="alp-label">Username</label>
            <div className="alp-input-wrap">
              <input
                id="alp-username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter admin username"
                className="alp-input"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                disabled={isDisabled}
                aria-describedby={loginError ? 'alp-error-msg' : undefined}
              />
            </div>
          </div>

          {/* Password */}
          <div className="alp-form-group">
            <label htmlFor="alp-password" className="alp-label">Password / Passcode</label>
            <div className="alp-input-wrap">
              <input
                id="alp-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password or passcode"
                className={`alp-input has-toggle`}
                autoComplete="current-password"
                required
                disabled={isDisabled}
              />
              <button
                type="button"
                className="alp-pw-toggle"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={0}
                disabled={isDisabled}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="alp-submit"
            disabled={isDisabled}
            aria-busy={loginLoading}
          >
            {loginLoading ? (
              <>
                <Loader2 className="alp-spinner" size={18} />
                Authenticating…
              </>
            ) : lockedOut ? (
              <>
                <Clock size={18} />
                Wait {countdown}s
              </>
            ) : (
              'Sign In'
            )}
          </button>

          {/* Attempt warning (show after first failure, before lockout) */}
          {failCount > 0 && !lockedOut && failCount < MAX_ATTEMPTS && (
            <p className="alp-attempt-warn">
              {MAX_ATTEMPTS - failCount} attempt{MAX_ATTEMPTS - failCount === 1 ? '' : 's'} remaining before lockout
            </p>
          )}

        </form>

      </div>
    </div>
  );
};

export default AdminLoginPage;
