import React, { useEffect, useState, useRef } from 'react';
import API from '../utils/api';

// Public, no-login, read-only live view. Access is gated by a secret token in
// the URL (?token=...). Shows ONLY aggregate counts — never personal data.
const POLL_MS = 4000;
const getToken = () => new URLSearchParams(window.location.search).get('token') || '';

const Stat = ({ label, value, accent }) => (
  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 18px', minWidth: '150px', flex: '1 1 150px' }}>
    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
    <div style={{ fontSize: '28px', fontWeight: 800, color: accent || '#0f172a', marginTop: '4px' }}>
      {value == null ? '—' : Number(value).toLocaleString()}
    </div>
  </div>
);

const LivePublicPage = () => {
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const token = getToken();
  const timerRef = useRef(null);
  const mountedRef = useRef(true);

  const load = async () => {
    if (!token) { setErr('Missing access token. Ask an administrator for the live view link.'); return; }
    try {
      const res = await API.get('/admin/live-public', { params: { token } });
      if (mountedRef.current && res.data && res.data.success) {
        setStats(res.data);
        setErr('');
        setUpdatedAt(new Date());
      }
    } catch (e) {
      if (mountedRef.current) setErr(e.response?.data?.message || 'Live view unavailable');
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    load();
    timerRef.current = setInterval(load, POLL_MS);
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sb = stats?.statusBreakdown || {};

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px 16px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
            BJP Nalam Thittam — Live Statewide Telemetry
          </h1>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            {updatedAt ? `Updated ${updatedAt.toLocaleTimeString()} · auto every ${POLL_MS / 1000}s` : 'Connecting…'}
          </span>
        </div>

        <p style={{ fontSize: '12px', color: '#64748b', marginTop: 0, marginBottom: '16px' }}>
          Read-only public view · aggregate figures only (no personal data).
        </p>

        {err ? (
          <div style={{ fontSize: '14px', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '14px 16px' }}>
            {err}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
              <Stat label="Members" value={stats?.totalMembers} accent="#ea580c" />
              <Stat label="Applications" value={stats?.totalApplications} />
              <Stat label="Today" value={stats?.todayMembers} accent="#2563eb" />
              <Stat label="New (5 min)" value={stats?.newMembersLast5Min} accent="#16a34a" />
              <Stat label="Approved" value={sb.Approved} accent="#15803d" />
              <Stat label="Pending" value={sb.Pending} accent="#b45309" />
              <Stat label="Rejected" value={sb.Rejected} accent="#dc2626" />
            </div>

            {Array.isArray(stats?.topDistricts) && stats.topDistricts.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 18px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '10px' }}>Top districts by applications</div>
                {stats.topDistricts.map((d, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#334155', padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span>{i + 1}. {d.district}</span>
                    <strong style={{ color: '#0f172a' }}>{Number(d.applications).toLocaleString()}</strong>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LivePublicPage;
