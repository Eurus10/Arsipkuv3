import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  BookOpen,
  Calculator,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  Edit3,
  FileSpreadsheet,
  FileText,
  Filter,
  Globe,
  Languages,
  Loader2,
  Lock,
  Maximize2,
  Minimize2,
  Moon,
  Palette,
  RotateCcw,
  Search,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import {
  RaporSubject,
  LearningObjective,
  SubjectCategory,
  StudentScoreDetail,
  StudentSubjectRecord,
  StudentAdditionalInfo,
  RaporStsConfig,
  getScorePredicate,
  getMasteryStatusFromPredicate,
} from '../../types/raporSts';
import { Student } from '../../services/studentStorage';
import {
  calculateFinalScore,
  generateCompetencyDescription,
  generateTeacherNote,
  generateAiTeacherNotes,
  downloadNilaiTemplateExcel,
  importNilaiFromExcel,
  ImportResult,
} from '../../services/raporStsService';

interface RaporScoreGridProps {
  subjects: RaporSubject[];
  students: Student[];
  subjectRecords: Record<string, StudentSubjectRecord>;
  additionalInfo?: Record<string, StudentAdditionalInfo>;
  config: RaporStsConfig;
  gradeLevel?: string;
  classLevel?: string;
  semester?: string;
  schoolYear?: string;
  onUpdateSubjectRecord: (subjectId: string, record: StudentSubjectRecord) => void;
  onUpdateAdditionalInfo?: (updated: Record<string, StudentAdditionalInfo>) => void;
  initialSubjectId?: string;
  onSelectSubject?: (subjectId: string) => void;
  onOpenAnalysisSync?: () => void;
}

const getSubjectMeta = (name: string, category?: string) => {
  const lower = (name || '').toLowerCase();
  if (lower.includes('agama') || category === 'agama' || lower.includes('islam') || lower.includes('qur')) {
    return {
      categoryLabel: 'Agama',
      categoryClass: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
      icon: Moon,
    };
  }
  if (lower.includes('indonesia')) {
    return {
      categoryLabel: 'Umum',
      categoryClass: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300',
      icon: FileText,
    };
  }
  if (lower.includes('matematika') || lower.includes('mtk')) {
    return {
      categoryLabel: 'Umum',
      categoryClass: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300',
      icon: Calculator,
    };
  }
  if (lower.includes('ipas') || lower.includes('alam') || lower.includes('sosial') || lower.includes('ipa') || lower.includes('ips')) {
    return {
      categoryLabel: 'Umum',
      categoryClass: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300',
      icon: Globe,
    };
  }
  if (lower.includes('arab') || lower.includes('inggris') || lower.includes('sunda') || lower.includes('jawa') || category === 'mulok') {
    return {
      categoryLabel: 'Mulok',
      categoryClass: 'border-purple-400/30 bg-purple-500/10 text-purple-300',
      icon: Languages,
    };
  }
  if (lower.includes('seni') || lower.includes('sbdp') || lower.includes('musik') || lower.includes('rupa')) {
    return {
      categoryLabel: 'Umum',
      categoryClass: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300',
      icon: Palette,
    };
  }
  if (lower.includes('pjok') || lower.includes('jasmani') || lower.includes('olahraga')) {
    return {
      categoryLabel: 'Umum',
      categoryClass: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300',
      icon: Activity,
    };
  }
  if (lower.includes('pancasila') || lower.includes('pkn') || lower.includes('kewarganegaraan')) {
    return {
      categoryLabel: 'Umum',
      categoryClass: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300',
      icon: Shield,
    };
  }
  return {
    categoryLabel: category === 'mulok' ? 'Mulok' : category === 'agama' ? 'Agama' : 'Umum',
    categoryClass:
      category === 'mulok'
        ? 'border-purple-400/30 bg-purple-500/10 text-purple-300'
        : category === 'agama'
        ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
        : 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300',
    icon: BookOpen,
  };
};

