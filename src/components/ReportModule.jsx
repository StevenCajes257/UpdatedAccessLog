import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  TrendingUp, 
  BarChart3, 
  UserCircle, 
  ChevronRight, 
  FileText,
  ChevronLeft,
  Search,
  ArrowRight,
  X
} from 'lucide-react';
import { database as db } from '../firebaseConfig';
import { ref, onValue } from 'firebase/database';
import UserLogs from './UserLogs'; 
import './ReportModule.css';

// --- MODAL COMPONENT ---
const LogTypeModal = ({ isOpen, onClose, onSelect, userName }) => {
  if (!isOpen) return null;

  const options = [
    { id: 'Daily', icon: <Calendar size={18} />, label: 'Daily Logs', color: 'icon-blue' },
    { id: 'Weekly', icon: <TrendingUp size={18} />, label: 'Weekly Logs', color: 'icon-green' },
    { id: 'Monthly', icon: <BarChart3 size={18} />, label: 'Monthly Logs', color: 'icon-purple' },
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-content fade-in">
        <div className="modal-header">
          <div>
            <h3>Select Report Type</h3>
            <p>Viewing logs for: <strong>{userName}</strong></p>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-options">
          {options.map((opt) => (
            <button key={opt.id} className="modal-opt-btn" onClick={() => onSelect(opt.id)}>
              <div className={`opt-icon ${opt.color}`}>{opt.icon}</div>
              <span>{opt.label}</span>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- SUB-COMPONENT FOR USER TABLES (WITH DELETED USERS SEPARATE) ---
const UserActivityReport = ({ onBack, onUserSelect }) => {
  const [allUsers, setAllUsers] = useState([]); // store all users (including deleted)
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

  // Filters
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

  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const userList = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setAllUsers(userList);
      }
      setLoading(false);
    }, (error) => {
        console.error("Firebase Error:", error);
        setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const openLogOptions = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleTypeSelect = (reportType) => {
    setIsModalOpen(false);
    setTimeout(() => {
        onUserSelect(reportType, selectedUser);
    }, 100);
  };

  // Filter active users (not deleted) + apply role/department/year filters
  const filteredActiveUsers = allUsers
    .filter(user => !user.deleted) // only active
    .filter(user => {
      const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            user.idNumber?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      if (roleFilter !== 'ALL' && user.role !== roleFilter) return false;
      if (deptFilter !== 'ALL') {
        const userRole = user.role;
        if (userRole === 'Student' || userRole === 'Instructor') {
          if (user.department !== deptFilter) return false;
        } else {
          return false;
        }
      }
      if (yearFilter !== 'ALL') {
        if (user.role === 'Student') {
          const expectedYear = user.yearLevel + " Year";
          if (expectedYear !== yearFilter) return false;
        }
      }
      return true;
    });

  // Filter deleted users (deleted === true) + apply the same search & filters
  const filteredDeletedUsers = allUsers
    .filter(user => user.deleted === true)
    .filter(user => {
      const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            user.idNumber?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      if (roleFilter !== 'ALL' && user.role !== roleFilter) return false;
      if (deptFilter !== 'ALL') {
        const userRole = user.role;
        if (userRole === 'Student' || userRole === 'Instructor') {
          if (user.department !== deptFilter) return false;
        } else {
          return false;
        }
      }
      if (yearFilter !== 'ALL') {
        if (user.role === 'Student') {
          const expectedYear = user.yearLevel + " Year";
          if (expectedYear !== yearFilter) return false;
        }
      }
      return true;
    });

  const renderTable = (title, usersList, isDeletedSection = false) => {
    // No separate roleName needed; we'll group users by role inside this table?
    // But easier: we already have filtered lists, we can just display them in one table.
    // However to match original design (separate tables for each role), we need to split by role.
    // But for deleted users, it's simpler to show all deleted users in one table (with a role column).
    // Let's do two approaches:
    // - For active tables: keep the original three tables (Student, Instructor, Staff)
    // - For deleted table: one table with all roles, showing Role column.
    
    if (isDeletedSection) {
      // Single table for all deleted users
      return (
        <div className="user-table-section">
          <div className="table-header-row">
            <h2>Deleted Users</h2>
            <span className="count-badge">{usersList.length} Records</span>
          </div>
          <div className="table-container">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>ID Number</th>
                  <th>Full Name</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Year Level</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {usersList.length > 0 ? (
                  usersList.map(user => (
                    <tr key={user.id}>
                      <td className="id-cell">{user.idNumber || '—'}</td>
                      <td className="name-cell">{user.name}</td>
                      <td>{user.role || '—'}</td>
                      <td>{user.department || 'N/A'}</td>
                      <td>{user.yearLevel || 'N/A'}</td>
                      <td className="text-right">
                        <button className="view-btn" onClick={() => openLogOptions(user)}>
                          View Logs <ArrowRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="empty-row">No deleted users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    } else {
      // Original logic: split by role
      const getRoleList = (roleName) => usersList.filter(u => u.role?.toLowerCase() === roleName.toLowerCase());
      const students = getRoleList('student');
      const instructors = getRoleList('instructor');
      const staff = getRoleList('staff');
      
      const roleTables = [
        { title: "Students", role: "Student", list: students, hasYear: true },
        { title: "Instructors", role: "Instructor", list: instructors, hasYear: false },
        { title: "Staff", role: "Staff", list: staff, hasYear: false }
      ];
      
      return roleTables.map(({ title, list, hasYear }) => (
        <div key={title} className="user-table-section">
          <div className="table-header-row">
            <h2>{title}</h2>
            <span className="count-badge">{list.length} Records</span>
          </div>
          <div className="table-container">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>ID Number</th>
                  <th>Full Name</th>
                  <th>Department</th>
                  {hasYear && <th>Year Level</th>}
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {list.length > 0 ? (
                  list.map(user => (
                    <tr key={user.id}>
                      <td className="id-cell">{user.idNumber || '—'}</td>
                      <td className="name-cell">{user.name}</td>
                      <td>{user.department || 'N/A'}</td>
                      {hasYear && <td>{user.yearLevel || 'N/A'}</td>}
                      <td className="text-right">
                        <button className="view-btn" onClick={() => openLogOptions(user)}>
                          View Logs <ArrowRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={hasYear ? 5 : 4} className="empty-row">No {title} found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ));
    }
  };

  return (
    <div className="report-module-container fade-in">
      <LogTypeModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSelect={handleTypeSelect}
        userName={selectedUser?.name}
      />
      <div className="top-nav">
        <button onClick={onBack} className="back-nav-btn">
          <ChevronLeft size={20} />
          <span>Back to Dashboard</span>
        </button>
      </div>
      <div className="header-flex">
        <div className="title-group">
          <h1>User Activity Report</h1>
          <p>Monitor individual access logs.</p>
        </div>
        <div className="search-wrapper">
          <Search className="search-icon" size={18} />
          <input 
            type="text" 
            placeholder="Search by name or ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* FILTER BAR with Show Deleted toggle */}
      <div className="filter-bar">
        <div className="filter-item">
          <label>Role</label>
          <select 
            className="modern-select" 
            value={roleFilter} 
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setDeptFilter('ALL');
              setYearFilter('ALL');
            }}
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

        <div className="filter-item">
          <label style={{ opacity: 0 }}>Toggle</label>
          <label className="show-deleted-toggle">
            <input 
              type="checkbox" 
              checked={showDeleted} 
              onChange={(e) => setShowDeleted(e.target.checked)} 
            />
            Show Deleted Users
          </label>
        </div>
      </div>

      {loading ? (
        <div className="loader-container"><div className="loader"></div></div>
      ) : (
        <div className="tables-grid">
          {/* Active user tables (Students, Instructors, Staff) */}
          {renderTable("", filteredActiveUsers, false)}
          
          {/* Deleted users table (only when toggle is ON) */}
          {showDeleted && renderTable("", filteredDeletedUsers, true)}
        </div>
      )}
    </div>
  );
};

// --- MAIN COMPONENT (unchanged) ---
export default function ReportModule({ onSelectReport }) {
  const [view, setView] = useState('menu');
  const [selectedUserData, setSelectedUserData] = useState(null);
  const [selectedLogType, setSelectedLogType] = useState('');

  const reportTypes = [
    { id: 'Daily', title: 'Daily Access Report', description: 'Daily logs for dates.', icon: <Calendar />, colorClass: 'icon-blue' },
    { id: 'Weekly', title: 'Weekly Access Report', description: 'Weekly summaries.', icon: <TrendingUp />, colorClass: 'icon-green' },
    { id: 'Monthly', title: 'Monthly Access Report', description: 'Monthly stats.', icon: <BarChart3 />, colorClass: 'icon-purple' },
    { id: 'User Activity', title: 'User Activity Report', description: 'Individual history.', icon: <UserCircle />, colorClass: 'icon-orange' },
  ];

  const handleCardClick = (id) => {
    if (id === 'User Activity') {
      setView('user-activity');
    } else {
      onSelectReport(id);
    }
  };

  const handleUserLogSelection = (type, userData) => {
    setSelectedLogType(type);
    setSelectedUserData(userData);
    setView('user-logs');
  };

  if (view === 'user-logs') {
    return (
      <UserLogs 
        user={selectedUserData} 
        reportType={selectedLogType} 
        onBack={() => setView('user-activity')} 
      />
    );
  }

  if (view === 'user-activity') {
    return (
      <UserActivityReport 
        onBack={() => setView('menu')} 
        onUserSelect={handleUserLogSelection}
      />
    );
  }

  return (
    <div className="report-module-container fade-in">
      <div className="report-header">
        <div className="logo-badge">REPORTS</div>
        <h1>System Reporting Portal</h1>
        <p>Generate and manage system reports</p>
      </div>
      <div className="report-grid">
        {reportTypes.map((report) => (
          <div key={report.id} className="report-card" onClick={() => handleCardClick(report.id)}>
            <div className={`icon-box ${report.colorClass}`}>{report.icon}</div>
            <div className="report-card-body">
              <h3>{report.title}</h3>
              <p>{report.description}</p>
            </div>
            <ChevronRight className="card-chevron" size={20} />
          </div>
        ))}
      </div>
    </div>
  );
}