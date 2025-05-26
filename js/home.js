import { loadJSON, getMetaContents } from "./utils.js";

(async function () {
    const meta = getMetaContents({ nav: "nav-data" });
    const navData = await loadJSON(meta.nav);
    const container = document.querySelector(".link-container");

    if (!container || !Array.isArray(navData)) return;

    const linksToShow = navData.filter(link => link.navBar); // optionally filter

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
        p.textContent = `See what I'm ${link.label.toLowerCase()}`;
        a.appendChild(p);
        pageLink.appendChild(a);

        container.appendChild(pageLink);
    });
})();