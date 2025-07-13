function loadFeed(url, containerId, title) {
  fetch(url)
    .then(res => res.text())
    .then(str => new window.DOMParser().parseFromString(str, "text/xml"))
    .then(data => {
      const items = data.querySelectorAll("item");
      const container = document.getElementById(containerId);
      const titleEl = document.createElement("h2");
      titleEl.className = "text-xl font-semibold mb-4";
      titleEl.textContent = title;
      container.appendChild(titleEl);

      items.forEach((item, idx) => {
        if (idx >= 5) return;
        const li = document.createElement("article");
        li.className = "bg-white shadow p-4 rounded-xl";
        const ititle = item.querySelector("title")?.textContent || "";
        const link = item.querySelector("link")?.textContent || "#";
        const pubDate = item.querySelector("pubDate")?.textContent || "";
        li.innerHTML = `
          <h3 class="font-bold text-md"><a href="${link}" class="text-blue-700 hover:underline" target="_blank">${ititle}</a></h3>
          <p class="text-sm text-gray-600">${new Date(pubDate).toLocaleDateString()}</p>
        `;
        container.appendChild(li);
      });
    })
    .catch(err => console.error("Không tải được RSS:", err));
}

window.addEventListener("DOMContentLoaded", () => {
  loadFeed("https://trungtamnuocsach.vinhlong.gov.vn/rssfeed.rss", "external-news", "Thông báo từ Trung tâm");
if (url) {
    articleHTML += `
      <a href="${url}" target="_blank" class="hover:underline text-blue-700">
          ${title}
      </a>
    `;
} else {
    articleHTML += `${title}`;
}
  if (type === "Trạm") {
    localContainer.appendChild(el);
} else if (type === "Tỉnh") {
    externalContainer.appendChild(el);
}
});
