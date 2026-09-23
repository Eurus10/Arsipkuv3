import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Laptop,
  Smartphone,
  Tablet,
  Search,
  Check,
  X,
  AlertCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
  Edit3,
  Radio,
  Filter,
  Eye,
} from 'lucide-react';

import {
  TeacherUser,
  TeacherDeviceSession,
} from '../../types';

import {
  fetchAllTeachers,
  subscribeToTeachers,
  addTeacher,
  updateTeacher,
  setTeacherLoginAliases,
  toggleTeacherStatus,
  kickTeacherDevice,
  deleteTeacher,
  bootstrapTeachersToSupabase,
} from '../../services/teacherStorage';

export type TeacherFilterStatus =
  | 'all'
  | 'online'
  | 'offline'
  | 'never_logged_in'
  | 'blocked';

interface AdminTeacherManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPreviewTeacher?: (teacher: TeacherUser) => void;
}

export const AdminTeacherManagerModal: React.FC<
  AdminTeacherManagerModalProps
> = ({ isOpen, onClose, onPreviewTeacher }) => {
  // =====================================================
  // STATE
  // =====================================================

  const [teachers, setTeachers] =
    useState<TeacherUser[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [search, setSearch] =
    useState('');

  const [filterStatus, setFilterStatus] =
    useState<TeacherFilterStatus>('all');

  // Form State
  const [isAdding, setIsAdding] =
    useState(false);

  const [name, setName] =
    useState('');

  const [roleTitle, setRoleTitle] =
    useState('');

  const [maxDevices, setMaxDevices] =
    useState<number>(2);

  const [note, setNote] =
    useState('');

  // Edit State
  const [editingTeacher, setEditingTeacher] =
    useState<TeacherUser | null>(null);

  const [editName, setEditName] =
    useState('');

  const [editRoleTitle, setEditRoleTitle] =
    useState('');

  const [editMaxDevices, setEditMaxDevices] =
    useState<number>(2);

  const [editNote, setEditNote] =
    useState('');

  const [editAliases, setEditAliases] =
    useState<string[]>([]);

  const [newAlias, setNewAlias] =
    useState('');

  const [expandedTeacherId, setExpandedTeacherId] =
    useState<string | null>(null);

  const [error, setError] =
    useState('');

  const [successMessage, setSuccessMessage] =
    useState('');

  const [processingTeacherId, setProcessingTeacherId] =
    useState<string | null>(null);

  const [processingDeviceId, setProcessingDeviceId] =
    useState<string | null>(null);

  type PendingConfirmation =
    | { type: 'delete'; teacher: TeacherUser }
    | { type: 'kick'; teacherId: string; deviceId: string; teacherName: string; deviceName: string }
    | null;

  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation>(null);

  // =====================================================
  // SUPABASE REALTIME LISTENER
  // =====================================================

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    // Initial check & bootstrap if empty
    fetchAllTeachers()
      .then(async (list) => {
        if (!isMounted) return;

        if (list.length === 0) {
          try {
            const seeded =
              await bootstrapTeachersToSupabase();

            if (!isMounted) return;

            setTeachers(seeded);
          } catch (bootstrapError: any) {
            console.error(
              'Error bootstrapping teachers:',
              bootstrapError
            );

            if (!isMounted) return;

            setError(
              bootstrapError?.message ||
                'Gagal membuat data awal whitelist guru.'
            );

            setTeachers([]);
          }
        } else {
          setTeachers(list);
        }

        if (isMounted) {
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error(
          'Error loading initial teachers:',
          err
        );

        if (!isMounted) return;

        setError(
          err?.message ||
            'Gagal mengambil data whitelist guru dari Supabase.'
        );

        setTeachers([]);
        setIsLoading(false);
      });

    // Subscribe to Supabase Realtime for live updates
    const unsubscribe =
      subscribeToTeachers(
        (liveTeachers) => {
          if (!isMounted) return;

          setTeachers(liveTeachers);
          setIsLoading(false);
        }
      );

    return () => {
      isMounted = false;

      try {
        unsubscribe?.();
      } catch (unsubscribeError) {
        console.warn(
          'Failed to unsubscribe teacher listener:',
          unsubscribeError
        );
      }
    };
  }, [isOpen]);

  // =====================================================
  // COUNTS
  //
  // IMPORTANT:
  // Semua Hook harus berada SEBELUM:
  // if (!isOpen) return null;
  // =====================================================

  const counts = useMemo(() => {
    let online = 0;
    let offline = 0;
    let neverLoggedIn = 0;
    let blocked = 0;

    teachers.forEach((t) => {
      const activeCount =
        t.activeSessions?.length || 0;

      const isBlocked =
        t.status === 'blocked';

      const hasLoggedIn = Boolean(
        t.lastLoginAt &&
          t.lastLoginAt.trim() !== ''
      );

      if (isBlocked) {
        blocked++;
      } else if (activeCount > 0) {
        online++;
      } else if (hasLoggedIn) {
        offline++;
      }

      if (!hasLoggedIn) {
        neverLoggedIn++;
      }
    });

    return {
      all: teachers.length,
      online,
      offline,
      neverLoggedIn,
      blocked,
    };
  }, [teachers]);

  // =====================================================
  // FILTERED TEACHERS
  // =====================================================

  const filteredTeachers = useMemo(() => {
    const q = search
      .toLowerCase()
      .trim();

    return teachers.filter((t) => {
      const normalizedName =
        t.normalizedName ||
        t.name ||
        '';

      const roleTitle =
        t.roleTitle || '';

      const note =
        t.note || '';

      const aliasesText =
        (t.loginAliases || []).join(' ');

      const matchesSearch =
        !q ||
        t.name
          .toLowerCase()
          .includes(q) ||
        normalizedName
          .toLowerCase()
          .includes(q) ||
        roleTitle
          .toLowerCase()
          .includes(q) ||
        note
          .toLowerCase()
          .includes(q) ||
        aliasesText
          .toLowerCase()
          .includes(q) ||
        t.id
          .toLowerCase()
          .includes(q);

      if (!matchesSearch) {
        return false;
      }

      const activeCount =
        t.activeSessions?.length || 0;

      const isBlocked =
        t.status === 'blocked';

      const hasLoggedIn = Boolean(
        t.lastLoginAt &&
          t.lastLoginAt.trim() !== ''
      );

      if (
        filterStatus === 'online'
      ) {
        return (
          !isBlocked &&
          activeCount > 0
        );
      }

      if (
        filterStatus === 'offline'
      ) {
        return (
          !isBlocked &&
          activeCount === 0 &&
          hasLoggedIn
        );
      }

      if (
        filterStatus ===
        'never_logged_in'
      ) {
        return !hasLoggedIn;
      }

      if (
        filterStatus === 'blocked'
      ) {
        return isBlocked;
      }

      return true;
    });
  }, [
    teachers,
    search,
    filterStatus,
  ]);

  // =====================================================
  // TOTAL ACTIVE SESSIONS
  // =====================================================

  const totalActiveSessions =
    useMemo(() => {
      return teachers.reduce(
        (acc, t) =>
          acc +
          (t.activeSessions
            ?.length || 0),
        0
      );
    }, [teachers]);

  // =====================================================
  // CONDITIONAL RETURN
  //
  // This MUST be AFTER every Hook.
  // =====================================================

  if (!isOpen) {
    return null;
  }

  // =====================================================
  // ADD TEACHER
  // =====================================================

  const handleAddTeacher = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError('');
    setSuccessMessage('');

    if (!name.trim()) {
      setError(
        'Nama guru wajib diisi.'
      );
      return;
    }

    try {
      await addTeacher({
        name: name.trim(),
        roleTitle:
          roleTitle.trim() ||
          'Guru SDIT AL FIKRI',
        maxDevices,
        note: note.trim(),
      });

      setSuccessMessage(
        `Guru "${name.trim()}" berhasil ditambahkan ke whitelist.`
      );

      setName('');
      setRoleTitle('');
      setNote('');
      setMaxDevices(2);
      setIsAdding(false);
    } catch (err: any) {
      console.error(
        'Error adding teacher:',
        err
      );

      setError(
        err?.message ||
          'Gagal menambahkan guru.'
      );
    }
  };

  // =====================================================
  // SAVE EDIT
  // =====================================================

  const handleSaveEdit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!editingTeacher) {
      return;
    }

    setError('');
    setSuccessMessage('');

    if (!editName.trim()) {
      setError(
        'Nama guru tidak boleh kosong.'
      );
      return;
    }

    try {
      await updateTeacher(
        editingTeacher.id,
        {
          name: editName.trim(),
          roleTitle:
            editRoleTitle.trim(),
          maxDevices:
            editMaxDevices,
          note: editNote.trim(),
        }
      );

      await setTeacherLoginAliases(
        editingTeacher.id,
        editAliases
      );

      setSuccessMessage(
        `Data guru "${editName.trim()}" berhasil diperbarui.`
      );

      setEditingTeacher(null);
    } catch (err: any) {
      console.error(
        'Error updating teacher:',
        err
      );

      setError(
        err?.message ||
          'Gagal memperbarui data guru.'
      );
    }
  };

  // =====================================================
  // TOGGLE STATUS
  // =====================================================

  const handleToggleStatus = async (
    t: TeacherUser
  ) => {
    setError('');
    setSuccessMessage('');

    const nextStatus =
      t.status === 'active'
        ? 'blocked'
        : 'active';

    try {
      await toggleTeacherStatus(
        t.id,
        nextStatus
      );

      setSuccessMessage(
        nextStatus === 'blocked'
          ? `Akses ${t.name} dinonaktifkan (diblokir).`
          : `Akses ${t.name} diaktifkan kembali.`
      );
    } catch (err: any) {
      console.error(
        'Error toggling teacher status:',
        err
      );

      setError(
        err?.message ||
          'Gagal mengubah status akses.'
      );
    }
  };

  // =====================================================
  // KICK DEVICE
  // =====================================================

  const handleKickDevice = async (
    teacherId: string,
    deviceId: string
  ) => {
    if (!deviceId) {
      setError('ID perangkat tidak ditemukan. Sesi tidak dapat dicabut.');
      return;
    }

    const teacher = teachers.find((item) => item.id === teacherId);
    const session = teacher?.activeSessions?.find(
      (item) => item.deviceId === deviceId
    );

    setPendingConfirmation({
      type: 'kick',
      teacherId,
      deviceId,
      teacherName: teacher?.name || 'Guru',
      deviceName: session?.deviceName || 'Perangkat ini',
    });
  };

  const executeKickDevice = async (
    teacherId: string,
    deviceId: string
  ) => {
    setPendingConfirmation(null);
    setError('');
    setSuccessMessage('');
    setProcessingTeacherId(teacherId);
    setProcessingDeviceId(deviceId);

    try {
      await kickTeacherDevice(teacherId, deviceId);

      setTeachers((current) =>
        current.map((teacher) =>
          teacher.id === teacherId
            ? {
                ...teacher,
                activeSessions: (teacher.activeSessions || []).filter(
                  (session) => session.deviceId !== deviceId
                ),
              }
            : teacher
        )
      );

      setSuccessMessage('Sesi perangkat berhasil dicabut.');
    } catch (err: any) {
      console.error('Error kicking teacher device:', err);
      setError(err?.message || 'Gagal mengeluarkan perangkat.');
    } finally {
      setProcessingTeacherId(null);
      setProcessingDeviceId(null);
    }
  };

  // =====================================================
  // DELETE TEACHER
  // =====================================================

  const handleDeleteTeacher = async (
    t: TeacherUser
  ) => {
    setPendingConfirmation({
      type: 'delete',
      teacher: t,
    });
  };

  const executeDeleteTeacher = async (t: TeacherUser) => {
    setPendingConfirmation(null);
    setError('');
    setSuccessMessage('');
    setProcessingTeacherId(t.id);

    try {
      await deleteTeacher(t.id);

      setTeachers((current) =>
        current.filter((teacher) => teacher.id !== t.id)
      );

      if (expandedTeacherId === t.id) {
        setExpandedTeacherId(null);
      }

      if (editingTeacher?.id === t.id) {
        setEditingTeacher(null);
      }

      setSuccessMessage(`Guru "${t.name}" berhasil dihapus.`);
    } catch (err: any) {
      console.error('Error deleting teacher:', err);
      setError(err?.message || 'Gagal menghapus guru.');
    } finally {
      setProcessingTeacherId(null);
    }
  };

  // =====================================================
  // DEVICE ICON
  // =====================================================

  const getDeviceIcon = (
    session: TeacherDeviceSession
  ) => {
    const type =
      session.deviceType
        ?.toLowerCase() || '';

    const deviceName =
      (
        session.deviceName || ''
      ).toLowerCase();

    if (
      type === 'mobile' ||
      deviceName.includes(
        'phone'
      ) ||
      deviceName.includes(
        'android'
      ) ||
      deviceName.includes('ios')
    ) {
      return (
        <Smartphone className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
      );
    }

    if (
      type === 'tablet' ||
      deviceName.includes(
        'ipad'
      ) ||
      deviceName.includes(
        'tablet'
      )
    ) {
      return (
        <Tablet className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
      );
    }

    return (
      <Laptop className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
    );
  };

  // =====================================================
  // DEVICE LABEL
  // =====================================================

  const getDeviceLabel = (
    session: TeacherDeviceSession
  ) => {
    const type =
      session.deviceType
        ?.toLowerCase() || '';

    if (type === 'mobile') {
      return 'HP / Smartphone';
    }

    if (type === 'tablet') {
      return 'Tablet / iPad';
    }

    if (type === 'desktop') {
      return 'Laptop / PC';
    }

    return 'Perangkat';
  };

  // =====================================================
  // ALIAS LOGIN HELPERS
  // =====================================================

  const addEditAlias = () => {
    const value = newAlias.trim();

    if (!value) return;

    const normalized = value.toLowerCase().replace(/\s+/g, ' ');
    const exists = editAliases.some(
      (alias) => alias.trim().toLowerCase().replace(/\s+/g, ' ') === normalized
    );

    if (exists) {
      setError(`Alias "${value}" sudah ada pada guru ini.`);
      return;
    }

    setEditAliases((current) => [...current, value]);
    setNewAlias('');
    setError('');
  };

  const removeEditAlias = (aliasToRemove: string) => {
    setEditAliases((current) =>
      current.filter((alias) => alias !== aliasToRemove)
    );
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#181B26] border border-[#272D3E] rounded-3xl p-5 sm:p-7 shadow-2xl my-8 flex flex-col max-h-[90vh]">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="relative flex flex-col sm:flex-row sm:items-start gap-4 pb-5 border-b border-[#242A3C] mb-5 pr-0 sm:pr-12">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/10">
            <Users className="w-6 h-6" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider max-w-full">
                <ShieldCheck className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">Whitelist Guru SDIT AL FIKRI</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[10px] font-semibold">
                <Radio className="w-2.5 h-2.5 text-cyan-400 animate-pulse flex-shrink-0" />
                <span>Realtime Sync</span>
              </div>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-white font-heading leading-tight break-words">
              Kelola Akses & Monitoring Perangkat Guru
            </h2>

            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-5">
              Kelola identitas login guru, alias, status akses, perangkat aktif, dan kuota sesi dalam satu panel.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel whitelist guru"
            className="absolute top-0 right-0 w-9 h-9 rounded-full bg-[#1F2332] hover:bg-[#2A3044] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* =================================================
            QUICK STATS
        ================================================= */}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">

          {/* TOTAL GURU */}

          <button
            type="button"
            onClick={() =>
              setFilterStatus('all')
            }
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-[#181D2E] border-indigo-500/50 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/30'
                : 'bg-[#12141D] border-[#242A3D] hover:border-[#353D54]'
            }`}
          >
            <div className="flex items-center gap-3">

              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4" />
              </div>

              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Total Guru
                </p>

                <p className="text-base font-extrabold text-white">
                  {teachers.length}
                </p>
              </div>

            </div>
          </button>

          {/* ONLINE */}

          <button
            type="button"
            onClick={() =>
              setFilterStatus(
                filterStatus === 'online'
                  ? 'all'
                  : 'online'
              )
            }
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              filterStatus === 'online'
                ? 'bg-[#142323] border-emerald-500/50 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                : 'bg-[#12141D] border-[#242A3D] hover:border-[#353D54]'
            }`}
          >
            <div className="flex items-center gap-3">

              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>

              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Guru Aktif (Online)
                </p>

                <p className="text-base font-extrabold text-emerald-400">
                  {counts.online}
                </p>
              </div>

            </div>
          </button>

          {/* SESI TERHUBUNG */}

          <button
            type="button"
            onClick={() =>
              setFilterStatus('all')
            }
            className="p-3 rounded-2xl border text-left transition-all cursor-pointer bg-[#12141D] border-[#242A3D] hover:border-[#353D54]"
            title="Menampilkan semua guru yang memiliki sesi aktif"
          >
            <div className="flex items-center gap-3">

              <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center flex-shrink-0">
                <Laptop className="w-4 h-4" />
              </div>

              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Sesi Terhubung
                </p>

                <p className="text-base font-extrabold text-cyan-300">
                  {totalActiveSessions} Perangkat
                </p>
              </div>

            </div>
          </button>

          {/* BLOCKED */}

          <button
            type="button"
            onClick={() =>
              setFilterStatus(
                filterStatus === 'blocked'
                  ? 'all'
                  : 'blocked'
              )
            }
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              filterStatus === 'blocked'
                ? 'bg-[#261318] border-rose-500/50 shadow-md shadow-rose-500/10 ring-1 ring-rose-500/30'
                : 'bg-[#12141D] border-[#242A3D] hover:border-[#353D54]'
            }`}
          >
            <div className="flex items-center gap-3">

              <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center flex-shrink-0">
                <UserX className="w-4 h-4" />
              </div>

              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Diblokir
                </p>

                <p className="text-base font-extrabold text-rose-400">
                  {counts.blocked}
                </p>
              </div>

            </div>
          </button>

        </div>

        {/* =================================================
            NOTIFICATIONS
        ================================================= */}

        {error && (
          <div className="p-3 mb-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>

            <button
              type="button"
              onClick={() =>
                setError('')
              }
              className="ml-auto text-rose-300 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="p-3 mb-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />

            <span>
              {successMessage}
            </span>

            <button
              type="button"
              onClick={() =>
                setSuccessMessage('')
              }
              className="ml-auto text-emerald-300 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* =================================================
            SEARCH & ADD
        ================================================= */}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-3">

          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Cari nama, alias, ID guru, jabatan, atau catatan..."
              className="w-full bg-[#12141D] border border-[#2B3144] focus:border-emerald-400 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2">

            <button
              type="button"
              onClick={() => {
                setIsAdding(!isAdding);
                setEditingTeacher(null);
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-2xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />

              <span>
                {isAdding
                  ? 'Tutup Form'
                  : 'Tambah Guru Baru'}
              </span>
            </button>

          </div>
        </div>

        {/* =================================================
            FILTER PILLS
        ================================================= */}

        <div className="flex flex-wrap items-center gap-2 min-h-10 py-1 mb-4">

          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 mr-1 flex-shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">
              Filter:
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              setFilterStatus('all')
            }
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-slate-200 text-slate-950 shadow-sm'
                : 'bg-[#12141D] text-slate-400 hover:text-white border border-[#242A3D]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />

            <span>
              Semua
            </span>

            <span
              className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
                filterStatus === 'all'
                  ? 'bg-slate-950/15 text-slate-950'
                  : 'bg-[#1F2332] text-slate-300'
              }`}
            >
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setFilterStatus('online')
            }
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              filterStatus === 'online'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-[#12141D] text-emerald-400 hover:text-emerald-300 border border-[#242A3D]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />

            <span>
              Sesi Aktif (Online)
            </span>

            <span
              className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
                filterStatus === 'online'
                  ? 'bg-slate-950/15 text-slate-950'
                  : 'bg-emerald-500/20 text-emerald-300'
              }`}
            >
              {counts.online}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setFilterStatus('offline')
            }
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              filterStatus === 'offline'
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                : 'bg-[#12141D] text-indigo-400 hover:text-indigo-300 border border-[#242A3D]'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />

            <span>
              Pernah Login (Offline)
            </span>

            <span
              className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
                filterStatus === 'offline'
                  ? 'bg-white/20 text-white'
                  : 'bg-indigo-500/20 text-indigo-300'
              }`}
            >
              {counts.offline}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setFilterStatus(
                'never_logged_in'
              )
            }
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              filterStatus ===
              'never_logged_in'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-[#12141D] text-amber-400 hover:text-amber-300 border border-[#242A3D]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />

            <span>
              Belum Pernah Login
            </span>

            <span
              className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
                filterStatus ===
                'never_logged_in'
                  ? 'bg-slate-950/15 text-slate-950'
                  : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {counts.neverLoggedIn}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setFilterStatus('blocked')
            }
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              filterStatus === 'blocked'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'bg-[#12141D] text-rose-400 hover:text-rose-300 border border-[#242A3D]'
            }`}
          >
            <UserX className="w-3.5 h-3.5" />

            <span>
              Diblokir
            </span>

            <span
              className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
                filterStatus === 'blocked'
                  ? 'bg-white/20 text-white'
                  : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              {counts.blocked}
            </span>
          </button>

        </div>

        {/* =================================================
            FORM TAMBAH GURU
        ================================================= */}

        {isAdding && (
          <form
            onSubmit={handleAddTeacher}
            className="p-4 sm:p-5 mb-5 rounded-2xl bg-[#12141D] border border-emerald-500/30 space-y-3 animate-fade-in"
          >
            <div className="flex items-center justify-between">

              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Tambah Guru ke Whitelist
              </h3>

              <button
                type="button"
                onClick={() =>
                  setIsAdding(false)
                }
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>

            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Nama Lengkap / Panggilan Guru *
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder="Contoh: Bu Rini / Pak Megi / Rini"
                  className="w-full bg-[#1A1E2B] border border-[#2B3144] focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Peran / Jabatan / Kelas
                </label>

                <input
                  type="text"
                  value={roleTitle}
                  onChange={(e) =>
                    setRoleTitle(
                      e.target.value
                    )
                  }
                  placeholder="Contoh: Guru Kelas 5 / Guru PAI"
                  className="w-full bg-[#1A1E2B] border border-[#2B3144] focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Maksimal Kuota Perangkat
                </label>

                <select
                  value={maxDevices}
                  onChange={(e) =>
                    setMaxDevices(
                      Number(
                        e.target.value
                      )
                    )
                  }
                  className="w-full bg-[#1A1E2B] border border-[#2B3144] focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value={1}>
                    1 Perangkat (Hanya 1 HP atau 1 Laptop)
                  </option>

                  <option value={2}>
                    2 Perangkat (Rekomendasi: 1 Laptop + 1 HP)
                  </option>

                  <option value={3}>
                    3 Perangkat
                  </option>

                  <option value={5}>
                    5 Perangkat (Fleksibel)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Catatan / Keterangan (Opsional)
                </label>

                <input
                  type="text"
                  value={note}
                  onChange={(e) =>
                    setNote(e.target.value)
                  }
                  placeholder="Contoh: Koordinator Level 3"
                  className="w-full bg-[#1A1E2B] border border-[#2B3144] focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

            </div>

            <div className="flex justify-end gap-2 pt-2">

              <button
                type="button"
                onClick={() =>
                  setIsAdding(false)
                }
                className="px-4 py-2 bg-[#1F2332] hover:bg-[#2A3044] text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>

              <button
                type="submit"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                Simpan Guru
              </button>

            </div>
          </form>
        )}

        {/* =================================================
            FORM EDIT GURU
        ================================================= */}

        {editingTeacher && (
          <form
            onSubmit={handleSaveEdit}
            className="p-4 sm:p-5 mb-5 rounded-2xl bg-[#12141D] border border-amber-500/30 space-y-3 animate-fade-in"
          >
            <div className="flex items-center justify-between">

              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Edit Data Guru:{' '}
                {editingTeacher.name}
              </h3>

              <button
                type="button"
                onClick={() =>
                  setEditingTeacher(null)
                }
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>

            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Nama Guru *
                </label>

                <input
                  type="text"
                  value={editName}
                  onChange={(e) =>
                    setEditName(
                      e.target.value
                    )
                  }
                  className="w-full bg-[#1A1E2B] border border-[#2B3144] focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Peran / Jabatan / Kelas
                </label>

                <input
                  type="text"
                  value={editRoleTitle}
                  onChange={(e) =>
                    setEditRoleTitle(
                      e.target.value
                    )
                  }
                  className="w-full bg-[#1A1E2B] border border-[#2B3144] focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Maksimal Kuota Perangkat
                </label>

                <select
                  value={editMaxDevices}
                  onChange={(e) =>
                    setEditMaxDevices(
                      Number(
                        e.target.value
                      )
                    )
                  }
                  className="w-full bg-[#1A1E2B] border border-[#2B3144] focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value={1}>
                    1 Perangkat
                  </option>

                  <option value={2}>
                    2 Perangkat
                  </option>

                  <option value={3}>
                    3 Perangkat
                  </option>

                  <option value={5}>
                    5 Perangkat
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Catatan / Keterangan
                </label>

                <input
                  type="text"
                  value={editNote}
                  onChange={(e) =>
                    setEditNote(
                      e.target.value
                    )
                  }
                  className="w-full bg-[#1A1E2B] border border-[#2B3144] focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

            </div>

            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.04] p-3.5 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Alias Login Guru</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-[9px] font-bold text-cyan-300">LOGIN</span>
                  </div>
                  <p className="text-[10px] leading-4 text-slate-500 mt-1">
                    Alias hanya menjadi nama panggilan saat login. Semua alias tetap mengarah ke ID guru yang sama.
                  </p>
                </div>
                <div className="text-[10px] text-slate-500 shrink-0">ID: <span className="text-slate-300 font-mono">{editingTeacher.id}</span></div>
              </div>

              <div className="flex flex-wrap gap-1.5 min-h-7 mb-3">
                {editAliases.length > 0 ? (
                  editAliases.map((alias) => (
                    <span key={alias} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1A2230] border border-cyan-500/20 text-[11px] text-cyan-200">
                      {alias}
                      <button
                        type="button"
                        onClick={() => removeEditAlias(alias)}
                        className="text-slate-500 hover:text-rose-300 transition-colors cursor-pointer"
                        aria-label={`Hapus alias ${alias}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-slate-600 py-1">Belum ada alias login.</span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addEditAlias();
                    }
                  }}
                  placeholder="Contoh: Mae / Bu Mae"
                  className="flex-1 min-w-0 bg-[#1A1E2B] border border-[#2B3144] focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={addEditAlias}
                  className="px-4 py-2 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/25 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 inline mr-1" /> Tambah Alias
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">

              <button
                type="button"
                onClick={() =>
                  setEditingTeacher(null)
                }
                className="px-4 py-2 bg-[#1F2332] hover:bg-[#2A3044] text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>

              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                Simpan Perubahan
              </button>

            </div>
          </form>
        )}

        {/* =================================================
            TEACHER LIST
        ================================================= */}

        {isLoading ? (

          <div className="py-14 text-center text-slate-400 text-xs flex-1 flex flex-col items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />

            <span>
              Menghubungkan ke basis data guru...
            </span>
          </div>

        ) : filteredTeachers.length === 0 ? (

          <div className="py-12 text-center bg-[#12141D] rounded-2xl border border-[#262C3E] text-slate-400 text-xs flex-1 flex flex-col items-center justify-center p-6">

            <Users className="w-8 h-8 mx-auto mb-2 text-slate-500" />

            {search ? (
              <p>
                Tidak ada data guru yang cocok
                dengan kata kunci &quot;
                {search}
                &quot;.
              </p>
            ) : filterStatus === 'online' ? (
              <p>
                Tidak ada guru dengan sesi
                aktif / online saat ini.
              </p>
            ) : filterStatus === 'offline' ? (
              <p>
                Tidak ada guru yang sedang
                offline.
              </p>
            ) : filterStatus ===
              'never_logged_in' ? (
              <p>
                Semua guru dalam whitelist
                sudah pernah login ke portal
                minimal 1 kali.
              </p>
            ) : filterStatus ===
              'blocked' ? (
              <p>
                Tidak ada akun guru yang
                sedang diblokir.
              </p>
            ) : (
              <p>
                Belum ada data guru di
                whitelist.
              </p>
            )}

            {(filterStatus !== 'all' ||
              search) && (
              <button
                type="button"
                onClick={() => {
                  setFilterStatus(
                    'all'
                  );
                  setSearch('');
                }}
                className="mt-3 px-3.5 py-1.5 bg-[#1F2332] hover:bg-[#2A3044] text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Reset Filter &
                Pencarian
              </button>
            )}

          </div>

        ) : (

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 overflow-y-auto pr-1 flex-1 max-h-[500px]">

            {filteredTeachers.map(
              (t) => {
                const activeCount =
                  t.activeSessions
                    ?.length || 0;

                const isExpanded =
                  expandedTeacherId ===
                  t.id;

                const isBlocked =
                  t.status ===
                  'blocked';

                return (
                  <div
                    key={t.id}
                    className={`relative flex flex-col justify-between p-4 rounded-2xl border transition-all duration-200 ${
                      isBlocked
                        ? 'bg-[#1a1215] border-rose-500/30'
                        : activeCount > 0
                        ? 'bg-[#131926] border-emerald-500/30 shadow-md shadow-emerald-500/5'
                        : 'bg-[#12141D] border-[#24293A] hover:border-[#353D54]'
                    }`}
                  >

                    {/* CARD HEADER */}

                    <div>

                      <div className="flex items-start justify-between gap-2.5 mb-2.5">

                        <div className="flex items-center gap-3 min-w-0">

                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-xs shadow-sm ${
                              isBlocked
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : activeCount > 0
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-[#1C202E] text-slate-300 border border-[#2E354A]'
                            }`}
                          >
                            {(t.name ||
                              '??')
                              .slice(
                                0,
                                2
                              )
                              .toUpperCase()}
                          </div>

                          <div className="min-w-0">

                            <div className="flex items-center gap-1.5 flex-wrap">

                              <h4 className="text-sm font-bold text-white truncate max-w-[150px] sm:max-w-[180px]">
                                {t.name}
                              </h4>

                              {isBlocked ? (

                                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                                  Diblokir
                                </span>

                              ) : activeCount > 0 ? (

                                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">

                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />

                                  Online

                                </span>

                              ) : (

                                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#1C202E] text-slate-400 border border-[#2E354A]">
                                  Offline
                                </span>

                              )}

                            </div>

                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {t.roleTitle ||
                                'Guru SDIT AL FIKRI'}
                            </p>

                            <div className="text-[9px] text-slate-600 font-mono mt-0.5 truncate">
                              ID: {t.id}
                            </div>

                          </div>
                        </div>

                        {/* ACTIONS */}

                        <div className="flex items-center gap-1 flex-shrink-0">

                          {onPreviewTeacher && !isBlocked && (
                            <button
                              type="button"
                              onClick={() => {
                                onPreviewTeacher(t);
                                onClose();
                              }}
                              title="Preview e-Rapor sebagai guru ini"
                              className="p-1.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 hover:text-violet-200 rounded-lg border border-violet-500/20 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setEditingTeacher(
                                t
                              );

                              setEditName(
                                t.name
                              );

                              setEditRoleTitle(
                                t.roleTitle ||
                                  ''
                              );

                              setEditMaxDevices(
                                t.maxDevices ||
                                  2
                              );

                              setEditNote(
                                t.note ||
                                  ''
                              );

                              setEditAliases(
                                Array.isArray(t.loginAliases)
                                  ? [...t.loginAliases]
                                  : []
                              );

                              setNewAlias('');

                              setIsAdding(
                                false
                              );
                            }}
                            title="Edit guru"
                            className="p-1.5 bg-[#1C202E] hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 rounded-lg border border-[#2E354A] transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleToggleStatus(
                                t
                              )
                            }
                            title={
                              isBlocked
                                ? 'Buka Blokir'
                                : 'Blokir Akses'
                            }
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              isBlocked
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                                : 'bg-[#1C202E] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border-[#2E354A]'
                            }`}
                          >
                            {isBlocked ? (
                              <Unlock className="w-3.5 h-3.5" />
                            ) : (
                              <Lock className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteTeacher(t)}
                            disabled={processingTeacherId === t.id}
                            title="Hapus guru"
                            className="p-1.5 bg-[#1C202E] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg border border-[#2E354A] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processingTeacherId === t.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>

                        </div>

                      </div>

                      {/* METADATA */}

                      <div className="flex items-center gap-2 flex-wrap text-[11px] mb-2 text-slate-400">

                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#181C28] border border-[#262E42]">

                          <Laptop className="w-3 h-3 text-cyan-400" />

                          <span>
                            Perangkat:{' '}
                            <strong
                              className={
                                activeCount >=
                                t.maxDevices
                                  ? 'text-amber-400'
                                  : 'text-slate-200'
                              }
                            >
                              {activeCount}/
                              {t.maxDevices}
                            </strong>
                          </span>

                        </div>

                        {t.lastLoginAt ? (

                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#181C28] border border-[#262E42]">

                            <Clock className="w-3 h-3 text-slate-400" />

                            <span>
                              {new Date(
                                t.lastLoginAt
                              ).toLocaleDateString(
                                'id-ID'
                              )}
                            </span>

                          </div>

                        ) : (

                          <div className="px-2 py-0.5 rounded-lg bg-[#181C28] border border-[#262E42] text-slate-500">
                            Belum pernah login
                          </div>

                        )}

                        {t.note && (
                          <span className="text-[10px] text-slate-400 italic truncate max-w-[150px]">
                            • {t.note}
                          </span>
                        )}

                      </div>

                      {(t.loginAliases?.length || 0) > 0 && (
                        <div className="flex items-start gap-1.5 text-[10px] mb-2">
                          <span className="text-slate-500 shrink-0 pt-0.5">Alias:</span>
                          <div className="flex flex-wrap gap-1">
                            {t.loginAliases?.slice(0, 4).map((alias) => (
                              <span key={alias} className="px-1.5 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/15 text-cyan-300">
                                {alias}
                              </span>
                            ))}
                            {(t.loginAliases?.length || 0) > 4 && (
                              <span className="px-1.5 py-0.5 text-slate-500">+{(t.loginAliases?.length || 0) - 4}</span>
                            )}
                          </div>
                        </div>
                      )}

                    </div>

                    {/* SESSION AREA */}

                    <div className="mt-2 pt-2 border-t border-[#212638]">

                      {activeCount > 0 ? (

                        <div>

                          <div className="flex items-center justify-between mb-1.5">

                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">
                              {activeCount}{' '}
                              Perangkat Terhubung
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                setExpandedTeacherId(
                                  isExpanded
                                    ? null
                                    : t.id
                                )
                              }
                              className="text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                            >
                              {isExpanded
                                ? 'Tutup Detail'
                                : 'Kelola Sesi'}
                            </button>

                          </div>

                          {!isExpanded && (
                            <div className="flex items-center gap-1.5 flex-wrap">

                              {t.activeSessions?.map(
                                (
                                  s,
                                  idx
                                ) => (
                                  <div
                                    key={
                                      s.deviceId ||
                                      `${t.id}-device-${idx}`
                                    }
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#181D2B] border border-[#2A334B] text-[10px] text-slate-300"
                                    title={`${s.deviceName || 'Perangkat'} (${s.browser || 'Browser'})`}
                                  >
                                    {getDeviceIcon(
                                      s
                                    )}

                                    <span className="truncate max-w-[120px]">
                                      {s.deviceName ||
                                        getDeviceLabel(
                                          s
                                        )}
                                    </span>
                                  </div>
                                )
                              )}

                            </div>
                          )}

                          {isExpanded && (
                            <div className="space-y-1.5 mt-2 animate-fade-in">

                              {t.activeSessions?.map(
                                (
                                  s,
                                  idx
                                ) => (
                                  <div
                                    key={
                                      s.deviceId ||
                                      `${t.id}-expanded-${idx}`
                                    }
                                    className="flex items-center justify-between p-2 rounded-xl bg-[#171B26] border border-[#293044] text-[11px]"
                                  >

                                    <div className="flex items-center gap-2 min-w-0">

                                      <div className="w-6 h-6 rounded-lg bg-[#1F2536] flex items-center justify-center flex-shrink-0">
                                        {getDeviceIcon(
                                          s
                                        )}
                                      </div>

                                      <div className="min-w-0">

                                        <p className="font-semibold text-slate-200 truncate">
                                          {s.deviceName ||
                                            getDeviceLabel(
                                              s
                                            )}
                                        </p>

                                        <p className="text-[10px] text-slate-400 truncate">
                                          {s.browser ||
                                            'Browser'}{' '}
                                          •{' '}
                                          {s.lastActiveAt
                                            ? new Date(
                                                s.lastActiveAt
                                              ).toLocaleTimeString(
                                                'id-ID',
                                                {
                                                  hour: '2-digit',
                                                  minute:
                                                    '2-digit',
                                                }
                                              )
                                            : '--:--'}
                                        </p>

                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleKickDevice(t.id, s.deviceId)
                                      }
                                      disabled={
                                        processingTeacherId === t.id &&
                                        processingDeviceId === s.deviceId
                                      }
                                      className="px-2 py-0.5 text-[10px] font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-lg transition-colors cursor-pointer flex-shrink-0 ml-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {processingTeacherId === t.id &&
                                      processingDeviceId === s.deviceId ? (
                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                      ) : (
                                        'Cabut'
                                      )}
                                    </button>

                                  </div>
                                )
                              )}

                            </div>
                          )}

                        </div>

                      ) : (

                        <div className="flex items-center justify-between text-[11px] text-slate-500 py-0.5">

                          <span>
                            Tidak ada sesi aktif
                          </span>

                          <span className="text-[10px] text-slate-600">
                            Kuota:{' '}
                            {t.maxDevices}{' '}
                            device
                          </span>

                        </div>

                      )}

                    </div>

                  </div>
                );
              }
            )}

          </div>
        )}

        {/* =================================================
            CUSTOM CONFIRMATION MODAL
            Menghindari window.confirm() yang bisa diblokir oleh
            preview/iframe AI Studio.
        ================================================= */}

        {pendingConfirmation && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setPendingConfirmation(null);
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="teacher-confirm-title"
              className="w-full max-w-md rounded-2xl border border-[#30384F] bg-[#111522] shadow-2xl p-5"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-rose-300" />
                </div>

                <div className="min-w-0 flex-1">
                  <h3
                    id="teacher-confirm-title"
                    className="text-sm font-bold text-white"
                  >
                    {pendingConfirmation.type === 'delete'
                      ? 'Hapus data guru?'
                      : 'Cabut sesi perangkat?'}
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {pendingConfirmation.type === 'delete'
                      ? `Guru "${pendingConfirmation.teacher.name}" akan dihapus dari daftar whitelist akses.`
                      : `Sesi ${pendingConfirmation.deviceName} milik ${pendingConfirmation.teacherName} akan dicabut.`}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPendingConfirmation(null)}
                  className="px-4 py-2 rounded-xl border border-[#30384F] bg-[#1B2030] hover:bg-[#252C3E] text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (pendingConfirmation.type === 'delete') {
                      void executeDeleteTeacher(pendingConfirmation.teacher);
                    } else {
                      void executeKickDevice(
                        pendingConfirmation.teacherId,
                        pendingConfirmation.deviceId
                      );
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  {pendingConfirmation.type === 'delete'
                    ? 'Ya, Hapus'
                    : 'Ya, Cabut Sesi'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="mt-4 pt-3 border-t border-[#242A3C] flex items-center justify-between text-xs text-slate-400">

          <div className="flex items-center gap-2">

            <span>
              Total:{' '}
              <strong className="text-white">
                {teachers.length}
              </strong>{' '}
              Guru
            </span>

            <span>
              •
            </span>

            <span>
              <strong className="text-emerald-400">
                {totalActiveSessions}
              </strong>{' '}
              Sesi Aktif
            </span>

          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#1F2332] hover:bg-[#282E40] text-slate-200 font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Tutup Panel
          </button>

        </div>

      </div>
    </div>
  );
};