export const RaporScoreGrid: React.FC<RaporScoreGridProps> = ({
  subjects,
  students,
  subjectRecords,
  additionalInfo,
  config,
  gradeLevel = '1',
  classLevel = '1A',
  semester = '2',
  schoolYear = '2024/2025',
  onUpdateSubjectRecord,
  onUpdateAdditionalInfo,
  initialSubjectId,
  onSelectSubject,
  onOpenAnalysisSync,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    initialSubjectId || subjects[0]?.id || 'pai'
  );

  const lastInitialSubjectIdRef = React.useRef(initialSubjectId);
  React.useEffect(() => {
    if (initialSubjectId && initialSubjectId !== lastInitialSubjectIdRef.current) {
      lastInitialSubjectIdRef.current = initialSubjectId;
      if (subjects.some((s) => s.id === initialSubjectId)) {
        setSelectedSubjectId(initialSubjectId);
      }
    }
  }, [initialSubjectId, subjects]);

  const [subjectSearchQuery, setSubjectSearchQuery] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'default' | 'name-asc' | 'name-desc'>('default');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editingCustomDescStudentId, setEditingCustomDescStudentId] = useState<string | null>(null);
  const [customDescText, setCustomDescText] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportResult | null>(null);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [generatingStudentId, setGeneratingStudentId] = useState<string | null>(null);
  const [showTpColumns, setShowTpColumns] = useState<boolean>(false);
  const [mobileViewMode, setMobileViewMode] = useState<'table' | 'cards'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      return 'cards';
    }
    return 'table';
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  const activeTps = useMemo(() => {
    return (currentSubject?.tpList || []).filter((t) => t.isActive);
  }, [currentSubject]);

  // Check if TP is defined with valid descriptions
  const isTpAvailable = useMemo(() => {
    return activeTps.length > 0 && activeTps.some((t) => t.desc && t.desc.trim().length > 0);
  }, [activeTps]);

  const currentRecord =
    currentSubject && subjectRecords[currentSubject.id]
      ? subjectRecords[currentSubject.id]
      : {
          subjectId: currentSubject?.id || '',
          scores: {},
        };

  // Filter subjects based on sidebar search
  const filteredSubjects = useMemo(() => {
    if (!subjectSearchQuery.trim()) return subjects;
    const q = subjectSearchQuery.toLowerCase().trim();
    return subjects.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.code || '').toLowerCase().includes(q)
    );
  }, [subjects, subjectSearchQuery]);

  // Filter & sort students based on search query and sort order
  const displayedStudents = useMemo(() => {
    let result = [...students];
    if (studentSearchQuery.trim()) {
      const q = studentSearchQuery.toLowerCase().trim();
      result = result.filter(
        (st) =>
          st.name.toLowerCase().includes(q) ||
          (st.nim && st.nim.toLowerCase().includes(q)) ||
          (st.nisn && st.nisn.toLowerCase().includes(q))
      );
    }
    if (sortOrder === 'name-asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOrder === 'name-desc') {
      result.sort((a, b) => b.name.localeCompare(a.name));
    }
    return result;
  }, [students, studentSearchQuery, sortOrder]);

  // Ref & measurement for sidebar height to lock right column table height to sidebar
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [sidebarHeight, setSidebarHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!sidebarRef.current) return;
    const updateHeight = () => {
      if (sidebarRef.current && window.innerWidth >= 1024) {
        setSidebarHeight(sidebarRef.current.offsetHeight);
      } else {
        setSidebarHeight(null);
      }
    };

    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(sidebarRef.current);
    window.addEventListener('resize', updateHeight);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, [filteredSubjects.length]);

  const handleSelectSubject = (id: string) => {
    setSelectedSubjectId(id);
    lastInitialSubjectIdRef.current = id;
    onSelectSubject?.(id);
  };

  const handleToggleSort = () => {
    setSortOrder((prev) => {
      if (prev === 'default') return 'name-asc';
      if (prev === 'name-asc') return 'name-desc';
      return 'default';
    });
  };

  // Toggle TP Achievement for a single student
  const handleToggleTpAchieved = (studentId: string, studentName: string, tpId: string) => {
    const existingStudentScore: StudentScoreDetail = currentRecord.scores[studentId] || {
      studentId,
      studentName,
      tpScores: {},
      tpAchieved: {},
      stsScore: null,
      finalScore: null,
      autoDescription: '',
    };

    const currentAchieved =
      existingStudentScore.tpAchieved?.[tpId] === true ||
      (typeof existingStudentScore.tpScores?.[tpId] === 'number' &&
        (existingStudentScore.tpScores[tpId]! >= config.passingGrade ||
          existingStudentScore.tpScores[tpId] === 1 ||
          existingStudentScore.tpScores[tpId] === 100));

    const nextAchieved = !currentAchieved;
    const newTpAchieved: Record<string, boolean> = {
      ...(existingStudentScore.tpAchieved || {}),
      [tpId]: nextAchieved,
    };
    const newTpScores: Record<string, number | null> = {
      ...existingStudentScore.tpScores,
      [tpId]: nextAchieved ? 100 : 0,
    };

    // Auto-generate description based on checklist
    const autoDesc = generateCompetencyDescription(
      studentName,
      newTpAchieved,
      activeTps,
      existingStudentScore.stsScore,
      config.passingGrade
    );

    const updatedScores: Record<string, StudentScoreDetail> = {
      ...currentRecord.scores,
      [studentId]: {
        ...existingStudentScore,
        tpAchieved: newTpAchieved,
        tpScores: newTpScores,
        autoDescription: autoDesc,
      },
    };

    onUpdateSubjectRecord(currentSubject.id, {
      subjectId: currentSubject.id,
      scores: updatedScores,
    });
  };

  // Handle STS Final Score change
  const handleStsScoreChange = (studentId: string, studentName: string, valStr: string) => {
    let numVal: number | null = null;
    if (valStr.trim() !== '') {
      const parsed = parseFloat(valStr);
      if (!isNaN(parsed)) {
        numVal = Math.min(100, Math.max(0, parsed));
      }
    }

    const existingStudentScore: StudentScoreDetail = currentRecord.scores[studentId] || {
      studentId,
      studentName,
      tpScores: {},
      tpAchieved: {},
      stsScore: null,
      finalScore: null,
      autoDescription: '',
    };

    const autoDesc = generateCompetencyDescription(
      studentName,
      existingStudentScore.tpAchieved || existingStudentScore.tpScores,
      activeTps,
      numVal,
      config.passingGrade
    );

    const updatedScores: Record<string, StudentScoreDetail> = {
      ...currentRecord.scores,
      [studentId]: {
        ...existingStudentScore,
        stsScore: numVal,
        finalScore: numVal,
        autoDescription: autoDesc,
      },
    };

    onUpdateSubjectRecord(currentSubject.id, {
      subjectId: currentSubject.id,
      scores: updatedScores,
    });
  };

  // Buka modal konfirmasi pengosongan seluruh nilai mata pelajaran ini
  const handleOpenResetModal = () => {
    setShowResetConfirmModal(true);
  };

  // Eksekusi pengosongan seluruh nilai STS dan capaian TP untuk mata pelajaran ini
  const handleConfirmResetCurrentSubjectScores = () => {
    // Kumpulkan seluruh ID TP yang diketahui untuk mata pelajaran ini
    const allKnownTpIds = new Set<string>();
    (currentSubject?.tpList || []).forEach((tp) => allKnownTpIds.add(tp.id));
    Object.values(currentRecord?.scores || {}).forEach((sc) => {
      Object.keys(sc.tpScores || {}).forEach((id) => allKnownTpIds.add(id));
      Object.keys(sc.tpAchieved || {}).forEach((id) => allKnownTpIds.add(id));
    });

    const clearedTpScores: Record<string, number | null> = {};
    const clearedTpAchieved: Record<string, boolean> = {};
    allKnownTpIds.forEach((id) => {
      clearedTpScores[id] = null;
      clearedTpAchieved[id] = false;
    });

    const updatedScores: Record<string, StudentScoreDetail> = {};
    students.forEach((st) => {
      updatedScores[st.id] = {
        studentId: st.id,
        studentName: st.name,
        nisn: st.nisn || '',
        nis: st.nim || '',
        tpScores: { ...clearedTpScores },
        tpAchieved: { ...clearedTpAchieved },
        stsScore: null,
        finalScore: null,
        autoDescription: '',
        customDescription: '',
        teacherNote: '',
      };
    });

    onUpdateSubjectRecord(currentSubject.id, {
      subjectId: currentSubject.id,
      scores: updatedScores,
    });

    setShowResetConfirmModal(false);
    setNotification(`Seluruh nilai dan capaian TP untuk ${currentSubject.name} telah berhasil dikosongkan.`);
    setTimeout(() => setNotification(null), 3000);
  };

  // Update Teacher Note for single student
  const handleTeacherNoteChange = (studentId: string, note: string) => {
    const existing = currentRecord.scores[studentId] || {
      studentId,
      studentName: students.find((s) => s.id === studentId)?.name || '',
      tpScores: {},
      tpAchieved: {},
      stsScore: null,
      finalScore: null,
      autoDescription: '',
    };

    const updatedScores: Record<string, StudentScoreDetail> = {
      ...currentRecord.scores,
      [studentId]: {
        ...existing,
        teacherNote: note,
      },
    };

    onUpdateSubjectRecord(currentSubject.id, {
      subjectId: currentSubject.id,
      scores: updatedScores,
    });

    if (onUpdateAdditionalInfo) {
      const updatedAdditional: Record<string, StudentAdditionalInfo> = {
        ...(additionalInfo || {}),
      };
      updatedAdditional[studentId] = {
        ...(updatedAdditional[studentId] || {
          studentId,
          attendance: { sakit: 0, izin: 0, alpha: 0 },
          extracurriculars: [],
          teacherNotes: '',
        }),
        teacherNotes: note,
      };
      onUpdateAdditionalInfo(updatedAdditional);
    }
  };

  // Auto-generate note for a single student via Gemini AI
  const handleAutoGenerateStudentNote = async (studentId: string, studentName: string) => {
    setGeneratingStudentId(studentId);
    try {
      const scoreData = currentRecord.scores[studentId];
      const achievedTps = activeTps
        .filter(
          (tp) =>
            scoreData?.tpAchieved?.[tp.id] === true ||
            (typeof scoreData?.tpScores?.[tp.id] === 'number' &&
              scoreData.tpScores[tp.id]! >= config.passingGrade)
        )
        .map((tp) => tp.desc);
      const unachievedTps = activeTps
        .filter(
          (tp) =>
            !(
              scoreData?.tpAchieved?.[tp.id] === true ||
              (typeof scoreData?.tpScores?.[tp.id] === 'number' &&
                scoreData.tpScores[tp.id]! >= config.passingGrade)
            )
        )
        .map((tp) => tp.desc);

      const notesMap = await generateAiTeacherNotes({
        students: [
          {
            studentId,
            studentName,
            stsScore: scoreData?.stsScore,
            passingGrade: config.passingGrade,
            achievedTps,
            unachievedTps,
            totalTps: activeTps.length,
          },
        ],
        className: `Kelas ${classLevel}`,
        subjectName: currentSubject.name,
        semester,
        schoolYear,
      });

      const generatedNote =
        notesMap[studentId] ||
        generateTeacherNote(
          studentName,
          scoreData?.stsScore,
          achievedTps.length,
          activeTps.length,
          config.passingGrade
        );

      handleTeacherNoteChange(studentId, generatedNote);
      setNotification(`Catatan guru untuk ${studentName} berhasil dibuat.`);
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error('Error generating AI note for student:', err);
      const scoreData = currentRecord.scores[studentId];
      const achievedCount = activeTps.filter(
        (tp) =>
          scoreData?.tpAchieved?.[tp.id] === true ||
          (typeof scoreData?.tpScores?.[tp.id] === 'number' &&
            scoreData.tpScores[tp.id]! >= config.passingGrade)
      ).length;
      const fallbackNote = generateTeacherNote(
        studentName,
        scoreData?.stsScore,
        achievedCount,
        activeTps.length,
        config.passingGrade
      );
      handleTeacherNoteChange(studentId, fallbackNote);
      setNotification(`Catatan guru untuk ${studentName} berhasil dibuat.`);
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setGeneratingStudentId(null);
    }
  };

  // Auto-generate note for ALL students via Gemini AI with instant reliable fallback
  const handleAutoGenerateAllNotes = async () => {
    if (!students || students.length === 0) return;
    setIsAiGenerating(true);
    try {
      const studentInputs = students.map((st) => {
        const scoreData = currentRecord.scores[st.id];
        const achievedTps = activeTps
          .filter(
            (tp) =>
              scoreData?.tpAchieved?.[tp.id] === true ||
              (typeof scoreData?.tpScores?.[tp.id] === 'number' &&
                scoreData.tpScores[tp.id]! >= config.passingGrade)
          )
          .map((tp) => tp.desc);
        const unachievedTps = activeTps
          .filter(
            (tp) =>
              !(
                scoreData?.tpAchieved?.[tp.id] === true ||
                (typeof scoreData?.tpScores?.[tp.id] === 'number' &&
                  scoreData.tpScores[tp.id]! >= config.passingGrade)
              )
          )
          .map((tp) => tp.desc);

        return {
          studentId: st.id,
          studentName: st.name,
          stsScore: scoreData?.stsScore,
          passingGrade: config.passingGrade,
          achievedTps,
          unachievedTps,
          totalTps: activeTps.length,
        };
      });

      const notesMap = await generateAiTeacherNotes({
        students: studentInputs,
        className: `Kelas ${classLevel}`,
        subjectName: currentSubject.name,
        semester,
        schoolYear,
      });

      const updatedScores: Record<string, StudentScoreDetail> = { ...currentRecord.scores };
      const updatedAdditional: Record<string, StudentAdditionalInfo> = {
        ...(additionalInfo || {}),
      };

      students.forEach((st) => {
        const existing = updatedScores[st.id] || {
          studentId: st.id,
          studentName: st.name,
          tpScores: {},
          tpAchieved: {},
          stsScore: null,
          finalScore: null,
          autoDescription: '',
        };

        const scoreData = currentRecord.scores[st.id];
        const achievedCount = activeTps.filter(
          (tp) =>
            scoreData?.tpAchieved?.[tp.id] === true ||
            (typeof scoreData?.tpScores?.[tp.id] === 'number' &&
              scoreData.tpScores[tp.id]! >= config.passingGrade)
        ).length;

        const note =
          notesMap[st.id] ||
          generateTeacherNote(
            st.name,
            scoreData?.stsScore,
            achievedCount,
            activeTps.length,
            config.passingGrade
          );

        updatedScores[st.id] = {
          ...existing,
          teacherNote: note,
        };

        updatedAdditional[st.id] = {
          ...(updatedAdditional[st.id] || {
            studentId: st.id,
            attendance: { sakit: 0, izin: 0, alpha: 0 },
            extracurriculars: [],
            teacherNotes: '',
          }),
          teacherNotes: note,
        };
      });

      onUpdateSubjectRecord(currentSubject.id, {
        subjectId: currentSubject.id,
        scores: updatedScores,
      });

      if (onUpdateAdditionalInfo) {
        onUpdateAdditionalInfo(updatedAdditional);
      }

      setNotification(`Catatan guru berhasil dibuat untuk ${students.length} siswa.`);
      setTimeout(() => setNotification(null), 3500);
    } catch (err) {
      console.error('Batch AI note generation error:', err);
      // Emergency client-side generator
      const updatedScores: Record<string, StudentScoreDetail> = { ...currentRecord.scores };
      students.forEach((st) => {
        const scoreData = currentRecord.scores[st.id];
        const achievedCount = activeTps.filter(
          (tp) =>
            scoreData?.tpAchieved?.[tp.id] === true ||
            (typeof scoreData?.tpScores?.[tp.id] === 'number' &&
              scoreData.tpScores[tp.id]! >= config.passingGrade)
        ).length;
        const note = generateTeacherNote(
          st.name,
          scoreData?.stsScore,
          achievedCount,
          activeTps.length,
          config.passingGrade
        );
        updatedScores[st.id] = {
          ...(updatedScores[st.id] || {
            studentId: st.id,
            studentName: st.name,
            tpScores: {},
            tpAchieved: {},
            stsScore: null,
            finalScore: null,
            autoDescription: '',
          }),
          teacherNote: note,
        };
      });
      onUpdateSubjectRecord(currentSubject.id, {
        subjectId: currentSubject.id,
        scores: updatedScores,
      });
      setNotification(`Catatan guru berhasil dibuat untuk ${students.length} siswa.`);
      setTimeout(() => setNotification(null), 3500);
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Download Excel Template for scoring
  const handleDownloadTemplate = () => {
    downloadNilaiTemplateExcel(
      classLevel,
      semester,
      schoolYear,
      currentSubject,
      students,
      currentRecord.scores
    );
  };

  // Trigger file input dialog
  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  // Handle uploaded Excel file
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const result = await importNilaiFromExcel(
        file,
        currentSubject,
        students,
        currentRecord.scores,
        config
      );

      onUpdateSubjectRecord(currentSubject.id, {
        subjectId: currentSubject.id,
        scores: result.updatedScores,
      });

      if (additionalInfo && onUpdateAdditionalInfo) {
        const updatedAdditional = { ...additionalInfo };
        let anyNoteUpdated = false;
        Object.entries(result.updatedScores).forEach(([stId, scoreDet]) => {
          if (scoreDet.teacherNote && scoreDet.teacherNote.trim()) {
            if (updatedAdditional[stId]) {
              updatedAdditional[stId] = {
                ...updatedAdditional[stId],
                teacherNotes: scoreDet.teacherNote.trim(),
              };
              anyNoteUpdated = true;
            }
          }
        });
        if (anyNoteUpdated) {
          onUpdateAdditionalInfo(updatedAdditional);
        }
      }

      setImportSummary(result);
      setNotification(`Berhasil mengimpor nilai untuk ${result.successCount} siswa!`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      console.error('Import Excel Error:', err);
      setNotification(`Gagal mengimpor file Excel: ${err.message || 'Format tidak sesuai'}`);
      setTimeout(() => setNotification(null), 6000);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Custom Description Edit Modal
  const openCustomDescModal = (stId: string) => {
    const scoreData = currentRecord.scores[stId];
    setCustomDescText(scoreData?.customDescription || scoreData?.autoDescription || '');
    setEditingCustomDescStudentId(stId);
  };

  const saveCustomDesc = () => {
    if (!editingCustomDescStudentId) return;
    const existing = currentRecord.scores[editingCustomDescStudentId];
    if (!existing) return;

    const updatedScores = {
      ...currentRecord.scores,
      [editingCustomDescStudentId]: {
        ...existing,
        customDescription: customDescText.trim() ? customDescText.trim() : undefined,
      },
    };

    onUpdateSubjectRecord(currentSubject.id, {
      subjectId: currentSubject.id,
      scores: updatedScores,
    });

    setEditingCustomDescStudentId(null);
  };

  const currentMeta = currentSubject
    ? getSubjectMeta(currentSubject.name, currentSubject.category)
    : null;
  const CurrentIcon = currentMeta?.icon || BookOpen;

  return (
    <div
      className={`space-y-4 ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-[#F8FAFC] p-4 overflow-y-auto'
          : 'relative'
      }`}
    >
      {/* Hidden File Input for Excel Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx, .xls, .csv"
        onChange={handleFileChange}
        className="hidden"
      />

      {notification && (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/[0.12] px-4 py-2.5 text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          {notification}
        </div>
      )}

      {/* Import summary alert */}
      {importSummary && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-start justify-between gap-4">
          <div className="space-y-1 text-xs text-emerald-200">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Import Nilai Excel Berhasil!</span>
            </div>
            <p>
              Berhasil memperbarui nilai untuk{' '}
              <strong>{importSummary.successCount} siswa</strong> pada mata pelajaran{' '}
              <strong>{currentSubject.name}</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setImportSummary(null)}
            className="text-emerald-400 hover:text-white text-xs font-bold px-2.5 py-1 bg-emerald-500/20 rounded-lg cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* ============================================================
         MOBILE SUBJECT DROPDOWN SELECTOR (HP / SCREEN < LG)
      ============================================================ */}
      <div className="block lg:hidden rounded-2xl border border-slate-200 bg-white p-3 sm:p-3.5 shadow-xs mb-3 space-y-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-xs font-bold text-slate-800">Mata Pelajaran:</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 font-bold">
            {filteredSubjects.length} Mapel
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Prev Mapel Button */}
          <button
            type="button"
            disabled={!currentSubject || filteredSubjects.findIndex((s) => s.id === currentSubject.id) <= 0}
            onClick={() => {
              const currIdx = filteredSubjects.findIndex((s) => s.id === currentSubject?.id);
              if (currIdx > 0) {
                handleSelectSubject(filteredSubjects[currIdx - 1].id);
              }
            }}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shrink-0 transition-all cursor-pointer active:scale-95"
            title="Mata Pelajaran Sebelumnya"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>

          {/* Styled Select Dropdown */}
          <div className="relative flex-1 min-w-0">
            <select
              value={currentSubject?.id || ''}
              onChange={(e) => handleSelectSubject(e.target.value)}
              className="w-full h-9 pl-3 pr-8 rounded-xl border border-emerald-300 bg-emerald-50/60 text-xs font-bold text-emerald-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 appearance-none cursor-pointer truncate"
            >
              {filteredSubjects.map((subj, index) => {
                const codeStr = subj.code ? `[${subj.code}] ` : `[${index + 1}] `;
                return (
                  <option key={subj.id} value={subj.id} className="bg-white text-slate-900 font-medium">
                    {codeStr}{subj.name}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="w-4 h-4 text-emerald-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Quick Next Mapel Button */}
          <button
            type="button"
            disabled={!currentSubject || filteredSubjects.findIndex((s) => s.id === currentSubject.id) >= filteredSubjects.length - 1}
            onClick={() => {
              const currIdx = filteredSubjects.findIndex((s) => s.id === currentSubject?.id);
              if (currIdx >= 0 && currIdx < filteredSubjects.length - 1) {
                handleSelectSubject(filteredSubjects[currIdx + 1].id);
              }
            }}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shrink-0 transition-all cursor-pointer active:scale-95"
            title="Mata Pelajaran Selanjutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ============================================================
         2-COLUMN EXECUTIVE SPLIT VIEW FOR SCORING GRID
      ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-[330px_1fr] xl:grid-cols-[360px_1fr] gap-4 items-start">
        {/* ============================================================
           LEFT COLUMN: DAFTAR MATA PELAJARAN (SIDEBAR - DESKTOP ONLY)
        ============================================================ */}
        <aside
          ref={sidebarRef}
          className="hidden lg:flex rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs flex-col gap-3.5 min-h-[580px]"
        >
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight font-heading">
              Daftar Mata Pelajaran
            </h3>
          </div>

          {/* Instant Search Bar */}
          <div className="relative">
            <input
              type="text"
              value={subjectSearchQuery}
              onChange={(e) => setSubjectSearchQuery(e.target.value)}
              placeholder="Cari mata pelajaran..."
              className="w-full h-9 pl-3.5 pr-9 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Subject List */}
          <div className="space-y-2 flex-1">
            {filteredSubjects.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                Tidak ada mata pelajaran yang cocok.
              </div>
            ) : (
              filteredSubjects.map((subj) => {
                const isSelected = subj.id === selectedSubjectId;
                const meta = getSubjectMeta(subj.name, subj.category);
                const Icon = meta.icon;

                return (
                  <button
                    key={subj.id}
                    type="button"
                    onClick={() => handleSelectSubject(subj.id)}
                    className={`w-full text-left rounded-xl p-3 flex items-center justify-between gap-2.5 transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'border-2 border-emerald-500 bg-emerald-50/80 shadow-xs'
                        : 'border border-slate-200 bg-slate-50/70 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Subject Icon Box */}
                      <div
                        className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white text-slate-500 border border-slate-200'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      {/* Subject Name & Category Badge */}
                      <div className="min-w-0">
                        <p
                          className={`text-[13px] font-bold truncate leading-snug ${
                            isSelected ? 'text-slate-900' : 'text-slate-800'
                          }`}
                        >
                          {subj.name}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-md border text-[10px] font-medium tracking-normal ${meta.categoryClass}`}
                          >
                            {meta.categoryLabel}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Subject Code Badge */}
                    {subj.code && (
                      <span className="shrink-0 text-[10px] font-bold text-amber-700 uppercase tracking-wider pl-1">
                        {subj.code}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ============================================================
           RIGHT COLUMN: SUBJECT DETAIL HEADER & SCORE SPREADSHEET
        ============================================================ */}
        <section
          style={sidebarHeight ? { height: `${sidebarHeight}px` } : undefined}
          className="flex flex-col gap-4 min-w-0"
        >
          
{/* 2. ACTION & SEARCH TOOLBAR */}
<div className="flex w-full shrink-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

  {/* LEFT: SEARCH & ACTIONS */}
  <div className="grid w-full grid-cols-2 gap-2 lg:flex lg:min-w-0 lg:flex-1 lg:items-center">

    {/* Search Student Input */}
    <div className="relative col-span-2 min-w-0 lg:col-span-1 lg:w-full lg:max-w-xs lg:flex-1">
      <input
        type="text"
        placeholder="Cari nama siswa..."
        value={studentSearchQuery}
        onChange={(e) => setStudentSearchQuery(e.target.value)}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-sm font-normal text-slate-700 placeholder:text-slate-400 shadow-sm transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 lg:h-9 lg:text-xs"
      />

      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

      {studentSearchQuery && (
        <button
          type="button"
          onClick={() => setStudentSearchQuery('')}
          aria-label="Hapus pencarian"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 transition-colors hover:text-slate-700"
        >
          ✕
        </button>
      )}
    </div>

    {/* Download Template Excel */}
    <button
      type="button"
      onClick={handleDownloadTemplate}
      title="Unduh template Excel"
      className="flex h-10 min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-cyan-200 bg-cyan-50 px-2.5 text-xs font-semibold text-cyan-800 shadow-sm transition-colors hover:bg-cyan-100 active:scale-[0.98] lg:h-9 lg:px-3"
    >
      <Download className="h-4 w-4 shrink-0 text-cyan-700" />
      <span>Unduh Template</span>
    </button>

    {/* Import Template Excel */}
    <button
      type="button"
      onClick={handleTriggerUpload}
      disabled={isImporting}
      title="Impor nilai dari Excel"
      className="flex h-10 min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-cyan-200 bg-cyan-50 px-2.5 text-xs font-semibold text-cyan-800 shadow-sm transition-colors hover:bg-cyan-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 lg:h-9 lg:px-3"
    >
      <Upload className="h-4 w-4 shrink-0 text-cyan-700" />
      <span>{isImporting ? 'Mengimpor...' : 'Impor Template'}</span>
    </button>

    {/* Tarik dari Analisis Soal */}
    {onOpenAnalysisSync && (
      <button
        type="button"
        onClick={onOpenAnalysisSync}
        title="Tarik dan impor nilai dari analisis soal"
        className="flex h-10 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-emerald-200 bg-emerald-50 px-2 text-xs font-semibold text-emerald-800 shadow-sm transition-colors hover:bg-emerald-100 active:scale-[0.98] lg:h-9 lg:gap-2 lg:px-3"
      >
        <Zap className="h-4 w-4 shrink-0 text-emerald-700" />
        <span>Tarik dari Analisis</span>
      </button>
    )}

    {/* Reset Nilai */}
    <button
      type="button"
      onClick={handleOpenResetModal}
      title="Kosongkan nilai mata pelajaran ini"
      className="flex h-10 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-rose-200 bg-rose-50 px-2 text-xs font-semibold text-rose-700 shadow-sm transition-colors hover:bg-rose-100 active:scale-[0.98] lg:h-9 lg:gap-2 lg:px-3"
    >
      <Trash2 className="h-4 w-4 shrink-0 text-rose-600" />
      <span>Kosongkan Nilai</span>
    </button>

  </div>

  {/* RIGHT: VIEW CONTROLS */}
  <div className="flex w-full shrink-0 items-center justify-between gap-2 lg:w-auto lg:justify-end">

    {/* Mobile View Toggle */}
    <div className="flex h-10 items-center gap-0.5 rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs lg:hidden">
      <button
        type="button"
        onClick={() => setMobileViewMode('table')}
        aria-pressed={mobileViewMode === 'table'}
        className={`h-full rounded-lg px-3 text-[11px] font-semibold transition-colors ${
          mobileViewMode === 'table'
            ? 'bg-white text-emerald-800 shadow-sm'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        Tabel
      </button>

      <button
        type="button"
        onClick={() => setMobileViewMode('cards')}
        aria-pressed={mobileViewMode === 'cards'}
        className={`h-full rounded-lg px-3 text-[11px] font-semibold transition-colors ${
          mobileViewMode === 'cards'
            ? 'bg-white text-emerald-800 shadow-sm'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        Kartu Siswa
      </button>
    </div>

    {/* Student Count */}
    <span className="hidden whitespace-nowrap px-1 text-xs text-slate-500 md:inline">
      Menampilkan {displayedStudents.length} siswa
    </span>

    {/* Sort */}
    <button
      type="button"
      onClick={handleToggleSort}
      aria-label="Urutkan siswa"
      title="Urutkan siswa"
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors lg:h-9 lg:w-auto lg:gap-1.5 lg:px-3 ${
        sortOrder !== 'default'
          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
      }`}
    >
      <ArrowUpDown className="h-4 w-4" />
      <span className="hidden text-xs font-semibold lg:inline">Urutkan</span>
    </button>

    {/* Fullscreen Toggle */}
    <button
      type="button"
      onClick={() => setIsFullscreen(!isFullscreen)}
      aria-label={isFullscreen ? 'Keluar Fullscreen' : 'Fullscreen Grid'}
      title={isFullscreen ? 'Keluar Fullscreen' : 'Fullscreen Grid'}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 lg:h-9 lg:w-9"
    >
      {isFullscreen ? (
        <Minimize2 className="h-4 w-4" />
      ) : (
        <Maximize2 className="h-4 w-4" />
      )}
    </button>

  </div>
</div>

          {/* 3. MAIN SPREADSHEET TABLE GRID / MOBILE CARD VIEW */}
          {mobileViewMode === 'cards' ? (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-3 space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar shadow-xs">
              {displayedStudents.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs font-normal">
                  Tidak ada siswa yang cocok dengan pencarian.
                </div>
              ) : (
                displayedStudents.map((st, idx) => {
                  const scoreData = currentRecord.scores[st.id] || {
                    studentId: st.id,
                    studentName: st.name,
                    tpScores: {},
                    tpAchieved: {},
                    stsScore: null,
                    finalScore: null,
                    autoDescription: '',
                  };
                  const numericScore =
                    typeof scoreData.stsScore === 'number'
                      ? scoreData.stsScore
                      : typeof scoreData.finalScore === 'number'
                      ? scoreData.finalScore
                      : null;
                  const predicate = getScorePredicate(numericScore, config.passingGrade || 75);
                  const mastery = getMasteryStatusFromPredicate(predicate);

                  return (
                    <div
                      key={st.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 shadow-xs space-y-3"
                    >
                      {/* Header: Student Name & Number */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 border border-emerald-300 font-bold text-xs text-emerald-800">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 text-sm truncate">{st.name}</h4>
                            <p className="text-[11px] text-slate-500 font-normal truncate">
                              NIS: {st.nim || '-'} | NISN: {st.nisn || '-'}
                            </p>
                          </div>
                        </div>

                        {/* Predicate Badge */}
                        <span
                          className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-bold border shrink-0 ${
                            predicate === 'A'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : predicate === 'B'
                              ? 'bg-sky-50 text-sky-800 border-sky-300'
                              : predicate === 'C'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : predicate === 'D'
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {predicate !== '-' ? `Predikat ${predicate}` : 'Belum Ada Nilai'}
                        </span>
                      </div>

                      {/* STS Score Input with Stepper */}
                      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                        <div className="text-left">
                          <label className="text-xs font-bold text-slate-800 block">Nilai Sumatif (STS)</label>
                          <span className="text-[10px] text-slate-500 font-normal">Skala 0 - 100</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const cur = typeof scoreData.stsScore === 'number' ? scoreData.stsScore : 0;
                              const next = Math.max(0, cur - 1);
                              handleStsScoreChange(st.id, st.name, String(next));
                            }}
                            className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold text-lg flex items-center justify-center cursor-pointer transition-colors"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            max="100"
                            placeholder="0"
                            value={
                              typeof scoreData.stsScore === 'number' ? String(scoreData.stsScore) : ''
                            }
                            onChange={(e) => handleStsScoreChange(st.id, st.name, e.target.value)}
                            className="w-16 h-9 text-center font-black text-base rounded-xl border border-emerald-300 bg-emerald-50/50 text-emerald-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const cur = typeof scoreData.stsScore === 'number' ? scoreData.stsScore : 0;
                              const next = Math.min(100, cur + 1);
                              handleStsScoreChange(st.id, st.name, String(next));
                            }}
                            className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold text-lg flex items-center justify-center cursor-pointer transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Status Capaian */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-500">Status Capaian:</span>
                          <span className="font-bold text-emerald-700">{mastery}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed italic">
                          "{scoreData.customDescription || scoreData.autoDescription || 'Belum ada deskripsi'}"
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden flex-1 flex flex-col min-h-0">
              <div className="overflow-auto custom-scrollbar flex-1 min-h-0">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 sticky top-0 z-20">
                        {/* No */}
                        <th className="py-3 px-3 w-12 text-center font-bold text-xs text-slate-700 sticky left-0 z-30 bg-slate-50">
                          No
                        </th>

                        {/* Nama Siswa */}
                        <th className="py-3 px-4 min-w-[200px] font-bold text-xs text-slate-800 sticky left-12 z-30 bg-slate-50 border-r border-slate-200 shadow-[4px_0_10px_rgba(0,0,0,0.03)]">
                          <div>Nama Siswa</div>
                          <div className="text-[11px] font-normal text-slate-500 mt-0.5 leading-[1.4]">
                            NIS / NISN
                          </div>
                        </th>

                      {/* TP Headers - CLEAN WITHOUT ICONS (Conditionally displayed via showTpColumns) */}
                      {showTpColumns &&
                        activeTps.map((tp, tpIdx) => (
                          <th
                            key={tp.id}
                            className="py-3 px-2 text-center w-[72px] font-bold border-l border-slate-200"
                            title={tp.desc || `Tujuan Pembelajaran ${tpIdx + 1}`}
                          >
                            <div className="text-emerald-800 font-bold text-xs">
                              {tp.code || `TP ${tpIdx + 1}`}
                            </div>
                            <div className="text-[11px] font-normal text-slate-500 mt-0.5 leading-[1.4]">
                              Tercapai
                            </div>
                          </th>
                        ))}

                      {/* Nilai Sumatif */}
                      <th className="py-3 px-3 text-center w-24 font-bold border-l border-slate-200">
                        <div className="text-xs font-bold text-slate-900">Nilai STS</div>
                        <div className="text-[11px] font-normal text-slate-500 mt-0.5 leading-[1.4]">
                          0 - 100
                        </div>
                      </th>

                      {/* Predikat (Auto A/B/C/D) */}
                      <th className="py-3 px-3 text-center w-20 font-bold border-l border-slate-200">
                        <div className="text-xs font-bold text-emerald-800">Predikat</div>
                        <div className="text-[11px] font-normal text-slate-500 mt-0.5 leading-[1.4]">
                          A / B / C / D
                        </div>
                      </th>

                      {/* Status Penguasaan (Auto) */}
                      <th className="py-3 px-3.5 min-w-[140px] font-bold border-l border-slate-200">
                        <div className="text-xs font-bold text-slate-800">Penguasaan</div>
                        <div className="text-[11px] font-normal text-slate-500 mt-0.5 leading-[1.4]">
                          Status Capaian
                        </div>
                      </th>

                      {/* Capaian Kompetensi (Hanya tampil jika rincian TP dibuka) */}
                      {showTpColumns && (
                        <th className="py-3 px-3.5 min-w-[220px] font-bold border-l border-slate-200 text-slate-800 text-xs">
                          Capaian Kompetensi (TP)
                        </th>
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {displayedStudents.length === 0 ? (
                      <tr>
                        <td
                          colSpan={showTpColumns ? 7 + activeTps.length : 6}
                          className="text-center py-12 text-slate-500 text-xs font-normal"
                        >
                          Tidak ada siswa yang cocok dengan pencarian.
                        </td>
                      </tr>
                    ) : (
                      displayedStudents.map((st, idx) => {
                        const scoreData = currentRecord.scores[st.id] || {
                          studentId: st.id,
                          studentName: st.name,
                          tpScores: {},
                          tpAchieved: {},
                          stsScore: null,
                          finalScore: null,
                          autoDescription: '',
                        };

                        const hasCustomDesc = !!scoreData.customDescription;

                        // Hitung Predikat & Penguasaan seketika berdasarkan nilai STS
                        const numericScore =
                          typeof scoreData.stsScore === 'number'
                            ? scoreData.stsScore
                            : typeof scoreData.finalScore === 'number'
                            ? scoreData.finalScore
                            : null;
                        const predicate = getScorePredicate(numericScore, config.passingGrade || 75);
                        const mastery = getMasteryStatusFromPredicate(predicate);

                        return (
                          <tr
                            key={st.id}
                            className="hover:bg-slate-50/80 transition-colors group"
                          >
                            {/* No */}
                            <td className="py-3 px-3 text-center text-slate-600 font-medium text-xs sticky left-0 z-10 bg-white group-hover:bg-slate-50">
                              {idx + 1}
                            </td>

                            {/* Nama Siswa */}
                            <td className="py-3 px-4 sticky left-12 z-10 bg-white group-hover:bg-slate-50 border-r border-slate-200 shadow-[4px_0_10px_rgba(0,0,0,0.03)]">
                              <div className="font-bold text-slate-900 text-[13px] leading-[1.35]">
                                {st.name}
                              </div>
                              <div className="text-[11px] font-normal text-slate-500 mt-0.5 leading-[1.4]">
                                NIS: {st.nim || '-'} | NISN: {st.nisn || '-'}
                              </div>
                            </td>

                            {/* TP Checkbox Inputs (Hanya tampil jika mode TP aktif) */}
                            {showTpColumns &&
                              activeTps.map((tp, tpIdx) => {
                                const isAchieved =
                                  scoreData.tpAchieved?.[tp.id] === true ||
                                  (typeof scoreData.tpScores?.[tp.id] === 'number' &&
                                    (scoreData.tpScores[tp.id]! >= config.passingGrade ||
                                      scoreData.tpScores[tp.id] === 1 ||
                                      scoreData.tpScores[tp.id] === 100));

                                return (
                                  <td
                                    key={tp.id}
                                    className="py-2.5 px-2 text-center border-l border-slate-100"
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleToggleTpAchieved(st.id, st.name, tp.id)
                                      }
                                      className={`w-6 h-6 mx-auto rounded-md flex items-center justify-center transition-all cursor-pointer select-none ${
                                        isAchieved
                                          ? 'bg-emerald-500 text-white shadow-xs'
                                          : 'border border-slate-300 bg-white hover:border-emerald-500'
                                      }`}
                                      title={
                                        isAchieved
                                          ? `${tp.code || `TP ${tpIdx + 1}`}: Tercapai`
                                          : `${tp.code || `TP ${tpIdx + 1}`}: Belum Tercapai`
                                      }
                                    >
                                      {isAchieved && (
                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                      )}
                                    </button>
                                  </td>
                                );
                              })}

                            {/* STS Final Score Input */}
                            <td className="py-2.5 px-2 text-center border-l border-slate-100">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="-"
                                value={
                                  typeof scoreData.stsScore === 'number'
                                    ? String(scoreData.stsScore)
                                    : ''
                                }
                                onChange={(e) =>
                                  handleStsScoreChange(
                                    st.id,
                                    st.name,
                                    e.target.value
                                  )
                                }
                                className="w-16 h-8 text-center rounded-lg font-black text-sm border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all no-spin-button [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </td>

                            {/* Predikat (A / B / C / D) */}
                            <td className="py-2.5 px-2 text-center border-l border-slate-100">
                              {predicate === '-' ? (
                                <span className="text-slate-400 font-medium text-xs">-</span>
                              ) : (
                                <span
                                  className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold border ${
                                    predicate === 'A'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                                      : predicate === 'B'
                                      ? 'bg-sky-50 text-sky-800 border-sky-300 shadow-xs'
                                      : predicate === 'C'
                                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                                      : 'bg-rose-50 text-rose-800 border-rose-300'
                                  }`}
                                >
                                  {predicate}
                                </span>
                              )}
                            </td>

                            {/* Status Penguasaan (Sangat Baik / Baik / Cukup / Perlu Bimbingan) */}
                            <td className="py-2.5 px-3 border-l border-slate-100">
                              {mastery === '-' ? (
                                <span className="text-slate-400 font-medium text-xs italic">-</span>
                              ) : (
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
                                    predicate === 'A'
                                      ? 'bg-emerald-50 text-emerald-800'
                                      : predicate === 'B'
                                      ? 'bg-sky-50 text-sky-800'
                                      : predicate === 'C'
                                      ? 'bg-amber-50 text-amber-800'
                                      : 'bg-rose-50 text-rose-800'
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      predicate === 'A'
                                        ? 'bg-emerald-500'
                                        : predicate === 'B'
                                        ? 'bg-sky-500'
                                        : predicate === 'C'
                                        ? 'bg-amber-500'
                                        : 'bg-rose-500'
                                    }`}
                                  />
                                  <span>{mastery}</span>
                                </span>
                              )}
                            </td>

                            {/* Capaian Kompetensi (Hanya tampil jika mode TP dibuka) */}
                            {showTpColumns && (
                              <td className="py-2.5 px-3.5 border-l border-slate-100">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs font-normal text-slate-700 leading-[1.4] truncate max-w-[220px]">
                                    {scoreData.customDescription ||
                                      scoreData.autoDescription || (
                                        <span className="text-slate-400 italic font-normal">
                                          Belum dinilai
                                        </span>
                                      )}
                                  </p>

                                  <button
                                    type="button"
                                    onClick={() => openCustomDescModal(st.id)}
                                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 transition-colors shrink-0 cursor-pointer"
                                    title="Lihat & sesuaikan narasi capaian"
                                  >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                {hasCustomDesc && (
                                  <span className="text-[10px] font-semibold text-amber-700 block mt-0.5">
                                    (Kustom Guru)
                                  </span>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Modal Edit Custom Description */}
      {editingCustomDescStudentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-600" />
                <span>Sesuaikan Capaian Kompetensi</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingCustomDescStudentId(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Teks Narasi Rapor ({currentSubject.name})
              </label>
              <textarea
                rows={4}
                value={customDescText}
                onChange={(e) => setCustomDescText(e.target.value)}
                className="w-full text-xs font-normal text-slate-900 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 rounded-xl p-3 focus:outline-none leading-relaxed resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCustomDescText('')}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-amber-700 font-medium cursor-pointer"
              >
                Reset ke Otomatis
              </button>
              <button
                type="button"
                onClick={() => setEditingCustomDescStudentId(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={saveCustomDesc}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white shadow-xs cursor-pointer transition-colors"
              >
                Simpan Narasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Kosongkan Nilai (In-App Modal Tanpa window.confirm) */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-rose-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  Kosongkan Seluruh Nilai?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Apakah Anda yakin ingin mengosongkan seluruh nilai STS, capaian TP, dan catatan guru untuk mata pelajaran{' '}
                  <span className="font-bold text-rose-700">{currentSubject.name}</span> pada{' '}
                  <span className="font-bold text-slate-900">{students.length} siswa</span> di kelas ini? Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmResetCurrentSubjectScores}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Kosongkan Nilai</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
