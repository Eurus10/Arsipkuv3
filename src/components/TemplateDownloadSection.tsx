import React, { useState } from 'react';
import {
  FileSpreadsheet,
  LayoutTemplate,
  GraduationCap,
  Download,
  ExternalLink,
  Edit2,
  FileDown,
  FileText,
  FolderUp,
  FolderOpen,
  Info,
  ClipboardList,
  ArrowRight,
  Clock3,
  Calendar,
  Settings2,
  X,
  Sparkles,
  Calculator,
  Plus,
  Trash2,
  Check,
  ChevronsRight,
  Copy,
  BarChart2,
  CheckCircle2,
  FlaskConical,
  CheckSquare,
  BookOpen,
} from 'lucide-react';

import {
  SchoolTemplateItem,
  ExamBreakdownItem,
  ExamUploadConfig,
  ExamScheduleSet,
  ExamScheduleRow,
  ActiveExamSchedule,
  DEFAULT_EXAM_BREAKDOWNS,
  DEFAULT_EXAM_SCHEDULES,
  DEFAULT_ACTIVE_EXAM_SCHEDULE,
} from '../types';

import {
  sanitizeDriveUrl,
} from '../utils/driveHelpers';

import { EditTemplateModal } from './EditTemplateModal';
import { AnalisisSoalGeneratorModal } from './AnalisisSoalGeneratorModal';
import { ActiveExamScheduleModal } from './ActiveExamScheduleModal';
import { PbsCopyModal } from './PbsCopyModal';
import { checkFeatureAccess, verifyActiveTokenRealtime } from '../services/tokenAuthService';
import { TokenAccessModal } from './auth/TokenAccessModal';
import { getActiveTeacherSession, verifyActiveTeacherSessionRealtime } from '../services/teacherStorage';
import { DriveFolderTransitionModal } from './DriveFolderTransitionModal';

interface TemplateDownloadSectionProps {
  templates: SchoolTemplateItem[];

  examBreakdowns?: ExamBreakdownItem[];

  examSchedules?: ExamScheduleSet[];

  activeExamSchedule?: ActiveExamSchedule;

  isAdmin?: boolean;

  onRequestTeacherAuth?: (targetName: string, onSuccessCallback?: () => void) => void;

  onUpdateTemplate?: (
    templateId: string,
    updates: Partial<SchoolTemplateItem>
  ) => Promise<void>;

  onUpdateExamConfig?: (
    updates: Partial<ExamUploadConfig>
  ) => Promise<void>;

  onNavigateToTracking?: () => void;

  onOpenEvaluation?: () => void;

  onOpenRaporSts?: () => void;
}

type TemplateMenuConfig = {
  title: string;
  description: string;
  fileFormat: string;
  buttonLabel: string;
};

const TEMPLATE_MENU_CONFIG: Record<
  SchoolTemplateItem['category'],
  TemplateMenuConfig
> = {
  analisis_soal: {
    title: 'Template Generator Lembar Analisis',
    description:
      'Template analisis butir soal ujian mudah dan Mobile.',
    fileFormat: 'Excel & Word',
    buttonLabel: 'Buka Template',
  },

  rapor: {
    title: 'Template Rapor',
    description:
      'Template pengolahan nilai rapor, capaian pembelajaran, dan rekap leger.',
    fileFormat: 'Excel (.xlsx)',
    buttonLabel: 'Buka Template Rapor',
  },

  folder_soal: {
    title: 'Folder Kosong Pengumpulan Soal',
    description:
      'Folder Google Drive kosong untuk tempat pengumpulan naskah soal dari guru.',
    fileFormat: 'Folder Drive',
    buttonLabel: 'Buka Folder Drive',
  },

  tracking_soal: {
    title: 'Tracking Pengumpulan Soal',
    description:
      'Pantau status pengumpulan dan pencetakan naskah soal untuk seluruh kelas.',
    fileFormat: 'Menu Tracking',
    buttonLabel: 'Buka Tracking',
  },
};

/**
 * ============================================================
 * HELPER INFO BUTIR SOAL
 * ============================================================
 */

/**
 * Mengambil angka pertama dari teks seperti:
 *
 * "20 Soal Pilihan Ganda (Bobot 1)"
 * menjadi:
 *
 * 20
 */
const extractQuestionCount = (
  value?: string
): number => {
  if (!value) return 0;

  const match =
    String(value).match(/\d+/);

  return match
    ? Number(match[0]) || 0
    : 0;
};

/**
 * Label singkat tab Info Butir Soal.
 *
 * Hanya 3 jenis ujian:
 * 0 = STS
 * 1 = SAS
 * 2 = US
 */
const getExamShortLabel = (
  index: number
): string => {
  switch (index) {
    case 0:
      return 'STS';

    case 1:
      return 'SAS';

    case 2:
      return 'US';

    default:
      return 'Ujian';
  }
};

/**
 * Label Bagian C dibuat tetap dinamis.
 *
 * Contoh:
 * "5 Soal Uraian"
 * "5 Soal Essay"
 * "5 Soal Menjodohkan"
 */
const getPartCLabel = (
  value?: string
): string => {
  const text =
    String(value || '').toLowerCase();

  if (
    text.includes('menjodohkan')
  ) {
    return 'Menjodohkan';
  }

  if (
    text.includes('essay')
  ) {
    return 'Essay';
  }

  return 'Uraian';
};

/**
 * ============================================================
 * KETENTUAN BUTIR SOAL
 * ============================================================
 *
 * Data ini hanya digunakan untuk tampilan Info Butir Soal.
 * Struktur dibuat terpisah dari examBreakdowns agar tidak
 * mengganggu fungsi lama yang memakai detail ujian.
 *
 * STS, SAS, dan US memiliki konfigurasi masing-masing.
 * Untuk saat ini nilainya mengikuti ketentuan yang diberikan.
 */
type QuestionRuleRow = {
  label: string;
  pg: number;
  isian: number;
  essay: number;
};

type QuestionRuleSet = {
  label: string;
  rows: QuestionRuleRow[];
};

const DEFAULT_QUESTION_RULES: QuestionRuleSet[] = [
  {
    label: 'STS',
    rows: [
      { label: '1–2', pg: 20, isian: 10, essay: 5 },
      { label: '3', pg: 25, isian: 10, essay: 5 },
      { label: '4–6', pg: 30, isian: 5, essay: 5 },
      { label: 'B. Arab', pg: 30, isian: 5, essay: 5 },
      { label: 'B. Inggris', pg: 30, isian: 5, essay: 5 },
      { label: 'Matematika', pg: 30, isian: 5, essay: 5 },
    ],
  },
  {
    label: 'SAS',
    rows: [
      { label: '1–2', pg: 20, isian: 10, essay: 5 },
      { label: '3', pg: 25, isian: 10, essay: 5 },
      { label: '4–6', pg: 30, isian: 5, essay: 5 },
      { label: 'B. Arab', pg: 30, isian: 5, essay: 5 },
      { label: 'B. Inggris', pg: 30, isian: 5, essay: 5 },
      { label: 'Matematika', pg: 30, isian: 5, essay: 5 },
    ],
  },
  {
    label: 'US',
    rows: [
      { label: '1–2', pg: 20, isian: 10, essay: 5 },
      { label: '3', pg: 25, isian: 10, essay: 5 },
      { label: '4–6', pg: 30, isian: 5, essay: 5 },
      { label: 'B. Arab', pg: 30, isian: 5, essay: 5 },
      { label: 'B. Inggris', pg: 30, isian: 5, essay: 5 },
      { label: 'Matematika', pg: 30, isian: 5, essay: 5 },
    ],
  },
];

export const TemplateDownloadSection: React.FC<
  TemplateDownloadSectionProps
