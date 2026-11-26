// Cloudflare Workers 進入點。本機 Node.js 開發仍使用 index.js（node index.js）。
//
// 架構：
//   瀏覽器 → Worker（fetch）→ Durable Object「ApiServer」→ Express app
//
// 為什麼要用 Durable Object：一般 Worker 不允許在不同請求之間共用 TCP 連線，
// MongoDB 連線池被重複使用時會出現 "code had hung" / "different request context" 錯誤。
// Durable Object 的所有請求共用同一個 I/O context，可以安全地保留並重用 Mongoose 連線。
import { DurableObject } from 'cloudflare:workers';
import { handleAsNodeRequest } from 'cloudflare:node';
import express from 'express';
import mongoose from 'mongoose';
import runtime from './utils/runtime.js';
import app from './app.js';

const PORT = 8787;

const server = express();
server.disable('x-powered-by');
server.use(app);
server.listen(PORT);

let connectPromise = null;
function connectDb(env) {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  const mongoUri = env?.MONGODB_URI || process.env.MONGODB_URI;
  connectPromise ??= mongoose
    .connect(mongoUri, {
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 5,
      maxIdleTimeMS: 60_000,
    })
    .catch((error) => {
      connectPromise = null;
      throw error;
    });
  return connectPromise;
}

export class ApiServer extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    runtime.setWorkerEnv(env);
  }

  async fetch(request) {
    try {
      await connectDb(this.env);
    } catch (error) {
      console.error('MongoDB connection failed:', error.message);
      return Response.json({ message: '資料庫暫時無法連線' }, { status: 503 });
    }
    return handleAsNodeRequest(PORT, request);
  }
}

export default {
  // 只有 /api/* 會進到這裡（見 wrangler.jsonc 的 run_worker_first），其餘由靜態資源回應。
  fetch(request, env) {
    const stub = env.API_SERVER.get(env.API_SERVER.idFromName('api'));
    return stub.fetch(request);
  },
};
