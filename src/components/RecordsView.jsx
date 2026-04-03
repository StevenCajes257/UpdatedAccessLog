import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { ref, onValue } from 'firebase/database';
import { 
  LogIn, LogOut, Users, RefreshCw, User, 
  Briefcase, GraduationCap, BookOpen, Clock, Calendar 
} from 'lucide-react';
import './RecordsView.css';

export default function RecordsView() {
  const [attendance, setAttendance] = useState({});
  const [photos, setPhotos] = useState({});
  const [currentTime, setCurrentTime] = useState(new Date());

  const getLocalDate = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return (new Date(now - offset)).toISOString().split('T')[0];
  };

  const today = getLocalDate();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const attendanceRef = ref(db, `attendance/${today}`);
    const unsubscribeAttendance = onValue(attendanceRef, (snap) => setAttendance(snap.val() || {}));

    const photosRef = ref(db, 'user_photos');
    const unsubscribePhotos = onValue(photosRef, (snap) => setPhotos(snap.val() || {}));

    return () => {
        unsubscribeAttendance();
        unsubscribePhotos();
    }
  }, [today]);

  const recordsArray = Object.entries(attendance)
    .map(([key, data]) => ({ recordId: key, ...data }))
    .filter(r => r.role !== 'Admin' && r.role !== 'Administrator')
    .sort((a, b) => new Date(b.timeIn) - new Date(a.timeIn));

  const instructors = recordsArray.filter(r => r.role?.toLowerCase() === 'instructor');
  const staff = recordsArray.filter(r => r.role?.toLowerCase() === 'staff');
  const students = recordsArray.filter(r => r.role?.toLowerCase() === 'student');
  const totalLogouts = recordsArray.filter(r => r.timeOut && r.timeOut !== "--").length;

  const formatTime = (timeStr) => {
    if (!timeStr || timeStr === "--") return '--:--';
    const date = new Date(timeStr);
    return isNaN(date.getTime()) ? timeStr : date.toLocaleTimeString('en-US', { 
      hour: '2-digit', minute: '2-digit', hour12: true 
    });
  };

  const renderActivityGroup = (title, icon, data) => (
    <div className="records-card-wide">
      <div className="records-card-header">
        <div className="header-title-flex">
          <div className="icon-box-small">{icon}</div>
          <h3>{title}</h3>
        </div>
        <span className="count-pill">{data.length} Total Logs</span>
      </div>
      <div className="records-list-container">
        {data.length > 0 ? data.map((record, index) => {
          const userRfid = record.rfid || record.uid || record.recordId;
          const userPhoto = photos[userRfid]?.image;
          const isOut = record.timeOut && record.timeOut !== '--';

          return (
            <div key={index} className="record-row-wide">
              <div className="user-profile-section">
                <div className="record-avatar-large">
                  {userPhoto ? <img src={userPhoto} alt="" /> : <User size={20} />}
                </div>
                <div className="record-text">
                  <span className="record-name-large">{record.name}</span>
                  <span className="record-status-label">{isOut ? 'Session Closed' : 'Currently On-Site'}</span>
                </div>
              </div>

              <div className="record-data-section">
                <div className="data-point">
                  <span className="data-label">TIME IN</span>
                  <span className="data-value">{formatTime(record.timeIn)}</span>
                </div>
                <div className="data-point">
                  <span className="data-label">TIME OUT</span>
                  <span className={`data-value ${!isOut ? 'pending' : ''}`}>
                    {formatTime(record.timeOut)}
                  </span>
                </div>
                <div className={`wide-status-badge ${isOut ? 'is-out' : 'is-in'}`}>
                  {isOut ? <LogOut size={14}/> : <LogIn size={14}/>}
                  {isOut ? 'Completed' : 'Logged In'}
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="empty-state-wide">No activity recorded in this category.</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="records-full-viewport">
      <header className="records-main-nav">
        <div className="nav-brand">
          <h1>Activity Records</h1>
          <div className="live-indicator">
            <span className="dot"></span>
            LIVE UPDATES
          </div>
        </div>

        <div className="nav-controls">
          <div className="nav-clock">
            <Clock size={16} />
            {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </div>
          <div className="nav-date">
             <Calendar size={16} />
             {currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          <button className="nav-refresh-btn" onClick={() => window.location.reload()}>
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      <div className="wide-stats-container">
        <div className="wide-stat-card">
          <div className="stat-icon-circle blue"><LogIn size={24}/></div>
          <div className="stat-text">
            <h2>{recordsArray.length}</h2>
            <p>Total Entries</p>
          </div>
        </div>
        <div className="wide-stat-card">
          <div className="stat-icon-circle orange"><LogOut size={24}/></div>
          <div className="stat-text">
            <h2>{totalLogouts}</h2>
            <p>Total Exits</p>
          </div>
        </div>
        <div className="wide-stat-card">
          <div className="stat-icon-circle green"><Users size={24}/></div>
          <div className="stat-text">
            <h2>{recordsArray.length - totalLogouts}</h2>
            <p>Active Users</p>
          </div>
        </div>
      </div>

      <div className="records-vertical-stack">
        {renderActivityGroup("Instructors", <BookOpen size={20} />, instructors)}
        {renderActivityGroup("Staff Members", <Briefcase size={20} />, staff)}
        {renderActivityGroup("Student Registry", <GraduationCap size={20} />, students)}
      </div>
    </div>
  );
}