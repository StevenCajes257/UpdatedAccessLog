import React from 'react';
import { LayoutDashboard, Users, FileBarChart, Clock, FileClock, LogOut, Sun, Moon } from 'lucide-react';
import './Sidebar.css';
import logo from '../assets/logo.png';    // ← correct path

export default function Sidebar({ activeTab, setActiveTab, onLogout, theme, setTheme, isOpen, onClose, userRole }) {

  const allMenus = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: ['Admin', 'Staff'] },
    { id: 'USER_LIST', label: 'Users', icon: <Users size={20} />, roles: ['Admin'] },
    { id: 'REPORT_MODULE', label: 'Report Module', icon: <FileBarChart size={20} />, roles: ['Admin', 'Staff'] },
    { id: 'TODAYS_RECORD', label: "Today's Record", icon: <Clock size={20} />, roles: ['Admin', 'Staff'] },
    { id: 'TIMEOUT_REQUESTS', label: 'Timeout Requests', icon: <FileClock size={20} />, roles: ['Admin', 'Staff'] },
  ];

  const sidebarMenus = allMenus.filter(menu => menu.roles.includes(userRole));

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleNavClick = (id) => {
    setActiveTab(id);
    onClose(); // Close sidebar on mobile after selection
  };

  return (
    <>
      <aside className={`app-sidebar ${isOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-header">
          <div className="brand-logo">
            <img src={logo} alt="Access Log Logo" className="brand-icon" />
            <span className="brand-text">Access Log</span>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          {sidebarMenus.map((item) => (
            <button 
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => handleNavClick(item.id)}
              title={!isOpen ? item.label : ''}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="sidebar-footer">
          <button onClick={toggleTheme} className="theme-toggle">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            <span className="nav-label">Theme</span>
          </button>
          <button onClick={onLogout} className="logout-btn-sidebar">
            <LogOut size={18} />
            <span className="nav-label">Logout</span>
          </button>
          <p className="copyright">© 2026 Access Log</p>
        </div>
      </aside>
      {/* Mobile overlay backdrop – closes sidebar when clicked */}
      {isOpen && <div className="sidebar-backdrop" onClick={onClose}></div>}
    </>
  );
}