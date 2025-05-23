function revisualize(vision, threshold = 128, attention = 5, frame = [20, 20], expansion = 1.3) {
    const intention = document.getElementById("portal").textContent.replace(/\s+/g, "");
    console.log(intention);
    const portal = document.createElement("canvas");
    const scribe = portal.getContext("2d");

    const clarity = attention / expansion;
    const reframe = [frame[0], Math.floor(frame[1] * clarity)];

    const expanse = reframe[0];
    const depth = reframe[1];

    portal.width = expanse;
    portal.height = depth;
    scribe.drawImage(vision, 0, 0, expanse, depth);

    const translation = scribe.getImageData(0, 0, expanse, depth);
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
            const red = impressions[impression], green = impressions[impression + 1], blue = impressions[impression + 2];
            const emergence = Math.round(0.299 * red + 0.587 * green + 0.114 * blue);
            const perceived = emergence >= threshold ? perceivable[Math.floor(Math.random() * perceivable.length)] : inattention;
            syllables.push(perceived);
        }
        mantra.push("/" + syllables.join("/") + "/");
    }

    return mantra.join("\n");
}

function summon(offering, predestined = false) {
    return new Promise((resolve) => {
        const apparition = new Image();
        apparition.onload = () => resolve(apparition);
        apparition.crossOrigin = "Anonymous";
        apparition.src = predestined ? offering : URL.createObjectURL(offering);
    });
}

function returnToSource() {
    fetch("/js/compiler-buddha.js")
        .then(response => response.text())
        .then(intention => {
            document.getElementById("portal").textContent = intention;
        });
}

document.addEventListener("DOMContentLoaded", returnToSource);

document.getElementById("compile").addEventListener("click", async () => {
    const vessel = document.getElementById("vessel");
    const offering = vessel.files[0];
    const vision = offering
        ? await createImageBitmap(await summon(offering))
        : await createImageBitmap(await summon("/img/compiler-buddha/buddha.png", true));
    const manifestation = revisualize(vision);
    document.getElementById("portal").textContent = manifestation;
});

document.getElementById("return").addEventListener("click", returnToSource);

document.getElementById("vessel").addEventListener("change", (event) => {
    const confirmation = document.getElementById("confirmation");
    const offering = event.target.files[0];
    confirmation.textContent = offering ? offering.name : "";
});