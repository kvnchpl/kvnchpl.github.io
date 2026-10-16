function manifest(vision, threshold = 130, attention = 5, breadth = 20, expansion = 1.724) {
    const intention = document.getElementById("portal").textContent.replace(/\s+/g, "");
    const portal = document.createElement("canvas");
    const channel = portal.getContext("2d");

    const clarity = attention / expansion;
    const frame = vision.height / vision.width;

    const expanse = breadth;
    const depth = Math.floor(expanse * frame * clarity);

    portal.width = expanse;
    portal.height = depth;
    channel.drawImage(vision, 0, 0, expanse, depth);

    const translation = channel.getImageData(0, 0, expanse, depth);
    const impressions = translation.data;

    const perceivable = [];
    for (let focus = 0; focus <= intention.length - attention; focus++) {
        perceivable.push(intention.slice(focus, focus + attention));
    }

    const inattention = ".".repeat(attention);
    const mantra = [];

    for (let descent = 0; descent < depth; descent++) {
        const syllables = [];
        for (let extension = 0; extension < expanse; extension++) {
            const impression = (descent * expanse + extension) * 4;
            const red = impressions[impression],
                green = impressions[impression + 1],
                blue = impressions[impression + 2];
            const emergence = Math.round(0.299 * red + 0.587 * green + 0.114 * blue);
            const perceived = emergence >= threshold ?
                perceivable[Math.floor(Math.random() * perceivable.length)] :
                inattention;
            syllables.push(perceived);
        }
        mantra.push("/" + syllables.join("/") + "/");
    }

    return mantra.join("\n");
}

function summon(offering) {
    return new Promise((resolve, reject) => {
        const apparition = new Image();
        apparition.onload = () => resolve(apparition);
        apparition.onerror = () => reject(new Error('The Buddha image could not be loaded.'));
        apparition.src = offering;
    });
}

// Every delay belongs to the current run; Return cancels even a transition delay.
function pause(duration, signal) {
    return new Promise((resolve, reject) => {
        if (signal.aborted) return reject(signal.reason);
        const cancelled = () => {
            clearTimeout(timer);
            reject(signal.reason);
        };
        const timer = setTimeout(() => {
            signal.removeEventListener('abort', cancelled);
            resolve();
        }, duration);
        signal.addEventListener('abort', cancelled, {once: true});
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const manifestor = document.getElementById('manifestor');
    const wayBack = document.getElementById('way-back');
    const portal = document.getElementById('portal');
    const image = document.getElementById('buddha-image');
    const status = document.getElementById('compiler-status');
    let source = '';
    let vision;
    let activeRun;
    let ready = false;
    let loading = true;

    function returnToSource() {
        activeRun?.abort();
        activeRun = null;
        image.src = '/a/buddha.webp';
        portal.textContent = source;
        manifestor.disabled = loading;
        status.textContent = ready ? 'Source restored. Ready to compile.' : loading ? 'Loading source and image…' : 'Could not load the work. Choose Retry to try again.';
    }

    async function prepare() {
        loading = true;
        manifestor.disabled = true;
        status.textContent = 'Loading source and image…';
        try {
            const response = await fetch(import.meta.url);
            if (!response.ok) throw new Error('The source code could not be loaded.');
            [source, vision] = await Promise.all([response.text(), summon('/a/buddha.webp')]);
            ready = true;
            loading = false;
            manifestor.textContent = 'Compile';
            manifestor.setAttribute('aria-label', 'Compile Buddha code');
            returnToSource();
        } catch {
            ready = false;
            loading = false;
            manifestor.textContent = 'Retry';
            manifestor.setAttribute('aria-label', 'Retry loading Compiler Buddha');
            manifestor.disabled = false;
            status.textContent = 'Could not load the work. Choose Retry to try again.';
        }
    }

    manifestor.addEventListener('click', async () => {
        if (!ready) return prepare();
        if (activeRun) return;
        const controller = new AbortController();
        activeRun = controller;
        const {signal} = controller;
        manifestor.disabled = true;
        image.src = '/a/buddha-animation.webp';
        status.textContent = 'Compiling. Choose Return to restore the source.';
        try {
            const incantations = manifest(vision).split('\n');
            portal.textContent = '';
            for (const line of incantations) {
                await pause(50, signal);
                portal.textContent += line + '\n';
            }
            await pause(1000, signal);
            const sacredNumber = 108;
            for (let recitation = 1; recitation < sacredNumber; recitation++) {
                await pause(1000, signal);
                portal.textContent = manifest(vision);
            }
            await pause(2000, signal);
            if (activeRun === controller) returnToSource();
        } catch {
            if (activeRun === controller) {
                returnToSource();
                status.textContent = 'Compilation stopped. The source has been restored; you can try again.';
            }
        }
    });
    image.addEventListener('error', () => {
        if (!activeRun) return;
        returnToSource();
        status.textContent = 'The animation could not load. The source has been restored; you can try again.';
    });
    wayBack.addEventListener('click', returnToSource);
    window.addEventListener('pagehide', returnToSource);
    prepare();
});
