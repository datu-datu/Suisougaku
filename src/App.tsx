/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppStateProvider } from './store/AppStateContext';
import { CalendarHomeView } from './views/CalendarHomeView';
import { RehearsalLogView } from './views/RehearsalLogView';
import { AttendanceView } from './views/AttendanceView';
import { DictionaryView } from './views/DictionaryView';
import { AIPlannerView } from './views/AIPlannerView';
import { BottomNav } from './components/BottomNav';

function AppContent() {
  const [activeTab, setActiveTab] = useState('calendar');

  const renderView = () => {
    switch (activeTab) {
      case 'calendar': return <CalendarHomeView onNavigate={setActiveTab} />;
      case 'log': return <RehearsalLogView />;
      case 'attendance': return <AttendanceView />;
      case 'dictionary': return <DictionaryView />;
      case 'ai': return <AIPlannerView />;
      default: return <CalendarHomeView onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 text-slate-900 font-sans mx-auto max-w-md overflow-hidden relative sm:shadow-2xl">
      <div className="flex-1 overflow-hidden relative">
        {renderView()}
      </div>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <AppContent />
    </AppStateProvider>
  );
}
