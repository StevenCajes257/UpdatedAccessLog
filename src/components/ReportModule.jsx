import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { ref, onValue } from 'firebase/database';
import './ReportModule.css';

export default function ReportModule({ onGenerate }) {
  const [logData, setLogData] = useState({});
  const [selectedDates, setSelectedDates] = useState([]); 
  const [filterDate, setFilterDate] = useState('');
  
  // New Filter States
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');

  const departments = [
    "Bachelor of Science in Information Technology",
    "Bachelor of Science in Office Administration",
    "Bachelor of Science in Criminology",
    "Bachelor of Science in Political Science",
    "Bachelor of Science in Education"
  ];

  useEffect(() => {
    const attendanceRef = ref(db, 'attendance');
    onValue(attendanceRef, (snap) => setLogData(snap.val() || {}));
  }, []);

  const monthDates = (() => {
    const now = new Date();
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Array.from({length: days}, (_, i) => 
      new Date(now.getFullYear(), now.getMonth(), i + 1).toISOString().split('T')[0]
    ).reverse();
  })();

  const handleToggleDate = (date) => {
    setSelectedDates(prev => prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]);
  };

  const displayedDates = filterDate ? monthDates.filter(d => d === filterDate) : monthDates;

  return (
    <div className="report-module-wrapper">
      <div className="report-header-row">
        <h2 className="report-title-text">REPORT MODULE</h2>
        <input type="date" className="header-date-input" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
      </div>

      <div className="logs-outer-box">
        {/* New Filter Section */}
        <div className="filter-controls" style={{ display: 'flex', gap: '10px', padding: '15px', background: '#f9f9f9', borderBottom: '1px solid #ddd' }}>
          <select className="modern-select" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="ALL">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="modern-select" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
            <option value="ALL">All Years</option>
            <option value="1st Year">1st Year</option>
            <option value="2nd Year">2nd Year</option>
            <option value="3rd Year">3rd Year</option>
            <option value="4th Year">4th Year</option>
          </select>
        </div>

        <div className="logs-list-container">
          {displayedDates.map((date) => (
            <div key={date} className="log-item-row">
              <input type="checkbox" checked={selectedDates.includes(date)} onChange={() => handleToggleDate(date)} />
              <div className="date-display-box">{date}</div>
              <span className="log-count-tag">{Object.keys(logData[date] || {}).length.toString().padStart(2, '0')} Logs</span>
            </div>
          ))}
        </div>

        <div className="generate-btn-container">
          <button 
            className="generate-btn"
            onClick={() => onGenerate(selectedDates, deptFilter, yearFilter)} 
            disabled={selectedDates.length === 0}
          >
            GENERATE FILTERED REPORT
          </button>
        </div>
      </div>
    </div>
  );
}