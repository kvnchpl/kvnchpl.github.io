/* sansui.js */
class Game {
    constructor() {
        this.mapWidthInCells = 0;
        this.growableCells = new Set();
        this.updateScheduled = false;
        this.player = { x: 0, y: 0, direction: 'down', hasMoved: false };
    }

    async loadConfig() {
        try {
            console.log("Loading configuration...");
            const response = await fetch('https://kvnchpl.github.io/sansui/sansui.json');
            this.config = await response.json();

            if (!this.config.mapSize) {
                console.error("Invalid config: missing mapSize!");
                return;
            }

            // Base URL for assets
            const baseURL = "https://kvnchpl.github.io/sansui/sprites/";
            this.config.sprites = Game.prependBaseURL(this.config.sprites, baseURL);

            console.log("Config successfully loaded:", this.config);
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
        this.setupAutoGrowth();
    }

    updateMapWidth() {
        this.mapWidthInCells = Math.max(1, Math.min(Math.floor(window.innerWidth / this.config.cellSize), this.config.mapSize));
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

        map.style.gridTemplateColumns = `repeat(${this.mapWidthInCells}, ${this.config.cellSize}px)`;
        this.placePlayerRandomly();
        this.scheduleUpdate();
        this.player.hasMoved = false;
    }

    updateMap() {
        document.querySelectorAll('.cell').forEach(cell => {
            const playerLayer = cell.querySelector('.player');
            playerLayer.style.backgroundImage = '';
            if (parseInt(cell.dataset.x) === playerPosition.x && parseInt(cell.dataset.y) === playerPosition.y) {
                playerLayer.style.backgroundImage = `url(${config.sprites.player[playerDirection]})`;
            }
        });
    
        // **Ensure features generate as expected**
        if (playerHasMoved) {
            generateFeature();
        }
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
        const newX = this.player.x + dx;
        const newY = this.player.y + dy;
        this.player.direction = dx === 1 ? 'right' : dx === -1 ? 'left' : dy === 1 ? 'down' : 'up';

        if (newX >= 0 && newX < this.mapWidthInCells && newY >= 0 && newY < this.config.mapSize) {
            this.player.x = newX;
            this.player.y = newY;
            this.player.hasMoved = true;

            this.markAsGrowable(newX, newY);
        }
        this.scheduleUpdate();
    }

    createPath(oldPos, newPos) {
        const oldCell = document.querySelector(`.cell[data-x="${oldPos.x}"][data-y="${oldPos.y}"]`);
        if (!oldCell) return;
    
        const oldFeatureLayer = oldCell.querySelector('.feature');
        oldFeatureLayer.classList.add('path'); // Mark it as a path
    
        const deltaX = newPos.x - oldPos.x;
        const deltaY = newPos.y - oldPos.y;
    
        // **Determine initial path type based on movement direction**
        let pathType = (deltaX !== 0) ? 'horizontal' : 'vertical';
    
        // **Apply the initial path immediately before checking neighbors**
        oldFeatureLayer.style.backgroundImage = `url(${config.sprites.paths[pathType]})`;
    
        // **Now adjust surrounding paths**
        adjustPathType(oldPos);
        adjustAdjacentPathTypes(oldPos);
    }

    adjustPathType(pos) {
        const cell = document.querySelector(`.cell[data-x="${pos.x}"][data-y="${pos.y}"]`);
        if (!cell) return;
    
        const featureLayer = cell.querySelector('.feature');
        if (!featureLayer.classList.contains('path')) return;
    
        // **Check current path type**
        const currentPathType = featureLayer.style.backgroundImage.split('/').pop().replace('.png', '');
    
        // Get adjacent paths
        const adjacentPaths = {
            top: isPath(pos.x, pos.y - 1),
            bottom: isPath(pos.x, pos.y + 1),
            left: isPath(pos.x - 1, pos.y),
            right: isPath(pos.x + 1, pos.y),
        };
    
        let newPathType = null;
    
        // **Only update if the path is incomplete**
        if (currentPathType === 'vertical' || currentPathType === 'horizontal') {
            return; // Keep it as is if it's already correct
        }
    
        if (adjacentPaths.top && adjacentPaths.bottom && adjacentPaths.left && adjacentPaths.right) {
            newPathType = 'intersection_4';
        } else if (adjacentPaths.top && adjacentPaths.bottom && adjacentPaths.left) {
            newPathType = 'intersection_3_left';
        } else if (adjacentPaths.top && adjacentPaths.bottom && adjacentPaths.right) {
            newPathType = 'intersection_3_right';
        } else if (adjacentPaths.top && adjacentPaths.left && adjacentPaths.right) {
            newPathType = 'intersection_3_top';
        } else if (adjacentPaths.bottom && adjacentPaths.left && adjacentPaths.right) {
            newPathType = 'intersection_3_bottom';
        } else if (adjacentPaths.top && adjacentPaths.left) {
            newPathType = 'corner_br';
        } else if (adjacentPaths.top && adjacentPaths.right) {
            newPathType = 'corner_bl';
        } else if (adjacentPaths.bottom && adjacentPaths.left) {
            newPathType = 'corner_tr';
        } else if (adjacentPaths.bottom && adjacentPaths.right) {
            newPathType = 'corner_tl';
        } else if (adjacentPaths.left && adjacentPaths.right) {
            newPathType = 'horizontal';
        } else if (adjacentPaths.top && adjacentPaths.bottom) {
            newPathType = 'vertical';
        }
    
        if (newPathType) {
            featureLayer.style.backgroundImage = `url(${config.sprites.paths[newPathType]})`;
            featureLayer.classList.add('path');
        }
    }

    determinePathType(neighbors, firstMoveDirection = null) {
        // **Check if no adjacent paths exist (isolated tile)**
        const hasAdjacentPaths = neighbors.top || neighbors.bottom || neighbors.left || neighbors.right;
    
        if (!hasAdjacentPaths) {
            if (firstMoveDirection) {
                return firstMoveDirection; // Use the explicitly passed firstMoveDirection
            }
            return 'horizontal';  // Default to horizontal only if no movement direction is known
        }
    
        // Full 4-way intersection
        if (neighbors.top && neighbors.bottom && neighbors.left && neighbors.right) {
            return 'intersection_4';
        }
    
        // 3-way intersections
        if (neighbors.top && neighbors.bottom && neighbors.right) return 'intersection_3_right';
        if (neighbors.top && neighbors.bottom && neighbors.left) return 'intersection_3_left';
        if (neighbors.left && neighbors.right && neighbors.top) return 'intersection_3_top';
        if (neighbors.left && neighbors.right && neighbors.bottom) return 'intersection_3_bottom';
    
        // Turns (corners)
        if (neighbors.left && neighbors.bottom) return 'corner_tr';
        if (neighbors.right && neighbors.bottom) return 'corner_tl';
        if (neighbors.left && neighbors.top) return 'corner_br';
        if (neighbors.right && neighbors.top) return 'corner_bl';
    
        // Straight paths
        if (neighbors.top && neighbors.bottom) return 'vertical';
        if (neighbors.left && neighbors.right) return 'horizontal';
    
        // Default case (should never reach this point)
        return 'horizontal';
    }

    adjustAdjacentPathTypes(pos) {
        const adjacentPositions = [
            { x: pos.x, y: pos.y - 1 }, // Top
            { x: pos.x, y: pos.y + 1 }, // Bottom
            { x: pos.x - 1, y: pos.y }, // Left
            { x: pos.x + 1, y: pos.y }, // Right
            { x: pos.x - 1, y: pos.y - 1 }, // Top-left
            { x: pos.x + 1, y: pos.y - 1 }, // Top-right
            { x: pos.x - 1, y: pos.y + 1 }, // Bottom-left
            { x: pos.x + 1, y: pos.y + 1 }  // Bottom-right
        ];
    
        adjacentPositions.forEach(adjPos => {
            if (adjPos.x >= 0 && adjPos.x < mapWidthInCells && adjPos.y >= 0 && adjPos.y < config.mapSize) {
                const cell = document.querySelector(`.cell[data-x="${adjPos.x}"][data-y="${adjPos.y}"]`);
                if (cell) {
                    const featureLayer = cell.querySelector('.feature');
                    if (featureLayer.classList.contains('path')) {
                        adjustPathType(adjPos);
                    }
                }
            }
        });
    }

    getPathNeighbors(pos) {
        return {
            top: isPath(pos.x, pos.y - 1),
            bottom: isPath(pos.x, pos.y + 1),
            left: isPath(pos.x - 1, pos.y),
            right: isPath(pos.x + 1, pos.y),
            topLeft: isPath(pos.x - 1, pos.y - 1),
            topRight: isPath(pos.x + 1, pos.y - 1),
            bottomLeft: isPath(pos.x - 1, pos.y + 1),
            bottomRight: isPath(pos.x + 1, pos.y + 1)
        };
    }

    growFeatures() {
        if (this.growableCells.size === 0) return;

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
        if (!playerHasMoved) return; // Prevent feature generation before movement
    
        const surroundingPositions = [
            { x: playerPosition.x - 1, y: playerPosition.y },
            { x: playerPosition.x + 1, y: playerPosition.y },
            { x: playerPosition.x, y: playerPosition.y - 1 },
            { x: playerPosition.x, y: playerPosition.y + 1 },
            { x: playerPosition.x - 1, y: playerPosition.y - 1 },
            { x: playerPosition.x + 1, y: playerPosition.y - 1 },
            { x: playerPosition.x - 1, y: playerPosition.y + 1 },
            { x: playerPosition.x + 1, y: playerPosition.y + 1 }
        ];
    
        surroundingPositions.forEach(pos => {
            if (pos.x >= 0 && pos.x < config.mapSize && pos.y >= 0 && pos.y < config.mapSize) {
                // **Skip feature generation if the tile is the player's position**
                if (pos.x === playerPosition.x && pos.y === playerPosition.y) return;
    
                const cell = document.querySelector(`.cell[data-x="${pos.x}"][data-y="${pos.y}"]`);
                if (!cell) return;
    
                const featureLayer = cell.querySelector('.feature');
    
                // **Only add a feature if the cell is empty**
                if (!featureLayer.style.backgroundImage && Math.random() < config.spawnChance) {
                    const featureKeys = Object.keys(config.features);
                    const selectedFeature = featureKeys[Math.floor(Math.random() * featureKeys.length)];
                    const sprite = config.sprites.features[selectedFeature][Math.floor(Math.random() * config.sprites.features[selectedFeature].length)];
                    featureLayer.style.backgroundImage = `url(${sprite})`;
    
                    // **Mark the tile as growable for future growth**
                    markAsGrowable(pos.x, pos.y);
                }
            }
        });
    }

    markAsGrowable(x, y) {
        this.growableCells.add(`${x},${y}`);
    }

    isPath(x, y) {
        const cell = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"`);
        return cell && cell.querySelector('.feature').classList.contains('path');
    }

    scheduleUpdate() {
        if (!this.updateScheduled) {
            this.updateScheduled = true;
            requestAnimationFrame(() => {
                this.updateMap();
                this.updateScheduled = false;
            });
        }
    }

    setupAutoGrowth() {
        setInterval(() => this.growFeatures(), this.config.growthIntervalMs || 5000);
    }

    handleInput(input) {
        const actions = {
            'ArrowUp': () => this.movePlayer(0, -1),
            'ArrowDown': () => this.movePlayer(0, 1),
            'ArrowLeft': () => this.movePlayer(-1, 0),
            'ArrowRight': () => this.movePlayer(1, 0),
            ' ': () => this.growFeatures(),
            'reset': () => this.createMap()
        };
        if (actions[input]) actions[input]();
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

// Initialize game
const game = new Game();

// Ensure config loads on page load
window.onload = () => game.loadConfig();

// Ensure game updates when the window is resized
window.addEventListener('resize', () => {
    game.updateMapWidth();
    game.createMap(); // Rebuild the map to reflect new dimensions
});

// Prevent scrolling when using arrow keys or spacebar
document.addEventListener('keydown', event => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
        event.preventDefault();
    }
    game.handleInput(event.key);
});