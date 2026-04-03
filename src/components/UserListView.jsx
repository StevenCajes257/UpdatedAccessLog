import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { ref, onValue, set, remove } from 'firebase/database';
import { 
  Search, Plus, GraduationCap, Briefcase, Edit2, 
  Trash2, BookOpen, Camera, User, X, Fingerprint,
  Mail, Phone, ShieldCheck
} from 'lucide-react';
import './UserListView.css';

export default function UserListView() {
  const [users, setUsers] = useState({});
  const [photos, setPhotos] = useState({});
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isRfidScanning, setIsRfidScanning] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [formData, setFormData] = useState({
    firstName: '', middleName: '', lastName: '',
    email: '', phone: '', role: 'Student', 
    department: '', idNumber: '', yearLevel: '', rfid: '',
    photo: '' 
  });

  // Department options
  const departmentOptions = [
    "Bachelor of Science in Information Technology",
    "Bachelor of Science in Office Administration",
    "Bachelor of Science in Criminology",
    "Bachelor of Science in Political Science",
    "Bachelor of Science in Education"
  ];

  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsubscribeUsers = onValue(usersRef, (snap) => setUsers(snap.val() || {}));

    const photosRef = ref(db, 'user_photos');
    const unsubscribePhotos = onValue(photosRef, (snap) => setPhotos(snap.val() || {}));

    let unsubscribeScan = () => {};
    if (isRfidScanning) {
      const scanRef = ref(db, 'current_scan/temp_uid');
      unsubscribeScan = onValue(scanRef, (snap) => {
        const scannedUid = snap.val();
        if (scannedUid) {
          setFormData(prev => ({ ...prev, rfid: scannedUid }));
          setIsRfidScanning(false);
        }
      });
    }

    return () => {
      unsubscribeUsers();
      unsubscribePhotos();
      unsubscribeScan();
    };
  }, [isRfidScanning]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, photo: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!formData.rfid) return alert("Please scan an RFID tag.");
    
    const userData = {
      name: `${formData.firstName} ${formData.lastName}`,
      role: formData.role,
      department: formData.department || "N/A",
      yearLevel: formData.yearLevel || "N/A",
      idNumber: formData.idNumber,
      firstName: formData.firstName,
      lastName: formData.lastName,
      middleName: formData.middleName || "",
      email: formData.email || "",
      phone: formData.phone || "",
      updatedAt: new Date().toISOString()
    };

    try {
      await set(ref(db, `users/${formData.rfid}`), userData);
      if (formData.photo) {
        await set(ref(db, `user_photos/${formData.rfid}`), { image: formData.photo });
      }
      if (!isEditing) {
        await remove(ref(db, 'current_scan/temp_uid'));
      }
      resetForm();
    } catch (error) {
      console.error(error);
      alert("System Error: Failed to save record.");
    }
  };

  const resetForm = () => {
    setFormData({ firstName: '', middleName: '', lastName: '', email: '', phone: '', role: 'Student', department: '', idNumber: '', yearLevel: '', rfid: '', photo: '' });
    setIsEditing(false);
    setIsRfidScanning(false);
    setIsEnrollModalOpen(false);
  };

  const filteredUsers = Object.entries(users).filter(([uid, data]) => {
    const searchStr = searchTerm.toLowerCase();
    const fullName = `${data.firstName} ${data.lastName}`.toLowerCase();
    return (
      data.role !== 'Admin' && 
      (fullName.includes(searchStr) || uid.toLowerCase().includes(searchStr) || data.idNumber?.toLowerCase().includes(searchStr))
    );
  });

  const renderTable = (title, icon, type) => {
    const dataList = filteredUsers.filter(([_, data]) => data.role === type);
    
    return (
      <div className="registry-section">
        <div className="section-header">
          <div className="title-area">
            <div className="icon-wrapper">{icon}</div>
            <h2>{title} <span className="badge">{dataList.length}</span></h2>
          </div>
        </div>
        
        <div className="table-responsive">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>ID Details</th>
                <th>Contact info</th>
                <th>Placement</th>
                <th>RFID Token</th>
                <th className="text-right">Manage</th>
              </tr>
            </thead>
            <tbody>
              {dataList.map(([uid, data]) => (
                <tr key={uid}>
                  <td>
                    <div className="user-profile-cell">
                      <div className="mini-avatar">
                        {photos[uid]?.image ? <img src={photos[uid].image} alt="" /> : <User size={14}/>}
                      </div>
                      <div className="name-stack">
                        <span className="full-name">{data.lastName}, {data.firstName}</span>
                        <span className="role-tag">{data.role}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="id-number">{data.idNumber}</span>
                  </td>
                  <td>
                    <div className="contact-stack">
                      <div className="contact-item"><Mail size={12}/> {data.email || 'N/A'}</div>
                      <div className="contact-item"><Phone size={12}/> {data.phone || 'N/A'}</div>
                    </div>
                  </td>
                  <td>
                    <div className="placement-stack">
                      <span className="dept-label">{data.department}</span>
                      {data.yearLevel && <span className="year-label">{data.yearLevel} Year</span>}
                    </div>
                  </td>
                  <td>
                    <div className="rfid-pill">
                      <Fingerprint size={12} />
                      {uid.substring(0, 8)}...
                    </div>
                  </td>
                  <td className="text-right">
                    <div className="action-row">
                      <button className="btn-icon edit" onClick={() => {
                        setFormData({...data, rfid: uid, photo: photos[uid]?.image || ''});
                        setIsEditing(true);
                        setIsEnrollModalOpen(true);
                      }}><Edit2 size={16}/></button>
                      <button className="btn-icon delete" onClick={() => {
                        if(confirm("Confirm deletion of this record?")) {
                          remove(ref(db, `users/${uid}`));
                          remove(ref(db, `user_photos/${uid}`));
                        }
                      }}><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-container">
      <header className="main-header">
        <div className="brand-section">
          <h1>Identity Management</h1>
          <p>Database Registry & Access Control</p>
        </div>
        
        <div className="header-tools">
          <div className="search-box">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Filter by name or ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn-primary" onClick={() => setIsEnrollModalOpen(true)}>
            <Plus size={18} /> New Registration
          </button>
        </div>
      </header>

      <main className="content-grid">
        {renderTable("Students", <GraduationCap size={20}/>, "Student")}
        {renderTable("Faculty", <BookOpen size={20}/>, "Instructor")}
        {renderTable("Instructors", <Briefcase size={20}/>, "Staff")}
      </main>

      {isEnrollModalOpen && (
        <div className="modal-backdrop">
          <div className="professional-modal">
            <div className="modal-sidebar">
              <div className="photo-upload-container">
                <div className="large-preview">
                  {formData.photo ? <img src={formData.photo} alt="Preview" /> : <User size={80} strokeWidth={1} />}
                </div>
                <label className="upload-trigger">
                  <Camera size={16} /> Update Photo
                  <input type="file" hidden onChange={handlePhotoChange} />
                </label>
              </div>
              
              <div className="rfid-status-box">
                <h3>RFID Authentication</h3>
                <p>Link physical hardware tag to this digital profile.</p>
                <button 
                  type="button"
                  className={`rfid-link-btn ${formData.rfid ? 'linked' : ''} ${isRfidScanning ? 'scanning' : ''}`}
                  onClick={() => !isEditing && setIsRfidScanning(true)}
                  disabled={isEditing}
                >
                  <Fingerprint size={18} />
                  {isRfidScanning ? "Waiting for Scan..." : formData.rfid ? `ID: ${formData.rfid}` : "Link RFID Tag"}
                </button>
                {isEditing && <small className="lock-notice">Tag ID cannot be changed once linked.</small>}
              </div>
            </div>

            <div className="modal-main-content">
              <div className="modal-header-inline">
                <h2>{isEditing ? "Modify Record" : "New User Registration"}</h2>
                <button className="close-btn" onClick={resetForm}><X size={20}/></button>
              </div>

              <form onSubmit={handleRegister}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>First Name</label>
                    <input type="text" required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input type="text" required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                  </div>
                  <div className="form-group full-width">
                    <label>Email Address</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Assigned Role</label>
                    <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                      <option value="Student">Student</option>
                      <option value="Instructor">Instructor</option>
                      <option value="Staff">Staff</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Official ID Number</label>
                    <input type="text" required value={formData.idNumber} onChange={e => setFormData({...formData, idNumber: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Department</label>
                    <select value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
                      <option value="">Select Department</option>
                      {departmentOptions.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Year Level</label>
                    <select value={formData.yearLevel} onChange={e => setFormData({...formData, yearLevel: e.target.value})}>
                      <option value="">N/A</option>
                      <option value="1st">1st Year</option>
                      <option value="2nd">2nd Year</option>
                      <option value="3rd">3rd Year</option>
                      <option value="4th">4th Year</option>
                    </select>
                  </div>
                </div>

                <div className="form-footer">
                  <button type="button" className="btn-secondary" onClick={resetForm}>Cancel</button>
                  <button type="submit" className="btn-primary">
                    <ShieldCheck size={18} /> {isEditing ? "Update Profile" : "Finalize Registration"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}