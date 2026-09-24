import crypto from 'crypto';
import path from 'path';
import type { Express, Request, Response } from 'express';

export type PrintJob = {
  id: string;
  mode: 'print' | 'preview';
  fileName: string;
  fileDataBase64: string;
  printer: string;
  paper: string;
  orientation: string;
  scale: string;
  copies: number;
  pageRange: string;
  status: 'WAITING' | 'PROCESSING' | 'SENT' | 'READY' | 'FAILED';
  message: string;
  createdAt: number;
  updatedAt: number;
  claimedAt?: number | null;
  resultDataBase64?: string | null;
};

type GatewayState = {
  online: boolean;
  gatewayName: string;
  lastSeenAt: number | null;
  printers: Array<{
    id: string;
    name: string;
    type?: string;
    status?: string;
  }>;
};

// In-Memory Print Queue (Ephemeral untuk testing / zero-config gateway)
const jobs = new Map<string, PrintJob>();

const gateway: GatewayState = {
  online: false,
  gatewayName: 'Laptop Gateway SDIT',
  lastSeenAt: null,
  printers: [],
};

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const JOB_TTL_MS = 30 * 60 * 1000;
const CLAIM_TIMEOUT_MS = 5 * 60 * 1000;

function normalizeBase64(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/^data:[^;]+;base64,/, '').trim();
}

