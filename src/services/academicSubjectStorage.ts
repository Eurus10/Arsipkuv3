import { supabase, isSupabaseConfigured } from './supabase';

export type SubjectCategory = 'agama' | 'umum' | 'mulok';

export function detectCategoryFromName(name: string): SubjectCategory {
  const lower = name.toLowerCase();
  if (
    lower.includes('agama') ||
    lower.includes('pai') ||
    lower.includes('budi pekerti') ||
    lower.includes('qur') ||
    lower.includes('akidah') ||
    lower.includes('fiqih') ||
    lower.includes('fikih') ||
    lower.includes('tahfidz') ||
    lower.includes('hadis')
  ) {
    return 'agama';
  }
  if (
    lower.includes('arab') ||
    lower.includes('sunda') ||
    lower.includes('jawa') ||
    lower.includes('mulok') ||
    lower.includes('muatan lokal') ||
    lower.includes('daerah')
  ) {
    return 'mulok';
  }
  return 'umum';
}

export interface AcademicLevel {
  id: string;
  name: string;
  grade: number;
  phase: string | null;
  active: boolean;
}

export interface AcademicSubject {
  id: string;
  academic_level_id: string;
  name: string;
  code: string | null;
  display_order: number;
  category?: SubjectCategory;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LearningObjective {
  id: string;
  subject_id: string;
  code: string | null;
  description: string;
  display_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const ensureConfigured = () => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase belum dikonfigurasi. Periksa VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.');
  }
};

export async function fetchAcademicLevels(): Promise<AcademicLevel[]> {
  ensureConfigured();

  const { data, error } = await supabase
    .from('academic_levels')
    .select('id, name, grade, phase, active')
    .eq('active', true)
    .order('grade', { ascending: true });

  if (error) throw error;
  return (data || []) as AcademicLevel[];
}

export async function fetchAcademicSubjects(academicLevelId: string): Promise<AcademicSubject[]> {
  ensureConfigured();

  const { data, error } = await supabase
    .from('academic_subjects')
    .select('*')
    .eq('academic_level_id', academicLevelId)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []) as AcademicSubject[];
}

export async function fetchLearningObjectives(subjectId: string): Promise<LearningObjective[]> {
  ensureConfigured();

  const { data, error } = await supabase
    .from('learning_objectives')
    .select('*')
    .eq('subject_id', subjectId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as LearningObjective[];
}

export async function createAcademicSubject(input: {
  academic_level_id: string;
  name: string;
  code?: string;
  category?: SubjectCategory;
  display_order?: number;
}): Promise<AcademicSubject> {
  ensureConfigured();

  const name = input.name.trim();
  const category = input.category || detectCategoryFromName(name);

  const payload: Record<string, unknown> = {
    academic_level_id: input.academic_level_id,
    name,
    code: input.code?.trim() || null,
    display_order: input.display_order ?? 0,
    category,
    active: true,
  };

  const { data, error } = await supabase
    .from('academic_subjects')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data as AcademicSubject;
}

export async function updateAcademicSubject(
  id: string,
  updates: Partial<Pick<AcademicSubject, 'name' | 'code' | 'category' | 'display_order' | 'active'>>
): Promise<AcademicSubject> {
  ensureConfigured();

  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.code !== undefined) payload.code = updates.code?.trim() || null;
  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.display_order !== undefined) payload.display_order = updates.display_order;
  if (updates.active !== undefined) payload.active = updates.active;

  const { data, error } = await supabase
    .from('academic_subjects')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as AcademicSubject;
}

export async function createLearningObjective(input: {
  subject_id: string;
  code?: string;
  description: string;
  display_order?: number;
}): Promise<LearningObjective> {
  ensureConfigured();

  const description = input.description?.trim();
  if (!description) {
    throw new Error('Deskripsi tujuan pembelajaran tidak boleh kosong.');
  }

  const payload = {
    subject_id: input.subject_id,
    code: input.code?.trim() || null,
    description,
    display_order: input.display_order ?? 0,
    active: true,
  };

  const { data, error } = await supabase
    .from('learning_objectives')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data as LearningObjective;
}

