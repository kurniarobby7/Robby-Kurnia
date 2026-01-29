
import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Car, 
  History, 
  MessageCircle, 
  ExternalLink,
  Edit3, 
  Search,
  Zap,
  Loader2,
  ShieldCheck,
  PlusCircle,
  RefreshCw,
  MessageSquare,
  UserCheck,
  ChevronDown,
  Cloud,
  Share2,
  Info,
  Calendar,
  UserPlus
} from 'lucide-react';
import { 
  CheckStatus, 
  ChecklistData, 
  VehicleInfo, 
  SavedReport,
  Person,
  ItemState
} from './types';
import { 
  CHECKLIST_ITEMS, 
  CATEGORIES, 
  APP_STORAGE_KEY,
  DRAFT_STORAGE_KEY,
  PREDEFINED_DRIVERS,
  PREDEFINED_KATIMS,
  CUSTOM_DRIVERS_KEY,
  CUSTOM_KATIMS_KEY
} from './constants';
import { analyzeVehicleHealth } from './services/gemini';
import { generateWordBlob, getFuelLabel } from './utils/documentGenerator';

const SYNC_ID_STORAGE_KEY = 'bpmp_sync_id_v2';
const CLOUD_API_BASE = 'https://kvdb.io/AStm3vY8XgS12v6QnUAbG5'; 

