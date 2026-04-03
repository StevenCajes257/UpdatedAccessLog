import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { ref, onValue, get, remove } from 'firebase/database';
import './Login.css';

export default function Login({ onLoginSuccess }) {
  const [credentials, setCredentials] = useState({ user: '', pass: '' });
  const [showRfidModal, setShowRfidModal] = useState(false);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    let unsubscribe;
    if (showRfidModal) {
      const scanRef = ref(db, 'current_scan/temp_uid');
      unsubscribe = onValue(scanRef, (snapshot) => {
        const scannedUid = snapshot.val();
        if (scannedUid) verifyAdminCard(scannedUid);
      });
    }
    return () => { if (unsubscribe) unsubscribe(); };
  }, [showRfidModal]);

  const verifyAdminCard = async (uid) => {
    try {
      const userRef = ref(db, `users/${uid}`);
      const snapshot = await get(userRef);
      if (snapshot.exists() && snapshot.val().role?.toLowerCase() === "admin") {
        await remove(ref(db, 'current_scan/temp_uid')); 
        onLoginSuccess();
      } else {
        setLoginError("Access Denied: Not an Admin.");
        setShowRfidModal(false);
      }
    } catch (e) { setLoginError("Database Error."); }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (credentials.user === 'Admin' && credentials.pass === 'Admin123') {
      setShowRfidModal(true);
    } else {
      setLoginError("Invalid Credentials");
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-card-container">
        <div className="login-header-pill">SIGN IN</div>
        <form className="login-form" onSubmit={handleLogin}>
          <input 
            type="text" 
            placeholder="Username" 
            onChange={(e) => setCredentials({...credentials, user: e.target.value})} 
          />
          <input 
            type="password" 
            placeholder="Password" 
            onChange={(e) => setCredentials({...credentials, pass: e.target.value})} 
          />
          <button type="submit" className="login-action-btn">LOGIN</button>
          {loginError && <p className="error-text">{loginError}</p>}
        </form>
      </div>

      {showRfidModal && (
        <div className="modal-overlay">
          <div className="modal-content admin-verify">
            <div className="radar active"></div>
            <h2 className="modal-title">Security Authentication</h2>
            <p className="modal-info">Tap Admin RFID Card to continue.</p>
            <button className="cancel-link" onClick={() => setShowRfidModal(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}