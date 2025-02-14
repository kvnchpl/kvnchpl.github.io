/* sansui.js */
class Game {
    constructor() {
        this.mapWidthInCells = 0;
        this.grid = [];
        this.pathCanvas = document.getElementById("pathCanvas");
        this.pathCtx = this.pathCanvas.getContext("2d");
        this.growableCells = new Set();
    }

    async loadConfig() {
        try {
            console.log("Loading configuration...");

            // Get JSON path from meta tag
            const metaTag = document.querySelector('meta[name="game-data"]');
            const jsonPath = metaTag ? metaTag.getAttribute('content') : null;

            // Get sprites base path from meta tag
            const spritesMetaTag = document.querySelector('meta[name="sprites"]');
            const spritesBasePath = spritesMetaTag ? spritesMetaTag.getAttribute('content') : null;

            if (!jsonPath) {
                console.error("Game data file path is missing from meta tag!");
                return;
            }
            if (!spritesBasePath) {
                console.error("Sprites base path is missing from meta tag!");
                return;
            }

            const response = await fetch(jsonPath);
            this.config = await response.json();

            if (!this.config.mapSize) {
                console.error("Invalid config: missing mapSize!");
                return;
            }

            this.TILE_SIZE = this.config.tileSize;
            this.PATH_SIZE = this.config.pathSize;
            this.EDGE_WIDTH = (this.TILE_SIZE - this.PATH_SIZE) / 2;
            this.EDGE_LENGTH = this.PATH_SIZE;

            this.config.sprites = Game.prependBaseURL(this.config.sprites, spritesBasePath);

            console.log("Config successfully loaded from:", jsonPath);
            console.log("Sprites base path set to:", spritesBasePath);
            this.initGame();
        } catch (error) {
            console.error("Failed to load config:", error);
        }
    }

    initGame() {
        console.log("Initializing game...");
        if (!this.config || Object.keys(this.config).length === 0) {
            console.error("Config is empty! Ensure loadConfig() runs before initGame().");
            return;
        }

        this.updateMapWidth();
        this.createMap();
        this.setupPathGrid();
        this.resizeCanvas();
        this.setupAutoGrowth();
    }

    updateMapWidth() {
        this.mapWidthInCells = Math.max(1, Math.min(Math.floor(window.innerWidth / this.TILE_SIZE), this.config.mapSize));
    }

    createMap() {
        const map = document.getElementById('map');
        map.innerHTML = '';

        for (let y = 0; y < this.config.mapSize; y++) {
            for (let x = 0; x < this.mapWidthInCells; x++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.x = x;
                cell.dataset.y = y;

                const featureLayer = document.createElement('div');
                featureLayer.classList.add('layer', 'feature');
                cell.appendChild(featureLayer);

                const playerLayer = document.createElement('div');
                playerLayer.classList.add('layer', 'player');
                cell.appendChild(playerLayer);

                map.appendChild(cell);
            }
        }

        map.style.gridTemplateColumns = `repeat(${this.mapWidthInCells}, ${this.TILE_SIZE}px)`;
        this.placePlayerRandomly();
        this.scheduleUpdate();
        this.player.hasMoved = false;
    }

    updateMap() {
        document.querySelectorAll('.cell').forEach(cell => {
            const playerLayer = cell.querySelector('.player');
            playerLayer.style.backgroundImage = '';
            if (parseInt(cell.dataset.x) === this.player.x && parseInt(cell.dataset.y) === this.player.y) {
                playerLayer.style.backgroundImage = `url(${this.config.sprites.player[this.player.direction]})`;
            }
        });

        if (this.player.hasMoved) {
            this.generateFeature();
        }
    }

    setupPathGrid() {
        this.updateMapWidth();
        this.grid = Array.from({ length: this.config.mapSize }, () => Array(this.mapWidthInCells).fill(0));
        this.pathGrid = Array.from({ length: this.config.mapSize }, () => Array(this.mapWidthInCells).fill(null));
    }

    resizeCanvas() {
        const container = document.getElementById("map-container");
        this.pathCanvas.width = container.clientWidth;
        this.pathCanvas.height = container.clientHeight;
    }

