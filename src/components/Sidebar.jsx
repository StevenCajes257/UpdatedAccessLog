import React from 'react';

export default function Sidebar({ activeTab, setActiveTab }) {
  // Renamed 'RECORDS' to 'TODAYS RECORDS'
  const menus = ['DASHBOARD', 'USER LIST', 'REPORT MODULE', 'TODAYS RECORDS'];
  
  return (
    <aside className="app-sidebar">
      {menus.map(m => (
        <button 
          key={m}
          className={activeTab === m || (activeTab === 'OFFICIAL_REPORT' && m === 'REPORT MODULE') ? 'sidebar-btn active' : 'sidebar-btn'}
          onClick={() => setActiveTab(m)}
        >
          {m}
        </button>
      ))}
    </aside>
  );
}