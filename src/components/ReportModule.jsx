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
import { db } from '../firebaseConfig'; 
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

// --- SUB-COMPONENT FOR USER TABLES ---
const UserActivityReport = ({ onBack, onUserSelect }) => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const userList = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setUsers(userList);
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
    // Delay slightly to ensure modal closes smoothly before view switch
    setTimeout(() => {
        onUserSelect(reportType, selectedUser);
    }, 100);
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.idNumber?.includes(searchTerm)
  );

  const renderTable = (title, roleName) => {
    const list = filteredUsers.filter(u => u.role?.toLowerCase() === roleName.toLowerCase());
    return (
      <div className="user-table-section">
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
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {list.length > 0 ? list.map(user => (
                <tr key={user.id}>
                  <td className="id-cell">{user.idNumber || '—'}</td>
                  <td className="name-cell">{user.name}</td>
                  <td>{user.department || 'N/A'}</td>
                  <td className="text-right">
                    <button className="view-btn" onClick={() => openLogOptions(user)}>
                      View Logs <ArrowRight size={14} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" className="empty-row">No {title} found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
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
            placeholder="Search..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      {loading ? (
        <div className="loader-container"><div className="loader"></div></div>
      ) : (
        <div className="tables-grid">
          {renderTable("Students", "Student")}
          {renderTable("Instructors", "Instructor")}
          {renderTable("Staff", "Staff")}
        </div>
      )}
    </div>
  );
};

// --- MAIN COMPONENT ---
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

  // RENDER LOGIC
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
      <header className="report-header">
        <div className="logo-badge">REPORTS</div>
        <h1>System Reporting Portal</h1>
      </header>
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