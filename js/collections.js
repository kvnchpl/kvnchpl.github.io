import { loadJSON, getMetaContent } from './utils.js';
import { injectHead, injectFooter, renderNav, updateMainHeading } from './dom.js';

(async function () {
    await injectHead('/partials/head.html');
    await injectFooter('/partials/footer.html');

    const page = document.body.dataset.page;
    const [siteConfig, pages, navData] = await Promise.all([
        loadJSON(getMetaContent("config-data")),
        loadJSON(getMetaContent("pages-data")),
        loadJSON(getMetaContent("nav-data"))
    ]);

    renderNav(siteConfig.elementIds.nav, navData);

    let type;
    if (page === "projects") type = "project";
    if (page === "readings") type = "reading";
    if (page === "writings") type = "writing";

    const listSection = document.getElementById("collectionList");
    if (listSection && type) {
        const ul = document.createElement("ul");
        Object.entries(pages).forEach(([slug, data]) => {
            if (data.type === type) {
                const li = document.createElement("li");
                const a = document.createElement("a");
                a.href = `/projects/${slug}.html`;
                a.textContent = data.title || slug;
                li.appendChild(a);
                ul.appendChild(li);
            }
        });
        listSection.appendChild(ul);
    }
})();