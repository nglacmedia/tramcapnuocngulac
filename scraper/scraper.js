/**
 * scraper.js
 * -----------------------------------------------------------------------
 * Logic cào (scrape) + làm sạch + lưu trữ bài viết từ các nguồn cấu hình
 * trong sources.js. Chạy độc lập được (npm run scrape:now) hoặc được
 * server.js gọi định kỳ qua node-cron.
 * -----------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');
const { SOURCES } = require('./sources');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'articles.json');
const SEED_FILE = path.join(DATA_DIR, 'articles.seed.json');

const HTTP_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/124.0.0.0 Safari/537.36 TramNuocNguLac-ReupBot/1.0 (+lien-he: tramcapnuocngulac@example.gov.vn)',
  'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
};

const MAX_LIST_ITEMS_PER_SOURCE = 12; // số bài mới nhất lấy mỗi nguồn mỗi lượt quét
const REQUEST_TIMEOUT_MS = 15000;
const REQUEST_GAP_MS = 800; // giãn cách giữa các request để lịch sự với server nguồn

// -----------------------------------------------------------------------
// Tiện ích
// -----------------------------------------------------------------------

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    const seed = fs.existsSync(SEED_FILE)
      ? JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'))
      : [];
    fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2), 'utf-8');
  }
}

function loadArticles() {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch (err) {
    console.error('[scraper] Không đọc được articles.json, trả về mảng rỗng:', err.message);
    return [];
  }
}

function saveArticles(articles) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(articles, null, 2), 'utf-8');
}

function makeId(sourceId, url) {
  const hash = crypto.createHash('sha1').update(url).digest('hex').slice(0, 12);
  return `${sourceId}-${hash}`;
}

function slugify(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 90);
}

function resolveUrl(baseUrl, maybeRelative) {
  if (!maybeRelative) return null;
  try {
    return new URL(maybeRelative, baseUrl).toString();
  } catch {
    return null;
  }
}

/** Thử lần lượt các selector trong mảng, trả về $el đầu tiên có kết quả. */
function firstMatch($scope, selectorList) {
  for (const sel of selectorList) {
    const found = $scope(sel);
    if (found && found.length) return found;
  }
  return null;
}

/** Tìm chuỗi ngày dạng dd/mm/yyyy trong text thô của 1 khối HTML. */
function extractDateText(text) {
  const match = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;
  const [, d, m, y] = match;
  return { display: `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`, iso: `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` };
}

/** Phân loại Tin tức vs Văn bản pháp quy dựa trên từ khoá tiêu đề. */
function classifyCategory(title) {
  const t = title.toUpperCase();
  const legalKeywords = ['THÔNG BÁO', 'QUYẾT ĐỊNH', 'CÔNG VĂN', 'CHỈ THỊ', 'NGHỊ ĐỊNH', 'THÔNG TƯ', 'KẾ HOẠCH', 'HƯỚNG DẪN'];
  return legalKeywords.some((k) => t.includes(k)) ? 'van-ban' : 'tin-tuc';
}

/**
 * Làm sạch nội dung chi tiết trước khi lưu:
 * - Bỏ script/style/iframe/form và các thuộc tính sự kiện (onclick...)
 * - Quy đổi src/href tương đối thành tuyệt đối
 * - Thay các liên kết nội bộ trỏ về chính domain nguồn bằng <span> giữ
 *   nguyên chữ (loại bỏ điều hướng "gãy" sang trang gốc ngay trong bài reup)
 * - Giữ nguyên liên kết ngoại bộ hợp lệ (ví dụ link văn bản pháp luật, PDF)
 */
