// Input translates gestures to commands. It never reads or changes the garden.
export function installControls(bindings, send, isModalOpen) {
    const directions = {up: [0,-1], down: [0,1], left: [-1,0], right: [1,0],
        selectUp: [0,-1], selectDown: [0,1], selectLeft: [-1,0], selectRight: [1,0], resetSelector: [0,0]};
    const commands = new Map();
    for (const [name, offset] of Object.entries(directions)) {
        commands.set(bindings[name], {type: name.startsWith('select') || name === 'resetSelector' ? 'select' : 'move', dx: offset[0], dy: offset[1]});
    }
    for (const [action, key] of Object.entries(bindings.actions)) commands.set(key, {type: 'action', action});
    const abort = new AbortController();
    const options = {signal: abort.signal};
    window.addEventListener('keydown', event => {
        if (event.defaultPrevented || isModalOpen() || event.ctrlKey || event.metaKey || event.altKey) return;
        if (event.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
        const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
        if (!commands.has(key)) return;
        event.preventDefault();
        send(commands.get(key));
    }, options);
    document.querySelectorAll('[data-control]').forEach(button => {
        button.addEventListener('click', () => {
            if (!isModalOpen()) send(commands.get(bindings[button.dataset.control]));
        }, options);
    });
    return () => abort.abort();
}
