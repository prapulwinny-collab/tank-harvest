import React, { useState, useMemo, useEffect } from 'react';
import { HarvestEntry, getTankColor, getTankText, getTankBorder, formatPatluDisplay } from '../types';
import { Trash2, Edit2, ChevronDown, Save, Square, CheckSquare, Loader2, History, Package, AlertTriangle, ListChecks, Clock, User, Hash } from 'lucide-react';

interface LogScreenProps {
  entries: HarvestEntry[];
  onDelete: (id: string) => Promise<void>;
  onBatchDelete: (ids: string[]) => Promise<void>;
  onUpdate: (entry: HarvestEntry) => Promise<void>;
}

export const LogScreen: React.FC<LogScreenProps> = ({ entries, onDelete, onBatchDelete, onUpdate }) => {
  const [expandedTanks, setExpandedTanks] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<HarvestEntry>>({});
  const [isBatchConfirming, setIsBatchConfirming] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const tanks: string[] = Array.from(new Set(entries.map(e => e.tank)));
    setExpandedTanks(prev => {
      const next = { ...prev };
      tanks.forEach((t: string) => { if (next[t] === undefined) next[t] = true; });
      return next;
    });
  }, [entries.length]);

  const sortedGroupedEntries = useMemo(() => {
    const groups: Record<string, HarvestEntry[]> = {};
    entries.forEach(entry => {
      if (!groups[entry.tank]) groups[entry.tank] = [];
      groups[entry.tank].push(entry);
    });

    const tankLastActivity: Record<string, number> = {};
    Object.keys(groups).forEach(tank => {
      groups[tank].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      tankLastActivity[tank] = new Date(groups[tank][0].timestamp).getTime();
    });

    return Object.entries(groups).sort((a, b) => tankLastActivity[b[0]] - tankLastActivity[a[0]]);
  }, [entries]);

  const handleToggleSelect = (id: string) => {
    if (editingId) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === entries.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(entries.map(e => e.id)));
  };

  const startEdit = (entry: HarvestEntry) => {
    setEditingId(entry.id);
    setEditValues({ ...entry });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const saveEdit = async () => {
    if (!editingId || !editValues.id) return;
    setIsUpdating(true);
    try {
      await onUpdate(editValues as HarvestEntry);
      setEditingId(null);
    } finally {
      setIsUpdating(false);
    }
  };

  const startDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmingId(id);
  };

  const confirmDelete = async (id: string, e: React.MouseEvent, idToDelete: string) => {
    e.stopPropagation();
    setConfirmingId(null);
    setDeletingId(idToDelete);
    try {
      await onDelete(idToDelete);
    } finally {
      setDeletingId(null);
    }
  };

  const handleBatchDeleteClick = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || isBatchDeleting) return;
    setIsBatchDeleting(true);
    try {
      await onBatchDelete(ids);
      setSelectedIds(new Set());
      setIsBatchConfirming(false);
    } finally {
      setIsBatchDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-32 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 px-1">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Harvest Logs</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">Real-time Crate Tracking</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-black text-gray-900">{entries.length}</span>
          </div>
        </div>
        
        {entries.length > 0 && (
          <button 
            onClick={handleSelectAll}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg ${
              selectedIds.size === entries.length 
                ? 'bg-blue-600 text-white shadow-blue-100' 
                : 'bg-white text-gray-700 border border-gray-100 shadow-sm'
            }`}
          >
            <ListChecks className="w-4 h-4" />
            {selectedIds.size === entries.length ? 'Clear Selection' : 'Select All Records'}
          </button>
        )}
      </div>

      {sortedGroupedEntries.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[3rem] border-4 border-dashed border-gray-100 flex flex-col items-center gap-4">
          <div className="bg-gray-50 p-6 rounded-full">
            <History className="w-12 h-12 text-gray-200" />
          </div>
          <p className="text-gray-400 font-black uppercase tracking-widest text-sm">No Active Logs</p>
        </div>
      ) : (
        sortedGroupedEntries.map(([tank, tankEntries]) => {
          const patlu = tankEntries.filter(e => e.crateCount === 2).length;
          const singles = tankEntries.filter(e => e.crateCount === 1).length;
          const totalInTank = tankEntries.length;
          
          return (
            <div key={tank} className="bg-white rounded-[2rem] overflow-hidden shadow-xl shadow-gray-100 border border-gray-100">
              <button 
                onClick={() => setExpandedTanks(p => ({...p, [tank]: !p[tank]}))} 
                className={`w-full flex items-center justify-between p-5 transition-all active:bg-gray-50 ${expandedTanks[tank] ? 'border-b border-gray-50' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`${getTankColor(tank)} text-white w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shadow-lg shadow-blue-100`}>
                    {tank.replace('Tank ', '')}
                  </div>
                  <div className="text-left">
                    <p className={`font-black text-lg leading-none ${getTankText(tank)} uppercase tracking-tight`}>{tank}</p>
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      <span className="text-[9px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase">
                        {formatPatluDisplay(patlu, singles)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className={`p-2 rounded-full bg-gray-50 transition-transform duration-300 ${expandedTanks[tank] ? 'rotate-180' : ''}`}>
                  <ChevronDown size={20} className="text-gray-400" />
                </div>
              </button>

              {expandedTanks[tank] && (
                <div className="divide-y divide-gray-50">
                  {tankEntries.map((entry, idx) => {
                    const serialNumber = totalInTank - idx; // Since sorted descending
                    return (
                      <div key={entry.id} className={`group transition-all ${selectedIds.has(entry.id) ? 'bg-blue-50/70' : 'bg-white hover:bg-gray-50/50'} ${deletingId === entry.id ? 'opacity-40 grayscale bg-red-50' : ''}`}>
                        {editingId === entry.id ? (
                          <div className={`p-6 bg-blue-50 border-l-8 ${getTankBorder(tank)}`}>
                            <div className="flex items-center gap-2 mb-4">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Editing Row #{serialNumber}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <input type="number" step="0.01" value={editValues.weight || ''} onChange={(e) => setEditValues({...editValues, weight: parseFloat(e.target.value)})} className="w-full bg-white border-2 border-gray-100 rounded-2xl py-4 px-4 font-black text-2xl" />
                              <select value={editValues.crateCount || 1} onChange={(e) => setEditValues({...editValues, crateCount: parseInt(e.target.value)})} className="w-full bg-white border-2 border-gray-100 rounded-2xl py-4 px-4 font-black text-2xl">
                                <option value={1}>1 Crate</option>
                                <option value={2}>2 Crates</option>
                              </select>
                            </div>
                            <div className="flex gap-3">
                              <button onClick={cancelEdit} className="flex-1 bg-white text-gray-500 font-black py-4 rounded-2xl text-[10px] uppercase border">Cancel</button>
                              <button onClick={saveEdit} className={`flex-[2] text-white font-black py-4 rounded-2xl text-[10px] uppercase ${getTankColor(tank)} shadow-xl`}>Update</button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-5 flex items-center gap-4 relative">
                            <button onClick={() => handleToggleSelect(entry.id)} className={`p-2 rounded-xl ${selectedIds.has(entry.id) ? getTankColor(tank) + ' text-white' : 'bg-gray-50 text-gray-300'}`}>
                              {selectedIds.has(entry.id) ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                            </button>
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className="flex flex-col items-center justify-center bg-gray-100 w-8 h-8 rounded-lg shrink-0">
                                   <span className="text-[8px] font-black text-gray-400 uppercase leading-none mb-0.5">SN</span>
                                   <span className="text-xs font-black text-gray-900 leading-none">{serialNumber}</span>
                                </div>
                                <span className="text-2xl font-black text-gray-900 tracking-tighter">{entry.weight.toFixed(2)}kg</span>
                                <span className="text-[8px] font-black bg-gray-900 text-white px-2 py-1 rounded-lg uppercase">
                                  {entry.crateCount === 2 ? 'Patlu' : 'Single'}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-[9px] font-black text-gray-400 mt-1.5 uppercase">
                                <Clock className="w-3 h-3" /> {new Date(entry.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                <User className="w-3 h-3 ml-2" /> {entry.team}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {confirmingId === entry.id ? (
                                <button onClick={(e) => confirmDelete(entry.id, e, entry.id)} className="px-4 py-2 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase">Confirm</button>
                              ) : (
                                <>
                                  <button onClick={() => startEdit(entry)} className="p-3 bg-gray-50 text-gray-400 rounded-2xl"><Edit2 size={18} /></button>
                                  <button onClick={(e) => startDelete(entry.id, e)} className="p-3 bg-gray-50 text-gray-400 rounded-2xl"><Trash2 size={18} /></button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}

      {selectedIds.size > 0 && (
        <div className="fixed bottom-24 left-4 right-4 z-50">
          <div className="bg-gray-900/95 backdrop-blur-lg text-white rounded-[2.5rem] p-5 flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-4 ml-2">
              <div className="bg-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg">
                {selectedIds.size}
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest">Records</span>
            </div>
            <button onClick={() => setIsBatchConfirming(true)} className="bg-rose-600 text-white font-black px-8 py-4 rounded-2xl text-xs uppercase tracking-widest">Delete</button>
          </div>
        </div>
      )}

      {isBatchConfirming && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] p-8 max-sm w-full shadow-2xl">
            <AlertTriangle className="w-12 h-12 text-rose-600 mb-6 mx-auto" />
            <h3 className="text-xl font-black text-gray-900 text-center uppercase mb-2">Delete {selectedIds.size} Items?</h3>
            <p className="text-xs text-gray-500 text-center mb-8 uppercase font-bold">This action cannot be undone.</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setIsBatchConfirming(false)} className="py-4 bg-gray-100 rounded-2xl font-black uppercase text-[10px]">Cancel</button>
              <button onClick={handleBatchDeleteClick} className="py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-rose-100">Confirm Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};