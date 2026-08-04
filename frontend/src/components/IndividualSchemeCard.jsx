import { useState } from 'react';
import { createPortal } from 'react-dom';
import StatusBadge from './StatusBadge';
import '../styles/individual-scheme-card.css';

const BJP_SCHEMES = [
  { id: 1, name: 'PMSBY' }, { id: 2, name: 'PMJJBY' }, { id: 3, name: 'APY' },
  { id: 4, name: 'PM SVANidhi' }, { id: 5, name: 'PM Mudra Shishu' }, { id: 6, name: 'PM Mudra Kishor' },
  { id: 7, name: 'Udyam' }, { id: 8, name: 'Stand Up India' }, { id: 9, name: 'Startup Seed Fund' },
  { id: 10, name: 'PM Kisan' }, { id: 11, name: 'PM Fasal Bima' }, { id: 12, name: 'PM Kisan Maan Dhan' },
  { id: 13, name: 'Ayushman Bharat' }, { id: 14, name: 'ABHA' },
  { id: 15, name: 'PM Ujjwala' }, { id: 16, name: 'PM Matru Vandana' }, { id: 17, name: 'Sukanya Samridhi' },
  { id: 18, name: 'PM Awas Yojana' },
  { id: 19, name: 'PMKVY' }, { id: 20, name: 'NSP Scholarship' }, { id: 21, name: 'PM Vishwakarma' },
  { id: 22, name: 'Jan Dhan' }, { id: 23, name: 'e-Shram' }
];

const resolveSchemeName = (schemeName, schemeId) => {
  const raw = String(schemeName == null ? '' : schemeName).trim();
  const byId = BJP_SCHEMES.find(s => String(s.id) === raw || (schemeId != null && String(s.id) === String(schemeId)));
  if (/^\d+$/.test(raw) && byId) return byId.name;
  const byName = BJP_SCHEMES.find(s => s.name.toLowerCase() === raw.toLowerCase());
  if (byName) return byName.name;
  return raw || (byId ? byId.name : `Scheme ${schemeId || 'N/A'}`);
};

