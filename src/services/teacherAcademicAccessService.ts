import { supabase, isSupabaseConfigured } from './supabase';
import { getActiveTeacherSession } from './teacherStorage';

/**
 * ============================================================
 * TEACHER ACADEMIC ACCESS SERVICE
 * ============================================================
 *
 * Tugas service ini:
 *
 * 1. Menentukan periode akademik aktif.
 * 2. Mengambil assignment guru yang aktif.
 * 3. subject_teacher:
 *      → akses hanya kelas + mapel yang ditugaskan.
 *
 * 4. homeroom_teacher:
 *      → akses seluruh mapel aktif pada jenjang
 *        dari kelas yang menjadi wali kelasnya.
 *
 * Service ini TIDAK menangani:
 * - login guru
 * - PIN e-Rapor
 * - session e-Rapor
 * - input nilai
 * - UI
 *
 * Service ini hanya menjawab:
 *
 * "Guru ini punya akses akademik ke mana saja?"
 * ============================================================
 */

const TEACHERS_TABLE = 'teachers';
const TEACHER_ASSIGNMENTS_TABLE = 'teacher_assignments';
const ACADEMIC_PERIODS_TABLE = 'academic_periods';
const ACADEMIC_SUBJECTS_TABLE = 'academic_subjects';
const SCHOOL_CLASSES_TABLE = 'school_classes';

/* ============================================================
 * TYPES
 * ============================================================
 */

export type TeacherAssignmentType =
  | 'subject_teacher'
  | 'homeroom_teacher';

export interface AcademicPeriod {
  id: string;
  schoolYear: string;
  semester: 'Ganjil' | 'Genap';
  label: string;
  isActive: boolean;
}

export interface TeacherAcademicAssignment {
  id: string;
  teacherId: string;
  academicPeriodId: string;
  academicLevelId: string;
  classId: string;
  subjectId: string | null;
  assignmentType: TeacherAssignmentType;
  active: boolean;
  notes?: string | null;
}

export interface AcademicClass {
  id: string;
  name: string;
  grade: number | null;
  phase: string | null;
  academicLevelId: string | null;
  active: boolean;
}

export interface AcademicSubject {
  id: string;
  academicLevelId: string;
  name: string;
  code: string | null;
  displayOrder: number;
  active: boolean;
}

export type TeacherAcademicAccessType =
  | 'subject_teacher'
  | 'homeroom_teacher';

export interface TeacherAcademicContext {
  /**
   * Rombel yang dapat diakses guru.
   */
  classId: string;

  className: string;

  /**
   * Jenjang akademik rombel.
   * Contoh: grade_1, grade_2, dst.
   */
  academicLevelId: string;

  /**
   * Mapel yang dapat diakses.
   */
  subjectId: string;

  subjectName: string;

  subjectCode: string | null;

  subjectDisplayOrder: number;

  /**
   * Sumber akses:
   *
   * subject_teacher
   * → berasal dari assignment mapel langsung.
   *
   * homeroom_teacher
   * → berasal dari status wali kelas.
   */
  accessType: TeacherAcademicAccessType;

  /**
   * ID assignment yang menjadi sumber akses.
   */
  assignmentId: string;
}

export interface TeacherAcademicAccess {
  teacherId: string;
  teacherName: string;

  academicPeriod: AcademicPeriod | null;

  assignments: TeacherAcademicAssignment[];

  /**
   * Assignment wali kelas yang aktif.
   */
  homeroomAssignments: TeacherAcademicAssignment[];

  /**
   * Assignment guru mapel yang aktif.
   */
  subjectTeacherAssignments: TeacherAcademicAssignment[];

  /**
   * Semua konteks final yang dapat digunakan UI.
   *
   * Sudah:
   * - memperluas wali kelas menjadi semua mapel;
   * - menghapus duplikasi;
   * - hanya berisi kelas + mapel yang benar-benar aktif.
   */
  contexts: TeacherAcademicContext[];

  /**
   * Rombel unik yang dapat diakses.
   */
  classes: AcademicClass[];

  /**
   * Mapel unik yang dapat diakses.
   */
  subjects: AcademicSubject[];

  /**
   * Status diagnostik akses akademik.
   * Memisahkan kondisi "tidak punya assignment" dari
   * kondisi "assignment ada tetapi belum menghasilkan context".
   */
  hasAssignments: boolean;
  hasContexts: boolean;
}

