import {evaluateCondition, getBlockedActionMessages} from './actions.js';

// Presentation owns DOM and focus only. Every garden change is a command sent
// to the controller, including plant choices and completed-day confirmation.
export function createUI({rules, presentation: display, strings}, renderer, getState, send) {
    const $ = id => document.getElementById(id);
    let activeModal = null, returnFocus = null, returnAction = null;
    let plantButtons = [];
    const modalOpen = () => activeModal !== null;
    function close() {
        $('plant-modal-overlay').style.display = 'none';
        $('game-message-overlay').style.display = 'none';
        $('top-button-bar').inert = false;
        $('game-container').inert = false;
        activeModal = null;
        const target = returnAction ? document.querySelector(`[data-action="${returnAction}"]`) : returnFocus;
        (target?.isConnected ? target : $('game-canvas')).focus({preventScroll: true});
        returnFocus = null; returnAction = null;
    }
    function open(id) {
        if (!modalOpen()) {
            returnFocus = document.activeElement;
            returnAction = returnFocus?.dataset.action || null;
        }
        $('plant-modal-overlay').style.display = 'none';
        $('game-message-overlay').style.display = 'none';
        activeModal = $(id);
        $(id === 'plant-modal' ? 'plant-modal-overlay' : 'game-message-overlay').style.display = 'flex';
        $('top-button-bar').inert = true;
        $('game-container').inert = true;
    }
    function message({title, message, confirmText = 'OK', cancelText, onConfirm = () => {}}) {
        $('game-message-title').textContent = title;
        const body = $('game-message-content'); body.replaceChildren();
        if (Array.isArray(message)) {
            const list = document.createElement('ul');
            for (const text of message) { const item = document.createElement('li'); item.textContent = text; list.append(item); }
            body.append(list);
        } else { const text = document.createElement('div'); text.textContent = message; body.append(text); }
        const confirm = $('game-message-confirm'), cancel = $('game-message-cancel');
        confirm.textContent = confirmText;
        confirm.onclick = () => { close(); onConfirm(); };
        cancel.style.display = cancelText ? 'inline-block' : 'none';
        cancel.textContent = cancelText || 'Cancel'; cancel.onclick = close;
        $('game-message-overlay').onclick = event => { if (event.target === $('game-message-overlay') && cancelText) close(); };
        open('game-message-modal'); confirm.focus();
    }
    function blocked(action) {
        const state = getState(), tile = state.map[`${state.selector.x},${state.selector.y}`];
        const reasons = getBlockedActionMessages(tile, {...rules.actions[action], name: action}, strings);
        message({title: `Cannot ${strings.actions[action] || action} this tile`, message: reasons.length ? reasons : ['The tile does not meet the requirements for this action.']});
    }
    function choosePlant() {
        const container = $('plant-modal-buttons'); container.replaceChildren(); plantButtons = [];
        Object.keys(rules.species).forEach((id, index) => {
            const button = document.createElement('button');
            button.className = 'ui-button'; button.textContent = `[${index+1}] ${display.plants.labels[id]}`;
            button.onclick = () => { close(); send({type: 'plant', speciesId: id}); };
            container.append(button); plantButtons.push(button);
        });
        open('plant-modal'); plantButtons[0]?.focus();
    }
    function dayComplete() {
        const stats = getState().dailyStats;
        message({title: 'DAY COMPLETE', message: '', confirmText: 'Continue', onConfirm: () => send({type: 'completeDay'})});
        const body = $('game-message-content'); body.replaceChildren();
        for (const [label, key] of [['Steps walked','steps'],['Crops planted','planted'],['Tiles tilled','tilled'],['Tiles watered','watered'],['Tiles fertilized','fertilized'],['Crops harvested','harvested']]) {
            const line = document.createElement('div'); line.textContent = `${label}: ${stats[key]}`; body.append(line);
        }
    }
    function format(tile, key) {
        let value = tile[key];
        if ((key === 'tile' || key === 'plantType') && value == null) value = 'none';
        if (typeof value === 'boolean') value = value ? 'Yes' : 'No';
        if (key === 'tile') value = display.tiles.labels[value] ?? value;
        if (key === 'plantType') value = display.plants.labels[value] ?? value;
        if ((key === 'moisture' || key === 'fertility') && typeof value === 'number') value = `${value}%`;
        return value ?? '–';
    }
    function update(action = null) {
        const state = getState(), tile = state.map[`${state.selector.x},${state.selector.y}`];
        const focusedAction = document.activeElement?.dataset.action;
        const time = state.time, hour = ((time.hour-1)%12+1);
        $('time-display').textContent = `${rules.seasons[time.seasonIndex]} - WEEK ${time.week} - ${hour}:${String(time.minute).padStart(2,'0')} ${time.hour < 12 ? 'AM' : 'PM'}`;
        const image = renderer.imageFor(tile, state.selector.x, state.selector.y);
        $('tile-image').style.display = image ? 'block' : 'none';
        if (image) $('tile-image').src = image.src;
        const details = $('tile-details'); details.replaceChildren();
        for (const key of display.tiles.detailsOrder) {
            const line = document.createElement('p'), label = document.createElement('strong'), value = document.createElement('span');
            label.textContent = `${display.tiles.labels[key] ?? key}: `;
            value.id = `tile-value-${key}`; value.textContent = format(tile,key);
            if (action && Object.hasOwn(rules.actions[action].effect, key)) value.className = 'value-changed';
            line.append(label,value); details.append(line);
        }
        const actions = $('tile-actions'); actions.replaceChildren();
        for (const [name, def] of Object.entries(rules.actions).sort(([a],[b]) => Number(display.keyBindings.actions[a])-Number(display.keyBindings.actions[b]))) {
            const button = document.createElement('button'); button.className = 'ui-button'; button.dataset.action = name;
            button.textContent = `[${display.keyBindings.actions[name]}] ${name}`;
            if (!evaluateCondition(tile,def.condition)) button.classList.add('disabled');
            button.onclick = () => send({type:'action', action:name});
            actions.append(button);
        }
        if (focusedAction && !modalOpen()) document.querySelector(`[data-action="${focusedAction}"]`)?.focus({preventScroll:true});
    }
    function saveStatus(status) {
        $('download-save').hidden = !status.protected;
        if (status.protected) $('save-size').textContent = 'Not saved: previous save could not be loaded and is preserved. Download it before using New Game to replace it.';
        else if (status.bytes === null) $('save-size').textContent = 'Not saved: browser storage is unavailable. Progress is kept for this visit.';
        else {
            const warning = status.bytes > display.saveSizeCriticalKB*1024 ? ' ⚠⚠ close to limit!' : status.bytes > display.saveSizeWarningKB*1024 ? ' ⚠ nearing limit' : '';
            $('save-size').textContent = `(${(status.bytes/1024).toFixed(2)} KB${warning})`;
        }
    }
    $('plant-modal-cancel').onclick = close;
    $('plant-modal-overlay').onclick = event => { if (event.target === $('plant-modal-overlay')) close(); };
    $('new-game').onclick = () => send({type:'requestNewGame'});
    $('end-day').onclick = () => send({type:'requestEndDay'});
    $('download-save').onclick = () => send({type:'downloadSave'});
    document.addEventListener('keydown', event => {
        if (!modalOpen() || event.ctrlKey || event.metaKey || event.altKey) return;
        const buttons = [...activeModal.querySelectorAll('button')].filter(button => !button.disabled && button.getClientRects().length);
        const focused = document.activeElement;
        if (event.key === 'Tab') {
            event.preventDefault();
            const next = (buttons.indexOf(focused)+(event.shiftKey?-1:1)+buttons.length)%buttons.length;
            buttons[next]?.focus(); return;
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            if (activeModal.id === 'plant-modal') close();
            else if ($('game-message-cancel').getClientRects().length) close();
            return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault(); if (buttons.includes(focused)) focused.click(); return;
        }
        if (activeModal.id !== 'plant-modal') return;
        const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
        const directions = {ArrowRight:1,d:1,ArrowLeft:-1,a:-1,ArrowDown:2,s:2,ArrowUp:-2,w:-2};
        if (Object.hasOwn(directions,key)) {
            event.preventDefault();
            const index = plantButtons.indexOf(focused);
            plantButtons[Math.max(0,Math.min(plantButtons.length-1,(index<0?0:index)+directions[key]))]?.focus();
        } else if (/^[1-9]$/.test(key)) { event.preventDefault(); plantButtons[Number(key)-1]?.click(); }
    });
    return {update, saveStatus, modalOpen, message, blocked, choosePlant, dayComplete};
}
