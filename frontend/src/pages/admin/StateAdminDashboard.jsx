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
  Shield, Users, Building, PhoneCall, RefreshCw, Search, Eye, Award, FileText, Share2,
  LayoutDashboard, MapPin, CheckSquare, BarChart3
} from 'lucide-react';
import TopReferrersCard from '../../components/TopReferrersCard';

const LIMIT = 20;

const StateAdminDashboard = () => {
  const { admin } = useAuth();
  const [subPage, setSubPage] = useState('dashboard');

  // ── Stats ──
  const [statsData, setStatsData] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // ── Paginated voters (applications) ──
  const [voters, setVoters] = useState([]);
  const [loadingVoters, setLoadingVoters] = useState(false);
  const [totalVoters, setTotalVoters] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // ── Filters ──
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [schemeFilter, setSchemeFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [assemblyFilter, setAssemblyFilter] = useState('');
  const [boothFilter, setBoothFilter] = useState('');

  // ── Dynamic Metadata Dropdown Lists ──
  const [districts, setDistricts] = useState([]);
  const [assemblies, setAssemblies] = useState([]);
  const [booths, setBooths] = useState([]);
  const [loadingAssemblies, setLoadingAssemblies] = useState(false);
  const [loadingBooths, setLoadingBooths] = useState(false);

  const [selectedVoterTimeline, setSelectedVoterTimeline] = useState(null);
  const skipFilterResetRef = useRef(false);

  // ── Sub-page Pagination States ──
  const [distStatsPage, setDistStatsPage] = useState(1);
  const [assStatsPage, setAssStatsPage] = useState(1);
  const [boothStatsPage, setBoothStatsPage] = useState(1);

  const navigateSubPage = (pageKey) => {
    setSubPage(pageKey);
    setSelectedVoterTimeline(null);
    try { window.history.pushState({}, '', `/admin/state/${pageKey}`); } catch (e) {}
  };

  // ── Fetch Districts & Initial Meta ──
  const fetchInitialMeta = async () => {
    try {
      const res = await API.get('/admin/filter-meta');
      if (res.data.success) {
        setDistricts(res.data.districts || []);
        setAssemblies(res.data.assemblies || []);
        setBooths(res.data.booths || []);
      }
    } catch (err) {
      console.error('Error fetching filter meta:', err);
    }
  };

  // ── Fetch Assemblies when District changes ──
  const fetchAssembliesForDistrict = async (dist) => {
    if (!dist) {
      fetchInitialMeta();
      return;
    }
    try {
      setLoadingAssemblies(true);
      const res = await API.get(`/admin/filter-meta?district=${encodeURIComponent(dist)}`);
      if (res.data.success) {
        setAssemblies(res.data.assemblies || []);
        setBooths(res.data.booths || []);
      }
    } catch (err) {
      console.error('Error loading assemblies for district:', err);
    } finally {
      setLoadingAssemblies(false);
    }
  };

  // ── Fetch Booths when Assembly changes ──
  const fetchBoothsForAssembly = async (ass, dist) => {
    if (!ass) {
      setBooths([]);
      return;
    }
    try {
      setLoadingBooths(true);
      const params = new URLSearchParams({
        assemblyName: ass,
        ...(dist && { district: dist })
      });
      const res = await API.get(`/admin/filter-meta?${params}`);
      if (res.data.success) {
        setBooths(res.data.booths || []);
      }
    } catch (err) {
      console.error('Error loading booths for assembly:', err);
    } finally {
      setLoadingBooths(false);
    }
  };

  // ── Fetch Overall Stats (Unfiltered for Overview Dashboard) ──
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

  // ── Fetch Paginated Voters ──
  const fetchVoters = async (page = 1) => {
    try {
      setLoadingVoters(true);
      const params = new URLSearchParams({
        page, limit: LIMIT,
        ...(searchQuery     && { search: searchQuery }),
        ...(statusFilter    && { status: statusFilter }),
        ...(schemeFilter    && { schemeName: schemeFilter }),
        ...(districtFilter  && { district: districtFilter }),
        ...(assemblyFilter  && { assemblyName: assemblyFilter }),
        ...(boothFilter     && { boothNo: boothFilter })
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

  useEffect(() => {
    fetchInitialMeta();
    fetchStats();
  }, []);

  // Re-fetch voters whenever any filter changes
  useEffect(() => {
    fetchVoters(1);
    setCurrentPage(1);
  }, [districtFilter, assemblyFilter, boothFilter, statusFilter, schemeFilter, searchQuery]);

  // Handle District change
  useEffect(() => {
    fetchAssembliesForDistrict(districtFilter);
  }, [districtFilter]);

  // Handle Assembly change
  useEffect(() => {
    fetchBoothsForAssembly(assemblyFilter, districtFilter);
  }, [assemblyFilter, districtFilter]);

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
        notes: `Follow-up call to ${voter.voterName} (${voter.mobile})`,
        isCallAction: true
      });
    }
  };

  const getPageRange = () => {
    const range = [];
    const delta = 2;
    const left = Math.max(1, currentPage - delta);
    const right = Math.min(totalPages, currentPage + delta);
    if (left > 1) { range.push(1); if (left > 2) range.push('...'); }
    for (let i = left; i <= right; i++) range.push(i);
    if (right < totalPages) { if (right < totalPages - 1) range.push('...'); range.push(totalPages); }
    return range;
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

  const activeScopeText = 'All Districts across Tamil Nadu';

  return (
    <div
      className="theme-stateadmin"
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
        role="STATE_ADMIN"
        title="State Admin Portal"
        subPage={subPage}
        onNavigate={navigateSubPage}
        onRefresh={fetchDashboardData}
      />
      <style>{`
        .stateadmin-scroll { scrollbar-width: thin; scrollbar-color: #3b2e5a #0d0a17; scroll-behavior: smooth; }
        .stateadmin-scroll::-webkit-scrollbar { width: 8px; }
        .stateadmin-scroll::-webkit-scrollbar-track { background: #0d0a17; border-radius: 8px; }
        .stateadmin-scroll::-webkit-scrollbar-thumb { background: #3b2e5a; border-radius: 8px; border: 2px solid #0d0a17; }
        .stateadmin-scroll::-webkit-scrollbar-thumb:hover { background: #8b5cf6; }

        /* Layout */
        .st-body { display:flex; gap:0; width:100%; box-sizing:border-box; align-items:flex-start; overflow:visible; }
        .st-sidebar { width:270px; min-width:270px; flex-shrink:0; position:sticky; top:10px; max-height:calc(100vh - 20px); overflow-y:auto; }
        .st-main { flex:1; min-width:0; padding:20px; overflow:visible; box-sizing:border-box; }
        /* Stat grid */
        .st-stat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:20px; width:100%; }
        /* Scheme grid */
        .st-scheme-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; width:100%; }
        /* Scheme image */
        .st-scheme-img { width:100%; height:96px; object-fit:cover; display:block; }
        /* Filter bar */
        .st-filter-bar { display:flex; gap:8px; flex-wrap:wrap; align-items:center; background:var(--color-fog-gray); padding:12px; border-radius:10px; border:1px solid var(--color-linen); margin-bottom:16px; }
        .st-filter-bar select, .st-filter-bar input { font-size:16px; }
        /* Table */
        .st-table-wrap { width:100%; overflow-x:auto; -webkit-overflow-scrolling:touch; border-radius:10px; }
        .st-table-wrap table { min-width:580px; width:100%; border-collapse:collapse; }

        /* Mobile Application Cards */
        .st-app-cards { display:none; flex-direction:column; gap:10px; width:100%; }
        .st-app-card { background:var(--theme-bg-subcard,var(--color-fog-gray)); border:1px solid var(--theme-border,var(--color-linen)); border-radius:12px; padding:14px; }
        .st-app-card-header { display:flex; align-items:flex-start; justify-content:space-between; gap:8px; margin-bottom:8px; }
        .st-app-card-name { font-size:15px; font-weight:700; color:var(--theme-text-main,var(--color-midnight-ink)); }
        .st-app-card-epic { font-size:11px; font-family:monospace; color:var(--theme-text-muted,var(--color-slate)); margin-top:2px; }
        .st-app-card-meta { font-size:12px; color:var(--theme-text-muted,var(--color-slate)); margin-bottom:6px; }
        .st-app-card-schemes { font-size:11px; color:var(--color-slate); margin-bottom:6px; line-height:1.4; }
        .st-app-card-actions { display:flex; gap:8px; margin-top:10px; padding-top:10px; border-top:1px solid var(--theme-border,var(--color-linen)); }
        .st-app-card-actions .btn { flex:1; justify-content:center; min-height:44px; font-size:13px; }

        /* iPad Pro (1024-1366px) */
        @media (max-width:1366px) and (min-width:1024px) {
          .st-stat-grid { grid-template-columns:repeat(2,1fr); }
          .st-scheme-grid { grid-template-columns:repeat(3,1fr); }
        }
        /* Tablet / iPad (<=1023px) */
        @media (max-width:1023px) {
          .st-sidebar { display:none !important; }
          .st-body { flex-direction:column !important; }
          .st-main { padding:14px 14px calc(24px + env(safe-area-inset-bottom,0px)) 14px !important; overflow:visible !important; height:auto !important; }
          .st-stat-grid { grid-template-columns:repeat(2,1fr) !important; gap:12px !important; }
          .st-scheme-grid { grid-template-columns:repeat(2,1fr) !important; gap:10px !important; }
          .st-scheme-img { height:72px !important; }
          .st-filter-bar { flex-direction:column !important; }
          .st-filter-bar>* { width:100% !important; min-width:unset !important; flex:unset !important; }
          .st-table-wrap { display:none !important; }
          .st-app-cards { display:flex !important; }
        }
        /* Large phone (481-767px) */
        @media (max-width:767px) {
          .st-main { padding:10px 12px calc(20px + env(safe-area-inset-bottom,0px)) 12px !important; }
          .st-stat-grid { grid-template-columns:repeat(2,1fr) !important; gap:10px !important; }
          .st-scheme-grid { grid-template-columns:repeat(2,1fr) !important; gap:8px !important; }
          .st-scheme-img { height:60px !important; }
          .stat-number { font-size:clamp(1.1rem,5vw,1.6rem) !important; }
          .stat-card { padding:12px 14px !important; }
          .campsite-card,.admin-card { padding:14px 12px !important; border-radius:10px !important; }
        }
        /* Small phone (<=480px) */
        @media (max-width:480px) {
          .st-main { padding:8px 10px calc(16px + env(safe-area-inset-bottom,0px)) 10px !important; }
          .st-stat-grid { grid-template-columns:repeat(2,1fr) !important; gap:8px !important; }
          .st-scheme-grid { grid-template-columns:repeat(2,1fr) !important; gap:6px !important; }
          .st-scheme-img { height:52px !important; }
          .stat-card { padding:10px 12px !important; }
        }
        /* Fold / narrow (<=360px) */
        @media (max-width:360px) {
          .st-stat-grid { grid-template-columns:repeat(2,1fr) !important; gap:6px !important; }
          .st-scheme-grid { grid-template-columns:repeat(2,1fr) !important; }
          .stat-number { font-size:1rem !important; }
        }
        /* iPhone SE (<=320px) */
        @media (max-width:320px) {
          .st-main { padding:6px 8px calc(14px + env(safe-area-inset-bottom,0px)) 8px !important; }
          .stat-card { padding:8px 10px !important; }
        }
      `}</style>
      <div className="st-body">

      {/* ══════════════════════════════════════════ */}
      {/* LEFT SIDEBAR NAVIGATION MENU               */}
      {/* ══════════════════════════════════════════ */}
      <aside
        className="st-sidebar"
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
              <Shield size={12} /> STATE ADMIN
            </span>
          </div>
          <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--theme-text-main)' }}>
            State Governance
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--theme-text-muted)', marginTop: '2px' }}>
            Tamil Nadu State Portal
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
            <span>Scheme Applications</span>
            <span style={{ fontSize: '10.5px', opacity: 0.8 }}>
              {totalVoters ? `${totalVoters.toLocaleString()} Members` : 'Live DB'}
            </span>
          </div>
        </button>

        <div style={{ fontSize: '10.5px', fontWeight: '800', color: 'var(--theme-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '12px 10px 2px 10px' }}>
          Jurisdiction Analytics
        </div>

        <button
          onClick={() => navigateSubPage('districts')}
          className={`sidebar-nav-btn ${subPage === 'districts' ? 'active' : ''}`}
        >
          <MapPin size={18} />
          <span>District Stats</span>
        </button>

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
          <span>Booth Level Stats</span>
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
      <main className="stateadmin-scroll st-main" style={{ flex: 1, minWidth: 0, paddingRight: '6px' }}>

      {/* ══════════════════════════════════════════ */}
      {/* PAGE 1: OVERVIEW DASHBOARD                */}
      {/* ══════════════════════════════════════════ */}
      {subPage === 'dashboard' && (
        loadingStats ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', border: '4px solid var(--color-linen)', borderTopColor: 'var(--color-saffron)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ fontSize: '14px', color: 'var(--color-slate)', fontWeight: '500' }}>Loading stats for {activeScopeText}...</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : statsData ? (
          <div style={{ width: '100%', boxSizing: 'border-box' }}>

            <LiveTrackingPanel />

            {/* ── 4 Stat Cards ── */}
            <div className="st-stat-grid" style={{ display: 'grid', gap: '16px', marginBottom: '24px', width: '100%' }}>

              {/* Card 1: Total Voters in Electoral Roll (Read DB) */}
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
                  <div className="stat-label">Total Voters in Roll</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-slate)', marginTop: '2px' }}>Electoral Roll (Read DB)</div>
                </div>
              </div>

              {/* Card 2: Voters Requested Schemes (Write DB) */}
              <div className="stat-card">
                <div className="stat-icon">
                  <Users size={20} />
                </div>
                <div>
                  <div className="stat-number">
                    {statsData.overview.totalVotersRequested ?? statsData.overview.totalUsers ?? 0}
                  </div>
                  <div className="stat-label">Voters Requested Schemes</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-slate)', marginTop: '2px' }}>Enrolled in Program</div>
                </div>
              </div>

              {/* Card 3: Total Applications */}
              <div
                className="stat-card"
                onClick={() => { setStatusFilter(''); setSchemeFilter(''); navigateSubPage('applications'); }}
                style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                title="Click to view all applications"
              >
                <div className="stat-icon" style={{ background: 'var(--color-fog-gray)', color: 'var(--color-midnight-ink)' }}>
                  <FileText size={20} />
                </div>
                <div>
                  <div className="stat-number">{statsData.overview.totalApplications}</div>
                  <div className="stat-label">Applications Submitted</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-saffron)', fontWeight: '600', marginTop: '2px' }}>Click to View Applications →</div>
                </div>
              </div>

              {/* Card 4: Approved Directives */}
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
                  <div className="stat-number" style={{ color: 'var(--color-forest-pulse)' }}>
                    {statsData.overview.statusBreakdown?.Approved || 0}
                  </div>
                  <div className="stat-label">Approved Benefit Directives</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-forest-pulse)', fontWeight: '600', marginTop: '2px' }}>Click to View Approved →</div>
                </div>
              </div>

            </div>

            {/* ── Top Applied BJP Schemes ── */}
            <div className="campsite-card" style={{ width: '100%', padding: '24px', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-midnight-ink)', margin: 0 }}>
                  Top Applied BJP Schemes in {activeScopeText}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--color-slate)' }}>Click any scheme to filter applications</span>
              </div>
              <div className="st-scheme-grid" style={{ display: 'grid', gap: '12px', width: '100%' }}>
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
                      background: '#1b162b',
                      borderRadius: '10px',
                      border: '1px solid var(--color-linen)',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                      transition: 'all 0.2s ease'
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
                        className="st-scheme-img"
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
              scopeLabel={activeScopeText}
              onViewProfile={(ref) => {
                if (ref && ref.epicNo) { setSubPage('applications'); setSelectedVoterTimeline(ref); }
              }}
            />

          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: '12px' }}>
            <div style={{ fontSize: '32px' }}>⚠️</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-midnight-ink)' }}>Could not load stats</div>
            <button onClick={fetchStats} className="btn btn-primary" style={{ marginTop: '8px' }}>Retry</button>
          </div>
        )
      )}

      {/* ══════════════════════════════════════════ */}
      {/* PAGE 2: APPLICATIONS LIST (Paginated)     */}
      {/* ══════════════════════════════════════════ */}
      {subPage === 'applications' && (
        selectedVoterTimeline ? (
          <VoterSchemesView
            voter={selectedVoterTimeline}
            onUpdateStatus={handleUpdateAppStatus}
            onClose={() => setSelectedVoterTimeline(null)}
          />
        ) : (
          <div className="campsite-card" style={{ width: '100%', padding: '24px', boxSizing: 'border-box' }}>

            {/* ── Search + Summary Row ── */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px', width: '100%', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-ash-gray)' }} />
                <input
                  type="text"
                  placeholder="Search by Member Name, EPIC, Mobile, or Scheme..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-control"
                  style={{ paddingLeft: '38px' }}
                />
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-slate)', whiteSpace: 'nowrap' }}>
                {loadingVoters
                  ? <span style={{ opacity: 0.6 }}>Loading…</span>
                  : <><strong style={{ color: 'var(--color-midnight-ink)' }}>{totalVoters.toLocaleString()}</strong> voters · Page {currentPage} of {totalPages}</>
                }
              </div>
            </div>

            {/* ── Filters Row 2: District + Assembly + Booth + Status + Clear All ── */}
            <div className="st-filter-bar" style={{ display: 'flex', gap: '10px', marginBottom: '18px', width: '100%', alignItems: 'center' }}>

              {/* District Filter */}
              <select
                value={districtFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setDistrictFilter(val);
                  setAssemblyFilter('');
                  setBoothFilter('');
                }}
                className="form-control"
                style={{ flex: '1 1 150px', minWidth: '140px' }}
              >
                <option value="">All Districts (State-wide)</option>
                {districts.map(d => (
                  <option key={d} value={d}>{d}</option>
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
                disabled={loadingAssemblies}
                style={{ flex: '1 1 150px', minWidth: '140px' }}
              >
                <option value="">{loadingAssemblies ? 'Loading assemblies…' : 'All Assemblies'}</option>
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
                style={{ flex: '1 1 130px', minWidth: '120px' }}
              >
                <option value="">{loadingBooths ? 'Loading booths…' : 'All Booths'}</option>
                {booths.map(b => (
                  <option key={b} value={b}>Booth {b}</option>
                ))}
                {boothFilter && !booths.includes(boothFilter) && (
                  <option key={boothFilter} value={boothFilter}>Booth {boothFilter}</option>
                )}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-control"
                style={{ flex: '1 1 140px', minWidth: '130px' }}
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

              {/* Clear All button */}
              {(districtFilter || assemblyFilter || boothFilter || statusFilter || schemeFilter || searchQuery) && (
                <button
                  onClick={() => {
                    setDistrictFilter('');
                    setAssemblyFilter('');
                    setBoothFilter('');
                    setStatusFilter('');
                    setSchemeFilter('');
                    setSearchQuery('');
                  }}
                  className="btn btn-ghost"
                  style={{
                    padding: '6px 14px', fontSize: '12px',
                    whiteSpace: 'nowrap', fontWeight: '600'
                  }}
                >
                  Clear All
                </button>
              )}
            </div>

            {/* ── Table ── */}
            <div className="st-table-wrap" style={{ width: '100%', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-linen)', color: 'var(--color-slate)', textAlign: 'left', background: 'var(--color-fog-gray)' }}>
                    <th style={{ padding: '12px 10px' }}>#</th>
                    <th style={{ padding: '12px 10px' }}>Member &amp; EPIC</th>
                    <th style={{ padding: '12px 10px' }}>Mobile</th>
                    <th style={{ padding: '12px 10px' }}>Schemes Applied</th>
                    <th style={{ padding: '12px 10px' }}>District / Assembly / Booth</th>
                    <th style={{ padding: '12px 10px' }}>Latest Status</th>
                    <th style={{ padding: '12px 10px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingVoters ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--color-linen)' }}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} style={{ padding: '14px 10px' }}>
                            <div style={{ height: '14px', borderRadius: '6px', background: 'var(--color-linen)', animation: 'pulse 1.4s ease-in-out infinite', width: j === 0 ? '24px' : j === 1 ? '80%' : '60%' }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : voters.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-slate)' }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
                        No member applications found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    voters.map((voter, idx) => {
                      const latestApp = voter.applications[voter.applications.length - 1];
                      const rowNum = (currentPage - 1) * LIMIT + idx + 1;
                      return (
                        <tr key={voter.epicNo || idx}
                          style={{ borderBottom: '1px solid var(--color-linen)', transition: 'background 0.15s' }}
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
                            {voter.district} · {voter.assemblyName} · <strong>Booth {voter.boothNo}</strong>
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

            {/* ── Mobile Application Cards (shown ≤1023px) ── */}
            <div className="st-app-cards">
              {loadingVoters ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="st-app-card">
                    <div style={{ height: '14px', borderRadius: '6px', background: 'var(--color-linen)', marginBottom: '8px', width: '60%' }} />
                    <div style={{ height: '11px', borderRadius: '4px', background: 'var(--color-linen)', marginBottom: '6px', width: '40%' }} />
                    <div style={{ height: '11px', borderRadius: '4px', background: 'var(--color-linen)', width: '80%' }} />
                  </div>
                ))
              ) : voters.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-slate)' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
                  <div>No member applications found.</div>
                </div>
              ) : (
                voters.map((voter) => (
                  <div className="st-app-card" key={voter.epicNo}>
                    <div className="st-app-card-header">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="st-app-card-name">{voter.voterName}</div>
                        <div className="st-app-card-epic">{voter.epicNo}</div>
                      </div>
                      <StatusBadge status={getVoterDisplayStatus(voter.applications)} />
                    </div>
                    <div className="st-app-card-meta">
                      📱 {voter.mobile} &nbsp;·&nbsp; 🗳 Booth {voter.boothNo}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-slate)', marginBottom: '6px' }}>
                      {voter.district} · {voter.assemblyName}
                    </div>
                    <div className="st-app-card-schemes">
                      <span className="tag-pill tag-sunlit" style={{ fontWeight: '700', fontSize: '11px', marginRight: '6px' }}>
                        <Award size={11} /> {voter.applications.length} Scheme{voter.applications.length > 1 ? 's' : ''}
                      </span>
                      {voter.applications.map(a => formatSchemeName(a.schemeName, a.schemeId)).join(', ')}
                    </div>
                    <div className="st-app-card-actions">
                      <button onClick={() => setSelectedVoterTimeline(voter)} className="btn btn-ghost">
                        <Eye size={14} /> View
                      </button>
                      <button onClick={() => handleDirectCallVoter(voter)} className="btn btn-ghost">
                        <PhoneCall size={14} /> Call
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* ── Pagination Controls ── */}
            {!loadingVoters && totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '24px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => { const p = currentPage - 1; setCurrentPage(p); fetchVoters(p); }}
                  disabled={currentPage === 1}
                  className="btn btn-ghost"
                  style={{ padding: '6px 14px', fontSize: '13px', opacity: currentPage === 1 ? 0.4 : 1 }}
                >← Prev</button>

                {getPageRange().map((item, i) =>
                  item === '...' ? (
                    <span key={`e-${i}`} style={{ padding: '6px 4px', color: 'var(--color-ash-gray)', fontSize: '13px' }}>…</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => { setCurrentPage(item); fetchVoters(item); }}
                      className="btn"
                      style={{
                        padding: '6px 12px', fontSize: '13px',
                        fontWeight: item === currentPage ? '700' : '500',
                        background: item === currentPage ? 'var(--color-saffron)' : 'transparent',
                        color: item === currentPage ? 'var(--color-midnight-ink)' : 'var(--color-slate)',
                        border: item === currentPage ? '1.5px solid var(--color-saffron)' : '1.5px solid var(--color-linen)',
                        borderRadius: '8px', minWidth: '36px'
                      }}
                    >{item}</button>
                  )
                )}

                <button
                  onClick={() => { const p = currentPage + 1; setCurrentPage(p); fetchVoters(p); }}
                  disabled={currentPage === totalPages}
                  className="btn btn-ghost"
                  style={{ padding: '6px 14px', fontSize: '13px', opacity: currentPage === totalPages ? 0.4 : 1 }}
                >Next →</button>

                <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
              </div>
            )}
          </div>
        )
      )}

      {/* ══════════════════════════════════════════ */}
      {/* PAGE 3: DISTRICT STATS                    */}
      {/* ══════════════════════════════════════════ */}
      {subPage === 'districts' && statsData && (
        <div className="campsite-card" style={{ width: '100%', padding: '24px', boxSizing: 'border-box' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-midnight-ink)', marginBottom: '16px' }}>
            District-wise Application Analytics
          </h3>
          <div className="st-table-wrap" style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-linen)', color: 'var(--color-slate)', textAlign: 'left', background: 'var(--color-fog-gray)' }}>
                  <th style={{ padding: '10px' }}>District Name</th>
                  <th style={{ padding: '10px' }}>Total Voters</th>
                  <th style={{ padding: '10px' }}>Applied Voters</th>
                  <th style={{ padding: '10px' }}>Total Applications</th>
                  <th style={{ padding: '10px' }}>Approved</th>
                  <th style={{ padding: '10px' }}>Pending</th>
                </tr>
              </thead>
              <tbody>
                {(statsData.districtStats || []).slice((distStatsPage - 1) * 10, distStatsPage * 10).map((row) => (
                  <tr key={row._id} style={{ borderBottom: '1px solid var(--color-linen)', cursor: 'pointer' }}
                    onClick={() => { setDistrictFilter(row._id); setAssemblyFilter(''); setBoothFilter(''); setStatusFilter(''); setSchemeFilter(''); navigateSubPage('applications'); }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-fog-gray)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px', fontWeight: '600', color: 'var(--color-midnight-ink)' }}>{row._id}</td>
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
          {renderPagination(distStatsPage, statsData.districtStats?.length || 0, 10, setDistStatsPage)}
        </div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* PAGE 4: ASSEMBLY STATS                   */}
      {/* ══════════════════════════════════════════ */}
      {subPage === 'assemblies' && statsData && (
        <div className="campsite-card" style={{ width: '100%', padding: '24px', boxSizing: 'border-box' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-midnight-ink)', marginBottom: '16px' }}>
            Assembly Constituency-wise Stats
          </h3>
          <div className="st-table-wrap" style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-linen)', color: 'var(--color-slate)', textAlign: 'left', background: 'var(--color-fog-gray)' }}>
                  <th style={{ padding: '10px' }}>Assembly Constituency</th>
                  <th style={{ padding: '10px' }}>District</th>
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
                    onClick={() => { setDistrictFilter(row._id.district); setAssemblyFilter(row._id.assemblyName); setBoothFilter(''); setStatusFilter(''); setSchemeFilter(''); navigateSubPage('applications'); }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-fog-gray)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px', fontWeight: '600', color: 'var(--color-midnight-ink)' }}>{row._id.assemblyName}</td>
                    <td style={{ padding: '10px', color: 'var(--color-slate)' }}>{row._id.district}</td>
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

      {/* ══════════════════════════════════════════ */}
      {/* PAGE 5: BOOTH STATS                       */}
      {/* ══════════════════════════════════════════ */}
      {subPage === 'booths' && statsData && (
        <div className="campsite-card" style={{ width: '100%', padding: '24px', boxSizing: 'border-box' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-midnight-ink)', marginBottom: '16px' }}>
            Polling Booth-wise Breakdown Stats
          </h3>
          <div className="st-table-wrap" style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-linen)', color: 'var(--color-slate)', textAlign: 'left', background: 'var(--color-fog-gray)' }}>
                  <th style={{ padding: '10px' }}>Booth / Part No</th>
                  <th style={{ padding: '10px' }}>Assembly</th>
                  <th style={{ padding: '10px' }}>District</th>
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
                    onClick={() => { setDistrictFilter(row._id.district); setAssemblyFilter(row._id.assemblyName); setBoothFilter(String(row._id.boothNo)); setStatusFilter(''); setSchemeFilter(''); navigateSubPage('applications'); }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-fog-gray)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px', fontWeight: '600', color: 'var(--color-midnight-ink)' }}>Booth {row._id.boothNo}</td>
                    <td style={{ padding: '10px' }}>{row._id.assemblyName}</td>
                    <td style={{ padding: '10px', color: 'var(--color-slate)' }}>{row._id.district}</td>
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

      {/* ══════════════════════════════════════════ */}
      {/* PAGE 6: REPORTS & EXCEL EXPORT             */}
      {/* ══════════════════════════════════════════ */}
      {subPage === 'reports' && (
        <ReportsView
          initialDistrict={districtFilter}
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

export default StateAdminDashboard;