    placePlayerRandomly() {
        const edgePositions = [];

        for (let i = 0; i < this.mapWidthInCells; i++) {
            edgePositions.push({ x: i, y: 0 }, { x: i, y: this.config.mapSize - 1 });
        }
        for (let i = 0; i < this.config.mapSize; i++) {
            edgePositions.push({ x: 0, y: i }, { x: this.mapWidthInCells - 1, y: i });
        }

        if (edgePositions.length === 0) {
            console.error("Edge positions array is empty. Player cannot be placed.");
            return;
        }

        const randomIndex = Math.floor(Math.random() * edgePositions.length);
        this.player = { ...edgePositions[randomIndex], direction: 'down', hasMoved: false };

        console.log(`Player placed at (${this.player.x}, ${this.player.y})`);
        this.scheduleUpdate();
    }

    movePlayer(dx, dy) {
        const prevX = this.player.x;
        const prevY = this.player.y;

        const newX = prevX + dx;
        const newY = prevY + dy;

        if (newX < 0 || newX >= this.mapWidthInCells || newY < 0 || newY >= this.config.mapSize) return;

        const targetCell = document.querySelector(`.cell[data-x="${newX}"][data-y="${newY}"]`);
        if (!targetCell) return;

        const featureLayer = targetCell.querySelector('.feature');
        if (featureLayer && featureLayer.style.backgroundImage) {
            return;
        }

        this.grid[prevY][prevX] = 1;
        this.grid[newY][newX] = 1;

        if (dx === 1) this.player.direction = "right";
        if (dx === -1) this.player.direction = "left";
        if (dy === 1) this.player.direction = "down";
        if (dy === -1) this.player.direction = "up";

        this.player.x = newX;
        this.player.y = newY;
        this.player.hasMoved = true;

        this.generateFeature();
        this.updatePlayerSprite();
        this.updatePaths();
    }

    updatePlayerSprite() {
        document.querySelectorAll('.player').forEach(playerLayer => {
            playerLayer.style.backgroundImage = '';
            playerLayer.style.transform = '';
        });

        const playerCell = document.querySelector(`.cell[data-x="${this.player.x}"][data-y="${this.player.y}"]`);
        if (playerCell) {
            const playerLayer = playerCell.querySelector('.player');
            playerLayer.style.backgroundImage = `url(${this.config.sprites.player[this.player.direction]})`;

            playerLayer.style.transform = `translateY(-${this.TILE_SIZE / 2}px)`;
        }
    }

    createPath(oldPos, newPos) {
        const oldCell = document.querySelector(`.cell[data-x="${oldPos.x}"][data-y="${oldPos.y}"]`);
        if (!oldCell) return;

        const oldFeatureLayer = oldCell.querySelector('.feature');
        oldFeatureLayer.classList.add('path');

        const deltaX = newPos.x - oldPos.x;
        const deltaY = newPos.y - oldPos.y;

        let pathType = (deltaX !== 0) ? 'horizontal' : 'vertical';
        oldFeatureLayer.style.backgroundImage = `url(${this.config.sprites.paths[pathType]})`;

        this.adjustPathType(oldPos);
        this.adjustAdjacentPathTypes(oldPos);
        this.scheduleUpdate();
    }

    drawPath(x, y, properties) {
        const startX = x * this.TILE_SIZE;
        const startY = y * this.TILE_SIZE;

        const ctx = this.pathCtx;
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.beginPath();

        function drawLine(x1, y1, x2, y2) {
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
        }

        const centerX = startX + this.EDGE_WIDTH;
        const centerY = startY + this.EDGE_WIDTH;

        if (properties.center.top) drawLine(centerX, centerY, centerX + this.PATH_SIZE, centerY);
        if (properties.center.bottom) drawLine(centerX, centerY + this.PATH_SIZE, centerX + this.PATH_SIZE, centerY + this.PATH_SIZE);
        if (properties.center.left) drawLine(centerX, centerY, centerX, centerY + this.PATH_SIZE);
        if (properties.center.right) drawLine(centerX + this.PATH_SIZE, centerY, centerX + this.PATH_SIZE, centerY + this.PATH_SIZE);

        for (let [edgePos, sideSet] of Object.entries(properties.edges)) {
            const { edgeX, edgeY } = this.getEdgeOrigin(edgePos, centerX, centerY);
            for (let [side, enabled] of Object.entries(sideSet)) {
                if (enabled) {
                    const coords = this.getEdgeLineCoordinates(edgePos, side, edgeX, edgeY);
                    if (coords) drawLine(...coords);
                }
            }
        }

        ctx.stroke();
    }

