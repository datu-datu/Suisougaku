import React, { useMemo, useRef, useState } from 'react';
import { useAppState } from '../store/AppStateContext';
import { format } from 'date-fns';
import { AttendanceStatus } from '../types';
import { Download, Upload, Settings, X, FileJson, FileSpreadsheet } from 'lucide-react';

const SCORE_WEIGHTS: Record<string, number> = {
  'piccolo': 10, 'ピッコロ': 10,
  'flute': 20, 'フルート': 20,
  'oboe': 30, 'オーボエ': 30,
  'bassoon': 40, 'ファゴット': 40,
  'eb clarinet': 50, 'e♭クラリネット': 50, 'エスクラ': 50,
  'bass clarinet': 60, 'バスクラリネット': 60, 'バスクラ': 60,
  'alto clarinet': 70, 'アルトクラリネット': 70,
  'contrabass clarinet': 80, 'コントラバスクラリネット': 80,
  'clarinet': 90, 'クラリネット': 90,
  'soprano sax': 100, 'ソプラノサックス': 100,
  'alto sax': 110, 'アルトサックス': 110,
  'tenor sax': 120, 'テナーサックス': 120,
  'baritone sax': 130, 'bari sax': 130, 'バリトンサックス': 130, 'バリサク': 130,
  'trumpet': 140, 'トランペット': 140,
  'cornet': 150, 'コルネット': 150,
  'fluegelhorn': 155, 'フリューゲルホルン': 155,
  'horn': 160, 'ホルン': 160,
  'bass trombone': 170, 'バストロンボーン': 170, 'バストロ': 170,
  'trombone': 180, 'トロンボーン': 180,
  'euphonium': 190, 'ユーフォニアム': 190, 'ユーフォ': 190,
  'tuba': 200, 'チューバ': 200, 'テューバ': 200,
  'string bass': 210, 'ストリングベース': 210, 'contrabass': 210, 'コントラバス': 210, '弦バス': 210,
  'timpani': 220, 'ティンパニ': 220,
  'percussion': 230, 'パーカッション': 230, '打楽器': 230,
  'piano': 240, 'ピアノ': 240,
  'harp': 250, 'ハープ': 250
};

const SORTED_SCORE_KEYS = Object.keys(SCORE_WEIGHTS).sort((a, b) => b.length - a.length);

const getPartScore = (partName: string) => {
  const lower = partName.toLowerCase();
  for (const key of SORTED_SCORE_KEYS) {
    if (lower.includes(key)) {
      return SCORE_WEIGHTS[key];
    }
  }
  return 999;
};

export const isMemberOnLeave = (member: { leavePeriods?: { startDate: string, endDate?: string }[] }, targetDateStr: string) => {
  if (!member.leavePeriods) return false;
  return member.leavePeriods.some(period => {
    if (period.startDate > targetDateStr) return false;
    if (period.endDate && period.endDate < targetDateStr) return false;
    return true;
  });
};

