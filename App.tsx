
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  CheckCircle, 
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
  MessageSquare,
  ChevronDown,
  Cloud,
  Share2,
  LogIn,
  LogOut,
  Key,
  Eye,
  EyeOff,
  AlertCircle,
  Bell,
  FileText,
  X,
  XCircle,
  Calendar,
  User as UserIcon,
  Fuel
} from 'lucide-react';
import { 
  CheckStatus, 
  ChecklistData, 
  VehicleInfo, 
  SavedReport,
  User,
  UserRole,
  ItemState
} from './types';
import { 
  CHECKLIST_ITEMS, 
  CATEGORIES, 
  APP_STORAGE_KEY,
  DRAFT_STORAGE_KEY,
  PREDEFINED_KATIMS,
  USERS_STORAGE_KEY,
  CURRENT_USER_KEY
} from './constants';
import { analyzeVehicleHealth } from './services/gemini';
import { generateWordBlob, getFuelLabel, generateDocumentHtml } from './utils/documentGenerator';

const SYNC_ID_STORAGE_KEY = 'bpmp_sync_id_v2_stable';
const CLOUD_API_BASE = 'https://kvdb.io/AStm3vY8XgS12v6QnUAbG5'; 

const LOGO_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Logo_of_Ministry_of_Education_and_Culture_of_Republic_of_Indonesia.svg/1024px-Logo_of_Ministry_of_Education_and_Culture_of_Republic_of_Indonesia.svg.png";

