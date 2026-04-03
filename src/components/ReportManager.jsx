import React, { useState } from 'react';
import ReportModule from './ReportModule';
import OfficialReportView from './OfficialReportView';
import UserActivityReportView from './UserActivityReportView'; // Import new view

export default function ReportManager() {
  const [activeReport, setActiveReport] = useState(null);

  const handleOpenReport = (reportId) => {
    setActiveReport(reportId);
  };

  const handleBack = () => {
    setActiveReport(null);
  };

  return (
    <div className="report-manager-wrapper">
      {/* If User Activity is selected, show the specific User View */}
      {activeReport === 'User Activity' ? (
        <UserActivityReportView onBack={handleBack} />
      ) : activeReport ? (
        /* Otherwise show the Official View for Daily/Weekly/Monthly */
        <OfficialReportView 
          reportType={activeReport} 
          onBack={handleBack} 
        />
      ) : (
        /* Default: Show the Menu Grid */
        <ReportModule onSelectReport={handleOpenReport} />
      )}
    </div>
  );
}