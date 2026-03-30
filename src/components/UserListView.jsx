import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { ref, onValue, set, remove } from 'firebase/database';

export default function UserListView() {
  const [users, setUsers] = useState({});
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false); // Toggle for Enrollment Form
  const [isRfidScanning, setIsRfidScanning] = useState(false); // Toggle for RFID Scanner
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewUser, setViewUser] = useState(null); 
  
  const [newUser, setNewUser] = useState({ 
    name: '', 
    studentId: '', 
    rfid: '', 
    role: 'Student',
    department: '',
    yearLevel: ''
  });

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
    onValue(usersRef, (snap) => setUsers(snap.val() || {}));

    const scanRef = ref(db, 'current_scan/temp_uid');
    onValue(scanRef, (snap) => {
      const scannedUid = snap.val();
      if (scannedUid && isRfidScanning) {
        setNewUser(prev => ({ ...prev, rfid: scannedUid }));
        setIsRfidScanning(false);
      }
    });
  }, [isRfidScanning]);

  const filteredUsers = Object.entries(users).filter(([uid, data]) => {
    const searchStr = searchTerm.toLowerCase();
    return (
      data.name?.toLowerCase().includes(searchStr) || 
      uid.toLowerCase().includes(searchStr) ||
      data.studentId?.toLowerCase().includes(searchStr)
    );
  });

  const handleRegister = (e) => {
    e.preventDefault();
    if (!newUser.name || !newUser.rfid) return alert("Validation Error: Missing Name or RFID.");
    
    if (newUser.role === 'Student' && (!newUser.department || !newUser.yearLevel)) {
      return alert("Please select Department and Year Level.");
    }

    const path = `users/${newUser.rfid}`;
    const payload = {
      name: newUser.name.toUpperCase(),
      studentId: newUser.studentId,
      role: newUser.role,
      department: newUser.role === 'Student' ? newUser.department : 'N/A',
      yearLevel: newUser.role === 'Student' ? newUser.yearLevel : 'N/A',
      updatedAt: new Date().toISOString()
    };

    set(ref(db, path), payload).then(() => {
      remove(ref(db, 'current_scan/temp_uid'));
      alert(isEditing ? "User details updated." : "User registered successfully.");
      resetForm();
    });
  };

  const handleEdit = (uid, data) => {
    setNewUser({ ...data, rfid: uid });
    setIsEditing(true);
    setIsEnrollModalOpen(true); // Open the form when editing
  };

  const handleDelete = (uid) => {
    if (window.confirm(`Are you sure you want to remove UID: ${uid}?`)) {
      remove(ref(db, `users/${uid}`));
    }
  };

  const resetForm = () => {
    setNewUser({ name: '', studentId: '', rfid: '', role: 'Student', department: '', yearLevel: '' });
    setIsEditing(false);
    setIsEnrollModalOpen(false);
    setIsRfidScanning(false);
  };

  return (
    <div className="user-management-container">
      {/* --- HEADER SECTION --- */}
      <div className="header-flex-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 className="view-header" style={{ margin: 0 }}>Personnel Registry</h1>
          <p style={{ fontSize: '0.9rem', color: '#666' }}>Manage students and faculty access logs.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="Search Registry..." 
            className="modern-input"
            style={{ width: '250px', margin: 0 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button 
            className="submit-btn-modern" 
            style={{ backgroundColor: '#000', margin: 0, padding: '10px 20px' }}
            onClick={() => setIsEnrollModalOpen(true)}
          >
            + ENROLL NEW PERSONNEL
          </button>
        </div>
      </div>

      {/* --- REGISTRY TABLE (MAIN VIEW) --- */}
      <div className="form-canvas-a4 modern-card">
        <h3 className="section-subtitle">Active Users ({filteredUsers.length})</h3>
        <table className="official-record-table modern-table">
          <thead>
            <tr>
              <th style={{ width: '5%' }}>REF</th>
              <th style={{ width: '35%' }}>NAME</th>
              <th style={{ width: '30%' }}>DEPT / ROLE</th>
              <th style={{ width: '10%' }}>YEAR</th>
              <th style={{ width: '20%' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? filteredUsers.map(([uid, data], i) => (
              <tr key={uid}>
                <td className="text-center">{(i + 1).toString().padStart(2, '0')}</td>
                <td className="name-cell" style={{ fontWeight: 'bold' }}>{data.name}</td>
                <td style={{ fontSize: '0.8rem' }}>{data.role === 'Student' ? data.department : data.role}</td>
                <td className="text-center">{data.yearLevel || 'N/A'}</td>
                <td className="action-cell">
                  <button className="edit-mini-btn" style={{ backgroundColor: '#2196F3' }} onClick={() => setViewUser({ ...data, uid })}>VIEW</button>
                  <button className="edit-mini-btn" onClick={() => handleEdit(uid, data)}>EDIT</button>
                  <button className="delete-mini-btn" onClick={() => handleDelete(uid)}>DEL</button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="5" className="text-center" style={{ padding: '40px' }}>No personnel records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- ENROLLMENT TERMINAL MODAL --- */}
      {isEnrollModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '700px', width: '90%' }}>
            <h2 className="modal-title">{isEditing ? "Update Personnel" : "Enrollment Terminal"}</h2>
            <div className="modern-form-grid" style={{ marginTop: '20px' }}>
              <div className="input-group-modern">
                <label>Full Name</label>
                <input type="text" className="modern-input" value={newUser.name} onChange={(e) => setNewUser({...newUser, name: e.target.value})} placeholder="FULL NAME" />
              </div>
              <div className="input-group-modern">
                <label>ID / No.</label>
                <input type="text" className="modern-input" value={newUser.studentId} onChange={(e) => setNewUser({...newUser, studentId: e.target.value})} placeholder="2024-XXXX" />
              </div>
              <div className="input-group-modern">
                <label>Access Level</label>
                <select className="modern-select" value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value, department: '', yearLevel: ''})}>
                  <option value="Student">Student</option>
                  <option value="Staff">Staff</option>
                </select>
              </div>
              <div className="input-group-modern">
                <label>RFID Tag</label>
                <button 
                  className={`modern-scan-btn ${newUser.rfid ? 'tag-secured' : ''}`} 
                  onClick={() => setIsRfidScanning(true)}
                >
                  {newUser.rfid ? `UID: ${newUser.rfid}` : "TAP TO SCAN"}
                </button>
              </div>

              {newUser.role === 'Student' && (
                <>
                  <div className="input-group-modern" style={{ gridColumn: 'span 2' }}>
                    <label>Department</label>
                    <select className="modern-select" value={newUser.department} onChange={(e) => setNewUser({...newUser, department: e.target.value})}>
                      <option value="">-- Select Department --</option>
                      {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                    </select>
                  </div>
                  <div className="input-group-modern">
                    <label>Year Level</label>
                    <select className="modern-select" value={newUser.yearLevel} onChange={(e) => setNewUser({...newUser, yearLevel: e.target.value})}>
                      <option value="">-- Select Year --</option>
                      {yearLevels.map(yr => <option key={yr} value={yr}>{yr}</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
              <button className="submit-btn-modern" style={{ flex: 2 }} onClick={handleRegister}>
                {isEditing ? "UPDATE RECORD" : "AUTHORIZE & REGISTER"}
              </button>
              <button className="cancel-edit-btn" style={{ flex: 1 }} onClick={resetForm}>CANCEL</button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW PROFILE MODAL */}
      {viewUser && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'left' }}>
            <h2 className="modal-title">Personnel Profile</h2>
            <div style={{ marginTop: '20px', lineHeight: '1.8' }}>
              <p><strong>NAME:</strong> {viewUser.name}</p>
              <p><strong>ID:</strong> {viewUser.studentId || 'N/A'}</p>
              <p><strong>ROLE:</strong> {viewUser.role}</p>
              <p><strong>DEPT:</strong> {viewUser.department || 'N/A'}</p>
              <p><strong>YEAR:</strong> {viewUser.yearLevel || 'N/A'}</p>
              <p><strong>RFID:</strong> <code style={{ color: 'red' }}>{viewUser.uid}</code></p>
            </div>
            <button className="primary-doc-btn" style={{ width: '100%', marginTop: '20px' }} onClick={() => setViewUser(null)}>CLOSE</button>
          </div>
        </div>
      )}

      {/* RFID SCANNING MODAL */}
      {isRfidScanning && (
        <div className="modal-overlay" style={{ zIndex: 3000 }}>
          <div className="modal-content" style={{ textAlign: 'center' }}>
            <div className="radar active" style={{ margin: '0 auto 20px' }}></div>
            <h3>Waiting for RFID Tag...</h3>
            <p>Please tap the card on the scanner module.</p>
            <button className="cancel-link" onClick={() => setIsRfidScanning(false)}>Cancel Scan</button>
          </div>
        </div>
      )}
    </div>
  );
}