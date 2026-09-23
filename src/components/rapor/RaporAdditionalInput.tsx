import React, { useState } from 'react';
import {
  Calendar,
  Award,
  MessageSquare,
  Plus,
  Trash2,
  Sparkles,
  Check,
  Search,
  User,
} from 'lucide-react';
import { StudentAdditionalInfo, StudentExtracurricular } from '../../types/raporSts';
import { Student } from '../../services/studentStorage';
import { generateTeacherNote } from '../../services/raporStsService';

interface RaporAdditionalInputProps {
  students: Student[];
  additionalInfo: Record<string, StudentAdditionalInfo>;
  onUpdateAdditionalInfo: (updated: Record<string, StudentAdditionalInfo>) => void;
}

const PRESET_MOTIVATION_NOTES = [
  'Ananda menunjukkan kedisiplinan dan sopan santun yang sangat baik. Tingkatkan terus minat membaca dan keaktifan bertanya di kelas.',
  'Alhamdulillah Ananda mampu mengikuti pembelajaran dengan antusias. Pertahankan hafalan Al-Qur\'an dan semangat belajarnya.',
  'Ananda memiliki kepedulian yang tinggi terhadap teman dan lingkungan. Tingkatkan fokus dan ketelitian saat menyelesaikan tugas mandiri.',
  'Ananda sangat aktif dan kreatif dalam pembelajaran. Tetap rendah hati, tekun beribadah, dan istiqomah dalam menuntut ilmu.',
  'Prestasi Ananda pada tengah semester ini sangat membanggakan. Terus asah bakat dan jangan lelah untuk belajar hal-hal baru.',
];

