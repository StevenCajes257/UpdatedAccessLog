import React, { useState } from 'react';
import './App.css';
import { LogOut, UserCircle } from 'lucide-react';

import Sidebar from './components/Sidebar';
import Login from './components/Login';
import DashboardView from './components/DashboardView';
import RecordsView from './components/RecordsView';
import UserListView from './components/UserListView';
import ReportModule from './components/ReportModule'; 
import OfficialReportView from './components/OfficialReportView'; 
import UserActivityReportView from './components/UserActivityReportView'; 
import AboutUs from './components/AboutUs'; 

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [selectedReportType, setSelectedReportType] = useState('');

  const renderMainForm = () => {
    switch (activeTab) {
      case 'DASHBOARD': 
        return <div className="full-width-view"><DashboardView /></div>;
      case 'USER_LIST': 
        return <div className="full-width-view"><UserListView /></div>;
      case 'TODAYS_RECORD': 
        return <div className="full-width-view"><RecordsView /></div>;
      case 'REPORT_MODULE': 
        return (
          <div className="full-width-view">
            <ReportModule onSelectReport={(id) => { 
              setSelectedReportType(id); 
              setActiveTab('OFFICIAL_REPORT'); 
            }} />
          </div>
        );
      case 'OFFICIAL_REPORT': 
        const reportView = selectedReportType === 'User Activity' ? 
          <UserActivityReportView onBack={() => setActiveTab('REPORT_MODULE')} /> :
          <OfficialReportView reportType={selectedReportType} onBack={() => setActiveTab('REPORT_MODULE')} />;
        return <div className="full-width-view">{reportView}</div>;
      case 'ABOUT_US': 
        return <div className="full-width-view"><AboutUs /></div>;
      default: 
        return <div className="full-width-view"><DashboardView /></div>;
    }
  };

  if (!isLoggedIn) {
    return <Login onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="app-shell">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="main-container">
        <header className="top-navbar">
          <div className="navbar-left">
            <span className="current-view-label">
              {activeTab.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="navbar-right">
            <div className="user-profile">
              <UserCircle size={32} className="user-avatar-icon" />
              <div className="user-info">
                <p className="user-name">Administrator</p>
                <p className="user-role">System Admin</p>
              </div>
            </div>
            
            <div className="nav-divider"></div>

            <button className="logout-btn" onClick={() => setIsLoggedIn(false)}>
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </header>
        
        <section className="content-area">
          {renderMainForm()}
        </section>
      </main>
    </div>
  );
}

export default App;