interface TeacherRow {
  id: string;
  name: string;
  status: string;
}

interface AcademicPeriodRow {
  id: string;
  school_year: string;
  semester: 'Ganjil' | 'Genap';
  label: string | null;
  is_active: boolean;
}

interface TeacherAssignmentRow {
  id: string;
  teacher_id: string;
  academic_period_id: string;
  academic_level_id: string;
  class_id: string;
  subject_id: string | null;
  assignment_type: TeacherAssignmentType;
  active: boolean;
  notes: string | null;
}

interface AcademicClassRow {
  id: string;
  name: string;
  grade: number | null;
  phase: string | null;
  academic_level_id: string | null;
  active: boolean;
}

interface AcademicSubjectRow {
  id: string;
  academic_level_id: string;
  name: string;
  code: string | null;
  display_order: number;
  active: boolean;
}

/* ============================================================
 * HELPERS
 * ============================================================
 */

function mapAcademicPeriod(
  row: AcademicPeriodRow
): AcademicPeriod {
  return {
    id: row.id,
    schoolYear: row.school_year,
    semester: row.semester,
    label:
      row.label ||
      `${row.school_year} • ${row.semester}`,
    isActive: row.is_active,
  };
}

function mapAssignment(
  row: TeacherAssignmentRow
): TeacherAcademicAssignment {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    academicPeriodId: row.academic_period_id,
    academicLevelId: row.academic_level_id,
    classId: row.class_id,
    subjectId: row.subject_id,
    assignmentType: row.assignment_type,
    active: row.active,
    notes: row.notes,
  };
}

function mapClass(
  row: AcademicClassRow
): AcademicClass {
  return {
    id: row.id,
    name: row.name,
    grade: row.grade,
    phase: row.phase,
    academicLevelId: row.academic_level_id,
    active: row.active,
  };
}

function mapSubject(
  row: AcademicSubjectRow
): AcademicSubject {
  return {
    id: row.id,
    academicLevelId: row.academic_level_id,
    name: row.name,
    code: row.code,
    displayOrder: row.display_order,
    active: row.active,
  };
}

/**
 * Menghapus duplikasi konteks.
 *
 * Contoh:
 *
 * Guru adalah wali kelas 2C
 * dan juga punya assignment Matematika 2C.
 *
 * Maka Matematika 2C tetap hanya muncul satu kali.
 *
 * Prioritas accessType:
 * homeroom_teacher
 * tetap dipertahankan jika konteks yang sama
 * muncul dari dua sumber.
 */
function deduplicateContexts(
  contexts: TeacherAcademicContext[]
): TeacherAcademicContext[] {
  const map = new Map<
    string,
    TeacherAcademicContext
  >();

  for (const context of contexts) {
    const key = [
      context.classId,
      context.subjectId,
    ].join('::');

    const existing = map.get(key);

    if (!existing) {
      map.set(key, context);
      continue;
    }

    /**
     * Jika guru merupakan wali kelas sekaligus guru mapel
     * pada konteks yang sama, tandai sebagai homeroom access.
     */
    if (
      context.accessType === 'homeroom_teacher' &&
      existing.accessType !== 'homeroom_teacher'
    ) {
      map.set(key, context);
    }
  }

  return Array.from(map.values());
}

/* ============================================================
 * GET ACTIVE ACADEMIC PERIOD
 * ============================================================
 */

export async function getActiveAcademicPeriod(): Promise<
  AcademicPeriod | null
> {
  if (!isSupabaseConfigured()) {
    console.warn(
      '[Teacher Academic Access] Supabase belum dikonfigurasi.'
    );

    return null;
  }

  const { data, error } = await supabase
    .from(ACADEMIC_PERIODS_TABLE)
    .select(
      'id, school_year, semester, label, is_active'
    )
    .eq('is_active', true)
    .order('school_year', {
      ascending: false,
    })
    .order('semester', {
      ascending: true,
    })
    .limit(1);

  if (error) {
    console.error(
      '[Teacher Academic Access] Gagal mengambil periode aktif:',
      error
    );

    throw error;
  }

  const row = (data || [])[0] as AcademicPeriodRow | undefined;

  if (!row) {
    return null;
  }

  return mapAcademicPeriod(row);
}

/* ============================================================
 * GET TEACHER
 * ============================================================
 */

