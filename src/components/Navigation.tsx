import React from 'react';
import { Calendar, PenLine, Users, BookOpen, Bot } from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  orientation?: 'horizontal' | 'vertical';
}

export const Navigation = ({ activeTab, onTabChange, orientation = 'horizontal' }: NavigationProps) => {
  const navItems = [
    { id: 'calendar', label: 'カレンダー', icon: Calendar, color: 'text-slate-600', activeBg: 'bg-slate-100' },
    { id: 'log', label: '合奏録', icon: PenLine, color: 'text-blue-600', activeBg: 'bg-blue-50' },
    { id: 'attendance', label: '出席', icon: Users, color: 'text-emerald-600', activeBg: 'bg-emerald-50' },
    { id: 'dictionary', label: '辞典', icon: BookOpen, color: 'text-indigo-600', activeBg: 'bg-indigo-50' },
    { id: 'ai', label: 'AI相談', icon: Bot, color: 'text-purple-600', activeBg: 'bg-purple-50' },
  ];

  if (orientation === 'vertical') {
    return (
      <div className="h-full w-20 lg:w-64 bg-white border-r border-slate-200 flex flex-col py-6 shadow-sm">
        <div className="px-4 mb-10 hidden lg:block">
          <h1 className="text-xl font-black tracking-tight text-slate-800">Ensemble<span className="text-emerald-500">Hub</span></h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Practice Manager</p>
        </div>
        
        <nav className="flex-1 space-y-2 px-3">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex flex-col lg:flex-row items-center lg:space-x-3 p-3 rounded-xl transition-all ${
                  isActive 
                    ? `${item.color} ${item.activeBg}` 
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                }`}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-[10px] lg:text-sm font-bold ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    );
  }

  return (
    <div className="bg-white border-t border-slate-200 z-40 pb-safe">
      <div className="flex justify-around items-center h-16">
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? item.color : 'text-slate-400'}`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] font-bold ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