function cleanContentHtml(rawHtml, baseUrl) {
  const $ = cheerio.load(`<div id="__root">${rawHtml || ''}</div>`);
  const root = $('#__root');

  root.find('script, style, iframe, form, noscript, button, input').remove();

  root.find('*').each((_, el) => {
    const $el = $(el);
    const attribs = el.attribs || {};
    Object.keys(attribs).forEach((attr) => {
      if (/^on/i.test(attr)) $el.removeAttr(attr);
    });
  });

  root.find('img').each((_, el) => {
    const $el = $(el);
    const src = $el.attr('src');
    const abs = resolveUrl(baseUrl, src);
    if (abs) $el.attr('src', abs);
    $el.attr('loading', 'lazy');
    $el.removeAttr('onclick');
  });

  const sourceHost = new URL(baseUrl).host;
  root.find('a').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    const abs = resolveUrl(baseUrl, href);
    let isInternal = false;
    if (abs) {
      try {
        isInternal = new URL(abs).host === sourceHost;
      } catch {
        isInternal = false;
      }
    }
    if (!abs || isInternal) {
      // liên kết nội bộ của web nguồn -> bỏ điều hướng, giữ lại chữ
      $el.replaceWith(`<span class="reup-plain-text">${$el.html() || $el.text()}</span>`);
    } else {
      $el.attr('href', abs);
      $el.attr('target', '_blank');
      $el.attr('rel', 'noopener noreferrer nofollow');
    }
  });

  return root.html().trim();
}

// -----------------------------------------------------------------------
// Cào danh sách + chi tiết cho 1 nguồn
// -----------------------------------------------------------------------

async function fetchHtml(url) {
  const res = await axios.get(url, { headers: HTTP_HEADERS, timeout: REQUEST_TIMEOUT_MS });
  return res.data;
}

async function scrapeListPage(source) {
  let html = null;
  let usedUrl = null;
  for (const url of source.listUrls) {
    try {
      html = await fetchHtml(url);
      usedUrl = url;
      break;
    } catch (err) {
      console.warn(`[scraper] [${source.id}] Không lấy được danh sách từ ${url}: ${err.message}`);
    }
  }
  if (!html) return [];

  const $ = cheerio.load(html);
  const items = [];

  for (const sel of source.selectors.listItem) {
    const nodes = $(sel);
    if (nodes.length) {
      nodes.each((_, el) => {
        const $item = $(el);
        const $titleEl = firstMatch((s) => $item.find(s), source.selectors.title);
        if (!$titleEl || !$titleEl.length) return;

        const title = $titleEl.first().text().replace(/\s+/g, ' ').trim();
        const hrefRaw = $titleEl.first().attr('href');
        const link = resolveUrl(source.baseUrl, hrefRaw);
        if (!title || !link) return;

        const $imgEl = firstMatch((s) => $item.find(s), source.selectors.thumbnail);
        const thumbRaw = $imgEl && $imgEl.length ? $imgEl.first().attr('src') : null;
        const thumbnail = resolveUrl(source.baseUrl, thumbRaw);

        const $summaryEl = firstMatch((s) => $item.find(s), source.selectors.summary);
        const summary = $summaryEl && $summaryEl.length
          ? $summaryEl.first().text().replace(/\s+/g, ' ').trim()
          : '';

        const dateInfo = extractDateText($item.text());

        items.push({ title, link, thumbnail, summary, dateInfo });
      });
      if (items.length) break; // selector này đã cho kết quả, không cần thử selector dự phòng khác
    }
  }

  // Loại trùng theo link, giữ tối đa N bài mới nhất theo thứ tự xuất hiện
  const seen = new Set();
  const deduped = [];
  for (const it of items) {
    if (seen.has(it.link)) continue;
    seen.add(it.link);
    deduped.push(it);
    if (deduped.length >= MAX_LIST_ITEMS_PER_SOURCE) break;
  }

  return deduped.map((it) => ({ ...it, sourceListUrl: usedUrl }));
}