async function getTeacher(
  teacherId: string
): Promise<TeacherRow | null> {
  const { data, error } = await supabase
    .from(TEACHERS_TABLE)
    .select('id, name, status')
    .eq('id', teacherId)
    .maybeSingle<TeacherRow>();

  if (error) {
    console.error(
      '[Teacher Academic Access] Gagal mengambil guru:',
      error
    );

    throw error;
  }

  return data;
}

/* ============================================================
 * GET TEACHER ASSIGNMENTS
 * ============================================================
 */

async function getTeacherAssignments(
  teacherId: string,
  academicPeriodId: string
): Promise<TeacherAcademicAssignment[]> {
  const { data, error } = await supabase
    .from(TEACHER_ASSIGNMENTS_TABLE)
    .select(
      `
      id,
      teacher_id,
      academic_period_id,
      academic_level_id,
      class_id,
      subject_id,
      assignment_type,
      active,
      notes
      `
    )
    .eq('teacher_id', teacherId)
    .eq('academic_period_id', academicPeriodId)
    .eq('active', true)
    .order('assignment_type', {
      ascending: true,
    });

  if (error) {
    console.error(
      '[Teacher Academic Access] Gagal mengambil assignment guru:',
      error
    );

    throw error;
  }

  console.info(
    '[Teacher Academic Access] Assignment resolver:',
    {
      teacherId,
      academicPeriodId,
      count: data?.length ?? 0,
    }
  );

  return (data || []).map(
    (row) =>
      mapAssignment(
        row as TeacherAssignmentRow
      )
  );
}

/* ============================================================
 * GET CLASSES
 * ============================================================
 */

