/* sansui.js */
let config = {};
let mapWidthInCells;
let growableCells = new Set();
let updateScheduled = false;

let playerPosition = {
    x: 0,
    y: 0
};
let playerDirection = 'down';
let playerHasMoved = false;

async function loadConfig() {
    try {
        console.log("Loading configuration...");
        const response = await fetch('https://kvnchpl.github.io/sansui/sansui.json');
        config = await response.json();

        if (!config.mapSize) {
            console.error("Invalid config: missing mapSize!");
            return;
        }

        // Base URL for assets
        const baseURL = "https://kvnchpl.github.io/sansui/sprites/";

        // Apply URL transformation to all sprites in the config
        config.sprites = prependBaseURL(config.sprites, baseURL);

        console.log("Config successfully loaded:", config);

        // Initialize game after loading config
        initGame();
    } catch (error) {
        console.error("Failed to load config:", error);
    }
}

async function initGame() {
    console.log("Initializing game...");

    if (Object.keys(config).length === 0) {
        console.error("Config is empty! Ensure loadConfig() runs before initGame().");
        return;
    }

    updateMapWidth();
    createMap();
    setupAutoGrowth();
}

function handleKeyDown(event) {
    const keyMap = {
        'ArrowUp': () => movePlayer(0, -1),
        'ArrowDown': () => movePlayer(0, 1),
        'ArrowLeft': () => movePlayer(-1, 0),
        'ArrowRight': () => movePlayer(1, 0),
        ' ': growFeatures // Spacebar triggers growth
    };
    if (keyMap[event.key]) keyMap[event.key]();
}

