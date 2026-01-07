import React, { useState } from 'react';
import { Save, X, Smartphone, AlertTriangle, Loader2, Weight, Info, CheckCircle2, Palette } from 'lucide-react';
import { HarvestSettings, getTankColor, getTankBorder } from '../types';

interface ControlPanelProps {
  initialSettings: HarvestSettings;
  onSave: (settings: HarvestSettings) => void;
  onCancel: () => void;
  onReset: () => Promise<void>;
  installPrompt: any;
  isInstalled: boolean;
  onInstallTrigger: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ 
  initialSettings, onSave, onCancel, onReset, installPrompt, isInstalled, onInstallTrigger 
}) => {
  const [activeTank, setActiveTank] = useState(initialSettings.activeTank);
  const [shrimpCount, setShrimpCount] = useState(initialSettings.shrimpCount);
  const [crateWeight, setCrateWeight] = useState(initialSettings.crateWeight || 1.8);
  const [teamName, setTeamName] = useState(initialSettings.teamName);
  const [isResetConfirming, setIsResetConfirming] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  const tanks = Array.from({ length: 20 }, (_, i) => `Tank ${i + 1}`);
  const teams = ['Team A', 'Team B', 'Team C', 'Team D'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ 
      activeTank, 
      shrimpCount, 
      crateWeight, 
      teamName, 
      tankCounts: initialSettings.tankCounts,
      tankPrices: initialSettings.tankPrices
    });
  };

  const handleInstallClick = () => {
    if (installPrompt) {
      onInstallTrigger();
    } else {
      setShowInstallGuide(true);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 animate-in slide-in-from-bottom-4 duration-300 max-h-full overflow-y-auto relative">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-black text-gray-800 tracking-tight">SUPERVISOR</h2>
        <button onClick={onCancel} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
          <X className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Active Tank</label>
          <div className="grid grid-cols-4 gap-2">
            {tanks.slice(0, 16).map((tank) => {
              const tankColor = getTankColor(tank);
              const tankBorder = getTankBorder(tank);
              const isActive = activeTank === tank;
              
              return (
                <button
                  key={tank}
                  type="button"
                  onClick={() => setActiveTank(tank)}
                  className={`py-3 text-xs font-black rounded-xl border-2 transition-all ${
                    isActive 
                      ? `${tankColor} ${tankBorder} text-white shadow-lg scale-[1.05]` 
                      : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {tank.replace('Tank ', '')}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Shrimp Count</label>
            <input
              type="number"
              value={shrimpCount}
              onChange={(e) => setShrimpCount(parseInt(e.target.value) || 0)}
              className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl py-4 px-4 text-xl font-black text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Crate Wt (kg)</label>
            <input
              type="number"
              step="0.01"
              value={crateWeight}
              onChange={(e) => setCrateWeight(parseFloat(e.target.value) || 0)}
              className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl py-4 px-4 text-xl font-black text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Team</label>
          <div className="flex flex-wrap gap-2">
            {teams.map((team) => (
              <button
                key={team}
                type="button"
                onClick={() => setTeamName(team)}
                className={`px-4 py-2.5 text-xs font-black rounded-xl border-2 transition-all ${
                  teamName === team 
                    ? 'bg-gray-800 border-gray-800 text-white shadow-lg' 
                    : 'bg-white border-gray-100 text-gray-400'
                }`}
              >
                {team}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-8 space-y-3">
          <button type="submit" className={`w-full text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all ${getTankColor(activeTank)}`}>
            <Save className="w-6 h-6" /> APPLY SETTINGS
          </button>
          
          <div className="grid grid-cols-1 gap-3">
            {!isInstalled ? (
              <button 
                type="button" 
                onClick={handleInstallClick} 
                className={`py-3 rounded-2xl flex items-center justify-center gap-2 border-2 text-xs font-black transition-all active:scale-95 ${
                  installPrompt 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100 animate-pulse' 
                    : 'bg-blue-50 border-blue-100 text-blue-600'
                }`}
              >
                <Smartphone className="w-4 h-4" /> 
                {installPrompt ? 'INSTALL APP NOW (READY)' : 'HOW TO INSTALL TO DEVICE'}
              </button>
            ) : (
              <div className="bg-green-50 text-green-600 py-3 rounded-2xl flex items-center justify-center gap-2 border border-green-100 text-[10px] font-black uppercase">
                <CheckCircle2 className="w-4 h-4" /> App Installed
              </div>
            )}

            {isResetConfirming ? (
              <div className="bg-red-50 p-4 rounded-2xl border-2 border-red-200 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-3">
                  <AlertTriangle className="text-red-600 w-5 h-5" />
                  <p className="text-[10px] font-black text-red-900 uppercase">Clear all log entries?</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setIsResetConfirming(false)} 
                    className="flex-1 bg-white text-gray-600 font-black py-2.5 rounded-xl text-[10px] uppercase border border-gray-200"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={onReset}
                    className="flex-1 bg-red-600 text-white font-black py-2.5 rounded-xl text-[10px] uppercase shadow-lg flex items-center justify-center gap-2"
                  >
                    Clear Logs
                  </button>
                </div>
              </div>
            ) : (
              <button 
                type="button" 
                onClick={() => setIsResetConfirming(true)} 
                className="w-full bg-red-50 text-red-600 font-black py-3 rounded-2xl flex items-center justify-center gap-2 border border-red-100 text-xs active:scale-95"
              >
                <AlertTriangle className="w-4 h-4" /> CLEAR ALL LOGS (RESET)
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Manual Install Guide Overlay */}
      {showInstallGuide && (
        <div className="absolute inset-0 z-50 bg-white rounded-2xl p-6 flex flex-col animate-in fade-in duration-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black text-gray-900 uppercase">Install Guide</h3>
            <button onClick={() => setShowInstallGuide(false)} className="p-2 bg-gray-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-6 flex-1 overflow-y-auto">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black shrink-0">1</div>
              <div>
                <p className="font-black text-sm text-gray-800">Open in Chrome (Android)</p>
                <p className="text-xs text-gray-500">Must be in the Chrome browser, not a built-in app browser.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black shrink-0">2</div>
              <div>
                <p className="font-black text-sm text-gray-800">Tap the 3 dots (⋮)</p>
                <p className="text-xs text-gray-500">Look for the browser menu in the top right corner.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black shrink-0">3</div>
              <div>
                <p className="font-black text-sm text-gray-800">Select "Install App"</p>
                <p className="text-xs text-gray-500">Or "Add to Home Screen". The app will now work offline without a browser bar.</p>
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-3">
              <Info className="w-5 h-5 text-blue-500 shrink-0" />
              <p className="text-[10px] font-bold text-blue-700 leading-tight">Once installed, the icon will appear on your Home Screen. You can then use the app even at ponds with NO internet.</p>
            </div>
          </div>
          <button 
            onClick={() => setShowInstallGuide(false)} 
            className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl text-xs uppercase shadow-lg mt-4"
          >
            Got it
          </button>
        </div>
      )}
    </div>
  );
};