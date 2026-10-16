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
  X,
  GraduationCap,
  Sparkles,
  ClipboardCheck,
  BookOpenCheck,
  Loader2,
  AlertTriangle,
  RefreshCw,
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
    activeBg: 'bg-emerald-50',
    activeBorder: 'border-emerald-300 ring-1 ring-emerald-100',
    activeText: 'text-emerald-700',
    glowColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    id: 'review_kisi_kisi',
    stepNumber: '02',
    title: 'Review Kisi-Kisi',
    subtitle: 'Verifikasi & Bank Kisi',
    icon: BookOpenCheck,
    activeBg: 'bg-emerald-50',
    activeBorder: 'border-emerald-300 ring-1 ring-emerald-100',
    activeText: 'text-emerald-700',
    glowColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    id: 'soal',
    stepNumber: '03',
    title: 'Penyusunan Soal',
    subtitle: 'AI Generator & Editor',
    icon: FileQuestion,
    activeBg: 'bg-emerald-50',
    activeBorder: 'border-emerald-300 ring-1 ring-emerald-100',
    activeText: 'text-emerald-700',
    glowColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    id: 'review_soal',
    stepNumber: '04',
    title: 'Review Naskah',
    subtitle: 'Cetak F4 (Word & PDF)',
    icon: ClipboardCheck,
    activeBg: 'bg-emerald-50',
    activeBorder: 'border-emerald-300 ring-1 ring-emerald-100',
    activeText: 'text-emerald-700',
    glowColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    id: 'review',
    stepNumber: '05',
    title: 'Hasil & Diagnosa',
    subtitle: 'Analisis Nilai & Remedial',
    icon: Brain,
    activeBg: 'bg-emerald-50',
    activeBorder: 'border-emerald-300 ring-1 ring-emerald-100',
    activeText: 'text-emerald-700',
    glowColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
];

/* ============================================================
   LOADING FALLBACK UNTUK MODUL SOAL
============================================================ */

const EvaluationSoalLoading: React.FC = () => {
  return (
    <div className="min-h-[360px] flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">

        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
        </div>

        <h3 className="mt-4 text-sm font-bold text-slate-800">
          Memuat Penyusunan Soal
        </h3>

        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
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
      <div className="w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">

        <div className="flex items-start gap-4">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-rose-50">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
          </div>

          <div className="min-w-0">

            <h3 className="text-sm font-bold text-slate-800">
              Modul Penyusunan Soal Tidak Dapat Dimuat
            </h3>

            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              Modul penyusunan soal gagal dimuat.
              Menu Evaluasi lainnya tetap tersedia.
            </p>

            <button
              type="button"
              onClick={onRetry}
              className="mt-4 flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800"
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

  // Indeks ini hanya digunakan untuk menampilkan progres visual.
  const activeStepIndex = EVALUATION_STEPS.findIndex(
    (step) => step.id === activeSubMenu
  );

  return (
    <div className="space-y-4 sm:space-y-5">

      {/* ======================================================
          HEADER RINGKAS + PROGRESS STEPPER
          Tampilan saja; handler dan alur navigasi tetap sama.
      ====================================================== */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-4 py-4 sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700 sm:h-11 sm:w-11">
              <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h1 className="font-heading text-base font-bold tracking-tight text-slate-800 sm:text-lg">
                  Evaluasi Pembelajaran
                </h1>

                <span className="inline-flex items-center gap-1 rounded-full border border-violet-100 bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700 sm:text-[11px]">
                  <Sparkles className="h-3 w-3" />
                  Alur AI
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 sm:text-[11px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  Kurikulum Merdeka
                </span>
              </div>

              <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-[13px]">
                Kelola kisi-kisi, naskah soal, dan hasil evaluasi.
              </p>
            </div>
          </div>

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Tutup Evaluasi Pembelajaran"
              title="Tutup"
              className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors duration-150 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:h-10 sm:w-10"
            >
              <X className="h-4 w-4 transition-transform duration-150 group-hover:rotate-90 sm:h-[18px] sm:w-[18px]" />
            </button>
          )}
        </div>

        {/* Five-step progress stepper */}
        <div className="border-t border-slate-100 px-3 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5">
          <div className="relative">
            {/* Track */}
            <div className="absolute left-[10%] right-[10%] top-4 h-0.5 rounded-full bg-slate-200" />
            <div
              className="absolute left-[10%] top-4 h-0.5 rounded-full bg-emerald-600 transition-all duration-200"
              style={{
                width: `${Math.max(0, Math.min(100, (activeStepIndex / (EVALUATION_STEPS.length - 1)) * 80))}%`,
              }}
            />

            <div className="relative grid grid-cols-5 gap-1 sm:gap-2">
              {EVALUATION_STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isActive = activeSubMenu === step.id;
                const isCompleted = idx < activeStepIndex;

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
                    aria-current={isActive ? 'step' : undefined}
                    className="group flex min-w-0 flex-col items-center rounded-lg px-0.5 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:px-1"
                  >
                    <span
                      className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-bold transition-colors duration-150 sm:h-9 sm:w-9 sm:text-xs ${
                        isActive
                          ? 'border-emerald-700 bg-emerald-700 text-white shadow-sm shadow-emerald-700/15'
                          : isCompleted
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-white text-slate-500 group-hover:border-emerald-200 group-hover:text-emerald-700'
                      }`}
                    >
                      {step.stepNumber}
                    </span>

                    <span
                      className={`mt-2 line-clamp-2 text-[10px] font-semibold leading-tight sm:text-xs ${
                        isActive
                          ? 'text-emerald-800'
                          : 'text-slate-600 group-hover:text-emerald-700'
                      }`}
                    >
                      {step.title}
                    </span>

                    <span className="mt-1 hidden max-w-full truncate text-[10px] leading-tight text-slate-400 sm:block">
                      {step.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

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