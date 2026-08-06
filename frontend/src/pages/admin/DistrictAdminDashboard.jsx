import AdminMobileNav from '../../components/AdminMobileNav';
import React, { useState, useEffect, useRef } from 'react';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import VoterSchemesView from '../../components/VoterSchemesView';
import MemberProfileTimelineView, { formatSchemeName, getSchemeBgImage } from '../../components/MemberProfileTimelineView';
import ReportsView from '../../components/ReportsView';
import LiveTrackingPanel from '../../components/LiveTrackingPanel';
import { BJP_SCHEMES } from '../../utils/constants';
import {
  Shield, Users, Building, PhoneCall, RefreshCw, Search, Eye, Award, Share2,
  LayoutDashboard, FileText, MapPin, CheckSquare, BarChart3
} from 'lucide-react';
import TopReferrersCard from '../../components/TopReferrersCard';

const DistrictAdminDashboard = () => {
  const { admin } = useAuth();
  const [subPage, setSubPage] = useState('dashboard');
  const [statsData, setStatsData] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [voters, setVoters] = useState([]);
  const [loadingVoters, setLoadingVoters] = useState(false);
  const [totalVoters, setTotalVoters] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [schemeFilter, setSchemeFilter] = useState('');
  const [assemblyFilter, setAssemblyFilter] = useState('');
  const [boothFilter, setBoothFilter] = useState('');
  const [assemblies, setAssemblies] = useState([]);
  const [booths, setBooths] = useState([]);
  const [loadingBooths, setLoadingBooths] = useState(false);
  const [selectedVoterTimeline, setSelectedVoterTimeline] = useState(null);
  const skipFilterResetRef = useRef(false);

  // ── Sub-page Stats Pagination ──
  const [assStatsPage, setAssStatsPage] = useState(1);
  const [boothStatsPage, setBoothStatsPage] = useState(1);
  const LIMIT = 20;

  const navigateSubPage = (pageKey) => {
    setSubPage(pageKey);
    setSelectedVoterTimeline(null);
    try {
      window.history.pushState({}, '', `/admin/district/${pageKey}`);
    } catch (e) {}
  };

  // Fetch dashboard stats (unfiltered for District Overview)
  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const res = await API.get('/admin/dashboard-stats');
      if (res.data.success) setStatsData(res.data);
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch paginated voters (applications grouped by voter)
  const fetchVoters = async (page = 1) => {
    try {
      setLoadingVoters(true);
      const params = new URLSearchParams({
        page,
        limit: LIMIT,
        ...(searchQuery    && { search: searchQuery }),
        ...(statusFilter   && { status: statusFilter }),
        ...(schemeFilter   && { schemeName: schemeFilter }),
        ...(assemblyFilter && { assemblyName: assemblyFilter }),
        ...(boothFilter    && { boothNo: boothFilter })
      });
      const res = await API.get(`/admin/applications?${params}`);
      if (res.data.success) {
        setVoters(res.data.voters || []);
        setTotalVoters(res.data.totalVoters || 0);
        setTotalPages(res.data.totalPages || 1);
        setCurrentPage(res.data.currentPage || 1);
      }
    } catch (err) {
      console.error('Error loading voters:', err);
    } finally {
      setLoadingVoters(false);
    }
  };

  const fetchDashboardData = () => {
    fetchStats();
    fetchVoters(1);
  };

  // Fetch assemblies and booths in district scope on mount
  const fetchAssemblies = async () => {
    try {
      const res = await API.get('/admin/filter-meta');
      if (res.data.success) {
        setAssemblies(res.data.assemblies || []);
        setBooths(res.data.booths || []);
      }
    } catch (err) {
      console.error('Error loading assemblies:', err);
    }
  };

  // Fetch booths dynamically when assembly changes
  const fetchBooths = async (assembly) => {
    if (!assembly) { setBooths([]); return; }
    try {
      setLoadingBooths(true);
      const res = await API.get(`/admin/filter-meta?assemblyName=${encodeURIComponent(assembly)}`);
      if (res.data.success) setBooths(res.data.booths || []);
    } catch (err) {
      console.error('Error loading booths:', err);
    } finally {
      setLoadingBooths(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchAssemblies();
  }, []);

  useEffect(() => {
    fetchVoters(1);
    setCurrentPage(1);
  }, [searchQuery, statusFilter, schemeFilter, assemblyFilter, boothFilter]);

  // When assembly changes: load booths for selected assembly
  useEffect(() => {
    fetchBooths(assemblyFilter);
  }, [assemblyFilter]);

  const getVoterDisplayStatus = (applications) => {
    if (!applications || applications.length === 0) return 'Pending';
    const sorted = [...applications].sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.appliedAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.appliedAt || 0).getTime();
      return timeB - timeA;
    });
    const approvedApp = sorted.find(a => a.status === 'Approved' || a.status === 'Completed');
    if (approvedApp) return approvedApp.status;
    const activeApp = sorted.find(a => a.status === 'Processing' || a.status === 'Verified' || a.status === 'Called');
    if (activeApp) return activeApp.status;
    return sorted[0]?.status || 'Submitted';
  };

  const handleUpdateAppStatus = async (appId, updatePayload) => {
    try {
      const res = await API.put(`/admin/applications/${appId}/status`, updatePayload);
      if (res.data.success) {
        window.dispatchEvent(new CustomEvent('app-status-updated', { detail: { appId, updatePayload } }));
        setVoters(prev => prev.map(v => {
          const hasApp = v.applications?.some(a => a._id === appId);
          if (!hasApp) return v;
          const updatedApps = v.applications.map(a => a._id === appId ? { ...a, ...updatePayload, status: updatePayload.status || a.status } : a);
          return { ...v, applications: updatedApps };
        }));

        if (selectedVoterTimeline) {
          setSelectedVoterTimeline(prev => {
            if (!prev) return null;
            const updatedApps = prev.applications.map(a => a._id === appId ? { ...a, ...updatePayload, status: updatePayload.status || a.status } : a);
            return { ...prev, applications: updatedApps };
          });
        }

        fetchStats();
        fetchVoters(currentPage);
      }
    } catch (err) {
      console.error('Error updating application status:', err);
    }
  };

  const handleDirectCallVoter = async (voter) => {
    const latestApp = voter.applications[voter.applications.length - 1];
    window.location.href = `tel:${voter.mobile}`;
    if (latestApp) {
      await handleUpdateAppStatus(latestApp._id, {
        status: 'Called',
        notes: `Follow-up call placed to ${voter.voterName} (${voter.mobile})`,
        isCallAction: true
      });
    }
  };

  const renderPagination = (page, totalItems, itemsPerPage, onPageChange) => {
    const totalP = Math.ceil(totalItems / itemsPerPage);
    if (totalP <= 1) return null;

    const startItem = (page - 1) * itemsPerPage + 1;
    const endItem = Math.min(page * itemsPerPage, totalItems);

    const range = [];
    const delta = 2;
    const left = Math.max(1, page - delta);
    const right = Math.min(totalP, page + delta);
    if (left > 1) { range.push(1); if (left > 2) range.push('...'); }
    for (let i = left; i <= right; i++) range.push(i);
    if (right < totalP) { if (right < totalP - 1) range.push('...'); range.push(totalP); }

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-linen)', fontSize: '13px', color: 'var(--color-slate)' }}>
        <div>
          Showing <strong>{startItem}</strong> – <strong>{endItem}</strong> of <strong>{totalItems}</strong> entries
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="btn btn-ghost"
            style={{ padding: '4px 10px', fontSize: '12px', opacity: page === 1 ? 0.4 : 1 }}
          >
            ← Prev
          </button>

          {range.map((p, idx) => (
            <button
              key={idx}
              disabled={p === '...'}
              onClick={() => typeof p === 'number' && onPageChange(p)}
              className={`btn ${p === page ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: p === page ? '700' : '500',
                minWidth: '32px'
              }}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalP}
            className="btn btn-ghost"
            style={{ padding: '4px 10px', fontSize: '12px', opacity: page === totalP ? 0.4 : 1 }}
          >
            Next →
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      className="theme-districtadmin"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: '100vw',
        boxSizing: 'border-box',
        minHeight: '100vh'
      }}
    >
      <AdminMobileNav
        role="DISTRICT_ADMIN"
        title={`${admin?.district || 'District'} Portal`}
        subPage={subPage}
        onNavigate={navigateSubPage}
        onRefresh={fetchDashboardData}
      />
      <style>{`
        .districtadmin-scroll { scrollbar-width: thin; scrollbar-color: #3b2e5a #0d0a17; scroll-behavior: smooth; }
        .districtadmin-scroll::-webkit-scrollbar { width: 8px; }
        .districtadmin-scroll::-webkit-scrollbar-track { background: #0d0a17; border-radius: 8px; }
        .districtadmin-scroll::-webkit-scrollbar-thumb { background: #3b2e5a; border-radius: 8px; border: 2px solid #0d0a17; }
        .districtadmin-scroll::-webkit-scrollbar-thumb:hover { background: #8b5cf6; }

        /* Layout */
        .da-body { display:flex; gap:0; width:100%; box-sizing:border-box; align-items:flex-start; overflow:visible; }
        .da-sidebar { width:270px; min-width:270px; flex-shrink:0; position:sticky; top:10px; max-height:calc(100vh - 20px); overflow-y:auto; }
        .da-main { flex:1; min-width:0; padding:20px; overflow:visible; box-sizing:border-box; }
        /* Stat grid */
        .da-stat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:20px; width:100%; }
        /* Scheme grid */
        .da-scheme-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; width:100%; }
        /* Scheme image */
        .da-scheme-img { width:100%; height:96px; object-fit:cover; display:block; }
        /* Filter bar */
        .da-filter-bar { display:flex; gap:8px; flex-wrap:wrap; align-items:center; background:var(--color-fog-gray); padding:12px; border-radius:10px; border:1px solid var(--color-linen); margin-bottom:16px; }
        .da-filter-bar select, .da-filter-bar input { font-size:16px; }
        /* Table */
        .da-table-wrap { width:100%; overflow-x:auto; -webkit-overflow-scrolling:touch; border-radius:10px; }
        .da-table-wrap table { min-width:580px; width:100%; border-collapse:collapse; }

        /* iPad Pro (1024-1366px) */
        @media (max-width:1366px) and (min-width:1024px) {
          .da-stat-grid { grid-template-columns:repeat(2,1fr); }
          .da-scheme-grid { grid-template-columns:repeat(3,1fr); }
        }
        /* Tablet / iPad (<=1023px) */
        @media (max-width:1023px) {
          .da-sidebar { display:none !important; }
          .da-body { flex-direction:column !important; }
          .da-main { padding:14px 14px calc(24px + env(safe-area-inset-bottom,0px)) 14px !important; overflow:visible !important; height:auto !important; }
          .da-stat-grid { grid-template-columns:repeat(2,1fr) !important; gap:12px !important; }
          .da-scheme-grid { grid-template-columns:repeat(2,1fr) !important; gap:10px !important; }
          .da-scheme-img { height:72px !important; }
          .da-filter-bar { flex-direction:column !important; }
          .da-filter-bar>* { width:100% !important; min-width:unset !important; flex:unset !important; }
        }
        /* Large phone (481-767px) */
        @media (max-width:767px) {
          .da-main { padding:10px 12px calc(20px + env(safe-area-inset-bottom,0px)) 12px !important; }
          .da-stat-grid { grid-template-columns:repeat(2,1fr) !important; gap:10px !important; }
          .da-scheme-grid { grid-template-columns:repeat(2,1fr) !important; gap:8px !important; }
          .da-scheme-img { height:60px !important; }
          .stat-number { font-size:clamp(1.1rem,5vw,1.6rem) !important; }
          .stat-card { padding:12px 14px !important; }
          .campsite-card,.admin-card { padding:14px 12px !important; border-radius:10px !important; }
        }
        /* Small phone (<=480px) */
        @media (max-width:480px) {
          .da-main { padding:8px 10px calc(16px + env(safe-area-inset-bottom,0px)) 10px !important; }
          .da-stat-grid { grid-template-columns:repeat(2,1fr) !important; gap:8px !important; }
          .da-scheme-grid { grid-template-columns:repeat(2,1fr) !important; gap:6px !important; }
          .da-scheme-img { height:52px !important; }
          .stat-card { padding:10px 12px !important; }
        }
        /* Fold / narrow (<=360px) */
        @media (max-width:360px) {
          .da-stat-grid { grid-template-columns:repeat(2,1fr) !important; gap:6px !important; }
          .da-scheme-grid { grid-template-columns:repeat(2,1fr) !important; }
          .stat-number { font-size:1rem !important; }
        }
        /* iPhone SE (<=320px) */
        @media (max-width:320px) {
          .da-main { padding:6px 8px calc(14px + env(safe-area-inset-bottom,0px)) 8px !important; }
          .stat-card { padding:8px 10px !important; }
        }
      `}</style>
      <div className="da-body">

      {/* ══════════════════════════════════════════ */}
      {/* LEFT SIDEBAR NAVIGATION MENU               */}
      {/* ══════════════════════════════════════════ */}
      <aside
        className="da-sidebar"
        style={{
          background: 'var(--theme-bg-card)',
          border: '1px solid var(--theme-border)',
          borderRadius: '16px',
          padding: '20px 14px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Sidebar Header Badge */}
        <div style={{ padding: '0 8px 14px 8px', borderBottom: '1px solid var(--theme-border)', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="tag-pill tag-active" style={{ fontSize: '11px', fontWeight: '800' }}>
              <Shield size={12} /> DISTRICT ADMIN
            </span>
          </div>
          <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--theme-text-main)' }}>
            {admin.district || 'District'} Portal
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--theme-text-muted)', marginTop: '2px' }}>
            District Administration
          </div>
        </div>

        {/* Navigation Section Title */}
        <div style={{ fontSize: '10.5px', fontWeight: '800', color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '4px 10px 2px 10px' }}>
          Main Menu
        </div>

        {/* Nav Items */}
        <button
          onClick={() => navigateSubPage('dashboard')}
          className={`sidebar-nav-btn ${subPage === 'dashboard' ? 'active' : ''}`}
        >
          <LayoutDashboard size={18} />
          <span>Overview Dashboard</span>
        </button>

        <button
          onClick={() => navigateSubPage('applications')}
          className={`sidebar-nav-btn ${subPage === 'applications' ? 'active' : ''}`}
        >
          <FileText size={18} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
            <span>District Applications</span>
            <span style={{ fontSize: '10.5px', opacity: 0.8 }}>
              {totalVoters ? `${totalVoters.toLocaleString()} Members` : 'Live DB'}
            </span>
          </div>
        </button>

        <div style={{ fontSize: '10.5px', fontWeight: '800', color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '12px 10px 2px 10px' }}>
          Constituency Stats
        </div>

        <button
          onClick={() => navigateSubPage('assemblies')}
          className={`sidebar-nav-btn ${subPage === 'assemblies' ? 'active' : ''}`}
        >
          <Building size={18} />
          <span>Assembly Stats</span>
        </button>

        <button
          onClick={() => navigateSubPage('booths')}
          className={`sidebar-nav-btn ${subPage === 'booths' ? 'active' : ''}`}
        >
          <CheckSquare size={18} />
          <span>Booth Level Breakdown</span>
        </button>

        <div style={{ fontSize: '10.5px', fontWeight: '800', color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '12px 10px 2px 10px' }}>
          Exports & Reports
        </div>

        <button
          onClick={() => navigateSubPage('reports')}
          className={`sidebar-nav-btn ${subPage === 'reports' ? 'active' : ''}`}
        >
          <BarChart3 size={18} />
          <span>Reports & Excel Export</span>
        </button>

        {/* Sidebar Footer Info */}
        <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid var(--theme-border)' }}>
          <button
            onClick={fetchDashboardData}
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'center', padding: '8px 12px', fontSize: '12.5px', borderRadius: '10px' }}
          >
            <RefreshCw size={13} /> Refresh Data
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════ */}
      {/* RIGHT MAIN CONTENT AREA                   */}
      {/* ══════════════════════════════════════════ */}
      <main className="districtadmin-scroll da-main" style={{ flex: 1, minWidth: 0, paddingRight: '6px' }}>

      {/* PAGE 1: OVERVIEW DASHBOARD */}
      {subPage === 'dashboard' && (
        loadingStats ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', border: '4px solid var(--color-linen)', borderTopColor: 'var(--color-saffron)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ fontSize: '14px', color: 'var(--color-slate)', fontWeight: '500' }}>Loading district stats for {admin.district}...</div>
            <div style={{ fontSize: '12px', color: 'var(--color-ash-gray)' }}>This may take a moment on first load</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : statsData ? (
        <div style={{ width: '100%', boxSizing: 'border-box' }}>
          <LiveTrackingPanel />
          <div className="da-stat-grid" style={{ display: 'grid', gap: '16px', marginBottom: '24px', width: '100%' }}>
            {/* Stat 1: Total Voters in Electoral Roll (from READ DB) */}
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                <Users size={20} />
              </div>
              <div>
                <div className="stat-number" style={{ color: '#2563eb' }}>
                  {statsData.overview.totalVotersInRoll != null
                    ? statsData.overview.totalVotersInRoll.toLocaleString()
                    : '—'}
                </div>
                <div className="stat-label">Total Voters in {admin.district}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-slate)', marginTop: '2px' }}>Electoral Roll (Voter DB)</div>
              </div>
            </div>

            {/* Stat 2: Voters Who Requested Schemes (from WRITE DB) */}
            <div className="stat-card">
              <div className="stat-icon">
                <Users size={20} />
              </div>
              <div>
                <div className="stat-number">{statsData.overview.totalVotersRequested}</div>
                <div className="stat-label">Voters Requested Schemes</div>
                <div style={{ fontSize: '11px', color: 'var(--color-slate)', marginTop: '2px' }}>Enrolled in Program</div>
              </div>
            </div>

            {/* Stat 3: Total Applications */}
            <div
              className="stat-card"
              onClick={() => { setStatusFilter(''); setSchemeFilter(''); navigateSubPage('applications'); }}
              style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
              title="Click to view all applications"
            >
              <div className="stat-icon" style={{ background: 'var(--color-fog-gray)', color: 'var(--color-midnight-ink)' }}>
                <Building size={20} />
              </div>
              <div>
                <div className="stat-number">{statsData.overview.totalApplications}</div>
                <div className="stat-label">District Applications</div>
                <div style={{ fontSize: '11px', color: 'var(--color-saffron)', fontWeight: '600', marginTop: '2px' }}>Click to View Applications →</div>
              </div>
            </div>

            {/* Stat 4: Approved Directives */}
            <div
              className="stat-card"
              onClick={() => { setStatusFilter('Approved'); setSchemeFilter(''); navigateSubPage('applications'); }}
              style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
              title="Click to view approved applications"
            >
              <div className="stat-icon" style={{ background: '#f0fdf4', color: 'var(--color-forest-pulse)' }}>
                <Shield size={20} />
              </div>
              <div>
                <div className="stat-number" style={{ color: 'var(--color-forest-pulse)' }}>{statsData.overview.statusBreakdown.Approved || 0}</div>
                <div className="stat-label">Approved Directives</div>
                <div style={{ fontSize: '11px', color: 'var(--color-forest-pulse)', fontWeight: '600', marginTop: '2px' }}>Click to View Approved →</div>
              </div>
            </div>
          </div>

          <div className="campsite-card" style={{ width: '100%', padding: '24px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-midnight-ink)', margin: 0 }}>
                Top Scheme Demands in {admin.district}
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--color-slate)' }}>Click any scheme to filter applications</span>
            </div>
            <div className="da-scheme-grid" style={{ display: 'grid', gap: '12px', width: '100%' }}>
              {statsData.schemePopularity?.map((item) => {
                const schemeImg = getSchemeBgImage(item._id);
                return (
                <div
                  key={item._id}
                  onClick={() => {
                    setSchemeFilter(item._id);
                    setStatusFilter('');
                    navigateSubPage('applications');
                  }}
                  style={{
                    background: '#1b162b', borderRadius: '10px',
                    border: '1px solid var(--color-linen)', cursor: 'pointer',
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)', transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--color-lavender-400)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(167, 139, 250, 0.25)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--color-linen)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                  }}
                >
                  {schemeImg && (
                    <img
                      src={schemeImg}
                      alt={formatSchemeName(item._id)}
                      loading="lazy"
                      onError={(e) => { e.target.style.display = 'none'; }}
                      className="da-scheme-img"
                      style={{ width: '100%', height: '96px', objectFit: 'cover', display: 'block' }}
                    />
                  )}
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-midnight-ink)' }}>{formatSchemeName(item._id)}</div>
                      <span style={{ fontSize: '11px', color: 'var(--color-saffron)', fontWeight: '600' }}>View →</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-slate)', marginTop: '2px' }}>{item.cluster}</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-midnight-ink)', marginTop: '6px' }}>
                      {item.count} <span style={{ fontSize: '12px', color: 'var(--color-slate)', fontWeight: 'normal' }}>applications</span>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>

          {/* ── Top Referral Champions ── */}
          <TopReferrersCard
            topReferrers={statsData.topReferrers || []}
            scopeLabel={admin?.district || ''}
            onViewProfile={(ref) => {
              if (ref && ref.epicNo) { setSubPage('applications'); setSelectedVoterTimeline(ref); }
            }}
          />

        </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: '12px' }}>
            <div style={{ fontSize: '32px' }}>⚠️</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-midnight-ink)' }}>Could not load stats</div>
            <div style={{ fontSize: '13px', color: 'var(--color-slate)' }}>Check if backend is running and try refreshing.</div>
            <button onClick={fetchDashboardData} className="btn btn-primary" style={{ marginTop: '8px' }}>Retry</button>
          </div>
        )
      )}

      {/* PAGE 2: APPLICATIONS LIST */}
      {subPage === 'applications' && (
        selectedVoterTimeline ? (
          <VoterSchemesView
            voter={selectedVoterTimeline}
            onUpdateStatus={handleUpdateAppStatus}
            onClose={() => setSelectedVoterTimeline(null)}
          />
        ) : (
          <div className="campsite-card" style={{ width: '100%', padding: '24px', boxSizing: 'border-box' }}>

            {/* ─── Filters Row 1: Search + Result count ─── */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '10px', width: '100%', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-ash-gray)' }} />
                <input
                  type="text"
                  placeholder={`Search name, EPIC, mobile, scheme...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-control"
                  style={{ paddingLeft: '38px' }}
                />
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-slate)', whiteSpace: 'nowrap' }}>
                {loadingVoters ? (
                  <span style={{ opacity: 0.6 }}>Loading…</span>
                ) : (
                  <strong style={{ color: 'var(--color-midnight-ink)' }}>{totalVoters.toLocaleString()}</strong>
                )}{!loadingVoters && <span style={{ color: 'var(--color-slate)' }}> voters · Page {currentPage} of {totalPages}</span>}
              </div>
            </div>

            {/* ─── Filters Row 2: Status + Assembly + Booth + Clear ─── */}
            <div className="da-filter-bar" style={{ display: 'flex', gap: '10px', marginBottom: '16px', width: '100%', alignItems: 'center' }}>
              {/* Status */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-control"
                style={{ minWidth: '150px', flex: '1 1 150px', maxWidth: '180px' }}
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Submitted">Submitted</option>
                <option value="Processing">Processing</option>
                <option value="Called">Called</option>
                <option value="Verified">Verified</option>
                <option value="Approved">Approved</option>
                <option value="Completed">Completed</option>
                <option value="Rejected">Rejected</option>
              </select>

              {/* Scheme Filter */}
              <select
                value={BJP_SCHEMES.find(s => s.name.toLowerCase() === (schemeFilter || '').toLowerCase() || (s.fullTitle && s.fullTitle.toLowerCase() === (schemeFilter || '').toLowerCase()))?.name || schemeFilter || ''}
                onChange={(e) => setSchemeFilter(e.target.value)}
                className="form-control"
                style={{ flex: '1 1 160px', minWidth: '150px' }}
              >
                <option value="">All 23 Central BJP Schemes</option>
                {BJP_SCHEMES.map(s => (
                  <option key={s.id} value={s.name}>
                    {s.name} ({s.fullTitle || s.fullName})
                  </option>
                ))}
              </select>

              {/* Assembly Filter */}
              <select
                value={assemblyFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setAssemblyFilter(val);
                  setBoothFilter('');
                }}
                className="form-control"
                style={{ minWidth: '180px', flex: '2 1 180px', maxWidth: '260px' }}
              >
                <option value="">All Assemblies</option>
                {assemblies.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>

              {/* Booth Filter (Always Available) */}
              <select
                value={boothFilter}
                onChange={(e) => setBoothFilter(e.target.value)}
                className="form-control"
                disabled={loadingBooths}
                style={{ minWidth: '140px', flex: '1 1 140px', maxWidth: '180px' }}
              >
                <option value="">{loadingBooths ? 'Loading booths…' : 'All Booths'}</option>
                {booths.map(b => (
                  <option key={b} value={b}>Booth {b}</option>
                ))}
                {boothFilter && !booths.includes(boothFilter) && (
                  <option key={boothFilter} value={boothFilter}>Booth {boothFilter}</option>
                )}
              </select>

              {/* Active filter chips + Clear All */}
              {(statusFilter || schemeFilter || assemblyFilter || boothFilter || searchQuery) && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginLeft: '4px' }}>
                  {assemblyFilter && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: 'var(--color-saffron)', borderRadius: '20px', fontSize: '12px', fontWeight: '600', color: 'var(--color-midnight-ink)' }}>
                      {assemblyFilter}
                      <button onClick={() => setAssemblyFilter('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', lineHeight: 1, fontSize: '14px', color: 'var(--color-midnight-ink)' }}>×</button>
                    </span>
                  )}
                  {boothFilter && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: '#e0f2fe', borderRadius: '20px', fontSize: '12px', fontWeight: '600', color: '#0369a1' }}>
                      Booth {boothFilter}
                      <button onClick={() => setBoothFilter('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', lineHeight: 1, fontSize: '14px', color: '#0369a1' }}>×</button>
                    </span>
                  )}
                  <button
                    onClick={() => { setSearchQuery(''); setStatusFilter(''); setSchemeFilter(''); setAssemblyFilter(''); setBoothFilter(''); }}
                    style={{ background: 'none', border: '1px solid var(--color-linen)', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', color: 'var(--color-slate)', cursor: 'pointer' }}
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>

            {/* ─── Table ─── */}
            <div className="da-table-wrap" style={{ width: '100%', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-linen)', color: 'var(--color-slate)', textAlign: 'left', background: 'var(--color-fog-gray)' }}>
                    <th style={{ padding: '12px 10px' }}>#</th>
                    <th style={{ padding: '12px 10px' }}>Member &amp; EPIC</th>
                    <th style={{ padding: '12px 10px' }}>Mobile</th>
                    <th style={{ padding: '12px 10px' }}>Schemes Applied</th>
                    <th style={{ padding: '12px 10px' }}>Assembly / Booth</th>
                    <th style={{ padding: '12px 10px' }}>Latest Status</th>
                    <th style={{ padding: '12px 10px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingVoters ? (
                    // Skeleton rows while loading
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--color-linen)' }}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} style={{ padding: '14px 10px' }}>
                            <div style={{ height: '14px', borderRadius: '6px', background: 'var(--color-linen)', animation: 'pulse 1.4s ease-in-out infinite', width: j === 0 ? '24px' : j === 1 ? '80%' : j === 2 ? '70%' : '60%' }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : voters.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-slate)' }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
                        No applications found for {admin.district}.
                      </td>
                    </tr>
                  ) : (
                    voters.map((voter, idx) => {
                      const latestApp = voter.applications[voter.applications.length - 1];
                      const rowNum = (currentPage - 1) * LIMIT + idx + 1;
                      return (
                        <tr key={voter.epicNo || idx} style={{ borderBottom: '1px solid var(--color-linen)', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-fog-gray)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '12px 10px', color: 'var(--color-ash-gray)', fontSize: '12px', fontWeight: '600' }}>{rowNum}</td>
                          <td style={{ padding: '12px 10px' }}>
                            <div style={{ fontWeight: '700', color: 'var(--color-midnight-ink)' }}>{voter.voterName}</div>
                            <div style={{ fontSize: '11px', color: 'var(--color-slate)', fontFamily: 'monospace' }}>{voter.epicNo}</div>
                          </td>
                          <td style={{ padding: '12px 10px', fontWeight: '600' }}>{voter.mobile}</td>
                          <td style={{ padding: '12px 10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span className="tag-pill tag-sunlit" style={{ fontWeight: '700', fontSize: '11px' }}>
                                <Award size={12} /> {voter.applications.length} Scheme{voter.applications.length > 1 ? 's' : ''}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--color-slate)' }}>
                                {voter.applications.map(a => formatSchemeName(a.schemeName, a.schemeId)).join(', ')}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 10px', color: 'var(--color-midnight-ink)' }}>
                            {voter.assemblyName} · <strong>Booth {voter.boothNo}</strong>
                          </td>
                          <td style={{ padding: '12px 10px' }}>
                            <StatusBadge status={getVoterDisplayStatus(voter.applications)} />
                          </td>
                          <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button onClick={() => setSelectedVoterTimeline(voter)} className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: '12px' }}>
                                <Eye size={13} /> View
                              </button>
                              <button onClick={() => handleDirectCallVoter(voter)} className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: '12px' }}>
                                <PhoneCall size={13} /> Call
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* ─── Pagination Controls ─── */}
            {!loadingVoters && totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '24px', flexWrap: 'wrap' }}>
                {/* Prev */}
                <button
                  onClick={() => { const p = currentPage - 1; setCurrentPage(p); fetchVoters(p); }}
                  disabled={currentPage === 1}
                  className="btn btn-ghost"
                  style={{ padding: '6px 14px', fontSize: '13px', opacity: currentPage === 1 ? 0.4 : 1 }}
                >
                  ← Prev
                </button>

                {/* Page pills */}
                {getPageRange().map((item, i) =>
                  item === '...' ? (
                    <span key={`ellipsis-${i}`} style={{ padding: '6px 4px', color: 'var(--color-ash-gray)', fontSize: '13px' }}>…</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => { setCurrentPage(item); fetchVoters(item); }}
                      className="btn"
                      style={{
                        padding: '6px 12px', fontSize: '13px', fontWeight: item === currentPage ? '700' : '500',
                        background: item === currentPage ? 'var(--color-saffron)' : 'transparent',
                        color: item === currentPage ? 'var(--color-midnight-ink)' : 'var(--color-slate)',
                        border: item === currentPage ? '1.5px solid var(--color-saffron)' : '1.5px solid var(--color-linen)',
                        borderRadius: '8px', minWidth: '36px'
                      }}
                    >
                      {item}
                    </button>
                  )
                )}

                {/* Next */}
                <button
                  onClick={() => { const p = currentPage + 1; setCurrentPage(p); fetchVoters(p); }}
                  disabled={currentPage === totalPages}
                  className="btn btn-ghost"
                  style={{ padding: '6px 14px', fontSize: '13px', opacity: currentPage === totalPages ? 0.4 : 1 }}
                >
                  Next →
                </button>

                <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
              </div>
            )}
          </div>
        )
      )}



      {/* PAGE 3: ASSEMBLY STATS */}
      {subPage === 'assemblies' && statsData && (
        <div className="campsite-card" style={{ width: '100%', padding: '24px', boxSizing: 'border-box' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-midnight-ink)', marginBottom: '16px' }}>
            Assembly Constituencies in {admin.district}
          </h3>
          <div className="da-table-wrap" style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-linen)', color: 'var(--color-slate)', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Assembly Constituency</th>
                  <th style={{ padding: '10px' }}>Total Voters</th>
                  <th style={{ padding: '10px' }}>Applied Voters</th>
                  <th style={{ padding: '10px' }}>Total Applications</th>
                  <th style={{ padding: '10px' }}>Approved</th>
                  <th style={{ padding: '10px' }}>Pending</th>
                </tr>
              </thead>
              <tbody>
                {(statsData.assemblyStats || []).slice((assStatsPage - 1) * 15, assStatsPage * 15).map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--color-linen)', cursor: 'pointer' }}
                    onClick={() => { setAssemblyFilter(row._id.assemblyName); setBoothFilter(''); setStatusFilter(''); setSchemeFilter(''); navigateSubPage('applications'); }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-fog-gray)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px', fontWeight: '600', color: 'var(--color-midnight-ink)' }}>{row._id.assemblyName}</td>
                    <td style={{ padding: '10px', color: 'var(--color-slate)' }}>{row.totalVoters ? row.totalVoters.toLocaleString('en-IN') : '—'}</td>
                    <td style={{ padding: '10px', color: '#0284c7', fontWeight: '700' }}>{row.appliedVoters ?? '—'}</td>
                    <td style={{ padding: '10px', fontWeight: '600' }}>{row.totalApps}</td>
                    <td style={{ padding: '10px', color: 'var(--color-forest-pulse)', fontWeight: '600' }}>{row.approved}</td>
                    <td style={{ padding: '10px', color: 'var(--color-slate)' }}>{row.pending}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {renderPagination(assStatsPage, statsData.assemblyStats?.length || 0, 15, setAssStatsPage)}
        </div>
      )}

      {/* PAGE 4: BOOTH STATS */}
      {subPage === 'booths' && statsData && (
        <div className="campsite-card" style={{ width: '100%', padding: '24px', boxSizing: 'border-box' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-midnight-ink)', marginBottom: '16px' }}>
            Polling Booths Breakdown in {admin.district}
          </h3>
          <div className="da-table-wrap" style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-linen)', color: 'var(--color-slate)', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Booth / Part No</th>
                  <th style={{ padding: '10px' }}>Assembly</th>
                  <th style={{ padding: '10px' }}>Total Voters</th>
                  <th style={{ padding: '10px' }}>Applied Voters</th>
                  <th style={{ padding: '10px' }}>Total Applications</th>
                  <th style={{ padding: '10px' }}>Approved</th>
                  <th style={{ padding: '10px' }}>Pending</th>
                </tr>
              </thead>
              <tbody>
                {(statsData.boothStats || []).slice((boothStatsPage - 1) * 15, boothStatsPage * 15).map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--color-linen)', cursor: 'pointer' }}
                    onClick={() => { setAssemblyFilter(row._id.assemblyName); setBoothFilter(String(row._id.boothNo)); setStatusFilter(''); setSchemeFilter(''); navigateSubPage('applications'); }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-fog-gray)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px', fontWeight: '600', color: 'var(--color-midnight-ink)' }}>Booth {row._id.boothNo}</td>
                    <td style={{ padding: '10px' }}>{row._id.assemblyName}</td>
                    <td style={{ padding: '10px', color: 'var(--color-slate)' }}>{row.totalVoters ? row.totalVoters.toLocaleString('en-IN') : '—'}</td>
                    <td style={{ padding: '10px', color: '#0284c7', fontWeight: '700' }}>{row.appliedVoters ?? '—'}</td>
                    <td style={{ padding: '10px', fontWeight: '600' }}>{row.totalApps}</td>
                    <td style={{ padding: '10px', color: 'var(--color-forest-pulse)', fontWeight: '600' }}>{row.approved}</td>
                    <td style={{ padding: '10px', color: 'var(--color-slate)' }}>{row.pending}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {renderPagination(boothStatsPage, statsData.boothStats?.length || 0, 15, setBoothStatsPage)}
        </div>
      )}

      {/* PAGE: REPORTS & EXCEL EXPORT */}
      {subPage === 'reports' && (
        <ReportsView
          initialDistrict={admin?.district || districtFilter}
          initialAssembly={assemblyFilter}
          initialBooth={boothFilter}
          initialStatus={statusFilter}
          initialScheme={schemeFilter}
        />
      )}
      </main>
    </div>
  </div>
  );
};

export default DistrictAdminDashboard;