function estimateBytes(base64: string): number {
  if (!base64) return 0;
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function safeFileName(value: unknown): string {
  const name = path.basename(String(value || 'dokumen.pdf'));
  return name.replace(/[^a-zA-Z0-9._()\- ]/g, '_').slice(0, 180) || 'dokumen.pdf';
}

function cleanupJobs() {
  const now = Date.now();
  for (const [id, job] of jobs.entries()) {
    if (now - job.updatedAt > JOB_TTL_MS) {
      jobs.delete(id);
    } else if (job.status === 'PROCESSING' && job.claimedAt && now - job.claimedAt > CLAIM_TIMEOUT_MS) {
      job.status = 'WAITING';
      job.message = 'Gateway sebelumnya terputus. Job dikembalikan ke antrean.';
      job.claimedAt = null;
      job.updatedAt = now;
    }
  }
}

setInterval(cleanupJobs, 60_000).unref();

export function registerPrintGatewayRoutes(app: Express) {
  /*
  |--------------------------------------------------------------------------
  | 1. GATEWAY STATUS
  |--------------------------------------------------------------------------
  */
  const handleGatewayStatus = (_req: Request, res: Response) => {
    try {
      const online = gateway.lastSeenAt !== null && Date.now() - gateway.lastSeenAt < 25_000;
      gateway.online = online;

      return res.status(200).json({
        status: 'ok',
        online,
        gatewayName: gateway.gatewayName,
        lastSeenAt: gateway.lastSeenAt ? new Date(gateway.lastSeenAt).toISOString() : null,
        lastSeenSecondsAgo: gateway.lastSeenAt ? Math.round((Date.now() - gateway.lastSeenAt) / 1000) : null,
        printers: online ? gateway.printers : [],
        capabilities: {
          libreOffice: true,
          sumatraPdf: true,
        },
      });
    } catch (error: any) {
      console.error('[PRINT GATEWAY ERROR] handleGatewayStatus:', error);
      return res.status(500).json({ status: 'error', message: error?.message || 'Gagal membaca status gateway.' });
    }
  };

  app.get('/api/print/gateway/status', handleGatewayStatus);
  app.get('/print/gateway/status', handleGatewayStatus);
  app.get('/api/print/status', handleGatewayStatus);
  app.get('/print/status', handleGatewayStatus);

  /*
  |--------------------------------------------------------------------------
  | 2. CREATE PRINT JOB (Frontend -> Server)
  |--------------------------------------------------------------------------
  */
  const handleCreateJob = (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      const fileDataBase64 = normalizeBase64(body.dataBase64 || body.fileData || body.fileDataBase64);

      if (!fileDataBase64) {
        return res.status(400).json({
          status: 'error',
          message: 'Data dokumen kosong.',
        });
      }

      const size = estimateBytes(fileDataBase64);
      if (size > MAX_FILE_BYTES) {
        return res.status(400).json({
          status: 'error',
          message: 'Ukuran dokumen terlalu besar. Maksimal 20 MB.',
        });
      }

      const mode = body.mode === 'preview' ? 'preview' : 'print';
      const printer = String(body.printer || '').trim();

      if (mode === 'print' && !printer) {
        return res.status(400).json({
          status: 'error',
          message: 'Printer belum dipilih.',
        });
      }

      const jobId = crypto.randomUUID();
      const job: PrintJob = {
        id: jobId,
        mode,
        fileName: safeFileName(body.fileName),
        fileDataBase64,
        printer,
        paper: String(body.paper || 'A4'),
        orientation: String(body.orientation || 'portrait'),
        scale: String(body.scale || 'fit'),
        copies: Math.min(99, Math.max(1, Number(body.copies) || 1)),
        pageRange: String(body.pageRange || 'Semua').trim() || 'Semua',
        status: 'WAITING',
        message: mode === 'preview' ? 'Menunggu gateway membuat preview.' : 'Menunggu antrean laptop gateway.',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        claimedAt: null,
        resultDataBase64: null,
      };

      jobs.set(jobId, job);
      console.log(`[PRINT API] Job dibuat: ${job.id} | ${job.fileName} | Printer: ${job.printer}`);

      return res.status(200).json({
        status: 'ok',
        jobId,
        mode: job.mode,
        message: mode === 'preview' ? 'Permintaan preview diterima.' : 'Print job masuk ke antrean.',
      });
    } catch (error: any) {
      console.error('[PRINT API ERROR] handleCreateJob:', error);
      return res.status(500).json({
        status: 'error',
        message: error?.message || 'Gagal membuat print job.',
      });
    }
  };

  app.post('/api/print/jobs', handleCreateJob);
  app.post('/print/jobs', handleCreateJob);
  app.post('/api/print/submit', handleCreateJob);
  app.post('/print/submit', handleCreateJob);

  /*
  |--------------------------------------------------------------------------
  | 3. GET JOB STATUS (Frontend -> Server)
  |--------------------------------------------------------------------------
  */
  const handleGetJob = (req: Request, res: Response) => {
    try {
      cleanupJobs();
      const jobId = String(req.params.id || '').trim();
      const job = jobs.get(jobId);

      if (!job) {
        return res.status(404).json({
          status: 'error',
          message: 'Print job tidak ditemukan atau sudah kedaluwarsa.',
        });
      }

      return res.status(200).json({
        status: 'ok',
        jobId: job.id,
        mode: job.mode,
        fileName: job.fileName,
        printer: job.printer,
        statusJob: job.status,
        message: job.message,
        statusMessage: job.message,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        resultDataBase64: job.resultDataBase64 || null,
        job: {
          id: job.id,
          fileName: job.fileName,
          printer: job.printer,
          status: job.status,
          statusMessage: job.message,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
        },
      });
    } catch (error: any) {
      console.error('[PRINT API ERROR] handleGetJob:', error);
      return res.status(500).json({
        status: 'error',
        message: error?.message || 'Gagal memeriksa status job.',
      });
    }
  };

  app.get('/api/print/jobs/:id', handleGetJob);
  app.get('/print/jobs/:id', handleGetJob);
  app.get('/api/print/job/:id', handleGetJob);
  app.get('/print/job/:id', handleGetJob);

  /*
  |--------------------------------------------------------------------------
  | 4. LAPTOP HEARTBEAT (Gateway Laptop -> Server)
  |--------------------------------------------------------------------------
  */
  const handleHeartbeat = (req: Request, res: Response) => {
    try {
      gateway.online = true;
      gateway.lastSeenAt = Date.now();
      gateway.gatewayName = String(req.body?.gatewayName || 'Laptop Gateway SDIT');
      gateway.printers = Array.isArray(req.body?.printers) ? req.body.printers : [];

      return res.status(200).json({
        status: 'ok',
        message: 'Gateway terhubung.',
        serverTime: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('[PRINT GATEWAY ERROR] handleHeartbeat:', error);
      return res.status(500).json({
        status: 'error',
        message: error?.message || 'Gagal memproses heartbeat.',
      });
    }
  };

  app.post('/api/print/gateway/heartbeat', handleHeartbeat);
  app.post('/print/gateway/heartbeat', handleHeartbeat);

  /*
  |--------------------------------------------------------------------------
  | 5. LAPTOP GET PENDING JOB (Gateway Laptop -> Server)
  |--------------------------------------------------------------------------
  */
  const handleGetPending = (_req: Request, res: Response) => {
    try {
      cleanupJobs();
      const now = Date.now();
      const pendingJob = Array.from(jobs.values())
        .filter((job) => {
          if (job.status === 'WAITING') return true;
          return job.status === 'PROCESSING' && job.claimedAt && now - job.claimedAt > CLAIM_TIMEOUT_MS;
        })
        .sort((a, b) => a.createdAt - b.createdAt)[0];

      if (!pendingJob) {
        return res.status(200).json({
          status: 'ok',
          jobs: [],
        });
      }

      pendingJob.status = 'PROCESSING';
      pendingJob.claimedAt = now;
      pendingJob.updatedAt = now;
      pendingJob.message =
        pendingJob.mode === 'preview'
          ? 'Laptop Gateway sedang menyiapkan preview.'
          : `Laptop Gateway sedang memproses pencetakan ${pendingJob.fileName}.`;

      console.log(`[PRINT GATEWAY] Job diklaim gateway: ${pendingJob.id} | ${pendingJob.fileName}`);

      return res.status(200).json({
        status: 'ok',
        jobs: [
          {
            id: pendingJob.id,
            mode: pendingJob.mode,
            fileName: pendingJob.fileName,
            fileData: pendingJob.fileDataBase64,
            printer: pendingJob.printer,
            paper: pendingJob.paper,
            orientation: pendingJob.orientation,
            scale: pendingJob.scale,
            copies: pendingJob.copies,
            pageRange: pendingJob.pageRange,
          },
        ],
      });
    } catch (error: any) {
      console.error('[PRINT GATEWAY ERROR] handleGetPending:', error);
      return res.status(500).json({
        status: 'error',
        message: error?.message || 'Gagal mengambil antrean job.',
      });
    }
  };

  app.get('/api/print/gateway/pending', handleGetPending);
  app.get('/print/gateway/pending', handleGetPending);

  /*
  |--------------------------------------------------------------------------
  | 6. LAPTOP UPDATE JOB STATUS (Gateway Laptop -> Server)
  |--------------------------------------------------------------------------
  */
  const handleUpdateJob = (req: Request, res: Response) => {
    try {
      const jobId = String(req.body?.jobId || '').trim();
      const job = jobs.get(jobId);

      if (!job) {
        return res.status(404).json({
          status: 'error',
          message: 'Print job tidak ditemukan.',
        });
      }

      const nextStatus = String(req.body?.status || '').toUpperCase() as PrintJob['status'];
      const allowed = ['WAITING', 'PROCESSING', 'SENT', 'READY', 'FAILED'];

      if (!allowed.includes(nextStatus)) {
        return res.status(400).json({
          status: 'error',
          message: 'Status print job tidak valid.',
        });
      }

      job.status = nextStatus;
      job.message = String(req.body?.message || job.message);
      job.updatedAt = Date.now();
      if (nextStatus !== 'PROCESSING') {
        job.claimedAt = null;
      }

      if (req.body?.resultDataBase64) {
        const preview = normalizeBase64(req.body.resultDataBase64);
        if (estimateBytes(preview) <= MAX_FILE_BYTES * 2) {
          job.resultDataBase64 = preview;
        }
      }

      // Bersihkan data base64 setelah dokumen selesai dicetak atau gagal
      if (nextStatus === 'SENT' || nextStatus === 'FAILED') {
        job.fileDataBase64 = '';
      }

      console.log(`[PRINT GATEWAY] Job status update: ${job.id} -> ${job.status} (${job.message})`);

      return res.status(200).json({
        status: 'ok',
      });
    } catch (error: any) {
      console.error('[PRINT GATEWAY ERROR] handleUpdateJob:', error);
      return res.status(500).json({
        status: 'error',
        message: error?.message || 'Gagal memperbarui status job.',
      });
    }
  };

  app.post('/api/print/gateway/update-job', handleUpdateJob);
  app.post('/print/gateway/update-job', handleUpdateJob);
}
