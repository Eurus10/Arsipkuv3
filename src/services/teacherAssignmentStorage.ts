import { supabase, isSupabaseConfigured } from './supabase';

export type AcademicPeriod = {
  id: string;
  school_year: string;
  semester: 'Ganjil' | 'Genap';
  label: string;
  is_active: boolean;
  is_archived: boolean;
};

export type AcademicClass = {
  id: string;
  name: string;
  grade: number;
  phase: string | null;
  academic_level_id: string | null;
  active: boolean;
};

export type TeacherAssignmentType = 'subject_teacher' | 'homeroom_teacher';

export type TeacherAssignment = {
  id: string;
  teacher_id: string;
  academic_period_id: string;
  academic_level_id: string;
  class_id: string;
  subject_id: string | null;
  assignment_type: TeacherAssignmentType;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const ensureConfigured = () => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase belum dikonfigurasi. Periksa VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.');
  }
};

export async function fetchAcademicPeriods(): Promise<AcademicPeriod[]> {
  ensureConfigured();
  const { data, error } = await supabase
    .from('academic_periods')
    .select('id, school_year, semester, label, is_active, is_archived')
    .order('school_year', { ascending: false })
    .order('semester', { ascending: true });
  if (error) throw error;
  return (data || []) as AcademicPeriod[];
}

export async function fetchActiveAcademicClasses(): Promise<AcademicClass[]> {
  ensureConfigured();
  const { data, error } = await supabase
    .from('school_classes')
    .select('id, name, grade, phase, academic_level_id, active')
    .eq('active', true)
    .order('grade', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return (data || []) as AcademicClass[];
}

export async function fetchTeacherAssignments(params?: {
  academicPeriodId?: string;
  activeOnly?: boolean;
}): Promise<TeacherAssignment[]> {
  ensureConfigured();
  let query = supabase
    .from('teacher_assignments')
    .select('*')
    .order('created_at', { ascending: false });

  if (params?.academicPeriodId) query = query.eq('academic_period_id', params.academicPeriodId);
  if (params?.activeOnly !== false) query = query.eq('active', true);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as TeacherAssignment[];
}

export async function createTeacherAssignment(input: {
  teacher_id: string;
  academic_period_id: string;
  academic_level_id: string;
  class_id: string;
  subject_id?: string | null;
  assignment_type: TeacherAssignmentType;
  notes?: string;
}): Promise<TeacherAssignment> {
  ensureConfigured();

  const payload = {
    teacher_id: input.teacher_id,
    academic_period_id: input.academic_period_id,
    academic_level_id: input.academic_level_id,
    class_id: input.class_id,
    subject_id: input.assignment_type === 'subject_teacher' ? input.subject_id || null : null,
    assignment_type: input.assignment_type,
    active: true,
    notes: input.notes?.trim() || null,
  };

  const { data, error } = await supabase
    .from('teacher_assignments')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data as TeacherAssignment;
}

export async function updateTeacherAssignment(
  id: string,
  updates: Partial<Pick<TeacherAssignment, 'teacher_id' | 'academic_level_id' | 'class_id' | 'subject_id' | 'assignment_type' | 'active' | 'notes'>>
): Promise<TeacherAssignment> {
  ensureConfigured();
  const payload: Record<string, unknown> = {};
  Object.entries(updates).forEach(([key, value]) => {
    payload[key] = key === 'notes' ? (typeof value === 'string' ? value.trim() || null : null) : value;
  });

  const { data, error } = await supabase
    .from('teacher_assignments')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as TeacherAssignment;
}

export async function deleteTeacherAssignment(id: string): Promise<void> {
  ensureConfigured();
  const { error } = await supabase
    .from('teacher_assignments')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

