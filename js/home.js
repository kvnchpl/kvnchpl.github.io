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

    const isHomePage = page === "home" || page === "index";
    const isCollectionPage = siteConfig.collections?.[page];

    if (isHomePage) {
        const navData = window.navData;
        const container = document.querySelector(siteConfig.elementIds.homeLinks);

        if (!container || !Array.isArray(navData)) return;

        const linksToShow = navData.filter(link => link.navBar);

        linksToShow.forEach(link => {
            const pageLink = document.createElement("div");
            pageLink.className = "page-link";

            const img = document.createElement("img");
            img.src = link.thumbnail || "/img/index/sky-default.jpg";
            img.alt = "Sky";
            pageLink.appendChild(img);

            const a = document.createElement("a");
            a.href = link.href;
            if (link.href.startsWith("http")) {
                a.target = "_blank";
                a.rel = "noopener";
            }

            const p = document.createElement("p");
            p.textContent = link.title;
            a.appendChild(p);
            pageLink.appendChild(a);

            container.appendChild(pageLink);
        });
    } else if (isCollectionPage) {
        const pages = window.pages;
        const { type, basePath } = siteConfig.collections[page];
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
    }
})();