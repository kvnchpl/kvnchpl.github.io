import {loadDefinitions} from './config.js';
import {createSimulation} from './simulation.js';
import {createBrowserStorage} from './storage.js';
import {createRenderer} from './renderer.js';
import {createUI} from './ui.js';
import {installControls} from './player.js';

// The browser controller coordinates the model and its adapters. Simulation
// modules have no dependency on this entry point, DOM, storage or artwork.
async function start() {
    const definitions = await loadDefinitions();
    const {rules, presentation} = definitions;
    const storage = createBrowserStorage(rules);
    const newSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];
    let simulation = createSimulation(rules, {seed: newSeed(), savedState: storage.load()});
    const getState = () => simulation.state;
    const renderer = createRenderer(definitions, getState);
    await renderer.load();
    let ui;
    const refresh = action => { renderer.render(); ui.update(action); ui.saveStatus(storage.save(getState())); };
    function send(command) {
        if (ui.modalOpen()) return;
        if (command.type === 'requestNewGame') {
            ui.message({title:'Start a new game?', message:'This will replace your current farm and any previous save.', cancelText:'Cancel', onConfirm: () => {
                storage.replace(); simulation = createSimulation(rules, {seed:newSeed()}); refresh();
            }}); return;
        }
        if (command.type === 'requestEndDay') {
            ui.message({title:'End the day?', message:'You won’t be able to take more actions today.', confirmText:'End Day', cancelText:'Cancel', onConfirm:ui.dayComplete}); return;
        }
        if (command.type === 'downloadSave') {
            const raw = storage.readRaw(); if (raw === null) return;
            const url = URL.createObjectURL(new Blob([raw],{type:'application/json'}));
            const link = document.createElement('a'); link.href = url; link.download = 'trellis-previous-save.json'; link.click();
            setTimeout(() => URL.revokeObjectURL(url),1000); return;
        }
        const result = simulation.dispatch(command);
        if (result.status === 'blocked') ui.blocked(result.action);
        else if (result.status === 'choosePlant') ui.choosePlant();
        else if (result.status === 'changed') refresh(result.action);
        if (result.status === 'dayComplete' || result.dayComplete) ui.dayComplete();
    }
    ui = createUI(definitions, renderer, getState, send);
    installControls(presentation.keyBindings, send, ui.modalOpen);
    renderer.resize(); refresh();
    if (getState().time.hour >= rules.dayEndHour) ui.dayComplete();
    window.addEventListener('resize', () => { renderer.resize(); renderer.render(); });
}
start().catch(error => {
    console.error('Error initializing game:', error);
    document.getElementById('save-size').textContent = 'The garden could not load. Reload to try again; your previous save is unchanged.';
});
