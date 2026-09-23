import React, {
  Component,
  lazy,
  Suspense,
  useEffect,
  useState,
} from 'react';

import {
  ListOrdered,
  FileQuestion,
  Brain,
  ArrowLeft,
  GraduationCap,
  Sparkles,
  ClipboardCheck,
  BookOpenCheck,
  Loader2,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

import { EvaluationBlueprint } from '../../types/evaluationTypes';

import { EvaluationKisiKisiView } from './EvaluationKisiKisiView';
import { EvaluationReviewKisiKisiView } from './EvaluationReviewKisiKisiView';
import { EvaluationReviewSoalView } from './EvaluationReviewSoalView';
import { EvaluationReviewView } from './EvaluationReviewView';

import { verifyActiveTokenRealtime } from '../../services/tokenAuthService';
import { isAdminLoggedIn } from '../../services/auth';

/* ============================================================
   EVALUATION SOAL VIEW
   ============================================================

   Jangan menggunakan static import:

   import { EvaluationSoalView } from './EvaluationSoalView';

   karena sebelumnya browser mengalami:

   "doesn't provide an export named: EvaluationSoalView"

   Kita gunakan lazy import dan menerima baik named export
   maupun default export.

   Ini membuat kegagalan export komponen Soal tidak ikut
   menjatuhkan seluruh halaman Evaluasi Pembelajaran.
============================================================ */

const EvaluationSoalView: React.ComponentType<any> = lazy(async () => {
  try {
    const module = (await import('./EvaluationSoalView')) as Record<string, any>;

    const SoalComponent =
      module.EvaluationSoalView ??
      module.default;

    if (!SoalComponent) {
      throw new Error(
        'EvaluationSoalView tidak ditemukan pada module ./EvaluationSoalView. ' +
        'Pastikan komponen mengekspor EvaluationSoalView.'
      );
    }

    return {
      default: SoalComponent,
    };
  } catch (error) {
    console.error(
      '[EvaluationLearningView] Gagal memuat EvaluationSoalView:',
      error
    );

    throw error;
  }
});


interface EvaluationLearningViewProps {
  onBack?: () => void;
}


type SubMenuType =
  | 'kisi_kisi'
  | 'review_kisi_kisi'
  | 'soal'
  | 'review_soal'
  | 'review';


const EVALUATION_STEPS: Array<{
  id: SubMenuType;
  stepNumber: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  activeBg: string;
  activeBorder: string;
  activeText: string;
  glowColor: string;
}> = [
  {
    id: 'kisi_kisi',
    stepNumber: '01',
    title: 'Penyusunan Kisi',
    subtitle: 'Matriks & Indikator CP',
    icon: ListOrdered,
    activeBg: 'bg-gradient-to-br from-indigo-950/70 via-indigo-900/40 to-slate-900',
    activeBorder: 'border-indigo-500/60 ring-1 ring-indigo-500/30',
    activeText: 'text-indigo-300',
    glowColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  },
  {
    id: 'review_kisi_kisi',
    stepNumber: '02',
    title: 'Review Kisi-Kisi',
    subtitle: 'Verifikasi & Bank Kisi',
    icon: BookOpenCheck,
    activeBg: 'bg-gradient-to-br from-cyan-950/70 via-cyan-900/40 to-slate-900',
    activeBorder: 'border-cyan-500/60 ring-1 ring-cyan-500/30',
    activeText: 'text-cyan-300',
    glowColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  },
  {
    id: 'soal',
    stepNumber: '03',
    title: 'Penyusunan Soal',
    subtitle: 'AI Generator & Editor',
    icon: FileQuestion,
    activeBg: 'bg-gradient-to-br from-purple-950/70 via-purple-900/40 to-slate-900',
    activeBorder: 'border-purple-500/60 ring-1 ring-purple-500/30',
    activeText: 'text-purple-300',
    glowColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
  {
    id: 'review_soal',
    stepNumber: '04',
    title: 'Review Naskah',
    subtitle: 'Cetak F4 (Word & PDF)',
    icon: ClipboardCheck,
    activeBg: 'bg-gradient-to-br from-amber-950/70 via-amber-900/40 to-slate-900',
    activeBorder: 'border-amber-500/60 ring-1 ring-amber-500/30',
    activeText: 'text-amber-300',
    glowColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  {
    id: 'review',
    stepNumber: '05',
    title: 'Hasil & Diagnosa',
    subtitle: 'Analisis Nilai & Remedial',
    icon: Brain,
    activeBg: 'bg-gradient-to-br from-rose-950/70 via-rose-900/40 to-slate-900',
    activeBorder: 'border-rose-500/60 ring-1 ring-rose-500/30',
    activeText: 'text-rose-300',
    glowColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },
];

/* ============================================================
   LOADING FALLBACK UNTUK MODUL SOAL
============================================================ */

const EvaluationSoalLoading: React.FC = () => {
  return (
    <div className="min-h-[360px] flex items-center justify-center">
      <div className="w-full max-w-md p-6 rounded-2xl bg-[#0F1420] border border-[#252E42] shadow-xl text-center">

        <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
        </div>

        <h3 className="mt-4 text-sm font-black text-white">
          Memuat Penyusunan Soal
        </h3>

        <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
          Modul penyusunan soal sedang dimuat.
          Mohon tunggu sebentar...
        </p>

      </div>
    </div>
  );
};


/* ============================================================
   ERROR FALLBACK MODUL SOAL
============================================================ */

interface EvaluationSoalErrorFallbackProps {
  onRetry: () => void;
}

const EvaluationSoalErrorFallback: React.FC<
  EvaluationSoalErrorFallbackProps
> = ({ onRetry }) => {
  return (
    <div className="min-h-[360px] flex items-center justify-center">
      <div className="w-full max-w-lg p-6 rounded-2xl bg-[#0F1420] border border-rose-500/30 shadow-xl">

        <div className="flex items-start gap-4">

          <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>

          <div className="min-w-0">

            <h3 className="text-sm font-black text-white">
              Modul Penyusunan Soal Tidak Dapat Dimuat
            </h3>

            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
              Modul penyusunan soal gagal dimuat.
              Menu Evaluasi lainnya tetap tersedia.
            </p>

            <button
              type="button"
              onClick={onRetry}
              className="mt-4 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black flex items-center gap-2 cursor-pointer transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Muat Ulang Modul Soal
            </button>

          </div>

        </div>

      </div>
    </div>
  );
};


/* ============================================================
   MAIN COMPONENT
============================================================ */

export const EvaluationLearningView: React.FC<
  EvaluationLearningViewProps
> = ({ onBack }) => {

  /* ==========================================================
     ACTIVE SUB MENU
  ========================================================== */

  const [
    activeSubMenu,
    setActiveSubMenu,
  ] = useState<SubMenuType>('kisi_kisi');


  /* ==========================================================
     BLUEPRINT YANG DITERUSKAN ANTAR MODUL
  ========================================================== */

  const [
    passedBlueprint,
    setPassedBlueprint,
  ] = useState<EvaluationBlueprint | null>(null);


  /* ==========================================================
     KEY UNTUK MEMAKSA RELOAD MODUL SOAL
  ========================================================== */

  const [
    soalModuleKey,
    setSoalModuleKey,
  ] = useState(0);


  /* ==========================================================
     REAL-TIME SECURITY WATCHDOG
  ========================================================== */

  useEffect(() => {

    if (isAdminLoggedIn()) {
      return;
    }

    const interval = setInterval(
      async () => {

        try {

          const {
            isValid,
            message,
          } =
            await verifyActiveTokenRealtime(
              'evaluation',
              false
            );

          if (!isValid) {

            alert(
              `Sesi Evaluasi berakhir: ${
                message ||
                'Lisensi token telah dinonaktifkan atau masa aktif habis.'
              }`
            );

            if (onBack) {
              onBack();
            }
          }

        } catch (err) {

          console.error(
            'Watchdog error in EvaluationLearningView:',
            err
          );

        }

      },
      45000
    );

    return () => {
      clearInterval(interval);
    };

  }, [onBack]);


  /* ==========================================================
     PILIH KISI-KISI UNTUK MEMBUAT SOAL
  ========================================================== */

  const handleSelectBlueprintForQuestions = (
    blueprint: EvaluationBlueprint
  ) => {

    setPassedBlueprint(blueprint);

    setActiveSubMenu('soal');

  };


  /* ==========================================================
     EDIT KISI-KISI
  ========================================================== */

  const handleEditBlueprint = (
    blueprint: EvaluationBlueprint
  ) => {

    setPassedBlueprint(blueprint);

    setActiveSubMenu('kisi_kisi');

  };


  /* ==========================================================
     EDIT KISI-KISI DARI REVIEW KISI-KISI
  ========================================================== */

  const handleEditBlueprintFromReview = (
    blueprint: EvaluationBlueprint
  ) => {

    setPassedBlueprint(blueprint);

    setActiveSubMenu('kisi_kisi');

  };


  /* ==========================================================
     KETIKA KISI-KISI DIHAPUS
  ========================================================== */

  const handleBlueprintDeleted = (
    blueprintId: string
  ) => {

    setPassedBlueprint(
      (current) =>
        current?.id === blueprintId
          ? null
          : current
    );

  };


  /* ==========================================================
     NAVIGASI
  ========================================================== */

  const handleOpenKisiKisi = () => {

    setActiveSubMenu('kisi_kisi');

  };


  const handleOpenReviewKisiKisi = () => {

    setActiveSubMenu(
      'review_kisi_kisi'
    );

  };


  const handleOpenSoal = () => {

    setActiveSubMenu('soal');

  };


  const handleOpenReviewSoal = () => {

    setActiveSubMenu('review_soal');

  };


  const handleOpenReviewHasil = () => {

    setActiveSubMenu('review');

  };


  /* ==========================================================
     RETRY MODUL SOAL
  ========================================================== */

  const handleRetrySoalModule = () => {

    setSoalModuleKey(
      (previous) =>
        previous + 1
    );

  };


  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="space-y-6">

      {/* ======================================================
          TOP HEADER & 5-STEP INTERACTIVE PIPELINE
      ====================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#090D16] via-[#0E1424] to-[#15122B] border border-indigo-500/20 shadow-2xl p-5 sm:p-6 transition-all">
        {/* Glow ambient background accents */}
        <div className="absolute top-0 right-1/4 w-80 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-60 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* --- HEADER TITLE BAR --- */}
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="group p-3 rounded-2xl bg-[#141A29]/90 hover:bg-gradient-to-r hover:from-indigo-600 hover:to-indigo-500 text-slate-300 hover:text-white transition-all duration-200 cursor-pointer border border-slate-700/80 hover:border-indigo-400/50 shadow-lg shadow-black/30 hover:shadow-indigo-500/25 shrink-0 flex items-center justify-center"
                title="Kembali ke Galeri Administrasi"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              </button>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center flex-wrap gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/25 to-purple-600/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-md shadow-indigo-500/10 shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>

                <div>
                  <div className="flex items-center flex-wrap gap-2">
                    <h1 className="text-lg sm:text-xl font-black text-white tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300">
                      Evaluasi Pembelajaran
                    </h1>

                    <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-gradient-to-r from-indigo-500/25 to-purple-500/25 text-indigo-300 border border-indigo-400/30 flex items-center gap-1.5 shadow-sm shadow-indigo-500/10">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                      Alur Terpadu AI
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
                Alur administrasi evaluasi terpadu Penyusunan kisi-kisi CP/TP, bank verifikasi kisi, generator naskah soal AI, preview & cetak F4, serta interpretasi pedagogis hasil asesmen.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
            <span className="text-xs font-bold text-slate-200 bg-[#121827]/90 border border-slate-700/80 px-3.5 py-2 rounded-2xl flex items-center gap-2.5 shadow-md shadow-black/20">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20 animate-pulse" />
              Kurikulum Merdeka
            </span>
          </div>
        </div>

        {/* --- 5-STEP CONTINUOUS PIPELINE --- */}
        <div className="relative mt-6 pt-5 border-t border-slate-800/80">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {EVALUATION_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isActive = activeSubMenu === step.id;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    switch (step.id) {
                      case 'kisi_kisi':
                        handleOpenKisiKisi();
                        break;
                      case 'review_kisi_kisi':
                        handleOpenReviewKisiKisi();
                        break;
                      case 'soal':
                        handleOpenSoal();
                        break;
                      case 'review_soal':
                        handleOpenReviewSoal();
                        break;
                      case 'review':
                        handleOpenReviewHasil();
                        break;
                    }
                  }}
                  className={`group relative text-left p-3 rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between ${
                    isActive
                      ? `${step.activeBg} ${step.activeBorder} shadow-lg shadow-black/40`
                      : 'bg-slate-900/50 hover:bg-slate-800/60 border-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {/* Top row: step number + icon */}
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] font-black tracking-wider px-1.5 py-0.5 rounded-md border ${
                        isActive
                          ? step.glowColor
                          : 'bg-slate-800/80 text-slate-400 border-slate-700/60'
                      }`}
                    >
                      STEP {step.stepNumber}
                    </span>

                    <div
                      className={`p-1.5 rounded-lg transition-transform group-hover:scale-105 ${
                        isActive
                          ? `${step.glowColor}`
                          : 'bg-slate-800/60 text-slate-400'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Title & subtitle */}
                  <div className="min-w-0">
                    <div
                      className={`text-xs font-bold truncate leading-tight ${
                        isActive ? 'text-white' : 'text-slate-200 group-hover:text-white'
                      }`}
                    >
                      {step.title}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      {step.subtitle}
                    </div>
                  </div>

                  {/* Active highlight bar on bottom */}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/80 to-transparent" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

      </div>


      {/* ======================================================
          ACTIVE SUB-MENU CONTENT
      ====================================================== */}

      <div className="transition-all duration-200">

        {/* ====================================================
            1. PENYUSUNAN KISI-KISI
        ==================================================== */}

        {activeSubMenu ===
          'kisi_kisi' && (
          <EvaluationKisiKisiView
            onSelectBlueprintForQuestions={
              handleSelectBlueprintForQuestions
            }
            initialBlueprint={
              passedBlueprint
            }
          />
        )}


        {/* ====================================================
            2. REVIEW KISI-KISI
        ==================================================== */}

        {activeSubMenu ===
          'review_kisi_kisi' && (
          <EvaluationReviewKisiKisiView
            onEditBlueprint={
              handleEditBlueprintFromReview
            }
            onOpenBuilder={
              handleEditBlueprintFromReview
            }
            onSelectForQuestions={
              handleSelectBlueprintForQuestions
            }
          />
        )}


        {/* ====================================================
            3. PENYUSUNAN SOAL
        ==================================================== */}

        {activeSubMenu ===
          'soal' && (

          <Suspense
            key={soalModuleKey}
            fallback={
              <EvaluationSoalLoading />
            }
          >

            <EvaluationSoalErrorBoundary
              retryKey={soalModuleKey}
              onRetry={
                handleRetrySoalModule
              }
            >

              <EvaluationSoalView
                initialBlueprint={
                  passedBlueprint
                }
                onEditBlueprint={
                  handleEditBlueprint
                }
                onBlueprintDeleted={
                  handleBlueprintDeleted
                }
              />

            </EvaluationSoalErrorBoundary>

          </Suspense>

        )}


        {/* ====================================================
            4. REVIEW SOAL
        ==================================================== */}

        {activeSubMenu ===
          'review_soal' && (
          <EvaluationReviewSoalView />
        )}


        {/* ====================================================
            5. REVIEW HASIL UJIAN
        ==================================================== */}

        {activeSubMenu ===
          'review' && (
          <EvaluationReviewView />
        )}

      </div>

    </div>
  );
};


/* ============================================================
   ERROR BOUNDARY
   ============================================================

   React Error Boundary harus berupa class component.
   Tujuannya agar jika EvaluationSoalView mengalami error
   ketika render, seluruh EvaluationLearningView tidak ikut
   blank.

============================================================ */

interface EvaluationSoalErrorBoundaryProps {
  children: React.ReactNode;
  onRetry: () => void;
  retryKey: number;
}

interface EvaluationSoalErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class EvaluationSoalErrorBoundary extends Component<
  EvaluationSoalErrorBoundaryProps,
  EvaluationSoalErrorBoundaryState
> {

  constructor(
    props: EvaluationSoalErrorBoundaryProps
  ) {

    super(props);

    this.state = {
      hasError: false,
      errorMessage: '',
    };

  }


  static getDerivedStateFromError(
    error: unknown
  ): EvaluationSoalErrorBoundaryState {

    return {
      hasError: true,
      errorMessage:
        error instanceof Error
          ? error.message
          : String(error),
    };

  }


  componentDidCatch(
    error: unknown,
    errorInfo: React.ErrorInfo
  ) {

    console.error(
      '[EvaluationSoalView] Runtime error:',
      error
    );

    console.error(
      '[EvaluationSoalView] Component stack:',
      errorInfo.componentStack
    );

  }


  componentDidUpdate(
    previousProps: EvaluationSoalErrorBoundaryProps
  ) {

    if (
      previousProps.retryKey !==
      this.props.retryKey
    ) {

      if (this.state.hasError) {

        this.setState({
          hasError: false,
          errorMessage: '',
        });

      }

    }

  }


  render() {

    if (
      this.state.hasError
    ) {

      return (
        <EvaluationSoalErrorFallback
          onRetry={
            this.props.onRetry
          }
        />
      );

    }

    return this.props.children;

  }

}


/* ============================================================
   DEFAULT EXPORT
============================================================ */

export default EvaluationLearningView;