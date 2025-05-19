(async function () {
    const page = document.body.dataset.page;
    const siteConfig = window.siteConfig;
    const pages = window.pages;

    const collection = siteConfig.collections[page];
    if (!collection) return;

    const { type, basePath } = collection;

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