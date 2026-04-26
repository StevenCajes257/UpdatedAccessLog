import React from 'react';
import { ChevronLeft, Download, FileSpreadsheet, FileText, UserCircle, Calendar, Printer } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import './SeeLogs.css'; 

export default function SeeLogs({ logs, filters, onBack }) {
  
  const formatTime = (timeValue, logType, isTimeOut = false) => {
    // Handle incomplete sessions
    if (logType === 'session' && isTimeOut && (!timeValue || timeValue === '--')) {
      return '⚠️ INCOMPLETE';
    }
    
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

  // Generate report title based on filters
  const getReportTitle = () => {
    if (filters.userName) {
      return `${filters.userName.toUpperCase()} - Personal Access Report`;
    }
    
    switch (filters.role) {
      case 'Student':
        return `ALL LOGS OF STUDENTS IN ${filters.dept?.toUpperCase() || 'ALL DEPARTMENTS'}${filters.year && filters.year !== 'ALL' ? ` - ${filters.year.toUpperCase()}` : ''}`;
      case 'Instructor':
        return `ALL LOGS OF INSTRUCTORS IN ${filters.dept?.toUpperCase() || 'ALL DEPARTMENTS'}`;
      case 'Staff':
        return `ALL LOGS OF STAFF`;
      default:
        return "ACCESS LOG REPORT";
    }
  };

  const getReportSubtitle = () => {
    if (filters.userName) {
      return `Personal access records for ${filters.month}`;
    }
    
    switch (filters.role) {
      case 'Student':
        return `Student access records for ${filters.month}`;
      case 'Instructor':
        return `Instructor access records for ${filters.month}`;
      case 'Staff':
        return `Staff access records for ${filters.month}`;
      default:
        return "Official records for Trinidad Municipal College";
    }
  };

  // Get table headers based on role
  const getTableHeaders = () => {
    if (filters.userName) {
      return ['Student Name', 'Dept', 'Year', 'Time In', 'Time Out'];
    }
    
    switch (filters.role) {
      case 'Student':
        return ['Student Name', 'Role', 'Dept', 'Year', 'Time In', 'Time Out'];
      case 'Instructor':
        return ['Instructor Name', 'Role', 'Dept', 'Time In', 'Time Out'];
      case 'Staff':
        return ['Staff Name', 'Role', 'Time In', 'Time Out'];
      default:
        return ['Name', 'Role', 'Dept', 'Year', 'Time In', 'Time Out'];
    }
  };

  // Get table rows based on role
  const getTableRow = (log) => {
    if (filters.userName) {
      return [
        log.name?.toUpperCase() || 'N/A',
        log.department?.replace('Bachelor of Science in ', 'BS') || 'N/A',
        log.yearLevel || 'N/A',
        formatTime(log.timeIn, log.logType, false),
        formatTime(log.timeOut, log.logType, true)
      ];
    }
    
    switch (filters.role) {
      case 'Student':
        return [
          log.name?.toUpperCase() || 'N/A',
          log.role || 'Student',
          log.department?.replace('Bachelor of Science in ', 'BS') || 'N/A',
          log.yearLevel || 'N/A',
          formatTime(log.timeIn, log.logType, false),
          formatTime(log.timeOut, log.logType, true)
        ];
      case 'Instructor':
        return [
          log.name?.toUpperCase() || 'N/A',
          log.role || 'Instructor',
          log.department?.replace('Bachelor of Science in ', 'BS') || 'N/A',
          formatTime(log.timeIn, log.logType, false),
          formatTime(log.timeOut, log.logType, true)
        ];
      case 'Staff':
        return [
          log.name?.toUpperCase() || 'N/A',
          log.role || 'Staff',
          formatTime(log.timeIn, log.logType, false),
          formatTime(log.timeOut, log.logType, true)
        ];
      default:
        return [
          log.name?.toUpperCase() || 'N/A',
          log.role || 'N/A',
          log.department?.replace('Bachelor of Science in ', 'BS') || 'N/A',
          log.yearLevel || 'N/A',
          formatTime(log.timeIn, log.logType, false),
          formatTime(log.timeOut, log.logType, true)
        ];
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235);
    doc.text("TRINIDAD MUNICIPAL COLLEGE", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(getReportTitle(), 14, 27);
    doc.text(getReportSubtitle(), 14, 32);
    doc.text(`Report Generated: ${new Date().toLocaleString()}`, 14, 37);

    let finalY = 45;

    sortedDates.forEach((date) => {
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(`Date: ${date}`, 14, finalY + 10);
      
      const headers = [getTableHeaders()];
      const body = groupedLogs[date].map(log => getTableRow(log));
      
      autoTable(doc, {
        startY: finalY + 15,
        head: headers,
        body: body,
        headStyles: { fillColor: [37, 99, 235] },
        margin: { left: 14 },
        theme: 'grid'
      });
      finalY = doc.lastAutoTable.finalY + 10;
    });

    doc.save(`Attendance_Report_${filters.role || 'General'}_${filters.month}.pdf`);
  };

  const exportCSV = () => {
    const headers = ["Date", ...getTableHeaders()];
    const csvRows = logs.map(l => [
      l.date,
      ...getTableRow(l)
    ]);

    const csvContent = [headers, ...csvRows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Logs_${filters.role || 'Export'}_${filters.month}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const headers = getTableHeaders();
    
    let tableRows = '';
    sortedDates.forEach((date) => {
      tableRows += `
        <div class="print-date-group">
          <h3 style="margin: 20px 0 10px 0; padding-bottom: 5px; border-bottom: 2px solid #2563eb;">Date: ${new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #2563eb; color: white;">
                ${headers.map(h => `<th style="padding: 10px; border: 1px solid #ddd; text-align: left;">${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${groupedLogs[date].map(log => `
                <tr>
                  ${getTableRow(log).map(cell => `<td style="padding: 8px; border: 1px solid #ddd;">${cell}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Attendance Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { margin: 0; color: #2563eb; }
          .header p { margin: 5px 0; color: #666; }
          .print-date-group { page-break-inside: avoid; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { padding: 8px; border: 1px solid #ddd; text-align: left; }
          th { background-color: #2563eb; color: white; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>TRINIDAD MUNICIPAL COLLEGE</h1>
          <p>${getReportTitle()}</p>
          <p>${getReportSubtitle()}</p>
          <p>Report Generated: ${new Date().toLocaleString()}</p>
        </div>
        ${tableRows}
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="seelogs-view-container">
      <div className="seelogs-content-wrapper">
        <div className="seelogs-nav-bar">
          <button onClick={onBack} className="seelogs-back-btn">
            <ChevronLeft size={20} />
            <span>Back to Calendar</span>
          </button>
          
          <div className="seelogs-action-group">
            <button onClick={exportCSV} className="seelogs-btn-csv">
              <FileSpreadsheet size={18} /> 
              <span>Export CSV</span>
            </button>
            <button onClick={generatePDF} className="seelogs-btn-pdf">
              <FileText size={18} /> 
              <span>Export PDF</span>
            </button>
            <button onClick={handlePrint} className="seelogs-btn-print">
              <Printer size={18} /> 
              <span>Print</span>
            </button>
          </div>
        </div>

        <div className="seelogs-header-card">
          <div className="seelogs-header-main">
            <div className="seelogs-title-section">
              <h1>{getReportTitle()}</h1>
              <p>{getReportSubtitle()}</p>
            </div>
            <div className="seelogs-filter-info">
              {filters.dept && filters.dept !== 'ALL' && filters.role !== 'Staff' && (
                <div className="dept-tag">{filters.dept?.toUpperCase()}</div>
              )}
              {filters.year && filters.year !== 'ALL' && filters.role === 'Student' && (
                <div className="year-tag">{filters.year}</div>
              )}
            </div>
          </div>
        </div>

        <div className="seelogs-main-card">
          {sortedDates.length > 0 ? (
            sortedDates.map((date) => (
              <div key={date} className="seelogs-date-group">
                <div className="seelogs-date-header">
                  <Calendar size={18} />
                  <h3>{new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                </div>

                <div className="seelogs-table-responsive">
                  <table className="seelogs-table">
                    <thead>
                      <tr>
                        {getTableHeaders().map((header, idx) => (
                          <th key={idx}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {groupedLogs[date].map((log, i) => (
                        <tr key={i}>
                          {getTableRow(log).map((cell, cellIdx) => (
                            <td key={cellIdx}>
                              {cellIdx === 0 && !filters.userName ? (
                                <div className="student-name-cell">
                                  <div className="avatar-circle">
                                    <UserCircle size={18} />
                                  </div>
                                  <span>{cell}</span>
                                </div>
                              ) : (
                                cell
                              )}
                            </td>
                          ))}
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