    getEdgeOrigin(edgePos, baseX, baseY) {
        let edgeX = baseX;
        let edgeY = baseY;

        if (edgePos === "top") edgeY -= this.EDGE_WIDTH;
        if (edgePos === "bottom") edgeY += this.PATH_SIZE;
        if (edgePos === "left") edgeX -= this.EDGE_WIDTH;
        if (edgePos === "right") edgeX += this.PATH_SIZE;

        return { edgeX, edgeY };
    }

    getEdgeLineCoordinates(edgePos, side, edgeX, edgeY) {
        if (edgePos === "top" || edgePos === "bottom") {
            switch (side) {
                case "top": return [edgeX, edgeY, edgeX + this.EDGE_LENGTH, edgeY];
                case "bottom": return [edgeX, edgeY + this.EDGE_WIDTH, edgeX + this.EDGE_LENGTH, edgeY + this.EDGE_WIDTH];
                case "left": return [edgeX, edgeY, edgeX, edgeY + this.EDGE_WIDTH];
                case "right": return [edgeX + this.EDGE_LENGTH, edgeY, edgeX + this.EDGE_LENGTH, edgeY + this.EDGE_WIDTH];
            }
        } else if (edgePos === "left" || edgePos === "right") {
            switch (side) {
                case "top": return [edgeX, edgeY, edgeX + this.EDGE_WIDTH, edgeY];
                case "bottom": return [edgeX, edgeY + this.EDGE_LENGTH, edgeX + this.EDGE_WIDTH, edgeY + this.EDGE_LENGTH];
                case "left": return [edgeX, edgeY, edgeX, edgeY + this.EDGE_LENGTH];
                case "right": return [edgeX + this.EDGE_WIDTH, edgeY, edgeX + this.EDGE_WIDTH, edgeY + this.EDGE_LENGTH];
            }
        }
        return null;
    }

    updatePaths() {
        for (let y = 0; y < this.config.mapSize; y++) {
            for (let x = 0; x < this.mapWidthInCells; x++) {
                if (this.grid[y][x] === 1) {
                    const properties = this.getTileProperties(x, y);
                    this.pathGrid[y][x] = properties;

                    this.pathCtx.clearRect(x * this.TILE_SIZE, y * this.TILE_SIZE, this.TILE_SIZE, this.TILE_SIZE);

                    this.drawPath(x, y, properties);
                }
            }
        }
    }

    adjustPathType(pos) {
        const cell = document.querySelector(`.cell[data-x="${pos.x}"][data-y="${pos.y}"]`);
        if (!cell) return;

        const featureLayer = cell.querySelector('.feature');
        if (!featureLayer.classList.contains('path')) return;

        const neighbors = this.getPathNeighbors(pos);

        let newPathType = this.determinePathType(neighbors, this.player.direction);

        if (newPathType) {
            featureLayer.style.backgroundImage = `url(${this.config.sprites.paths[newPathType]})`;
            featureLayer.classList.add('path');
        }

        this.scheduleUpdate();
    }

