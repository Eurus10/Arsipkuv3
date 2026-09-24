import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText,
  FileImage,
  FileSpreadsheet,
  Printer,
  Upload,
  X,
  Eye,
  Settings2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Maximize2
} from 'lucide-react';

type PaperSize = 'A4' | 'F4' | 'A5' | 'Letter';
type Orientation = 'portrait' | 'landscape';
type ScaleMode = 'fit' | 'actual' | 'fill';
type DuplexMode = 'simplex' | 'duplex_long' | 'duplex_short';
type ColorMode = 'monochrome' | 'color';

type PrintDocumentModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

interface PrinterItem {
  id: string;
  name: string;
  type: string;
  status: string;
}

const PAPER_MM: Record<PaperSize, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  F4: { width: 215.9, height: 330.2 },
  A5: { width: 148, height: 210 },
  Letter: { width: 215.9, height: 279.4 },
};

const OFFICE_EXTENSIONS = new Set(['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']);
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tif', 'tiff']);

const getExtension = (name: string) => name.split('.').pop()?.toLowerCase() || '';

const isImageFile = (file: File) =>
  file.type.startsWith('image/') || IMAGE_EXTENSIONS.has(getExtension(file.name));

export const PrintDocumentModal: React.FC<PrintDocumentModalProps> = ({ isOpen, onClose }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [statusType, setStatusType] = useState<'info' | 'warning' | 'success' | 'error'>('info');

  // Print Settings
  const [paper, setPaper] = useState<PaperSize>('A4');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [scale, setScale] = useState<ScaleMode>('fit');
  const [copies, setCopies] = useState<number>(1);
  const [pageRange, setPageRange] = useState<string>('Semua');

  // Advanced Settings
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [duplex, setDuplex] = useState<DuplexMode>('simplex');
  const [colorMode, setColorMode] = useState<ColorMode>('monochrome');

  // Gateway status (polled from Web App API)
  const [gatewayOnline, setGatewayOnline] = useState<boolean>(false);
  const [printers, setPrinters] = useState<PrinterItem[]>([
    { id: 'KYOCERA ECOSYS M2040dn', name: 'KYOCERA ECOSYS M2040dn', type: 'windows_lan', status: 'READY' },
    { id: 'EPSON L3250 SERIES', name: 'EPSON L3250 SERIES', type: 'epson_connect', status: 'READY' },
  ]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('KYOCERA ECOSYS M2040dn');

  // Printing state & job tracker
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobProgressStage, setJobProgressStage] = useState<string>('');

  // Pagination indicator for multi-page document preview
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Aspect ratio calculation for paper preview
  const paperDimensions = useMemo(() => {
    const base = PAPER_MM[paper];
    return orientation === 'portrait' ? base : { width: base.height, height: base.width };
  }, [paper, orientation]);

  // 1. Check Gateway Status via Web App API (not localhost/127.0.0.1)
  const checkGatewayStatus = async () => {
    try {
      const res = await fetch('/api/print/status', { cache: 'no-store' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const isOnline = Boolean(data.online);
      setGatewayOnline(isOnline);

      if (Array.isArray(data.printers) && data.printers.length > 0) {
        setPrinters(data.printers);
        if (!selectedPrinter || !data.printers.some((p: any) => p.name === selectedPrinter || p.id === selectedPrinter)) {
          setSelectedPrinter(data.printers[0].name || data.printers[0].id);
        }
      }

      if (!isOnline && !isSubmitting && !activeJobId) {
        setStatusType('warning');
        setStatusMessage(
          'Print Gateway sedang offline. Pastikan laptop gateway menyala dan aplikasi Print Gateway berjalan.'
        );
      } else if (isOnline && statusType === 'warning') {
        setStatusType('info');
        setStatusMessage('Print Gateway aktif dan terhubung.');
      }
    } catch {
      setGatewayOnline(false);
      setStatusType('warning');
      setStatusMessage('Gagal menghubungi layanan print server.');
    }
  };

  // Poll gateway status every 6 seconds when modal open
  useEffect(() => {
    if (!isOpen) return;
    checkGatewayStatus();
    const interval = setInterval(checkGatewayStatus, 6000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Reset state when closing modal
  useEffect(() => {
    if (!isOpen) {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      setFile(null);
      setPreviewUrl('');
      setStatusMessage('');
      setStatusType('info');
      setIsSubmitting(false);
      setActiveJobId(null);
      setJobProgressStage('');
      setCurrentPage(1);
      setTotalPages(1);
      setShowAdvanced(false);
    }
  }, [isOpen]);

  // 2. Poll job status if a job is in flight
  useEffect(() => {
    if (!activeJobId) return;

    let stopped = false;
    const pollJob = async () => {
      try {
        const res = await fetch(`/api/print/job/${activeJobId}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const job = data.job;
        if (!job) return;

        if (job.status === 'WAITING') {
          setJobProgressStage('Print Job diterima di antrean server...');
          setStatusType('info');
          setStatusMessage('Menunggu Print Gateway laptop mengambil dokumen...');
        } else if (job.status === 'PROCESSING') {
          setJobProgressStage('Print Gateway di laptop sedang memproses dokumen...');
          setStatusType('info');
          setStatusMessage(job.statusMessage || 'Sedang menyiapkan dan memformat dokumen untuk printer...');
        } else if (job.status === 'SENT') {
          setJobProgressStage('Print Job dikirim ke printer');
          setStatusType('success');
          setStatusMessage(
            job.statusMessage || `✓ Dokumen berhasil dikirim ke printer ${job.printer}.`
          );
          setIsSubmitting(false);
          stopped = true;
        } else if (job.status === 'FAILED') {
          setJobProgressStage('Pengiriman dokumen gagal');
          setStatusType('error');
          setStatusMessage(job.statusMessage || 'Gagal mengirim dokumen ke printer.');
          setIsSubmitting(false);
          stopped = true;
        }
      } catch {
        // continue polling
      }
    };

    pollJob();
    const timer = setInterval(() => {
      if (!stopped) pollJob();
    }, 2000);

    return () => clearInterval(timer);
  }, [activeJobId]);

  // 3. Load & Process Selected File
  const loadFile = async (nextFile: File) => {
    setFile(nextFile);
    setStatusType('info');
    setStatusMessage('Menyiapkan dokumen...');
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');
    setCurrentPage(1);
    setTotalPages(1);

    const ext = getExtension(nextFile.name);

    try {
      // PDF File: Instant native high-fidelity preview
      if (nextFile.type === 'application/pdf' || ext === 'pdf') {
        const blobUrl = URL.createObjectURL(nextFile);
        setPreviewUrl(blobUrl);
        setStatusType('info');
        setStatusMessage('Dokumen PDF siap dicetak.');
        return;
      }

      // Image File: Direct preview
      if (isImageFile(nextFile)) {
        const blobUrl = URL.createObjectURL(nextFile);
        setPreviewUrl(blobUrl);
        setStatusType('info');
        setStatusMessage('Gambar siap dicetak sesuai orientasi kertas.');
        return;
      }

      // Office Files (Word, Excel, PowerPoint):
      if (OFFICE_EXTENSIONS.has(ext)) {
        if (!gatewayOnline) {
          setStatusType('warning');
          setStatusMessage(
            'Dokumen Office memerlukan Print Gateway untuk merender ke PDF berformat presisi. Jalankan print-agent di laptop Anda.'
          );
          return;
        }

        setStatusType('info');
        setStatusMessage('Mengirim file Office ke Print Gateway untuk konversi ke PDF presisi...');

        const base64 = await fileToBase64(nextFile);
        const submitRes = await fetch('/api/print/convert-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: nextFile.name, fileData: base64 }),
        });
        const submitData = await submitRes.json();
        if (!submitRes.ok || !submitData.conversionId) {
          throw new Error('Gagal meminta antrean konversi dokumen.');
        }

        // Poll conversion result
        const convId = submitData.conversionId;
        let attempts = 0;
        const checkConv = async (): Promise<string> => {
          while (attempts < 20) {
            attempts++;
            await new Promise((r) => setTimeout(r, 1500));
            const cRes = await fetch(`/api/print/convert-result/${convId}`);
            if (cRes.ok) {
              const cData = await cRes.json();
              if (cData.status === 'done' && cData.pdfData) {
                return cData.pdfData;
              }
              if (cData.status === 'failed') {
                throw new Error(cData.error || 'Gagal mengonversi Office ke PDF via LibreOffice.');
              }
            }
          }
          throw new Error('Waktu tunggu konversi habis. Silakan coba kembali.');
        };

        const pdfBase64 = await checkConv();
        const binary = atob(pdfBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const pdfBlob = new Blob([bytes], { type: 'application/pdf' });
        setPreviewUrl(URL.createObjectURL(pdfBlob));
        setStatusType('success');
        setStatusMessage('Dokumen Office berhasil dikonversi ke PDF murni untuk preview dan cetak.');
        return;
      }

      throw new Error(
        'Format file belum didukung. Gunakan file PDF, Word (.docx), Excel (.xlsx), atau Gambar.'
      );
    } catch (err: any) {
      setStatusType('error');
      setStatusMessage(err?.message || 'Gagal memproses file.');
    }
  };

  // Helper file to base64
  const fileToBase64 = (input: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = () => reject(reader.error || new Error('Gagal membaca file.'));
      reader.readAsDataURL(input);
    });

  // 4. Handle Submit Print Job to Web App Queue
  const handlePrint = async () => {
    if (!file) {
      setStatusType('warning');
      setStatusMessage('Silakan pilih dokumen terlebih dahulu.');
      return;
    }

    if (!gatewayOnline) {
      setStatusType('error');
      setStatusMessage(
        'Print Gateway sedang offline. Pastikan laptop gateway menyala dan aplikasi Print Gateway berjalan.'
      );
      return;
    }

    if (!selectedPrinter) {
      setStatusType('warning');
      setStatusMessage('Pilih printer tujuan terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);
    setJobProgressStage('Mengirim ke Print Gateway...');
    setStatusType('info');
    setStatusMessage('Mengunggah dokumen ke antrean Web App...');

    try {
      const fileData = await fileToBase64(file);
      const payload = {
        fileName: file.name,
        fileType: getExtension(file.name),
        fileData,
        fileSize: file.size,
        printer: selectedPrinter,
        paper,
        orientation,
        scale,
        copies,
        pageRange,
        duplex,
        color: colorMode,
      };

      const res = await fetch('/api/print/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.status !== 'success') {
        throw new Error(data.message || 'Gagal mengirim print job ke antrean.');
      }

      setActiveJobId(data.jobId);
      setJobProgressStage('Print Job diterima');
      setStatusMessage('Dokumen telah diterima antrean server dan sedang menunggu Print Gateway laptop.');
    } catch (err: any) {
      setIsSubmitting(false);
      setJobProgressStage('');
      setStatusType('error');
      setStatusMessage(err?.message || 'Gagal mengirimkan dokumen ke printer.');
    }
  };

  if (!isOpen) return null;

  const canPreview = Boolean(previewUrl);
  const fileExt = file ? getExtension(file.name) : '';

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-5xl max-h-[94vh] overflow-hidden rounded-3xl border border-slate-700/80 bg-[#0d121f] shadow-2xl flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center justify-center shrink-0">
              <Printer className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                Print Dokumen
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-semibold">
                  SDIT Al Fikri
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                Cetak dokumen guru langsung ke printer sekolah melalui Print Gateway
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            title="Tutup Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Left Settings Panel + Right Preview Panel */}
        <div className="flex-1 min-h-0 grid lg:grid-cols-[340px_minmax(0,1fr)]">
          {/* Left Panel: Controls & Settings */}
          <aside className="border-b lg:border-b-0 lg:border-r border-slate-800 p-4 sm:p-5 overflow-y-auto space-y-4">
            {/* File Upload Selector */}
            <div>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])}
              />

              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-full rounded-2xl border border-dashed border-slate-600 hover:border-cyan-400/80 bg-slate-900/60 hover:bg-slate-900 px-4 py-3.5 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white">
                      {file ? 'Ganti Dokumen' : 'Pilih Dokumen'}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      PDF, Word (.docx), Excel, PowerPoint, Gambar
                    </div>
                  </div>
                </div>
              </button>

              {file && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0">
                    {isImageFile(file) ? (
                      <FileImage className="w-4 h-4 text-emerald-400" />
                    ) : fileExt.startsWith('xls') ? (
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <FileText className="w-4 h-4 text-cyan-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate">{file.name}</div>
                    <div className="text-[10px] text-slate-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Print Gateway Real Status Indicator */}
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/90">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Status Gateway
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    gatewayOnline
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      gatewayOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                    }`}
                  />
                  {gatewayOnline ? '● Print Gateway Online' : '● Print Gateway Offline'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                {gatewayOnline
                  ? 'Laptop gateway terhubung dan siap meneruskan cetakan ke printer sekolah.'
                  : 'Laptop gateway mati/belum terhubung. Hubungkan print-agent di laptop agar bisa mencetak.'}
              </p>
            </div>

            {/* Target Printer Selection */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                Pilih Printer Sekolah
              </label>
              <select
                value={selectedPrinter}
                onChange={(e) => setSelectedPrinter(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-cyan-400 transition-colors"
              >
                {printers.map((p) => (
                  <option key={p.id} value={p.name || p.id}>
                    {p.name || p.id}
                  </option>
                ))}
              </select>
            </div>

            {/* Print Settings Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Pengaturan Halaman
                </span>
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-cyan-300 transition-colors"
                >
                  <Settings2 className="w-3 h-3" />
                  {showAdvanced ? 'Tutup Opsi' : 'Opsi Lanjutan'}
                </button>
              </div>

              {/* Row 1: Paper Size & Orientation & Scaling */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 block mb-1">Kertas</label>
                  <select
                    value={paper}
                    onChange={(e) => setPaper(e.target.value as PaperSize)}
                    disabled={isSubmitting}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-2 py-1.5 text-xs font-bold text-white focus:border-cyan-400"
                  >
                    <option value="A4">A4</option>
                    <option value="F4">F4</option>
                    <option value="A5">A5</option>
                    <option value="Letter">Letter</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-400 block mb-1">Orientasi</label>
                  <select
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value as Orientation)}
                    disabled={isSubmitting}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-2 py-1.5 text-xs font-bold text-white focus:border-cyan-400"
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-400 block mb-1">Skala</label>
                  <select
                    value={scale}
                    onChange={(e) => setScale(e.target.value as ScaleMode)}
                    disabled={isSubmitting}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-2 py-1.5 text-xs font-bold text-white focus:border-cyan-400"
                  >
                    <option value="fit">Fit to Page</option>
                    <option value="actual">Actual Size</option>
                    <option value="fill">Fill Page</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Copies & Page Range */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 block mb-1">Salinan</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={copies}
                    onChange={(e) => setCopies(Math.min(99, Math.max(1, Number(e.target.value) || 1)))}
                    disabled={isSubmitting}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-400 block mb-1">
                    Rentang Halaman
                  </label>
                  <input
                    type="text"
                    value={pageRange}
                    onChange={(e) => setPageRange(e.target.value)}
                    placeholder="Semua / 1-3 / 1,3,5"
                    disabled={isSubmitting}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Advanced Settings */}
              {showAdvanced && (
                <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block mb-1">
                        Mode Duplex
                      </label>
                      <select
                        value={duplex}
                        onChange={(e) => setDuplex(e.target.value as DuplexMode)}
                        disabled={isSubmitting}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-2 py-1.5 text-[11px] font-bold text-white focus:border-cyan-400"
                      >
                        <option value="simplex">Satu Sisi</option>
                        <option value="duplex_long">Bolak-balik (Sisi Panjang)</option>
                        <option value="duplex_short">Bolak-balik (Sisi Pendek)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block mb-1">Warna</label>
                      <select
                        value={colorMode}
                        onChange={(e) => setColorMode(e.target.value as ColorMode)}
                        disabled={isSubmitting}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-2 py-1.5 text-[11px] font-bold text-white focus:border-cyan-400"
                      >
                        <option value="monochrome">Grayscale / Hitam Putih</option>
                        <option value="color">Berwarna</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-500">
                    Opsi duplex & warna disesuaikan dengan kemampuan fisik printer yang dipilih.
                  </p>
                </div>
              )}
            </div>

            {/* Notification / Status Message Box */}
            {statusMessage && (
              <div
                className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                  statusType === 'warning'
                    ? 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                    : statusType === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                    : statusType === 'error'
                    ? 'bg-rose-500/10 border-rose-500/25 text-rose-300'
                    : 'bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                {statusType === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1 leading-snug">
                  {jobProgressStage && (
                    <div className="font-bold text-[11px] text-white mb-0.5">
                      {jobProgressStage}
                    </div>
                  )}
                  <div className="text-[10px] opacity-90">{statusMessage}</div>
                </div>
              </div>
            )}

            {/* Action Buttons: Cancel and Print */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-1/3 h-10 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-300 transition-colors"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={!file || !selectedPrinter || !gatewayOnline || isSubmitting}
                className="flex-1 h-10 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-950 text-xs font-black inline-flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-950/30"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{jobProgressStage || 'Memproses...'}</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4" />
                    <span>CETAK DOKUMEN</span>
                  </>
                )}
              </button>
            </div>
          </aside>

          {/* Right Panel: Clean, Compact 100% Fit Preview Area */}
          <main className="min-h-0 bg-[#060810] p-3 sm:p-5 flex flex-col justify-between overflow-hidden">
            {/* Preview Toolbar */}
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white">Preview Dokumen</span>
                <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800">
                  {paper} · {orientation === 'portrait' ? 'Portrait' : 'Landscape'} · {scale}
                </span>
              </div>

              {/* Multi-page controls */}
              <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-xl px-2 py-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1 || !canPreview}
                  className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Halaman sebelumnya"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-bold text-slate-300 min-w-[50px] text-center">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages || !canPreview}
                  className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Halaman berikutnya"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Document Preview Canvas */}
            <div className="flex-1 min-h-0 flex items-center justify-center p-2 overflow-auto">
              {!canPreview ? (
                <div className="w-full max-w-md p-8 rounded-3xl border border-dashed border-slate-800 bg-slate-950/40 flex flex-col items-center justify-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
                    <Printer className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-300">Belum Ada Dokumen Terpilih</h3>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs leading-relaxed">
                    Pilih dokumen di sebelah kiri. Format PDF atau gambar langsung dipreview, sedangkan file Word/Excel dikonversi melalui Print Gateway.
                  </p>
                </div>
              ) : (
                <div
                  className="relative rounded-lg shadow-2xl overflow-hidden border border-slate-700/60 bg-white flex items-center justify-center max-h-full max-w-full"
                  style={{
                    aspectRatio: `${paperDimensions.width} / ${paperDimensions.height}`,
                    width: orientation === 'portrait' ? 'auto' : '100%',
                    height: orientation === 'portrait' ? '100%' : 'auto',
                    maxHeight: '100%',
                  }}
                >
                  {file && isImageFile(file) ? (
                    <img
                      src={previewUrl}
                      alt={file.name}
                      className={`w-full h-full ${
                        scale === 'fill' ? 'object-cover' : 'object-contain'
                      }`}
                    />
                  ) : (
                    <iframe
                      src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
                      title="Preview PDF"
                      className="w-full h-full border-0 bg-white"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Footer Information */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[10px] text-slate-500 shrink-0">
              <span>Format internal standar: PDF murni</span>
              <span>100% Fit Preview (proporsional tanpa terpotong)</span>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
