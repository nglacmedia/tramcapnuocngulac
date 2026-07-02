/**
 * server.js
 * -----------------------------------------------------------------------
 * Trang thông tin điện tử Trạm cấp nước xã Ngũ Lạc
 * - Phục vụ frontend tĩnh (public/)
 * - Cấp API JSON cho danh sách / chi tiết bài viết đã reup
 * - Lên lịch tự động cào tin (node-cron) từ 2 nguồn cấu hình trong
 *   scraper/sources.js
 * -----------------------------------------------------------------------
 */

const path = require('path');
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const { runAllSources, loadArticles } = require('./scraper/scraper');

const app = express();
const PORT = process.env.PORT || 3000;

// Đặt biến môi trường SCRAPE_TRIGGER_TOKEN để bảo vệ endpoint kích hoạt quét thủ công.
// Nếu không đặt, endpoint /api/scrape/run sẽ bị vô hiệu hoá (an toàn theo mặc định).
const SCRAPE_TRIGGER_TOKEN = process.env.SCRAPE_TRIGGER_TOKEN || null;

// Lịch quét tự động: mặc định mỗi 30 phút. Có thể ghi đè bằng biến môi trường
// SCRAPE_CRON (cú pháp cron chuẩn 5 trường).
const SCRAPE_CRON = process.env.SCRAPE_CRON || '*/30 * * * *';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------
// Bộ nhớ đệm trong tiến trình (in-memory cache) để API phản hồi nhanh,
// đồng bộ lại từ file JSON mỗi khi có lượt quét mới hoàn tất.
// ---------------------------------------------------------------------
let articlesCache = loadArticles();

function refreshCache() {
  articlesCache = loadArticles();
}

// ---------------------------------------------------------------------
// API: danh sách nguồn tin + số lượng bài hiện có
// ---------------------------------------------------------------------
app.get('/api/sources', (req, res) => {
  const counts = new Map();
  for (const a of articlesCache) {
    counts.set(a.sourceId, (counts.get(a.sourceId) || 0) + 1);
  }
  const sources = [];
  const seen = new Set();
  for (const a of articlesCache) {
    if (seen.has(a.sourceId)) continue;
    seen.add(a.sourceId);
    sources.push({
      id: a.sourceId,
      name: a.sourceName,
      tag: a.sourceTag,
      count: counts.get(a.sourceId) || 0
    });
  }
  res.json({ sources });
});

// ---------------------------------------------------------------------
// API: danh sách bài viết (hỗ trợ lọc theo nguồn, danh mục, từ khoá, phân trang)
//   GET /api/articles?source=trungtamnuocsach&category=van-ban&q=nuoc&page=1&pageSize=9
// ---------------------------------------------------------------------
app.get('/api/articles', (req, res) => {
  const { source, category, q } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 9, 1), 50);

  let filtered = articlesCache;

  if (source) filtered = filtered.filter((a) => a.sourceId === source);
  if (category) filtered = filtered.filter((a) => a.category === category);
  if (q) {
    const needle = q.toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.title.toLowerCase().includes(needle) ||
        (a.summary || '').toLowerCase().includes(needle)
    );
  }

  const total = filtered.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize).map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    summary: a.summary,
    thumbnail: a.thumbnail,
    publishDateDisplay: a.publishDateDisplay,
    category: a.category,
    sourceId: a.sourceId,
    sourceName: a.sourceName,
    sourceTag: a.sourceTag
  }));

  res.json({ items, total, page, pageSize, totalPages });
});

// ---------------------------------------------------------------------
// API: chi tiết 1 bài viết
// ---------------------------------------------------------------------
app.get('/api/articles/:id', (req, res) => {
  const article = articlesCache.find((a) => a.id === req.params.id);
  if (!article) {
    return res.status(404).json({ error: 'Không tìm thấy bài viết.' });
  }
  res.json({ item: article });
});

// ---------------------------------------------------------------------
// API: kích hoạt quét thủ công (bảo vệ bằng token nếu đã cấu hình)
// ---------------------------------------------------------------------
app.post('/api/scrape/run', async (req, res) => {
  if (!SCRAPE_TRIGGER_TOKEN) {
    return res.status(403).json({ error: 'Chức năng quét thủ công đang tắt (chưa cấu hình SCRAPE_TRIGGER_TOKEN).' });
  }
  const token = req.headers['x-scrape-token'];
  if (token !== SCRAPE_TRIGGER_TOKEN) {
    return res.status(401).json({ error: 'Token không hợp lệ.' });
  }
  try {
    const result = await runAllSources();
    refreshCache();
    res.json({ ok: true, total: result.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, articles: articlesCache.length, time: new Date().toISOString() });
});

// Mọi route frontend khác trả về index.html (điều hướng phía client đơn giản)
app.get(['/', '/tin-tuc', '/van-ban', '/bai-viet/:id'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------------------------------------------------------------------
// Khởi động
// ---------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`✅ Trạm cấp nước xã Ngũ Lạc đang chạy tại http://localhost:${PORT}`);
  console.log(`   Lịch tự động quét tin: "${SCRAPE_CRON}"`);
});

// Lên lịch quét tự động
cron.schedule(SCRAPE_CRON, async () => {
  try {
    await runAllSources();
    refreshCache();
  } catch (err) {
    console.error('[cron] Lỗi khi quét tự động:', err.message);
  }
});

// Quét ngay 1 lần lúc khởi động nếu kho dữ liệu còn quá ít bài (ví dụ mới cài đặt).
// Bọc trong try/catch vì môi trường có thể không có internet ra ngoài — khi đó
// site vẫn chạy bình thường với dữ liệu mẫu (seed) đã có sẵn.
if (articlesCache.length < 3) {
  runAllSources()
    .then(() => refreshCache())
    .catch((err) => console.warn('[startup] Bỏ qua lượt quét khởi động (có thể do không có mạng ra ngoài):', err.message));
}