async function getClassesByIds(
  classIds: string[]
): Promise<AcademicClass[]> {
  if (classIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from(SCHOOL_CLASSES_TABLE)
    .select(
      `
      id,
      name,
      grade,
      phase,
      academic_level_id,
      active
      `
    )
    .in('id', classIds)
    .eq('active', true)
    .order('grade', {
      ascending: true,
    })
    .order('name', {
      ascending: true,
    });

  if (error) {
    console.error(
      '[Teacher Academic Access] Gagal mengambil rombel:',
      error
    );

    throw error;
  }

  return (data || []).map(
    (row) =>
      mapClass(
        row as AcademicClassRow
      )
  );
}

/* ============================================================
 * GET SUBJECTS BY IDs
 * ============================================================
 */

async function getSubjectsByIds(
  subjectIds: string[]
): Promise<AcademicSubject[]> {
  if (subjectIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from(ACADEMIC_SUBJECTS_TABLE)
    .select(
      `
      id,
      academic_level_id,
      name,
      code,
      display_order,
      active
      `
    )
    .in('id', subjectIds)
    .eq('active', true)
    .order('display_order', {
      ascending: true,
    })
    .order('name', {
      ascending: true,
    });

  if (error) {
    console.error(
      '[Teacher Academic Access] Gagal mengambil mapel:',
      error
    );

    throw error;
  }

  return (data || []).map(
    (row) =>
      mapSubject(
        row as AcademicSubjectRow
      )
  );
}

/* ============================================================
 * GET ALL SUBJECTS FOR ACADEMIC LEVEL
 * ============================================================
 *
 * Ini bagian penting untuk wali kelas.
 *
 * Contoh:
 *
 * homeroom 2C
 * academic_level_id = grade_2
 *
 * maka kita mengambil:
 *
 * academic_subjects
 * WHERE academic_level_id = grade_2
 * AND active = true
 *
 * Tidak ada daftar mapel hardcoded.
 * ============================================================
 */

async function getSubjectsByAcademicLevel(
  academicLevelId: string
): Promise<AcademicSubject[]> {
  if (!academicLevelId) {
    return [];
  }

  const { data, error } = await supabase
    .from(ACADEMIC_SUBJECTS_TABLE)
    .select(
      `
      id,
      academic_level_id,
      name,
      code,
      display_order,
      active
      `
    )
    .eq(
      'academic_level_id',
      academicLevelId
    )
    .eq('active', true)
    .order('display_order', {
      ascending: true,
    })
    .order('name', {
      ascending: true,
    });

  if (error) {
    console.error(
      '[Teacher Academic Access] Gagal mengambil mapel berdasarkan jenjang:',
      error
    );

    throw error;
  }

  return (data || []).map(
    (row) =>
      mapSubject(
        row as AcademicSubjectRow
      )
  );
}

/* ============================================================
 * BUILD SUBJECT TEACHER CONTEXTS
 * ============================================================
 *
 * Guru mapel:
 *
 * assignment:
 * Matematika + 2C
 *
 * menjadi:
 *
 * 2C + Matematika
 * ============================================================
 */

async function buildSubjectTeacherContexts(
  assignments: TeacherAcademicAssignment[],
  classesById: Map<string, AcademicClass>,
  subjectsById: Map<string, AcademicSubject>
): Promise<TeacherAcademicContext[]> {
  const contexts: TeacherAcademicContext[] = [];

  for (const assignment of assignments) {
    if (
      assignment.assignmentType !==
      'subject_teacher'
    ) {
      continue;
    }

    if (!assignment.subjectId) {
      continue;
    }

    const academicClass =
      classesById.get(
        assignment.classId
      );

    const subject =
      subjectsById.get(
        assignment.subjectId
      );

    if (!academicClass || !subject) {
      continue;
    }

    /**
     * Pengaman tambahan:
     *
     * Mapel harus berasal dari jenjang
     * yang sama dengan rombel.
     */
    if (
      academicClass.academicLevelId &&
      academicClass.academicLevelId !==
        subject.academicLevelId
    ) {
      console.warn(
        '[Teacher Academic Access] Assignment diabaikan karena jenjang kelas dan mapel tidak cocok:',
        {
          assignmentId: assignment.id,
          classId: assignment.classId,
          subjectId: assignment.subjectId,
          classAcademicLevel:
            academicClass.academicLevelId,
          subjectAcademicLevel:
            subject.academicLevelId,
        }
      );

      continue;
    }

    contexts.push({
      classId: academicClass.id,
      className: academicClass.name,
      academicLevelId:
        assignment.academicLevelId,
      subjectId: subject.id,
      subjectName: subject.name,
      subjectCode: subject.code,
      subjectDisplayOrder:
        subject.displayOrder,
      accessType: 'subject_teacher',
      assignmentId: assignment.id,
    });
  }

  return contexts;
}

/* ============================================================
 * BUILD HOMEROOM CONTEXTS
 * ============================================================
 *
 * Guru kelas:
 *
 * assignment:
 * homeroom_teacher + 2C
 *
 * maka:
 *
 * ambil semua mapel aktif grade_2
 *
 * lalu hasilkan:
 *
 * 2C + PAI
 * 2C + Fiqih
 * 2C + Matematika
 * dst.
 * ============================================================
 */

async function buildHomeroomContexts(
  assignments: TeacherAcademicAssignment[],
  classesById: Map<string, AcademicClass>
): Promise<{
  contexts: TeacherAcademicContext[];
  generatedSubjects: AcademicSubject[];
}> {
  const contexts: TeacherAcademicContext[] = [];
  const generatedSubjects: AcademicSubject[] = [];

  for (const assignment of assignments) {
    if (
      assignment.assignmentType !==
      'homeroom_teacher'
    ) {
      continue;
    }

    const academicClass =
      classesById.get(
        assignment.classId
      );

    if (!academicClass) {
      continue;
    }

    const academicLevelId =
      academicClass.academicLevelId ||
      assignment.academicLevelId;

    if (!academicLevelId) {
      console.warn(
        '[Teacher Academic Access] Wali kelas tidak memiliki academic_level_id:',
        assignment
      );

      continue;
    }

    const subjects =
      await getSubjectsByAcademicLevel(
        academicLevelId
      );

    for (const subject of subjects) {
      /**
       * Pengaman:
       * subject harus berasal dari jenjang kelas.
       */
      if (
        subject.academicLevelId !==
        academicLevelId
      ) {
        continue;
      }

      generatedSubjects.push(subject);

      contexts.push({
        classId: academicClass.id,
        className: academicClass.name,
        academicLevelId,
        subjectId: subject.id,
        subjectName: subject.name,
        subjectCode: subject.code,
        subjectDisplayOrder:
          subject.displayOrder,
        accessType: 'homeroom_teacher',
        assignmentId: assignment.id,
      });
    }
  }

  return {
    contexts,
    generatedSubjects,
  };
}

/* ============================================================
 * MAIN RESOLVER
 * ============================================================
 *
 * Ini adalah fungsi utama yang nanti akan digunakan UI.
 *
 * getTeacherAcademicAccess(teacherId)
 *
 * Hasilnya sudah siap digunakan oleh:
 * - Kelas Saya
 * - daftar mapel
 * - input nilai
 * - kelola TP
 * ============================================================
 */

export async function getTeacherAcademicAccess(
  teacherId: string
): Promise<TeacherAcademicAccess> {
  if (!teacherId) {
    throw new Error(
      'Teacher ID wajib diberikan.'
    );
  }

  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase belum dikonfigurasi.'
    );
  }

  /**
   * ----------------------------------------------------------
   * 1. Guru
   * ----------------------------------------------------------
   */

  const teacher =
    await getTeacher(teacherId);

  if (!teacher) {
    throw new Error(
      'Data guru tidak ditemukan.'
    );
  }

  if (teacher.status === 'blocked') {
    throw new Error(
      'Akun guru sedang diblokir.'
    );
  }

  /**
   * ----------------------------------------------------------
   * 2. Periode akademik aktif
   * ----------------------------------------------------------
   */

  const academicPeriod =
    await getActiveAcademicPeriod();

  if (!academicPeriod) {
    return {
      teacherId: teacher.id,
      teacherName: teacher.name,
      academicPeriod: null,
      assignments: [],
      homeroomAssignments: [],
      subjectTeacherAssignments: [],
      contexts: [],
      classes: [],
      subjects: [],
      hasAssignments: false,
      hasContexts: false,
    };
  }

  /**
   * ----------------------------------------------------------
   * 3. Assignment guru
   * ----------------------------------------------------------
   */

  const assignments =
    await getTeacherAssignments(
      teacher.id,
      academicPeriod.id
    );

  const homeroomAssignments =
    assignments.filter(
      (assignment) =>
        assignment.assignmentType ===
        'homeroom_teacher'
    );

  const subjectTeacherAssignments =
    assignments.filter(
      (assignment) =>
        assignment.assignmentType ===
        'subject_teacher'
    );

  /**
   * ----------------------------------------------------------
   * 4. Ambil semua rombel yang terlibat.
   * ----------------------------------------------------------
   */

  const classIds = Array.from(
    new Set(
      assignments.map(
        (assignment) =>
          assignment.classId
      )
    )
  );

  const classes =
    await getClassesByIds(
      classIds
    );

  if (classIds.length !== classes.length) {
    const loadedClassIds = new Set(classes.map((item) => item.id));
    const missingClassIds = classIds.filter(
      (classId) => !loadedClassIds.has(classId)
    );

    console.warn(
      '[Teacher Academic Access] Ada class_id assignment yang tidak ditemukan/aktif di school_classes:',
      missingClassIds
    );
  }

  const classesById =
    new Map(
      classes.map(
        (academicClass) => [
          academicClass.id,
          academicClass,
        ]
      )
    );

  /**
   * ----------------------------------------------------------
   * 5. Ambil mapel dari assignment guru mapel.
   * ----------------------------------------------------------
   */

  const directSubjectIds =
    Array.from(
      new Set(
        subjectTeacherAssignments
          .map(
            (assignment) =>
              assignment.subjectId
          )
          .filter(
            (
              subjectId
            ): subjectId is string =>
              Boolean(subjectId)
          )
      )
    );

  const directSubjects =
    await getSubjectsByIds(
      directSubjectIds
    );

  const subjectsById =
    new Map(
      directSubjects.map(
        (subject) => [
          subject.id,
          subject,
        ]
      )
    );

  /**
   * ----------------------------------------------------------
   * 6. Bangun akses guru mapel.
   * ----------------------------------------------------------
   */

  const subjectTeacherContexts =
    await buildSubjectTeacherContexts(
      subjectTeacherAssignments,
      classesById,
      subjectsById
    );

  /**
   * ----------------------------------------------------------
   * 7. Bangun akses wali kelas.
   *
   * Wali kelas otomatis mendapat semua mapel aktif
   * pada jenjang kelasnya.
   * ----------------------------------------------------------
   */

  const {
    contexts: homeroomContexts,
    generatedSubjects,
  } =
    await buildHomeroomContexts(
      homeroomAssignments,
      classesById
    );

  /**
   * ----------------------------------------------------------
   * 8. Gabungkan semua konteks.
   * ----------------------------------------------------------
   */

  const contexts =
    deduplicateContexts([
      ...subjectTeacherContexts,
      ...homeroomContexts,
    ]);

  console.info(
    '[Teacher Academic Access] Resolver result:',
    {
      teacherId: teacher.id,
      teacherName: teacher.name,
      academicPeriod: academicPeriod,
      assignments: assignments.length,
      homeroomAssignments: homeroomAssignments.length,
      subjectTeacherAssignments: subjectTeacherAssignments.length,
      classesLoaded: classes.length,
      directSubjects: directSubjects.length,
      generatedSubjects: generatedSubjects.length,
      contexts: contexts.length,
      homeroomContexts: homeroomContexts.length,
      subjectTeacherContexts: subjectTeacherContexts.length,
    }
  );

  if (homeroomAssignments.length > 0 && homeroomContexts.length === 0) {
    console.warn(
      '[Teacher Academic Access] Assignment wali kelas ADA tetapi belum menghasilkan context. Periksa class_id, academic_level_id, dan academic_subjects aktif.',
      {
        homeroomAssignments,
        classes,
        generatedSubjects,
      }
    );
  }

  /**
   * ----------------------------------------------------------
   * 9. Bangun daftar mapel unik.
   * ----------------------------------------------------------
   */

  const subjectsMap =
    new Map<string, AcademicSubject>();

  for (const subject of directSubjects) {
    subjectsMap.set(
      subject.id,
      subject
    );
  }

  for (const subject of generatedSubjects) {
    subjectsMap.set(
      subject.id,
      subject
    );
  }

  const subjects =
    Array.from(
      subjectsMap.values()
    ).sort(
      (a, b) =>
        a.displayOrder -
          b.displayOrder ||
        a.name.localeCompare(
          b.name,
          'id'
        )
    );

  /**
   * ----------------------------------------------------------
   * 10. Hanya tampilkan kelas yang benar-benar punya
   *     konteks akses.
   * ----------------------------------------------------------
   */

  const accessibleClassIds =
    new Set(
      contexts.map(
        (context) =>
          context.classId
      )
    );

  const accessibleClasses =
    classes
      .filter((academicClass) =>
        accessibleClassIds.has(
          academicClass.id
        )
      )
      .sort(
        (a, b) =>
          (a.grade ?? 999) -
            (b.grade ?? 999) ||
          a.name.localeCompare(
            b.name,
            'id'
          )
      );

  return {
    teacherId: teacher.id,
    teacherName: teacher.name,
    academicPeriod,
    assignments,
    homeroomAssignments,
    subjectTeacherAssignments,
    contexts,
    classes: accessibleClasses,
    subjects,
    hasAssignments: assignments.length > 0,
    hasContexts: contexts.length > 0,
  };
}

