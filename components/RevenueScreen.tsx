import React, { useMemo } from 'react';
import { HarvestEntry, TankSummary, getTankColor, getTankText, getTankBorder } from '../types';
import { Banknote, TrendingUp, Hash, Weight, IndianRupee, PieChart, ArrowRight, Zap, Calculator } from 'lucide-react';

interface RevenueScreenProps {
  entries: HarvestEntry[];
  prices: Record<string, string>;
  onUpdatePrice: (tank: string, price: string) => void;
}

export const RevenueScreen: React.FC<RevenueScreenProps> = ({ entries, prices, onUpdatePrice }) => {
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

  const revenueData = useMemo(() => {
    return summaries.map(sum => {
      const priceStr = prices[sum.tank] || '';
      const price = parseFloat(priceStr) || 0;
      const revenue = sum.absoluteWeight * price;
      return {
        ...sum,
        price,
        revenue
      };
    });
  }, [summaries, prices]);

  const totalRevenue = revenueData.reduce((acc, curr) => acc + curr.revenue, 0);

  return (
    <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* 1. REVENUE HERO CARD */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-700 rounded-[2.5rem] p-8 shadow-2xl shadow-emerald-100 overflow-hidden relative border-t border-white/20">
        <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none rotate-12">
          <Banknote className="w-48 h-48 text-white" />
        </div>
        
        <div className="flex items-center gap-2 mb-8">
          <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl border border-white/30">
            <Zap className="text-yellow-300 w-5 h-5 fill-yellow-300" />
          </div>
          <h2 className="text-xs font-black text-white uppercase tracking-[0.2em]">Live Revenue Calculation</h2>
        </div>

        <div className="relative z-10">
          <div className="flex flex-col">
            <span className="text-[11px] font-black text-emerald-100 uppercase tracking-widest mb-1 opacity-80">Total Estimated Cash</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-200">₹</span>
              <span className="text-6xl font-black text-white tracking-tighter drop-shadow-lg">
                {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PRICE INPUTS GRID */}
      <div className="px-1">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-2">Tank-wise Pricing</h3>
        {summaries.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[3rem] border-4 border-dashed border-gray-100 flex flex-col items-center gap-4">
            <div className="bg-gray-50 p-6 rounded-full">
              <Calculator className="w-12 h-12 text-gray-200" />
            </div>
            <div>
              <p className="text-gray-400 font-black uppercase tracking-widest text-sm">No Harvest Data</p>
              <p className="text-[10px] text-gray-300 font-bold uppercase mt-1">Add logs to calculate revenue</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {summaries.map((sum) => (
              <div key={`input-${sum.tank}`} className="bg-white rounded-[2rem] p-6 shadow-xl shadow-gray-100 border border-gray-100 flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`${getTankColor(sum.tank)} text-white w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shadow-lg`}>
                      {sum.tank.replace('Tank ', '')}
                    </div>
                    <div>
                      <h4 className={`font-black text-lg leading-none ${getTankText(sum.tank)} uppercase tracking-tight`}>{sum.tank}</h4>
                      <div className="flex gap-2 mt-1.5">
                        <span className="text-[9px] font-black bg-gray-900 text-white px-2 py-0.5 rounded-md uppercase">
                          {sum.shrimpCount} COUNT
                        </span>
                        <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md uppercase">
                          {sum.absoluteWeight.toFixed(1)} KG Net
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-gray-400 uppercase leading-none mb-1">Tank Value</p>
                    <p className="text-xl font-black text-emerald-600 leading-none">
                      ₹{((parseFloat(prices[sum.tank]) || 0) * sum.absoluteWeight).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>

                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 transition-transform group-focus-within:scale-110">
                    <IndianRupee size={20} strokeWidth={3} />
                  </div>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="Enter price per kg"
                    value={prices[sum.tank] || ''}
                    onChange={(e) => onUpdatePrice(sum.tank, e.target.value)}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-5 pl-12 pr-6 font-black text-2xl text-gray-900 focus:outline-none focus:border-emerald-500 transition-all placeholder:text-gray-200 placeholder:font-bold shadow-inner"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">PER KG</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. REVENUE SUMMARY TABLE */}
      {summaries.length > 0 && (
        <div className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-2xl shadow-gray-100 mb-12">
          <div className="px-6 py-6 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Revenue Summary Matrix</h3>
            <div className="bg-emerald-50 px-3 py-1 rounded-full flex items-center gap-1.5">
               <TrendingUp className="w-3 h-3 text-emerald-600" />
               <span className="text-[10px] font-black text-emerald-600 uppercase">Profits Analytics</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-wider">Tank</th>
                  <th className="px-4 py-5 text-[10px] font-black text-gray-400 uppercase tracking-wider text-right">Price</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-wider text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {revenueData.map((data) => (
                  <tr key={`sum-${data.tank}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-1.5 h-6 rounded-full ${getTankColor(data.tank)}`} />
                        <div>
                          <span className={`font-black text-sm ${getTankText(data.tank)}`}>{data.tank}</span>
                          <p className="text-[9px] font-bold text-gray-400 leading-none mt-1">{data.absoluteWeight.toFixed(1)}kg @ {data.shrimpCount} count</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-right font-bold text-xs text-gray-500">₹{data.price || 0}</td>
                    <td className="px-6 py-5 text-right">
                      <span className="font-black text-gray-900 text-sm">₹{data.revenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-900 border-t border-gray-800">
                <tr>
                  <td colSpan={2} className="px-6 py-6 font-black text-[10px] text-gray-400 uppercase tracking-[0.2em]">Grand Total Settlement</td>
                  <td className="px-6 py-6 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-xl font-black text-emerald-400 leading-none">₹{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                      <span className="text-[8px] font-black text-emerald-500 uppercase mt-1 tracking-tighter">Net Estimated Cash</span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};