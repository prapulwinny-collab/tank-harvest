import React, { useMemo } from 'react';
import { HarvestEntry, TankSummary, getTankColor, getTankText, getTankBorder, formatPatluDisplay, getTankColorName } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Package, Scale, ListFilter, Weight, PieChart, ArrowDownRight, Zap, Target, Hash, Banknote, IndianRupee } from 'lucide-react';

interface AbstractScreenProps {
  entries: HarvestEntry[];
  prices: Record<string, string>;
}

const getHexForColor = (color: string) => {
  const map: Record<string, string> = {
    'blue': '#2563eb', 'purple': '#9333ea', 'rose': '#e11d48', 'amber': '#d97706', 
    'emerald': '#059669', 'indigo': '#4f46e5', 'orange': '#ea580c', 'cyan': '#0891b2', 
    'fuchsia': '#c026d3', 'teal': '#0d9488', 'lime': '#65a30d', 'violet': '#7c3aed',
  };
  return map[color] || '#2563eb';
};

export const AbstractScreen: React.FC<AbstractScreenProps> = ({ entries, prices }) => {
  const summaries = useMemo(() => {
    const map = new Map<string, TankSummary>();

    entries.forEach(entry => {
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

    return Array.from(map.values()).sort((a, b) => a.tank.localeCompare(b.tank));
  }, [entries]);

  const totalAbsolute = summaries.reduce((acc, s) => acc + s.absoluteWeight, 0);
  const totalGross = summaries.reduce((acc, s) => acc + s.totalWeight, 0);
  const totalCrates = summaries.reduce((acc, s) => acc + s.crateCount, 0);
  const totalPatlu = summaries.reduce((acc, s) => acc + s.patluCount, 0);
  const totalSingles = summaries.reduce((acc, s) => acc + s.singlesCount, 0);
  const totalTare = totalGross - totalAbsolute;
  const netEfficiency = totalGross > 0 ? (totalAbsolute / totalGross) * 100 : 0;

  const totalRevenue = summaries.reduce((acc, sum) => {
    const price = parseFloat(prices[sum.tank] || '0') || 0;
    return acc + (sum.absoluteWeight * price);
  }, 0);

  return (
    <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* 1. HERO GRADIENT CARD */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 rounded-[2.5rem] p-8 shadow-2xl shadow-blue-200 overflow-hidden relative border-t border-white/20">
        <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none rotate-12">
          <TrendingUp className="w-48 h-48 text-white" />
        </div>
        
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl border border-white/30">
              <Zap className="text-yellow-300 w-5 h-5 fill-yellow-300" />
            </div>
            <h2 className="text-xs font-black text-white uppercase tracking-[0.2em]">Harvest Overview</h2>
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

      {/* 2. TANK SCORECARD CAROUSEL */}
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
                 <span>Collection</span>
                 <span className={`${getTankText(sum.tank)} font-black text-[9px]`}>{sum.patluCount}P + {sum.singlesCount}S</span>
               </div>
               <div className="flex justify-between items-center text-[10px] font-bold text-gray-400">
                 <span>Revenue</span>
                 <span className="text-emerald-600 font-black">₹{((parseFloat(prices[sum.tank] || '0') || 0) * sum.absoluteWeight).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
               </div>
             </div>
          </div>
        ))}
      </div>

      {/* 3. COLOURFUL STAT CHIPS */}
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

        {/* Total Patlu + Singles Card */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-100/50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 p-2 rounded-xl">
                <ListFilter className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-xs font-black text-gray-800 uppercase tracking-wider">Total Collection</span>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-gray-900 leading-none">{totalPatlu} Patlu</p>
              <p className="text-xs font-bold text-gray-400 mt-1 uppercase">+{totalSingles} Singles</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {summaries.map(sum => (
              <div key={`te-${sum.tank}`} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm transition-all active:scale-95 ${getTankColor(sum.tank)} ${getTankBorder(sum.tank)} opacity-90`}>
                <span className="text-[9px] font-black text-white uppercase">{sum.tank.replace('Tank ', 'T')}</span>
                <span className="text-[9px] font-black bg-white/30 text-white px-1.5 rounded-md min-w-[1.2rem] text-center">{sum.patluCount}P + {sum.singlesCount}S</span>
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

      {/* 4. PERFORMANCE ANALYTICS */}
      <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-xl shadow-gray-100 relative overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-xl">
              <Target className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest">Efficiency Chart</h3>
          </div>
          <div className="bg-purple-50 px-3 py-1 rounded-full">
            <span className="text-[10px] font-black text-purple-600 uppercase">Net Efficiency: {netEfficiency.toFixed(1)}%</span>
          </div>
        </div>

        <div className="h-64 w-full">
          {summaries.length > 0 ? (
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
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                              <span className="text-[9px] font-black text-gray-400 uppercase">Collection:</span>
                              <span className="text-[9px] font-black text-gray-700 text-right">{data.patluCount}P + {data.singlesCount}S</span>
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
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                <Scale className="w-8 h-8 opacity-20" />
              </div>
              <p className="text-xs font-black uppercase tracking-widest opacity-30 italic">No charts to display</p>
            </div>
          )}
        </div>
      </div>

      {/* 5. COLOURFUL DATA TABLE */}
      <div className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-2xl shadow-gray-100 mb-10">
        <div className="px-6 py-5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Detail Matrix</h3>
          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase">Updated Live</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[500px]">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-wider">Source Tank</th>
                <th className="px-4 py-5 text-[10px] font-black text-gray-400 uppercase tracking-wider text-right">Collection</th>
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
                             {sum.shrimpCount} Count
                           </div>
                         </div>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-right">
                      <span className="font-black text-gray-400 text-xs bg-gray-50 px-2 py-1 rounded-md">
                        {formatPatluDisplay(sum.patluCount, sum.singlesCount)}
                      </span>
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
          </table>
        </div>
      </div>
    </div>
  );
};