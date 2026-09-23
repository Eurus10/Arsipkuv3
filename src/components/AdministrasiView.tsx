import React, { useState, useEffect } from 'react';
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
import { EvaluationLearningView } from './evaluation/EvaluationLearningView';
import { subscribeToStudents, type Student } from '../services/studentStorage';

// Generator Modals
import { AbsensiGeneratorModal } from './administrasi/AbsensiGeneratorModal';
import { JadwalPelajaranGeneratorModal } from './administrasi/JadwalPelajaranGeneratorModal';
import { DaftarNilaiGeneratorModal } from './administrasi/DaftarNilaiGeneratorModal';
import { DataUsiaGeneratorModal } from './administrasi/DataUsiaGeneratorModal';
import { SuratOfficialGeneratorModal } from './administrasi/SuratOfficialGeneratorModal';
import { SimulasiKenaikanKelasWorkspace } from './administrasi/SimulasiKenaikanKelasWorkspace';
import { LatihanHarianGeneratorModal } from './administrasi/LatihanHarianGeneratorModal';
import { ModulAjarGeneratorModal } from './administrasi/ModulAjarGeneratorModal';
import { LkpdGeneratorModal } from './administrasi/LkpdGeneratorModal';
import { ProtaGeneratorModal } from './administrasi/ProtaGeneratorModal';
import { PromesGeneratorModal } from './administrasi/PromesGeneratorModal';

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
        border: 'border-emerald-500/40',
        hoverBorder: 'hover:border-emerald-400 hover:shadow-emerald-950/60',
        bgGradient: 'from-emerald-950/60 via-[#0D1C1A] to-slate-900/90',
        iconBg: 'bg-emerald-500/15',
        iconBorder: 'border-emerald-500/30',
        iconColor: 'text-emerald-400',
        tagBg: 'bg-emerald-500/15',
        tagText: 'text-emerald-300',
        tagBorder: 'border-emerald-500/30',
        actionColor: 'text-emerald-400',
        topBadgeBg: 'bg-emerald-600',
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
        border: 'border-teal-500/40',
        hoverBorder: 'hover:border-teal-400 hover:shadow-teal-950/60',
        bgGradient: 'from-teal-950/60 via-[#0B1E21] to-slate-900/90',
        iconBg: 'bg-teal-500/15',
        iconBorder: 'border-teal-500/30',
        iconColor: 'text-teal-400',
        tagBg: 'bg-teal-500/15',
        tagText: 'text-teal-300',
        tagBorder: 'border-teal-500/30',
        actionColor: 'text-teal-400',
        topBadgeBg: 'bg-teal-600',
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
        border: 'border-emerald-500/40',
        hoverBorder: 'hover:border-emerald-400 hover:shadow-emerald-950/60',
        bgGradient: 'from-emerald-950/60 via-[#0D1E1B] to-slate-900/90',
        iconBg: 'bg-emerald-500/15',
        iconBorder: 'border-emerald-500/30',
        iconColor: 'text-emerald-400',
        tagBg: 'bg-emerald-500/15',
        tagText: 'text-emerald-300',
        tagBorder: 'border-emerald-500/30',
        actionColor: 'text-emerald-400',
        topBadgeBg: 'bg-emerald-600',
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
        border: 'border-teal-500/40',
        hoverBorder: 'hover:border-teal-400 hover:shadow-teal-950/60',
        bgGradient: 'from-teal-950/60 via-[#0B1E22] to-slate-900/90',
        iconBg: 'bg-teal-500/15',
        iconBorder: 'border-teal-500/30',
        iconColor: 'text-teal-400',
        tagBg: 'bg-teal-500/15',
        tagText: 'text-teal-300',
        tagBorder: 'border-teal-500/30',
        actionColor: 'text-teal-400',
        topBadgeBg: 'bg-teal-600',
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
        border: 'border-cyan-500/40',
        hoverBorder: 'hover:border-cyan-400 hover:shadow-cyan-950/60',
        bgGradient: 'from-cyan-950/60 via-[#0B1C26] to-slate-900/90',
        iconBg: 'bg-cyan-500/15',
        iconBorder: 'border-cyan-500/30',
        iconColor: 'text-cyan-400',
        tagBg: 'bg-cyan-500/15',
        tagText: 'text-cyan-300',
        tagBorder: 'border-cyan-500/30',
        actionColor: 'text-cyan-400',
        topBadgeBg: 'bg-cyan-600',
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
        border: 'border-rose-500/40',
        hoverBorder: 'hover:border-rose-400 hover:shadow-rose-950/60',
        bgGradient: 'from-rose-950/50 via-[#1D101A] to-slate-900/90',
        iconBg: 'bg-rose-500/15',
        iconBorder: 'border-rose-500/30',
        iconColor: 'text-rose-400',
        tagBg: 'bg-rose-500/15',
        tagText: 'text-rose-300',
        tagBorder: 'border-rose-500/30',
        actionColor: 'text-rose-400',
        topBadgeBg: 'bg-rose-600',
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
        border: 'border-amber-500/40',
        hoverBorder: 'hover:border-amber-400 hover:shadow-amber-950/60',
        bgGradient: 'from-amber-950/50 via-[#1C160F] to-slate-900/90',
        iconBg: 'bg-amber-500/15',
        iconBorder: 'border-amber-500/30',
        iconColor: 'text-amber-400',
        tagBg: 'bg-amber-500/15',
        tagText: 'text-amber-300',
        tagBorder: 'border-amber-500/30',
        actionColor: 'text-amber-400',
        topBadgeBg: 'bg-amber-600',
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
        border: 'border-lime-500/40',
        hoverBorder: 'hover:border-lime-400 hover:shadow-lime-950/60',
        bgGradient: 'from-lime-950/50 via-[#141B0E] to-slate-900/90',
        iconBg: 'bg-lime-500/15',
        iconBorder: 'border-lime-500/30',
        iconColor: 'text-lime-400',
        tagBg: 'bg-lime-500/15',
        tagText: 'text-lime-300',
        tagBorder: 'border-lime-500/30',
        actionColor: 'text-lime-400',
        topBadgeBg: 'bg-lime-600',
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
        border: 'border-purple-500/40',
        hoverBorder: 'hover:border-purple-400 hover:shadow-purple-950/60',
        bgGradient: 'from-purple-950/50 via-[#181126] to-slate-900/90',
        iconBg: 'bg-purple-500/15',
        iconBorder: 'border-purple-500/30',
        iconColor: 'text-purple-400',
        tagBg: 'bg-purple-500/15',
        tagText: 'text-purple-300',
        tagBorder: 'border-purple-500/30',
        actionColor: 'text-purple-400',
        topBadgeBg: 'bg-purple-600',
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
        border: 'border-blue-500/40',
        hoverBorder: 'hover:border-blue-400 hover:shadow-blue-950/60',
        bgGradient: 'from-blue-950/50 via-[#10192E] to-slate-900/90',
        iconBg: 'bg-blue-500/15',
        iconBorder: 'border-blue-500/30',
        iconColor: 'text-blue-400',
        tagBg: 'bg-blue-500/15',
        tagText: 'text-blue-300',
        tagBorder: 'border-blue-500/30',
        actionColor: 'text-blue-400',
        topBadgeBg: 'bg-blue-600',
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
        border: 'border-indigo-500/40',
        hoverBorder: 'hover:border-indigo-400 hover:shadow-indigo-950/60',
        bgGradient: 'from-indigo-950/50 via-[#16142E] to-slate-900/90',
        iconBg: 'bg-indigo-500/15',
        iconBorder: 'border-indigo-500/30',
        iconColor: 'text-indigo-400',
        tagBg: 'bg-indigo-500/15',
        tagText: 'text-indigo-300',
        tagBorder: 'border-indigo-500/30',
        actionColor: 'text-indigo-400',
        topBadgeBg: 'bg-indigo-600',
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
        <EvaluationLearningView onBack={() => setShowEvaluationModule(false)} />
      </div>
    );
  }

  if (activeWorkspace === 'simulasi_kenaikan') {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-24 md:pb-10 text-slate-100 font-sans">
        <SimulasiKenaikanKelasWorkspace
          studentsList={studentsList}
          onBack={() => setActiveWorkspace('none')}
        />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-4 sm:py-5 pb-24 md:pb-8 text-slate-100 font-sans space-y-4">
      {/* Top Banner Ramping: Akses Evaluasi Pembelajaran */}
      <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/90 via-[#13192B] to-purple-950/80 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-indigo-950/30">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0 shadow-inner">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xs sm:text-sm font-black text-white truncate">
                Evaluasi Pembelajaran (AI Ujian Formal)
              </h2>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Kisi-Kisi & Naskah Soal KOP
              </span>
            </div>
            <p className="hidden md:block text-[11px] text-slate-300 truncate mt-0.5">
              Penyusunan naskah ujian resmi, kartu soal, dan rubrik berstandar Kurikulum Merdeka.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowEvaluationModule(true)}
          className="w-full sm:w-auto px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-[11px] rounded-xl shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5 cursor-pointer transition-all shrink-0 active:scale-[0.98]"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Buka Evaluasi Pembelajaran</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Container Studio Generator Simetris */}
      <div className="relative rounded-3xl bg-gradient-to-b from-[#111625] via-[#13192B] to-[#0D111E] border border-slate-700/80 shadow-2xl p-4 sm:p-5 overflow-hidden">
        {/* Ambient Glow Lights */}
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header Ringkas & Filter Kategori Sejajar */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-800">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
                <Sparkles className="w-3 h-3" /> Studio Generator KBM & Administrasi
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800/90 text-slate-300 border border-slate-700">
                11 Alat Aktif
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-black text-white tracking-tight">
              Pusat Generator Cerdas Administrasi & KBM
            </h1>
          </div>

          {/* Quick Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === 'all'
                  ? 'bg-slate-700 text-white shadow-sm border border-slate-600'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Semua (11)</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('ai_kbm')}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === 'ai_kbm'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 border border-emerald-500'
                  : 'bg-slate-900/80 text-slate-400 hover:text-emerald-300 border border-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI KBM & Kurikulum (5)</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('administrasi')}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === 'administrasi'
                  ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/30 border border-amber-500'
                  : 'bg-slate-900/80 text-slate-400 hover:text-amber-300 border border-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Administrasi (4)</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('dokumen')}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === 'dokumen'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30 border border-blue-500'
                  : 'bg-slate-900/80 text-slate-400 hover:text-blue-300 border border-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
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
                className={`group relative p-3 sm:p-3.5 rounded-2xl bg-gradient-to-br ${theme.bgGradient} border ${theme.border} ${theme.hoverBorder} shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between hover:-translate-y-0.5 overflow-hidden min-h-[142px] sm:min-h-[148px]`}
              >
                {/* Top Corner Badge */}
                <div
                  className={`absolute top-0 right-0 px-2 py-0.5 rounded-bl-xl ${theme.topBadgeBg} ${theme.topBadgeText} text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5 shadow-sm`}
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>{card.badge}</span>
                </div>

                {/* Card Top / Header */}
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className={`w-8 h-8 rounded-lg ${theme.iconBg} border ${theme.iconBorder} flex items-center justify-center ${theme.iconColor} group-hover:scale-105 transition-transform shadow-inner shrink-0`}
                    >
                      {card.icon}
                    </div>
                    <div className="min-w-0 pr-10">
                      <h3 className="text-xs sm:text-[13px] font-black text-white group-hover:text-white transition-colors truncate">
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
                  <p className="text-[11px] text-slate-300/85 line-clamp-2 leading-relaxed">
                    {card.description}
                  </p>
                </div>

                {/* Card Footer / Action Button */}
                <div
                  className={`mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-bold ${theme.actionColor}`}
                >
                  <span>{card.actionText}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Render Generator Modals (Preserved 100% Intact + Prota & Promes) */}
      <ModulAjarGeneratorModal
        isOpen={activeModal === 'modul_ajar'}
        onClose={() => setActiveModal('none')}
      />

      <LkpdGeneratorModal
        isOpen={activeModal === 'lkpd'}
        onClose={() => setActiveModal('none')}
      />

      <ProtaGeneratorModal
        isOpen={activeModal === 'prota'}
        onClose={() => setActiveModal('none')}
      />

      <PromesGeneratorModal
        isOpen={activeModal === 'promes'}
        onClose={() => setActiveModal('none')}
      />

      <LatihanHarianGeneratorModal
        isOpen={activeModal === 'latihan_harian'}
        onClose={() => setActiveModal('none')}
      />

      <AbsensiGeneratorModal
        isOpen={activeModal === 'absensi'}
        onClose={() => setActiveModal('none')}
        studentsList={studentsList}
      />

      <JadwalPelajaranGeneratorModal
        isOpen={activeModal === 'jadwal'}
        onClose={() => setActiveModal('none')}
      />

      <DaftarNilaiGeneratorModal
        isOpen={activeModal === 'nilai'}
        onClose={() => setActiveModal('none')}
        studentsList={studentsList}
      />

      <DataUsiaGeneratorModal
        isOpen={activeModal === 'usia'}
        onClose={() => setActiveModal('none')}
        studentsList={studentsList}
      />

      <SuratOfficialGeneratorModal
        isOpen={activeModal === 'surat'}
        onClose={() => setActiveModal('none')}
        studentsList={studentsList}
      />
    </div>
  );
};

