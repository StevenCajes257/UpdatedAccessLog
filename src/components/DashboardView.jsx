import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { ref, onValue } from 'firebase/database';

export default function DashboardView({ onViewRecords }) {
  const [stats, setStats] = useState({ signedIn: 0, signedOut: 0 });
  const [liveFeed, setLiveFeed] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastSync, setLastSync] = useState(new Date().toLocaleTimeString());
  const [isOnline, setIsOnline] = useState(false);

  const getLocalDate = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return (new Date(now - offset)).toISOString().split('T')[0];
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const todayISO = getLocalDate();
    const attendanceRef = ref(db, `attendance/${todayISO}`);
    
    // Listen to Firebase Connection State
    const connectedRef = ref(db, ".info/connected");
    onValue(connectedRef, (snap) => {
      setIsOnline(snap.val() === true);
    });

    const unsubscribe = onValue(attendanceRef, (snap) => {
      const data = snap.val() || {};
      const allRecords = Object.values(data).filter(r => r.role?.toLowerCase() === 'student');
      
      const signedInCount = allRecords.filter(r => r.timeIn && r.timeIn !== "").length;
      const signedOutCount = allRecords.filter(r => r.timeOut && r.timeOut !== "" && r.timeOut !== "--").length;

      setStats({ signedIn: signedInCount, signedOut: signedOutCount });

      const events = [];
      allRecords.forEach(r => {
        if (r.timeIn && r.timeIn !== "") events.push({ name: r.name, time: r.timeIn, type: 'IN' });
        if (r.timeOut && r.timeOut !== "" && r.timeOut !== "--") events.push({ name: r.name, time: r.timeOut, type: 'OUT' });
      });

      const sortedEvents = events.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5);
      setLiveFeed(sortedEvents);
      setLastSync(new Date().toLocaleTimeString());
    });

    return () => unsubscribe();
  }, []);

  return (
    <div style={{ width: '100%', maxWidth: '1100px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>System Oversight</h1>
          <p style={{ color: '#64748b' }}>Real-time campus analytics.</p>
        </div>
        <div style={{ textAlign: 'right', background: '#fff', padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: '700', fontFamily: 'monospace' }}>{currentTime.toLocaleTimeString()}</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>LIVE SYSTEM TIME</div>
        </div>
      </header>

      <div className="stats-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div className="stat-box" style={{ borderLeft: '5px solid #3b82f6', background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <h4 style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Total Entered Today</h4>
          <p style={{ fontSize: '2.5rem', fontWeight: '800', margin: '10px 0' }}>{stats.signedIn.toString().padStart(2, '0')}</p>
          <span style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: '700' }}>DAILY FOOTFALL</span>
        </div>

        <div className="stat-box" style={{ borderLeft: '5px solid #10b981', background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <h4 style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Signed Out</h4>
          <p style={{ fontSize: '2.5rem', fontWeight: '800', margin: '10px 0' }}>{stats.signedOut.toString().padStart(2, '0')}</p>
          <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: '700' }}>EXITED CAMPUS</span>
        </div>

        <div className="stat-box" style={{ borderLeft: '5px solid #f59e0b', background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <h4 style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>On Campus</h4>
          <p style={{ fontSize: '2.5rem', fontWeight: '800', margin: '10px 0' }}>{(stats.signedIn - stats.signedOut).toString().padStart(2, '0')}</p>
          <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: '700' }}>CURRENTLY PRESENT</span>
        </div>

        {/* --- SYSTEM STATUS CARD --- */}
        <div className="stat-box" style={{ borderLeft: `5px solid ${isOnline ? '#10b981' : '#ef4444'}`, background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <h4 style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>System Sync</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '20px 0' }}>
            <span className={isOnline ? "pulse-green" : ""} style={{ width: '12px', height: '12px', background: isOnline ? '#10b981' : '#ef4444', borderRadius: '50%', display: 'inline-block' }}></span>
            <p style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, color: isOnline ? '#10b981' : '#ef4444' }}>
              {isOnline ? "ONLINE" : "OFFLINE"}
            </p>
          </div>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>LAST SYNC: {lastSync}</span>
        </div>
      </div>

      <div style={{ marginTop: '30px', background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%' }}></span>
          Recent Activity Feed
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {liveFeed.length > 0 ? liveFeed.map((event, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderRadius: '8px', background: '#f8fafc', borderLeft: `4px solid ${event.type === 'IN' ? '#3b82f6' : '#10b981'}` }}>
              <div>
                <strong style={{ fontSize: '0.95rem' }}>{event.name}</strong>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{event.type === 'IN' ? 'Entered' : 'Exited'}</div>
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                {new Date(event.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )) : (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Waiting for card taps...</p>
          )}
        </div>
      </div>

      

      <style dangerouslySetInnerHTML={{ __html: `
        .pulse-green {
          animation: pulse-animation 2s infinite;
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
        }
        @keyframes pulse-animation {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
      `}} />
    </div>
  );
}