import {
  AcademicSubject,
  LearningObjective as SupabaseLearningObjective,
  fetchAcademicLevels,
  fetchAcademicSubjects,
  fetchLearningObjectives,
  createLearningObjective,
  updateLearningObjective,
  detectCategoryFromName,
} from './academicSubjectStorage';
import { RaporStsClassData, RaporSubject, LearningObjective, StudentScoreDetail } from '../types/raporSts';
import { Student } from './studentStorage';

const normalize = (value: string | null | undefined): string =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const toRaporSubject = (
  subject: AcademicSubject,
  objectives: SupabaseLearningObjective[]
): RaporSubject => ({
  id: subject.id,
  name: subject.name,
  code: subject.code || subject.name.slice(0, 3).toUpperCase(),
  order: subject.display_order,
  category: subject.category || detectCategoryFromName(subject.name),
  isCustom: false,
  tpList: objectives
    .filter((objective) => objective.active && Boolean(objective.description?.trim()))
    .sort((a, b) => a.display_order - b.display_order || a.created_at.localeCompare(b.created_at))
    .map((objective) => ({
      id: objective.id,
      code: objective.code || `TP ${objective.display_order || 1}`,
      desc: objective.description.trim(),
      isActive: objective.active,
    })),
});

export async function fetchRaporSubjectsFromSupabase(
  academicLevelId: string
): Promise<RaporSubject[]> {
  let subjects = await fetchAcademicSubjects(academicLevelId);

  // Fallback: jika level ID tidak langsung menghasilkan mapel (misal karena
  // format ID 'grade_1' vs UUID), cocokkan dengan tabel academic_levels.
  if (subjects.length === 0) {
    try {
      const levels = await fetchAcademicLevels();
      const gradeNum = parseInt(academicLevelId.replace(/\D/g, ''), 10);
      const matched = levels.find(
        (lvl) =>
          lvl.id === academicLevelId ||
          (gradeNum && lvl.grade === gradeNum) ||
          lvl.name.toLowerCase().includes(academicLevelId.toLowerCase())
      );
      if (matched && matched.id !== academicLevelId) {
        subjects = await fetchAcademicSubjects(matched.id);
      }
    } catch (err) {
      console.warn('Fallback pencarian academic_levels gagal:', err);
    }
  }

  const activeSubjects = subjects
    .filter((subject) => subject.active)
    .sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name));

  return Promise.all(
    activeSubjects.map(async (subject) => {
      const objectives = await fetchLearningObjectives(subject.id);
      return toRaporSubject(subject, objectives);
    })
  );
}

const findLegacySubject = (
  master: RaporSubject,
  legacySubjects: RaporSubject[]
): RaporSubject | undefined => {
  const byId = legacySubjects.find((subject) => subject.id === master.id);
  if (byId) return byId;

  return legacySubjects.find(
    (subject) =>
      normalize(subject.name) === normalize(master.name) ||
      (!!master.code && normalize(subject.code) === normalize(master.code))
  );
};

const findLegacyObjective = (
  objective: LearningObjective,
  legacySubject?: RaporSubject
): LearningObjective | undefined => {
  if (!legacySubject) return undefined;

  return legacySubject.tpList.find(
    (legacyTp) =>
      normalize(legacyTp.id) === normalize(objective.id) ||
      (!!objective.code && normalize(legacyTp.code) === normalize(objective.code)) ||
      normalize(legacyTp.desc) === normalize(objective.desc)
  );
};

/**
 * Reconciles the legacy Firestore class dataset with the Supabase academic
 * master. Subject/TP IDs are replaced by stable Supabase IDs while existing
 * student scores are carried over by matching subject/TP name or code.
 */
export function reconcileClassDataWithAcademicMaster(
  data: RaporStsClassData,
  masterSubjects: RaporSubject[],
  students: Student[]
): RaporStsClassData {
  const legacySubjects = data.subjects || [];
  const nextRecords: RaporStsClassData['subjectRecords'] = {};

  masterSubjects.forEach((masterSubject) => {
    const legacySubject = findLegacySubject(masterSubject, legacySubjects);
    const oldRecord = legacySubject ? data.subjectRecords?.[legacySubject.id] : undefined;
    const scores: Record<string, StudentScoreDetail> = {};

    students.forEach((student) => {
      const oldScore = oldRecord?.scores?.[student.id];
      const tpScores: Record<string, number | null> = {};
      const tpAchieved: Record<string, boolean> = {};

      masterSubject.tpList.forEach((masterTp) => {
        const oldTp = findLegacyObjective(masterTp, legacySubject);
        const oldValue = oldTp ? oldScore?.tpScores?.[oldTp.id] : undefined;
        const oldAchieved = oldTp ? oldScore?.tpAchieved?.[oldTp.id] : undefined;

        tpScores[masterTp.id] = typeof oldValue === 'number' ? oldValue : null;
        if (typeof oldAchieved === 'boolean') {
          tpAchieved[masterTp.id] = oldAchieved;
        }
      });

      scores[student.id] = {
        studentId: student.id,
        studentName: student.name,
        nisn: student.nisn || oldScore?.nisn || '',
        nis: student.nim || oldScore?.nis || '',
        tpScores,
        tpAchieved,
        stsScore: oldScore?.stsScore ?? null,
        finalScore: oldScore?.finalScore ?? null,
        autoDescription: oldScore?.autoDescription || '',
        customDescription: oldScore?.customDescription,
        teacherNote: oldScore?.teacherNote,
      };
    });

    nextRecords[masterSubject.id] = {
      subjectId: masterSubject.id,
      scores,
    };
  });

  return {
    ...data,
    subjects: masterSubjects,
    subjectRecords: nextRecords,
    lastModified: new Date().toISOString(),
  };
}

export async function syncLearningObjectivesToSupabase(
  previousSubjects: RaporSubject[],
  updatedSubjects: RaporSubject[]
): Promise<void> {
  const previousBySubject = new Map(previousSubjects.map((subject) => [subject.id, subject]));

  for (const subject of updatedSubjects) {
    // Only process subjects that have a valid UUID in academic_subjects
    if (!UUID_REGEX.test(subject.id)) {
      continue;
    }

    const previous = previousBySubject.get(subject.id);
    const previousObjectives = (previous?.tpList || []).filter(
      (objective) => Boolean(objective.desc?.trim())
    );

    const validObjectives = (subject.tpList || []).filter(
      (objective) => Boolean(objective.desc?.trim())
    );

    for (let index = 0; index < validObjectives.length; index += 1) {
      const objective = validObjectives[index];
      const desc = objective.desc.trim();

      const payload = {
        code: objective.code?.trim() || undefined,
        description: desc,
        display_order: index + 1,
        active: objective.isActive !== false,
      };

      const isExistingInSupabase = UUID_REGEX.test(objective.id);

      if (isExistingInSupabase) {
        await updateLearningObjective(objective.id, payload);
      } else {
        await createLearningObjective({
          subject_id: subject.id,
          code: payload.code,
          description: payload.description,
          display_order: payload.display_order,
        });
      }
    }

    // A removed TP is soft-deactivated instead of physically deleted.
    for (const oldObjective of previousObjectives) {
      if (
        UUID_REGEX.test(oldObjective.id) &&
        !validObjectives.some((objective) => objective.id === oldObjective.id)
      ) {
        try {
          await updateLearningObjective(oldObjective.id, { active: false });
        } catch (err) {
          console.warn('Gagal menonaktifkan TP lama di Supabase:', oldObjective.id, err);
        }
      }
    }
  }
}
