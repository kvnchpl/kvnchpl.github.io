export async function injectPartials() {
    try {
        const [headPartial, footerPartial] = await Promise.all([
            fetch('/partials/head.html').then(res => res.text()),
            fetch('/partials/footer.html').then(res => res.text())
        ]);

        document.head.insertAdjacentHTML('beforeend', headPartial);

        const footerContainer = document.createElement('div');
        footerContainer.innerHTML = footerPartial;
        document.body.appendChild(footerContainer);
    } catch (err) {
        console.error("Error injecting partials:", err);
    }
}