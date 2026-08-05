import React from 'react';
import { Share2, ChevronRight, Trophy } from 'lucide-react';

/**
 * Top Referral Champions card - reusable across all admin dashboards.
 * Desktop: table layout  |  Mobile: card list
 */
const TopReferrersCard = ({ topReferrers = [], scopeLabel = '', onViewProfile }) => {
  // Rank badge colours (gold, silver, bronze, neutral)
  const RANK_COLORS = [
    { bg: 'rgba(251,191,36,0.25)', border: 'rgba(251,191,36,0.5)', text: '#fbbf24' },
    { bg: 'rgba(156,163,175,0.25)', border: 'rgba(156,163,175,0.5)', text: '#d1d5db' },
    { bg: 'rgba(217,119,6,0.25)',   border: 'rgba(217,119,6,0.5)',   text: '#f59e0b' },
    { bg: 'var(--color-fog-gray,#1b162b)', border: 'var(--color-linen,#2b2242)', text: 'var(--color-slate,#9d8ec4)' },
  ];

  const getRankStyle = (idx) => RANK_COLORS[Math.min(idx, 3)];

  return (
    <div className="campsite-card trc-wrap" style={{ width: '100%', padding: '20px', marginTop: '16px', boxSizing: 'border-box' }}>
      <style>{`
        .trc-wrap { margin-bottom: 0; }
        .trc-table-wrap { width:100%; overflow-x:auto; -webkit-overflow-scrolling:touch; }
        .trc-table { width:100%; border-collapse:collapse; font-size:13px; min-width:500px; }
        .trc-cards { display:none; flex-direction:column; gap:10px; }
        @media (max-width: 767px) {
          .trc-table-wrap { display:none !important; }
          .trc-cards { display:flex !important; }
          .trc-header-sub { display:none; }
          .trc-title { font-size:14px !important; }
          .trc-wrap { padding:14px 12px !important; margin-top:12px !important; }
        }
        .trc-card {
          background: var(--color-fog-gray, #1b162b);
          border: 1px solid var(--color-linen, #2b2242);
          border-radius: 12px; padding: 12px 14px;
          display: flex; align-items: center; gap: 12px;
          cursor: pointer; transition: border-color 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .trc-card:active { opacity: 0.85; }
        .trc-card:hover { border-color: var(--theme-accent, #a78bfa); }
        .trc-rank {
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 800; flex-shrink: 0;
          border: 1.5px solid;
        }
        .trc-body { flex: 1; min-width: 0; }
        .trc-name { font-size: 14px; font-weight: 700; color: var(--color-midnight-ink, #f5f3ff); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .trc-meta { font-size: 11px; color: var(--color-slate, #9d8ec4); margin-top: 2px; display:flex; gap:6px; flex-wrap:wrap; }
        .trc-count {
          background: rgba(52,211,153,0.18); color: #34d399;
          border: 1px solid rgba(52,211,153,0.3);
          padding: 4px 10px; border-radius: 999px;
          font-weight: 700; font-size: 12px; white-space: nowrap; flex-shrink: 0;
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ minWidth: 0 }}>
          <h3 className="trc-title" style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-midnight-ink)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={18} color="var(--theme-accent)" style={{ flexShrink: 0 }} />
            <span>Top 5 Referral Champions</span>
          </h3>
          <div className="trc-header-sub" style={{ fontSize: '12px', color: 'var(--color-slate)', marginTop: '3px' }}>
            {scopeLabel || 'Members with highest referral registrations'}
          </div>
        </div>
        <span className="tag-pill tag-sunlit" style={{ fontSize: '10px', whiteSpace: 'nowrap', flexShrink: 0 }}>Leaderboard</span>
      </div>

      {!topReferrers || topReferrers.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-slate)', background: 'var(--color-fog-gray)', borderRadius: '10px', fontSize: '13px', border: '1px solid var(--color-linen)' }}>
          No referral activity recorded yet.
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="trc-table-wrap">
            <table className="trc-table">
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-linen)', color: 'var(--theme-accent)', textAlign: 'left', background: 'var(--color-fog-gray)' }}>
                  <th style={{ padding: '10px 12px', fontSize: '11px' }}>RANK</th>
                  <th style={{ padding: '10px 12px', fontSize: '11px' }}>MEMBER</th>
                  <th style={{ padding: '10px 12px', fontSize: '11px' }}>EPIC ID</th>
                  <th style={{ padding: '10px 12px', fontSize: '11px' }}>LOCATION</th>
                  <th style={{ padding: '10px 12px', fontSize: '11px' }}>REFERRALS</th>
                  {onViewProfile && <th style={{ padding: '10px 12px', fontSize: '11px', textAlign: 'right' }}>ACTION</th>}
                </tr>
              </thead>
              <tbody>
                {topReferrers.map((ref, idx) => {
                  const rs = getRankStyle(idx);
                  return (
                    <tr key={ref.epicNo || ref.referralCode || idx}
                      style={{ borderBottom: '1px solid var(--color-linen)', transition: 'background 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = ''; }}>
                      <td style={{ padding: '12px' }}>
                        <span style={{ width: '30px', height: '30px', borderRadius: '50%', background: rs.bg, color: rs.text, border: '1.5px solid ' + rs.border, fontWeight: '800', fontSize: '13px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          #{idx + 1}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontWeight: '700', color: 'var(--color-midnight-ink)', fontSize: '14px' }}>
                        {ref.voterName || 'Member'}
                      </td>
                      <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: '600', color: 'var(--theme-accent)', fontSize: '12px' }}>
                        {ref.epicNo || '---'}
                      </td>
                      <td style={{ padding: '12px', fontSize: '12px', color: 'var(--color-slate)' }}>
                        {ref.district ? (<><div style={{ fontWeight: '600', color: 'var(--color-midnight-ink)' }}>{ref.district}</div><div>{ref.assemblyName || ''}</div></>) : '---'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span className="trc-count">{ref.referralCount} referred</span>
                      </td>
                      {onViewProfile && (
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <button type="button" onClick={() => onViewProfile(ref)} className="btn btn-ghost"
                            style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700' }}>
                            View <ChevronRight size={13} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="trc-cards">
            {topReferrers.map((ref, idx) => {
              const rs = getRankStyle(idx);
              return (
                <div key={ref.epicNo || ref.referralCode || idx}
                  className="trc-card"
                  onClick={() => onViewProfile && onViewProfile(ref)}>
                  <div className="trc-rank" style={{ background: rs.bg, borderColor: rs.border, color: rs.text }}>
                    #{idx + 1}
                  </div>
                  <div className="trc-body">
                    <div className="trc-name">{ref.voterName || 'Member'}</div>
                    <div className="trc-meta">
                      <span style={{ fontFamily: 'monospace', color: 'var(--theme-accent)' }}>{ref.epicNo}</span>
                      {ref.district && <span>{ref.district}</span>}
                    </div>
                  </div>
                  <span className="trc-count">{ref.referralCount}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default TopReferrersCard;
