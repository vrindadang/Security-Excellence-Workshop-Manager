
import React, { useState, useEffect } from 'react';
import { ViewState, AttendanceRecord, ScoreRecord, Sewadar, Volunteer, Gender, GentsGroup } from './types';
import { INITIAL_SEWADARS, VOLUNTEERS } from './constants';
import AttendanceManager from './components/AttendanceManager';
import PointsManager from './components/PointsManager';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import ParticipantView from './components/ParticipantView';

const App: React.FC = () => {
  const [activeVolunteer, setActiveVolunteer] = useState<Volunteer | null>(null);
  const [activeView, setActiveView] = useState<ViewState>('Participant');
  
  // Persistence for Sewadars list - VERSION 2 (Updated with real data)
  const [sewadars, setSewadars] = useState<Sewadar[]>(() => {
    const saved = localStorage.getItem('skrm_sewadars_v2');
    return saved ? JSON.parse(saved) : INITIAL_SEWADARS;
  });
  
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('skrm_attendance');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [scores, setScores] = useState<ScoreRecord[]>(() => {
    const saved = localStorage.getItem('skrm_scores');
    let parsed = saved ? JSON.parse(saved) : [];
    
    // STRICT Migration: Ensure all scores have UNIQUE IDs
    if (parsed.length > 0) {
      const seenIds = new Set();
      parsed = parsed.map((s: any) => {
        let id = s.id;
        // If ID is missing or we've seen this ID before in this list, generate a new one
        if (!id || seenIds.has(id)) {
          id = `migrated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        seenIds.add(id);
        return { ...s, id };
      });
    }
    return parsed;
  });

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('skrm_sewadars_v2', JSON.stringify(sewadars));
  }, [sewadars]);

  useEffect(() => {
    localStorage.setItem('skrm_attendance', JSON.stringify(attendance));
  }, [attendance]);

  useEffect(() => {
    localStorage.setItem('skrm_scores', JSON.stringify(scores));
  }, [scores]);

  // Handle cross-tab updates
  useEffect(() => {
    const handleStorageChange = () => {
      const savedSew = localStorage.getItem('skrm_sewadars_v2');
      const savedAtt = localStorage.getItem('skrm_attendance');
      const savedScores = localStorage.getItem('skrm_scores');
      if (savedSew) setSewadars(JSON.parse(savedSew));
      if (savedAtt) setAttendance(JSON.parse(savedAtt));
      if (savedScores) setScores(JSON.parse(savedScores));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const toggleAttendance = (sewadarId: string) => {
    if (!activeVolunteer) return;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const existingIndex = attendance.findIndex(a => a.sewadarId === sewadarId && a.date === dateStr);
    
    if (existingIndex !== -1) {
      setAttendance(attendance.filter((_, i) => i !== existingIndex));
      // Remove the daily attendance score if unmarking (Hard delete for attendance toggle is preferred to avoid clutter)
      setScores(prev => prev.filter(s => !(s.sewadarId === sewadarId && s.game === 'Daily Attendance' && new Date(s.timestamp).toISOString().split('T')[0] === dateStr)));
    } else {
      const timestamp = now.getTime();
      setAttendance([...attendance, { sewadarId, date: dateStr, timestamp, volunteerId: activeVolunteer.id }]);
      const hour = now.getHours();
      const attendancePoints = hour < 10 ? 10 : 5;
      const newScore: ScoreRecord = {
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        sewadarId,
        game: 'Daily Attendance',
        points: attendancePoints,
        timestamp: timestamp,
        volunteerId: activeVolunteer.id
      };
      setScores(prev => [...prev, newScore]);
    }
  };

  const addSewadar = (name: string, gender: Gender, group: GentsGroup | 'Ladies') => {
    if (!activeVolunteer) return;
    const newSewadar: Sewadar = {
      id: `${gender === 'Gents' ? 'G' : 'L'}-Added-${Date.now()}`,
      name,
      gender,
      group
    };
    setSewadars(prev => [...prev, newSewadar]);
    // Automatically mark attendance for newly added sewadar
    toggleAttendance(newSewadar.id);
  };

  const addScore = (sewadarId: string, game: string, points: number) => {
    if (!activeVolunteer) return;
    const newScore: ScoreRecord = {
      id: `man-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      sewadarId,
      game,
      points,
      timestamp: Date.now(),
      volunteerId: activeVolunteer.id
    };
    // Use functional update to ensure we are appending to the latest state
    setScores(prev => [...prev, newScore]);
  };

  const deleteScore = (scoreId: string) => {
    if (!scoreId) return;
    console.log('Soft deleting score with ID:', scoreId);
    // Soft delete: Mark as deleted instead of removing
    setScores(prev => prev.map(s => 
      s.id === scoreId ? { ...s, isDeleted: true } : s
    ));
  };

  const resetData = () => {
    if (window.confirm("⚠️ START NEW DAY?\n\nThis will CLEAR ALL Attendance and Score records.\nThe Sewadar list (roster) will remain.\n\nAre you sure you want to continue?")) {
      setAttendance([]);
      setScores([]);
      alert("System has been reset for a new day.");
    }
  };

  const handleLogout = () => {
    setActiveVolunteer(null);
    setActiveView('Participant');
  };

  const navItems = (['Participant', 'Attendance', 'Points', 'Dashboard'] as ViewState[])
    .filter(v => activeVolunteer || v === 'Participant');

  const getNavIcon = (view: ViewState) => {
    switch(view) {
      case 'Participant': return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2" /></svg>;
      case 'Attendance': return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>;
      case 'Points': return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a2 2 0 11-4 0V4zM18 8a2 2 0 114 0v1a2 2 0 11-4 0V8zM11 13a2 2 0 114 0v1a2 2 0 11-4 0v-1zM18 17a2 2 0 114 0v1a2 2 0 11-4 0v-1zM5 8a2 2 0 100-4 2 2 0 000 4zm0 9a2 2 0 100-4 2 2 0 000 4z" /></svg>;
      case 'Dashboard': return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
      default: return null;
    }
  };

  if (activeView === 'Login') return <Login onLogin={(v) => { setActiveVolunteer(v); setActiveView('Attendance'); }} onCancel={() => setActiveView('Participant')} />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Glassmorphic Sticky Header */}
      <header className="fixed top-0 left-0 right-0 z-40 glass-dark text-white shadow-lg border-b border-white/10 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3 md:py-4">
          <div className="flex flex-col">
            <h1 className="text-sm md:text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
              Security Excellence Workshop
            </h1>
            <p className="text-[10px] md:text-xs text-indigo-300 font-medium tracking-wide">SKRM Manager • Live</p>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            {activeVolunteer && (
              <div className="hidden sm:flex flex-col items-end mr-2">
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">{activeVolunteer.name}</span>
                <span className="text-[9px] text-indigo-300 font-medium">{activeVolunteer.role}</span>
              </div>
            )}
            {activeVolunteer ? (
              <button onClick={handleLogout} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all active:scale-95 backdrop-blur-md">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            ) : (
               <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Online</span>
               </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area with Transitions */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 pt-24 pb-32 md:pb-12 md:pl-56 transition-all duration-300">
        <div key={activeView} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeView === 'Participant' && <ParticipantView sewadars={sewadars} attendance={attendance} scores={scores} onAdminLogin={() => setActiveView('Login')} />}
          {activeView === 'Attendance' && <AttendanceManager sewadars={sewadars} attendance={attendance} onToggle={toggleAttendance} onAddSewadar={addSewadar} />}
          {activeView === 'Points' && <PointsManager sewadars={sewadars} attendance={attendance} scores={scores} onAddScore={addScore} onDeleteScore={deleteScore} />}
          {activeView === 'Dashboard' && <Dashboard sewadars={sewadars} attendance={attendance} scores={scores} onReset={resetData} />}
        </div>
      </main>

      {/* Modern Floating Dock Nav for Mobile */}
      <nav className="fixed bottom-6 left-4 right-4 z-50 md:hidden">
        <div className="glass-effect rounded-full shadow-2xl border border-white/50 p-1.5 max-w-sm mx-auto flex justify-between items-center relative overflow-hidden ring-1 ring-slate-900/5">
          {navItems.map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`flex-1 flex flex-col items-center justify-center py-3 rounded-full transition-all duration-300 relative ${
                activeView === view ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {activeView === view && (
                <div className="absolute inset-0 bg-indigo-50 rounded-full -z-10 animate-in zoom-in-50 duration-200"></div>
              )}
              <div className={`transition-transform duration-300 ${activeView === view ? 'scale-110 -translate-y-0.5' : ''}`}>
                {React.cloneElement(getNavIcon(view) as React.ReactElement, { className: 'w-6 h-6' })}
              </div>
            </button>
          ))}
        </div>
      </nav>

      {/* Elegant Desktop Sidebar */}
      <div className="hidden md:block fixed left-0 top-0 bottom-0 z-30 w-64 pt-24 px-4 border-r border-slate-100 bg-white/50 backdrop-blur-sm">
         <div className="space-y-2 mt-4">
            <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Menu</p>
            {navItems.map((view) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 group ${
                  activeView === view 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 translate-x-1' 
                    : 'text-slate-500 hover:bg-white hover:shadow-md hover:text-indigo-600'
                }`}
              >
                <div className={`transition-colors ${activeView === view ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500'}`}>
                  {React.cloneElement(getNavIcon(view) as React.ReactElement, { className: 'w-5 h-5' })}
                </div>
                {view === 'Participant' ? 'Scoreboard' : view}
                
                {activeView === view && (
                   <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                )}
              </button>
            ))}
         </div>

         {/* Decorative Element at bottom of sidebar */}
         <div className="absolute bottom-8 left-4 right-4 p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-slate-50 border border-indigo-100/50">
            <p className="text-[10px] font-bold text-indigo-900/60 text-center leading-relaxed">
              "Service to humanity is service to God."
            </p>
         </div>
      </div>
    </div>
  );
};

export default App;
