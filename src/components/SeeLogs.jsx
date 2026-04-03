import React from 'react';
import { ChevronLeft, Download, FileSpreadsheet, FileText, UserCircle, Calendar } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import './SeeLogs.css'; 

export default function SeeLogs({ logs, filters, onBack }) {
  
  const formatTime = (timeValue) => {
    if (!timeValue || timeValue === '--') return '--';
    
    const timestamp = Number(timeValue);
    if (!isNaN(timestamp) && timestamp > 1000000000) {
      return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
    return timeValue;
  };

  const groupedLogs = logs.reduce((groups, log) => {
    const date = log.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(log);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedLogs).sort((a, b) => new Date(b) - new Date(a));

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235);
    doc.text("TRINIDAD MUNICIPAL COLLEGE", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Official Student Access Report", 14, 27);
    
    // Check if showing specific user or general report
    const subTitle = filters.userName ? `Student: ${filters.userName}` : `Dept: ${filters.dept}`;
    doc.text(subTitle, 14, 34);
    doc.text(`Period: ${filters.month}`, 14, 39);
    doc.text(`Report Generated: ${new Date().toLocaleString()}`, 14, 44);

    let finalY = 50;

    sortedDates.forEach((date) => {
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(`Date: ${date}`, 14, finalY + 10);
      
      autoTable(doc, {
        startY: finalY + 15,
        head: [['Student Name', 'Department', 'Year', 'Time In', 'Time Out']],
        body: groupedLogs[date].map(l => [
          l.name?.toUpperCase() || 'N/A',
          l.department || 'N/A',
          l.yearLevel || 'N/A',
          formatTime(l.timeIn),
          formatTime(l.timeOut)
        ]),
        headStyles: { fillColor: [37, 99, 235] },
        margin: { left: 14 },
        theme: 'grid'
      });
      finalY = doc.lastAutoTable.finalY + 10;
    });

    doc.save(`Attendance_Report_${filters.userName || 'General'}.pdf`);
  };

  const exportCSV = () => {
    const headers = ["Date", "Name", "Department", "Year Level", "Time In", "Time Out"];
    const csvRows = logs.map(l => [
      l.date,
      l.name?.toUpperCase(),
      l.department,
      l.yearLevel,
      formatTime(l.timeIn),
      formatTime(l.timeOut)
    ]);

    const csvContent = [headers, ...csvRows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Logs_${filters.userName || 'Export'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="seelogs-view-container">
      <div className="seelogs-content-wrapper">
        <div className="seelogs-nav-bar">
          <button onClick={onBack} className="seelogs-back-btn">
            <ChevronLeft size={20} />
            Back to Calendar
          </button>
          
          <div className="seelogs-action-group">
            <button onClick={exportCSV} className="seelogs-btn-csv">
              <FileSpreadsheet size={18} /> Export CSV
            </button>
            <button onClick={generatePDF} className="seelogs-btn-pdf">
              <FileText size={18} /> Export PDF
            </button>
          </div>
        </div>

        <div className="seelogs-header-card">
          <div className="seelogs-header-main">
            <div className="seelogs-title-section">
              <h1>{filters.userName ? filters.userName.toUpperCase() : "ACCESS LOG REPORT"}</h1>
              <p>{filters.userName ? `Personal access records for ${filters.month}` : "Official records for Trinidad Municipal College"}</p>
            </div>
            <div className="seelogs-filter-info">
              <div className="dept-tag">{filters.dept?.toUpperCase()}</div>
              <div className="year-tag">{filters.year}</div>
            </div>
          </div>
        </div>

        <div className="seelogs-main-card">
          {sortedDates.length > 0 ? (
            sortedDates.map((date) => (
              <div key={date} className="seelogs-date-group">
                <div className="seelogs-date-header">
                  <Calendar size={18} color="#2563eb" />
                  <h3>{new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                </div>

                <div className="seelogs-table-responsive">
                  <table className="seelogs-table">
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Dept</th>
                        <th>Year</th>
                        <th>Time In</th>
                        <th>Time Out</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedLogs[date].map((log, i) => (
                        <tr key={i}>
                          <td>
                            <div className="student-name-cell">
                              <div className="avatar-circle">
                                <UserCircle size={18} color="#64748b" />
                              </div>
                              <span>{log.name?.toUpperCase()}</span>
                            </div>
                          </td>
                          <td>{log.department?.replace('Bachelor of Science in ', 'BS')}</td>
                          <td>{log.yearLevel}</td>
                          <td className="time-in-cell">{formatTime(log.timeIn)}</td>
                          <td className="time-out-cell">{formatTime(log.timeOut)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          ) : (
            <div className="seelogs-empty-state">
              <FileText size={48} className="empty-icon" />
              <p>No records found for the selected criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}