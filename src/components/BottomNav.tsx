import React from 'react';
import { Calendar, PenLine, Users, BookOpen, Bot } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  const navItems = [
    { id: 'calendar', label: 'カレンダー', icon: Calendar, color: 'text-slate-600' },
    { id: 'log', label: '合奏録', icon: PenLine, color: 'text-blue-600' },
    { id: 'attendance', label: '出席', icon: Users, color: 'text-emerald-600' },
    { id: 'dictionary', label: '辞典', icon: BookOpen, color: 'text-indigo-600' },
    { id: 'ai', label: 'AI相談', icon: Bot, color: 'text-purple-600' },
  ];

  return (
    <div className="bg-white border-t border-slate-200 z-40 pb-safe shrink-0 w-full">
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
