const scroll = document.getElementById("manifestation");
const vision_upload = document.getElementById("vision-upload");
const summon_default = document.getElementById("load-default");

const frame = [100, 100];
const attention = 5;
const threshold = 128;
const expansion = 1.3;

let intention = `...`.replace(/\s+/g, "");

function transcribe_manifestation(glimpses_translated, expanse, depth) {
    const build = [];
    for (let d = 0; d < depth; d++) {
        const fragments = [];
        for (let e = 0; e < expanse; e++) {
            const i = (d * expanse + e) * 4;
            const emergence = glimpses_translated.data[i];
            const perceived = (emergence >= threshold)
                ? glimpse_intention()
                : ".".repeat(attention);
            fragments.push(perceived);
        }
        build.push("/" + fragments.join("/") + "/");
    }
    return build.join("\n");
}

function glimpse_intention() {
    const perceivable = [];
    for (let i = 0; i <= intention.length - attention; i++) {
        perceivable.push(intention.substring(i, i + attention));
    }
    return perceivable.length > 0
        ? perceivable[Math.floor(Math.random() * perceivable.length)]
        : ".".repeat(attention);
}

function expand_vision(vision, frame, attention) {
    const clarity = attention / expansion;
    const reframe = [frame[0], Math.floor(frame[1] * clarity)];
    const canvas = document.createElement("canvas");
    canvas.width = reframe[0];
    canvas.height = reframe[1];
    const context = canvas.getContext("2d");
    context.drawImage(vision, 0, 0, reframe[0], reframe[1]);
    const glimpses_translated = context.getImageData(0, 0, reframe[0], reframe[1]);
    for (let i = 0; i < glimpses_translated.data.length; i += 4) {
        const r = glimpses_translated.data[i];
        const g = glimpses_translated.data[i + 1];
        const b = glimpses_translated.data[i + 2];
        const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        glimpses_translated.data[i] = glimpses_translated.data[i + 1] = glimpses_translated.data[i + 2] = gray;
    }
    return { glimpses_translated, expanse: reframe[0], depth: reframe[1] };
}

async function revisualize(where_is_the_vision) {
    const vision = await createImageBitmap(where_is_the_vision);
    const { glimpses_translated, expanse, depth } = expand_vision(vision, frame, attention);
    const manifestation = transcribe_manifestation(glimpses_translated, expanse, depth);
    scroll.textContent = manifestation;
}

vision_upload.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
        revisualize(e.target.files[0]);
    }
});

summon_default.addEventListener("click", async () => {
    const response = await fetch("/img/compiler-buddha/buddha.png");
    const vision = await response.blob();
    revisualize(vision);
});