// ─── Delivery Modal ───────────────────────────────────────────────────────────
const DeliveryModal = ({ displaySchemeName, voterInfo, deliveryRemarks, setDeliveryRemarks, updating, onConfirm, onClose }) =>
  createPortal(
    <div className="isc-modal-overlay" onClick={onClose}>
      <div className="isc-modal" onClick={e => e.stopPropagation()}>
        <div className="isc-modal-header">
          <div className="isc-modal-title">
            <span className="isc-modal-icon">✅</span>
            <h3>Mark as Delivered</h3>
          </div>
          <button className="isc-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="isc-modal-body">
          <div className="isc-summary-card">
            <div className="isc-summary-row">
              <span className="isc-summary-key">Scheme</span>
              <span className="isc-summary-val">{displaySchemeName}</span>
            </div>
            <div className="isc-summary-row">
              <span className="isc-summary-key">Voter</span>
              <span className="isc-summary-val">{voterInfo?.voterName} · {voterInfo?.mobile}</span>
            </div>
          </div>
          <div className="isc-field-group">
            <label className="isc-field-label">Delivery Remarks <span className="isc-required">*</span></label>
            <textarea
              className="isc-textarea"
              value={deliveryRemarks}
              onChange={e => setDeliveryRemarks(e.target.value)}
              placeholder="E.g., Form filled and handed to voter. Family members present. Signature received."
              rows={5}
            />
          </div>
        </div>
        <div className="isc-modal-footer">
          <button className="isc-btn isc-btn--ghost" onClick={onClose} disabled={updating}>Cancel</button>
          <button className="isc-btn isc-btn--primary" onClick={onConfirm} disabled={updating || !deliveryRemarks.trim()}>
            {updating ? '⏳ Saving…' : '✅ Confirm & Save'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );

// ─── Comment Modal ────────────────────────────────────────────────────────────
const CommentModal = ({ displaySchemeName, voterInfo, comment, setComment, updating, onConfirm, onClose }) =>
  createPortal(
    <div className="isc-modal-overlay" onClick={onClose}>
      <div className="isc-modal" onClick={e => e.stopPropagation()}>
        <div className="isc-modal-header isc-modal-header--comment">
          <div className="isc-modal-title">
            <span className="isc-modal-icon">💬</span>
            <h3>Message to Voter</h3>
          </div>
          <button className="isc-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="isc-modal-body">

          {/* Scheme + Voter info */}
          <div className="isc-summary-card">
            <div className="isc-summary-row">
              <span className="isc-summary-key">Scheme</span>
              <span className="isc-summary-val">{displaySchemeName}</span>
            </div>
            <div className="isc-summary-row">
              <span className="isc-summary-key">Voter</span>
              <span className="isc-summary-val">{voterInfo?.voterName} · {voterInfo?.mobile}</span>
            </div>
          </div>

          {/* Info notice */}
          <div className="isc-comment-notice">
            <span className="isc-comment-notice-icon">📋</span>
            <p>This message will be saved in the scheme history and <strong>visible to the voter</strong> when they log in.</p>
          </div>

          {/* Comment input */}
          <div className="isc-field-group">
            <label className="isc-field-label">
              Your Message <span className="isc-required">*</span>
            </label>
            <textarea
              className="isc-textarea isc-textarea--comment"
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="E.g., Kindly share your Aadhaar and PAN card at the booth. Your application is under review."
              rows={5}
            />
            <span className="isc-char-count">{comment.length} / 500</span>
          </div>

        </div>
        <div className="isc-modal-footer">
          <button className="isc-btn isc-btn--ghost" onClick={onClose} disabled={updating}>Cancel</button>
          <button
            className="isc-btn isc-btn--comment"
            onClick={onConfirm}
            disabled={updating || !comment.trim()}
          >
            {updating ? '⏳ Sending…' : '💬 Send Message'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );

// ─── Main Card ────────────────────────────────────────────────────────────────
const IndividualSchemeCard = ({ application, onUpdateStatus, voterInfo }) => {
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [deliveryRemarks, setDeliveryRemarks] = useState('');
  const [comment, setComment] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleMarkDelivered = async () => {
    if (!deliveryRemarks.trim()) { alert('Please add delivery remarks'); return; }
    setUpdating(true);
    try {
      await onUpdateStatus(application._id, { status: 'Physically Delivered', deliveryRemarks });
      setShowDeliveryModal(false);
      setDeliveryRemarks('');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleSendComment = async () => {
    if (!comment.trim()) { alert('Please write a message'); return; }
    setUpdating(true);
    try {
      // Keep current status, just add a comment to the history log
      await onUpdateStatus(application._id, {
        status: application.status,        // status unchanged
        remarks: `📋 President's Note: ${comment.trim()}`,
        isComment: true
      });
      setShowCommentModal(false);
      setComment('');
      setShowHistory(true); // auto-open history so admin can see it was logged
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleQuickUpdate = async (newStatus, remarks) => {
    setUpdating(true);
    try {
      await onUpdateStatus(application._id, { status: newStatus, remarks: remarks || `Status updated to ${newStatus}` });
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const map = {
      'Pending': '#f59e0b', 'Documents Required': '#f59e0b',
      'Called': '#3b82f6', 'In Progress': '#3b82f6', 'Processing': '#3b82f6',
      'Verified': '#8b5cf6',
      'Approved': '#10b981', 'Physically Delivered': '#10b981', 'Completed': '#10b981',
      'Rejected': '#ef4444'
    };
    return map[status] || '#6b7280';
  };

  const isClosed = ['Physically Delivered', 'Completed', 'Approved', 'Rejected'].includes(application.status);
  const displaySchemeName = resolveSchemeName(application.schemeName, application.schemeId);

  // Count comments in history (lines starting with 📋)
  const commentCount = application.statusHistory?.filter(h => h.remarks?.startsWith('📋')).length || 0;

  return (
    <>
      <div className="individual-scheme-card">

        {/* Header */}
        <div className="scheme-card-header">
          <div className="scheme-card-title">
            <h4>{displaySchemeName}</h4>
            <span className="scheme-id">ID: {application.schemeId}</span>
          </div>
          <StatusBadge
            status={application.status}
            style={{
              backgroundColor: `${getStatusColor(application.status)}20`,
              color: getStatusColor(application.status),
              border: `1px solid ${getStatusColor(application.status)}40`
            }}
          />
        </div>

        {/* Info */}
        <div className="scheme-card-info">
          <div className="info-row">
            <span className="info-label">Applied</span>
            <span className="info-value">{formatDate(application.appliedAt)}</span>
          </div>
          {application.deliveryDetails?.deliveredAt && (
            <>
              <div className="info-row">
                <span className="info-label">✅ Delivered</span>
                <span className="info-value">{formatDate(application.deliveryDetails.deliveredAt)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">By</span>
                <span className="info-value">
                  {application.deliveryDetails.deliveredByName || application.deliveryDetails.deliveredBy}
                </span>
              </div>
              {application.deliveryDetails.remarks && (
                <div className="delivery-remarks">
                  <strong>Remarks:</strong> {application.deliveryDetails.remarks}
                </div>
              )}
            </>
          )}
          {application.metrics?.daysToDeliver && (
            <div className="info-row metrics">
              <span className="info-label">⏱️ Delivery Time</span>
              <span className="info-value">{application.metrics.daysToDeliver} days</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="scheme-card-actions">
          {!isClosed && (
            <>
              <button className="btn-primary btn-sm" onClick={() => setShowDeliveryModal(true)} disabled={updating}>
                ✅ Mark as Delivered
              </button>
              <button className="btn-secondary btn-sm"
                onClick={() => handleQuickUpdate('Documents Required', 'Documents requested from voter')}
                disabled={updating}>
                📄 Need Docs
              </button>
              <button className="btn-secondary btn-sm"
                onClick={() => handleQuickUpdate('In Progress', 'Processing application')}
                disabled={updating}>
                🔄 In Progress
              </button>
              <button className="btn-danger btn-sm"
                onClick={() => handleQuickUpdate('Rejected', 'Application rejected by booth admin')}
                disabled={updating}>
                ✕ Reject
              </button>
            </>
          )}
          {/* Comment button — always visible, on any status */}
          <button
            className="btn-comment btn-sm"
            onClick={() => setShowCommentModal(true)}
            disabled={updating}
          >
            💬 Comment{commentCount > 0 ? ` (${commentCount})` : ''}
          </button>
          <button className="btn-ghost btn-sm" onClick={() => setShowHistory(!showHistory)}>
            {showHistory ? '▼' : '▶'} History ({application.statusHistory?.length || 0})
          </button>
        </div>

        {/* History */}
        {showHistory && (
          <div className="scheme-history">
            <h5>Status History</h5>
            {application.statusHistory?.length === 0 && (
              <p className="history-empty">No updates yet.</p>
            )}
            {application.statusHistory?.map((h, idx) => {
              const isNote = h.remarks?.startsWith('📋');
              return (
                <div key={idx} className={`history-item ${isNote ? 'history-item--note' : ''}`}>
                  <div className="history-status">
                    <strong>{isNote ? '💬 President\'s Note' : h.status}</strong>
                    <span className="history-date">{formatDate(h.updatedAt)}</span>
                  </div>
                  <div className="history-by">by {h.updatedBy}</div>
                  {h.remarks && (
                    <div className={`history-remarks ${isNote ? 'history-remarks--note' : ''}`}>
                      {isNote ? h.remarks.replace('📋 President\'s Note: ', '') : h.remarks}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delivery Portal Modal */}
      {showDeliveryModal && (
        <DeliveryModal
          displaySchemeName={displaySchemeName}
          voterInfo={voterInfo}
          deliveryRemarks={deliveryRemarks}
          setDeliveryRemarks={setDeliveryRemarks}
          updating={updating}
          onConfirm={handleMarkDelivered}
          onClose={() => setShowDeliveryModal(false)}
        />
      )}

      {/* Comment Portal Modal */}
      {showCommentModal && (
        <CommentModal
          displaySchemeName={displaySchemeName}
          voterInfo={voterInfo}
          comment={comment}
          setComment={setComment}
          updating={updating}
          onConfirm={handleSendComment}
          onClose={() => setShowCommentModal(false)}
        />
      )}
    </>
  );
};

export default IndividualSchemeCard;
