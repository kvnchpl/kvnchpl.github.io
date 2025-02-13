/* sansui.js */
let config = {};

let playerPosition = { x: 0, y: 0 };
let playerDirection = 'down';
let playerHasMoved = false;

async function loadConfig() {
    try {
        const response = await fetch('https://kvnchpl.github.io/sansui/sansui.json');
        config = await response.json();

        // Convert sprite paths to full URLs
        const baseURL = "https://kvnchpl.github.io/sansui/sprites/";
        for (let feature in config.featureSprites) {
            if (Array.isArray(config.featureSprites[feature])) {
                config.featureSprites[feature] = config.featureSprites[feature].map(img => baseURL + img);
            } else {
                for (let pathType in config.featureSprites[feature]) {
                    config.featureSprites[feature][pathType] = baseURL + config.featureSprites[feature][pathType];
                }
            }
        }
        for (let direction in config.playerSprites) {
            config.playerSprites[direction] = baseURL + config.playerSprites[direction];
        }

        initGame();
    } catch (error) {
        console.error("Failed to load config:", error);
    }
}

async function initGame() {
    await loadConfig(); // Wait until config is fully loaded
    console.log("Config successfully loaded:", config);
    createMap();
    setupAutoGrowth();
    setupKeyboardControls();
    setupButtonControls();
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

// Call loadConfig on page load
loadConfig();

// Initialize the grid and place the player randomly at an edge position
function createMap() {
    const map = document.getElementById('map');
    map.innerHTML = '';

    // Determine the width of the map based on screen size
    const mapWidthInCells = Math.min((Math.floor(window.innerWidth / config.cellSize)) - 1, config.mapSize);

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
    updateMap(mapWidthInCells);

    playerHasMoved = false; // Reset playerHasMoved to false when creating the map
}

// Choose a random edge position for the player to start
function placePlayerRandomly() {
    // Ensure correct map width
    const mapWidthInCells = Math.max(1, Math.min(Math.floor(window.innerWidth / config.cellSize), config.mapSize));

    // Ensure config.mapSize is valid
    if (!config.mapSize || config.mapSize <= 0) {
        console.error("Invalid map size detected:", config.mapSize);
        return;
    }

    const edgePositions = [];

    // Populate valid edge positions
    for (let i = 0; i < mapWidthInCells; i++) {
        edgePositions.push({ x: i, y: 0 }, { x: i, y: config.mapSize - 1 });
    }
    for (let i = 0; i < config.mapSize; i++) {
        edgePositions.push({ x: 0, y: i }, { x: mapWidthInCells - 1, y: i });
    }

    // Debugging: Log Edge Positions Count
    console.log(`mapWidthInCells: ${mapWidthInCells}, config.mapSize: ${config.mapSize}, edgePositions count: ${edgePositions.length}`);

    if (edgePositions.length === 0) {
        console.error("Edge positions array is empty. Player cannot be placed.");
        return;
    }

    // Select a random valid edge position
    const randomIndex = Math.floor(Math.random() * edgePositions.length);
    playerPosition = edgePositions[randomIndex] || { x: 0, y: 0 }; // Fallback to (0,0)

    playerDirection = 'down'; // Default starting direction
    console.log(`Player placed at (${playerPosition.x}, ${playerPosition.y})`);

    updateMap(mapWidthInCells);
}

// Update the grid, placing the player sprite in the correct position
function updateMap(mapWidthInCells) {
    document.querySelectorAll('.cell').forEach(cell => {
        const playerLayer = cell.querySelector('.player');
        playerLayer.style.backgroundImage = '';
        if (parseInt(cell.dataset.x) === playerPosition.x && parseInt(cell.dataset.y) === playerPosition.y) {
            playerLayer.style.backgroundImage = `url(${config.playerSprites[playerDirection]})`;
        }
    });

    if (playerHasMoved) {
        generateFeature(mapWidthInCells);
    }
}

// Move the player in the specified direction, update the direction, and create a path
function movePlayer(x, y) {
    const mapWidthInCells = Math.min(Math.floor(window.innerWidth / config.cellSize), config.mapSize);
    const newX = playerPosition.x + x;
    const newY = playerPosition.y + y;

    // Always update the player's direction based on the key pressed
    playerDirection = x === 1 ? 'right' : x === -1 ? 'left' : y === 1 ? 'down' : 'up';

    // Check if the new position is within bounds
    if (newX >= 0 && newX < mapWidthInCells && newY >= 0 && newY < config.mapSize) {
        const targetCell = document.querySelector(`.cell[data-x="${newX}"][data-y="${newY}"]`);
        const targetFeatureLayer = targetCell.querySelector('.feature');

        // Only move the player if the target cell does not have a non-path feature
        if (!targetFeatureLayer.style.backgroundImage || targetFeatureLayer.classList.contains('path')) {
            createPath(playerPosition, { x: newX, y: newY });
            playerPosition = { x: newX, y: newY };
            playerHasMoved = true;
        }
    }

    updateMap(mapWidthInCells); // Update the map regardless of whether the player moved
}

// Create a path as the player moves, selecting the appropriate path shape based on adjacent cells
function createPath(oldPos, newPos) {
    const oldCell = document.querySelector(`.cell[data-x="${oldPos.x}"][data-y="${oldPos.y}"]`);
    const oldFeatureLayer = oldCell.querySelector('.feature');

    const deltaX = newPos.x - oldPos.x;
    const deltaY = newPos.y - oldPos.y;

    // Determine the path type for the old cell based on the movement direction
    let pathType;
    if (deltaX === 1 || deltaX === -1) {
        pathType = 'horizontal';
    } else if (deltaY === 1 || deltaY === -1) {
        pathType = 'vertical';
    }

    // Set the correct path type for the old cell
    oldFeatureLayer.style.backgroundImage = `url(${featureSprites.path[pathType]})`;
    oldFeatureLayer.classList.add('path');

    // Adjust path types for the old cell immediately after the player leaves
    adjustPathType(oldPos);

    // Move the player to the new position
    playerPosition = newPos;
    updateMap();

    // Adjust path types for the new position and all adjacent cells
    adjustPathType(newPos);
    adjustAdjacentPathTypes(oldPos);
    adjustAdjacentPathTypes(newPos);
}

function adjustPathType(pos) {
    const cell = document.querySelector(`.cell[data-x="${pos.x}"][data-y="${pos.y}"]`);
    const featureLayer = cell.querySelector('.feature');
    const adjacentPaths = {
        top: isPath(pos.x, pos.y - 1),
        bottom: isPath(pos.x, pos.y + 1),
        left: isPath(pos.x - 1, pos.y),
        right: isPath(pos.x + 1, pos.y),
    };

    let pathType;

    if (adjacentPaths.top && adjacentPaths.bottom && adjacentPaths.left && adjacentPaths.right) {
        pathType = 'intersection_4';
    } else if (adjacentPaths.top && adjacentPaths.bottom && adjacentPaths.left) {
        pathType = 'intersection_3_left';
    } else if (adjacentPaths.top && adjacentPaths.bottom && adjacentPaths.right) {
        pathType = 'intersection_3_right';
    } else if (adjacentPaths.top && adjacentPaths.left && adjacentPaths.right) {
        pathType = 'intersection_3_top';
    } else if (adjacentPaths.bottom && adjacentPaths.left && adjacentPaths.right) {
        pathType = 'intersection_3_bottom';
    } else if (adjacentPaths.top && adjacentPaths.left) {
        pathType = 'corner_br';
    } else if (adjacentPaths.top && adjacentPaths.right) {
        pathType = 'corner_bl';
    } else if (adjacentPaths.bottom && adjacentPaths.left) {
        pathType = 'corner_tr';
    } else if (adjacentPaths.bottom && adjacentPaths.right) {
        pathType = 'corner_tl';
    } else if (adjacentPaths.left && adjacentPaths.right) {
        pathType = 'horizontal';
    } else if (adjacentPaths.top && adjacentPaths.bottom) {
        pathType = 'vertical';
    }
    if (pathType) {
        featureLayer.style.backgroundImage = `url(${featureSprites.path[pathType]})`;
        featureLayer.classList.add('path');
        console.log(`Adjusted path at (${pos.x}, ${pos.y}) to ${pathType}`);
    }
}

function adjustAdjacentPathTypes(pos) {
    const adjacentPositions = [
        { x: pos.x, y: pos.y - 1 },
        { x: pos.x, y: pos.y + 1 },
        { x: pos.x - 1, y: pos.y },
        { x: pos.x + 1, y: pos.y }
    ];
    adjacentPositions.forEach(adjPos => {
        if (adjPos.x >= 0 && adjPos.x < config.mapSize && adjPos.y >= 0 && adjPos.y < config.mapSize) {
            const cell = document.querySelector(`.cell[data-x="${adjPos.x}"][data-y="${adjPos.y}"]`);
            const featureLayer = cell.querySelector('.feature');
            if (featureLayer.classList.contains('path')) {
                adjustPathType(adjPos);
            }
        }
    });
}

function isPath(x, y) {
    const cell = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"`);
    return cell && cell.querySelector('.feature').classList.contains('path');
}

// Randomly generates features in adjacent cells with a probability defined by spawnChance
function generateFeature() {
    if (!playerHasMoved) return;
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
        // Check if the position is within bounds
        if (pos.x >= 0 && pos.x < config.mapSize && pos.y >= 0 && pos.y < config.mapSize) {
            const cell = document.querySelector(`.cell[data-x="${pos.x}"][data-y="${pos.y}"]`);
            const featureLayer = cell.querySelector('.feature');

            // Generate a feature with a probability defined by spawnChance if the cell doesn't already have a feature
            if (Math.random() < config.spawnChance && !featureLayer.style.backgroundImage) {
                const feature = config.features[Math.floor(Math.random() * config.features.length)];
                const sprite = config.featureSprites[feature][Math.floor(Math.random() * config.featureSprites[feature].length)];
                featureLayer.style.backgroundImage = `url(${sprite})`;
            }
        }
    });
}

