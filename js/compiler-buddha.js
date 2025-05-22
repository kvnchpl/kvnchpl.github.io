
window.addEventListener('DOMContentLoaded', () => {
    const output = document.createElement('div');
    output.id = 'buddha-output';
    output.style.whiteSpace = 'pre-wrap';
    output.style.marginTop = '1rem';

    // Read the content of this script tag
    const scriptTag = document.querySelector('script[src$="compiler-buddha.js"]');
    fetch(scriptTag.src)
        .then(response => response.text())
        .then(code => {
            output.textContent = "// Compiler Buddha reflecting...\n\n" + code;
            document.body.appendChild(output);
        })
        .catch(err => {
            output.textContent = "Failed to load source code.";
            document.body.appendChild(output);
        });
});