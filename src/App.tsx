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
import { Navigation } from './components/Navigation';

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
    <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <div className="hidden md:block">
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} orientation="vertical" />
      </div>
      
      <main className="flex-1 overflow-hidden relative flex flex-col items-center">
        <div className="w-full h-full max-w-6xl mx-auto md:px-4">
          {renderView()}
        </div>
      </main>

      <div className="md:hidden">
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} orientation="horizontal" />
      </div>
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
