import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Calculator, Settings, TableProperties, CloudSync, ChevronRight, CheckCircle2, Wifi, WifiOff, History, Loader2, Calendar, Banknote, ShieldCheck } from 'lucide-react';
import { View, HarvestEntry, HarvestSettings, TankSummary } from './types';
import { DBService } from './db';
import { ControlPanel } from './components/ControlPanel';
import { CrateEntry } from './components/CrateEntry';
import { AbstractScreen } from './components/AbstractScreen';
import { SyncManager } from './components/SyncManager';
import { LogScreen } from './components/LogScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { RevenueScreen } from './components/RevenueScreen';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.ENTRY);
  const [settings, setSettings] = useState<HarvestSettings>(DBService.getSettings());
  const [entries, setEntries] = useState<HarvestEntry[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isDbLoaded, setIsDbLoaded] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const allEntries = await DBService.getAllEntries();
      setEntries(allEntries || []);
      setIsDbLoaded(true);
    } catch (err) {
      console.error("Failed to load harvest data:", err);
      setIsDbLoaded(true); // Still set to true to allow user interaction
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await DBService.requestPersistence();
      await loadData();
    };
    
    init();

    const handleStatusChange = () => setIsOnline(navigator.onLine);
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [loadData]);

  const handleSaveSettings = (newSettings: HarvestSettings) => {
    const updatedTankCounts = { 
      ...(newSettings.tankCounts || {}), 
      [newSettings.activeTank]: newSettings.shrimpCount 
    };
    const finalSettings = { ...newSettings, tankCounts: updatedTankCounts };
    setSettings(finalSettings);
    DBService.saveSettings(finalSettings);
    setCurrentView(View.ENTRY);
  };

  const handleQuickUpdateSettings = (updates: Partial<HarvestSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      if (updates.activeTank && updates.activeTank !== prev.activeTank) {
        const storedCount = next.tankCounts?.[updates.activeTank];
        if (storedCount !== undefined) {
          next.shrimpCount = storedCount;
        }
      }
      if (updates.shrimpCount !== undefined) {
        next.tankCounts = {
          ...(next.tankCounts || {}),
          [next.activeTank]: updates.shrimpCount
        };
      }
      DBService.saveSettings(next);
      return next;
    });
  };

  const handleUpdatePrice = (tank: string, price: string) => {
    setSettings(prev => {
      const next = {
        ...prev,
        tankPrices: {
          ...(prev.tankPrices || {}),
          [tank]: price
        }
      };
      DBService.saveSettings(next);
      return next;
    });
  };

  const onGlobalReset = async () => {
    setIsResetting(true);
    try {
      await DBService.nuclearReset();
      window.location.reload();
    } catch (err) {
      window.location.reload();
    }
  };

  const handleAddEntry = async (weight: number, crateCount: number) => {
    const newEntry: HarvestEntry = {
      id: DBService.generateId(),
      tank: settings.activeTank,
      count: settings.shrimpCount,
      weight: weight,
      crateWeight: settings.crateWeight,
      crateCount: crateCount,
      team: settings.teamName,
      timestamp: new Date().toISOString(),
      synced: false
    };

    try {
      await DBService.saveEntry(newEntry);
      setLastSaved(`${weight}kg`);
      setEntries(prev => [newEntry, ...prev]);
    } catch (err) {
      alert("Database error. Please restart the app.");
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await DBService.deleteEntry(id);
      await loadData();
    } catch (err) {
      alert("Delete failed.");
    }
  };

  const handleBatchDelete = async (ids: string[]) => {
    try {
      await DBService.deleteEntries(ids);
      await loadData();
    } catch (err) {
      alert("Batch delete failed.");
    }
  };

  const handleDeleteHistoryDate = async (date: string) => {
    const idsToDelete = entries
      .filter(e => e.timestamp.startsWith(date))
      .map(e => e.id);
    
    if (idsToDelete.length > 0) {
      try {
        await DBService.deleteEntries(idsToDelete);
        await loadData();
      } catch (err) {
        alert("Failed to delete history for " + date);
      }
    }
  };

  const handleUpdateEntry = async (updatedEntry: HarvestEntry) => {
    try {
      await DBService.saveEntry(updatedEntry);
      await loadData();
    } catch (err) {
      alert("Update failed.");
    }
  };

  const handleTriggerInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    }
  };

  const getActiveTabClass = (view: View) => 
    `flex flex-col items-center justify-center py-2 px-1 text-[10px] font-bold transition-all duration-200 ${
      currentView === view ? 'text-blue-600 bg-blue-50/50 translate-y-[-2px]' : 'text-gray-400 hover:text-blue-400'
    }`;

  if (!isDbLoaded || isResetting) {
    return (
      <div className="h-screen w-screen bg-white flex flex-col items-center justify-center gap-6 p-10 text-center animate-pulse">
        <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-gray-900 uppercase">Shrimp Harvest Master</h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Opening Secure Digital Vault...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Calculator className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-gray-900 leading-none">SHRIMP HARVEST Master</h1>
            <p className="text-[10px] text-gray-500 uppercase font-semibold mt-0.5">{settings.activeTank} • {settings.teamName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded-lg text-green-600">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase">Stored</span>
          </div>
          {isOnline ? (
            <Wifi className="w-4 h-4 text-green-600" />
          ) : (
            <WifiOff className="w-4 h-4 text-orange-500" />
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto relative p-4">
        {currentView === View.ENTRY && (
          <CrateEntry 
            onSave={handleAddEntry} 
            settings={settings} 
            onUpdateSettings={handleQuickUpdateSettings}
            onChangeTank={() => setCurrentView(View.CONTROL)} 
            lastSaved={lastSaved}
            entries={entries}
          />
        )}
        {currentView === View.CONTROL && (
          <ControlPanel 
            initialSettings={settings} 
            onSave={handleSaveSettings} 
            onCancel={() => setCurrentView(View.ENTRY)} 
            onReset={onGlobalReset}
            installPrompt={deferredPrompt}
            isInstalled={isInstalled}
            onInstallTrigger={handleTriggerInstall}
          />
        )}
        {currentView === View.ABSTRACT && (
          <AbstractScreen 
            entries={entries} 
            prices={settings.tankPrices || {}} 
          />
        )}
        {currentView === View.LOG && (
          <LogScreen 
            entries={entries} 
            onDelete={handleDeleteEntry}
            onBatchDelete={handleBatchDelete}
            onUpdate={handleUpdateEntry} 
          />
        )}
        {currentView === View.SYNC && <SyncManager entries={entries} settings={settings} onSyncComplete={loadData} />}
        {currentView === View.HISTORY && (
          <HistoryScreen 
            entries={entries} 
            prices={settings.tankPrices || {}}
            onDeleteDate={handleDeleteHistoryDate}
          />
        )}
        {currentView === View.REVENUE && (
          <RevenueScreen 
            entries={entries} 
            prices={settings.tankPrices || {}}
            onUpdatePrice={handleUpdatePrice}
          />
        )}
      </main>

      <nav className="bg-white border-t flex justify-around items-center shrink-0 safe-area-bottom pb-1 px-1">
        <button onClick={() => setCurrentView(View.ENTRY)} className={getActiveTabClass(View.ENTRY)}>
          <Calculator className="w-6 h-6 mb-1" />
          <span>ENTRY</span>
        </button>
        <button onClick={() => setCurrentView(View.LOG)} className={getActiveTabClass(View.LOG)}>
          <History className="w-6 h-6 mb-1" />
          <span>LOG</span>
        </button>
        <button onClick={() => setCurrentView(View.ABSTRACT)} className={getActiveTabClass(View.ABSTRACT)}>
          <TableProperties className="w-6 h-6 mb-1" />
          <span>ABSTRACT</span>
        </button>
        <button onClick={() => setCurrentView(View.CONTROL)} className={getActiveTabClass(View.CONTROL)}>
          <Settings className="w-6 h-6 mb-1" />
          <span>SETTINGS</span>
        </button>
        <button onClick={() => setCurrentView(View.SYNC)} className={getActiveTabClass(View.SYNC)}>
          <div className="relative">
            <CloudSync className="w-6 h-6 mb-1" />
            {entries.some(e => !e.synced) && (
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </div>
          <span>SYNC</span>
        </button>
        <button onClick={() => setCurrentView(View.REVENUE)} className={getActiveTabClass(View.REVENUE)}>
          <Banknote className="w-6 h-6 mb-1" />
          <span>REVENUE</span>
        </button>
        <button onClick={() => setCurrentView(View.HISTORY)} className={getActiveTabClass(View.HISTORY)}>
          <Calendar className="w-6 h-6 mb-1" />
          <span>HISTORY</span>
        </button>
      </nav>
    </div>
  );
};

export default App;