async function scrapeDetailPage(source, listItem) {
  let html;
  try {
    html = await fetchHtml(listItem.link);
  } catch (err) {
    console.warn(`[scraper] [${source.id}] Không lấy được chi tiết ${listItem.link}: ${err.message}`);
    return null;
  }

  const $ = cheerio.load(html);

  const $titleEl = firstMatch($, source.detail.title);
  const title = ($titleEl && $titleEl.length ? $titleEl.first().text() : listItem.title)
    .replace(/\s+/g, ' ')
    .trim();

  const $dateEl = firstMatch($, source.detail.date);
  const dateFromDetail = $dateEl && $dateEl.length ? extractDateText($dateEl.first().text()) : null;
  const dateInfo = dateFromDetail || listItem.dateInfo || null;

  const $contentEl = firstMatch($, source.detail.content);
  const rawContentHtml = $contentEl && $contentEl.length ? $contentEl.first().html() : null;
  const contentHtml = cleanContentHtml(
    rawContentHtml || `<p>${listItem.summary || ''}</p>`,
    source.baseUrl
  );

  let thumbnail = listItem.thumbnail;
  if (!thumbnail) {
    const $thumbEl = firstMatch($, source.detail.thumbnail);
    if ($thumbEl && $thumbEl.length) {
      thumbnail = resolveUrl(source.baseUrl, $thumbEl.first().attr('src'));
    }
  }

  return { title, dateInfo, contentHtml, thumbnail };
}

// -----------------------------------------------------------------------
// Chạy toàn bộ quy trình cho 1 nguồn / tất cả nguồn
// -----------------------------------------------------------------------

async function runSource(source, existingByLink) {
  const results = [];
  const listItems = await scrapeListPage(source);

  for (const listItem of listItems) {
    await sleep(REQUEST_GAP_MS);

    // Nếu bài đã có trong kho dữ liệu rồi thì không cào lại chi tiết,
    // đỡ tải cho server nguồn.
    if (existingByLink.has(listItem.link)) {
      results.push(existingByLink.get(listItem.link));
      continue;
    }

    const detail = await scrapeDetailPage(source, listItem);
    const title = (detail && detail.title) || listItem.title;
    const dateInfo = (detail && detail.dateInfo) || listItem.dateInfo;
    const contentHtml =
      (detail && detail.contentHtml) || cleanContentHtml(`<p>${listItem.summary || ''}</p>`, source.baseUrl);
    const thumbnail = (detail && detail.thumbnail) || listItem.thumbnail || null;

    const article = {
      id: makeId(source.id, listItem.link),
      slug: slugify(title) || makeId(source.id, listItem.link),
      title,
      summary: listItem.summary || title,
      contentHtml,
      thumbnail,
      publishDate: dateInfo ? dateInfo.iso : null,
      publishDateDisplay: dateInfo ? dateInfo.display : 'Chưa rõ ngày',
      category: classifyCategory(title),
      sourceId: source.id,
      sourceName: source.name,
      sourceTag: source.tag,
      sourceUrl: listItem.link,
      scrapedAt: new Date().toISOString()
    };

    results.push(article);
  }

  return results;
}

async function runAllSources() {
  console.log(`[scraper] Bắt đầu quét lúc ${new Date().toLocaleString('vi-VN')}`);
  const existing = loadArticles();
  const existingByLink = new Map(existing.map((a) => [a.sourceUrl, a]));

  let allResults = [...existing];

  for (const source of SOURCES) {
    try {
      const sourceResults = await runSource(source, existingByLink);
      const byLink = new Map(allResults.map((a) => [a.sourceUrl, a]));
      for (const article of sourceResults) {
        byLink.set(article.sourceUrl, article); // ghi đè nếu đã tồn tại (cập nhật mới nhất)
      }
      allResults = Array.from(byLink.values());
      console.log(`[scraper] [${source.id}] Đã xử lý ${sourceResults.length} bài.`);
    } catch (err) {
      console.error(`[scraper] [${source.id}] Lỗi khi quét nguồn:`, err.message);
    }
  }

  allResults.sort((a, b) => {
    const da = a.publishDate ? new Date(a.publishDate).getTime() : 0;
    const db = b.publishDate ? new Date(b.publishDate).getTime() : 0;
    return db - da;
  });

  // Giới hạn kho lưu trữ để file JSON không phình quá lớn
  const trimmed = allResults.slice(0, 500);
  saveArticles(trimmed);
  console.log(`[scraper] Hoàn tất. Tổng số bài đang lưu: ${trimmed.length}`);
  return trimmed;
}

module.exports = {
  runAllSources,
  loadArticles,
  saveArticles,
  cleanContentHtml,
  classifyCategory
};