> = ({
  templates,
  examBreakdowns = DEFAULT_EXAM_BREAKDOWNS,
  examSchedules = DEFAULT_EXAM_SCHEDULES,
  activeExamSchedule = DEFAULT_ACTIVE_EXAM_SCHEDULE,
  isAdmin = false,
  onRequestTeacherAuth,
  onUpdateTemplate,
  onUpdateExamConfig,
  onNavigateToTracking,
  onOpenEvaluation,
  onOpenRaporSts,
}) => {
  const [
    editingTemplate,
    setEditingTemplate,
  ] = useState<SchoolTemplateItem | null>(
    null
  );

  const [
    selectedExamBreakdown,
    setSelectedExamBreakdown,
  ] = useState<ExamBreakdownItem | null>(
    null
  );

  const [
    showBreakdownSelector,
    setShowBreakdownSelector,
  ] = useState(false);

  const [
    selectedExamIndex,
    setSelectedExamIndex,
  ] = useState(0);

  // ============================================================
  // JADWAL UJIAN
  // ============================================================

  const [
    showScheduleModal,
    setShowScheduleModal,
  ] = useState(false);

  const [
    selectedScheduleIndex,
    setSelectedScheduleIndex,
  ] = useState(0);

  const [schedulesData, setSchedulesData] = useState<ExamScheduleSet[]>(
    examSchedules && examSchedules.length > 0 ? examSchedules : DEFAULT_EXAM_SCHEDULES
  );

  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [editingScheduleRows, setEditingScheduleRows] = useState<ExamScheduleRow[]>([]);
  const [editingSchedulePeriod, setEditingSchedulePeriod] = useState('');
  const [editingScheduleDuration, setEditingScheduleDuration] = useState('');
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // ============================================================
  // KALKULATOR SKOR NILAI
  // ============================================================

  const [
    showScoreCalculator,
    setShowScoreCalculator,
  ] = useState(false);

  const [
    scoreTotalQuestions,
    setScoreTotalQuestions,
  ] = useState('');

  const [
    scoreCorrectAnswers,
    setScoreCorrectAnswers,
  ] = useState('');
  const [
    isEditingBreakdown,
    setIsEditingBreakdown,
  ] = useState(false);

  const [editingQuestionRules, setEditingQuestionRules] =
    useState<QuestionRuleRow[]>([]);

  const [isSavingBreakdown, setIsSavingBreakdown] =
    useState(false);

  const [
    isAnalisisGeneratorOpen,
    setIsAnalisisGeneratorOpen,
  ] = useState(false);

  const [
    isTokenModalOpen,
    setIsTokenModalOpen,
  ] = useState(false);

  const [isPbsModalOpen, setIsPbsModalOpen] = useState(false);

  const [pendingFeatureType, setPendingFeatureType] = useState<'analysis' | 'evaluation' | null>(null);

  const [driveTransitionModal, setDriveTransitionModal] = useState<{
    isOpen: boolean;
    targetUrl: string;
    title: string;
  }>({
    isOpen: false,
    targetUrl: '',
    title: '',
  });

  const launchDriveLink = (tpl: SchoolTemplateItem) => {
    const url = sanitizeDriveUrl(tpl.driveUrl);
    if (!url) return;

    if (tpl.category === 'folder_soal' || tpl.id === 'tmpl_folder_soal') {
      setDriveTransitionModal({
        isOpen: true,
        targetUrl: url,
        title: tpl.title || 'Folder Kosong Pengumpulan Soal',
      });
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Handler for opening protected drive templates (Template Rapor & Folder Kosong)
  const handleOpenDriveTemplate = async (tpl: SchoolTemplateItem) => {
    const config = TEMPLATE_MENU_CONFIG[tpl.category];
    const featureTitle = config ? config.title : 'Template';

    if (!isAdmin) {
      const activeTeacher = getActiveTeacherSession();
      if (!activeTeacher) {
        if (onRequestTeacherAuth) {
          onRequestTeacherAuth(featureTitle, () => {
            launchDriveLink(tpl);
          });
        }
        return;
      }

      // JIT Real-time verification (check if kicked / blocked in Firestore)
      const verification = await verifyActiveTeacherSessionRealtime();
      if (!verification.isValid) {
        if (onRequestTeacherAuth) {
          onRequestTeacherAuth(featureTitle, () => {
            launchDriveLink(tpl);
          });
        }
        return;
      }
    }

    launchDriveLink(tpl);
  };

  const handleOpenAnalisisGenerator = async () => {
    // 1. Instant local fast check
    const { hasAccess } = checkFeatureAccess('analysis', !!isAdmin);
    if (!hasAccess) {
      setPendingFeatureType('analysis');
      setIsTokenModalOpen(true);
      return;
    }

    // 2. Realtime Cloud Firestore validation (check revoked / expired / kicked device)
    if (!isAdmin) {
      const { isValid } = await verifyActiveTokenRealtime('analysis', false);
      if (!isValid) {
        setPendingFeatureType('analysis');
        setIsTokenModalOpen(true);
        return;
      }
    }

    setIsAnalisisGeneratorOpen(true);
  };

  const handleOpenEvaluationFeature = async () => {
    // 1. Instant local fast check
    const { hasAccess } = checkFeatureAccess('evaluation', !!isAdmin);
    if (!hasAccess) {
      setPendingFeatureType('evaluation');
      setIsTokenModalOpen(true);
      return;
    }

    // 2. Realtime Cloud Firestore validation
    if (!isAdmin) {
      const { isValid } = await verifyActiveTokenRealtime('evaluation', false);
      if (!isValid) {
        setPendingFeatureType('evaluation');
        setIsTokenModalOpen(true);
        return;
      }
    }

    if (onOpenEvaluation) {
      onOpenEvaluation();
    }
  };

  const effectiveBreakdowns = (
    examBreakdowns.length > 0
      ? examBreakdowns
      : DEFAULT_EXAM_BREAKDOWNS
  )
    .filter(
      (item) =>
        item.id !== 'penilaian-harian' &&
        !item.name.toLowerCase().includes('penilaian harian')
    )
    .slice(0, 3);

  const activeBreakdown =
    effectiveBreakdowns[
      selectedExamIndex
    ] ??
    effectiveBreakdowns[0] ??
    null;

  /**
   * ============================================================
   * MENU TEMPLATE
   * ============================================================
   *
   * Tiga menu berikut berasal dari Firestore.
   * Tracking dibuat sebagai menu internal terpisah.
   */
  const templateCategories:
    SchoolTemplateItem['category'][] = [
      'analisis_soal',
      'rapor',
      'folder_soal',
    ];

  const getTemplateItem = (category: SchoolTemplateItem['category']): SchoolTemplateItem => {
    const existing = templates.find((t) => t.category === category);
    if (existing) return existing;
    return {
      id: `tmpl_${category}`,
      category: category,
      title: TEMPLATE_MENU_CONFIG[category]?.title || '',
      description: TEMPLATE_MENU_CONFIG[category]?.description || '',
      fileFormat: TEMPLATE_MENU_CONFIG[category]?.fileFormat || '',
      driveUrl: '',
      updatedAt: '',
    };
  };

  /**
   * Component Latar Belakang Awan Lembut & Volumetric Multi-Layer
   * Menghasilkan efek awan bercahaya multi-layer di belakang aset 3D yang memenuhi area card
   * dengan opacity rendah yang elegan sehingga tidak mengganggu teks maupun tombol.
   */
  const CardCloudBackground = ({
    theme,
  }: {
    theme: 'indigo' | 'cyan' | 'amber' | 'emerald' | 'purple';
  }) => {
    const themeStyles = {
      indigo: {
        nebula: 'from-indigo-600/20 via-purple-600/10 to-transparent',
        puffsPrimary: 'rgba(129, 140, 248, 0.18)',
        puffsSecondary: 'rgba(167, 139, 250, 0.14)',
        puffsTertiary: 'rgba(192, 132, 252, 0.10)',
        mistBase: 'from-indigo-600/25 via-indigo-950/15 to-transparent',
      },
      cyan: {
        nebula: 'from-cyan-500/20 via-teal-500/10 to-transparent',
        puffsPrimary: 'rgba(34, 211, 238, 0.18)',
        puffsSecondary: 'rgba(45, 212, 191, 0.14)',
        puffsTertiary: 'rgba(56, 189, 248, 0.10)',
        mistBase: 'from-cyan-500/25 via-cyan-950/15 to-transparent',
      },
      amber: {
        nebula: 'from-amber-500/20 via-orange-500/10 to-transparent',
        puffsPrimary: 'rgba(251, 191, 36, 0.18)',
        puffsSecondary: 'rgba(251, 146, 60, 0.14)',
        puffsTertiary: 'rgba(253, 224, 71, 0.10)',
        mistBase: 'from-amber-500/25 via-amber-950/15 to-transparent',
      },
      emerald: {
        nebula: 'from-emerald-500/20 via-teal-500/10 to-transparent',
        puffsPrimary: 'rgba(52, 211, 153, 0.18)',
        puffsSecondary: 'rgba(45, 212, 191, 0.14)',
        puffsTertiary: 'rgba(110, 231, 183, 0.10)',
        mistBase: 'from-emerald-500/25 via-emerald-950/15 to-transparent',
      },
      purple: {
        nebula: 'from-purple-500/20 via-fuchsia-500/10 to-transparent',
        puffsPrimary: 'rgba(192, 132, 252, 0.18)',
        puffsSecondary: 'rgba(232, 121, 249, 0.14)',
        puffsTertiary: 'rgba(216, 180, 254, 0.10)',
        mistBase: 'from-purple-500/25 via-purple-950/15 to-transparent',
      },
    };

    const cur = themeStyles[theme];

    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        {/* Layer 1: Ambient Radial Nebula covering full card */}
        <div
          className={`absolute -inset-4 bg-radial ${cur.nebula} blur-3xl opacity-60 group-hover:opacity-90 group-hover:scale-110 transition-all duration-700`}
        />

        {/* Layer 2: Wide Background Cloud Layer (Distant Soft Clouds) */}
        <svg
          viewBox="0 0 200 120"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full opacity-60 group-hover:opacity-85 transition-opacity duration-700 filter blur-[6px]"
          fill="none"
        >
          {/* Broad soft cloud masses covering upper and middle card */}
          <circle cx="35" cy="50" r="45" fill={cur.puffsTertiary} />
          <circle cx="100" cy="45" r="55" fill={cur.puffsSecondary} />
          <circle cx="165" cy="50" r="45" fill={cur.puffsTertiary} />
          <ellipse cx="100" cy="70" rx="90" ry="35" fill={cur.puffsTertiary} />
        </svg>

        {/* Layer 3: Mid-ground Organic Cloud Formation directly framing the 3D Asset */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            viewBox="0 0 160 100"
            className="w-[115%] h-auto opacity-75 group-hover:opacity-95 group-hover:scale-105 transition-all duration-700 filter blur-[2.5px]"
            fill="none"
          >
            {/* Base lower puff */}
            <ellipse cx="80" cy="65" rx="68" ry="26" fill={cur.puffsPrimary} />
            {/* Left flank puff */}
            <circle cx="44" cy="52" r="30" fill={cur.puffsSecondary} />
            {/* Main center top puff */}
            <circle cx="80" cy="40" r="35" fill={cur.puffsPrimary} />
            {/* Right flank puff */}
            <circle cx="118" cy="52" r="30" fill={cur.puffsSecondary} />
            {/* Upper secondary puff */}
            <circle cx="98" cy="32" r="22" fill={cur.puffsTertiary} />
            <circle cx="62" cy="34" r="20" fill={cur.puffsTertiary} />
          </svg>
        </div>

        {/* Layer 4: Volumetric Mist Floor to fuse bottom seamlessly */}
        <div
          className={`absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t ${cur.mistBase} blur-md opacity-70 group-hover:opacity-90 transition-opacity duration-500`}
        />
      </div>
    );
  };

  const visibleTemplates =
    templateCategories
      .map((category) =>
        templates.find(
          (template) =>
            template.category ===
            category
        )
      )
      .filter(Boolean) as SchoolTemplateItem[];

  /**
   * ============================================================
   * THEME TEMPLATE
   * ============================================================
   */

  const getTemplateTheme = (
    category: SchoolTemplateItem['category']
  ) => {
    switch (category) {
      case 'analisis_soal':
        return {
          cardBg:
            'bg-gradient-to-br from-[#121E28] via-[#14232F] to-[#111A24]',
          cardBorder:
            'border-cyan-500/30 hover:border-cyan-400/70',
          hoverGlow:
            'group-hover:shadow-cyan-500/15',
          ambientGradient:
            'from-cyan-500/20 to-teal-500/0',
          iconBg:
            'bg-cyan-500/15 border border-cyan-500/30 text-cyan-300',
          badgeBg:
            'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
          btnBg:
            'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-cyan-500/20',
          titleHover:
            'group-hover:text-cyan-300',
          buttonIcon: Download,
        };

      case 'rapor':
        return {
          cardBg:
            'bg-gradient-to-br from-[#241A14] via-[#2A1E14] to-[#1A1412]',
          cardBorder:
            'border-amber-500/30 hover:border-amber-400/70',
          hoverGlow:
            'group-hover:shadow-amber-500/15',
          ambientGradient:
            'from-amber-500/20 to-orange-500/0',
          iconBg:
            'bg-amber-500/15 border border-amber-500/30 text-amber-300',
          badgeBg:
            'bg-amber-500/15 text-amber-300 border-amber-500/30',
          btnBg:
            'bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold shadow-amber-500/20',
          titleHover:
            'group-hover:text-amber-300',
          buttonIcon: Download,
        };

      case 'folder_soal':
        return {
          cardBg:
            'bg-gradient-to-br from-[#12221E] via-[#142A24] to-[#0F1B18]',
          cardBorder:
            'border-emerald-500/30 hover:border-emerald-400/70',
          hoverGlow:
            'group-hover:shadow-emerald-500/15',
          ambientGradient:
            'from-emerald-500/20 to-teal-500/0',
          iconBg:
            'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300',
          badgeBg:
            'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          btnBg:
            'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-emerald-500/20',
          titleHover:
            'group-hover:text-emerald-300',
          buttonIcon: FolderOpen,
        };

      case 'tracking_soal':
        return {
          cardBg:
            'bg-gradient-to-br from-[#1E122E] via-[#251538] to-[#180E24]',
          cardBorder:
            'border-purple-500/30 hover:border-purple-400/70',
          hoverGlow:
            'group-hover:shadow-purple-500/15',
          ambientGradient:
            'from-purple-500/20 to-indigo-500/0',
          iconBg:
            'bg-purple-500/15 border border-purple-500/30 text-purple-300',
          badgeBg:
            'bg-purple-500/15 text-purple-300 border-purple-500/30',
          btnBg:
            'bg-purple-500 hover:bg-purple-400 text-white font-bold shadow-purple-500/20',
          titleHover:
            'group-hover:text-purple-300',
          buttonIcon: ClipboardList,
        };
    }
  };

  /**
   * ============================================================
   * TEMPLATE ICON
   * ============================================================
   */

  const getTemplateIcon = (
    category: SchoolTemplateItem['category']
  ) => {
    switch (category) {
      case 'analisis_soal':
        return (
          <FileSpreadsheet className="w-6 h-6 text-cyan-400" />
        );

      case 'rapor':
        return (
          <GraduationCap className="w-6 h-6 text-amber-400" />
        );

      case 'folder_soal':
        return (
          <FolderUp className="w-6 h-6 text-emerald-400" />
        );

      case 'tracking_soal':
        return (
          <ClipboardList className="w-6 h-6 text-purple-400" />
        );

      default:
        return (
          <LayoutTemplate className="w-6 h-6 text-indigo-400" />
        );
    }
  };

  /**
   * ============================================================
   * BUKA INFO BUTIR SOAL
   * ============================================================
   */

  const getQuestionRulesForIndex = (index: number): QuestionRuleRow[] => {
    const savedRules = effectiveBreakdowns[index]?.questionRules;

    if (Array.isArray(savedRules) && savedRules.length > 0) {
      return savedRules.map((row) => ({
        label: row.label,
        pg: Number(row.pg) || 0,
        isian: Number(row.isian) || 0,
        essay: Number(row.essay) || 0,
      }));
    }

    return (
      DEFAULT_QUESTION_RULES[
        Math.min(index, DEFAULT_QUESTION_RULES.length - 1)
      ]?.rows.map((row) => ({ ...row })) || []
    );
  };

  const beginEditingBreakdown = () => {
    setEditingQuestionRules(
      getQuestionRulesForIndex(selectedExamIndex)
    );
    setIsEditingBreakdown(true);
  };

  const updateEditingQuestionRule = (
    rowIndex: number,
    field: 'label' | 'pg' | 'isian' | 'essay',
    value: string
  ) => {
    setEditingQuestionRules((current) =>
      current.map((row, index) =>
        index === rowIndex
          ? {
              ...row,
              [field]:
                field === 'label'
                  ? value
                  : Math.max(0, Number(value) || 0),
            }
          : row
      )
    );
  };

  const addEditingQuestionRule = () => {
    setEditingQuestionRules((current) => [
      ...current,
      {
        label: 'Mapel Baru',
        pg: 0,
        isian: 0,
        essay: 0,
      },
    ]);
  };

  const deleteEditingQuestionRule = (rowIndex: number) => {
    setEditingQuestionRules((current) => {
      if (current.length <= 1) {
        return current;
      }

      return current.filter((_, index) => index !== rowIndex);
    });
  };

  const saveBreakdownRules = async () => {
    if (!onUpdateExamConfig) {
      setIsEditingBreakdown(false);
      return;
    }

    try {
      setIsSavingBreakdown(true);

      const updatedBreakdowns = effectiveBreakdowns
        .filter(
          (item) =>
            item.id !== 'penilaian-harian' &&
            !item.name.toLowerCase().includes('penilaian harian')
        )
        .slice(0, 3)
        .map((item, index) =>
          index === selectedExamIndex
            ? {
                ...item,
                questionRules: editingQuestionRules.map(
                  (row, rowIndex) => ({
                    id: `${item.id}-rule-${rowIndex}`,
                    label: row.label,
                    pg: Number(row.pg) || 0,
                    isian: Number(row.isian) || 0,
                    essay: Number(row.essay) || 0,
                  })
                ),
              }
            : item
        );

      await onUpdateExamConfig({
        examBreakdowns: updatedBreakdowns,
      });

      setIsEditingBreakdown(false);
    } catch (error) {
      console.error('Gagal menyimpan ketentuan butir soal:', error);
      window.alert(
        'Gagal menyimpan ketentuan butir soal. Silakan coba lagi.'
      );
    } finally {
      setIsSavingBreakdown(false);
    }
  };

  const openBreakdownModal = () => {
    setSelectedExamIndex(0);
    setSelectedExamBreakdown(null);
    setEditingQuestionRules(getQuestionRulesForIndex(0));
    setIsEditingBreakdown(false);
    setShowBreakdownSelector(true);
  };

  const closeBreakdownModal = () => {
    setShowBreakdownSelector(false);
    setSelectedExamBreakdown(null);
    setIsEditingBreakdown(false);
  };

  // ============================================================
  // HANDLER JADWAL UJIAN
  // ============================================================
  const activeSchedule =
    schedulesData[selectedScheduleIndex] || DEFAULT_EXAM_SCHEDULES[0];

  const openScheduleModal = () => {
    setSelectedScheduleIndex(0);
    setIsEditingSchedule(false);
    setShowScheduleModal(true);
  };

  const closeScheduleModal = () => {
    setShowScheduleModal(false);
    setIsEditingSchedule(false);
  };

  const handleStartEditSchedule = () => {
    setEditingScheduleRows(
      JSON.parse(JSON.stringify(activeSchedule.rows || []))
    );
    setEditingSchedulePeriod(activeSchedule.period || '');
    setEditingScheduleDuration(activeSchedule.duration || '');
    setIsEditingSchedule(true);
  };

  const handleSaveSchedule = async () => {
    setIsSavingSchedule(true);
    try {
      const updatedSchedules = schedulesData.map((s, idx) => {
        if (idx === selectedScheduleIndex) {
          return {
            ...s,
            period: editingSchedulePeriod,
            duration: editingScheduleDuration,
            rows: editingScheduleRows,
          };
        }
        return s;
      });
      setSchedulesData(updatedSchedules);
      if (onUpdateExamConfig) {
        await onUpdateExamConfig({ examSchedules: updatedSchedules });
      }
      setIsEditingSchedule(false);
    } catch (error) {
      console.error('Gagal menyimpan jadwal ujian:', error);
      window.alert('Gagal menyimpan jadwal ujian. Silakan coba lagi.');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleAddScheduleRow = () => {
    const newRow: ExamScheduleRow = {
      id: `sched-row-${Date.now()}`,
      day: 'Senin',
      session: '07.30 – 09.00',
      subject: '',
      classes: 'Kelas 1–6',
    };
    setEditingScheduleRows((prev) => [...prev, newRow]);
  };

  const handleDeleteScheduleRow = (rowId: string) => {
    setEditingScheduleRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const handleUpdateScheduleRowField = (
    index: number,
    field: keyof ExamScheduleRow,
    value: string
  ) => {
    setEditingScheduleRows((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], [field]: value };
      }
      return copy;
    });
  };

  return (
    <section className="mb-8">

      {/* ======================================================
          HEADER
          ====================================================== */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 mb-3.5 sm:mb-4">

        {/* ====================================================
            JUDUL AKSES CEPAT
            ==================================================== */}

        <div className="flex items-center gap-2.5 min-w-0">

          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 flex-shrink-0">
            <FileDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>

          <div className="min-w-0">

            <h2 className="text-sm sm:text-lg font-bold text-white font-heading tracking-tight">
              Akses Cepat Ujian & Template
            </h2>

            <p className="hidden sm:block text-[11px] sm:text-xs text-slate-400 mt-0.5">
              Akses cepat ke template, folder pengumpulan, dan tracking soal.
            </p>

          </div>

        </div>


        {/* ====================================================
            AKSI HEADER DESKTOP (CIRCULAR 3D GLASSMORPHISM BUTTONS)
            Urutan: 1. Info Butir Soal, 2. Jadwal, 3. Skor Nilai, 4. Salin Data
            ==================================================== */}

        <div className="hidden sm:flex items-center gap-3 md:gap-4 flex-shrink-0">

          {/* 1. INFO BUTIR SOAL */}
          <button
            type="button"
            onClick={openBreakdownModal}
            className="flex flex-col items-center justify-center group cursor-pointer focus:outline-none"
            title="Informasi Butir Soal & Kisi-Kisi Ujian"
          >
            <div className="relative w-11 h-11 md:w-12 md:h-12 rounded-full bg-gradient-to-b from-cyan-400/30 via-cyan-500/15 to-cyan-950/90 border border-cyan-400/70 shadow-[0_0_16px_rgba(34,211,238,0.35)] flex items-center justify-center text-cyan-300 transition-all duration-300 group-hover:scale-105 group-active:scale-95 group-hover:border-cyan-300 group-hover:shadow-[0_0_22px_rgba(34,211,238,0.6)]">
              <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
              <FileText className="w-5 h-5 text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
            </div>

            <span className="text-[11px] font-bold text-slate-200 mt-1.5 tracking-tight group-hover:text-cyan-300 transition-colors whitespace-nowrap">
              Info Soal
            </span>
          </button>


          {/* 2. JADWAL */}
          <button
            type="button"
            onClick={openScheduleModal}
            className="flex flex-col items-center justify-center group cursor-pointer focus:outline-none"
            title="Jadwal Pelaksanaan Ujian"
          >
            <div className="relative w-11 h-11 md:w-12 md:h-12 rounded-full bg-gradient-to-b from-emerald-400/30 via-emerald-500/15 to-emerald-950/90 border border-emerald-400/70 shadow-[0_0_16px_rgba(52,211,153,0.35)] flex items-center justify-center text-emerald-300 transition-all duration-300 group-hover:scale-105 group-active:scale-95 group-hover:border-emerald-300 group-hover:shadow-[0_0_22px_rgba(52,211,153,0.6)]">
              <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
              <Calendar className="w-5 h-5 text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
            </div>

            <span className="text-[11px] font-bold text-slate-200 mt-1.5 tracking-tight group-hover:text-emerald-300 transition-colors whitespace-nowrap">
              Jadwal
            </span>
          </button>


          {/* 3. SKOR NILAI */}
          <button
            type="button"
            onClick={() => setShowScoreCalculator(true)}
            className="flex flex-col items-center justify-center group cursor-pointer focus:outline-none"
            title="Kalkulator Skor Nilai Ujian"
          >
            <div className="relative w-11 h-11 md:w-12 md:h-12 rounded-full bg-gradient-to-b from-amber-400/30 via-amber-500/15 to-amber-950/90 border border-amber-400/70 shadow-[0_0_16px_rgba(251,191,36,0.35)] flex items-center justify-center text-amber-300 transition-all duration-300 group-hover:scale-105 group-active:scale-95 group-hover:border-amber-300 group-hover:shadow-[0_0_22px_rgba(251,191,36,0.6)]">
              <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
              <Calculator className="w-5 h-5 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
            </div>

            <span className="text-[11px] font-bold text-slate-200 mt-1.5 tracking-tight group-hover:text-amber-300 transition-colors whitespace-nowrap">
              Skor Nilai
            </span>
          </button>


          {/* 4. SALIN DATA (PBS) */}
          <button
            type="button"
            onClick={() => setIsPbsModalOpen(true)}
            className="flex flex-col items-center justify-center group cursor-pointer focus:outline-none"
            title="Salin Data Nama Siswa, NISN, atau Nama Guru untuk Aplikasi PBS"
          >
            <div className="relative w-11 h-11 md:w-12 md:h-12 rounded-full bg-gradient-to-b from-purple-400/30 via-purple-500/15 to-purple-950/90 border border-purple-400/70 shadow-[0_0_16px_rgba(192,132,252,0.35)] flex items-center justify-center text-purple-300 transition-all duration-300 group-hover:scale-105 group-active:scale-95 group-hover:border-purple-300 group-hover:shadow-[0_0_22px_rgba(192,132,252,0.6)]">
              <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
              <Copy className="w-5 h-5 text-purple-300 drop-shadow-[0_0_8px_rgba(192,132,252,0.7)]" />
            </div>

            <span className="text-[11px] font-bold text-slate-200 mt-1.5 tracking-tight group-hover:text-purple-300 transition-colors whitespace-nowrap">
              Salin Data
            </span>
          </button>

        </div>

      </div>

      {/* ====================================================
          AKSI HEADER MOBILE (CIRCULAR 3D GLASSMOPHISM SHORTCUTS)
          4 Shortcut Icon Besar Berwarna + Label Ringkas di Bawahnya
          ==================================================== */}

      <div className="grid sm:hidden grid-cols-4 gap-2 pt-1 pb-2 mb-2">

        {/* 1. INFO SOAL */}
        <button
          type="button"
          onClick={openBreakdownModal}
          className="flex flex-col items-center justify-center group cursor-pointer focus:outline-none"
        >
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-b from-cyan-400/30 via-cyan-500/15 to-cyan-950/90 border border-cyan-400/70 shadow-[0_0_20px_rgba(34,211,238,0.4)] flex items-center justify-center text-cyan-300 transition-all duration-300 group-hover:scale-105 group-active:scale-95 group-hover:border-cyan-300 group-hover:shadow-[0_0_26px_rgba(34,211,238,0.6)]">
            <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
            <FileText className="w-6 h-6 text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
          </div>

          <span className="text-[11px] font-bold text-slate-100 mt-2 tracking-tight group-hover:text-cyan-300 transition-colors">
            Info Soal
          </span>
        </button>


        {/* 2. JADWAL */}
        <button
          type="button"
          onClick={openScheduleModal}
          className="flex flex-col items-center justify-center group cursor-pointer focus:outline-none"
        >
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-b from-emerald-400/30 via-emerald-500/15 to-emerald-950/90 border border-emerald-400/70 shadow-[0_0_20px_rgba(52,211,153,0.4)] flex items-center justify-center text-emerald-300 transition-all duration-300 group-hover:scale-105 group-active:scale-95 group-hover:border-emerald-300 group-hover:shadow-[0_0_26px_rgba(52,211,153,0.6)]">
            <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
            <Calendar className="w-6 h-6 text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
          </div>

          <span className="text-[11px] font-bold text-slate-100 mt-2 tracking-tight group-hover:text-emerald-300 transition-colors">
            Jadwal
          </span>
        </button>


        {/* 3. SKOR NILAI */}
        <button
          type="button"
          onClick={() => setShowScoreCalculator(true)}
          className="flex flex-col items-center justify-center group cursor-pointer focus:outline-none"
        >
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-b from-amber-400/30 via-amber-500/15 to-amber-950/90 border border-amber-400/70 shadow-[0_0_20px_rgba(251,191,36,0.4)] flex items-center justify-center text-amber-300 transition-all duration-300 group-hover:scale-105 group-active:scale-95 group-hover:border-amber-300 group-hover:shadow-[0_0_26px_rgba(251,191,36,0.6)]">
            <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
            <Calculator className="w-6 h-6 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
          </div>

          <span className="text-[11px] font-bold text-slate-100 mt-2 tracking-tight group-hover:text-amber-300 transition-colors">
            Skor Nilai
          </span>
        </button>


        {/* 4. SALIN DATA */}
        <button
          type="button"
          onClick={() => setIsPbsModalOpen(true)}
          className="flex flex-col items-center justify-center group cursor-pointer focus:outline-none"
          title="Salin Data Nama Siswa, NISN, atau Nama Guru untuk Aplikasi PBS"
        >
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-b from-purple-400/30 via-purple-500/15 to-purple-950/90 border border-purple-400/70 shadow-[0_0_20px_rgba(192,132,252,0.4)] flex items-center justify-center text-purple-300 transition-all duration-300 group-hover:scale-105 group-active:scale-95 group-hover:border-purple-300 group-hover:shadow-[0_0_26px_rgba(192,132,252,0.6)]">
            <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
            <Copy className="w-6 h-6 text-purple-300 drop-shadow-[0_0_8px_rgba(192,132,252,0.7)]" />
          </div>

          <span className="text-[11px] font-bold text-slate-100 mt-2 tracking-tight group-hover:text-purple-300 transition-colors">
            Salin Data
          </span>
        </button>

      </div>

      {/* ======================================================
          MENU AKSES CEPAT UJIAN & TEMPLATE
          ====================================================== */}

      {/* ======================================================
          MENU AKSES CEPAT UJIAN & TEMPLATE (5 FUTURISTIC 3D CARDS)
          ====================================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">

        {/* ====================================================
            CARD 1 — EVALUASI PEMBELAJARAN (AI ASSISTANT)
            ==================================================== */}
        <div
          id="card-template-evaluasi_pembelajaran"
          role="button"
          tabIndex={0}
          onClick={() => handleOpenEvaluationFeature()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleOpenEvaluationFeature();
            }
          }}
          className="group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-[24px] border border-[#6366f1]/60 hover:border-[#818cf8] bg-gradient-to-b from-[#140f2b] via-[#0e0a20] to-[#070512] transition-all duration-300 hover:-translate-y-1.5 shadow-[0_0_28px_rgba(99,102,241,0.25)] hover:shadow-[0_0_36px_rgba(99,102,241,0.45)] cursor-pointer overflow-hidden min-h-[300px] sm:min-h-[320px] select-none backdrop-blur-xl text-left"
        >
          {/* Top specular highlight */}
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-300/60 to-transparent pointer-events-none" />

          {/* Cloud Nebula & Volumetric Mist Behind Asset */}
          <CardCloudBackground theme="indigo" />

          {/* Card Content Top */}
          <div className="relative z-10 flex flex-col flex-1">
            {/* Badges Row + Top Right Circle Arrow */}
            <div className="flex items-center justify-between w-full mb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-black tracking-wider uppercase border bg-[#241a48]/90 text-white border-indigo-400/50 backdrop-blur-md shadow-sm">
                <Sparkles className="w-3 h-3 text-indigo-300" />
                <span>AI</span>
              </span>

              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/5 group-hover:bg-indigo-500/20 border border-white/10 group-hover:border-indigo-400/60 flex items-center justify-center text-slate-300 group-hover:text-white transition-all flex-shrink-0">
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* Centered Hero 3D Illustration Nesting inside Cloud */}
            <div className="my-2 flex-1 flex items-center justify-center relative min-h-[105px] sm:min-h-[120px]">
              <img
                src="/assets/Asetlogo/icon-evaluasi-ai.webp"
                alt="Evaluasi Pembelajaran"
                className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 object-contain transition-all duration-500 ease-out group-hover:scale-110 group-hover:-translate-y-1.5 drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] group-hover:drop-shadow-[0_16px_30px_rgba(99,102,241,0.65)] relative z-10"
                loading="lazy"
              />
            </div>

            {/* Title & Description (Left Aligned) */}
            <div className="mt-auto pt-1">
              <h3 className="text-[13px] sm:text-[15px] font-black text-white font-heading tracking-tight leading-snug transition-colors group-hover:text-indigo-200">
                Evaluasi Pembelajaran
              </h3>
              <p className="text-[10.5px] sm:text-[11.5px] text-slate-300/85 mt-1 leading-relaxed line-clamp-2 font-normal">
                Generator Kisi-Kisi, Naskah Soal Otomatis, dan Review Hasil Ujian.
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-3 relative z-10 w-full">
            <span className="w-full py-2.5 px-3 rounded-2xl text-[11px] sm:text-[12px] font-black tracking-wide flex items-center justify-center gap-1.5 transition-all bg-gradient-to-r from-[#5438dc] via-[#6366f1] to-[#7c3aed] hover:from-[#6044e6] hover:to-[#8b46ff] text-white shadow-[0_0_16px_rgba(99,102,241,0.4)] group-hover:shadow-[0_0_24px_rgba(99,102,241,0.65)]">
              <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">Modul Evaluasi</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-90 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
            </span>
          </div>
        </div>

        {/* ====================================================
            CARD 2 — TEMPLATE LEMBAR ANALISIS (ANALISIS SOAL)
            ==================================================== */}
        <div
          id="card-template-analisis_soal"
          role="button"
          tabIndex={0}
          onClick={() => handleOpenAnalisisGenerator()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleOpenAnalisisGenerator();
            }
          }}
          className="group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-[24px] border border-[#06b6d4]/60 hover:border-[#22d3ee] bg-gradient-to-b from-[#071a24] via-[#05131b] to-[#020a0f] transition-all duration-300 hover:-translate-y-1.5 shadow-[0_0_28px_rgba(6,182,212,0.25)] hover:shadow-[0_0_36px_rgba(6,182,212,0.45)] cursor-pointer overflow-hidden min-h-[300px] sm:min-h-[320px] select-none backdrop-blur-xl text-left"
        >
          {/* Top specular highlight */}
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent pointer-events-none" />

          {/* Cloud Nebula & Volumetric Mist Behind Asset */}
          <CardCloudBackground theme="cyan" />

          {/* Card Content Top */}
          <div className="relative z-10 flex flex-col flex-1">
            {/* Badges Row + Top Right Circle Arrow / Admin Edit */}
            <div className="flex items-center justify-between w-full mb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-black tracking-wider uppercase border bg-[#0d2a38]/90 text-cyan-200 border-cyan-400/50 backdrop-blur-md shadow-sm">
                <FileSpreadsheet className="w-3 h-3 text-cyan-300" />
                <span>EXCEL & WORD</span>
              </span>

              <div className="flex items-center gap-1.5">
                {isAdmin && onUpdateTemplate && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      const tplAnalisis = getTemplateItem('analisis_soal');
                      setEditingTemplate(tplAnalisis);
                    }}
                    className="p-1 rounded-md bg-[#181B26]/80 hover:bg-[#272D3E] text-slate-400 hover:text-white border border-[#2B3245] transition-colors cursor-pointer"
                    title="Edit tautan"
                  >
                    <Edit2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </button>
                )}
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/5 group-hover:bg-cyan-500/20 border border-white/10 group-hover:border-cyan-400/60 flex items-center justify-center text-slate-300 group-hover:text-white transition-all flex-shrink-0">
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>

            {/* Centered Hero 3D Illustration Nesting inside Cloud */}
            <div className="my-2 flex-1 flex items-center justify-center relative min-h-[105px] sm:min-h-[120px]">
              <img
                src="/assets/Asetlogo/icon-analysis-word-excel.webp"
                alt="Template Analisis Soal"
                className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 object-contain transition-all duration-500 ease-out group-hover:scale-110 group-hover:-translate-y-1.5 drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] group-hover:drop-shadow-[0_16px_30px_rgba(6,182,212,0.65)] relative z-10"
                loading="lazy"
              />
            </div>

            {/* Title & Description (Left Aligned) */}
            <div className="mt-auto pt-1">
              <h3 className="text-[13px] sm:text-[15px] font-black text-white font-heading tracking-tight leading-snug transition-colors group-hover:text-cyan-200">
                Template Generator Lembar Analisis
              </h3>
              <p className="text-[10.5px] sm:text-[11.5px] text-slate-300/85 mt-1 leading-relaxed line-clamp-2 font-normal">
                Template analisis butir soal ujian mudah dan Mobile.
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-3 relative z-10 w-full">
            <span className="w-full py-2.5 px-3 rounded-2xl text-[11px] sm:text-[12px] font-black tracking-wide flex items-center justify-center gap-1.5 transition-all bg-[#00c5ff] hover:bg-[#20d0ff] text-slate-950 shadow-[0_0_16px_rgba(0,197,255,0.45)] group-hover:shadow-[0_0_24px_rgba(0,197,255,0.7)]">
              <Download className="w-3.5 h-3.5 flex-shrink-0 text-slate-950" />
              <span className="truncate">Generator</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-90 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform flex-shrink-0 text-slate-950" />
            </span>
          </div>
        </div>

        {/* ====================================================
            CARD 3 — E-RAPOR STS (KURIKULUM MERDEKA)
            ==================================================== */}
        <div
          id="card-template-rapor"
          role="button"
          tabIndex={0}
          onClick={() => {
            if (onOpenRaporSts) {
              onOpenRaporSts();
            } else {
              const tplRapor = getTemplateItem('rapor');
              handleOpenDriveTemplate(tplRapor);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              if (onOpenRaporSts) {
                onOpenRaporSts();
              } else {
                const tplRapor = getTemplateItem('rapor');
                handleOpenDriveTemplate(tplRapor);
              }
            }
          }}
          className="group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-[24px] border border-[#f59e0b]/60 hover:border-[#fbbf24] bg-gradient-to-b from-[#241708] via-[#1a1005] to-[#0e0802] transition-all duration-300 hover:-translate-y-1.5 shadow-[0_0_28px_rgba(245,158,11,0.25)] hover:shadow-[0_0_36px_rgba(245,158,11,0.45)] cursor-pointer overflow-hidden min-h-[300px] sm:min-h-[320px] select-none backdrop-blur-xl text-left"
        >
          {/* Top specular highlight */}
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-300/60 to-transparent pointer-events-none" />

          {/* Cloud Nebula & Volumetric Mist Behind Asset */}
          <CardCloudBackground theme="amber" />

          {/* Card Content Top */}
          <div className="relative z-10 flex flex-col flex-1">
            {/* Badges Row + Top Right Circle Arrow / Admin Edit */}
            <div className="flex items-center justify-between w-full mb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-black tracking-wider uppercase border bg-[#382309]/90 text-amber-200 border-amber-400/50 backdrop-blur-md shadow-sm">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>E-RAPOR KURIKULUM MERDEKA</span>
              </span>

              <div className="flex items-center gap-1.5">
                {isAdmin && onUpdateTemplate && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      const tplRapor = getTemplateItem('rapor');
                      setEditingTemplate(tplRapor);
                    }}
                    className="p-1 rounded-md bg-[#181B26]/80 hover:bg-[#272D3E] text-slate-400 hover:text-white border border-[#2B3245] transition-colors cursor-pointer"
                    title="Edit tautan cadangan"
                  >
                    <Edit2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </button>
                )}
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/5 group-hover:bg-amber-500/20 border border-white/10 group-hover:border-amber-400/60 flex items-center justify-center text-slate-300 group-hover:text-white transition-all flex-shrink-0">
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>

            {/* Centered Hero 3D Illustration Nesting inside Cloud */}
            <div className="my-2 flex-1 flex items-center justify-center relative min-h-[105px] sm:min-h-[120px]">
              <img
                src="/assets/Asetlogo/icon-template-rapor.webp"
                alt="E-Rapor STS"
                className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 object-contain transition-all duration-500 ease-out group-hover:scale-110 group-hover:-translate-y-1.5 drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] group-hover:drop-shadow-[0_16px_30px_rgba(245,158,11,0.65)] relative z-10"
                loading="lazy"
              />
            </div>

            {/* Title & Description (Left Aligned) */}
            <div className="mt-auto pt-1">
              <h3 className="text-[13px] sm:text-[15px] font-black text-white font-heading tracking-tight leading-snug transition-colors group-hover:text-amber-200">
                E-Rapor
              </h3>
              <p className="text-[10.5px] sm:text-[11.5px] text-slate-300/85 mt-1 leading-relaxed line-clamp-2 font-normal">
                Otomatisasi pengolahan nilai TP, deskripsi capaian kompetensi, & cetak rapor resmi.
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-3 relative z-10 w-full">
            <span className="w-full py-2.5 px-3 rounded-2xl text-[11px] sm:text-[12px] font-black tracking-wide flex items-center justify-center gap-1.5 transition-all bg-[#ffaa00] hover:bg-[#ffb720] text-slate-950 shadow-[0_0_16px_rgba(255,170,0,0.45)] group-hover:shadow-[0_0_24px_rgba(255,170,0,0.7)]">
              <BookOpen className="w-3.5 h-3.5 flex-shrink-0 text-slate-950" />
              <span className="truncate">Buka E-Rapor STS</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-90 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform flex-shrink-0 text-slate-950" />
            </span>
          </div>
        </div>

        {/* ====================================================
            CARD 4 — FOLDER KOSONG PENGUMPULAN SOAL
            ==================================================== */}
        <div
          id="card-template-folder_soal"
          role="button"
          tabIndex={0}
          onClick={() => {
            const tplFolder = getTemplateItem('folder_soal');
            handleOpenDriveTemplate(tplFolder);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              const tplFolder = getTemplateItem('folder_soal');
              handleOpenDriveTemplate(tplFolder);
            }
          }}
          className="group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-[24px] border border-[#10b981]/60 hover:border-[#34d399] bg-gradient-to-b from-[#062419] via-[#041911] to-[#020d09] transition-all duration-300 hover:-translate-y-1.5 shadow-[0_0_28px_rgba(16,185,129,0.25)] hover:shadow-[0_0_36px_rgba(16,185,129,0.45)] cursor-pointer overflow-hidden min-h-[300px] sm:min-h-[320px] select-none backdrop-blur-xl text-left"
        >
          {/* Top specular highlight */}
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-300/60 to-transparent pointer-events-none" />

          {/* Cloud Nebula & Volumetric Mist Behind Asset */}
          <CardCloudBackground theme="emerald" />

          {/* Card Content Top */}
          <div className="relative z-10 flex flex-col flex-1">
            {/* Badges Row + Top Right Circle Arrow / Admin Edit */}
            <div className="flex items-center justify-between w-full mb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-black tracking-wider uppercase border bg-[#0a3524]/90 text-emerald-200 border-emerald-400/50 backdrop-blur-md shadow-sm">
                <FolderUp className="w-3 h-3 text-emerald-300" />
                <span>FOLDER DRIVE</span>
              </span>

              <div className="flex items-center gap-1.5">
                {isAdmin && onUpdateTemplate && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      const tplFolder = getTemplateItem('folder_soal');
                      setEditingTemplate(tplFolder);
                    }}
                    className="p-1 rounded-md bg-[#181B26]/80 hover:bg-[#272D3E] text-slate-400 hover:text-white border border-[#2B3245] transition-colors cursor-pointer"
                    title="Edit tautan"
                  >
                    <Edit2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </button>
                )}
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/5 group-hover:bg-emerald-500/20 border border-white/10 group-hover:border-emerald-400/60 flex items-center justify-center text-slate-300 group-hover:text-white transition-all flex-shrink-0">
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>

            {/* Centered Hero 3D Illustration Nesting inside Cloud */}
            <div className="my-2 flex-1 flex items-center justify-center relative min-h-[105px] sm:min-h-[120px]">
              <img
                src="/assets/Asetlogo/icon-folder-drive.webp"
                alt="Folder Kosong Soal"
                className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 object-contain transition-all duration-500 ease-out group-hover:scale-110 group-hover:-translate-y-1.5 drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] group-hover:drop-shadow-[0_16px_30px_rgba(16,185,129,0.65)] relative z-10"
                loading="lazy"
              />
            </div>

            {/* Title & Description (Left Aligned) */}
            <div className="mt-auto pt-1">
              <h3 className="text-[13px] sm:text-[15px] font-black text-white font-heading tracking-tight leading-snug transition-colors group-hover:text-emerald-200">
                Folder Kosong Pengumpulan Soal
              </h3>
              <p className="text-[10.5px] sm:text-[11.5px] text-slate-300/85 mt-1 leading-relaxed line-clamp-2 font-normal">
                Folder Google Drive kosong untuk tempat pengumpulan naskah soal dari guru.
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-3 relative z-10 w-full">
            <span className="w-full py-2.5 px-3 rounded-2xl text-[11px] sm:text-[12px] font-black tracking-wide flex items-center justify-center gap-1.5 transition-all bg-[#00e575] hover:bg-[#1cf288] text-slate-950 shadow-[0_0_16px_rgba(0,229,117,0.45)] group-hover:shadow-[0_0_24px_rgba(0,229,117,0.7)]">
              <FolderOpen className="w-3.5 h-3.5 flex-shrink-0 text-slate-950" />
              <span className="truncate">Buka Folder Drive</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-90 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform flex-shrink-0 text-slate-950" />
            </span>
          </div>
        </div>

        {/* ====================================================
            CARD 5 — TRACKING PENGUMPULAN SOAL
            ==================================================== */}
        <div
          id="card-template-tracking_soal"
          role="button"
          tabIndex={0}
          onClick={() => onNavigateToTracking?.()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onNavigateToTracking?.();
            }
          }}
          className="group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-[24px] border border-[#d946ef]/60 hover:border-[#f0abfc] bg-gradient-to-b from-[#250831] via-[#1a0523] to-[#0f0214] transition-all duration-300 hover:-translate-y-1.5 shadow-[0_0_28px_rgba(217,70,239,0.25)] hover:shadow-[0_0_36px_rgba(217,70,239,0.45)] cursor-pointer overflow-hidden min-h-[300px] sm:min-h-[320px] select-none backdrop-blur-xl text-left"
        >
          {/* Top specular highlight */}
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-fuchsia-300/60 to-transparent pointer-events-none" />

          {/* Cloud Nebula & Volumetric Mist Behind Asset */}
          <CardCloudBackground theme="purple" />

          {/* Card Content Top */}
          <div className="relative z-10 flex flex-col flex-1">
            {/* Badges Row + Top Right Circle Arrow */}
            <div className="flex items-center justify-between w-full mb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-black tracking-wider uppercase border bg-[#3a0d4c]/90 text-fuchsia-200 border-fuchsia-400/50 backdrop-blur-md shadow-sm">
                <ClipboardList className="w-3 h-3 text-fuchsia-300" />
                <span>TRACKING</span>
              </span>

              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/5 group-hover:bg-fuchsia-500/20 border border-white/10 group-hover:border-fuchsia-400/60 flex items-center justify-center text-slate-300 group-hover:text-white transition-all flex-shrink-0">
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* Centered Hero 3D Illustration Nesting inside Cloud */}
            <div className="my-2 flex-1 flex items-center justify-center relative min-h-[105px] sm:min-h-[120px]">
              <img
                src="/assets/Asetlogo/icon-tracking-soal.webp"
                alt="Tracking Soal"
                className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 object-contain transition-all duration-500 ease-out group-hover:scale-110 group-hover:-translate-y-1.5 drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] group-hover:drop-shadow-[0_16px_30px_rgba(217,70,239,0.65)] relative z-10"
                loading="lazy"
              />
            </div>

            {/* Title & Description (Left Aligned) */}
            <div className="mt-auto pt-1">
              <h3 className="text-[13px] sm:text-[15px] font-black text-white font-heading tracking-tight leading-snug transition-colors group-hover:text-fuchsia-200">
                Tracking Soal
              </h3>
              <p className="text-[10.5px] sm:text-[11.5px] text-slate-300/85 mt-1 leading-relaxed line-clamp-2 font-normal">
                Pantau status pengumpulan dan cetak naskah soal per kelas.
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-3 relative z-10 w-full">
            <span className="w-full py-2.5 px-3 rounded-2xl text-[11px] sm:text-[12px] font-black tracking-wide flex items-center justify-center gap-1.5 transition-all bg-gradient-to-r from-[#b524f2] to-[#d924f2] hover:from-[#c235fa] hover:to-[#e235fa] text-white shadow-[0_0_16px_rgba(217,36,242,0.45)] group-hover:shadow-[0_0_24px_rgba(217,36,242,0.7)]">
              <ClipboardList className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">Buka Tracking</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-90 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
            </span>
          </div>
        </div>

      </div>

      {/* ======================================================
          KALKULATOR SKOR NILAI
          COMPACT MODAL
          ====================================================== */}

      {showScoreCalculator && (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowScoreCalculator(false);
            }
          }}
        >

          <div className="w-full max-w-[440px] rounded-[28px] bg-[#0B101D]/95 backdrop-blur-2xl border border-cyan-500/25 shadow-[0_20px_60px_rgba(0,0,0,0.85)] text-slate-100 overflow-hidden relative transition-all">

            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* ==================================================
                HEADER POPUP
                ================================================== */}
            <div className="relative px-5 pt-5 pb-4 border-b border-slate-800/80">
              {/* Subtle A+ Watermark in Top Right Background */}
              <div className="absolute top-2 right-14 opacity-10 select-none pointer-events-none flex items-center gap-1 text-cyan-300 font-black text-4xl tracking-tighter">
                <GraduationCap className="w-10 h-10" />
                <span>A+</span>
              </div>

              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/35 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(251,191,36,0.15)] text-amber-400">
                    <Calculator className="w-5 h-5 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-white tracking-tight flex items-center gap-1.5">
                      Kalkulator Skor Nilai
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Hitung nilai berdasarkan jumlah soal dan jawaban benar.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowScoreCalculator(false)}
                  className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer flex-shrink-0 border border-slate-700/60"
                  aria-label="Tutup kalkulator"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ==================================================
                FORM KALKULATOR (INPUTS)
                ================================================== */}
            <div className="p-5 space-y-3.5">
              
              {/* JUMLAH SOAL */}
              <div className="p-3 rounded-2xl bg-[#0F1626]/80 border border-slate-800/90 transition-all focus-within:border-slate-600">
                <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 mb-1.5">
                  <div className="w-5 h-5 rounded-md bg-slate-800 flex items-center justify-center text-slate-300">
                    <FileText className="w-3 h-3" />
                  </div>
                  <span>Jumlah Soal</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={scoreTotalQuestions}
                  onChange={(e) => setScoreTotalQuestions(e.target.value)}
                  placeholder="Contoh: 40"
                  className="w-full bg-transparent px-1 text-base font-black text-white outline-none placeholder:text-slate-600"
                />
              </div>

              {/* SOAL BENAR */}
              <div className="p-3 rounded-2xl bg-[#0F1626]/90 border border-cyan-400/60 shadow-[0_0_15px_rgba(34,211,238,0.12)] transition-all focus-within:border-cyan-300 focus-within:shadow-[0_0_20px_rgba(34,211,238,0.25)]">
                <label className="flex items-center gap-2 text-[11px] font-bold text-cyan-400 mb-1.5">
                  <div className="w-5 h-5 rounded-md bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
                    <CheckSquare className="w-3 h-3" />
                  </div>
                  <span>Jumlah Soal Benar</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={scoreCorrectAnswers}
                  onChange={(e) => setScoreCorrectAnswers(e.target.value)}
                  placeholder="Contoh: 33"
                  className="w-full bg-transparent px-1 text-base font-black text-white outline-none placeholder:text-slate-600"
                />
              </div>

              {/* ==================================================
                  HASIL SKOR (CIRCULAR PROGRESS RING + HERO CARD)
                  ================================================== */}
              {(() => {
                const total = Number(scoreTotalQuestions);
                const correct = Number(scoreCorrectAnswers);
                const hasTotal = scoreTotalQuestions !== '';
                const hasCorrect = scoreCorrectAnswers !== '';

                const invalid =
                  hasTotal &&
                  hasCorrect &&
                  (!Number.isFinite(total) ||
                    total <= 0 ||
                    !Number.isFinite(correct) ||
                    correct < 0 ||
                    correct > total);

                if (invalid) {
                  return (
                    <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-center">
                      <p className="text-xs font-bold text-rose-300">
                        Jumlah soal benar tidak boleh lebih banyak dari jumlah soal.
                      </p>
                    </div>
                  );
                }

                if (!hasTotal || !hasCorrect) {
                  return (
                    <div className="rounded-2xl border border-slate-800 bg-[#0F1626]/60 p-5 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500">
                        <BarChart2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Hasil Skor Nilai</span>
                      </div>
                      <div className="mt-3 text-4xl font-black text-slate-700">
                        —
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Masukkan jumlah soal dan jawaban benar.
                      </p>
                    </div>
                  );
                }

                const finalScore = Math.round((correct / total) * 100);
                const percentage = Math.min(100, Math.max(0, finalScore));

                // SVG Circle calculation
                const radius = 42;
                const circumference = 2 * Math.PI * radius;
                const strokeDashoffset =
                  circumference - (percentage / 100) * circumference;

                // Motivational badge
                let motivation = 'Terus tingkatkan hasil belajarnya!';
                if (percentage >= 90)
                  motivation = 'Sempurna! Pertahankan prestasimu!';
                else if (percentage >= 80)
                  motivation = 'Sangat baik! Terus tingkatkan hasil belajarnya!';
                else if (percentage >= 70)
                  motivation = 'Bagus! Cukup memuaskan!';
                else motivation = 'Semangat belajar dan tingkatkan lagi!';

                return (
                  <div className="relative rounded-2xl border border-cyan-500/35 bg-gradient-to-br from-cyan-950/40 via-[#0C1525]/90 to-emerald-950/30 p-4 sm:p-5 shadow-[0_0_30px_rgba(34,211,238,0.12)] overflow-hidden space-y-3.5">
                    {/* Card Title */}
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-cyan-400">
                      <BarChart2 className="w-4 h-4 text-cyan-400" />
                      <span>Hasil Skor Nilai</span>
                    </div>

                    {/* Main Score Area: Ring + Detail */}
                    <div className="flex items-center justify-between gap-3 pt-1">
                      {/* Left: Circular Progress Ring */}
                      <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                        <svg className="w-28 h-28 transform -rotate-90">
                          {/* Track Ring */}
                          <circle
                            cx="56"
                            cy="56"
                            r={radius}
                            className="stroke-slate-800/80"
                            strokeWidth="9"
                            fill="transparent"
                          />
                          {/* Progress Ring */}
                          <circle
                            cx="56"
                            cy="56"
                            r={radius}
                            className="stroke-cyan-400 transition-all duration-700 ease-out"
                            strokeWidth="9"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            fill="transparent"
                            style={{
                              filter:
                                'drop-shadow(0px 0px 8px rgba(34, 211, 238, 0.7))',
                            }}
                          />
                        </svg>

                        {/* Text inside ring */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="text-3xl sm:text-4xl font-black text-white leading-none tracking-tight">
                            {finalScore}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 mt-0.5">
                            / 100
                          </span>
                        </div>
                      </div>

                      {/* Right: Badge & Motivational Message */}
                      <div className="flex-1 space-y-2 text-left pl-1">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-xs font-bold shadow-inner">
                          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span>
                            <strong className="text-white font-extrabold">
                              {correct} dari {total}
                            </strong>{' '}
                            soal benar
                          </span>
                        </div>

                        <p className="text-[11px] font-medium italic text-slate-300 leading-snug">
                          "{motivation}"
                        </p>
                      </div>
                    </div>

                    {/* Bottom Formula Box */}
                    <div className="pt-2.5 border-t border-cyan-500/15 flex items-center justify-center gap-1.5 text-[10.5px] font-medium text-cyan-300/80 bg-cyan-950/30 rounded-xl py-1.5 px-3">
                      <FlaskConical className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>
                        <strong className="font-bold text-cyan-200">
                          Rumus:
                        </strong>{' '}
                        (Soal Benar ÷ Jumlah Soal) × 100
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* ==================================================
                FOOTER
                ================================================== */}
            <div className="px-5 py-3.5 border-t border-slate-800/80 flex items-center justify-end bg-[#080C16]/50">
              <button
                type="button"
                onClick={() => setShowScoreCalculator(false)}
                className="px-4 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all cursor-pointer border border-slate-700/60 flex items-center gap-1.5 shadow-md active:scale-95"
              >
                <X className="w-3.5 h-3.5" />
                <span>Tutup</span>
              </button>
            </div>

          </div>

        </div>
      )}

      {/* ======================================================
          INFO BUTIR SOAL UJIAN
          COMPACT MODAL
          ====================================================== */}

      {showBreakdownSelector && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeBreakdownModal();
            }
          }}
        >

          <div className="w-full max-w-[720px] sm:max-w-[760px] max-h-[88vh] overflow-y-auto overflow-x-hidden rounded-[22px] bg-[#151822] border border-[#30384D] shadow-2xl shadow-black/50 text-slate-100">

            {/* ==================================================
                HEADER
                ================================================== */}

            <div className="relative px-4 pt-4 pb-3 border-b border-[#272D3E]">

              <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

              <div className="relative z-10 flex items-center justify-between gap-3">

                <div className="flex items-center gap-2.5 min-w-0">

                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center flex-shrink-0">

                    <ClipboardList className="w-4 h-4 text-cyan-400" />

                  </div>

                  <div className="min-w-0">

                    <h3 className="text-base font-bold text-white tracking-tight">
                      Info Butir Soal Ujian
                    </h3>

                    <p className="text-xs text-slate-400 mt-0.5">
                      Komposisi dan jumlah butir soal per mata pelajaran.
                    </p>

                  </div>

                </div>

                <button
                  type="button"
                  onClick={
                    closeBreakdownModal
                  }
                  className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
                  aria-label="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>

              </div>

            </div>

            {/* ==================================================
                TAB UJIAN
                Hanya STS / SAS / US
                ================================================== */}

            <div className="px-4 pt-4">

              <div className="grid grid-cols-3 gap-2">

                {DEFAULT_QUESTION_RULES.map(
                  (rule, index) => {

                    const isActive =
                      index === selectedExamIndex;

                    return (
                      <button
                        key={rule.label}
                        type="button"
                        onClick={() => {
                          setSelectedExamIndex(index);
                          setSelectedExamBreakdown(null);
                          setEditingQuestionRules(
                            getQuestionRulesForIndex(index)
                          );
                          setIsEditingBreakdown(false);
                        }}
                        className={`relative overflow-hidden rounded-xl px-3 py-2.5 text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer ${
                          isActive
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 shadow-md shadow-cyan-500/10'
                            : 'bg-[#10131B] text-slate-400 border border-[#272D3E] hover:text-slate-200 hover:border-slate-500'
                        }`}
                      >
                        {isActive && (
                          <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50" />
                        )}

                        <span className="relative z-10">
                          {rule.label}
                        </span>
                      </button>
                    );
                  }
                )}

              </div>

            </div>

            {/* ==================================================
                CONTENT — TABEL KETENTUAN
                ================================================== */}

            <div className="px-3.5 py-3.5">

              {isEditingBreakdown ? (

                <div className="rounded-[20px] border border-amber-400/25 bg-gradient-to-br from-[#211D17] via-[#1A1917] to-[#15161B] overflow-hidden">

                  <div className="px-4 py-3 border-b border-[#302B22]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/25 flex items-center justify-center">
                        <Settings2 className="w-4 h-4 text-amber-300" />
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs uppercase tracking-wider text-amber-400 font-extrabold">
                          Administrator
                        </div>

                        <h4 className="text-sm sm:text-base font-bold text-white truncate">
                          Atur {getExamShortLabel(selectedExamIndex)}
                        </h4>

                        <p className="text-xs text-slate-400 mt-0.5">
                          Tambahkan atau hapus ketentuan mapel sesuai kebutuhan.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5">

                    <div className="w-full overflow-hidden rounded-xl border border-[#343443]">

                      <table className="w-full table-fixed border-collapse">

                        <colgroup>
                          <col className="w-[40%]" />
                          <col className="w-[15%]" />
                          <col className="w-[15%]" />
                          <col className="w-[15%]" />
                          <col className="w-[15%]" />
                        </colgroup>

                        <thead>
                          <tr className="bg-[#101219] border-b border-[#343443]">

                            <th className="px-2.5 py-2.5 text-left text-xs uppercase tracking-wide text-cyan-300 font-bold">
                              Kelas / Mapel
                            </th>

                            <th className="px-1 py-2.5 text-center text-xs sm:text-sm uppercase tracking-wide text-cyan-300 font-extrabold">
                              A
                            </th>

                            <th className="px-1 py-2.5 text-center text-xs sm:text-sm uppercase tracking-wide text-amber-300 font-extrabold">
                              B
                            </th>

                            <th className="px-1 py-2.5 text-center text-xs sm:text-sm uppercase tracking-wide text-purple-300 font-extrabold">
                              C
                            </th>

                            <th className="px-1 py-2.5 text-center text-xs uppercase tracking-wide text-rose-300 font-bold">
                              Aksi
                            </th>

                          </tr>
                        </thead>

                        <tbody>

                          {editingQuestionRules.map((row, rowIndex) => (

                            <tr
                              key={`${selectedExamIndex}-${rowIndex}`}
                              className="border-b border-[#2A2D3A] last:border-b-0"
                            >

                              <td className="px-1.5 py-2">

                                <input
                                  type="text"
                                  value={row.label}
                                  onChange={(e) =>
                                    updateEditingQuestionRule(
                                      rowIndex,
                                      'label',
                                      e.target.value
                                    )
                                  }
                                  className="block w-full h-9 rounded-xl border border-[#343443] bg-[#0E1017] px-2.5 text-xs sm:text-sm font-semibold text-white outline-none focus:border-amber-400"
                                />

                              </td>

                              <td className="px-1 py-2">

                                <input
                                  type="number"
                                  min={0}
                                  step={1}
                                  inputMode="numeric"
                                  value={row.pg}
                                  onChange={(e) =>
                                    updateEditingQuestionRule(
                                      rowIndex,
                                      'pg',
                                      e.target.value
                                    )
                                  }
                                  className="block w-full h-9 rounded-xl border border-[#343443] bg-[#0E1017] px-1 text-center text-xs sm:text-sm font-extrabold text-white outline-none focus:border-amber-400"
                                />

                              </td>

                              <td className="px-1 py-2">

                                <input
                                  type="number"
                                  min={0}
                                  step={1}
                                  inputMode="numeric"
                                  value={row.isian}
                                  onChange={(e) =>
                                    updateEditingQuestionRule(
                                      rowIndex,
                                      'isian',
                                      e.target.value
                                    )
                                  }
                                  className="block w-full h-9 rounded-xl border border-[#343443] bg-[#0E1017] px-1 text-center text-xs sm:text-sm font-extrabold text-white outline-none focus:border-amber-400"
                                />

                              </td>

                              <td className="px-1 py-2">

                                <input
                                  type="number"
                                  min={0}
                                  step={1}
                                  inputMode="numeric"
                                  value={row.essay}
                                  onChange={(e) =>
                                    updateEditingQuestionRule(
                                      rowIndex,
                                      'essay',
                                      e.target.value
                                    )
                                  }
                                  className="block w-full h-9 rounded-xl border border-[#343443] bg-[#0E1017] px-1 text-center text-xs sm:text-sm font-extrabold text-white outline-none focus:border-amber-400"
                                />

                              </td>

                              <td className="px-1 py-2">

                                <button
                                  type="button"
                                  onClick={() =>
                                    deleteEditingQuestionRule(rowIndex)
                                  }
                                  disabled={editingQuestionRules.length <= 1}
                                  className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl border border-rose-400/20 bg-rose-400/10 text-rose-300 hover:bg-rose-400/20 hover:border-rose-400/40 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                                  title={
                                    editingQuestionRules.length <= 1
                                      ? 'Minimal satu ketentuan harus tersisa'
                                      : 'Hapus ketentuan'
                                  }
                                  aria-label="Hapus ketentuan"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>

                              </td>

                            </tr>

                          ))}

                        </tbody>

                      </table>

                    </div>

                    <button
                      type="button"
                      onClick={addEditingQuestionRule}
                      className="mt-3 w-full h-9 rounded-xl border border-dashed border-cyan-400/40 bg-cyan-400/10 hover:bg-cyan-400/20 hover:border-cyan-400/60 text-xs font-bold text-cyan-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Tambah Ketentuan
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">

                      <div className="rounded-xl bg-cyan-400/10 border border-cyan-400/20 px-3 py-2">
                        <div className="text-xs font-bold text-cyan-300">
                          A · Pilihan Ganda
                        </div>
                      </div>

                      <div className="rounded-xl bg-amber-400/10 border border-amber-400/20 px-3 py-2">
                        <div className="text-xs font-bold text-amber-300">
                          B · Isian
                        </div>
                      </div>

                      <div className="rounded-xl bg-purple-400/10 border border-purple-400/20 px-3 py-2">
                        <div className="text-xs font-bold text-purple-300">
                          C · Essay / Menjodohkan
                        </div>
                      </div>

                    </div>

                  </div>

                  <div className="px-4 py-3 border-t border-[#302B22] flex justify-end gap-2">

                    <button
                      type="button"
                      onClick={() => {
                        setEditingQuestionRules(
                          getQuestionRulesForIndex(
                            selectedExamIndex
                          )
                        );
                        setIsEditingBreakdown(false);
                      }}
                      disabled={isSavingBreakdown}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold disabled:opacity-50 transition-all cursor-pointer"
                    >
                      Batal
                    </button>

                    <button
                      type="button"
                      onClick={saveBreakdownRules}
                      disabled={
                        isSavingBreakdown ||
                        !onUpdateExamConfig
                      }
                      className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold disabled:opacity-50 flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-500/20"
                    >
                      {isSavingBreakdown
                        ? 'Menyimpan...'
                        : 'Simpan'}
                    </button>

                  </div>

                </div>

              ) : (

                (() => {
                  const fallbackRules =
                    DEFAULT_QUESTION_RULES[
                      Math.min(
                        selectedExamIndex,
                        DEFAULT_QUESTION_RULES.length - 1
                      )
                    ];

                  const persistedRules =
                    effectiveBreakdowns[selectedExamIndex]?.questionRules;

                  const activeRules = {
                    label:
                      fallbackRules?.label ||
                      getExamShortLabel(selectedExamIndex),
                    rows:
                      persistedRules &&
                      persistedRules.length > 0
                        ? persistedRules.map((row) => ({
                            label: row.label,
                            pg: Number(row.pg) || 0,
                            isian: Number(row.isian) || 0,
                            essay: Number(row.essay) || 0,
                          }))
                        : (fallbackRules?.rows || []),
                  };

                  return (
                    <div className="rounded-[20px] border border-[#2B3448] bg-gradient-to-br from-[#161B26] via-[#141824] to-[#11141E] overflow-hidden">

                      <div className="px-4 py-3.5 border-b border-[#293246]">

                        <div className="flex items-center justify-between gap-3">

                          <div>
                            <span className="text-xs uppercase tracking-wider text-cyan-400 font-extrabold">
                              Ketentuan Jenis Soal
                            </span>

                            <h4 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5">
                              {activeRules.label}
                            </h4>
                          </div>

                          <div className="px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-xs font-bold text-cyan-300 whitespace-nowrap">
                            {activeRules.rows.length} Ketentuan
                          </div>

                        </div>

                      </div>

                      {/* ==================================================
                          TABEL KOMPAK
                          Hanya menampilkan A / B / C.
                          Tidak ada horizontal scroll dan tidak ada kolom Total.
                          ================================================== */}

                      <div className="w-full max-w-full overflow-hidden rounded-xl border border-[#293246]">

  <table className="w-full max-w-full table-fixed border-collapse">

    <colgroup>
      <col className="w-[40%]" />
      <col className="w-[15%]" />
      <col className="w-[15%]" />
      <col className="w-[15%]" />
      <col className="w-[15%]" />
    </colgroup>

    <thead>
      <tr className="bg-[#0F141F] border-b border-[#293246]">

        <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-cyan-300">
          Kelas / Mapel
        </th>

        <th className="px-1 py-3 text-center text-xs sm:text-sm font-extrabold text-cyan-300">
          A
        </th>

        <th className="px-1 py-3 text-center text-xs sm:text-sm font-extrabold text-amber-300">
          B
        </th>

        <th className="px-1 py-3 text-center text-xs sm:text-sm font-extrabold text-purple-300">
          C
        </th>

        <th className="px-1 py-3 text-center text-xs sm:text-sm font-extrabold text-emerald-300">
          TOTAL
        </th>

      </tr>
    </thead>

    <tbody>

      {activeRules.rows.map((row, index) => (
        <tr
          key={`${activeRules.label}-${row.label}`}
          className={`border-b border-[#202836] last:border-b-0 ${
            index % 2 === 0
              ? 'bg-[#121722]/50'
              : 'bg-[#0F141F]/80'
          }`}
        >

          <td className="min-w-0 px-3 py-2.5">
            <div className="text-xs sm:text-sm font-semibold text-slate-100 leading-tight">
              {row.label}
            </div>
          </td>

          <td className="px-1 py-2.5 text-center text-xs sm:text-sm font-bold text-slate-100 tabular-nums">
            {row.pg}
          </td>

          <td className="px-1 py-2.5 text-center text-xs sm:text-sm font-bold text-slate-100 tabular-nums">
            {row.isian}
          </td>

          <td className="px-1 py-2.5 text-center text-xs sm:text-sm font-bold text-slate-100 tabular-nums">
            {row.essay}
          </td>

          <td className="px-1 py-2.5 text-center">
            <span className="inline-flex min-w-[34px] h-7 px-2 items-center justify-center rounded-lg bg-emerald-400/15 border border-emerald-400/30 text-xs sm:text-sm font-extrabold text-emerald-300 tabular-nums">
              {Number(row.pg || 0) +
               Number(row.isian || 0) +
               Number(row.essay || 0)}
            </span>
          </td>

        </tr>
      ))}

    </tbody>

  </table>

</div>

{/* ==================================================
                          KETERANGAN BAGIAN
                          ================================================== */}

                      <div className="px-4 py-3.5 border-t border-[#293246] bg-[#101720]/50">

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">

                          <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2">
                            <div className="text-xs font-bold text-cyan-300">
                              A · Pilihan Ganda
                            </div>
                          </div>

                          <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2">
                            <div className="text-xs font-bold text-amber-300">
                              B · Isian
                            </div>
                          </div>

                          <div className="rounded-xl border border-purple-400/20 bg-purple-400/10 px-3 py-2">
                            <div className="text-xs font-bold text-purple-300">
                              C · Essay / Menjodohkan
                            </div>
                          </div>

                        </div>

                        <div className="flex items-start gap-2.5 mt-3">

                          <Info className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />

                          <p className="text-xs leading-relaxed text-slate-400">
                            Jumlah pada kolom A, B, dan C menunjukkan jumlah soal pada masing-masing bagian.
                          </p>

                        </div>

                      </div>

                    </div>
                  );
                })()

              )}

            </div>

            {/* ==================================================
                FOOTER
                ================================================== */}

            {!isEditingBreakdown && (
              <div className="px-4 pb-4 flex items-center justify-between gap-3">

                {isAdmin ? (
                  <button
                    type="button"
                    onClick={beginEditingBreakdown}
                    className="px-3.5 py-2.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    ⚙ Atur Butir Soal
                  </button>
                ) : (
                  <span className="text-xs text-slate-500">
                    Informasi ketentuan ujian
                  </span>
                )}

                <button
                  type="button"
                  onClick={closeBreakdownModal}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  Tutup
                </button>

              </div>
            )}

          </div>
        </div>
      )}

      {/* ======================================================
          MODAL JADWAL UJIAN & PENGAWAS RUANG TERPADU
          ====================================================== */}

      <ActiveExamScheduleModal
        isOpen={showScheduleModal}
        onClose={closeScheduleModal}
        schedule={activeExamSchedule || DEFAULT_ACTIVE_EXAM_SCHEDULE}
        isAdmin={isAdmin}
        onSaveSchedule={async (updatedSchedule) => {
          if (onUpdateExamConfig) {
            await onUpdateExamConfig({
              activeExamSchedule: updatedSchedule,
            });
          }
        }}
      />

      {/* ======================================================
          EDIT TEMPLATE
          ====================================================== */}

      {editingTemplate &&
        onUpdateTemplate && (
          <EditTemplateModal
            isOpen={
              !!editingTemplate
            }
            template={
              editingTemplate
            }
            onClose={() =>
              setEditingTemplate(
                null
              )
            }
            onSave={async (
              id,
              updates
            ) => {
              await onUpdateTemplate(
                id,
                updates
              );

              setEditingTemplate(
                null
              );
            }}
          />
        )}

      <AnalisisSoalGeneratorModal
        isOpen={isAnalisisGeneratorOpen}
        onClose={() => setIsAnalisisGeneratorOpen(false)}
      />

      <TokenAccessModal
        isOpen={isTokenModalOpen}
        featureName={
          pendingFeatureType === 'evaluation'
            ? 'Modul Evaluasi Pembelajaran (AI Assistant)'
            : 'Generator Analisis Butir Soal'
        }
        onClose={() => {
          setIsTokenModalOpen(false);
          setPendingFeatureType(null);
        }}
        onSuccess={() => {
          setIsTokenModalOpen(false);
          if (pendingFeatureType === 'evaluation') {
            setPendingFeatureType(null);
            if (onOpenEvaluation) onOpenEvaluation();
          } else {
            setPendingFeatureType(null);
            setIsAnalisisGeneratorOpen(true);
          }
        }}
      />

      <PbsCopyModal
        isOpen={isPbsModalOpen}
        onClose={() => setIsPbsModalOpen(false)}
      />

      <DriveFolderTransitionModal
        isOpen={driveTransitionModal.isOpen}
        targetUrl={driveTransitionModal.targetUrl}
        folderTitle={driveTransitionModal.title}
        onClose={() =>
          setDriveTransitionModal({ isOpen: false, targetUrl: '', title: '' })
        }
      />

    </section>
  );
};