import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import app from './src/server/app';

async function startServer() {
  const PORT = 3000;
  let vite: any;

  // Vite middleware for development & static files for production
  if (process.env.NODE_ENV !== 'production') {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Evaluasi Pembelajaran Server running on http://localhost:${PORT}`);
  });

  // Handle WebSocket upgrades for Vite's HMR in development
  if (process.env.NODE_ENV !== 'production' && vite) {
    server.on('upgrade', (req, socket, head) => {
      vite.ws.handleUpgrade(req, socket, head);
    });
  }
}

startServer();