/**
 * Mengambil akses akademik berdasarkan guru yang sedang login.
 *
 * Penting:
 * - Tidak mencari guru berdasarkan nama.
 * - Tidak membuat teacher ID baru.
 * - Menggunakan teacher.id dari session guru aktif.
 */
export async function getCurrentTeacherAcademicAccess(): Promise<TeacherAcademicAccess> {
  const activeTeacher = getActiveTeacherSession();

  if (!activeTeacher?.id) {
    throw new Error(
      'Sesi guru aktif tidak ditemukan. Silakan login sebagai guru terlebih dahulu.'
    );
  }

  return getTeacherAcademicAccess(activeTeacher.id);
}

/**
 * Debug ringan untuk memverifikasi identity sebelum resolver dipakai UI.
 */
export async function debugCurrentTeacherAcademicAccess(): Promise<void> {
  const activeTeacher = getActiveTeacherSession();

  console.group('[Teacher Academic Access] Current Teacher');

  console.log('Session teacher:', activeTeacher);

  if (!activeTeacher?.id) {
    console.warn('Tidak ada teacher session aktif.');
    console.groupEnd();
    return;
  }

  const access = await getTeacherAcademicAccess(activeTeacher.id);

  console.log('Resolved teacher ID:', access.teacherId);
  console.log('Resolved teacher name:', access.teacherName);
  console.log('Academic period:', access.academicPeriod);
  console.log('Has assignments:', access.hasAssignments);
  console.log('Has contexts:', access.hasContexts);
  console.log('Assignments:', access.assignments);
  console.log('Classes:', access.classes);
  console.log('Subjects:', access.subjects);
  console.log('Contexts:', access.contexts);

  console.groupEnd();
}

