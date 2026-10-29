import {visualVariant} from './random.js';

export function createRenderer({rules, presentation: display}, getState) {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const cache = {tiles: {}, plants: {}};
    let tileSize = 1;
    const loadImage = src => new Promise(resolve => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = src;
    });
    async function load() {
        const fallback = await loadImage('assets/debug/missing.png');
        const jobs = [];
        const variants = (folder, prefix) => Array.from({length: display.imageVariantCount}, (_,index) => {
            const slot = {image: null};
            jobs.push(loadImage(`${folder}/${prefix}_${index+1}.png`).then(image => { slot.image = image ?? fallback; }));
            return slot;
        });
        for (const [id, folder] of Object.entries(display.tiles.images)) cache.tiles[id] = variants(folder, id);
        for (const [id, folder] of Object.entries(display.plants.images)) {
            cache.plants[id] = {};
            rules.species[id].growthStages.forEach((stage, index) => {
                cache.plants[id][stage] = variants(folder, `${display.plants.prefixes[id]}_${index+1}`);
            });
        }
        await Promise.all(jobs);
    }
    function imageFor(tile, x, y) {
        const plant = Boolean(tile.plantType);
        const variants = plant ? cache.plants[tile.plantType]?.[tile.growthStage] : cache.tiles[tile.tile];
        if (!variants?.length) return null;
        const legacy = plant ? tile.plantVariant : tile.tileVariant;
        const index = legacy == null ? visualVariant(getState().seed, `${x},${y}:${plant ? tile.plantType+':'+tile.growthStage : tile.tile}`, variants.length) : legacy % variants.length;
        return variants[index]?.image ?? null;
    }
    function resize() {
        const container = document.getElementById('game-container');
        const panel = document.getElementById('info-panel');
        const stacked = getComputedStyle(container).flexDirection === 'column';
        const width = container.getBoundingClientRect().width - (stacked ? 0 : panel.getBoundingClientRect().width) - 16;
        const controlsHeight = document.getElementById('touch-controls').getBoundingClientRect().height;
        const height = stacked ? width : container.getBoundingClientRect().height - 16 - (controlsHeight ? controlsHeight+8 : 0);
        tileSize = Math.max(1, Math.floor(Math.min(width, height) / display.viewport.tiles));
        const dpr = window.devicePixelRatio || 1;
        const size = tileSize * display.viewport.tiles;
        canvas.width = size * dpr; canvas.height = size * dpr;
        canvas.style.width = `${size}px`; canvas.style.height = `${size}px`;
        ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    function render() {
        const state = getState();
        const count = display.viewport.tiles;
        const startX = state.player.x - Math.floor(count/2), startY = state.player.y - Math.floor(count/2);
        ctx.clearRect(0,0,canvas.width,canvas.height);
        for (let sy=0; sy<count; sy++) for (let sx=0; sx<count; sx++) {
            const x = startX+sx, y = startY+sy, key = `${x},${y}`;
            const tile = state.map[key];
            if (x < 0 || y < 0 || x >= rules.mapWidth || y >= rules.mapHeight || !state.revealed[key] || !tile) {
                ctx.fillStyle = display.fog.color;
                ctx.globalAlpha = display.fog.opacity;
                ctx.fillRect(sx*tileSize,sy*tileSize,tileSize,tileSize);
                ctx.globalAlpha = 1;
                continue;
            }
            const image = imageFor(tile,x,y);
            if (image) ctx.drawImage(image,sx*tileSize,sy*tileSize,tileSize,tileSize);
            else { ctx.fillStyle = display.tiles.colors[tile.tile] ?? display.tiles.colors.default; ctx.fillRect(sx*tileSize,sy*tileSize,tileSize,tileSize); }
        }
        const size = tileSize * display.playerSize, offset = (tileSize-size)/2;
        ctx.fillStyle = display.playerColor;
        ctx.fillRect((state.player.x-startX)*tileSize+offset,(state.player.y-startY)*tileSize+offset,size,size);
        ctx.strokeStyle = display.selectorColor; ctx.lineWidth = 2;
        ctx.strokeRect((state.selector.x-startX)*tileSize+1,(state.selector.y-startY)*tileSize+1,tileSize-2,tileSize-2);
    }
    return {load, resize, render, imageFor};
}
