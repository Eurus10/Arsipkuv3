// TrackingExportModal.tsx
import React, { useState, useRef, useMemo } from 'react';
import * as htmlToImage from 'html-to-image';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  MasterClass,
  formatSubjectDisplayName,
} from '../data/masterExamData';
import {
  ExamSessionConfig,
  ExamTrackingRecord,
} from '../types';

interface TrackingExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  examSession: ExamSessionConfig;
  activeMasterClasses: MasterClass[];
  activeSubjectsMap: Record<string, Record<string, boolean>>;
  trackingRecords: Record<string, ExamTrackingRecord>;
  stats: {
    totalTarget: number;
    totalCollected: number;
    totalNotCollected: number;
    totalPrinted: number;
    totalNotPrinted: number;
    collectedPercentage: number;
    printedPercentage: number;
  };
}

export const TrackingExportModal: React.FC<
  TrackingExportModalProps
> = ({
  isOpen,
  onClose,
  examSession,
  activeMasterClasses,
  activeSubjectsMap,
  trackingRecords,
  stats,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'whatsapp'>(
    'preview'
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const printAreaRef = useRef<HTMLDivElement>(null);

  const activeClassesForExport = useMemo(() => {
    return activeMasterClasses.filter((c) => {
      const classIsActive =
        examSession.activeClasses?.[c.id] !== false;

      if (!classIsActive) {
        return false;
      }

      return c.subjects.some(
        (s) =>
          activeSubjectsMap[c.id]?.[s.id] !== false
      );
    });
  }, [
    activeMasterClasses,
    activeSubjectsMap,
    examSession.activeClasses,
  ]);

  const row1Classes = useMemo(() => {
    return activeClassesForExport.filter(
      (c) => c.level >= 1 && c.level <= 3
    );
  }, [activeClassesForExport]);

  const row2Classes = useMemo(() => {
    return activeClassesForExport.filter(
      (c) => c.level >= 4 && c.level <= 6
    );
  }, [activeClassesForExport]);

  const row1MaxSubs = useMemo(() => {
    let max = 0;
    row1Classes.forEach((c) => {
      const activeSubs = c.subjects.filter(
        (s) => activeSubjectsMap[c.id]?.[s.id] !== false
      );
      if (activeSubs.length > max) max = activeSubs.length;
    });
    return Math.max(max, 10);
  }, [row1Classes, activeSubjectsMap]);

  const row2MaxSubs = useMemo(() => {
    let max = 0;
    row2Classes.forEach((c) => {
      const activeSubs = c.subjects.filter(
        (s) => activeSubjectsMap[c.id]?.[s.id] !== false
      );
      if (activeSubs.length > max) max = activeSubs.length;
    });
    return Math.max(max, 10);
  }, [row2Classes, activeSubjectsMap]);

  if (!isOpen) return null;

  /**
   * ============================================================
   * HELPERS
   * ============================================================
   */

  const clearError = () => {
    setErrorMessage('');
  };

  const safeFileName = (value: string) => {
    return value
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
      .replace(/\s+/g, '_')
      .trim();
  };

  /**
   * ============================================================
   * WHATSAPP SUMMARY
   * ============================================================
   */

  const generateWhatsAppText = (): string => {
    const lines: string[] = [
      `📋 *REKAP PENGUMPULAN & FOTOCOPY SOAL UJIAN*`,
      `🏫 *SDIT AL FIKRI*`,
      `📌 *Ujian:* ${examSession.name}`,
      `📅 *Tahun Pelajaran:* ${examSession.schoolYear}`,
      `🕒 *Update:* ${new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}`,
      ``,
      `📊 *RINGKASAN PROGRES:*`,
      `• Total Target: *${stats.totalTarget}* Naskah Soal`,
      `• Sudah Kumpul: *${stats.totalCollected}* (${stats.collectedPercentage}%)`,
      `• Belum Kumpul: *${stats.totalNotCollected}*`,
      `• Sudah Fotocopy: *${stats.totalPrinted}* (${stats.printedPercentage}%)`,
      `• Belum Fotocopy: *${stats.totalNotPrinted}*`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━`,
      `*RINCIAN PER KELAS:*`,
    ];

    activeMasterClasses.forEach((c) => {
      if (
        examSession.activeClasses?.[c.id] === false
      ) {
        return;
      }

      const activeSubs = c.subjects.filter(
        (s) => activeSubjectsMap[c.id]?.[s.id] !== false
      );

      let kumpul = 0;
      let fotocopy = 0;

      const uncollectedList: string[] = [];

      activeSubs.forEach((s) => {
        const key = `${examSession.id}__${c.id}__${s.id}`;
        const rec = trackingRecords[key];

        if (rec?.isCollected) {
          kumpul++;
        } else {
          uncollectedList.push(
            formatSubjectDisplayName(s.name, s.teacher)
          );
        }

        if (rec?.isPrinted) {
          fotocopy++;
        }
      });

      const isComplete =
        kumpul === activeSubs.length &&
        activeSubs.length > 0;

      const statusIcon = isComplete
        ? '✅ LENGKAP'
        : `⏳ (${activeSubs.length - kumpul} belum)`;

      lines.push(
        `• *Kelas ${c.name}* (Wali: ${c.waliKelas}): Kumpul ${kumpul}/${activeSubs.length} | Fotocopy ${fotocopy}/${activeSubs.length} ${statusIcon}`
      );

      if (
        uncollectedList.length > 0 &&
        uncollectedList.length <= 4
      ) {
        lines.push(
          `   _Belum kumpul: ${uncollectedList.join(', ')}_`
        );
      }
    });

    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push(
      '_SDIT AL FIKRI - Sistem Arsip & Bank Soal Digital_'
    );

    return lines.join('\n');
  };

  /**
   * ============================================================
   * COPY WHATSAPP
   * ============================================================
   *
   * Clipboard API dicoba terlebih dahulu.
   * Jika gagal, gunakan fallback textarea.
   */

  const handleCopyWhatsApp = async () => {
    clearError();

    const text = generateWhatsAppText();

    try {
      if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === 'function'
      ) {
        await navigator.clipboard.writeText(text);

        setCopySuccess(true);

        window.setTimeout(() => {
          setCopySuccess(false);
        }, 3000);

        return;
      }

      throw new Error('Clipboard API tidak tersedia.');
    } catch (clipboardError) {
      console.warn(
        'Clipboard API gagal, mencoba fallback:',
        clipboardError
      );

      try {
        const textarea = document.createElement('textarea');

        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        textarea.style.opacity = '0';

        document.body.appendChild(textarea);

        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);

        const success = document.execCommand('copy');

        document.body.removeChild(textarea);

        if (!success) {
          throw new Error('Fallback clipboard gagal.');
        }

        setCopySuccess(true);

        window.setTimeout(() => {
          setCopySuccess(false);
        }, 3000);
      } catch (fallbackError) {
        console.error(
          'Copy WhatsApp gagal:',
          fallbackError
        );

        setCopySuccess(false);

        setErrorMessage(
          'Gagal menyalin rekap. Silakan blok teks rekap secara manual lalu tekan Ctrl+C.'
        );
      }
    }
  };

  /**
   * ============================================================
   * CANVAS → BLOB DOWNLOAD
   * ============================================================
   */

  const downloadCanvasAsPNG = (
    canvas: HTMLCanvasElement,
    fileName: string
  ) => {
    return new Promise<void>((resolve, reject) => {
      try {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(
                new Error(
                  'Browser gagal membuat file PNG.'
                )
              );
              return;
            }

            const url =
              URL.createObjectURL(blob);

            const link =
              document.createElement('a');

            link.href = url;
            link.download = fileName;
            link.rel = 'noopener';
            link.style.position = 'fixed';
            link.style.left = '-9999px';

            document.body.appendChild(link);
            link.click();

            window.setTimeout(() => {
              link.remove();
              URL.revokeObjectURL(url);
              resolve();
            }, 500);
          },
          'image/png'
        );
      } catch (error) {
        reject(error);
      }
    });
  };

  /**
   * ============================================================
   * GENERATE CANVAS
   * ============================================================
   */

  const waitForExportReady = async () => {
    if (!printAreaRef.current) {
      throw new Error(
        'Area laporan belum tersedia.'
      );
    }

    // Beri browser waktu menyelesaikan layout/font sebelum canvas dibuat.
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

    if (document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch {
        // Font gagal dimuat tidak boleh menggagalkan export.
      }
    }

    const images = Array.from(
      printAreaRef.current.querySelectorAll('img')
    ) as HTMLImageElement[];

    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve();
              return;
            }

            const done = () => {
              img.removeEventListener('load', done);
              img.removeEventListener('error', done);
              resolve();
            };

            img.addEventListener('load', done, {
              once: true,
            });

            img.addEventListener('error', done, {
              once: true,
            });
          })
      )
    );
  };

  const createExportCanvas = async () => {
    await waitForExportReady();

    const element = printAreaRef.current;

    if (!element) {
      throw new Error(
        'Area laporan belum tersedia.'
      );
    }

    try {
      // Primary: html-to-image uses browser-native SVG/HTML rendering which natively supports oklab, oklch, etc.
      const canvas = await htmlToImage.toCanvas(element, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
        skipFonts: true,
        fontEmbedCSS: '',
      });
      return canvas;
    } catch (err) {
      console.warn('html-to-image toCanvas failed, falling back to html2canvas:', err);

      const width = Math.max(
        element.scrollWidth,
        element.clientWidth,
        1
      );

      const height = Math.max(
        element.scrollHeight,
        element.clientHeight,
        1
      );

      return html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 30000,
        removeContainer: true,
        foreignObjectRendering: false,
        scrollX: 0,
        scrollY: 0,
        width,
        height,
        windowWidth: Math.max(
          document.documentElement.clientWidth,
          width
        ),
        windowHeight: Math.max(
          document.documentElement.clientHeight,
          height
        ),
        onclone: (clonedDoc) => {
          try {
            const sanitizeText = (text: string): string => {
              if (!text) return '';
              let prev = '';
              let current = text;
              let iterations = 0;
              const modernColorRegex = /(?:oklch|oklab|color-mix|light-dark|lab|lch|color)\([^()]*\)/gi;
              while (prev !== current && iterations < 10) {
                prev = current;
                current = current.replace(modernColorRegex, '#0f172a');
                iterations++;
              }
              return current;
            };

            const styleElements = clonedDoc.querySelectorAll('style');
            styleElements.forEach((styleEl) => {
              if (styleEl.textContent) {
                styleEl.textContent = sanitizeText(styleEl.textContent);
              }
            });

            const allElements = clonedDoc.querySelectorAll('*');
            allElements.forEach((el) => {
              const styleAttr = el.getAttribute('style');
              if (styleAttr) {
                el.setAttribute('style', sanitizeText(styleAttr));
              }
            });

            const resetStyle = clonedDoc.createElement('style');
            resetStyle.textContent = `
              * {
                --tw-shadow-color: transparent !important;
                --tw-ring-color: transparent !important;
                --tw-outline-color: transparent !important;
              }
            `;
            clonedDoc.head?.appendChild(resetStyle);
          } catch {
            // ignore
          }
        },
      });
    }
  };

  /**
   * ============================================================
   * DOWNLOAD PDF
   * ============================================================
   */

  const handleDownloadPDF = async () => {
    clearError();

    if (!printAreaRef.current) {
      setErrorMessage(
        'Area laporan belum siap. Silakan coba lagi.'
      );
      return;
    }

    setIsGenerating(true);

    try {
      const canvas =
        await createExportCanvas();

      if (
        canvas.width <= 0 ||
        canvas.height <= 0
      ) {
        throw new Error(
          'Canvas laporan kosong.'
        );
      }

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pdfWidth =
        pdf.internal.pageSize.getWidth();

      const pdfHeight =
        pdf.internal.pageSize.getHeight();

      const margin = 5;
      const contentWidth =
        pdfWidth - margin * 2;

      const contentHeight =
        (canvas.height * contentWidth) /
        canvas.width;

      const firstPageHeight =
        Math.min(
          contentHeight,
          pdfHeight - margin * 2
        );

      const imgData =
        canvas.toDataURL(
          'image/jpeg',
          0.92
        );

      let renderedHeight = 0;
      let pageIndex = 0;

      while (
        renderedHeight < contentHeight
      ) {
        if (pageIndex > 0) {
          pdf.addPage(
            'a4',
            'landscape'
          );
        }

        const y =
          margin - renderedHeight;

        pdf.addImage(
          imgData,
          'JPEG',
          margin,
          y,
          contentWidth,
          contentHeight,
          undefined,
          'FAST'
        );

        renderedHeight +=
          pdfHeight - margin * 2;

        pageIndex++;

        // Safety guard against an unexpected infinite loop.
        if (pageIndex > 50) {
          throw new Error(
            'Laporan terlalu panjang untuk diproses.'
          );
        }
      }

      const fileName =
        `Rekap_Tracking_${safeFileName(
          examSession.name || 'Ujian'
        )}_${safeFileName(
          examSession.schoolYear || 'Tahun_Pelajaran'
        )}.pdf`;

      // Gunakan Blob agar lebih stabil di browser modern.
      const pdfBlob =
        pdf.output('blob');

      const url =
        URL.createObjectURL(pdfBlob);

      const link =
        document.createElement('a');

      link.href = url;
      link.download = fileName;
      link.rel = 'noopener';
      link.style.position = 'fixed';
      link.style.left = '-9999px';

      document.body.appendChild(link);
      link.click();

      window.setTimeout(() => {
        link.remove();
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      console.error(
        'PDF export failed:',
        error
      );

      setErrorMessage(
        error instanceof Error
          ? `Gagal membuat PDF: ${error.message}`
          : 'Gagal membuat PDF. Coba lagi.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * ============================================================
   * DOWNLOAD PNG
   * ============================================================
   */

  const handleDownloadPNG = async () => {
    clearError();

    if (!printAreaRef.current) {
      setErrorMessage(
        'Area laporan belum siap. Silakan coba lagi.'
      );
      return;
    }

    setIsGenerating(true);

    try {
      const canvas =
        await createExportCanvas();

      if (
        canvas.width <= 0 ||
        canvas.height <= 0
      ) {
        throw new Error(
          'Canvas laporan kosong.'
        );
      }

      const fileName =
        `Rekap_Tracking_${safeFileName(
          examSession.name || 'Ujian'
        )}_${safeFileName(
          examSession.schoolYear || 'Tahun_Pelajaran'
        )}.png`;

      await downloadCanvasAsPNG(
        canvas,
        fileName
      );
    } catch (error) {
      console.error(
        'PNG export failed:',
        error
      );

      setErrorMessage(
        error instanceof Error
          ? `Gagal membuat PNG: ${error.message}`
          : 'Gagal membuat gambar PNG. Silakan coba lagi.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * ============================================================
   * NATIVE PRINT
   * ============================================================
   */

  const handleNativePrint = () => {
    clearError();

    try {
      window.print();
    } catch (error) {
      console.error(
        'Print failed:',
        error
      );

      setErrorMessage(
        'Gagal membuka dialog cetak.'
      );
    }
  };

  /**
   * ============================================================
   * CLASS TABLE
   * ============================================================
   */

  const renderClassTable = (
    c: MasterClass,
    maxSubs: number
  ) => {
    const activeSubs =
      c.subjects.filter(
        (s) =>
          activeSubjectsMap[c.id]?.[
            s.id
          ] !== false
      );

    if (
      activeSubs.length === 0
    ) {
      return null;
    }

    return (
      <div
        key={c.id}
        className="flex flex-col h-full bg-white select-none break-inside-avoid"
      >
        {/* HEADER ATAS: KELAS 1A: NAMA WALI KELAS */}
        <div className="text-[8.5px] font-black text-slate-900 tracking-tight pb-0.5 text-center truncate uppercase">
          KELAS {c.name}: {c.waliKelas ? c.waliKelas.toUpperCase() : 'GURU KELAS'}
        </div>

        {/* TABEL */}
        <table className="w-full text-left text-[8px] sm:text-[8.5px] border-collapse border border-black bg-white">
          <thead>
            <tr className="bg-[#0B2240] text-white border-b border-black text-[8px] sm:text-[8.5px] font-bold">
              <th className="py-0.5 px-1 w-5 text-center border-r border-slate-600">
                NO
              </th>
              <th className="py-0.5 px-1.5 text-left border-r border-slate-600">
                MAPEL
              </th>
              <th className="py-0.5 px-0.5 w-5 text-center border-r border-slate-600">
                K
              </th>
              <th className="py-0.5 px-0.5 w-5 text-center">
                F
              </th>
            </tr>
          </thead>

          <tbody>
            {activeSubs.map(
              (sub, idx) => {
                const key =
                  `${examSession.id}__${c.id}__${sub.id}`;

                const rec =
                  trackingRecords[key];

                const isKumpul =
                  !!rec?.isCollected;

                const isPrint =
                  !!rec?.isPrinted;

                return (
                  <tr
                    key={sub.id}
                    className="border-b border-black h-[18px]"
                  >
                    <td className="border-r border-black py-0.5 px-1 text-center font-semibold text-slate-800">
                      {idx + 1}
                    </td>

                    <td
                      className={`border-r border-black py-0.5 px-1.5 font-bold uppercase truncate ${
                        isKumpul
                          ? 'bg-[#86efac] text-[#064e3b]'
                          : 'bg-white text-slate-900'
                      }`}
                      title={formatSubjectDisplayName(
                        sub.name,
                        sub.teacher
                      )}
                    >
                      {formatSubjectDisplayName(
                        sub.name,
                        sub.teacher
                      )}
                    </td>

                    <td
                      className={`border-r border-black py-0.5 px-0.5 text-center font-black ${
                        isKumpul
                          ? 'text-emerald-900'
                          : 'text-slate-400'
                      }`}
                    >
                      {isKumpul ? '✓' : '—'}
                    </td>

                    <td
                      className={`py-0.5 px-0.5 text-center font-black ${
                        isPrint
                          ? 'text-blue-900'
                          : 'text-slate-400'
                      }`}
                    >
                      {isPrint ? '✓' : '—'}
                    </td>
                  </tr>
                );
              }
            )}

            {/* BARIS KOSONG UNTUK MENJAGA TINGGI SERAGAM */}
            {Array.from({
              length: Math.max(0, maxSubs - activeSubs.length),
            }).map((_, emptyIdx) => (
              <tr
                key={`empty-${emptyIdx}`}
                className="border-b border-black h-[18px] bg-white"
              >
                <td className="border-r border-black py-0.5 px-1 text-center text-transparent select-none">
                  &nbsp;
                </td>
                <td className="border-r border-black py-0.5 px-1.5 text-transparent select-none">
                  &nbsp;
                </td>
                <td className="border-r border-black py-0.5 px-0.5 text-center text-transparent select-none">
                  &nbsp;
                </td>
                <td className="py-0.5 px-0.5 text-center text-transparent select-none">
                  &nbsp;
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  /**
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#181B26] border border-[#272D3E] rounded-3xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-2">

        {/* HEADER */}
        <div className="p-4 sm:p-5 border-b border-[#272D3E] flex items-center justify-between bg-[#151722]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/15 border border-amber-400/30 text-amber-400 flex items-center justify-center text-lg font-bold">
              📥
            </div>

            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Export & Salin Laporan Tracking Soal
              </h2>

              <p className="text-xs text-slate-400">
                Tata letak ringkas 2 baris (Baris 1: Kelas 1-3 • Baris 2: Kelas 4-6) untuk PDF, Gambar, & WhatsApp
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* TABS */}
        <div className="px-6 pt-3 border-b border-[#272D3E] bg-[#12141D] flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              clearError();
              setActiveTab('preview');
            }}
            className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'preview'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📄 Format Dokumen 2 Baris (PDF & Cetak)
          </button>

          <button
            type="button"
            onClick={() => {
              clearError();
              setActiveTab('whatsapp');
            }}
            className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'whatsapp'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            💬 Format Ringkas WhatsApp
          </button>
        </div>

        {/* TOOLBAR */}
        <div className="px-5 py-3 bg-[#151722] border-b border-[#272D3E] flex flex-wrap items-center justify-between gap-3">
          {activeTab === 'preview' ? (
            <>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>

                <span>
                  Tata Letak 2 Baris:{' '}
                  <strong>
                    Baris 1 (Kelas 1-3)
                  </strong>{' '}
                  &{' '}
                  <strong>
                    Baris 2 (Kelas 4-6)
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={isGenerating}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  {isGenerating
                    ? 'Memproses...'
                    : '⬇️ Unduh PDF (Landscape)'}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPNG}
                  disabled={isGenerating}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  {isGenerating
                    ? 'Memproses...'
                    : '🖼️ Unduh Gambar (PNG)'}
                </button>

                <button
                  type="button"
                  onClick={handleNativePrint}
                  disabled={isGenerating}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  🖨️ Cetak Langsung
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="text-xs text-slate-400">
                Format teks siap disalin ke WhatsApp dewan guru & panitia ujian
              </span>

              <button
                type="button"
                onClick={handleCopyWhatsApp}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-lg"
              >
                {copySuccess
                  ? '✅ Berhasil Disalin!'
                  : '📋 Salin ke WhatsApp'}
              </button>
            </>
          )}
        </div>

        {/* ERROR MESSAGE */}
        {errorMessage && (
          <div className="px-5 py-3 bg-rose-500/10 border-b border-rose-500/20">
            <div className="flex items-start gap-2">
              <span className="text-rose-400">
                ⚠️
              </span>

              <div className="flex-1">
                <p className="text-xs font-bold text-rose-300">
                  Proses gagal
                </p>

                <p className="text-xs text-rose-200/80 mt-0.5">
                  {errorMessage}
                </p>
              </div>

              <button
                type="button"
                onClick={clearError}
                className="text-xs text-rose-300 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6 bg-[#0E1017]">
          {activeTab === 'preview' && (
            <div
              ref={printAreaRef}
              className="mx-auto bg-white text-slate-900 rounded-xl p-5 sm:p-6 shadow-2xl border border-slate-200 select-none"
              style={{
                minWidth: '1350px',
              }}
            >
              {/* KOP */}
              <div className="text-center pb-2.5 mb-3.5 border-b border-black">
                <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-wide uppercase">
                  DATA REKAP PENYERAHAN &amp; FOTOCOPY SOAL {examSession.name.toUpperCase()}
                </h1>

                <h2 className="text-xs sm:text-sm font-black text-slate-800 uppercase mt-0.5 tracking-wider">
                  SDIT AL FIKRI — TAHUN PELAJARAN {examSession.schoolYear}
                </h2>
              </div>

              {/* 2 ROWS OF CLASS TABLES */}
              <div className="space-y-4">
                {row1Classes.length > 0 && (
                  <div>
                    <div className="grid grid-flow-col auto-cols-fr gap-1.5 items-start">
                      {row1Classes.map((c) =>
                        renderClassTable(c, row1MaxSubs)
                      )}
                    </div>
                  </div>
                )}

                {row2Classes.length > 0 && (
                  <div>
                    <div className="grid grid-flow-col auto-cols-fr gap-1.5 items-start">
                      {row2Classes.map((c) =>
                        renderClassTable(c, row2MaxSubs)
                      )}
                    </div>
                  </div>
                )}
              </div>

              {activeClassesForExport.length === 0 && (
                <div className="py-10 text-center text-slate-500 text-sm border border-dashed border-slate-300 rounded-lg">
                  Tidak ada kelas atau mapel aktif untuk diekspor.
                </div>
              )}

              {/* KETERANGAN SIMBOL & RINGKASAN */}
              <div className="mt-4 pt-2.5 border-t-2 border-black flex flex-col sm:flex-row items-center justify-between text-[9px] sm:text-[9.5px] text-slate-900 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-300">
                <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
                  <span className="font-black text-slate-900 uppercase">
                    KETERANGAN:
                  </span>
                  <span>
                    <strong>[ K ]</strong> : Pengumpulan Naskah Soal
                  </span>
                  <span>
                    <strong>[ F ]</strong> : Fotocopy Naskah Soal
                  </span>
                  <span>
                    <strong className="text-emerald-800">[ ✓ ]</strong> : Selesai
                  </span>
                  <span>
                    <strong className="text-slate-400">[ — ]</strong> : Belum Selesai
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold">
                    <span className="w-3.5 h-3.5 rounded-xs bg-[#86efac] border border-black inline-block"></span>
                    Mapel Warna Hijau = Naskah Soal Sudah Dikumpulkan
                  </span>
                </div>

                <div className="flex items-center gap-2 font-bold text-slate-800 whitespace-nowrap text-[9px]">
                  <span>
                    Target: <strong>{stats.totalTarget}</strong> Naskah
                  </span>
                  <span>•</span>
                  <span>
                    Sudah Kumpul:{' '}
                    <strong className="text-emerald-800">
                      {stats.totalCollected} ({stats.collectedPercentage}%)
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Sudah Fotocopy:{' '}
                    <strong className="text-blue-800">
                      {stats.totalPrinted} ({stats.printedPercentage}%)
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* WHATSAPP */}
          {activeTab === 'whatsapp' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="bg-[#181B26] border border-[#272D3E] rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-300">
                    Pratinjau Pesan WhatsApp:
                  </span>

                  <button
                    type="button"
                    onClick={handleCopyWhatsApp}
                    className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    {copySuccess
                      ? '✅ Tersalin!'
                      : '📋 Salin Teks'}
                  </button>
                </div>

                <pre className="p-4 bg-[#12141D] border border-slate-800 rounded-xl text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed select-all">
                  {generateWhatsAppText()}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-[#272D3E] bg-[#151722] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};