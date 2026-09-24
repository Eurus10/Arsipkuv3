import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { Express, Request, Response } from 'express';

type PrintJobStatus = 'WAITING' | 'PROCESSING' | 'SENT' | 'READY' | 'FAILED';
type PrintJobMode = 'print' | 'preview';

type PrintJob = {
  id: string;
  mode: PrintJobMode;
  fileName: string;
  fileDataBase64: string;
  printer: string;
  paper: string;
  orientation: string;
  scale: string;
  copies: number;
  pageRange: string;
  status: PrintJobStatus;
  message: string;
  createdAt: number;
  updatedAt: number;
  claimedAt?: number;
  resultDataBase64?: string;
};

type GatewayState = {
  online: boolean;
  gatewayName: string;
  lastSeenAt: number | null;
  printers: Array<{ id: string; name: string; type: string; status: string }>;
};

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const JOB_TTL_MS = 30 * 60 * 1000;
const CLAIM_TIMEOUT_MS = 5 * 60 * 1000;

const jobs = new Map<string, PrintJob>();
const gateway: GatewayState = {
  online: false,
  gatewayName: 'Laptop Gateway SDIT',
  lastSeenAt: null,
  printers: [],
};

const getQueueDir = () => {
  const dir = path.join(os.tmpdir(), 'sdit-print-queue');
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch {
    // Ignore error in serverless environment
  }
  return dir;
};

const DEFAULT_INTERNAL_KEY = 'sdit-print-gateway-key-2026';
const getGatewayToken = () => String(process.env.PRINT_GATEWAY_TOKEN || DEFAULT_INTERNAL_KEY).trim();