export async function updateLearningObjective(
  id: string,
  updates: Partial<Pick<LearningObjective, 'code' | 'description' | 'display_order' | 'active'>>
): Promise<LearningObjective> {
  ensureConfigured();

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(id)) {
    console.warn(`[Supabase] updateLearningObjective diabaikan karena id bukan UUID valid: ${id}`);
    return {} as LearningObjective;
  }

  const payload: Record<string, unknown> = {};
  if (updates.code !== undefined) payload.code = updates.code?.trim() || null;
  if (updates.description !== undefined) {
    const desc = updates.description.trim();
    if (!desc) {
      throw new Error('Deskripsi tujuan pembelajaran tidak boleh kosong.');
    }
    payload.description = desc;
  }
  if (updates.display_order !== undefined) payload.display_order = updates.display_order;
  if (updates.active !== undefined) payload.active = updates.active;

  const { data, error } = await supabase
    .from('learning_objectives')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as LearningObjective;
}

export async function copySubjectsFromLevel(params: {
  sourceLevelId: string;
  targetLevelId: string;
  subjectIdsToCopy: string[];
  copyObjectives?: boolean;
}): Promise<{ copiedSubjectsCount: number; copiedObjectivesCount: number }> {
  ensureConfigured();

  const { sourceLevelId, targetLevelId, subjectIdsToCopy, copyObjectives = false } = params;

  if (!sourceLevelId || !targetLevelId || subjectIdsToCopy.length === 0) {
    return { copiedSubjectsCount: 0, copiedObjectivesCount: 0 };
  }

  // 1. Ambil data mapel dari jenjang sumber
  const sourceSubjects = await fetchAcademicSubjects(sourceLevelId);
  const subjectsToProcess = sourceSubjects.filter(
    (s) => subjectIdsToCopy.includes(s.id) && s.active
  );

  // 2. Ambil data mapel yang sudah ada di jenjang target untuk mencegah duplikasi nama
  const existingTargetSubjects = await fetchAcademicSubjects(targetLevelId);
  const existingNamesSet = new Set(
    existingTargetSubjects.map((s) => s.name.trim().toLowerCase())
  );

  let copiedSubjectsCount = 0;
  let copiedObjectivesCount = 0;

  for (const srcSub of subjectsToProcess) {
    const trimmedName = srcSub.name.trim();
    if (existingNamesSet.has(trimmedName.toLowerCase())) {
      continue;
    }

    // Pertahankan nomor urut tampil asli (display_order) dari kelas sumber
    const displayOrderToUse = srcSub.display_order ?? 0;

    // Buat mapel baru di jenjang target dengan membawa display_order dan category asli
    const newSubject = await createAcademicSubject({
      academic_level_id: targetLevelId,
      name: trimmedName,
      code: srcSub.code || undefined,
      category: srcSub.category || undefined,
      display_order: displayOrderToUse,
    });

    existingNamesSet.add(trimmedName.toLowerCase());
    copiedSubjectsCount += 1;

    // Jika opsi copyObjectives aktif, salin juga TP aktifnya dengan mempertahankan urutan asli
    if (copyObjectives && newSubject.id) {
      try {
        const sourceObjectives = await fetchLearningObjectives(srcSub.id);
        const validObjectives = sourceObjectives.filter(
          (obj) => obj.active && Boolean(obj.description?.trim())
        );

        for (let i = 0; i < validObjectives.length; i += 1) {
          const obj = validObjectives[i];
          await createLearningObjective({
            subject_id: newSubject.id,
            code: obj.code || undefined,
            description: obj.description.trim(),
            display_order: obj.display_order ?? (i + 1),
          });
          copiedObjectivesCount += 1;
        }
      } catch (objErr) {
        console.warn(`Gagal menyalin TP untuk mapel ${srcSub.name}:`, objErr);
      }
    }
  }

  return { copiedSubjectsCount, copiedObjectivesCount };
}