const App: React.FC = () => {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [customDrivers, setCustomDrivers] = useState<Person[]>([]);
  const [customKatims, setCustomKatims] = useState<Person[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [view, setView] = useState<'form' | 'history' | 'settings'>('form');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAutoSaveToast, setShowAutoSaveToast] = useState(false);
  
  const defaultSyncId = `BPMP-${new Date().toLocaleString('id-ID', { month: 'long' }).toUpperCase()}-${new Date().getFullYear()}`;
  const [syncId, setSyncId] = useState<string>('');

  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo>({
    plateNumber: '',
    vehicleType: '',
    driverName: '',
    driverNip: '',
    katimName: '',
    katimNip: '',
    odometer: '',
    fuelLevel: 50, 
    month: new Date().toLocaleString('id-ID', { month: 'long' }),
    year: new Date().getFullYear().toString(),
  });

  const [checks, setChecks] = useState<ChecklistData>({});
  const [additionalNote, setAdditionalNote] = useState('');

  // 1. Initial Load & URL Sync Handling
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSyncId = params.get('sync');
    
    let activeId = '';
    if (urlSyncId) {
      activeId = urlSyncId;
      localStorage.setItem(SYNC_ID_STORAGE_KEY, activeId);
    } else {
      activeId = localStorage.getItem(SYNC_ID_STORAGE_KEY) || defaultSyncId;
    }
    setSyncId(activeId);

    const savedReports = localStorage.getItem(APP_STORAGE_KEY);
    if (savedReports) {
      try { setReports(JSON.parse(savedReports)); } catch (e) { console.error(e); }
    }

    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setVehicleInfo(draft.vehicleInfo);
        setChecks(draft.checks || {});
        setAdditionalNote(draft.additionalNote || '');
        setEditingId(draft.editingId || null);
      } catch (e) { console.error(e); }
    }

    const savedCD = localStorage.getItem(CUSTOM_DRIVERS_KEY);
    if (savedCD) { try { setCustomDrivers(JSON.parse(savedCD)); } catch (e) { console.error(e); } }
    const savedCK = localStorage.getItem(CUSTOM_KATIMS_KEY);
    if (savedCK) { try { setCustomKatims(JSON.parse(savedCK)); } catch (e) { console.error(e); } }
  }, [defaultSyncId]);

  const filteredReports = reports.filter(r => 
    r.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.vehicleType.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.driverName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 2. Cloud Sync Functions
  const pullFromCloud = useCallback(async (targetId: string = syncId) => {
    if (!targetId) return;
    setIsSyncing(true);
    try {
      const response = await fetch(`${CLOUD_API_BASE}/${targetId}`);
      if (response.ok) {
        const cloudData = await response.json();
        if (Array.isArray(cloudData)) {
          setReports(prev => {
            const merged = [...prev];
            cloudData.forEach((cloudReport: SavedReport) => {
              const idx = merged.findIndex(r => r.id === cloudReport.id);
              if (idx === -1) merged.push(cloudReport);
              else merged[idx] = cloudReport; 
            });
            return merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          });
        }
      }
    } catch (e) {
      console.error("Cloud pull failed:", e);
    } finally {
      setIsSyncing(false);
    }
  }, [syncId]);

  const pushToCloud = useCallback(async (data: SavedReport[]) => {
    if (!syncId) return;
    try {
      await fetch(`${CLOUD_API_BASE}/${syncId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (e) {
      console.error("Cloud push failed:", e);
    }
  }, [syncId]);

  useEffect(() => {
    if (syncId) pullFromCloud();
  }, [syncId, pullFromCloud]);

  // 3. Persistence & Form Handlers
  useEffect(() => {
    const draftData = { vehicleInfo, checks, additionalNote, editingId };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
  }, [vehicleInfo, checks, additionalNote, editingId]);

  useEffect(() => { localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(reports)); }, [reports]);
  useEffect(() => { localStorage.setItem(CUSTOM_DRIVERS_KEY, JSON.stringify(customDrivers)); }, [customDrivers]);
  useEffect(() => { localStorage.setItem(CUSTOM_KATIMS_KEY, JSON.stringify(customKatims)); }, [customKatims]);

  const handleCheck = (id: string, week: 'week1' | 'week3', status: CheckStatus) => {
    setChecks(prev => ({
      ...prev,
      [id]: { ...prev[id], [week]: prev[id]?.[week] === status ? null : status, note: prev[id]?.note || '' }
    }));
  };

  const handleItemNoteChange = (id: string, note: string) => {
    setChecks(prev => ({ ...prev, [id]: { ...prev[id], note, week1: prev[id]?.week1 || null, week3: prev[id]?.week3 || null } }));
  };

  const resetForm = () => {
    setVehicleInfo({
      plateNumber: '', vehicleType: '', driverName: '', driverNip: '',
      katimName: '', katimNip: '', odometer: '', fuelLevel: 50, 
      month: new Date().toLocaleString('id-ID', { month: 'long' }),
      year: new Date().getFullYear().toString(),
    });
    setChecks({});
    setAdditionalNote('');
    setEditingId(null);
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  };

  const loadReportForEditing = (report: SavedReport) => {
    setVehicleInfo({ ...report });
    setChecks(report.checks || {});
    setAdditionalNote(report.additionalNote || '');
    setEditingId(report.id);
    setView('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveReport = async () => {
    if (!vehicleInfo.plateNumber || !vehicleInfo.driverName || !vehicleInfo.driverNip) {
      return alert("Mohon lengkapi No. Polisi, Nama Driver, dan NIP Driver!");
    }
    
    setIsSaving(true);
    try {
      const aiAnalysis = await analyzeVehicleHealth({ ...vehicleInfo, checks, additionalNote });
      const reportData: SavedReport = {
        ...vehicleInfo,
        id: editingId || crypto.randomUUID(),
        checks, additionalNote, aiAnalysis,
        createdAt: new Date().toISOString()
      };

      // Auto-persist new people to custom lists
      const driverExists = [...PREDEFINED_DRIVERS, ...customDrivers].some(d => d.name === vehicleInfo.driverName && d.nip === vehicleInfo.driverNip);
      if (!driverExists) setCustomDrivers(prev => [...prev, { name: vehicleInfo.driverName, nip: vehicleInfo.driverNip }]);

      const katimExists = [...PREDEFINED_KATIMS, ...customKatims].some(k => k.name === vehicleInfo.katimName && k.nip === vehicleInfo.katimNip);
      if (!katimExists) setCustomKatims(prev => [...prev, { name: vehicleInfo.katimName, nip: vehicleInfo.katimNip }]);

      let updatedReports: SavedReport[];
      if (editingId) {
        updatedReports = reports.map(r => r.id === editingId ? reportData : r);
      } else {
        updatedReports = [reportData, ...reports];
      }
      
      setReports(updatedReports);
      if (syncId) await pushToCloud(updatedReports);

      resetForm();
      setView('history');
    } catch (e) {
      alert("Error: " + (e as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteReport = (id: string) => {
    if (window.confirm("Hapus data laporan ini?")) {
      const updated = reports.filter(r => r.id !== id);
      setReports(updated);
      if (syncId) pushToCloud(updated);
      if (editingId === id) resetForm();
    }
  };

  const copyShareLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?sync=${encodeURIComponent(syncId)}`;
    const input = document.createElement('input');
    input.value = link;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    alert("Link Sinkronisasi disalin ke clipboard!");
  };

  const handleDownloadWord = (report: SavedReport) => {
    const blob = generateWordBlob(report);
    const fileName = `Checklist_${report.plateNumber}_${report.month}_${report.year}.doc`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const PersonSelector = ({ label, nameVal, nipVal, onNameChange, onNipChange, options }: any) => {
    const [isManual, setIsManual] = useState(false);
    
    return (
      <div className="col-span-2 space-y-4">
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">{label}</label>
          <div className="relative">
            {!isManual ? (
              <div className="relative">
                <select 
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-sm outline-none font-bold text-slate-700 shadow-inner appearance-none cursor-pointer"
                  value={nameVal}
                  onChange={(e) => {
                    if (e.target.value === 'MANUAL') { setIsManual(true); }
                    else { const s = options.find((o: any) => o.name === e.target.value); onNameChange(s?.name || ''); onNipChange(s?.nip || ''); }
                  }}
                >
                  <option value="">Pilih {label}</option>
                  {options.map((o: any) => <option key={o.nip + o.name} value={o.name}>{o.name}</option>)}
                  <option value="MANUAL" className="text-indigo-600 font-black">+ Tambah Data Baru / Manual</option>
                </select>
                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
              </div>
            ) : (
              <div className="space-y-3 p-4 bg-indigo-50/50 rounded-3xl border border-indigo-100/50">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-black text-indigo-500 uppercase">Input Manual</span>
                  <button onClick={() => setIsManual(false)} className="text-[9px] font-black text-slate-400 uppercase">Batal</button>
                </div>
                <input className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500" placeholder={`Nama Lengkap ${label}`} value={nameVal} onChange={(e) => onNameChange(e.target.value)} />
                <input className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500" placeholder="NIP" value={nipVal} onChange={(e) => onNipChange(e.target.value)} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <nav className="bg-slate-900 text-white p-4 sticky top-0 z-50 shadow-xl border-b border-slate-800">
        <div className="max-w-xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500 p-2 rounded-xl shadow-lg"><Car size={24} className="text-white" /></div>
            <div onClick={() => setView('form')} className="cursor-pointer">
              <h1 className="font-extrabold text-sm sm:text-lg leading-tight">Ceklis Randis</h1>
              <div className="flex items-center gap-1.5">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">BPMP LAMPUNG</p>
                {syncId && <span className="flex items-center gap-0.5 text-[8px] text-emerald-400 font-black px-1.5 py-0.5 rounded bg-emerald-400/10 uppercase tracking-tighter animate-pulse"><Cloud size={8} /> Sync</span>}
              </div>
            </div>
          </div>
          <div className="flex bg-slate-800 rounded-2xl p-1 border border-slate-700">
            <button onClick={() => setView('form')} className={`px-4 sm:px-6 py-2 rounded-xl text-[10px] font-black transition-all ${view === 'form' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400'}`}>FORM</button>
            <button onClick={() => setView('history')} className={`px-4 sm:px-6 py-2 rounded-xl text-[10px] font-black transition-all ${view === 'history' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400'}`}>DATA</button>
            <button onClick={() => setView('settings')} className={`px-4 sm:px-6 py-2 rounded-xl text-[10px] font-black transition-all ${view === 'settings' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400'}`}><Cloud size={14}/></button>
          </div>
        </div>
      </nav>

      <main className="max-w-xl mx-auto p-4 md:p-6 space-y-6">
        {view === 'settings' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
             <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200 space-y-6">
                <div className="flex items-center gap-4">
                   <div className="bg-indigo-100 p-3 rounded-2xl text-indigo-600"><Cloud size={24} /></div>
                   <div><h2 className="font-extrabold text-xl text-slate-800">Sinkronisasi Cloud</h2><p className="text-xs text-slate-400 font-medium">Bagi data riwayat antar tim teknis.</p></div>
                </div>
                <div className="space-y-4 pt-4 border-t border-slate-100">
                   <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1 flex items-center gap-2"><Calendar size={12}/> ID Sinkronisasi Aktif</label>
                      <input className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 shadow-inner outline-none uppercase" value={syncId} onChange={e => setSyncId(e.target.value.toUpperCase())} />
                   </div>
                   <div className="flex gap-2">
                     <button onClick={() => setSyncId(defaultSyncId)} className="text-[10px] font-black text-indigo-600 uppercase flex items-center gap-1.5 bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-colors"><RefreshCw size={12}/> Pakai Default</button>
                     <button onClick={() => localStorage.setItem(SYNC_ID_STORAGE_KEY, syncId)} className="text-[10px] font-black text-emerald-600 uppercase flex items-center gap-1.5 bg-emerald-50 px-3 py-2 rounded-lg hover:bg-emerald-100 transition-colors">Simpan ID</button>
                   </div>
                   <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3 text-blue-700 text-[11px] leading-relaxed font-medium">
                      <Info className="flex-shrink-0" size={18} />
                      <p>Semua perangkat dengan ID yang sama akan berbagi riwayat checklist yang sama secara otomatis.</p>
                   </div>
                </div>
                <div className="flex flex-col gap-3 pt-4">
                   <button onClick={() => pullFromCloud()} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:opacity-90"><RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} /> SYNC / PULL DATA</button>
                   <button onClick={copyShareLink} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20"><Share2 size={16} /> BAGIKAN LINK SYNC</button>
                </div>
             </div>
          </div>
        ) : view === 'history' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="relative group"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="Cari unit, driver, atau plat..." className="w-full bg-white border-2 border-slate-200 rounded-2xl pl-12 pr-6 py-4 text-sm font-semibold outline-none focus:border-indigo-500 shadow-sm" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
            <div className="flex items-center justify-between px-1">
              <h2 className="font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] flex items-center gap-2"><History size={14}/> {filteredReports.length} Laporan</h2>
              <button onClick={() => { resetForm(); setView('form'); }} className="text-[10px] font-black text-indigo-600 uppercase flex items-center gap-1"><PlusCircle size={14}/> Buat Laporan</button>
            </div>
            {filteredReports.map(r => (
              <div key={r.id} className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                  <div className="space-y-1">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black bg-indigo-50 text-indigo-600 uppercase tracking-widest">{r.plateNumber}</span>
                    <h3 className="font-extrabold text-xl text-slate-800">{r.vehicleType}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-bold"><span>{r.month} {r.year}</span><span className="w-1 h-1 rounded-full bg-slate-300"></span><span>{r.driverName}</span></div>
                  </div>
                  <div className="flex gap-1"><button onClick={() => loadReportForEditing(r)} className="text-slate-400 hover:text-indigo-500 p-2.5 rounded-xl border border-transparent hover:border-indigo-100 transition-all"><Edit3 size={18}/></button><button onClick={() => deleteReport(r.id)} className="text-slate-400 hover:text-rose-500 p-2.5 rounded-xl border border-transparent hover:border-rose-100 transition-all"><Trash2 size={18}/></button></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {/* Cast to ItemState[] to fix "Property 'week1' does not exist on type 'unknown'" errors */}
                  <button onClick={() => { const issuesCount = (Object.values(r.checks) as ItemState[]).filter(c => c.week1 === 'issue' || c.week3 === 'issue').length; const msg = `*RANDIS BPMP LAMPUNG*%0A*Unit:* ${r.vehicleType} (${r.plateNumber})%0A*Status:* ${issuesCount > 0 ? '⚠️ '+issuesCount+' Temuan' : '✅ Aman'}`; window.open(`https://wa.me/?text=${msg}`, '_blank'); }} className="flex items-center justify-center gap-2 bg-emerald-500 text-white py-4 rounded-2xl font-black text-[10px] shadow-lg shadow-emerald-500/20 active:scale-95"><MessageCircle size={16} /> WA</button>
                  <button onClick={() => handleDownloadWord(r)} className="flex items-center justify-center gap-2 bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] shadow-lg active:scale-95"><ExternalLink size={16} /> WORD F4</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200 space-y-8">
               <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                  <div className="col-span-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">No. Polisi</label><input className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-sm outline-none font-bold text-slate-700 shadow-inner" placeholder="BE 1234 XX" value={vehicleInfo.plateNumber} onChange={e => setVehicleInfo({...vehicleInfo, plateNumber: e.target.value.toUpperCase()})} /></div>
                  <div className="col-span-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Jenis Kendaraan</label><input className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-5 py-4 text-sm outline-none font-bold text-slate-700 shadow-inner" placeholder="AVANZA / INNOVA" value={vehicleInfo.vehicleType} onChange={e => setVehicleInfo({...vehicleInfo, vehicleType: e.target.value.toUpperCase()})} /></div>
               </div>
               <div className="border-t border-slate-100 pt-8">
                  <PersonSelector label="Nama Driver / Pengemudi" nameVal={vehicleInfo.driverName} nipVal={vehicleInfo.driverNip} options={[...PREDEFINED_DRIVERS, ...customDrivers]} onNameChange={(n:any) => setVehicleInfo(p => ({...p, driverName: n}))} onNipChange={(nip:any) => setVehicleInfo(p => ({...p, driverNip: nip}))} />
               </div>
               <div className="border-t border-slate-100 pt-8">
                  <PersonSelector label="Ketua Tim RTPK" nameVal={vehicleInfo.katimName} nipVal={vehicleInfo.katimNip} options={[...PREDEFINED_KATIMS, ...customKatims]} onNameChange={(n:any) => setVehicleInfo(p => ({...p, katimName: n}))} onNipChange={(nip:any) => setVehicleInfo(p => ({...p, katimNip: nip}))} />
               </div>
            </div>

            <div className="bg-indigo-600 text-white p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden"><div className="flex justify-between items-center mb-8 relative z-10"><span className="text-[10px] font-black text-indigo-100 uppercase tracking-[0.3em]">Odometer Status</span><span className="bg-indigo-400/30 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase">{getFuelLabel(vehicleInfo.fuelLevel)} Fuel</span></div><div className="flex items-baseline gap-4 mb-8 relative z-10"><input type="number" className="bg-transparent text-6xl font-black border-none outline-none w-full placeholder:text-indigo-400" placeholder="0" value={vehicleInfo.odometer} onChange={e => setVehicleInfo({...vehicleInfo, odometer: e.target.value})} /><span className="text-indigo-200 font-black text-2xl">KM</span></div><input type="range" min="0" max="100" step="25" className="w-full h-3 bg-indigo-700 rounded-full appearance-none cursor-pointer accent-white relative z-10" value={vehicleInfo.fuelLevel} onChange={e => setVehicleInfo({...vehicleInfo, fuelLevel: parseInt(e.target.value)})} /></div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
               {CATEGORIES.map((cat, catIdx) => (
                 <div key={cat} className={`${catIdx !== 0 ? 'border-t border-slate-100' : ''}`}>
                    <div className="bg-slate-50/50 px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> {cat}</div>
                    {CHECKLIST_ITEMS.filter(i => i.category === cat).map(item => (
                      <div key={item.id} className="px-6 sm:px-8 py-5 border-b border-slate-50 last:border-none hover:bg-slate-50/80 transition-all flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"><span className="text-sm font-bold text-slate-700">{item.label}</span><div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-full sm:w-auto shadow-inner"><div className="flex gap-1 pr-2 border-r border-slate-200"><button onClick={() => handleCheck(item.id, 'week1', 'ok')} className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center transition-all ${checks[item.id]?.week1 === 'ok' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}><CheckCircle size={18}/><span className="text-[7px] font-black mt-0.5">W1</span></button><button onClick={() => handleCheck(item.id, 'week1', 'issue')} className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center transition-all ${checks[item.id]?.week1 === 'issue' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}><XCircle size={18}/><span className="text-[7px] font-black mt-0.5">W1</span></button></div><div className="flex gap-1 pl-1"><button onClick={() => handleCheck(item.id, 'week3', 'ok')} className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center transition-all ${checks[item.id]?.week3 === 'ok' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}><CheckCircle size={18}/><span className="text-[7px] font-black mt-0.5">W3</span></button><button onClick={() => handleCheck(item.id, 'week3', 'issue')} className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center transition-all ${checks[item.id]?.week3 === 'issue' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}><XCircle size={18}/><span className="text-[7px] font-black mt-0.5">W3</span></button></div></div></div>
                        <div className="relative"><MessageSquare className="absolute left-3 top-3 text-slate-300" size={14} /><input type="text" placeholder="Catatan tambahan..." className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:border-indigo-400 font-medium text-slate-600" value={checks[item.id]?.note || ''} onChange={(e) => handleItemNoteChange(item.id, e.target.value)} /></div>
                      </div>
                    ))}
                 </div>
               ))}
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200"><label className="text-[10px] font-black text-slate-400 uppercase mb-4 block tracking-[0.2em] px-1">Kesimpulan Akhir</label><textarea className="w-full bg-slate-50 rounded-3xl p-6 text-sm outline-none border-2 border-transparent focus:border-indigo-100 font-bold text-slate-600 shadow-inner" rows={4} placeholder="Tulis detail temuan akhir di sini..." value={additionalNote} onChange={e => setAdditionalNote(e.target.value)} /></div>

            <button onClick={saveReport} disabled={isSaving} className={`w-full py-6 rounded-[2rem] font-black shadow-2xl transition-all flex items-center justify-center gap-4 text-sm tracking-widest active:scale-95 ${isSaving ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white shadow-indigo-600/30 hover:bg-indigo-700'}`}>
              {isSaving ? <Loader2 className="animate-spin" size={24} /> : <><Zap size={22} className="fill-white" /> {editingId ? "PERBARUI DATA" : "SIMPAN DATA"}</>}
            </button>
          </div>
        )}
      </main>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-max max-w-[90vw]"><div className="bg-slate-900/90 backdrop-blur-2xl px-6 py-4 rounded-full border border-white/10 shadow-2xl flex items-center gap-5 text-[10px] font-black text-white whitespace-nowrap z-[60]"><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg animate-pulse"></div><span className="uppercase tracking-widest">Sistem Aktif</span></div><div className="w-px h-5 bg-white/10"></div><div className="flex items-center gap-2 text-indigo-400"><ShieldCheck size={14} /><span className="uppercase tracking-widest">Randis v3.0</span></div></div></div>
    </div>
  );
};

export default App;
