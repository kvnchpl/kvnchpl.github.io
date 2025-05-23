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

function revisualize(imageBitmap, threshold = 128, attention = 5, frame = [100, 100]) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const expansion = 1.3;
    const clarity = attention / expansion;
    const reframe = [frame[0], Math.floor(frame[1] * clarity)];

    canvas.width = reframe[0];
    canvas.height = reframe[1];
    ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    const samples = sampleIntention(attention);
    const inattention = ".".repeat(attention);
    const build = [];

    for (let y = 0; y < canvas.height; y++) {
        const fragments = [];
        for (let x = 0; x < canvas.width; x++) {
            const index = (y * canvas.width + x) * 4;
            const r = data[index], g = data[index + 1], b = data[index + 2];
            const luminance = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            const perceived = luminance >= threshold ? samples[Math.floor(Math.random() * samples.length)] : inattention;
            fragments.push(perceived);
        }
        build.push("/" + fragments.join("/") + "/");
    }

    return build.join("\n");
}

document.getElementById("vision-upload").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (file) {
        const bitmap = await createImageBitmap(await fileToImage(file));
        const result = revisualize(bitmap);
        document.getElementById("manifestation").textContent = result;
    }
});

document.getElementById("load-default").addEventListener("click", async () => {
    const bitmap = await createImageBitmap(await loadImage("/img/compiler-buddha/buddha.png"));
    const result = revisualize(bitmap);
    document.getElementById("manifestation").textContent = result;
});

function fileToImage(file) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = URL.createObjectURL(file);
    });
}

function loadImage(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => resolve(img);
        img.src = src;
    });
}
