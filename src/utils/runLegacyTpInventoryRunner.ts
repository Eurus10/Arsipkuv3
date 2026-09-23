import { runLegacyTpInventory, LegacyTpInventorySummary } from '../services/legacyTpInventoryService';

/**
 * DEV/CONSOLE RUNNER: runLegacyTpInventoryRunner
 *
 * JAMINAN:
 * 1. STRICT READ ONLY: Tidak pernah melakukan INSERT, UPDATE, atau DELETE.
 * 2. Hanya mengevaluasi data legacy kelas berperiode 2026/2027 Ganjil.
 * 3. Menghasilkan ringkasan dan console.table() untuk:
 *    - TP yang missing
 *    - TP yang matched
 *    - TP yang ambiguous
 */
export async function runLegacyTpInventoryRunner(): Promise<LegacyTpInventorySummary> {
  console.log('%c========================================================', 'color: #06b6d4; font-weight: bold;');
  console.log('%cINVENTARISASI TUJUAN PEMBELAJARAN (TP) LEGACY — 2026/2027 GANJIL', 'color: #06b6d4; font-weight: bold; font-size: 14px;');
  console.log('%c(STRICT READ-ONLY: NO INSERTS, NO UPDATES, NO DELETES)', 'color: #94a3b8; font-style: italic;');
  console.log('%c========================================================', 'color: #06b6d4; font-weight: bold;');
  console.log('Memulai analisis dan inventarisasi TP legacy dari Firestore vs Supabase...');

  const startTime = performance.now();
  let result: LegacyTpInventorySummary;

  try {
    result = await runLegacyTpInventory();
  } catch (err: any) {
    console.error('❌ Gagal menjalankan inventarisasi TP legacy:', err);
    throw err;
  }

  const duration = ((performance.now() - startTime) / 1000).toFixed(2);

  // 1. RINGKASAN UTAMA
  console.log('\n%c--- 1. RINGKASAN UTAMA ---', 'color: #10b981; font-weight: bold;');
  console.table({
    'Scope Periode': result.period_scope,
    'Total Rombel Dianalisis': result.total_legacy_classes_analyzed,
    'Total Unique Legacy TP': result.total_unique_legacy_tp,
    'Total TP Sudah Ada (Matched)': result.total_tp_matched,
    'Total TP Missing (Missing in Supabase)': result.total_tp_missing,
    'Total TP Ambiguous': result.total_tp_ambiguous,
    'Total Referensi Nilai Siswa (Scores)': result.total_legacy_tp_score_references,
    'Durasi Eksekusi': `${duration} detik`,
  });

  console.log('\n%cRombel 2026/2027 Ganjil yang dianalisis:%c ' + result.analyzed_classes.join(', '), 'color: #06b6d4; font-weight: bold;', 'color: #e2e8f0;');
  console.log('%cRombel legacy yang diabaikan (arsip / di luar scope):%c ' + result.ignored_classes.join(', '), 'color: #64748b; font-weight: bold;', 'color: #94a3b8;');

  // 2. GROUPING PER JENJANG (LEVEL)
  console.log('\n%c--- 2. GROUPING TP PER JENJANG (ACADEMIC LEVEL) ---', 'color: #3b82f6; font-weight: bold;');
  const levelTableData: Record<string, any> = {};
  for (const [level, stats] of Object.entries(result.grouping_by_level)) {
    levelTableData[level] = {
      'Total TP': stats.total_tp,
      'Matched': stats.matched,
      'Missing': stats.missing,
      'Ambiguous': stats.ambiguous,
      'Jml Nilai Siswa': stats.scores_count,
    };
  }
  console.table(levelTableData);

  // 3. GROUPING PER MAPEL
  console.log('\n%c--- 3. GROUPING TP PER MAPEL ---', 'color: #3b82f6; font-weight: bold;');
  const subjectTableData = Object.values(result.grouping_by_subject).map((s) => ({
    'Jenjang': s.level,
    'Mata Pelajaran': s.subject_name,
    'Total TP': s.total_tp,
    'Matched': s.matched,
    'Missing': s.missing,
    'Ambiguous': s.ambiguous,
    'Jml Nilai Siswa': s.scores_count,
  }));
  console.table(subjectTableData);

  // 4. DAFTAR TP MISSING
  const missingItems = result.items.filter((i) => i.status === 'missing_learning_objective');
  console.log(`\n%c--- 4. DAFTAR TP MISSING (${missingItems.length} TP) ---`, 'color: #f59e0b; font-weight: bold;');
  if (missingItems.length === 0) {
    console.log('%cSemua TP legacy berhasil dicocokkan ke Supabase learning_objectives.', 'color: #10b981;');
  } else {
    console.table(
      missingItems.map((item) => ({
        'Jenjang': item.academic_level_id,
        'Subject ID': item.subject_id,
        'Mapel': item.subject_name,
        'Legacy TP Key': item.legacy_tp_key,
        'Kode TP': item.legacy_tp_code,
        'Deskripsi TP': item.legacy_tp_description.length > 60
          ? item.legacy_tp_description.slice(0, 60) + '...'
          : item.legacy_tp_description,
        'Jml Rombel': item.classes_count,
        'Jml Nilai Siswa': item.student_scores_count,
      }))
    );
  }

  // 5. DAFTAR TP MATCHED
  const matchedItems = result.items.filter((i) => i.status === 'matched');
  console.log(`\n%c--- 5. DAFTAR TP MATCHED (${matchedItems.length} TP) ---`, 'color: #10b981; font-weight: bold;');
  if (matchedItems.length === 0) {
    console.log('%cBelum ada TP legacy yang terhubung ke learning_objectives Supabase.', 'color: #f59e0b;');
  } else {
    console.table(
      matchedItems.map((item) => ({
        'Jenjang': item.academic_level_id,
        'Mapel': item.subject_name,
        'Legacy TP Key': item.legacy_tp_key,
        'Kode Legacy': item.legacy_tp_code,
        'Supabase LO ID': item.learning_objective_id,
        'Supabase Code': item.matched_code,
        'Deskripsi Supabase': (item.matched_description || '').length > 50
          ? (item.matched_description || '').slice(0, 50) + '...'
          : item.matched_description,
        'Jml Nilai': item.student_scores_count,
      }))
    );
  }

  // 6. DAFTAR TP AMBIGUOUS
  const ambiguousItems = result.items.filter((i) => i.status === 'ambiguous_learning_objective');
  console.log(`\n%c--- 6. DAFTAR TP AMBIGUOUS (${ambiguousItems.length} TP) ---`, 'color: #ef4444; font-weight: bold;');
  if (ambiguousItems.length === 0) {
    console.log('%cTidak ada TP legacy yang ambigu.', 'color: #10b981;');
  } else {
    console.table(
      ambiguousItems.map((item) => ({
        'Jenjang': item.academic_level_id,
        'Mapel': item.subject_name,
        'Legacy TP Key': item.legacy_tp_key,
        'Kode TP': item.legacy_tp_code,
        'Deskripsi': item.legacy_tp_description.slice(0, 50) + '...',
        'Kandidat Supabase': item.ambiguous_candidates?.map((c) => `${c.id} (${c.code})`).join(' | '),
        'Jml Nilai': item.student_scores_count,
      }))
    );
  }

  console.log('\n%c========================================================', 'color: #06b6d4; font-weight: bold;');
  console.log('%cINVENTARISASI SELESAI', 'color: #06b6d4; font-weight: bold;');
  console.log('%cData inventarisasi lengkap tersedia pada return object function ini.', 'color: #94a3b8;');
  console.log('%c========================================================', 'color: #06b6d4; font-weight: bold;');

  return result;
}
