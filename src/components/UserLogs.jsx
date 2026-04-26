import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Loader2, 
  User,
  ArrowRight
} from 'lucide-react';
import { database as db } from '../firebaseConfig';
import { ref, onValue } from 'firebase/database';
import SeeLogs from './SeeLogs'; 
import './UserLogs.css';

export default function UserLogs({ user, reportType, onBack }) {
  const [logData, setLogData] = useState({});
  const [selectedPeriods, setSelectedPeriods] = useState([]); 
  const [viewingLogs, setViewingLogs] = useState(false); 
  const [loading, setLoading] = useState(true);
  
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filterYear, setFilterYear] = useState(() => new Date().getFullYear().toString());

  useEffect(() => {
    const attendanceRef = ref(db, 'attendance');
    const unsubscribe = onValue(attendanceRef, (snap) => {
      setLogData(snap.val() || {});
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const periods = useMemo(() => {
    if (reportType === 'Monthly') {
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      return months.map((monthName, index) => {
        const monthNum = String(index + 1).padStart(2, '0');
        const daysInMonth = new Date(parseInt(filterYear), index + 1, 0).getDate();
        const datesArray = Array.from({ length: daysInMonth }, (_, i) => `${filterYear}-${monthNum}-${String(i + 1).padStart(2, '0')}`);
        return { id: `${filterYear}-${monthNum}`, label: `${monthName} ${filterYear}`, subLabel: null, dates: datesArray };
      });
    }

    if (!filterMonth) return [];
    const [year, month] = filterMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const allDates = Array.from({ length: daysInMonth }, (_, i) => `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`);

    if (reportType === 'Weekly') {
      const weeks = [];
      let currentWeekDates = [];
      let weekNumber = 1;
      allDates.forEach((dateStr) => {
        const dateObj = new Date(dateStr);
        currentWeekDates.push(dateStr);
        if (dateObj.getDay() === 6 || dateObj.getDate() === daysInMonth) {
          weeks.push({ 
            id: `Week ${weekNumber}`, 
            label: `Week ${weekNumber}`, 
            subLabel: `${new Date(currentWeekDates[0]).getDate()} - ${new Date(currentWeekDates[currentWeekDates.length - 1]).getDate()}`,
            dates: [...currentWeekDates] 
          });
          currentWeekDates = [];
          weekNumber++;
        }
      });
      return weeks.reverse();
    }

    return allDates.map(date => ({ id: date, label: date, subLabel: null, dates: [date] })).reverse();
  }, [filterMonth, filterYear, reportType]);

  const availablePeriods = useMemo(() => {
    const userId = user?.id;
    const userName = String(user?.name || '').trim();

    return periods.map(period => {
      let userLogs = [];

      period.dates.forEach(date => {
        const dayData = logData[date];
        if (!dayData) return;
        
        Object.entries(dayData).forEach(([entryKey, entry]) => {
          const entryUid = String(entry.uid || '').trim();
          const entryName = String(entry.name || '').trim();
          
          let isMatch = false;
          if (userId && (entryKey === userId || entryUid === userId)) {
            isMatch = true;
          }
          else if (userName && entryName === userName) {
            isMatch = true;
          }
          
          if (isMatch) {
            if (entry.timeIn || entry.timeOut) {
              userLogs.push({
                ...entry,
                date,
                entryKey,
                logType: 'session'
              });
            }
            else if (entry.status) {
              userLogs.push({
                ...entry,
                date,
                entryKey,
                logType: 'status'
              });
            }
          }
        });
      });

      const ins = userLogs.filter(log => {
        if (log.logType === 'session') return log.timeIn && log.timeIn !== '--';
        return log.status === 'IN';
      }).length;

      const outs = userLogs.filter(log => {
        if (log.logType === 'session') return log.timeOut && log.timeOut !== '--';
        return log.status === 'OUT';
      }).length;

      const totalLogs = ins + outs;

      return {
        ...period,
        count: totalLogs,
        ins: ins,
        outs: outs,
        rawRecords: userLogs
      };
    });
  }, [logData, periods, user]);

  const selectedLogsData = useMemo(() => {
    const userId = user?.id;
    const userName = String(user?.name || '').trim();
    const userDept = user?.department || 'N/A';
    const userYear = user?.yearLevel || 'N/A';

    const logs = availablePeriods
      .filter(p => selectedPeriods.includes(p.id))
      .flatMap(p => p.rawRecords)
      .filter(log => {
        const logUid = String(log.uid || '').trim();
        const logName = String(log.name || '').trim();
        return (userId && (log.entryKey === userId || logUid === userId)) || 
               (userName && logName === userName);
      })
      .map(log => ({
        ...log,
        department: userDept,
        yearLevel: userYear,
        name: user.name
      }));

    const uniqueLogs = Array.from(
      new Map(
        logs.map(l => [
          `${l.date}-${l.timeIn}-${l.timeOut}-${l.status}`,
          l
        ])
      ).values()
    );

    return uniqueLogs.sort((a, b) => {
      const timeA = a.timeIn || a.timestamp || '00:00';
      const timeB = b.timeIn || b.timestamp || '00:00';
      const dateA = new Date(`${a.date} ${timeA}`);
      const dateB = new Date(`${b.date} ${timeB}`);
      return dateB - dateA;
    });
  }, [availablePeriods, selectedPeriods, user]);

  if (viewingLogs) {
    return (
      <SeeLogs 
        logs={selectedLogsData} 
        filters={{ 
          userName: user.name,
          dept: user.department || 'N/A',
          year: user.yearLevel || 'N/A',
          month: reportType === 'Monthly' ? filterYear : filterMonth,
          type: reportType 
        }} 
        onBack={() => setViewingLogs(false)} 
      />
    );
  }

  return (
    <div className="report-module-container fade-in">
      <div className="top-nav">
        <button className="back-nav-btn" onClick={onBack}>
          <ChevronLeft size={20} />
          <span>Back to User List</span>
        </button>
      </div>

      <header className="report-view-header">
        <div className="header-main-info">
          <div className="view-icon-badge user-mode">
            <User size={24} />
          </div>
          <div className="title-stack">
            <h1>{user.name}</h1>
            <p>User Logs • {reportType} View</p>
          </div>
        </div>
        
        <div className="header-controls">
          <div className="control-group">
            <label>{reportType === 'Monthly' ? 'FISCAL YEAR' : 'SELECT MONTH'}</label>
            {reportType === 'Monthly' ? (
              <select className="modern-select highlight" value={filterYear} onChange={(e) => { setFilterYear(e.target.value); setSelectedPeriods([]); }}>
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            ) : (
              <input className="modern-input highlight" type="month" value={filterMonth} onChange={(e) => { setFilterMonth(e.target.value); setSelectedPeriods([]); }} />
            )}
          </div>
        </div>
      </header>

      <div className="view-grid single-col">
        <main className="timeline-container">
          <div className="section-title">
            <CalendarIcon size={16} />
            <span>Available Periods</span>
          </div>
          
          {/* GRID LAYOUT – identical to OfficialReportView */}
          <div className="report-periods-grid">
            {loading ? (
              <div className="loader-box"><Loader2 className="spinner" /></div>
            ) : availablePeriods.length > 0 ? (
              availablePeriods.map((period) => {
                const isSelected = selectedPeriods.includes(period.id);
                return (
                  <div 
                    key={period.id} 
                    className={`period-card ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => setSelectedPeriods(prev => 
                      prev.includes(period.id) 
                        ? prev.filter(d => d !== period.id) 
                        : [...prev, period.id]
                    )}
                  >
                    <div className="period-card-header">
                      <span className="period-label">{period.label}</span>
                      {period.subLabel && <span className="period-sub">{period.subLabel}</span>}
                    </div>
                    <div className="period-card-stats">
                      <div className="stat-pill count">
                        <span>{period.count} Logs</span>
                      </div>
                      <div className="stat-group">
                        <span className="in-text">IN: {period.ins}</span>
                        <span className="out-text">OUT: {period.outs}</span>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="selected-icon" size={16} />}
                  </div>
                );
              })
            ) : (
              <div className="empty-state">No records found.</div>
            )}
          </div>
        </main>
      </div>

      {selectedPeriods.length > 0 && (
        <div className="floating-action-bar fade-in-up">
          <div className="bar-info">
            <span className="selection-count">{selectedPeriods.length}</span>
            <span>Selected</span>
          </div>
          <button className="primary-action-btn" onClick={() => setViewingLogs(true)}>
            View Details <ArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}