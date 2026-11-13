const express = require('express');
const { Pool } = require('pg');
const { createHmac, timingSafeEqual, randomUUID } = require('node:crypto');

const { DATABASE_URL, APP_PASSWORD, SESSION_SECRET, FRONTEND_ORIGIN, PORT = 5000 } = process.env;
if (!DATABASE_URL || !APP_PASSWORD || APP_PASSWORD.length < 12 || !SESSION_SECRET || SESSION_SECRET.length < 32 || !FRONTEND_ORIGIN) {
  throw new Error('Set DATABASE_URL, FRONTEND_ORIGIN, APP_PASSWORD (12+ characters), and SESSION_SECRET (32+ characters).');
}
const db = new Pool({ connectionString: DATABASE_URL, connectionTimeoutMillis: 5000 });
const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (req.headers.origin === FRONTEND_ORIGIN) {
    res.set('Access-Control-Allow-Origin', FRONTEND_ORIGIN);
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  }
  res.vary('Origin');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: '1mb' }));

const sign = value => createHmac('sha256', SESSION_SECRET).update(value).digest('base64url');
const equal = (a, b) => timingSafeEqual(Buffer.from(sign(a)), Buffer.from(sign(b)));
const attempts = new Map();
setInterval(() => {
  for (const [key, entry] of attempts) if (entry.until < Date.now()) attempts.delete(key);
}, 60_000).unref();

app.get('/api/health', async (_req, res) => {
  await db.query('SELECT 1');
  res.json({ status: 'ok' });
});
app.set('trust proxy', 1);
app.post('/api/session', (req, res) => {
  const now = Date.now();
  let entry = attempts.get(req.ip);
  if (!entry || entry.until < now) entry = { count: 0, until: now + 60_000 };
  if (entry.count >= 8) return res.status(429).json({ error: 'Vui lòng thử lại sau một phút.' });
  if (typeof req.body?.password !== 'string' || !equal(req.body.password, APP_PASSWORD)) {
    entry.count++;
    if (attempts.size < 10_000 || attempts.has(req.ip)) attempts.set(req.ip, entry);
    return res.status(401).json({ error: 'Mật khẩu chưa đúng.' });
  }
  attempts.delete(req.ip);
  const value = (now + 8 * 3600_000) + '.' + randomUUID();
  res.json({ token: value + '.' + sign(value) });
});
app.use('/api', (req, res, next) => {
  const token = /^Bearer (\d+)\.([\w-]+)\.([\w-]+)$/.exec(req.headers.authorization || '');
  if (!token || Number(token[1]) <= Date.now() || !equal(token[3], sign(token[1] + '.' + token[2]))) {
    return res.status(401).json({ error: 'Phiên đã hết hạn. Vui lòng đăng nhập lại.' });
  }
  next();
});

const string = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
function webUrl(value) {
  try {
    const url = new URL(value);
    if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password) return url.href;
  } catch {}
  return '';
}
function validate(kind, input) {
  const title = string(input?.title, 120);
  if (!title) throw new Error('Vui lòng nhập tên.');
  if (kind === 'links') {
    const url = webUrl(string(input.url, 2048));
    if (!url) throw new Error('Vui lòng nhập địa chỉ HTTP hoặc HTTPS hợp lệ.');
    const image = input.image || '';
    if (typeof image !== 'string' || (image && !(/^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/.test(image) && image.length <= 800000) && !webUrl(string(image, 2048)))) {
      throw new Error('Ảnh quá lớn hoặc đường dẫn ảnh chưa hợp lệ.');
    }
    return { title, url, image: image.startsWith('data:') ? image : webUrl(string(image, 2048)), category: string(input.category, 40), note: string(input.note, 500) };
  }
  const date = string(input.date, 10);
  const start = string(input.start, 5);
  const end = string(input.end, 5);
  const parsed = new Date(date + 'T00:00:00Z');
  const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(+parsed) || parsed.toISOString().slice(0, 10) !== date ||
      !time.test(start) || !time.test(end) || end <= start) throw new Error('Chọn ngày hợp lệ và giờ kết thúc sau giờ bắt đầu.');
  return { title, date, start, end, note: string(input.note, 500), done: input.done === true };
}

for (const kind of ['links', 'tasks']) {
  const route = '/api/' + kind;
  app.get(route, async (_req, res) => {
    const result = await db.query('SELECT id, data FROM entries WHERE kind = $1 ORDER BY created_at DESC, id', [kind]);
    res.json(result.rows.map(({ id, data }) => ({ id, ...data })));
  });
  for (const method of ['post', 'put']) {
    app[method](route + (method === 'put' ? '/:id' : ''), async (req, res) => {
      let data;
      try { data = validate(kind, req.body); }
      catch (error) { return res.status(400).json({ error: error.message }); }
      const id = req.params.id || randomUUID();
      const result = method === 'post'
        ? await db.query('INSERT INTO entries (id, kind, data) VALUES ($1, $2, $3)', [id, kind, data])
        : await db.query('UPDATE entries SET data = $3 WHERE id = $1 AND kind = $2', [id, kind, data]);
      if (!result.rowCount) return res.status(404).json({ error: 'Mục này đã bị xóa.' });
      res.status(method === 'post' ? 201 : 200).json({ id, ...data });
    });
  }
  app.delete(route + '/:id', async (req, res) => {
    await db.query('DELETE FROM entries WHERE id = $1 AND kind = $2', [req.params.id, kind]);
    res.sendStatus(204);
  });
}
app.use((error, _req, res, _next) => {
  if (error.status === 413) return res.status(413).json({ error: 'Dữ liệu quá lớn.' });
  if (error.status === 400) return res.status(400).json({ error: 'Dữ liệu gửi lên chưa hợp lệ.' });
  console.error(error.code || error.name);
  res.status(503).json({ error: 'Máy chủ tạm thời chưa sẵn sàng. Vui lòng thử lại.' });
});

db.query(`CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('links', 'tasks')),
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`).then(() => app.listen(PORT, '0.0.0.0', () => console.log('API ready on port ' + PORT)))
  .catch(error => { console.error('Database startup failed:', error.code || error.message); process.exit(1); });