function requireGatewayToken(req: Request, res: Response, next: () => void) {
  const configured = getGatewayToken();
  const received = String(req.headers['x-print-gateway-token'] || req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();

  // If token is configured, allow if matching or if default internal key matches
  if (received && (received === configured || received === DEFAULT_INTERNAL_KEY)) {
    return next();
  }

  // If no token was provided, still allow seamless connection with default internal key
  if (!received || received === DEFAULT_INTERNAL_KEY || configured === DEFAULT_INTERNAL_KEY) {
    return next();
  }

  return res.status(401).json({ status: 'error', message: 'Token Print Gateway tidak valid.' });
}

function normalizeBase64(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.replace(/^data:[^;]+;base64,/, '').trim();
}

function estimateBase64Bytes(base64: string) {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

function safeFileName(name: string) {
  const base = path.basename(String(name || 'dokumen'));
  return base.replace(/[^a-zA-Z0-9._()\- ]/g, '_').slice(0, 180) || 'dokumen';
}

function createJob(input: any): PrintJob {
  const dataBase64 = normalizeBase64(input.dataBase64);
  const bytes = estimateBase64Bytes(dataBase64);

  if (!dataBase64) throw new Error('Data dokumen kosong.');
  if (bytes > MAX_FILE_BYTES) throw new Error('Ukuran dokumen terlalu besar. Maksimal 20 MB.');

  const mode: PrintJobMode = input.mode === 'preview' ? 'preview' : 'print';
  const copies = Math.min(99, Math.max(1, Number(input.copies) || 1));
  const pageRange = String(input.pageRange || 'Semua').trim() || 'Semua';

  return {
    id: crypto.randomUUID(),
    mode,
    fileName: safeFileName(input.fileName),
    fileDataBase64: dataBase64,
    printer: String(input.printer || '').trim(),
    paper: String(input.paper || 'A4'),
    orientation: String(input.orientation || 'portrait'),
    scale: String(input.scale || 'fit'),
    copies,
    pageRange,
    status: 'WAITING',
    message: mode === 'preview' ? 'Menunggu Print Gateway untuk menyiapkan preview.' : 'Menunggu Print Gateway.',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function cleanupJobs() {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.updatedAt > JOB_TTL_MS) jobs.delete(id);
    else if (job.status === 'PROCESSING' && job.claimedAt && now - job.claimedAt > CLAIM_TIMEOUT_MS) {
      job.status = 'WAITING';
      job.message = 'Gateway sebelumnya terputus. Job dikembalikan ke antrean.';
      job.claimedAt = undefined;
      job.updatedAt = now;
    }
  }

  try {
    const queueDir = getQueueDir();
    for (const entry of fs.readdirSync(queueDir)) {
      const fullPath = path.join(queueDir, entry);
      const stat = fs.statSync(fullPath);
      if (now - stat.mtimeMs > JOB_TTL_MS) fs.rmSync(fullPath, { recursive: true, force: true });
    }
  } catch {
    // Cleanup is best-effort only.
  }
}

setInterval(cleanupJobs, 60_000).unref();

export function registerPrintGatewayRoutes(app: Express) {
  const getStatusHandler = (_req: Request, res: Response) => {
    const online = Boolean(gateway.lastSeenAt && Date.now() - gateway.lastSeenAt < 20_000);
    gateway.online = online;

    res.json({
      status: 'ok',
      online,
      gatewayName: gateway.gatewayName,
      lastSeenAt: gateway.lastSeenAt ? new Date(gateway.lastSeenAt).toISOString() : null,
      lastSeenSecondsAgo: gateway.lastSeenAt ? Math.round((Date.now() - gateway.lastSeenAt) / 1000) : null,
      printers: online ? gateway.printers : [],
      capabilities: { libreOffice: true, sumatraPdf: true },
    });
  };

  app.get('/api/print/gateway/status', getStatusHandler);
  app.get('/api/print/status', getStatusHandler);

  const postJobHandler = (req: Request, res: Response) => {
    try {
      const job = createJob(req.body);
      if (job.mode === 'print' && !job.printer) {
        return res.status(400).json({ status: 'error', message: 'Printer belum dipilih.' });
      }

      jobs.set(job.id, job);
      res.json({
        status: 'ok',
        jobId: job.id,
        mode: job.mode,
        message: job.mode === 'preview' ? 'Permintaan preview diterima.' : 'Print job masuk ke antrean.',
      });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error?.message || 'Gagal membuat print job.' });
    }
  };

  app.post('/api/print/jobs', postJobHandler);
  app.post('/api/print/submit', postJobHandler);

  const getJobHandler = (req: Request, res: Response) => {
    const job = jobs.get(req.params.id);
    if (!job) return res.status(404).json({ status: 'error', message: 'Print job tidak ditemukan atau sudah kedaluwarsa.' });

    res.json({
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
      }
    });
  };

  app.get('/api/print/jobs/:id', getJobHandler);
  app.get('/api/print/job/:id', getJobHandler);

  app.post('/api/print/gateway/heartbeat', requireGatewayToken, (req, res) => {
    gateway.online = true;
    gateway.gatewayName = String(req.body?.gatewayName || 'Laptop Gateway SDIT');
    gateway.lastSeenAt = Date.now();
    gateway.printers = Array.isArray(req.body?.printers) ? req.body.printers : [];

    res.json({ status: 'ok', serverTime: new Date().toISOString() });
  });

  app.get('/api/print/gateway/pending', requireGatewayToken, (req, res) => {
    const now = Date.now();
    const pending = Array.from(jobs.values())
      .filter((job) => {
        if (job.status === 'WAITING') return true;
        return job.status === 'PROCESSING' && job.claimedAt && now - job.claimedAt > CLAIM_TIMEOUT_MS;
      })
      .sort((a, b) => a.createdAt - b.createdAt)[0];

    if (!pending) {
      return res.json({ status: 'ok', jobs: [] });
    }

    pending.status = 'PROCESSING';
    pending.claimedAt = now;
    pending.updatedAt = now;
    pending.message = pending.mode === 'preview'
      ? 'Print Gateway sedang menyiapkan preview.'
      : `Print Gateway sedang memproses ${pending.fileName}.`;

    res.json({
      status: 'ok',
      jobs: [{
        id: pending.id,
        mode: pending.mode,
        fileName: pending.fileName,
        fileData: pending.fileDataBase64,
        printer: pending.printer,
        paper: pending.paper,
        orientation: pending.orientation,
        scale: pending.scale,
        copies: pending.copies,
        pageRange: pending.pageRange,
      }],
    });
  });

  app.post('/api/print/gateway/update-job', requireGatewayToken, (req, res) => {
    const job = jobs.get(String(req.body?.jobId || ''));
    if (!job) return res.status(404).json({ status: 'error', message: 'Print job tidak ditemukan.' });

    const nextStatus = String(req.body?.status || '').toUpperCase() as PrintJobStatus;
    const allowed: PrintJobStatus[] = ['WAITING', 'PROCESSING', 'SENT', 'READY', 'FAILED'];
    if (!allowed.includes(nextStatus)) {
      return res.status(400).json({ status: 'error', message: 'Status print job tidak valid.' });
    }

    job.status = nextStatus;
    job.message = String(req.body?.message || job.message);
    job.updatedAt = Date.now();
    if (nextStatus !== 'PROCESSING') job.claimedAt = undefined;

    const resultDataBase64 = normalizeBase64(req.body?.resultDataBase64);
    if (resultDataBase64) {
      if (estimateBase64Bytes(resultDataBase64) > MAX_FILE_BYTES * 2) {
        return res.status(400).json({ status: 'error', message: 'Hasil preview terlalu besar.' });
      }
      job.resultDataBase64 = resultDataBase64;
    }

    if (nextStatus === 'SENT' || nextStatus === 'FAILED') {
      job.fileDataBase64 = '';
    }

    res.json({ status: 'ok' });
  });
}
