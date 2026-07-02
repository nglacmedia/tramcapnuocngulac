/* ==========================================================================
   app.js — Frontend cho Trạm cấp nước xã Ngũ Lạc
   Vanilla JS, không phụ thuộc framework, gọi thẳng API /api/articles.
   ========================================================================== */

(function () {
  const API_BASE = '';

  const SOURCE_LABEL = {
    trungtamnuocsach: 'TT Nước Sạch',
    snnmt: 'Sở NN&MT'
  };
  const CATEGORY_LABEL = {
    'tin-tuc': 'Tin tức',
    'van-ban': 'Văn bản pháp quy'
  };

  const emptyThumbSvg = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M12 3c3 4 5 6.5 5 9.5A5 5 0 0 1 7 12.5C7 9.5 9 7 12 3Z"/>
    </svg>`;

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function cardTemplate(article) {
    const thumb = article.thumbnail
      ? `<div class="card__thumb"><img src="${escapeHtml(article.thumbnail)}" alt="" loading="lazy" onerror="this.parentElement.classList.add('card__thumb--empty');this.remove();" /></div>`
      : `<div class="card__thumb card__thumb--empty">${emptyThumbSvg}</div>`;

    const sourceTagClass = `tag--source-${article.sourceId}`;
    const catTagClass = `tag--category-${article.category}`;

    return `
      <a class="card" href="/article.html?id=${encodeURIComponent(article.id)}">
        ${thumb}
        <div class="card__body">
          <div class="tag-row">
            <span class="tag ${sourceTagClass}">${escapeHtml(SOURCE_LABEL[article.sourceId] || article.sourceTag)}</span>
            <span class="tag ${catTagClass}">${escapeHtml(CATEGORY_LABEL[article.category] || 'Tin tức')}</span>
          </div>
          <h3 class="card__title">${escapeHtml(article.title)}</h3>
          <p class="card__summary">${escapeHtml(article.summary)}</p>
          <div class="card__meta">
            <span>${escapeHtml(article.publishDateDisplay || 'Chưa rõ ngày')}</span>
            <span>Xem chi tiết →</span>
          </div>
        </div>
      </a>`;
  }

  // ------------------------------------------------------------------------
  // Trang danh sách (index.html)
  // ------------------------------------------------------------------------
  function initListPage() {
    const grid = document.getElementById('article-grid');
    const pagination = document.getElementById('pagination');
    const searchInput = document.getElementById('search-input');
    const statTotal = document.getElementById('stat-total');

    const state = { source: '', category: '', q: '', page: 1, pageSize: 9 };
    let searchDebounce = null;

    function setActiveChip(container, attr, value) {
      container.querySelectorAll('.chip').forEach((chip) => {
        chip.classList.toggle('is-active', chip.dataset[attr] === value);
      });
    }

    async function load() {
      grid.innerHTML = '<div class="loading-state">Đang tải tin tức…</div>';
      const params = new URLSearchParams();
      if (state.source) params.set('source', state.source);
      if (state.category) params.set('category', state.category);
      if (state.q) params.set('q', state.q);
      params.set('page', state.page);
      params.set('pageSize', state.pageSize);

      try {
        const res = await fetch(`${API_BASE}/api/articles?${params.toString()}`);
        if (!res.ok) throw new Error('Không tải được dữ liệu tin tức.');
        const data = await res.json();

        if (!data.items.length) {
          grid.innerHTML = `
            <div class="empty-state">
              ${emptyThumbSvg}
              <p>Chưa có bài viết phù hợp với bộ lọc hiện tại.</p>
            </div>`;
        } else {
          grid.innerHTML = data.items.map(cardTemplate).join('');
        }

        renderPagination(data.page, data.totalPages);
        if (statTotal) statTotal.textContent = data.total;
      } catch (err) {
        grid.innerHTML = `
          <div class="error-state">
            ${emptyThumbSvg}
            <p>Không thể tải tin tức lúc này. Vui lòng thử lại sau.</p>
          </div>`;
        console.error(err);
      }
    }

    function renderPagination(page, totalPages) {
      if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
      }
      let html = `<button ${page <= 1 ? 'disabled' : ''} data-page="${page - 1}">‹</button>`;
      for (let i = 1; i <= totalPages; i++) {
        html += `<button class="${i === page ? 'is-active' : ''}" data-page="${i}">${i}</button>`;
      }
      html += `<button ${page >= totalPages ? 'disabled' : ''} data-page="${page + 1}">›</button>`;
      pagination.innerHTML = html;

      pagination.querySelectorAll('button[data-page]').forEach((btn) => {
        btn.addEventListener('click', () => {
          state.page = parseInt(btn.dataset.page, 10);
          load();
          document.getElementById('article-list').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    }

    document.getElementById('filter-source').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-source]');
      if (!btn) return;
      state.source = btn.dataset.source;
      state.page = 1;
      setActiveChip(document.getElementById('filter-source'), 'source', state.source);
      load();
    });

    document.getElementById('filter-category').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-category]');
      if (!btn) return;
      state.category = btn.dataset.category;
      state.page = 1;
      setActiveChip(document.getElementById('filter-category'), 'category', state.category);
      load();
    });

    searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        state.q = searchInput.value.trim();
        state.page = 1;
        load();
      }, 350);
    });

    // Điều hướng nhanh từ menu (#tin-tuc / #van-ban) sang bộ lọc tương ứng
    document.querySelectorAll('.main-nav a[data-cat]').forEach((a) => {
      a.addEventListener('click', () => {
        const cat = a.dataset.cat;
        state.category = cat;
        state.page = 1;
        setActiveChip(document.getElementById('filter-category'), 'category', cat);
        load();
      });
    });

    load();
  }

  // ------------------------------------------------------------------------
  // Trang chi tiết (article.html)
  // ------------------------------------------------------------------------
  async function initDetailPage() {
    const container = document.getElementById('article-detail');
    const breadcrumbCurrent = document.getElementById('breadcrumb-current');
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
      container.innerHTML = `<div class="error-state"><p>Thiếu mã bài viết.</p></div>`;
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/articles/${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error('not found');
      const { item } = await res.json();

      document.title = `${item.title} — Trạm cấp nước xã Ngũ Lạc`;
      if (breadcrumbCurrent) breadcrumbCurrent.textContent = item.title;

      const thumbHtml = item.thumbnail
        ? `<div class="article-detail__thumb"><img src="${escapeHtml(item.thumbnail)}" alt="" /></div>`
        : '';

      container.innerHTML = `
        <div class="tag-row">
          <span class="tag tag--source-${item.sourceId}">${escapeHtml(SOURCE_LABEL[item.sourceId] || item.sourceTag)}</span>
          <span class="tag tag--category-${item.category}">${escapeHtml(CATEGORY_LABEL[item.category] || 'Tin tức')}</span>
        </div>
        <h1 class="article-detail__title">${escapeHtml(item.title)}</h1>
        <div class="article-detail__meta">
          <span>🗓️ ${escapeHtml(item.publishDateDisplay || 'Chưa rõ ngày')}</span>
          <span>📌 ${escapeHtml(item.sourceTag)}</span>
        </div>
        ${thumbHtml}
        <div class="article-body">${item.contentHtml}</div>
        <div class="source-callout">
          <span>ℹ️</span>
          <span>
            <strong>Bài viết được tổng hợp tự động</strong> từ ${escapeHtml(item.sourceName)}.
            Xem bản gốc tại: <a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener noreferrer nofollow">${escapeHtml(item.sourceUrl)}</a>
          </span>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="error-state"><p>Không tìm thấy bài viết hoặc đã bị gỡ khỏi nguồn.</p></div>`;
      console.error(err);
    }
  }

  // ------------------------------------------------------------------------
  // Menu di động dùng chung cho mọi trang
  // ------------------------------------------------------------------------
  function initMobileNav() {
    const toggle = document.getElementById('nav-toggle');
    const nav = document.getElementById('main-nav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initMobileNav();
    if (document.getElementById('article-grid')) initListPage();
    if (document.getElementById('article-detail')) initDetailPage();
  });
})();
