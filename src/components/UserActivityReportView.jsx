import React, { useState, useEffect } from 'react';
import { database as db } from '../firebaseConfig';
import { ref, onValue } from 'firebase/database';
import { ChevronLeft, Search, User, Eye, Filter } from 'lucide-react';
import OfficialReportView from './OfficialReportView';
import './UserActivityReportView.css';

export default function UserActivityReportView({ onBack }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [usersList, setUsersList] = useState([]);
  const [photos, setPhotos] = useState({});
  
  // Filters
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  
  // For viewing a user's logs
  const [selectedUser, setSelectedUser] = useState(null);
  
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
    const unsubscribeUsers = onValue(usersRef, (snap) => {
      const data = snap.val() || {};
      const formatted = Object.entries(data)
        .map(([uid, val]) => ({ rfid: uid, ...val }))
        .filter(user => user.role !== 'Admin' && user.role !== 'Administrator'); 
      setUsersList(formatted);
    });

    const photosRef = ref(db, 'user_photos');
    const unsubscribePhotos = onValue(photosRef, (snap) => {
      setPhotos(snap.val() || {});
    });

    return () => {
      unsubscribeUsers();
      unsubscribePhotos();
    };
  }, []);

  // Apply all filters (search + role + department + year level)
  const filteredUsers = usersList.filter(user => {
    // Search filter
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          user.rfid?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    
    // Role filter
    if (roleFilter !== 'ALL' && user.role !== roleFilter) return false;
    
    // Department filter (only for Student/Instructor roles)
    if (deptFilter !== 'ALL') {
      const userRole = user.role;
      if (userRole === 'Student' || userRole === 'Instructor') {
        if (user.department !== deptFilter) return false;
      } else {
        // Staff or others – department filter not applicable
        return false;
      }
    }
    
    // Year level filter (only for Students)
    if (yearFilter !== 'ALL') {
      if (user.role === 'Student') {
        if (user.yearLevel !== yearFilter) return false;
      } else {
        // Not a student – cannot match year filter
        return false;
      }
    }
    
    return true;
  });

  // If a user is selected, show their personal OfficialReportView
  if (selectedUser) {
    return (
      <OfficialReportView
        reportType="Daily"
        targetUser={selectedUser}
        onBack={() => setSelectedUser(null)}
      />
    );
  }

  return (
    <div className="user-activity-view">
      <div className="back-nav" onClick={onBack}>
        <ChevronLeft size={18} /> 
        <span>Back to Reports</span>
      </div>

      <div className="view-header">
        <h1>User Activity Report</h1>
        <p>View individual user access logs and activity history</p>
      </div>

      {/* Filter bar – contains Role, Department, Year Level, and Search */}
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

        <div className="filter-item search-filter">
          <label>Search</label>
          <div className="search-wrapper">
            <Search size={16} className="search-icon-small" />
            <input 
              type="text" 
              placeholder="Name or RFID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="users-list-card">
        <div className="list-header">
          <User size={18} />
          <h3>All Users ({filteredUsers.length})</h3>
        </div>

        <div className="user-items">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <div key={user.rfid} className="user-item-row">
                <div className="user-main-info">
                  <div className="user-avatar">
                    {photos[user.rfid]?.image ? (
                      <img src={photos[user.rfid].image} alt="profile" />
                    ) : (
                      <User size={24} />
                    )}
                  </div>
                  <div className="user-details">
                    <span className="user-name">{user.name}</span>
                    <span className="user-meta">
                      {user.role} • {user.department ? user.department.split(' ').slice(-1)[0] : 'N/A'} • {user.yearLevel || 'N/A'}
                    </span>
                    <span className="rfid-text">RFID: {user.rfid}</span>
                  </div>
                </div>

                <button 
                  className="btn-view-logs"
                  onClick={() => setSelectedUser(user)}
                >
                  <Eye size={16} /> View Logs
                </button>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <User size={48} />
              <p>No users match the selected filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}