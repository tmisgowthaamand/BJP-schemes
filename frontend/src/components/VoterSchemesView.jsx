import React, { useState } from 'react';
import IndividualSchemeCard from './IndividualSchemeCard';
import '../styles/voter-schemes-view.css';

const VoterSchemesView = ({ voter, onUpdateStatus, onClose }) => {
  const [expandedSchemes, setExpandedSchemes] = useState(true);

  const applications = voter.applications || [];
  const deliveredCount = applications.filter(app => 
    ['Physically Delivered', 'Completed', 'Approved'].includes(app.status)
  ).length;
  const pendingCount = applications.length - deliveredCount;

  return (
    <div className="voter-schemes-view">
      <div className="voter-schemes-header">
        <div className="voter-info-header">
          <button className="btn-back" onClick={onClose}>
            ← Back
          </button>
          <div className="voter-details">
            <h2>{voter.voterName}</h2>
            <div className="voter-meta">
              <span>📞 {voter.mobile}</span>
              <span>🆔 {voter.epicNo}</span>
              <span>🗳️ Booth {voter.boothNo}</span>
            </div>
          </div>
        </div>

        <div className="schemes-summary">
          <div className="summary-card">
            <div className="summary-number">{applications.length}</div>
            <div className="summary-label">Total Schemes</div>
          </div>
          <div className="summary-card success">
            <div className="summary-number">{deliveredCount}</div>
            <div className="summary-label">✅ Delivered</div>
          </div>
          <div className="summary-card pending">
            <div className="summary-number">{pendingCount}</div>
            <div className="summary-label">⏳ Pending</div>
          </div>
        </div>
      </div>

      <div className="schemes-list-container">
        <div className="schemes-list-header">
          <h3>
            <button 
              className="toggle-btn"
              onClick={() => setExpandedSchemes(!expandedSchemes)}
            >
              {expandedSchemes ? '▼' : '▶'}
            </button>
            Individual Scheme Applications ({applications.length})
          </h3>
        </div>

        {expandedSchemes && (
          <div className="schemes-list">
            {applications.length === 0 ? (
              <div className="no-schemes">
                <p>No scheme applications found for this voter.</p>
              </div>
            ) : (
              applications.map((app, index) => (
                <div key={app._id} className="scheme-item">
                  <div className="scheme-number">#{index + 1}</div>
                  <IndividualSchemeCard 
                    application={app}
                    onUpdateStatus={onUpdateStatus}
                    voterInfo={{
                      voterName: voter.voterName,
                      mobile: voter.mobile,
                      epicNo: voter.epicNo
                    }}
                  />
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoterSchemesView;
