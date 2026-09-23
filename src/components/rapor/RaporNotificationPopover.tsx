import React, { useEffect, useRef } from 'react';
import {
  Bell,
  AlertTriangle,
  Info,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export interface RaporNotificationItem {
  id: string;
  type: 'warning' | 'info' | 'success' | 'alert';
  title: string;
  subtitle?: string;
  description: string;
  timestamp?: string;
  classId?: string;
  actionLabel?: string;
}

interface RaporNotificationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: RaporNotificationItem[];
  onSelectNotification?: (item: RaporNotificationItem) => void;
}

export const RaporNotificationPopover: React.FC<RaporNotificationPopoverProps> = ({
  isOpen,
  onClose,
  notifications,
  onSelectNotification,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actionItemsCount = notifications.filter((n) => n.type !== 'success').length;

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full mt-2.5 w-80 sm:w-96 rounded-2xl border border-white/[0.10] bg-[#07111E]/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Popover Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.08] bg-[#0A1626]/80">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
            <Bell className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">Notifikasi</h3>
              {actionItemsCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-[10px] font-bold text-rose-300">
                  {actionItemsCount} Perlu Perhatian
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-normal">Pemberitahuan kelengkapan nilai & sistem</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          title="Tutup"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Notification Items List */}
      <div className="max-h-[360px] overflow-y-auto divide-y divide-white/[0.05] custom-scrollbar">
        {notifications.length === 0 ? (
          <div className="py-10 px-4 text-center">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-white">Semua Terkendali</p>
            <p className="text-[11px] text-slate-400 font-normal mt-0.5 max-w-xs mx-auto">
              Tidak ada peringatan nilai atau kendala pengisian rapor yang memerlukan perhatian.
            </p>
          </div>
        ) : (
          notifications.map((item) => {
            const isAction = item.type !== 'success';

            return (
              <div
                key={item.id}
                onClick={() => onSelectNotification?.(item)}
                className={`p-3.5 transition-colors ${
                  onSelectNotification ? 'cursor-pointer hover:bg-white/[0.03]' : ''
                } ${isAction ? 'bg-white/[0.01]' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon Indicator */}
                  <div className="shrink-0 mt-0.5">
                    {item.type === 'alert' && (
                      <div className="w-7 h-7 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center text-rose-400">
                        <AlertCircle className="w-3.5 h-3.5" />
                      </div>
                    )}
                    {item.type === 'warning' && (
                      <div className="w-7 h-7 rounded-xl bg-amber-400/15 border border-amber-400/25 flex items-center justify-center text-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </div>
                    )}
                    {item.type === 'info' && (
                      <div className="w-7 h-7 rounded-xl bg-sky-400/15 border border-sky-400/25 flex items-center justify-center text-sky-300">
                        <Info className="w-3.5 h-3.5" />
                      </div>
                    )}
                    {item.type === 'success' && (
                      <div className="w-7 h-7 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  {/* Text Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-white tracking-tight truncate">
                        {item.title}
                      </p>
                      {item.timestamp && (
                        <span className="text-[10px] text-slate-500 shrink-0 font-normal">
                          {item.timestamp}
                        </span>
                      )}
                    </div>

                    {item.subtitle && (
                      <p className="text-[11px] font-medium text-emerald-400/90 mt-0.5">
                        {item.subtitle}
                      </p>
                    )}

                    <p className="text-xs text-slate-300 font-normal leading-relaxed mt-1">
                      {item.description}
                    </p>
                  </div>

                  {onSelectNotification && isAction && (
                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0 self-center" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Popover Footer */}
      <div className="px-4 py-2.5 bg-[#0A1626]/90 border-t border-white/[0.06] text-center">
        <p className="text-[10px] text-slate-400 font-normal">
          Dihitung otomatis berdasarkan data penilaian aktual.
        </p>
      </div>
    </div>
  );
};