/* ============================================================
 * CONVENIENCE HELPERS
 * ============================================================
 */

/**
 * Mengecek apakah guru memiliki akses ke kelas tertentu.
 */
export function teacherCanAccessClass(
  access: TeacherAcademicAccess,
  classId: string
): boolean {
  return access.contexts.some(
    (context) =>
      context.classId === classId
  );
}

/**
 * Mengecek apakah guru memiliki akses ke
 * kelas + mapel tertentu.
 */
export function teacherCanAccessSubject(
  access: TeacherAcademicAccess,
  classId: string,
  subjectId: string
): boolean {
  return access.contexts.some(
    (context) =>
      context.classId === classId &&
      context.subjectId === subjectId
  );
}

/**
 * Mengambil semua mapel yang bisa diakses
 * guru pada satu rombel.
 */
export function getSubjectsForClass(
  access: TeacherAcademicAccess,
  classId: string
): TeacherAcademicContext[] {
  return access.contexts
    .filter(
      (context) =>
        context.classId === classId
    )
    .sort(
      (a, b) =>
        a.subjectDisplayOrder -
          b.subjectDisplayOrder ||
        a.subjectName.localeCompare(
          b.subjectName,
          'id'
        )
    );
}

/**
 * Mengambil semua rombel yang bisa diakses
 * guru untuk satu mapel.
 */
