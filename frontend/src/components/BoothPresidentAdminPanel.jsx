import React, { useState, useEffect, useCallback } from 'react';
import API from '../utils/api';
import { Award, RefreshCw, FileText, Eye, Shield, Search } from 'lucide-react';

const BoothPresidentAdminPanel = () => {
  const [apps, setApps]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [summary, setSummary]       = useState({ total: 0, pending: 0, approved: 0, declined: 0 });
  const [statusTab, setStatusTab]   = useState('');
  const [searchQ, setSearchQ]       = useState('');
  const [distFilter, setDistFilter] = useState('');
  const [assFilter, setAssFilter]   = useState('');
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [flash, setFlash]           = useState({ msg: '', type: 'success' });

  // Jurisdiction data — loaded once via jurisdiction-assemblies endpoint
  const [allDistricts, setAllDistricts]   = useState([]);   // 38 deduplicated district names
  const [allAssemblies, setAllAssemblies] = useState([]);   // all 234 assembly objects
  const [filteredAss, setFilteredAss]     = useState([]);   // assemblies for selected district

  // ── Load all 234 assemblies + derive 38 districts on mount ──
  useEffect(() => {
    API.get('/admin/jurisdiction-assemblies').then(res => {
      if (!res.data.success) return;
      const list = res.data.assemblies || [];

      // Build sorted unique district list
      const seen = new Set();
      const dists = list
        .map(a => (a.district || '').toUpperCase().trim())
        .filter(d => d && !seen.has(d) && seen.add(d))
        .sort((a, b) => a.localeCompare(b));
      setAllDistricts(dists);

      // Sort assemblies by numeric assemblyNo
      const sorted = [...list].sort((a, b) => parseInt(a.assemblyNo || 0) - parseInt(b.assemblyNo || 0));
      setAllAssemblies(sorted);
    }).catch(err => console.error('[BoothPresidentAdminPanel] load error:', err.message));
  }, []);

  // ── Filter assemblies when district changes ──
  useEffect(() => {
    setAssFilter('');
    if (!distFilter) { setFilteredAss([]); return; }
    const filtered = allAssemblies.filter(
      a => (a.district || '').toUpperCase().trim() === distFilter.toUpperCase().trim()
    );
    setFilteredAss(filtered);
  }, [distFilter, allAssemblies]);

  // ── Load applications ──
  const loadApps = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 20 });
      if (statusTab)  params.set('status',   statusTab);
      if (searchQ)    params.set('search',   searchQ.trim());
      if (distFilter) params.set('district', distFilter.trim());
      if (assFilter)  params.set('assembly', assFilter.trim());
      const res = await API.get(`/booth-president/admin/applications?${params}`);
      if (res.data.success) {
        setApps(res.data.applications || []);
        setSummary({ total: res.data.total || 0, pending: res.data.pending || 0, approved: res.data.approved || 0, declined: res.data.declined || 0 });
        setTotalPages(res.data.totalPages || 1);
        setPage(p);
      }
    } catch (err) {
      console.error('[BoothPresidentAdminPanel] loadApps:', err.message);
    } finally {
      setLoading(false);
    }
  }, [statusTab, searchQ, distFilter, assFilter]);

  useEffect(() => { loadApps(1); }, [loadApps]);

  const doAction = async (id, status) => {
    try {
      await API.put(`/booth-president/admin/applications/${id}`, { status });
      setFlash({ msg: `Application ${status} successfully.`, type: 'success' });
      setTimeout(() => setFlash({ msg: '', type: 'success' }), 3500);
      loadApps(page);
    } catch (err) {
      setFlash({ msg: err.response?.data?.message || 'Action failed.', type: 'error' });
      setTimeout(() => setFlash({ msg: '', type: 'success' }), 3500);
    }
  };

  const clearAll = () => { setStatusTab(''); setSearchQ(''); setDistFilter(''); setAssFilter(''); };
  const hasFilter = !!(statusTab || searchQ || distFilter || assFilter);

  const BADGE = { Pending: { bg: '#FAEEDA', fg: '#854F0B' }, Approved: { bg: '#EAF3DE', fg: '#3B6D11' }, Declined: { bg: '#FCEBEB', fg: '#A32D2D' } };

  return (
    <div className="campsite-card bpa-panel" style={{ width: '100%', padding: '20px', boxSizing: 'border-box' }}>
      <style>{`
        /* ── BPA Panel responsive styles ── */
        .bpa-panel { overflow-x:hidden; }

        /* stat cards: 4-col desktop → 2-col tablet → 2-col mobile */
        .bpa-stat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px; }
        @media (max-width:1023px) { .bpa-stat-grid { grid-template-columns:repeat(2,1fr); gap:10px; } }
        @media (max-width:480px)  { .bpa-stat-grid { grid-template-columns:repeat(2,1fr); gap:8px; } }

        /* filter row: side-by-side desktop → stacked mobile */
        .bpa-filter-row { display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end; margin-bottom:16px; }
        .bpa-filter-row select, .bpa-filter-row input { font-size:16px; }
        @media (max-width:600px) {
          .bpa-filter-row { flex-direction:column; }
          .bpa-filter-row > * { width:100% !important; flex:unset !important; min-width:unset !important; }
        }

        /* status tabs: scroll on mobile */
        .bpa-tabs { display:flex; gap:6px; flex-wrap:wrap; align-items:center; margin-bottom:10px; }
        @media (max-width:600px) {
          .bpa-tabs { overflow-x:auto; flex-wrap:nowrap; -webkit-overflow-scrolling:touch; scrollbar-width:none; padding-bottom:4px; }
          .bpa-tabs::-webkit-scrollbar { display:none; }
          .bpa-tabs .btn { flex-shrink:0; }
        }

        /* table wrapper */
        .bpa-table-wrap { width:100%; overflow-x:auto; -webkit-overflow-scrolling:touch; border-radius:10px; border:1px solid var(--color-linen); }
        .bpa-table-wrap table { min-width:680px; width:100%; border-collapse:collapse; font-size:13px; }

        /* action buttons inside table */
        .bpa-action-approve { background:#10b981; color:#fff; border:none; border-radius:6px; padding:6px 12px; font-size:12px; font-weight:700; cursor:pointer; min-height:30px; white-space:nowrap; }
        .bpa-action-reject  { background:#ef4444; color:#fff; border:none; border-radius:6px; padding:6px 12px; font-size:12px; font-weight:700; cursor:pointer; min-height:30px; white-space:nowrap; }

        /* On mobile: compact stat cards */
        @media (max-width:480px) {
          .bpa-panel { padding:14px 12px !important; }
          .bpa-stat-val { font-size:20px !important; }
          .bpa-stat-label { font-size:10px !important; }
          .bpa-panel h3 { font-size:15px !important; }
          .bpa-panel p  { font-size:12px !important; }
        }

        /* Pagination bar */
        .bpa-pagination { display:flex; align-items:center; justify-content:space-between; margin-top:16px; padding-top:14px; border-top:1px solid var(--color-linen); flex-wrap:wrap; gap:10px; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--color-midnight-ink)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Award size={20} color="var(--theme-accent)" style={{ flexShrink: 0 }} />
            Booth President Requests
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-slate)' }}>
            Review and manage Booth President requests across electoral booths in Tamil Nadu
          </p>
        </div>
        <button onClick={() => loadApps(page)} className="btn btn-ghost" style={{ fontSize: '13px', gap: '6px' }}>
          <RefreshCw size={14} /> Refresh Requests
        </button>
      </div>

      {/* Summary cards */}
      <div className="bpa-stat-grid">
        {[
          { label: 'Total Requests',      val: summary.total,    color: 'var(--color-midnight-ink)', icon: <FileText size={20}/> },
          { label: 'Pending Approval',    val: summary.pending,  color: '#f59e0b',  icon: <Eye size={20}/> },
          { label: 'Approved Presidents', val: summary.approved, color: '#10b981',  icon: <Award size={20}/> },
          { label: 'Declined',            val: summary.declined, color: '#ef4444',  icon: <Shield size={20}/> },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ padding: '14px 16px', cursor: 'default' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="stat-icon" style={{ color: s.color, background: `${s.color}18`, border: `1px solid ${s.color}33` }}>{s.icon}</div>
              <div>
                <div className="bpa-stat-val stat-number" style={{ color: s.color, fontSize: '24px', lineHeight: 1 }}>{s.val}</div>
                <div className="bpa-stat-label stat-label" style={{ marginTop: '4px' }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Status tabs */}
      <div className="bpa-tabs">
        {[['', 'All Requests'], ['Pending', 'Pending'], ['Approved', 'Approved'], ['Declined', 'Declined']].map(([v, l]) => (
          <button key={v} onClick={() => { setStatusTab(v); setPage(1); }}
            className={`btn ${statusTab === v ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '5px 14px', fontSize: '13px', minHeight: '36px', borderRadius: '20px', fontWeight: statusTab === v ? 700 : 500, flexShrink: 0 }}>
            {l}
          </button>
        ))}

        {/* Search box */}
        <div style={{ flex: '1 1 200px', position: 'relative', minWidth: '180px' }}>
          <Search size={14} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate)', pointerEvents: 'none' }} />
          <input type="text" value={searchQ}
            onChange={e => { setSearchQ(e.target.value); setPage(1); }}
            placeholder="Search Name, EPIC, Mobile, Booth..."
            className="form-control"
            style={{ paddingLeft: '34px', fontSize: '16px', height: '38px' }}
          />
        </div>
      </div>

      {/* District + Assembly cascading filters */}
      <div className="bpa-filter-row">

        {/* District — all 38 from voter DB */}
        <div style={{ flex: '1 1 220px', minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Filter by District</label>
          <select value={distFilter} onChange={e => { setDistFilter(e.target.value); setPage(1); }}
            className="form-control" style={{ fontSize: '16px', height: '40px' }}>
            <option value="">All Districts</option>
            {allDistricts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* Assembly — all 234, filtered by selected district */}
        <div style={{ flex: '1 1 260px', minWidth: '220px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Filter by Assembly</label>
          <select value={assFilter} onChange={e => { setAssFilter(e.target.value); setPage(1); }}
            className="form-control" style={{ fontSize: '16px', height: '40px' }}
            disabled={distFilter !== '' && filteredAss.length === 0}>
            <option value="">All Assemblies</option>
            {(distFilter ? filteredAss : allAssemblies).map(a => (
              <option key={a.assemblyNo} value={a.assemblyName}>
                {a.assemblyNo} - {a.assemblyName}
              </option>
            ))}
          </select>
        </div>

        {/* Clear */}
        {hasFilter && (
          <div style={{ alignSelf: 'flex-end', paddingBottom: '2px' }}>
            <button onClick={clearAll} className="btn btn-ghost"
              style={{ fontSize: '12px', padding: '5px 12px', minHeight: '36px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
              Clear All ×
            </button>
          </div>
        )}
      </div>

      {/* Flash feedback */}
      {flash.msg && (
        <div style={{
          padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, marginBottom: '14px',
          background: flash.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${flash.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: flash.type === 'success' ? '#10b981' : '#ef4444',
        }}>
          {flash.type === 'success' ? '✓ ' : '✗ '}{flash.msg}
        </div>
      )}

      {/* Table */}
      <div className="bpa-table-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '680px' }}>
          <thead>
            <tr style={{ background: 'var(--color-fog-gray)', borderBottom: '2px solid var(--color-linen)', textAlign: 'left' }}>
              {['APPLICANT', 'TARGET BOOTH & LOCATION', 'ORIGINAL VOTER BOOTH', 'APPLIED DATE', 'STATUS', 'ACTIONS'].map((h, i) => (
                <th key={h} style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: i === 5 ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--color-linen)' }}>
                  {[70, 55, 45, 40, 30, 80].map((w, j) => (
                    <td key={j} style={{ padding: '14px 12px' }}>
                      <div style={{ height: '13px', borderRadius: '4px', background: 'var(--color-linen)', width: `${w}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : apps.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--color-slate)' }}>
                  <Award size={32} style={{ marginBottom: '8px', opacity: 0.4 }} />
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>No Booth President applications found</div>
                  <div style={{ fontSize: '12px', marginTop: '2px' }}>Try clearing filters or changing search terms.</div>
                </td>
              </tr>
            ) : (
              apps.map(app => {
                const b = BADGE[app.status] || BADGE.Pending;
                const d = app.appliedAt ? new Date(app.appliedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
                return (
                  <tr key={app._id} style={{ borderBottom: '1px solid var(--color-linen)' }}>
                    {/* Applicant */}
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--color-midnight-ink)' }}>{app.voterName || '—'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-slate)', marginTop: '2px' }}>
                        EPIC: {app.epicNo || '—'} &bull; {app.mobile || '—'}
                      </div>
                    </td>

                    {/* Target Booth */}
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--theme-accent)' }}>
                        Booth {app.targetBoothNo}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-slate)', marginTop: '2px' }}>
                        {app.targetAssembly} &bull; {app.targetDistrict}
                      </div>
                      {app.boothType === 'custom' && (
                        <span style={{ fontSize: '10px', background: '#EFF6FF', color: '#1D4ED8', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                          Custom Location
                        </span>
                      )}
                    </td>

                    {/* Original Voter Booth */}
                    <td style={{ padding: '12px', color: 'var(--color-slate)' }}>
                      <div>Booth {app.originalBoothNo || '—'}</div>
                      <div style={{ fontSize: '11px' }}>{app.originalAssembly || '—'}</div>
                    </td>

                    {/* Date */}
                    <td style={{ padding: '12px', color: 'var(--color-slate)', whiteSpace: 'nowrap' }}>{d}</td>

                    {/* Status */}
                    <td style={{ padding: '12px' }}>
                      <span style={{ background: b.bg, color: b.fg, padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                        {app.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {app.status === 'Pending' ? (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button onClick={() => doAction(app._id, 'Approved')} className="bpa-action-approve">
                            ✓ Approve
                          </button>
                          <button onClick={() => doAction(app._id, 'Declined')} className="bpa-action-reject">
                            ✗ Decline
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--color-slate)' }}>Processed</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bpa-pagination">
          <span style={{ fontSize: '12px', color: 'var(--color-slate)' }}>
            Page {page} of {totalPages} ({summary.total} requests)
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => loadApps(page - 1)} disabled={page <= 1} className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '12px' }}>
              &larr; Prev
            </button>
            <button onClick={() => loadApps(page + 1)} disabled={page >= totalPages} className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '12px' }}>
              Next &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoothPresidentAdminPanel;
