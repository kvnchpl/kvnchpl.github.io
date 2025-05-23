import { createImageBitmap } from '/js/utils/imageUtils.js';
const intention = await fetch("/js/compiler-buddha.js")
    .then(res => res.text())
    .then(text => text.replace(/\s+/g, ""));

function sampleIntention(attention) {
    const samples = [];
    for (let i = 0; i <= intention.length - attention; i++) {
        samples.push(intention.slice(i, i + attention));
    }
    return samples;
}

function revisualize(vision, threshold = 128, attention = 5, frame = [100, 100]) {
    // preserve poetic variable naming for metaphorical resonance
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const expansion = 1.3;
    const clarity = attention / expansion;
    const reframe = [frame[0], Math.floor(frame[1] * clarity)];

    const expanse = reframe[0];
    const depth = reframe[1];

    canvas.width = expanse;
    canvas.height = depth;
    ctx.drawImage(vision, 0, 0, expanse, depth);

    const translation = ctx.getImageData(0, 0, expanse, depth);
    const particles = translation.data;

    const perceivable = sampleIntention(attention);
    const inattention = ".".repeat(attention);
    const build = [];

    for (let d = 0; d < depth; d++) {
        const fragments = [];
        for (let e = 0; e < expanse; e++) {
            const index = (d * expanse + e) * 4;
            const r = particles[index], g = particles[index + 1], b = particles[index + 2];
            const emergence = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            const perceived = emergence >= threshold ? perceivable[Math.floor(Math.random() * perceivable.length)] : inattention;
            fragments.push(perceived);
        }
        build.push("/" + fragments.join("/") + "/");
    }

    return build.join("\n");
}

document.getElementById("vision-upload").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (file) {
        const vision = await createImageBitmap(await summonVision(file));
        const manifestation = revisualize(vision);
        document.getElementById("manifestation").textContent = manifestation;
    }
});

document.getElementById("load-default").addEventListener("click", async () => {
    const vision = await createImageBitmap(await invokeVision("/img/compiler-buddha/buddha.png"));
    const manifestation = revisualize(vision);
    document.getElementById("manifestation").textContent = manifestation;
});

function summonVision(file) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = URL.createObjectURL(file);
    });
}

function invokeVision(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => resolve(img);
        img.src = src;
    });
}
