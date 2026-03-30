import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebaseConfig';
import { ref, get } from 'firebase/database';
import html2pdf from 'html2pdf.js';

// CRITICAL: Ensure your parent component passes (selectedDates, deptFilter, yearFilter)
export default function OfficialReportView({ selectedDates, deptFilter, yearFilter }) {
  const [groupedData, setGroupedData] = useState({});
  const [loading, setLoading] = useState(true);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const reportRef = useRef();

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      let dataByDate = {};
      
      // Sort dates to show most recent first
      const sortedDates = [...selectedDates].sort().reverse();
      
      for (const date of sortedDates) {
        const dateRef = ref(db, `attendance/${date}`);
        const snapshot = await get(dateRef);
        
        if (snapshot.exists()) {
          const records = Object.values(snapshot.val());
          
          // --- THE FILTER LOGIC ---
          const filtered = records.filter(r => {
            // 1. Role must be student
            const isStudent = r.role?.toLowerCase() === 'student';
            
            // 2. Normalize strings for comparison (removes spaces and makes lowercase)
            const sDept = (r.department || "N/A").trim().toLowerCase();
            const fDept = (deptFilter || "ALL").trim().toLowerCase();
            
            const sYear = (r.yearLevel || "N/A").trim().toLowerCase();
            const fYear = (yearFilter || "ALL").trim().toLowerCase();

            // 3. Check if it matches "ALL" or the specific selection
            const matchesDept = fDept === 'all' || sDept === fDept;
            const matchesYear = fYear === 'all' || sYear === fYear;
            
            return isStudent && matchesDept && matchesYear;
          });

          dataByDate[date] = filtered;
        } else {
          dataByDate[date] = [];
        }
      }
      setGroupedData(dataByDate);
      setLoading(false);
    };

    if (selectedDates && selectedDates.length > 0) {
      fetchAllData();
    }
  }, [selectedDates, deptFilter, yearFilter]); // Component re-runs when filters change

  const formatDisplayDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    return `${month}-${day}-${year.slice(-2)}`;
  };

  const formatTime = (timeStr) => {
    if (!timeStr || timeStr === "--") return '-- : --';
    const date = new Date(timeStr);
    return isNaN(date.getTime()) ? timeStr : date.toLocaleTimeString('en-US', { 
      hour: '2-digit', minute: '2-digit', hour12: true 
    }).toUpperCase();
  };

  const downloadPDF = () => {
    const element = reportRef.current;
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `Filtered_Access_Log.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };
    html2pdf().set(opt).from(element).save();
    setShowDownloadOptions(false);
  };

  const downloadExcel = () => {
    const headers = ["DATE", "NO.", "NAME", "DEPARTMENT", "YEAR", "TIME IN", "TIME OUT"];
    let csvRows = [headers.join(",")];

    Object.keys(groupedData).forEach(date => {
      groupedData[date].forEach((r, i) => {
        csvRows.push([
          `"${formatDisplayDate(date)}"`,
          i + 1,
          `"${r.name.toUpperCase()}"`,
          `"${r.department || 'N/A'}"`,
          `"${r.yearLevel || 'N/A'}"`,
          `"${formatTime(r.timeIn)}"`,
          `"${formatTime(r.timeOut)}"`
        ].join(","));
      });
    });

    const blob = new Blob([csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "Access_Log_Export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowDownloadOptions(false);
  };

  if (loading) return <div className="text-center p-10">Generating Filtered Report...</div>;

  return (
    <div className="official-report-wrapper">
      <div id="report-content" ref={reportRef} style={{ padding: '30px', backgroundColor: '#fff', color: '#000', fontFamily: 'Arial, sans-serif' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '900', margin: '0' }}>ACCESS LOG REPORT</h1>
          <p style={{ fontSize: '1.1rem', margin: '2px 0' }}>Trinidad Municipal College</p>
          <div style={{ fontSize: '0.85rem', color: '#444', marginTop: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}>
            Filter: {deptFilter || 'ALL'} | Year: {yearFilter || 'ALL'}
          </div>
        </div>

        {Object.keys(groupedData).map((date) => (
          groupedData[date].length > 0 && (
            <div key={date} style={{ marginBottom: '35px' }}>
              <h3 style={{ borderBottom: '2px solid #000', paddingBottom: '3px', marginBottom: '10px', fontSize: '1rem' }}>
                LOGS FOR: {formatDisplayDate(date)}
              </h3>
              
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f2f2f2' }}>
                    <th style={{ border: '1px solid #000', padding: '8px', width: '5%' }}>NO.</th>
                    <th style={{ border: '1px solid #000', padding: '8px', width: '35%', textAlign: 'left' }}>FULL NAME</th>
                    <th style={{ border: '1px solid #000', padding: '8px', width: '20%', textAlign: 'center' }}>DEPT & YEAR</th>
                    <th style={{ border: '1px solid #000', padding: '8px', width: '20%', textAlign: 'center' }}>TIME IN</th>
                    <th style={{ border: '1px solid #000', padding: '8px', width: '20%', textAlign: 'center' }}>TIME OUT</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedData[date].map((r, i) => (
                    <tr key={i}>
                      <td style={{ border: '1px solid #000', textAlign: 'center', padding: '6px' }}>{i + 1}</td>
                      <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 'bold' }}>{r.name.toUpperCase()}</td>
                      <td style={{ border: '1px solid #000', textAlign: 'center', padding: '6px', fontSize: '0.75rem' }}>
                        {r.department}<br/>{r.yearLevel}
                      </td>
                      <td style={{ border: '1px solid #000', textAlign: 'center', padding: '6px' }}>{formatTime(r.timeIn)}</td>
                      <td style={{ border: '1px solid #000', textAlign: 'center', padding: '6px' }}>{formatTime(r.timeOut)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ))}

        <div style={{ marginTop: '30px', borderTop: '1px solid #000', paddingTop: '10px' }}>
          <p style={{ fontWeight: 'bold' }}>Total Records Found: {Object.values(groupedData).flat().length}</p>
          <p style={{ fontSize: '0.8rem' }}>Generated on: {new Date().toLocaleString()}</p>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="no-print" style={{ marginTop: '20px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button className="generate-btn" onClick={() => window.print()} style={{ backgroundColor: '#000', color: '#fff', padding: '8px 20px' }}>PRINT</button>
        <div style={{ position: 'relative' }}>
          <button className="generate-btn" onClick={() => setShowDownloadOptions(!showDownloadOptions)} style={{ backgroundColor: '#444', color: '#fff', padding: '8px 20px' }}>DOWNLOAD ▾</button>
          {showDownloadOptions && (
            <div style={{ position: 'absolute', bottom: '100%', right: 0, backgroundColor: '#fff', border: '1px solid #000', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
              <button onClick={downloadPDF} style={{ padding: '10px', border: 'none', background: 'none',color: 'black', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #ddd' }}>PDF</button>
              <button onClick={downloadExcel} style={{ padding: '10px', border: 'none', background: 'none',color: 'black', cursor: 'pointer', textAlign: 'left' }}>EXCEL</button>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden !important; }
          #report-content, #report-content * { visibility: visible !important; }
          #report-content { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; }
          .no-print { display: none !important; }
          @page { size: auto; margin: 10mm; }
        }
      `}} />
    </div>
  );
}