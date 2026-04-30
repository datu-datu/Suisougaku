import React from 'react';
import { useAppState } from '../store/AppStateContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const CalendarHomeView = ({ onNavigate }: { onNavigate: (tab: string) => void }) => {
  const { selectedDate, setSelectedDate, logs, attendance, roster } = useAppState();
  const [currentMonth, setCurrentMonth] = React.useState(new Date(selectedDate));

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth)),
    end: endOfWeek(endOfMonth(currentMonth))
  });

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

  const handleDayClick = (day: Date) => {
    setSelectedDate(format(day, 'yyyy-MM-dd'));
  };

  const getAttendanceSummary = (dateStr: string) => {
    const record = attendance[dateStr];
    if (!record || !record.records) return null;
    const presentCount = record.records.filter(r => r.status === 'present' || r.status === 'late').length;
    const totalCount = roster.length;
    return `${presentCount}/${totalCount}`;
  };

  return (
    <div className="flex flex-col min-h-full h-fit bg-slate-50 p-4 overflow-y-auto pb-24">
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 shrink-0">
        <div className="flex justify-between items-center mb-4">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-full">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-bold">{format(currentMonth, 'yyyy年 M月')}</h2>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-full">
            <ChevronRight size={20} />
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['日', '月', '火', '水', '木', '金', '土'].map(d => (
            <div key={d} className="text-center text-xs text-slate-500 font-medium py-1">{d}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const hasLog = !!logs[dateStr];
            const hasAttendance = !!attendance[dateStr];
            const isSelected = isSameDay(day, new Date(selectedDate));

            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                className={`
                  aspect-square flex flex-col items-center justify-center rounded-lg text-sm relative transition-colors
                  ${!isSameMonth(day, currentMonth) ? 'text-slate-300' : 'text-slate-700'}
                  ${isSelected ? 'bg-blue-600 text-white font-bold shadow-md' : 'hover:bg-slate-100'}
                  ${isToday(day) && !isSelected ? 'border-2 border-blue-200' : ''}
                `}
              >
                <span>{format(day, 'd')}</span>
                <div className="flex gap-1 absolute bottom-1">
                  {hasLog && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />}
                  {hasAttendance && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-amber-500'}`} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 shrink-0 pb-10">
        <h3 className="text-lg font-bold mb-3">{format(new Date(selectedDate), 'M月d日')} の記録</h3>
        
        {logs[selectedDate] ? (
          <div 
            onClick={() => onNavigate('log')}
            className="bg-white p-4 rounded-xl shadow-sm mb-3 cursor-pointer border border-transparent hover:border-blue-200 active:bg-slate-50 transition"
          >
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-blue-900">
                {logs[selectedDate].pieces && logs[selectedDate].pieces.length > 0
                  ? logs[selectedDate].pieces.map(p => p.pieceTitle).filter(Boolean).join(', ') || '曲名なし'
                  : logs[selectedDate].pieceTitle || '曲名なし'}
              </h4>
              <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full font-medium shrink-0 ml-2">合奏録あり</span>
            </div>
            <p className="text-sm text-slate-600 line-clamp-2">{logs[selectedDate].overallNotes || '特記事項なし'}</p>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-xl shadow-sm mb-3 border border-dashed border-slate-300 text-center">
            <p className="text-slate-500 text-sm mb-3">この日の合奏録はありません</p>
            <button 
              onClick={() => onNavigate('log')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm active:scale-95 transition"
            >
              合奏録をつける
            </button>
          </div>
        )}

        <div 
          onClick={() => onNavigate('attendance')}
          className="bg-white p-4 rounded-xl shadow-sm cursor-pointer border border-transparent hover:border-blue-200 active:bg-slate-50 transition flex justify-between items-center"
        >
          <div>
            <h4 className="font-bold text-slate-800">出席管理</h4>
            {attendance[selectedDate] ? (
               <p className="text-xs text-emerald-600 font-bold mt-1">出席: {getAttendanceSummary(selectedDate)}人</p>
            ) : (
               <p className="text-xs text-amber-600 mt-1">未記録</p>
            )}
          </div>
          <ChevronRight size={20} className="text-slate-400" />
        </div>
      </div>
    </div>
  );
};
