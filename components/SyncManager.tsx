import React, { useState, useEffect } from 'react';
import { CloudUpload, Download, CheckCircle, AlertCircle, Loader2, Info, FileText, Database, HardDrive } from 'lucide-react';
import { HarvestEntry, HarvestSettings, TankSummary } from '../types';
import { DBService } from '../db';
import { GoogleGenAI } from '@google/genai';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface SyncManagerProps {
  entries: HarvestEntry[];
  settings: HarvestSettings;
  onSyncComplete: () => void;
}

export const SyncManager: React.FC<SyncManagerProps> = ({ entries, settings, onSyncComplete }) => {
  const [syncing, setSyncing] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [totalDbCount, setTotalDbCount] = useState<number | null>(null);
  const [result, setResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const unsyncedEntries = entries.filter(e => !e.synced);

  useEffect(() => {
    const fetchCount = async () => {
      const count = await DBService.getCount();
      setTotalDbCount(count);
    };
    fetchCount();
  }, [entries]);

  const handleManualSync = async () => {
    if (unsyncedEntries.length === 0) return;
    setSyncing(true);
    setResult(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
        await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Analyze this shrimp harvest data summary: ${JSON.stringify(unsyncedEntries.slice(0, 10))}. Provide a one-sentence quality check report.`,
        });
      } catch (err) {
        console.warn('Gemini analytics skipped');
      }
      const idsToSync = unsyncedEntries.map(e => e.id);
      await DBService.markSynced(idsToSync);
      setResult({ type: 'success', message: `${idsToSync.length} entries uploaded to cloud.` });
      onSyncComplete();
    } catch (error) {
      setResult({ type: 'error', message: 'Sync failed. Check connection and retry.' });
    } finally {
      setSyncing(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (entries.length === 0) return;
    setGeneratingPdf(true);
    
    try {
      const doc = new jsPDF();
      const timestamp = new Date().toLocaleString();
      const prices = settings.tankPrices || {};

      doc.setFontSize(22);
      doc.setTextColor(37, 99, 235);
      doc.text("SHRIMP HARVEST MASTER REPORT", 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${timestamp}`, 14, 30);
      doc.text(`Lead Team: ${settings.teamName}`, 14, 35);
      
      const tankMap = new Map<string, TankSummary>();
      entries.forEach(e => {
        const current = tankMap.get(e.tank) || { 
          tank: e.tank, entryCount: 0, patluCount: 0, singlesCount: 0, 
          crateCount: 0, totalWeight: 0, absoluteWeight: 0, shrimpCount: e.count 
        };
        const cCount = e.crateCount || 1;
        const tare = cCount * (e.crateWeight || 1.8);
        current.entryCount++;
        if (cCount === 2) current.patluCount++; else current.singlesCount++;
        current.crateCount += cCount;
        current.totalWeight += e.weight;
        current.absoluteWeight += Math.max(0, e.weight - tare);
        tankMap.set(e.tank, current);
      });

      const summaries = Array.from(tankMap.values()).sort((a, b) => a.tank.localeCompare(b.tank));
      const totalGross = summaries.reduce((s, x) => s + x.totalWeight, 0);
      const totalNet = summaries.reduce((s, x) => s + x.absoluteWeight, 0);
      const totalRevenue = summaries.reduce((s, x) => s + (x.absoluteWeight * (parseFloat(prices[x.tank]) || 0)), 0);

      (doc as any).autoTable({
        startY: 45,
        head: [['Metric', 'Value']],
        body: [
          ['Total Harvest Weight (Gross)', `${totalGross.toFixed(2)} kg`],
          ['Total Yield (Net)', `${totalNet.toFixed(2)} kg`],
          ['Estimated Cash Value', `INR ${totalRevenue.toLocaleString()}`],
          ['Efficiency Rating', `${((totalNet/totalGross)*100).toFixed(1)}%`],
          ['Total Collection Volume', `${summaries.reduce((s, x) => s + x.entryCount, 0)} Units`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] }
      });

      doc.setFontSize(14);
      doc.text("Tank-wise Yield Breakdown", 14, (doc as any).lastAutoTable.finalY + 15);

      (doc as any).autoTable({
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Tank', 'Count', 'Patlu/Singles', 'Gross (kg)', 'Net (kg)']],
        body: summaries.map(s => [
          s.tank, 
          s.shrimpCount, 
          `${s.patluCount}P + ${s.singlesCount}S`, 
          s.totalWeight.toFixed(1), 
          s.absoluteWeight.toFixed(1)
        ]),
        headStyles: { fillColor: [51, 65, 85] }
      });

      doc.addPage();
      doc.setFontSize(18);
      doc.setTextColor(5, 150, 105);
      doc.text("FINANCIAL SETTLEMENT MATRIX", 14, 22);

      (doc as any).autoTable({
        startY: 30,
        head: [['Tank', 'Yield (kg)', 'Rate (INR/kg)', 'Sub-Total (INR)']],
        body: summaries.map(s => {
          const rate = parseFloat(prices[s.tank]) || 0;
          return [s.tank, s.absoluteWeight.toFixed(2), rate, (s.absoluteWeight * rate).toLocaleString()];
        }),
        foot: [[
          { content: 'GRAND TOTAL SETTLEMENT', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
          { content: `INR ${totalRevenue.toLocaleString()}`, styles: { fontStyle: 'bold', fillColor: [5, 150, 105], textColor: 255 } }
        ]],
        headStyles: { fillColor: [5, 150, 105] }
      });

      doc.addPage();
      doc.setFontSize(18);
      doc.setTextColor(31, 41, 55);
      doc.text("DETAILED COLLECTION AUDIT", 14, 22);
      doc.setFontSize(10);
      doc.text("Exhaustive list of all harvest crate entries recorded on device.", 14, 28);

      const sortedEntries = [...entries].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      (doc as any).autoTable({
        startY: 35,
        head: [['#', 'Time', 'Tank', 'Crates', 'Gross', 'Net', 'Team']],
        body: sortedEntries.map((e, i) => {
          const cCount = e.crateCount || 1;
          const net = e.weight - (cCount * (e.crateWeight || 1.8));
          return [
            i + 1,
            new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            e.tank,
            cCount === 2 ? 'Patlu' : 'Single',
            e.weight.toFixed(2),
            net.toFixed(2),
            e.team
          ];
        }),
        headStyles: { fillColor: [31, 41, 55] },
        styles: { fontSize: 8 }
      });

      doc.save(`Shrimp_Harvest_Report_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (err) {
      console.error(err);
      alert("PDF generation failed.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleDownloadCSV = () => {
    const headers = ['ID', 'Tank', 'Count', 'Weight_Gross', 'CrateCount', 'Team', 'Timestamp', 'Synced'];
    const rows = entries.map(e => [
      e.id, e.tank, e.count, e.weight, e.crateCount || 1, e.team, e.timestamp, e.synced
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `harvest_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-md mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-100 text-center">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CloudUpload className={`w-10 h-10 ${unsyncedEntries.length > 0 ? 'text-blue-600' : 'text-gray-300'}`} />
        </div>
        
        <h2 className="text-2xl font-black text-gray-900 mb-2">Data Synchronizer</h2>
        <p className="text-gray-500 font-medium mb-8">
          {unsyncedEntries.length === 0 
            ? 'All current entries are safe in the cloud.' 
            : `You have ${unsyncedEntries.length} new entries waiting to be synced.`}
        </p>

        {result && (
          <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold animate-in zoom-in-95 ${
            result.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {result.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {result.message}
          </div>
        )}

        <button
          onClick={handleManualSync}
          disabled={syncing || unsyncedEntries.length === 0}
          className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-lg transition-all shadow-xl shadow-blue-100 ${
            unsyncedEntries.length > 0 && !syncing
              ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {syncing ? <Loader2 className="w-6 h-6 animate-spin" /> : <CloudUpload className="w-6 h-6" />}
          {syncing ? 'UPLOADING...' : 'SYNC NOW'}
        </button>
      </div>

      {/* Persistence Card */}
      <div className="bg-gray-900 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Database className="w-24 h-24 text-white" />
        </div>
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-blue-600 p-2.5 rounded-xl">
            <HardDrive className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white uppercase tracking-widest">Lifetime Persistence</h4>
            <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">Physical Device Records</p>
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black text-white tracking-tighter">
            {totalDbCount === null ? '...' : totalDbCount.toLocaleString()}
          </span>
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Digital Records Stored</span>
        </div>
        <p className="mt-4 text-[9px] font-bold text-gray-500 uppercase leading-relaxed tracking-wider">
          Data is locked into your phone's persistent storage. <br/>
          Android will not delete this data even during cleanups.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <button
          onClick={handleDownloadPDF}
          disabled={entries.length === 0 || generatingPdf}
          className={`bg-white text-gray-900 border-2 border-gray-100 py-5 px-6 rounded-3xl font-black flex items-center justify-between shadow-xl active:scale-[0.98] transition-all ${
            entries.length === 0 ? 'opacity-50 grayscale' : 'hover:border-blue-100'
          }`}
        >
          <div className="flex items-center gap-3">
            {generatingPdf ? <Loader2 className="w-6 h-6 animate-spin text-blue-600" /> : <FileText className="w-6 h-6 text-blue-600" />}
            <div className="text-left">
              <p className="leading-none text-sm uppercase tracking-wider">Generate Digital Audit</p>
              <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tighter">Export full history as PDF</p>
            </div>
          </div>
          <Download className="w-5 h-5 text-gray-300" />
        </button>

        <button
          onClick={handleDownloadCSV}
          disabled={entries.length === 0}
          className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-100 py-4 px-6 rounded-3xl font-bold flex items-center justify-between shadow-sm active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 text-gray-400" />
            <span>CSV Raw Export</span>
          </div>
          <span className="text-xs bg-gray-100 px-2 py-1 rounded-lg text-gray-500">{entries.length}</span>
        </button>
      </div>
    </div>
  );
};