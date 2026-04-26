import React, { useState, useEffect } from 'react';
import { database as db } from '../firebaseConfig';
import { ref, onValue, set, remove, update, get } from 'firebase/database';
import { 
  Search, Plus, GraduationCap, Briefcase, Edit2, 
  Trash2, BookOpen, Camera, User, X, Fingerprint,
  Mail, Phone, ShieldCheck, RotateCcw, CheckCircle, AlertCircle
} from 'lucide-react';
import './UserListView.css';

export default function UserListView() {
  const [allUsers, setAllUsers] = useState({});
  const [photos, setPhotos] = useState({});
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isRfidScanning, setIsRfidScanning] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [originalPhoto, setOriginalPhoto] = useState("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  // Modal states
  const [showSoftDeleteModal, setShowSoftDeleteModal] = useState(false);
  const [pendingSoftDelete, setPendingSoftDelete] = useState(null); // { uid, name }
  const [showPermanentDeleteModal, setShowPermanentDeleteModal] = useState(false);
  const [pendingPermanentDelete, setPendingPermanentDelete] = useState(null); // { uid, name }
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [pendingReactivate, setPendingReactivate] = useState(null); // { uid, name }
  
  const [formData, setFormData] = useState({
    firstName: '', middleName: '', lastName: '',
    email: '', phone: '', role: 'Student', 
    department: '', idNumber: '', yearLevel: '', rfid: '',
    photo: '' 
  });

  const departmentOptions = [
    "Bachelor of Science in Information Technology",
    "Bachelor of Science in Office Administration",
    "Bachelor of Science in Criminology",
    "Bachelor of Science in Political Science",
    "Bachelor of Science in Education"
  ];

  const sortUsersAlphabetically = (usersArray) => {
    return [...usersArray].sort((a, b) => {
      const [, dataA] = a;
      const [, dataB] = b;
      const lastNameA = (dataA.lastName || '').toLowerCase();
      const lastNameB = (dataB.lastName || '').toLowerCase();
      if (lastNameA < lastNameB) return -1;
      if (lastNameA > lastNameB) return 1;
      const firstNameA = (dataA.firstName || '').toLowerCase();
      const firstNameB = (dataB.firstName || '').toLowerCase();
      if (firstNameA < firstNameB) return -1;
      if (firstNameA > firstNameB) return 1;
      return 0;
    });
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxSize = 500;
          if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);
          
          const base64Length = compressedBase64.length;
          if (base64Length > 500000) {
            console.warn(`Compressed image is still large: ${(base64Length / 1024).toFixed(1)} KB`);
            showToast("Image is still large after compression. Please choose a smaller image (max 2MB).", "error");
            reject(new Error("Image too large after compression"));
          } else {
            console.log(`Compressed image size: ${(base64Length / 1024).toFixed(1)} KB`);
            resolve(compressedBase64);
          }
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const checkUidExists = async (uid, ignoreCurrentUid = null) => {
    const userRef = ref(db, `users/${uid}`);
    const snapshot = await get(userRef);
    if (!snapshot.exists()) return false;
    if (ignoreCurrentUid && uid === ignoreCurrentUid) return false;
    return true;
  };

  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsubscribeUsers = onValue(usersRef, (snap) => {
      setAllUsers(snap.val() || {});
    });

    const photosRef = ref(db, 'user_photos');
    const unsubscribePhotos = onValue(photosRef, (snap) => setPhotos(snap.val() || {}));

    let unsubscribeScan = () => {};
    if (isRfidScanning) {
      const scanRef = ref(db, 'current_scan/temp_uid');
      unsubscribeScan = onValue(scanRef, async (snap) => {
        const scannedUid = snap.val();
        if (scannedUid) {
          setIsRfidScanning(false);
          if (!isEditing) {
            const exists = await checkUidExists(scannedUid);
            if (exists) {
              showToast(`RFID UID ${scannedUid} is already registered. Please use another card.`, "error");
              await remove(ref(db, 'current_scan/temp_uid'));
              return;
            }
          }
          setFormData(prev => ({ ...prev, rfid: scannedUid }));
        }
      });
    }

    return () => {
      unsubscribeUsers();
      unsubscribePhotos();
      unsubscribeScan();
    };
  }, [isRfidScanning, isEditing]);

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("File is larger than 5MB. Please choose a smaller image.", "error");
      return;
    }
    setIsUploadingPhoto(true);
    try {
      const compressedBase64 = await compressImage(file);
      setFormData(prev => ({ ...prev, photo: compressedBase64 }));
    } catch (error) {
      console.error("Image compression failed", error);
      showToast("Failed to process image. Please try a different image.", "error");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!formData.rfid) {
      showToast("Please scan an RFID tag.", "error");
      return;
    }
    if (!formData.email || !formData.email.includes('@')) {
      showToast("A valid email address is required.", "error");
      return;
    }
    if (formData.phone && !/^\d{11}$/.test(formData.phone)) {
      showToast("Phone number must be exactly 11 digits (numbers only).", "error");
      return;
    }
    if (!isEditing) {
      const exists = await checkUidExists(formData.rfid);
      if (exists) {
        showToast(`RFID UID ${formData.rfid} is already registered. Please scan a different card.`, "error");
        return;
      }
    }

    const userData = {
      name: `${formData.firstName} ${formData.middleName} ${formData.lastName}`.replace(/\s+/g, ' ').trim(),
      role: formData.role,
      department: formData.department || "N/A",
      yearLevel: formData.yearLevel || "N/A",
      idNumber: formData.idNumber,
      firstName: formData.firstName,
      lastName: formData.lastName,
      middleName: formData.middleName || "",
      email: formData.email,
      phone: formData.phone || "",
      updatedAt: new Date().toISOString()
    };

    try {
      await set(ref(db, `users/${formData.rfid}`), userData);
      const photoChanged = formData.photo && formData.photo !== originalPhoto;
      if (photoChanged && formData.photo) {
        await set(ref(db, `user_photos/${formData.rfid}`), { image: formData.photo });
      } else if (!formData.photo && originalPhoto) {
        await remove(ref(db, `user_photos/${formData.rfid}`));
      }
      if (!isEditing) {
        await remove(ref(db, 'current_scan/temp_uid'));
      }
      showToast(isEditing ? "User profile updated successfully!" : "User registered successfully!");
      resetForm();
    } catch (error) {
      console.error("User save error:", error);
      showToast(`System Error: Failed to save record. ${error.message || "Check console"}`, "error");
    }
  };

  const resetForm = () => {
    setFormData({ firstName: '', middleName: '', lastName: '', email: '', phone: '', role: 'Student', department: '', idNumber: '', yearLevel: '', rfid: '', photo: '' });
    setOriginalPhoto("");
    setIsEditing(false);
    setIsRfidScanning(false);
    setIsEnrollModalOpen(false);
    setIsUploadingPhoto(false);
  };

  // Soft delete
  const confirmSoftDelete = (uid, name) => {
    setPendingSoftDelete({ uid, name });
    setShowSoftDeleteModal(true);
  };
  const executeSoftDelete = async () => {
    const { uid, name } = pendingSoftDelete;
    try {
      await update(ref(db, `users/${uid}`), {
        deleted: true,
        deletedAt: new Date().toISOString()
      });
      showToast(`${name} has been deactivated.`, "success");
    } catch (err) {
      console.error("Soft delete failed", err);
      showToast("Error deactivating user.", "error");
    } finally {
      setShowSoftDeleteModal(false);
      setPendingSoftDelete(null);
    }
  };

  // Permanent delete
  const confirmPermanentDelete = (uid, name) => {
    setPendingPermanentDelete({ uid, name });
    setShowPermanentDeleteModal(true);
  };
  const executePermanentDelete = async () => {
    const { uid, name } = pendingPermanentDelete;
    try {
      await remove(ref(db, `users/${uid}`));
      await remove(ref(db, `user_photos/${uid}`));
      showToast(`${name} has been permanently deleted.`, "success");
    } catch (err) {
      console.error("Permanent delete failed", err);
      showToast("Error permanently deleting user.", "error");
    } finally {
      setShowPermanentDeleteModal(false);
      setPendingPermanentDelete(null);
    }
  };

  // Reactivate
  const confirmReactivate = (uid, name) => {
    setPendingReactivate({ uid, name });
    setShowReactivateModal(true);
  };
  const executeReactivate = async () => {
    const { uid, name } = pendingReactivate;
    try {
      await update(ref(db, `users/${uid}`), {
        deleted: false,
        deletedAt: null
      });
      showToast(`${name} has been reactivated.`, "success");
    } catch (err) {
      console.error("Reactivation failed", err);
      showToast("Error reactivating user.", "error");
    } finally {
      setShowReactivateModal(false);
      setPendingReactivate(null);
    }
  };

  // Filter active and deleted users
  const activeUsers = {};
  const deletedUsers = {};
  Object.entries(allUsers).forEach(([uid, userData]) => {
    if (userData.deleted) {
      deletedUsers[uid] = userData;
    } else {
      activeUsers[uid] = userData;
    }
  });

  const filterBySearch = (usersObj) => {
    if (!searchTerm) return usersObj;
    const lowerSearch = searchTerm.toLowerCase();
    const filtered = {};
    Object.entries(usersObj).forEach(([uid, data]) => {
      const fullName = `${data.firstName} ${data.lastName}`.toLowerCase();
      if (data.role !== 'Admin' && 
          (fullName.includes(lowerSearch) || uid.toLowerCase().includes(lowerSearch) || data.idNumber?.toLowerCase().includes(lowerSearch))) {
        filtered[uid] = data;
      }
    });
    return filtered;
  };

  const renderTable = (title, icon, type, userObj) => {
    const unsortedList = Object.entries(userObj).filter(([_, data]) => data.role === type);
    const sortedList = sortUsersAlphabetically(unsortedList);
    if (sortedList.length === 0) return null;
    
    return (
      <div className="registry-section">
        <div className="section-header">
          <div className="title-area">
            <div className="icon-wrapper">{icon}</div>
            <h2>{title} <span className="badge">{sortedList.length}</span></h2>
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
              {sortedList.map(([uid, data]) => (
                <tr key={uid}>
                  <td>
                    <div className="user-profile-cell">
                      <div className="mini-avatar">
                        {photos[uid]?.image ? <img src={photos[uid].image} alt="" /> : <User size={14} />}
                      </div>
                      <div className="name-stack">
                        <span className="full-name">{data.lastName}, {data.firstName} {data.middleName ? data.middleName : ''}</span>
                        <span className="role-tag">{data.role}</span>
                      </div>
                    </div>
                  </td>
                  <td><span className="id-number">{data.idNumber}</span></td>
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
                        const existingPhoto = photos[uid]?.image || '';
                        setOriginalPhoto(existingPhoto);
                        setFormData({ ...data, rfid: uid, photo: existingPhoto });
                        setIsEditing(true);
                        setIsEnrollModalOpen(true);
                      }}><Edit2 size={16}/></button>
                      <button className="btn-icon delete" onClick={() => confirmSoftDelete(uid, data.name)}>
                        <Trash2 size={16}/>
                      </button>
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

  const renderDeletedTable = () => {
    const filteredDeleted = filterBySearch(deletedUsers);
    const sorted = sortUsersAlphabetically(Object.entries(filteredDeleted));
    if (sorted.length === 0) return null;
    
    return (
      <div className="registry-section deleted-section">
        <div className="section-header">
          <div className="title-area">
            <div className="icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <Trash2 size={18} />
            </div>
            <h2>Deleted Users <span className="badge">{sorted.length}</span></h2>
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
              {sorted.map(([uid, data]) => (
                <tr key={uid}>
                  <td>
                    <div className="user-profile-cell">
                      <div className="mini-avatar">
                        {photos[uid]?.image ? <img src={photos[uid].image} alt="" /> : <User size={14} />}
                      </div>
                      <div className="name-stack">
                        <span className="full-name">{data.lastName}, {data.firstName} {data.middleName ? data.middleName : ''}</span>
                        <span className="role-tag">{data.role}</span>
                        <span className="deleted-badge">DELETED</span>
                      </div>
                    </div>
                  </td>
                  <td><span className="id-number">{data.idNumber}</span></td>
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
                      <button 
                        className="btn-icon activate" 
                        onClick={() => confirmReactivate(uid, data.name)}
                      >
                        <RotateCcw size={16} />
                      </button>
                      <button 
                        className="btn-icon delete" 
                        onClick={() => confirmPermanentDelete(uid, data.name)}
                        style={{ color: '#ef4444' }}
                      >
                        <Trash2 size={16}/>
                      </button>
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

  const filteredActive = filterBySearch(activeUsers);
  const isDepartmentDisabled = () => formData.role === 'Staff';
  const isYearLevelDisabled = () => formData.role === 'Instructor' || formData.role === 'Staff';

  return (
    <div className="admin-container">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>
          <div className="toast-icon">
            {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          </div>
          <div className="toast-message">{toast.message}</div>
        </div>
      )}

      {/* Soft Delete Modal */}
      {showSoftDeleteModal && pendingSoftDelete && (
        <div className="modal-overlay" onClick={() => setShowSoftDeleteModal(false)}>
          <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon warning">
              <AlertCircle size={48} />
            </div>
            <h3>Soft Delete User</h3>
            <p>Are you sure you want to soft delete <strong>{pendingSoftDelete.name}</strong>?<br/>
            They will be deactivated but their logs will be kept.</p>
            <div className="modal-buttons">
              <button className="btn-cancel" onClick={() => setShowSoftDeleteModal(false)}>Cancel</button>
              <button className="btn-confirm-delete" onClick={executeSoftDelete}>Soft Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Modal */}
      {showPermanentDeleteModal && pendingPermanentDelete && (
        <div className="modal-overlay" onClick={() => setShowPermanentDeleteModal(false)}>
          <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon danger">
              <Trash2 size={48} />
            </div>
            <h3>Permanent Delete</h3>
            <p>Are you sure you want to permanently delete <strong>{pendingPermanentDelete.name}</strong>?<br/>
            This action cannot be undone and will remove all access logs for this user.</p>
            <div className="modal-buttons">
              <button className="btn-cancel" onClick={() => setShowPermanentDeleteModal(false)}>Cancel</button>
              <button className="btn-confirm-permanent" onClick={executePermanentDelete}>Yes, Delete Permanently</button>
            </div>
          </div>
        </div>
      )}

      {/* Reactivate Modal */}
      {showReactivateModal && pendingReactivate && (
        <div className="modal-overlay" onClick={() => setShowReactivateModal(false)}>
          <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon success">
              <RotateCcw size={48} />
            </div>
            <h3>Reactivate User</h3>
            <p>Are you sure you want to reactivate <strong>{pendingReactivate.name}</strong>?<br/>
            This will restore their access to the system.</p>
            <div className="modal-buttons">
              <button className="btn-cancel" onClick={() => setShowReactivateModal(false)}>Cancel</button>
              <button className="btn-confirm-reactivate" onClick={executeReactivate}>Yes, Reactivate</button>
            </div>
          </div>
        </div>
      )}

      <div className="user-list-header">
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
          <label className="show-deleted-toggle">
            <input 
              type="checkbox" 
              checked={showDeleted} 
              onChange={(e) => setShowDeleted(e.target.checked)} 
            />
            Show Deleted Users
          </label>
          <button className="btn-primary" onClick={() => setIsEnrollModalOpen(true)}>
            <Plus size={18} /> New Registration
          </button>
        </div>
      </div>

      <div className="user-list-content">
        {renderTable("Students", <GraduationCap size={20}/>, "Student", filteredActive)}
        {renderTable("Instructors", <BookOpen size={20}/>, "Instructor", filteredActive)}
        {renderTable("Staffs", <Briefcase size={20}/>, "Staff", filteredActive)}
        
        {showDeleted && renderDeletedTable()}
      </div>

      {/* Enrollment Modal (unchanged) */}
      {isEnrollModalOpen && (
        <div className="modal-backdrop">
          <div className="professional-modal">
            <div className="modal-sidebar">
              <div className="photo-upload-container">
                <div className="large-preview">
                  {formData.photo ? <img src={formData.photo} alt="Preview" /> : <User size={80} strokeWidth={1} />}
                </div>
                <label className="upload-trigger" style={{ opacity: isUploadingPhoto ? 0.6 : 1 }}>
                  <Camera size={16} /> {isUploadingPhoto ? "Processing..." : "Update Photo"}
                  <input type="file" hidden accept="image/jpeg,image/png,image/jpg" onChange={handlePhotoChange} disabled={isUploadingPhoto} />
                </label>
                <small className="photo-hint">Max size 5MB (auto compressed)</small>
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
                    <label>First Name *</label>
                    <input type="text" required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} placeholder="e.g., John" />
                  </div>
                  <div className="form-group">
                    <label>Middle Name</label>
                    <input type="text" value={formData.middleName} onChange={e => setFormData({...formData, middleName: e.target.value})} placeholder="Optional" />
                  </div>
                  <div className="form-group">
                    <label>Last Name *</label>
                    <input type="text" required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} placeholder="e.g., Doe" />
                  </div>
                  <div className="form-group full-width">
                    <label>Email Address *</label>
                    <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="user@example.com" />
                    <small className="field-hint">Required for attendance reminders</small>
                  </div>
                  <div className="form-group">
                    <label>Phone Number *</label>
                    <input 
                      type="tel" 
                      required 
                      value={formData.phone} 
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                        setFormData({...formData, phone: val});
                      }} 
                      placeholder="09XXXXXXXXX (11 digits)" 
                      maxLength="11"
                      pattern="\d{11}"
                      title="Exactly 11 digits (numbers only)"
                    />
                    <small className="field-hint">Exactly 11 digits, numbers only</small>
                  </div>
                  <div className="form-group">
                    <label>Assigned Role *</label>
                    <select 
                      required
                      value={formData.role} 
                      onChange={e => {
                        const newRole = e.target.value;
                        setFormData({...formData, role: newRole, department: '', yearLevel: ''});
                      }}
                    >
                      <option value="Student">Student</option>
                      <option value="Instructor">Instructor</option>
                      <option value="Staff">Staff</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Official ID Number *</label>
                    <input type="text" required value={formData.idNumber} onChange={e => setFormData({...formData, idNumber: e.target.value})} placeholder="e.g., 23-017704" />
                  </div>
                  <div className="form-group">
                    <label>Department *</label>
                    <select 
                      required={!isDepartmentDisabled()}
                      value={formData.department} 
                      onChange={e => setFormData({...formData, department: e.target.value})}
                      disabled={isDepartmentDisabled()}
                    >
                      <option value="">Select Department</option>
                      {departmentOptions.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                    {isDepartmentDisabled() && (
                      <small className="field-hint">Department not applicable for Staff</small>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Year Level {!isYearLevelDisabled() && '*'}</label>
                    <select 
                      required={!isYearLevelDisabled()}
                      value={formData.yearLevel} 
                      onChange={e => setFormData({...formData, yearLevel: e.target.value})}
                      disabled={isYearLevelDisabled()}
                    >
                      <option value="">N/A</option>
                      <option value="1st">1st Year</option>
                      <option value="2nd">2nd Year</option>
                      <option value="3rd">3rd Year</option>
                      <option value="4th">4th Year</option>
                    </select>
                    {isYearLevelDisabled() && (
                      <small className="field-hint">
                        {formData.role === 'Instructor' ? 'Year level not applicable for Instructors' : 'Year level not applicable for Staff'}
                      </small>
                    )}
                  </div>
                </div>

                <div className="form-footer">
                  <button type="button" className="btn-secondary" onClick={resetForm}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={isUploadingPhoto}>
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