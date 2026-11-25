const path = require('node:path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

function getConfig() {
  const {
    NODE_ENV = 'development',
    PORT = '4000',
    MONGODB_URI,
    CLIENT_ORIGIN,
    JWT_ACCESS_SECRET,
    COOKIE_SAME_SITE = 'lax',
  } = process.env;

  if (!MONGODB_URI) {
    throw new Error(
      'MONGODB_URI is missing. From backend/, run "cp .env.example .env" and set MONGODB_URI in backend/.env.'
    );
  }
  if (!CLIENT_ORIGIN) {
    throw new Error('CLIENT_ORIGIN is required');
  }
  if (!JWT_ACCESS_SECRET || JWT_ACCESS_SECRET.length < 32) {
    throw new Error('JWT_ACCESS_SECRET must be at least 32 characters');
  }

  let clientOrigin;
  try {
    clientOrigin = new URL(CLIENT_ORIGIN).origin;
  } catch {
    throw new Error('CLIENT_ORIGIN must be a valid URL');
  }

  if (clientOrigin !== CLIENT_ORIGIN || clientOrigin === 'null') {
    throw new Error('CLIENT_ORIGIN must be an origin without a path or trailing slash');
  }
  if (!['strict', 'lax', 'none'].includes(COOKIE_SAME_SITE)) {
    throw new Error('COOKIE_SAME_SITE must be strict, lax, or none');
  }
  if (COOKIE_SAME_SITE === 'none' && NODE_ENV !== 'production') {
    throw new Error('COOKIE_SAME_SITE=none requires production HTTPS');
  }

  const port = Number(PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port');
  }

  return {
    nodeEnv: NODE_ENV,
    port,
    mongoUri: MONGODB_URI,
    clientOrigin,
    jwtAccessSecret: JWT_ACCESS_SECRET,
    cookieSameSite: COOKIE_SAME_SITE,
  };
}

module.exports = { getConfig };
