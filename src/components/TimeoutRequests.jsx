import React, { useState, useEffect } from 'react';
import { database as db } from '../firebaseConfig';
import { ref, onValue, update, get } from 'firebase/database';
import { CheckCircle, XCircle, Clock, User, Calendar, MessageSquare, Loader2 } from 'lucide-react';
import './TimeoutRequests.css';

export default function TimeoutRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    const requestsRef = ref(db, 'timeout_requests');
    const unsubscribe = onValue(requestsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const requestsList = [];
      for (const [id, req] of Object.entries(data)) {
        if (req.status === 'pending') {
          requestsList.push({ id, ...req });
        }
      }
      requestsList.sort((a, b) => b.requestedAt - a.requestedAt);
      setRequests(requestsList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const approveRequest = async (request) => {
    if (processingId) return;
    setProcessingId(request.id);
    try {
      // 1. Update the attendance log with server timestamp
      const logPath = `/attendance/${request.date}/${request.logId}`;
      const logRef = ref(db, logPath);
      const logSnap = await get(logRef);
      if (!logSnap.exists()) {
        alert('Attendance log not found. It may have been deleted.');
        return;
      }
      const currentLog = logSnap.val();
      if (currentLog.timeOut && currentLog.timeOut !== '--') {
        alert('This session already has a time-out. Cannot approve.');
        return;
      }
      await update(logRef, { timeOut: { '.sv': 'timestamp' } });

      // 2. Update tracker for this user on this date
      // Extract session number from logId (format: "UID_S1", "UID_S2", etc.)
      let session = 1;
      const sessionMatch = request.logId.match(/_S(\d+)$/);
      if (sessionMatch) session = parseInt(sessionMatch[1], 10);
      const trackerPath = `/trackers/${request.date}/${request.userId}`;
      const trackerRef = ref(db, trackerPath);
      const trackerSnap = await get(trackerRef);
      let currentSession = session;
      let currentStatus = 'IN'; // assume IN because request is for missing OUT
      if (trackerSnap.exists()) {
        const tData = trackerSnap.val();
        if (tData.session) currentSession = tData.session;
        if (tData.status) currentStatus = tData.status;
      }
      // If status is already OUT, do nothing, but normally it should be IN.
      if (currentStatus !== 'OUT') {
        await update(trackerRef, {
          status: 'OUT',
          session: currentSession + 1
        });
      }

      // 3. Mark request as resolved
      const requestRef = ref(db, `timeout_requests/${request.id}`);
      await update(requestRef, { status: 'resolved', resolvedAt: Date.now() });

      alert(`Time-out for ${request.userName} has been approved and logged. The user can now tap IN again.`);
    } catch (error) {
      console.error('Approve failed:', error);
      alert('Failed to approve request. Check console.');
    } finally {
      setProcessingId(null);
    }
  };

  const rejectRequest = async (request) => {
    if (processingId) return;
    setProcessingId(request.id);
    try {
      const requestRef = ref(db, `timeout_requests/${request.id}`);
      await update(requestRef, { status: 'rejected', rejectedAt: Date.now() });
      alert(`Request from ${request.userName} has been rejected.`);
    } catch (error) {
      console.error('Reject failed:', error);
      alert('Failed to reject request.');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="timeout-requests-container">
        <div className="loader-box"><Loader2 className="spinner" /></div>
      </div>
    );
  }

  return (
    <div className="timeout-requests-container">
      <div className="timeout-header">
        <h2>Pending Time‑Out Requests</h2>
        <p>Approve or reject requests from students/instructors who forgot to tap out.</p>
      </div>

      {requests.length === 0 ? (
        <div className="empty-requests">
          <Clock size={48} />
          <p>No pending requests</p>
          <small>All requests have been handled.</small>
        </div>
      ) : (
        <div className="requests-list">
          {requests.map((req) => (
            <div key={req.id} className="request-card">
              <div className="request-header">
                <div className="user-icon">
                  <User size={20} />
                </div>
                <div className="request-user">
                  <strong>{req.userName}</strong>
                  <span className="user-id">ID: {req.userId}</span>
                </div>
                <div className="request-date">
                  <Calendar size={14} />
                  <span>{req.date}</span>
                </div>
              </div>
              <div className="request-message">
                <MessageSquare size={14} />
                <span>{req.message || 'No message provided.'}</span>
              </div>
              <div className="request-meta">
                <span>Requested: {formatDate(req.requestedAt)}</span>
              </div>
              <div className="request-actions">
                <button 
                  className="btn-approve"
                  onClick={() => approveRequest(req)}
                  disabled={processingId === req.id}
                >
                  <CheckCircle size={16} />
                  {processingId === req.id ? 'Processing...' : 'Approve'}
                </button>
                <button 
                  className="btn-reject"
                  onClick={() => rejectRequest(req)}
                  disabled={processingId === req.id}
                >
                  <XCircle size={16} />
                  {processingId === req.id ? 'Processing...' : 'Reject'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}