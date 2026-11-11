import React, { useState, useEffect, useMemo } from 'react';
import {
  KeyRound,
  ShieldCheck,
  RotateCcw,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  RefreshCw,
  UserCheck,
  UserX,
  X,
  Lock,
  Unlock,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../services/supabase';
import { resetTeacherEraporPin } from '../../services/teacherEraporAuthService';
import { fetchAllTeachers } from '../../services/teacherStorage';
import { TeacherUser } from '../../types';

interface TeacherPinRecord {
  id: string;
  name: string;
  role_title?: string;
  status: string;
  hasPin: boolean;
  lastLoginAt?: string;
}

interface TeacherPinSecurityPanelProps {
  showNotification?: (message: string, type?: 'success' | 'info') => void;
}

export const TeacherPinSecurityPanel: React.FC<TeacherPinSecurityPanelProps> = ({
  showNotification,
}) => {
  const [teachers, setTeachers] = useState<TeacherPinRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'has_pin' | 'no_pin' | 'blocked'>('all');

  // Modal Reset PIN confirmation
  const [pendingResetTeacher, setPendingResetTeacher] = useState<TeacherPinRecord | null>(null);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  const loadTeacherPins = async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('teachers')
          .select('id, name, role_title, status, erapor_pin_hash, last_login_at')
          .order('name', { ascending: true });

        if (!error && data) {
          const mapped: TeacherPinRecord[] = data.map((row: any) => ({
            id: row.id,
            name: row.name,
            role_title: row.role_title || 'Guru',
            status: row.status || 'active',
            hasPin: Boolean(row.erapor_pin_hash),
            lastLoginAt: row.last_login_at,
          }));
          setTeachers(mapped);
          return;
        }
      }

      // Fallback: local/memory teacher store
      const localTeachers = await fetchAllTeachers();
      setTeachers(
        localTeachers.map((t: TeacherUser) => ({
          id: t.id,
          name: t.name,
          role_title: t.roleTitle || 'Guru',
          status: t.status,
          hasPin: false,
          lastLoginAt: t.lastLoginAt,
        }))
      );
    } catch (err) {
      console.error('Error fetching teacher PIN records:', err);
      showNotification?.('Gagal memuat status PIN guru.', 'info');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTeacherPins();
  }, []);

  const handleConfirmReset = async () => {
    if (!pendingResetTeacher) return;

    setIsResetting(true);
    try {
      const res = await resetTeacherEraporPin(pendingResetTeacher.id);
      if (res.success) {
        showNotification?.(
          `PIN e-Rapor ${pendingResetTeacher.name} berhasil di-reset. Guru dapat membuat PIN baru saat membuka e-Rapor.`,
          'success'
        );
        // Refresh local state
        setTeachers((prev) =>
          prev.map((t) =>
            t.id === pendingResetTeacher.id ? { ...t, hasPin: false } : t
          )
        );
        setPendingResetTeacher(null);
      } else {
        showNotification?.(res.message || 'Gagal mereset PIN e-Rapor.', 'info');
      }
    } catch (err: any) {
      console.error('Error executing reset PIN:', err);
      showNotification?.(err?.message || 'Terjadi kesalahan saat mereset PIN.', 'info');
    } finally {
      setIsResetting(false);
    }
  };

  // Filter and stats
  const stats = useMemo(() => {
    const total = teachers.length;
    const withPin = teachers.filter((t) => t.hasPin).length;
    const withoutPin = total - withPin;
    const blocked = teachers.filter((t) => t.status === 'blocked').length;
    return { total, withPin, withoutPin, blocked };
  }, [teachers]);

  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      const matchQuery =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.role_title && t.role_title.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchQuery) return false;

      if (filterStatus === 'has_pin') return t.hasPin;
      if (filterStatus === 'no_pin') return !t.hasPin;
      if (filterStatus === 'blocked') return t.status === 'blocked';
      return true;
    });
  }, [teachers, searchQuery, filterStatus]);

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-sm font-semibold">Memeriksa status keamanan PIN guru...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header Info Banner */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 shadow-xs">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Keamanan Akses & Reset PIN e-Rapor Guru</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-extrabold uppercase tracking-wider">
                Khusus Admin
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola dan setel ulang (reset) PIN jika guru lupa kata sandi PIN e-Rapor untuk membuka lembar penilaian
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadTeacherPins}
          className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs self-stretch sm:self-auto justify-center"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Segarkan</span>
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] text-slate-500 font-semibold">Total Guru</p>
            <p className="text-lg font-black text-slate-900 mt-0.5">{stats.total}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold">
            {stats.total}
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] text-emerald-800 font-semibold">PIN Terpasang</p>
            <p className="text-lg font-black text-emerald-900 mt-0.5">{stats.withPin}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] text-slate-600 font-semibold">Belum Buat PIN</p>
            <p className="text-lg font-black text-slate-800 mt-0.5">{stats.withoutPin}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-200/80 border border-slate-300 text-slate-600 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3.5 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] text-rose-800 font-semibold">Akun Diblokir</p>
            <p className="text-lg font-black text-rose-900 mt-0.5">{stats.blocked}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-rose-100 border border-rose-200 text-rose-700 flex items-center justify-center">
            <UserX className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama guru atau jabatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 placeholder:text-slate-400 shadow-xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-emerald-700 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200 shadow-xs hover:bg-slate-50'
            }`}
          >
            Semua ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('has_pin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterStatus === 'has_pin'
                ? 'bg-emerald-700 text-white font-bold shadow-xs'
                : 'text-emerald-800 hover:text-emerald-950 bg-emerald-50/70 border border-emerald-200 shadow-xs hover:bg-emerald-100'
            }`}
          >
            PIN Aktif ({stats.withPin})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('no_pin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterStatus === 'no_pin'
                ? 'bg-slate-800 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200 shadow-xs hover:bg-slate-50'
            }`}
          >
            Belum Set ({stats.withoutPin})
          </button>
          {stats.blocked > 0 && (
            <button
              type="button"
              onClick={() => setFilterStatus('blocked')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'blocked'
                  ? 'bg-rose-700 text-white font-bold shadow-xs'
                  : 'text-rose-800 hover:text-rose-950 bg-rose-50 border border-rose-200 shadow-xs hover:bg-rose-100'
              }`}
            >
              Diblokir ({stats.blocked})
            </button>
          )}
        </div>
      </div>

      {/* Teachers Table */}
      <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4 font-bold">Nama Guru & Akun</th>
                <th className="py-3.5 px-4 font-bold">Jabatan / Peran</th>
                <th className="py-3.5 px-4 font-bold text-center">Status Akun</th>
                <th className="py-3.5 px-4 font-bold text-center">Status PIN e-Rapor</th>
                <th className="py-3.5 px-4 font-bold text-right">Tindakan Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-sm text-slate-600">Tidak ada data guru yang cocok</p>
                    <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter</p>
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher) => {
                  const isBlocked = teacher.status === 'blocked';
                  return (
                    <tr key={teacher.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 uppercase shadow-xs">
                            {teacher.name.charAt(0) || 'G'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs leading-snug">{teacher.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">ID: {teacher.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-slate-700 font-medium text-xs">
                          {teacher.role_title || 'Guru Pengampu'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        {isBlocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 border border-rose-200 text-rose-700 shadow-xs">
                            <UserX className="w-3 h-3" />
                            <span>Diblokir</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-xs">
                            <UserCheck className="w-3 h-3" />
                            <span>Aktif</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {teacher.hasPin ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>PIN Terpasang</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-slate-100 border border-slate-200 text-slate-600">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Belum Diatur</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setPendingResetTeacher(teacher)}
                          disabled={!teacher.hasPin}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            teacher.hasPin
                              ? 'bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 hover:text-amber-900 cursor-pointer active:scale-95 shadow-xs'
                              : 'bg-slate-50 border border-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                          title={
                            teacher.hasPin
                              ? `Reset PIN e-Rapor untuk ${teacher.name}`
                              : 'Guru ini belum membuat PIN e-Rapor'
                          }
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset PIN</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for Reset PIN */}
      {pendingResetTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 shadow-xs">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Konfirmasi Reset PIN e-Rapor</h3>
                <p className="text-xs text-slate-500 mt-0.5">Tindakan pemulihan akses guru</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Guru Penerima:</span>
                <span className="font-bold text-slate-900 text-sm">{pendingResetTeacher.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Jabatan:</span>
                <span className="font-medium text-slate-700">{pendingResetTeacher.role_title || '-'}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed space-y-1.5 shadow-xs">
              <p className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                <span>Konsekuensi Reset:</span>
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-amber-800/90">
                <li>PIN e-Rapor lama akan dihapus dari database.</li>
                <li>Sesi e-Rapor guru yang sedang aktif akan otomatis dicabut.</li>
                <li>Guru akan langsung diminta membuat PIN baru saat membuka menu e-Rapor berikutnya.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPendingResetTeacher(null)}
                disabled={isResetting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={isResetting}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-sm shadow-amber-600/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isResetting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Mereset PIN...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Ya, Reset PIN e-Rapor</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherPinSecurityPanel;
