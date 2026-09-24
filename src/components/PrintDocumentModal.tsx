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
} from 'lucide-react';

type PaperSize = 'A4' | 'F4' | 'A5' | 'Letter';
type Orientation = 'portrait' | 'landscape';
type ScaleMode = 'fit' | 'actual' | 'fill';

type PrinterInfo = {
  id: string;
  name: string;
  status?: string;
  type?: string;
};

type PrintDocumentModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const PAPER_MM: Record<
  PaperSize,
  { width: number; height: number }
> = {
  A4: {
    width: 210,
    height: 297,
  },
  F4: {
    width: 215.9,
    height: 330.2,
  },
  A5: {
    width: 148,
    height: 210,
  },
  Letter: {
    width: 215.9,
    height: 279.4,
  },
};

const OFFICE_EXTENSIONS = new Set([
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
]);

const IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'bmp',
  'tif',
  'tiff',
]);

const MAX_FILE_BYTES = 20 * 1024 * 1024;

const getExtension = (name: string) =>
  name.split('.').pop()?.toLowerCase() || '';

const isImageFile = (file: File) =>
  file.type.startsWith('image/') ||
  IMAGE_EXTENSIONS.has(
    getExtension(file.name)
  );

const isOfficeFile = (file: File) =>
  OFFICE_EXTENSIONS.has(
    getExtension(file.name)
  );

const fileToBase64 = (
  input: File
) =>
  new Promise<string>(
    (resolve, reject) => {
      const reader =
        new FileReader();

      reader.onload = () =>
        resolve(
          String(reader.result)
            .split(',')[1] || ''
        );

      reader.onerror = () =>
        reject(
          reader.error ||
            new Error(
              'Gagal membaca file.'
            )
        );

      reader.readAsDataURL(input);
    }
  );

async function readJson(
  response: Response
) {
  const text =
    await response.text();

  let data: any = {};

  try {
    data = text
      ? JSON.parse(text)
      : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
        `Server mengembalikan HTTP ${response.status}.`
    );
  }

  return data;
}

export const PrintDocumentModal: React.FC<
  PrintDocumentModalProps
