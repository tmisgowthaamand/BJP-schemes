import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import MemberProfileTimelineView, { formatSchemeName } from '../../components/MemberProfileTimelineView';
import ReportsView from '../../components/ReportsView';
import LiveTrackingPanel from '../../components/LiveTrackingPanel';
import { BJP_SCHEMES } from '../../utils/constants';
import {
  Shield, Users, Building, PhoneCall, RefreshCw, Search, Eye, Award, Share2, ChevronRight, FileText,
  LayoutDashboard, BarChart3
} from 'lucide-react';
import TopReferrersCard from '../../components/TopReferrersCard';

const LIMIT = 20;

const BoothAdminDashboard = () => {
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
  const [selectedVoterTimeline, setSelectedVoterTimeline] = useState(null);

  // ── All Voters Data (New Page) ──
  const [allVoters, setAllVoters] = useState([]);
  const [loadingAllVoters, setLoadingAllVoters] = useState(false);
  const [allVotersStats, setAllVotersStats] = useState({ total: 0, delivered: 0, submitted: 0, notApplied: 0 });
  const [voterStatusFilter, setVoterStatusFilter] = useState(''); // 'delivered', 'submitted', 'notapplied', or ''
  const [voterSearchQuery, setVoterSearchQuery] = useState('');
  const [allVotersPage, setAllVotersPage] = useState(1);
  const [allVotersTotalPages, setAllVotersTotalPages] = useState(1);
  const VOTERS_LIMIT = 50;

  const navigateSubPage = (pageKey) => {
    setSubPage(pageKey);
    setSelectedVoterTimeline(null);
    try { window.history.pushState({}, '', `/admin/booth/${pageKey}`); } catch (e) {}
  };

  // ── Fetch stats (unfiltered for Booth Overview) ──
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

  // ── Fetch paginated voters ──
  const fetchVoters = async (page = 1) => {
    try {
      setLoadingVoters(true);
      const params = new URLSearchParams({
        page, limit: LIMIT,
        ...(searchQuery  && { search: searchQuery }),
        ...(statusFilter && { status: statusFilter }),
        ...(schemeFilter && { schemeName: schemeFilter })
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

  const fetchDashboardData = () => { fetchStats(); fetchVoters(1); };

  // ── Fetch All Voters with Application Status ──
  const fetchAllVoters = async (page = 1) => {
    try {
      setLoadingAllVoters(true);
      const params = new URLSearchParams({
        page,
        limit: VOTERS_LIMIT,
        ...(voterSearchQuery && { search: voterSearchQuery }),
        ...(voterStatusFilter && { statusFilter: voterStatusFilter })
      });
      console.log('[fetchAllVoters] Requesting:', `/admin/booth-all-voters?${params.toString()}`);
      const res = await API.get(`/admin/booth-all-voters?${params}`);
      console.log('[fetchAllVoters] Response:', res.data);
      
      if (res.data.success) {
        setAllVoters(res.data.voters || []);
        setAllVotersStats(res.data.stats || { total: 0, delivered: 0, submitted: 0, notApplied: 0 });
        setAllVotersTotalPages(res.data.totalPages || 1);
        setAllVotersPage(res.data.currentPage || 1);
        console.log('[fetchAllVoters] Set voters:', res.data.voters?.length || 0, 'voters');
      } else {
        console.error('[fetchAllVoters] API returned success:false', res.data);
        alert(`Error: ${res.data.message || 'Failed to load voters'}`);
      }
    } catch (err) {
      console.error('Error loading all voters:', err);
      console.error('Error response:', err.response?.data);
      if (err.response?.data?.message) {
        alert(`Error loading voters: ${err.response.data.message}\n\nDebug: ${JSON.stringify(err.response.data.debugInfo || {})}`);
      }
    } finally {
      setLoadingAllVoters(false);
    }
  };

  // Fetch all voters when navigating to that page
  useEffect(() => {
    if (subPage === 'allvoters') {
      fetchAllVoters(1);
    }
  }, [subPage]);

  // Re-fetch when filters change
  useEffect(() => {
    if (subPage === 'allvoters') {
      fetchAllVoters(1);
    }
  }, [voterStatusFilter, voterSearchQuery]);

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchVoters(1); setCurrentPage(1); }, [searchQuery, statusFilter, schemeFilter]);

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
    } catch (err) { console.error('Error updating status:', err); }
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

  const handleOpenVoterDetails = (voter) => {
    setSubPage('applications');
    setSelectedVoterTimeline(voter);
  };

  // ── Helper function to get status and colors for All Voters table ──
  const getVoterStatusAndColor = (voter) => {
    // No application → White badge with dark text
    if (!voter.applications || voter.applications.length === 0) {
      return {
        status: 'Not Applied',
        statusText: '○ Not Applied',
        backgroundColor: '#FFFFFF',
        borderColor: '#6B7280',
        textColor: '#6B7280', // Dark gray text for white badge
        icon: '○'
      };
    }

    // Check latest application
    const latestApp = voter.applications[voter.applications.length - 1];

    // Delivered/Approved → Green
    if (latestApp.status === 'Approved' || latestApp.status === 'Completed') {
      return {
        status: 'Delivered',
        statusText: '✓ Delivered',
        backgroundColor: '#F0FDF4',
        borderColor: '#10B981',
        textColor: '#10B981',
        icon: '✓'
      };
    }

    // Any other status → Saffron (Submitted)
    return {
      status: 'Submitted',
      statusText: '⏳ Submitted',
      backgroundColor: '#FFF7ED',
      borderColor: '#F97316',
      textColor: '#F97316',
      icon: '⏳'
    };
  };

  // Page range for pagination pills
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

  return (
    <div
      className="theme-boothadmin"
      style={{
        display: 'flex',
        gap: '24px',
        width: '100%',
        boxSizing: 'border-box',
        minHeight: 'calc(100vh - 130px)',
        alignItems: 'flex-start'
      }}
    >
      <style>{`
        .boothadmin-scroll { scrollbar-width: thin; scrollbar-color: #3b2e5a #0d0a17; scroll-behavior: smooth; }
        .boothadmin-scroll::-webkit-scrollbar { width: 8px; }
        .boothadmin-scroll::-webkit-scrollbar-track { background: #0d0a17; border-radius: 8px; }
        .boothadmin-scroll::-webkit-scrollbar-thumb { background: #3b2e5a; border-radius: 8px; border: 2px solid #0d0a17; }
        .boothadmin-scroll::-webkit-scrollbar-thumb:hover { background: #8b5cf6; }
      `}</style>

      {/* ══════════════════════════════════════════ */}
      {/* LEFT SIDEBAR NAVIGATION MENU               */}
      {/* ══════════════════════════════════════════ */}
      <aside
        style={{
          width: '270px',
          minWidth: '270px',
          background: 'var(--theme-bg-card)',
          border: '1px solid var(--theme-border)',
          borderRadius: '16px',
          padding: '20px 14px',
          boxSizing: 'border-box',
          position: 'sticky',
          top: '10px',
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
              <Shield size={12} /> BOOTH ADMIN
            </span>
          </div>
          <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--theme-text-main)' }}>
            Booth {admin.boothNo} Portal
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--theme-text-muted)', marginTop: '2px' }}>
            {admin.assemblyName} Constituency
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
            <span>Booth Applications</span>
            <span style={{ fontSize: '10.5px', opacity: 0.8 }}>
              {totalVoters ? `${totalVoters.toLocaleString()} Members` : 'Live DB'}
            </span>
          </div>
        </button>

        <button
          onClick={() => navigateSubPage('allvoters')}
          className={`sidebar-nav-btn ${subPage === 'allvoters' ? 'active' : ''}`}
        >
          <Users size={18} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
            <span>All Voters Data</span>
            <span style={{ fontSize: '10.5px', opacity: 0.8 }}>
              Status Tracking
            </span>
          </div>
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
      <main className="boothadmin-scroll" style={{ flex: 1, minWidth: 0, paddingRight: '6px', height: 'calc(100vh - 130px)', overflowY: 'auto' }}>

      {/* ══════════════════════════════════════════ */}
      {/* PAGE 1: OVERVIEW DASHBOARD                */}
      {/* ══════════════════════════════════════════ */}
      {subPage === 'dashboard' && (
        loadingStats ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', border: '4px solid var(--color-linen)', borderTopColor: 'var(--color-saffron)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ fontSize: '14px', color: 'var(--color-slate)', fontWeight: '500' }}>Loading stats for Booth {admin.boothNo}...</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : statsData ? (
          <div style={{ width: '100%', boxSizing: 'border-box' }}>
            <LiveTrackingPanel />
            {/* ── 4 Stat Cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px', width: '100%' }}>

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
                  <div className="stat-label">Total Voters in Booth {admin.boothNo}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-slate)', marginTop: '2px' }}>Electoral Roll (Voter DB)</div>
                </div>
              </div>

              {/* Card 2: Voters Requested Schemes (Write DB) */}
              <div className="stat-card">
                <div className="stat-icon">
                  <Users size={20} />
                </div>
                <div>
                  <div className="stat-number">{statsData.overview.totalVotersRequested ?? statsData.overview.totalUsers ?? 0}</div>
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
                  <div className="stat-label">Booth {admin.boothNo} Applications</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-saffron)', fontWeight: '600', marginTop: '2px' }}>Click to View Applications →</div>
                </div>
              </div>

              {/* Card 4: Approved */}
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
                  <div className="stat-label">Approved Directives</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-forest-pulse)', fontWeight: '600', marginTop: '2px' }}>Click to View Approved →</div>
                </div>
              </div>
            </div>

            {/* ── Top 5 Referral Champions Section ── */}
            <TopReferrersCard
              topReferrers={statsData.topReferrers || []}
              scopeLabel={`Booth ${admin.boothNo}`}
              onViewProfile={(ref) => handleOpenVoterDetails(ref)}
            />

            {/* ── Top Schemes ── */}
            <div className="campsite-card" style={{ width: '100%', padding: '24px', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-midnight-ink)', margin: 0 }}>
                  Top Applied BJP Schemes in Booth {admin.boothNo}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--color-slate)' }}>Click any scheme to filter applications</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', width: '100%' }}>
                {statsData.schemePopularity?.map((item) => (
                  <div
                    key={item._id}
                    onClick={() => {
                      setSchemeFilter(item._id);
                      setStatusFilter('');
                      navigateSubPage('applications');
                    }}
                    style={{
                      padding: '14px', background: '#1b162b', borderRadius: '10px',
                      border: '1px solid var(--color-linen)', cursor: 'pointer',
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-midnight-ink)' }}>{formatSchemeName(item._id)}</div>
                      <span style={{ fontSize: '11px', color: 'var(--color-saffron)', fontWeight: '600' }}>View →</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-slate)', marginTop: '2px' }}>{item.cluster}</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-midnight-ink)', marginTop: '8px' }}>
                      {item.count} <span style={{ fontSize: '12px', color: 'var(--color-slate)', fontWeight: 'normal' }}>applications</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

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
          <MemberProfileTimelineView
            voterData={selectedVoterTimeline}
            onBack={() => setSelectedVoterTimeline(null)}
            onUpdateAppStatus={handleUpdateAppStatus}
            onSelectVoter={(voter) => setSelectedVoterTimeline(voter)}
            targetSchemeName={schemeFilter}
          />
        ) : (
          <div className="campsite-card" style={{ width: '100%', padding: '24px', boxSizing: 'border-box' }}>

            {/* ── Filter Row 1: Search + Summary ── */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '10px', width: '100%', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                <input
                  type="text"
                  placeholder={`Search in Booth ${admin.boothNo} voters...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-control"
                  style={{ 
                    paddingLeft: '38px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#F3F4F6',
                    '::placeholder': { color: '#9CA3AF' }
                  }}
                />
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-slate)', whiteSpace: 'nowrap' }}>
                {loadingVoters
                  ? <span style={{ opacity: 0.6 }}>Loading…</span>
                  : <><strong style={{ color: 'var(--color-midnight-ink)' }}>{totalVoters.toLocaleString()}</strong> voters · Page {currentPage} of {totalPages}</>
                }
              </div>
            </div>

            {/* ── Filter Row 2: Status + Scheme + Clear ── */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px', width: '100%', alignItems: 'center' }}>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)} 
                className="form-control" 
                style={{ 
                  minWidth: '150px', 
                  flex: '1 1 150px', 
                  maxWidth: '180px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#F3F4F6'
                }}
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
                style={{ 
                  flex: '1 1 160px', 
                  minWidth: '150px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#F3F4F6'
                }}
              >
                <option value="">All 23 Central BJP Schemes</option>
                {BJP_SCHEMES.map(s => (
                  <option key={s.id} value={s.name}>
                    {s.name} ({s.fullTitle || s.fullName})
                  </option>
                ))}
              </select>

              {(statusFilter || schemeFilter || searchQuery) && (
                <button
                  onClick={() => { setSearchQuery(''); setStatusFilter(''); setSchemeFilter(''); }}
                  style={{ background: 'none', border: '1px solid var(--color-linen)', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', color: 'var(--color-slate)', cursor: 'pointer' }}
                >
                  Clear All
                </button>
              )}
            </div>

            {/* ── Table ── */}
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-linen)', color: 'var(--color-slate)', textAlign: 'left', background: 'var(--color-fog-gray)' }}>
                    <th style={{ padding: '12px 10px' }}>#</th>
                    <th style={{ padding: '12px 10px' }}>Member &amp; EPIC</th>
                    <th style={{ padding: '12px 10px' }}>Mobile</th>
                    <th style={{ padding: '12px 10px' }}>Schemes Applied</th>
                    <th style={{ padding: '12px 10px' }}>Latest Status</th>
                    <th style={{ padding: '12px 10px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingVoters ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--color-linen)' }}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} style={{ padding: '14px 10px' }}>
                            <div style={{ height: '14px', borderRadius: '6px', background: 'var(--color-linen)', animation: 'pulse 1.4s ease-in-out infinite', width: j === 0 ? '24px' : j === 1 ? '80%' : '60%' }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : voters.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-slate)' }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
                        No applications found for Booth {admin.boothNo}.
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
      {/* PAGE 3: ALL VOTERS DATA                    */}
      {/* ══════════════════════════════════════════ */}
      {subPage === 'allvoters' && (
        <div style={{ width: '100%', boxSizing: 'border-box' }}>
          
          {/* Header */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-midnight-ink)', margin: '0 0 8px 0' }}>
              All Voters in Booth {admin.boothNo}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--color-slate)', margin: 0 }}>
              {admin.assemblyName} Constituency - Complete voter list with application status
            </p>
          </div>

          {/* Stats Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px', width: '100%' }}>
            
            {/* Total Voters */}
            <div className="stat-card" style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              border: '1px solid rgba(139, 92, 246, 0.3)'
            }}>
              <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#A78BFA' }}>
                <Users size={20} />
              </div>
              <div>
                <div className="stat-number" style={{ color: '#E5E7EB' }}>{allVotersStats.total}</div>
                <div className="stat-label" style={{ color: '#D1D5DB' }}>Total Voters</div>
                <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>Electoral Roll</div>
              </div>
            </div>

            {/* Delivered - GREEN */}
            <div className="stat-card" style={{ 
              borderLeft: '4px solid #10B981',
              background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
              border: '1px solid #10B981',
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)'
            }}
            onClick={() => setVoterStatusFilter(voterStatusFilter === 'delivered' ? '' : 'delivered')}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 30px rgba(16, 185, 129, 0.4)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.2)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            >
              <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10B981' }}>
                <Award size={20} />
              </div>
              <div>
                <div className="stat-number" style={{ color: '#10B981', fontSize: '32px' }}>{allVotersStats.delivered}</div>
                <div className="stat-label" style={{ color: '#D1FAE5' }}>🟢 Delivered</div>
                <div style={{ fontSize: '11px', color: '#6EE7B7', marginTop: '2px', fontWeight: '600' }}>Click to filter</div>
              </div>
            </div>

            {/* Submitted - SAFFRON */}
            <div className="stat-card" style={{ 
              borderLeft: '4px solid #F97316',
              background: 'linear-gradient(135deg, #7c2d12 0%, #9a3412 100%)',
              border: '1px solid #F97316',
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(249, 115, 22, 0.2)'
            }}
            onClick={() => setVoterStatusFilter(voterStatusFilter === 'submitted' ? '' : 'submitted')}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 30px rgba(249, 115, 22, 0.4)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 0 20px rgba(249, 115, 22, 0.2)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            >
              <div className="stat-icon" style={{ background: 'rgba(249, 115, 22, 0.2)', color: '#F97316' }}>
                <FileText size={20} />
              </div>
              <div>
                <div className="stat-number" style={{ color: '#F97316', fontSize: '32px' }}>{allVotersStats.submitted}</div>
                <div className="stat-label" style={{ color: '#FFEDD5' }}>🟠 Submitted</div>
                <div style={{ fontSize: '11px', color: '#FDBA74', marginTop: '2px', fontWeight: '600' }}>Click to filter</div>
              </div>
            </div>

            {/* Not Applied - WHITE */}
            <div className="stat-card" style={{ 
              borderLeft: '4px solid #E5E7EB',
              background: 'linear-gradient(135deg, #374151 0%, #4B5563 100%)',
              border: '1px solid #6B7280',
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(107, 114, 128, 0.2)'
            }}
            onClick={() => setVoterStatusFilter(voterStatusFilter === 'notapplied' ? '' : 'notapplied')}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 30px rgba(107, 114, 128, 0.4)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 0 20px rgba(107, 114, 128, 0.2)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            >
              <div className="stat-icon" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#F3F4F6' }}>
                <Users size={20} />
              </div>
              <div>
                <div className="stat-number" style={{ color: '#F3F4F6', fontSize: '32px' }}>{allVotersStats.notApplied}</div>
                <div className="stat-label" style={{ color: '#E5E7EB' }}>⚪ Not Applied</div>
                <div style={{ fontSize: '11px', color: '#D1D5DB', marginTop: '2px', fontWeight: '600' }}>Click to filter</div>
              </div>
            </div>

          </div>

          {/* Filters & Search */}
          <div className="campsite-card" style={{ width: '100%', padding: '20px', marginBottom: '20px', boxSizing: 'border-box' }}>
            
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
              
              {/* Search Box */}
              <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                <input
                  type="text"
                  placeholder="Search by EPIC No or Voter Name..."
                  value={voterSearchQuery}
                  onChange={(e) => setVoterSearchQuery(e.target.value)}
                  className="form-control"
                  style={{ 
                    paddingLeft: '38px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#F3F4F6'
                  }}
                />
              </div>

              {/* Filter Buttons */}
              <button
                onClick={() => setVoterStatusFilter('')}
                className={`btn ${voterStatusFilter === '' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                All ({allVotersStats.total})
              </button>

              <button
                onClick={() => setVoterStatusFilter('delivered')}
                className={`btn ${voterStatusFilter === 'delivered' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ 
                  padding: '8px 16px', 
                  fontSize: '13px',
                  borderColor: '#10B981',
                  ...(voterStatusFilter === 'delivered' && { background: '#10B981', color: 'white' })
                }}
              >
                🟢 Delivered ({allVotersStats.delivered})
              </button>

              <button
                onClick={() => setVoterStatusFilter('submitted')}
                className={`btn ${voterStatusFilter === 'submitted' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ 
                  padding: '8px 16px', 
                  fontSize: '13px',
                  borderColor: '#F97316',
                  ...(voterStatusFilter === 'submitted' && { background: '#F97316', color: 'white' })
                }}
              >
                🟠 Submitted ({allVotersStats.submitted})
              </button>

              <button
                onClick={() => setVoterStatusFilter('notapplied')}
                className={`btn ${voterStatusFilter === 'notapplied' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                ⚪ Not Applied ({allVotersStats.notApplied})
              </button>

              {(voterStatusFilter || voterSearchQuery) && (
                <button
                  onClick={() => { setVoterStatusFilter(''); setVoterSearchQuery(''); }}
                  className="btn btn-ghost"
                  style={{ padding: '8px 16px', fontSize: '13px', borderColor: '#EF4444', color: '#EF4444' }}
                >
                  Clear All
                </button>
              )}

            </div>
          </div>

          {/* Voters Table */}
          <div className="campsite-card" style={{ width: '100%', padding: '0', boxSizing: 'border-box', overflow: 'hidden' }}>
            
            {loadingAllVoters ? (
              <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                <div style={{ width: '40px', height: '40px', border: '4px solid var(--color-linen)', borderTopColor: 'var(--color-saffron)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
                <div style={{ fontSize: '14px', color: 'var(--color-slate)', fontWeight: '500' }}>Loading voters...</div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : allVoters.length === 0 ? (
              <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-midnight-ink)', marginBottom: '8px' }}>No voters found</div>
                <div style={{ fontSize: '14px', color: 'var(--color-slate)' }}>
                  {voterSearchQuery || voterStatusFilter ? 'Try adjusting your search or filters' : 'No voter data available for this booth'}
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ 
                      background: '#0d0a17', 
                      borderBottom: '2px solid rgba(139, 92, 246, 0.3)' 
                    }}>
                      <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: '700', color: '#8B5CF6', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>#</th>
                      <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: '700', color: '#8B5CF6', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>EPIC No</th>
                      <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: '700', color: '#8B5CF6', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Voter Name</th>
                      <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: '700', color: '#8B5CF6', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Age / Gender</th>
                      <th style={{ padding: '14px 12px', textAlign: 'center', fontWeight: '700', color: '#8B5CF6', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allVoters.map((voter, idx) => {
                      const { status, statusText, backgroundColor, borderColor, textColor, icon } = getVoterStatusAndColor(voter);
                      const rowNum = (allVotersPage - 1) * VOTERS_LIMIT + idx + 1;

                      // Dark theme row background based on status
                      let darkRowBg = '#1a1625'; // default dark purple
                      if (status === 'Delivered') {
                        darkRowBg = '#0f2419'; // dark green tint
                      } else if (status === 'Submitted') {
                        darkRowBg = '#2d1810'; // dark orange tint
                      }

                      return (
                        <tr
                          key={voter.epicNo || idx}
                          style={{
                            backgroundColor: darkRowBg,
                            borderLeft: `4px solid ${borderColor}`,
                            borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#251f3a';
                            e.currentTarget.style.transform = 'translateX(4px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = darkRowBg;
                            e.currentTarget.style.transform = 'translateX(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                          onClick={() => {
                            // Click anywhere on row to view details (if has applications)
                            if (status !== 'Not Applied') {
                              const voterWithApps = {
                                ...voter,
                                _id: voter.epicNo,
                                applications: voter.applications || []
                              };
                              setSelectedVoterTimeline(voterWithApps);
                              setSubPage('applications');
                            }
                          }}
                        >
                          <td style={{ padding: '14px 12px', fontWeight: '600', color: '#9CA3AF', fontSize: '12px' }}>
                            {rowNum}
                          </td>

                          <td style={{ padding: '14px 12px', fontFamily: 'monospace', fontWeight: '700', fontSize: '13px', color: '#E5E7EB' }}>
                            {voter.epicNo}
                          </td>

                          <td style={{ padding: '14px 12px', fontWeight: '700', fontSize: '14px', color: '#F3F4F6' }}>
                            {voter.voterName}
                          </td>

                          <td style={{ padding: '14px 12px', color: '#9CA3AF', fontSize: '13px' }}>
                            {voter.age || '—'} / {voter.gender || '—'}
                          </td>

                          <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 14px',
                              borderRadius: '20px',
                              fontSize: '13px',
                              fontWeight: '700',
                              backgroundColor: textColor,
                              color: '#FFFFFF',
                              border: `2px solid ${borderColor}`,
                              boxShadow: `0 0 10px ${borderColor}40`
                            }}>
                              {icon} {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {!loadingAllVoters && allVoters.length > 0 && allVotersTotalPages > 1 && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                padding: '16px 20px',
                borderTop: '1px solid var(--color-linen)',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ fontSize: '13px', color: 'var(--color-slate)' }}>
                  Showing <strong>{(allVotersPage - 1) * VOTERS_LIMIT + 1}</strong> – <strong>{Math.min(allVotersPage * VOTERS_LIMIT, allVotersStats.total)}</strong> of <strong>{allVotersStats.total}</strong> voters
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => fetchAllVoters(allVotersPage - 1)}
                    disabled={allVotersPage === 1}
                    className="btn btn-ghost"
                    style={{ padding: '6px 12px', fontSize: '12px', opacity: allVotersPage === 1 ? 0.4 : 1 }}
                  >
                    ← Prev
                  </button>

                  <span style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', color: 'var(--color-midnight-ink)' }}>
                    Page {allVotersPage} of {allVotersTotalPages}
                  </span>

                  <button
                    onClick={() => fetchAllVoters(allVotersPage + 1)}
                    disabled={allVotersPage === allVotersTotalPages}
                    className="btn btn-ghost"
                    style={{ padding: '6px 12px', fontSize: '12px', opacity: allVotersPage === allVotersTotalPages ? 0.4 : 1 }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {subPage === 'reports' && (
        <ReportsView
          initialDistrict={admin?.district}
          initialAssembly={admin?.assemblyName}
          initialBooth={String(admin?.boothNo || '')}
          initialStatus={statusFilter}
          initialScheme={schemeFilter}
        />
      )}

      </main>
    </div>
  );
};

export default BoothAdminDashboard;
