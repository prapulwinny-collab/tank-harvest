import React, { useState, useMemo } from 'react';
import { HarvestEntry, TankSummary, getTankColor, getTankText, getTankBorder, getTankColorName } from '../types';
import { Calendar, ChevronRight, ArrowLeft, Package, Weight, Clock, User, Hash, TrendingUp, Zap, ArrowDownRight, Target, PieChart, Scale, Trash2, AlertTriangle, Loader2, Banknote, IndianRupee, ListFilter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface HistoryScreenProps {
  entries: HarvestEntry[];
  prices: Record<string, string>;
  onDeleteDate: (date: string) => Promise<void>;
}

const getHexForColor = (color: string) => {
  const map: Record<string, string> = {
    'blue': '#2563eb', 'purple': '#9333ea', 'rose': '#e11d48', 'amber': '#d97706', 
    'emerald': '#059669', 'indigo': '#4f46e5', 'orange': '#ea580c', 'cyan': '#0891b2', 
    'fuchsia': '#c026d3', 'teal': '#0d9488', 'lime': '#65a30d', 'violet': '#7c3aed',
  };
  return map[color] || '#2563eb';
};

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ entries, prices, onDeleteDate }) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [confirmingDate, setConfirmingDate] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Group entries by date (YYYY-MM-DD)
  const groupedByDate = useMemo(() => {
    const groups: Record<string, HarvestEntry[]> = {};
    entries.forEach(entry => {
      const date = entry.timestamp.split('T')[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(entry);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries]);

  const dailyStats = useMemo(() => {
    return groupedByDate.map(([date, dateEntries]) => {
      const totalGross = dateEntries.reduce((sum, e) => sum + e.weight, 0);
      const totalNet = dateEntries.reduce((sum, e) => {
        const tare = (e.crateCount || 1) * (e.crateWeight || 1.8);
        return sum + Math.max(0, e.weight - tare);
      }, 0);
      const totalCrates = dateEntries.reduce((sum, e) => sum + (e.crateCount || 1), 0);
      
      return {
        date,
        count: dateEntries.length,
        totalGross,
        totalNet,
        totalCrates
      };
    });
  }, [groupedByDate]);

  const handleDeleteClick = async (e: React.MouseEvent, date: string) => {
    e.stopPropagation();
    if (confirmingDate === date) {
      setIsDeleting(true);
      try {
        await onDeleteDate(date);
        setConfirmingDate(null);
      } finally {
        setIsDeleting(false);
      }
    } else {
      setConfirmingDate(date);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm("Delete ALL archives? This action cannot be undone.")) {
      setIsDeleting(true);
      try {
        for (const stat of dailyStats) {
          await onDeleteDate(stat.date);
        }
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const dailyAbstract = useMemo(() => {
    if (!selectedDate) return null;
    
    const dateEntries = entries.filter(e => e.timestamp.startsWith(selectedDate));
    const map = new Map<string, TankSummary>();

    dateEntries.forEach(entry => {
      const current = map.get(entry.tank) || { 
        tank: entry.tank, 
        entryCount: 0,
        patluCount: 0,
        singlesCount: 0,
        crateCount: 0, 
        totalWeight: 0, 
        absoluteWeight: 0,
        shrimpCount: entry.count
      };
      
      const entryCrateCount = entry.crateCount || 1;
      const effectiveCrateWeight = entry.crateWeight || 1.8;
      
      current.entryCount += 1;
      if (entryCrateCount === 2) current.patluCount += 1;
      else if (entryCrateCount === 1) current.singlesCount += 1;

      current.crateCount += entryCrateCount;
      current.totalWeight += entry.weight;
      current.absoluteWeight += (entry.weight - (entryCrateCount * effectiveCrateWeight));
      current.shrimpCount = entry.count;
      
      map.set(entry.tank, current);
    });

    const summaries = Array.from(map.values()).sort((a, b) => a.tank.localeCompare(b.tank));
    const totalAbsolute = summaries.reduce((acc, s) => acc + s.absoluteWeight, 0);
    const totalGross = summaries.reduce((acc, s) => acc + s.totalWeight, 0);
    const totalCrates = summaries.reduce((acc, s) => acc + s.crateCount, 0);
    const totalEntries = dateEntries.length;
    const totalTare = totalGross - totalAbsolute;
    const netEfficiency = totalGross > 0 ? (totalAbsolute / totalGross) * 100 : 0;
    
    // Revenue for the date
    const totalRevenue = summaries.reduce((acc, sum) => {
      const price = parseFloat(prices[sum.tank] || '0') || 0;
      return acc + (sum.absoluteWeight * price);
    }, 0);

    return {
      summaries,
      totalAbsolute,
      totalGross,
      totalCrates,
      totalEntries,
      totalTare,
      netEfficiency,
      totalRevenue,
      rawEntries: dateEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    };
  }, [selectedDate, entries, prices]);

  if (selectedDate && dailyAbstract) {
    const { summaries, totalAbsolute, totalGross, totalCrates, totalEntries, totalTare, netEfficiency, totalRevenue, rawEntries } = dailyAbstract;
    
    // Count serials per tank for raw display
    const tankEntryCounters: Record<string, number> = {};
    const processedEntries = [...rawEntries].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const serialMap = new Map<string, number>();
    processedEntries.forEach(e => {
      tankEntryCounters[e.tank] = (tankEntryCounters[e.tank] || 0) + 1;
      serialMap.set(e.id, tankEntryCounters[e.tank]);
    });

    return (
      <div className="space-y-6 pb-24 animate-in slide-in-from-right-4 duration-300">
        <button 
          onClick={() => setSelectedDate(null)}
          className="flex items-center gap-2 text-gray-500 font-black text-xs uppercase tracking-widest px-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Archives
        </button>

        {/* 1. MATCHING HERO GRADIENT CARD (Operational + Financial) */}
        <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 rounded-[2.5rem] p-8 shadow-2xl shadow-blue-200 overflow-hidden relative border-t border-white/20">
          <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none rotate-12">
            <TrendingUp className="w-48 h-48 text-white" />
          </div>
          
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl border border-white/30">
                <Zap className="text-yellow-300 w-5 h-5 fill-yellow-300" />
              </div>
              <h2 className="text-xs font-black text-white uppercase tracking-[0.2em]">Daily Abstract Report</h2>
            </div>
            {totalRevenue > 0 && (
              <div className="bg-emerald-400/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-400/30 flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-300" />
                <span className="text-xs font-black text-white tracking-tighter">₹{totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            )}
          </div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col">
              <span className="text-[11px] font-black text-blue-100 uppercase tracking-widest mb-1 opacity-80">Cumulative Net Weight</span>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black text-white tracking-tighter drop-shadow-lg">{totalAbsolute.toFixed(1)}</span>
                <span className="text-2xl font-bold text-blue-200 uppercase">KG</span>
              </div>
            </div>

            <div className="flex flex-col md:items-end justify-center">
               <span className="text-[11px] font-black text-blue-100 uppercase tracking-widest mb-1 opacity-80">Estimated Cash Value</span>
               <div className="flex items-baseline gap-2">
                 <span className="text-2xl font-bold text-emerald-300">₹</span>
                 <span className="text-4xl font-black text-white tracking-tighter drop-shadow-lg">
                   {totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                 </span>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/10 relative z-10">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <Weight className="w-3 h-3 text-blue-100" />
                <span className="text-[9px] font-black text-blue-100 uppercase tracking-wider">Gross Total</span>
              </div>
              <p className="text-xl font-black text-white leading-none">{totalGross.toFixed(1)} <span className="text-[10px] opacity-60">kg</span></p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <ArrowDownRight className="w-3 h-3 text-rose-300" />
                <span className="text-[9px] font-black text-rose-100 uppercase tracking-wider">Total Tare</span>
              </div>
              <p className="text-xl font-black text-rose-200 leading-none">{totalTare.toFixed(1)} <span className="text-[10px] opacity-60">kg</span></p>
            </div>
          </div>
        </div>

        {/* 2. MATCHING TANK SCORECARD CAROUSEL */}
        <div className="flex gap-3 overflow-x-auto pb-4 px-1 no-scrollbar -mx-4 px-4">
          {summaries.map((sum) => (
            <div key={`card-${sum.tank}`} className={`min-w-[160px] rounded-[1.5rem] p-4 border-2 transition-all shadow-md ${getTankBorder(sum.tank)} bg-white flex flex-col justify-between`}>
               <div className="flex items-center justify-between mb-2">
                 <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white ${getTankColor(sum.tank)} shadow-lg`}>
                   {sum.tank.replace('Tank ', '')}
                 </div>
                 <div className="text-right">
                   <p className="text-[8px] font-black text-gray-400 uppercase leading-none mb-1">Net Yield</p>
                   <p className={`text-sm font-black leading-none ${getTankText(sum.tank)}`}>{sum.absoluteWeight.toFixed(1)}</p>
                 </div>
               </div>
               
               <div className="bg-gray-900 rounded-lg py-1.5 px-2 mb-3 flex items-center justify-center gap-1.5">
                 <Hash className="w-2.5 h-2.5 text-blue-400" />
                 <span className="text-[10px] font-black text-white">{sum.shrimpCount} <span className="opacity-50">COUNT</span></span>
               </div>

               <div className="space-y-1 mt-auto">
                 <div className="flex justify-between items-center text-[10px] font-bold text-gray-400">
                   <span>Revenue</span>
                   <span className="text-emerald-600 font-black">₹{((parseFloat(prices[sum.tank] || '0') || 0) * sum.absoluteWeight).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                 </div>
                 <div className="flex justify-between items-center text-[10px] font-bold text-gray-400">
                   <span>Crates</span>
                   <span className="text-gray-900 font-black">{sum.crateCount}</span>
                 </div>
               </div>
            </div>
          ))}
        </div>

        {/* 3. MATCHING COLOURFUL STAT CHIPS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Total Crates Card */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-100/50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-xl">
                  <Package className="w-5 h-5 text-orange-600" />
                </div>
                <span className="text-xs font-black text-gray-800 uppercase tracking-wider">Total Crates</span>
              </div>
              <p className="text-3xl font-black text-gray-900 leading-none">{totalCrates}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {summaries.map(sum => (
                <div key={`tc-${sum.tank}`} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm transition-all active:scale-95 ${getTankColor(sum.tank)} ${getTankBorder(sum.tank)}`}>
                  <span className="text-[9px] font-black text-white uppercase">{sum.tank.replace('Tank ', 'T')}</span>
                  <span className="text-[9px] font-black bg-white/30 text-white px-1.5 rounded-md min-w-[1.2rem] text-center">{sum.crateCount}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Total Patlu Card */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-100/50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-xl">
                  <ListFilter className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-xs font-black text-gray-800 uppercase tracking-wider">Total Patlu</span>
              </div>
              <p className="text-3xl font-black text-gray-900 leading-none">{totalEntries}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {summaries.map(sum => (
                <div key={`te-${sum.tank}`} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm transition-all active:scale-95 ${getTankColor(sum.tank)} ${getTankBorder(sum.tank)} opacity-90`}>
                  <span className="text-[9px] font-black text-white uppercase">{sum.tank.replace('Tank ', 'T')}</span>
                  <span className="text-[9px] font-black bg-white/30 text-white px-1.5 rounded-md min-w-[1.2rem] text-center">{sum.entryCount}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Total Cash Card */}
          <div className="bg-emerald-600 rounded-3xl p-6 shadow-xl shadow-emerald-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <Banknote className="w-16 h-16 text-white" />
            </div>
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <IndianRupee className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-black text-emerald-50 uppercase tracking-wider">Total Revenue</span>
              </div>
              <p className="text-2xl font-black text-white leading-none">₹{totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="space-y-2 relative z-10">
              {summaries.slice(0, 3).map(sum => {
                 const val = (parseFloat(prices[sum.tank] || '0') || 0) * sum.absoluteWeight;
                 if (val === 0) return null;
                 return (
                   <div key={`rev-${sum.tank}`} className="flex justify-between items-center text-[10px] font-bold text-emerald-100/70">
                     <span>{sum.tank}</span>
                     <span className="text-white">₹{val.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                   </div>
                 );
              })}
            </div>
          </div>
        </div>

        {/* 4. PERFORMANCE ANALYTICS (Identical to Abstract) */}
        <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-xl shadow-gray-100 relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-2 rounded-xl">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest">Daily Efficiency Chart</h3>
            </div>
            <div className="bg-purple-50 px-3 py-1 rounded-full">
              <span className="text-[10px] font-black text-purple-600 uppercase">Net Efficiency: {netEfficiency.toFixed(1)}%</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summaries}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                <XAxis 
                  dataKey="tank" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} 
                  tickFormatter={(val) => val.replace('Tank ', '#')}
                />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9', radius: 12 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const colorName = getTankColorName(data.tank);
                      const tankHex = getHexForColor(colorName);
                      const price = parseFloat(prices[data.tank] || '0') || 0;
                      return (
                        <div className="bg-white p-5 rounded-2xl shadow-2xl border-2 animate-in zoom-in-95" style={{ borderColor: tankHex }}>
                          <p className="text-[10px] font-black text-gray-400 mb-2 uppercase tracking-[0.1em]">{data.tank}</p>
                          <div className="space-y-2">
                            <div className="flex items-baseline gap-1">
                              <p className="text-2xl font-black leading-none" style={{ color: tankHex }}>{data.absoluteWeight.toFixed(1)}</p>
                              <span className="text-[10px] font-black opacity-40 uppercase">Net kg</span>
                            </div>
                            {price > 0 && (
                              <div className="flex items-baseline gap-1">
                                <p className="text-lg font-black text-emerald-600 leading-none">₹{(data.absoluteWeight * price).toLocaleString()}</p>
                                <span className="text-[9px] font-black text-emerald-400 uppercase">Rev</span>
                              </div>
                            )}
                            <div className="h-[2px] w-full bg-gray-50" />
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                              <span className="text-[9px] font-black text-gray-400 uppercase">Gross:</span>
                              <span className="text-[9px] font-black text-gray-700 text-right">{data.totalWeight.toFixed(1)}kg</span>
                              <span className="text-[9px] font-black text-gray-400 uppercase">Count:</span>
                              <span className="text-[9px] font-black text-gray-700 text-right">{data.shrimpCount}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="absoluteWeight" 
                  radius={[12, 12, 0, 0]} 
                  barSize={32}
                  animationDuration={1500}
                >
                  {summaries.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getHexForColor(getTankColorName(entry.tank))} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5. MATCHING DETAIL MATRIX TABLE */}
        <div className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-2xl shadow-gray-100 mb-10">
          <div className="px-6 py-5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Detail Matrix</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[500px]">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-wider">Source Tank</th>
                  <th className="px-4 py-5 text-[10px] font-black text-gray-400 uppercase tracking-wider text-right">Count</th>
                  <th className="px-4 py-5 text-[10px] font-black text-gray-400 uppercase tracking-wider text-right">Yield (kg)</th>
                  <th className="px-4 py-5 text-[10px] font-black text-gray-400 uppercase tracking-wider text-right">Price</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-wider text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {summaries.map((sum, index) => {
                  const tankTextClass = getTankText(sum.tank);
                  const isEven = index % 2 === 0;
                  const price = parseFloat(prices[sum.tank] || '0') || 0;
                  const rev = sum.absoluteWeight * price;
                  return (
                    <tr key={sum.tank} className={`transition-colors group hover:bg-gray-50 ${!isEven ? 'bg-gray-50/20' : ''}`}>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                           <div className={`w-2 h-8 rounded-full ${getTankColor(sum.tank)} group-hover:scale-y-125 transition-transform`} />
                           <div>
                             <span className={`font-black text-sm ${tankTextClass}`}>{sum.tank}</span>
                             <div className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">
                               {sum.entryCount} Patlu
                             </div>
                           </div>
                        </div>
                      </td>
                      <td className="px-4 py-5 text-right">
                        <span className="font-black text-gray-400 text-xs bg-gray-50 px-2 py-1 rounded-md">{sum.shrimpCount}</span>
                      </td>
                      <td className="px-4 py-5 text-right">
                        <span className="font-black text-gray-800 text-sm">{sum.absoluteWeight.toFixed(1)}</span>
                      </td>
                      <td className="px-4 py-5 text-right">
                        <span className="font-bold text-gray-400 text-xs">₹{price}</span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className={`inline-flex flex-col items-end px-4 py-1.5 rounded-xl border border-transparent group-hover:border-current group-hover:bg-white transition-all shadow-sm ${rev > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>
                          <span className="font-black text-base">₹{rev.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-900 border-t border-gray-800">
                <tr>
                  <td className="px-6 py-6 font-black text-[10px] text-gray-400 uppercase tracking-widest">Daily Aggregate</td>
                  <td className="px-4 py-6 text-right font-black text-gray-400 text-[10px]">AVG SIZES</td>
                  <td className="px-4 py-6 text-right font-black text-white text-lg">{totalAbsolute.toFixed(1)} kg</td>
                  <td className="px-4 py-6 text-right font-black text-gray-400 text-sm">DAILY REV</td>
                  <td className="px-6 py-6 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-xl font-black text-emerald-400 leading-none">₹{totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      <span className="text-[8px] font-black text-emerald-300 uppercase mt-1 tracking-tighter">Day's Worth</span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* 6. RAW COLLECTION FEED (Keeping as it's useful for History) */}
        <div className="space-y-4 pt-6">
          <div className="px-2">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Detailed Record Stream</h3>
          </div>
          {rawEntries.map((entry) => {
            const net = entry.weight - ((entry.crateCount || 1) * (entry.crateWeight || 1.8));
            const sn = serialMap.get(entry.id);
            return (
              <div key={entry.id} className="bg-white rounded-[1.5rem] p-5 shadow-md border border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`${getTankColor(entry.tank)} text-white w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shadow-md relative`}>
                    {entry.tank.replace('Tank ', '')}
                    <div className="absolute -top-2 -left-2 bg-gray-900 text-white w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black border-2 border-white">
                      #{sn}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black text-gray-900 tracking-tighter">{entry.weight.toFixed(2)}kg</span>
                      <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md">Net: {net.toFixed(2)}kg</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{entry.team}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                   <div className="bg-gray-100 text-gray-500 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter flex items-center gap-1.5">
                     <Package className="w-3 h-3" />
                     {entry.crateCount} CR
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      <div className="px-1 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Archive Explorer</h2>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">Grouped by Collection Date</p>
        </div>
        {dailyStats.length > 1 && (
          <button 
            onClick={handleClearAll}
            className="p-3 bg-red-50 text-red-600 rounded-2xl active:scale-95 transition-all border border-red-100"
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>

      {dailyStats.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[3rem] border-4 border-dashed border-gray-100 flex flex-col items-center gap-4">
          <div className="bg-gray-50 p-6 rounded-full">
            <Calendar className="w-12 h-12 text-gray-200" />
          </div>
          <div>
            <p className="text-gray-400 font-black uppercase tracking-widest text-sm">Historical Data Empty</p>
            <p className="text-[10px] text-gray-300 font-bold uppercase mt-1">Complete a harvest to generate archives</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {dailyStats.map((stat) => (
            <div key={stat.date} className="relative group">
              <button
                onClick={() => setSelectedDate(stat.date)}
                className="w-full bg-white rounded-[2rem] p-6 text-left shadow-lg shadow-gray-100 border border-gray-50 transition-all active:scale-[0.98] group-hover:border-blue-100"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-gray-900 p-2 rounded-xl group-hover:bg-blue-600 transition-colors">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-lg font-black text-gray-900 tracking-tight">
                      {new Date(stat.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {confirmingDate === stat.date ? (
                      <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
                         <button 
                           onClick={(e) => { e.stopPropagation(); setConfirmingDate(null); }}
                           className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-xl text-[10px] font-black uppercase"
                         >
                           No
                         </button>
                         <button 
                           onClick={(e) => handleDeleteClick(e, stat.date)}
                           className="px-3 py-1.5 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-red-100"
                         >
                           {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                         </button>
                      </div>
                    ) : (
                      <button 
                        onClick={(e) => handleDeleteClick(e, stat.date)}
                        className="p-2.5 bg-gray-50 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <div className="bg-gray-50 p-2 rounded-full group-hover:translate-x-1 transition-transform">
                      <ChevronRight size={18} className="text-gray-300" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-blue-50/50 rounded-2xl p-3 border border-blue-50 flex flex-col items-center">
                    <span className="text-[8px] font-black text-blue-400 uppercase mb-1">Total Net</span>
                    <span className="text-sm font-black text-blue-900">{stat.totalNet.toFixed(1)}kg</span>
                  </div>
                  <div className="bg-orange-50/50 rounded-2xl p-3 border border-orange-50 flex flex-col items-center">
                    <span className="text-[8px] font-black text-orange-400 uppercase mb-1">Crates</span>
                    <span className="text-sm font-black text-orange-900">{stat.totalCrates}</span>
                  </div>
                  <div className="bg-purple-50/50 rounded-2xl p-3 border border-purple-50 flex flex-col items-center">
                    <span className="text-[8px] font-black text-purple-400 uppercase mb-1">Patlu</span>
                    <span className="text-sm font-black text-purple-900">{stat.count}</span>
                  </div>
                </div>
              </button>
            </div>
          ))}
          
          <div className="pt-4 text-center">
            <button 
              onClick={handleClearAll}
              className="inline-flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-red-500 transition-colors"
            >
              <AlertTriangle size={12} /> Clear Entire Archive
            </button>
          </div>
        </div>
      )}
    </div>
  );
};