export const AttendanceView = () => {
  const { selectedDate, attendance, setAttendance, roster, setRoster } = useAppState();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const rosterInputRef = useRef<HTMLInputElement>(null);
  
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  const currentAttendance = attendance[selectedDate] || {
    date: selectedDate,
    records: []
  };

  const updateStatus = (memberId: string, status: AttendanceStatus) => {
    const existingIndex = currentAttendance.records.findIndex(r => r.memberId === memberId);
    
    let newRecords = [...currentAttendance.records];
    if (existingIndex >= 0) {
      newRecords[existingIndex] = { memberId, status };
    } else {
      newRecords.push({ memberId, status });
    }

    setAttendance(prev => ({
      ...prev,
      [selectedDate]: {
        date: selectedDate,
        records: newRecords
      }
    }));
  };

  const getStatus = (memberId: string): AttendanceStatus | undefined => {
    return currentAttendance.records.find(r => r.memberId === memberId)?.status;
  };

  const rosterByPart = useMemo(() => {
    const grouped = roster.reduce((acc, member) => {
      if (!acc[member.part]) acc[member.part] = [];
      acc[member.part].push(member);
      return acc;
    }, {} as Record<string, typeof roster>);
    return grouped;
  }, [roster]);

  const handleExportRoster = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(roster, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = "roster.json";
    a.click();
    setIsMenuOpen(false);
  };

  const handleImportRoster = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json) && json.every(m => m.id && m.name && m.part)) {
          setRoster(json);
          alert('名簿をインポートしました');
        } else {
           alert('名簿の形式が正しくありません。(id, name, part が必要です)');
        }
      } catch (err) {
        alert('無効なJSONファイルです');
      }
      if (rosterInputRef.current) rosterInputRef.current.value = '';
    };
    reader.readAsText(file);
    setIsMenuOpen(false);
  };

  const handleExportAttendanceCSV = () => {
    const sortedDates = Object.keys(attendance)
      .filter(date => (!exportStartDate || date >= exportStartDate) && (!exportEndDate || date <= exportEndDate))
      .sort();

    let csv = "\uFEFF,";
    csv += sortedDates.join(",") + "\n";

    roster.forEach(member => {
      const row = [member.name];
      sortedDates.forEach(date => {
        const isOnLeave = isMemberOnLeave(member, date);
        const records = attendance[date].records;
        const recordMap = Object.fromEntries(records.map(r => [r.memberId, r.status]));
        const status = isOnLeave ? 'on_leave' : (recordMap[member.id] || '未入力');
        const statusMap: Record<string, string> = { present: '出席', absent: '欠席', late: '遅刻', on_leave: '休部', '未入力': '未入力' };
        row.push(statusMap[status] || status);
      });
      csv += row.join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "attendance_records.csv";
    a.click();
    URL.revokeObjectURL(url);
    setIsMenuOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="bg-emerald-700 text-white p-4 shadow-md sticky top-0 z-10 flex justify-between items-center shrink-0">
        <div>
          <p className="text-emerald-200 text-xs font-medium">出席管理</p>
          <h2 className="text-lg font-bold">{format(new Date(selectedDate), 'yyyy年M月d日')}</h2>
        </div>
        <div>
          <button onClick={() => setIsMenuOpen(true)} className="p-2 hover:bg-emerald-600 rounded-full transition-colors">
            <Settings size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 pb-6">
        {Object.keys(rosterByPart).length === 0 && (
          <div className="text-center py-16 px-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4 text-emerald-500">
              <Upload size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">名簿データがありません</h3>
            <p className="text-sm text-slate-500 mb-6 max-w-[240px] leading-relaxed">
              出席管理を始めるには、名簿データ (JSON形式) をアップロードしてください。
            </p>
            <button
              onClick={() => rosterInputRef.current?.click()}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-full font-bold transition-colors shadow-md active:scale-95"
            >
              <FileJson size={20} />
              ファイルを選択
            </button>
            <a 
              href="data:text/json;charset=utf-8,%5B%0A%20%20%7B%0A%20%20%20%20%22id%22%3A%20%221%22%2C%0A%20%20%20%20%22name%22%3A%20%22%E5%B1%B1%E7%94%B0%E5%A4%AA%E9%83%8E%22%2C%0A%20%20%20%20%22part%22%3A%20%22%E3%83%88%E3%83%A9%E3%83%B3%E3%83%9A%E3%83%83%E3%83%88%22%0A%20%20%7D%0A%5D"
              download="sample_roster.json"
              className="text-xs text-emerald-600 hover:text-emerald-700 mt-4 underline underline-offset-2"
            >
              サンプルフォーマットをダウンロード
            </a>
          </div>
        )}
        {Object.keys(rosterByPart).sort((a, b) => {
          const scoreA = getPartScore(a);
          const scoreB = getPartScore(b);
          if (scoreA !== scoreB) {
            return scoreA - scoreB;
          }
          return a.localeCompare(b);
        }).map(part => {
          const members = rosterByPart[part];
          return (
          <div key={part} className="mb-6">
            <h3 className="font-bold text-slate-800 border-b-2 border-emerald-200 pb-1 mb-3">{part}</h3>
            <div className="space-y-2">
              {members.map(member => {
                const isOnLeave = isMemberOnLeave(member, selectedDate);
                const status = isOnLeave ? 'on_leave' : getStatus(member.id);
                return (
                  <div key={member.id} className={`p-3 rounded-xl shadow-sm flex items-center justify-between ${isOnLeave ? 'bg-slate-100 opacity-70' : 'bg-white'}`}>
                    <div className="w-24 sm:w-32 shrink-0 pr-2 flex items-center flex-wrap gap-1">
                      <span className="font-medium text-slate-700 leading-tight">{member.name}</span>
                      {isOnLeave && <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded mt-0.5">休部</span>}
                    </div>
                    <div className={`flex rounded-xl p-1 gap-1.5 ${isOnLeave ? 'bg-transparent' : 'bg-slate-100'} flex-1`}>
                      {!isOnLeave ? (
                        <>
                          <button
                            onClick={() => updateStatus(member.id, 'present')}
                            className={`flex-1 py-3 rounded-lg text-xs sm:text-sm font-bold transition-all active:scale-95 ${status === 'present' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 bg-white shadow-sm ring-1 ring-slate-200'}`}
                          >
                            出席
                          </button>
                          <button
                            onClick={() => updateStatus(member.id, 'late')}
                            className={`flex-1 py-3 rounded-lg text-xs sm:text-sm font-bold transition-all active:scale-95 ${status === 'late' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-400 bg-white shadow-sm ring-1 ring-slate-200'}`}
                          >
                            遅刻
                          </button>
                          <button
                            onClick={() => updateStatus(member.id, 'absent')}
                            className={`flex-1 py-3 rounded-lg text-xs sm:text-sm font-bold transition-all active:scale-95 ${status === 'absent' ? 'bg-red-500 text-white shadow-md' : 'text-slate-400 bg-white shadow-sm ring-1 ring-slate-200'}`}
                          >
                            欠席
                          </button>
                        </>
                      ) : (
                        <div className="w-full text-center px-4 py-3 text-xs font-bold text-slate-400">
                          休部期間中
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )})}
      </div>

      <input type="file" accept=".json" ref={rosterInputRef} className="hidden" onChange={handleImportRoster} />

      {isMenuOpen && (
        <div className="absolute inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="font-bold text-lg text-slate-800">出欠データ入出力</h3>
              <button onClick={() => setIsMenuOpen(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full"><X size={20}/></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-500">出席記録出力</p>
                <div className="flex gap-2 mb-2 items-center">
                  <input type="date" value={exportStartDate} onChange={e => setExportStartDate(e.target.value)} className="w-full text-xs p-1.5 border border-slate-200 rounded" />
                  <span className="text-slate-400">～</span>
                  <input type="date" value={exportEndDate} onChange={e => setExportEndDate(e.target.value)} className="w-full text-xs p-1.5 border border-slate-200 rounded" />
                </div>
                <button onClick={handleExportAttendanceCSV} className="w-full flex items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl transition border border-slate-200">
                  <FileSpreadsheet className="text-emerald-500" size={18} />
                  <span className="font-medium text-sm">CSVでダウンロード</span>
                </button>
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <p className="text-sm font-bold text-slate-500">名簿データ (JSON)</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => rosterInputRef.current?.click()} className="flex items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl transition border border-slate-200">
                    <Upload className="text-blue-500" size={18} />
                    <span className="font-medium text-sm">アップロード</span>
                  </button>
                  <button onClick={handleExportRoster} className="flex items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl transition border border-slate-200">
                    <FileJson className="text-indigo-500" size={18} />
                    <span className="font-medium text-sm">ダウンロード</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
