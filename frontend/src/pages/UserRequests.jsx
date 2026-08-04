import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import StatusBadge from '../components/StatusBadge';
import { RefreshCw, FileText, ChevronDown, ChevronUp } from 'lucide-react';

const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

// ─── Status History Timeline for voter-facing view ───────────────────────────
const StatusTimeline = ({ history }) => {
  if (!history || history.length === 0) return null;

  return (
    <div style={{ marginTop: '14px', borderTop: '1px solid var(--color-linen)', paddingTop: '14px' }}>
      <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 12px 0' }}>
        Update History
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {[...history].reverse().map((h, idx) => {
          const isNote = h.remarks?.startsWith('📋');
          return (
            <div key={idx} style={{
              padding: '10px 14px',
              borderRadius: '10px',
              borderLeft: `3px solid ${isNote ? '#63b3ed' : 'var(--color-campfire-orange)'}`,
              background: isNote ? 'rgba(99,179,237,0.06)' : 'var(--color-fog-gray)',
              border: isNote
                ? '1px solid rgba(99,179,237,0.2)'
                : '1px solid var(--color-linen)',
              borderLeftWidth: '3px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '6px' }}>
                <strong style={{
                  fontSize: '13px',
                  color: isNote ? '#63b3ed' : 'var(--color-midnight-ink)',
                  fontWeight: '700'
                }}>
                  {isNote ? '💬 Booth President\'s Note' : h.status}
                </strong>
                <span style={{ fontSize: '11px', color: 'var(--color-slate)' }}>
                  {formatDate(h.updatedAt)}
                </span>
              </div>
              {h.remarks && (
                <p style={{
                  margin: '4px 0 0 0',
                  fontSize: '13px',
                  color: 'var(--color-midnight-ink)',
                  lineHeight: '1.5',
                  fontStyle: isNote ? 'normal' : 'italic'
                }}>
                  {isNote ? h.remarks.replace('📋 President\'s Note: ', '') : h.remarks}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Single application card ──────────────────────────────────────────────────
const ApplicationCard = ({ app }) => {
  const [showHistory, setShowHistory] = useState(false);

  const hasNotes = app.statusHistory?.some(h => h.remarks?.startsWith('📋'));
  const historyCount = app.statusHistory?.length || 0;

  // Latest president note (if any) — shown as a highlighted notice
  const latestNote = [...(app.statusHistory || [])]
    .reverse()
    .find(h => h.remarks?.startsWith('📋'));

  const getStatusBg = (status) => {
    const map = {
      'Physically Delivered': 'rgba(16,185,129,0.08)',
      'Completed': 'rgba(16,185,129,0.08)',
      'Approved': 'rgba(16,185,129,0.08)',
      'Rejected': 'rgba(239,68,68,0.06)',
      'Documents Required': 'rgba(245,158,11,0.08)',
      'Pending': 'rgba(245,158,11,0.06)',
    };
    return map[status] || 'transparent';
  };

  return (
    <div className="campsite-card" style={{ padding: '20px 24px', background: getStatusBg(app.status) }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
        <div>
          <div className="tag-pill tag-sunlit" style={{ marginBottom: '6px' }}>{app.clusterName}</div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-midnight-ink)', margin: 0 }}>
            {app.schemeName}
          </h3>
          <div style={{ fontSize: '13px', color: 'var(--color-slate)', marginTop: '2px' }}>
            Benefit: <span style={{ color: 'var(--color-ember-brown)', fontWeight: '500' }}>{app.benefit}</span>
          </div>
        </div>
        <StatusBadge status={app.status} />
      </div>

      {/* Latest President Note — shown prominently if exists */}
      {latestNote && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(99,179,237,0.08)',
          border: '1px solid rgba(99,179,237,0.25)',
          borderLeft: '3px solid #63b3ed',
          borderRadius: '10px',
          marginBottom: '12px'
        }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-midnight-ink)', lineHeight: '1.5' }}>
            <strong style={{ color: '#3b82f6' }}>💬 Message from Booth President: </strong>
            {latestNote.remarks.replace('📋 President\'s Note: ', '')}
          </p>
          <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--color-slate)' }}>
            {formatDate(latestNote.updatedAt)}
          </p>
        </div>
      )}

      {/* Admin remarks */}
      <div style={{
        padding: '10px 14px',
        background: 'var(--color-fog-gray)',
        borderRadius: '8px',
        borderLeft: '3px solid var(--color-midnight-ink)',
        fontSize: '13px',
        color: 'var(--color-midnight-ink)',
        marginBottom: '12px'
      }}>
        📢 <strong>Status Note:</strong> {app.adminRemarks || 'Application submitted successfully.'}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: 'var(--color-slate)', borderTop: '1px solid var(--color-linen)', paddingTop: '10px' }}>
        <div>Applied: <strong>{formatDate(app.appliedAt)}</strong></div>
        <div>Booth: <strong>{app.boothNo} ({app.assemblyName})</strong></div>
        {app.lastCalledAt && (
          <div style={{ color: 'var(--color-campfire-orange)', fontWeight: '500' }}>
            📞 Admin Called: {formatDate(app.lastCalledAt)}
          </div>
        )}
        {/* Toggle history */}
        {historyCount > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{
              background: 'none',
              border: '1px solid var(--color-linen)',
              borderRadius: '8px',
              padding: '4px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              color: 'var(--color-slate)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: hasNotes ? '700' : '500',
              color: hasNotes ? '#3b82f6' : 'var(--color-slate)'
            }}
          >
            {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {hasNotes ? `💬 Updates (${historyCount})` : `History (${historyCount})`}
          </button>
        )}
      </div>

      {/* Full history timeline */}
      {showHistory && <StatusTimeline history={app.statusHistory} />}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const UserRequests = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await API.get('/schemes/my-requests');
      if (res.data.success) setApplications(res.data.applications);
    } catch (err) {
      console.error('Error fetching my requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  // Count pending notes across all apps
  const totalNotes = applications.reduce((sum, app) =>
    sum + (app.statusHistory?.filter(h => h.remarks?.startsWith('📋')).length || 0), 0
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 className="text-heading" style={{ margin: 0 }}>My Scheme Requests</h1>
          <p className="text-subheading" style={{ fontSize: '14px', marginTop: '2px' }}>
            Track application status and messages from your booth president
          </p>
        </div>
        <button onClick={fetchRequests} className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: '13px' }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Notice if there are unread notes */}
      {totalNotes > 0 && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(99,179,237,0.1)',
          border: '1px solid rgba(99,179,237,0.3)',
          borderLeft: '4px solid #63b3ed',
          borderRadius: '10px',
          marginBottom: '20px',
          fontSize: '13px',
          color: 'var(--color-midnight-ink)'
        }}>
          💬 <strong>Your booth president has sent {totalNotes} message{totalNotes > 1 ? 's' : ''}</strong> regarding your scheme applications. Check the highlighted cards below.
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-slate)' }}>
          Loading your scheme applications...
        </div>
      ) : applications.length === 0 ? (
        <div className="campsite-card" style={{ padding: '48px', textAlign: 'center' }}>
          <FileText size={42} color="var(--color-slate)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-midnight-ink)', marginBottom: '6px' }}>
            No Scheme Applications Found
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--color-slate)', maxWidth: '400px', margin: '0 auto' }}>
            You haven't submitted any BJP Nalam Thittam scheme applications yet.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {applications.map(app => <ApplicationCard key={app._id} app={app} />)}
        </div>
      )}
    </div>
  );
};

export default UserRequests;
