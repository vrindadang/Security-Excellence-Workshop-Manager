
import React, { useMemo, useState } from 'react';
import { Sewadar, AttendanceRecord, ScoreRecord, Volunteer } from '../types';
import { GENTS_GROUPS, VOLUNTEERS } from '../constants';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../supabase';

interface Props {
  sewadars: Sewadar[];
  attendance: AttendanceRecord[];
  scores: ScoreRecord[];
  onSyncMasterList?: () => void;
  syncingMasterList?: boolean;
  onClearAttendance?: () => void;
  onHealAttendancePoints?: (forceTo100?: boolean) => void;
  activeVolunteer?: Volunteer | null;
}

const Dashboard: React.FC<Props> = ({ sewadars, attendance, scores, onSyncMasterList, syncingMasterList, onClearAttendance, onHealAttendancePoints, activeVolunteer }) => {
  const today = new Date().toISOString().split('T')[0];
  const [selectedArchiveDate, setSelectedArchiveDate] = useState(today);
  const [isFetchingArchive, setIsFetchingArchive] = useState(false);
  const isSuperAdmin = activeVolunteer?.id === 'sa' || activeVolunteer?.role === 'Super Admin';

  const totalAttendanceCount = attendance.filter(a => a.date === today).length;

  const combinedGroupData = useMemo(() => {
    const allGroups = [...GENTS_GROUPS, 'Ladies'];
    return allGroups.map(group => {
      const groupSewadars = sewadars.filter(s => s.group === group);
      const presentInGroup = attendance.filter(a => 
        a.date === today && 
        groupSewadars.some(s => s.id === a.sewadarId)
      ).length;

      const groupPoints = scores.filter(sc => 
        groupSewadars.some(s => s.id === sc.sewadarId) && !sc.isDeleted
      ).reduce((sum, sc) => sum + sc.points, 0);

      return { 
        name: group.substring(0, 3), 
        fullName: group,
        Attendance: presentInGroup, 
        Points: groupPoints 
      };
    });
  }, [sewadars, attendance, scores, today]);

  const teamScoresData = useMemo(() => {
    const allGroups = [...GENTS_GROUPS, 'Ladies'];
    return allGroups.map(group => {
      const groupSewadars = sewadars.filter(s => s.group === group);
      const groupPoints = scores.filter(sc => 
        groupSewadars.some(s => s.id === sc.sewadarId) && !sc.isDeleted
      ).reduce((sum, sc) => sum + sc.points, 0);
      return { name: group, points: groupPoints };
    }).sort((a, b) => b.points - a.points);
  }, [sewadars, scores]);

  const maxAttendance = Math.max(...combinedGroupData.map(d => d.Attendance), 10);
  const maxPoints = Math.max(...combinedGroupData.map(d => d.Points), 20);

  // Helper function to generate PDF based on provided attendance and date
  const runAttendancePDF = (targetDate: string, attendanceData: AttendanceRecord[]) => {
    const doc = new jsPDF();
    const displayDate = new Date(targetDate).toLocaleDateString();
    
    // Calculate Statistics
    const totalSewadarsCount = sewadars.length;
    const presentIds = new Set(attendanceData.map(a => a.sewadarId));
    
    const gentsPresent = sewadars.filter(s => s.gender === 'Gents' && presentIds.has(s.id)).length;
    const ladiesPresent = sewadars.filter(s => s.gender === 'Ladies' && presentIds.has(s.id)).length;

    // Header Design
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text("Daily Attendance Report", 14, 15);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Report Date: ${displayDate} | Status: Workshop Archive`, 14, 21);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    const summaryText = `Total Sewadars: ${totalSewadarsCount} | Gents Present: ${gentsPresent} | Ladies Present: ${ladiesPresent}`;
    doc.text(summaryText, 14, 29);

    let lastY = 45;
    const allGroups = ['Ladies', ...GENTS_GROUPS];
    allGroups.forEach(group => {
      const groupSewadarIds = sewadars.filter(s => s.group === group).map(s => s.id);
      const groupAttRecords = attendanceData
        .filter(a => groupSewadarIds.includes(a.sewadarId))
        .sort((a, b) => a.name.localeCompare(b.name));
      
      if (groupAttRecords.length > 0) {
        if (lastY > 260) { doc.addPage(); lastY = 20; }
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text(`${group} Group`, 14, lastY);
        const tableData = groupAttRecords.map((record, index) => {
          const volName = VOLUNTEERS.find(v => v.id === record.volunteerId)?.name || 'Admin';
          return [index + 1, record.name || 'Unknown', new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), volName];
        });
        autoTable(doc, {
          startY: lastY + 5,
          head: [['#', 'Sewadar Name', 'Time In', 'Verified By']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [99, 102, 241], textColor: 255 },
          margin: { left: 14, right: 14 }
        });
        lastY = (doc as any).lastAutoTable.finalY + 15;
      }
    });
    doc.save(`Attendance_Report_${targetDate}.pdf`);
  };

  // Helper function for Points PDF
  const runPointsPDF = (targetDate: string, scoresData: ScoreRecord[]) => {
    const doc = new jsPDF();
    const displayDate = new Date(targetDate).toLocaleDateString();
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("Workshop Points Summary", 14, 18);
    doc.setFontSize(10);
    doc.text(`Report Date: ${displayDate} | Source: Workshop Records`, 14, 25);
    let lastY = 40;
    const allGroups = ['Ladies', ...GENTS_GROUPS];
    allGroups.forEach(group => {
      const groupSewadarIds = sewadars.filter(s => s.group === group).map(s => s.id);
      const pointRecordsMap: Record<string, { name: string, points: number, breakdown: string[] }> = {};
      
      // For archive points, we usually want cumulative or date-specific? 
      // Usually "Points Summary" implies current standings, but for archives we just show the records requested.
      scoresData.filter(sc => !sc.isDeleted && groupSewadarIds.includes(sc.sewadarId)).forEach(sc => {
        if (!pointRecordsMap[sc.sewadarId]) {
          pointRecordsMap[sc.sewadarId] = { name: sc.name || 'Unnamed', points: 0, breakdown: [] };
        }
        pointRecordsMap[sc.sewadarId].points += sc.points;
        pointRecordsMap[sc.sewadarId].breakdown.push(`${sc.game}(${sc.points})`);
      });
      const list = Object.values(pointRecordsMap).sort((a, b) => b.points - a.points);
      if (list.length > 0) {
        if (lastY > 260) { doc.addPage(); lastY = 20; }
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text(`${group} Group Standings`, 14, lastY);
        const tableData = list.map((item, index) => [index + 1, item.name, item.breakdown.join(', '), item.points]);
        autoTable(doc, {
          startY: lastY + 5,
          head: [['Rank', 'Name', 'Activity Breakdown', 'Total']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [16, 185, 129] },
          columnStyles: { 2: { cellWidth: 80 } },
          margin: { left: 14, right: 14 }
        });
        lastY = (doc as any).lastAutoTable.finalY + 15;
      }
    });
    doc.save(`Workshop_Points_${targetDate}.pdf`);
  };

  const generateAttendancePDF = () => {
    runAttendancePDF(today, attendance.filter(a => a.date === today));
  };

  const generatePointsPDF = () => {
    runPointsPDF(today, scores);
  };

  const handleDownloadArchive = async (type: 'attendance' | 'points') => {
    if (!selectedArchiveDate) return;
    setIsFetchingArchive(true);
    try {
      if (type === 'attendance') {
        const [{ data: gentsAtt }, { data: ladiesAtt }] = await Promise.all([
          supabase.from('attendance').select('*').eq('date', selectedArchiveDate),
          supabase.from('ladies_attendance').select('*').eq('date', selectedArchiveDate)
        ]);

        const combinedAtt = [...(gentsAtt || []), ...(ladiesAtt || [])].map((a: any) => ({
          sewadarId: a.sewadar_id,
          name: a.name || '',
          date: a.date,
          timestamp: Number(a.timestamp),
          volunteerId: a.volunteer_id
        }));

        if (combinedAtt.length === 0) {
          alert(`No attendance records found for ${selectedArchiveDate}`);
        } else {
          runAttendancePDF(selectedArchiveDate, combinedAtt);
        }
      } else {
        // For points, we use current scores but since historical points aren't easily filtered by "earned on this date"
        // without complex timestamp logic, we generate the full standings as of that period.
        // Actually, let's filter scores by timestamp to match the date.
        const startOfDay = new Date(selectedArchiveDate).setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedArchiveDate).setHours(23, 59, 59, 999);
        
        const filteredScores = scores.filter(s => s.timestamp >= startOfDay && s.timestamp <= endOfDay);
        
        if (filteredScores.length === 0) {
          alert(`No point records found for ${selectedArchiveDate}`);
        } else {
          runPointsPDF(selectedArchiveDate, filteredScores);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Failed to fetch archive data.");
    } finally {
      setIsFetchingArchive(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Workshop Performance Header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-[2rem] shadow-xl text-white">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-black tracking-tight mb-1 text-center md:text-left">Workshop Performance</h2>
            <p className="text-slate-400 text-xs text-center md:text-left">Live reports synced from database</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button onClick={generateAttendancePDF} className="flex-1 md:flex-none bg-indigo-500 hover:bg-indigo-600 px-5 py-3 rounded-xl font-bold text-xs uppercase shadow-lg transition-all active:scale-95">Attendance</button>
            <button onClick={generatePointsPDF} className="flex-1 md:flex-none bg-emerald-500 hover:bg-emerald-600 px-5 py-3 rounded-xl font-bold text-xs uppercase shadow-lg transition-all active:scale-95">Points</button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 text-center">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Today's Presence</p>
          <div className="flex items-center justify-center gap-1">
             <span className="text-3xl font-black text-slate-900">{totalAttendanceCount}</span>
             <span className="text-[10px] text-slate-400 font-bold">/ {sewadars.length}</span>
          </div>
        </div>
        <div className="bg-indigo-600 p-5 rounded-2xl shadow-xl text-center text-white">
          <p className="text-[8px] font-black text-indigo-200 uppercase tracking-widest mb-2">Top Team Points</p>
          <span className="text-2xl font-black block truncate">{teamScoresData[0]?.points || 0}</span>
          <span className="text-[9px] font-bold uppercase tracking-tighter opacity-70">
            {teamScoresData[0]?.name ? (teamScoresData[0].name === 'Ladies' ? '👩 ' : '👮‍♂️ ') + teamScoresData[0].name : '---'}
          </span>
        </div>
      </div>

      {/* Group Performance Graph */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
           <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em]">Group Performance</h3>
           <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                 <div className="w-2.5 h-2.5 rounded bg-emerald-500"></div>
                 <span className="text-[9px] font-bold text-slate-400 uppercase">Presence</span>
              </div>
              <div className="flex items-center gap-1.5">
                 <div className="w-2.5 h-2.5 rounded bg-indigo-500"></div>
                 <span className="text-[9px] font-bold text-slate-400 uppercase">Points</span>
              </div>
           </div>
        </div>
        
        <div className="h-[240px] w-full flex items-end justify-between gap-2 md:gap-4 px-2">
           {combinedGroupData.map((data) => {
             const attHeight = (data.Attendance / maxAttendance) * 100;
             const ptsHeight = (data.Points / maxPoints) * 100;
             return (
               <div key={data.name} className="flex-1 flex flex-col items-center justify-end h-full gap-2">
                  <div className="w-full flex items-end justify-center gap-1 h-full">
                     <div className="w-3 md:w-5 bg-emerald-500 rounded-t-sm" style={{ height: `${Math.max(attHeight, 2)}%` }}></div>
                     <div className="w-3 md:w-5 bg-indigo-500 rounded-t-sm" style={{ height: `${Math.max(ptsHeight, 2)}%` }}></div>
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase">{data.name}</span>
               </div>
             );
           })}
        </div>
      </div>

      {/* Historical Archives Section - SUPER ADMIN ONLY */}
      {isSuperAdmin && (
        <div className="bg-slate-900 p-8 rounded-[2rem] shadow-2xl border border-slate-800 animate-fade-in">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight leading-none mb-1">Workshop Archives</h3>
              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Historical Performance Lookup</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Select Report Date</label>
              <input 
                type="date" 
                max={today}
                value={selectedArchiveDate}
                onChange={(e) => setSelectedArchiveDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleDownloadArchive('attendance')}
                disabled={isFetchingArchive}
                className="flex flex-col items-center justify-center gap-2 bg-indigo-600/10 border border-indigo-500/30 p-6 rounded-2xl hover:bg-indigo-600/20 transition-all group disabled:opacity-50"
              >
                <svg className="w-6 h-6 text-indigo-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Attendance PDF</span>
              </button>
              <button 
                onClick={() => handleDownloadArchive('points')}
                disabled={isFetchingArchive}
                className="flex flex-col items-center justify-center gap-2 bg-emerald-600/10 border border-emerald-500/30 p-6 rounded-2xl hover:bg-emerald-600/20 transition-all group disabled:opacity-50"
              >
                <svg className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Points PDF</span>
              </button>
            </div>
            
            {isFetchingArchive && (
              <div className="flex items-center justify-center gap-2 py-2">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Retrieving Historical Records...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Emergency Management Section */}
      <div className="bg-red-50 border-2 border-dashed border-red-200 p-8 rounded-[2rem] shadow-sm animate-fade-in">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none mb-1">Fix Point Discrepancies</h3>
            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Emergency Sync Tools (Admin Only)</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {isSuperAdmin && onHealAttendancePoints && (
            <button 
              onClick={() => onHealAttendancePoints(true)}
              disabled={syncingMasterList}
              className={`py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all bg-emerald-600 text-white shadow-xl shadow-emerald-100 hover:bg-emerald-700 active:scale-[0.98] ${
                syncingMasterList ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Convert Today's 50s to 100s
            </button>
          )}

          <div className="grid grid-cols-2 gap-4 mt-2">
            <button onClick={onClearAttendance} disabled={syncingMasterList || !isSuperAdmin} className={`py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${syncingMasterList || !isSuperAdmin ? 'bg-red-100 text-red-300 cursor-not-allowed' : 'bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 active:scale-[0.98]'}`}>Unmark Attendance</button>
            <button onClick={onSyncMasterList} disabled={syncingMasterList || !isSuperAdmin} className={`py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${syncingMasterList || !isSuperAdmin ? 'bg-red-100 text-red-300 cursor-not-allowed' : 'bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 active:scale-[0.98]'}`}>Reset Sewadar List</button>
          </div>
        </div>
        {!isSuperAdmin && <p className="mt-4 text-center text-red-400 font-bold text-[10px] uppercase tracking-widest">Restricted: Super Admin access required.</p>}
      </div>
    </div>
  );
};
export default Dashboard;
