import React from 'react';
import { LayoutDashboard, Users, FileBarChart, Clock, Info } from 'lucide-react';
import './Sidebar.css';

export default function Sidebar({ activeTab, setActiveTab }) {
  const sidebarMenus = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'USER_LIST', label: 'Users', icon: <Users size={20} /> },
    { id: 'REPORT_MODULE', label: 'Report Module', icon: <FileBarChart size={20} /> },
    { id: 'TODAYS_RECORD', label: "Today's Record", icon: <Clock size={20} /> },
    { id: 'ABOUT_US', label: 'About Us', icon: <Info size={20} /> }, // Added About Us
  ];

  return (
    <aside className="app-sidebar">
      <div className="sidebar-header">
        <h2 className="brand-title">Access Log</h2>
      </div>
      <nav className="sidebar-nav">
        {sidebarMenus.map((item) => (
          <button 
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <p>© 2026 Access Log</p>
      </div>
    </aside>
  );
}