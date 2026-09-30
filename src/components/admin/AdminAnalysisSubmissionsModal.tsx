import React, { useState, useEffect, useMemo } from 'react';
import {
  Inbox,
  X,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  FileSpreadsheet,
  Users,
  GraduationCap,
  Calendar,
  MessageSquare,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Coffee,
  Check,
  Printer,
} from 'lucide-react';
import {
  AnalysisSubmissionItem,
  AnalysisSubmissionStatus,
} from '../../types/analysisSubmissionTypes';
import {
  subscribeToAnalysisSubmissions,
  updateAnalysisSubmissionStatus,
  deleteAnalysisSubmission,
} from '../../services/analysisSubmissionService';
import {
  exportSingleSubjectToExcel,
  exportMultiClassSubjectToExcel,
  exportAnalysisProjectToExcel,
} from '../../services/analysis/analysisExcelService';
import { getStoredStudentsLocal } from '../../services/studentStorage';
import { MASTER_CLASSES } from '../../data/masterExamData';
import { AnalysisSubmissionChatModal } from '../analysis/AnalysisSubmissionChatModal';

interface AdminAnalysisSubmissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminAnalysisSubmissionsModal: React.FC<AdminAnalysisSubmissionsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [submissions, setSubmissions] = useState<AnalysisSubmissionItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | AnalysisSubmissionStatus>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<AnalysisSubmissionItem | null>(null);
  const [chatSubmission, setChatSubmission] = useState<AnalysisSubmissionItem | null>(null);
  const [showChatModal, setShowChatModal] = useState<boolean>(false);
  const [revisionNote, setRevisionNote] = useState<string>('');
  const [showRevisionModal, setShowRevisionModal] = useState<boolean>(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = subscribeToAnalysisSubmissions((items) => {
      setSubmissions(items);
    });
    return () => unsubscribe();
  }, [isOpen]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      // Status filter
      if (statusFilter !== 'all' && sub.status !== statusFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = sub.teacherName.toLowerCase().includes(q);
        const matchSubject = sub.subjectName.toLowerCase().includes(q);
        const matchClass = sub.className.toLowerCase().includes(q);
        if (!matchName && !matchSubject && !matchClass) return false;
      }

      return true;
    });
  }, [submissions, statusFilter, searchQuery]);

  const pendingCount = useMemo(() => {
    return submissions.filter((s) => s.status === 'menunggu').length;
  }, [submissions]);

  if (!isOpen) return null;

  const handleApprove = async (sub: AnalysisSubmissionItem) => {
    try {
      await updateAnalysisSubmissionStatus(sub.id, 'disetujui');
      setActionSuccessMsg(`Setoran ${sub.subjectName} (${sub.className}) telah disetujui.`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Failed to approve submission:', err);
    }
  };

  const handleMarkPrinted = async (sub: AnalysisSubmissionItem) => {
    try {
      await updateAnalysisSubmissionStatus(sub.id, 'telah_diprint');
      setActionSuccessMsg(`Setoran ${sub.subjectName} (${sub.className}) ditandai: Telah di-Print.`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Failed to mark submission as printed:', err);
    }
  };

  const handleOpenRevision = (sub: AnalysisSubmissionItem) => {
    setSelectedSubmission(sub);
    setRevisionNote(sub.adminNote || '');
    setShowRevisionModal(true);
  };

  const handleSubmitRevision = async () => {
    if (!selectedSubmission) return;
    try {
      await updateAnalysisSubmissionStatus(
        selectedSubmission.id,
        'revisi',
        revisionNote.trim() || 'Mohon periksa kembali kelengkapan skor siswa.'
      );
      setShowRevisionModal(false);
      setSelectedSubmission(null);
      setActionSuccessMsg('Catatan revisi telah disimpan untuk guru.');
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Failed to update revision status:', err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Hapus setoran analisis "${name}" dari daftar?`)) return;
    try {
      await deleteAnalysisSubmission(id);
      setActionSuccessMsg('Setoran berhasil dihapus.');
      setTimeout(() => setActionSuccessMsg(null), 2500);
    } catch (err) {
      console.error('Failed to delete submission:', err);
    }
  };

  const handleDownloadExcel = (sub: AnalysisSubmissionItem) => {
    try {
      const payload = sub.payload;
      if (!payload) {
        alert('Data payload berkas tidak tersedia.');
        return;
      }

      if (payload.mode === 'single_class' || sub.submissionType === 'single_class') {
        if (payload.activeClassSession && payload.activeSubjectInSession) {
          const studentsForClass =
            payload.activeClassStudents && payload.activeClassStudents.length > 0
              ? payload.activeClassStudents
              : getStoredStudentsLocal().filter(
                  (s) => s.classId.toLowerCase() === sub.classId.toLowerCase()
                );

          exportSingleSubjectToExcel(
            payload.activeClassSession,
            payload.activeSubjectInSession,
            studentsForClass
          );
          return;
        }
      }

      if (payload.mode === 'multi_class' || sub.submissionType === 'multi_class') {
        const storedStudents = getStoredStudentsLocal();
        exportMultiClassSubjectToExcel({
          subjectName: payload.subjectName || sub.subjectName,
          teacherName: payload.teacherName || sub.teacherName,
          examType: payload.examType || sub.examType,
          schoolYear: payload.schoolYear || sub.schoolYear,
          kktp: payload.kktp || sub.kktp,
          classSessionsMap: payload.classSessionsMap || {},
          allStudents:
            payload.allStudents && payload.allStudents.length > 0
              ? payload.allStudents
              : storedStudents,
          masterClasses:
            payload.masterClasses && payload.masterClasses.length > 0
              ? payload.masterClasses
              : MASTER_CLASSES,
          selectedClassIds: payload.selectedClassIds || [sub.classId],
        });
        return;
      }

      if (payload.session) {
        const studentsToUse =
          payload.students && payload.students.length > 0
            ? payload.students
            : getStoredStudentsLocal().filter(
                (s) => s.classId.toLowerCase() === (payload.session.classId || '').toLowerCase()
              );
        exportAnalysisProjectToExcel(payload.session, studentsToUse);
        return;
      }

      alert('Format berkas tidak dikenali untuk ekspor langsung.');
    } catch (err) {
      console.error('Failed to download Excel for submission:', err);
      alert('Gagal mengunduh Excel setoran.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 bg-slate-950/90 backdrop-blur-md animate-[fadeIn_150ms_ease-out]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl bg-slate-900 border border-[#2A3044] rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 text-slate-100 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-white/10 gap-3 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-500/20 to-emerald-500/20 border border-teal-500/30 text-teal-400 flex items-center justify-center shadow-lg shadow-teal-500/10 shrink-0">
              <Inbox className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">Setoran Analisis Guru</h3>
                {pendingCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-extrabold border border-amber-500/30">
                    {pendingCount} Menunggu
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Kotak masuk lembar analisis soal yang disetorkan guru langsung ke Pak Zaki
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action success alert */}
        {actionSuccessMsg && (
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2 shrink-0">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama guru, mata pelajaran, atau kelas..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950/70 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500/50"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-white/10 shrink-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-teal-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Semua ({submissions.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('menunggu')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'menunggu'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Menunggu ({submissions.filter((s) => s.status === 'menunggu').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('disetujui')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'disetujui'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Disetujui ({submissions.filter((s) => s.status === 'disetujui').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('telah_diprint')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'telah_diprint'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Telah di-Print ({submissions.filter((s) => s.status === 'telah_diprint').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('revisi')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'revisi'
                  ? 'bg-rose-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Revisi ({submissions.filter((s) => s.status === 'revisi').length})
            </button>
          </div>
        </div>

        {/* Submissions List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          {filteredSubmissions.length === 0 ? (
            <div className="p-12 text-center bg-slate-950/40 rounded-2xl border border-white/5 space-y-2">
              <Inbox className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-xs font-bold text-slate-400">Belum ada berkas setoran analisis yang cocok.</p>
              <p className="text-[11px] text-slate-500">
                Saat guru menekan tombol "Kirim ke Pak Zaki", berkas analisis soal akan muncul di sini secara otomatis.
              </p>
            </div>
          ) : (
            filteredSubmissions.map((sub) => {
              const formattedDate = new Date(sub.submittedAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={sub.id}
                  className="bg-slate-950/60 border border-white/10 hover:border-teal-500/30 rounded-2xl p-4 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-white/5">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">{sub.subjectName}</span>
                        <span className="px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 text-[10px] font-black">
                          {sub.className}
                        </span>
                        <span className="text-xs text-slate-500">•</span>
                        <span className="text-xs font-semibold text-slate-300">{sub.teacherName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                        <span>{sub.examType}</span>
                        <span>•</span>
                        <span>TA {sub.schoolYear}</span>
                        <span>•</span>
                        <span className="text-slate-500">{formattedDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          sub.status === 'telah_diprint'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : sub.status === 'disetujui'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : sub.status === 'revisi'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {sub.status === 'telah_diprint'
                          ? '🖨️ Telah di-Print'
                          : sub.status === 'disetujui'
                          ? '✓ Disetujui'
                          : sub.status === 'revisi'
                          ? '⚠ Perlu Revisi'
                          : '⏳ Menunggu'}
                      </span>
                    </div>
                  </div>

                  {/* Quick Metrics Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-slate-900/60 p-2 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Peserta Didik:</span>
                      <strong className="text-white">
                        {sub.completedStudents} / {sub.totalStudents} Siswa
                      </strong>
                    </div>

                    <div className="bg-slate-900/60 p-2 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Rata-rata Nilai:</span>
                      <strong className="text-sky-300">{sub.averageGrade ?? '-'}</strong>
                    </div>

                    <div className="bg-slate-900/60 p-2 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Target KKTP:</span>
                      <strong className="text-amber-300">≥ {sub.kktp}</strong>
                    </div>

                    <div className="bg-slate-900/60 p-2 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Tuntas Belajar:</span>
                      <strong className="text-emerald-300">
                        {sub.passedStudents !== undefined ? `${sub.passedStudents} Siswa` : '-'}
                      </strong>
                    </div>
                  </div>

                  {/* Teacher's Note if any */}
                  {sub.teacherNote && (
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-2.5 text-xs text-indigo-200 italic flex items-start gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span>"{sub.teacherNote}"</span>
                    </div>
                  )}

                  {/* Admin's Note if any */}
                  {sub.adminNote && (
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5 text-xs text-rose-200 flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      <span>Catatan Pak Zaki: "{sub.adminNote}"</span>
                    </div>
                  )}

                  {/* Action Buttons for Pak Zaki */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadExcel(sub)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      title="Unduh berkas Excel resmi untuk setoran ini"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Excel</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {sub.status !== 'disetujui' && sub.status !== 'telah_diprint' && (
                        <button
                          type="button"
                          onClick={() => handleApprove(sub)}
                          className="px-3 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 font-bold text-xs border border-teal-500/30 flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Setujui</span>
                        </button>
                      )}

                      {sub.status !== 'telah_diprint' && (
                        <button
                          type="button"
                          onClick={() => handleMarkPrinted(sub)}
                          className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold text-xs border border-cyan-500/30 flex items-center gap-1 cursor-pointer transition-all"
                          title="Tandai berkas fisik analisis ini sudah selesai dicetak"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Telah di-Print</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setChatSubmission(sub);
                          setShowChatModal(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-bold text-xs border border-indigo-500/30 flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                        title="Buka ruang diskusi dan riwayat chat dengan guru"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Diskusi {sub.messages?.length ? `(${sub.messages.length})` : ''}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenRevision(sub)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/30 flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Minta Revisi</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(sub.id, `${sub.subjectName} (${sub.className})`)}
                        className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/10 cursor-pointer transition-all"
                        title="Hapus setoran ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Revision Modal Prompt */}
      {showRevisionModal && selectedSubmission && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-3xl p-5 space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                Catatan Revisi untuk Guru
              </h4>
              <button
                type="button"
                onClick={() => setShowRevisionModal(false)}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Berikan catatan perbaikan untuk{' '}
              <strong className="text-white">{selectedSubmission.teacherName}</strong> (
              {selectedSubmission.subjectName} - {selectedSubmission.className}):
            </p>

            <textarea
              value={revisionNote}
              onChange={(e) => setRevisionNote(e.target.value)}
              placeholder="Contoh: Mohon lengkapi nilai isian untuk 3 siswa yang masih kosong..."
              rows={3}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 resize-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRevisionModal(false)}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmitRevision}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer"
              >
                Simpan & Tandai Revisi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Submission Chat Modal */}
      <AnalysisSubmissionChatModal
        isOpen={showChatModal}
        onClose={() => {
          setShowChatModal(false);
          setChatSubmission(null);
        }}
        submission={
          submissions.find((s) => s.id === chatSubmission?.id) || chatSubmission
        }
        currentUserRole="admin"
        currentUserName="Pak Zaki (Admin)"
      />
    </div>
  );
};
