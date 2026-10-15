import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  Sparkles,
  GraduationCap,
  ArrowRight,
  UserCheck,
  Calendar,
  Calculator,
  Users,
  FileText,
  Shuffle,
  FileSpreadsheet,
  BookOpen,
  Layers,
} from 'lucide-react';
import { DocumentItem } from '../types';
import { subscribeToStudents, type Student } from '../services/studentStorage';
import { LazyViewLoader, LazyModalLoader } from './common/LazyViewLoader';

// Lazy Loaded Generator Modals & Workspaces
const EvaluationLearningView = lazy(() =>
  import('./evaluation/EvaluationLearningView').then((m) => ({
    default: m.EvaluationLearningView,
  }))
);
const AbsensiGeneratorModal = lazy(() =>
  import('./administrasi/AbsensiGeneratorModal').then((m) => ({
    default: m.AbsensiGeneratorModal,
  }))
);
const JadwalPelajaranGeneratorModal = lazy(() =>
  import('./administrasi/JadwalPelajaranGeneratorModal').then((m) => ({
    default: m.JadwalPelajaranGeneratorModal,
  }))
);
const DaftarNilaiGeneratorModal = lazy(() =>
  import('./administrasi/DaftarNilaiGeneratorModal').then((m) => ({
    default: m.DaftarNilaiGeneratorModal,
  }))
);
const DataUsiaGeneratorModal = lazy(() =>
  import('./administrasi/DataUsiaGeneratorModal').then((m) => ({
    default: m.DataUsiaGeneratorModal,
  }))
);
const SuratOfficialGeneratorModal = lazy(() =>
  import('./administrasi/SuratOfficialGeneratorModal').then((m) => ({
    default: m.SuratOfficialGeneratorModal,
  }))
);
const SimulasiKenaikanKelasWorkspace = lazy(() =>
  import('./administrasi/SimulasiKenaikanKelasWorkspace').then((m) => ({
    default: m.SimulasiKenaikanKelasWorkspace,
  }))
);
const LatihanHarianGeneratorModal = lazy(() =>
  import('./administrasi/LatihanHarianGeneratorModal').then((m) => ({
    default: m.LatihanHarianGeneratorModal,
  }))
);
const ModulAjarGeneratorModal = lazy(() =>
  import('./administrasi/ModulAjarGeneratorModal').then((m) => ({
    default: m.ModulAjarGeneratorModal,
  }))
);
const LkpdGeneratorModal = lazy(() =>
  import('./administrasi/LkpdGeneratorModal').then((m) => ({
    default: m.LkpdGeneratorModal,
  }))
);
const ProtaGeneratorModal = lazy(() =>
  import('./administrasi/ProtaGeneratorModal').then((m) => ({
    default: m.ProtaGeneratorModal,
  }))
);
const PromesGeneratorModal = lazy(() =>
  import('./administrasi/PromesGeneratorModal').then((m) => ({
    default: m.PromesGeneratorModal,
  }))
);

interface AdministrasiViewProps {
  documents?: DocumentItem[];
  onEditDocument?: (doc: DocumentItem) => void;
}

type GeneratorCategory = 'all' | 'ai_kbm' | 'administrasi' | 'dokumen';

interface GeneratorCardItem {
  id:
    | 'modul_ajar'
    | 'lkpd'
    | 'prota'
    | 'promes'
    | 'latihan_harian'
    | 'absensi'
    | 'jadwal'
    | 'nilai'
    | 'usia'
    | 'surat'
    | 'simulasi_kenaikan';
  category: 'ai_kbm' | 'administrasi' | 'dokumen';
  title: string;
  badge: string;
  tag: string;
  description: string;
  actionText: string;
  icon: React.ReactNode;
  theme: {
    border: string;
    hoverBorder: string;
    bgGradient: string;
    iconBg: string;
    iconBorder: string;
    iconColor: string;
    tagBg: string;
    tagText: string;
    tagBorder: string;
    actionColor: string;
    topBadgeBg: string;
    topBadgeText: string;
  };
}

