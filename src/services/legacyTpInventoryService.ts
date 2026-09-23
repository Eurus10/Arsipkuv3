import { fetchLegacyClassDocuments, fetchAllSupabaseMasterData } from './raporMigrationService';

// Re-export or define types for the TP inventory
export interface LegacyTpInventoryItem {
  academic_level_id: string;
  subject_id: string;
  subject_name: string;
  subject_code: string;
  legacy_tp_key: string;
  legacy_tp_code: string;
  legacy_tp_description: string;
  classes_count: number;
  classes_list: string[];
  student_scores_count: number;
  status: 'matched' | 'missing_learning_objective' | 'ambiguous_learning_objective';
  learning_objective_id: string | null;
  matched_code: string | null;
  matched_description: string | null;
  ambiguous_candidates?: Array<{ id: string; code: string; description: string }>;
}

export interface LegacyTpInventorySummary {
  period_scope: string;
  total_legacy_classes_analyzed: number;
  analyzed_classes: string[];
  ignored_classes: string[];
  total_unique_legacy_tp: number;
  total_tp_matched: number;
  total_tp_missing: number;
  total_tp_ambiguous: number;
  total_legacy_tp_score_references: number;
  grouping_by_level: Record<string, { total_tp: number; matched: number; missing: number; ambiguous: number; scores_count: number }>;
  grouping_by_subject: Record<string, { level: string; subject_name: string; total_tp: number; matched: number; missing: number; ambiguous: number; scores_count: number }>;
  items: LegacyTpInventoryItem[];
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeString(val: string | null | undefined): string {
  return String(val || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeCode(val: string | null | undefined): string {
  return String(val || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Explicit code aliases for legacy subjects mapping to standard Supabase codes.
 * Same deterministic logic as raporMigrationService.
 */
const LEGACY_SUBJECT_CODE_ALIASES: Record<string, string> = {
  'PAI': 'PAI',
  'PAIBP': 'PAI',
  'PAI_BP': 'PAI',
  'P_A_I': 'PAI',
  'BA': 'BA',
  'BAHASAARAB': 'BA',
  'BAHASA_ARAB': 'BA',
  'MTK': 'MTK',
  'MATEMATIKA': 'MTK',
  'BIND': 'BIND',
  'BI': 'BIND',
  'BAHASAINDONESIA': 'BIND',
  'BAHASA_INDONESIA': 'BIND',
  'PP': 'PP',
  'PPKN': 'PP',
  'PANCASILA': 'PP',
  'PJOK': 'PJOK',
  'PENJAS': 'PJOK',
  'BING': 'BING',
  'BAHASAINGGRIS': 'BING',
  'BAHASA_INGGRIS': 'BING',
  'IPAS': 'IPAS',
  'SKI': 'SKI',
};

function normalizeSubjectCodeAlias(rawCode: string | null | undefined): string | null {
  if (!rawCode) return null;
  const clean = normalizeCode(rawCode);
  if (!clean) return null;
  return LEGACY_SUBJECT_CODE_ALIASES[clean] || clean;
}

const LEGACY_SUBJECT_NAME_ALIASES: Record<string, string> = {
  'pai': 'pendidikan agama islam dan budi pekerti',
  'paibp': 'pendidikan agama islam dan budi pekerti',
  'pendidikan agama islam': 'pendidikan agama islam dan budi pekerti',
  'pendidikan agama islam dan budi pekerti': 'pendidikan agama islam dan budi pekerti',
  'pendidikan agama dan budi pekerti': 'pendidikan agama islam dan budi pekerti',
  'bahasa arab': 'bahasa arab',
  'bahasa arab / mulok': 'bahasa arab',
  'bahasa arab mulok': 'bahasa arab',
  'bahasa_arab': 'bahasa arab',
  'ba': 'bahasa arab',
  'sejarah kebudyaan islam': 'sejarah kebudayaan islam',
  'sejarah kebudayaan islam (ski)': 'sejarah kebudayaan islam',
  'ski': 'sejarah kebudayaan islam',
  'pendidikan pancasila dan kewarganegaraan': 'pendidikan pancasila',
  'ppkn': 'pendidikan pancasila',
  'pancasila': 'pendidikan pancasila',
  'bahasa indonesia': 'bahasa indonesia',
  'matematika': 'matematika',
  'mtk': 'matematika',
};

function normalizeSubjectName(val: string | null | undefined): string {
  const norm = normalizeString(val);
  return LEGACY_SUBJECT_NAME_ALIASES[norm] || norm;
}

function mapSemesterStringToStandard(sem: string | null | undefined): 'Ganjil' | 'Genap' | null {
  const s = normalizeString(sem);
  if (s === '1' || s === 'ganjil' || s === 'sem1' || s === 'semester 1' || s === 'semester ganjil') {
    return 'Ganjil';
  }
  if (s === '2' || s === 'genap' || s === 'sem2' || s === 'semester 2' || s === 'semester genap') {
    return 'Genap';
  }
  return null;
}

function mapSchoolYearStringToStandard(year: string | null | undefined): string | null {
  const s = String(year || '').trim();
  const match = s.match(/(\d{4})[^\d](\d{4})/);
  if (match) {
    return `${match[1]}/${match[2]}`;
  }
  return null;
}

/**
 * RUN LEGACY TP INVENTORY (STRICT READ ONLY)
 *
 * Menganalisis seluruh Tujuan Pembelajaran (TP) legacy unik khusus periode 2026/2027 Ganjil
 * dan memetakan statusnya terhadap learning_objectives di Supabase.
 *
 * JAMINAN:
 * 1. Hanya membaca Firestore legacy dan Supabase (Strict Read-Only).
 * 2. Tidak melakukan INSERT, UPDATE, atau DELETE.
 * 3. Mengabaikan periode di luar 2026/2027 Ganjil.
 */
export async function runLegacyTpInventory(): Promise<LegacyTpInventorySummary> {
  const [legacyClasses, masterData] = await Promise.all([
    fetchLegacyClassDocuments(),
    fetchAllSupabaseMasterData(),
  ]);

  // Indexing Classes
  const classById = new Map<string, typeof masterData.classes[0]>();
  const classesByName = new Map<string, typeof masterData.classes>();
  masterData.classes.forEach((c) => {
    classById.set(c.id, c);
    const norm = normalizeString(c.name);
    if (norm) {
      const list = classesByName.get(norm) || [];
      list.push(c);
      classesByName.set(norm, list);
    }
  });

  // Indexing Academic Subjects (Scoped by Level)
  const subjectById = new Map<string, typeof masterData.subjects[0]>();
  const subjectsByLevelAndCode = new Map<string, typeof masterData.subjects>();
  const subjectsByLevelAndName = new Map<string, typeof masterData.subjects>();

  masterData.subjects.forEach((subj) => {
    subjectById.set(subj.id, subj);
    const levelId = subj.academic_level_id || '';

    const normCode = normalizeCode(subj.code);
    if (normCode && levelId) {
      const key = `${levelId}::${normCode}`;
      const list = subjectsByLevelAndCode.get(key) || [];
      list.push(subj);
      subjectsByLevelAndCode.set(key, list);

      const aliasCode = normalizeSubjectCodeAlias(subj.code);
      if (aliasCode && aliasCode !== normCode) {
        const aliasKey = `${levelId}::${aliasCode}`;
        const aliasList = subjectsByLevelAndCode.get(aliasKey) || [];
        aliasList.push(subj);
        subjectsByLevelAndCode.set(aliasKey, aliasList);
      }
    }

    const normName = normalizeSubjectName(subj.name);
    if (normName && levelId) {
      const key = `${levelId}::${normName}`;
      const list = subjectsByLevelAndName.get(key) || [];
      list.push(subj);
      subjectsByLevelAndName.set(key, list);
    }
  });

  // Indexing Learning Objectives
  const loById = new Map<string, typeof masterData.learningObjectives[0]>();
  const loBySubjectAndCode = new Map<string, typeof masterData.learningObjectives>();
  const loBySubjectAndDesc = new Map<string, typeof masterData.learningObjectives>();

  masterData.learningObjectives.forEach((lo) => {
    loById.set(lo.id, lo);

    const normCode = normalizeCode(lo.code);
    if (normCode) {
      const key = `${lo.subject_id}::${normCode}`;
      const list = loBySubjectAndCode.get(key) || [];
      list.push(lo);
      loBySubjectAndCode.set(key, list);
    }

    const normDesc = normalizeString(lo.description);
    if (normDesc) {
      const key = `${lo.subject_id}::${normDesc}`;
      const list = loBySubjectAndDesc.get(key) || [];
      list.push(lo);
      loBySubjectAndDesc.set(key, list);
    }
  });

  // Filter Target Classes: Strictly 2026/2027 Ganjil
  // Abaikan seluruh classKey: *_sem1_2024-2025, *_sem2_2024-2025, *_sem2_2026-2027
  const analyzedClasses: string[] = [];
  const ignoredClasses: string[] = [];

  interface TpOccurrenceAccumulator {
    academic_level_id: string;
    subject_id: string;
    subject_name: string;
    subject_code: string;
    legacy_tp_key: string;
    legacy_tp_code: string;
    legacy_tp_description: string;
    classes: Set<string>;
    score_reference_count: number;
  }

  // Unique TP Map key: `${academic_level_id}::${subject_id}::${legacy_tp_key_or_normalized}`
  const uniqueTpMap = new Map<string, TpOccurrenceAccumulator>();

  for (const legacyClass of legacyClasses) {
    const classId = legacyClass.id || '';

    // Rule: Exclude explicit legacy pattern keys
    if (
      classId.includes('_2024-2025') ||
      classId.includes('2024_2025') ||
      classId.includes('_sem2_2026-2027') ||
      classId.includes('sem2')
    ) {
      // Check config to be completely sure
      const stdYear = mapSchoolYearStringToStandard(legacyClass.config?.schoolYear);
      const stdSem = mapSemesterStringToStandard(legacyClass.config?.semester);
      if (stdYear !== '2026/2027' || stdSem !== 'Ganjil') {
        ignoredClasses.push(classId);
        continue;
      }
    }

    const stdYear = mapSchoolYearStringToStandard(legacyClass.config?.schoolYear);
    const stdSem = mapSemesterStringToStandard(legacyClass.config?.semester);

    if (stdYear !== '2026/2027' || stdSem !== 'Ganjil') {
      ignoredClasses.push(classId);
      continue;
    }

    analyzedClasses.push(classId);

    // Resolve Class and Academic Level
    const rawClassLevel = legacyClass.config?.classLevel || classId.split('_')[0];
    const cleanClassId = rawClassLevel.replace(/kelas\s*/i, '').trim().toUpperCase();

    let matchedAcademicLevelId: string | null = null;
    if (classById.has(cleanClassId)) {
      matchedAcademicLevelId = classById.get(cleanClassId)?.academic_level_id || null;
    } else {
      const candidates = classesByName.get(normalizeString(rawClassLevel)) || [];
      if (candidates.length === 1) {
        matchedAcademicLevelId = candidates[0].academic_level_id || null;
      }
    }

    if (!matchedAcademicLevelId) {
      const matchDigit = cleanClassId.match(/^([1-6])/);
      if (matchDigit) {
        matchedAcademicLevelId = `grade_${matchDigit[1]}`;
      } else {
        matchedAcademicLevelId = 'grade_unknown';
      }
    }

    const subjectRecords = legacyClass.subjectRecords || {};
    const subjectList = legacyClass.subjects || [];

    const legacySubjectMetaMap = new Map<string, typeof subjectList[0]>();
    subjectList.forEach((s) => {
      legacySubjectMetaMap.set(s.id, s);
    });

    for (const [legacySubjectId, subjectRecord] of Object.entries(subjectRecords)) {
      const subjectMeta = legacySubjectMetaMap.get(legacySubjectId);
      const subjectName = subjectMeta?.name || legacySubjectId;
      const subjectCode = subjectMeta?.code || '';

      // Resolve Subject using standard resolver (scoped to academic level)
      let matchedSubject: typeof masterData.subjects[0] | null = null;

      if (UUID_REGEX.test(legacySubjectId) && subjectById.has(legacySubjectId)) {
        const s = subjectById.get(legacySubjectId)!;
        if (!matchedAcademicLevelId || s.academic_level_id === matchedAcademicLevelId) {
          matchedSubject = s;
        }
      }

      if (!matchedSubject && matchedAcademicLevelId) {
        const candidateCodes: string[] = [];
        if (subjectCode) {
          const c = normalizeSubjectCodeAlias(subjectCode);
          if (c && !candidateCodes.includes(c)) candidateCodes.push(c);
          const raw = normalizeCode(subjectCode);
          if (raw && !candidateCodes.includes(raw)) candidateCodes.push(raw);
        }
        if (!UUID_REGEX.test(legacySubjectId)) {
          const cFromId = normalizeSubjectCodeAlias(legacySubjectId);
          if (cFromId && !candidateCodes.includes(cFromId)) candidateCodes.push(cFromId);
          const rawId = normalizeCode(legacySubjectId);
          if (rawId && !candidateCodes.includes(rawId)) candidateCodes.push(rawId);
        }

        for (const codeToTest of candidateCodes) {
          const codeKey = `${matchedAcademicLevelId}::${codeToTest}`;
          const candidates = subjectsByLevelAndCode.get(codeKey) || [];
          if (candidates.length === 1) {
            matchedSubject = candidates[0];
            break;
          }
        }
      }

      if (!matchedSubject && matchedAcademicLevelId) {
        const candidateNames: string[] = [];
        if (subjectName) {
          const n = normalizeSubjectName(subjectName);
          if (n && !candidateNames.includes(n)) candidateNames.push(n);
          const raw = normalizeString(subjectName);
          if (raw && !candidateNames.includes(raw)) candidateNames.push(raw);
        }
        if (!UUID_REGEX.test(legacySubjectId)) {
          const nFromId = normalizeSubjectName(legacySubjectId);
          if (nFromId && !candidateNames.includes(nFromId)) candidateNames.push(nFromId);
        }

        for (const nameToTest of candidateNames) {
          const nameKey = `${matchedAcademicLevelId}::${nameToTest}`;
          const candidates = subjectsByLevelAndName.get(nameKey) || [];
          if (candidates.length === 1) {
            matchedSubject = candidates[0];
            break;
          }
        }
      }

      const resolvedSubjectId = matchedSubject ? matchedSubject.id : legacySubjectId;
      const resolvedSubjectName = matchedSubject ? matchedSubject.name : subjectName;
      const resolvedSubjectCode = matchedSubject ? (matchedSubject.code || '') : subjectCode;

      // Count TP score occurrences per TP key in this subject
      const tpScoreCountInSubject = new Map<string, number>();
      const scores = subjectRecord?.scores || {};

      for (const scoreDetail of Object.values(scores)) {
        const tpScoresMap = scoreDetail.tpScores || {};
        const tpAchievedMap = scoreDetail.tpAchieved || {};
        const referencedKeys = new Set([...Object.keys(tpScoresMap), ...Object.keys(tpAchievedMap)]);

        for (const tpKey of referencedKeys) {
          tpScoreCountInSubject.set(tpKey, (tpScoreCountInSubject.get(tpKey) || 0) + 1);
        }
      }

      // Process defined TPs in this subject
      const subjectTpList = subjectMeta?.tpList || [];
      const handledTpKeys = new Set<string>();

      for (const tp of subjectTpList) {
        handledTpKeys.add(tp.id);
        const itemKey = `${matchedAcademicLevelId}::${resolvedSubjectId}::${tp.id}`;
        const scoreCount = tpScoreCountInSubject.get(tp.id) || 0;

        let accum = uniqueTpMap.get(itemKey);
        if (!accum) {
          accum = {
            academic_level_id: matchedAcademicLevelId,
            subject_id: resolvedSubjectId,
            subject_name: resolvedSubjectName,
            subject_code: resolvedSubjectCode,
            legacy_tp_key: tp.id,
            legacy_tp_code: tp.code || '',
            legacy_tp_description: tp.desc || '',
            classes: new Set<string>(),
            score_reference_count: 0,
          };
          uniqueTpMap.set(itemKey, accum);
        }

        accum.classes.add(classId);
        accum.score_reference_count += scoreCount;
      }

      // Check if there are any referenced TP keys in scores that were not in tpList
      for (const [tpKey, count] of tpScoreCountInSubject.entries()) {
        if (!handledTpKeys.has(tpKey)) {
          const itemKey = `${matchedAcademicLevelId}::${resolvedSubjectId}::${tpKey}`;
          let accum = uniqueTpMap.get(itemKey);
          if (!accum) {
            accum = {
              academic_level_id: matchedAcademicLevelId,
              subject_id: resolvedSubjectId,
              subject_name: resolvedSubjectName,
              subject_code: resolvedSubjectCode,
              legacy_tp_key: tpKey,
              legacy_tp_code: tpKey,
              legacy_tp_description: '(Tidak terdefinisi di tpList, hanya ditemukan di tpScores siswa)',
              classes: new Set<string>(),
              score_reference_count: 0,
            };
            uniqueTpMap.set(itemKey, accum);
          }
          accum.classes.add(classId);
          accum.score_reference_count += count;
        }
      }
    }
  }

  // Evaluate Supabase Matching for Each Unique TP
  const inventoryItems: LegacyTpInventoryItem[] = [];

  for (const accum of uniqueTpMap.values()) {
    let matchedLo: typeof masterData.learningObjectives[0] | null = null;
    let ambiguousCandidates: Array<{ id: string; code: string; description: string }> = [];
    let status: 'matched' | 'missing_learning_objective' | 'ambiguous_learning_objective' = 'missing_learning_objective';

    // 1. Exact UUID match if legacy_tp_key is a valid UUID
    if (UUID_REGEX.test(accum.legacy_tp_key) && loById.has(accum.legacy_tp_key)) {
      const candidate = loById.get(accum.legacy_tp_key)!;
      if (candidate.subject_id === accum.subject_id) {
        matchedLo = candidate;
        status = 'matched';
      }
    }

    // 2. Exact code match within the same subject_id
    if (!matchedLo && accum.legacy_tp_code) {
      const codeKey = `${accum.subject_id}::${normalizeCode(accum.legacy_tp_code)}`;
      const candidates = loBySubjectAndCode.get(codeKey) || [];
      if (candidates.length === 1) {
        matchedLo = candidates[0];
        status = 'matched';
      } else if (candidates.length > 1) {
        status = 'ambiguous_learning_objective';
        ambiguousCandidates = candidates.map((c) => ({
          id: c.id,
          code: c.code,
          description: c.description,
        }));
      }
    }

    // 3. Normalized description within the same subject_id
    if (!matchedLo && status !== 'ambiguous_learning_objective' && accum.legacy_tp_description) {
      const descKey = `${accum.subject_id}::${normalizeString(accum.legacy_tp_description)}`;
      const candidates = loBySubjectAndDesc.get(descKey) || [];
      if (candidates.length === 1) {
        matchedLo = candidates[0];
        status = 'matched';
      } else if (candidates.length > 1) {
        status = 'ambiguous_learning_objective';
        ambiguousCandidates = candidates.map((c) => ({
          id: c.id,
          code: c.code,
          description: c.description,
        }));
      }
    }

    inventoryItems.push({
      academic_level_id: accum.academic_level_id,
      subject_id: accum.subject_id,
      subject_name: accum.subject_name,
      subject_code: accum.subject_code,
      legacy_tp_key: accum.legacy_tp_key,
      legacy_tp_code: accum.legacy_tp_code,
      legacy_tp_description: accum.legacy_tp_description,
      classes_count: accum.classes.size,
      classes_list: Array.from(accum.classes).sort(),
      student_scores_count: accum.score_reference_count,
      status,
      learning_objective_id: matchedLo ? matchedLo.id : null,
      matched_code: matchedLo ? matchedLo.code : null,
      matched_description: matchedLo ? matchedLo.description : null,
      ambiguous_candidates: ambiguousCandidates.length > 0 ? ambiguousCandidates : undefined,
    });
  }

  // Sort inventory items by level, subject_name, legacy_tp_code
  inventoryItems.sort((a, b) => {
    if (a.academic_level_id !== b.academic_level_id) {
      return a.academic_level_id.localeCompare(b.academic_level_id);
    }
    if (a.subject_name !== b.subject_name) {
      return a.subject_name.localeCompare(b.subject_name);
    }
    return a.legacy_tp_code.localeCompare(b.legacy_tp_code, undefined, { numeric: true });
  });

  // Calculate Aggregations
  let totalMatched = 0;
  let totalMissing = 0;
  let totalAmbiguous = 0;
  let totalScores = 0;

  const groupByLevel: Record<string, { total_tp: number; matched: number; missing: number; ambiguous: number; scores_count: number }> = {};
  const groupBySubject: Record<string, { level: string; subject_name: string; total_tp: number; matched: number; missing: number; ambiguous: number; scores_count: number }> = {};

  for (const item of inventoryItems) {
    if (item.status === 'matched') totalMatched++;
    else if (item.status === 'missing_learning_objective') totalMissing++;
    else if (item.status === 'ambiguous_learning_objective') totalAmbiguous++;

    totalScores += item.student_scores_count;

    // By Level
    if (!groupByLevel[item.academic_level_id]) {
      groupByLevel[item.academic_level_id] = { total_tp: 0, matched: 0, missing: 0, ambiguous: 0, scores_count: 0 };
    }
    groupByLevel[item.academic_level_id].total_tp++;
    if (item.status === 'matched') groupByLevel[item.academic_level_id].matched++;
    if (item.status === 'missing_learning_objective') groupByLevel[item.academic_level_id].missing++;
    if (item.status === 'ambiguous_learning_objective') groupByLevel[item.academic_level_id].ambiguous++;
    groupByLevel[item.academic_level_id].scores_count += item.student_scores_count;

    // By Subject
    const subjKey = `${item.academic_level_id}::${item.subject_name}`;
    if (!groupBySubject[subjKey]) {
      groupBySubject[subjKey] = {
        level: item.academic_level_id,
        subject_name: item.subject_name,
        total_tp: 0,
        matched: 0,
        missing: 0,
        ambiguous: 0,
        scores_count: 0,
      };
    }
    groupBySubject[subjKey].total_tp++;
    if (item.status === 'matched') groupBySubject[subjKey].matched++;
    if (item.status === 'missing_learning_objective') groupBySubject[subjKey].missing++;
    if (item.status === 'ambiguous_learning_objective') groupBySubject[subjKey].ambiguous++;
    groupBySubject[subjKey].scores_count += item.student_scores_count;
  }

  return {
    period_scope: '2026/2027 — Ganjil',
    total_legacy_classes_analyzed: analyzedClasses.length,
    analyzed_classes: analyzedClasses.sort(),
    ignored_classes: ignoredClasses.sort(),
    total_unique_legacy_tp: inventoryItems.length,
    total_tp_matched: totalMatched,
    total_tp_missing: totalMissing,
    total_tp_ambiguous: totalAmbiguous,
    total_legacy_tp_score_references: totalScores,
    grouping_by_level: groupByLevel,
    grouping_by_subject: groupBySubject,
    items: inventoryItems,
  };
}
