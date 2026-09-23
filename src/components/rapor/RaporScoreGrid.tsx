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
} from 'lucide-react';
import {
  RaporSubject,
  LearningObjective,
  SubjectCategory,
  StudentScoreDetail,
  StudentSubjectRecord,
  StudentAdditionalInfo,
  RaporStsConfig,
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
  onGoToTpSetup?: () => void;
  initialSubjectId?: string;
  onSelectSubject?: (subjectId: string) => void;
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
  onGoToTpSetup,
  initialSubjectId,
  onSelectSubject,
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
          ? 'fixed inset-0 z-50 bg-[#040B14] p-4 overflow-y-auto'
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
         2-COLUMN EXECUTIVE SPLIT VIEW FOR SCORING GRID
      ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-[330px_1fr] xl:grid-cols-[360px_1fr] gap-4 items-start">
        {/* ============================================================
           LEFT COLUMN: DAFTAR MATA PELAJARAN (SIDEBAR)
           Determines the height naturally with all subjects visible
        ============================================================ */}
        <aside
          ref={sidebarRef}
          className="rounded-2xl border border-white/[0.08] bg-[#07111E] p-4 shadow-xl shadow-black/20 flex flex-col gap-3.5 min-h-[580px]"
        >
          <div>
            <h3 className="text-sm font-black text-white tracking-tight">
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
              className="w-full h-9 pl-3.5 pr-9 rounded-xl border border-white/[0.08] bg-[#0A1626] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400/40 focus:ring-1 focus:ring-emerald-400/25 transition-all"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>

          {/* Subject List - Fully visible without locking container */}
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
                const tpCount = (subj.tpList || []).filter(
                  (tp) => tp.isActive !== false && Boolean(tp.desc && tp.desc.trim())
                ).length;

                return (
                  <button
                    key={subj.id}
                    type="button"
                    onClick={() => handleSelectSubject(subj.id)}
                    className={`w-full text-left rounded-xl p-3 flex items-center justify-between gap-2.5 transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'border-2 border-emerald-400 bg-emerald-950/30 shadow-[0_0_20px_rgba(16,185,129,0.14)]'
                        : 'border border-white/[0.07] bg-[#0A1626] hover:bg-[#0D1C30] hover:border-white/[0.14]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Subject Icon Box */}
                      <div
                        className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                            : 'bg-white/[0.04] text-slate-400 border border-white/[0.06]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      {/* Subject Name & Category Badge */}
                      <div className="min-w-0">
                        <p
                          className={`text-[13px] font-semibold truncate leading-snug ${
                            isSelected ? 'text-white' : 'text-slate-200'
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

                    {/* TP Count Badge */}
                    <span className="shrink-0 text-[11px] font-medium text-slate-400 whitespace-nowrap pl-1">
                      {tpCount} TP
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ============================================================
           RIGHT COLUMN: SUBJECT DETAIL HEADER & SCORE SPREADSHEET
           Height locked to sidebar so table frame remains aligned
        ============================================================ */}
        <section
          style={sidebarHeight ? { height: `${sidebarHeight}px` } : undefined}
          className="flex flex-col gap-4 min-w-0"
        >
          {/* 1. TOP HEADER BANNER OF SELECTED SUBJECT */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#07111E] p-4 sm:p-5 shadow-xl shadow-black/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0 shadow-inner">
                <CurrentIcon className="w-6 h-6" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                    {currentSubject.name}
                  </h2>
                  <span
                    className={`px-2 py-0.5 rounded-md border text-[10px] font-medium tracking-normal ${currentMeta?.categoryClass}`}
                  >
                    {currentMeta?.categoryLabel}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400 font-normal leading-relaxed">
                  Input nilai dan catatan perkembangan peserta didik.
                </p>
              </div>
            </div>

            {/* Right Quick Summary Widget: 8 TP Total Tujuan Pembelajaran > */}
            <button
              type="button"
              onClick={onGoToTpSetup}
              className="rounded-xl border border-white/[0.08] bg-slate-950/70 hover:bg-slate-900 px-4 py-2 text-left flex items-center gap-3 transition-colors group cursor-pointer self-start sm:self-auto shrink-0"
              title="Atur Tujuan Pembelajaran"
            >
              <div>
                <p className="text-xs sm:text-sm font-bold text-white leading-tight">
                  {activeTps.length} TP
                </p>
                <p className="text-[11px] text-slate-400 font-normal mt-0.5">
                  Total Tujuan Pembelajaran
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>

          {/* 2. ACTION & SEARCH TOOLBAR */}
          <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
            {/* Left: Search + Excel Buttons + Reset */}
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
              {/* Search Student Input */}
              <div className="relative flex-1 min-w-[170px] max-w-xs">
                <input
                  type="text"
                  placeholder="Cari nama siswa..."
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-7 rounded-xl border border-white/[0.08] bg-[#07111E] text-xs font-normal text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400/40 focus:ring-1 focus:ring-emerald-400/25 transition-all"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                {studentSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setStudentSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Download Template Excel */}
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="h-9 px-3.5 rounded-xl border border-cyan-400/25 bg-[#07111E] hover:bg-cyan-500/10 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap active:scale-95"
                title="Unduh template Excel"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Unduh Template</span>
              </button>

              {/* Import Template Excel */}
              <button
                type="button"
                onClick={handleTriggerUpload}
                disabled={isImporting}
                className="h-9 px-3.5 rounded-xl border border-cyan-400/25 bg-[#07111E] hover:bg-cyan-500/10 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap active:scale-95 disabled:opacity-50"
                title="Impor nilai dari Excel"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isImporting ? 'Mengimpor...' : 'Impor Template'}</span>
              </button>

              {/* Reset Nilai Button */}
              <button
                type="button"
                onClick={handleOpenResetModal}
                className="h-9 px-3.5 rounded-xl border border-rose-500/25 bg-[#07111E] hover:bg-rose-500/10 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap active:scale-95"
                title="Kosongkan nilai mata pelajaran ini"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Kosongkan Nilai</span>
              </button>
            </div>

            {/* Right: Info count + Sort + Fullscreen Toggle */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-normal text-slate-400 px-1">
                Menampilkan {displayedStudents.length} siswa
              </span>

              <button
                type="button"
                onClick={handleToggleSort}
                className={`h-9 px-3 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  sortOrder !== 'default'
                    ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
                    : 'border-white/[0.08] bg-[#07111E] text-slate-300 hover:bg-white/[0.04]'
                }`}
                title="Urutkan siswa"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>Urutkan</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-9 w-9 rounded-xl border border-white/[0.08] bg-[#07111E] hover:bg-white/[0.04] text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                title={isFullscreen ? 'Keluar Fullscreen' : 'Fullscreen Grid'}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* 3. MAIN SPREADSHEET TABLE GRID */}
          {!isTpAvailable ? (
            <div className="p-10 rounded-2xl bg-[#07111E] border border-white/[0.08] text-center space-y-4 shadow-xl flex-1 min-h-0 flex flex-col justify-center items-center">
              <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/25 text-amber-300 flex items-center justify-center mx-auto shadow-inner">
                <Lock className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-white">
                  Tujuan Pembelajaran (TP) Belum Dibuat
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed font-normal">
                  Sebelum menginput nilai <strong className="text-slate-200 font-semibold">{currentSubject.name}</strong>,
                  silakan buat butir TP terlebih dahulu pada tab TP & Capaian.
                </p>
              </div>
              {onGoToTpSetup && (
                <button
                  type="button"
                  onClick={onGoToTpSetup}
                  className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-semibold inline-flex items-center gap-1.5 shadow-md shadow-emerald-400/20 cursor-pointer"
                >
                  <span>Buka Pengaturan TP</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.08] bg-[#07111E] shadow-xl shadow-black/20 overflow-hidden flex-1 flex flex-col min-h-0">
              <div className="overflow-auto custom-scrollbar flex-1 min-h-0">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#0A1626] text-slate-300 border-b border-white/[0.08] sticky top-0 z-20">
                      {/* No */}
                      <th className="py-3 px-3 w-12 text-center font-semibold text-xs text-slate-300">
                        No
                      </th>

                      {/* Nama Siswa */}
                      <th className="py-3 px-4 min-w-[200px] font-semibold text-xs text-slate-200">
                        <div>Nama Siswa</div>
                        <div className="text-[11px] font-normal text-slate-400 mt-0.5 leading-[1.4]">
                          NIS / NISN
                        </div>
                      </th>

                      {/* TP Headers - CLEAN WITHOUT ICONS as requested */}
                      {activeTps.map((tp, tpIdx) => (
                        <th
                          key={tp.id}
                          className="py-3 px-2 text-center w-[72px] font-semibold border-l border-white/[0.06]"
                          title={tp.desc || `Tujuan Pembelajaran ${tpIdx + 1}`}
                        >
                          <div className="text-cyan-300 font-semibold text-xs">
                            {tp.code || `TP ${tpIdx + 1}`}
                          </div>
                          <div className="text-[11px] font-normal text-slate-400 mt-0.5 leading-[1.4]">
                            Tercapai
                          </div>
                        </th>
                      ))}

                      {/* Nilai Sumatif */}
                      <th className="py-3 px-3 text-center w-24 font-semibold border-l border-white/[0.06]">
                        <div className="text-xs font-semibold text-white">Nilai</div>
                        <div className="text-[11px] font-normal text-slate-400 mt-0.5 leading-[1.4]">
                          0 - 100
                        </div>
                      </th>

                      {/* Catatan Guru with AI Sparkle Button */}
                      <th className="py-3 px-3.5 min-w-[240px] font-semibold border-l border-white/[0.06]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-200 text-xs font-semibold">Catatan Guru</span>
                          <button
                            type="button"
                            onClick={handleAutoGenerateAllNotes}
                            disabled={isAiGenerating || students.length === 0}
                            className="px-2 py-1 rounded-md bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/30 text-amber-300 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                            title="Buat catatan guru otomatis untuk semua siswa"
                          >
                            {isAiGenerating ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Membuat...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3" />
                                <span>Auto</span>
                              </>
                            )}
                          </button>
                        </div>
                      </th>

                      {/* Capaian Kompetensi */}
                      <th className="py-3 px-3.5 min-w-[220px] font-semibold border-l border-white/[0.06] text-slate-200 text-xs">
                        Capaian Kompetensi
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/[0.05]">
                    {displayedStudents.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5 + activeTps.length}
                          className="text-center py-12 text-slate-400 text-xs font-normal"
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

                        return (
                          <tr
                            key={st.id}
                            className="hover:bg-[#0A1626]/70 transition-colors group"
                          >
                            {/* No */}
                            <td className="py-3 px-3 text-center text-slate-400 font-normal text-xs">
                              {idx + 1}
                            </td>

                            {/* Nama Siswa */}
                            <td className="py-3 px-4">
                              <div className="font-semibold text-white text-[13px] leading-[1.35]">
                                {st.name}
                              </div>
                              <div className="text-[11px] font-normal text-slate-400 mt-0.5 leading-[1.4]">
                                NIS: {st.nim || '-'} | NISN: {st.nisn || '-'}
                              </div>
                            </td>

                            {/* TP Checkbox Inputs */}
                            {activeTps.map((tp, tpIdx) => {
                              const isAchieved =
                                scoreData.tpAchieved?.[tp.id] === true ||
                                (typeof scoreData.tpScores?.[tp.id] === 'number' &&
                                  (scoreData.tpScores[tp.id]! >= config.passingGrade ||
                                    scoreData.tpScores[tp.id] === 1 ||
                                    scoreData.tpScores[tp.id] === 100));

                              return (
                                <td
                                  key={tp.id}
                                  className="py-2.5 px-2 text-center border-l border-white/[0.05]"
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleToggleTpAchieved(st.id, st.name, tp.id)
                                    }
                                    className={`w-6 h-6 mx-auto rounded-md flex items-center justify-center transition-all cursor-pointer select-none ${
                                      isAchieved
                                        ? 'bg-emerald-400 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                                        : 'border border-white/[0.15] bg-[#0A1626] hover:border-white/[0.3]'
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
                            <td className="py-2.5 px-2 text-center border-l border-white/[0.05]">
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
                                className="w-14 h-8 text-center rounded-lg font-semibold text-[13px] border border-white/[0.1] bg-[#0A1626] text-white focus:outline-none focus:border-emerald-400 transition-colors no-spin-button [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </td>

                            {/* Catatan Guru Input with individual AI button */}
                            <td className="py-2 px-3 border-l border-white/[0.05]">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  placeholder="Tulis catatan guru..."
                                  value={scoreData.teacherNote || ''}
                                  onChange={(e) =>
                                    handleTeacherNoteChange(st.id, e.target.value)
                                  }
                                  className="w-full h-8 px-2.5 rounded-lg text-xs font-normal bg-[#0A1626] border border-white/[0.08] text-slate-200 placeholder-slate-400 focus:outline-none focus:border-emerald-400 transition-colors leading-[1.4]"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleAutoGenerateStudentNote(st.id, st.name)
                                  }
                                  disabled={
                                    generatingStudentId === st.id || isAiGenerating
                                  }
                                  className="w-7 h-7 shrink-0 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/25 text-amber-300 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                                  title="Buat catatan AI untuk siswa ini"
                                >
                                  {generatingStudentId === st.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Sparkles className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </td>

                            {/* Capaian Kompetensi */}
                            <td className="py-2.5 px-3.5 border-l border-white/[0.05]">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-normal text-slate-300 leading-[1.4] truncate max-w-[220px]">
                                  {scoreData.customDescription ||
                                    scoreData.autoDescription || (
                                      <span className="text-slate-500 italic font-normal">
                                        Belum dinilai
                                      </span>
                                    )}
                                </p>

                                <button
                                  type="button"
                                  onClick={() => openCustomDescModal(st.id)}
                                  className="p-1 rounded-md text-slate-400 hover:text-white transition-colors shrink-0 cursor-pointer"
                                  title="Lihat & sesuaikan narasi capaian"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              {hasCustomDesc && (
                                <span className="text-[10px] font-medium text-amber-300 block mt-0.5">
                                  (Kustom Guru)
                                </span>
                              )}
                            </td>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#07111E] border border-white/[0.1] rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-400" />
                <span>Sesuaikan Capaian Kompetensi</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingCustomDescStudentId(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Teks Narasi Rapor ({currentSubject.name})
              </label>
              <textarea
                rows={4}
                value={customDescText}
                onChange={(e) => setCustomDescText(e.target.value)}
                className="w-full text-xs font-normal text-white bg-[#0A1626] border border-white/[0.1] focus:border-emerald-400 rounded-xl p-3 focus:outline-none leading-relaxed resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCustomDescText('')}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-amber-300 font-medium cursor-pointer"
              >
                Reset ke Otomatis
              </button>
              <button
                type="button"
                onClick={() => setEditingCustomDescStudentId(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-xs font-semibold text-slate-300 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={saveCustomDesc}
                className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-xs font-semibold text-slate-950 shadow-md shadow-emerald-400/20 cursor-pointer"
              >
                Simpan Narasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Kosongkan Nilai (In-App Modal Tanpa window.confirm) */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#07111E] border border-rose-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">
                  Kosongkan Seluruh Nilai?
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Apakah Anda yakin ingin mengosongkan seluruh nilai STS, capaian TP, dan catatan guru untuk mata pelajaran{' '}
                  <span className="font-bold text-rose-300">{currentSubject.name}</span> pada{' '}
                  <span className="font-bold text-white">{students.length} siswa</span> di kelas ini? Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-slate-300 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmResetCurrentSubjectScores}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
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
