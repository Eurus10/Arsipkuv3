import React, { useState, useEffect } from 'react';
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  Clock,
  Sparkles,
  X,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle2,
  Building2,
  Lock,
  Unlock,
  Laptop,
  Smartphone,
  Calendar,
  Layers,
  FileSpreadsheet,
  Edit3,
  UserX,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  AccessToken,
  TokenScope,
  DeviceInfo,
  fetchAllTokens,
  createToken,
  createBulkTokens,
  updateTokenExpiry,
  updateTokenMaxDevices,
  removeDeviceFromToken,
  revokeTokenStatus,
  deleteTokenPermanently,
  generateRandomTokenCode,
} from '../../services/tokenAuthService';

interface AdminTokenManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminTokenManagerModal: React.FC<AdminTokenManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [tokens, setTokens] = useState<AccessToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Tab mode for form: 'single' | 'bulk'
  const [formMode, setFormMode] = useState<'single' | 'bulk'>('single');
  const [isCreating, setIsCreating] = useState(false);

  // Single Token Form State
  const [clientName, setClientName] = useState('');
  const [scope, setScope] = useState<TokenScope>('all');
  const [durationOption, setDurationOption] = useState<string>('180');
  const [customDays, setCustomDays] = useState<number>(30);
  const [customExpiryDate, setCustomExpiryDate] = useState<string>('');
  const [maxDevices, setMaxDevices] = useState<number>(1);
  const [customCode, setCustomCode] = useState('');
  const [tokenNote, setTokenNote] = useState('');

  // Bulk Generator State
  const [bulkCount, setBulkCount] = useState<number>(5);
  const [bulkPrefix, setBulkPrefix] = useState('AF');
  const [bulkClientBase, setBulkClientBase] = useState('Guru SDIT Al Fikri');
  const [bulkScope, setBulkScope] = useState<TokenScope>('all');
  const [bulkDuration, setBulkDuration] = useState<string>('180');
  const [bulkMaxDevices, setBulkMaxDevices] = useState<number>(1);
  const [bulkNote, setBulkNote] = useState('');
  const [generatedBulkCodes, setGeneratedBulkCodes] = useState<AccessToken[]>([]);

  // Extend / Edit Expiry Modal State
  const [editingToken, setEditingToken] = useState<AccessToken | null>(null);
  const [newExpiryOption, setNewExpiryOption] = useState<string>('180');
  const [newCustomDate, setNewCustomDate] = useState<string>('');
  const [newMaxDevicesInput, setNewMaxDevicesInput] = useState<number>(1);

  // Device inspection expansion
  const [expandedTokenCode, setExpandedTokenCode] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadTokens = async () => {
    setIsLoading(true);
    try {
      const list = await fetchAllTokens();
      setTokens(list);
    } catch (e) {
      console.error('Failed to load tokens', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTokens();
      setError('');
      setSuccessMessage('');
      setCustomCode(generateRandomTokenCode('AF'));
      setGeneratedBulkCodes([]);
      setExpandedTokenCode(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Single Token Creator
  const handleCreateSingleToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      setError('Harap isi nama klien atau nama sekolah penerima.');
      return;
    }
    const finalCode = (customCode.trim() || generateRandomTokenCode('AF')).toUpperCase();

    setError('');
    try {
      let duration: number | 'lifetime' | string = 180;
      if (durationOption === 'lifetime') {
        duration = 'lifetime';
      } else if (durationOption === 'custom_date') {
        if (!customExpiryDate) {
          setError('Harap pilih tanggal kedaluwarsa khusus.');
          return;
        }
        duration = new Date(`${customExpiryDate}T23:59:59Z`).toISOString();
      } else if (durationOption === 'custom_days') {
        duration = Math.max(1, customDays);
      } else {
        duration = parseInt(durationOption, 10);
      }

      const created = await createToken({
        code: finalCode,
        clientName: clientName.trim(),
        scope,
        durationDays: duration,
        maxDevices: Math.max(1, maxDevices),
        note: tokenNote.trim(),
      });

      setSuccessMessage(`Token "${created.code}" berhasil diterbitkan untuk ${created.clientName}! (Maks: ${created.maxDevices} Perangkat)`);
      setClientName('');
      setTokenNote('');
      setCustomCode(generateRandomTokenCode('AF'));
      setIsCreating(false);
      await loadTokens();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      setError(err?.message || 'Gagal membuat token.');
    }
  };

  // 2. Bulk Token Generator
  const handleCreateBulkTokens = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      let duration: number | 'lifetime' | string = 180;
      if (bulkDuration === 'lifetime') {
        duration = 'lifetime';
      } else {
        duration = parseInt(bulkDuration, 10);
      }

      const createdList = await createBulkTokens({
        count: bulkCount,
        prefix: bulkPrefix.trim().toUpperCase() || 'AF',
        clientBaseName: bulkClientBase.trim() || 'Klien Lisensi',
        scope: bulkScope,
        durationDays: duration,
        maxDevices: Math.max(1, bulkMaxDevices),
        note: bulkNote.trim(),
      });

      setGeneratedBulkCodes(createdList);
      setSuccessMessage(`Berhasil menerbitkan ${createdList.length} token sekaligus!`);
      await loadTokens();
      setTimeout(() => setSuccessMessage(''), 6000);
    } catch (err: any) {
      setError(err?.message || 'Gagal menerbitkan bulk token.');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleCopyAllBulk = () => {
    if (generatedBulkCodes.length === 0) return;
    const text = generatedBulkCodes
      .map((t, idx) => `${idx + 1}. [${t.code}] - ${t.clientName} (Masa Aktif: ${formatExpiry(t.expiresAt)})`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setSuccessMessage('Seluruh daftar token batch telah disalin ke clipboard!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleToggleStatus = async (token: AccessToken) => {
    const newStatus = token.status === 'active' ? 'revoked' : 'active';
    try {
      await revokeTokenStatus(token.code, newStatus);
      await loadTokens();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm(`Hapus token "${code}" secara permanen? Pengguna tidak akan dapat mengakses lagi.`)) return;
    try {
      await deleteTokenPermanently(code);
      await loadTokens();
    } catch (e) {
      console.error(e);
    }
  };

  // Kick device
  const handleKickDevice = async (tokenCode: string, deviceId: string, devName: string) => {
    if (!confirm(`Cabut akses perangkat "${devName}" dari token ini?`)) return;
    try {
      await removeDeviceFromToken(tokenCode, deviceId);
      await loadTokens();
      setSuccessMessage(`Perangkat "${devName}" berhasil dicabut dari slot token.`);
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (e) {
      console.error(e);
    }
  };

  // Open Edit / Extend Modal
  const handleOpenEditExpiry = (tok: AccessToken) => {
    setEditingToken(tok);
    setNewMaxDevicesInput(tok.maxDevices || 1);
    setNewExpiryOption('180');
    setNewCustomDate('');
  };

  const handleSaveExtendExpiry = async () => {
    if (!editingToken) return;
    try {
      let finalExp = 'lifetime';
      if (newExpiryOption === 'lifetime') {
        finalExp = 'lifetime';
      } else if (newExpiryOption === 'custom_date') {
        if (!newCustomDate) {
          alert('Pilih tanggal kedaluwarsa baru.');
          return;
        }
        finalExp = new Date(`${newCustomDate}T23:59:59Z`).toISOString();
      } else {
        const days = parseInt(newExpiryOption, 10);
        // Add from current expiration date or now
        const baseTime = editingToken.expiresAt !== 'lifetime' && new Date(editingToken.expiresAt).getTime() > Date.now()
          ? new Date(editingToken.expiresAt).getTime()
          : Date.now();
        finalExp = new Date(baseTime + days * 24 * 60 * 60 * 1000).toISOString();
      }

      await updateTokenExpiry(editingToken.code, finalExp);
      if (newMaxDevicesInput !== editingToken.maxDevices) {
        await updateTokenMaxDevices(editingToken.code, Math.max(1, newMaxDevicesInput));
      }

      setSuccessMessage(`Masa berlaku & kuota token "${editingToken.code}" berhasil diperbarui!`);
      setEditingToken(null);
      await loadTokens();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (e: any) {
      alert(e?.message || 'Gagal memperbarui masa aktif token.');
    }
  };

  const filteredTokens = tokens.filter(
    (t) =>
      t.code.toLowerCase().includes(search.toLowerCase()) ||
      t.clientName.toLowerCase().includes(search.toLowerCase()) ||
      (t.note || '').toLowerCase().includes(search.toLowerCase())
  );

  const formatExpiry = (expiresAt: string) => {
    if (expiresAt === 'lifetime') return 'Permanen (Lifetime)';
    try {
      const d = new Date(expiresAt);
      const isExpired = Date.now() > d.getTime();
      return `${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} ${isExpired ? '(Expired)' : ''}`;
    } catch {
      return expiresAt;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in text-slate-100"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !editingToken) onClose();
      }}
    >
      <div className="w-full max-w-5xl max-h-[92vh] rounded-[28px] bg-[#141824] border border-[#2A334A] shadow-2xl shadow-black/90 flex flex-col overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-[#242D42] bg-gradient-to-r from-amber-950/40 via-[#181E2E] to-[#141824] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Manajemen Token & Lisensi Komersial</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Super Admin
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Kontrol limit perangkat, live device monitor, durasi fleksibel, & bulk batch token generator
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Bar & Search */}
        <div className="px-6 py-3.5 border-b border-[#222A3C] bg-[#10131E] flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kode token, nama guru/sekolah, batch..."
              className="w-full rounded-xl border border-[#283144] bg-[#0C0F17] pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadTokens}
              className="px-3 py-2 rounded-xl bg-[#1B2232] hover:bg-[#252E44] text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              title="Refresh status real-time"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsCreating(!isCreating);
                setFormMode('single');
                setCustomCode(generateRandomTokenCode('AF'));
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{isCreating ? 'Tutup Form' : 'Terbitkan Token'}</span>
            </button>
          </div>
        </div>

        {/* Body content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form Section: Single or Bulk */}
          {isCreating && (
            <div className="rounded-2xl border border-amber-500/30 bg-[#111624] p-5 space-y-4 animate-scale-up shadow-xl">
              {/* Form Mode Selector */}
              <div className="flex items-center justify-between border-b border-[#252E44] pb-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormMode('single')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      formMode === 'single'
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'bg-[#181F30] text-slate-400 hover:text-white'
                    }`}
                  >
                    1. Terbitkan 1 Token Personal
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormMode('bulk')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      formMode === 'bulk'
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'bg-[#181F30] text-slate-400 hover:text-white'
                    }`}
                  >
                    2. Bulk / Cetak Banyak Token Sekaligus
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  {formMode === 'single' ? 'Untuk 1 Klien/Guru' : 'Cetak 5 - 50 token voucher sekaligus'}
                </span>
              </div>

              {/* Form 1: Single Token */}
              {formMode === 'single' && (
                <form onSubmit={handleCreateSingleToken} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Nama Klien / Guru / Sekolah
                      </label>
                      <input
                        type="text"
                        required
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Contoh: Bu Fatimah (SDIT Nurul Fikri)"
                        className="w-full rounded-xl border border-[#2E3954] bg-[#0E121B] px-3 py-2 text-xs text-white outline-none focus:border-amber-400 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Kode Token
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          required
                          value={customCode}
                          onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                          placeholder="AF-XXXX-XXXX"
                          className="w-full rounded-xl border border-[#2E3954] bg-[#0E121B] px-3 py-2 text-xs text-amber-300 font-mono font-bold outline-none focus:border-amber-400 uppercase"
                        />
                        <button
                          type="button"
                          onClick={() => setCustomCode(generateRandomTokenCode('AF'))}
                          className="px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                        >
                          Acak
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Batas Maksimal Perangkat
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={maxDevices}
                          onChange={(e) => setMaxDevices(parseInt(e.target.value, 10) || 1)}
                          className="w-full rounded-xl border border-[#2E3954] bg-[#0E121B] px-3 py-2 text-xs text-cyan-300 font-bold outline-none focus:border-amber-400"
                        />
                        <span className="text-[11px] text-slate-400 whitespace-nowrap">Slot Device</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Cakupan Fitur (Scope)
                      </label>
                      <select
                        value={scope}
                        onChange={(e) => setScope(e.target.value as TokenScope)}
                        className="w-full rounded-xl border border-[#2E3954] bg-[#0E121B] px-3 py-2 text-xs text-white font-bold outline-none focus:border-amber-400"
                      >
                        <option value="all">Paket Lengkap (Evaluasi + Generator Analisis)</option>
                        <option value="evaluation">Hanya Evaluasi Pembelajaran</option>
                        <option value="analysis">Hanya Generator Analisis Soal</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Durasi Masa Berlaku
                      </label>
                      <select
                        value={durationOption}
                        onChange={(e) => setDurationOption(e.target.value)}
                        className="w-full rounded-xl border border-[#2E3954] bg-[#0E121B] px-3 py-2 text-xs text-amber-300 font-bold outline-none focus:border-amber-400"
                      >
                        <option value="7">Trial / Demo (7 Hari)</option>
                        <option value="30">1 Bulan (30 Hari)</option>
                        <option value="90">3 Bulan (90 Hari)</option>
                        <option value="180">1 Semester (6 Bulan / 180 Hari)</option>
                        <option value="365">1 Tahun Ajaran (365 Hari)</option>
                        <option value="custom_days">Kustom Jumlah Hari...</option>
                        <option value="custom_date">Pilih Tanggal Kedaluwarsa Pasti...</option>
                        <option value="lifetime">Permanen (Seumur Hidup / Lifetime)</option>
                      </select>
                    </div>

                    {durationOption === 'custom_days' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Masukkan Jumlah Hari
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={3650}
                          value={customDays}
                          onChange={(e) => setCustomDays(parseInt(e.target.value, 10) || 1)}
                          className="w-full rounded-xl border border-amber-500/40 bg-[#0E121B] px-3 py-2 text-xs text-amber-300 font-bold outline-none"
                        />
                      </div>
                    )}

                    {durationOption === 'custom_date' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Pilih Tanggal Hangus
                        </label>
                        <input
                          type="date"
                          value={customExpiryDate}
                          onChange={(e) => setCustomExpiryDate(e.target.value)}
                          className="w-full rounded-xl border border-amber-500/40 bg-[#0E121B] px-3 py-2 text-xs text-amber-300 font-bold outline-none"
                        />
                      </div>
                    )}

                    <div className="sm:col-span-2 lg:col-span-3">
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Catatan Transaksi / Keterangan (Opsional)
                      </label>
                      <input
                        type="text"
                        value={tokenNote}
                        onChange={(e) => setTokenNote(e.target.value)}
                        placeholder="Contoh: Pembayaran Transfer Bank Mandiri #TRX-9901"
                        className="w-full rounded-xl border border-[#2E3954] bg-[#0E121B] px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#232B3D]">
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black cursor-pointer shadow-lg shadow-amber-500/20"
                    >
                      Simpan & Terbitkan Token
                    </button>
                  </div>
                </form>
              )}

              {/* Form 2: Bulk / Mass Generator */}
              {formMode === 'bulk' && (
                <form onSubmit={handleCreateBulkTokens} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Jumlah Token Dibuat
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        required
                        value={bulkCount}
                        onChange={(e) => setBulkCount(parseInt(e.target.value, 10) || 1)}
                        className="w-full rounded-xl border border-[#2E3954] bg-[#0E121B] px-3 py-2 text-xs text-amber-300 font-bold outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Prefix Kode Token
                      </label>
                      <input
                        type="text"
                        required
                        value={bulkPrefix}
                        onChange={(e) => setBulkPrefix(e.target.value.toUpperCase())}
                        placeholder="AF atau SDIT"
                        className="w-full rounded-xl border border-[#2E3954] bg-[#0E121B] px-3 py-2 text-xs text-amber-300 font-mono font-bold outline-none focus:border-amber-400 uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Maksimal Perangkat Tiap Token
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        required
                        value={bulkMaxDevices}
                        onChange={(e) => setBulkMaxDevices(parseInt(e.target.value, 10) || 1)}
                        className="w-full rounded-xl border border-[#2E3954] bg-[#0E121B] px-3 py-2 text-xs text-cyan-300 font-bold outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Durasi Masa Berlaku
                      </label>
                      <select
                        value={bulkDuration}
                        onChange={(e) => setBulkDuration(e.target.value)}
                        className="w-full rounded-xl border border-[#2E3954] bg-[#0E121B] px-3 py-2 text-xs text-amber-300 font-bold outline-none focus:border-amber-400"
                      >
                        <option value="7">Demo 7 Hari</option>
                        <option value="30">1 Bulan</option>
                        <option value="180">1 Semester (180 Hari)</option>
                        <option value="365">1 Tahun Ajaran (365 Hari)</option>
                        <option value="lifetime">Permanen</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Nama / Judul Kumpulan Lisensi
                      </label>
                      <input
                        type="text"
                        required
                        value={bulkClientBase}
                        onChange={(e) => setBulkClientBase(e.target.value)}
                        placeholder="Contoh: Guru SDIT Al-Ihsan Batch 1"
                        className="w-full rounded-xl border border-[#2E3954] bg-[#0E121B] px-3 py-2 text-xs text-white outline-none focus:border-amber-400 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Cakupan Fitur
                      </label>
                      <select
                        value={bulkScope}
                        onChange={(e) => setBulkScope(e.target.value as TokenScope)}
                        className="w-full rounded-xl border border-[#2E3954] bg-[#0E121B] px-3 py-2 text-xs text-white font-bold outline-none focus:border-amber-400"
                      >
                        <option value="all">Paket Lengkap</option>
                        <option value="evaluation">Hanya Evaluasi</option>
                        <option value="analysis">Hanya Analisis</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Catatan Batch (Opsional)
                      </label>
                      <input
                        type="text"
                        value={bulkNote}
                        onChange={(e) => setBulkNote(e.target.value)}
                        placeholder="Contoh: Promo Workshop"
                        className="w-full rounded-xl border border-[#2E3954] bg-[#0E121B] px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-[#232B3D]">
                    <span className="text-[11px] text-slate-400">
                      Sistem akan membuat <b>{bulkCount}</b> kode token unik otomatis.
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsCreating(false)}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black cursor-pointer shadow-lg shadow-amber-500/20"
                      >
                        Generate {bulkCount} Token Sekaligus
                      </button>
                    </div>
                  </div>

                  {/* Generated Bulk Result Box */}
                  {generatedBulkCodes.length > 0 && (
                    <div className="mt-4 p-4 rounded-xl bg-[#090C13] border border-amber-500/40 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          Hasil Batch: {generatedBulkCodes.length} Token Baru
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyAllBulk}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin Semua Daftar Token</span>
                        </button>
                      </div>
                      <div className="max-h-36 overflow-y-auto divide-y divide-slate-800 text-xs font-mono">
                        {generatedBulkCodes.map((tok, i) => (
                          <div key={tok.code} className="py-1.5 flex items-center justify-between">
                            <span className="text-amber-300 font-bold">
                              {i + 1}. {tok.code} ({tok.clientName})
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyCode(tok.code)}
                              className="text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 text-[11px]"
                            >
                              Salin
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </form>
              )}
            </div>
          )}

          {/* Tokens List Table */}
          <div className="rounded-2xl border border-[#232B3D] bg-[#10131E] overflow-hidden shadow-xl">
            <div className="px-5 py-3.5 border-b border-[#232B3D] flex items-center justify-between text-xs font-bold text-slate-300">
              <div className="flex items-center gap-2">
                <span>Daftar Token Lisensi ({filteredTokens.length})</span>
                <span className="text-[11px] text-slate-500 hidden sm:inline">• Klik nama atau perangkat untuk melihat detail</span>
              </div>
              <span className="text-[11px] text-amber-400 font-semibold">Real-Time Sync Aktif</span>
            </div>

            <div className="divide-y divide-[#1D2436] max-h-[460px] overflow-y-auto">
              {filteredTokens.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Tidak ada token yang cocok dengan filter pencarian.
                </div>
              ) : (
                filteredTokens.map((tok) => {
                  const isRevoked = tok.status === 'revoked';
                  const isExp =
                    tok.expiresAt !== 'lifetime' && Date.now() > new Date(tok.expiresAt).getTime();
                  const registeredDevices = tok.devices || [];
                  const maxDev = tok.maxDevices || 1;
                  const isExpanded = expandedTokenCode === tok.code;

                  return (
                    <div key={tok.code} className="hover:bg-[#141926] transition">
                      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Token Code Pill */}
                            <button
                              type="button"
                              onClick={() => handleCopyCode(tok.code)}
                              className="font-mono font-black text-sm px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 cursor-pointer transition"
                              title="Klik untuk Salin Token"
                            >
                              <span>{tok.code}</span>
                              {copiedCode === tok.code ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-amber-400 opacity-70" />
                              )}
                            </button>

                            {/* Status Badge */}
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                isRevoked
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  : isExp
                                  ? 'bg-slate-700 text-slate-300'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {isRevoked ? 'Dinonaktifkan' : isExp ? 'Expired' : 'Aktif'}
                            </span>

                            {/* Scope Badge */}
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                              {tok.scope === 'all'
                                ? 'Paket Lengkap'
                                : tok.scope === 'evaluation'
                                ? 'Evaluasi'
                                : 'Analisis'}
                            </span>

                            {/* Device Usage Slot Indicator */}
                            <button
                              type="button"
                              onClick={() => setExpandedTokenCode(isExpanded ? null : tok.code)}
                              className={`text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1 border transition cursor-pointer ${
                                registeredDevices.length >= maxDev
                                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                                  : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                              }`}
                              title="Lihat Perangkat Terdaftar"
                            >
                              <Laptop className="w-3 h-3" />
                              <span>
                                {registeredDevices.length} / {maxDev} Device
                              </span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-slate-400 text-[11px]">
                            <span className="font-bold text-white flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-cyan-400" />
                              {tok.clientName}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400" />
                              {formatExpiry(tok.expiresAt)}
                            </span>
                            {tok.note && (
                              <>
                                <span>•</span>
                                <span className="italic text-slate-400">"{tok.note}"</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          {/* Extend / Edit Expiry Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditExpiry(tok)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition border border-slate-700"
                            title="Ubah Masa Aktif & Kuota Perangkat"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">Perpanjang / Edit</span>
                          </button>

                          {/* Toggle Revoke / Active */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(tok)}
                            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 cursor-pointer transition ${
                              tok.status === 'active'
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            }`}
                            title={tok.status === 'active' ? 'Nonaktifkan Token (Cabut Akses Klien)' : 'Aktifkan Kembali'}
                          >
                            {tok.status === 'active' ? (
                              <Lock className="w-3.5 h-3.5" />
                            ) : (
                              <Unlock className="w-3.5 h-3.5" />
                            )}
                            <span className="hidden sm:inline">
                              {tok.status === 'active' ? 'Revoke' : 'Aktifkan'}
                            </span>
                          </button>

                          {/* Delete Permanently */}
                          <button
                            type="button"
                            onClick={() => handleDelete(tok.code)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 cursor-pointer transition"
                            title="Hapus Permanen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Device Monitor Sub-Drawer (If Expanded) */}
                      {isExpanded && (
                        <div className="px-5 py-3 bg-[#0A0D15] border-t border-[#1C2335] text-xs space-y-2 animate-fade-in">
                          <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px]">
                            <span>Daftar Perangkat yang Menggunakan Token Ini ({registeredDevices.length} / {maxDev})</span>
                            <span className="text-[10px] text-slate-500">
                              Admin dapat mencabut (kick) perangkat jika slot penuh
                            </span>
                          </div>

                          {registeredDevices.length === 0 ? (
                            <div className="py-2 text-slate-500 italic text-[11px]">
                              Belum ada perangkat yang mengaktifkan token ini.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {registeredDevices.map((dev) => (
                                <div
                                  key={dev.deviceId}
                                  className="p-2.5 rounded-xl bg-[#121622] border border-[#212A3D] flex items-center justify-between gap-2"
                                >
                                  <div className="space-y-0.5">
                                    <div className="font-bold text-white flex items-center gap-1.5">
                                      <Laptop className="w-3.5 h-3.5 text-cyan-400" />
                                      <span>{dev.deviceName}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      Browser: {dev.browser} • Aktif:{' '}
                                      {new Date(dev.lastActiveAt || dev.activatedAt).toLocaleDateString('id-ID', {
                                        day: 'numeric',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleKickDevice(tok.code, dev.deviceId, dev.deviceName)}
                                    className="px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition flex-shrink-0"
                                    title="Cabut akses perangkat ini"
                                  >
                                    <UserX className="w-3 h-3" />
                                    <span>Kick</span>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#242D42] bg-[#10131E] flex items-center justify-between text-xs text-slate-400 flex-shrink-0">
          <span>Ketika token di-<b>Revoke</b>, pengguna yang sedang membuka menu akan otomatis terlempar keluar seketika.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer transition"
          >
            Tutup Panel
          </button>
        </div>
      </div>

      {/* Modal Edit / Extend Token Duration & Devices */}
      {editingToken && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in text-slate-100">
          <div className="w-full max-w-md rounded-2xl bg-[#141824] border border-[#2D3850] shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#252E44] pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <span>Perpanjang / Edit Token [{editingToken.code}]</span>
              </h4>
              <button
                type="button"
                onClick={() => setEditingToken(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-1">
              <div>Klien: <b className="text-white">{editingToken.clientName}</b></div>
              <div>Masa Aktif Saat Ini: <b className="text-amber-400">{formatExpiry(editingToken.expiresAt)}</b></div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Pilihan Perpanjangan Masa Berlaku
                </label>
                <select
                  value={newExpiryOption}
                  onChange={(e) => setNewExpiryOption(e.target.value)}
                  className="w-full rounded-xl border border-[#2E3954] bg-[#0E121B] px-3 py-2 text-xs text-amber-300 font-bold outline-none"
                >
                  <option value="30">+ 1 Bulan (30 Hari)</option>
                  <option value="90">+ 3 Bulan (90 Hari)</option>
                  <option value="180">+ 1 Semester (180 Hari)</option>
                  <option value="365">+ 1 Tahun Ajaran (365 Hari)</option>
                  <option value="custom_date">Tentukan Tanggal Kedaluwarsa Baru...</option>
                  <option value="lifetime">Ubah Menjadi Permanen (Lifetime)</option>
                </select>
              </div>

              {newExpiryOption === 'custom_date' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Tanggal Kedaluwarsa Baru
                  </label>
                  <input
                    type="date"
                    value={newCustomDate}
                    onChange={(e) => setNewCustomDate(e.target.value)}
                    className="w-full rounded-xl border border-amber-500/40 bg-[#0E121B] px-3 py-2 text-xs text-amber-300 font-bold outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Kuota Maksimal Perangkat (Slot Device)
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={newMaxDevicesInput}
                  onChange={(e) => setNewMaxDevicesInput(parseInt(e.target.value, 10) || 1)}
                  className="w-full rounded-xl border border-[#2E3954] bg-[#0E121B] px-3 py-2 text-xs text-cyan-300 font-bold outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#232B3D]">
              <button
                type="button"
                onClick={() => setEditingToken(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveExtendExpiry}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
