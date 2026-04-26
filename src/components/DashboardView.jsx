import React, { useState, useEffect } from 'react';
import { database as db } from '../firebaseConfig';
import { ref, onValue } from 'firebase/database';
import { Users, UserCheck, Clock, Activity, Wifi, WifiOff, LayoutDashboard, TrendingUp } from 'lucide-react';
import './DashboardView.css';

export default function DashboardView() {
  const [stats, setStats] = useState({ totalUsers: 0, inside: 0, logsToday: 0 });
  const [isOnline, setIsOnline] = useState(false);
  const [liveFeed, setLiveFeed] = useState([]);
  const [insideList, setInsideList] = useState([]);
  const [weeklyStats, setWeeklyStats] = useState([]);

  const getLocalDate = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return (new Date(now - offset)).toISOString().split('T')[0];
  };

  // Get last 7 days for weekly stats
  const getLast7Days = () => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const offset = date.getTimezoneOffset() * 60000;
      dates.push((new Date(date - offset)).toISOString().split('T')[0]);
    }
    return dates;
  };

  useEffect(() => {
    const todayISO = getLocalDate();
    const last7Days = getLast7Days();

    const connectedRef = ref(db, '.info/connected');
    onValue(connectedRef, (snap) => {
      setIsOnline(snap.val() === true);
    });

    const usersRef = ref(db, 'users');
    onValue(usersRef, (snap) => {
      const data = snap.val() || {};
      const nonAdminUsers = Object.values(data).filter(user => 
        user.role !== 'Admin' && user.role !== 'Administrator'
      );
      setStats(prev => ({ ...prev, totalUsers: nonAdminUsers.length }));
    });

    const attendanceRef = ref(db, `attendance/${todayISO}`);
    onValue(attendanceRef, (snap) => {
      const data = snap.val() || {};
      const allRecords = Object.values(data);
      const filteredRecords = allRecords.filter(r => 
        r.role !== 'Admin' && r.role !== 'Administrator'
      );

      const currentlyInside = filteredRecords.filter(r => 
        r.timeIn && (!r.timeOut || r.timeOut === "" || r.timeOut === "--")
      );
      
      const inLogsCount = filteredRecords.filter(r => r.timeIn).length;

      setStats(prev => ({
        ...prev,
        inside: currentlyInside.length,
        logsToday: inLogsCount
      }));

      setInsideList(currentlyInside.slice(0, 10));

      const events = [];
      filteredRecords.forEach(r => {
        if (r.timeIn) events.push({ name: r.name, time: r.timeIn, type: 'In' });
        if (r.timeOut && r.timeOut !== "--") events.push({ name: r.name, time: r.timeOut, type: 'Out' });
      });
      setLiveFeed(events.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8));
    });

    // Fetch weekly stats
    const fetchWeeklyStats = async () => {
      const weeklyData = [];
      for (const date of last7Days) {
        const dateRef = ref(db, `attendance/${date}`);
        onValue(dateRef, (snap) => {
          const data = snap.val() || {};
          const records = Object.values(data);
          const filtered = records.filter(r => r.role !== 'Admin' && r.role !== 'Administrator');
          const count = filtered.filter(r => r.timeIn).length;
          
          setWeeklyStats(prev => {
            const existing = prev.find(w => w.date === date);
            if (existing) {
              return prev.map(w => w.date === date ? { ...w, count } : w);
            }
            return [...prev, { date, count }];
          });
        }, { onlyOnce: true });
      }
    };
    
    fetchWeeklyStats();
  }, []);

  const formatTime = (timeStr) => {
    if (!timeStr || timeStr === "--") return '--:--';
    const date = new Date(timeStr);
    return isNaN(date.getTime()) ? timeStr : date.toLocaleTimeString('en-US', { 
      hour: '2-digit', minute: '2-digit', hour12: true 
    });
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const maxWeeklyCount = Math.max(...weeklyStats.map(w => w.count), 1);

  return (
    <div className="dashboard-viewport">
      {/* Status Indicator - Small and subtle */}
      <div className={`status-indicator ${isOnline ? 'online' : 'offline'}`}>
        {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
        <span>{isOnline ? 'Live' : 'Offline'}</span>
      </div>

      {/* Top Stats Row */}
      <div className="stats-grid">
        <div className="mini-card">
          <div className="card-content">
            <span className="card-title">Total Users</span>
            <h2 className="card-value">{stats.totalUsers}</h2>
            <span className="card-subtext">Registered Personnel</span>
          </div>
          <div className="card-icon-wrapper users">
            <Users size={24} />
          </div>
        </div>

        <div className="mini-card">
          <div className="card-content">
            <span className="card-title">Currently Inside</span>
            <h2 className="card-value">{stats.inside}</h2>
            <span className="card-subtext">Active on Campus</span>
          </div>
          <div className="card-icon-wrapper inside">
            <UserCheck size={24} />
          </div>
        </div>

        <div className="mini-card">
          <div className="card-content">
            <span className="card-title">Today's In-Logs</span>
            <h2 className="card-value">{stats.logsToday}</h2>
            <span className="card-subtext">Total Entries Today</span>
          </div>
          <div className="card-icon-wrapper logs">
            <Clock size={24} />
          </div>
        </div>
      </div>

      {/* Weekly Stats Bar Chart */}
      <div className="weekly-stats-card">
        <div className="card-header-inner">
          <h3><TrendingUp size={18} /> Weekly Activity</h3>
          <p>Last 7 days entry count</p>
        </div>
        <div className="weekly-chart">
          {weeklyStats.map((week) => (
            <div key={week.date} className="chart-bar-container">
              <div className="chart-bar-label">{formatDate(week.date)}</div>
              <div className="chart-bar-wrapper">
                <div 
                  className="chart-bar" 
                  style={{ 
                    height: `${(week.count / maxWeeklyCount) * 100}%`,
                    minHeight: week.count > 0 ? '4px' : '0'
                  }}
                />
              </div>
              <div className="chart-bar-value">{week.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Row */}
      <div className="main-grid">
        <div className="large-card">
          <div className="card-header-inner">
            <h3><Activity size={18} /> Currently Inside</h3>
            <p>Personnel yet to log out</p>
          </div>
          <div className="card-body">
            {insideList.length > 0 ? (
              <ul className="activity-list">
                {insideList.map((user, i) => (
                  <li key={i} className="list-item">
                    <span className="user-name-text">{user.name}</span>
                    <span className="time-badge">In: {formatTime(user.timeIn)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-text">No one currently inside</p>
            )}
          </div>
        </div>

        <div className="large-card">
          <div className="card-header-inner">
            <h3><LayoutDashboard size={18} /> Recent Activity</h3>
            <p>Latest entry/exit events</p>
          </div>
          <div className="card-body">
            {liveFeed.length > 0 ? (
              <ul className="activity-list">
                {liveFeed.map((log, i) => (
                  <li key={i} className="list-item">
                    <div className="activity-info">
                      <strong className="user-name-text">{log.name}</strong>
                      <span className={`type-tag ${log.type.toLowerCase()}`}>{log.type}</span>
                    </div>
                    <span className="time-text">{formatTime(log.time)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-text">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}