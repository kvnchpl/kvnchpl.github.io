(async function () {
    // Use window.siteConfig, window.pages, window.navData if set by main.js
    const page = document.body.dataset.page;
    const siteConfig = window.siteConfig;
    const pages = window.pages;

    let type;
    if (page === "projects") type = "project";
    if (page === "readings") type = "reading";
    if (page === "writings") type = "writing";

    const basePath = `/${type}s/`;

    const listSection = document.getElementById(siteConfig.elementIds.collectionList);
    if (listSection && type) {
        const ul = document.createElement("ul");
        Object.entries(pages).forEach(([slug, data]) => {
            if (data.type === type) {
                const li = document.createElement("li");
                const a = document.createElement("a");
                a.href = `${basePath}${slug}.html`;
                a.textContent = data.title || slug;
                li.appendChild(a);
                ul.appendChild(li);
            }
        });
        listSection.appendChild(ul);
    }
})();