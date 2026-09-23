import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Calendar,
  Clock3,
  X,
  Plus,
  Trash2,
  Check,
  Printer,
  Search,
  Users,
  Settings2,
  RotateCcw,
  Sparkles,
  Info,
  Building2,
  UserCheck,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Upload,
  Download,
  FileText,
  AlertCircle,
  HelpCircle,
  Wand2,
  FileDown,
  Layers,
  GraduationCap,
  LayoutGrid,
  Table2,
  Smartphone,
  ArrowLeftRight,
  RefreshCw,
} from 'lucide-react';
import {
  ActiveExamSchedule,
  ExamScheduleRow,
  ExamProctorAssignment,
  ExamProctorCodeItem,
  DEFAULT_ACTIVE_EXAM_SCHEDULE,
  DEFAULT_PROCTOR_CODES,
  DEFAULT_EXAM_ROOMS,
} from '../types';
import {
  exportScheduleToExcel,
  parseExamScheduleExcel,
  formatToDDMMYYYY,
  splitSessionTimeAndLabel,
} from '../utils/examScheduleExcel';
import { getProctorCodeColor, getProctorMatrixCellStyle } from '../utils/proctorColors';
import {
  generateSmartExamSchedule,
  AutoGenerateOptions,
} from '../utils/examScheduleGenerator';
import { printOrDownloadExamScheduleDoc } from '../utils/examSchedulePrinter';
import {
  calculateTeacherLoads,
  detectScheduleConflicts,
  SwapRecommendation,
  ConflictItem,
} from '../utils/examScheduleSwapEngine';
import { SmartSwapModal } from './SmartSwapModal';

interface ActiveExamScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule?: ActiveExamSchedule;
  isAdmin?: boolean;
  onSaveSchedule?: (updatedSchedule: ActiveExamSchedule) => Promise<void>;
}

// Room Grade Styling Helper: distinct colors & borders per grade dynamically calculated
export interface GradeStyleConfig {
  headerBg: string;
  headerText: string;
  headerBorder: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  isGradeBoundary: boolean;
}

export function getRoomGradeConfig(
  roomName: string,
  isBoundary: boolean = false
): GradeStyleConfig {
  const clean = (roomName || '').trim().toUpperCase();
  const firstChar = clean.charAt(0);

  switch (firstChar) {
    case '1':
      return {
        headerBg: 'bg-sky-950/40 text-sky-300 border-sky-500/30',
        headerText: 'text-sky-400',
        headerBorder: isBoundary ? 'border-r-2 border-r-sky-500/70' : 'border-r border-r-[#222839]',
        badgeBg: 'bg-sky-500/15 hover:bg-sky-500/25',
        badgeText: 'text-sky-300',
        badgeBorder: 'border-sky-500/30',
        isGradeBoundary: isBoundary,
      };
    case '2':
      return {
        headerBg: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30',
        headerText: 'text-emerald-400',
        headerBorder: isBoundary ? 'border-r-2 border-r-emerald-500/70' : 'border-r border-r-[#222839]',
        badgeBg: 'bg-emerald-500/15 hover:bg-emerald-500/25',
        badgeText: 'text-emerald-300',
        badgeBorder: 'border-emerald-500/30',
        isGradeBoundary: isBoundary,
      };
    case '3':
      return {
        headerBg: 'bg-amber-950/40 text-amber-300 border-amber-500/30',
        headerText: 'text-amber-400',
        headerBorder: isBoundary ? 'border-r-2 border-r-amber-500/70' : 'border-r border-r-[#222839]',
        badgeBg: 'bg-amber-500/15 hover:bg-amber-500/25',
        badgeText: 'text-amber-300',
        badgeBorder: 'border-amber-500/30',
        isGradeBoundary: isBoundary,
      };
    case '4':
      return {
        headerBg: 'bg-indigo-950/40 text-indigo-300 border-indigo-500/30',
        headerText: 'text-indigo-400',
        headerBorder: isBoundary ? 'border-r-2 border-r-indigo-500/70' : 'border-r border-r-[#222839]',
        badgeBg: 'bg-indigo-500/15 hover:bg-indigo-500/25',
        badgeText: 'text-indigo-300',
        badgeBorder: 'border-indigo-500/30',
        isGradeBoundary: isBoundary,
      };
    case '5':
      return {
        headerBg: 'bg-purple-950/40 text-purple-300 border-purple-500/30',
        headerText: 'text-purple-400',
        headerBorder: isBoundary ? 'border-r-2 border-r-purple-500/70' : 'border-r border-r-[#222839]',
        badgeBg: 'bg-purple-500/15 hover:bg-purple-500/25',
        badgeText: 'text-purple-300',
        badgeBorder: 'border-purple-500/30',
        isGradeBoundary: isBoundary,
      };
    case '6':
      return {
        headerBg: 'bg-rose-950/40 text-rose-300 border-rose-500/30',
        headerText: 'text-rose-400',
        headerBorder: isBoundary ? 'border-r-2 border-r-rose-500/70' : 'border-r border-r-[#222839]',
        badgeBg: 'bg-rose-500/15 hover:bg-rose-500/25',
        badgeText: 'text-rose-300',
        badgeBorder: 'border-rose-500/30',
        isGradeBoundary: isBoundary,
      };
    default:
      return {
        headerBg: 'bg-slate-900/40 text-slate-300 border-slate-700/30',
        headerText: 'text-teal-400',
        headerBorder: isBoundary ? 'border-r-2 border-r-teal-500/70' : 'border-r border-r-[#222839]',
        badgeBg: 'bg-teal-500/15 hover:bg-teal-500/25',
        badgeText: 'text-teal-300',
        badgeBorder: 'border-teal-500/30',
        isGradeBoundary: isBoundary,
      };
  }
}

// Day color styling map
const DAY_COLOR_CONFIG: Record<
  string,
  {
    badge: string;
    border: string;
    bgHover: string;
    accentText: string;
    headerBg: string;
    cardBorder: string;
  }
> = {
  senin: {
    badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    border: 'border-l-4 border-l-sky-400',
    bgHover: 'hover:bg-sky-500/5',
    accentText: 'text-sky-400',
    headerBg: 'bg-sky-500/10 text-sky-200 border-sky-500/20',
    cardBorder: 'border-sky-500/30',
  },
  selasa: {
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    border: 'border-l-4 border-l-emerald-400',
    bgHover: 'hover:bg-emerald-500/5',
    accentText: 'text-emerald-400',
    headerBg: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20',
    cardBorder: 'border-emerald-500/30',
  },
  rabu: {
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    border: 'border-l-4 border-l-amber-400',
    bgHover: 'hover:bg-amber-500/5',
    accentText: 'text-amber-400',
    headerBg: 'bg-amber-500/10 text-amber-200 border-amber-500/20',
    cardBorder: 'border-amber-500/30',
  },
  kamis: {
    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    border: 'border-l-4 border-l-purple-400',
    bgHover: 'hover:bg-purple-500/5',
    accentText: 'text-purple-400',
    headerBg: 'bg-purple-500/10 text-purple-200 border-purple-500/20',
    cardBorder: 'border-purple-500/30',
  },
  jumat: {
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    border: 'border-l-4 border-l-rose-400',
    bgHover: 'hover:bg-rose-500/5',
    accentText: 'text-rose-400',
    headerBg: 'bg-rose-500/10 text-rose-200 border-rose-500/20',
    cardBorder: 'border-rose-500/30',
  },
  sabtu: {
    badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    border: 'border-l-4 border-l-cyan-400',
    bgHover: 'hover:bg-cyan-500/5',
    accentText: 'text-cyan-400',
    headerBg: 'bg-cyan-500/10 text-cyan-200 border-cyan-500/20',
    cardBorder: 'border-cyan-500/30',
  },
};

function getDayConfig(dayName: string) {
  const normalized = (dayName || '').trim().toLowerCase();
  for (const key of Object.keys(DAY_COLOR_CONFIG)) {
    if (normalized.includes(key)) {
      return DAY_COLOR_CONFIG[key];
    }
  }
  return {
    badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    border: 'border-l-4 border-l-indigo-400',
    bgHover: 'hover:bg-indigo-500/5',
    accentText: 'text-indigo-400',
    headerBg: 'bg-indigo-500/10 text-indigo-200 border-indigo-500/20',
    cardBorder: 'border-indigo-500/30',
  };
}

// Session color styling map (Sesi 1, Sesi 2, Sesi 3, dsb)
const SESSION_COLOR_CONFIG: Record<
  string,
  {
    badge: string;
    text: string;
    bg: string;
    border: string;
    dot: string;
  }