> = ({
  isOpen,
  onClose,
}) => {
  const inputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const previewUrlRef =
    useRef('');

  const [file, setFile] =
    useState<File | null>(null);

  const [previewUrl, setPreviewUrl] =
    useState('');

  const [status, setStatus] =
    useState('');

  const [paper, setPaper] =
    useState<PaperSize>('A4');

  const [orientation, setOrientation] =
    useState<Orientation>(
      'portrait'
    );

  const [scale, setScale] =
    useState<ScaleMode>('fit');

  const [copies, setCopies] =
    useState(1);

  const [pageRange, setPageRange] =
    useState('Semua');

  const [showAdvanced, setShowAdvanced] =
    useState(false);

  const [margin, setMargin] =
    useState('10');

  const [gatewayOnline, setGatewayOnline] =
    useState(false);

  const [printers, setPrinters] =
    useState<PrinterInfo[]>([]);

  const [printer, setPrinter] =
    useState('');

  const [isPrinting, setIsPrinting] =
    useState(false);

  const [
    isPreparingPreview,
    setIsPreparingPreview,
  ] = useState(false);

  const paperDimensions =
    useMemo(() => {
      const base =
        PAPER_MM[paper];

      return orientation ===
        'portrait'
        ? base
        : {
            width: base.height,
            height: base.width,
          };
    }, [
      paper,
      orientation,
    ]);

  const releasePreview = () => {
    if (
      previewUrlRef.current
    ) {
      URL.revokeObjectURL(
        previewUrlRef.current
      );
    }

    previewUrlRef.current =
      '';
  };

  const setPreviewBlob = (
    blob: Blob
  ) => {
    releasePreview();

    const url =
      URL.createObjectURL(blob);

    previewUrlRef.current =
      url;

    setPreviewUrl(url);
  };

  const checkGateway =
    async () => {
      try {
        const response =
          await fetch(
            '/api/print/gateway/status',
            {
              cache: 'no-store',
            }
          );

        const data =
          await readJson(
            response
          );

        const list =
          Array.isArray(
            data.printers
          )
            ? data.printers
            : [];

        setGatewayOnline(
          Boolean(data.online)
        );

        setPrinters(list);

        setPrinter(
          (current) =>
            current &&
            list.some(
              (
                item: PrinterInfo
              ) =>
                item.id ===
                current
            )
              ? current
              : list[0]?.id || ''
        );

        if (!data.online) {
          setStatus(
            'Print Gateway sedang offline.'
          );
        }
      } catch (error) {
        setGatewayOnline(false);
        setPrinters([]);
        setPrinter('');

        setStatus(
          error instanceof Error
            ? error.message
            : 'Gagal memeriksa Print Gateway.'
        );
      }
    };

  const waitForJob = async (
    jobId: string,
    timeoutMs = 120000
  ) => {
    const started =
      Date.now();

    while (
      Date.now() -
        started <
      timeoutMs
    ) {
      const response =
        await fetch(
          `/api/print/jobs/${encodeURIComponent(
            jobId
          )}`,
          {
            cache: 'no-store',
          }
        );

      const data =
        await readJson(
          response
        );

      if (
        [
          'READY',
          'SENT',
          'FAILED',
        ].includes(
          data.statusJob
        )
      ) {
        return data;
      }

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            1500
          )
      );
    }

    throw new Error(
      'Waktu tunggu Print Gateway habis.'
    );
  };

  const loadFile = async (
    nextFile: File
  ) => {
    if (
      nextFile.size >
      MAX_FILE_BYTES
    ) {
      setStatus(
        'Ukuran file terlalu besar. Maksimal 20 MB.'
      );
      return;
    }

    setFile(nextFile);

    releasePreview();

    setPreviewUrl('');

    setStatus(
      'Menyiapkan preview...'
    );

    const ext =
      getExtension(
        nextFile.name
      );

    try {
      if (
        ext === 'pdf' ||
        nextFile.type ===
          'application/pdf'
      ) {
        setPreviewBlob(
          nextFile
        );

        setStatus(
          'PDF siap dipreview.'
        );

        return;
      }

      if (
        isImageFile(nextFile)
      ) {
        setPreviewBlob(
          nextFile
        );

        setStatus(
          'Gambar siap dipreview.'
        );

        return;
      }

      if (
        isOfficeFile(nextFile)
      ) {
        if (
          !gatewayOnline
        ) {
          throw new Error(
            'Print Gateway harus online untuk preview Word/Excel/PowerPoint.'
          );
        }

        setIsPreparingPreview(
          true
        );

        const base64 =
          await fileToBase64(
            nextFile
          );

        const response =
          await fetch(
            '/api/print/jobs',
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
              },
              body: JSON.stringify(
                {
                  mode: 'preview',
                  fileName:
                    nextFile.name,
                  dataBase64:
                    base64,
                  paper,
                  orientation,
                  scale,
                }
              ),
            }
          );

        const created =
          await readJson(
            response
          );

        const result =
          await waitForJob(
            created.jobId
          );

        if (
          result.statusJob !==
            'READY' ||
          !result.resultDataBase64
        ) {
          throw new Error(
            result.message ||
              'Preview Office gagal dibuat.'
          );
        }

        const binary =
          atob(
            result.resultDataBase64
          );

        const bytes =
          new Uint8Array(
            binary.length
          );

        for (
          let i = 0;
          i < binary.length;
          i += 1
        ) {
          bytes[i] =
            binary.charCodeAt(i);
        }

        setPreviewBlob(
          new Blob(
            [bytes],
            {
              type:
                'application/pdf',
            }
          )
        );

        setStatus(
          'Preview siap.'
        );

        return;
      }

      throw new Error(
        'Format file belum didukung. Gunakan PDF, Word, Excel, PowerPoint, atau gambar.'
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : 'Gagal memproses file.'
      );
    } finally {
      setIsPreparingPreview(
        false
      );
    }
  };

  const handlePrint =
    async () => {
      if (!file) {
        setStatus(
          'Pilih dokumen terlebih dahulu.'
        );
        return;
      }

      if (!printer) {
        setStatus(
          'Pilih printer terlebih dahulu.'
        );
        return;
      }

      if (!gatewayOnline) {
        setStatus(
          'Print Gateway sedang offline.'
        );
        return;
      }

      setIsPrinting(true);

      setStatus(
        'Mengirim dokumen ke antrean cetak...'
      );

      try {
        const base64 =
          await fileToBase64(
            file
          );

        const response =
          await fetch(
            '/api/print/jobs',
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
              },
              body: JSON.stringify(
                {
                  mode: 'print',
                  fileName:
                    file.name,
                  dataBase64:
                    base64,
                  printer,
                  paper,
                  orientation,
                  scale,
                  copies,
                  pageRange,
                  margin,
                }
              ),
            }
          );

        const created =
          await readJson(
            response
          );

        setStatus(
          'Print job masuk ke antrean. Menunggu gateway...'
        );

        const result =
          await waitForJob(
            created.jobId
          );

        if (
          result.statusJob !==
          'SENT'
        ) {
          throw new Error(
            result.message ||
              'Pencetakan gagal.'
          );
        }

        setStatus(
          `✓ ${result.message}`
        );
      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : 'Pencetakan gagal.'
        );
      } finally {
        setIsPrinting(false);
        checkGateway();
      }
    };

  useEffect(() => {
    if (!isOpen) return;

    checkGateway();

    const timer =
      window.setInterval(
        checkGateway,
        10000
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      releasePreview();

      setFile(null);
      setPreviewUrl('');
      setStatus('');
      setGatewayOnline(false);
      setPrinters([]);
      setPrinter('');
      setIsPrinting(false);
      setIsPreparingPreview(
        false
      );
      setPageRange('Semua');
      setCopies(1);
      setShowAdvanced(false);

      return;
    }

    if (inputRef.current) {
      inputRef.current.value =
        '';
    }
  }, [isOpen]);

  useEffect(
    () => () =>
      releasePreview(),
    []
  );

  if (!isOpen) {
    return null;
  }

  const canPreview =
    Boolean(previewUrl);

  const fileExt = file
    ? getExtension(file.name)
    : '';

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-6xl max-h-[94vh] overflow-hidden rounded-3xl border border-slate-700/80 bg-[#0d111b] shadow-2xl flex flex-col">

        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center justify-center shrink-0">
              <Printer className="w-4 h-4" />
            </div>

            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-white">
                Print Dokumen
              </h2>

              <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                PDF, Word, Excel, PowerPoint, dan gambar
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 grid lg:grid-cols-[340px_minmax(0,1fr)]">

          <aside className="border-b lg:border-b-0 lg:border-r border-slate-800 p-4 sm:p-5 overflow-y-auto">

            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tif,.tiff"
              className="hidden"
              onChange={(e) =>
                e.target.files?.[0] &&
                loadFile(
                  e.target.files[0]
                )
              }
            />

            <button
              type="button"
              onClick={() =>
                inputRef.current?.click()
              }
              className="w-full rounded-2xl border border-dashed border-slate-600 hover:border-cyan-400/70 bg-slate-900/70 hover:bg-slate-900 px-4 py-4 text-left transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>

                <div>
                  <div className="text-xs font-black text-white">
                    Pilih dokumen
                  </div>

                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Maksimal 20 MB
                  </div>
                </div>
              </div>
            </button>

            {file && (
              <div className="mt-3 p-3 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
                    {isImageFile(
                      file
                    ) ? (
                      <FileImage className="w-4 h-4" />
                    ) : fileExt.startsWith(
                        'xls'
                      ) ? (
                      <FileSpreadsheet className="w-4 h-4" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate">
                      {file.name}
                    </div>

                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {(
                        file.size /
                        1024 /
                        1024
                      ).toFixed(2)}{' '}
                      MB
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      loadFile(file)
                    }
                    disabled={
                      isPreparingPreview
                    }
                    className="text-[10px] font-bold text-cyan-300 disabled:opacity-40"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Printer
                </span>

                <span
                  className={`text-[9px] font-bold ${
                    gatewayOnline
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {gatewayOnline
                    ? 'Gateway online'
                    : 'Gateway offline'}
                </span>
              </div>

              <select
                value={printer}
                onChange={(e) =>
                  setPrinter(
                    e.target.value
                  )
                }
                disabled={
                  !gatewayOnline ||
                  !printers.length
                }
                className="print-select w-full"
              >
                {!printers.length ? (
                  <option value="">
                    {gatewayOnline
                      ? 'Printer tidak ditemukan'
                      : 'Gateway offline'}
                  </option>
                ) : (
                  printers.map(
                    (item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.name}
                      </option>
                    )
                  )
                )}
              </select>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Pengaturan Cetak
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setShowAdvanced(
                      (v) => !v
                    )
                  }
                  className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-cyan-300"
                >
                  <Settings2 className="w-3 h-3" />
                  {showAdvanced
                    ? 'Sembunyikan'
                    : 'Lanjutan'}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <select
                  value={paper}
                  onChange={(e) =>
                    setPaper(
                      e.target
                        .value as PaperSize
                    )
                  }
                  className="print-select"
                >
                  <option value="A4">
                    A4
                  </option>
                  <option value="F4">
                    F4
                  </option>
                  <option value="A5">
                    A5
                  </option>
                  <option value="Letter">
                    Letter
                  </option>
                </select>

                <select
                  value={orientation}
                  onChange={(e) =>
                    setOrientation(
                      e.target
                        .value as Orientation
                    )
                  }
                  className="print-select"
                >
                  <option value="portrait">
                    Portrait
                  </option>
                  <option value="landscape">
                    Landscape
                  </option>
                </select>

                <select
                  value={scale}
                  onChange={(e) =>
                    setScale(
                      e.target
                        .value as ScaleMode
                    )
                  }
                  className="print-select"
                >
                  <option value="fit">
                    Fit
                  </option>
                  <option value="actual">
                    Actual
                  </option>
                  <option value="fill">
                    Fill
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-[1fr_1.4fr] gap-2 mt-2">
                <label className="print-field">
                  <span>
                    Salinan
                  </span>

                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={copies}
                    onChange={(e) =>
                      setCopies(
                        Math.min(
                          99,
                          Math.max(
                            1,
                            Number(
                              e.target
                                .value
                            ) || 1
                          )
                        )
                      )
                    }
                  />
                </label>

                <label className="print-field">
                  <span>
                    Rentang halaman
                  </span>

                  <input
                    type="text"
                    value={pageRange}
                    onChange={(e) =>
                      setPageRange(
                        e.target.value
                      )
                    }
                    placeholder="Semua / 1-3"
                    aria-label="Rentang halaman"
                  />
                </label>
              </div>

              {showAdvanced && (
                <div className="mt-2 p-3 rounded-2xl border border-slate-800 bg-slate-950/50">
                  <label className="print-field">
                    <span>
                      Margin (mm)
                    </span>

                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={margin}
                      onChange={(e) =>
                        setMargin(
                          e.target
                            .value
                        )
                      }
                    />
                  </label>

                  <p className="text-[9px] text-slate-500 mt-2">
                    Layout Office tetap mengikuti dokumen asli.
                  </p>
                </div>
              )}
            </div>

            {status && (
              <div className="mt-3 flex gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-cyan-400" />

                <span>
                  {status}
                </span>
              </div>
            )}

            <button
              type="button"
              disabled={!canPreview}
              onClick={() =>
                document
                  .getElementById(
                    'print-preview-anchor'
                  )
                  ?.scrollIntoView({
                    behavior:
                      'smooth',
                  })
              }
              className="w-full mt-4 h-10 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-xs font-black text-slate-200 inline-flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Lihat Preview
            </button>

            <button
              type="button"
              disabled={
                !canPreview ||
                !printer ||
                !gatewayOnline ||
                isPrinting ||
                isPreparingPreview
              }
              onClick={
                handlePrint
              }
              className="w-full mt-2 h-10 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-950 text-xs font-black inline-flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/30"
            >
              <Printer className="w-4 h-4" />

              {isPrinting
                ? 'Mengirim...'
                : 'Cetak Sekarang'}
            </button>
          </aside>

          <main
            id="print-preview-anchor"
            className="min-h-0 bg-[#070a11] p-3 sm:p-5 overflow-auto"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs font-black text-white">
                  Preview
                </div>

                <div className="text-[10px] text-slate-500 mt-0.5">
                  {paper} ·{' '}
                  {orientation ===
                  'portrait'
                    ? 'Portrait'
                    : 'Landscape'}{' '}
                  ·{' '}
                  {scale ===
                  'fit'
                    ? 'Fit to Page'
                    : scale ===
                      'actual'
                      ? 'Actual Size'
                      : 'Fill Page'}
                </div>
              </div>

              {canPreview && (
                <span className="px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-300">
                  Siap dicetak
                </span>
              )}
            </div>

            {!canPreview ? (
              <div className="min-h-[420px] rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 flex flex-col items-center justify-center text-center px-6">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-3">
                  <Printer className="w-6 h-6" />
                </div>

                <div className="text-sm font-bold text-slate-400">
                  Belum ada dokumen
                </div>

                <div className="text-[11px] text-slate-600 mt-1 max-w-sm">
                  Pilih PDF, Word, Excel, PowerPoint, atau gambar.
                </div>
              </div>
            ) : (
              <div className="flex justify-center items-start min-h-full">
                <div
                  className="print-preview-paper relative"
                  style={{
                    aspectRatio: `${paperDimensions.width} / ${paperDimensions.height}`,
                  }}
                >
                  {isImageFile(
                    file!
                  ) ? (
                    <img
                      src={previewUrl}
                      alt={
                        file?.name ||
                        'Preview'
                      }
                      className={
                        scale ===
                        'fill'
                          ? 'object-cover'
                          : 'object-contain'
                      }
                    />
                  ) : (
                    <iframe
                      src={
                        previewUrl
                      }
                      title="Preview PDF"
                      className="w-full h-full border-0 bg-white"
                    />
                  )}

                  <div className="absolute inset-0 pointer-events-none border border-black/5" />
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};