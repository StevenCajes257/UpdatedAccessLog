import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronDown,
  Filter, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Loader2, 
  User,
  ArrowRight,
  Database,
  X,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { database as db } from '../firebaseConfig';
import { ref, onValue } from 'firebase/database';
import SeeLogs from './SeeLogs'; 
import './OfficialReportView.css';

export default function OfficialReportView({ reportType, onBack, targetUser }) {
  const [logData, setLogData] = useState({});
  const [usersData, setUsersData] = useState({});
  const [selectedPeriods, setSelectedPeriods] = useState([]); 
  const [viewingLogs, setViewingLogs] = useState(false); 
  const [showCalendar, setShowCalendar] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [filterYear, setFilterYear] = useState(() => new Date().getFullYear().toString());
  
  // For Daily: grid‑style date picker state
  const [selectedDate, setSelectedDate] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  
  const [loading, setLoading] = useState(true);
  
  // Role filter
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');

  const departments = [
    "Bachelor of Science in Information Technology", 
    "Bachelor of Science in Office Administration", 
    "Bachelor of Science in Criminology", 
    "Bachelor of Science in Political Science", 
    "Bachelor of Science in Education"
  ];

  const yearLevels = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

  // Extract all available years from attendance data
  const availableYears = useMemo(() => {
  const yearsSet = new Set();
  
  // Extract years from attendance data
  Object.keys(logData).forEach(dateStr => {
    const year = dateStr.split('-')[0];
    if (year && !isNaN(year)) yearsSet.add(year);
  });
  
  // Add a range of years (e.g., 2020 to current year + 2)
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 5; y <= currentYear + 2; y++) {
    yearsSet.add(String(y));
  }
  
  // Sort descending (latest first)
  return Array.from(yearsSet).sort((a, b) => b - a);
}, [logData]);

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getYearNumber = (yearStr) => {
    if (!yearStr) return null;
    const match = yearStr.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showCalendar && !e.target.closest('.compact-date-picker')) {
        setShowCalendar(false);
      }
      if (showYearPicker && !e.target.closest('.compact-year-picker')) {
        setShowYearPicker(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showCalendar, showYearPicker]);

  useEffect(() => {
    const attendanceRef = ref(db, 'attendance');
    const usersRef = ref(db, 'users');
    
    const unsubscribeAttendance = onValue(attendanceRef, (snap) => {
      setLogData(snap.val() || {});
    });
    
    const unsubscribeUsers = onValue(usersRef, (snap) => {
      setUsersData(snap.val() || {});
      setLoading(false);
    });
    
    return () => {
      unsubscribeAttendance();
      unsubscribeUsers();
    };
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

    if (reportType === 'Weekly') {
      const [year, month] = filterMonth.split('-').map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      const allDates = Array.from({ length: daysInMonth }, (_, i) => `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`);
      
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

    if (reportType === 'Daily') {
      if (selectedDate) {
        return [{ id: selectedDate, label: selectedDate, subLabel: null, dates: [selectedDate] }];
      }
      const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
      const allDates = Array.from({ length: daysInMonth }, (_, i) => {
        const dayNum = i + 1;
        return `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      });
      return allDates.map(date => ({ id: date, label: date, subLabel: null, dates: [date] }));
    }
    
    return [];
  }, [filterMonth, filterYear, selectedDate, calendarMonth, calendarYear, reportType]);

  const getUserDepartment = (uid, entry) => {
    if (usersData[uid]?.department) return usersData[uid].department;
    return entry.department;
  };

  const getUserYearLevel = (uid, entry) => {
    if (usersData[uid]?.yearLevel) return usersData[uid].yearLevel;
    return entry.yearLevel;
  };

  const availablePeriods = useMemo(() => {
    return periods.map(period => {
      let combinedLogs = [];
      period.dates.forEach(date => {
        const dayData = logData[date];
        if (!dayData) return;
        
        Object.entries(dayData).forEach(([entryKey, entry]) => {
          const baseUid = entryKey.split('_')[0];
          const entryRole = entry.role;
          const entryDept = entry.department;
          const entryYear = entry.yearLevel;
          
          if (entryRole && entryRole.toLowerCase() === 'admin') return;
          
          if (roleFilter !== 'ALL') {
            const filterRoleLower = roleFilter.toLowerCase();
            const entryRoleLower = (entryRole || '').toLowerCase();
            if (entryRoleLower !== filterRoleLower) return;
          }
          
          if (deptFilter !== 'ALL') {
            const roleLower = (entryRole || '').toLowerCase();
            if (roleLower === 'student' || roleLower === 'instructor') {
              const deptToCheck = entryDept || getUserDepartment(baseUid, entry);
              if (deptToCheck !== deptFilter) return;
            }
          }
          
          if (yearFilter !== 'ALL') {
            const roleLower = (entryRole || '').toLowerCase();
            if (roleLower === 'student') {
              const yearToCheck = entryYear || getUserYearLevel(baseUid, entry);
              const userYearNum = getYearNumber(yearToCheck);
              const filterYearNum = getYearNumber(yearFilter);
              if (userYearNum !== filterYearNum) return;
            }
          }
          
          if (entry.timeIn || entry.timeOut) {
            combinedLogs.push({
              ...entry,
              date,
              entryKey,
              userRole: entryRole,
              department: entryDept || getUserDepartment(baseUid, entry),
              yearLevel: entryYear || getUserYearLevel(baseUid, entry),
              logType: 'session'
            });
          }
          else if (entry.status) {
            combinedLogs.push({
              ...entry,
              date,
              entryKey,
              userRole: entryRole,
              department: entryDept || getUserDepartment(baseUid, entry),
              yearLevel: entryYear || getUserYearLevel(baseUid, entry),
              logType: 'status'
            });
          }
        });
      });

      let ins = 0, outs = 0, incomplete = 0;
      
      combinedLogs.forEach(log => {
        if (log.logType === 'session') {
          const hasTimeIn = log.timeIn && log.timeIn !== '--';
          const hasTimeOut = log.timeOut && log.timeOut !== '--';
          
          if (hasTimeIn && hasTimeOut) {
            ins++;
            outs++;
          } else if (hasTimeIn && !hasTimeOut) {
            ins++;
            incomplete++;
          } else if (!hasTimeIn && hasTimeOut) {
            outs++;
          }
        } else if (log.logType === 'status') {
          if (log.status === 'IN') ins++;
          else if (log.status === 'OUT') outs++;
        }
      });

      const totalLogs = ins + outs + incomplete;

      return {
        ...period,
        count: totalLogs,
        ins: ins,
        outs: outs,
        incomplete: incomplete,
        rawRecords: combinedLogs
      };
    });
  }, [logData, periods, roleFilter, deptFilter, yearFilter, usersData]);

  const selectedLogsData = useMemo(() => {
    return availablePeriods.filter(p => selectedPeriods.includes(p.id)).flatMap(p => p.rawRecords);
  }, [availablePeriods, selectedPeriods]);

  const handleRoleChange = (newRole) => {
    setRoleFilter(newRole);
    setDeptFilter('ALL');
    setYearFilter('ALL');
    setSelectedPeriods([]);
  };

  const handleMonthChange = (newMonth) => {
    setFilterMonth(newMonth);
    setSelectedPeriods([]);
  };

  const handleYearChange = (newYear) => {
    setFilterYear(newYear);
    setSelectedPeriods([]);
    setShowYearPicker(false);
  };

  const goPrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
    setSelectedDate(null);
    setSelectedPeriods([]);
  };

  const goNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
    setSelectedDate(null);
    setSelectedPeriods([]);
  };

  const handleMonthSelect = (monthIndex) => {
    setCalendarMonth(monthIndex);
    setSelectedDate(null);
    setSelectedPeriods([]);
  };

  const handleYearSelect = (year) => {
    setCalendarYear(year);
    setSelectedDate(null);
    setSelectedPeriods([]);
  };

  const handleDateSelect = (dateStr) => {
    setSelectedDate(dateStr);
    setSelectedPeriods([]);
    setShowCalendar(false);
  };

  const clearDateFilter = () => {
    setSelectedDate(null);
    setSelectedPeriods([]);
    setShowCalendar(false);
  };

  const daysInCurrentMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1).getDay();
  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({ day: d, dateStr });
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  if (viewingLogs) {
    return (
      <SeeLogs 
        logs={selectedLogsData} 
        filters={{ 
          role: roleFilter,
          dept: deptFilter, 
          year: yearFilter, 
          month: reportType === 'Monthly' ? filterYear : filterMonth,
          userName: targetUser?.name 
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
          <span>Back to Report Menu</span>
        </button>
      </div>

      <div className="report-view-header">
        <div className="header-main-info">
          <div className={`view-icon-badge ${targetUser ? 'user-mode' : ''}`}>
            {targetUser ? <User size={24} /> : <Database size={24} />}
          </div>
          <div className="title-stack">
            <h1>{targetUser ? targetUser.name : `${reportType} Report`}</h1>
            <p>{targetUser ? `ID: ${targetUser.idNumber || 'N/A'} • ${targetUser.role}` : `Access logs categorized by ${reportType.toLowerCase()} intervals.`}</p>
          </div>
        </div>
        
        <div className="header-controls">
          {reportType === 'Monthly' && (
            <div className="control-group">
              <label>FISCAL YEAR</label>
              <div className="compact-year-picker">
                <button 
                  type="button" 
                  className="year-picker-trigger"
                  onClick={() => setShowYearPicker(!showYearPicker)}
                >
                  <CalendarIcon size={16} />
                  <span>{filterYear}</span>
                  <ChevronDown size={14} />
                </button>
                {showYearPicker && (
                  <div className="year-dropdown">
                    <div className="year-grid">
                      {availableYears.map(year => (
                        <div
                          key={year}
                          className={`year-grid-item ${filterYear === year ? 'selected' : ''}`}
                          onClick={() => handleYearChange(year)}
                        >
                          {year}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {reportType === 'Weekly' && (
            <div className="control-group">
              <label>SELECT MONTH</label>
              <input className="modern-input highlight" type="month" value={filterMonth} onChange={(e) => handleMonthChange(e.target.value)} />
            </div>
          )}
          
          {reportType === 'Daily' && (
            <div className="control-group daily-filters">
              <label>SELECT DATE</label>
              <div className="compact-date-picker">
                <button 
                  type="button" 
                  className="date-picker-trigger"
                  onClick={() => setShowCalendar(!showCalendar)}
                >
                  <CalendarIcon size={16} />
                  <span>{selectedDate ? selectedDate : "Pick a date"}</span>
                  <ChevronDown size={14} />
                </button>
                {showCalendar && (
                  <div className="calendar-dropdown">
                    <div className="calendar-picker">
                      <div className="calendar-nav">
                        <button type="button" className="calendar-nav-btn" onClick={goPrevMonth}>
                          <ChevronLeftIcon size={14} />
                        </button>
                        <div className="month-year-selectors">
                          <select 
                            className="modern-select month-select"
                            value={calendarMonth}
                            onChange={(e) => handleMonthSelect(parseInt(e.target.value))}
                          >
                            {monthNames.map((name, idx) => (
                              <option key={idx} value={idx}>{name}</option>
                            ))}
                          </select>
                          <select 
                            className="modern-select year-select"
                            value={calendarYear}
                            onChange={(e) => handleYearSelect(parseInt(e.target.value))}
                          >
                            {availableYears.map(y => (
                              <option key={y} value={parseInt(y)}>{y}</option>
                            ))}
                          </select>
                        </div>
                        <button type="button" className="calendar-nav-btn" onClick={goNextMonth}>
                          <ChevronRightIcon size={14} />
                        </button>
                      </div>
                      <div className="calendar-grid">
                        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(day => (
                          <div key={day} className="calendar-weekday">{day}</div>
                        ))}
                        {calendarDays.map((cell, idx) => {
                          if (cell === null) {
                            return <div key={`empty-${idx}`} className="calendar-day empty"></div>;
                          }
                          const isSelected = selectedDate === cell.dateStr;
                          return (
                            <div 
                              key={cell.dateStr}
                              className={`calendar-day ${isSelected ? 'selected' : ''}`}
                              onClick={() => handleDateSelect(cell.dateStr)}
                            >
                              {cell.day}
                            </div>
                          );
                        })}
                      </div>
                      {selectedDate && (
                        <div className="selected-date-indicator">
                          <span>Selected: {selectedDate}</span>
                          <button type="button" className="clear-date-btn" onClick={clearDateFilter}>
                            <X size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={`view-grid ${targetUser ? 'single-col' : ''}`}>
        {!targetUser && (
          <aside className="filter-sidebar">
            <div className="sidebar-section">
              <div className="section-title">
                <Filter size={16} />
                <span>Data Filters</span>
              </div>
              
              <div className="filter-item">
                <label>Role</label>
                <select 
                  className="modern-select" 
                  value={roleFilter} 
                  onChange={(e) => handleRoleChange(e.target.value)}
                >
                  <option value="ALL">All Roles</option>
                  <option value="Student">Students</option>
                  <option value="Instructor">Instructors</option>
                  <option value="Staff">Staff</option>
                </select>
              </div>

              {(roleFilter === 'ALL' || roleFilter === 'Student' || roleFilter === 'Instructor') && (
                <div className="filter-item">
                  <label>Department</label>
                  <select 
                    className="modern-select" 
                    value={deptFilter} 
                    onChange={(e) => setDeptFilter(e.target.value)}
                  >
                    <option value="ALL">All Departments</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              )}

              {(roleFilter === 'ALL' || roleFilter === 'Student') && (
                <div className="filter-item">
                  <label>Year Level</label>
                  <select 
                    className="modern-select" 
                    value={yearFilter} 
                    onChange={(e) => setYearFilter(e.target.value)}
                  >
                    <option value="ALL">All Levels</option>
                    {yearLevels.map(level => <option key={level} value={level}>{level}</option>)}
                  </select>
                </div>
              )}
            </div>
          </aside>
        )}

        <main className="timeline-container">
          <div className="section-title">
            <CalendarIcon size={16} />
            <span>Available Periods</span>
          </div>
          
          <div className="periods-list">
            {loading ? (
              <div className="loader-box"><Loader2 className="spinner" /></div>
            ) : availablePeriods.length > 0 ? (
              // ========== GRID LAYOUT FOR ALL REPORT TYPES ==========
              <div className="report-periods-grid">
                {availablePeriods.map((period) => {
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
                          {period.incomplete > 0 && (
                            <span className="incomplete-text">⚠️ {period.incomplete}</span>
                          )}
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 className="selected-icon" size={16} />}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">No data available for this selection.</div>
            )}
          </div>
        </main>
      </div>

      {selectedPeriods.length > 0 && (
        <div className="floating-action-bar fade-in-up">
          <div className="bar-info">
            <span className="selection-count">{selectedPeriods.length}</span>
            <span>Periods Selected</span>
          </div>
          <button className="primary-action-btn" onClick={() => setViewingLogs(true)}>
            Generate Log View <ArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}