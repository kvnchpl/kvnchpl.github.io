import {artworkProfile, artworkPaths} from './artwork.js';
import {visualVariant} from './random.js';

export function createRenderer({rules, presentation: display, artwork}, getState, profileId) {
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
        const profile = artworkProfile(artwork, profileId);
        const loaded = new Map(await Promise.all(artworkPaths(profile).map(async src => [src, await loadImage(src)])));
        const fallback = loaded.get(profile.fallback);
        const variants = paths => paths.map(path => ({image: loaded.get(path) ?? fallback}));
        for (const [id, paths] of Object.entries(profile.tiles)) cache.tiles[id] = variants(paths);
        for (const [id, stages] of Object.entries(profile.plants)) {
            cache.plants[id] = Object.fromEntries(Object.entries(stages).map(([stage,paths]) => [stage,variants(paths)]));
        }
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
        // Resizing resets canvas settings; keep enlarged sprite pixels crisp.
        ctx.imageSmoothingEnabled = false;
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
