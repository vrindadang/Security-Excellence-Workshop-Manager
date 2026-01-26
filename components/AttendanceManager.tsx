
import React, { useState, useMemo } from 'react';
import { Sewadar, Gender, AttendanceRecord, GentsGroup } from '../types';
import { GENTS_GROUPS, VOLUNTEERS } from '../constants';

interface Props {
  sewadars: Sewadar[];
  attendance: AttendanceRecord[];
  onToggle: (id: string) => void;
  onAddSewadar: (name: string, gender: Gender, group: GentsGroup | 'Ladies') => void;
}

const AttendanceManager: React.FC<Props> = ({ sewadars, attendance, onToggle, onAddSewadar }) => {
  const [genderTab, setGenderTab] = useState<Gender>('Gents');
  const [gentsGroupTab, setGentsGroupTab] = useState<GentsGroup>('Monday');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<Gender>('Gents');
  const [newGroup, setNewGroup] = useState<GentsGroup | 'Ladies'>('Monday');

  const today = new Date().toISOString().split('T')[0];
  
  // Real-time point preview logic
  const now = new Date();
  const isEarlyNow = now.getHours() < 10 || (now.getHours() === 10 && now.getMinutes() < 30);
  const currentPointsReward = isEarlyNow ? 100 : 50;

  const filteredSewadars = useMemo(() => {
    return sewadars
      .filter(s => {
        const matchesGender = s.gender === genderTab;
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesGroup = searchTerm ? true : (genderTab === 'Gents' ? s.group === gentsGroupTab : true);
        return matchesGender && matchesGroup && matchesSearch;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sewadars, genderTab, gentsGroupTab, searchTerm]);

  const getAttendanceRecord = (id: string) => attendance.find(a => a.sewadarId === id && a.date === today);
  const getVolunteerName = (id: string) => VOLUNTEERS.find(v => v.id === id)?.name || 'Volunteer';

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddSewadar(newName, newGender, newGender === 'Ladies' ? 'Ladies' : newGroup);
    setNewName('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Real-time points info */}
      <div className={`p-4 rounded-2xl flex items-center justify-between border-2 border-dashed ${isEarlyNow ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
         <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${isEarlyNow ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
               {currentPointsReward}
            </div>
            <div>
               <p className={`text-xs font-black uppercase tracking-tight ${isEarlyNow ? 'text-emerald-700' : 'text-amber-700'}`}>
                 Current Reward: {currentPointsReward} Pts
               </p>
               <p className="text-[9px] font-bold text-slate-500">
                 {isEarlyNow ? "Rule: 100 Pts before 10:30 AM" : "Rule: 50 Pts after 10:30 AM"}
               </p>
            </div>
         </div>
         <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase">Live Clock</p>
            <p className="text-xs font-bold text-slate-700">{now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
         </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="flex bg-white rounded-xl shadow-sm border p-1 flex-1">
            {(['Gents', 'Ladies'] as Gender[]).map((g) => (
              <button
                key={g}
                onClick={() => setGenderTab(g)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  genderTab === g ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          <button onClick={() => setShowAddForm(true)} className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg active:scale-95 transition-all">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>

        <input
          type="text"
          placeholder={`Search ${genderTab.toLowerCase()}...`}
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none shadow-sm text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {genderTab === 'Gents' && !searchTerm && (
        <div className="overflow-x-auto pb-1 no-scrollbar -mx-4 px-4">
          <div className="flex space-x-2 min-w-max">
            {GENTS_GROUPS.map((day) => (
              <button
                key={day}
                onClick={() => setGentsGroupTab(day)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 ${
                  gentsGroupTab === day ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                }`}
              >
                👮‍♂️ {day}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {filteredSewadars.map((s, idx) => {
          const record = getAttendanceRecord(s.id);
          const isMarked = !!record;
          return (
            <div key={s.id} className={`bg-white px-4 py-3 rounded-2xl shadow-sm border flex items-center justify-between ${isMarked ? 'border-emerald-100 bg-emerald-50/10' : 'border-slate-100'}`}>
              <div className="flex items-center gap-3">
                <div className="text-[10px] font-black text-slate-300 w-4">{idx + 1}</div>
                <div className="flex flex-col">
                  <span className={`font-bold text-sm ${isMarked ? 'text-slate-800' : 'text-slate-600'}`}>{s.name}</span>
                  <div className="flex items-center gap-2">
                     <span className="text-[9px] uppercase font-black text-slate-400 tracking-tighter">
                       {s.group === 'Ladies' ? '👩' : '👮‍♂️'} {s.group}
                     </span>
                     {isMarked && (
                       <span className="text-[9px] font-bold text-emerald-600">
                         {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by {getVolunteerName(record.volunteerId)}
                       </span>
                     )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => onToggle(s.id)}
                className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all active:scale-90 ${
                  isMarked ? 'bg-emerald-500 border-emerald-400 shadow-lg' : 'bg-slate-50 border-slate-100'
                }`}
              >
                {isMarked ? <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : <div className="w-4 h-4 rounded-full border-2 border-slate-200"></div>}
              </button>
            </div>
          );
        })}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddForm(false)}></div>
          <form onSubmit={handleAddNew} className="relative bg-white w-full max-w-md rounded-[2rem] p-8 shadow-2xl">
            <h3 className="text-xl font-black text-slate-900 mb-6">Add Missing Sewadar</h3>
            <div className="space-y-6">
              <input autoFocus required type="text" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="Full Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <div className="flex gap-2">
                {(['Gents', 'Ladies'] as Gender[]).map((g) => (
                  <button key={g} type="button" onClick={() => { setNewGender(g); if (g === 'Ladies') setNewGroup('Ladies'); else if (newGroup === 'Ladies') setNewGroup('Monday'); }} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase border-2 ${newGender === g ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-100'}`}>{g}</button>
                ))}
              </div>
              {newGender === 'Gents' && (
                <select className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={newGroup} onChange={(e) => setNewGroup(e.target.value as GentsGroup)}>
                  {GENTS_GROUPS.map(day => <option key={day} value={day}>👮‍♂️ {day}</option>)}
                </select>
              )}
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all">Mark & Register</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AttendanceManager;