function growFeatures() {
    document.querySelectorAll('.cell').forEach(cell => {
        const featureLayer = cell.querySelector('.feature');
        const hasFeature = featureLayer.style.backgroundImage !== '';
        if (hasFeature) {
            const pos = {
                x: parseInt(cell.dataset.x),
                y: parseInt(cell.dataset.y)
            };

            const adjacentPositions = [
                { x: pos.x, y: pos.y - 1 },
                { x: pos.x, y: pos.y + 1 },
                { x: pos.x - 1, y: pos.y },
                { x: pos.x + 1, y: pos.y }
            ];

            adjacentPositions.forEach(adjPos => {
                if (adjPos.x >= 0 && adjPos.x < config.mapSize && adjPos.y >= 0 && adjPos.y < config.mapSize) {
                    const adjacentCell = document.querySelector(`.cell[data-x="${adjPos.x}"][data-y="${adjPos.y}"]`);
                    const adjacentFeatureLayer = adjacentCell.querySelector('.feature');
                    const isPlayerHere = playerPosition.x === adjPos.x && playerPosition.y === adjPos.y;

                    if (adjacentFeatureLayer.style.backgroundImage === '' && !isPlayerHere && Math.random() < config.growthChance) {
                        const featureType = config.growableFeatures.find(feature => featureLayer.style.backgroundImage.includes(feature));
                        if (featureType) {
                            const sprite = featureSprites[featureType][Math.floor(Math.random() * featureSprites[featureType].length)];
                            adjacentFeatureLayer.style.backgroundImage = `url(${sprite})`;
                        }
                    }
                }
            });
        }
    });
}

function setupAutoGrowth() {
    setInterval(growFeatures, 5000);
}

function setupKeyboardControls() {
    document.addEventListener('keydown', event => {
        const keyMap = {
            'ArrowUp': () => movePlayer(0, -1),
            'ArrowDown': () => movePlayer(0, 1),
            'ArrowLeft': () => movePlayer(-1, 0),
            'ArrowRight': () => movePlayer(1, 0),
            ' ': growFeatures // Spacebar triggers growFeatures
        };
        if (keyMap[event.key]) keyMap[event.key]();
    });
}

function setupButtonControls() {
    document.getElementById('up').addEventListener('click', () => movePlayer(0, -1));
    document.getElementById('down').addEventListener('click', () => movePlayer(0, 1));
    document.getElementById('left').addEventListener('click', () => movePlayer(-1, 0));
    document.getElementById('right').addEventListener('click', () => movePlayer(1, 0));
    document.getElementById('reset').addEventListener('click', createMap);
}