// Initialize the grid and place the player randomly at an edge position
function createMap() {
    const map = document.getElementById('map');
    map.innerHTML = '';

    for (let y = 0; y < config.mapSize; y++) {
        for (let x = 0; x < mapWidthInCells; x++) {
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

    // Adjust the CSS grid template columns based on the calculated width
    map.style.gridTemplateColumns = `repeat(${mapWidthInCells}, ${config.cellSize}px)`;

    placePlayerRandomly(mapWidthInCells);
    scheduleUpdate();

    playerHasMoved = false; // Reset playerHasMoved to false when creating the map
}

// Choose a random edge position for the player to start
function placePlayerRandomly() {
    // Ensure config.mapSize is valid
    if (!config.mapSize || config.mapSize <= 0) {
        console.error("Invalid map size detected:", config.mapSize);
        return;
    }

    const edgePositions = [];

    // Populate valid edge positions
    for (let i = 0; i < mapWidthInCells; i++) {
        edgePositions.push({
            x: i,
            y: 0
        }, {
            x: i,
            y: config.mapSize - 1
        });
    }
    for (let i = 0; i < config.mapSize; i++) {
        edgePositions.push({
            x: 0,
            y: i
        }, {
            x: mapWidthInCells - 1,
            y: i
        });
    }

    if (edgePositions.length === 0) {
        console.error("Edge positions array is empty. Player cannot be placed.");
        return;
    }

    // Select a random valid edge position
    const randomIndex = Math.floor(Math.random() * edgePositions.length);
    playerPosition = edgePositions[randomIndex] || {
        x: 0,
        y: 0
    }; // Fallback to (0,0)

    playerDirection = 'down'; // Default starting direction
    console.log(`Player placed at (${playerPosition.x}, ${playerPosition.y})`);

    scheduleUpdate();
}

// Update the grid, placing the player sprite in the correct position
function updateMap() {
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

// Move the player in the specified direction, update the direction, and create a path
function movePlayer(x, y) {
    const newX = playerPosition.x + x;
    const newY = playerPosition.y + y;

    playerDirection = x === 1 ? 'right' : x === -1 ? 'left' : y === 1 ? 'down' : 'up';

    if (newX >= 0 && newX < mapWidthInCells && newY >= 0 && newY < config.mapSize) {
        const targetCell = document.querySelector(`.cell[data-x="${newX}"][data-y="${newY}"]`);
        const targetFeatureLayer = targetCell.querySelector('.feature');

        if (!targetFeatureLayer.style.backgroundImage || targetFeatureLayer.classList.contains('path')) {
            createPath(playerPosition, { x: newX, y: newY });

            // Move the player
            playerPosition = { x: newX, y: newY };
            playerHasMoved = true;

            // **Mark new tile as growable**
            markAsGrowable(newX, newY);

            // Adjust path types
            adjustPathType(playerPosition);
            adjustAdjacentPathTypes(playerPosition);
        }
    }

    scheduleUpdate();
}

// Create a path as the player moves, selecting the appropriate path shape based on adjacent cells
function createPath(oldPos, newPos) {
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

function adjustPathType(pos) {
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
        console.log(`Adjusted path at (${pos.x}, ${pos.y}) to ${newPathType}`);
    }
}

function determinePathType(neighbors, firstMoveDirection = null) {
    // **Check if no adjacent paths exist (isolated tile)**
    const hasAdjacentPaths = neighbors.top || neighbors.bottom || neighbors.left || neighbors.right;

    if (!hasAdjacentPaths) {
        if (firstMoveDirection) {
            return firstMoveDirection; // Use the explicitly passed firstMoveDirection
        }
        console.warn("Isolated path detected but no movement direction provided. Defaulting to horizontal.");
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
    console.warn("No path type determined for:", neighbors);
    return 'horizontal';
}

function adjustAdjacentPathTypes(pos) {
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

function getPathNeighbors(pos) {
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

function isPath(x, y) {
    const cell = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"`);
    return cell && cell.querySelector('.feature').classList.contains('path');
}

function markAsGrowable(x, y) {
    growableCells.add(`${x},${y}`);
}

function generateFeature() {
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

function growFeatures() {
    if (growableCells.size === 0) return;

    const cellsToProcess = Array.from(growableCells);
    growableCells.clear(); // Prevent infinite growth loops

    cellsToProcess.forEach(cellKey => {
        const [x, y] = cellKey.split(',').map(Number);
        const cell = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
        if (!cell) return;

        const featureLayer = cell.querySelector('.feature');
        const hasFeature = featureLayer.style.backgroundImage !== '';

        if (hasFeature) {
            const adjacentPositions = [
                { x: x, y: y - 1 },
                { x: x, y: y + 1 },
                { x: x - 1, y: y },
                { x: x + 1, y: y }
            ];

            adjacentPositions.forEach(pos => {
                if (pos.x >= 0 && pos.x < config.mapSize && pos.y >= 0 && pos.y < config.mapSize) {
                    const adjacentCell = document.querySelector(`.cell[data-x="${pos.x}"][data-y="${pos.y}"]`);
                    const adjacentFeatureLayer = adjacentCell.querySelector('.feature');

                    if (!adjacentFeatureLayer.style.backgroundImage && Math.random() < config.growthChance) {
                        const featureKeys = Object.keys(config.features);
                        const selectedFeature = featureKeys[Math.floor(Math.random() * featureKeys.length)];
                        const sprite = config.sprites.features[selectedFeature][Math.floor(Math.random() * config.sprites.features[selectedFeature].length)];

                        adjacentFeatureLayer.style.backgroundImage = `url(${sprite})`;
                        markAsGrowable(pos.x, pos.y);
                    }
                }
            });
        }
    });
}

function setupAutoGrowth() {
    setInterval(growFeatures, 5000);
}

function prependBaseURL(obj, baseURL) {
    if (Array.isArray(obj)) {
        // If it's an array, apply URL transformation to each element
        return obj.map(item => (typeof item === 'string' && item && !item.startsWith('http') && !item.startsWith('/')) ? baseURL + item : item);
    } else if (typeof obj === 'object' && obj !== null) {
        // If it's an object, recursively process all properties
        return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [key, prependBaseURL(value, baseURL)])
        );
    } else if (typeof obj === 'string') {
        // If it's a single string, apply the base URL if needed
        return (obj && !obj.startsWith('http') && !obj.startsWith('/')) ? baseURL + obj : obj;
    }
    return obj; // Return other types unchanged
}

function scheduleUpdate() {
    if (!updateScheduled) {
        updateScheduled = true;
        requestAnimationFrame(() => {
            updateMap(mapWidthInCells);
            updateScheduled = false;
        });
    }
}

function updateMapWidth() {
    mapWidthInCells = Math.max(1, Math.min(Math.floor(window.innerWidth / config.cellSize), config.mapSize));
}

window.addEventListener('resize', updateMapWidth); // Update when window resizes

function handleInput(input) {
    const actions = {
        'ArrowUp': () => movePlayer(0, -1),
        'ArrowDown': () => movePlayer(0, 1),
        'ArrowLeft': () => movePlayer(-1, 0),
        'ArrowRight': () => movePlayer(1, 0),
        ' ': () => {
            console.log("Forcing feature growth...");
            growFeatures();
        }, // Ensure spacebar triggers immediate growth
        'up': () => movePlayer(0, -1),
        'down': () => movePlayer(0, 1),
        'left': () => movePlayer(-1, 0),
        'right': () => movePlayer(1, 0),
        'reset': createMap
    };
    if (actions[input]) actions[input]();
}

// Ensure spacebar triggers `growFeatures()` when pressed
document.addEventListener('keydown', event => {
    if (event.key === ' ') {
        event.preventDefault(); // Prevents scrolling when spacebar is pressed
    }
    handleInput(event.key);
});

window.onload = loadConfig;