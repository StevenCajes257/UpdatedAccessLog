import React, { useState, useEffect } from 'react';
import { database as db } from '../firebaseConfig';
import { ref, onValue, push, set } from 'firebase/database';
import { LogIn, LogOut, Clock, User, Calendar, MapPin, AlertCircle } from 'lucide-react';
import './IndividualLogs.css';

export default function IndividualLogs({ user, userId, showRequestModal, onRequestModalClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestMessage, setRequestMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [internalShowModal, setInternalShowModal] = useState(false);
  
  const today = new Date().toISOString().split('T')[0];
  const fullName = `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`;
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  useEffect(() => {
    if (showRequestModal) {
      setInternalShowModal(true);
      setRequestMessage('');
      setRequestError('');
    }
  }, [showRequestModal]);

  const getActiveSession = (logsArray) => {
    const sorted = [...logsArray].sort((a, b) => {
      const timeA = a.timeIn || a.timestamp || 0;
      const timeB = b.timeIn || b.timestamp || 0;
      return timeB - timeA;
    });
    const latest = sorted[0];
    if (latest && (
        (latest.timeIn && (!latest.timeOut || latest.timeOut === '--')) ||
        (latest.status === 'IN')
      )) {
      return latest;
    }
    return null;
  };

  const activeSession = getActiveSession(logs);

  useEffect(() => {
    const attendanceRef = ref(db, `attendance/${today}`);
    const unsubscribe = onValue(attendanceRef, (snapshot) => {
      const todayData = snapshot.val() || {};
      const userLogs = [];

      Object.entries(todayData).forEach(([entryId, entry]) => {
        if (entry.name === user.name) {
          userLogs.push({
            ...entry,
            id: entryId,
            logType: entry.timeIn ? 'session' : (entry.status ? 'status' : 'other')
          });
        }
      });

      userLogs.sort((a, b) => {
        const timeA = a.timeIn || 0;
        const timeB = b.timeIn || 0;
        return timeB - timeA;
      });

      setLogs(userLogs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, today]);

  const formatTime = (timestamp) => {
    if (!timestamp || timestamp === '--') return '--:--';
    if (typeof timestamp === 'number') {
      return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
    if (typeof timestamp === 'string' && !isNaN(Number(timestamp))) {
      return new Date(Number(timestamp)).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
    return timestamp;
  };

  const submitTimeoutRequest = async () => {
    if (!activeSession) {
      setRequestError('No active session found. You cannot request a time-out.');
      return;
    }
    if (!userId) {
      setRequestError('User identification missing. Please log out and log in again.');
      return;
    }
    setIsSubmitting(true);
    setRequestError('');
    try {
      const requestRef = ref(db, 'timeout_requests');
      const newRequestRef = push(requestRef);
      await set(newRequestRef, {
        userId: userId,                      // ✅ use the passed userId (RFID)
        userName: user.name,
        logId: activeSession.id,
        date: today,
        message: requestMessage.trim() || 'No message provided',
        requestedAt: Date.now(),
        status: 'pending'
      });
      setInternalShowModal(false);
      onRequestModalClose();
      setRequestMessage('');
      alert('Your request has been submitted. Admin will review it shortly.');
    } catch (error) {
      console.error('Failed to submit request:', error);
      setRequestError('Network error. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setInternalShowModal(false);
    onRequestModalClose();
    setRequestMessage('');
    setRequestError('');
  };

  if (loading) {
    return (
      <div className="individual-loading">
        <div className="spinner"></div>
        <p>Loading your records...</p>
      </div>
    );
  }

  return (
    <div className="individual-logs-fullscreen">
      {internalShowModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="request-timeout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon warning">
              <AlertCircle size={48} />
            </div>
            <h3>Request Manual Time‑Out</h3>
            <p>
              You have an active session (<strong>{activeSession?.timeIn ? formatTime(activeSession.timeIn) : 'In'}</strong>).<br/>
              If you forgot to tap out, an admin can close it for you.
            </p>
            <textarea
              className="request-message-input"
              placeholder="Optional: Provide a reason or note (e.g., device was off, I left early)"
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              rows="3"
            />
            {requestError && <div className="request-error">{requestError}</div>}
            <div className="modal-buttons">
              <button className="btn-cancel" onClick={closeModal}>Cancel</button>
              <button className="btn-confirm-request" onClick={submitTimeoutRequest} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="profile-header">
        <div className="avatar-badge">
          <User size={32} />
        </div>
        <div className="title-section">
          <h1>{fullName}</h1>
          <p className="subtitle">Logs • Today's Logs</p>
        </div>
      </div>

      <div className="stats-bar">
        <div className="stat-item">
          <Calendar size={18} />
          <span>{currentDate}</span>
        </div>
        <div className="stat-item">
          <MapPin size={18} />
          <span>{user.department || 'No department'}</span>
        </div>
        <div className="stat-item">
          <Clock size={18} />
          <span>{logs.length} {logs.length === 1 ? 'entry' : 'entries'} today</span>
        </div>
      </div>

      <div className="logs-card">
        {logs.length === 0 ? (
          <div className="empty-state">
            <LogOut size={56} />
            <h3>No attendance records</h3>
            <p>You haven't been scanned today or you haven't checked in yet.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="modern-attendance-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Time In</th>
                  <th>Time Out</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => {
                  const isSession = log.timeIn !== undefined;
                  const timeIn = isSession ? formatTime(log.timeIn) : (log.status === 'IN' ? formatTime(log.timestamp) : '--');
                  const timeOut = isSession ? formatTime(log.timeOut) : (log.status === 'OUT' ? formatTime(log.timestamp) : '--');
                  const status = isSession 
                    ? (log.timeOut && log.timeOut !== '--' ? 'Completed' : 'Active')
                    : (log.status === 'IN' ? 'Active' : 'Completed');
                  const isActive = status === 'Active';
                  return (
                    <tr key={idx}>
                      <td className="name-cell">{fullName}</td>
                      <td className="time-cell">{timeIn}</td>
                      <td className="time-cell">{timeOut}</td>
                      <td className={`status-badge ${isActive ? 'active' : 'completed'}`}>
                        {isActive ? <LogIn size={14} /> : <LogOut size={14} />}
                        {status}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="footer-note">
        <small>This page shows only today's attendance for your account. For older records, contact the admin.</small>
        {activeSession && (
          <div className="active-session-note">
            <span>⚠️ You have an active session. </span>
            <button className="inline-request-btn" onClick={() => setInternalShowModal(true)}>
              Request time‑out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}