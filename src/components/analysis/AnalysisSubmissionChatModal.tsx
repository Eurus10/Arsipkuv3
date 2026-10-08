import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Trash2,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  User,
  Clock,
  Printer,
  AlertCircle,
  CheckCircle2,
  Eraser,
  CornerDownLeft,
} from 'lucide-react';
import {
  AnalysisSubmissionItem,
  SubmissionChatMessage,
} from '../../types/analysisSubmissionTypes';
import {
  sendSubmissionChatMessage,
  deleteSubmissionChatMessage,
  clearSubmissionChatMessages,
} from '../../services/analysisSubmissionService';
import { getActiveTeacherSession } from '../../services/teacherStorage';

interface AnalysisSubmissionChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: AnalysisSubmissionItem | null;
  currentUserRole: 'admin' | 'guru';
  currentUserName: string;
}

export const AnalysisSubmissionChatModal: React.FC<AnalysisSubmissionChatModalProps> = ({
  isOpen,
  onClose,
  submission,
  currentUserRole,
  currentUserName,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const messages: SubmissionChatMessage[] = submission?.messages || [];

  // Auto-scroll to bottom on open or messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scrollToBottom();
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, messages.length]);

  if (!isOpen || !submission) return null;

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!text || isSending) return;

    setIsSending(true);
    try {
      const activeTeacher = getActiveTeacherSession();
      const resolvedSenderName =
        currentUserRole === 'admin'
          ? 'Pak Zaki'
          : activeTeacher?.name || currentUserName || submission.teacherName || 'Guru';

      await sendSubmissionChatMessage(submission.id, {
        senderName: resolvedSenderName,
        senderRole: currentUserRole,
        text,
      });
      setInputText('');
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (confirm('Hapus pesan ini dari riwayat obrolan?')) {
      await deleteSubmissionChatMessage(submission.id, msgId);
    }
  };

  const handleClearHistory = async () => {
    await clearSubmissionChatMessages(submission.id);
    setShowClearConfirm(false);
  };

  // Quick reply shortcuts
  const adminQuickReplies = [
    '🖨️ Sudah diprint, silakan ambil berkas fisik di meja TU.',
    '⚠️ Mohon periksa kembali bobot soal dan kelengkapan nilai.',
    '✅ Format sudah rapi, analisis telah disetujui.',
    '👍 Terima kasih, berkas sudah diterima dengan baik.',
  ];

  const guruQuickReplies = [
    '🔄 Sudah selesai saya perbaiki pak, mohon dicek kembali.',
    '🙏 Siap Pak Zaki, terima kasih banyak informasinya.',
    '📄 Lembar analisis sudah lengkap untuk seluruh siswa.',
    '❓ Pak Zaki, mohon arahan untuk bagian yang perlu disesuaikan.',
  ];

  const quickReplies = currentUserRole === 'admin' ? adminQuickReplies : guruQuickReplies;

  // Status badge config
  const statusConfig = {
    telah_diprint: {
      label: 'Telah di-Print',
      bg: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      icon: Printer,
    },
    disetujui: {
      label: 'Disetujui',
      bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      icon: CheckCircle2,
    },
    revisi: {
      label: 'Perlu Revisi',
      bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      icon: AlertCircle,
    },
    menunggu: {
      label: 'Menunggu Verifikasi',
      bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      icon: Clock,
    },
  }[submission.status] || {
    label: submission.status,
    bg: 'bg-slate-700 text-slate-300 border-slate-600',
    icon: Clock,
  };

  const StatusIcon = statusConfig.icon;

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
    });
  };

  const activeTeacher = getActiveTeacherSession();
  const isAuthorized =
    currentUserRole === 'admin' ||
    !activeTeacher ||
    !submission.teacherId ||
    activeTeacher.id === submission.teacherId ||
    (submission.teacherName &&
      (activeTeacher.name.toLowerCase().includes(submission.teacherName.toLowerCase()) ||
        submission.teacherName.toLowerCase().includes(activeTeacher.name.toLowerCase())));

  if (!isAuthorized) {
    return (
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-[fadeIn_150ms_ease-out]"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="w-full max-w-md bg-slate-900 border border-white/15 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-white">Ruang Diskusi Privat</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ruang obrolan ini bersifat privat antara <strong className="text-white">Pak Zaki (Admin)</strong> dan{' '}
              <strong className="text-emerald-300">{submission.teacherName}</strong>. Guru lain tidak memiliki akses ke percakapan ini.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-[fadeIn_150ms_ease-out]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl bg-slate-900 border border-white/15 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col h-[90vh] max-h-[680px] overflow-hidden">
        {/* ====================================================
            HEADER
            ==================================================== */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-slate-950/80 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0 shadow-[0_0_12px_rgba(99,102,241,0.2)]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-white truncate">
                  {submission.subjectName}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-extrabold border border-indigo-400/30">
                  {submission.className}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 ${statusConfig.bg}`}
                >
                  <StatusIcon className="w-2.5 h-2.5" />
                  {statusConfig.label}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 truncate flex-wrap">
                <span>Guru: <strong className="text-slate-200">{submission.teacherName}</strong></span>
                <span>•</span>
                <span>TP {submission.schoolYear}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold flex items-center gap-1">
                  🔒 Obrolan Privat
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {currentUserRole === 'admin' && (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/10 flex items-center justify-center transition-all cursor-pointer"
                title="Bersihkan seluruh riwayat chat"
              >
                <Eraser className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 flex items-center justify-center transition-all cursor-pointer"
              title="Tutup ruang diskusi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Clear Confirm Banner for Admin */}
        {showClearConfirm && (
          <div className="px-4 py-2.5 bg-rose-950/80 border-b border-rose-500/30 flex items-center justify-between gap-3 text-xs text-rose-200 shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Bersihkan seluruh riwayat percakapan lembar analisis ini?</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleClearHistory}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] cursor-pointer"
              >
                Ya, Bersihkan
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 text-[11px] cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* ====================================================
            MESSAGES THREAD LIST
            ==================================================== */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3 overscroll-contain">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center text-indigo-400">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-slate-300">
                Belum ada percakapan untuk lembar analisis ini.
              </p>
              <p className="text-[11px] text-slate-500 max-w-xs">
                Kirim catatan atau gunakan template pesan cepat di bawah untuk memulai koordinasi antara Guru & Pak Zaki.
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              // 1. SYSTEM MESSAGE / AUDIT LOG
              if (msg.isSystem || msg.senderRole === 'system') {
                return (
                  <div key={msg.id || index} className="flex justify-center my-2">
                    <div className="max-w-[90%] px-3.5 py-1.5 rounded-full bg-slate-950/70 border border-white/10 text-[11px] text-slate-300 shadow-sm flex items-center gap-2 flex-wrap justify-center">
                      <span>{msg.text}</span>
                      <span className="text-[9.5px] text-slate-500 font-mono">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  </div>
                );
              }

              // 2. USER MESSAGES (ADMIN OR GURU)
              const isAdminMsg = msg.senderRole === 'admin';
              const isMyMsg =
                (currentUserRole === 'admin' && isAdminMsg) ||
                (currentUserRole === 'guru' && !isAdminMsg);

              return (
                <div
                  key={msg.id || index}
                  className={`flex items-end gap-2 ${
                    isMyMsg ? 'justify-end' : 'justify-start'
                  } group`}
                >
                  {/* Avatar for other sender */}
                  {!isMyMsg && (
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-bold shrink-0 border ${
                        isAdminMsg
                          ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                          : 'bg-indigo-500/20 border-indigo-400/40 text-indigo-300'
                      }`}
                    >
                      {isAdminMsg ? '👑' : '👩‍🏫'}
                    </div>
                  )}

                  <div className={`max-w-[82%] sm:max-w-[75%] flex flex-col ${isMyMsg ? 'items-end' : 'items-start'}`}>
                    {/* Sender Label & Role Badge */}
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[10.5px]">
                      <span className={`font-bold ${isAdminMsg ? 'text-amber-300' : 'text-indigo-300'}`}>
                        {msg.senderName}
                      </span>
                      <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-white/5 text-slate-400 border border-white/5">
                        {isAdminMsg ? 'Admin' : 'Guru'}
                      </span>
                    </div>

                    {/* Bubble Content */}
                    <div
                      className={`relative px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-md break-words ${
                        isMyMsg
                          ? isAdminMsg
                            ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white rounded-br-none border border-amber-400/30'
                            : 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-br-none border border-indigo-400/30'
                          : isAdminMsg
                          ? 'bg-slate-800/90 text-amber-100 rounded-bl-none border border-amber-500/30'
                          : 'bg-slate-800/90 text-slate-100 rounded-bl-none border border-white/10'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>

                      <div className="flex items-center justify-end gap-1.5 mt-1 pt-1 border-t border-white/10 text-[9.5px] opacity-75 font-mono">
                        <span>{formatDate(msg.timestamp)}, {formatTime(msg.timestamp)}</span>
                      </div>
                    </div>

                    {/* Delete Message Action Button */}
                    {(isMyMsg || currentUserRole === 'admin') && (
                      <button
                        type="button"
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="opacity-0 group-hover:opacity-100 text-[10px] text-slate-500 hover:text-rose-400 mt-0.5 px-1 flex items-center gap-1 transition-all cursor-pointer"
                        title="Hapus pesan ini"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>

                  {/* Avatar for my message */}
                  {isMyMsg && (
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-bold shrink-0 border ${
                        isAdminMsg
                          ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                          : 'bg-indigo-500/20 border-indigo-400/40 text-indigo-300'
                      }`}
                    >
                      {isAdminMsg ? '👑' : '👩‍🏫'}
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ====================================================
            QUICK REPLY CHIPS BAR
            ==================================================== */}
        <div className="px-3.5 py-2 bg-slate-950/60 border-t border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 select-none">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Cepat:
          </span>
          {quickReplies.map((reply, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(reply)}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 text-[11px] text-slate-300 hover:text-white border border-white/10 shrink-0 transition-all cursor-pointer truncate max-w-[220px]"
              title={reply}
            >
              {reply}
            </button>
          ))}
        </div>

        {/* ====================================================
            INPUT FOOTER
            ==================================================== */}
        <div className="p-3 bg-slate-950/90 border-t border-white/10 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  currentUserRole === 'admin'
                    ? 'Ketik catatan atau tanggapan untuk guru...'
                    : 'Ketik pesan balasan untuk Pak Zaki...'
                }
                className="w-full h-11 pl-3.5 pr-9 rounded-xl bg-slate-900 border border-white/15 focus:border-indigo-400 text-xs text-white placeholder:text-slate-500 outline-none transition-all"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono hidden sm:inline">
                ↵
              </span>
            </div>

            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="h-11 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/20 border border-indigo-400/30 cursor-pointer transition-all shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Kirim</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