    getTileProperties(x, y) {
        const directions = ["top", "right", "bottom", "left"];
        const orthogonal = {
            top: ["left", "right"],
            right: ["top", "bottom"],
            bottom: ["left", "right"],
            left: ["top", "bottom"],
        };
        const diagonals = [
            { key: "topLeft", main: ["top", "left"] },
            { key: "topRight", main: ["top", "right"] },
            { key: "bottomLeft", main: ["bottom", "left"] },
            { key: "bottomRight", main: ["bottom", "right"] }
        ];

        let tile = {
            center: { top: false, right: false, bottom: false, left: false },
            edges: {
                top: { top: false, right: false, bottom: false, left: false },
                right: { top: false, right: false, bottom: false, left: false },
                bottom: { top: false, right: false, bottom: false, left: false },
                left: { top: false, right: false, bottom: false, left: false }
            }
        };

        let adj = {
            top: (y > 0) && this.grid[y - 1][x] === 1,
            right: (x < this.mapWidthInCells - 1) && this.grid[y][x + 1] === 1,
            bottom: (y < this.config.mapSize - 1) && this.grid[y + 1][x] === 1,
            left: (x > 0) && this.grid[y][x - 1] === 1,
            topLeft: (y > 0 && x > 0) && this.grid[y - 1][x - 1] === 1,
            topRight: (y > 0 && x < this.mapWidthInCells - 1) && this.grid[y - 1][x + 1] === 1,
            bottomRight: (y < this.config.mapSize - 1 && x < this.mapWidthInCells - 1) && this.grid[y + 1][x + 1] === 1,
            bottomLeft: (y < this.config.mapSize - 1 && x > 0) && this.grid[y + 1][x - 1] === 1
        };

        directions.forEach(dir => {
            if (!adj[dir]) {
                tile.center[dir] = true;
            } else {
                orthogonal[dir].forEach(ortho => {
                    tile.edges[dir][ortho] = true;
                });
            }
        });

        diagonals.forEach(({ key, main }) => {
            if (adj[key] && adj[main[0]] && adj[main[1]]) {
                tile.edges[main[0]][main[1]] = false;
                tile.edges[main[1]][main[0]] = false;
            }
        });

        return tile;
    }

    determinePathType(neighbors) {
        if (neighbors.top && neighbors.bottom && neighbors.left && neighbors.right) {
            return 'intersection_4';
        }
        if (neighbors.top && neighbors.bottom && neighbors.right) return 'intersection_3_right';
        if (neighbors.top && neighbors.bottom && neighbors.left) return 'intersection_3_left';
        if (neighbors.left && neighbors.right && neighbors.top) return 'intersection_3_top';
        if (neighbors.left && neighbors.right && neighbors.bottom) return 'intersection_3_bottom';

        if (neighbors.left && neighbors.bottom) return 'corner_tr';
        if (neighbors.right && neighbors.bottom) return 'corner_tl';
        if (neighbors.left && neighbors.top) return 'corner_br';
        if (neighbors.right && neighbors.top) return 'corner_bl';

        if (neighbors.top && neighbors.bottom) return 'vertical';
        if (neighbors.left && neighbors.right) return 'horizontal';

        return 'horizontal';
    }

    adjustAdjacentPathTypes(pos) {
        const adjacentPositions = [
            { x: pos.x, y: pos.y - 1 },
            { x: pos.x, y: pos.y + 1 },
            { x: pos.x - 1, y: pos.y },
            { x: pos.x + 1, y: pos.y },
        ];

        adjacentPositions.forEach(adjPos => {
            if (adjPos.x >= 0 && adjPos.x < this.mapWidthInCells && adjPos.y >= 0 && adjPos.y < this.config.mapSize) {
                const cell = document.querySelector(`.cell[data-x="${adjPos.x}"][data-y="${adjPos.y}"]`);
                if (cell) {
                    const featureLayer = cell.querySelector('.feature');
                    if (featureLayer.classList.contains('path')) {
                        this.adjustPathType(adjPos);
                    }
                }
            }
        });

        this.scheduleUpdate();
    }

    getPathNeighbors(pos) {
        const top = this.isPath(pos.x, pos.y - 1);
        const bottom = this.isPath(pos.x, pos.y + 1);
        const left = this.isPath(pos.x - 1, pos.y);
        const right = this.isPath(pos.x + 1, pos.y);

        return { top, bottom, left, right };
    }

