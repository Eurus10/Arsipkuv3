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
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { StudentAdditionalInfo, StudentExtracurricular, RaporStsClassData } from '../../types/raporSts';
import { Student } from '../../services/studentStorage';
import { generateTeacherNote, generateAiTeacherNotes } from '../../services/raporStsService';

interface RaporAdditionalInputProps {
  students: Student[];
  additionalInfo: Record<string, StudentAdditionalInfo>;
  onUpdateAdditionalInfo: (updated: Record<string, StudentAdditionalInfo>) => void;
  classData?: RaporStsClassData | null;
}

export const RaporAdditionalInput: React.FC<RaporAdditionalInputProps> = ({
  students,
  additionalInfo,
  onUpdateAdditionalInfo,
  classData,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    students[0]?.id || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);

  const currentStudent = students.find((s) => s.id === selectedStudentId) || students[0];

  const currentInfo: StudentAdditionalInfo = additionalInfo[currentStudent?.id] || {
    studentId: currentStudent?.id || '',
    attendance: { sakit: 0, izin: 0, alpha: 0 },
    extracurriculars: [
      { id: 'ekstra_1', name: 'Pramuka', predicate: 'Baik', description: 'Aktif dan disiplin dalam kegiatan kepramukaan.' },
    ],
    teacherNotes: 'Tingkatkan terus semangat belajar dan pertahankan akhlak terpuji.',
  };

  // Helper to calculate student's average score, remedial count, and total subjects
  const getStudentMetrics = (studentId: string) => {
    if (!classData || !classData.subjects || !classData.subjectRecords) {
      return { averageScore: 0, remedialCount: 0, totalSubjects: 0 };
    }
    let totalScore = 0;
    let scoreCount = 0;
    let remedialCount = 0;
    const passingGrade = classData.config?.passingGrade || 75;

    classData.subjects.forEach((subj) => {
      const rec = classData.subjectRecords[subj.id]?.scores[studentId];
      const score = rec?.finalScore ?? rec?.stsScore ?? null;
      if (typeof score === 'number' && !isNaN(score)) {
        totalScore += score;
        scoreCount++;
        if (score < passingGrade) {
          remedialCount++;
        }
      }
    });

    const averageScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;
    return { averageScore, remedialCount, totalSubjects: scoreCount };
  };

  // Helper to extract student's passed vs remedial subject lists
  const getStudentSubjectsStatus = (studentId: string) => {
    const achievedTps: string[] = [];
    const unachievedTps: string[] = [];
    if (classData && classData.subjects && classData.subjectRecords) {
      const passingGrade = classData.config?.passingGrade || 75;
      classData.subjects.forEach((subj) => {
        const rec = classData.subjectRecords[subj.id]?.scores[studentId];
        const score = rec?.finalScore ?? rec?.stsScore ?? null;
        if (typeof score === 'number' && !isNaN(score)) {
          if (score >= passingGrade) {
            achievedTps.push(subj.name);
          } else {
            unachievedTps.push(subj.name);
          }
        }
      });
    }
    return { achievedTps, unachievedTps };
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

  const metrics = currentStudent ? getStudentMetrics(currentStudent.id) : { averageScore: 0, remedialCount: 0, totalSubjects: 0 };
  const currentAvgScore = metrics.averageScore;
  const currentRemedialCount = metrics.remedialCount;

  // Generate personalized dynamic recommendations based on student's name, average score, and remedial count
  const getDynamicRecommendations = (name: string, avgScore: number, remedialCount: number): string[] => {
    const firstName = name.split(' ')[0] || name;
    
    if (remedialCount > 0) {
      return [
        `Ananda ${firstName} memiliki potensi belajar yang baik, namun masih perlu meningkatkan ketelitian dan mengulang materi pada ${remedialCount} mata pelajaran yang belum tuntas. Tetap semangat!`,
        `Alhamdulillah, secara umum perkembangan belajar ananda ${firstName} cukup baik. Mari tingkatkan fokus, latihan mandiri, dan semangat beribadah agar seluruh mata pelajaran dapat tuntas optimal.`,
        `Ananda ${firstName} memiliki kemampuan yang bagus, namun perlu pendampingan dan keseriusan belajar untuk menuntaskan materi remedial di kelas. Terus berikhtiar dan jangan mudah menyerah.`,
      ];
    } else if (avgScore >= 88) {
      return [
        `Alhamdulillah, ananda ${firstName} berhasil meraih prestasi yang sangat luar biasa di tengah semester ini dengan nilai rata-rata ${avgScore}. Pertahankan ketekunan, ibadah, dan akhlak muliamu!`,
        `Masya Allah, ananda ${firstName} menunjukkan penguasaan materi yang sangat istimewa dengan nilai rata-rata ${avgScore}. Tetaplah rendah hati dan terus menjadi inspirasi kebaikan bagi teman-teman.`,
        `Alhamdulillah, pencapaian belajar ananda ${firstName} sangat membanggakan (rata-rata ${avgScore}). Semoga Allah Swt senantiasa memberkahi semangat belajarmu yang tinggi.`,
      ];
    } else if (avgScore >= 75) {
      return [
        `Alhamdulillah, ananda ${firstName} telah mencapai kompetensi pembelajaran dengan baik, meraih rata-rata nilai ${avgScore}. Terus tingkatkan keaktifan dan konsistensi belajarmu.`,
        `Ananda ${firstName} menunjukkan perkembangan belajar yang positif dengan rata-rata nilai ${avgScore}. Senantiasa istiqomah dalam ibadah dan terus berikhtiar melakukan yang terbaik.`,
        `Capaian belajar ananda ${firstName} sudah tuntas dengan baik (rata-rata ${avgScore}). Tingkatkan latihan mandiri agar pemahaman materi pembelajaran semakin mendalam.`,
      ];
    } else if (avgScore > 0) {
      return [
        `Ananda ${firstName} memiliki potensi yang baik dengan rata-rata nilai ${avgScore}. Perbanyak mengulang materi di rumah dan jangan ragu untuk aktif bertanya di kelas. Tetap semangat!`,
        `Terus semangat belajar untuk ananda ${firstName}, rata-rata nilai ${avgScore} menunjukkan masih ada ruang untuk berkembang. Dengan bimbingan intensif dan ketekunan, insya Allah ananda pasti bisa lebih baik.`,
        `Ananda ${firstName} perlu meningkatkan kedisiplinan belajar dan kefokusan saat menyelesaikan tugas mandiri. Guru dan orang tua senantiasa mendampingi untuk hasil yang optimal.`,
      ];
    } else {
      return [
        `Tingkatkan kedisiplinan dan semangat belajar ananda ${firstName} dalam setiap kegiatan pembelajaran agar mencapai hasil yang optimal.`,
        `Mari tingkatkan konsentrasi belajar dan keaktifan ananda ${firstName} di kelas. Semoga di paruh semester berikutnya hasil belajar semakin meningkat.`,
        `Ananda ${firstName} memiliki potensi besar. Dengan niat yang ikhlas dan kedisiplinan yang konsisten, insya Allah ananda akan meraih pencapaian yang lebih baik.`,
      ];
    }
  };

  const dynamicRecommendations = currentStudent
    ? getDynamicRecommendations(currentStudent.name, currentAvgScore, currentRemedialCount)
    : [];

  // Auto-generate note using real Gemini AI or smart fallback
  const handleAutoGenerateNoteForCurrent = async () => {
    if (!currentStudent) return;
    setIsGeneratingAi(true);
    try {
      const { averageScore, remedialCount, totalSubjects } = getStudentMetrics(currentStudent.id);
      const { achievedTps, unachievedTps } = getStudentSubjectsStatus(currentStudent.id);
      
      const notes = await generateAiTeacherNotes({
        students: [
          {
            studentId: currentStudent.id,
            studentName: currentStudent.name,
            stsScore: averageScore,
            passingGrade: classData?.config?.passingGrade || 75,
            totalTps: totalSubjects,
            achievedTps: achievedTps,
            unachievedTps: unachievedTps,
          }
        ],
        className: classData?.config?.classLevel,
        semester: classData?.config?.semester,
        schoolYear: classData?.config?.schoolYear,
      });

      const note = notes[currentStudent.id] || generateTeacherNote(currentStudent.name, averageScore, achievedTps.length, totalSubjects);
      handleUpdateCurrent({ teacherNotes: note });
      setNotification(`Catatan motivasi AI untuk ${currentStudent.name} berhasil dibuat!`);
    } catch (err) {
      console.warn('Gemini AI note generation failed, using local generator:', err);
      const { averageScore, totalSubjects } = getStudentMetrics(currentStudent.id);
      const { achievedTps } = getStudentSubjectsStatus(currentStudent.id);
      const note = generateTeacherNote(currentStudent.name, averageScore, achievedTps.length, totalSubjects);
      handleUpdateCurrent({ teacherNotes: note });
      setNotification(`Catatan motivasi untuk ${currentStudent.name} berhasil dibuat!`);
    } finally {
      setIsGeneratingAi(false);
      setTimeout(() => setNotification(null), 2500);
    }
  };

  // Auto-generate note for ALL students using real Gemini AI or smart fallback
  const handleAutoGenerateNotesForAll = async () => {
    setIsGeneratingAi(true);
    try {
      const studentInputs = students.map((st) => {
        const { averageScore, remedialCount, totalSubjects } = getStudentMetrics(st.id);
        const { achievedTps, unachievedTps } = getStudentSubjectsStatus(st.id);
        return {
          studentId: st.id,
          studentName: st.name,
          stsScore: averageScore,
          passingGrade: classData?.config?.passingGrade || 75,
          totalTps: totalSubjects,
          achievedTps: achievedTps,
          unachievedTps: unachievedTps,
        };
      });

      const notes = await generateAiTeacherNotes({
        students: studentInputs,
        className: classData?.config?.classLevel,
        semester: classData?.config?.semester,
        schoolYear: classData?.config?.schoolYear,
      });

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
        const { averageScore, totalSubjects } = getStudentMetrics(st.id);
        const { achievedTps } = getStudentSubjectsStatus(st.id);
        const note = notes[st.id] || generateTeacherNote(st.name, averageScore, achievedTps.length, totalSubjects);
        updated[st.id] = {
          ...existing,
          teacherNotes: note,
        };
      });

      onUpdateAdditionalInfo(updated);
      setNotification(`Berhasil membuat catatan guru AI untuk seluruh ${students.length} siswa!`);
    } catch (err) {
      console.warn('Batch Gemini AI notes failed, using local generator fallback:', err);
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
        const { averageScore, totalSubjects } = getStudentMetrics(st.id);
        const { achievedTps } = getStudentSubjectsStatus(st.id);
        const note = generateTeacherNote(st.name, averageScore, achievedTps.length, totalSubjects);
        updated[st.id] = {
          ...existing,
          teacherNotes: note,
        };
      });
      onUpdateAdditionalInfo(updated);
      setNotification(`Berhasil membuat catatan guru otomatis untuk seluruh ${students.length} siswa!`);
    } finally {
      setIsGeneratingAi(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const filteredStudents = students.filter((st) =>
    st.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="space-y-4">
      {notification && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-md">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Mobile Student Dropdown Selector (< LG) */}
        <div className="block lg:hidden col-span-1 border border-white/[0.08] bg-[#07111E] p-3 sm:p-3.5 rounded-2xl shadow-lg space-y-2">
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-xs font-bold text-white">Pilih Siswa:</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-400/30 bg-amber-500/10 text-amber-300 font-semibold">
              {filteredStudents.length} Siswa
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Prev Student Button */}
            <button
              type="button"
              disabled={!currentStudent || filteredStudents.findIndex((s) => s.id === currentStudent.id) <= 0}
              onClick={() => {
                const currIdx = filteredStudents.findIndex((s) => s.id === currentStudent?.id);
                if (currIdx > 0) {
                  setSelectedStudentId(filteredStudents[currIdx - 1].id);
                }
              }}
              className="w-9 h-9 rounded-xl border border-white/[0.08] bg-[#0A1626] hover:bg-[#0D1C30] text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shrink-0 transition-all cursor-pointer active:scale-95"
              title="Siswa Sebelumnya"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>

            {/* Student Dropdown */}
            <div className="relative flex-1 min-w-0">
              <select
                value={currentStudent?.id || ''}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full h-9 pl-3 pr-8 rounded-xl border border-amber-500/40 bg-[#0A1626] text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 appearance-none cursor-pointer truncate"
              >
                {filteredStudents.map((st, index) => (
                  <option key={st.id} value={st.id} className="bg-slate-900 text-white font-medium">
                    [{index + 1}] {st.name} {st.nisn ? `(${st.nisn})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-amber-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Next Student Button */}
            <button
              type="button"
              disabled={!currentStudent || filteredStudents.findIndex((s) => s.id === currentStudent.id) >= filteredStudents.length - 1}
              onClick={() => {
                const currIdx = filteredStudents.findIndex((s) => s.id === currentStudent?.id);
                if (currIdx >= 0 && currIdx < filteredStudents.length - 1) {
                  setSelectedStudentId(filteredStudents[currIdx + 1].id);
                }
              }}
              className="w-9 h-9 rounded-xl border border-white/[0.08] bg-[#0A1626] hover:bg-[#0D1C30] text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shrink-0 transition-all cursor-pointer active:scale-95"
              title="Siswa Selanjutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Kiri: Student Selector Sidebar (Desktop ONLY >= LG) */}
        <div className="hidden lg:block lg:col-span-3 space-y-2">
          <div className="flex items-center justify-between mb-1.5">
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
              className="w-full h-9 pl-9 pr-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredStudents.map((st) => {
              const isSelected = st.id === currentStudent?.id;
              const info = additionalInfo[st.id];
              const totalAbsen = (info?.attendance?.sakit || 0) + (info?.attendance?.izin || 0) + (info?.attendance?.alpha || 0);
              const { averageScore, remedialCount } = getStudentMetrics(st.id);

              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSelectedStudentId(st.id)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-400/50 text-white shadow-lg shadow-amber-500/10'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate min-w-0 pr-1">
                      <p className="text-xs font-bold truncate">{st.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-slate-500 truncate">NIS: {st.nim || '-'}</span>
                        <span className="text-slate-600 text-[9px]">•</span>
                        {remedialCount > 0 ? (
                          <span className="text-[10px] font-bold text-rose-400">
                            Remedial: {remedialCount}
                          </span>
                        ) : (
                          <span className={`text-[10px] font-bold ${
                            averageScore >= 88 
                              ? 'text-emerald-400' 
                              : averageScore >= 75 
                                ? 'text-amber-400' 
                                : averageScore > 0 
                                  ? 'text-rose-400' 
                                  : 'text-slate-500'
                          }`}>
                            Rata-rata: {averageScore > 0 ? averageScore : '-'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {totalAbsen > 0 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 flex-shrink-0">
                      Absen: {totalAbsen}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tengah & Kanan Editor for Selected Student */}
        {currentStudent ? (
          <>
            {/* Tengah: Form untuk guru menulis catatan */}
            <div className="lg:col-span-5 space-y-4">
              {/* Header info */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-400">
                    Data Pelengkap Rapor Siswa
                  </span>
                  <h2 className="text-sm sm:text-base font-black text-white truncate max-w-[250px]">
                    {currentStudent.name}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    NIS: {currentStudent.nim || '-'} | NISN: {currentStudent.nisn || '-'}
                  </p>
                </div>
              </div>

              {/* Teacher Notes / Motivasi Section */}
              <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2.5 gap-2">
                  <div className="flex items-center gap-2 text-white font-bold text-xs">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                    <span>Catatan Wali Kelas / Motivasi Guru</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isGeneratingAi}
                      onClick={handleAutoGenerateNoteForCurrent}
                      className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Buat catatan otomatis menggunakan Gemini AI untuk siswa ini"
                    >
                      {isGeneratingAi ? (
                        <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3 text-amber-400" />
                      )}
                      <span>AI Catatan</span>
                    </button>

                    <button
                      type="button"
                      disabled={isGeneratingAi}
                      onClick={handleAutoGenerateNotesForAll}
                      className="px-2 py-1 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 text-[10px] font-black flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Isi otomatis catatan seluruh siswa dengan Gemini AI"
                    >
                      {isGeneratingAi ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      <span>AI Semua</span>
                    </button>
                  </div>
                </div>

                <textarea
                  rows={4}
                  value={currentInfo.teacherNotes || ''}
                  onChange={(e) => handleUpdateCurrent({ teacherNotes: e.target.value })}
                  placeholder="Tuliskan catatan apresiasi, motivasi, dan evaluasi guru untuk siswa..."
                  className="w-full text-xs text-slate-100 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl p-3 focus:outline-none leading-relaxed resize-none"
                />

                {/* Preset Notes Picker */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    {currentRemedialCount > 0 ? (
                      <span>Rekomendasi Catatan Remedial ({currentRemedialCount} Mapel Belum Tuntas):</span>
                    ) : (
                      <span>Rekomendasi Catatan Otomatis (Rata-rata: {currentAvgScore}):</span>
                    )}
                  </span>
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                    {dynamicRecommendations.map((note, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleUpdateCurrent({ teacherNotes: note })}
                        className="text-left w-full text-[10px] p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer leading-relaxed"
                      >
                        "{note}"
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Kanan: Informasi absensi dan ekskul */}
            <div className="lg:col-span-4 space-y-4">
              {/* Attendance Section */}
              <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-white font-bold text-xs border-b border-slate-800 pb-2">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ketidakhadiran (Absensi Akhir Semester)</span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="space-y-1 text-center">
                    <label className="text-[10px] font-semibold text-slate-300">
                      Sakit (Hari)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={currentInfo.attendance?.sakit ?? 0}
                      onChange={(e) => handleAttendanceChange('sakit', e.target.value)}
                      className="w-full text-center py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-400 no-spin-button [appearance:textfield]"
                    />
                  </div>

                  <div className="space-y-1 text-center">
                    <label className="text-[10px] font-semibold text-slate-300">
                      Izin (Hari)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={currentInfo.attendance?.izin ?? 0}
                      onChange={(e) => handleAttendanceChange('izin', e.target.value)}
                      className="w-full text-center py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-sky-300 focus:outline-none focus:border-sky-400 no-spin-button [appearance:textfield]"
                    />
                  </div>

                  <div className="space-y-1 text-center">
                    <label className="text-[10px] font-semibold text-slate-300">
                      Alpha (Hari)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={currentInfo.attendance?.alpha ?? 0}
                      onChange={(e) => handleAttendanceChange('alpha', e.target.value)}
                      className="w-full text-center py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-rose-300 focus:outline-none focus:border-rose-400 no-spin-button [appearance:textfield]"
                    />
                  </div>
                </div>
              </div>

              {/* Extracurricular Section */}
              <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-white font-bold text-xs">
                    <Award className="w-3.5 h-3.5 text-purple-400" />
                    <span>Ekstrakurikuler</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddEkstra}
                    className="px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer transition-colors"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>Tambah</span>
                  </button>
                </div>

                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                  {(currentInfo.extracurriculars || []).length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic text-center py-2">
                      Belum ada ekskul.
                    </p>
                  ) : (
                    (currentInfo.extracurriculars || []).map((ek) => (
                      <div
                        key={ek.id}
                        className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <input
                            type="text"
                            value={ek.name}
                            onChange={(e) => handleUpdateEkstra(ek.id, { name: e.target.value })}
                            placeholder="Nama Ekskul (Pramuka, dll)"
                            className="text-[11px] font-bold text-white bg-slate-900 border border-slate-700 px-2 py-0.5 rounded flex-1 focus:outline-none focus:border-purple-400 min-w-0"
                          />

                          <select
                            value={ek.predicate}
                            onChange={(e) =>
                              handleUpdateEkstra(ek.id, {
                                predicate: e.target.value as any,
                              })
                            }
                            className="text-[10px] font-bold bg-slate-900 border border-slate-700 text-purple-300 px-1.5 py-0.5 rounded focus:outline-none cursor-pointer"
                          >
                            <option value="Sangat Baik">Sangat Baik</option>
                            <option value="Baik">Baik</option>
                            <option value="Cukup">Cukup</option>
                            <option value="Kurang">Kurang</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleDeleteEkstra(ek.id)}
                            className="p-0.5 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        <input
                          type="text"
                          value={ek.description}
                          onChange={(e) =>
                            handleUpdateEkstra(ek.id, { description: e.target.value })
                          }
                          placeholder="Keterangan pencapaian"
                          className="w-full text-[10px] text-slate-300 bg-slate-900 border border-slate-800 px-2 py-1 rounded focus:outline-none focus:border-purple-400"
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Informative Notice Box */}
              <div className="p-3.5 rounded-2xl bg-amber-500/[0.03] border border-amber-500/20 flex items-start gap-2.5">
                <span className="text-amber-400 text-xs shrink-0 mt-0.5">ℹ️</span>
                <p className="text-[10px] text-slate-400 leading-relaxed font-normal">
                  <strong>Catatan Akhir Semester:</strong> Absensi & Ekskul di atas diinput khusus untuk keperluan Akhir Semester Genap/Ganjil dan disembunyikan secara otomatis pada cetakan <strong>Rapor STS (Tengah Semester)</strong>.
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="lg:col-span-9 p-12 text-center text-slate-400 text-xs">
            Pilih siswa untuk mengedit data ketidakhadiran, ekstrakurikuler, dan catatan guru.
          </div>
        )}
      </div>
    </div>
  );
};
