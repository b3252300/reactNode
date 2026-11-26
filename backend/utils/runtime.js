// 判斷目前是否在 Cloudflare Workers 執行（workerd 會把 navigator.userAgent 設為 'Cloudflare-Workers'）。
const isWorkers =
  typeof navigator !== 'undefined' &&
  navigator.userAgent === 'Cloudflare-Workers';

// Cloudflare 的 bindings（例如 Rate Limiting）由 worker.mjs 在啟動時註冊進來。
let workerEnv = null;

function setWorkerEnv(env) {
  workerEnv = env;
}

function getWorkerEnv() {
  return workerEnv;
}

module.exports = { isWorkers, setWorkerEnv, getWorkerEnv };
