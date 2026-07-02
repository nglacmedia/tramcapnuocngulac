/**
 * sources.js
 * -----------------------------------------------------------------------
 * Cấu hình các nguồn tin sẽ được cào (scrape) tự động.
 *
 * GHI CHÚ QUAN TRỌNG:
 * - Nguồn "trungtamnuocsach" đã được kiểm tra trực tiếp: đây là site chạy
 *   trên nền DotNetNuke (DNN), URL bài viết dạng
 *   Default.aspx?tabid=<mid>&ID=<bài viết>. Selector bên dưới bám theo
 *   đúng cấu trúc HTML thật của site tại thời điểm viết code.
 * - Nguồn "snnmt" (Sở Nông nghiệp và Môi trường) không truy cập trực tiếp
 *   được từ môi trường build (site chặn bot ở tầng ngoài), nên selector
 *   được đặt ở dạng "best-effort" + nhiều phương án dự phòng (fallback).
 *   Khi triển khai thực tế, hãy mở DevTools trên trang đó, kiểm tra lại
 *   đúng class/thẻ rồi cập nhật mảng `listItem`/`title`/... cho khớp.
 *   Đây là lý do config được viết dạng "danh sách selector ưu tiên" thay
 *   vì chỉ 1 selector cứng — scraper sẽ thử lần lượt cho đến khi ra kết quả.
 * -----------------------------------------------------------------------
 */

const SOURCES = [
  {
    id: 'trungtamnuocsach',
    name: 'Trung tâm Nước sạch và Vệ sinh môi trường nông thôn',
    shortName: 'TT Nước Sạch',
    tag: 'Nguồn: TT Nước Sạch',
    baseUrl: 'https://trungtamnuocsach.vinhlong.gov.vn',
    // Trang danh sách "Tin tức sự kiện"
    listUrls: [
      'https://trungtamnuocsach.vinhlong.gov.vn/tin-tuc-su-kien',
      'https://trungtamnuocsach.vinhlong.gov.vn/Default.aspx?tabid=22641&ID='
    ],
    selectors: {
      // Mỗi mục tin trong danh sách trang chủ / trang tin tức (dạng DNN NewsFeed)
      listItem: ['li:has(h3 a[href*="Default.aspx"])', '.newsList li', 'article'],
      title: ['h3 a', 'h2 a', 'a'],
      link: ['h3 a', 'h2 a', 'a'],
      thumbnail: ['a img', 'img'],
      summary: ['p'],
      // Ngày thường nằm ở dòng text riêng dạng dd/mm/yyyy ngay dưới mục tin
      dateText: ['dd/mm/yyyy-pattern']
    },
    detail: {
      title: ['h1', 'h3.title', '.newsDetail h3', '.title-detail'],
      date: ['.date', '.ngaydang', 'time', '.newsDetail .date'],
      content: ['.detailContent', '.Content', '#ContentPlaceHolder1 .Normal', '.newsDetail .content', 'article'],
      thumbnail: ['.detailContent img', '.Content img', 'article img']
    }
  },
  {
    id: 'snnmt',
    name: 'Sở Nông nghiệp và Môi trường tỉnh Vĩnh Long',
    shortName: 'Sở NN&MT',
    tag: 'Nguồn: Sở NN&MT',
    baseUrl: 'https://snnmt.vinhlong.gov.vn',
    listUrls: [
      'https://snnmt.vinhlong.gov.vn/tin-tuc-su-kien',
      'https://snnmt.vinhlong.gov.vn/thong-bao',
      'https://snnmt.vinhlong.gov.vn/'
    ],
    // ⚠️ CẦN KIỂM TRA LẠI khi triển khai — site chặn truy cập tự động
    // trong môi trường build nên các selector này là suy đoán hợp lý dựa
    // trên cấu trúc phổ biến của cổng .gov.vn tỉnh Vĩnh Long (cùng hệ CMS
    // với nhiều sở/ngành khác trong tỉnh).
    selectors: {
      listItem: ['li:has(h3 a)', '.newsList li', '.list-news .item', 'article'],
      title: ['h3 a', 'h2 a', '.title a', 'a'],
      link: ['h3 a', 'h2 a', '.title a', 'a'],
      thumbnail: ['a img', 'img'],
      summary: ['p', '.summary', '.sapo'],
      dateText: ['dd/mm/yyyy-pattern']
    },
    detail: {
      title: ['h1', '.detail-title', '.title-detail'],
      date: ['.date', '.ngaydang', 'time'],
      content: ['.detailContent', '.Content', '.detail-content', 'article'],
      thumbnail: ['.detailContent img', '.Content img', 'article img']
    }
  }
];

module.exports = { SOURCES };
