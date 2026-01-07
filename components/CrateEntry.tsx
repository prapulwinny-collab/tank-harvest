
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, RotateCcw, CheckCircle2, Package, XCircle, SlidersHorizontal, ChevronDown, ChevronUp, Layers, Hash, Check, Minus } from 'lucide-react';
import { HarvestSettings, HarvestEntry, getTankColor, getTankText, getTankBorder, formatPatluShort } from '../types';

interface CrateEntryProps {
  onSave: (weight: number, crateCount: number) => void;
  onUpdateSettings: (updates: Partial<HarvestSettings>) => void;
  settings: HarvestSettings;
  onChangeTank: () => void;
  lastSaved: string | null;
  entries: HarvestEntry[];
}

export const CrateEntry: React.FC<CrateEntryProps> = ({ onSave, onUpdateSettings, settings, onChangeTank, lastSaved, entries }) => {
  const [weight, setWeight] = useState<string>('');
  const [crateCount, setCrateCount] = useState<number>(2);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showQuickSetup, setShowQuickSetup] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const tankStats = useMemo(() => {
    const activeTankEntries = entries.filter(e => e.tank === settings.activeTank);
    const patlu = activeTankEntries.filter(e => e.crateCount === 2).length;
    const singles = activeTankEntries.filter(e => e.crateCount === 1).length;
    const netTotal = activeTankEntries.reduce((sum, e) => {
      const tare = (e.crateCount || 1) * (e.crateWeight || 1.8);
      return sum + Math.max(0, e.weight - tare);
    }, 0);

    return { patlu, singles, netTotal };
  }, [entries, settings.activeTank]);

  useEffect(() => {
    if (!isSuccess && !showQuickSetup) inputRef.current?.focus();
  }, [isSuccess, showQuickSetup]);

  const handleSave = () => {
    const numWeight = parseFloat(weight);
    if (!isNaN(numWeight) && numWeight > 0) {
      onSave(numWeight, crateCount);
      setWeight('');
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 500);
    }
  };

  const tickerItems = [
    { label: 'ACTIVE', value: settings.activeTank.toUpperCase() },
    { label: 'SIZE', value: `${settings.shrimpCount} COUNT` },
    { label: 'NET TOTAL', value: `${tankStats.netTotal.toFixed(1)} KG` },
    { label: 'COLLECTION', value: formatPatluShort(tankStats.patlu, tankStats.singles) }
  ];

  const handleQuickTankSelect = (tankNum: number) => {
    onUpdateSettings({ activeTank: `Tank ${tankNum}` });
  };

  const adjustShrimpCount = (delta: number) => {
    onUpdateSettings({ shrimpCount: Math.max(1, settings.shrimpCount + delta) });
  };

  const tanks = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="flex flex-col h-full gap-4 max-w-lg mx-auto pb-6 overflow-y-auto no-scrollbar">
      <div className="flex items-center justify-between px-2 shrink-0">
         <button 
          onClick={() => setShowQuickSetup(!showQuickSetup)} 
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl border-2 transition-all active:scale-95 ${
            showQuickSetup ? 'bg-gray-900 border-gray-900 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-500'
          }`}
         >
           <SlidersHorizontal className="w-4 h-4" />
           <span className="text-[10px] font-black uppercase tracking-widest">Quick Setup</span>
         </button>
         {lastSaved && (
           <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-2xl animate-in fade-in zoom-in duration-300">
             <CheckCircle2 className="w-3 h-3 text-emerald-500" />
             <span className="text-[10px] font-black text-emerald-700 uppercase">Last: {lastSaved}</span>
           </div>
         )}
      </div>

      {/* QUICK SETUP DRAWER */}
      {showQuickSetup && (
        <div className="mx-1 bg-white rounded-[2rem] border-2 border-gray-900 p-5 space-y-5 animate-in slide-in-from-top-4 duration-300 shadow-2xl">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Switch Tank</label>
            <div className="grid grid-cols-4 gap-2">
              {tanks.map((num) => {
                const tankName = `Tank ${num}`;
                const isActive = settings.activeTank === tankName;
                return (
                  <button
                    key={num}
                    onClick={() => handleQuickTankSelect(num)}
                    className={`py-3 text-xs font-black rounded-xl border-2 transition-all ${
                      isActive 
                        ? `${getTankColor(tankName)} border-transparent text-white shadow-md scale-105` 
                        : 'bg-gray-50 border-gray-100 text-gray-400'
                    }`}
                  >
                    T{num}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Update Shrimp Count</label>
            <div className="flex items-center gap-4 bg-gray-900 p-2 rounded-2xl">
              <button 
                onClick={() => adjustShrimpCount(-1)}
                className="w-12 h-12 bg-white/10 text-white rounded-xl flex items-center justify-center active:scale-90"
              >
                <Minus size={20} strokeWidth={3} />
              </button>
              <div className="flex-1 text-center">
                <input 
                  type="number"
                  value={settings.shrimpCount}
                  onChange={(e) => onUpdateSettings({ shrimpCount: parseInt(e.target.value) || 0 })}
                  className="w-full bg-transparent text-white text-2xl font-black text-center focus:outline-none"
                />
                <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">PCS / KG</p>
              </div>
              <button 
                onClick={() => adjustShrimpCount(1)}
                className="w-12 h-12 bg-white/10 text-white rounded-xl flex items-center justify-center active:scale-90"
              >
                <Plus size={20} strokeWidth={3} />
              </button>
            </div>
          </div>

          <button 
            onClick={() => setShowQuickSetup(false)}
            className="w-full py-4 bg-gray-100 text-gray-800 rounded-2xl font-black text-xs uppercase tracking-widest"
          >
            Close Setup
          </button>
        </div>
      )}

      <div className="relative w-full overflow-hidden bg-gray-900 py-3 rounded-2xl border-b-4 border-black shadow-inner">
        <style>{`@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } } .animate-marquee { display: flex; width: fit-content; animation: marquee 20s linear infinite; }`}</style>
        <div className="animate-marquee whitespace-nowrap flex items-center">
          {[1, 2].map((set) => (
            <div key={`set-${set}`} className="flex items-center gap-8 px-4">
              {tickerItems.map((item, idx) => (
                <div key={`ticker-${set}-${idx}`} className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">{item.label}</span>
                  <span className={`text-sm font-black tracking-tight ${getTankText(settings.activeTank)} brightness-150`}>{item.value}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-800 ml-4" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className={`bg-white rounded-[2.5rem] p-8 border-4 transition-all duration-300 shadow-2xl relative ${isSuccess ? 'border-green-500 bg-green-50 scale-[1.02]' : 'border-gray-100 shadow-gray-200'}`}>
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-sm font-black uppercase tracking-[0.15em] ${getTankText(settings.activeTank)}`}>{settings.activeTank}</span>
          <span className="text-[10px] font-black bg-gray-800 text-white px-2 py-0.5 rounded-md">{settings.shrimpCount} count</span>
        </div>
        <div className="relative flex items-center">
          <input ref={inputRef} type="number" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSave()} placeholder="0.00" className="w-full text-center text-8xl font-black text-gray-900 bg-transparent focus:outline-none placeholder:text-gray-100 tracking-tighter" />
          {weight && <button onClick={() => setWeight('')} className="absolute right-0 text-gray-200"><XCircle className="w-8 h-8" /></button>}
          {isSuccess && <div className="absolute inset-0 flex items-center justify-center bg-green-50/90 rounded-3xl z-10"><CheckCircle2 className="w-16 h-16 text-green-500" /></div>}
        </div>
      </div>

      <div className="space-y-3 px-1">
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map((num) => (
            <button key={num} onClick={() => setCrateCount(num)} className={`py-6 rounded-[2rem] font-black text-sm flex flex-col items-center border-4 transition-all ${crateCount === num ? `${getTankColor(settings.activeTank)} ${getTankBorder(settings.activeTank)} text-white` : 'bg-white border-gray-100 text-gray-400'}`}>
              <div className="flex -space-x-3 mb-1">
                <Package className="w-8 h-8" />
                {num === 2 && <Package className="w-8 h-8 mt-1" />}
              </div>
              <span className="uppercase">{num === 2 ? 'Patlu (2 CR)' : 'Single (1 CR)'}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border-2 border-gray-100 rounded-[1.5rem] p-4 flex items-center justify-around shadow-sm mx-1">
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Patlu</span>
          <span className="text-2xl font-black text-orange-600 leading-none">{tankStats.patlu}</span>
        </div>
        <div className="w-[1px] h-8 bg-gray-100" />
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Singles</span>
          <span className="text-2xl font-black text-purple-600 leading-none">{tankStats.singles}</span>
        </div>
      </div>

      <div className="flex gap-4 px-1 mt-auto shrink-0">
        <button onClick={onChangeTank} className="bg-white border-4 border-gray-100 text-gray-300 w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-lg"><RotateCcw className="w-8 h-8" /></button>
        <button onClick={handleSave} disabled={!weight} className={`flex-1 flex flex-col items-center justify-center h-24 rounded-[2rem] font-black shadow-2xl transition-all active:scale-95 ${weight ? `${getTankColor(settings.activeTank)} text-white` : 'bg-gray-100 text-gray-300 opacity-50'}`}>
          <div className="flex items-center gap-3">
            <Plus className="w-8 h-8" />
            <span className="text-xl uppercase tracking-tighter">Save Record</span>
          </div>
        </button>
      </div>
    </div>
  );
};
