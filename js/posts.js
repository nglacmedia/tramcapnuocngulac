// js/posts.js

document.addEventListener('DOMContentLoaded', () => {
    // URL của Google Sheet ở định dạng CSV
    const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1apDACOrX5Xd8Q7ugZm6Fdjti1X0LhAx0QCopuXu9pRQ/pub?output=csv";

    const localContainer = document.getElementById("local-articles-container");
    const externalContainer = document.getElementById("external-articles-container");

    // Hàm hiển thị thông báo tải lên
    const showLoading = (container) => {
        if (container) {
            container.innerHTML = `
                <div class="flex justify-center items-center py-6 text-light-text">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue mr-3"></div>
                    <p class="italic">Đang tải bài viết...</p>
                </div>
            `;
        }
    };

    // Hàm hiển thị thông báo không có bài viết
    const showNoPosts = (container, type) => {
        if (container) {
            container.innerHTML = `<p class="text-light-text text-center py-6">Chưa có bài viết nào từ ${type}.</p>`;
        }
    };

    // Hàm hiển thị thông báo lỗi
    const showError = (container, type) => {
        if (container) {
            container.innerHTML = `<p class="text-red-500 text-center py-6">Lỗi khi tải bài viết từ ${type}. Vui lòng thử lại sau.</p>`;
        }
    };

    // Gọi hàm hiển thị tải lên ngay lập tức
    showLoading(localContainer);
    showLoading(externalContainer);

    fetch(GOOGLE_SHEET_CSV_URL)
        .then(res => {
            if (!res.ok) { // Kiểm tra nếu HTTP response không thành công (ví dụ: 404, 500)
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.text();
        })
        .then(csv => {
            // Xóa nội dung "Đang tải bài viết..." sau khi fetch thành công
            if (localContainer) localContainer.innerHTML = '';
            if (externalContainer) externalContainer.innerHTML = '';

            const rows = csv.split("\n").slice(1); // Bỏ qua hàng tiêu đề

            // Kiểm tra nếu không có dữ liệu (chỉ có hàng tiêu đề hoặc trống)
            if (rows.length === 0 || (rows.length === 1 && rows[0].trim() === '')) {
                showNoPosts(localContainer, "Trạm");
                showNoPosts(externalContainer, "Tỉnh");
                return;
            }

            let hasLocalPosts = false;
            let hasExternalPosts = false;

            rows.forEach(line => {
                const parts = line.split(",").map(part => part.trim()); // Trim từng phần để loại bỏ khoảng trắng thừa
                
                // Cần có đúng 5 cột: Tiêu đề, Ngày, Nội dung, URL, Loại
                if (parts.length < 5) {
                    console.warn(`Hàng "${line}" không đủ 5 cột, bỏ qua.`);
                    return; 
                }

                const title = parts[0];
                const date = parts[1];
                const content = parts[2];
                const url = parts[3]; 
                const type = parts[4]; 

                if (!title) { // Tiêu đề là bắt buộc
                    console.warn(`Hàng thiếu tiêu đề "${line}", bỏ qua.`);
                    return; 
                }

                const el = document.createElement("article");
                // Thêm hiệu ứng nâng nhẹ và bóng đổ khi hover để tăng tính tương tác
                el.className = "bg-white shadow-md hover:shadow-lg transition-all duration-300 p-5 rounded-lg border border-border-subtle transform hover:-translate-y-1"; 
                
                let articleHTML = `
                    <h3 class="font-semibold text-xl mb-2 leading-tight">
                `;

                // Nếu có URL, bọc tiêu đề trong thẻ <a>, nếu không thì chỉ hiển thị tiêu đề
                if (url) {
                    articleHTML += `
                        <a href="${url}" target="_blank" class="text-secondary-blue hover:text-primary-blue hover:underline transition-colors duration-200">
                            ${title}
                        </a>
                    `;
                } else {
                    articleHTML += `<span class="text-dark-text">${title}</span>`;
                }
                
                articleHTML += `
                    </h3>
                    <p class="text-sm text-light-text mb-2">${new Date(date).toLocaleDateString("vi-VN")}</p>
                    <p class="text-light-text text-base leading-relaxed">${content}</p>
                `;
                el.innerHTML = articleHTML;

                // Phân loại và thêm bài viết vào container tương ứng
                if (type === "Trạm" && localContainer) {
                    localContainer.appendChild(el);
                    hasLocalPosts = true;
                } else if (type === "Tỉnh" && externalContainer) {
                    externalContainer.appendChild(el);
                    hasExternalPosts = true;
                } else {
                    console.warn(`Loại bài viết không xác định ("${type}"), bỏ qua hàng: "${line}"`);
                }
            });

            // Nếu không có bài viết nào được tìm thấy sau khi duyệt qua tất cả các hàng
            if (!hasLocalPosts && localContainer) {
                showNoPosts(localContainer, "Trạm");
            }
            if (!hasExternalPosts && externalContainer) {
                showNoPosts(externalContainer, "Tỉnh");
            }

        })
        .catch(err => {
            console.error("Lỗi khi tải Google Sheet:", err);
            // Hiển thị thông báo lỗi cho người dùng
            showError(localContainer, "Trạm");
            showError(externalContainer, "Tỉnh");
        });
});