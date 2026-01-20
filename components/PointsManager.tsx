
import React, { useState, useMemo, useEffect } from 'react';
import { Sewadar, Gender, AttendanceRecord, GentsGroup, ScoreRecord, GAMES } from '../types';
import { GENTS_GROUPS, VOLUNTEERS } from '../constants';

interface Props {
  sewadars: Sewadar[];
  attendance: AttendanceRecord[];
  scores: ScoreRecord[];
  onAddScore: (id: string, game: string, points: number) => void;
  onDeleteScore: (id: string) => void;
}

const PointsManager: React.FC<Props> = ({ sewadars, attendance, scores, onAddScore, onDeleteScore }) => {
  const [genderTab, setGenderTab] = useState<Gender>('Gents');
  const [gentsGroupTab, setGentsGroupTab] = useState<GentsGroup>('Monday');
  const [selectedSewadarId, setSelectedSewadarId] = useState<string>('');
  const [selectedGame, setSelectedGame] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // State to track which delete button is in "Confirmation" mode
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  // Auto-reset confirmation state if user changes selection
  useEffect(() => {
    setConfirmDeleteId(null);
  }, [selectedSewadarId, genderTab, gentsGroupTab]);

  const presentSewadars = useMemo(() => {
    const presentIds = attendance
      .filter(a => a.date === today)
      .map(a => a.sewadarId);
    
    return sewadars
      .filter(s => {
        const isPresent = presentIds.includes(s.id);
        const matchesGender = s.gender === genderTab;
        
        // Use global search across groups if search term exists
        const matchesGroup = searchTerm 
          ? true 
          : (genderTab === 'Gents' ? s.group === gentsGroupTab : true);
          
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
        return isPresent && matchesGender && matchesGroup && matchesSearch;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sewadars, attendance, today, genderTab, gentsGroupTab, searchTerm]);

  const handleAwardPoints = () => {
    if (selectedSewadarId && selectedGame) {
      onAddScore(selectedSewadarId, selectedGame, 5);
      setSelectedGame('');
      // Smooth scroll back to top on mobile after awarding
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!id) return;

    if (confirmDeleteId === id) {
      // User confirmed, perform delete
      onDeleteScore(id);
      setConfirmDeleteId(null);
    } else {
      // First click: Enter confirmation mode
      setConfirmDeleteId(id);
      // Auto-cancel after 3 seconds if not confirmed
      setTimeout(() => {
        setConfirmDeleteId(current => current === id ? null : current);
      }, 3000);
    }
  };

  const getVolunteerName = (id: string) => VOLUNTEERS.find(v => v.id === id)?.name || 'Volunteer';

  const selectedSewadar = sewadars.find(s => s.id === selectedSewadarId);
  const sewadarScores = scores.filter(sc => sc.sewadarId === selectedSewadarId);
  // Calculate total ignoring deleted scores
  const totalScore = sewadarScores.reduce((acc, curr) => acc + (curr.isDeleted ? 0 : curr.points), 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Step 1: Filter & Select */}
      <section className="space-y-4">
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex gap-2">
          {(['Gents', 'Ladies'] as Gender[]).map((g) => (
            <button
              key={g}
              onClick={() => { setGenderTab(g); setSelectedSewadarId(''); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${
                genderTab === g ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Group Tabs - Only show if NOT searching */}
        {genderTab === 'Gents' && !searchTerm && (
          <div className="overflow-x-auto pb-1 no-scrollbar -mx-4 px-4">
            <div className="flex gap-2 min-w-max">
              {GENTS_GROUPS.map((day) => (
                <button
                  key={day}
                  onClick={() => { setGentsGroupTab(day); setSelectedSewadarId(''); }}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${
                    gentsGroupTab === day 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                      : 'bg-white text-slate-400 border-slate-100'
                  }`}
                >
                  👮‍♂️ {day.substring(0, 3)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-2 border-b border-slate-100">
             <input
              type="text"
              placeholder={`Search present ${genderTab.toLowerCase()}...`}
              className="w-full pl-4 pr-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {presentSewadars.length === 0 ? (
               <p className="p-6 text-center text-slate-400 text-xs">
                 {attendance.length === 0 ? "No attendance marked today yet." : "No present sewadars found."}
               </p>
            ) : (
              presentSewadars.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSewadarId(s.id)}
                  className={`w-full text-left px-5 py-3 border-b border-slate-50 last:border-0 flex items-center justify-between transition-colors ${
                    selectedSewadarId === s.id ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span className="font-bold text-sm">{s.name}</span>
                  {selectedSewadarId === s.id && <span className="text-indigo-600 font-black text-xs">SELECTED</span>}
                </button>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Step 2: Award Points Interface */}
      {selectedSewadarId && selectedSewadar && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
           {/* Summary Card */}
           <div className="bg-indigo-900 text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-1">Selected Sewadar</p>
                <h2 className="text-2xl font-black mb-1">{selectedSewadar.name}</h2>
                <p className="text-sm opacity-80">{selectedSewadar.group} Group • Present Today</p>
                
                <div className="mt-6 flex items-end gap-2">
                   <span className="text-4xl font-black">{totalScore}</span>
                   <span className="text-sm font-bold opacity-60 mb-1">Total Points</span>
                </div>
              </div>
              <div className="absolute -right-6 -bottom-12 w-32 h-32 bg-indigo-500/30 rounded-full blur-2xl"></div>
           </div>

           {/* Game Buttons */}
           <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4">Award Points</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {GAMES.map(game => (
                  <button
                    key={game}
                    onClick={() => setSelectedGame(game)}
                    className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-wide border-2 transition-all ${
                      selectedGame === game 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' 
                        : 'bg-white text-slate-500 border-slate-100 hover:border-indigo-200'
                    }`}
                  >
                    {game}
                  </button>
                ))}
              </div>

              <button
                onClick={handleAwardPoints}
                disabled={!selectedGame}
                className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${
                  selectedGame 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 active:scale-95' 
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
              >
                Award 5 Points
              </button>
           </div>

           {/* History for this user */}
           <div className="space-y-2 pb-12">
             <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Today's Activity</h3>
             {sewadarScores.length > 0 ? (
               sewadarScores.slice().reverse().map(score => {
                 const isConfirming = confirmDeleteId === score.id;
                 const isDeleted = score.isDeleted;
                 
                 return (
                   <div 
                     key={score.id} 
                     className={`relative p-4 rounded-xl border flex items-center justify-between shadow-sm overflow-hidden transition-all ${
                       isDeleted 
                         ? 'bg-red-50/50 border-red-100 opacity-80' 
                         : 'bg-white border-slate-100'
                     }`}
                   >
                      {/* Background flash for confirming state */}
                      {!isDeleted && (
                        <div className={`absolute inset-0 bg-red-50 transition-opacity duration-300 pointer-events-none ${isConfirming ? 'opacity-100' : 'opacity-0'}`} />
                      )}
                      
                      <div className="relative z-10">
                        <p className={`font-bold text-sm transition-colors flex items-center gap-2 ${
                            isDeleted ? 'text-slate-400 line-through' : (isConfirming ? 'text-red-800' : 'text-slate-800')
                          }`}>
                          {isConfirming ? 'Delete this score?' : score.game}
                          {isDeleted && <span className="text-[8px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded font-black no-underline uppercase tracking-wide">Void</span>}
                        </p>
                        <p className={`text-[10px] font-bold transition-colors ${
                            isDeleted ? 'text-red-300' : (isConfirming ? 'text-red-400' : 'text-slate-400')
                          }`}>
                           {isConfirming ? 'Tap again to confirm' : (isDeleted ? 'Entry deleted' : `${new Date(score.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • by ${getVolunteerName(score.volunteerId)}`)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 relative z-10">
                         <span className={`font-black ${isDeleted ? 'text-red-300 line-through' : 'text-emerald-600'}`}>+{score.points}</span>
                         
                         {!isDeleted && (
                           <button 
                             type="button"
                             onClick={(e) => handleDeleteClick(e, score.id)}
                             className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 border shadow-sm z-20 ${
                               isConfirming 
                                 ? 'bg-red-500 border-red-600 text-white shadow-red-200 animate-pulse' 
                                 : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200'
                             }`}
                             title={isConfirming ? "Confirm Delete" : "Delete Score"}
                           >
                             {isConfirming ? (
                               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                               </svg>
                             ) : (
                               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                               </svg>
                             )}
                           </button>
                         )}
                      </div>
                   </div>
                 );
               })
             ) : (
               <p className="text-center py-6 text-slate-400 text-xs italic">No points awarded yet.</p>
             )}
           </div>
        </section>
      )}
    </div>
  );
};

export default PointsManager;
