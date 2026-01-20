
import React, { useState, useMemo } from 'react';
import { Sewadar, Gender, AttendanceRecord, GentsGroup } from '../types';
import { GENTS_GROUPS, VOLUNTEERS } from '../constants';

interface Props {
  sewadars: Sewadar[];
  attendance: AttendanceRecord[];
  onToggle: (id: string) => void;
  onAddSewadar: (name: string, gender: Gender, group: GentsGroup | 'Ladies') => void;
}

type SortBy = 'name' | 'group';

const AttendanceManager: React.FC<Props> = ({ sewadars, attendance, onToggle, onAddSewadar }) => {
  const [genderTab, setGenderTab] = useState<Gender>('Gents');
  const [gentsGroupTab, setGentsGroupTab] = useState<GentsGroup>('Monday');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('name');
  
  // New Sewadar Form State
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<Gender>('Gents');
  const [newGroup, setNewGroup] = useState<GentsGroup | 'Ladies'>('Monday');

  const today = new Date().toISOString().split('T')[0];
  
  const filteredSewadars = useMemo(() => {
    return sewadars
      .filter(s => {
        const matchesGender = s.gender === genderTab;
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
        
        // If searching, search across all groups within the selected gender.
        // Otherwise, respect the selected group tab (e.g., Monday).
        const matchesGroup = searchTerm 
          ? true 
          : (genderTab === 'Gents' ? s.group === gentsGroupTab : true);

        return matchesGender && matchesGroup && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        } else {
          // Primarily sort by group, secondarily by name
          const groupCompare = a.group.localeCompare(b.group);
          return groupCompare !== 0 ? groupCompare : a.name.localeCompare(b.name);
        }
      });
  }, [sewadars, genderTab, gentsGroupTab, searchTerm, sortBy]);

  const getAttendanceRecord = (id: string) => attendance.find(a => a.sewadarId === id && a.date === today);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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
      <div className="flex flex-col gap-3">
        {/* Top Controls: Gender + Add Button */}
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
          <button 
            onClick={() => setShowAddForm(true)}
            className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-100 flex items-center justify-center active:scale-95 transition-all"
            title="Add Missing Sewadar"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Search & Sort Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={`Search ${genderTab.toLowerCase()}...`}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl items-center self-start sm:self-auto min-w-max">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3">Sort:</span>
            {(['name', 'group'] as SortBy[]).map((opt) => (
              <button
                key={opt}
                onClick={() => setSortBy(opt)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  sortBy === opt ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Weekday Filter for Gents - Only visible when NOT searching */}
      {genderTab === 'Gents' && !searchTerm && (
        <div className="overflow-x-auto pb-1 no-scrollbar -mx-4 px-4">
          <div className="flex space-x-2 min-w-max">
            {GENTS_GROUPS.map((day) => (
              <button
                key={day}
                onClick={() => setGentsGroupTab(day)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                  gentsGroupTab === day 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                    : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                }`}
              >
                👮‍♂️ {day}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Attendance List */}
      <div className="flex flex-col gap-2">
        {filteredSewadars.map((s, idx) => {
          const record = getAttendanceRecord(s.id);
          const isMarked = !!record;
          
          return (
            <div 
              key={s.id} 
              className={`bg-white px-4 py-3 rounded-2xl shadow-sm border transition-all flex items-center justify-between ${
                isMarked ? 'border-emerald-100 bg-emerald-50/10' : 'border-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-[10px] font-black text-slate-300 w-4">{idx + 1}</div>
                <div className="flex flex-col">
                  <span className={`font-bold text-sm ${isMarked ? 'text-slate-800' : 'text-slate-600'}`}>{s.name}</span>
                  <div className="flex items-center gap-2">
                     <span className="text-[9px] uppercase font-black text-slate-400 tracking-tighter">
                       {s.group === 'Ladies' ? '👩' : '👮‍♂️'} {s.group}
                     </span>
                     {isMarked && (
                       <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-1">
                         <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
                         {formatTime(record.timestamp)} by {getVolunteerName(record.volunteerId)}
                       </span>
                     )}
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => onToggle(s.id)}
                className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all active:scale-90 ${
                  isMarked 
                    ? 'bg-emerald-500 border-emerald-400 shadow-lg shadow-emerald-200' 
                    : 'bg-slate-50 border-slate-100'
                }`}
              >
                {isMarked ? (
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-slate-200"></div>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {filteredSewadars.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <p className="text-slate-400 text-sm font-medium">No records found.</p>
        </div>
      )}

      {/* Add Missing Sewadar Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddForm(false)}></div>
          <form 
            onSubmit={handleAddNew}
            className="relative bg-white w-full max-w-md rounded-[2rem] p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-10"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-900">Add Missing Sewadar</h3>
              <button type="button" onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                <input 
                  autoFocus
                  required
                  type="text" 
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  placeholder="e.g. Ramesh Kumar"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gender</label>
                <div className="flex gap-2">
                  {(['Gents', 'Ladies'] as Gender[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        setNewGender(g);
                        if (g === 'Ladies') setNewGroup('Ladies');
                        else if (newGroup === 'Ladies') setNewGroup('Monday');
                      }}
                      className={`flex-1 py-3 rounded-xl text-xs font-black uppercase border-2 transition-all ${
                        newGender === g ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-100'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {newGender === 'Gents' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gents Group</label>
                  <select 
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold appearance-none"
                    value={newGroup}
                    onChange={(e) => setNewGroup(e.target.value as GentsGroup)}
                  >
                    {GENTS_GROUPS.map(day => (
                      <option key={day} value={day}>👮‍♂️ {day}</option>
                    ))}
                  </select>
                </div>
              )}

              <button 
                type="submit"
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 active:scale-95 transition-all mt-4"
              >
                Register & Mark Present
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AttendanceManager;
