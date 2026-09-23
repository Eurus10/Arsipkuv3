import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';
import * as XLSX from 'xlsx';
import {
  Users,
  Search,
  Plus,
  Upload,
  Download,
  FileSpreadsheet,
  Trash2,
  Edit2,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  ShieldCheck,
  Building2,
  Filter,
  Layers,
  Activity,
} from 'lucide-react';
import {
  addStudent,
  deleteStudent,
  subscribeToStudents,
  updateStudent,
  getStoredSchools,
  saveStoredSchool,
  normalizeSchoolName,
  removeStoredSchool,
  deleteStudentsBySchool,
  deleteAllStudents,
  deleteBatchStudents,
  bulkUpsertStudents,
  type BulkImportItem,
  DEFAULT_SCHOOL_NAME,
  type Student,
  cleanNisn,
} from '../services/studentStorage';
import { formatIndonesianDate } from '../utils/dateFormatter';

interface StudentDatabaseViewProps {
  classes?: Array<{
    id: string;
    name: string;
  }>;
}

const StudentDatabaseView: React.FC<
  StudentDatabaseViewProps
> = ({ classes = [] }) => {
  const [students, setStudents] =
    useState<Student[]>([]);

  const [search, setSearch] =
    useState('');

  const [selectedSchool, setSelectedSchool] =
    useState<string>('');

  const [selectedClass, setSelectedClass] =
    useState('');

  const [schoolsList, setSchoolsList] =
    useState<string[]>(() => getStoredSchools());

  const [isAddSchoolModalOpen, setIsAddSchoolModalOpen] =
    useState(false);

  const [newSchoolNameInput, setNewSchoolNameInput] =
    useState('');

  const [isDeleteSchoolModalOpen, setIsDeleteSchoolModalOpen] =
    useState(false);

  const [schoolToDelete, setSchoolToDelete] =
    useState<string>('');

  const [isDeletingSchool, setIsDeletingSchool] =
    useState(false);

  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] =
    useState(false);

  const [isDeletingAll, setIsDeletingAll] =
    useState(false);

  const [deleteAllMode, setDeleteAllMode] =
    useState<'all' | 'filtered'>('all');

  const [studentToDelete, setStudentToDelete] =
    useState<{ id: string; name: string } | null>(null);

  const [isDeletingSingle, setIsDeletingSingle] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [error, setError] =
    useState('');

  const [successMessage, setSuccessMessage] =
    useState('');

  const [showModal, setShowModal] =
    useState(false);

  const [isImportModalOpen, setIsImportModalOpen] =
    useState(false);

  const [isImporting, setIsImporting] =
    useState(false);

  const [importSchoolTarget, setImportSchoolTarget] =
    useState<string>(DEFAULT_SCHOOL_NAME);

  const [editingStudent, setEditingStudent] =
    useState<Student | null>(null);

  const [formName, setFormName] =
    useState('');

  const [formClassId, setFormClassId] =
    useState('');

  const [formSchoolName, setFormSchoolName] =
    useState(DEFAULT_SCHOOL_NAME);

  const [formNim, setFormNim] = useState('');
  const [formNisn, setFormNisn] = useState('');
  const [formTempatLahir, setFormTempatLahir] = useState('');
  const [formTanggalLahir, setFormTanggalLahir] = useState('');
  const [formGender, setFormGender] = useState<'L' | 'P' | ''>('');

  const [isSaving, setIsSaving] =
    useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let activeUnsubscribe: (() => void) | null = null;
    let disposed = false;

    const applyStudents = (data: Student[]) => {
      if (disposed) return;

      setStudents(data);
      setIsLoading(false);
      setIsRefreshing(false);

      const registered = getStoredSchools();
      const fromData = data.map(
        (student) => student.schoolName || DEFAULT_SCHOOL_NAME
      );
      const combined: string[] = [];

      [...registered, ...fromData].forEach((school) => {
        const clean = (school || '').trim();
        if (!clean) return;

        const normalized = normalizeSchoolName(clean, combined);
        if (
          !combined.some(
            (item) => item.toLowerCase() === normalized.toLowerCase()
          )
        ) {
          combined.push(normalized);
        }
      });

      setSchoolsList(combined);
    };

    const handleError = (supabaseError: Error) => {
      if (disposed) return;

      console.error('[StudentDatabaseView] Gagal mengambil data siswa:', supabaseError);
      setError(
        supabaseError?.message ||
          'Gagal mengambil database peserta didik dari Supabase.'
      );
      setIsLoading(false);
      setIsRefreshing(false);
    };

    const subscribe = () => {
      if (disposed) return;

      activeUnsubscribe?.();
      activeUnsubscribe = subscribeToStudents(applyStudents, handleError);
    };

    setIsLoading(true);
    setError('');
    subscribe();

    // Fallback polling setiap 5 detik.
    // Ini membuat UI tetap otomatis diperbarui walaupun Supabase Realtime
    // belum diaktifkan pada publication/table project.
    const autoRefreshInterval = window.setInterval(() => {
      if (disposed) return;
      setIsRefreshing(true);
      subscribe();
    }, 5000);

    return () => {
      disposed = true;
      window.clearInterval(autoRefreshInterval);
      activeUnsubscribe?.();
      activeUnsubscribe = null;
    };
  }, []);

  const filteredStudents =
    useMemo(() => {
      const keyword =
        search.trim().toLowerCase();

      return students.filter(
        (student) => {
          const studentSchool = (student.schoolName || DEFAULT_SCHOOL_NAME).trim();
          const matchesSchool =
            !selectedSchool ||
            studentSchool.toLowerCase() === selectedSchool.toLowerCase();

          const matchesSearch =
            !keyword ||
            student.name
              .toLowerCase()
              .includes(keyword) ||
            studentSchool.toLowerCase().includes(keyword);

          const matchesClass =
            !selectedClass ||
            student.classId.toUpperCase() ===
              selectedClass.toUpperCase();

          return (
            matchesSchool &&
            matchesSearch &&
            matchesClass
          );
        }
      );
    }, [
      students,
      search,
      selectedSchool,
      selectedClass,
    ]);

  const totalStudents = students.length;

  const classStatistics =
    useMemo(() => {
      const result: Record<string, number> = {};
      filteredStudents.forEach((student) => {
        result[student.classId] =
          (result[student.classId] || 0) + 1;
      });
      return result;
    }, [filteredStudents]);

  const handleAddNewSchool = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newSchoolNameInput.trim();
    if (!clean) return;

    const updated = saveStoredSchool(clean);
    setSchoolsList(updated);
    setSelectedSchool(clean);
    setFormSchoolName(clean);
    setImportSchoolTarget(clean);
    setNewSchoolNameInput('');
    setIsAddSchoolModalOpen(false);
    setSuccessMessage(`Sekolah "${clean}" berhasil ditambahkan ke ekosistem.`);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const handleOpenDeleteSchoolModal = (schoolName: string) => {
    setSchoolToDelete(schoolName);
    setIsDeleteSchoolModalOpen(true);
  };

  const handleConfirmDeleteSchool = async () => {
    if (!schoolToDelete) return;
    setIsDeletingSchool(true);
    setError('');
    try {
      const deletedCount = await deleteStudentsBySchool(schoolToDelete);
      setStudents((current) =>
        current.filter(
          (student) =>
            (student.schoolName || DEFAULT_SCHOOL_NAME).toLowerCase() !==
            schoolToDelete.toLowerCase()
        )
      );
      const updatedSchools = removeStoredSchool(schoolToDelete);
      setSchoolsList(updatedSchools);
      if (selectedSchool.toLowerCase() === schoolToDelete.toLowerCase()) {
        setSelectedSchool('');
      }
      setIsDeleteSchoolModalOpen(false);
      setSuccessMessage(`Berhasil menghapus seluruh data sekolah "${schoolToDelete}" (${deletedCount} peserta didik dihapus).`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      console.error('Error deleting school data:', err);
      setError(err?.message || 'Gagal menghapus data sekolah.');
    } finally {
      setIsDeletingSchool(false);
      setSchoolToDelete('');
    }
  };

  const handleDownloadTemplate = () => {
    try {
      const templateData = [
        ['NO', 'NAMA PESERTA DIDIK', 'KELAS', 'SEKOLAH', 'NIM', 'NISN', 'TEMPAT LAHIR', 'TANGGAL LAHIR (DD/MM/YYYY)', 'JENIS KELAMIN (L/P)'],
        [1, 'Ahmad Fauzan', '6A', selectedSchool || DEFAULT_SCHOOL_NAME, '2026001', '0123456789', 'Jakarta', '12/05/2014', 'L'],
        [2, 'Siti Aisyah', '6A', selectedSchool || DEFAULT_SCHOOL_NAME, '2026002', '0123456790', 'Bandung', '25/08/2014', 'P'],
        [3, 'Muhammad Rizki', '6B', selectedSchool || DEFAULT_SCHOOL_NAME, '2026003', '0123456791', 'Bogor', '03/01/2014', 'L'],
        [4, 'Fatimah Zahra', '6B', selectedSchool || DEFAULT_SCHOOL_NAME, '2026004', '0123456792', 'Bekasi', '18/11/2014', 'P'],
      ];

      const ws = XLSX.utils.aoa_to_sheet(templateData);
      ws['!cols'] = [
        { wch: 6 },
        { wch: 32 },
        { wch: 12 },
        { wch: 28 },
        { wch: 14 },
        { wch: 14 },
        { wch: 18 },
        { wch: 22 },
        { wch: 16 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa');
      XLSX.writeFile(wb, 'Template_Import_Data_Siswa.xlsx');

      setSuccessMessage('Template Excel berhasil diunduh dengan kolom NIM, NISN, Tempat/Tgl Lahir, L/P.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Error downloading template:', err);
      setError('Gagal mengunduh template Excel.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setError('');
    setSuccessMessage('');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

      if (json.length < 2) {
        throw new Error('File Excel kosong atau tidak memiliki format yang benar.');
      }

      let nameColIdx = -1;
      let classColIdx = -1;
      let schoolColIdx = -1;
      let nimColIdx = -1;
      let nisnColIdx = -1;
      let tempatColIdx = -1;
      let tglColIdx = -1;
      let genderColIdx = -1;

      // Scan first 10 rows to find the true header row dynamically
      let headerRowIndex = 0;
      let maxScore = -1;

      for (let r = 0; r < Math.min(json.length, 10); r++) {
        const rowArr = json[r];
        if (!Array.isArray(rowArr)) continue;
        const rowStr = rowArr.map((cell: any) => String(cell || '').toLowerCase()).join(' ');
        let score = 0;
        if (rowStr.includes('nama') || rowStr.includes('siswa') || rowStr.includes('peserta')) score += 3;
        if (rowStr.includes('nisn') || rowStr.includes('nis')) score += 3;
        if (rowStr.includes('kelas') || rowStr.includes('rombel')) score += 2;
        if (rowStr.includes('kelamin') || rowStr.includes('gender') || rowStr.includes('l/p') || rowStr.includes('jk')) score += 2;
        if (rowStr.includes('sekolah') || rowStr.includes('instansi')) score += 1;

        if (score > maxScore && score >= 2) {
          maxScore = score;
          headerRowIndex = r;
        }
      }

      const headerRow = json[headerRowIndex].map((h: any) => String(h || '').trim().toLowerCase());
      
      headerRow.forEach((h: string, idx: number) => {
        const cleanH = h.trim().toLowerCase();
        // Check gender/jenis kelamin FIRST to prevent "jenis" matching "nis"
        if (
          cleanH.includes('kelamin') ||
          cleanH.includes('gender') ||
          cleanH === 'jk' ||
          cleanH.startsWith('jk') ||
          cleanH === 'l/p' ||
          cleanH.includes('l/p') ||
          cleanH.includes('jenis kelamin')
        ) {
          genderColIdx = idx;
        } else if (cleanH.includes('nisn')) {
          nisnColIdx = idx;
        } else if (
          (cleanH === 'nis' || cleanH.startsWith('nis ') || cleanH.endsWith(' nis') || cleanH.includes('nis')) &&
          !cleanH.includes('jenis') &&
          !cleanH.includes('kelamin') &&
          !cleanH.includes('gender')
        ) {
          nisnColIdx = idx;
        } else if (cleanH.includes('nama') || cleanH.includes('peserta') || cleanH.includes('siswa')) {
          nameColIdx = idx;
        } else if (cleanH.includes('kelas') || cleanH.includes('rombel')) {
          classColIdx = idx;
        } else if (cleanH.includes('sekolah') || cleanH.includes('instansi')) {
          schoolColIdx = idx;
        } else if (cleanH.includes('nim')) {
          nimColIdx = idx;
        } else if (cleanH.includes('tempat')) {
          tempatColIdx = idx;
        } else if (
          cleanH.includes('tanggal') ||
          cleanH.includes('tgl') ||
          (cleanH.includes('lahir') && !cleanH.includes('tempat'))
        ) {
          tglColIdx = idx;
        }
      });

      // Secondary check across top rows if nisnColIdx is still -1
      if (nisnColIdx === -1) {
        for (let r = 0; r < Math.min(json.length, 10); r++) {
          if (!Array.isArray(json[r])) continue;
          json[r].forEach((cell: any, cIdx: number) => {
            if (nisnColIdx !== -1) return;
            const cStr = String(cell || '').trim().toLowerCase();
            if (
              (cStr.includes('nisn') || cStr.includes('nis')) &&
              !cStr.includes('jenis') &&
              !cStr.includes('kelamin') &&
              !cStr.includes('nama') &&
              !cStr.includes('gender')
            ) {
              nisnColIdx = cIdx;
            }
          });
        }
      }

      // Fallbacks ONLY if header row was default row 0 and no headers matched
      if (maxScore < 2) {
        if (nameColIdx === -1) nameColIdx = 1;
        if (classColIdx === -1) classColIdx = 2;
        if (schoolColIdx === -1) schoolColIdx = 3;
      }

      // Pre-build O(1) Map indexing for lightning-fast student lookup (instant processing)
      const nisnMap = new Map<string, Student>();
      const nimMap = new Map<string, Student>();
      const nameClassSchoolMap = new Map<string, Student>();

      students.forEach((s) => {
        const cleanN = cleanNisn(s.nisn);
        if (cleanN) nisnMap.set(cleanN.toLowerCase(), s);
        if (s.nim) nimMap.set(s.nim.trim().toLowerCase(), s);
        const sch = normalizeSchoolName(s.schoolName || DEFAULT_SCHOOL_NAME, schoolsList).toLowerCase();
        const key = `${s.name.trim().toLowerCase()}|${s.classId.trim().toUpperCase()}|${sch}`;
        nameClassSchoolMap.set(key, s);
      });

      const bulkItems: BulkImportItem[] = [];

      for (let i = headerRowIndex + 1; i < json.length; i++) {
        const row = json[i];
        if (!row || row.length === 0) continue;

        const rawName = nameColIdx >= 0 ? row[nameColIdx] : row[0];
        if (!rawName) continue;

        const name = String(rawName).trim();
        if (!name) continue;

        const classId = classColIdx >= 0 && row[classColIdx] ? String(row[classColIdx]).trim().toUpperCase() : '6A';
        const rawSchool = schoolColIdx >= 0 && row[schoolColIdx] ? String(row[schoolColIdx]).trim() : (importSchoolTarget || DEFAULT_SCHOOL_NAME);
        const schoolName = normalizeSchoolName(rawSchool, schoolsList);
        saveStoredSchool(schoolName);

        const nim = nimColIdx >= 0 && row[nimColIdx] ? String(row[nimColIdx]).trim() : '';
        const rawNisn = nisnColIdx >= 0 && row[nisnColIdx] ? String(row[nisnColIdx]).trim() : '';
        const nisn = cleanNisn(rawNisn) || '';
        const tempatLahir = tempatColIdx >= 0 && row[tempatColIdx] ? String(row[tempatColIdx]).trim() : '';
        const rawTgl = tglColIdx >= 0 && row[tglColIdx] !== undefined ? row[tglColIdx] : '';
        const tanggalLahir = formatIndonesianDate(rawTgl);
        
        let gender: 'L' | 'P' | undefined = undefined;
        if (genderColIdx >= 0 && row[genderColIdx]) {
          const gStr = String(row[genderColIdx]).trim().toUpperCase();
          if (gStr.startsWith('L') || gStr.includes('LAKI')) gender = 'L';
          else if (gStr.startsWith('P') || gStr.includes('PEREMPUAN')) gender = 'P';
        }

        // Fast O(1) Map lookup
        const nameClassKey = `${name.toLowerCase()}|${classId.toUpperCase()}|${schoolName.toLowerCase()}`;
        const existingStudent = (nisn ? nisnMap.get(nisn.toLowerCase()) : undefined)
          || (nim ? nimMap.get(nim.toLowerCase()) : undefined)
          || nameClassSchoolMap.get(nameClassKey);

        if (existingStudent) {
          // Update existing student: merge new non-empty fields or preserve existing
          const existingNisnClean = cleanNisn(existingStudent.nisn) || '';
          bulkItems.push({
            id: existingStudent.id,
            name,
            classId,
            schoolName,
            nim: nim || existingStudent.nim || '',
            nisn: nisn || existingNisnClean,
            tempatLahir: tempatLahir || existingStudent.tempatLahir || '',
            tanggalLahir: tanggalLahir || existingStudent.tanggalLahir || '',
            gender: gender || existingStudent.gender,
          });
        } else {
          // Add new student
          bulkItems.push({
            name,
            classId,
            schoolName,
            nim,
            nisn,
            tempatLahir,
            tanggalLahir,
            gender,
          });
        }
      }

      const { createdCount, updatedCount } = await bulkUpsertStudents(bulkItems);

      setSuccessMessage(
        `Proses impor selesai! ${updatedCount} data siswa diperbarui/ditimpa, ${createdCount} data siswa baru ditambahkan.`
      );
      setIsImportModalOpen(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setTimeout(() => setSuccessMessage(''), 6000);
    } catch (err: any) {
      console.error('Import error:', err);
      setError(err?.message || 'Gagal memproses file Excel.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmDeleteAll = async () => {
    setIsDeletingAll(true);
    setError('');
    try {
      if (deleteAllMode === 'filtered' && (selectedSchool || selectedClass || search)) {
        const idsToDelete = filteredStudents.map((s) => s.id);
        const count = await deleteBatchStudents(idsToDelete);
        const idsSet = new Set(idsToDelete);
        setStudents((current) =>
          current.filter((student) => !idsSet.has(student.id))
        );
        setSuccessMessage(`Berhasil menghapus ${count} data peserta didik terfilter.`);
      } else {
        const count = await deleteAllStudents();
        setStudents([]);
        setSuccessMessage(`Berhasil membersihkan seluruh database (${count} data peserta didik dihapus).`);
        setSelectedSchool('');
        setSelectedClass('');
        setSearch('');
      }
      setIsDeleteAllModalOpen(false);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      console.error('Delete all error:', err);
      setError(err?.message || 'Gagal menghapus data peserta didik.');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const openAddModal = () => {
    setEditingStudent(null);
    setFormName('');
    setFormClassId(classes[0]?.id || '1A');
    setFormSchoolName(selectedSchool || DEFAULT_SCHOOL_NAME);
    setFormNim('');
    setFormNisn('');
    setFormTempatLahir('');
    setFormTanggalLahir('');
    setFormGender('');
    setError('');
    setShowModal(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setFormName(student.name);
    setFormClassId(student.classId);
    setFormSchoolName(student.schoolName || DEFAULT_SCHOOL_NAME);
    setFormNim(student.nim || '');
    setFormNisn(student.nisn || '');
    setFormTempatLahir(student.tempatLahir || '');
    setFormTanggalLahir(student.tanggalLahir || '');
    setFormGender(student.gender || '');
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setShowModal(false);
    setEditingStudent(null);
    setFormName('');
    setFormClassId('');
    setFormSchoolName(DEFAULT_SCHOOL_NAME);
    setFormNim('');
    setFormNisn('');
    setFormTempatLahir('');
    setFormTanggalLahir('');
    setFormGender('');
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = formName.trim();
    const rawSchool = formSchoolName.trim() || DEFAULT_SCHOOL_NAME;
    const school = normalizeSchoolName(rawSchool, schoolsList);
    saveStoredSchool(school);

    if (!name) {
      setError('Nama peserta didik wajib diisi.');
      return;
    }

    if (!formClassId) {
      setError('Kelas peserta didik wajib dipilih.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const studentPayload = {
        name,
        classId: formClassId,
        schoolName: school,
        nim: formNim.trim(),
        nisn: formNisn.trim(),
        tempatLahir: formTempatLahir.trim(),
        tanggalLahir: formTanggalLahir.trim(),
        gender: formGender || undefined,
      };

      if (editingStudent) {
        await updateStudent(editingStudent.id, studentPayload);

        setStudents((current) =>
          current.map((student) =>
            student.id === editingStudent.id
              ? {
                  ...student,
                  ...studentPayload,
                  nisn: cleanNisn(studentPayload.nisn),
                  gender: studentPayload.gender || undefined,
                  updatedAt: new Date().toISOString(),
                }
              : student
          )
        );
      } else {
        const newId = await addStudent(studentPayload);

        setStudents((current) => [
          ...current,
          {
            id: newId,
            name: studentPayload.name,
            classId: studentPayload.classId.toUpperCase(),
            schoolName: studentPayload.schoolName,
            nim: studentPayload.nim || undefined,
            nisn: cleanNisn(studentPayload.nisn),
            tempatLahir: studentPayload.tempatLahir || undefined,
            tanggalLahir: studentPayload.tanggalLahir || undefined,
            gender: studentPayload.gender || undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);
      }

      closeModal();
    } catch (saveError) {
      console.error('Failed to save student:', saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Gagal menyimpan peserta didik.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (studentId: string, studentName: string) => {
    setStudentToDelete({ id: studentId, name: studentName });
  };

  const handleConfirmDeleteSingle = async () => {
    if (!studentToDelete) return;
    setIsDeletingSingle(true);
    setError('');
    try {
      await deleteStudent(studentToDelete.id);
      setStudents((current) =>
        current.filter((student) => student.id !== studentToDelete.id)
      );
      setSuccessMessage(`Berhasil menghapus peserta didik "${studentToDelete.name}".`);
      setStudentToDelete(null);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (delError: any) {
      console.error('Failed to delete student:', delError);
      setError('Gagal menghapus peserta didik.');
    } finally {
      setIsDeletingSingle(false);
    }
  };

  const getClassName = (classId: string) => {
    const foundClass = classes.find((item) => item.id.toUpperCase() === classId.toUpperCase());
    return foundClass?.name || classId;
  };

  return (
    <div className="space-y-6 text-slate-100 pb-12">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-gradient-to-r from-[#141824] to-[#1B2233] p-6 rounded-[24px] border border-[#242C40] shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-inner">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight font-heading flex items-center gap-2">
              <span>Database Peserta Didik Multi-Sekolah</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-teal-500/20 text-teal-300 border border-teal-500/30">
                Admin Secure
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Pusat data siswa terintegrasi untuk berbagai sekolah, sinkron dengan Generator Analisis Soal dan Rapor.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsAddSchoolModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1D2538] hover:bg-[#252E45] border border-[#2E3954] px-4 py-2.5 text-xs font-bold text-slate-200 transition-all cursor-pointer shadow-md"
          >
            <Building2 className="w-4 h-4 text-cyan-400" />
            <span>+ Tambah Sekolah</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setImportSchoolTarget(selectedSchool || DEFAULT_SCHOOL_NAME);
              setIsImportModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1D2538] hover:bg-[#252E45] border border-[#2E3954] px-4 py-2.5 text-xs font-bold text-slate-200 transition-all cursor-pointer shadow-md"
          >
            <Upload className="w-4 h-4 text-teal-400" />
            <span>Import Excel</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-400 px-4 py-2.5 text-xs font-extrabold text-slate-950 transition-all cursor-pointer shadow-lg shadow-teal-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Siswa</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setDeleteAllMode('all');
              setIsDeleteAllModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-3.5 py-2.5 text-xs font-bold text-rose-300 transition-all cursor-pointer shadow-sm"
            title="Bersihkan halaman / Hapus semua data siswa"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>Hapus Semua Data</span>
          </button>
        </div>
      </div>

      {/* ERROR & SUCCESS ALERTS */}
      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3.5 text-xs font-semibold text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3.5 text-xs font-semibold text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* STATISTICS CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#232B3D] bg-[#141824] p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Siswa ({selectedSchool || 'Semua Sekolah'})
          </div>
          <div className="mt-2 text-3xl font-extrabold text-white">
            {filteredStudents.length}
            {selectedSchool && (
              <span className="text-sm font-normal text-slate-400 ml-2">/ {totalStudents}</span>
            )}
          </div>
          <div className="mt-1 text-[11px] text-teal-400 font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Terhubung Supabase Cloud</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#232B3D] bg-[#141824] p-5 shadow-lg relative overflow-hidden">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Ekosistem Sekolah
          </div>
          <div className="mt-2 text-3xl font-extrabold text-cyan-400">
            {schoolsList.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            sekolah aktif terdaftar
          </div>
        </div>

        {/* 3. Total Rombel Aktif */}
        <div className="rounded-2xl border border-[#232B3D] bg-[#141824] p-5 shadow-lg relative overflow-hidden">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Rombel Aktif
          </div>
          <div className="mt-2 text-3xl font-extrabold text-amber-400">
            {Object.keys(classStatistics).length}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            rombel kelas terisi data
          </div>
        </div>

        {/* 4. Status Sinkronisasi */}
        <div className="rounded-2xl border border-[#232B3D] bg-[#141824] p-5 shadow-lg relative overflow-hidden">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Status Sinkronisasi
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </span>
            <span className="text-xl font-black text-emerald-400 tracking-tight">Real-Time</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-300/80 font-medium flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isRefreshing ? 'Memperbarui data...' : 'Sinkron Otomatis Cloud'}</span>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="rounded-2xl border border-[#232B3D] bg-[#141824] p-4 shadow-lg space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_200px_220px]">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama peserta didik atau nama sekolah..."
              className="w-full rounded-xl border border-[#2A324A] bg-[#10131D] pl-10 pr-4 py-2.5 text-xs text-white outline-none transition focus:border-teal-400"
            />
          </div>

          {/* Filter Sekolah */}
          <div className="relative">
            <select
              value={selectedSchool}
              onChange={(event) => setSelectedSchool(event.target.value)}
              className="w-full rounded-xl border border-[#2A324A] bg-[#10131D] px-3 py-2.5 text-xs font-bold text-cyan-300 outline-none transition focus:border-cyan-400"
            >
              <option value="">Semua Sekolah ({schoolsList.length})</option>
              {schoolsList.map((sch) => (
                <option key={sch} value={sch}>
                  {sch}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Kelas */}
          <div>
            <select
              value={selectedClass}
              onChange={(event) => setSelectedClass(event.target.value)}
              className="w-full rounded-xl border border-[#2A324A] bg-[#10131D] px-3 py-2.5 text-xs font-bold text-white outline-none transition focus:border-teal-400"
            >
              <option value="">Semua Kelas ({classes.length} Rombel)</option>
              {classes.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>
                  Kelas {classItem.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(selectedSchool || selectedClass || search) && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Filter className="w-3 h-3 text-cyan-400" /> Filter Aktif:
            </span>
            {selectedSchool && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                Sekolah: {selectedSchool}
                <button onClick={() => setSelectedSchool('')} className="hover:text-white cursor-pointer ml-1">
                  ×
                </button>
              </span>
            )}
            {selectedClass && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30">
                Kelas: {getClassName(selectedClass)}
                <button onClick={() => setSelectedClass('')} className="hover:text-white cursor-pointer ml-1">
                  ×
                </button>
              </span>
            )}
            {search && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-slate-200">
                Kata kunci: "{search}"
                <button onClick={() => setSearch('')} className="hover:text-white cursor-pointer ml-1">
                  ×
                </button>
              </span>
            )}
            {selectedSchool && (
              <button
                type="button"
                onClick={() => handleOpenDeleteSchoolModal(selectedSchool)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer shadow-sm ml-auto"
                title={`Hapus seluruh data sekolah ${selectedSchool}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Seluruh Data Sekolah Ini</span>
              </button>
            )}
            <button
              onClick={() => {
                setSelectedSchool('');
                setSelectedClass('');
                setSearch('');
              }}
              className={`text-[11px] text-rose-400 hover:text-rose-300 font-bold cursor-pointer ${selectedSchool ? 'ml-2' : 'ml-auto'}`}
            >
              Reset Semua Filter
            </button>
          </div>
        )}
      </div>

      {/* TABLE */}
      <div className="rounded-2xl border border-[#232B3D] bg-[#141824] shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#232B3D] flex items-center justify-between">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Daftar Peserta Didik ({filteredStudents.length} Ditampilkan)
          </div>
          {(selectedClass || selectedSchool) && (
            <button
              onClick={() => {
                setSelectedClass('');
                setSelectedSchool('');
              }}
              className="text-[11px] text-teal-400 hover:text-teal-300 font-bold cursor-pointer"
            >
              Tampilkan Semua
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
            <p className="text-xs text-slate-400">Memuat database peserta didik...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-300">Belum ada peserta didik ditemukan</p>
            <p className="text-xs text-slate-400 max-w-sm">
              {search || selectedClass || selectedSchool
                ? 'Coba ubah kata kunci pencarian atau filter sekolah/kelas Anda.'
                : 'Silakan tambah siswa secara manual atau import melalui file Excel.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#232B3D] bg-[#10131D]/80 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6 w-12">No</th>
                  <th className="py-3.5 px-6">Nama Peserta Didik</th>
                  <th className="py-3.5 px-3 w-28">NIM</th>
                  <th className="py-3.5 px-3 w-36">NISN</th>
                  <th className="py-3.5 px-3 w-16 text-center">L/P</th>
                  <th className="py-3.5 px-4 w-44">Tempat, Tgl Lahir</th>
                  <th className="py-3.5 px-4 w-28">Kelas</th>
                  <th className="py-3.5 px-4 w-44">Sekolah</th>
                  <th className="py-3.5 px-6 w-28 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#20283A] text-xs">
                {filteredStudents.map((student, index) => {
                  const displayNisn = cleanNisn(student.nisn);
                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-[#181F30] transition-colors group"
                    >
                      <td className="py-3.5 px-6 text-slate-400 font-mono">
                        {index + 1}
                      </td>
                      <td className="py-3.5 px-6 font-bold text-white group-hover:text-teal-300 transition-colors">
                        {student.name}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-[11px] text-slate-300">
                        {student.nim || '-'}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-[11px]">
                        {displayNisn ? (
                          <span className="text-cyan-300 font-bold tracking-wide">{displayNisn}</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openEditModal(student)}
                            className="text-[10px] text-amber-400/80 hover:text-amber-300 underline underline-offset-2 italic cursor-pointer"
                            title="Klik untuk isi NISN"
                          >
                            Isi NISN
                          </button>
                        )}
                      </td>
                    <td className="py-3.5 px-3 text-center">
                      {student.gender ? (
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold ${student.gender === 'L' ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30' : 'bg-pink-500/15 text-pink-300 border border-pink-500/30'}`}>
                          {student.gender}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 text-[11px]">
                      {student.tempatLahir || student.tanggalLahir ? (
                        <span>
                          {student.tempatLahir || '-'}{student.tempatLahir && student.tanggalLahir ? ', ' : ''}{formatIndonesianDate(student.tanggalLahir)}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-teal-500/10 text-teal-300 border border-teal-500/20">
                        Kelas {getClassName(student.classId)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        <Building2 className="w-3 h-3 text-cyan-400" />
                        <span>{student.schoolName || DEFAULT_SCHOOL_NAME}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(student)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(student.id, student.name)}
                          className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition-colors cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD NEW SCHOOL MODAL */}
      {isAddSchoolModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsAddSchoolModalOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-[24px] bg-[#141824] border border-[#2A324A] shadow-2xl shadow-black/60 text-slate-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-[#242C40] bg-gradient-to-r from-[#172030] to-[#141824] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Tambah Sekolah Baru
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Daftarkan nama sekolah untuk multi-sekolah
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddSchoolModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewSchool}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Nama Sekolah / Madrasah
                  </label>
                  <input
                    autoFocus
                    type="text"
                    value={newSchoolNameInput}
                    onChange={(e) => setNewSchoolNameInput(e.target.value)}
                    placeholder="Contoh: SD Negeri 01 Pagi / MI Al Hidayah"
                    className="w-full rounded-xl border border-[#2E374E] bg-[#10131D] px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-cyan-400 transition-colors"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Cukup masukkan nama sekolah tanpa perlu NPSN, alamat, atau data rumit lainnya.
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[#242C40] bg-[#11141F] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddSchoolModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Simpan Sekolah</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT EXCEL MODAL */}
      {isImportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsImportModalOpen(false);
          }}
        >
          <div className="w-full max-w-lg rounded-[24px] bg-[#141824] border border-[#2A324A] shadow-2xl shadow-black/60 text-slate-100 overflow-hidden">
            <div className="relative px-6 py-5 border-b border-[#242C40] bg-gradient-to-r from-[#172030] to-[#141824]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight font-heading">
                      Import Database Siswa dari Excel
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Upload file Excel (.xlsx / .xls) berisi daftar nama siswa, kelas, dan sekolah.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Target Sekolah untuk Import */}
              <div className="p-3.5 rounded-xl bg-[#10141F] border border-[#232B3D]">
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Target Sekolah Default (Jika di file Excel kosong):
                </label>
                <select
                  value={importSchoolTarget}
                  onChange={(e) => setImportSchoolTarget(e.target.value)}
                  className="w-full rounded-xl border border-[#2E374E] bg-[#141824] px-3.5 py-2 text-xs font-bold text-cyan-300 outline-none focus:border-cyan-400 transition-colors"
                >
                  {schoolsList.map((sch) => (
                    <option key={sch} value={sch}>
                      {sch}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 rounded-2xl bg-[#10141F] border border-[#232B3D] flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-white mb-1">1. Unduh Template Excel</h4>
                  <p className="text-[11px] text-slate-400">
                    Format 3 kolom sederhana: Nama Siswa, Kelas, dan Sekolah.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-4 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/30 text-teal-300 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer flex-shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Template</span>
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  2. Upload File Excel yang Telah Diisi
                </label>
                <div className="border-2 border-dashed border-[#2E374E] hover:border-teal-400/60 rounded-2xl p-6 text-center bg-[#10131D] transition-colors relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileUpload}
                    disabled={isImporting}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
                  />
                  <div className="flex flex-col items-center justify-center gap-2">
                    {isImporting ? (
                      <>
                        <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
                        <span className="text-xs font-bold text-teal-300">Mengimport data siswa...</span>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div className="text-xs font-bold text-white">
                          Klik untuk memilih file Excel atau seret ke sini
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Format yang didukung: .xlsx, .xls
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#242C40] bg-[#11141F] flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-md rounded-[24px] bg-[#141824] border border-[#2A324A] shadow-2xl shadow-black/60 text-slate-100 overflow-hidden">
            <div className="relative px-6 py-5 border-b border-[#242C40] bg-gradient-to-r from-[#172030] to-[#141824]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    {editingStudent ? 'Edit Peserta Didik' : 'Tambah Peserta Didik Baru'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Lengkapi identitas siswa dan sekolah dengan benar.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSave}>
              <div className="p-6 space-y-3.5 max-h-[75vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Nama Lengkap Peserta Didik <span className="text-rose-400">*</span>
                  </label>
                  <input
                    autoFocus
                    type="text"
                    value={formName}
                    onChange={(event) => setFormName(event.target.value)}
                    placeholder="Contoh: Ahmad Fauzan"
                    className="w-full rounded-xl border border-[#2E374E] bg-[#10131D] px-4 py-2 text-xs font-bold text-white outline-none focus:border-teal-400 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">NIM / Nomor Induk</label>
                    <input
                      type="text"
                      value={formNim}
                      onChange={(e) => setFormNim(e.target.value)}
                      placeholder="Contoh: 2026001"
                      className="w-full rounded-xl border border-[#2E374E] bg-[#10131D] px-3 py-2 text-xs font-medium text-white outline-none focus:border-teal-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">NISN</label>
                    <input
                      type="text"
                      value={formNisn}
                      onChange={(e) => setFormNisn(e.target.value)}
                      placeholder="Contoh: 0123456789"
                      className="w-full rounded-xl border border-[#2E374E] bg-[#10131D] px-3 py-2 text-xs font-medium text-white outline-none focus:border-teal-400 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Jenis Kelamin</label>
                    <select
                      value={formGender}
                      onChange={(e) => setFormGender(e.target.value as any)}
                      className="w-full rounded-xl border border-[#2E374E] bg-[#10131D] px-3 py-2 text-xs font-bold text-white outline-none focus:border-teal-400 transition-colors"
                    >
                      <option value="">-- Pilih L/P --</option>
                      <option value="L">Laki-Laki (L)</option>
                      <option value="P">Perempuan (P)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Kelas / Rombel <span className="text-rose-400">*</span></label>
                    <select
                      value={formClassId}
                      onChange={(event) => setFormClassId(event.target.value)}
                      className="w-full rounded-xl border border-[#2E374E] bg-[#10131D] px-3 py-2 text-xs font-bold text-white outline-none focus:border-teal-400 transition-colors"
                    >
                      <option value="">-- Pilih Kelas --</option>
                      {classes.map((classItem) => (
                        <option key={classItem.id} value={classItem.id}>
                          Kelas {classItem.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Tempat Lahir</label>
                    <input
                      type="text"
                      value={formTempatLahir}
                      onChange={(e) => setFormTempatLahir(e.target.value)}
                      placeholder="Contoh: Jakarta"
                      className="w-full rounded-xl border border-[#2E374E] bg-[#10131D] px-3 py-2 text-xs font-medium text-white outline-none focus:border-teal-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Tanggal Lahir</label>
                    <input
                      type="text"
                      value={formTanggalLahir}
                      onChange={(e) => setFormTanggalLahir(e.target.value)}
                      placeholder="Tgl/Bln/Thn (DD/MM/YYYY)"
                      className="w-full rounded-xl border border-[#2E374E] bg-[#10131D] px-3 py-2 text-xs font-medium text-white outline-none focus:border-teal-400 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Sekolah / Lembaga
                  </label>
                  <select
                    value={formSchoolName}
                    onChange={(event) => setFormSchoolName(event.target.value)}
                    className="w-full rounded-xl border border-[#2E374E] bg-[#10131D] px-4 py-2 text-xs font-bold text-cyan-300 outline-none focus:border-cyan-400 transition-colors"
                  >
                    {schoolsList.map((sch) => (
                      <option key={sch} value={sch}>
                        {sch}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[#242C40] bg-[#11141F] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-teal-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {isSaving
                      ? 'Menyimpan...'
                      : editingStudent
                      ? 'Simpan Perubahan'
                      : 'Tambah Siswa'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE ENTIRE SCHOOL MODAL */}
      {isDeleteSchoolModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isDeletingSchool) {
              setIsDeleteSchoolModalOpen(false);
            }
          }}
        >
          <div className="w-full max-w-md rounded-[24px] bg-[#141824] border border-rose-500/40 shadow-2xl shadow-rose-950/50 text-slate-100 overflow-hidden animate-scale-up">
            <div className="relative px-6 py-5 border-b border-[#242C40] bg-gradient-to-r from-rose-950/40 via-[#181D2A] to-[#141824]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Hapus Seluruh Data Sekolah
                  </h3>
                  <p className="text-xs text-rose-300/90 mt-0.5">
                    Tindakan ini permanen dan tidak dapat dibatalkan.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-200 leading-relaxed">
                Anda akan menghapus seluruh data peserta didik yang terdaftar pada sekolah:
                <div className="font-extrabold text-sm text-white mt-1.5 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  <span>{schoolToDelete}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-2">
                  Nama sekolah juga akan dihapus dari daftar pilihan ekosistem multi-sekolah.
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#242C40] bg-[#11141F] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteSchoolModalOpen(false)}
                disabled={isDeletingSchool}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleConfirmDeleteSchool}
                disabled={isDeletingSchool}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeletingSchool && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {isDeletingSchool ? 'Menghapus Semua Data...' : 'Ya, Hapus Semua Data Sekolah Ini'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE ALL / CLEANUP MODAL */}
      {isDeleteAllModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isDeletingAll) {
              setIsDeleteAllModalOpen(false);
            }
          }}
        >
          <div className="w-full max-w-lg rounded-[24px] bg-[#141824] border border-rose-500/40 shadow-2xl shadow-rose-950/50 text-slate-100 overflow-hidden animate-scale-up">
            <div className="relative px-6 py-5 border-b border-[#242C40] bg-gradient-to-r from-rose-950/50 via-[#181D2A] to-[#141824]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Bersihkan / Hapus Data Peserta Didik
                  </h3>
                  <p className="text-xs text-rose-300/90 mt-0.5">
                    Fitur pembersihan cepat untuk mengosongkan atau menghapus sebagian data.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-xs font-bold text-slate-300 mb-2">
                Pilih cakupan data yang ingin dihapus:
              </div>

              <div className="space-y-2.5">
                <label
                  onClick={() => setDeleteAllMode('all')}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    deleteAllMode === 'all'
                      ? 'bg-rose-500/15 border-rose-500/50 text-white'
                      : 'bg-[#10131D] border-[#2A324A] text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="deleteMode"
                    checked={deleteAllMode === 'all'}
                    onChange={() => setDeleteAllMode('all')}
                    className="mt-0.5 accent-rose-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-rose-300">
                      Hapus Seluruh Database Siswa ({students.length} Siswa)
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Menghapus semua peserta didik dari seluruh sekolah dan kelas. Database akan kembali bersih (0 siswa).
                    </div>
                  </div>
                </label>

                {(selectedSchool || selectedClass || search) && (
                  <label
                    onClick={() => setDeleteAllMode('filtered')}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      deleteAllMode === 'filtered'
                        ? 'bg-amber-500/15 border-amber-500/50 text-white'
                        : 'bg-[#10131D] border-[#2A324A] text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="deleteMode"
                      checked={deleteAllMode === 'filtered'}
                      onChange={() => setDeleteAllMode('filtered')}
                      className="mt-0.5 accent-amber-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-amber-300">
                        Hanya Data Terfilter ({filteredStudents.length} Siswa)
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Menghapus data siswa yang saat ini tampil di tabel
                        {selectedSchool ? ` (${selectedSchool})` : ''}
                        {selectedClass ? ` (Kelas ${getClassName(selectedClass)})` : ''}.
                      </div>
                    </div>
                  </label>
                )}
              </div>

              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-[11px] text-rose-200 leading-relaxed flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>
                  <b>Peringatan:</b> Tindakan ini permanen dan langsung tersinkronkan ke cloud Supabase.
                </span>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#242C40] bg-[#11141F] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteAllModalOpen(false)}
                disabled={isDeletingAll}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleConfirmDeleteAll}
                disabled={isDeletingAll}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeletingAll && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {isDeletingAll
                    ? 'Menghapus Data...'
                    : deleteAllMode === 'all'
                    ? `Ya, Hapus Seluruh Database (${students.length} Siswa)`
                    : `Ya, Hapus Data Terfilter (${filteredStudents.length} Siswa)`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE SINGLE STUDENT MODAL */}
      {studentToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isDeletingSingle) {
              setStudentToDelete(null);
            }
          }}
        >
          <div className="w-full max-w-md rounded-[24px] bg-[#141824] border border-rose-500/40 shadow-2xl text-slate-100 overflow-hidden animate-scale-up">
            <div className="px-6 py-5 border-b border-[#242C40] bg-gradient-to-r from-rose-950/50 via-[#181D2A] to-[#141824] flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Hapus Peserta Didik</h3>
                <p className="text-xs text-rose-300/90 mt-0.5">Konfirmasi penghapusan data siswa</p>
              </div>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-300">
              <p>
                Apakah Anda yakin ingin menghapus data peserta didik{' '}
                <strong className="text-white font-bold">{studentToDelete.name}</strong> dari database?
              </p>
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-[11px] text-rose-200">
                Tindakan ini permanen dan akan menghapus data siswa dari cloud Supabase.
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#242C40] bg-[#11141F] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                disabled={isDeletingSingle}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSingle}
                disabled={isDeletingSingle}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeletingSingle && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isDeletingSingle ? 'Menghapus...' : 'Ya, Hapus Siswa Ini'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDatabaseView;