export const RaporAdditionalInput: React.FC<RaporAdditionalInputProps> = ({
  students,
  additionalInfo,
  onUpdateAdditionalInfo,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    students[0]?.id || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  const currentStudent = students.find((s) => s.id === selectedStudentId) || students[0];

  const currentInfo: StudentAdditionalInfo = additionalInfo[currentStudent?.id] || {
    studentId: currentStudent?.id || '',
    attendance: { sakit: 0, izin: 0, alpha: 0 },
    extracurriculars: [
      { id: 'ekstra_1', name: 'Pramuka', predicate: 'Baik', description: 'Aktif dan disiplin dalam kegiatan kepramukaan.' },
    ],
    teacherNotes: 'Tingkatkan terus semangat belajar dan pertahankan akhlak terpuji.',
  };

  const handleUpdateCurrent = (updates: Partial<StudentAdditionalInfo>) => {
    if (!currentStudent) return;
    const updated: Record<string, StudentAdditionalInfo> = {
      ...additionalInfo,
      [currentStudent.id]: {
        ...currentInfo,
        ...updates,
      },
    };
    onUpdateAdditionalInfo(updated);
  };

  const handleAttendanceChange = (field: 'sakit' | 'izin' | 'alpha', val: string) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    handleUpdateCurrent({
      attendance: {
        ...currentInfo.attendance,
        [field]: num,
      },
    });
  };

  const handleAddEkstra = () => {
    const newEkstra: StudentExtracurricular = {
      id: `ekstra_${Date.now()}`,
      name: 'Tahfidz Al-Qur\'an',
      predicate: 'Sangat Baik',
      description: 'Mencapai target hafalan dan kelancaran tajwid dengan tartil.',
    };
    handleUpdateCurrent({
      extracurriculars: [...(currentInfo.extracurriculars || []), newEkstra],
    });
  };

  const handleUpdateEkstra = (id: string, updates: Partial<StudentExtracurricular>) => {
    const updated = (currentInfo.extracurriculars || []).map((ek) => {
      if (ek.id !== id) return ek;
      return { ...ek, ...updates };
    });
    handleUpdateCurrent({ extracurriculars: updated });
  };

  const handleDeleteEkstra = (id: string) => {
    const filtered = (currentInfo.extracurriculars || []).filter((ek) => ek.id !== id);
    handleUpdateCurrent({ extracurriculars: filtered });
  };

  // Auto-generate note for the selected student
  const handleAutoGenerateNoteForCurrent = () => {
    if (!currentStudent) return;
    const note = generateTeacherNote(currentStudent.name, 85, 4, 4);
    handleUpdateCurrent({ teacherNotes: note });
    setNotification(`Catatan motivasi untuk ${currentStudent.name} berhasil dibuat!`);
    setTimeout(() => setNotification(null), 2500);
  };

  // Auto-generate note for ALL students
  const handleAutoGenerateNotesForAll = () => {
    const updated: Record<string, StudentAdditionalInfo> = { ...additionalInfo };
    students.forEach((st) => {
      const existing = updated[st.id] || {
        studentId: st.id,
        attendance: { sakit: 0, izin: 0, alpha: 0 },
        extracurriculars: [
          {
            id: `ek_${st.id}_1`,
            name: 'Pramuka',
            predicate: 'Baik',
            description: 'Aktif dan berakhlak baik dalam kegiatan kepramukaan.',
          },
        ],
        teacherNotes: '',
      };
      const note = generateTeacherNote(st.name, 85, 4, 4);
      updated[st.id] = {
        ...existing,
        teacherNotes: note,
      };
    });
    onUpdateAdditionalInfo(updated);
    setNotification(`Berhasil membuat catatan guru otomatis untuk seluruh ${students.length} siswa!`);
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredStudents = students.filter((st) =>
    st.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="space-y-6">
      {notification && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-md">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Student Selector Sidebar */}
        <div className="lg:col-span-4 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Daftar Siswa ({students.length})
            </h3>
          </div>

          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari siswa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="space-y-1.5 max-h-[550px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredStudents.map((st) => {
              const isSelected = st.id === currentStudent?.id;
              const info = additionalInfo[st.id];
              const totalAbsen = (info?.attendance?.sakit || 0) + (info?.attendance?.izin || 0) + (info?.attendance?.alpha || 0);

              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSelectedStudentId(st.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-400/50 text-white shadow-lg shadow-amber-500/10'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold truncate">{st.name}</p>
                      <p className="text-[10px] text-slate-500">NIS: {st.nim || '-'}</p>
                    </div>
                  </div>

                  {totalAbsen > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                      Absen: {totalAbsen}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Editor for Selected Student */}
        {currentStudent ? (
          <div className="lg:col-span-8 space-y-6">
            {/* Header info */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                  Data Pelengkap Rapor Siswa
                </span>
                <h2 className="text-base sm:text-lg font-black text-white">
                  {currentStudent.name}
                </h2>
                <p className="text-xs text-slate-400">
                  NIS: {currentStudent.nim || '-'} | NISN: {currentStudent.nisn || '-'}
                </p>
              </div>

              <div className="text-right hidden sm:block">
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                  Data Tersinkron
                </span>
              </div>
            </div>

            {/* Attendance Section */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800 pb-3">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Ketidakhadiran (Absensi Siswa)</span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Sakit (Hari)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={currentInfo.attendance?.sakit ?? 0}
                    onChange={(e) => handleAttendanceChange('sakit', e.target.value)}
                    className="w-full text-center py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-bold text-amber-300 focus:outline-none focus:border-amber-400 no-spin-button [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Izin (Hari)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={currentInfo.attendance?.izin ?? 0}
                    onChange={(e) => handleAttendanceChange('izin', e.target.value)}
                    className="w-full text-center py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-bold text-sky-300 focus:outline-none focus:border-sky-400 no-spin-button [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Tanpa Keterangan (Hari)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={currentInfo.attendance?.alpha ?? 0}
                    onChange={(e) => handleAttendanceChange('alpha', e.target.value)}
                    className="w-full text-center py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-bold text-rose-300 focus:outline-none focus:border-rose-400 no-spin-button [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
            </div>

            {/* Extracurricular Section */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Award className="w-4 h-4 text-purple-400" />
                  <span>Kegiatan Ekstrakurikuler</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddEkstra}
                  className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Tambah Ekstra</span>
                </button>
              </div>

              <div className="space-y-3">
                {(currentInfo.extracurriculars || []).length === 0 ? (
                  <p className="text-xs text-slate-500 italic text-center py-3">
                    Belum ada ekstrakurikuler yang ditambahkan.
                  </p>
                ) : (
                  (currentInfo.extracurriculars || []).map((ek) => (
                    <div
                      key={ek.id}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <input
                          type="text"
                          value={ek.name}
                          onChange={(e) => handleUpdateEkstra(ek.id, { name: e.target.value })}
                          placeholder="Nama Ekstrakurikuler (misal: Pramuka, Tahfidz)"
                          className="text-xs font-bold text-white bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-lg flex-1 focus:outline-none focus:border-purple-400"
                        />

                        <select
                          value={ek.predicate}
                          onChange={(e) =>
                            handleUpdateEkstra(ek.id, {
                              predicate: e.target.value as any,
                            })
                          }
                          className="text-xs font-bold bg-slate-900 border border-slate-700 text-purple-300 px-2.5 py-1 rounded-lg focus:outline-none focus:border-purple-400 cursor-pointer"
                        >
                          <option value="Sangat Baik">Sangat Baik</option>
                          <option value="Baik">Baik</option>
                          <option value="Cukup">Cukup</option>
                          <option value="Kurang">Kurang</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleDeleteEkstra(ek.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={ek.description}
                        onChange={(e) =>
                          handleUpdateEkstra(ek.id, { description: e.target.value })
                        }
                        placeholder="Keterangan / capaian siswa dalam ekstrakurikuler ini"
                        className="w-full text-xs text-slate-300 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-purple-400"
                      />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Teacher Notes / Motivasi Section */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                  <span>Catatan Wali Kelas / Motivasi Guru</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoGenerateNoteForCurrent}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                    title="Buat catatan otomatis khusus untuk siswa ini"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Auto Catatan Siswa Ini</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAutoGenerateNotesForAll}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                    title="Isi otomatis catatan untuk seluruh siswa di kelas ini"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Auto Catatan Semua Siswa</span>
                  </button>
                </div>
              </div>

              <textarea
                rows={3}
                value={currentInfo.teacherNotes || ''}
                onChange={(e) => handleUpdateCurrent({ teacherNotes: e.target.value })}
                placeholder="Tuliskan catatan apresiasi, motivasi, dan evaluasi guru untuk siswa..."
                className="w-full text-xs text-slate-100 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl p-3 focus:outline-none leading-relaxed resize-none"
              />

              {/* Preset Notes Picker */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Pilih Rekomendasi Catatan Otomatis:</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_MOTIVATION_NOTES.map((note, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleUpdateCurrent({ teacherNotes: note })}
                      className="text-left text-[10.5px] p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                    >
                      "{note}"
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-8 p-12 text-center text-slate-400 text-xs">
            Pilih siswa untuk mengedit data ketidakhadiran, ekstrakurikuler, dan catatan guru.
          </div>
        )}
      </div>
    </div>
  );
};