> = {
  sesi_1: {
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  sesi_2: {
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    dot: 'bg-amber-400',
  },
  sesi_3: {
    badge: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    text: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    dot: 'bg-violet-400',
  },
  sesi_4: {
    badge: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
    text: 'text-pink-400',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/30',
    dot: 'bg-pink-400',
  },
};

function getSessionConfig(sessionName: string) {
  const normalized = (sessionName || '').trim().toLowerCase();
  if (normalized.includes('sesi 1') || normalized.includes('sesi-1') || normalized.includes('(1)')) {
    return SESSION_COLOR_CONFIG.sesi_1;
  }
  if (normalized.includes('sesi 2') || normalized.includes('sesi-2') || normalized.includes('(2)')) {
    return SESSION_COLOR_CONFIG.sesi_2;
  }
  if (normalized.includes('sesi 3') || normalized.includes('sesi-3') || normalized.includes('(3)')) {
    return SESSION_COLOR_CONFIG.sesi_3;
  }
  if (normalized.includes('sesi 4') || normalized.includes('sesi-4') || normalized.includes('(4)')) {
    return SESSION_COLOR_CONFIG.sesi_4;
  }
  // Fallback: only use a standalone session number, never arbitrary digits from the time.
  const standaloneSession = normalized.match(/(?:^|\s|[-_])sesi\s*[-_]?(\d+)(?:\s|$)/i);
  if (standaloneSession) {
    const n = Number(standaloneSession[1]);
    if (n === 1) return SESSION_COLOR_CONFIG.sesi_1;
    if (n === 2) return SESSION_COLOR_CONFIG.sesi_2;
    if (n === 3) return SESSION_COLOR_CONFIG.sesi_3;
    if (n === 4) return SESSION_COLOR_CONFIG.sesi_4;
  }

  return {
    badge: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
    text: 'text-teal-400',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/30',
    dot: 'bg-teal-400',
  };
}

function normalizeProctorCode(code: unknown): string {
  return String(code ?? '').trim().toUpperCase();
}

function syncScheduleRows(
  rows: ExamScheduleRow[],
  rooms: string[],
  proctorCodes: ExamProctorCodeItem[]
): ExamScheduleRow[] {
  const cleanRooms = Array.from(
    new Set(rooms.map((room) => String(room ?? '').trim().toUpperCase()).filter(Boolean))
  );

  const nameByCode: Record<string, string> = {};
  proctorCodes.forEach((p) => {
    const code = normalizeProctorCode(p.code);
    if (code) nameByCode[code] = String(p.name ?? '').trim();
  });

  return rows.map((row) => {
    const normalizedDetails = Array.isArray(row.proctorDetails) ? row.proctorDetails : [];
    const existingCodes = { ...(row.roomCodes || {}) } as Record<string, string>;

    // Preserve legacy proctorDetails when roomCodes was not populated yet.
    normalizedDetails.forEach((detail) => {
      const room = String(detail.roomOrClass ?? '').trim().toUpperCase();
      const code = normalizeProctorCode(detail.proctorCode);
      if (room && code && existingCodes[room] == null) {
        existingCodes[room] = code;
      }
    });

    const normalizedRoomCodes: Record<string, string> = {};
    cleanRooms.forEach((room) => {
      const code = normalizeProctorCode(existingCodes[room]);
      normalizedRoomCodes[room] = code;
    });

    const details: ExamProctorAssignment[] = cleanRooms
      .map((room) => {
        const code = normalizedRoomCodes[room];
        if (!code || code === '—' || code === '-') return null;
        return {
          roomOrClass: room,
          proctorCode: code,
          proctorName: nameByCode[code] || `Guru Kode [${code}]`,
        };
      })
      .filter(Boolean) as ExamProctorAssignment[];

    return {
      ...row,
      roomCodes: normalizedRoomCodes,
      proctorDetails: details,
    };
  });
}

function getRowSessionNumber(session: string): number | null {
  const match = String(session ?? '').match(/(?:sesi|session)\s*[-_]?\s*(\d+)/i);
  return match ? Number(match[1]) : null;
}

export const ActiveExamScheduleModal: React.FC<ActiveExamScheduleModalProps> = ({
  isOpen,
  onClose,
  schedule,
  isAdmin = false,
  onSaveSchedule,
}) => {
  const baseSchedule: ActiveExamSchedule = schedule || DEFAULT_ACTIVE_EXAM_SCHEDULE;
  const [localScheduleOverride, setLocalScheduleOverride] = useState<ActiveExamSchedule | null>(null);
  const currentSchedule: ActiveExamSchedule = localScheduleOverride || baseSchedule;

  const [activeTab, setActiveTab] = useState<'jadwal' | 'rekap_pengawas'>('jadwal');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDayFilter, setSelectedDayFilter] = useState('all');
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);
  const [hoveredSpotlightCode, setHoveredSpotlightCode] = useState<string | null>(null);
  const [mobileLayoutMode, setMobileLayoutMode] = useState<'smart_grid' | 'table'>('smart_grid');
  const [forceMatrixView, setForceMatrixView] = useState(false);
  // Pop-up mini ringkasan jadwal guru yang diklik
  const [selectedTeacherPopup, setSelectedTeacherPopup] = useState<string | null>(null);

  // Unified spotlight state: either temporarily hovered or pinned by click/search
  const activeSpotlight = (hoveredSpotlightCode || highlightedCode || '').trim().toUpperCase() || null;

  const toggleSpotlight = (code: string) => {
    const clean = (code || '').trim().toUpperCase();
    if (!clean) return;
    setHighlightedCode((prev) => (prev === clean ? null : clean));
  };

  const handleTeacherCellClick = (code: string) => {
    const clean = (code || '').trim().toUpperCase();
    if (!clean || clean === '—' || clean === '-') return;
    setSelectedTeacherPopup(clean);
  };

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editTitle, setEditTitle] = useState(currentSchedule.examHeaderTitle || 'JADWAL ASESMEN SUMATIF');
  const [editYear, setEditYear] = useState(currentSchedule.schoolYear || 'TAHUN AJARAN 2025/2026');
  const [editPeriod, setEditPeriod] = useState(currentSchedule.period || 'Senin – Jumat, 22 – 26 September 2025');
  const [editDuration, setEditDuration] = useState(currentSchedule.duration || '90 Menit / Sesi Ujian');
  const [editNotes, setEditNotes] = useState(currentSchedule.notes || '');
  const [editRooms, setEditRooms] = useState<string[]>([]);
  const [editProctorCodes, setEditProctorCodes] = useState<ExamProctorCodeItem[]>([]);
  const [editRows, setEditRows] = useState<ExamScheduleRow[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [editDayFilter, setEditDayFilter] = useState('all');
  const [activeCellPicker, setActiveCellPicker] = useState<{ rowIndex: number; room: string } | null>(null);

  // Smart Swap Modal state
  const [smartSwapTarget, setSmartSwapTarget] = useState<{
    rowIndex: number;
    room: string;
    teacherCode: string;
  } | null>(null);

  // Excel Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<{
    schedule: ActiveExamSchedule;
    rowCount: number;
    proctorCount: number;
    warnings: string[];
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isParsingExcel, setIsParsingExcel] = useState(false);

  // Smart Generator Modal State
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateFirstDayHomeroom, setGenerateFirstDayHomeroom] = useState(true);
  const [generateAvoidSameRoomConsecutive, setGenerateAvoidSameRoomConsecutive] = useState(true);
  const [generateBalanceGradeRotation, setGenerateBalanceGradeRotation] = useState(true);
  const [generateResultSummary, setGenerateResultSummary] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const roomsList = useMemo(() => {
    return currentSchedule.rooms && currentSchedule.rooms.length > 0
      ? currentSchedule.rooms
      : DEFAULT_EXAM_ROOMS;
  }, [currentSchedule.rooms]);

  // Set of room names that mark the end of their respective grade group
  const gradeBoundaryRoomSet = useMemo(() => {
    const boundarySet = new Set<string>();
    for (let i = 0; i < roomsList.length; i++) {
      const currentRoom = roomsList[i];
      const nextRoom = roomsList[i + 1];
      if (!nextRoom) {
        boundarySet.add(currentRoom);
        continue;
      }
      // Extract numeric grade prefix or base key
      const currentGrade = currentRoom.match(/^\d+/)?.[0] || currentRoom.charAt(0);
      const nextGrade = nextRoom.match(/^\d+/)?.[0] || nextRoom.charAt(0);
      if (currentGrade !== nextGrade) {
        boundarySet.add(currentRoom);
      }
    }
    return boundarySet;
  }, [roomsList]);

  const proctorCodesList = useMemo(() => {
    return currentSchedule.proctorCodes && currentSchedule.proctorCodes.length > 0
      ? currentSchedule.proctorCodes
      : DEFAULT_PROCTOR_CODES;
  }, [currentSchedule.proctorCodes]);

  // Code to teacher map
  const codeToTeacherMap = useMemo(() => {
    const map: Record<string, ExamProctorCodeItem> = {};
    proctorCodesList.forEach((item) => {
      map[item.code.toUpperCase()] = item;
    });
    return map;
  }, [proctorCodesList]);

  // Clear the local snapshot whenever this modal is opened for a fresh schedule.
  // The override is only used to keep the UI responsive until the parent finishes
  // propagating a successful save/import.
  useEffect(() => {
    if (isOpen) {
      setLocalScheduleOverride(null);
    }
  }, [isOpen, schedule?.id]);

  // Sync edit state
  useEffect(() => {
    if (isOpen) {
      setEditTitle(currentSchedule.examHeaderTitle || 'JADWAL ASESMEN SUMATIF');
      setEditYear(currentSchedule.schoolYear || 'TAHUN AJARAN 2025/2026');
      setEditPeriod(currentSchedule.period || 'Senin – Jumat, 22 – 26 September 2025');
      setEditDuration(currentSchedule.duration || '90 Menit / Sesi Ujian');
      setEditNotes(currentSchedule.notes || '');
      setEditRooms(roomsList);
      setEditProctorCodes(JSON.parse(JSON.stringify(proctorCodesList)));
      setEditRows(JSON.parse(JSON.stringify(currentSchedule.rows || [])));
    }
  }, [isOpen, currentSchedule, roomsList, proctorCodesList]);

  // Unique days list
  const uniqueDays = useMemo(() => {
    const days = new Set<string>();
    (currentSchedule.rows || []).forEach((r) => {
      if (r.day) days.add(r.day);
    });
    return Array.from(days);
  }, [currentSchedule.rows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return (currentSchedule.rows || []).filter((row) => {
      // Filter by day
      if (selectedDayFilter !== 'all' && row.day !== selectedDayFilter) {
        return false;
      }

      // Filter by search query
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const subjectMatch = (row.subject || '').toLowerCase().includes(q);
      const dayMatch = (row.day || '').toLowerCase().includes(q);
      const sessionMatch = (row.session || '').toLowerCase().includes(q);
      const notesMatch = (row.notes || '').toLowerCase().includes(q);

      // Check room codes & assigned teachers
      let codeMatch = false;
      if (row.roomCodes) {
        Object.entries(row.roomCodes).forEach(([room, code]) => {
          if (code && code.toLowerCase() === q) codeMatch = true;
          if (room.toLowerCase().includes(q)) codeMatch = true;
          const teacher = codeToTeacherMap[code.toUpperCase()];
          if (teacher && teacher.name.toLowerCase().includes(q)) {
            codeMatch = true;
          }
        });
      }

      return subjectMatch || dayMatch || sessionMatch || notesMatch || codeMatch;
    });
  }, [currentSchedule.rows, selectedDayFilter, searchQuery, codeToTeacherMap]);

  // Proctor statistics calculation
  const proctorStats = useMemo(() => {
    const stats: Record<
      string,
      {
        code: string;
        name: string;
        subjectOrRole?: string;
        totalSessions: number;
        assignments: Array<{
          date?: string;
          day: string;
          session: string;
          subject: string;
          classes?: string;
          room: string;
          notes?: string;
        }>;
      }
    > = {};

    proctorCodesList.forEach((p) => {
      stats[p.code.toUpperCase()] = {
        code: p.code.toUpperCase(),
        name: p.name,
        subjectOrRole: p.subjectOrRole,
        totalSessions: 0,
        assignments: [],
      };
    });

    (currentSchedule.rows || []).forEach((row) => {
      if (row.roomCodes) {
        Object.entries(row.roomCodes).forEach(([room, code]) => {
          const upperCode = (code || '').trim().toUpperCase();
          if (upperCode && upperCode !== '—' && upperCode !== '-') {
            if (!stats[upperCode]) {
              stats[upperCode] = {
                code: upperCode,
                name: `Guru [${upperCode}]`,
                totalSessions: 0,
                assignments: [],
              };
            }
            stats[upperCode].totalSessions += 1;
            stats[upperCode].assignments.push({
              date: row.date || '',
              day: row.day,
              session: row.session,
              subject: row.subject,
              classes: row.classes,
              notes: row.notes,
              room: room,
            });
          }
        });
      }
    });

    return Object.values(stats).sort((a, b) => {
      // Sort by code alphabetically
      return a.code.localeCompare(b.code, undefined, { numeric: true });
    });
  }, [currentSchedule.rows, proctorCodesList]);

  // Filtered proctor statistics based on search query
  const filteredProctorStats = useMemo(() => {
    if (!searchQuery.trim()) return proctorStats;
    const q = searchQuery.toLowerCase().trim();

    return proctorStats.filter((p) => {
      const codeMatch = p.code.toLowerCase().includes(q);
      const nameMatch = p.name.toLowerCase().includes(q);
      const roleMatch = (p.subjectOrRole || '').toLowerCase().includes(q);
      
      // Match assignments (mapel, hari, ruang, sesi, tanggal)
      const assignmentMatch = p.assignments.some(
        (asg) =>
          asg.subject.toLowerCase().includes(q) ||
          asg.day.toLowerCase().includes(q) ||
          (asg.date || '').toLowerCase().includes(q) ||
          asg.room.toLowerCase().includes(q) ||
          asg.session.toLowerCase().includes(q)
      );

      return codeMatch || nameMatch || roleMatch || assignmentMatch;
    });
  }, [proctorStats, searchQuery]);

  // Matched individual duties based on teacher search query or highlighted teacher
  const matchedDuties = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q && !highlightedCode) return [];

    const duties: Array<{
      id: string;
      date: string;
      day: string;
      session: string;
      subject: string;
      classes?: string;
      room: string;
      teacherCode: string;
      teacherName: string;
      subjectOrRole?: string;
      notes?: string;
    }> = [];

    (currentSchedule.rows || []).forEach((row, rIdx) => {
      // Check day filter
      if (selectedDayFilter !== 'all' && row.day !== selectedDayFilter) {
        return;
      }

      if (row.roomCodes) {
        Object.entries(row.roomCodes).forEach(([room, code]) => {
          const upperCode = (code || '').trim().toUpperCase();
          if (!upperCode || upperCode === '—' || upperCode === '-') return;

          const teacher = codeToTeacherMap[upperCode];
          const teacherName = teacher?.name || `Guru [${upperCode}]`;
          const teacherRole = teacher?.subjectOrRole || '';

          if (highlightedCode) {
            if (upperCode === highlightedCode) {
              duties.push({
                id: `duty-${row.id || rIdx}-${room}`,
                date: row.date || '',
                day: row.day,
                session: row.session,
                subject: row.subject,
                classes: row.classes,
                room: room,
                teacherCode: upperCode,
                teacherName: teacherName,
                subjectOrRole: teacherRole,
                notes: row.notes,
              });
            }
            return;
          }

          // Check if this duty or teacher matches search query
          const codeMatch = upperCode.toLowerCase() === q || upperCode.toLowerCase().includes(q);
          const nameMatch = teacherName.toLowerCase().includes(q);
          const roleMatch = teacherRole.toLowerCase().includes(q);
          const subjectMatch = (row.subject || '').toLowerCase().includes(q);
          const dayMatch = (row.day || '').toLowerCase().includes(q);
          const dateMatch = (row.date || '').toLowerCase().includes(q);
          const sessionMatch = (row.session || '').toLowerCase().includes(q);
          const roomMatch = room.toLowerCase() === q || room.toLowerCase().includes(q) || `ruang ${room.toLowerCase()}`.includes(q);

          if (codeMatch || nameMatch || roleMatch || subjectMatch || dayMatch || dateMatch || sessionMatch || roomMatch) {
            duties.push({
              id: `duty-${row.id || rIdx}-${room}`,
              date: row.date || '',
              day: row.day,
              session: row.session,
              subject: row.subject,
              classes: row.classes,
              room: room,
              teacherCode: upperCode,
              teacherName: teacherName,
              subjectOrRole: teacherRole,
              notes: row.notes,
            });
          }
        });
      }
    });

    return duties;
  }, [currentSchedule.rows, searchQuery, highlightedCode, selectedDayFilter, codeToTeacherMap]);

  // Detected single teacher match for header display
  const singleMatchedTeacher = useMemo(() => {
    if (highlightedCode) {
      return proctorStats.find((p) => p.code === highlightedCode) || null;
    }
    if (searchQuery.trim() && filteredProctorStats.length === 1) {
      return filteredProctorStats[0];
    }
    return null;
  }, [highlightedCode, searchQuery, filteredProctorStats, proctorStats]);

  // Real-time Editor Teacher Loads & Conflicts
  const editTeacherLoads = useMemo(() => {
    return calculateTeacherLoads(editRows, editProctorCodes);
  }, [editRows, editProctorCodes]);

  const editConflicts = useMemo(() => {
    return detectScheduleConflicts(editRows);
  }, [editRows]);

  const editUniqueDays = useMemo(() => {
    const days = new Set<string>();
    editRows.forEach((r) => {
      if (r.day) days.add(r.day);
    });
    return Array.from(days);
  }, [editRows]);

  const filteredEditRowsWithIndex = useMemo(() => {
    return editRows
      .map((row, originalIndex) => ({ row, originalIndex }))
      .filter(({ row }) => {
        if (editDayFilter === 'all') return true;
        return row.day === editDayFilter;
      });
  }, [editRows, editDayFilter]);

  // Handle applying smart swap or substitution.
  // Always rebuild legacy proctorDetails so old consumers/exporters stay in sync.
  const handleApplySmartSwap = (rec: SwapRecommendation) => {
    if (!smartSwapTarget) return;

    const { rowIndex: srcRIdx, room: srcRoom } = smartSwapTarget;
    const updated = JSON.parse(JSON.stringify(editRows)) as ExamScheduleRow[];

    if (rec.type === 'swap' && rec.swapWith) {
      const { rowIndex: targetRIdx, room: targetRoom } = rec.swapWith;
      if (updated[srcRIdx] && updated[targetRIdx]) {
        if (!updated[srcRIdx].roomCodes) updated[srcRIdx].roomCodes = {};
        if (!updated[targetRIdx].roomCodes) updated[targetRIdx].roomCodes = {};

        const srcCode = normalizeProctorCode(updated[srcRIdx].roomCodes[srcRoom]);
        const targetCode = normalizeProctorCode(updated[targetRIdx].roomCodes[targetRoom]);

        updated[srcRIdx].roomCodes[srcRoom] = targetCode;
        updated[targetRIdx].roomCodes[targetRoom] = srcCode;
      }
    } else if (updated[srcRIdx]) {
      if (!updated[srcRIdx].roomCodes) updated[srcRIdx].roomCodes = {};
      updated[srcRIdx].roomCodes[srcRoom] = normalizeProctorCode(rec.targetTeacherCode);
    }

    setEditRows(syncScheduleRows(updated, editRooms, editProctorCodes));
    setSmartSwapTarget(null);
  };

  // Start editing
  const handleStartEdit = () => {
    setEditTitle(currentSchedule.examHeaderTitle || 'JADWAL ASESMEN SUMATIF');
    setEditYear(currentSchedule.schoolYear || 'TAHUN AJARAN 2025/2026');
    setEditPeriod(currentSchedule.period || 'Senin – Jumat, 22 – 26 September 2025');
    setEditDuration(currentSchedule.duration || '90 Menit / Sesi Ujian');
    setEditNotes(currentSchedule.notes || '');
    const startRooms = [...roomsList];
    const startProctors = JSON.parse(JSON.stringify(proctorCodesList)) as ExamProctorCodeItem[];
    const startRows = syncScheduleRows(
      JSON.parse(JSON.stringify(currentSchedule.rows || [])) as ExamScheduleRow[],
      startRooms,
      startProctors
    );
    setEditRooms(startRooms);
    setEditProctorCodes(startProctors);
    setEditRows(startRows);
    setIsEditing(true);
  };

  // Add a new session row. Continue the session sequence instead of blindly
  // toggling between Sesi 1 and Sesi 2.
  const handleAddRow = () => {
    const newRowId = `row-${Date.now().toString(36)}`;
    const lastRow = editRows.length > 0 ? editRows[editRows.length - 1] : null;
    const lastSessionNumber = lastRow ? getRowSessionNumber(lastRow.session) : null;
    const nextSessionNumber = lastSessionNumber && lastSessionNumber < 4 ? lastSessionNumber + 1 : 1;

    const sessionPresets: Record<number, string> = {
      1: '07.30 – 09.00 (Sesi 1)',
      2: '09.30 – 10.30 (Sesi 2)',
      3: '10.45 – 11.45 (Sesi 3)',
      4: '12.30 – 14.00 (Sesi 4)',
    };

    const newRow: ExamScheduleRow = {
      id: newRowId,
      day: lastRow ? lastRow.day : 'Senin',
      date: lastRow ? lastRow.date : '28/09/2026',
      session: sessionPresets[nextSessionNumber] || sessionPresets[1],
      subject: '',
      notes: '',
      roomCodes: editRooms.reduce((acc, rm) => ({ ...acc, [rm]: '' }), {} as Record<string, string>),
      proctorDetails: [],
    };
    setEditRows([...editRows, newRow]);
  };

  // Update a field in a row
  const handleUpdateRowField = (
    index: number,
    field: keyof ExamScheduleRow,
    value: any
  ) => {
    const updated = [...editRows];
    updated[index] = { ...updated[index], [field]: value };
    setEditRows(updated);
  };

  // Update room code in a row and keep the legacy detail array synchronized.
  const handleUpdateRoomCode = (
    rowIndex: number,
    room: string,
    codeValue: string
  ) => {
    const updated = [...editRows];
    const currentRow = updated[rowIndex];
    if (!currentRow) return;

    const updatedCodes = { ...(currentRow.roomCodes || {}) };
    updatedCodes[room] = normalizeProctorCode(codeValue);
    currentRow.roomCodes = updatedCodes;

    updated[rowIndex] = syncScheduleRows([currentRow], editRooms, editProctorCodes)[0];
    setEditRows(updated);
  };

  // Delete row
  const handleDeleteRow = (index: number) => {
    setEditRows(editRows.filter((_, i) => i !== index));
  };

  // Add proctor code item
  const handleAddProctorCode = () => {
    // Generate next alphabet letter if possible
    const existingCodes = editProctorCodes.map((p) => p.code.toUpperCase());
    let nextLetter = 'A';
    for (let i = 65; i <= 90; i++) {
      const char = String.fromCharCode(i);
      if (!existingCodes.includes(char)) {
        nextLetter = char;
        break;
      }
    }
    setEditProctorCodes([
      ...editProctorCodes,
      {
        code: nextLetter,
        name: '',
        subjectOrRole: '',
      },
    ]);
  };

  // Update proctor code item. If a code is renamed, migrate all existing
  // room assignments to the new code so the schedule never points to a stale code.
  const handleUpdateProctorCode = (
    index: number,
    field: keyof ExamProctorCodeItem,
    value: string
  ) => {
    const previous = editProctorCodes[index];
    const previousCode = normalizeProctorCode(previous?.code);
    const nextValue = field === 'code' ? normalizeProctorCode(value) : value;
    const updated = [...editProctorCodes];
    updated[index] = {
      ...updated[index],
      [field]: nextValue,
    };
    setEditProctorCodes(updated);

    if (field === 'code' && previousCode && nextValue && previousCode !== nextValue) {
      setEditRows((currentRows) =>
        syncScheduleRows(
          currentRows.map((row) => {
            const roomCodes = { ...(row.roomCodes || {}) };
            Object.keys(roomCodes).forEach((room) => {
              if (normalizeProctorCode(roomCodes[room]) === previousCode) {
                roomCodes[room] = nextValue;
              }
            });
            return { ...row, roomCodes };
          }),
          editRooms,
          updated
        )
      );
    }
  };

  // Delete proctor code item
  const handleDeleteProctorCode = (index: number) => {
    setEditProctorCodes(editProctorCodes.filter((_, i) => i !== index));
  };

  // Add new room column and initialize that room in every existing row.
  const handleAddRoom = () => {
    const cleanRoom = newRoomName.trim().toUpperCase();
    if (!cleanRoom) return;
    if (editRooms.includes(cleanRoom)) {
      alert(`Ruang ${cleanRoom} sudah ada dalam daftar.`);
      return;
    }

    const nextRooms = [...editRooms, cleanRoom];
    setEditRooms(nextRooms);
    setEditRows(syncScheduleRows(editRows, nextRooms, editProctorCodes));
    setNewRoomName('');
  };

  // Remove a room column and remove all assignments belonging to that room.
  const handleRemoveRoom = (roomName: string) => {
    if (editRooms.length <= 1) {
      alert('Minimal harus ada 1 ruang kelas.');
      return;
    }

    const nextRooms = editRooms.filter((r) => r !== roomName);
    setEditRooms(nextRooms);
    setEditRows(syncScheduleRows(editRows, nextRooms, editProctorCodes));

    if (activeCellPicker?.room === roomName) {
      setActiveCellPicker(null);
    }
  };

  // Save changes with structural validation and a normalized single snapshot.
  const handleSave = async () => {
    const normalizedProctors = editProctorCodes
      .map((p) => ({
        ...p,
        code: normalizeProctorCode(p.code),
        name: String(p.name ?? '').trim(),
        subjectOrRole: String(p.subjectOrRole ?? '').trim(),
      }))
      .filter((p) => p.code && p.name);

    const seenCodes = new Set<string>();
    const duplicateCodes = new Set<string>();
    normalizedProctors.forEach((p) => {
      if (seenCodes.has(p.code)) duplicateCodes.add(p.code);
      seenCodes.add(p.code);
    });

    if (duplicateCodes.size > 0) {
      alert(`Kode guru duplikat: ${Array.from(duplicateCodes).join(', ')}. Setiap kode harus unik.`);
      return;
    }

    const normalizedRooms = Array.from(
      new Set(editRooms.map((r) => r.trim().toUpperCase()).filter(Boolean))
    );
    if (normalizedRooms.length === 0) {
      alert('Minimal harus ada 1 ruang kelas.');
      return;
    }

    const normalizedRows = syncScheduleRows(
      editRows,
      normalizedRooms,
      normalizedProctors
    );

    const updatedSchedule: ActiveExamSchedule = {
      id: currentSchedule.id || 'active-exam-schedule',
      examHeaderTitle: editTitle.trim() || 'JADWAL ASESMEN SUMATIF',
      schoolYear: editYear.trim() || 'TAHUN AJARAN 2025/2026',
      period: editPeriod.trim(),
      duration: editDuration.trim(),
      notes: editNotes.trim(),
      rooms: normalizedRooms,
      proctorCodes: normalizedProctors,
      rows: normalizedRows,
    };

    setEditRooms(normalizedRooms);
    setEditProctorCodes(JSON.parse(JSON.stringify(normalizedProctors)));
    setEditRows(JSON.parse(JSON.stringify(normalizedRows)));

    setIsSaving(true);
    try {
      if (onSaveSchedule) {
        await onSaveSchedule(updatedSchedule);
      }
      setLocalScheduleOverride(JSON.parse(JSON.stringify(updatedSchedule)));
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving schedule:', err);
      alert('Gagal menyimpan jadwal. Silakan coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset / Clear schedule
  const handleResetSchedule = () => {
    if (
      window.confirm(
        'Apakah Anda yakin ingin mengosongkan seluruh baris sesi ujian untuk memulai jadwal baru?'
      )
    ) {
      setEditRows([]);
    }
  };

  // Restore default format
  const handleRestoreDefault = () => {
    if (
      window.confirm(
        'Kembalikan struktur jadwal dan kode pengawas ke format standar SDIT AL FIKRI?'
      )
    ) {
      setEditTitle(DEFAULT_ACTIVE_EXAM_SCHEDULE.examHeaderTitle);
      setEditYear(DEFAULT_ACTIVE_EXAM_SCHEDULE.schoolYear);
      setEditPeriod(DEFAULT_ACTIVE_EXAM_SCHEDULE.period);
      setEditDuration(DEFAULT_ACTIVE_EXAM_SCHEDULE.duration);
      setEditNotes(DEFAULT_ACTIVE_EXAM_SCHEDULE.notes || '');
      setEditRooms(DEFAULT_EXAM_ROOMS);
      const defaultProctors = JSON.parse(JSON.stringify(DEFAULT_PROCTOR_CODES)) as ExamProctorCodeItem[];
      setEditProctorCodes(defaultProctors);
      setEditRows(syncScheduleRows(
        JSON.parse(JSON.stringify(DEFAULT_ACTIVE_EXAM_SCHEDULE.rows)) as ExamScheduleRow[],
        DEFAULT_EXAM_ROOMS,
        defaultProctors
      ));
    }
  };

  // Handle Excel File Selected
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportError(null);
    setIsParsingExcel(true);

    try {
      const result = await parseExamScheduleExcel(file, currentSchedule);
      setImportPreview(result);
    } catch (err: any) {
      console.error('Error parsing excel:', err);
      setImportError(err.message || 'Gagal membaca file Excel. Pastikan format sesuai template.');
      setImportPreview(null);
    } finally {
      setIsParsingExcel(false);
    }
  };

  // Apply imported Excel schedule as a complete replacement snapshot.
  const handleApplyImport = async () => {
    if (!importPreview) return;

    const imported = importPreview.schedule;
    const importedRooms = Array.from(
      new Set(
        (imported.rooms && imported.rooms.length > 0 ? imported.rooms : editRooms)
          .map((r) => String(r ?? '').trim().toUpperCase())
          .filter(Boolean)
      )
    );
    const importedProctors = (imported.proctorCodes || []).map((p) => ({
      ...p,
      code: normalizeProctorCode(p.code),
      name: String(p.name ?? '').trim(),
      subjectOrRole: String(p.subjectOrRole ?? '').trim(),
    }));
    const importedRows = syncScheduleRows(
      JSON.parse(JSON.stringify(imported.rows || [])) as ExamScheduleRow[],
      importedRooms,
      importedProctors
    );

    const normalizedImportedSchedule: ActiveExamSchedule = {
      ...imported,
      rooms: importedRooms,
      proctorCodes: importedProctors.filter((p) => p.code && p.name),
      rows: importedRows,
    };

    setIsSaving(true);
    try {
      if (onSaveSchedule) {
        await onSaveSchedule(normalizedImportedSchedule);
      }

      // Update both the local editor snapshot and the view snapshot. Empty arrays
      // are intentionally applied too: an import must be a full replacement.
      setLocalScheduleOverride(JSON.parse(JSON.stringify(normalizedImportedSchedule)));
      setEditTitle(normalizedImportedSchedule.examHeaderTitle || 'JADWAL ASESMEN SUMATIF');
      setEditYear(normalizedImportedSchedule.schoolYear || 'TAHUN AJARAN 2025/2026');
      setEditPeriod(normalizedImportedSchedule.period || '22 – 26 September 2025');
      setEditDuration(normalizedImportedSchedule.duration || '90 Menit / Sesi Ujian');
      setEditNotes(normalizedImportedSchedule.notes || '');
      setEditRooms([...importedRooms]);
      setEditProctorCodes(JSON.parse(JSON.stringify(normalizedImportedSchedule.proctorCodes || [])));
      setEditRows(JSON.parse(JSON.stringify(importedRows)));

      setShowImportModal(false);
      setImportFile(null);
      setImportPreview(null);
    } catch (err) {
      console.error('Error applying imported schedule:', err);
      alert('Gagal menerapkan jadwal yang diimport. Silakan coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  // Run Smart Exam Schedule Generator.
  // The existing generator remains responsible for its original randomization;
  // the two additional UI switches are applied immediately afterwards.
  const handleExecuteSmartGenerator = () => {
    try {
      const tempSchedule: ActiveExamSchedule = {
        id: schedule?.id || currentSchedule.id || 'active-exam-schedule-default',
        examHeaderTitle: editTitle,
        schoolYear: editYear,
        period: editPeriod,
        duration: editDuration,
        notes: editNotes,
        rooms: editRooms,
        proctorCodes: editProctorCodes,
        rows: syncScheduleRows(editRows, editRooms, editProctorCodes),
      };

      const homeroomMap: Record<string, string> = {};
      editProctorCodes.forEach((p) => {
        if (p.subjectOrRole && /wali/i.test(p.subjectOrRole)) {
          const matches: string[] = p.subjectOrRole.match(/(?:kelas\s*)?([1-6][A-Z])/gi) || [];
          matches.forEach((value: string) => {
            const match = value.match(/([1-6][A-Z])/i);
            if (match?.[1]) homeroomMap[match[1].toUpperCase()] = normalizeProctorCode(p.code);
          });
        }
      });

      const generatorOptions: AutoGenerateOptions = {
        homeroomMap,
        enforceHomeroomDay1: generateFirstDayHomeroom,
        avoidSameRoomConsecutive: generateAvoidSameRoomConsecutive,
        balanceGradeRotation: generateBalanceGradeRotation,
      };

      const generated = generateSmartExamSchedule(tempSchedule, generatorOptions);
      const normalizedRows = syncScheduleRows(generated.updatedRows, editRooms, editProctorCodes);

      setEditRows(normalizedRows);
      setShowGenerateModal(false);
      setGenerateResultSummary(generated.validation.summaryMessage);
    } catch (err: any) {
      console.error('Error generating smart schedule:', err);
      alert(
        `Gagal generate jadwal: ${
          err.message || 'Terjadi kesalahan saat pengacakan jadwal'
        }`
      );
    }
  };

  // Print schedule or export download
  const handlePrint = () => {
    printOrDownloadExamScheduleDoc(currentSchedule);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-[#12151F] border border-[#2B3349] rounded-2xl sm:rounded-[24px] shadow-2xl max-w-6xl w-full max-h-[94vh] flex flex-col text-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 print:border-none print:shadow-none print:max-w-none print:w-full print:max-h-none print:bg-white print:text-black">
        
        {/* ======================================================
            HEADER MODAL (NON-PRINT) - ULTRA-COMPACT ON MOBILE
            ====================================================== */}
        <div className="p-3 sm:p-5 border-b border-[#252C3F] flex items-center justify-between gap-2.5 bg-[#161A26] print:hidden">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0 shadow-sm">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm sm:text-lg font-bold text-white font-heading truncate">
                  Jadwal Asesmen
                </h3>
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[9px] sm:text-[10px] font-bold text-emerald-300">
                  SDIT AL FIKRI
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 hidden sm:block">
                Jadwal sesi asesmen, mata pelajaran, dan kode guru pengawas per ruang.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Download Template Excel (Export) */}
            <button
              type="button"
              onClick={() => exportScheduleToExcel(currentSchedule)}
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Unduh & Simpan Jadwal ke File Excel (.xlsx) untuk digunakan kembali"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>

            {/* Import Excel Button (Admin) */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(true);
                  setImportError(null);
                  setImportPreview(null);
                  setImportFile(null);
                }}
                className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                title="Import Jadwal & Kode Pengawas dari Excel"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Import</span>
              </button>
            )}

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Cetak Jadwal Ujian"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cetak</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ======================================================
            SUB-HEADER: VIEW SWITCHER & FILTER (NON-PRINT) - ULTRA-COMPACT
            ====================================================== */}
        {!isEditing && (
          <div className="p-2 sm:px-5 sm:py-2.5 border-b border-[#252C3F] bg-[#141722] space-y-2 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 print:hidden">
            {/* Top row in sub-header: Tab switcher & Mobile View Toggle */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 bg-[#0F121A] p-0.5 sm:p-1 rounded-xl border border-[#232839]">
                <button
                  type="button"
                  onClick={() => setActiveTab('jadwal')}
                  className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'jadwal'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Matriks Jadwal</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('rekap_pengawas')}
                  className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'rekap_pengawas'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    Rekap Guru ({searchQuery.trim() ? `${filteredProctorStats.length}/` : ''}{proctorStats.length})
                  </span>
                </button>
              </div>

              {/* Mobile View Switcher (Smart Grid vs Table) */}
              {activeTab === 'jadwal' && (
                <div className="flex md:hidden items-center bg-[#0F121A] p-0.5 rounded-lg border border-[#232839]">
                  <button
                    type="button"
                    onClick={() => setMobileLayoutMode('smart_grid')}
                    className={`p-1.5 rounded-md text-xs font-bold transition-all ${
                      mobileLayoutMode === 'smart_grid'
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Tampilan Smart Grid (Bebas Geser)"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileLayoutMode('table')}
                    className={`p-1.5 rounded-md text-xs font-bold transition-all ${
                      mobileLayoutMode === 'table'
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Tampilan Tabel Matriks Penuh"
                  >
                    <Table2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Bottom/Right row in sub-header: Day filter & Search input */}
            <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-between sm:justify-end">
              {/* Day filter chips - Horizontal scrollable */}
              {activeTab === 'jadwal' && (
                <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar max-w-[calc(100vw-190px)] sm:max-w-none">
                  <button
                    type="button"
                    onClick={() => setSelectedDayFilter('all')}
                    className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                      selectedDayFilter === 'all'
                        ? 'bg-slate-700 text-white border border-slate-600'
                        : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    Semua
                  </button>
                  {uniqueDays.map((day) => {
                    const dayCfg = getDayConfig(day);
                    const isSelected = selectedDayFilter === day;
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setSelectedDayFilter(day)}
                        className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                          isSelected
                            ? `${dayCfg.badge} shadow-sm font-extrabold`
                            : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Search input */}
              <div className="relative min-w-[130px] sm:min-w-[190px] flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari guru/mapel..."
                  className="w-full bg-[#0F121A] border border-[#2B3349] rounded-xl pl-8 pr-7 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================
            BODY MODAL: CONTENT VIEW OR EDIT MODE
            ====================================================== */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 print:p-0 print:overflow-visible">
          
          {/* ----------------------------------------------------
              KOP & BANNER JADWAL - RESPONSIVE & COMPACT ON MOBILE
              ---------------------------------------------------- */}
          <div className="bg-gradient-to-r from-[#181D2C] via-[#141824] to-[#181D2C] border border-[#2B3349] rounded-xl sm:rounded-2xl p-3 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 shadow-md print:bg-none print:border-b-2 print:border-black print:rounded-none print:p-2 print:mb-4 print:text-black">
            <div className="space-y-0.5 sm:space-y-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider print:border-black print:text-black">
                  SDIT AL FIKRI
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-slate-400 print:text-black">
                  {currentSchedule.schoolYear || 'TAHUN AJARAN 2025/2026'}
                </span>
              </div>
              <h2 className="text-sm sm:text-lg font-black text-white uppercase tracking-wide font-heading print:text-black">
                {currentSchedule.examHeaderTitle || 'JADWAL ASESMEN SUMATIF'}
              </h2>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 text-[11px] sm:text-xs text-slate-300 pt-0.5 print:text-black">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 print:text-black" />
                  <span>{currentSchedule.period || '22 – 26 September 2025'}</span>
                </div>
                <span className="text-slate-600 print:hidden">•</span>
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <Clock3 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 print:text-black" />
                  <span>{currentSchedule.duration || '90 Menit / Sesi'}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons for Admin in normal view */}
            {!isEditing && isAdmin && (
              <div className="flex items-center justify-center sm:justify-end gap-2 print:hidden pt-1 sm:pt-0">
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>Atur Jadwal & Kode</span>
                </button>
              </div>
            )}
          </div>

          {/* ====================================================
              MODE EDIT JADWAL (ADMIN)
              ==================================================== */}
          {isEditing ? (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Box 1: Edit Header Metadata */}
              <div className="bg-[#151926] border border-[#2E374E] rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#252C3F] pb-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-emerald-400" />
                    <span>Konfigurasi Header & Ketentuan Ujian</span>
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRestoreDefault}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Format Standar</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetSchedule}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Kosongkan Sesi</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Judul / Header Ujian
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Contoh: JADWAL ASESMEN SUMATIF TENGAH SEMESTER (STS) GANJIL"
                      className="w-full bg-[#0F121A] border border-[#30384D] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Tahun Ajaran
                    </label>
                    <input
                      type="text"
                      value={editYear}
                      onChange={(e) => setEditYear(e.target.value)}
                      placeholder="Contoh: TAHUN AJARAN 2025/2026"
                      className="w-full bg-[#0F121A] border border-[#30384D] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Periode Pelaksanaan
                    </label>
                    <input
                      type="text"
                      value={editPeriod}
                      onChange={(e) => setEditPeriod(e.target.value)}
                      placeholder="Contoh: 22 – 26 September 2025"
                      className="w-full bg-[#0F121A] border border-[#30384D] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Durasi / Waktu
                    </label>
                    <input
                      type="text"
                      value={editDuration}
                      onChange={(e) => setEditDuration(e.target.value)}
                      placeholder="Contoh: 90 Menit / Sesi Ujian"
                      className="w-full bg-[#0F121A] border border-[#30384D] rounded-xl px-3 py-1.5 text-xs text-emerald-300 focus:outline-none focus:border-emerald-400 font-medium"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Catatan / Tata Tertib
                    </label>
                    <input
                      type="text"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Catatan untuk pengawas dan peserta didik..."
                      className="w-full bg-[#0F121A] border border-[#30384D] rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                {/* Manage Room Columns */}
                <div className="pt-2 border-t border-[#252C3F]">
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                    Daftar Kolom Ruang Kelas ({editRooms.length} Ruang)
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {editRooms.map((rm) => (
                      <span
                        key={rm}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0F121A] border border-[#30384D] text-xs font-bold text-emerald-400"
                      >
                        <span>{rm}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRoom(rm)}
                          className="text-slate-500 hover:text-rose-400 cursor-pointer ml-0.5"
                          title={`Hapus kolom ${rm}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        placeholder="+ Ruang (misal 2C)"
                        className="w-24 bg-[#0F121A] border border-[#30384D] rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                      />
                      <button
                        type="button"
                        onClick={handleAddRoom}
                        className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Tambah
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Box 2: Edit Proctor Code Legend */}
              <div className="bg-[#151926] border border-[#2E374E] rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-[#252C3F] pb-2.5">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-400" />
                      <span>Daftar Kode & Nama Guru Pengawas ({editProctorCodes.length})</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Tentukan kode huruf (A, B, C...) untuk masing-masing guru pengawas.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddProctorCode}
                    className="px-3 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Guru</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[280px] overflow-y-auto pr-1">
                  {editProctorCodes.map((p, pIdx) => {
                    const colorCfg = getProctorCodeColor(p.code);
                    return (
                      <div
                        key={pIdx}
                        className="bg-[#0F121A] border border-[#282F42] hover:border-slate-600 rounded-xl p-2.5 flex items-center gap-2 transition-all shadow-xs"
                      >
                        <input
                          type="text"
                          value={p.code}
                          onChange={(e) => handleUpdateProctorCode(pIdx, 'code', e.target.value)}
                          placeholder="Kode"
                          className={`w-12 text-center font-black text-xs rounded-lg py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400 ${colorCfg.badge} border shadow-xs`}
                          maxLength={4}
                          title="Kode Guru (misal: A, B, C...)"
                        />
                        <div className="flex-1">
                          <input
                            type="text"
                            value={p.name}
                            onChange={(e) => handleUpdateProctorCode(pIdx, 'name', e.target.value)}
                            placeholder="Nama Lengkap Guru"
                            className="w-full bg-[#181C28] border border-[#30384D] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400 font-medium"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteProctorCode(pIdx)}
                          className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                          title="Hapus Guru"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Box 3: Edit Schedule Rows & Room Codes Matrix */}
              <div className="bg-[#151926] border border-[#2E374E] rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[#252C3F] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Clock3 className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-sm font-bold text-white">
                        Matriks Sesi Ujian & Kode Pengawas ({editRows.length} Sesi)
                      </h4>
                      {editConflicts.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black animate-pulse flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {editConflicts.length} Bentrok Terdeteksi
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Kolom disusun rapi: <strong className="text-emerald-400">HARI & TANGGAL</strong>, <strong className="text-emerald-400">WAKTU/SESI</strong>, dan <strong className="text-emerald-400">MAPEL</strong>. Sel kosong otomatis nonaktif.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setShowImportModal(true)}
                      className="px-3 py-1.5 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/35 text-sky-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                      title="Import Jadwal & Daftar Kode Guru dari file Excel (.xlsx)"
                    >
                      <Upload className="w-3.5 h-3.5 text-sky-400" />
                      <span>Import Excel</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowGenerateModal(true)}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                      title="Otomatis acak pengawas: Hari ke-1 Wali Kelas, hari berikutnya distribusi merata"
                    >
                      <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Generate Acak</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddRow}
                      className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Sesi</span>
                    </button>
                  </div>
                </div>

                {/* Conflict Alert Warning Banner if any */}
                {editConflicts.length > 0 && (
                  <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-200 text-xs space-y-1">
                    <div className="flex items-center gap-2 font-bold text-rose-300">
                      <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      <span>Peringatan Bentrok Pengawas:</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px]">
                      {editConflicts.slice(0, 4).map((c, cIdx) => (
                        <div key={cIdx} className="bg-rose-950/40 p-2 rounded-lg border border-rose-500/20 flex items-center justify-between">
                          <span>
                            <strong>{c.day} ({c.session})</strong>: Guru <strong>[{c.teacherCode}]</strong> ngawas di 2 ruang ({c.rooms.join(', ')}).
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSmartSwapTarget({
                                rowIndex: c.rowIndex,
                                room: c.rooms[1] || c.rooms[0],
                                teacherCode: c.teacherCode,
                              });
                            }}
                            className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold cursor-pointer ml-2 flex-shrink-0"
                          >
                            Cari Solusi
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Real-time Teacher Load Bar & Interactive Spotlight */}
                <div className="bg-[#0F121A] border border-[#232839] rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-2 uppercase tracking-wider">
                      <Users className="w-4 h-4 text-emerald-400" />
                      <span>Monitor Beban & Sorot Guru ({editTeacherLoads.length} Guru)</span>
                    </span>
                    <div className="flex items-center gap-3">
                      {activeSpotlight && (
                        <button
                          type="button"
                          onClick={() => {
                            setHighlightedCode(null);
                            setHoveredSpotlightCode(null);
                          }}
                          className="text-xs text-amber-300 hover:text-white bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 rounded-lg flex items-center gap-1.5 cursor-pointer font-bold transition-all shadow-xs"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reset Sorotan [{activeSpotlight}]</span>
                        </button>
                      )}
                      <span className="text-xs text-slate-400">
                        Target Rata-rata: <strong className="text-emerald-400">{editTeacherLoads.length > 0 ? (editTeacherLoads.reduce((a,b)=>a+b.totalSessions,0) / editTeacherLoads.length).toFixed(1) : 0}</strong> sesi
                      </span>
                    </div>
                  </div>

                  {/* Grid 2-3 Baris Guru di Mode Editor */}
                  <div className="grid grid-cols-4 sm:grid-cols-7 md:grid-cols-10 lg:grid-cols-12 gap-1.5">
                    {editTeacherLoads.map((t) => {
                      const isSelected = activeSpotlight === t.code;
                      const teacherColor = getProctorCodeColor(t.code);
                      return (
                        <button
                          key={t.code}
                          type="button"
                          onClick={() => toggleSpotlight(t.code)}
                          onMouseEnter={() => setHoveredSpotlightCode(t.code)}
                          onMouseLeave={() => setHoveredSpotlightCode(null)}
                          className={`px-2 py-1.5 rounded-xl border text-xs flex items-center justify-between gap-1.5 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-black shadow-md scale-105 ring-2 ring-emerald-400/50 z-10'
                              : t.totalSessions === 0
                              ? 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-600'
                              : 'bg-[#151926] border-[#2A3449] text-slate-200 hover:border-emerald-400/80 hover:bg-[#1C2232] font-medium'
                          }`}
                          title={`${t.name} [${t.code}]: ${t.totalSessions} Sesi - Klik/hover untuk menyorot`}
                        >
                          <span className={`w-5 h-5 rounded-lg text-[11px] flex items-center justify-center font-black ${
                            isSelected ? 'bg-slate-950 text-white' : `${teacherColor.badge} border`
                          }`}>
                            {t.code}
                          </span>
                          <span className={`text-[10px] px-1 rounded font-mono font-bold ${
                            isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-black/40 text-slate-300'
                          }`}>
                            {t.totalSessions}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Day Navigation & Quick Filter in Editor */}
                <div className="flex items-center justify-between gap-2 flex-wrap bg-[#111420] p-2 rounded-xl border border-[#232839]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                      Tampilkan:
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditDayFilter('all')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        editDayFilter === 'all'
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'bg-[#181D2B] text-slate-400 hover:text-white border border-[#2B3448]'
                      }`}
                    >
                      Semua Hari ({editRows.length} Sesi)
                    </button>
                    {editUniqueDays.map((d) => {
                      const dayCount = editRows.filter((r) => r.day === d).length;
                      const dayCfg = getDayConfig(d);
                      const isSel = editDayFilter === d;

                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setEditDayFilter(d)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                            isSel
                              ? `${dayCfg.headerBg} border-emerald-500 text-white shadow-xs`
                              : 'bg-[#181D2B] text-slate-400 hover:text-white border-[#2B3448]'
                          }`}
                        >
                          {d} ({dayCount})
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Menampilkan {filteredEditRowsWithIndex.length} dari {editRows.length} sesi
                  </span>
                </div>

                {generateResultSummary && (
                  <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>{generateResultSummary}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGenerateResultSummary(null)}
                      className="text-emerald-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Matrix Rows Editor: Unified Ultra-Compact Table Layout matching the main schedule */}
                <div className="border border-[#282F42] rounded-2xl overflow-hidden bg-[#10131D] shadow-md">
                  <div className="overflow-x-auto max-h-[620px]">
                    <table className="w-full text-left text-xs border-collapse table-auto sm:table-fixed">
                      <thead className="sticky top-0 z-30 bg-[#161B28] shadow-sm">
                        <tr className="border-b border-[#282F42] text-slate-300 text-[10px] font-bold uppercase tracking-wider">
                          <th className="py-2.5 px-2.5 w-[130px] sm:w-[145px] bg-[#161B28]">
                            HARI & TANGGAL
                          </th>
                          <th className="py-2.5 px-2 w-[125px] sm:w-[135px] bg-[#161B28]">
                            WAKTU/SESI
                          </th>
                          <th className="py-2.5 px-2.5 w-[140px] sm:w-[170px] bg-[#161B28] border-r-2 border-r-[#2B3349]">
                            MAPEL
                          </th>
                          {editRooms.map((rm) => (
                            <th
                              key={rm}
                              className="py-2.5 px-0.5 text-center min-w-[36px] sm:min-w-[40px] bg-[#141824] text-emerald-300 font-black border-r border-[#22283A] last:border-r-0"
                            >
                              <div className="flex items-center justify-center">
                                <span className="text-[11px] font-bold">R.{rm}</span>
                              </div>
                            </th>
                          ))}
                          <th className="py-2.5 px-1.5 text-center w-8 bg-[#161B28]">
                            Aksi
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1D2232]">
                        {filteredEditRowsWithIndex.length > 0 ? (
                          filteredEditRowsWithIndex.map(({ row, originalIndex: rIdx }) => {
                            const dayCfg = getDayConfig(row.day);
                            const sesCfg = getSessionConfig(row.session);

                            // Teacher codes busy in this specific row
                            const busyTeachersInThisRow = new Set(
                              Object.values(row.roomCodes || {})
                                .map((c) => (c || '').trim().toUpperCase())
                                .filter((c) => Boolean(c && c !== '—' && c !== '-'))
                            );

                            return (
                              <tr
                                key={row.id || rIdx}
                                className={`transition-colors ${dayCfg.border} hover:bg-[#151928]`}
                              >
                                {/* Kolom Kiri 1: HARI & TANGGAL (Baris 1: Hari, Baris 2: Tanggal e.g. 28/09/2026) */}
                                <td className="py-2 px-2.5 align-middle min-w-0">
                                  <div className="flex w-full min-w-0 flex-col gap-1.5">
                                    <input
                                      type="text"
                                      value={row.day}
                                      onChange={(e) => handleUpdateRowField(rIdx, 'day', e.target.value)}
                                      placeholder="Hari (e.g. Senin)"
                                      className={`block w-full min-w-0 max-w-full box-border px-2 py-1 rounded-lg text-xs font-black border ${dayCfg.badge} bg-black/40 focus:outline-none focus:border-emerald-400`}
                                    />
                                    <input
                                      type="text"
                                      value={row.date || ''}
                                      onChange={(e) => handleUpdateRowField(rIdx, 'date', e.target.value)}
                                      placeholder="28/09/2026"
                                      title="Tanggal pelaksanaan"
                                      className="block w-full min-w-0 max-w-full box-border bg-[#161925] border border-[#2B3347] rounded-lg px-2 py-1 text-[11px] text-slate-200 font-mono font-medium focus:outline-none focus:border-emerald-400 truncate"
                                    />
                                  </div>
                                </td>

                                {/* Kolom Kiri 2: WAKTU/SESI (Baris 1: Waktu 07:30-09:00 / 09:30-10:30, Baris 2: Sesi 1 / Sesi 2) */}
                                <td className="py-2 px-2 align-middle min-w-0">
                                  {(() => {
                                    const parsed = splitSessionTimeAndLabel(row.session);
                                    const isSesi2 = (parsed.session || row.session || '').toLowerCase().includes('2');
                                    const defaultTime = isSesi2 ? '09:30 – 10:30' : '07:30 – 09:00';
                                    const defaultLabel = isSesi2 ? 'Sesi 2' : 'Sesi 1';

                                    return (
                                      <div className="flex w-full min-w-0 flex-col gap-1.5">
                                        <input
                                          type="text"
                                          value={parsed.time || row.session || defaultTime}
                                          onChange={(e) => {
                                            const newTime = e.target.value;
                                            const sessionLabel = parsed.session || defaultLabel;
                                            handleUpdateRowField(rIdx, 'session', `${newTime} (${sessionLabel})`);
                                          }}
                                          placeholder={defaultTime}
                                          title="Waktu Pelaksanaan (Jam)"
                                          className={`block w-full min-w-0 max-w-full box-border font-mono text-[11px] font-bold px-2 py-1 rounded-lg border ${sesCfg.badge} bg-black/40 focus:outline-none focus:border-emerald-400 truncate`}
                                        />
                                        <input
                                          type="text"
                                          value={parsed.session || defaultLabel}
                                          onChange={(e) => {
                                            const newSess = e.target.value;
                                            const timePart = parsed.time || defaultTime;
                                            handleUpdateRowField(rIdx, 'session', newSess ? `${timePart} (${newSess})` : timePart);
                                          }}
                                          placeholder={defaultLabel}
                                          title="Label Sesi"
                                          className="block w-full min-w-0 max-w-full box-border bg-[#141724] border border-[#2A3348] rounded-lg px-2 py-1 text-[10px] text-sky-300 font-semibold focus:outline-none focus:border-sky-400 truncate"
                                        />
                                      </div>
                                    );
                                  })()}
                                </td>

                                {/* Kolom Kiri 3: MAPEL (Hanya Nama Mata Pelajaran tanpa Kelas) */}
                                <td className="py-2 px-2.5 align-middle border-r-2 border-r-[#2B3349]">
                                  <input
                                    type="text"
                                    value={row.subject}
                                    onChange={(e) => handleUpdateRowField(rIdx, 'subject', e.target.value)}
                                    placeholder="Nama Mata Pelajaran"
                                    className="w-full bg-[#181D2B] border border-[#30384D] rounded-lg px-2.5 py-2 text-xs text-white font-bold focus:outline-none focus:border-emerald-400 truncate"
                                  />
                                </td>

                                {/* Kolom Kanan: Grid Sel Kode Guru Pengawas per Ruang */}
                                {editRooms.map((rm) => {
                                  const codeVal = (row.roomCodes?.[rm] || '').trim().toUpperCase();
                                  const teacher = codeToTeacherMap[codeVal];
                                  const isPickerOpen =
                                    activeCellPicker?.rowIndex === rIdx && activeCellPicker?.room === rm;

                                  // Conflict check in this row
                                  const sameCodeCount = Object.values(row.roomCodes || {}).filter(
                                    (c) => (c || '').trim().toUpperCase() === codeVal && codeVal !== '' && codeVal !== '—'
                                  ).length;
                                  const isConflict = sameCodeCount > 1;

                                  const cellStyle = getProctorMatrixCellStyle({
                                    code: codeVal,
                                    isConflict,
                                    isSpotlight: activeSpotlight === codeVal,
                                    hasActiveSpotlight: Boolean(activeSpotlight),
                                  });

                                  return (
                                    <td
                                      key={rm}
                                      className="py-1 px-0.5 text-center align-middle border-r border-[#22283A] last:border-r-0 relative"
                                    >
                                      <div className="relative flex flex-col items-center">
                                        {/* Focused, Clean 34-38px Cell Input */}
                                        <input
                                          type="text"
                                          value={codeVal}
                                          onChange={(e) => handleUpdateRoomCode(rIdx, rm, e.target.value)}
                                          placeholder="—"
                                          className={`w-full max-w-[34px] sm:max-w-[38px] h-7 text-center font-black text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all cursor-pointer ${cellStyle}`}
                                          maxLength={3}
                                          title={
                                            teacher
                                              ? `Ruang ${rm}: ${teacher.name} [${codeVal}] - Klik untuk opsi & tukar`
                                              : `Ruang ${rm}: Klik untuk pilih guru atau ketik kode`
                                          }
                                          onClick={() => {
                                            if (!isPickerOpen) {
                                              setActiveCellPicker({ rowIndex: rIdx, room: rm });
                                            }
                                          }}
                                          onMouseEnter={() => {
                                            if (codeVal && codeVal !== '—') setHoveredSpotlightCode(codeVal);
                                          }}
                                          onMouseLeave={() => setHoveredSpotlightCode(null)}
                                        />

                                        {/* Floating Popover Dropdown for Guru Picker, Tukar, and Clear */}
                                        {isPickerOpen && (
                                          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-50 w-64 bg-[#141824] border border-[#303C54] rounded-xl shadow-2xl p-2.5 space-y-2 text-left animate-in fade-in zoom-in-95">
                                            {/* Popover Header */}
                                            <div className="flex items-center justify-between border-b border-[#252E42] pb-1.5">
                                              <div className="min-w-0 pr-1">
                                                <div className="text-[11px] font-black text-white flex items-center gap-1.5">
                                                  <span className="text-emerald-400">Ruang {rm}</span>
                                                  <span className="text-slate-500">•</span>
                                                  <span className="text-slate-300 truncate">
                                                    {codeVal && teacher ? `[${codeVal}] ${teacher.name}` : 'Belum Ditugaskan'}
                                                  </span>
                                                </div>
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => setActiveCellPicker(null)}
                                                className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                                              >
                                                <X className="w-3.5 h-3.5" />
                                              </button>
                                            </div>

                                            {/* Quick Actions Bar */}
                                            <div className="space-y-1">
                                              {codeVal && codeVal !== '—' && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setActiveCellPicker(null);
                                                    setSmartSwapTarget({
                                                      rowIndex: rIdx,
                                                      room: rm,
                                                      teacherCode: codeVal,
                                                    });
                                                  }}
                                                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 flex items-center justify-between cursor-pointer transition-colors"
                                                >
                                                  <span className="flex items-center gap-1.5">
                                                    <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" />
                                                    <span>Cari Solusi / Tukar Guru</span>
                                                  </span>
                                                </button>
                                              )}

                                              <button
                                                type="button"
                                                onClick={() => {
                                                  handleUpdateRoomCode(rIdx, rm, '');
                                                  setActiveCellPicker(null);
                                                }}
                                                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-300 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 cursor-pointer flex items-center justify-between transition-colors"
                                              >
                                                <span>Kosongkan Ruang (Nonaktif)</span>
                                                <X className="w-3.5 h-3.5" />
                                              </button>
                                            </div>

                                            {/* Teacher Search / Selection List */}
                                            <div className="pt-1 border-t border-[#252E42]">
                                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                                Pilih Guru Pengawas:
                                              </div>
                                              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                                                {editProctorCodes.map((p) => {
                                                  const pCode = p.code.trim().toUpperCase();
                                                  const isBusy = busyTeachersInThisRow.has(pCode) && pCode !== codeVal;
                                                  const isCurrent = pCode === codeVal;
                                                  const load =
                                                    editTeacherLoads.find((t) => t.code === pCode)?.totalSessions || 0;

                                                  return (
                                                    <button
                                                      key={p.code}
                                                      type="button"
                                                      disabled={isBusy}
                                                      onClick={() => {
                                                        handleUpdateRoomCode(rIdx, rm, p.code);
                                                        setActiveCellPicker(null);
                                                      }}
                                                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                                        isCurrent
                                                          ? 'bg-emerald-500 text-white font-bold'
                                                          : isBusy
                                                          ? 'opacity-35 cursor-not-allowed bg-slate-900/60 text-slate-500'
                                                          : 'hover:bg-slate-800 text-slate-200'
                                                      }`}
                                                    >
                                                      <div className="flex items-center gap-2 min-w-0 pr-1">
                                                        <span
                                                          className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] flex-shrink-0 ${
                                                            isCurrent
                                                              ? 'bg-slate-950 text-white'
                                                              : 'bg-emerald-500/20 text-emerald-300'
                                                          }`}
                                                        >
                                                          {p.code}
                                                        </span>
                                                        <div className="truncate text-[11px]">
                                                          <span className="font-semibold text-white">
                                                            {p.name}
                                                          </span>
                                                          {p.subjectOrRole && (
                                                            <span className="text-[9px] text-slate-400 block truncate">
                                                              {p.subjectOrRole}
                                                            </span>
                                                          )}
                                                        </div>
                                                      </div>
                                                      <div className="flex items-center gap-1 flex-shrink-0">
                                                        <span
                                                          className={`text-[10px] font-mono px-1 rounded ${
                                                            isCurrent
                                                              ? 'bg-black/30 text-white'
                                                              : 'bg-black/40 text-slate-400'
                                                          }`}
                                                          title="Total sesi yang ditugaskan"
                                                        >
                                                          {load} sesi
                                                        </span>
                                                        {isBusy && (
                                                          <span className="text-[9px] text-rose-400 font-bold">
                                                            Bentrok
                                                          </span>
                                                        )}
                                                      </div>
                                                    </button>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  );
                                })}

                                {/* Kolom Aksi Hapus */}
                                <td className="py-2 px-1 text-center align-middle">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRow(rIdx)}
                                    className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer transition-colors"
                                    title="Hapus Sesi Ini"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td
                              colSpan={4 + editRooms.length}
                              className="py-8 text-center text-slate-400 text-xs"
                            >
                              Tidak ada data sesi untuk filter hari "{editDayFilter}".
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Action Buttons in Edit Mode */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#252C3F]">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSave}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan Jadwal'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* ====================================================
                VIEW MODE: JADWAL TAB OR REKAP TAB
                ==================================================== */
            <>
              {activeTab === 'jadwal' ? (
                <div className="space-y-6">
                  {/* (A) BAR SOROTAN CEPAT GURU PENGAWAS (GRID 2-3 BARIS RAPI, SEMUA KODE TERLIHAT) */}
                  <div className="bg-[#101420] border border-[#232A3E] rounded-2xl p-3.5 space-y-3 print:hidden">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                          Sorotan Guru Pengawas ({proctorStats.length} Guru):
                        </span>
                        <span className="text-[11px] text-slate-400 hidden sm:inline">
                          (Klik kode untuk ringkasan jadwal pop-up atau hover untuk sorot di tabel)
                        </span>
                      </div>
                      {activeSpotlight && (
                        <button
                          type="button"
                          onClick={() => {
                            setHighlightedCode(null);
                            setHoveredSpotlightCode(null);
                          }}
                          className="text-xs text-amber-300 hover:text-white bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 rounded-lg flex items-center gap-1.5 cursor-pointer font-bold transition-all shadow-xs"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reset Sorotan [{activeSpotlight}]</span>
                        </button>
                      )}
                    </div>

                    {/* Grid Rapi 2 - 3 Baris Kode Guru */}
                    <div className="grid grid-cols-4 sm:grid-cols-7 md:grid-cols-10 lg:grid-cols-12 gap-1.5">
                      {proctorStats.map((p) => {
                        const isSelected = activeSpotlight === p.code;
                        const isPopupOpen = selectedTeacherPopup === p.code;
                        const teacherColor = getProctorCodeColor(p.code);

                        return (
                          <button
                            key={p.code}
                            type="button"
                            onClick={() => {
                              toggleSpotlight(p.code);
                              handleTeacherCellClick(p.code);
                            }}
                            onMouseEnter={() => setHoveredSpotlightCode(p.code)}
                            onMouseLeave={() => setHoveredSpotlightCode(null)}
                            className={`px-2 py-1.5 rounded-xl border text-xs flex items-center justify-between gap-1.5 cursor-pointer transition-all ${
                              isSelected || isPopupOpen
                                ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-black shadow-md scale-105 ring-2 ring-emerald-400/50 z-10'
                                : 'bg-[#151926] border-[#2A3449] text-slate-200 hover:border-emerald-400/80 hover:bg-[#1C2232] font-medium'
                            }`}
                            title={`${p.name} [${p.code}]: ${p.totalSessions} Sesi - Klik untuk melihat ringkasan jadwal`}
                          >
                            <span className={`w-5 h-5 rounded-lg text-[11px] flex items-center justify-center font-black ${
                              isSelected || isPopupOpen ? 'bg-slate-950 text-white' : `${teacherColor.badge} border`
                            }`}>
                              {p.code}
                            </span>
                            <span className={`text-[10px] px-1 rounded font-mono font-bold ${
                              isSelected || isPopupOpen ? 'bg-slate-950/20 text-slate-950' : 'bg-black/40 text-emerald-400'
                            }`}>
                              {p.totalSessions}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                      {/* (B) MOBILE SMART CARD & MINI-MATRIX VIEW */}
                      <div className={`${mobileLayoutMode === 'smart_grid' ? 'block md:hidden' : 'hidden'} space-y-3.5 print:hidden`}>
                        <div className="flex items-center justify-between px-1 text-xs text-slate-400">
                          <span className="font-semibold flex items-center gap-1.5 text-emerald-400">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Mode Smart Grid (Pas Layar HP)</span>
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {filteredRows.length} Sesi Terjadwal
                          </span>
                        </div>

                        {filteredRows.length > 0 ? (
                          filteredRows.map((row, rIdx) => {
                            const dayCfg = getDayConfig(row.day);
                            const sesCfg = getSessionConfig(row.session);
                            const nextRow = filteredRows[rIdx + 1];
                            const isLastInDay = !nextRow || nextRow.day !== row.day;

                            return (
                              <div
                                key={`m-row-${row.id || rIdx}`}
                                className={`bg-[#121522] border border-[#232A3E] rounded-2xl p-3.5 space-y-3 shadow-md transition-all ${
                                  isLastInDay ? 'border-b-2 border-b-emerald-500/40' : ''
                                }`}
                              >
                                {/* Card Header: Hari, Sesi & Mapel */}
                                <div className="flex items-start justify-between gap-2 border-b border-[#1E2538] pb-2.5">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`px-2 py-0.5 rounded-lg text-xs font-black border ${dayCfg.badge}`}>
                                        {row.day}
                                      </span>
                                      {row.date && (
                                        <span className="text-[11px] font-mono font-medium text-slate-300">
                                          {formatToDDMMYYYY(row.date)}
                                        </span>
                                      )}
                                      {(() => {
                                        const parsed = splitSessionTimeAndLabel(row.session);
                                        return (
                                          <span className={`text-[11px] font-mono font-bold flex items-center gap-1 px-2 py-0.5 rounded-md border ${sesCfg.badge}`}>
                                            <Clock3 className="w-3 h-3 flex-shrink-0" />
                                            <span>{parsed.time || row.session}</span>
                                            {parsed.session && (
                                              <span className="text-[9px] opacity-80">({parsed.session})</span>
                                            )}
                                          </span>
                                        );
                                      })()}
                                    </div>
                                    <div className="text-sm font-bold text-white leading-tight">
                                      {row.subject}
                                    </div>
                                  </div>

                                  <div className="text-right flex-shrink-0">
                                    <span className="inline-block text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                                      {row.classes || 'Kelas 1–6'}
                                    </span>
                                    {row.notes && (
                                      <div className="text-[10px] text-slate-400 italic mt-0.5">
                                        {row.notes}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Mini-Matrix Ruang Kelas */}
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 px-0.5">
                                    <span>Distribusi Guru Pengawas Ruang:</span>
                                    <span className="text-slate-500 font-normal">Ketuk kode utk info guru</span>
                                  </div>

                                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                                    {roomsList.map((rm) => {
                                      let codeVal = row.roomCodes?.[rm] || '';
                                      if (!codeVal && row.proctorDetails) {
                                        const match = row.proctorDetails.find(
                                          (p) => p.roomOrClass.toLowerCase() === rm.toLowerCase()
                                        );
                                        if (match) {
                                          codeVal = match.proctorCode || match.proctorName || '';
                                        }
                                      }

                                      const isAssigned = Boolean(codeVal && codeVal !== '—' && codeVal !== '-');
                                      const teacher = codeToTeacherMap[codeVal.toUpperCase()];
                                      const isSpotlight = activeSpotlight === codeVal.toUpperCase();
                                      const cellStyle = getProctorMatrixCellStyle({
                                        code: codeVal,
                                        isSpotlight,
                                        hasActiveSpotlight: Boolean(activeSpotlight),
                                      });

                                      return (
                                        <div
                                          key={`m-cell-${rm}-${rIdx}`}
                                          onClick={() => {
                                            if (isAssigned) {
                                              toggleSpotlight(codeVal);
                                              handleTeacherCellClick(codeVal);
                                            }
                                          }}
                                          className={`rounded-xl p-1.5 flex flex-col items-center justify-center transition-all cursor-pointer ${cellStyle}`}
                                          title={
                                            teacher
                                              ? `Ruang ${rm}: ${teacher.name} (Kode ${codeVal}) - Klik untuk ringkasan jadwal`
                                              : `Ruang ${rm}: ${codeVal || 'Kosong'}`
                                          }
                                        >
                                          <span className={`text-[10px] font-bold leading-none ${
                                            isSpotlight ? 'text-slate-950 font-black' : 'text-slate-400'
                                          }`}>
                                            R.{rm}
                                          </span>
                                          <span className={`text-xs font-black mt-1 leading-none ${
                                            isSpotlight ? 'text-slate-950 font-black' : isAssigned ? 'text-slate-100' : 'text-slate-600'
                                          }`}>
                                            {codeVal || '—'}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Active Teacher Info Footer if highlighted */}
                                {highlightedCode && (
                                  <div className="pt-2 border-t border-[#1F263A] flex items-center justify-between text-xs bg-amber-500/10 -mx-3.5 -mb-3.5 p-2.5 rounded-b-2xl border border-amber-500/30">
                                    <div className="flex items-center gap-2">
                                      <span className="w-5 h-5 rounded-md bg-amber-400 text-slate-950 font-black text-[11px] flex items-center justify-center flex-shrink-0">
                                        {highlightedCode}
                                      </span>
                                      <span className="font-bold text-amber-200 text-xs truncate">
                                        {codeToTeacherMap[highlightedCode]?.name || 'Pengawas'}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setHighlightedCode(null)}
                                      className="text-[11px] text-amber-400 font-semibold hover:underline"
                                    >
                                      Tutup
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-10 bg-[#121522] border border-[#232A3E] rounded-2xl text-slate-400 text-xs">
                            Tidak ada sesi ujian yang cocok dengan pencarian / filter hari.
                          </div>
                        )}
                      </div>

                      {/* (B) DESKTOP TABLE & PRINT VIEW */}
                      <div className={`${mobileLayoutMode === 'table' ? 'block' : 'hidden md:block'} border border-[#282F42] rounded-2xl overflow-hidden bg-[#10131D] shadow-md print:block print:border-black print:rounded-none`}>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              {/* Super Header for Grade Groupings */}
                              <tr className="bg-[#131722] border-b border-[#222839] text-slate-400 text-[10px] uppercase tracking-wider print:hidden">
                                <th colSpan={3} className="py-1.5 px-3.5 text-slate-500 font-semibold">
                                  Informasi Asesmen
                                </th>
                                {roomsList.map((rm) => {
                                  const isBoundary = gradeBoundaryRoomSet.has(rm);
                                  const gradeCfg = getRoomGradeConfig(rm, isBoundary);
                                  return (
                                    <th
                                      key={`grade-hd-${rm}`}
                                      className={`py-1 px-1 text-center font-extrabold ${gradeCfg.headerText} ${gradeCfg.headerBorder}`}
                                    >
                                      {rm}
                                    </th>
                                  );
                                })}
                              </tr>

                              <tr className="bg-[#161B28] border-b border-[#282F42] text-slate-300 text-[11px] font-bold uppercase tracking-wider print:bg-slate-100 print:text-black print:border-black">
                                <th className="py-3 px-3.5 min-w-[140px] text-center sm:text-left">
                                  Hari & Tanggal
                                </th>
                                <th className="py-3 px-3.5 min-w-[130px]">
                                  Waktu / Sesi
                                </th>
                                <th className="py-3 px-3.5 min-w-[200px] border-r-2 border-r-[#2B3349]">
                                  Mata Pelajaran
                                </th>
                                {roomsList.map((rm) => {
                                  const isBoundary = gradeBoundaryRoomSet.has(rm);
                                  const gradeCfg = getRoomGradeConfig(rm, isBoundary);
                                  return (
                                    <th
                                      key={rm}
                                      className={`py-3 px-2 text-center min-w-[42px] max-w-[50px] font-black ${gradeCfg.headerBg} ${gradeCfg.headerBorder} ${gradeCfg.headerText} print:bg-slate-200 print:text-black print:border-black`}
                                    >
                                      {rm}
                                    </th>
                                  );
                                })}
                              </tr>
                            </thead>
                            <tbody className="print:divide-black">
                              {filteredRows.length > 0 ? (
                                filteredRows.map((row, rIdx) => {
                                  const dayCfg = getDayConfig(row.day);
                                  const sesCfg = getSessionConfig(row.session);
                                  const nextRow = filteredRows[rIdx + 1];
                                  const isLastInDay = !nextRow || nextRow.day !== row.day;

                                  return (
                                    <tr
                                      key={row.id || rIdx}
                                      className={`transition-colors ${dayCfg.border} ${dayCfg.bgHover} ${
                                        isLastInDay
                                          ? 'border-b-2 border-b-emerald-500/30'
                                          : 'border-b border-b-[#1C2233]'
                                      } print:border-l-0 print:border-b-black`}
                                    >
                                      {/* Hari & Tanggal: Format Hari di atas, dd/mm/yyyy di bawah */}
                                      <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                                        <span
                                          className={`inline-block px-2 py-0.5 rounded-lg text-xs font-black border ${dayCfg.badge} print:border-black print:text-black`}
                                        >
                                          {row.day}
                                        </span>
                                        {row.date && (
                                          <div className="text-[11px] text-slate-300 font-mono font-medium mt-1 print:text-black">
                                            {formatToDDMMYYYY(row.date)}
                                          </div>
                                        )}
                                      </td>

                                      {/* Waktu / Sesi: Dibagi 2 Baris (Waktu Jam & Label Sesi) */}
                                      <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                                        {(() => {
                                          const parsed = splitSessionTimeAndLabel(row.session);
                                          return (
                                            <div className="space-y-0.5">
                                              <div className={`font-mono text-xs font-bold inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${sesCfg.badge} print:bg-none print:border-none print:text-black`}>
                                                <Clock3 className="w-3 h-3 flex-shrink-0 print:hidden" />
                                                <span>{parsed.time || row.session}</span>
                                              </div>
                                              {parsed.session && (
                                                <div className="text-[10px] text-slate-400 font-semibold pl-0.5 print:text-black">
                                                  {parsed.session}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })()}
                                      </td>

                                      {/* Mata Pelajaran & Kelas */}
                                      <td className="py-2.5 px-3 align-middle border-r-2 border-r-[#2B3349]">
                                        <div className="font-bold text-white text-xs sm:text-sm print:text-black">
                                          {row.subject}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <span className="text-[10px] font-bold text-emerald-400 print:text-black">
                                            {row.classes || 'Kelas 1–6'}
                                          </span>
                                          {row.notes && (
                                            <span className="text-[10px] text-slate-400 italic print:text-black">
                                              ({row.notes})
                                            </span>
                                          )}
                                        </div>
                                      </td>

                                      {/* Room Code Columns */}
                                      {roomsList.map((rm) => {
                                        const isBoundary = gradeBoundaryRoomSet.has(rm);
                                        const gradeCfg = getRoomGradeConfig(rm, isBoundary);
                                        let codeVal = row.roomCodes?.[rm] || '';
                                        if (!codeVal && row.proctorDetails) {
                                          const match = row.proctorDetails.find(
                                            (p) => p.roomOrClass.toLowerCase() === rm.toLowerCase()
                                          );
                                          if (match) {
                                            codeVal = match.proctorCode || match.proctorName || '';
                                          }
                                        }

                                        const isAssigned = Boolean(codeVal && codeVal !== '—' && codeVal !== '-');
                                        const teacher = codeToTeacherMap[codeVal.toUpperCase()];
                                        const isSpotlight = activeSpotlight === codeVal.toUpperCase();
                                        const cellStyle = getProctorMatrixCellStyle({
                                          code: codeVal,
                                          isSpotlight,
                                          hasActiveSpotlight: Boolean(activeSpotlight),
                                        });

                                        return (
                                          <td
                                            key={rm}
                                            className={`py-2 px-0.5 text-center align-middle ${gradeCfg.headerBorder} print:border-black`}
                                          >
                                            {isAssigned ? (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  toggleSpotlight(codeVal);
                                                  handleTeacherCellClick(codeVal);
                                                }}
                                                onMouseEnter={() => setHoveredSpotlightCode(codeVal)}
                                                onMouseLeave={() => setHoveredSpotlightCode(null)}
                                                title={
                                                  teacher
                                                    ? `Kode [${codeVal}]: ${teacher.name} (${teacher.subjectOrRole || 'Pengawas'}) - Klik untuk ringkasan jadwal`
                                                    : `Kode Guru: ${codeVal}`
                                                }
                                                className={`w-7 h-7 mx-auto rounded-lg text-xs font-black flex items-center justify-center transition-all cursor-pointer ${cellStyle} print:bg-none print:border-none print:text-black`}
                                              >
                                                {codeVal}
                                              </button>
                                            ) : (
                                              <span className="text-slate-600 text-xs select-none print:text-slate-400">
                                                —
                                              </span>
                                            )}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td
                                    colSpan={3 + roomsList.length}
                                    className="text-center py-10 text-slate-500 text-xs"
                                  >
                                    Tidak ada jadwal sesi yang cocok dengan filter.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                  {/* ------------------------------------------------
                      2. TABEL LEGENDA: DAFTAR KODE & NAMA GURU PENGAWAS
                      ------------------------------------------------ */}
                  <div className="bg-[#111420] border border-[#282F42] rounded-2xl p-4 sm:p-5 space-y-3.5 print:border-black print:rounded-none print:p-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#202535] pb-3 print:border-black">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 print:text-black">
                          <UserCheck className="w-4 h-4 text-emerald-400 print:text-black" />
                          <span>Daftar Kode & Nama Guru Pengawas Ruang</span>
                        </h4>
                        <p className="text-[11px] text-slate-400 print:text-black">
                          Rujukan nama lengkap guru pengawas berdasarkan kode huruf pada tabel jadwal.
                        </p>
                      </div>

                      {activeSpotlight && (
                        <button
                          type="button"
                          onClick={() => {
                            setHighlightedCode(null);
                            setHoveredSpotlightCode(null);
                          }}
                          className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-semibold print:hidden cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                          <span>Hapus Sorotan Kode [{activeSpotlight}]</span>
                        </button>
                      )}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#161A28] border-b border-[#282F42] text-slate-400 text-[10px] font-bold uppercase tracking-wider print:bg-slate-100 print:text-black print:border-black">
                            <th className="py-2.5 px-3 w-16 text-center">Kode</th>
                            <th className="py-2.5 px-3">Nama Lengkap Guru / Pengawas</th>
                            <th className="py-2.5 px-3 text-center w-28">Total Sesi Ngawas</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1D2232] print:divide-black">
                          {filteredProctorStats.length > 0 ? (
                            filteredProctorStats.map((item) => {
                              const isSelected = activeSpotlight === item.code;
                              return (
                                <tr
                                  key={item.code}
                                  onClick={() => {
                                    toggleSpotlight(item.code);
                                    handleTeacherCellClick(item.code);
                                  }}
                                  onMouseEnter={() => setHoveredSpotlightCode(item.code)}
                                  onMouseLeave={() => setHoveredSpotlightCode(null)}
                                  className={`transition-colors cursor-pointer ${
                                    isSelected
                                      ? 'bg-emerald-500/15 text-emerald-200'
                                      : 'hover:bg-[#181C29]/70 text-slate-300'
                                  } print:text-black`}
                                >
                                  {/* Kode */}
                                  <td className="py-2.5 px-3 text-center align-middle">
                                    <span
                                      className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black transition-all ${
                                        isSelected
                                          ? 'bg-emerald-400 text-slate-950 font-extrabold shadow-md scale-110 ring-2 ring-emerald-300'
                                          : 'bg-[#182030] text-slate-100 border border-[#2d3a50]'
                                      }`}
                                    >
                                      {item.code}
                                    </span>
                                  </td>

                                  {/* Nama Guru */}
                                  <td className="py-2.5 px-3 align-middle font-bold text-white print:text-black">
                                    {item.name}
                                    {item.subjectOrRole && (
                                      <span className="text-[10px] font-normal text-slate-400 ml-2 print:text-slate-600">
                                        ({item.subjectOrRole})
                                      </span>
                                    )}
                                  </td>

                                  {/* Total Sesi */}
                                  <td className="py-2.5 px-3 align-middle text-center">
                                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-bold text-slate-200 print:border-black print:text-black">
                                      {item.totalSessions} Sesi
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={3} className="text-center py-6 text-slate-500 text-xs">
                                Tidak ada guru pengawas yang cocok dengan pencarian "{searchQuery}".
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ------------------------------------------------
                      3. TATA TERTIB / CATATAN UJIAN
                      ------------------------------------------------ */}
                  <div className="flex items-start gap-2.5 bg-[#161B28]/60 p-3.5 rounded-xl border border-[#282F42]/80 print:border-black print:p-2">
                    <Info className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0 print:text-black" />
                    <div className="text-[11px] text-slate-400 leading-relaxed space-y-0.5 print:text-black">
                      <p className="font-bold text-slate-300 print:text-black">
                        Ketentuan & Tata Tertib Pelaksanaan:
                      </p>
                      <p>
                        {currentSchedule.notes ||
                          '1. Pengawas ruang hadir 15 menit sebelum asesmen dimulai. 2. Siswa wajib membawa perlengkapan alat tulis sendiri. 3. Pengawas mengisi dan menandatangani Berita Acara serta Daftar Hadir.'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* ====================================================
                    TAB REKAPITULASI PENGAWAS RUANG (REKAP GURU)
                    FORMAT: TANGGAL | HARI | SESI - JAM | MAPEL | RUANG
                    ==================================================== */
                <div className="space-y-4">
                  {/* Summary Bar & Stats */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121622] p-3.5 rounded-2xl border border-[#232A3E] print:border-black print:p-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0 print:hidden">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white print:text-black">
                          Rekap Jadwal Tugas Pengawas Guru
                        </h4>
                        <p className="text-[11px] text-slate-400 print:text-black">
                          Kartu penugasan per guru: Tanggal, Hari, Sesi & Jam, Mata Pelajaran, dan Ruang.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap print:hidden">
                      <span className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                        {filteredProctorStats.length} Guru Pengawas
                      </span>
                    </div>
                  </div>

                  {/* KARTU GRID REKAP GURU */}
                  <div className="space-y-4">
                    {filteredProctorStats.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredProctorStats.map((item) => {
                          const teacherColor = getProctorCodeColor(item.code);
                          return (
                            <div
                              key={item.code}
                              className="bg-[#111420] border border-[#282F42] hover:border-emerald-500/40 rounded-xl p-3.5 space-y-2.5 transition-all shadow-sm flex flex-col justify-between"
                            >
                              <div>
                                {/* Card Header: Kode Guru & Nama */}
                                <div className="flex items-center justify-between gap-2 border-b border-[#202535] pb-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className={`w-8 h-8 rounded-lg ${teacherColor.badge} border text-xs font-black flex items-center justify-center flex-shrink-0 shadow-xs`}>
                                      {item.code}
                                    </span>
                                    <div className="min-w-0">
                                      <div className="font-bold text-white text-xs truncate" title={item.name}>
                                        {item.name}
                                      </div>
                                      <div className="text-[10px] text-slate-400 truncate">
                                        {item.subjectOrRole || 'Guru / Pengawas'}
                                      </div>
                                    </div>
                                  </div>
                                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 text-[10px] font-bold flex-shrink-0 border border-slate-700">
                                    {item.totalSessions} Sesi
                                  </span>
                                </div>

                                {/* Assignments List with TANGGAL | HARI | SESI | MAPEL | RUANG format */}
                                <div className="space-y-1.5 max-h-[170px] overflow-y-auto pr-1 mt-2.5">
                                  {item.assignments.length > 0 ? (
                                    item.assignments.map((asg, aIdx) => {
                                      const dayCfg = getDayConfig(asg.day);
                                      const sesCfg = getSessionConfig(asg.session);
                                      const parsedSes = splitSessionTimeAndLabel(asg.session);

                                      return (
                                        <div
                                          key={aIdx}
                                          className="text-[10px] bg-[#161B28] p-2 rounded-lg border border-[#22293C] space-y-1 text-slate-300 hover:border-slate-700 transition-colors"
                                        >
                                          {/* Baris Atas: Tanggal, Hari, Sesi & Ruang */}
                                          <div className="flex items-center justify-between gap-1 flex-wrap">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              {/* Badge Hari */}
                                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${dayCfg.badge}`}>
                                                {asg.day}
                                              </span>
                                              {/* Badge Sesi Waktu Berwarna */}
                                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border flex items-center gap-1 ${sesCfg.badge}`}>
                                                <Clock3 className="w-2.5 h-2.5 flex-shrink-0" />
                                                <span>{parsedSes.time || asg.session}</span>
                                                {parsedSes.session && (
                                                  <span className="opacity-80">({parsedSes.session})</span>
                                                )}
                                              </span>
                                            </div>

                                            {/* Ruang Ujian */}
                                            <span className="font-extrabold text-amber-300 bg-amber-400/15 border border-amber-400/30 px-1.5 py-0.5 rounded text-[9px] flex items-center gap-0.5">
                                              <span>R. {asg.room}</span>
                                            </span>
                                          </div>

                                          {/* Baris Bawah: Mapel & Tanggal */}
                                          <div className="flex items-center justify-between gap-1 pt-0.5 text-slate-300">
                                            <div className="text-[10px] font-semibold text-slate-200 truncate" title={asg.subject}>
                                              {asg.subject}
                                            </div>
                                            {asg.date && (
                                              <div className="text-[9px] text-slate-300 flex-shrink-0 font-mono font-medium">
                                                {formatToDDMMYYYY(asg.date)}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div className="text-[10px] text-slate-500 italic text-center py-4 bg-[#141824]/50 rounded-lg border border-dashed border-[#232839]">
                                      Belum ada penugasan ruang
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-[#111420] rounded-2xl border border-[#282F42] space-y-2">
                        <Users className="w-8 h-8 text-slate-600 mx-auto" />
                        <div className="text-xs font-bold text-slate-300">
                          Tidak ada guru pengawas yang ditemukan
                        </div>
                        <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                          Coba kata kunci pencarian lain atau hapus filter pencarian untuk melihat semua pengawas.
                        </p>
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="mt-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
                          >
                            Hapus Pencarian
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ======================================================
            FOOTER MODAL (NON-PRINT)
            ====================================================== */}
        {!isEditing && (
          <div className="p-3.5 sm:p-4 border-t border-[#252C3F] bg-[#161A26] flex items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">SDIT AL FIKRI — Sistem Informasi Arsip Digital & Asesmen</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Jadwal</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================
          POP-UP MINI RINGKASAN JADWAL GURU PENGAWAS (FLOATING CARD)
          ====================================================== */}
      {selectedTeacherPopup && (() => {
        const teacherCode = selectedTeacherPopup.toUpperCase();
        const teacherInfo = codeToTeacherMap[teacherCode] || {
          code: teacherCode,
          name: `Guru [${teacherCode}]`,
          subjectOrRole: 'Pengawas',
        };
        const teacherStat = proctorStats.find((p) => p.code === teacherCode);
        const teacherColor = getProctorCodeColor(teacherCode);
        const assignments = teacherStat?.assignments || [];

        // Determine current or next schedule status (auto-dim past schedules if date is passed)
        const now = new Date();
        const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

        return (
          <div
            className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
            onClick={() => setSelectedTeacherPopup(null)}
          >
            <div
              className="bg-[#121622] border border-[#2D374E] rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-5 space-y-3.5 text-slate-200 animate-in zoom-in-95 duration-150 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Pop-up */}
              <div className="flex items-start justify-between gap-3 border-b border-[#222A3E] pb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl ${teacherColor.badge} border flex items-center justify-center text-sm font-black flex-shrink-0 shadow-sm`}>
                    {teacherCode}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm sm:text-base font-bold text-white truncate">
                        {teacherInfo.name}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">
                      {teacherInfo.subjectOrRole || 'Guru Pengawas'} • <strong className="text-emerald-400">{assignments.length} Sesi Tugas</strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTeacherPopup(null)}
                  className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sub-header info */}
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>Rangkaian Jadwal Tugas Pengawasan:</span>
                <span className="text-[10px] text-emerald-400 font-medium">Klik tutup atau luar pop-up</span>
              </div>

              {/* List of assignments in mini summary */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {assignments.length > 0 ? (
                  assignments.map((asg, aIdx) => {
                    const dayCfg = getDayConfig(asg.day);
                    const sesCfg = getSessionConfig(asg.session);
                    const parsedSes = splitSessionTimeAndLabel(asg.session);
                    const formattedDate = asg.date ? formatToDDMMYYYY(asg.date) : '';

                    // Simple check for past schedule: if session has date and is before today
                    let isPast = false;
                    if (formattedDate) {
                      const parts = formattedDate.split('/');
                      if (parts.length === 3) {
                        const dObj = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
                        const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        if (dObj < todayZero) {
                          isPast = true;
                        }
                      }
                    }

                    return (
                      <div
                        key={aIdx}
                        className={`p-2.5 rounded-xl border transition-all ${
                          isPast
                            ? 'bg-[#0E111A]/80 border-[#1B2130] opacity-45 grayscale'
                            : 'bg-[#161B28] border-[#252C3F] hover:border-emerald-500/40 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${isPast ? 'bg-slate-900 border-slate-800 text-slate-500' : dayCfg.badge}`}>
                              {asg.day}
                            </span>
                            {formattedDate && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {formattedDate}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border flex items-center gap-1 ${isPast ? 'bg-slate-900 border-slate-800 text-slate-500' : sesCfg.badge}`}>
                              <Clock3 className="w-2.5 h-2.5 flex-shrink-0" />
                              <span>{parsedSes.time || asg.session}</span>
                              {parsedSes.session && (
                                <span className="opacity-80">({parsedSes.session})</span>
                              )}
                            </span>
                          </div>

                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                            isPast
                              ? 'bg-slate-900 border border-slate-800 text-slate-500'
                              : 'bg-amber-400/20 border border-amber-400/40 text-amber-300'
                          }`}>
                            Ruang {asg.room}
                          </span>
                        </div>

                        <div className="mt-1.5 flex items-center justify-between text-xs">
                          <span className={`font-semibold ${isPast ? 'text-slate-500 line-through' : 'text-white'}`}>
                            {asg.subject}
                          </span>
                          {isPast && (
                            <span className="text-[9px] text-slate-500 font-bold italic">
                              Selesai
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 bg-[#0E111A] border border-[#1E2436] rounded-xl text-slate-500 text-xs">
                    Belum ada jadwal tugas pengawasan untuk guru ini.
                  </div>
                )}
              </div>

              {/* Pop-up footer actions */}
              <div className="pt-2 border-t border-[#222A3E] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    toggleSpotlight(teacherCode);
                    setSelectedTeacherPopup(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
                >
                  {activeSpotlight === teacherCode ? 'Hapus Sorotan di Tabel' : 'Sorot di Matriks'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTeacherPopup(null)}
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all cursor-pointer shadow-md"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ======================================================
          MODAL IMPORT EXCEL (ADMIN)
          ====================================================== */}
      {showImportModal && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#141824] border border-[#2B3349] rounded-2xl shadow-2xl max-w-lg w-full p-5 space-y-4 text-slate-200 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-[#252C3F] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white font-heading">
                    Import Jadwal dari File Excel
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Upload file .xlsx / .xls yang berisi jadwal dan kode pengawas.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drag & Drop / File Selector */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#2F384E] hover:border-sky-400 bg-[#0F121A] hover:bg-[#121622] rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <FileSpreadsheet className="w-10 h-10 text-sky-400 mx-auto" />
              <div>
                <p className="text-xs font-bold text-white">
                  {importFile ? importFile.name : 'Klik untuk memilih file Excel'}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Mendukung format .xlsx, .xls, .csv
                </p>
              </div>
            </div>

            {/* Unduh Template Helper */}
            <div className="flex items-center justify-between bg-[#191F2F] p-3 rounded-xl border border-[#273044] text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Belum punya format Excel?</span>
              </div>
              <button
                type="button"
                onClick={() => exportScheduleToExcel(currentSchedule)}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Unduh Template
              </button>
            </div>

            {/* Parsing State */}
            {isParsingExcel && (
              <div className="text-center py-3 text-xs text-sky-300">
                Sedang membaca dan menganalisis file Excel...
              </div>
            )}

            {/* Error State */}
            {importError && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>{importError}</p>
              </div>
            )}

            {/* Preview Results */}
            {importPreview && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl space-y-1.5 text-xs text-slate-200">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <Check className="w-4 h-4" />
                  <span>File Excel Berhasil Dibaca!</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div>
                    <span className="text-slate-400">Judul: </span>
                    <span className="font-semibold text-white">
                      {importPreview.schedule.examHeaderTitle}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Jumlah Sesi: </span>
                    <span className="font-bold text-emerald-300">
                      {importPreview.rowCount} Sesi
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Ruang Kelas: </span>
                    <span className="font-semibold text-white">
                      {importPreview.schedule.rooms?.join(', ') || '1A – 6B'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Kode Pengawas: </span>
                    <span className="font-bold text-emerald-300">
                      {importPreview.proctorCount} Guru Terdaftar
                    </span>
                  </div>
                </div>

                {/* Daftar Guru & Kode yang Berhasil Terbaca */}
                {importPreview.schedule.proctorCodes && importPreview.schedule.proctorCodes.length > 0 && (
                  <div className="pt-2 border-t border-emerald-500/20 space-y-1.5">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                      Kode & Nama Guru Terbaca ({importPreview.schedule.proctorCodes.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-black/40 rounded-xl border border-emerald-500/20">
                      {importPreview.schedule.proctorCodes.map((p) => {
                        const pColor = getProctorCodeColor(p.code);
                        return (
                          <span
                            key={p.code}
                            className={`text-[10px] px-2 py-0.5 rounded-md border ${pColor.badge} flex items-center gap-1.5 shadow-xs`}
                          >
                            <strong className="font-black">{p.code}</strong>
                            <span className="truncate max-w-[120px]">{p.name}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {importPreview.warnings.length > 0 && (
                  <div className="text-[10px] text-amber-300/90 pt-1 border-t border-emerald-500/20">
                    {importPreview.warnings.join(' ')}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#252C3F]">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!importPreview || isSaving}
                onClick={handleApplyImport}
                className="px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-md"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Menerapkan...' : 'Terapkan Jadwal'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          MODAL SMART GENERATE JADWAL ACAK (ADMIN)
          ====================================================== */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#141824] border border-[#2B3349] rounded-2xl shadow-2xl max-w-lg w-full p-5 space-y-4 text-slate-200 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-[#252C3F] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Wand2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white font-heading">
                    Smart Generator Jadwal Ujian
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Otomasi pembagian tugas pengawas ruang ujian secara acak & adil.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Aturan & Parameter */}
            <div className="space-y-3 bg-[#0F121A] border border-[#273044] rounded-xl p-4 text-xs">
              <div className="text-[11px] font-bold text-white uppercase tracking-wider text-amber-400 flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ketentuan Pengacakan Cerdas:</span>
              </div>

              {/* Option 1: Hari Pertama Wali Kelas */}
              <label className="flex items-start gap-3 p-2.5 rounded-lg bg-[#161B29] border border-[#283247] cursor-pointer hover:border-amber-500/40 transition-colors">
                <input
                  type="checkbox"
                  checked={generateFirstDayHomeroom}
                  onChange={(e) => setGenerateFirstDayHomeroom(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900"
                />
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>Hari Pertama Diurus Wali Kelas</span>
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30">
                      Wajib SDIT
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Hari ke-1 (seluruh sesi) diutamakan diawasi oleh wali kelas masing-masing (1A diawas wali 1A, dst).
                  </p>
                </div>
              </label>

              {/* Option 2: Avoid Consecutive Same Room */}
              <label className="flex items-start gap-3 p-2.5 rounded-lg bg-[#161B29] border border-[#283247] cursor-pointer hover:border-amber-500/40 transition-colors">
                <input
                  type="checkbox"
                  checked={generateAvoidSameRoomConsecutive}
                  onChange={(e) => setGenerateAvoidSameRoomConsecutive(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900"
                />
                <div>
                  <div className="font-bold text-white">
                    Hindari Pengulangan di Ruang Sama
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Guru tidak akan mengawas di kelas/ruang yang sama pada hari berikutnya secara terus-menerus.
                  </p>
                </div>
              </label>

              {/* Option 3: Balanced Grade Rotation */}
              <label className="flex items-start gap-3 p-2.5 rounded-lg bg-[#161B29] border border-[#283247] cursor-pointer hover:border-amber-500/40 transition-colors">
                <input
                  type="checkbox"
                  checked={generateBalanceGradeRotation}
                  onChange={(e) => setGenerateBalanceGradeRotation(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900"
                />
                <div>
                  <div className="font-bold text-white">
                    Rotasi Jenjang Rendah (1-3) & Tinggi (4-6)
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Setiap guru mendapatkan giliran merata di kelas bawah dan kelas atas secara proporsional.
                  </p>
                </div>
              </label>
            </div>

            {/* Info Summary */}
            <div className="p-3 bg-sky-500/10 border border-sky-500/25 rounded-xl text-sky-200 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 text-sky-400 flex-shrink-0" />
              <span>
                Target: {editRows.length} Sesi Ujian • {editRooms.length} Ruang Kelas • {editProctorCodes.length} Guru Terdaftar
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#252C3F]">
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteSmartGenerator}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Mulai Generate Acak</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Smart Swap / Exchange Modal */}
      {smartSwapTarget && (
        <SmartSwapModal
          isOpen={Boolean(smartSwapTarget)}
          onClose={() => setSmartSwapTarget(null)}
          currentRows={editRows}
          proctorCodes={editProctorCodes}
          sourceRowIndex={smartSwapTarget.rowIndex}
          sourceRoom={smartSwapTarget.room}
          sourceTeacherCode={smartSwapTarget.teacherCode}
          onApplySwap={handleApplySmartSwap}
        />
      )}
    </div>
  );
};
