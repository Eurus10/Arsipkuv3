import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckSquare,
  GraduationCap,
  Loader2,
  Plus,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  Square,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { TeacherUser } from '../../types';
import { fetchAllTeachers } from '../../services/teacherStorage';
import {
  fetchAcademicLevels,
  fetchAcademicSubjects,
  type AcademicLevel,
  type AcademicSubject,
} from '../../services/academicSubjectStorage';
import {
  AcademicClass,
  AcademicPeriod,
  TeacherAssignment,
  TeacherAssignmentType,
  createTeacherAssignment,
  deleteTeacherAssignment,
  fetchActiveAcademicClasses,
  fetchAcademicPeriods,
  fetchTeacherAssignments,
  updateTeacherAssignment,
} from '../../services/teacherAssignmentStorage';
import { invalidateAcademicSubjectsCache } from '../../services/analysis/analysisAcademicBridge';

interface TeacherAssignmentPanelProps {
  showNotification?: (message: string, type?: 'success' | 'info') => void;
}

type FormState = {
  teacherId: string;
  assignmentType: TeacherAssignmentType;
  levelId: string;
  selectedClassIds: string[];
  subjectId: string;
  notes: string;
};

const emptyForm: FormState = {
  teacherId: '',
  assignmentType: 'subject_teacher',
  levelId: '',
  selectedClassIds: [],
  subjectId: '',
  notes: '',
};

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message || '');
    if (message.includes('23505') || message.toLowerCase().includes('duplicate')) {
      return 'Penugasan tersebut sudah ada atau bentrok dengan penugasan aktif lain.';
    }
    if (message.includes('23514')) {
      return 'Kombinasi penugasan tidak valid. Periksa jenjang, rombel, dan mapel.';
    }
    return message || 'Terjadi kesalahan saat memproses penugasan.';
  }
  return 'Terjadi kesalahan saat memproses penugasan.';
}