export const AdministrasiView: React.FC<AdministrasiViewProps> = () => {
  const [showEvaluationModule, setShowEvaluationModule] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState<'none' | 'simulasi_kenaikan'>('none');
  const [selectedCategory, setSelectedCategory] = useState<GeneratorCategory>('all');

  // Generator Modals state
  const [activeModal, setActiveModal] = useState<
    | 'none'
    | 'modul_ajar'
    | 'lkpd'
    | 'prota'
    | 'promes'
    | 'latihan_harian'
    | 'absensi'
    | 'jadwal'
    | 'nilai'
    | 'usia'
    | 'surat'
  >('none');

  const [studentsList, setStudentsList] = useState<Student[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToStudents((res) => {
      if (res) setStudentsList(res);
    });
    return () => unsubscribe();
  }, []);

  const generatorCards: GeneratorCardItem[] = [
    {
      id: 'modul_ajar',
      category: 'ai_kbm',
      title: 'Modul Ajar (RPP Plus)',
      badge: 'AI Engine',
      tag: 'Kurikulum Merdeka',
      description: 'Capaian & Tujuan Pembelajaran, diferensiasi, asesmen diagnostik & formatif.',
      actionText: 'Susun Modul Ajar',
      icon: <BookOpen className="w-4 h-4" />,
      theme: {
        border: 'border-slate-200',
        hoverBorder: 'hover:border-emerald-300 hover:shadow-md',
        bgGradient: 'bg-white hover:bg-emerald-50/25',
        iconBg: 'bg-emerald-50',
        iconBorder: 'border-emerald-200',
        iconColor: 'text-emerald-700',
        tagBg: 'bg-emerald-50',
        tagText: 'text-emerald-800',
        tagBorder: 'border-emerald-200',
        actionColor: 'text-emerald-700',
        topBadgeBg: 'bg-emerald-700',
        topBadgeText: 'text-white',
      },
    },
    {
      id: 'lkpd',
      category: 'ai_kbm',
      title: 'LKPD Siswa Interaktif',
      badge: 'AI Engine',
      tag: 'Lembar Kerja Siswa',
      description: 'Stimulus kontekstual Islami, tabel observasi, studi kasus & rubrik guru.',
      actionText: 'Buat LKPD Siswa',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      theme: {
        border: 'border-slate-200',
        hoverBorder: 'hover:border-teal-300 hover:shadow-md',
        bgGradient: 'bg-white hover:bg-teal-50/25',
        iconBg: 'bg-teal-50',
        iconBorder: 'border-teal-200',
        iconColor: 'text-teal-700',
        tagBg: 'bg-teal-50',
        tagText: 'text-teal-800',
        tagBorder: 'border-teal-200',
        actionColor: 'text-teal-700',
        topBadgeBg: 'bg-teal-700',
        topBadgeText: 'text-white',
      },
    },
    {
      id: 'prota',
      category: 'ai_kbm',
      title: 'Program Tahunan (PROTA)',
      badge: 'AI Kurikulum',
      tag: 'ATP & RME Merdeka',
      description: 'Pemetaan Alur Tujuan Pembelajaran, minggu efektif (RME), dan alokasi JP setahun.',
      actionText: 'Susun PROTA',
      icon: <Calendar className="w-4 h-4" />,
      theme: {
        border: 'border-slate-200',
        hoverBorder: 'hover:border-emerald-300 hover:shadow-md',
        bgGradient: 'bg-white hover:bg-emerald-50/25',
        iconBg: 'bg-emerald-50',
        iconBorder: 'border-emerald-200',
        iconColor: 'text-emerald-700',
        tagBg: 'bg-emerald-50',
        tagText: 'text-emerald-800',
        tagBorder: 'border-emerald-200',
        actionColor: 'text-emerald-700',
        topBadgeBg: 'bg-emerald-700',
        topBadgeText: 'text-white',
      },
    },
    {
      id: 'promes',
      category: 'ai_kbm',
      title: 'Program Semester (PROMES)',
      badge: 'AI Matriks',
      tag: 'Distribusi Mingguan',
      description: 'Matriks mingguan 6 bulan, alokasi KBM, STS, SAS/SAT, cadangan & libur semester.',
      actionText: 'Susun PROMES',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      theme: {
        border: 'border-slate-200',
        hoverBorder: 'hover:border-teal-300 hover:shadow-md',
        bgGradient: 'bg-white hover:bg-teal-50/25',
        iconBg: 'bg-teal-50',
        iconBorder: 'border-teal-200',
        iconColor: 'text-teal-700',
        tagBg: 'bg-teal-50',
        tagText: 'text-teal-800',
        tagBorder: 'border-teal-200',
        actionColor: 'text-teal-700',
        topBadgeBg: 'bg-teal-700',
        topBadgeText: 'text-white',
      },
    },
    {
      id: 'latihan_harian',
      category: 'ai_kbm',
      title: 'Latihan Harian Per Bab',
      badge: 'AI Generator',
      tag: 'Bank Latihan Mandiri',
      description: 'Generate latihan bab/materi tanpa kop beserta kunci jawaban & pembahasan.',
      actionText: 'Mulai Buat Soal',
      icon: <FileText className="w-4 h-4" />,
      theme: {
        border: 'border-slate-200',
        hoverBorder: 'hover:border-cyan-300 hover:shadow-md',
        bgGradient: 'bg-white hover:bg-cyan-50/25',
        iconBg: 'bg-cyan-50',
        iconBorder: 'border-cyan-200',
        iconColor: 'text-cyan-700',
        tagBg: 'bg-cyan-50',
        tagText: 'text-cyan-800',
        tagBorder: 'border-cyan-200',
        actionColor: 'text-cyan-700',
        topBadgeBg: 'bg-cyan-700',
        topBadgeText: 'text-white',
      },
    },
    {
      id: 'absensi',
      category: 'administrasi',
      title: 'Absensi & Grafik Kelas',
      badge: 'Excel + Visual',
      tag: 'Sinkron Data Siswa',
      description: 'Presensi harian, bulanan, semester & dashboard grafik dual-chart siap cetak.',
      actionText: 'Buka Absensi',
      icon: <UserCheck className="w-4 h-4" />,
      theme: {
        border: 'border-slate-200',
        hoverBorder: 'hover:border-rose-300 hover:shadow-md',
        bgGradient: 'bg-white hover:bg-rose-50/25',
        iconBg: 'bg-rose-50',
        iconBorder: 'border-rose-200',
        iconColor: 'text-rose-700',
        tagBg: 'bg-rose-50',
        tagText: 'text-rose-800',
        tagBorder: 'border-rose-200',
        actionColor: 'text-rose-700',
        topBadgeBg: 'bg-rose-700',
        topBadgeText: 'text-white',
      },
    },
    {
      id: 'jadwal',
      category: 'administrasi',
      title: 'Jadwal Pelajaran Mingguan',
      badge: 'Excel Template',
      tag: 'Alokasi JP Guru',
      description: 'Format presisi jadwal mingguan terpadu dengan jam pelajaran dan guru pengampu.',
      actionText: 'Buka Jadwal',
      icon: <Calendar className="w-4 h-4" />,
      theme: {
        border: 'border-slate-200',
        hoverBorder: 'hover:border-amber-300 hover:shadow-md',
        bgGradient: 'bg-white hover:bg-amber-50/25',
        iconBg: 'bg-amber-50',
        iconBorder: 'border-amber-200',
        iconColor: 'text-amber-700',
        tagBg: 'bg-amber-50',
        tagText: 'text-amber-800',
        tagBorder: 'border-amber-200',
        actionColor: 'text-amber-700',
        topBadgeBg: 'bg-amber-700',
        topBadgeText: 'text-white',
      },
    },
    {
      id: 'nilai',
      category: 'administrasi',
      title: 'Daftar Nilai / Legger',
      badge: 'Rumus Excel',
      tag: 'Format Sumatif',
      description: 'Template penilaian harian, STS, SAS dan rumus rata-rata otomatis Excel.',
      actionText: 'Buka Legger',
      icon: <Calculator className="w-4 h-4" />,
      theme: {
        border: 'border-slate-200',
        hoverBorder: 'hover:border-lime-300 hover:shadow-md',
        bgGradient: 'bg-white hover:bg-lime-50/25',
        iconBg: 'bg-lime-50',
        iconBorder: 'border-lime-200',
        iconColor: 'text-lime-700',
        tagBg: 'bg-lime-50',
        tagText: 'text-lime-800',
        tagBorder: 'border-lime-200',
        actionColor: 'text-lime-700',
        topBadgeBg: 'bg-lime-700',
        topBadgeText: 'text-white',
      },
    },
    {
      id: 'usia',
      category: 'administrasi',
      title: 'Data Usia Siswa (1 Juli)',
      badge: 'Otomatis',
      tag: 'Kalkulasi Umur',
      description: 'Perhitungan otomatis umur tahun dan bulan per 1 Juli tahun ajar aktif.',
      actionText: 'Buka Data Usia',
      icon: <Users className="w-4 h-4" />,
      theme: {
        border: 'border-slate-200',
        hoverBorder: 'hover:border-purple-300 hover:shadow-md',
        bgGradient: 'bg-white hover:bg-purple-50/25',
        iconBg: 'bg-purple-50',
        iconBorder: 'border-purple-200',
        iconColor: 'text-purple-700',
        tagBg: 'bg-purple-50',
        tagText: 'text-purple-800',
        tagBorder: 'border-purple-200',
        actionColor: 'text-purple-700',
        topBadgeBg: 'bg-purple-700',
        topBadgeText: 'text-white',
      },
    },
    {
      id: 'surat',
      category: 'dokumen',
      title: 'Generator Surat Resmi',
      badge: 'Format Word',
      tag: 'KOP Resmi SDIT',
      description: 'Pembuat surat dinas, izin, dan dispensasi lengkap dengan nomor surat & tanda tangan.',
      actionText: 'Buka Pembuat Surat',
      icon: <FileText className="w-4 h-4" />,
      theme: {
        border: 'border-slate-200',
        hoverBorder: 'hover:border-blue-300 hover:shadow-md',
        bgGradient: 'bg-white hover:bg-blue-50/25',
        iconBg: 'bg-blue-50',
        iconBorder: 'border-blue-200',
        iconColor: 'text-blue-700',
        tagBg: 'bg-blue-50',
        tagText: 'text-blue-800',
        tagBorder: 'border-blue-200',
        actionColor: 'text-blue-700',
        topBadgeBg: 'bg-blue-700',
        topBadgeText: 'text-white',
      },
    },
    {
      id: 'simulasi_kenaikan',
      category: 'dokumen',
      title: 'Simulasi Kenaikan Kelas',
      badge: 'Workspace',
      tag: 'Plotting Rombel',
      description: 'Workspace kolaborasi multi-guru untuk acak rombel seimbang dan plotting kelas baru.',
      actionText: 'Buka Workspace',
      icon: <Shuffle className="w-4 h-4" />,
      theme: {
        border: 'border-slate-200',
        hoverBorder: 'hover:border-indigo-300 hover:shadow-md',
        bgGradient: 'bg-white hover:bg-indigo-50/25',
        iconBg: 'bg-indigo-50',
        iconBorder: 'border-indigo-200',
        iconColor: 'text-indigo-700',
        tagBg: 'bg-indigo-50',
        tagText: 'text-indigo-800',
        tagBorder: 'border-indigo-200',
        actionColor: 'text-indigo-700',
        topBadgeBg: 'bg-indigo-700',
        topBadgeText: 'text-white',
      },
    },
  ];

  const filteredCards = generatorCards.filter((card) => {
    if (selectedCategory === 'all') return true;
    return card.category === selectedCategory;
  });

  const handleCardClick = (id: GeneratorCardItem['id']) => {
    if (id === 'simulasi_kenaikan') {
      setActiveWorkspace('simulasi_kenaikan');
    } else {
      setActiveModal(id);
    }
  };

  if (showEvaluationModule) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-24 md:pb-10 text-slate-100 font-sans">
        <Suspense fallback={<LazyViewLoader label="Memuat Modul Evaluasi Pembelajaran..." />}>
          <EvaluationLearningView onBack={() => setShowEvaluationModule(false)} />
        </Suspense>
      </div>
    );
  }

  if (activeWorkspace === 'simulasi_kenaikan') {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-24 md:pb-10 text-slate-100 font-sans">
        <Suspense fallback={<LazyViewLoader label="Memuat Simulasi Kenaikan Kelas..." />}>
          <SimulasiKenaikanKelasWorkspace
            studentsList={studentsList}
            onBack={() => setActiveWorkspace('none')}
          />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-4 sm:py-5 pb-24 md:pb-8 text-slate-900 font-sans space-y-4">
      {/* Top Banner Ramping: Akses Evaluasi Pembelajaran */}
      <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 border border-emerald-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0 shadow-inner">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xs sm:text-sm font-black text-white truncate">
                Evaluasi Pembelajaran (AI Ujian Formal)
              </h2>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Kisi-Kisi & Naskah Soal KOP
              </span>
            </div>
            <p className="hidden md:block text-[11px] text-emerald-100/70 truncate mt-0.5">
              Penyusunan naskah ujian resmi, kartu soal, dan rubrik berstandar Kurikulum Merdeka.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowEvaluationModule(true)}
          className="w-full sm:w-auto px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shrink-0 active:scale-[0.98]"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Buka Evaluasi Pembelajaran</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Container Studio Generator Simetris */}
      <div className="relative rounded-3xl bg-white border border-slate-200 shadow-xs p-4 sm:p-5 overflow-hidden">
        {/* Section Header Ringkas & Filter Kategori Sejajar */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-100">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-800">
                <Sparkles className="w-3 h-3 text-emerald-600" /> Studio Generator KBM & Administrasi
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                11 Alat Aktif
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
              Pusat Generator Cerdas Administrasi & KBM
            </h1>
          </div>

          {/* Quick Category Filter Segmented Tabs */}
          <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 overflow-x-auto pb-1 md:pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>Semua (11)</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('ai_kbm')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === 'ai_kbm'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>AI KBM & Kurikulum (5)</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('administrasi')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === 'administrasi'
                  ? 'bg-white text-amber-800 shadow-xs'
                  : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <span>Administrasi (4)</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('dokumen')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === 'dokumen'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Dokumen (2)</span>
            </button>
          </div>
        </div>

        {/* COMPACT RESPONSIVE GRID (Ramping & Presisi) */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
          {filteredCards.map((card) => {
            const { theme } = card;
            return (
              <div
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                className={`group relative p-3 sm:p-3.5 rounded-2xl bg-white border ${theme.border} ${theme.hoverBorder} shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between hover:-translate-y-0.5 overflow-hidden min-h-[142px] sm:min-h-[148px]`}
              >
                {/* Top Corner Badge */}
                <div
                  className={`absolute top-0 right-0 px-2 py-0.5 rounded-bl-xl ${theme.topBadgeBg} ${theme.topBadgeText} text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5 shadow-xs`}
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>{card.badge}</span>
                </div>

                {/* Card Top / Header */}
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className={`w-8 h-8 rounded-lg ${theme.iconBg} border ${theme.iconBorder} flex items-center justify-center ${theme.iconColor} group-hover:scale-105 transition-transform shadow-xs shrink-0`}
                    >
                      {card.icon}
                    </div>
                    <div className="min-w-0 pr-10">
                      <h3 className="text-xs sm:text-[13px] font-black text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                        {card.title}
                      </h3>
                      <span
                        className={`inline-block text-[8.5px] font-extrabold px-1.5 py-0.2 rounded ${theme.tagBg} ${theme.tagText} border ${theme.tagBorder} truncate max-w-full`}
                      >
                        {card.tag}
                      </span>
                    </div>
                  </div>

                  {/* Card Description Padat & Ramping */}
                  <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                    {card.description}
                  </p>
                </div>

                {/* Card Footer / Action Button */}
                <div
                  className={`mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold ${theme.actionColor}`}
                >
                  <span>{card.actionText}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Render Lazy Generator Modals On-Demand (Preserved 100% Functionality) */}
      {activeModal === 'modul_ajar' && (
        <Suspense fallback={<LazyModalLoader title="Modul Ajar" />}>
          <ModulAjarGeneratorModal
            isOpen={true}
            onClose={() => setActiveModal('none')}
          />
        </Suspense>
      )}

      {activeModal === 'lkpd' && (
        <Suspense fallback={<LazyModalLoader title="Lembar Kerja Peserta Didik" />}>
          <LkpdGeneratorModal
            isOpen={true}
            onClose={() => setActiveModal('none')}
          />
        </Suspense>
      )}

      {activeModal === 'prota' && (
        <Suspense fallback={<LazyModalLoader title="Program Tahunan (Prota)" />}>
          <ProtaGeneratorModal
            isOpen={true}
            onClose={() => setActiveModal('none')}
          />
        </Suspense>
      )}

      {activeModal === 'promes' && (
        <Suspense fallback={<LazyModalLoader title="Program Semester (Promes)" />}>
          <PromesGeneratorModal
            isOpen={true}
            onClose={() => setActiveModal('none')}
          />
        </Suspense>
      )}

      {activeModal === 'latihan_harian' && (
        <Suspense fallback={<LazyModalLoader title="Latihan Harian" />}>
          <LatihanHarianGeneratorModal
            isOpen={true}
            onClose={() => setActiveModal('none')}
          />
        </Suspense>
      )}

      {activeModal === 'absensi' && (
        <Suspense fallback={<LazyModalLoader title="Absensi Bulanan" />}>
          <AbsensiGeneratorModal
            isOpen={true}
            onClose={() => setActiveModal('none')}
            studentsList={studentsList}
          />
        </Suspense>
      )}

      {activeModal === 'jadwal' && (
        <Suspense fallback={<LazyModalLoader title="Jadwal Pelajaran" />}>
          <JadwalPelajaranGeneratorModal
            isOpen={true}
            onClose={() => setActiveModal('none')}
          />
        </Suspense>
      )}

      {activeModal === 'nilai' && (
        <Suspense fallback={<LazyModalLoader title="Daftar Nilai" />}>
          <DaftarNilaiGeneratorModal
            isOpen={true}
            onClose={() => setActiveModal('none')}
            studentsList={studentsList}
          />
        </Suspense>
      )}

      {activeModal === 'usia' && (
        <Suspense fallback={<LazyModalLoader title="Data Usia Siswa" />}>
          <DataUsiaGeneratorModal
            isOpen={true}
            onClose={() => setActiveModal('none')}
            studentsList={studentsList}
          />
        </Suspense>
      )}

      {activeModal === 'surat' && (
        <Suspense fallback={<LazyModalLoader title="Surat Resmi" />}>
          <SuratOfficialGeneratorModal
            isOpen={true}
            onClose={() => setActiveModal('none')}
            studentsList={studentsList}
          />
        </Suspense>
      )}
    </div>
  );
};

