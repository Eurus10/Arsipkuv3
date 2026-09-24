import crypto from 'crypto';
import type { Express, Request, Response } from 'express';

type PrintJobStatus =
  | 'WAITING'
  | 'PROCESSING'
  | 'SENT'
  | 'READY'
  | 'FAILED';

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
  resultDataBase64?: string;
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

/*
|--------------------------------------------------------------------------
| PRINT QUEUE SEDERHANA
|--------------------------------------------------------------------------
| Tidak menggunakan:
| - token
| - database
| - Supabase
| - filesystem server
| - scheduler
|
| Untuk tahap testing, job disimpan di memory server.
|--------------------------------------------------------------------------
*/

const jobs = new Map<string, PrintJob>();

const gateway: GatewayState = {
  online: false,
  gatewayName: 'Laptop Gateway SDIT',
  lastSeenAt: null,
  printers: [],
};

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const JOB_TIMEOUT = 10 * 60 * 1000;

function normalizeBase64(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .replace(/^data:[^;]+;base64,/, '')
    .trim();
}

function estimateBase64Bytes(base64: string): number {
  const padding = base64.endsWith('==')
    ? 2
    : base64.endsWith('=')
      ? 1
      : 0;

  return Math.max(
    0,
    Math.floor((base64.length * 3) / 4) - padding
  );
}

function safeFileName(name: unknown): string {
  const value = String(name || 'dokumen.pdf');

  return (
    value
      .split(/[\\/]/)
      .pop()
      ?.replace(/[^a-zA-Z0-9._()\-\s]/g, '_')
      .slice(0, 180) || 'dokumen.pdf'
  );
}

function cleanupJobs() {
  const now = Date.now();

  for (const [id, job] of jobs.entries()) {
    if (now - job.updatedAt > JOB_TIMEOUT) {
      jobs.delete(id);
    }
  }
}

