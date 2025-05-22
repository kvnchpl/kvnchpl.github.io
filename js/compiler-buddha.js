const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

const attention = 5;
const threshold = 128;
const expansion = 1.3;
const intention = `The Compiler Buddha reflects on code and light.
It reshapes itself in response to what is seen.
It is recursive, meditative, and strange.`.replace(/\s+/g, "");

const getPerceivable = () => {
    const out = [];
    for (let i = 0; i <= intention.length - attention; i++) {
        out.push(intention.slice(i, i + attention));
    }
    return out;
};

const revisualize = (image, frameHeight = 60) => {
    return new Promise((resolve) => {
        const img = new Image();
        // Cap rows/cols based on screen size
        const charWidth = 7; // approx width of monospace character in pixels
        const charHeight = 15; // approx height of line in pixels
        const maxCols = Math.floor(window.innerWidth / (charWidth * attention));
        const maxRows = Math.floor(window.innerHeight / charHeight);
        img.onload = () => {
            const clarity = attention / expansion;
            const width = img.width;
            // const maxDisplayHeight = 30;
            // const height = Math.min(Math.floor(frameHeight * clarity), maxDisplayHeight);
            const height = Math.min(Math.floor(frameHeight * clarity), maxRows);
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            const imageData = ctx.getImageData(0, 0, width, height).data;
            const perceivable = getPerceivable();
            const inattention = ".".repeat(attention);
            const build = [];

            for (let y = 0; y < height; y++) {
                const fragments = [];
                for (let x = 0; x < Math.min(width, maxCols); x++) {
                    const i = (y * width + x) * 4;
                    const grayscale = Math.floor(
                        0.299 * imageData[i] +
                        0.587 * imageData[i + 1] +
                        0.114 * imageData[i + 2]
                    );
                    const perceived = grayscale >= threshold
                        ? perceivable[Math.floor(Math.random() * perceivable.length)]
                        : inattention;
                    fragments.push(perceived);
                }
                build.push("/" + fragments.join("/") + "/");
            }

            resolve(build.join("\n"));
        };
        img.src = image;
    });
};

document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("buddha-upload");
    const output = document.getElementById("manifestation");

    fileInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const result = await revisualize(event.target.result);
            output.textContent = result;
        };
        reader.readAsDataURL(file);
    });
});
