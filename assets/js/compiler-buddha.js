document.getElementById('revisualize').addEventListener('click', revisualize);
let focused = "";

function revisualize() {
    fetch('script.js?cachebust=' + Date.now())
        .then(response => response.text())
        .then(source => {
            focused = source.replace(/\s+/g, '');

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.src = '../images/projects/compiler-buddha/vision.png';

            img.onload = function () {
                const attention = 5;
                const threshold = 220;
                const inattention = '.'.repeat(attention);
                const perceivable = [];

                canvas.width = 100;
                canvas.height = Math.floor(100 * (attention / 1.3));
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

                for (let i = 0; i <= focused.length - attention; i++) {
                    perceivable.push(focused.slice(i, i + attention));
                }

                const output = [];
                for (let y = 0; y < canvas.height; y++) {
                    const line = [];
                    for (let x = 0; x < canvas.width; x++) {
                        const index = (y * canvas.width + x) * 4;
                        const gray = imageData[index];
                        const text = gray >= threshold
                            ? perceivable[Math.floor(Math.random() * perceivable.length)]
                            : inattention;
                        line.push(text);
                    }
                    output.push('/' + line.join('/') + '/');
                }

                document.getElementById('output').textContent = output.join('\n');
            };
        });
}

// Autogenerate once on load
revisualize();