export const TeacherAssignmentPanel: React.FC<TeacherAssignmentPanelProps> = ({ showNotification }) => {
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [levels, setLevels] = useState<AcademicLevel[]>([]);
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [subjects, setSubjects] = useState<AcademicSubject[]>([]);
  const [allSubjects, setAllSubjects] = useState<AcademicSubject[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);

  const [periodId, setPeriodId] = useState('');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states for right summary column
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'homeroom' | 'subject'>('all');
  const [pendingDeleteAssignment, setPendingDeleteAssignment] = useState<{ id: string; label: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const activeTeachers = useMemo(() => teachers.filter((teacher) => teacher.status === 'active'), [teachers]);
  const activeLevels = useMemo(() => levels.filter((level) => level.active), [levels]);
  
  const filteredClasses = useMemo(
    () => classes.filter((item) => !form.levelId || item.academic_level_id === form.levelId),
    [classes, form.levelId]
  );
  
  const selectedPeriod = periods.find((period) => period.id === periodId) || null;

  const teacherMap = useMemo(() => new Map(teachers.map((teacher) => [teacher.id, teacher])), [teachers]);
  const levelMap = useMemo(() => new Map(levels.map((level) => [level.id, level])), [levels]);
  const classMap = useMemo(() => new Map(classes.map((item) => [item.id, item])), [classes]);
  const subjectMap = useMemo(() => new Map(allSubjects.map((subject) => [subject.id, subject])), [allSubjects]);

  const notify = (message: string, type: 'success' | 'info' = 'success') => showNotification?.(message, type);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [teacherData, levelData, periodData, classData] = await Promise.all([
        fetchAllTeachers(),
        fetchAcademicLevels(),
        fetchAcademicPeriods(),
        fetchActiveAcademicClasses(),
      ]);
      const subjectLists = await Promise.all(levelData.map((level) => fetchAcademicSubjects(level.id)));
      setTeachers(teacherData);
      setLevels(levelData);
      setPeriods(periodData);
      setClasses(classData);
      setAllSubjects(subjectLists.flat());

      const nextPeriodId = periodId && periodData.some((item) => item.id === periodId)
        ? periodId
        : periodData.find((item) => item.is_active)?.id || periodData[0]?.id || '';
      setPeriodId(nextPeriodId);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async (selectedPeriodId = periodId) => {
    if (!selectedPeriodId) {
      setAssignments([]);
      return;
    }
    try {
      const data = await fetchTeacherAssignments({ academicPeriodId: selectedPeriodId, activeOnly: false });
      setAssignments(data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadAssignments(periodId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodId]);

  useEffect(() => {
    if (!form.levelId) {
      setSubjects([]);
      return;
    }
    setLoadingSubjects(true);
    fetchAcademicSubjects(form.levelId)
      .then(setSubjects)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoadingSubjects(false));
  }, [form.levelId]);

  const resetForm = () => setForm(emptyForm);

  const handleLevelChange = (levelId: string) => {
    setForm((current) => ({
      ...current,
      levelId,
      selectedClassIds: [],
      subjectId: '',
    }));
  };

  const handleToggleClass = (classId: string) => {
    setForm((prev) => {
      const exists = prev.selectedClassIds.includes(classId);
      return {
        ...prev,
        selectedClassIds: exists
          ? prev.selectedClassIds.filter((id) => id !== classId)
          : [...prev.selectedClassIds, classId],
      };
    });
  };

  const handleSelectAllClassesInLevel = () => {
    const allFilteredClassIds = filteredClasses.map((c) => c.id);
    const areAllSelected = allFilteredClassIds.length > 0 && allFilteredClassIds.every((id) => form.selectedClassIds.includes(id));

    setForm((prev) => ({
      ...prev,
      selectedClassIds: areAllSelected ? [] : allFilteredClassIds,
    }));
  };

  const handleCreate = async () => {
    if (!periodId) return setError('Periode akademik belum tersedia.');
    if (!form.teacherId) return setError('Pilih guru terlebih dahulu.');
    if (!form.levelId) return setError('Pilih jenjang terlebih dahulu.');
    if (form.selectedClassIds.length === 0) return setError('Pilih minimal satu rombel / kelas.');
    if (form.assignmentType === 'subject_teacher' && !form.subjectId) return setError('Pilih mata pelajaran terlebih dahulu.');

    setSaving(true);
    setError(null);

    try {
      const results = await Promise.allSettled(
        form.selectedClassIds.map((classId) =>
          createTeacherAssignment({
            teacher_id: form.teacherId,
            academic_period_id: periodId,
            academic_level_id: form.levelId,
            class_id: classId,
            subject_id: form.assignmentType === 'subject_teacher' ? form.subjectId : null,
            assignment_type: form.assignmentType,
            notes: form.notes,
          })
        )
      );

      let successCount = 0;
      let duplicateCount = 0;
      let otherErrors: string[] = [];

      results.forEach((res) => {
        if (res.status === 'fulfilled') {
          successCount++;
        } else {
          const errMsg = getErrorMessage(res.reason);
          if (errMsg.includes('sudah ada') || errMsg.includes('duplicate')) {
            duplicateCount++;
          } else {
            otherErrors.push(errMsg);
          }
        }
      });

      if (successCount > 0) {
        if (duplicateCount > 0) {
          notify(
            `Berhasil menambahkan penugasan untuk ${successCount} rombel (${duplicateCount} rombel sudah terdaftar sebelumnya).`,
            'success'
          );
        } else {
          notify(`Berhasil menambahkan penugasan untuk ${successCount} rombel.`, 'success');
        }
        invalidateAcademicSubjectsCache();
        resetForm();
        await loadAssignments();
      } else if (duplicateCount > 0 && otherErrors.length === 0) {
        setError('Seluruh rombel yang dipilih sudah memiliki penugasan yang sama.');
      } else if (otherErrors.length > 0) {
        setError(otherErrors[0]);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (assignment: TeacherAssignment) => {
    setSaving(true);
    setError(null);
    try {
      await updateTeacherAssignment(assignment.id, { active: !assignment.active });
      invalidateAcademicSubjectsCache();
      notify(assignment.active ? 'Penugasan dinonaktifkan.' : 'Penugasan diaktifkan.', 'info');
      await loadAssignments();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteAssignment) return;
    setIsDeleting(true);
    try {
      await deleteTeacherAssignment(pendingDeleteAssignment.id);
      invalidateAcademicSubjectsCache();
      notify('Penugasan berhasil dihapus.', 'success');
      await loadAssignments();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
      setPendingDeleteAssignment(null);
    }
  };

  // Grouping assignments by Teacher for clean, summarized UI
  const groupedTeacherSummaries = useMemo(() => {
    const map = new Map<
      string,
      {
        teacherId: string;
        teacherName: string;
        roleTitle?: string;
        homeroomAssignments: TeacherAssignment[];
        subjectGroups: Map<string, { subjectId: string; subjectName: string; assignments: TeacherAssignment[] }>;
        totalActiveCount: number;
        totalAssignmentsCount: number;
      }
    >();

    assignments.forEach((assignment) => {
      const teacher = teacherMap.get(assignment.teacher_id);
      const teacherName = teacher?.name || assignment.teacher_id;
      const roleTitle = teacher?.roleTitle;

      if (!map.has(assignment.teacher_id)) {
        map.set(assignment.teacher_id, {
          teacherId: assignment.teacher_id,
          teacherName,
          roleTitle,
          homeroomAssignments: [],
          subjectGroups: new Map(),
          totalActiveCount: 0,
          totalAssignmentsCount: 0,
        });
      }

      const group = map.get(assignment.teacher_id)!;
      group.totalAssignmentsCount++;
      if (assignment.active) group.totalActiveCount++;

      if (assignment.assignment_type === 'homeroom_teacher') {
        group.homeroomAssignments.push(assignment);
      } else {
        const subjId = assignment.subject_id || 'no_subject';
        const subjObj = assignment.subject_id ? subjectMap.get(assignment.subject_id) : null;
        const subjectName = subjObj?.name || (assignment.subject_id ? 'Mata Pelajaran' : 'Mapel Umum');

        if (!group.subjectGroups.has(subjId)) {
          group.subjectGroups.set(subjId, {
            subjectId: subjId,
            subjectName,
            assignments: [],
          });
        }
        group.subjectGroups.get(subjId)!.assignments.push(assignment);
      }
    });

    // Convert map to sorted array
    const list = Array.from(map.values());
    list.sort((a, b) => a.teacherName.localeCompare(b.teacherName));
    return list;
  }, [assignments, teacherMap, subjectMap]);

  // Filtered teacher groups based on search & role filter
  const filteredTeacherSummaries = useMemo(() => {
    return groupedTeacherSummaries.filter((group) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        group.teacherName.toLowerCase().includes(q) ||
        (group.roleTitle && group.roleTitle.toLowerCase().includes(q)) ||
        Array.from(group.subjectGroups.values()).some((s) => s.subjectName.toLowerCase().includes(q)) ||
        group.homeroomAssignments.some((h) => {
          const cls = classMap.get(h.class_id);
          return cls && cls.name.toLowerCase().includes(q);
        });

      if (!matchSearch) return false;

      if (filterRole === 'homeroom') {
        return group.homeroomAssignments.length > 0;
      }
      if (filterRole === 'subject') {
        return group.subjectGroups.size > 0;
      }
      return true;
    });
  }, [groupedTeacherSummaries, searchQuery, filterRole, classMap]);

  const activeAssignmentsCount = assignments.filter((item) => item.active).length;
  const homeroomCount = assignments.filter((item) => item.assignment_type === 'homeroom_teacher' && item.active).length;
  const subjectTeacherCount = assignments.filter((item) => item.assignment_type === 'subject_teacher' && item.active).length;

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          <p className="text-sm font-semibold">Memuat penugasan guru...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Banner Ringkasan Penugasan */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight font-heading">
                  Penugasan Guru SDIT AL FIKRI
                </h2>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Akses e-Rapor
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 max-w-2xl leading-relaxed">
                Hubungkan guru dengan rombel dan mata pelajaran untuk periode akademik aktif. Data penugasan ini menjadi sumber hak akses e-Rapor dan pengisian nilai.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              loadAll();
              loadAssignments();
            }}
            className="self-start lg:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" /> Muat Ulang
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
          <div className="flex-1 text-xs text-rose-800 leading-relaxed font-semibold">{error}</div>
          <button type="button" onClick={() => setError(null)} className="text-rose-500 hover:text-rose-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Periode Selector Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <label className="flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Periode Akademik Aktif
            </span>
            <select
              value={periodId}
              onChange={(event) => setPeriodId(event.target.value)}
              className="w-full h-10 rounded-xl bg-slate-50 border border-slate-200 px-3 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:bg-white transition-all cursor-pointer"
            >
              {periods.length === 0 ? (
                <option value="">Belum ada periode</option>
              ) : (
                periods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.label || `${period.school_year} • ${period.semester}`}
                    {period.is_active ? ' • Aktif' : ''}
                  </option>
                ))
              )}
            </select>
          </label>
          <div className="md:w-auto px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 leading-relaxed">
            {selectedPeriod ? `Periode Terpilih: ${selectedPeriod.label}` : 'Buat periode akademik terlebih dahulu.'}
          </div>
        </div>
      </div>

      {periodId && (
        <div className="grid grid-cols-1 xl:grid-cols-[390px_minmax(0,1fr)] gap-4 sm:gap-5 items-start">
          {/* FORM PENUGASAN (MULTI-ROMBEL) */}
          <section className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
            <div className="p-3.5 sm:p-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-heading">Tambah Penugasan Guru</h3>
                  <p className="text-[10px] text-slate-500">Pilih satu atau banyak rombel sekaligus.</p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-3.5">
              <Field label="Pilih Guru">
                <select
                  value={form.teacherId}
                  onChange={(event) => setForm({ ...form, teacherId: event.target.value })}
                  className="w-full h-10 rounded-xl bg-slate-50 border border-slate-200 px-3 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="">Pilih guru...</option>
                  {activeTeachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Jenis Penugasan">
                <select
                  value={form.assignmentType}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      assignmentType: event.target.value as TeacherAssignmentType,
                      subjectId: '',
                    })
                  }
                  className="w-full h-10 rounded-xl bg-slate-50 border border-slate-200 px-3 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="subject_teacher">Guru Mata Pelajaran</option>
                  <option value="homeroom_teacher">Wali Kelas</option>
                </select>
              </Field>

              <Field label="Jenjang">
                <select
                  value={form.levelId}
                  onChange={(event) => handleLevelChange(event.target.value)}
                  className="w-full h-10 rounded-xl bg-slate-50 border border-slate-200 px-3 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="">Pilih jenjang...</option>
                  {activeLevels.map((level) => (
                    <option key={level.id} value={level.id}>
                      Kelas {level.grade} • {level.name}
                    </option>
                  ))}
                </select>
              </Field>

              {/* MULTI-ROMBEL SELECTOR */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Pilih Rombel / Kelas {form.selectedClassIds.length > 0 && `(${form.selectedClassIds.length} dipilih)`}
                  </span>
                  {form.levelId && filteredClasses.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectAllClassesInLevel}
                      className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
                    >
                      {filteredClasses.every((c) => form.selectedClassIds.includes(c.id))
                        ? 'Batal Pilih Semua'
                        : 'Pilih Semua Rombel'}
                    </button>
                  )}
                </div>

                {!form.levelId ? (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                    Pilih jenjang terlebih dahulu untuk melihat rombel
                  </div>
                ) : filteredClasses.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center text-xs text-amber-700 font-medium">
                    Tidak ada rombel aktif pada jenjang ini
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto custom-scrollbar p-1">
                    {filteredClasses.map((cls) => {
                      const isSelected = form.selectedClassIds.includes(cls.id);
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => handleToggleClass(cls.id)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <span className="truncate">{cls.name}</span>
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-700 shrink-0 ml-1.5" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0 ml-1.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {form.assignmentType === 'subject_teacher' && (
                <Field label="Mata Pelajaran">
                  <select
                    value={form.subjectId}
                    onChange={(event) => setForm({ ...form, subjectId: event.target.value })}
                    disabled={!form.levelId || loadingSubjects}
                    className="w-full h-10 rounded-xl bg-slate-50 border border-slate-200 px-3 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600 focus:bg-white transition-all cursor-pointer disabled:opacity-40"
                  >
                    <option value="">{loadingSubjects ? 'Memuat mapel...' : 'Pilih mapel...'}</option>
                    {subjects
                      .filter((subject) => subject.active)
                      .map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                          {subject.code ? ` • ${subject.code}` : ''}
                        </option>
                      ))}
                  </select>
                </Field>
              )}

              <Field label="Catatan (opsional)">
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  rows={2}
                  placeholder="Contoh: Guru utama semester ganjil"
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-600 focus:bg-white transition-all resize-none leading-relaxed"
                />
              </Field>

              <button
                type="button"
                onClick={handleCreate}
                disabled={saving || !periodId || form.selectedClassIds.length === 0}
                className="w-full h-10 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-emerald-700/10 transition-all"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>
                  Simpan Penugasan {form.selectedClassIds.length > 1 ? `(${form.selectedClassIds.length} Rombel)` : ''}
                </span>
              </button>
            </div>
          </section>

          {/* DAFTAR PENUGASAN RINGKASAN BERKELOMPOK PER GURU */}
          <section className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden min-w-0 flex flex-col">
            {/* Header & Filter Controls */}
            <div className="p-3.5 sm:p-4 border-b border-slate-100 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-heading">Ringkasan Penugasan Guru</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {activeAssignmentsCount} penugasan aktif • {groupedTeacherSummaries.length} guru bertugas
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                    {homeroomCount} Wali Kelas
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    {subjectTeacherCount} Guru Mapel
                  </span>
                </div>
              </div>

              {/* Search & Filter Pills */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari guru, mapel, atau rombel..."
                    className="w-full h-8 pl-8 pr-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-600 focus:bg-white transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200 shrink-0 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setFilterRole('all')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      filterRole === 'all' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Semua ({groupedTeacherSummaries.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterRole('homeroom')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      filterRole === 'homeroom' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Wali Kelas
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterRole('subject')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      filterRole === 'subject' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Guru Mapel
                  </button>
                </div>
              </div>
            </div>

            {/* List Summary Cards */}
            {filteredTeacherSummaries.length === 0 ? (
              <div className="min-h-[340px] flex flex-col items-center justify-center text-center px-6 py-10">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mb-3">
                  <UserRound className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  {searchQuery ? 'Tidak ada guru yang cocok' : 'Belum ada penugasan guru'}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
                  {searchQuery
                    ? 'Coba gunakan kata kunci pencarian yang berbeda.'
                    : 'Gunakan formulir di sebelah kiri untuk menambahkan penugasan guru ke satu atau beberapa rombel.'}
                </p>
              </div>
            ) : (
              <div className="max-h-[620px] overflow-y-auto custom-scrollbar p-3.5 sm:p-4 space-y-3">
                {filteredTeacherSummaries.map((teacherGroup) => {
                  const hasHomeroom = teacherGroup.homeroomAssignments.length > 0;
                  const subjectGroupsArray = Array.from(teacherGroup.subjectGroups.values());

                  return (
                    <div
                      key={teacherGroup.teacherId}
                      className="rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 transition-all p-3.5 sm:p-4 space-y-3 shadow-xs"
                    >
                      {/* Teacher Header Bar */}
                      <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-slate-100">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs">
                            {teacherGroup.teacherName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                              {teacherGroup.teacherName}
                            </h4>
                            {teacherGroup.roleTitle && (
                              <p className="text-[10px] text-slate-500 truncate">{teacherGroup.roleTitle}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {hasHomeroom && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                              Wali Kelas
                            </span>
                          )}
                          {subjectGroupsArray.length > 0 && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Mapel ({subjectGroupsArray.length})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content: Homeroom details if assigned */}
                      {hasHomeroom && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                            <GraduationCap className="w-3.5 h-3.5" /> Wali Kelas:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {teacherGroup.homeroomAssignments.map((assignment) => {
                              const cls = classMap.get(assignment.class_id);
                              const lvl = levelMap.get(assignment.academic_level_id);
                              return (
                                <div
                                  key={assignment.id}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                                    assignment.active
                                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                                      : 'bg-slate-100 border-slate-200 text-slate-400 opacity-70'
                                  }`}
                                >
                                  <span>{cls?.name || `Kelas ${lvl?.grade ?? ''}`}</span>
                                  {!assignment.active && <span className="text-[9px] text-rose-500 font-normal">(Off)</span>}
                                  
                                  <div className="flex items-center gap-0.5 ml-1 pl-1 border-l border-amber-300">
                                    <button
                                      type="button"
                                      onClick={() => handleToggle(assignment)}
                                      title={assignment.active ? 'Nonaktifkan' : 'Aktifkan'}
                                      className="p-0.5 text-amber-700 hover:text-amber-900 rounded transition-colors cursor-pointer"
                                    >
                                      <Power className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPendingDeleteAssignment({
                                          id: assignment.id,
                                          label: `Wali Kelas ${cls?.name || ''} - ${teacherGroup.teacherName}`,
                                        })
                                      }
                                      title="Hapus penugasan"
                                      className="p-0.5 text-rose-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Content: Subject assignments grouped cleanly */}
                      {subjectGroupsArray.length > 0 && (
                        <div className="space-y-2">
                          {subjectGroupsArray.map((sg) => (
                            <div key={sg.subjectId} className="p-2.5 rounded-xl bg-slate-50 border border-slate-150 space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] font-bold text-slate-900">
                                <span className="flex items-center gap-1.5 text-emerald-800">
                                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                                  {sg.subjectName}
                                </span>
                                <span className="text-[10px] text-slate-500 font-normal">
                                  {sg.assignments.length} Rombel
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {sg.assignments.map((assignment) => {
                                  const cls = classMap.get(assignment.class_id);
                                  return (
                                    <div
                                      key={assignment.id}
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                                        assignment.active
                                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                          : 'bg-slate-100 border-slate-200 text-slate-400 opacity-70'
                                      }`}
                                    >
                                      <span>{cls?.name || assignment.class_id}</span>
                                      {!assignment.active && (
                                        <span className="text-[9px] text-rose-500 font-normal">(Off)</span>
                                      )}

                                      <div className="flex items-center gap-0.5 ml-1 pl-1 border-l border-emerald-200">
                                        <button
                                          type="button"
                                          onClick={() => handleToggle(assignment)}
                                          title={assignment.active ? 'Nonaktifkan' : 'Aktifkan'}
                                          className="p-0.5 text-emerald-700 hover:text-emerald-900 rounded transition-colors cursor-pointer"
                                        >
                                          <Power className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setPendingDeleteAssignment({
                                              id: assignment.id,
                                              label: `${sg.subjectName} di ${cls?.name || ''} - ${teacherGroup.teacherName}`,
                                            })
                                          }
                                          title="Hapus penugasan"
                                          className="p-0.5 text-rose-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {!periodId && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center text-xs text-amber-800 font-medium">
          Belum ada periode akademik aktif. Pastikan periode akademik sudah tersedia di Supabase.
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS PENUGASAN */}
      {pendingDeleteAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900 font-heading">Hapus Penugasan</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Apakah Anda yakin ingin menghapus penugasan:{' '}
                  <strong className="text-slate-900">{pendingDeleteAssignment.label}</strong>?
                </p>
                <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
                  Tindakan ini akan menghapus relasi penugasan guru untuk rombel tersebut. Nilai siswa yang telah diinput sebelumnya tetap aman di database.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPendingDeleteAssignment(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{label}</span>
    {children}
  </label>
);

export default TeacherAssignmentPanel;
