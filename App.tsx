import React, { useState, useEffect } from 'react';
import { ViewState, AttendanceRecord, ScoreRecord, Sewadar, Volunteer, Gender, GentsGroup } from './types';
import { INITIAL_SEWADARS } from './constants';
import AttendanceManager from './components/AttendanceManager';
import PointsManager from './components/PointsManager';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import ParticipantView from './components/ParticipantView';
import { supabase, isSupabaseConfigured } from './supabase';

const STORAGE_KEY_VOLUNTEER = 'skrm_active_volunteer';
const STORAGE_KEY_VIEW = 'skrm_active_view';

const App: React.FC = () => {
  const [activeVolunteer, setActiveVolunteer] = useState<Volunteer | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_VOLUNTEER);
    return saved ? JSON.parse(saved) : null;
  });

  const [activeView, setActiveView] = useState<ViewState>(() => {
    const savedView = localStorage.getItem(STORAGE_KEY_VIEW) as ViewState;
    const savedVol = localStorage.getItem(STORAGE_KEY_VOLUNTEER);
    if (savedVol) return savedView || 'Attendance';
    return 'Participant';
  });
  
  const [sewadars, setSewadars] = useState<Sewadar[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const isRestrictedVolunteer = (v: Volunteer | null) => {
    if (!v) return false;
    const restrictedNames = ['Volunteer 1', 'Volunteer 2', 'Volunteer 3'];
    return restrictedNames.includes(v.name);
  };

  // Helper to filter out any "Behenji" dummy records
  const filterValidSewadars = (list: Sewadar[]) => {
    return list.filter(s => !s.name.toLowerCase().includes('behenji'));
  };

  const getTableNames = (id: string) => {
    const isLadies = id.startsWith('L-');
    return {
      attendance: isLadies ? 'ladies_attendance' : 'attendance',
      scores: isLadies ? 'ladies_scores' : 'scores',
      sewadars: isLadies ? 'ladies_sewadars' : 'sewadars'
    };
  };

  useEffect(() => {
    if (activeVolunteer) {
      localStorage.setItem(STORAGE_KEY_VOLUNTEER, JSON.stringify(activeVolunteer));
    } else {
      localStorage.removeItem(STORAGE_KEY_VOLUNTEER);
    }
  }, [activeVolunteer]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_VIEW, activeView);
  }, [activeView]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const initData = async () => {
      try {
        setLoading(true);
        // Fetch from both master tables
        const [{ data: gents }, { data: ladies }] = await Promise.all([
          supabase.from('sewadars').select('*'),
          supabase.from('ladies_sewadars').select('*')
        ]);

        const allSewadars = filterValidSewadars([...(gents || []), ...(ladies || [])] as Sewadar[]);
        setSewadars(allSewadars);

        const today = new Date().toISOString().split('T')[0];
        
        // Fetch attendance and scores from all tables
        const [
          { data: gentsAtt }, { data: ladiesAtt },
          { data: gentsScore }, { data: ladiesScore }
        ] = await Promise.all([
          supabase.from('attendance').select('*').eq('date', today),
          supabase.from('ladies_attendance').select('*').eq('date', today),
          supabase.from('scores').select('*'),
          supabase.from('ladies_scores').select('*')
        ]);

        const combinedAtt = [...(gentsAtt || []), ...(ladiesAtt || [])].map((a: any) => ({
          sewadarId: a.sewadar_id,
          name: a.name || '',
          date: a.date,
          timestamp: Number(a.timestamp),
          volunteerId: a.volunteer_id
        }));
        setAttendance(combinedAtt);

        const combinedScores = [...(gentsScore || []), ...(ladiesScore || [])].map((s: any) => ({
          id: s.id,
          sewadarId: s.sewadar_id,
          name: s.name || '',
          game: s.game,
          points: s.points,
          timestamp: Number(s.timestamp),
          volunteerId: s.volunteer_id,
          isDeleted: s.is_deleted
        }));
        setScores(combinedScores);

      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  // Set up 6 subscriptions (3 for Gents, 3 for Ladies)
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channels = [
      'attendance', 'ladies_attendance', 
      'scores', 'ladies_scores', 
      'sewadars', 'ladies_sewadars'
    ].map(table => {
      return supabase.channel(`${table}_changes`).on('postgres_changes', { event: '*', table: table }, (payload: any) => {
        if (table.includes('attendance')) {
          if (payload.eventType === 'INSERT') {
            const newAtt = payload.new;
            setAttendance(prev => {
              if (prev.some(a => a.sewadarId === newAtt.sewadar_id && a.date === newAtt.date)) return prev;
              return [...prev, { sewadarId: newAtt.sewadar_id, name: newAtt.name || '', date: newAtt.date, timestamp: Number(newAtt.timestamp), volunteerId: newAtt.volunteer_id }];
            });
          } else if (payload.eventType === 'DELETE') {
            setAttendance(prev => prev.filter(a => !(a.sewadarId === payload.old.sewadar_id && a.date === payload.old.date)));
          }
        } else if (table.includes('scores')) {
          if (payload.eventType === 'INSERT') {
            const newScore = payload.new;
            setScores(prev => {
              if (prev.some(s => s.id === newScore.id)) return prev;
              return [...prev, { id: newScore.id, sewadarId: newScore.sewadar_id, name: newScore.name || '', game: newScore.game, points: newScore.points, timestamp: Number(newScore.timestamp), volunteerId: newScore.volunteer_id, isDeleted: newScore.is_deleted }];
            });
          } else if (payload.eventType === 'UPDATE') {
            setScores(prev => prev.map(s => s.id === payload.new.id ? { ...s, isDeleted: payload.new.is_deleted } : s));
          } else if (payload.eventType === 'DELETE') {
            setScores(prev => prev.filter(s => s.id !== payload.old.id));
          }
        } else { // Sewadars
          if (payload.eventType === 'INSERT') {
            const newSew = payload.new as Sewadar;
            if (newSew.name.toLowerCase().includes('behenji')) return;
            setSewadars(prev => prev.some(s => s.id === newSew.id) ? prev : [...prev, newSew]);
          } else if (payload.eventType === 'DELETE') {
            setSewadars(prev => prev.filter(s => s.id !== payload.old.id));
          }
        }
      }).subscribe();
    });

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, []);

  const syncMasterList = async () => {
    if (isRestrictedVolunteer(activeVolunteer)) return;
    if (!confirm("This will PERMANENTLY DELETE all current sewadar records and reload the master list (132 Ladies + Gents). Attendance and Scores will NOT be deleted, but may lose linked names. Proceed?")) return;
    
    setSyncing(true);
    try {
      const gents = filterValidSewadars(INITIAL_SEWADARS.filter(s => s.gender === 'Gents'));
      const ladies = filterValidSewadars(INITIAL_SEWADARS.filter(s => s.gender === 'Ladies'));

      // 1. Purge existing records to remove "Behenji" or dummy data
      await Promise.all([
        supabase.from('sewadars').delete().neq('id', 'purged'), 
        supabase.from('ladies_sewadars').delete().neq('id', 'purged')
      ]);

      // 2. Insert fresh master list
      await Promise.all([
        supabase.from('sewadars').insert(gents),
        supabase.from('ladies_sewadars').insert(ladies)
      ]);
      
      const [{ data: g }, { data: l }] = await Promise.all([
        supabase.from('sewadars').select('*'),
        supabase.from('ladies_sewadars').select('*')
      ]);
      setSewadars(filterValidSewadars([...(g || []), ...(l || [])]));
      alert("Clean Sync Complete! Dummy records removed and master list reloaded.");
    } catch (err) {
      console.error("Sync failed:", err);
      alert("Database sync failed. Check connection.");
    } finally {
      setSyncing(false);
    }
  };

  const toggleAttendance = async (sewadarId: string) => {
    if (!activeVolunteer || isRestrictedVolunteer(activeVolunteer)) return;
    const sewadar = sewadars.find(s => s.id === sewadarId);
    if (!sewadar) return;

    const tables = getTableNames(sewadarId);
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const existing = attendance.find(a => a.sewadarId === sewadarId && a.date === dateStr);
    
    if (existing) {
      const { error: attError } = await supabase.from(tables.attendance).delete().match({ sewadar_id: sewadarId, date: dateStr });
      if (!attError) {
        setAttendance(prev => prev.filter(a => !(a.sewadarId === sewadarId && a.date === dateStr)));
        const startOfDay = new Date(now.setHours(0,0,0,0)).getTime();
        const endOfDay = new Date(now.setHours(23,59,59,999)).getTime();
        await supabase.from(tables.scores).delete().match({ sewadar_id: sewadarId, game: 'Daily Attendance' }).gte('timestamp', startOfDay).lte('timestamp', endOfDay);
      }
    } else {
      const timestamp = now.getTime();
      const attendancePoints = now.getHours() < 10 ? 100 : 50;
      const { error: attError } = await supabase.from(tables.attendance).insert({ sewadar_id: sewadarId, name: sewadar.name, date: dateStr, timestamp: timestamp, volunteer_id: activeVolunteer.id });
      if (!attError) {
        const scoreId = `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        await supabase.from(tables.scores).insert({ id: scoreId, sewadar_id: sewadarId, name: sewadar.name, game: 'Daily Attendance', points: attendancePoints, timestamp: timestamp, volunteer_id: activeVolunteer.id, is_deleted: false });
      }
    }
  };

  const addSewadar = async (name: string, gender: Gender, group: GentsGroup | 'Ladies') => {
    if (!activeVolunteer || isRestrictedVolunteer(activeVolunteer)) return;
    if (name.toLowerCase().includes('behenji')) {
      alert("Invalid name. 'Behenji' placeholder is not allowed.");
      return;
    }
    const newId = `${gender === 'Gents' ? 'G' : 'L'}-Added-${Date.now()}`;
    const tables = getTableNames(newId);
    
    const { error } = await supabase.from(tables.sewadars).insert({ id: newId, name, gender, group });
    if (!error) {
      setSewadars(prev => [...prev, { id: newId, name, gender, group }]);
      toggleAttendance(newId);
    }
  };

  const addScore = async (sewadarId: string, game: string, points: number) => {
    if (!activeVolunteer) return;
    const sewadar = sewadars.find(s => s.id === sewadarId);
    if (!sewadar) return;

    // Check 5-score limit per game
    const currentCount = scores.filter(s => s.sewadarId === sewadarId && s.game === game && !s.isDeleted).length;
    if (currentCount >= 5) {
      alert(`Limit Reached! ${sewadar.name} has already been awarded points for ${game} 5 times.`);
      return;
    }

    const tables = getTableNames(sewadarId);
    const scoreId = `${sewadarId.startsWith('L') ? 'lscore' : 'man'}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    await supabase.from(tables.scores).insert({ id: scoreId, sewadar_id: sewadarId, name: sewadar.name, game: game, points: points, timestamp: Date.now(), volunteer_id: activeVolunteer.id, is_deleted: false });
  };

  const deleteScore = async (scoreId: string) => {
    if (!scoreId) return;
    await Promise.all([
      supabase.from('scores').update({ is_deleted: true }).eq('id', scoreId),
      supabase.from('ladies_scores').update({ is_deleted: true }).eq('id', scoreId)
    ]);
  };

  const handleLogout = () => {
    setActiveVolunteer(null);
    setActiveView('Participant');
    localStorage.removeItem(STORAGE_KEY_VOLUNTEER);
    localStorage.removeItem(STORAGE_KEY_VIEW);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-indigo-300 font-black uppercase tracking-widest animate-pulse">Syncing Workshop Data...</p>
      </div>
    );
  }

  const navItems = (['Participant', 'Attendance', 'Points', 'Dashboard'] as ViewState[]).filter(v => {
    if (v === 'Participant') return true;
    if (!activeVolunteer) return false;
    if (v === 'Attendance' && isRestrictedVolunteer(activeVolunteer)) return false;
    return true;
  });

  const getNavIcon = (view: ViewState) => {
    switch(view) {
      case 'Participant': return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2" /></svg>;
      case 'Attendance': return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>;
      case 'Points': return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a2 2 0 11-4 0V4zM18 8a2 2 0 114 0v1a2 2 0 11-4 0V8zM11 13a2 2 0 114 0v1a2 2 0 11-4 0v-1zM18 17a2 2 0 114 0v1a2 2 0 11-4 0v-1zM5 8a2 2 0 100-4 2 2 0 000 4zm0 9a2 2 0 100-4 2 2 0 000 4z" /></svg>;
      case 'Dashboard': return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
      default: return null;
    }
  };

  if (activeView === 'Login') return <Login onLogin={(v) => { setActiveVolunteer(v); setActiveView(isRestrictedVolunteer(v) ? 'Points' : 'Attendance'); }} onCancel={() => setActiveView('Participant')} />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-40 glass-dark text-white shadow-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3 md:py-4">
          <div className="flex flex-col">
            <h1 className="text-sm md:text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
              Security Excellence Workshop
            </h1>
            <p className="text-[10px] md:text-xs text-indigo-300 font-medium">SKRM Manager • Master List</p>
          </div>
          <div className="flex items-center gap-2">
            {activeVolunteer ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-xs font-bold text-indigo-200">{activeVolunteer.name}</span>
                <button onClick={handleLogout} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </button>
              </div>
            ) : (
               <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Live</span>
               </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 pt-24 pb-32 md:pb-12 md:pl-56">
        <div key={activeView} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeView === 'Participant' && <ParticipantView sewadars={sewadars} attendance={attendance} scores={scores} onAdminLogin={() => setActiveView('Login')} />}
          {activeView === 'Attendance' && <AttendanceManager sewadars={sewadars} attendance={attendance} onToggle={toggleAttendance} onAddSewadar={addSewadar} />}
          {activeView === 'Points' && <PointsManager sewadars={sewadars} attendance={attendance} scores={scores} onAddScore={addScore} onDeleteScore={deleteScore} />}
          {activeView === 'Dashboard' && <Dashboard sewadars={sewadars} attendance={attendance} scores={scores} onSyncMasterList={syncMasterList} syncingMasterList={syncing} />}
        </div>
      </main>

      <nav className="fixed bottom-6 left-4 right-4 z-50 md:hidden">
        <div className="glass-effect rounded-full shadow-2xl border border-white/50 p-1.5 max-w-sm mx-auto flex justify-between items-center">
          {navItems.map((view) => (
            <button key={view} onClick={() => setActiveView(view)} className={`flex-1 flex flex-col items-center justify-center py-3 rounded-full transition-all duration-300 relative ${activeView === view ? 'text-indigo-600' : 'text-slate-400'}`}>
              {activeView === view && <div className="absolute inset-0 bg-indigo-50 rounded-full -z-10"></div>}
              {getNavIcon(view)}
            </button>
          ))}
        </div>
      </nav>

      <div className="hidden md:block fixed left-0 top-0 bottom-0 z-30 w-64 pt-24 px-4 border-r border-slate-100 bg-white/50 backdrop-blur-sm">
         <div className="space-y-2 mt-4">
            {navItems.map((view) => (
              <button key={view} onClick={() => setActiveView(view)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${activeView === view ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white'}`}>
                {getNavIcon(view)}
                {view === 'Participant' ? 'Scoreboard' : view}
              </button>
            ))}
         </div>
      </div>
    </div>
  );
};

export default App;