import React, { createContext, useContext, ReactNode, useState } from 'react';
import { useLocalStorage } from '../lib/useLocalStorage';
import { RehearsalLog, DailyAttendance, Member, DictionaryTerm, Piece, Message } from '../types';
import { defaultRoster } from '../data/mockMembers';
import { musicDictionary } from '../data/dictionary';

interface AppState {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  logs: Record<string, RehearsalLog>;
  setLogs: React.Dispatch<React.SetStateAction<Record<string, RehearsalLog>>>;
  attendance: Record<string, DailyAttendance>;
  setAttendance: React.Dispatch<React.SetStateAction<Record<string, DailyAttendance>>>;
  roster: Member[];
  setRoster: React.Dispatch<React.SetStateAction<Member[]>>;
  dictionary: DictionaryTerm[];
  setDictionary: React.Dispatch<React.SetStateAction<DictionaryTerm[]>>;
  pieces: Piece[];
  setPieces: React.Dispatch<React.SetStateAction<Piece[]>>;
  aiLogs: Record<string, Message[]>;
  setAiLogs: React.Dispatch<React.SetStateAction<Record<string, Message[]>>>;
}

const AppStateContext = createContext<AppState | undefined>(undefined);

const todayStr = (() => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
})();

export const AppStateProvider = ({ children }: { children: ReactNode }) => {
  const [logs, setLogs] = useLocalStorage<Record<string, RehearsalLog>>('ensemble_logs', {});
  const [attendance, setAttendance] = useLocalStorage<Record<string, DailyAttendance>>('ensemble_attendance', {});
  const [roster, setRoster] = useLocalStorage<Member[]>('ensemble_roster', []);
  const [dictionary, setDictionary] = useLocalStorage<DictionaryTerm[]>('ensemble_dictionary', musicDictionary);
  const [pieces, setPieces] = useLocalStorage<Piece[]>('ensemble_pieces', []);
  const [aiLogs, setAiLogs] = useLocalStorage<Record<string, Message[]>>('ensemble_ai_logs', {});

  const [date, setDate] = useState(todayStr);

  return (
    <AppStateContext.Provider value={{
      selectedDate: date,
      setSelectedDate: setDate,
      logs,
      setLogs,
      attendance,
      setAttendance,
      roster,
      setRoster,
      dictionary,
      setDictionary,
      pieces,
      setPieces,
      aiLogs,
      setAiLogs
    }}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};
