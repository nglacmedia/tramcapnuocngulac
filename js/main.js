// js/main.js

document.addEventListener('DOMContentLoaded', () => {
    // Inject Header
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (headerPlaceholder) {
        headerPlaceholder.innerHTML = `
            <header class="bg-primary-blue text-white py-4 shadow-header">
                <div class="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between">
                    <div class="flex items-center mb-4 md:mb-0">
                        <img src="assets/images/logo.png" alt="Logo Trạm Cấp Nước Xã Ngũ Lạc" 
                             class="h-20 w-20 rounded-full border-4 border-white mr-4 object-cover shadow-md transition-transform duration-300 hover:scale-105">
                        <div>
                            <h1 class="text-4xl font-bold tracking-tight">Trạm Cấp Nước Xã Ngũ Lạc</h1>
                            <p class="text-base text-blue-200 mt-1 opacity-90">Trực thuộc Trung tâm Cấp nước & Vệ sinh môi trường tỉnh Vĩnh Long</p>
                        </div>
                    </div>
                    <nav class="w-full md:w-auto mt-4 md:mt-0">
                        <ul class="flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-2 text-lg font-medium">
                            <li><a href="index.html" class="nav-link">Trang chủ</a></li>
                            <li><a href="about.html" class="nav-link">Giới thiệu</a></li>
                            <li><a href="news.html" class="nav-link">Tin tức</a></li>
                            <li><a href="gallery.html" class="nav-link">Thư viện ảnh</a></li>
                            <li><a href="docs.html" class="nav-link">Văn bản</a></li>
                            <li><a href="contact.html" class="nav-link">Liên hệ</a></li>
                            <li><a href="admin.html" class="nav-link">Admin</a></li>
                        </ul>
                    </nav>
                </div>
            </header>
        `;
    }

    // Inject Footer
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder) {
        footerPlaceholder.innerHTML = `
            <footer class="bg-dark-blue text-white py-6 text-center shadow-inner mt-auto">
                <div class="container mx-auto px-4">
                    <p class="text-sm opacity-90">&copy; ${new Date().getFullYear()} Trạm Cấp Nước Xã Ngũ Lạc. Mọi quyền được bảo lưu.</p>
                    <p class="text-xs mt-3 text-blue-200 opacity-80 leading-relaxed">
                        Địa chỉ: Xã Ngũ Lạc, Huyện Duyên Hải, Tỉnh Trà Vinh <br>
                        Điện thoại: (0294) 3878 999 | Email: tracapnuocngulac@example.com
                    </p>
                    <div class="flex justify-center mt-5 space-x-6">
                        <a href="#" class="text-white hover:text-secondary-blue transition-colors duration-200" aria-label="Facebook">
                            <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                                <path fill-rule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33V22C18.343 21.128 22 16.991 22 12z" clip-rule="evenodd" />
                            </svg>
                        </a>
                        <a href="#" class="text-white hover:text-secondary-blue transition-colors duration-200" aria-label="Twitter">
                            <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M.05 3.39L10.03 21h3.11l9.92-17.61H20.2l-8.52 15.08L3.8 3.39H.05zm15.42 16.88c.95 0 1.69-.73 1.69-1.69a1.69 1.69 0 00-1.69-1.69c-.95 0-1.69.73-1.69 1.69a1.69 1.69 0 001.69 1.69z" />
                            </svg>
                        </a>
                        </div>
                </div>
            </footer>
        `;
    }

    // Đánh dấu menu active dựa trên URL hiện tại
    const currentPath = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        // Kiểm tra cả trường hợp index.html hoặc đường dẫn trống
        if (link.getAttribute('href') === currentPath || (currentPath === '' && link.getAttribute('href') === 'index.html')) {
            link.classList.add('bg-secondary-blue', 'text-white', 'pointer-events-none'); // Active state + ngăn click khi đang active
            link.classList.remove('hover:text-accent-blue', 'hover:bg-secondary-blue'); // Xóa hover khi active
        }
    });
});