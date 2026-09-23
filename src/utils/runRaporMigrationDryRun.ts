import { dryRunRaporMigration, MigrationSummary, MigrationIssue } from '../services/raporMigrationService';

/**
 * DEV-ONLY RUNNER: Rapor STS to Supabase Migration Dry-Run
 *
 * JAMINAN:
 * 1. STRICT READ-ONLY: Hanya memanggil dryRunRaporMigration(), tidak menulis ke database.
 * 2. Tidak memodifikasi state aplikasi atau UI produksi.
 */

export interface DryRunRunnerOptions {
  specificClassKeys?: string[];
  maxDetailIssues?: number;
}

export async function runRaporMigrationDryRun(options?: DryRunRunnerOptions): Promise<MigrationSummary> {
  const maxIssues = options?.maxDetailIssues ?? 100;

  console.log('%c========================================', 'color: #3b82f6; font-weight: bold;');
  console.log('%cRAPOR MIGRATION DRY RUN (READ ONLY)', 'color: #3b82f6; font-weight: bold; font-size: 14px;');
  console.log('%c========================================', 'color: #3b82f6; font-weight: bold;');
  console.log('Memulai dry-run audit data e-Rapor STS...');

  const startTime = performance.now();
  let result: MigrationSummary;

  try {
    result = await dryRunRaporMigration({
      specificClassKeys: options?.specificClassKeys,
    });
  } catch (err: any) {
    console.error('❌ Gagal menjalankan Dry-Run Migration:', err);
    throw err;
  }

  const duration = ((performance.now() - startTime) / 1000).toFixed(2);

  // 1. SUMMARY
  console.log('\n%c--- 1. SUMMARY ---', 'color: #10b981; font-weight: bold;');
  console.table({
    totalClasses: result.totalClasses,
    totalStudents: result.totalStudents,
    totalSubjects: result.totalSubjects,
    totalLearningObjectives: result.totalLearningObjectives,
    totalSubjectScores: result.totalSubjectScores,
    totalLearningObjectiveScores: result.totalLearningObjectiveScores,
  });

  // 2. READY CANDIDATES
  console.log('\n%c--- 2. READY TO MIGRATE ---', 'color: #10b981; font-weight: bold;');
  console.log(`- readySubjectScores: ${result.readyToMigrate.subjectScoresCount}`);
  console.log(`- readyLearningObjectiveScores: ${result.readyToMigrate.learningObjectiveScoresCount}`);

  // 3. PROBLEMS
  console.log('\n%c--- 3. PROBLEM & AUDIT STATS ---', 'color: #ef4444; font-weight: bold;');
  console.log(`- skipped: ${result.skipped}`);
  console.log(`- ambiguous: ${result.ambiguous}`);
  console.log(`- errors: ${result.errors}`);

  // 4. ISSUE BREAKDOWN BY TYPE
  const issueCounts: Record<string, number> = {
    missing_student: 0,
    ambiguous_student: 0,
    missing_subject: 0,
    ambiguous_subject: 0,
    missing_learning_objective: 0,
    ambiguous_learning_objective: 0,
    missing_period: 0,
    ambiguous_period: 0,
    skipped_legacy_period: 0,
    missing_class: 0,
    ambiguous_class: 0,
    invalid_score: 0,
    invalid_data: 0,
  };

  result.issues.forEach((issue) => {
    if (issueCounts[issue.type] !== undefined) {
      issueCounts[issue.type]++;
    } else {
      issueCounts[issue.type] = 1;
    }
  });

  console.log('\n%c--- 4. ISSUE BREAKDOWN BY TYPE ---', 'color: #f59e0b; font-weight: bold;');
  console.table(issueCounts);

  // 5. DETAIL ISSUES (MAX 100)
  console.log(`\n%c--- 5. DETAIL ISSUES (Maksimal ${maxIssues} Pertama) ---`, 'color: #f59e0b; font-weight: bold;');
  if (result.issues.length === 0) {
    console.log('✅ Tidak ditemukan issue / data 100% valid.');
  } else {
    const displayedIssues = result.issues.slice(0, maxIssues);
    displayedIssues.forEach((issue: MigrationIssue, idx: number) => {
      const tag = `[${issue.severity.toUpperCase()}] [${issue.type}]`;
      const context = issue.legacyIdentifier ? ` [${issue.legacyIdentifier}]` : '';
      console.log(`${idx + 1}. ${tag}${context}\n   ${issue.message}`);
      if (issue.candidates && issue.candidates.length > 0) {
        console.log(`   Kandidat:`, issue.candidates);
      }
    });

    if (result.issues.length > maxIssues) {
      console.log(`\n... dan ${result.issues.length - maxIssues} issue lainnya (total ${result.issues.length} issue).`);
    }
  }

  // 6. PREVIEW CANDIDATE DATA (MAX 10)
  console.log('\n%c--- 6. PREVIEW READY DATA ---', 'color: #3b82f6; font-weight: bold;');
  console.log('%cSubject Scores Candidate (Max 10):', 'font-weight: bold;');
  console.table(
    result.readyToMigrate.previewSubjectScores.map((s) => ({
      academic_period_id: s.academic_period_id,
      class_id: s.class_id,
      student_id: s.student_id,
      subject_id: s.subject_id,
      teacher_id: s.teacher_id,
      sts_score: s.sts_score,
      final_score: s.final_score,
    }))
  );

  console.log('%cLearning Objective Scores Candidate (Max 10):', 'font-weight: bold;');
  console.table(
    result.readyToMigrate.previewLearningObjectiveScores.map((lo) => ({
      academic_period_id: lo.academic_period_id,
      class_id: lo.class_id,
      student_id: lo.student_id,
      learning_objective_id: lo.learning_objective_id,
      is_achieved: lo.is_achieved,
      score: lo.score,
    }))
  );

  // 7. GROUPING PER CLASS
  const classSummaryMap = new Map<string, { subjectScores: number; loScores: number; issueCount: number }>();

  // Count ready subject scores per class
  (result.readyToMigrate.allSubjectScores || []).forEach((s) => {
    const entry = classSummaryMap.get(s.class_id) || { subjectScores: 0, loScores: 0, issueCount: 0 };
    entry.subjectScores++;
    classSummaryMap.set(s.class_id, entry);
  });

  // Count ready LO scores per class
  (result.readyToMigrate.allLearningObjectiveScores || []).forEach((lo) => {
    const entry = classSummaryMap.get(lo.class_id) || { subjectScores: 0, loScores: 0, issueCount: 0 };
    entry.loScores++;
    classSummaryMap.set(lo.class_id, entry);
  });

  // Count issues per class from legacyIdentifier
  result.issues.forEach((issue) => {
    const match = issue.legacyIdentifier.match(/classKey:\s*([^\s|]+)/);
    if (match && match[1]) {
      const clsKey = match[1];
      const entry = classSummaryMap.get(clsKey) || { subjectScores: 0, loScores: 0, issueCount: 0 };
      entry.issueCount++;
      classSummaryMap.set(clsKey, entry);
    }
  });

  console.log('\n%c--- 7. GROUPING PER CLASS ---', 'color: #8b5cf6; font-weight: bold;');
  const classSummaryTable: Record<string, { 'Subject Score Count': number; 'TP Score Count': number; 'Issue Count': number }> = {};
  classSummaryMap.forEach((val, key) => {
    classSummaryTable[key] = {
      'Subject Score Count': val.subjectScores,
      'TP Score Count': val.loScores,
      'Issue Count': val.issueCount,
    };
  });
  console.table(classSummaryTable);

  // 8. GROUPING PER PERIOD
  const periodSummaryMap = new Map<string, { subjectScores: number; loScores: number }>();
  (result.readyToMigrate.allSubjectScores || []).forEach((s) => {
    const entry = periodSummaryMap.get(s.academic_period_id) || { subjectScores: 0, loScores: 0 };
    entry.subjectScores++;
    periodSummaryMap.set(s.academic_period_id, entry);
  });

  (result.readyToMigrate.allLearningObjectiveScores || []).forEach((lo) => {
    const entry = periodSummaryMap.get(lo.academic_period_id) || { subjectScores: 0, loScores: 0 };
    entry.loScores++;
    periodSummaryMap.set(lo.academic_period_id, entry);
  });

  console.log('\n%c--- 8. GROUPING PER ACADEMIC PERIOD ---', 'color: #8b5cf6; font-weight: bold;');
  const periodSummaryTable: Record<string, { 'Subject Score Count': number; 'TP Score Count': number }> = {};
  periodSummaryMap.forEach((val, key) => {
    periodSummaryTable[key] = {
      'Subject Score Count': val.subjectScores,
      'TP Score Count': val.loScores,
    };
  });
  console.table(periodSummaryTable);

  console.log(`\n%cDry-run selesai dalam ${duration} detik.`, 'color: #10b981; font-weight: bold;');
  console.log('%c========================================\n', 'color: #3b82f6; font-weight: bold;');

  return result;
}

// Auto-register to window object for convenient browser console invocation during development
if (typeof window !== 'undefined') {
  (window as any).__runRaporMigrationDryRun = runRaporMigrationDryRun;
}