    growFeatures() {
        if (!this.growableCells) {
            this.growableCells = new Set();
        }

        if (this.growableCells.size === 0) {
            console.log("No growable cells.");
            return;
        }

        this.growableCells.forEach(cellKey => {
            const [x, y] = cellKey.split(',').map(Number);
            const cell = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
            if (!cell) return;

            const featureLayer = cell.querySelector('.feature');
            if (!featureLayer.style.backgroundImage) {
                const featureKeys = Object.keys(this.config.features).filter(f => this.config.features[f].growable);
                if (featureKeys.length === 0) return;

                const selectedFeature = featureKeys[Math.floor(Math.random() * featureKeys.length)];
                const sprite = this.config.sprites.features[selectedFeature][Math.floor(Math.random() * this.config.sprites.features[selectedFeature].length)];
                featureLayer.style.backgroundImage = `url(${sprite})`;

                this.markAsGrowable(x, y);
            }
        });

        this.scheduleUpdate();
    }

    generateFeature() {
        if (!this.player.hasMoved) return;

        const surroundingPositions = [
            { x: this.player.x - 1, y: this.player.y },
            { x: this.player.x + 1, y: this.player.y },
            { x: this.player.x, y: this.player.y - 1 },
            { x: this.player.x, y: this.player.y + 1 },
            { x: this.player.x - 1, y: this.player.y - 1 },
            { x: this.player.x + 1, y: this.player.y - 1 },
            { x: this.player.x - 1, y: this.player.y + 1 },
            { x: this.player.x + 1, y: this.player.y + 1 }
        ];

        surroundingPositions.forEach(pos => {
            if (pos.x >= 0 && pos.x < this.config.mapSize && pos.y >= 0 && pos.y < this.config.mapSize) {

                if (pos.x === this.player.x && pos.y === this.player.y) return;

                const cell = document.querySelector(`.cell[data-x="${pos.x}"][data-y="${pos.y}"]`);
                if (!cell) return;

                const featureLayer = cell.querySelector('.feature');

                if (featureLayer.style.backgroundImage) return;
                if (this.grid[pos.y][pos.x] === 1) return;

                if (Math.random() < this.config.spawnChance) {
                    const featureKeys = Object.keys(this.config.features);
                    if (featureKeys.length === 0) return;

                    const selectedFeature = featureKeys[Math.floor(Math.random() * featureKeys.length)];
                    const sprite = this.config.sprites.features[selectedFeature][Math.floor(Math.random() * this.config.sprites.features[selectedFeature].length)];

                    featureLayer.style.backgroundImage = `url(${sprite})`;
                    this.markAsGrowable(pos.x, pos.y);
                }
            }
        });
    }

    markAsGrowable(x, y) {
        this.growableCells.add(`${x},${y}`);
    }

    isPath(x, y) {
        const cell = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
        return cell && cell.querySelector('.feature').classList.contains('path');
    }

    scheduleUpdate() {
        if (this.updateScheduled) return;
        this.updateScheduled = true;

        requestAnimationFrame(() => {
            this.updateMap();
            this.updateScheduled = false;
        });
    }

    setupAutoGrowth() {
        setInterval(() => this.growFeatures(), this.config.growthIntervalMs || 5000);
    }

    handleInput(input) {
        switch (input) {
            case 'ArrowUp':
                this.movePlayer(0, -1);
                break;
            case 'ArrowDown':
                this.movePlayer(0, 1);
                break;
            case 'ArrowLeft':
                this.movePlayer(-1, 0);
                break;
            case 'ArrowRight':
                this.movePlayer(1, 0);
                break;
            case ' ':
                this.growFeatures();
                break;
            case 'r':
                this.createMap();
                break;
        }
    }

    static prependBaseURL(obj, baseURL) {
        if (Array.isArray(obj)) {
            return obj.map(item => (typeof item === 'string' && !item.startsWith('http')) ? baseURL + item : item);
        } else if (typeof obj === 'object' && obj !== null) {
            return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, Game.prependBaseURL(value, baseURL)]));
        } else if (typeof obj === 'string') {
            return obj.startsWith('http') ? obj : baseURL + obj;
        }
        return obj;
    }
}

const game = new Game();
window.onload = () => {
    game.loadConfig();

    document.getElementById("reset").addEventListener("click", () => {
        console.log("Reset button clicked. Restarting game...");
        game.createMap();
    });
};

window.addEventListener('resize', () => {
    game.updateMapWidth();
    game.createMap();
    game.scheduleUpdate();
});

document.addEventListener('keydown', event => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
        event.preventDefault();
        game.handleInput(event.key);
    }

});