import React, { useMemo } from 'react';
import { Sewadar, AttendanceRecord, ScoreRecord } from '../types';
import { GENTS_GROUPS, VOLUNTEERS } from '../constants';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  sewadars: Sewadar[];
  attendance: AttendanceRecord[];
  scores: ScoreRecord[];
  onSyncMasterList?: () => void;
  syncingMasterList?: boolean;
}

const Dashboard: React.FC<Props> = ({ sewadars, attendance, scores, onSyncMasterList, syncingMasterList }) => {
  const today = new Date().toISOString().split('T')[0];

  const totalAttendance = attendance.filter(a => a.date === today).length;

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

  const generateAttendancePDF = () => {
    const doc = new jsPDF();
    const todayStr = new Date().toLocaleDateString();
    
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("Daily Attendance Report", 14, 18);
    doc.setFontSize(10);
    doc.text(`Generated on: ${todayStr} | Source: Supabase Database`, 14, 25);

    let lastY = 40;
    const allGroups = ['Ladies', ...GENTS_GROUPS];

    allGroups.forEach(group => {
      const groupSewadarIds = sewadars.filter(s => s.group === group).map(s => s.id);
      const groupAttRecords = attendance
        .filter(a => a.date === today && groupSewadarIds.includes(a.sewadarId))
        .sort((a, b) => a.name.localeCompare(b.name));

      if (groupAttRecords.length > 0) {
        if (lastY > 260) {
          doc.addPage();
          lastY = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text(`${group} Group`, 14, lastY);
        
        const tableData = groupAttRecords.map((record, index) => {
          const volName = VOLUNTEERS.find(v => v.id === record.volunteerId)?.name || 'Admin';
          return [
            index + 1,
            record.name || 'Unknown Sewadar',
            new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            volName
          ];
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

    doc.save(`Attendance_Live_${today}.pdf`);
  };

  const generatePointsPDF = () => {
    const doc = new jsPDF();
    const todayStr = new Date().toLocaleDateString();

    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("Workshop Points Summary", 14, 18);
    doc.setFontSize(10);
    doc.text(`Generated on: ${todayStr} | Source: Supabase Live Records`, 14, 25);

    let lastY = 40;
    const allGroups = ['Ladies', ...GENTS_GROUPS];

    allGroups.forEach(group => {
      const groupSewadarIds = sewadars.filter(s => s.group === group).map(s => s.id);
      const pointRecordsMap: Record<string, { name: string, points: number, breakdown: string[] }> = {};
      
      scores.filter(sc => !sc.isDeleted && groupSewadarIds.includes(sc.sewadarId)).forEach(sc => {
        if (!pointRecordsMap[sc.sewadarId]) {
          pointRecordsMap[sc.sewadarId] = { name: sc.name || 'Unnamed', points: 0, breakdown: [] };
        }
        pointRecordsMap[sc.sewadarId].points += sc.points;
        pointRecordsMap[sc.sewadarId].breakdown.push(`${sc.game}(${sc.points})`);
      });

      const list = Object.values(pointRecordsMap).sort((a, b) => b.points - a.points);

      if (list.length > 0) {
        if (lastY > 260) {
          doc.addPage();
          lastY = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text(`${group} Group Standings`, 14, lastY);

        const tableData = list.map((item, index) => [
          index + 1,
          item.name,
          item.breakdown.join(', '),
          item.points
        ]);

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

    doc.save(`Points_Live_${today}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-[2rem] shadow-xl text-white">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-black tracking-tight mb-1">Live Database Reports</h2>
            <p className="text-slate-400 text-xs">Download synchronized workshop data</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button onClick={generateAttendancePDF} className="flex-1 md:flex-none bg-indigo-500 px-5 py-3 rounded-xl font-bold text-xs uppercase shadow-lg active:scale-95">
              Attendance PDF
            </button>
            <button onClick={generatePointsPDF} className="flex-1 md:flex-none bg-emerald-500 px-5 py-3 rounded-xl font-bold text-xs uppercase shadow-lg active:scale-95">
              Points PDF
            </button>
          </div>
        </div>
        
        {onSyncMasterList && (
          <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-indigo-300 tracking-widest">Database Management</span>
              <p className="text-[11px] text-slate-400">Remove old dummies & sync master list</p>
            </div>
            <button 
              onClick={onSyncMasterList} 
              disabled={syncingMasterList}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                syncingMasterList ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-white/10 hover:bg-white text-white hover:text-slate-900 shadow-lg'
              }`}
            >
              {syncingMasterList ? 'Purging...' : 'Clean Sync (Remove Dummies)'}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 text-center">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Today's Presence</p>
          <div className="flex items-center justify-center gap-1">
             <span className="text-3xl font-black text-slate-900">{totalAttendance}</span>
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
        
        <div className="h-[280px] w-full flex items-end justify-between gap-2 md:gap-4 px-2">
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
    </div>
  );
};

export default Dashboard;