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

function summon(offering, predestined = true) {
    return new Promise((resolve) => {
        const apparition = new Image();
        apparition.onload = () => resolve(apparition);
        apparition.crossOrigin = "Anonymous";
        apparition.src = predestined ?
            offering :
            URL.createObjectURL(offering);
    });
}

function returnToSource() {
    if (bringForth) {
        clearInterval(bringForth);
        bringForth = null;
    }
    if (loop) {
        clearInterval(loop);
        loop = null;
    }
    fetch("/js/compiler-buddha.js")
        .then(response => response.text())
        .then(intention => {
            document.getElementById("portal").textContent = intention;
        })
        .catch(() => {
            document.getElementById("portal").textContent = "ERROR";
        });
}

document.addEventListener("DOMContentLoaded", () => {
    const manifestor = document.getElementById("manifestor");
    const wayBack = document.getElementById("way-back");
    const vessel = document.getElementById("vessel");
    const portal = document.getElementById("portal");
    const confirmation = document.getElementById("confirmation");

    const openChannels = () => manifestor.disabled = false;
    const closeChannels = () => manifestor.disabled = true;

    returnToSource();

    manifestor.addEventListener("click", async () => {
        closeChannels();

        const offering = vessel.files[0];
        const predestined = !offering;
        const vision = await createImageBitmap(await summon(
            predestined ? "/img/compiler-buddha/buddha.png" : offering,
            predestined
        ));

        const sacredNumber = 108;
        let recitation = 0;

        const firstMantra = manifest(vision);
        const incantations = firstMantra.split("\n");
        portal.textContent = "";
        let focus = 0;
        bringForth = setInterval(() => {
            portal.textContent += incantations[focus] + "\n";
            focus++;
            if (focus >= incantations.length) {
                clearInterval(bringForth);
                bringForth = null;
                setTimeout(() => {
                    loop = setInterval(() => {
                        if (recitation >= sacredNumber - 1) {
                            clearInterval(loop);
                            loop = null;
                            return;
                        }
                        portal.textContent = manifest(vision);
                        recitation++;
                    }, 1000);
                }, 1000);
            }
        }, 10);
    });

    wayBack.addEventListener("click", () => {
        openChannels();
        vessel.value = "";
        confirmation.textContent = "";
        returnToSource();
    });

    vessel.addEventListener("change", (event) => {
        if (!event?.target?.files?.length) return;
        openChannels();
        returnToSource();
        confirmation.textContent = event.target.files[0]?.name || "";
    });
});

let loop;
let bringForth;