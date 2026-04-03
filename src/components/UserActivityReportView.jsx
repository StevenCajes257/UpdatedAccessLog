import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { ref, onValue } from 'firebase/database';
import { ChevronLeft, Search, User, Eye } from 'lucide-react';
import './UserActivityReportView.css';

export default function UserActivityReportView({ onBack }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [usersList, setUsersList] = useState([]);
  const [photos, setPhotos] = useState({}); // New state for photos

  useEffect(() => {
    // 1. Fetch Users
    const usersRef = ref(db, 'users');
    onValue(usersRef, (snap) => {
      const data = snap.val() || {};
      const formatted = Object.entries(data)
        .map(([uid, val]) => ({ rfid: uid, ...val }))
        .filter(user => user.role !== 'Admin' && user.role !== 'Administrator'); 
      setUsersList(formatted);
    });

    // 2. Fetch Photos separately
    const photosRef = ref(db, 'user_photos');
    onValue(photosRef, (snap) => {
      setPhotos(snap.val() || {});
    });
  }, []);

  const filteredUsers = usersList.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.rfid?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="user-activity-view">
      <div className="back-nav" onClick={onBack} style={{ color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <ChevronLeft size={18} /> <span>Back to Reports</span>
      </div>

      <header className="view-header">
        <h1 style={{ color: '#000' }}>User Activity Report</h1>
        <p style={{ color: '#000' }}>View individual user access logs and activity history</p>
      </header>

      <div className="search-container">
        <Search className="search-icon" size={20} color="#000" />
        <input 
          type="text" 
          placeholder="Search by name or RFID tag..." 
          style={{ color: '#000', width: '100%', border: 'none', outline: 'none', background: 'transparent' }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="users-list-card">
        <div className="list-header" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <User size={18} color="#000" />
          <h3 style={{ color: '#000' }}>All Users ({filteredUsers.length})</h3>
        </div>

        <div className="user-items">
          {filteredUsers.map((user) => (
            <div key={user.rfid} className="user-item-row" style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '10px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="user-main-info" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <div className="user-avatar" style={{ background: '#eee', padding: '0px', borderRadius: '50%', overflow: 'hidden', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   {/* FIX: Look up photo in the photos object using rfid */}
                   {photos[user.rfid]?.image ? (
                     <img src={photos[user.rfid].image} alt="profile" style={{width: '100%', height:'100%', objectFit: 'cover'}} />
                   ) : (
                     <User size={24} color="#000" />
                   )}
                </div>
                <div className="user-details">
                  <span className="user-name" style={{ color: '#000', fontWeight: 'bold', display: 'block' }}>{user.name}</span>
                  <span className="rfid-text" style={{ color: '#444', fontSize: '0.8rem' }}>RFID: {user.rfid}</span>
                </div>
              </div>

              <button className="btn-view-logs" onClick={() => alert(`Generating logs for ${user.name}`)} style={{ background: '#000', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Eye size={16} /> View Logs
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}