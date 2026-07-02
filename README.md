# Trạm cấp nước xã Ngũ Lạc — Trang thông tin điện tử

Cổng thông tin tự động tổng hợp (reup) tin tức, thông báo, văn bản chỉ đạo từ:

1. **Trung tâm Nước sạch và Vệ sinh môi trường nông thôn** — https://trungtamnuocsach.vinhlong.gov.vn/
2. **Sở Nông nghiệp và Môi trường tỉnh Vĩnh Long** — https://snnmt.vinhlong.gov.vn/

## Cấu trúc thư mục

```
tram-nuoc-ngu-lac/
├── server.js                 # Express server + API + lịch cron tự động quét
├── package.json
├── scraper/
│   ├── sources.js            # Cấu hình 2 nguồn tin (URL, selector CSS)
│   └── scraper.js            # Logic cào, làm sạch, lưu trữ dữ liệu
├── data/
│   ├── articles.json         # Kho dữ liệu chạy thực tế (tự sinh khi chạy lần đầu)
│   └── articles.seed.json    # Dữ liệu mẫu để trang không trống khi chưa quét
└── public/
    ├── index.html            # Trang chủ (lưới tin, bộ lọc, tìm kiếm)
    ├── article.html           # Trang chi tiết bài viết
    ├── style.css              # Toàn bộ thiết kế (hệ màu, layout, responsive)
    ├── app.js                 # Frontend JS (gọi API, render, phân trang)
    └── assets/
        ├── logo-icon.svg      # Logomark rút gọn (dùng ở header)
        └── logo-full.svg      # Logo đầy đủ có tên đơn vị chạy theo vòng cung
```

## Cài đặt & chạy

```bash
npm install
npm start
# Mở http://localhost:3000
```

Biến môi trường tuỳ chọn:

| Biến | Mặc định | Mô tả |
|---|---|---|
| `PORT` | `3000` | Cổng chạy server |
| `SCRAPE_CRON` | `*/30 * * * *` | Lịch quét tự động (cú pháp cron 5 trường) |
| `SCRAPE_TRIGGER_TOKEN` | *(trống = tắt)* | Token bảo vệ endpoint `POST /api/scrape/run` để kích hoạt quét thủ công |

Quét thủ công 1 lần từ dòng lệnh:

```bash
npm run scrape:now
```

## Cách hoạt động của scraper

- `scraper/sources.js` khai báo URL danh sách và **danh sách selector ưu tiên** cho từng trường dữ liệu (tiêu đề, link, ảnh đại diện, ngày đăng, nội dung). Scraper thử lần lượt selector cho tới khi có kết quả — giúp code không vỡ hoàn toàn nếu 1 selector không khớp.
- Nguồn `trungtamnuocsach` đã được đối chiếu với HTML thật của site (nền DotNetNuke, URL bài viết dạng `Default.aspx?tabid=...&ID=...`).
- Nguồn `snnmt` **chưa thể truy cập trực tiếp** ở môi trường xây dựng (site chặn request tự động tại tầng ngoài, kể cả khi giả lập trình duyệt thật). Selector của nguồn này được đánh dấu rõ ràng trong `sources.js` (`⚠️ CẦN KIỂM TRA LẠI`) — cần mở DevTools (F12) trực tiếp trên `snnmt.vinhlong.gov.vn` khi triển khai thật để chỉnh lại đúng class/thẻ, rồi test bằng `npm run scrape:now`.
- Dữ liệu được làm sạch trước khi lưu: gỡ `<script>/<style>/<iframe>`, gỡ thuộc tính `onclick...`, quy đổi ảnh/link sang URL tuyệt đối, và **thay các link nội bộ trỏ về site nguồn bằng văn bản thường** (tránh điều hướng gãy sang trang gốc ngay trong bài đã reup). Mỗi bài được gán tự động nhãn nguồn `Nguồn: TT Nước Sạch` hoặc `Nguồn: Sở NN&MT`, và phân loại `Tin tức` / `Văn bản pháp quy` dựa trên từ khoá tiêu đề (THÔNG BÁO, QUYẾT ĐỊNH, CÔNG VĂN...).
- Bài trùng được loại theo URL gốc; kho lưu trữ giữ tối đa 500 bài mới nhất.

## Lưu ý khi triển khai thật

- Server chạy `npm start` cần có **kết nối internet ra ngoài** tới `*.vinhlong.gov.vn` để quét được — môi trường sandbox dùng để build demo này bị giới hạn mạng nên `data/articles.json` sẽ dùng dữ liệu mẫu (`articles.seed.json`) cho tới khi chạy trên môi trường có mạng thật.
- Nên đặt lịch quét (`SCRAPE_CRON`) không quá dày (khuyến nghị 15–30 phút) để lịch sự với server nguồn; scraper đã tự giãn cách 800ms giữa các request.
- Khi thêm nguồn tin thứ 3 trở lên, chỉ cần thêm 1 object mới vào mảng `SOURCES` trong `scraper/sources.js` — không cần sửa `scraper.js` hay frontend (tag nguồn mới sẽ tự hiển thị, chỉ cần bổ sung màu trong `style.css` nếu muốn có màu riêng).
