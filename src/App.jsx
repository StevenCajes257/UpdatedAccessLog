import React, { useState, useEffect } from 'react';
import './App.css';
import { LogOut, UserCircle, Settings, X, Sun, Moon, Menu, AlertTriangle } from 'lucide-react';
import { database as db } from './firebaseConfig';
import { ref, set } from 'firebase/database';

import Sidebar from './components/Sidebar';
import Login from './components/Login';
import DashboardView from './components/DashboardView';
import RecordsView from './components/RecordsView';
import UserListView from './components/UserListView';
import ReportModule from './components/ReportModule'; 
import OfficialReportView from './components/OfficialReportView'; 
import UserActivityReportView from './components/UserActivityReportView'; 
import AboutUs from './components/AboutUs';
import IndividualLogs from './components/IndividualLogs';
import TimeoutRequests from './components/TimeoutRequests';

const LOGIN_STORAGE_KEY = 'access_log_logged_in';
const ROLE_STORAGE_KEY = 'access_log_user_role';
const USER_DATA_KEY = 'access_log_user_data';
const LOGIN_TIMESTAMP_KEY = 'access_log_login_timestamp';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const loggedIn = localStorage.getItem(LOGIN_STORAGE_KEY) === 'true';
    if (!loggedIn) return false;
    const loginTimestamp = localStorage.getItem(LOGIN_TIMESTAMP_KEY);
    if (loginTimestamp) {
      const timeSinceLogin = Date.now() - parseInt(loginTimestamp);
      if (timeSinceLogin > INACTIVITY_TIMEOUT) {
        localStorage.removeItem(LOGIN_STORAGE_KEY);
        localStorage.removeItem(ROLE_STORAGE_KEY);
        localStorage.removeItem(USER_DATA_KEY);
        localStorage.removeItem(LOGIN_TIMESTAMP_KEY);
        return false;
      }
    }
    return true;
  });
  const [userRole, setUserRole] = useState(() => {
    return localStorage.getItem(ROLE_STORAGE_KEY) || 'Staff';
  });
  const [individualUser, setIndividualUser] = useState(() => {
    const stored = localStorage.getItem(USER_DATA_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [selectedReportType, setSelectedReportType] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showIndividualRequestModal, setShowIndividualRequestModal] = useState(false);
  const [showIndividualAboutUs, setShowIndividualAboutUs] = useState(false);

  const [inactivityTimer, setInactivityTimer] = useState(null);
  const [inactivityWarning, setInactivityWarning] = useState(false);
  const [warningTimer, setWarningTimer] = useState(null);

  const resetInactivityTimer = () => {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    if (warningTimer) clearTimeout(warningTimer);
    setInactivityWarning(false);
    const newTimer = setTimeout(() => {
      setInactivityWarning(true);
      const warnTimer = setTimeout(() => {
        performLogout();
      }, 30000);
      setWarningTimer(warnTimer);
    }, INACTIVITY_TIMEOUT);
    setInactivityTimer(newTimer);
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'click', 'touchstart'];
    const handleActivity = () => resetInactivityTimer();
    events.forEach(event => window.addEventListener(event, handleActivity));
    resetInactivityTimer();
    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      if (inactivityTimer) clearTimeout(inactivityTimer);
      if (warningTimer) clearTimeout(warningTimer);
    };
  }, [isLoggedIn]);

  const handleHardRefresh = () => {
    window.location.reload();
  };

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isSidebarOpen && window.innerWidth <= 768) {
        const sidebar = document.querySelector('.app-sidebar');
        const menuBtn = document.querySelector('.menu-toggle-btn');
        if (sidebar && !sidebar.contains(e.target) && menuBtn && !menuBtn.contains(e.target)) {
          setIsSidebarOpen(false);
        }
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isSidebarOpen]);

  const renderMainForm = () => {
    if (userRole === 'individual' && individualUser) {
      const userId = individualUser.uid;
      return (
        <IndividualLogs 
          user={individualUser} 
          userId={userId}
          showRequestModal={showIndividualRequestModal}
          onRequestModalClose={() => setShowIndividualRequestModal(false)}
        />
      );
    }

    switch (activeTab) {
      case 'DASHBOARD': 
        return <DashboardView />;
      case 'USER_LIST': 
        return userRole === 'Admin' ? <UserListView /> : <DashboardView />;
      case 'TODAYS_RECORD': 
        return <RecordsView />;
      case 'REPORT_MODULE': 
        return (
          <ReportModule onSelectReport={(id) => { 
            setSelectedReportType(id); 
            setActiveTab('OFFICIAL_REPORT'); 
          }} />
        );
      case 'OFFICIAL_REPORT': 
        const reportView = selectedReportType === 'User Activity' ? 
          <UserActivityReportView onBack={() => setActiveTab('REPORT_MODULE')} /> :
          <OfficialReportView reportType={selectedReportType} onBack={() => setActiveTab('REPORT_MODULE')} />;
        return reportView;
      case 'ABOUT_US': 
        return <AboutUs />;
      case 'TIMEOUT_REQUESTS':
        return <TimeoutRequests />;
      default: 
        return <DashboardView />;
    }
  };

  const performLogout = async () => {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    if (warningTimer) clearTimeout(warningTimer);
    setInactivityWarning(false);
    localStorage.removeItem(LOGIN_STORAGE_KEY);
    localStorage.removeItem(ROLE_STORAGE_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    localStorage.removeItem(LOGIN_TIMESTAMP_KEY);
    if (userRole !== 'individual') {
      const today = new Date().toISOString().split('T')[0];
      const adminUid = "D7520D25";
      const trackerPath = `/trackers/${today}/${adminUid}`;
      try {
        await set(ref(db, trackerPath + '/status'), 'OUT');
        console.log("Admin status reset to OUT");
      } catch (error) {
        console.error("Failed to reset admin status:", error);
      }
    }
    setIsLoggedIn(false);
    setUserRole(null);
    setIndividualUser(null);
    setShowLogoutConfirm(false);
    setIsSettingsOpen(false);
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleLoginSuccess = (loginInfo) => {
    const { type, userData } = loginInfo;
    localStorage.setItem(LOGIN_STORAGE_KEY, 'true');
    localStorage.setItem(LOGIN_TIMESTAMP_KEY, Date.now().toString());
    if (type === 'Individual') {
      localStorage.setItem(ROLE_STORAGE_KEY, 'individual');
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
      setUserRole('individual');
      setIndividualUser(userData);
    } else {
      localStorage.setItem(ROLE_STORAGE_KEY, type);
      setUserRole(type);
    }
    setIsLoggedIn(true);
    console.log("Login success, type:", type);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // ========== INDIVIDUAL USER LAYOUT ==========
  if (userRole === 'individual' && individualUser) {
    return (
      <>
        {inactivityWarning && (
          <div className="modal-overlay">
            <div className="logout-confirm-modal" style={{ maxWidth: '400px' }}>
              <div className="modal-icon warning">
                <AlertTriangle size={48} />
              </div>
              <h3>Session Expiring Soon</h3>
              <p>You will be logged out due to inactivity in 30 seconds.</p>
              <div className="modal-buttons">
                <button className="btn-confirm" onClick={() => {
                  resetInactivityTimer();
                  setInactivityWarning(false);
                }} style={{ background: 'var(--primary-color)' }}>
                  Stay Logged In
                </button>
              </div>
            </div>
          </div>
        )}
        <div className={`app-shell-simple ${theme}`}>
          <div className="individual-header">
            <h2>My Attendance Logs</h2>
            <button className="settings-btn" onClick={() => setIsSettingsOpen(true)}>
              <Settings size={18} />
              <span>Settings</span>
            </button>
          </div>
          <div className="individual-content">
            {showIndividualAboutUs ? (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <button 
                    onClick={() => setShowIndividualAboutUs(false)} 
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: 'var(--text-secondary)',
                      padding: '0.5rem',
                      borderRadius: '8px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    ← Back to My Logs
                  </button>
                </div>
                <AboutUs />
              </>
            ) : (
              renderMainForm()
            )}
          </div>

          {isSettingsOpen && (
            <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
              <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>Settings</h2>
                  <button className="close-modal-btn" onClick={() => setIsSettingsOpen(false)}>
                    <X size={20} />
                  </button>
                </div>
                <div className="modal-body">
                  <div className="settings-section">
                    <h3>Appearance</h3>
                    <div className="theme-options">
                      <button 
                        className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                        onClick={() => setTheme('light')}
                      >
                        <Sun size={20} />
                        <span>Light</span>
                      </button>
                      <button 
                        className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                        onClick={() => setTheme('dark')}
                      >
                        <Moon size={20} />
                        <span>Dark</span>
                      </button>
                    </div>
                  </div>
                  <div className="settings-section">
                    <h3>About</h3>
                    <button 
                      className="about-settings-btn"
                      onClick={() => {
                        setShowIndividualAboutUs(true);
                        setIsSettingsOpen(false);
                      }}
                    >
                      About Us
                    </button>
                  </div>
                  <div className="settings-section">
                    <h3>Assistance</h3>
                    <button 
                      className="request-timeout-btn"
                      onClick={() => {
                        setShowIndividualRequestModal(true);
                        setIsSettingsOpen(false);
                      }}
                    >
                      Forgot to tap out?
                    </button>
                  </div>
                  <div className="settings-section">
                    <h3>Account</h3>
                    <button 
                      className="logout-settings-btn"
                      onClick={() => {
                        setIsSettingsOpen(false);
                        handleLogoutClick();
                      }}
                    >
                      <LogOut size={18} />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showLogoutConfirm && (
            <div className="modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
              <div className="logout-confirm-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-icon">
                  <AlertTriangle size={48} />
                </div>
                <h3>Confirm Logout</h3>
                <p>Are you sure you want to log out? You will need to log in again to access the system.</p>
                <div className="modal-buttons">
                  <button className="btn-cancel" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
                  <button className="btn-confirm" onClick={performLogout}>Yes, Logout</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  // ========== ADMIN / STAFF LAYOUT ==========
  return (
    <>
      {inactivityWarning && (
        <div className="modal-overlay">
          <div className="logout-confirm-modal" style={{ maxWidth: '400px' }}>
            <div className="modal-icon warning">
              <AlertTriangle size={48} />
            </div>
            <h3>Session Expiring Soon</h3>
            <p>You will be logged out due to inactivity in 30 seconds.</p>
            <div className="modal-buttons">
              <button className="btn-confirm" onClick={() => {
                resetInactivityTimer();
                setInactivityWarning(false);
              }} style={{ background: 'var(--primary-color)' }}>
                Stay Logged In
              </button>
            </div>
          </div>
        </div>
      )}
      <div className={`app-shell ${theme}`}>
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onLogout={handleLogoutClick}
          theme={theme}
          setTheme={setTheme}
          isOpen={isSidebarOpen}
          onClose={closeSidebar}
          userRole={userRole}
        />

        {/*{isSidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}*/}

        <main className="main-container">
          <header className="top-navbar">
            <div className="navbar-left">
              {/* ✅ ADDED: Hamburger menu button for mobile */}
              <button className="menu-toggle-btn" onClick={toggleSidebar}>
                <Menu size={24} />
              </button>
              <span className="current-view-label">
                {activeTab.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="navbar-right">
              <div className="user-profile" onClick={handleHardRefresh} style={{ cursor: 'pointer' }}>
                <UserCircle size={28} className="user-avatar-icon" />
                <div className="user-info">
                  <p className="user-name">{userRole === 'Admin' ? 'Administrator' : 'Staff'}</p>
                  <p className="user-role">{userRole === 'Admin' ? 'System Admin' : 'Staff'}</p>
                </div>
              </div>
              <div className="header-actions">
                <button className="settings-btn" onClick={() => setIsSettingsOpen(true)}>
                  <Settings size={18} />
                  <span>Settings</span>
                </button>
              </div>
            </div>
          </header>
          <section className="content-area">
            {renderMainForm()}
          </section>
        </main>

        {isSettingsOpen && (
          <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
            <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Settings</h2>
                <button className="close-modal-btn" onClick={() => setIsSettingsOpen(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                <div className="settings-section">
                  <h3>Appearance</h3>
                  <div className="theme-options">
                    <button 
                      className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                      onClick={() => setTheme('light')}
                    >
                      <Sun size={20} />
                      <span>Light</span>
                    </button>
                    <button 
                      className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                      onClick={() => setTheme('dark')}
                    >
                      <Moon size={20} />
                      <span>Dark</span>
                    </button>
                  </div>
                </div>
                <div className="settings-section">
                  <h3>About</h3>
                  <button 
                    className="about-settings-btn"
                    onClick={() => {
                      setActiveTab('ABOUT_US');
                      setIsSettingsOpen(false);
                    }}
                  >
                    About Us
                  </button>
                </div>
                <div className="settings-section">
                  <h3>Account</h3>
                  <button 
                    className="logout-settings-btn"
                    onClick={() => {
                      setIsSettingsOpen(false);
                      handleLogoutClick();
                    }}
                  >
                    <LogOut size={18} />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showLogoutConfirm && (
          <div className="modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
            <div className="logout-confirm-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-icon">
                <AlertTriangle size={48} />
              </div>
              <h3>Confirm Logout</h3>
              <p>Are you sure you want to log out? You will need to log in again to access the system.</p>
              <div className="modal-buttons">
                <button className="btn-cancel" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
                <button className="btn-confirm" onClick={performLogout}>Yes, Logout</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default App;