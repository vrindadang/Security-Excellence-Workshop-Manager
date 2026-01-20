
import React, { useMemo } from 'react';
import { Sewadar, AttendanceRecord, ScoreRecord } from '../types';
import { GENTS_GROUPS, VOLUNTEERS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, Legend } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  sewadars: Sewadar[];
  attendance: AttendanceRecord[];
  scores: ScoreRecord[];
}

const Dashboard: React.FC<Props> = ({ sewadars, attendance, scores }) => {
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

      // Filter out deleted scores
      const groupPoints = scores.filter(sc => 
        groupSewadars.some(s => s.id === sc.sewadarId) && !sc.isDeleted
      ).reduce((sum, sc) => sum + sc.points, 0);

      return { 
        name: group.substring(0, 3), 
        Attendance: presentInGroup, 
        Points: groupPoints 
      };
    });
  }, [sewadars, attendance, scores, today]);

  const teamScoresData = useMemo(() => {
    const allGroups = [...GENTS_GROUPS, 'Ladies'];
    return allGroups.map(group => {
      const groupSewadars = sewadars.filter(s => s.group === group);
      // Filter out deleted scores
      const groupPoints = scores.filter(sc => 
        groupSewadars.some(s => s.id === sc.sewadarId) && !sc.isDeleted
      ).reduce((sum, sc) => sum + sc.points, 0);
      return { name: group, points: groupPoints };
    }).sort((a, b) => b.points - a.points);
  }, [sewadars, scores]);

  const generateAttendancePDF = () => {
    const doc = new jsPDF();
    const todayStr = new Date().toLocaleDateString();
    
    // Header
    doc.setFillColor(79, 70, 229); // Indigo 600
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("Daily Attendance Report", 14, 18);
    doc.setFontSize(10);
    doc.text(`Generated on: ${todayStr} | SKRM Security Excellence Workshop`, 14, 25);

    let lastY = 40;
    const allGroups = ['Ladies', ...GENTS_GROUPS];

    allGroups.forEach(group => {
      const groupSewadars = sewadars.filter(s => s.group === group);
      const presentSewadars = groupSewadars
        .filter(s => attendance.some(a => a.sewadarId === s.id && a.date === today))
        .sort((a, b) => a.name.localeCompare(b.name));

      if (presentSewadars.length > 0) {
        if (lastY > 260) {
          doc.addPage();
          lastY = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59); // Slate 800
        doc.setFont('helvetica', 'bold');
        doc.text(`${group === 'Ladies' ? 'Woman' : 'Gents'} - ${group} Group`, 14, lastY);
        
        const tableData = presentSewadars.map((s, index) => {
          const record = attendance.find(a => a.sewadarId === s.id && a.date === today);
          const volName = VOLUNTEERS.find(v => v.id === record?.volunteerId)?.name || 'Unknown';
          return [
            index + 1,
            s.name,
            record ? new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
            volName
          ];
        });

        autoTable(doc, {
          startY: lastY + 5,
          head: [['#', 'Sewadar Name', 'Time', 'Marked By']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          styles: { fontSize: 10, cellPadding: 3 },
          margin: { left: 14, right: 14 }
        });

        lastY = (doc as any).lastAutoTable.finalY + 15;
      }
    });

    if (lastY === 40) {
       doc.setTextColor(100);
       doc.text("No attendance marked for today yet.", 14, 50);
    }

    doc.save(`Attendance_Report_${today}.pdf`);
  };

  const generatePointsPDF = () => {
    const doc = new jsPDF();
    const todayStr = new Date().toLocaleDateString();

    // Header
    doc.setFillColor(16, 185, 129); // Emerald 500
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("Sewadar Points Report", 14, 18);
    doc.setFontSize(10);
    doc.text(`Updated on: ${todayStr} | Group-wise Performance Summary`, 14, 25);

    let lastY = 40;
    const allGroups = ['Ladies', ...GENTS_GROUPS];

    allGroups.forEach(group => {
      const groupSewadars = sewadars.filter(s => s.group === group);
      const sewadarsWithPoints = groupSewadars.map(s => {
        // Filter out deleted scores
        const sewadarScores = scores.filter(sc => sc.sewadarId === s.id && !sc.isDeleted);
        const pts = sewadarScores.reduce((sum, sc) => sum + sc.points, 0);

        // Create breakdown string: e.g. "Chess(10), Carrom(5)"
        const breakdownMap: Record<string, number> = {};
        sewadarScores.forEach(sc => {
          breakdownMap[sc.game] = (breakdownMap[sc.game] || 0) + sc.points;
        });
        const breakdown = Object.entries(breakdownMap)
          .map(([game, points]) => `${game}(${points})`)
          .join(', ');

        return { ...s, points: pts, breakdown };
      })
      .filter(s => s.points > 0)
      .sort((a, b) => b.points - a.points);

      if (sewadarsWithPoints.length > 0) {
        if (lastY > 260) {
          doc.addPage();
          lastY = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text(`${group === 'Ladies' ? 'Woman' : 'Gents'} - ${group} Group`, 14, lastY);

        const tableData = sewadarsWithPoints.map((s, index) => [
          index + 1,
          s.name,
          s.breakdown,
          s.points
        ]);

        autoTable(doc, {
          startY: lastY + 5,
          head: [['Rank', 'Sewadar Name', 'Game Breakdown', 'Total Points']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 10, cellPadding: 3 },
          columnStyles: { 2: { cellWidth: 80 } }, // Give more width to breakdown column
          margin: { left: 14, right: 14 }
        });

        lastY = (doc as any).lastAutoTable.finalY + 15;
      }
    });

    if (lastY === 40) {
       doc.setTextColor(100);
       doc.text("No points awarded yet.", 14, 50);
    }

    doc.save(`Points_Report_${today}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Reports Section */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-[2rem] shadow-xl text-white relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-black tracking-tight mb-1">Workshop Reports</h2>
            <p className="text-slate-400 text-xs font-medium">Download official PDF records for analysis</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button 
              onClick={generateAttendancePDF}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Attendance
            </button>
            <button 
              onClick={generatePointsPDF}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Points
            </button>
          </div>
        </div>
        
        {/* Decorative background */}
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      {/* Visual KPIs */}
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

      {/* Attendance & Points Spread Chart */}
      <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100">
        <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] mb-6 text-center">Group Performance Metrics</h3>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={combinedGroupData}
              margin={{ top: 20, right: 10, left: -20, bottom: 5 }}
            >
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }} 
              />
              <YAxis hide />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }} 
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: 'none', 
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }} 
              />
              <Legend 
                verticalAlign="top" 
                align="right" 
                iconType="circle"
                wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', paddingBottom: '20px' }}
              />
              <Bar dataKey="Attendance" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12}>
                <LabelList dataKey="Attendance" position="top" style={{ fontSize: '9px', fontWeight: 'bold', fill: '#10b981' }} />
              </Bar>
              <Bar dataKey="Points" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={12}>
                <LabelList dataKey="Points" position="top" style={{ fontSize: '9px', fontWeight: 'bold', fill: '#6366f1' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Team Leaderboard */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em] mb-6 text-center">Team Points Leaderboard</h3>
        <div className="space-y-2">
          {teamScoresData.map((team, idx) => (
            <div key={team.name} className="flex items-center justify-between p-3 rounded-xl border border-slate-50 bg-slate-50/50">
               <div className="flex items-center gap-3">
                 <span className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-black ${
                   idx === 0 ? 'bg-amber-100 text-amber-600' : 'bg-indigo-50 text-indigo-600'
                 }`}>
                   {idx + 1}
                 </span>
                 <span className="text-xs font-bold text-slate-700">
                   {team.name === 'Ladies' ? '👩' : '👮‍♂️'} {team.name}
                 </span>
               </div>
               <span className="text-sm font-black text-slate-900">{team.points}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
    