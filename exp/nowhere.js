const list = document.querySelector(".exp-page-list");

if (list) {
    renderPageList(list).catch((error) => {
        console.error("Failed to render page list.", error);
        list.innerHTML = "<li>error</li>";
    });
}

async function renderPageList(target) {
    const directory = (target.dataset.directory || "x/").replace(/\/?$/, "/");
    const response = await fetch("exp.json", { cache: "no-store" });

    if (!response.ok) {
        console.error("Failed to fetch page list.", {
            status: response.status,
            statusText: response.statusText,
        });
        target.innerHTML = "<li>nothing</li>";
        return;
    }

    const payload = await response.json();
    const pageIds = Array.isArray(payload)
        ? [...new Set(payload)].sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: "base" }),
        )
        : [];

    target.innerHTML =
        pageIds.length > 0
            ? pageIds
                .map((id) => `<li><a href="${directory}${id}.html">${id}</a></li>`)
                .join("")
            : "<li>nothing</li>";
}
