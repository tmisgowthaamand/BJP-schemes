import AdminMobileNav from '../../components/AdminMobileNav';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import LiveTrackingPanel from '../../components/LiveTrackingPanel';
import VoterSchemesView from '../../components/VoterSchemesView';
import MemberProfileTimelineView, { formatSchemeName, getSchemeBgImage } from '../../components/MemberProfileTimelineView';
import ReportsView from '../../components/ReportsView';
import { BJP_SCHEMES } from '../../utils/constants';
import {
  Shield, Users, Building, PhoneCall, RefreshCw, PlusCircle, Search, LogIn, Eye, Award, Share2, ChevronRight, FileText,
  LayoutDashboard, Key, MapPin, CheckSquare, BarChart3
} from 'lucide-react';
import TopReferrersCard from '../../components/TopReferrersCard';

// ── Booth President Admin Panel ──────────────────────────────────────────────
const BoothPresidentAdminPanel = () => {
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({ total:0, pending:0, approved:0, declined:0 })
  const [statusTab, setStatusTab] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const [distFilter, setDistFilter] = useState('')
  const [assFilter, setAssFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [flash, setFlash] = useState({ msg:'', type:'success' })
  const [allDistricts, setAllDistricts] = useState([])
  const [allAssemblies, setAllAssemblies] = useState([])
  const [filteredAss, setFilteredAss] = useState([])

  useEffect(() => {
    API.get('/admin/jurisdiction-assemblies').then(res => {
      if (!res.data.success) return
      const list = res.data.assemblies || []
      const seen = new Set()
      const dists = list.map(a => (a.district||'').toUpperCase().trim()).filter(d => d && !seen.has(d) && seen.add(d)).sort((a,b)=>a.localeCompare(b))
      setAllDistricts(dists)
      setAllAssemblies([...list].sort((a,b)=>parseInt(a.assemblyNo||0)-parseInt(b.assemblyNo||0)))
    }).catch(()=>{})
  }, [])

  useEffect(() => {
    setAssFilter('')
    if (!distFilter) { setFilteredAss([]); return }
    setFilteredAss(allAssemblies.filter(a=>(a.district||'').toUpperCase().trim()===distFilter))
  }, [distFilter, allAssemblies])

  const loadApps = useCallback(async (p=1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page:p, limit:20 })
      if (statusTab) params.set('status', statusTab)
      if (searchQ)   params.set('search', searchQ.trim())
      if (distFilter) params.set('district', distFilter.trim())
      if (assFilter)  params.set('assembly', assFilter.trim())
      const res = await API.get(`/booth-president/admin/applications?${params}`)
      if (res.data.success) {
        setApps(res.data.applications||[])
        setSummary({ total:res.data.total||0, pending:res.data.pending||0, approved:res.data.approved||0, declined:res.data.declined||0 })
        setTotalPages(res.data.totalPages||1)
        setPage(p)
      }
    } catch(e){ console.error(e) } finally { setLoading(false) }
  }, [statusTab, searchQ, distFilter, assFilter])

  useEffect(() => { loadApps(1) }, [loadApps])

  const doAction = async (id, status) => {
    try {
      await API.put(`/booth-president/admin/applications/${id}`, { status })
      setFlash({ msg:`Application ${status} successfully.`, type:'success' })
      setTimeout(()=>setFlash({msg:'',type:'success'}),3500)
      loadApps(page)
    } catch(e) {
      setFlash({ msg:e.response?.data?.message||'Action failed.', type:'error' })
      setTimeout(()=>setFlash({msg:'',type:'success'}),3500)
    }
  }

  const BADGE = { Pending:{bg:'#FAEEDA',fg:'#854F0B'}, Approved:{bg:'#EAF3DE',fg:'#3B6D11'}, Declined:{bg:'#FCEBEB',fg:'#A32D2D'} }
  const hasFilter = !!(statusTab||searchQ||distFilter||assFilter)

  return (
    <div className="campsite-card bpa-panel" style={{ width:'100%', padding:'20px', boxSizing:'border-box' }}>
      <style>{`
        .bpa-stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
        .bpa-tabs{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
        .bpa-filter-row{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-bottom:16px}
        .bpa-table-wrap{width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:10px;border:1px solid var(--color-linen)}
        .bpa-table-wrap table{min-width:680px;width:100%;border-collapse:collapse;font-size:13px}
        .bpa-approve{background:#10b981;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;min-height:30px}
        .bpa-reject{background:#ef4444;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;min-height:30px}
        .bpa-pagination{display:flex;align-items:center;justify-content:space-between;margin-top:16px;padding-top:14px;border-top:1px solid var(--color-linen);flex-wrap:wrap;gap:10px}
        @media(max-width:1023px){.bpa-stat-grid{grid-template-columns:repeat(2,1fr)!important;gap:10px!important}}
        @media(max-width:600px){
          .bpa-stat-grid{grid-template-columns:repeat(2,1fr)!important;gap:8px!important}
          .bpa-filter-row{flex-direction:column!important}
          .bpa-filter-row>*{width:100%!important;min-width:unset!important}
          .bpa-tabs{overflow-x:auto;flex-wrap:nowrap;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding-bottom:4px}
          .bpa-tabs::-webkit-scrollbar{display:none}
          .bpa-tabs .btn{flex-shrink:0}
        }
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px', flexWrap:'wrap', gap:'10px' }}>
        <div>
          <h3 style={{ margin:0, fontSize:'18px', fontWeight:700, color:'var(--color-midnight-ink)', display:'flex', alignItems:'center', gap:'8px' }}>
            <Award size={20} color="var(--theme-accent)" /> Booth President Requests
          </h3>
          <p style={{ margin:'4px 0 0', fontSize:'13px', color:'var(--color-slate)' }}>
            Review and manage Booth President requests across Tamil Nadu
          </p>
        </div>
        <button onClick={()=>loadApps(page)} className="btn btn-ghost" style={{ fontSize:'13px', gap:'6px' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="bpa-stat-grid">
        {[
          {label:'Total Requests', val:summary.total,    color:'var(--color-midnight-ink)', icon:<FileText size={20}/>},
          {label:'Pending Approval',val:summary.pending, color:'#f59e0b',  icon:<Eye size={20}/>},
          {label:'Approved',       val:summary.approved, color:'#10b981',  icon:<Award size={20}/>},
          {label:'Declined',       val:summary.declined, color:'#ef4444',  icon:<Shield size={20}/>},
        ].map(s=>(
          <div key={s.label} className="stat-card" style={{ padding:'14px 16px', cursor:'default' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <div className="stat-icon" style={{ color:s.color, background:`${s.color}18`, border:`1px solid ${s.color}33` }}>{s.icon}</div>
              <div>
                <div className="stat-number" style={{ color:s.color, fontSize:'22px', lineHeight:1 }}>{s.val}</div>
                <div className="stat-label" style={{ marginTop:'4px' }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Status tabs + Search */}
      <div className="bpa-tabs">
        {[['','All Requests'],['Pending','Pending'],['Approved','Approved'],['Declined','Declined']].map(([v,l])=>(
          <button key={v} onClick={()=>{setStatusTab(v);setPage(1)}}
            className={`btn ${statusTab===v?'btn-primary':'btn-ghost'}`}
            style={{ padding:'5px 14px', fontSize:'13px', minHeight:'36px', borderRadius:'20px', fontWeight:statusTab===v?700:500, flexShrink:0 }}>
            {l}
          </button>
        ))}
        <div style={{ flex:'1 1 200px', position:'relative', minWidth:'180px' }}>
          <Search size={14} style={{ position:'absolute', left:'11px', top:'50%', transform:'translateY(-50%)', color:'var(--color-slate)', pointerEvents:'none' }}/>
          <input type="text" value={searchQ} onChange={e=>{setSearchQ(e.target.value);setPage(1)}}
            placeholder="Search Name, EPIC, Mobile, Booth..."
            className="form-control" style={{ paddingLeft:'34px', fontSize:'16px', height:'36px' }}/>
        </div>
      </div>

      {/* District + Assembly filters */}
      <div className="bpa-filter-row">
        <div style={{ flex:'1 1 220px', minWidth:'200px' }}>
          <label style={{ display:'block', fontSize:'11px', fontWeight:700, color:'var(--color-slate)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:'4px' }}>Filter by District</label>
          <select value={distFilter} onChange={e=>{setDistFilter(e.target.value);setPage(1)}} className="form-control" style={{ fontSize:'16px', height:'40px' }}>
            <option value="">All Districts</option>
            {allDistricts.map(d=><option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div style={{ flex:'1 1 240px', minWidth:'200px' }}>
          <label style={{ display:'block', fontSize:'11px', fontWeight:700, color:'var(--color-slate)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:'4px' }}>Filter by Assembly</label>
          <select value={assFilter} onChange={e=>{setAssFilter(e.target.value);setPage(1)}} className="form-control" style={{ fontSize:'16px', height:'40px' }}>
            <option value="">All Assemblies</option>
            {(distFilter?filteredAss:allAssemblies).map(a=>(
              <option key={a.assemblyNo} value={a.assemblyName}>{a.assemblyNo} - {a.assemblyName}</option>
            ))}
          </select>
        </div>
        {hasFilter && (
          <div style={{ alignSelf:'flex-end', paddingBottom:'2px' }}>
            <button onClick={()=>{setStatusTab('');setSearchQ('');setDistFilter('');setAssFilter('')}} className="btn btn-ghost"
              style={{ fontSize:'12px', padding:'5px 12px', minHeight:'36px', borderRadius:'20px', whiteSpace:'nowrap' }}>
              Clear All ×
            </button>
          </div>
        )}
      </div>

      {/* Flash */}
      {flash.msg && (
        <div style={{ padding:'10px 16px', borderRadius:'8px', fontSize:'13px', fontWeight:600, marginBottom:'14px',
          background:flash.type==='success'?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)',
          border:`1px solid ${flash.type==='success'?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`,
          color:flash.type==='success'?'#10b981':'#ef4444' }}>
          {flash.type==='success'?'✓ ':'✗ '}{flash.msg}
        </div>
      )}

      {/* Table */}
      <div className="bpa-table-wrap">
        <table>
          <thead>
            <tr style={{ background:'var(--color-fog-gray)', borderBottom:'2px solid var(--color-linen)', textAlign:'left' }}>
              {['APPLICANT','TARGET BOOTH & LOCATION','ORIGINAL BOOTH','APPLIED DATE','STATUS','ACTIONS'].map((h,i)=>(
                <th key={h} style={{ padding:'10px 12px', fontSize:'11px', color:'var(--color-slate)', textTransform:'uppercase', letterSpacing:'.04em', textAlign:i===5?'right':'left', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({length:5}).map((_,i)=>(
                <tr key={i} style={{ borderBottom:'1px solid var(--color-linen)' }}>
                  {[70,55,45,40,30,80].map((w,j)=>(
                    <td key={j} style={{ padding:'14px 12px' }}>
                      <div style={{ height:'13px', borderRadius:'4px', background:'var(--color-linen)', width:`${w}%` }}/>
                    </td>
                  ))}
                </tr>
              ))
            ) : apps.length===0 ? (
              <tr><td colSpan={6} style={{ padding:'40px 20px', textAlign:'center', color:'var(--color-slate)' }}>
                <div style={{ fontSize:'28px', marginBottom:'8px' }}>🏛</div>
                <div style={{ fontWeight:600, marginBottom:'4px' }}>No requests found</div>
                <div style={{ fontSize:'12px' }}>{hasFilter?'Try adjusting filters.':'Booth President requests appear here.'}</div>
              </td></tr>
            ) : apps.map(app=>{
              const badge=BADGE[app.status]||BADGE.Pending
              const dt=new Date(app.appliedAt).toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true})
              return (
                <tr key={app._id} style={{ borderBottom:'1px solid var(--color-linen)', transition:'background .15s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--color-fog-gray)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'12px' }}>
                    <div style={{ fontWeight:700, color:'var(--color-midnight-ink)', fontSize:'14px' }}>{app.voterName} -</div>
                    <div style={{ fontSize:'11px', color:'var(--color-slate)', fontFamily:'monospace', marginTop:'3px', display:'flex', gap:'8px' }}>
                      <span>{app.epicNo}</span><span>{app.mobile}</span>
                    </div>
                  </td>
                  <td style={{ padding:'12px' }}>
                    <div style={{ fontWeight:700, color:'#f97316', fontSize:'13px' }}>Booth {app.targetBoothNo}</div>
                    <div style={{ fontSize:'11px', color:'var(--color-slate)', marginTop:'2px' }}>{app.targetAssembly}</div>
                    <div style={{ fontSize:'10px', color:'var(--color-ash-gray)' }}>{app.targetDistrict}</div>
                  </td>
                  <td style={{ padding:'12px', fontSize:'12px', color:'var(--color-slate)' }}>
                    <div>Booth {app.originalBoothNo}</div>
                    <div style={{ fontSize:'11px', marginTop:'2px' }}>{app.originalAssembly}</div>
                  </td>
                  <td style={{ padding:'12px', fontSize:'12px', color:'var(--color-slate)', whiteSpace:'nowrap' }}>{dt}</td>
                  <td style={{ padding:'12px' }}>
                    <span style={{ background:badge.bg, color:badge.fg, padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:700, whiteSpace:'nowrap' }}>{app.status}</span>
                  </td>
                  <td style={{ padding:'12px', textAlign:'right' }}>
                    {app.status==='Pending' ? (
                      <div style={{ display:'inline-flex', gap:'6px' }}>
                        <button onClick={()=>doAction(app._id,'Approved')} className="bpa-approve">Approve</button>
                        <button onClick={()=>doAction(app._id,'Declined')} className="bpa-reject">Reject</button>
                      </div>
                    ) : (
                      <span style={{ fontSize:'11px', color:'var(--color-slate)', fontStyle:'italic' }}>{app.reviewedBy||'Reviewed'}</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages>1 && (
        <div className="bpa-pagination">
          <div style={{ fontSize:'13px', color:'var(--color-slate)' }}>Page <strong>{page}</strong> of <strong>{totalPages}</strong></div>
          <div style={{ display:'flex', gap:'6px' }}>
            <button onClick={()=>loadApps(page-1)} disabled={page<=1} className="btn btn-ghost" style={{ padding:'5px 14px', fontSize:'12px', opacity:page<=1?.4:1 }}>← Prev</button>
            <button onClick={()=>loadApps(page+1)} disabled={page>=totalPages} className="btn btn-ghost" style={{ padding:'5px 14px', fontSize:'12px', opacity:page>=totalPages?.4:1 }}>Next →</button>
          </div>
        </div>
      )}
    </div>
  )
}

const LIMIT = 20;

const SuperAdminDashboard = () => {
  const { loginAdmin } = useAuth();
  const [subPage, setSubPage] = useState('dashboard');

  // ── Stats ──
  const [statsData, setStatsData] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // ── Credentials State ──
  const [adminList, setAdminList] = useState([]);
  const [credSubTab, setCredSubTab] = useState('districts');
  const [districtCredentials, setDistrictCredentials] = useState([]);
  const [assemblyCredentials, setAssemblyCredentials] = useState([]);

  // ── Booth Credentials ──
  const [assembliesList, setAssembliesList] = useState([]);
  const [selectedAssemblyNo, setSelectedAssemblyNo] = useState('1');
  const [boothCredentialsData, setBoothCredentialsData] = useState(null);
  const [boothSearchQuery, setBoothSearchQuery] = useState('');
  const [loadingBooths, setLoadingBooths] = useState(false);
  const [distCredSearch, setDistCredSearch] = useState('');
  const [assCredSearch, setAssCredSearch] = useState('');

  // ── Sub-page Pagination States ──
  const [distCredPage, setDistCredPage] = useState(1);
  const [assCredPage, setAssCredPage] = useState(1);
  const [boothCredPage, setBoothCredPage] = useState(1);
  const [distStatsPage, setDistStatsPage] = useState(1);
  const [assStatsPage, setAssStatsPage] = useState(1);
  const [boothStatsPage, setBoothStatsPage] = useState(1);

  // ── Paginated Voters (Applications) ──
  const [voters, setVoters] = useState([]);
  const [loadingVoters, setLoadingVoters] = useState(false);
  const [totalVoters, setTotalVoters] = useState(0);
  const [totalApplications, setTotalApplications] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // ── Filters ──
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [schemeFilter, setSchemeFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [assemblyFilter, setAssemblyFilter] = useState('');
  const [boothFilter, setBoothFilter] = useState('');

  // ── Metadata Dropdown Lists ──
  const [districts, setDistricts] = useState([]);
  const [assemblies, setAssemblies] = useState([]);
  const [booths, setBooths] = useState([]);
  const [loadingFilterAssemblies, setLoadingFilterAssemblies] = useState(false);
  const [loadingFilterBooths, setLoadingFilterBooths] = useState(false);

  const [selectedVoterTimeline, setSelectedVoterTimeline] = useState(null);
  const skipFilterResetRef = useRef(false);

  // ── New Admin Form ──
  const [newAdminForm, setNewAdminForm] = useState({
    username: '', password: '', role: 'DISTRICT_ADMIN',
    district: '', assemblyName: '', boothNo: ''
  });
  const [credSuccessMsg, setCredSuccessMsg] = useState('');
  const [credErrorMsg, setCredErrorMsg] = useState('');

  // ── Live AI Console (backend-only — live MongoDB data, no fabricated fallback) ──
  const [customAiPrompt, setCustomAiPrompt] = useState('');
  const [aiConsoleOutput, setAiConsoleOutput] = useState(null);
  const [runningAiConsole, setRunningAiConsole] = useState(false);

  const handleRunAiConsole = async (promptText) => {
    const query = typeof promptText === 'string' ? promptText : customAiPrompt;
    if (!query || !query.trim()) return;

    setRunningAiConsole(true);
    setAiConsoleOutput(null);

    // The backend (/admin/query-ai) is the single source of truth and returns
    // live MongoDB analytics. On success show real data; otherwise show an
    // honest error. No client-side fabricated numbers.
    try {
      const res = await API.post('/admin/query-ai', { prompt: query });
      if (res.data && res.data.success) {
        setAiConsoleOutput({
          prompt: query,
          response: res.data.aiResponse || res.data.analysis,
          scope: res.data.jurisdictionScope || res.data.scope,
          timestamp: new Date().toLocaleTimeString()
        });
      } else {
        setAiConsoleOutput({
          prompt: query,
          error: (res.data && res.data.message) || 'Live analytics service returned no data.',
          timestamp: new Date().toLocaleTimeString()
        });
      }
    } catch (backendErr) {
      setAiConsoleOutput({
        prompt: query,
        error: backendErr.response?.data?.message || 'Live analytics service is unavailable. Please try again.',
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setRunningAiConsole(false);
    }
  };

  // Renders a bold-aware inline fragment (handles **bold** markers).
  const renderInline = (str) =>
    str.split(/(\*\*.*?\*\*)/g).map((p, pIdx) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={pIdx} style={{ color: '#c4b5fd', fontWeight: 700 }}>{p.slice(2, -2)}</strong>
        : p
    );

  const renderAiMarkdown = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    const blocks = [];
    let bulletBuf = [];

    // Flush buffered bullet lines into a compact responsive grid so many
    // key/value rows fit side-by-side instead of one tall column (less scroll).
    const flushBullets = (key) => {
      if (!bulletBuf.length) return;
      const items = bulletBuf;
      bulletBuf = [];
      blocks.push(
        <div key={key} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '6px', marginBottom: '10px' }}>
          {items.map((content, i) => {
            const isApproved = content.toLowerCase().includes('approved');
            const isPending = content.toLowerCase().includes('pending');
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '12.5px', color: '#e2d9f3', lineHeight: 1.4, background: '#161126', padding: '6px 10px', borderRadius: '6px', border: '1px solid #2b2242' }}>
                <span style={{ color: '#a78bfa', fontWeight: 'bold' }}>•</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {renderInline(content)}
                  {isApproved && <span style={{ marginLeft: '6px', padding: '1px 7px', background: 'rgba(16, 185, 129, 0.18)', color: '#34d399', borderRadius: '4px', fontSize: '10px', fontWeight: 700, border: '1px solid rgba(52, 211, 153, 0.3)' }}>Approved</span>}
                  {isPending && <span style={{ marginLeft: '6px', padding: '1px 7px', background: 'rgba(251, 191, 36, 0.18)', color: '#fbbf24', borderRadius: '4px', fontSize: '10px', fontWeight: 700, border: '1px solid rgba(251, 191, 36, 0.3)' }}>Pending</span>}
                </div>
              </div>
            );
          })}
        </div>
      );
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed || /^-{3,}$/.test(trimmed)) return; // skip blanks & divider rules

      if (trimmed.startsWith('#')) {
        flushBullets(`grid-${idx}`);
        const heading = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '');
        blocks.push(
          <div key={idx} style={{ fontSize: '13.5px', fontWeight: 700, color: '#f5f3ff', borderLeft: '4px solid #a78bfa', marginTop: '12px', marginBottom: '6px', background: '#1b162b', padding: '5px 10px', borderRadius: '0 6px 6px 0' }}>
            {heading}
          </div>
        );
        return;
      }

      if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
        bulletBuf.push(trimmed.replace(/^[\*\-]\s*/, ''));
        return;
      }

      flushBullets(`grid-${idx}`);
      blocks.push(
        <p key={idx} style={{ margin: '3px 0', fontSize: '12.5px', color: '#e2d9f3', lineHeight: 1.5 }}>
          {renderInline(trimmed)}
        </p>
      );
    });

    flushBullets('grid-final');
    return blocks;
  };

  const navigateSubPage = (pageKey) => {
    setSubPage(pageKey);
    setSelectedVoterTimeline(null);
    try { window.history.pushState({}, '', `/admin/superadmin/${pageKey}`); } catch (e) {}
  };

  // ── Fetch Initial Filter Metadata ──
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

  // ── Fetch Assemblies for District ──
  const fetchAssembliesForDistrict = async (dist) => {
    if (!dist) { fetchInitialMeta(); return; }
    try {
      setLoadingFilterAssemblies(true);
      const res = await API.get(`/admin/filter-meta?district=${encodeURIComponent(dist)}`);
      if (res.data.success) {
        setAssemblies(res.data.assemblies || []);
        setBooths(res.data.booths || []);
      }
    } catch (err) {
      console.error('Error loading assemblies for district:', err);
    } finally {
      setLoadingFilterAssemblies(false);
    }
  };

  // ── Fetch Booths for Assembly ──
  const fetchBoothsForAssembly = async (ass, dist) => {
    if (!ass) { setBooths([]); return; }
    try {
      setLoadingFilterBooths(true);
      const params = new URLSearchParams({ assemblyName: ass, ...(dist && { district: dist }) });
      const res = await API.get(`/admin/filter-meta?${params}`);
      if (res.data.success) setBooths(res.data.booths || []);
    } catch (err) {
      console.error('Error loading booths for assembly:', err);
    } finally {
      setLoadingFilterBooths(false);
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
        ...(searchQuery    && { search: searchQuery }),
        ...(statusFilter   && { status: statusFilter }),
        ...(schemeFilter   && { schemeName: schemeFilter }),
        ...(districtFilter && { district: districtFilter }),
        ...(assemblyFilter && { assemblyName: assemblyFilter }),
        ...(boothFilter    && { boothNo: boothFilter })
      });
      const res = await API.get(`/admin/applications?${params}`);
      if (res.data.success) {
        setVoters(res.data.voters || []);
        setTotalVoters(res.data.totalVoters || 0);
        setTotalApplications(res.data.totalApplications || res.data.totalVoters || 0);
        setTotalPages(res.data.totalPages || 1);
        setCurrentPage(res.data.currentPage || 1);
      }
    } catch (err) {
      console.error('Error loading voters:', err);
    } finally {
      setLoadingVoters(false);
    }
  };

  // ── Fetch Logins & Meta ──
  const fetchLoginsAndCreds = async () => {
    try {
      const [credRes, assRes, distCredRes, assCredRes] = await Promise.all([
        API.get('/admin/credentials'),
        API.get('/admin/jurisdiction-assemblies'),
        API.get('/admin/jurisdiction-district-credentials'),
        API.get('/admin/jurisdiction-assembly-credentials')
      ]);
      if (credRes.data.success) setAdminList(credRes.data.admins);
      if (assRes.data.success) setAssembliesList(assRes.data.assemblies);
      if (distCredRes.data.success) setDistrictCredentials(distCredRes.data.districts);
      if (assCredRes.data.success) setAssemblyCredentials(assCredRes.data.assemblies);
    } catch (err) {
      console.error('Error loading logins & credentials:', err);
    }
  };

  const fetchBoothCredentials = async (assemblyNo) => {
    setLoadingBooths(true);
    try {
      const res = await API.get(`/admin/assembly-booth-credentials?assemblyNo=${assemblyNo}`);
      if (res.data.success) setBoothCredentialsData(res.data.data);
    } catch (err) {
      console.error('Error loading booth credentials:', err);
    } finally {
      setLoadingBooths(false);
    }
  };

  const fetchDashboardData = () => {
    fetchStats();
    fetchVoters(1);
    fetchLoginsAndCreds();
  };

  useEffect(() => {
    fetchInitialMeta();
    fetchStats();
    fetchLoginsAndCreds();
  }, []);

  useEffect(() => {
    fetchVoters(1);
    setCurrentPage(1);
  }, [districtFilter, assemblyFilter, boothFilter, statusFilter, schemeFilter, searchQuery]);

  useEffect(() => {
    fetchAssembliesForDistrict(districtFilter);
  }, [districtFilter]);

  useEffect(() => {
    fetchBoothsForAssembly(assemblyFilter, districtFilter);
  }, [assemblyFilter, districtFilter]);

  useEffect(() => {
    if (subPage === 'logins' && credSubTab === 'booths' && selectedAssemblyNo) {
      fetchBoothCredentials(selectedAssemblyNo);
    }
  }, [subPage, credSubTab, selectedAssemblyNo]);

  const handleCreateCredential = async (e) => {
    e.preventDefault();
    setCredSuccessMsg(''); setCredErrorMsg('');
    try {
      const res = await API.post('/admin/create-credential', newAdminForm);
      if (res.data.success) {
        setCredSuccessMsg(`Credential '${res.data.admin.username}' created successfully!`);
        setNewAdminForm({ username: '', password: '', role: 'DISTRICT_ADMIN', district: '', assemblyName: '', boothNo: '' });
        fetchDashboardData();
      }
    } catch (err) {
      setCredErrorMsg(err.response?.data?.message || 'Failed to create admin credential');
    }
  };

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

  const handleQuickSwitch = async (usr, pwd) => {
    try {
      const res = await API.post('/admin/login', { username: usr, password: pwd });
      if (res.data.success) loginAdmin(res.data.admin, res.data.token);
    } catch (err) { console.error('Switch error:', err); }
  };

  const filteredBooths = boothCredentialsData?.boothLogins?.filter(b => {
    if (!boothSearchQuery) return true;
    return b.boothNo.includes(boothSearchQuery) || b.username.includes(boothSearchQuery.toLowerCase()) || b.passcode.includes(boothSearchQuery);
  }) || [];

  // ── District / Assembly credential search filters ──
  const _distQ = distCredSearch.trim().toLowerCase();
  const filteredDistrictCreds = _distQ
    ? districtCredentials.filter(d =>
        (d.district || '').toLowerCase().includes(_distQ) ||
        (d.username || '').toLowerCase().includes(_distQ) ||
        String(d.passcode || '').toLowerCase().includes(_distQ))
    : districtCredentials;

  const _assQ = assCredSearch.trim().toLowerCase();
  const filteredAssemblyCreds = _assQ
    ? assemblyCredentials.filter(a =>
        (a.assemblyName || '').toLowerCase().includes(_assQ) ||
        String(a.assemblyNo || '').toLowerCase().includes(_assQ) ||
        (a.district || '').toLowerCase().includes(_assQ) ||
        (a.username || '').toLowerCase().includes(_assQ) ||
        String(a.passcode || '').toLowerCase().includes(_assQ))
    : assemblyCredentials;

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

  const activeScopeText = 'Full Statewide Governance';

  return (
    <div
      className="theme-superadmin sa-root"
      style={{ display: 'flex', flexDirection: 'column', width: '100%', boxSizing: 'border-box', minHeight: '100vh', overflow: 'visible' }}
    >
      <AdminMobileNav
        role="SUPER_ADMIN"
        title="Super Admin Portal"
        subPage={subPage}
        onNavigate={navigateSubPage}
        onRefresh={fetchDashboardData}
      />

      {/* ── Responsive styles for all devices ── */}
      <style>{`
        /* Scrollbars */
        .superadmin-scroll { scrollbar-width: thin; scrollbar-color: #3b2e5a #0d0a17; scroll-behavior: smooth; }
        .superadmin-scroll::-webkit-scrollbar { width: 6px; }
        .superadmin-scroll::-webkit-scrollbar-track { background: #0d0a17; border-radius: 8px; }
        .superadmin-scroll::-webkit-scrollbar-thumb { background: #3b2e5a; border-radius: 8px; }

        /* ── Layout shell ── */
        .sa-body { display: flex; gap: 0; width: 100%; box-sizing: border-box; align-items: flex-start; overflow: visible; }
        .sa-sidebar { width: 270px; min-width: 270px; flex-shrink: 0; position: sticky; top: 10px; max-height: calc(100vh - 20px); overflow-y: auto; }
        .sa-main { flex: 1; min-width: 0; padding: 20px 20px 40px 20px; overflow: visible; box-sizing: border-box; }

        /* ── Stat grid ── */
        .sa-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; width: 100%; }

        /* ── Scheme grid ── */
        .sa-scheme-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; width: 100%; }
        .sa-scheme-card { border-radius: 12px; overflow: hidden; cursor: pointer; transition: transform .2s, box-shadow .2s; }
        .sa-scheme-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(167,139,250,.3); }
        .sa-scheme-card img { width: 100%; height: 96px; object-fit: cover; display: block; }
        .sa-scheme-card-body { padding: 10px 12px; }

        /* ── Filter bar ── */
        .sa-filter-bar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; background: var(--color-fog-gray); padding: 12px; border-radius: 10px; border: 1px solid var(--color-linen); margin-bottom: 16px; }
        .sa-filter-bar select, .sa-filter-bar input { font-size: 16px; }

        /* ── Table wrapper ── */
        .sa-table-wrap { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 10px; }
        .sa-table-wrap table { min-width: 600px; width: 100%; border-collapse: collapse; }

        /* ── AI Console ── */
        .sa-ai-btns { display: flex; gap: 6px; flex-wrap: wrap; }
        .sa-ai-prompt-btn { padding: 7px 12px; font-size: 12px; border-radius: 8px; font-weight: 600; cursor: pointer; min-height: 36px; white-space: nowrap; }
        .sa-ai-form { display: flex; gap: 10px; }
        .sa-ai-input { flex: 1; background: #110d1e; border: 1px solid #2b2242; border-radius: 8px; padding: 12px 14px; color: #f5f3ff; font-size: 16px; outline: none; font-weight: 500; min-width: 0; }
        .sa-ai-submit { background: linear-gradient(135deg,#7c3aed,#a78bfa); color: #fff; font-weight: 700; padding: 12px 20px; border-radius: 8px; border: none; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 6px; min-height: 44px; white-space: nowrap; flex-shrink: 0; }
        /* Scheme card image */
        .sa-scheme-img { width: 100%; height: 96px; object-fit: cover; display: block; }

        /* ── Tabs ── */
        .tabs-header { display: flex; gap: 6px; background: var(--color-fog-gray); padding: 6px; border-radius: 10px; overflow-x: auto; flex-wrap: nowrap; scrollbar-width: none; }
        .tabs-header::-webkit-scrollbar { display: none; }

        /* ═══════════════════════════════════════
           RESPONSIVE BREAKPOINTS
           ═══════════════════════════════════════ */

        /* iPad Pro (1024-1366px): 3-col stats, 3-col schemes */
        @media (max-width: 1366px) and (min-width: 1024px) {
          .sa-stat-grid { grid-template-columns: repeat(2, 1fr); }
          .sa-scheme-grid { grid-template-columns: repeat(3, 1fr); }
        }

        /* Tablet / iPad (768-1023px): sidebar hidden, 2-col stats, 2-col schemes */
        @media (max-width: 1023px) {
          .sa-sidebar { display: none !important; }
          .sa-body { flex-direction: column !important; }
          .sa-main { padding: 14px 14px calc(24px + env(safe-area-inset-bottom,0px)) 14px !important; overflow: visible !important; height: auto !important; }
          .sa-stat-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
          .sa-scheme-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .sa-scheme-card img, .sa-scheme-img { height: 72px !important; }
          .sa-ai-btns { overflow-x: auto !important; flex-wrap: nowrap !important; -webkit-overflow-scrolling: touch !important; scrollbar-width: none !important; padding-bottom: 4px; }
          .sa-ai-btns::-webkit-scrollbar { display: none; }
          .sa-ai-form { flex-direction: column !important; gap: 8px !important; }
          .sa-ai-submit { width: 100% !important; justify-content: center !important; }
          .sa-filter-bar { flex-direction: column !important; }
          .sa-filter-bar > * { width: 100% !important; min-width: unset !important; flex: unset !important; }
        }

        /* Large phone (481-767px): 2-col stats, 2-col schemes */
        @media (max-width: 767px) {
          .sa-main { padding: 10px 12px calc(20px + env(safe-area-inset-bottom,0px)) 12px !important; }
          .sa-stat-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .sa-scheme-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
          .sa-scheme-card img, .sa-scheme-img { height: 60px !important; }
          .sa-ai-prompt-btn { font-size: 11px !important; padding: 6px 10px !important; }
          .stat-number { font-size: clamp(1.1rem, 5vw, 1.6rem) !important; }
          .stat-card { padding: 12px 14px !important; }
          .campsite-card, .admin-card { padding: 14px 12px !important; border-radius: 10px !important; }
          h3 { font-size: clamp(14px, 4vw, 18px) !important; }
        }

        /* Small phone / iPhone SE (≤480px): 2-col stats, 2-col schemes */
        @media (max-width: 480px) {
          .sa-main { padding: 8px 10px calc(16px + env(safe-area-inset-bottom,0px)) 10px !important; }
          .sa-stat-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
          .sa-scheme-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 6px !important; }
          .sa-scheme-card img, .sa-scheme-img { height: 52px !important; }
          .stat-card { padding: 10px 12px !important; }
        }

        /* Fold / very narrow (≤360px) */
        @media (max-width: 360px) {
          .sa-stat-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 6px !important; }
          .sa-scheme-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 5px !important; }
          .stat-number { font-size: 1rem !important; }
        }

        /* iPhone SE (320px) — still 2-col */
        @media (max-width: 320px) {
          .sa-stat-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 5px !important; }
          .stat-card { padding: 8px 10px !important; }
        }
      `}</style>

      <div className="sa-body">

      {/* ══════════════════════════════════════════ */}
      {/* LEFT SIDEBAR NAVIGATION MENU               */}
      {/* ══════════════════════════════════════════ */}
      <aside
        className="sa-sidebar"
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
              <Shield size={12} /> SUPER ADMIN
            </span>
          </div>
          <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--theme-text-main)' }}>
            Control Center
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--theme-text-muted)', marginTop: '2px' }}>
            Tamil Nadu Statewide Portal
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
              {totalApplications > 0 ? `${totalApplications.toLocaleString()} Apps` : `${totalVoters.toLocaleString()} Members`}
            </span>
          </div>
        </button>

        <button
          onClick={() => navigateSubPage('logins')}
          className={`sidebar-nav-btn ${subPage === 'logins' ? 'active' : ''}`}
        >
          <Key size={18} />
          <span>Passcodes & Logins</span>
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
          Field Operations
        </div>

        <button
          onClick={() => navigateSubPage('booth_president')}
          className={`sidebar-nav-btn ${subPage === 'booth_president' ? 'active' : ''}`}
        >
          <Award size={18} />
          <span>Booth President Requests</span>
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
      <main className="superadmin-scroll sa-main">

      {/* ══════════════════════════════════════════ */}
      {/* PAGE 1: OVERVIEW DASHBOARD                */}
      {/* ══════════════════════════════════════════ */}
      {subPage === 'dashboard' && (
        loadingStats ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', border: '4px solid var(--color-linen)', borderTopColor: 'var(--color-lavender-400)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ fontSize: '14px', color: 'var(--color-slate)', fontWeight: '500' }}>Loading Super Admin Portal stats...</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : statsData ? (
          <div style={{ width: '100%', boxSizing: 'border-box' }}>

            {/* 🟢 Live Tracking (auto-refresh, jurisdiction-scoped) */}
            <LiveTrackingPanel />

            {/* 🤖 Live AI Intelligence Console Widget (Dark Mode Lavender Theme) */}
            <div className="campsite-card" style={{ width: '100%', padding: '24px', marginBottom: '24px', background: '#141022', color: '#f5f3ff', borderRadius: '14px', border: '1px solid #2b2242', boxShadow: '0 4px 25px rgba(0,0,0,0.4)', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: 'rgba(167, 139, 250, 0.15)', color: '#a78bfa', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(167, 139, 250, 0.3)', fontSize: '20px' }}>
                    🤖
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#f5f3ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      Live AI Command Console
                    </h3>
                    <p style={{ margin: 0, fontSize: '12px', color: '#9d8ec4' }}>
                      Backend model · <strong style={{ color: '#a78bfa' }}>Live MongoDB analytics</strong> · Real-Time Tamil Nadu Telemetry
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleRunAiConsole('Analyze live scheme approval velocity and bottleneck districts')}
                    disabled={runningAiConsole}
                    className="btn btn-ghost"
                    style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(167, 139, 250, 0.1)', color: '#c4b5fd', border: '1px solid rgba(167, 139, 250, 0.25)', borderRadius: '6px', fontWeight: '600' }}
                  >
                    📊 Approval Velocity
                  </button>
                  <button
                    onClick={() => handleRunAiConsole('Detect registration anomalies or potential voter EPIC duplications')}
                    disabled={runningAiConsole}
                    className="btn btn-ghost"
                    style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(167, 139, 250, 0.1)', color: '#c4b5fd', border: '1px solid rgba(167, 139, 250, 0.25)', borderRadius: '6px', fontWeight: '600' }}
                  >
                    🚨 Anomaly Detection
                  </button>
                  <button
                    onClick={() => handleRunAiConsole('Predict top performing assembly constituencies for Central BJP Welfare Schemes')}
                    disabled={runningAiConsole}
                    className="btn btn-ghost"
                    style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(167, 139, 250, 0.1)', color: '#c4b5fd', border: '1px solid rgba(167, 139, 250, 0.25)', borderRadius: '6px', fontWeight: '600' }}
                  >
                    🎯 Growth Forecast
                  </button>
                  <button
                    onClick={() => {
                      setCustomAiPrompt('show top performing polling booths analysis');
                      handleRunAiConsole('show top performing polling booths analysis');
                    }}
                    disabled={runningAiConsole}
                    className="btn btn-ghost"
                    style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(249, 115, 22, 0.15)', color: '#f97316', border: '1px solid rgba(249, 115, 22, 0.3)', borderRadius: '6px', fontWeight: '700' }}
                  >
                    🏆 Top Booths
                  </button>
                  <button
                    onClick={() => {
                      setCustomAiPrompt('show top member referrals and ground mobilizers');
                      handleRunAiConsole('show top member referrals and ground mobilizers');
                    }}
                    disabled={runningAiConsole}
                    className="btn btn-ghost"
                    style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(249, 115, 22, 0.15)', color: '#f97316', border: '1px solid rgba(249, 115, 22, 0.3)', borderRadius: '6px', fontWeight: '700' }}
                  >
                    🌟 Top Referrals
                  </button>
                </div>

              </div>

              {/* Input Bar */}
              <form onSubmit={(e) => { e.preventDefault(); handleRunAiConsole(); }} style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={customAiPrompt}
                  onChange={(e) => setCustomAiPrompt(e.target.value)}
                  placeholder="Type any query (e.g. 'Summarize scheme performance in ranipet Booth 20')..."
                  style={{ flex: 1, background: '#110d1e', border: '1px solid #2b2242', borderRadius: '8px', padding: '12px 16px', color: '#f5f3ff', fontSize: '14px', outline: 'none', fontWeight: '500' }}
                />
                <button
                  type="submit"
                  disabled={runningAiConsole}
                  style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)', color: '#ffffff', fontWeight: '700', padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 14px rgba(124,58,237,0.4)', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {runningAiConsole ? '⏳ Analyzing...' : '✨ Run AI Query'}
                </button>
              </form>

              {/* Output Display */}
              {aiConsoleOutput && (
                <div style={{ marginTop: '20px', padding: '20px', background: '#1b162b', borderRadius: '10px', border: '1px solid #2b2242', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '12px', borderBottom: '1px solid #2b2242', paddingBottom: '8px' }}>
                    <span style={{ color: '#a78bfa', fontWeight: '700', fontSize: '13px' }}>Live Query: "{aiConsoleOutput.prompt}"</span>
                    <span style={{ color: '#9d8ec4' }}>{aiConsoleOutput.timestamp}</span>
                  </div>
                  {aiConsoleOutput.error ? (
                    <div style={{ color: '#f87171', fontWeight: '600', padding: '10px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '6px', border: '1px solid rgba(248, 113, 113, 0.3)' }}>
                      ❌ Error: {aiConsoleOutput.error}
                    </div>
                  ) : (
                    <div className="ai-report-scroll" style={{ maxHeight: '56vh', overflowY: 'auto', overflowX: 'hidden', paddingRight: '10px' }}>
                      {renderAiMarkdown(aiConsoleOutput.response)}
                    </div>
                  )}
                  <style>{`
                    .ai-report-scroll { scrollbar-width: thin; scrollbar-color: #8b5cf6 transparent; scroll-behavior: smooth; }
                    .ai-report-scroll::-webkit-scrollbar { width: 8px; }
                    .ai-report-scroll::-webkit-scrollbar-track { background: transparent; }
                    .ai-report-scroll::-webkit-scrollbar-thumb { background: #3b2e5a; border-radius: 8px; }
                    .ai-report-scroll::-webkit-scrollbar-thumb:hover { background: #8b5cf6; }
                  `}</style>
                </div>
              )}
            </div>

            {/* ── 4 Stat Cards ── */}
            <div className="sa-stat-grid">

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

              {/* Card 2: Voters Enrolled in Schemes (Write DB) */}
              <div
                className="stat-card"
                onClick={() => { setStatusFilter(''); setSchemeFilter(''); navigateSubPage('applications'); }}
                style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                title="Click to view all enrolled members"
              >
                <div className="stat-icon" style={{ background: 'rgba(249, 115, 22, 0.15)', color: 'var(--color-saffron)' }}>
                  <Users size={20} />
                </div>
                <div>
                  <div className="stat-number">
                    {statsData.overview.totalVotersRequested != null
                      ? statsData.overview.totalVotersRequested.toLocaleString()
                      : 0}
                  </div>
                  <div className="stat-label">Voters Enrolled in Schemes</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-slate)', marginTop: '2px' }}>
                    {statsData.overview.totalRegisteredUsers != null
                      ? `${statsData.overview.totalRegisteredUsers.toLocaleString()} Portal User Logins`
                      : 'Enrolled Members'}
                  </div>
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
                  Top Applied BJP Schemes Across Tamil Nadu
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--color-slate)' }}>Click any scheme to filter applications</span>
              </div>
              <div className="sa-scheme-grid">
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
                      padding: '14px',
                      background: '#1b162b',
                      borderRadius: '10px',
                      border: '1px solid var(--color-linen)',
                      cursor: 'pointer',
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
                        className="sa-scheme-img"
                        style={{ width: '100%', height: '96px', objectFit: 'cover', borderRadius: '8px 8px 0 0', marginBottom: 0, display: 'block' }}
                      />
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-midnight-ink)' }}>{formatSchemeName(item._id)}</div>
                      <span style={{ fontSize: '11px', color: '#c4b5fd', fontWeight: '600' }}>View →</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-slate)', marginTop: '2px', marginBottom: '8px' }}>{item.cluster || 'BJP Scheme'}</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-midnight-ink)' }}>
                      {item.count.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-slate)' }}>applications</span>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>

            {/* ── Top Referral Champions ── */}
            <TopReferrersCard
              topReferrers={statsData.topReferrers || []}
              scopeLabel="Tamil Nadu State"
              onViewProfile={(ref) => {
                if (ref && ref.epicNo) { setSubPage('applications'); setSelectedVoterTimeline(ref); }
              }}
            />

          </div>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-slate)' }}>No dashboard data available.</div>
        )
      )}

      {/* ══════════════════════════════════════════ */}
      {/* PAGE 2: SCHEME APPLICATIONS                */}
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

            {/* ── Filters Row 1: Search + Header Stats ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
              <div style={{ flex: '1 1 300px', minWidth: '240px', position: 'relative' }}>
                <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate)' }} size={16} />
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
                  : <>
                      <strong style={{ color: 'var(--color-midnight-ink)' }}>
                        {totalApplications > 0 && totalApplications !== totalVoters
                          ? `${totalApplications.toLocaleString()} Applications (${totalVoters.toLocaleString()} Members)`
                          : `${totalVoters.toLocaleString()} voters`}
                      </strong> · Page {currentPage} of {totalPages}
                    </>
                }
              </div>
            </div>

            {/* ── Filters Row 2: District + Assembly + Booth + Status + Clear All ── */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px', width: '100%', alignItems: 'center', background: 'var(--color-fog-gray)', padding: '12px', borderRadius: '10px', border: '1px solid var(--color-linen)' }}>

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
                disabled={loadingFilterAssemblies}
                style={{ flex: '1 1 150px', minWidth: '140px' }}
              >
                <option value="">{loadingFilterAssemblies ? 'Loading assemblies…' : 'All Assemblies'}</option>
                {assemblies.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>

              {/* Booth Filter (Always Available) */}
              <select
                value={boothFilter}
                onChange={(e) => setBoothFilter(e.target.value)}
                className="form-control"
                disabled={loadingFilterBooths}
                style={{ flex: '1 1 130px', minWidth: '120px' }}
              >
                <option value="">{loadingFilterBooths ? 'Loading booths…' : 'All Booths'}</option>
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
                    setDistrictFilter(''); setAssemblyFilter(''); setBoothFilter('');
                    setStatusFilter(''); setSchemeFilter(''); setSearchQuery('');
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
            <div style={{ width: '100%', overflowX: 'auto' }}>
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
      {/* PAGE 3: LOGINS MANAGER                     */}
      {/* ══════════════════════════════════════════ */}
      {subPage === 'logins' && (
        <div style={{ width: '100%', boxSizing: 'border-box' }}>
          <div className="tabs-header" style={{ width: '100%', marginBottom: '20px', background: 'var(--color-fog-gray)', padding: '6px', borderRadius: '10px' }}>
            <button onClick={() => setCredSubTab('districts')} className={`tab-btn ${credSubTab === 'districts' ? 'active' : ''}`} style={{ padding: '8px 16px', fontSize: '13px' }}>
              District Admin Passcodes ({districtCredentials.length})
            </button>
            <button onClick={() => setCredSubTab('assemblies')} className={`tab-btn ${credSubTab === 'assemblies' ? 'active' : ''}`} style={{ padding: '8px 16px', fontSize: '13px' }}>
              Assembly Admin Passcodes ({assemblyCredentials.length})
            </button>
            <button onClick={() => setCredSubTab('booths')} className={`tab-btn ${credSubTab === 'booths' ? 'active' : ''}`} style={{ padding: '8px 16px', fontSize: '13px' }}>
              Polling Booth Passcodes (By Assembly)
            </button>
          </div>

          {/* Sub-Tab 1: District Credentials */}
          {credSubTab === 'districts' && (
            <div className="campsite-card" style={{ width: '100%', padding: '24px', boxSizing: 'border-box' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-midnight-ink)', marginBottom: '16px' }}>
                Statewide District Admin Passcodes &amp; Quick Access
              </h3>
              <div style={{ marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="Search by district, username or passcode..."
                  value={distCredSearch}
                  onChange={(e) => { setDistCredSearch(e.target.value); setDistCredPage(1); }}
                  className="form-control"
                  style={{ maxWidth: '360px' }}
                />
                {distCredSearch && (
                  <span style={{ marginLeft: '12px', fontSize: '13px', color: 'var(--color-slate)' }}>
                    {filteredDistrictCreds.length} result(s)
                  </span>
                )}
              </div>
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-linen)', color: 'var(--color-slate)', textAlign: 'left', background: 'var(--color-fog-gray)' }}>
                      <th style={{ padding: '10px 12px' }}>DISTRICT NAME</th>
                      <th style={{ padding: '10px 12px' }}>TOTAL ASSEMBLIES</th>
                      <th style={{ padding: '10px 12px' }}>USERNAME</th>
                      <th style={{ padding: '10px 12px' }}>PASSCODE</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>QUICK LOGIN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDistrictCreds.slice((distCredPage - 1) * 10, distCredPage * 10).map((dist) => (
                      <tr key={dist.username} style={{ borderBottom: '1px solid var(--color-linen)' }}>
                        <td style={{ padding: '12px', fontWeight: '700', color: 'var(--color-midnight-ink)' }}>{dist.district}</td>
                        <td style={{ padding: '12px', fontWeight: '600' }}>{dist.assembliesCount} Assemblies</td>
                        <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: '600', color: 'var(--color-slate)' }}>{dist.username}</td>
                        <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: '700', color: 'var(--color-saffron)' }}>{dist.passcode}</td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <button onClick={() => handleQuickSwitch(dist.username, dist.passcode)} className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: '12px', fontWeight: '700' }}>
                            <LogIn size={13} /> Switch Login
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {renderPagination(distCredPage, filteredDistrictCreds.length, 10, setDistCredPage)}
            </div>
          )}

          {/* Sub-Tab 2: Assembly Credentials */}
          {credSubTab === 'assemblies' && (
            <div className="campsite-card" style={{ width: '100%', padding: '24px', boxSizing: 'border-box' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-midnight-ink)', marginBottom: '16px' }}>
                All 234 Assembly Constituency Passcodes
              </h3>
              <div style={{ marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="Search by assembly name, no, district, username or passcode..."
                  value={assCredSearch}
                  onChange={(e) => { setAssCredSearch(e.target.value); setAssCredPage(1); }}
                  className="form-control"
                  style={{ maxWidth: '420px' }}
                />
                {assCredSearch && (
                  <span style={{ marginLeft: '12px', fontSize: '13px', color: 'var(--color-slate)' }}>
                    {filteredAssemblyCreds.length} result(s)
                  </span>
                )}
              </div>
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-linen)', color: 'var(--color-slate)', textAlign: 'left', background: 'var(--color-fog-gray)' }}>
                      <th style={{ padding: '10px 12px' }}># NO</th>
                      <th style={{ padding: '10px 12px' }}>ASSEMBLY NAME</th>
                      <th style={{ padding: '10px 12px' }}>DISTRICT</th>
                      <th style={{ padding: '10px 12px' }}>USERNAME</th>
                      <th style={{ padding: '10px 12px' }}>PASSCODE</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>QUICK LOGIN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssemblyCreds.slice((assCredPage - 1) * 15, assCredPage * 15).map((ass) => (
                      <tr key={ass.username} style={{ borderBottom: '1px solid var(--color-linen)' }}>
                        <td style={{ padding: '12px', fontWeight: '700', color: 'var(--color-slate)' }}>#{ass.assemblyNo}</td>
                        <td style={{ padding: '12px', fontWeight: '700', color: 'var(--color-midnight-ink)' }}>{ass.assemblyName}</td>
                        <td style={{ padding: '12px', color: 'var(--color-slate)' }}>{ass.district}</td>
                        <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: '600', color: 'var(--color-slate)' }}>{ass.username}</td>
                        <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: '700', color: 'var(--color-saffron)' }}>{ass.passcode}</td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <button onClick={() => handleQuickSwitch(ass.username, ass.passcode)} className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: '12px', fontWeight: '700' }}>
                            <LogIn size={13} /> Switch Login
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {renderPagination(assCredPage, filteredAssemblyCreds.length, 15, setAssCredPage)}
            </div>
          )}

          {/* Sub-Tab 3: Booth Credentials */}
          {credSubTab === 'booths' && (
            <div className="campsite-card" style={{ width: '100%', padding: '24px', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-slate)', display: 'block', marginBottom: '6px' }}>Select Assembly Constituency:</label>
                  <select
                    value={selectedAssemblyNo}
                    onChange={(e) => { setSelectedAssemblyNo(e.target.value); setBoothCredPage(1); }}
                    className="form-control"
                  >
                    {assembliesList.map(a => (
                      <option key={a.assemblyNo} value={a.assemblyNo}>
                        #{a.assemblyNo} — {a.assemblyName} ({a.district})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: 1, minWidth: '220px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-slate)', display: 'block', marginBottom: '6px' }}>Search Booth No or Passcode:</label>
                  <input
                    type="text"
                    placeholder="Search booth number..."
                    value={boothSearchQuery}
                    onChange={(e) => { setBoothSearchQuery(e.target.value); setBoothCredPage(1); }}
                    className="form-control"
                  />
                </div>
              </div>

              {loadingBooths ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-slate)' }}>Loading booth logins...</div>
              ) : boothCredentialsData && (
                <div style={{ width: '100%', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--color-linen)', color: 'var(--color-slate)', textAlign: 'left', background: 'var(--color-fog-gray)' }}>
                        <th style={{ padding: '10px 12px' }}>BOOTH NO</th>
                        <th style={{ padding: '10px 12px' }}>ASSEMBLY</th>
                        <th style={{ padding: '10px 12px' }}>DISTRICT</th>
                        <th style={{ padding: '10px 12px' }}>USERNAME</th>
                        <th style={{ padding: '10px 12px' }}>PASSCODE</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>QUICK LOGIN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBooths.slice((boothCredPage - 1) * 15, boothCredPage * 15).map((b) => (
                        <tr key={b.username} style={{ borderBottom: '1px solid var(--color-linen)' }}>
                          <td style={{ padding: '10px 12px', fontWeight: '700', color: 'var(--color-midnight-ink)' }}>Booth {b.boothNo}</td>
                          <td style={{ padding: '10px 12px' }}>{boothCredentialsData.assemblyName}</td>
                          <td style={{ padding: '10px 12px', color: 'var(--color-slate)' }}>{boothCredentialsData.district}</td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: '600' }}>{b.username}</td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: '700', color: 'var(--color-saffron)' }}>{b.passcode}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            <button onClick={() => handleQuickSwitch(b.username, b.passcode)} className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: '12px', fontWeight: '700' }}>
                              <LogIn size={13} /> Switch Login
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {renderPagination(boothCredPage, filteredBooths.length, 15, setBoothCredPage)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* PAGE 4: DISTRICT STATS                    */}
      {/* ══════════════════════════════════════════ */}
      {subPage === 'districts' && statsData && (
        <div className="campsite-card" style={{ width: '100%', padding: '24px', boxSizing: 'border-box' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-midnight-ink)', marginBottom: '16px' }}>
            District-wise Application Analytics
          </h3>
          <div style={{ width: '100%', overflowX: 'auto' }}>
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
      {/* PAGE 5: ASSEMBLY STATS                    */}
      {/* ══════════════════════════════════════════ */}
      {subPage === 'assemblies' && statsData && (
        <div className="campsite-card" style={{ width: '100%', padding: '24px', boxSizing: 'border-box' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-midnight-ink)', marginBottom: '16px' }}>
            Assembly Constituency-wise Stats
          </h3>
          <div style={{ width: '100%', overflowX: 'auto' }}>
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
      {/* PAGE 6: BOOTH STATS                       */}
      {/* ══════════════════════════════════════════ */}
      {subPage === 'booths' && statsData && (
        <div className="campsite-card" style={{ width: '100%', padding: '24px', boxSizing: 'border-box' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-midnight-ink)', marginBottom: '16px' }}>
            Polling Booth-wise Breakdown Stats
          </h3>
          <div style={{ width: '100%', overflowX: 'auto' }}>
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
      {/* PAGE 7: REPORTS & EXCEL EXPORT             */}
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

      {/* PAGE 8: BOOTH PRESIDENT REQUESTS */}
      {subPage === 'booth_president' && (
        <BoothPresidentAdminPanel />
      )}
      </main>
    </div>
    </div>
  );
};

export default SuperAdminDashboard;