export function getClassesForSubject(
  access: TeacherAcademicAccess,
  subjectId: string
): AcademicClass[] {
  const classIds = new Set(
    access.contexts
      .filter(
        (context) =>
          context.subjectId ===
          subjectId
      )
      .map(
        (context) =>
          context.classId
      )
  );

  return access.classes.filter(
    (academicClass) =>
      classIds.has(
        academicClass.id
      )
  );
}

/**
 * Mengambil satu konteks kelas + mapel.
 */
export function getTeacherAcademicContext(
  access: TeacherAcademicAccess,
  classId: string,
  subjectId: string
): TeacherAcademicContext | null {
  return (
    access.contexts.find(
      (context) =>
        context.classId === classId &&
        context.subjectId === subjectId
    ) || null
  );
}

/**
 * Mengecek apakah guru merupakan wali kelas
 * pada rombel tertentu.
 */
export function isHomeroomTeacherForClass(
  access: TeacherAcademicAccess,
  classId: string
): boolean {
  return access.homeroomAssignments.some(
    (assignment) =>
      assignment.classId === classId
  );
}

/**
 * Mengecek apakah guru merupakan guru mapel
 * pada kelas + mapel tertentu.
 */
export function isSubjectTeacherForContext(
  access: TeacherAcademicAccess,
  classId: string,
  subjectId: string
): boolean {
  return access.subjectTeacherAssignments.some(
    (assignment) =>
      assignment.classId === classId &&
      assignment.subjectId === subjectId
  );
}

/**
 * Debug helper.
 *
 * Berguna sementara ketika kita menguji resolver
 * dari browser console.
 */
export function debugTeacherAcademicAccess(
  access: TeacherAcademicAccess
): void {
  console.group(
    '[Teacher Academic Access]'
  );

  console.log(
    'Guru:',
    access.teacherName,
    `(${access.teacherId})`
  );

  console.log(
    'Periode:',
    access.academicPeriod
  );

  console.log(
    'Assignment:',
    access.assignments
  );

  console.log(
    'Wali Kelas:',
    access.homeroomAssignments
  );

  console.log(
    'Guru Mapel:',
    access.subjectTeacherAssignments
  );

  console.log(
    'Kelas:',
    access.classes
  );

  console.log(
    'Mapel:',
    access.subjects
  );

  console.log(
    'Status:',
    {
      hasAssignments: access.hasAssignments,
      hasContexts: access.hasContexts,
    }
  );

  console.table(
    access.contexts.map(
      (context) => ({
        Kelas: context.className,
        Mapel: context.subjectName,
        Akses:
          context.accessType ===
          'homeroom_teacher'
            ? 'Wali Kelas'
            : 'Guru Mapel',
      })
    )
  );

  console.groupEnd();
}

export default getTeacherAcademicAccess;