interface ToastState {
  message: string;
  type: 'success' | 'error';
  visible: boolean;
}

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Notification State
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'success', visible: false });
  const toastTimer = useRef<number | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ message, type, visible: true });
    toastTimer.current = window.setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  // App State
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [view, setView] = useState<'form' | 'history' | 'settings'>('form');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [syncId, setSyncId] = useState<string>('BPMP-LAMPUNG-DATABASE-RANDIS');
  const [previewReport, setPreviewReport] = useState<SavedReport | null>(null);

  // Form State
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo>({
    plateNumber: '',
    vehicleType: '',
    driverName: '',
    driverNip: '',
    katimName: PREDEFINED_KATIMS[0].name,
    katimNip: PREDEFINED_KATIMS[0].nip,
    odometer: '',
    fuelLevel: 50, 
    month: new Date().toLocaleString('id-ID', { month: 'long' }),
    year: new Date().getFullYear().toString(),
  });

  const [checks, setChecks] = useState<ChecklistData>({});
  const [additionalNote, setAdditionalNote] = useState('');

  // Initial Load
  useEffect(() => {
    const usersStr = localStorage.getItem(USERS_STORAGE_KEY);
    if (usersStr) {
      try { setRegisteredUsers(JSON.parse(usersStr)); } catch (e) { console.error(e); }
    }
    const sessionStr = localStorage.getItem(CURRENT_USER_KEY);
    if (sessionStr) {
      try { 
        const user = JSON.parse(sessionStr);
        setCurrentUser(user);
        if (user.role !== 'Driver') setView('history');
      } catch (e) { console.error(e); }
    }
    const savedSyncId = localStorage.getItem(SYNC_ID_STORAGE_KEY);
    if (savedSyncId) setSyncId(savedSyncId);
    const savedReports = localStorage.getItem(APP_STORAGE_KEY);
    if (savedReports) {
      try { setReports(JSON.parse(savedReports)); } catch (e) { console.error(e); }
    }
  }, []);

  const handleRegister = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const nip = formData.get('nip') as string;
    const role = formData.get('role') as UserRole;
    const password = formData.get('password') as string;
    const confirm = formData.get('confirm') as string;

    if (!name || !nip || !password || !role) {
      showNotification("Mohon lengkapi semua kolom!", "error");
      return;
    }
    
    if (password !== confirm) {
      showNotification("Password tidak cocok!", "error");
      return;
    }
    
    const latestUsers = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
    if (latestUsers.some((u: User) => u.nip === nip)) {
      showNotification("NIP sudah terdaftar!", "error");
      return;
    }

    const newUser: User = { id: crypto.randomUUID(), name, nip, role, password };
    const updatedUsers = [...latestUsers, newUser];
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
    setRegisteredUsers(updatedUsers);
    
    showNotification("Pendaftaran Berhasil!", "success");
    setAuthMode('login');
  };

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const nip = formData.get('nip') as string;
    const password = formData.get('password') as string;

    const latestUsers = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
    const user = latestUsers.find((u: User) => u.nip === nip && u.password === password);
    
    if (user) {
      setCurrentUser(user);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      // Sinkronkan info kendaraan dengan user yang login
      setVehicleInfo(prev => ({
        ...prev,
        driverName: user.name,
        driverNip: user.nip
      }));
      
      if (user.role !== 'Driver') {
        setView('history');
      } else {
        setView('form');
      }
      showNotification(`Selamat datang, ${user.name}!`, "success");
    } else {
      showNotification("NIP atau Password salah!", "error");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(CURRENT_USER_KEY);
    setCurrentUser(null);
    setView('form');
    showNotification("Anda telah keluar.", "success");
  };

  const saveReport = async () => {
    if (currentUser?.role !== 'Driver') return;
    if (!vehicleInfo.plateNumber) return showNotification("No. Polisi wajib diisi!", "error");
    setIsSaving(true);
    try {
      const finalVehicleInfo = {
        ...vehicleInfo,
        driverName: currentUser.name,
        driverNip: currentUser.nip
      };

      const aiAnalysis = await analyzeVehicleHealth({ ...finalVehicleInfo, checks, additionalNote });
      const reportData: SavedReport = {
        ...finalVehicleInfo,
        id: editingId || crypto.randomUUID(),
        checks, additionalNote, aiAnalysis,
        createdAt: new Date().toISOString(),
        createdByNip: currentUser?.nip
      };
      const updatedReports = editingId ? reports.map(r => r.id === editingId ? reportData : r) : [reportData, ...reports];
      setReports(updatedReports);
      localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(updatedReports));
      if (syncId) await pushToCloud(updatedReports);
      setChecks({});
      setAdditionalNote('');
      setEditingId(null);
      showNotification("Laporan berhasil dikirim!", "success");
      setView('history');
    } catch (e) { showNotification("Gagal simpan", "error"); } finally { setIsSaving(false); }
  };

  const pullFromCloud = useCallback(async (targetId: string = syncId) => {
    if (!targetId) return;
    setIsSyncing(true);
    try {
      const response = await fetch(`${CLOUD_API_BASE}/${targetId}`);
      if (response.ok) {
        const cloudData = await response.json();
        if (Array.isArray(cloudData)) {
          setReports(cloudData);
          localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(cloudData));
          showNotification("Data Cloud Sinkron!", "success");
        }
      }
    } catch (e) { showNotification("Gagal tarik data", "error"); } finally { setIsSyncing(false); }
  }, [syncId]);

  const pushToCloud = useCallback(async (data: SavedReport[]) => {
    if (!syncId) return;
    try {
      await fetch(`${CLOUD_API_BASE}/${syncId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (e) { console.error(e); }
  }, [syncId]);

  const deleteReport = async (id: string) => {
    if (!window.confirm("Hapus laporan ini?")) return;
    const updatedReports = reports.filter(r => r.id !== id);
    setReports(updatedReports);
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(updatedReports));
    if (syncId) {
      try {
        await pushToCloud(updatedReports);
      } catch (e) {
        console.error("Cloud delete failed:", e);
      }
    }
    showNotification("Laporan berhasil dihapus", "success");
  };

  const NotificationToast = () => {
    if (!toast.visible) return null;
    return (
      <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
        toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
      }`}>
        {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
        <p className="text-xs font-black uppercase tracking-widest">{toast.message}</p>
      </div>
    );
  };

  const PreviewModal = () => {
    if (!previewReport) return null;
    const html = generateDocumentHtml(previewReport);
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
        <div className="bg-white w-full max-w-4xl h-[95vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 text-white p-2 rounded-xl"><FileText size={20}/></div>
              <div>
                <h3 className="font-black text-slate-800 uppercase text-[10px] sm:text-xs tracking-widest">Digital Record</h3>
                <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase">{previewReport.plateNumber} • {previewReport.month}</p>
              </div>
            </div>
            <button onClick={() => setPreviewReport(null)} className="p-2 hover:bg-rose-50 text-rose-500 rounded-full transition-colors"><X size={28}/></button>
          </div>
          <div className="flex-1 overflow-auto p-2 sm:p-4 bg-slate-200">
            <div className="bg-white shadow-lg mx-auto min-h-full w-full max-w-[215.9mm] overflow-hidden">
              <iframe srcDoc={html} className="w-full h-[1150px] border-none" title="Doc Preview" />
            </div>
          </div>
          <div className="p-4 sm:p-5 border-t border-slate-100 flex flex-col sm:flex-row gap-3 bg-white">
            <button onClick={() => {
              const blob = generateWordBlob(previewReport);
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = `Checklist_${previewReport.plateNumber}.doc`; a.click();
              showNotification("Download Berhasil", "success");
            }} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20">
              <ExternalLink size={18} /> Download Dokumen (DOC)
            </button>
            <button onClick={() => setPreviewReport(null)} className="py-4 px-8 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase">Tutup</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      <NotificationToast />
      <PreviewModal />

      {!currentUser ? (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white relative">
          <div className="w-full max-w-md space-y-8 relative z-10">
            <div className="text-center flex flex-col items-center">
              <div className="bg-white p-4 rounded-[2.5rem] shadow-2xl mb-6">
                <img src={LOGO_URL} alt="Logo BPMP" className="w-24 h-24 object-contain" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter">Ceklis Randis</h1>
              <p className="text-slate-400 font-bold uppercase tracking-[0.4em] text-[10px] mt-2">Kemen-dikdasmen BPMP Lampung</p>
            </div>
            <div className="bg-white/10 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
               <div className="flex bg-white/5 rounded-2xl p-1 mb-8">
                <button onClick={() => { setAuthMode('login'); setShowPassword(false); setShowConfirmPassword(false); }} className={`flex-1 py-3.5 rounded-xl text-xs font-black uppercase ${authMode === 'login' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500'}`}>MASUK</button>
                <button onClick={() => { setAuthMode('register'); setShowPassword(false); setShowConfirmPassword(false); }} className={`flex-1 py-3.5 rounded-xl text-xs font-black uppercase ${authMode === 'register' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500'}`}>DAFTAR</button>
              </div>
              
              {authMode === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">NIP Pengguna</label>
                    <input name="nip" required className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-indigo-500" placeholder="Masukkan NIP" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Password</label>
                    <div className="relative">
                      <input 
                        name="password" 
                        type={showPassword ? "text" : "password"} 
                        required 
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 pr-14 text-sm font-bold outline-none focus:border-indigo-500" 
                        placeholder="••••••••" 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 py-5 rounded-2xl font-black text-xs tracking-[0.2em] shadow-xl uppercase transition-all">Masuk Sistem</button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 px-1">Nama Lengkap</label>
                    <input name="name" required className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-sm font-bold outline-none focus:border-indigo-500" placeholder="Nama Lengkap" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 px-1">NIP</label>
                      <input name="nip" required className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-sm font-bold outline-none focus:border-indigo-500" placeholder="NIP" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 px-1">Jabatan</label>
                      <select name="role" required className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-sm font-bold outline-none focus:border-indigo-500 appearance-none bg-slate-800">
                        <option value="Driver">Driver</option>
                        <option value="Pengawas">Pengawas</option>
                        <option value="Katim">Katim RTPK</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 px-1">Password</label>
                    <div className="relative">
                      <input 
                        name="password" 
                        type={showPassword ? "text" : "password"} 
                        required 
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 pr-12 text-sm font-bold outline-none focus:border-indigo-500" 
                        placeholder="••••••••" 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 px-1">Konfirmasi Password</label>
                    <div className="relative">
                      <input 
                        name="confirm" 
                        type={showConfirmPassword ? "text" : "password"} 
                        required 
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 pr-12 text-sm font-bold outline-none focus:border-indigo-500" 
                        placeholder="••••••••" 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 py-4 rounded-xl font-black text-xs tracking-[0.2em] shadow-lg uppercase transition-all mt-2">Daftar Akun</button>
                </form>
              )}
            </div>
            <div className="text-center"><p className="text-[8px] italic text-slate-500">created by.R.project</p></div>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-slate-50 pb-32">
          <nav className="bg-slate-900 text-white p-4 sticky top-0 z-50 shadow-xl">
            <div className="max-w-xl mx-auto flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-1.5 rounded-xl"><img src={LOGO_URL} className="w-8 h-8 object-contain" alt="Logo"/></div>
                  <div><h1 className="font-extrabold text-sm sm:text-lg">Ceklis Randis</h1><p className="text-[9px] text-slate-500 font-bold uppercase">BPMP LAMPUNG</p></div>
                </div>
                <button onClick={handleLogout} className="p-2.5 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-500 rounded-xl transition-all border border-slate-700 shadow-inner"><LogOut size={18}/></button>
              </div>
              <div className="flex bg-slate-800/50 rounded-2xl p-1 border border-slate-800">
                {currentUser.role === 'Driver' && (
                  <button onClick={() => setView('form')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all ${view === 'form' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500'}`}>FORMULIR</button>
                )}
                <button onClick={() => setView('history')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all ${view === 'history' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500'}`}>RIWAYAT</button>
                <button onClick={() => setView('settings')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black transition-all ${view === 'settings' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500'}`}><Cloud size={16}/></button>
              </div>
            </div>
          </nav>

          <main className="max-w-xl mx-auto p-4 md:p-6">
            {view === 'history' ? (
              <div className="space-y-6">
                <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="Cari plat nomor..." className="w-full bg-white border-2 border-slate-200 rounded-2xl pl-12 pr-6 py-4.5 text-sm font-semibold outline-none focus:border-indigo-500" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                {reports.filter(r => r.plateNumber.includes(searchQuery.toUpperCase())).map(r => (
                  <div key={r.id} className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm group">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className="inline-flex px-3 py-1 rounded-full text-[9px] font-black bg-indigo-50 text-indigo-600 uppercase mb-2 tracking-widest">{r.plateNumber}</span>
                        <h3 className="font-extrabold text-xl text-slate-800">{r.vehicleType}</h3>
                        <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase">{r.month} {r.year} • {r.driverName}</p>
                      </div>
                      <div className="flex gap-2">
                        {currentUser.role === 'Driver' && <button onClick={() => deleteReport(r.id)} className="text-slate-400 hover:text-rose-500 p-2"><Trash2 size={18}/></button>}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setPreviewReport(r)} className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-4 rounded-2xl font-black text-[10px] uppercase shadow-sm transition-all active:scale-95"><Eye size={16} /> Lihat Record</button>
                        <button onClick={() => { const blob = generateWordBlob(r); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `Ceklis_${r.plateNumber}.doc`; a.click(); }} className="flex items-center justify-center gap-2 bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg transition-all active:scale-95"><ExternalLink size={16} /> Download DOC</button>
                      </div>
                      <button onClick={() => window.open(`https://wa.me/?text=*CEKLIS RANDIS BPMP*%0A*Unit:* ${r.vehicleType}%0A*Plat:* ${r.plateNumber}%0A*Bulan:* ${r.month}`)} className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg"><MessageCircle size={16} /> WhatsApp</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : view === 'form' ? (
              <div className="space-y-6">
                {currentUser.role !== 'Driver' ? (
                  <div className="bg-white rounded-[2.5rem] p-12 text-center border border-slate-200">
                    <AlertCircle size={48} className="mx-auto text-amber-500 mb-4" />
                    <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest">Akses Dibatasi</h3>
                    <p className="text-sm text-slate-500 mt-2">Halaman formulir hanya untuk peran Driver.</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Polisi</label><input className="w-full bg-slate-50 rounded-2xl px-5 py-4 text-sm font-bold uppercase border-2 border-transparent focus:border-indigo-500 outline-none" value={vehicleInfo.plateNumber} onChange={e => setVehicleInfo({...vehicleInfo, plateNumber: e.target.value.toUpperCase()})} placeholder="BE 1234 XX" /></div>
                         <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit Kendaraan</label><input className="w-full bg-slate-50 rounded-2xl px-5 py-4 text-sm font-bold uppercase border-2 border-transparent focus:border-indigo-500 outline-none" value={vehicleInfo.vehicleType} onChange={e => setVehicleInfo({...vehicleInfo, vehicleType: e.target.value.toUpperCase()})} placeholder="AVANZA / INNOVA" /></div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Odometer (KM)</label><input type="number" className="w-full bg-slate-50 rounded-2xl px-5 py-4 text-sm font-bold border-2 border-transparent focus:border-indigo-500 outline-none" value={vehicleInfo.odometer} onChange={e => setVehicleInfo({...vehicleInfo, odometer: e.target.value})} /></div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Fuel size={12}/> Takaran BBM: {getFuelLabel(vehicleInfo.fuelLevel)}</label>
                          <input type="range" min="0" max="100" step="25" className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-4" value={vehicleInfo.fuelLevel} onChange={e => setVehicleInfo({...vehicleInfo, fuelLevel: parseInt(e.target.value)})} />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="p-5 bg-indigo-50 rounded-3xl border border-indigo-100 flex items-center gap-4">
                          <div className="bg-white p-3 rounded-2xl text-indigo-600 shadow-sm"><UserIcon size={20}/></div>
                          <div>
                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Pemeriksa / Driver</p>
                            <p className="text-sm font-bold text-slate-800">{currentUser.name} <span className="text-slate-400 font-medium ml-1 text-xs">({currentUser.nip})</span></p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ketua Tim RTPK</label>
                          <select 
                            className="w-full bg-slate-50 rounded-2xl px-5 py-4 text-sm font-bold border-2 border-transparent focus:border-indigo-500 outline-none appearance-none" 
                            value={vehicleInfo.katimNip} 
                            onChange={e => {
                              const katim = PREDEFINED_KATIMS.find(k => k.nip === e.target.value);
                              if (katim) setVehicleInfo({...vehicleInfo, katimName: katim.name, katimNip: katim.nip});
                            }}
                          >
                            {PREDEFINED_KATIMS.map(k => <option key={k.nip} value={k.nip}>{k.name}</option>)}
                          </select>
                        </div>
                      </div>
                      
                      {/* Section Checklist */}
                      <div className="space-y-8 pt-4">
                        {CATEGORIES.map(cat => (
                          <div key={cat} className="space-y-4">
                            <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-2 flex items-center gap-2">
                              <ShieldCheck size={14}/> {cat}
                            </h4>
                            {CHECKLIST_ITEMS.filter(item => item.category === cat).map(item => (
                              <div key={item.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4 hover:border-indigo-200 transition-all">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                  <span className="text-xs font-black text-slate-700 uppercase tracking-tight leading-relaxed flex-1">{item.label}</span>
                                  <div className="flex gap-2 w-full sm:w-auto">
                                    <div className="flex flex-1 sm:flex-initial bg-slate-100 p-1 rounded-xl">
                                      <button onClick={() => setChecks(prev => {
                                        const existing = prev[item.id] || { week1: null, week3: null, note: '' };
                                        return { ...prev, [item.id]: { ...existing, week1: existing.week1 === 'ok' ? null : 'ok' } };
                                      })} className={`flex-1 sm:px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1.5 ${checks[item.id]?.week1 === 'ok' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                                        <CheckCircle size={14}/> W1
                                      </button>
                                      <button onClick={() => setChecks(prev => {
                                        const existing = prev[item.id] || { week1: null, week3: null, note: '' };
                                        return { ...prev, [item.id]: { ...existing, week1: existing.week1 === 'issue' ? null : 'issue' } };
                                      })} className={`flex-1 sm:px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1.5 ${checks[item.id]?.week1 === 'issue' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                                        <XCircle size={14}/> W1
                                      </button>
                                    </div>
                                    <div className="flex flex-1 sm:flex-initial bg-slate-100 p-1 rounded-xl">
                                      <button onClick={() => setChecks(prev => {
                                        const existing = prev[item.id] || { week1: null, week3: null, note: '' };
                                        return { ...prev, [item.id]: { ...existing, week3: existing.week3 === 'ok' ? null : 'ok' } };
                                      })} className={`flex-1 sm:px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1.5 ${checks[item.id]?.week3 === 'ok' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                                        <CheckCircle size={14}/> W3
                                      </button>
                                      <button onClick={() => setChecks(prev => {
                                        const existing = prev[item.id] || { week1: null, week3: null, note: '' };
                                        return { ...prev, [item.id]: { ...existing, week3: existing.week3 === 'issue' ? null : 'issue' } };
                                      })} className={`flex-1 sm:px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1.5 ${checks[item.id]?.week3 === 'issue' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                                        <XCircle size={14}/> W3
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                {item.id === 'doc_1' ? (
                                  <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500"><Calendar size={16}/></div>
                                    <input 
                                      type="date" 
                                      className="w-full bg-slate-50 rounded-2xl pl-12 pr-5 py-3.5 text-xs font-bold border-2 border-transparent focus:border-indigo-500 outline-none text-slate-700"
                                      value={checks[item.id]?.note || ''}
                                      onChange={e => setChecks(prev => ({ ...prev, [item.id]: { ...(prev[item.id] || { week1: null, week3: null, note: '' }), note: e.target.value } }))}
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-indigo-400 uppercase tracking-widest pointer-events-none">Masa STNK</div>
                                  </div>
                                ) : (
                                  <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"><MessageSquare size={16}/></div>
                                    <input 
                                      placeholder="Tambahkan keterangan temuan (opsional)..." 
                                      className="w-full bg-slate-50 rounded-2xl pl-12 pr-5 py-3.5 text-xs font-bold border-2 border-transparent focus:border-indigo-500 outline-none text-slate-700"
                                      value={checks[item.id]?.note || ''}
                                      onChange={e => setChecks(prev => ({ ...prev, [item.id]: { ...(prev[item.id] || { week1: null, week3: null, note: '' }), note: e.target.value } }))}
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2 pt-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kesimpulan / Catatan Akhir</label>
                        <textarea className="w-full bg-slate-50 rounded-3xl px-6 py-5 text-sm font-bold border-2 border-transparent focus:border-indigo-500 outline-none min-h-[120px] shadow-inner" value={additionalNote} onChange={e => setAdditionalNote(e.target.value)} placeholder="Tuliskan saran tindak lanjut atau kondisi umum kendaraan..." />
                      </div>

                      <button onClick={saveReport} disabled={isSaving} className="w-full py-6 bg-indigo-600 text-white rounded-[2.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/30 flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50">
                        {isSaving ? <Loader2 className="animate-spin" /> : <><Zap size={20} fill="white"/> Kirim Laporan Inspeksi</>}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-emerald-500 text-white p-3 rounded-2xl"><Cloud size={20}/></div>
                  <div>
                    <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Cloud Database Sync</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">SINKRONISASI DATA ARMADA</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">ID DATABASE</label>
                    <input className="w-full bg-slate-50 rounded-2xl px-5 py-4 font-bold border-2 border-transparent focus:border-indigo-500 outline-none uppercase text-indigo-600" value={syncId} onChange={e => setSyncId(e.target.value.toUpperCase())} />
                  </div>
                  <button onClick={() => { localStorage.setItem(SYNC_ID_STORAGE_KEY, syncId); pullFromCloud(); }} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                    {isSyncing ? <Loader2 className="animate-spin" size={18}/> : <><Cloud size={18}/> Hubungkan Sekarang</>}
                  </button>
                </div>
              </div>
            )}
            <div className="py-10 text-center"><p className="text-[9px] italic text-slate-400">created by.R.project v3.4</p></div>
          </main>
        </div>
      )}
    </div>
  );
};

export default App;
