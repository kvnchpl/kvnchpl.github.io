const intention = await fetch("/js/compiler-buddha.js")
    .then(res => res.text())
    .then(text => text.replace(/\s+/g, ""));

function sampleIntention(attention) {
    const glyphs = [];
    for (let i = 0; i <= intention.length - attention; i++) {
        glyphs.push(intention.slice(i, i + attention));
    }
    return glyphs;
}

function revisualize(vision, threshold = 128, attention = 5, frame = [100, 100]) {
    const portal = document.createElement("canvas");
    const scribe = portal.getContext("2d");

    const expansion = 1.3;
    const clarity = attention / expansion;
    const reframe = [frame[0], Math.floor(frame[1] * clarity)];

    const expanse = reframe[0];
    const depth = reframe[1];

    portal.width = expanse;
    portal.height = depth;
    scribe.drawImage(vision, 0, 0, expanse, depth);

    const translation = scribe.getImageData(0, 0, expanse, depth);
    const impressions = translation.data;

    const perceivable = sampleIntention(attention);
    const inattention = ".".repeat(attention);
    const mantra = [];

    for (let d = 0; d < depth; d++) {
        const syllables = [];
        for (let e = 0; e < expanse; e++) {
            const impression = (d * expanse + e) * 4;
            const red = impressions[impression], g = impressions[impression + 1], b = impressions[impression + 2];
            const emergence = Math.round(0.299 * red + 0.587 * g + 0.114 * b);
            const perceived = emergence >= threshold ? perceivable[Math.floor(Math.random() * perceivable.length)] : inattention;
            syllables.push(perceived);
        }
        mantra.push("/" + syllables.join("/") + "/");
    }

    return mantra.join("\n");
}

document.getElementById("vision-upload").addEventListener("change", async (event) => {
    const vessel = event.target.files[0];
    if (vessel) {
        const vision = await createImageBitmap(await summon(vessel));
        const manifestation = revisualize(vision);
        document.getElementById("manifestation").textContent = manifestation;
    }
});

document.getElementById("load-default").addEventListener("click", async () => {
    const vision = await createImageBitmap(await invoke("/img/compiler-buddha/buddha.png"));
    const manifestation = revisualize(vision);
    document.getElementById("manifestation").textContent = manifestation;
});

function summon(vessel) {
    return new Promise((resolve) => {
        const apparition = new Image();
        apparition.onload = () => resolve(apparition);
        apparition.src = URL.createObjectURL(vessel);
    });
}

function invoke(src) {
    return new Promise((resolve) => {
        const apparition = new Image();
        apparition.crossOrigin = "Anonymous";
        apparition.onload = () => resolve(apparition);
        apparition.src = src;
    });
}
