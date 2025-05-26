// Wait for window.siteConfig to be set by main.js
async function waitForSiteConfig() {
    while (!window.siteConfig) {
        await new Promise(r => setTimeout(r, 10));
    }
}

(async function () {
    await waitForSiteConfig();
    const page = document.body.dataset.page;
    const siteConfig = window.siteConfig;
    const pages = window.pages;
    const collection = siteConfig.collections[page];
    if (!collection) return;

    const { type, basePath } = collection;
    const container = document.getElementById(siteConfig.elementIds.collectionList);
    if (!container || !type) return;

    Object.entries(pages).forEach(([slug, data]) => {
        if (data.type === type) {
            const pageLink = document.createElement("div");
            pageLink.className = "page-link";

            const img = document.createElement("img");
            img.src = data.thumbnail || "/img/index/sky-default.jpg";
            img.alt = data.title || slug;
            pageLink.appendChild(img);

            const a = document.createElement("a");
            a.href = `${basePath}${slug}.html`;

            const p = document.createElement("p");
            p.textContent = data.title || slug;
            a.appendChild(p);

            pageLink.appendChild(a);
            container.appendChild(pageLink);
        }
    });
})();