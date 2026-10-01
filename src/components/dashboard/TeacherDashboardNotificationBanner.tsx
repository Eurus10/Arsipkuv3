import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  Printer,
  AlertCircle,
  MessageSquare,
  CheckCircle2,
  Megaphone,
  ArrowRight,
  X,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  CheckCheck,
  RotateCcw,
} from 'lucide-react';
import { TeacherUser, NavTab } from '../../types';
import { TeacherNotificationItem } from '../../types/teacherNotificationTypes';
import {
  subscribeToTeacherNotifications,
  markTeacherNotificationRead,
  markAllTeacherNotificationsRead,
} from '../../services/teacherNotificationService';
import { AnalysisSubmissionItem } from '../../types/analysisSubmissionTypes';
import {
  subscribeToAnalysisSubmissions,
  getLocalAnalysisSubmissions,
} from '../../services/analysisSubmissionService';
import { AnalysisSubmissionChatModal } from '../analysis/AnalysisSubmissionChatModal';

const DISMISSED_STORAGE_KEY = 'sdit_dismissed_notifications_v1';

function getDismissedIds(): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

function saveDismissedId(id: string): void {
  try {
    const current = getDismissedIds();
    if (!current.includes(id)) {
      const updated = [id, ...current].slice(0, 100);
      localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (err) {
    console.error('Failed to save dismissed notification id:', err);
  }
}

interface TeacherDashboardNotificationBannerProps {
  activeTeacher: TeacherUser | null;
  isAdmin?: boolean;
  onNavigate: (tab: NavTab) => void;
  onOpenRaporSts?: () => void;
}

/**
 * Custom hook to aggregate notifications from BOTH:
 * 1. teacher_notifications collection (broadcasts, direct announcements)
 * 2. analysis_submissions collection (real-time revision notes, admin chat messages, and print completions)
 */
function useUnifiedTeacherNotifications(
  activeTeacher: TeacherUser | null,
  isAdmin: boolean = false
) {
  const [explicitNotifs, setExplicitNotifs] = useState<TeacherNotificationItem[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<AnalysisSubmissionItem[]>(() =>
    getLocalAnalysisSubmissions()
  );
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => getDismissedIds());

  // 1. Subscribe to teacher_notifications collection
  useEffect(() => {
    const unsubscribe = subscribeToTeacherNotifications(
      activeTeacher?.id,
      activeTeacher?.name,
      (items) => {
        setExplicitNotifs(items);
      }
    );
    return () => unsubscribe();
  }, [activeTeacher?.id, activeTeacher?.name]);

  // 2. Subscribe to analysis_submissions collection (Real-time live sync)
  useEffect(() => {
    const unsubscribe = subscribeToAnalysisSubmissions((items) => {
      setAllSubmissions(items);
    });
    return () => unsubscribe();
  }, []);

  // 3. Synthesize derived notifications from analysis submissions
  const derivedSubNotifs = useMemo<TeacherNotificationItem[]>(() => {
    if (!activeTeacher && !isAdmin) return [];

    const teacherNameClean = (activeTeacher?.name || '').trim().toLowerCase();
    const teacherIdClean = (activeTeacher?.id || '').trim().toLowerCase();

    // Filter submissions belonging to this teacher
    const teacherSubs = allSubmissions.filter((sub) => {
      if (isAdmin) return false; // Admin has different inbox
      if (teacherIdClean && sub.teacherId && sub.teacherId.toLowerCase() === teacherIdClean) {
        return true;
      }
      if (teacherNameClean && sub.teacherName) {
        const subName = sub.teacherName.toLowerCase();
        if (subName.includes(teacherNameClean) || teacherNameClean.includes(subName)) {
          return true;
        }
      }
      return false;
    });

    const results: TeacherNotificationItem[] = [];

    teacherSubs.forEach((sub) => {
      const formattedTime = sub.updatedAt || sub.submittedAt || new Date().toISOString();

      // A. REVISION ALERT: Status berkas 'revisi'
      if (sub.status === 'revisi') {
        results.push({
          id: `sub-rev-${sub.id}`,
          title: `⚠️ Catatan Revisi: ${sub.subjectName} (${sub.className})`,
          message:
            sub.adminNote && sub.adminNote.trim()
              ? `Catatan Pak Zaki: "${sub.adminNote.trim()}"`
              : 'Pak Zaki meminta revisi untuk lembar analisis ini. Silakan periksa kembali kelengkapan skor.',
          type: 'revision',
          submissionId: sub.id,
          subjectName: sub.subjectName,
          className: sub.className,
          createdAt: formattedTime,
          linkAction: 'discussion',
        });
      }

      // B. INDIVIDUAL SUBJECT STATUS ALERTS (Revisi atau Print per Mapel)
      if (sub.subjectStatuses) {
        Object.entries(sub.subjectStatuses).forEach(([sName, sStat]) => {
          if (sStat.status === 'revisi' && sub.status !== 'revisi') {
            results.push({
              id: `sub-rev-mapel-${sub.id}-${sName}`,
              title: `⚠️ Revisi Mapel ${sName} (${sub.className})`,
              message:
                sStat.revisionNote && sStat.revisionNote.trim()
                  ? `Catatan Pak Zaki: "${sStat.revisionNote.trim()}"`
                  : `Pak Zaki meminta revisi khusus untuk mapel ${sName}.`,
              type: 'revision',
              submissionId: sub.id,
              subjectName: sName,
              className: sub.className,
              createdAt: sStat.lastSubmittedAt || formattedTime,
              linkAction: 'discussion',
            });
          } else if (sStat.status === 'telah_diprint') {
            results.push({
              id: `sub-prt-mapel-${sub.id}-${sName}`,
              title: `🖨️ Soal ${sName} Selesai Dicetak`,
              message: `Berkas fisik soal ${sName} (${sub.className}) telah selesai dicetak di ruang TU oleh Pak Zaki. Silakan ambil di meja TU.`,
              type: 'print',
              submissionId: sub.id,
              subjectName: sName,
              className: sub.className,
              createdAt: sStat.printedAt || formattedTime,
              linkAction: 'analysis',
            });
          }
        });
      }

      // C. RECENT CHAT MESSAGES FROM ADMIN (Pak Zaki)
      if (sub.messages && sub.messages.length > 0) {
        // Find latest admin non-system message
        const adminMsgs = sub.messages.filter(
          (m) => m.senderRole === 'admin' && !m.isSystem && m.text.trim()
        );
        if (adminMsgs.length > 0) {
          const latestAdminMsg = adminMsgs[adminMsgs.length - 1];
          results.push({
            id: `sub-msg-${sub.id}-${latestAdminMsg.id}`,
            title: `💬 Pesan Baru dari Pak Zaki`,
            message: `Di setoran ${sub.subjectName} (${sub.className}): "${latestAdminMsg.text}"`,
            type: 'chat',
            submissionId: sub.id,
            subjectName: sub.subjectName,
            className: sub.className,
            adminSenderName: latestAdminMsg.senderName,
            createdAt: new Date(latestAdminMsg.timestamp).toISOString(),
            linkAction: 'discussion',
          });
        }
      }

      // D. OVERALL PRINTED ALERT (Jika seluruh sesi telah dicetak dan bukan per-mapel)
      if (sub.status === 'telah_diprint' && (!sub.subjectStatuses || Object.keys(sub.subjectStatuses).length <= 1)) {
        results.push({
          id: `sub-prt-${sub.id}`,
          title: `🖨️ Soal ${sub.subjectName} Selesai Dicetak`,
          message: `Berkas fisik lembar analisis & soal ${sub.subjectName} (${sub.className}) telah selesai dicetak di ruang TU.`,
          type: 'print',
          submissionId: sub.id,
          subjectName: sub.subjectName,
          className: sub.className,
          createdAt: formattedTime,
          linkAction: 'analysis',
        });
      }

      // E. APPROVED ALERT
      if (sub.status === 'disetujui') {
        results.push({
          id: `sub-app-${sub.id}`,
          title: `✓ Analisis ${sub.subjectName} Disetujui`,
          message: `Lembar analisis ${sub.subjectName} (${sub.className}) telah diverifikasi dan disetujui Pak Zaki.`,
          type: 'approved',
          submissionId: sub.id,
          subjectName: sub.subjectName,
          className: sub.className,
          createdAt: formattedTime,
          linkAction: 'analysis',
        });
      }
    });

    return results;
  }, [allSubmissions, activeTeacher, isAdmin]);

  // Combine both sources, remove duplicates, and apply read / dismissed flags
  const combinedNotifications = useMemo<TeacherNotificationItem[]>(() => {
    const map = new Map<string, TeacherNotificationItem>();

    // Add derived notifications first
    derivedSubNotifs.forEach((n) => {
      map.set(n.id, {
        ...n,
        isRead: dismissedIds.includes(n.id),
      });
    });

    // Add explicit notifications (overriding or supplementing)
    explicitNotifs.forEach((n) => {
      map.set(n.id, {
        ...n,
        isRead: n.isRead || dismissedIds.includes(n.id),
      });
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [derivedSubNotifs, explicitNotifs, dismissedIds]);

  const dismissNotification = (id: string) => {
    saveDismissedId(id);
    setDismissedIds((prev) => (prev.includes(id) ? prev : [id, ...prev]));
    markTeacherNotificationRead(id);
  };

  const dismissAll = () => {
    combinedNotifications.forEach((n) => saveDismissedId(n.id));
    setDismissedIds(combinedNotifications.map((n) => n.id));
    markAllTeacherNotificationsRead(activeTeacher?.id, activeTeacher?.name);
  };

  return {
    notifications: combinedNotifications,
    dismissNotification,
    dismissAll,
  };
}

export const TeacherDashboardNotificationBanner: React.FC<
  TeacherDashboardNotificationBannerProps
> = ({ activeTeacher, isAdmin = false, onNavigate, onOpenRaporSts }) => {
  const { notifications, dismissNotification } = useUnifiedTeacherNotifications(
    activeTeacher,
    isAdmin
  );

  const [activeChatSubmission, setActiveChatSubmission] =
    useState<AnalysisSubmissionItem | null>(null);
  const [isChatModalOpen, setIsChatModalOpen] = useState<boolean>(false);

  // Find the top unread, high-priority notification to show as prominent banner
  const unreadNotifications = useMemo(() => {
    return notifications.filter((n) => !n.isRead);
  }, [notifications]);

  const topNotification = useMemo(() => {
    if (unreadNotifications.length === 0) return null;
    return unreadNotifications[0];
  }, [unreadNotifications]);

  if (!topNotification) return null;

  const handleActionClick = (notif: TeacherNotificationItem) => {
    dismissNotification(notif.id);

    if (notif.linkAction === 'discussion' && notif.submissionId) {
      const allSubs = getLocalAnalysisSubmissions();
      const foundSub = allSubs.find((s) => s.id === notif.submissionId);
      if (foundSub) {
        setActiveChatSubmission(foundSub);
        setIsChatModalOpen(true);
        return;
      }
    }

    if (notif.linkAction === 'rapor') {
      if (onOpenRaporSts) onOpenRaporSts();
      else onNavigate('rapor_sts');
      return;
    }

    // Default: navigate to soal / analisis
    onNavigate('soal');
  };

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dismissNotification(id);
  };

  // Determine styling based on notification type
  const isPrint = topNotification.type === 'print';
  const isRevision = topNotification.type === 'revision';
  const isChat = topNotification.type === 'chat';
  const isApproved = topNotification.type === 'approved';
  const isAnnouncement = topNotification.type === 'announcement';

  const cardBorderClass = isRevision
    ? 'border-rose-500/60 bg-gradient-to-r from-rose-950/50 via-slate-900/95 to-slate-900/95 shadow-rose-950/40'
    : isPrint
    ? 'border-cyan-500/60 bg-gradient-to-r from-cyan-950/50 via-slate-900/95 to-slate-900/95 shadow-cyan-950/40'
    : isChat
    ? 'border-indigo-500/60 bg-gradient-to-r from-indigo-950/50 via-slate-900/95 to-slate-900/95 shadow-indigo-950/40'
    : isApproved
    ? 'border-emerald-500/60 bg-gradient-to-r from-emerald-950/50 via-slate-900/95 to-slate-900/95 shadow-emerald-950/40'
    : 'border-amber-500/60 bg-gradient-to-r from-amber-950/50 via-slate-900/95 to-slate-900/95 shadow-amber-950/40';

  const iconBgClass = isRevision
    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
    : isPrint
    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
    : isChat
    ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40'
    : isApproved
    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
    : 'bg-amber-500/20 text-amber-400 border-amber-500/40';

  return (
    <>
      <div
        className={`mb-6 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border shadow-xl backdrop-blur-md transition-all animate-[fadeIn_200ms_ease-out] relative overflow-hidden group ${cardBorderClass}`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 shadow-lg ${iconBgClass}`}
            >
              {isRevision && <AlertCircle className="w-5 h-5 animate-pulse" />}
              {isPrint && <Printer className="w-5 h-5 animate-bounce" />}
              {isChat && <MessageSquare className="w-5 h-5" />}
              {isApproved && <CheckCircle2 className="w-5 h-5" />}
              {isAnnouncement && <Megaphone className="w-5 h-5" />}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    isRevision
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      : isPrint
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                      : isChat
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                      : isApproved
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {isRevision
                    ? '⚠️ Perlu Revisi Analisis'
                    : isPrint
                    ? '🖨️ Soal Selesai Dicetak'
                    : isChat
                    ? '💬 Pesan Diskusi Masuk'
                    : isApproved
                    ? '✓ Analisis Disetujui'
                    : '📢 Pengumuman Rapor & Analisis'}
                </span>

                {unreadNotifications.length > 1 && (
                  <span className="text-[11px] font-extrabold text-slate-400">
                    +{unreadNotifications.length - 1} pemberitahuan lainnya
                  </span>
                )}

                <span className="text-[10px] text-slate-500">
                  {new Date(topNotification.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <h4 className="text-sm sm:text-base font-bold text-white">
                {topNotification.title}
              </h4>

              <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                {topNotification.message}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => handleActionClick(topNotification)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg transition-all cursor-pointer ${
                isRevision
                  ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
                  : isPrint
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20'
                  : isChat
                  ? 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-indigo-500/20'
                  : 'bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-teal-500/20'
              }`}
            >
              <span>
                {topNotification.linkAction === 'discussion'
                  ? 'Balas Diskusi'
                  : topNotification.linkAction === 'rapor'
                  ? 'Buka E-Rapor'
                  : 'Buka Analisis Soal'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={(e) => handleDismiss(topNotification.id, e)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 cursor-pointer transition-all"
              title="Tutup & Tandai Sudah Dibaca"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Direct Chat Modal */}
      {isChatModalOpen && activeChatSubmission && (
        <AnalysisSubmissionChatModal
          isOpen={isChatModalOpen}
          onClose={() => {
            setIsChatModalOpen(false);
            setActiveChatSubmission(null);
          }}
          submission={activeChatSubmission}
          currentUserRole={isAdmin ? 'admin' : 'guru'}
          currentUserName={
            activeTeacher?.name || (isAdmin ? 'Pak Zaki (Admin)' : 'Guru')
          }
        />
      )}
    </>
  );
};

/**
 * Header Notification Bell Component
 * FIXED: Uses fixed overlay viewport positioning so it is NEVER clipped by parent containers or mobile edges!
 */
interface TeacherNotificationBellProps {
  activeTeacher: TeacherUser | null;
  isAdmin?: boolean;
  onNavigate: (tab: NavTab) => void;
  onOpenRaporSts?: () => void;
}

export const TeacherNotificationBell: React.FC<TeacherNotificationBellProps> = ({
  activeTeacher,
  isAdmin = false,
  onNavigate,
  onOpenRaporSts,
}) => {
  const { notifications, dismissNotification, dismissAll } = useUnifiedTeacherNotifications(
    activeTeacher,
    isAdmin
  );

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeChatSubmission, setActiveChatSubmission] =
    useState<AnalysisSubmissionItem | null>(null);
  const [isChatModalOpen, setIsChatModalOpen] = useState<boolean>(false);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const handleItemClick = (notif: TeacherNotificationItem) => {
    dismissNotification(notif.id);
    setIsOpen(false);

    if (notif.linkAction === 'discussion' && notif.submissionId) {
      const allSubs = getLocalAnalysisSubmissions();
      const foundSub = allSubs.find((s) => s.id === notif.submissionId);
      if (foundSub) {
        setActiveChatSubmission(foundSub);
        setIsChatModalOpen(true);
        return;
      }
    }

    if (notif.linkAction === 'rapor') {
      if (onOpenRaporSts) onOpenRaporSts();
      else onNavigate('rapor_sts');
      return;
    }

    onNavigate('soal');
  };

  return (
    <>
      <button
        type="button"
        id="btn-teacher-notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition-all cursor-pointer shadow-md group shrink-0"
        title="Pemberitahuan Setoran & Pesan Rapor"
      >
        <Bell className="w-4 h-4 text-slate-300 group-hover:text-amber-400 transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white font-black text-[10px] flex items-center justify-center border-2 border-slate-900 animate-pulse shadow-md">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Notification Panel: FIXED Positioned to prevent ANY cut-off or clipping */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end p-3 sm:p-6 pointer-events-none animate-[fadeIn_150ms_ease-out]">
          {/* Backdrop for closing */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs pointer-events-auto"
            onClick={() => setIsOpen(false)}
          />

          {/* Floating Dropdown Drawer Container */}
          <div className="relative mt-14 sm:mt-16 w-full max-w-sm sm:max-w-md bg-slate-900/95 border border-slate-700/90 rounded-3xl p-4 sm:p-5 shadow-2xl text-slate-100 space-y-3.5 backdrop-blur-xl pointer-events-auto flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    Pemberitahuan Guru
                  </h4>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold text-rose-400">
                      {unreadCount} pesan belum dibaca
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={dismissAll}
                    className="text-[11px] text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Tandai semua sebagai sudah dibaca"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Tandai Dibaca</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500 space-y-2">
                  <Bell className="w-9 h-9 text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-400">Belum ada pemberitahuan.</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                    Catatan revisi dari Pak Zaki, info soal selesai dicetak, atau pesan diskusi akan otomatis muncul di sini.
                  </p>
                </div>
              ) : (
                notifications.map((n) => {
                  const isPrint = n.type === 'print';
                  const isRevision = n.type === 'revision';
                  const isChat = n.type === 'chat';

                  return (
                    <div
                      key={n.id}
                      onClick={() => handleItemClick(n)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                        !n.isRead
                          ? 'bg-slate-950/80 border-teal-500/40 hover:border-teal-400 shadow-md'
                          : 'bg-slate-950/30 border-white/5 hover:border-white/15 opacity-75'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm">
                            {isRevision ? '⚠️' : isPrint ? '🖨️' : isChat ? '💬' : '📢'}
                          </span>
                          <span className="text-xs font-bold text-white line-clamp-1">
                            {n.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {new Date(n.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed pl-5">
                        {n.message}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Direct Chat Modal */}
      {isChatModalOpen && activeChatSubmission && (
        <AnalysisSubmissionChatModal
          isOpen={isChatModalOpen}
          onClose={() => {
            setIsChatModalOpen(false);
            setActiveChatSubmission(null);
          }}
          submission={activeChatSubmission}
          currentUserRole={isAdmin ? 'admin' : 'guru'}
          currentUserName={
            activeTeacher?.name || (isAdmin ? 'Pak Zaki (Admin)' : 'Guru')
          }
        />
      )}
    </>
  );
};