function createJob(input: any): PrintJob {
  const fileDataBase64 = normalizeBase64(
    input?.dataBase64
  );

  if (!fileDataBase64) {
    throw new Error('Data dokumen kosong.');
  }

  const fileSize = estimateBase64Bytes(
    fileDataBase64
  );

  if (fileSize > MAX_FILE_BYTES) {
    throw new Error(
      'Ukuran dokumen terlalu besar. Maksimal 20 MB.'
    );
  }

  const mode: PrintJobMode =
    input?.mode === 'preview'
      ? 'preview'
      : 'print';

  const copies = Math.min(
    99,
    Math.max(1, Number(input?.copies) || 1)
  );

  return {
    id: crypto.randomUUID(),

    mode,

    fileName: safeFileName(
      input?.fileName
    ),

    fileDataBase64,

    printer: String(
      input?.printer || ''
    ).trim(),

    paper: String(
      input?.paper || 'A4'
    ),

    orientation: String(
      input?.orientation || 'portrait'
    ),

    scale: String(
      input?.scale || 'fit'
    ),

    copies,

    pageRange:
      String(
        input?.pageRange || 'Semua'
      ).trim() || 'Semua',

    status: 'WAITING',

    message:
      mode === 'preview'
        ? 'Menunggu gateway untuk membuat preview.'
        : 'Menunggu laptop gateway.',

    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function registerPrintGatewayRoutes(
  app: Express
) {
  /*
  |--------------------------------------------------------------------------
  | STATUS GATEWAY
  |--------------------------------------------------------------------------
  */

  app.get(
    '/api/print/gateway/status',
    (_req: Request, res: Response) => {
      const online =
        Boolean(
          gateway.lastSeenAt &&
            Date.now() -
              gateway.lastSeenAt <
              20_000
        );

      gateway.online = online;

      res.json({
        status: 'ok',

        online,

        gatewayName:
          gateway.gatewayName,

        lastSeenAt:
          gateway.lastSeenAt
            ? new Date(
                gateway.lastSeenAt
              ).toISOString()
            : null,

        printers: online
          ? gateway.printers
          : [],

        capabilities: {
          libreOffice: true,
          sumatraPdf: true,
        },
      });
    }
  );

  /*
  |--------------------------------------------------------------------------
  | BUAT PRINT JOB
  |--------------------------------------------------------------------------
  */

  app.post(
    '/api/print/jobs',
    (req: Request, res: Response) => {
      try {
        const job =
          createJob(req.body);

        if (
          job.mode === 'print' &&
          !job.printer
        ) {
          return res.status(400).json({
            status: 'error',
            message:
              'Printer belum dipilih.',
          });
        }

        jobs.set(
          job.id,
          job
        );

        console.log(
          `[PRINT JOB] ${job.id} | ${job.fileName} | ${job.printer || 'preview'}`
        );

        return res.json({
          status: 'ok',

          jobId: job.id,

          message:
            job.mode === 'preview'
              ? 'Permintaan preview diterima.'
              : 'Print job masuk antrean.',
        });
      } catch (error: any) {
        console.error(
          '[PRINT JOB ERROR]',
          error
        );

        return res.status(400).json({
          status: 'error',
          message:
            error?.message ||
            'Gagal membuat print job.',
        });
      }
    }
  );

  /*
  |--------------------------------------------------------------------------
  | CEK STATUS JOB
  |--------------------------------------------------------------------------
  */

  app.get(
    '/api/print/jobs/:id',
    (req: Request, res: Response) => {
      cleanupJobs();

      const job =
        jobs.get(
          req.params.id
        );

      if (!job) {
        return res.status(404).json({
          status: 'error',
          message:
            'Print job tidak ditemukan.',
        });
      }

      return res.json({
        status: 'ok',

        jobId: job.id,

        mode: job.mode,

        fileName:
          job.fileName,

        printer:
          job.printer,

        statusJob:
          job.status,

        message:
          job.message,

        statusMessage:
          job.message,

        resultDataBase64:
          job.resultDataBase64 ||
          null,

        createdAt:
          job.createdAt,

        updatedAt:
          job.updatedAt,
      });
    }
  );

  /*
  |--------------------------------------------------------------------------
  | LAPTOP GATEWAY HEARTBEAT
  |--------------------------------------------------------------------------
  */

  app.post(
    '/api/print/gateway/heartbeat',
    (req: Request, res: Response) => {
      gateway.online = true;

      gateway.gatewayName =
        String(
          req.body?.gatewayName ||
            'Laptop Gateway SDIT'
        );

      gateway.lastSeenAt =
        Date.now();

      gateway.printers =
        Array.isArray(
          req.body?.printers
        )
          ? req.body.printers
          : [];

      console.log(
        `[GATEWAY] ${gateway.gatewayName} | ${gateway.printers.length} printer`
      );

      return res.json({
        status: 'ok',
        message:
          'Gateway terhubung.',
        serverTime:
          new Date().toISOString(),
      });
    }
  );

  /*
  |--------------------------------------------------------------------------
  | LAPTOP MENGAMBIL JOB
  |--------------------------------------------------------------------------
  */

  app.get(
    '/api/print/gateway/pending',
    (_req: Request, res: Response) => {
      cleanupJobs();

      const waitingJobs =
        Array.from(
          jobs.values()
        )
          .filter(
            (job) =>
              job.status ===
              'WAITING'
          )
          .sort(
            (a, b) =>
              a.createdAt -
              b.createdAt
          );

      const job =
        waitingJobs[0];

      if (!job) {
        return res.json({
          status: 'ok',
          jobs: [],
        });
      }

      job.status =
        'PROCESSING';

      job.updatedAt =
        Date.now();

      job.message =
        'Sedang diproses oleh laptop gateway.';

      console.log(
        `[GATEWAY PICK] ${job.id} | ${job.fileName}`
      );

      return res.json({
        status: 'ok',

        jobs: [
          {
            id: job.id,

            mode: job.mode,

            fileName:
              job.fileName,

            fileData:
              job.fileDataBase64,

            printer:
              job.printer,

            paper:
              job.paper,

            orientation:
              job.orientation,

            scale:
              job.scale,

            copies:
              job.copies,

            pageRange:
              job.pageRange,
          },
        ],
      });
    }
  );

  /*
  |--------------------------------------------------------------------------
  | UPDATE STATUS JOB
  |--------------------------------------------------------------------------
  */

  app.post(
    '/api/print/gateway/update-job',
    (req: Request, res: Response) => {
      const jobId =
        String(
          req.body?.jobId || ''
        );

      const job =
        jobs.get(jobId);

      if (!job) {
        return res.status(404).json({
          status: 'error',
          message:
            'Print job tidak ditemukan.',
        });
      }

      const status =
        String(
          req.body?.status || ''
        ).toUpperCase();

      const allowed = [
        'WAITING',
        'PROCESSING',
        'SENT',
        'READY',
        'FAILED',
      ];

      if (
        !allowed.includes(
          status
        )
      ) {
        return res.status(400).json({
          status: 'error',
          message:
            'Status job tidak valid.',
        });
      }

      job.status =
        status as PrintJobStatus;

      job.message =
        String(
          req.body?.message ||
            job.message
        );

      job.updatedAt =
        Date.now();

      if (
        req.body?.resultDataBase64
      ) {
        const preview =
          normalizeBase64(
            req.body
              .resultDataBase64
          );

        if (
          estimateBase64Bytes(
            preview
          ) >
          MAX_FILE_BYTES * 2
        ) {
          return res.status(400).json({
            status: 'error',
            message:
              'File preview terlalu besar.',
          });
        }

        job.resultDataBase64 =
          preview;
      }

      /*
      Setelah berhasil dikirim ke printer,
      data file tidak perlu disimpan lagi.
      */

      if (
        status === 'SENT' ||
        status === 'FAILED'
      ) {
        job.fileDataBase64 =
          '';
      }

      console.log(
        `[JOB STATUS] ${job.id} → ${status} | ${job.message}`
      );

      return res.json({
        status: 'ok',
      });
    }
  );
}