import React, { useState, useEffect, useRef } from 'react';
import { database as db } from '../firebaseConfig';
import { ref, onValue, get, remove } from 'firebase/database';
import { FiUser, FiLock, FiRss, FiAlertTriangle, FiX, FiCheck } from 'react-icons/fi';
import './Login.css';

export default function Login({ onLoginSuccess }) {
  const [credentials, setCredentials] = useState({ user: '', pass: '' });
  const [showRfidModal, setShowRfidModal] = useState(false);
  const [showUserConfirmModal, setShowUserConfirmModal] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginType, setLoginType] = useState(null); // 'Admin', 'Staff', or 'Individual'
  const [pendingUser, setPendingUser] = useState(null); // for student/instructor confirmation
  
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);

  // Digital rain background (unchanged)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const characters = '01'.split('');
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops = [];
    for (let x = 0; x < columns; x++) drops[x] = 1;

    const draw = () => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(99, 102, 241, 0.15)';
      ctx.font = fontSize + 'px monospace';

      for (let i = 0; i < drops.length; i++) {
        const text = characters[Math.floor(Math.random() * characters.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.width && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 33);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Mouse parallax effect (unchanged)
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const handleMouseMove = (e) => {
      const moveX = (e.clientX - window.innerWidth / 2) * 0.01;
      const moveY = (e.clientY - window.innerHeight / 2) * 0.01;
      const elements = wrapper.querySelectorAll('.parallax-element');
      elements.forEach((el, index) => {
        const speed = index * 2 + 1;
        el.style.transform = `translate(${moveX * speed}px, ${moveY * speed}px)`;
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // RFID modal scanner for Admin/Staff (unchanged)
  useEffect(() => {
    let unsubscribe;
    if (showRfidModal && loginType) {
      const scanRef = ref(db, 'current_scan/temp_uid');
      unsubscribe = onValue(scanRef, (snapshot) => {
        const scannedUid = snapshot.val();
        if (scannedUid) {
          const requiredRole = loginType === 'Admin' ? 'admin' : 'staff';
          verifyCard(scannedUid, requiredRole);
        }
      });
    }
    return () => { if (unsubscribe) unsubscribe(); };
  }, [showRfidModal, loginType]);

  const verifyCard = async (uid, requiredRole) => {
    console.log(`Verifying card UID: ${uid} for role: ${requiredRole}`);
    try {
      const userRef = ref(db, `users/${uid}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const userRole = snapshot.val().role?.toLowerCase();
        if (userRole === requiredRole) {
          console.log(`Card verified for ${requiredRole}`);
          await remove(ref(db, 'current_scan/temp_uid'));
          onLoginSuccess({ type: loginType, userData: null }); // Admin/Staff have no extra data
          setShowRfidModal(false);
          setLoginType(null);
        } else {
          setLoginError(`Verification Failed: Card is not assigned to a ${loginType}.`);
          setShowRfidModal(false);
          setLoginType(null);
        }
      } else {
        setLoginError(`Verification Failed: Card not registered in the system.`);
        setShowRfidModal(false);
        setLoginType(null);
      }
    } catch (e) {
      console.error("Error verifying card:", e);
      setLoginError("Database Error.");
      setShowRfidModal(false);
      setLoginType(null);
    }
  };

  // NEW: Find student/instructor by firstName and idNumber
  const findUserByFirstNameAndId = async (firstName, idNumber) => {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    if (!snapshot.exists()) return null;

    const users = snapshot.val();
    for (const [uid, userData] of Object.entries(users)) {
      if (userData.firstName?.toLowerCase() === firstName.toLowerCase() &&
          userData.idNumber === idNumber &&
          (userData.role === 'Student' || userData.role === 'Instructor')) {
        return { uid, ...userData };
      }
    }
    return null;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const { user, pass } = credentials;

    // 1. Admin/Staff hardcoded credentials (unchanged)
    if (user === 'Admin' && pass === 'Admin123') {
      setLoginType('Admin');
      setShowRfidModal(true);
      setLoginError("");
      return;
    } 
    if (user === 'Staff' && pass === 'Staff123') {
      setLoginType('Staff');
      setShowRfidModal(true);
      setLoginError("");
      return;
    }

    // 2. Check if a Student/Instructor matches first name + ID number
    setLoginError("");
    try {
      const matchedUser = await findUserByFirstNameAndId(user, pass);
      if (matchedUser) {
        setPendingUser(matchedUser);
        setShowUserConfirmModal(true);
        setLoginError("");
      } else {
        setLoginError("Invalid first name and ID number combination.");
      }
    } catch (err) {
      console.error(err);
      setLoginError("Database error. Please try again.");
    }
  };

  const confirmUserLogin = () => {
    setShowUserConfirmModal(false);
    onLoginSuccess({ type: 'Individual', userData: pendingUser });
    setPendingUser(null);
  };

  const cancelUserLogin = () => {
    setShowUserConfirmModal(false);
    setPendingUser(null);
  };

  return (
    <div className="security-page-wrapper" ref={wrapperRef}>
      <canvas ref={canvasRef} className="rain-canvas"></canvas>
      <div className="layout-grid">
        <div className="login-column">
          <div className="login-glass-card">
            <div className="login-header">
              <div className="status-badge"><span>SYSTEMSECURE v2.1</span></div>
              <h1 className="title-text">Authorization</h1>
              <p className="subtitle-text">Enter administrative credentials to proceed</p>
            </div>

            <form className="stunning-form" onSubmit={handleLogin}>
              <div className="input-group">
                <FiUser className="input-icon" />
                <input type="text" placeholder="Username" required onChange={(e) => setCredentials({...credentials, user: e.target.value})} />
              </div>
              <div className="input-group">
                <FiLock className="input-icon" />
                <input type="password" placeholder="Password" required onChange={(e) => setCredentials({...credentials, pass: e.target.value})} />
              </div>
              <button type="submit" className="login-submit-btn">
                <span>VALIDATE</span>
                <div className="btn-glow"></div>
              </button>
            </form>
            
            {loginError && (
              <div className="error-display-card">
                <FiAlertTriangle className="error-icon" />
                <p>{loginError}</p>
              </div>
            )}
          </div>
        </div>

        <div className="visual-column">
          <div className="portal-visual parallax-element">
            <div className="portal-backlight"></div>
            <div className="portal-core">
              <div className="circle-1"></div>
              <div className="circle-2"></div>
              <div className="circle-3"></div>
              <FiRss className="central-icon" />
            </div>
            <p className="portal-text">SECURE ACCESS ZONE</p>
          </div>
        </div>
      </div>

      {/* Existing Admin/Staff RFID modal (unchanged) */}
      {showRfidModal && (
        <div className="rfid-overlay">
          <div className="rfid-modal-content">
            <button className="modal-close-btn" onClick={() => {
              setShowRfidModal(false);
              setLoginType(null);
              setLoginError("");
            }}><FiX /></button>
            <div className="scanning-complex">
              <div className="scan-radar"></div>
              <div className="scan-line-animation"></div>
              <FiRss className="modal-scan-icon" />
            </div>
            <h2 className="modal-title">Verification Required</h2>
            <p className="modal-description">
              Place your physical <strong>{loginType === 'Admin' ? 'Administrator' : 'Staff'} RFID Card</strong> against the external reader device.
            </p>
            <div className="status-banner">
              <span className="live-dot pulse"></span>
              AWAITING SCAN...
            </div>
          </div>
        </div>
      )}

      {/* NEW confirmation modal for Student/Instructor */}
      {showUserConfirmModal && pendingUser && (
        <div className="rfid-overlay">
          <div className="rfid-modal-content" style={{ maxWidth: '400px' }}>
            <button className="modal-close-btn" onClick={cancelUserLogin}><FiX /></button>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <FiCheck size={48} style={{ color: '#10b981' }} />
            </div>
            <h2 className="modal-title">Identity Confirmation</h2>
            <p className="modal-description">
              You are logging in as:<br />
              <strong>{pendingUser.name}</strong><br />
              ({pendingUser.role} · {pendingUser.idNumber})
            </p>
            <p>Is this you?</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
              <button className="login-submit-btn" onClick={confirmUserLogin} style={{ background: '#10b981' }}>Yes, it's me</button>
              <button className="login-submit-btn" onClick={cancelUserLogin} style={{ background: '#6b7280' }}>No, cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}