const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { getConfig } = require('./config');
const authRoutes = require('./routes/auth.routes');

const propertyStatusAssetsRoutes = require('./routes/propertyStatusAssets.routes');
const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors((req, callback) => {
    callback(null, {
      origin: getConfig().clientOrigin,
      credentials: true,
    });
  })
);
app.use(express.json({ limit: '30mb' }));
app.use(cookieParser());

app.use((req, res, next) => {
  if (
    req.path.startsWith('/api/auth/') &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) &&
    req.get('origin') &&
    req.get('origin') !== getConfig().clientOrigin
  ) {
    return res.status(403).json({ message: '不允許的來源' });
  }
  return next();
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/property-status-assets', propertyStatusAssetsRoutes);

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'JSON 格式錯誤' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ message: '請求內容過大' });
  }

  console.error('API request failed:', error.message);
  return res.status(500).json({ message: '伺服器發生錯誤' });
});

module.exports = app;

if (require.main === module) {
  require('./index');
}
