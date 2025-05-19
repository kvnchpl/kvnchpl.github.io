export async function injectPartials(partials) {
    try {
        const entries = Object.entries(partials);
        const fetches = await Promise.all(
            entries.map(([_, url]) => fetch(url).then(res => res.text()))
        );

        entries.forEach(([selector, _], i) => {
            const html = fetches[i];
            const target = selector === 'head'
                ? document.head
                : document.querySelector(selector);

            if (target) {
                target.insertAdjacentHTML('beforeend', html);
            } else {
                console.warn(`Target "${selector}" not found for partial.`);
            }
        });
    } catch (err) {
        console.error("Error injecting partials:", err);
    }
}