/* sansui.js */
const mapSize = 10;
const cellSize = 48;
const spawnChance = 0.05; // 5% probability of spawning a feature near the player
const growthChance = 0.1; // 10% probability of a feature growing into an adjacent cell
const features = ['gravel', 'water', 'grass', 'bush', 'tree', 'shrine'];
const growableFeatures = ['gravel', 'water', 'grass', 'bush', 'tree'];
const featureSprites = {
    gravel: ['https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/cd1fed9a-2071-4af7-bd22-90d91cf018ea/gravel_1.png', 'https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/06df6843-e283-424a-85cd-e7ff8c74ce69/gravel_2.png', 'https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/6a204c94-d3c0-4916-8939-4e70739e17f9/gravel_3.png'],
    water: ['https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/0490314a-f294-40a2-a016-d7b824140924/water_1.png', 'https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/ac856cf0-1a8a-46f0-a853-9c1998a546d7/water_2.png', 'https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/f755ab97-b7d9-4824-a6dd-7c75c3e095b3/water_3.png'],
    grass: ['https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/9b142648-31a4-4a46-b560-e77da69ec049/grass_1.png', 'https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/689cdcc8-6196-4004-bdc8-e8cecb1506f9/grass_2.png', 'https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/14c5f8b0-269d-4aec-a69f-af583db175a3/grass_3.png'],
    bush: ['https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/0179dded-98ee-4d49-8428-154cb0fd78d7/bush_1.png', 'https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/096c6cfc-775a-4ae3-ac88-3bc75e7999c7/bush_2.png', 'https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/733f75e9-52b7-4000-85d5-c294d815c51c/bush_3.png'],
    tree: ['https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/ad9293a6-abc3-464b-a256-a353ad8be692/tree_1.png', 'https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/26426eb5-2dc7-4098-9e5c-f8bffe910adb/tree_2.png', 'https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/fea100a5-18a0-402a-a191-aeb2f9b1e1a9/tree_3.png'],
    shrine: ['https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/da658a86-43bc-4888-b11e-72516bc10a2e/shrine_1.png', 'https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/0f82bfae-deaf-4346-ae53-6e211a811d48/shrine_2.png', 'https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/5e158b2a-a26e-4824-aa4f-eee13aeaa3f8/shrine_3.png'],
    path: {
        vertical: 'https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/edbdfeba-5285-41bc-a5ec-7ad7ef287baa/path_vertical.png',
        horizontal: 'https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/620138b1-5d89-47ab-a688-0df3cedf1168/path_horizontal.png',
        corner_tl: 'https://images.squarespace-cdn.com/content/v1/628015bf3b43106df0cb51c5/d82de8f3-3d8f-4ec9-9a2e-784487f894ad/path_corner_tl.png',
        corner_tr: 'https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/ab3207ba-2999-41d5-9cf6-e57256933f50/path_corner_tr.png',
        corner_bl: 'https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/153bd7b9-b94d-4234-bfb2-bdbcd1352c1e/path_corner_bl.png',
        corner_br: 'https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/6c4537d8-c22a-4d70-9549-17143af337e7/path_corner_br.png',
        invertedcorner_tl: 'https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/b6ea37be-df97-4436-8991-8bbe7fbb5ee1/path_invertedcorner_tl.png',
        invertedcorner_tr: 'https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/2b5ee11e-7de5-411c-a6f3-aefa88c42f6b/path_invertedcorner_tr.png',
        invertedcorner_bl: 'https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/8fd70900-7303-4e27-aa5d-7ce25e39dd01/path_invertedcorner_bl.png',
        invertedcorner_br: 'https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/4190efea-0698-4afe-99e6-e85a406ddb8e/path_invertedcorner_br.png',
        intersection_3_top: 'https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/0725ad01-1e8b-42c1-aa30-d50c05392d81/path_intersection_3_top.png',
        intersection_3_right: 'https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/b53233e0-976a-4963-8ca9-e42edc785bf4/path_intersection_3_right.png',
        intersection_3_bottom: 'https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/9428b9ee-7273-49bb-a263-b25182489e4c/path_intersection_3_bottom.png',
        intersection_3_left: 'https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/0a01deca-44a5-458c-ab24-9aba3115810b/path_intersection_3_left.png',
        intersection_4: 'https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/5bb73491-f176-4890-ab50-69f9603e6d8e/path_intersection_4.png',
        open: 'https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/1f30f257-275e-4128-9e1b-4deade7c92c8/path_open.png'
    }
};
const playerSprites = {
    up: 'https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/63ef6305-112a-4572-9761-a1fe75ec9803/player_up.png',
    down: 'https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/e9597bab-98ea-48da-aa37-1fc0b88711d5/player_down.png',
    left: 'https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/0ec480d0-8190-4dab-859f-e73d5c5b15e1/player_left.png',
    right: 'https://images.squarespace-cdn.com/content/628015bf3b43106df0cb51c5/803cba2c-a023-44f1-9a60-003db705573d/player_right.png'
};

let playerPosition = { x: 0, y: 0 };
let playerDirection = 'down';
let playerHasMoved = false;

// Initialize the grid and place the player randomly at an edge position
function createMap() {
    const map = document.getElementById('map');
    map.innerHTML = '';

    // Determine the width of the map based on screen size
    const mapWidthInCells = Math.min((Math.floor(window.innerWidth / cellSize)) - 1, mapSize);

    for (let y = 0; y < mapSize; y++) {
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
    map.style.gridTemplateColumns = `repeat(${mapWidthInCells}, ${cellSize}px)`;

    placePlayerRandomly(mapWidthInCells);
    updateMap(mapWidthInCells);

    playerHasMoved = false; // Reset playerHasMoved to false when creating the map
}

// Choose a random edge position for the player to start
function placePlayerRandomly(mapWidthInCells) {
    const edgePositions = [];
    for (let i = 0; i < mapWidthInCells; i++) {
        edgePositions.push({ x: i, y: 0 }, { x: i, y: mapSize - 1 });
    }
    for (let i = 0; i < mapSize; i++) {
        edgePositions.push({ x: 0, y: i }, { x: mapWidthInCells - 1, y: i });
    }

    const randomPosition = edgePositions[Math.floor(Math.random() * edgePositions.length)];
    playerPosition = { x: randomPosition.x, y: randomPosition.y };
    playerDirection = 'down'; // Always start facing down
    updateMap(mapWidthInCells);
}

// Update the grid, placing the player sprite in the correct position
function updateMap(mapWidthInCells) {
    document.querySelectorAll('.cell').forEach(cell => {
        const playerLayer = cell.querySelector('.player');
        playerLayer.style.backgroundImage = '';
        if (parseInt(cell.dataset.x) === playerPosition.x && parseInt(cell.dataset.y) === playerPosition.y) {
            playerLayer.style.backgroundImage = `url(${playerSprites[playerDirection]})`;
        }
    });

    if (playerHasMoved) {
        generateFeature(mapWidthInCells);
    }
}

// Move the player in the specified direction, update the direction, and create a path
function movePlayer(x, y) {
    const mapWidthInCells = Math.min(Math.floor(window.innerWidth / cellSize), mapSize);
    const newX = playerPosition.x + x;
    const newY = playerPosition.y + y;

    // Always update the player's direction based on the key pressed
    playerDirection = x === 1 ? 'right' : x === -1 ? 'left' : y === 1 ? 'down' : 'up';

    // Check if the new position is within bounds
    if (newX >= 0 && newX < mapWidthInCells && newY >= 0 && newY < mapSize) {
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
        if (adjPos.x >= 0 && adjPos.x < mapSize && adjPos.y >= 0 && adjPos.y < mapSize) {
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
        if (pos.x >= 0 && pos.x < mapSize && pos.y >= 0 && pos.y < mapSize) {
            const cell = document.querySelector(`.cell[data-x="${pos.x}"][data-y="${pos.y}"]`);
            const featureLayer = cell.querySelector('.feature');

            // Generate a feature with a probability defined by spawnChance if the cell doesn't already have a feature
            if (Math.random() < spawnChance && !featureLayer.style.backgroundImage) {
                const feature = features[Math.floor(Math.random() * features.length)];
                const sprite = featureSprites[feature][Math.floor(Math.random() * featureSprites[feature].length)];
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
                if (adjPos.x >= 0 && adjPos.x < mapSize && adjPos.y >= 0 && adjPos.y < mapSize) {
                    const adjacentCell = document.querySelector(`.cell[data-x="${adjPos.x}"][data-y="${adjPos.y}"]`);
                    const adjacentFeatureLayer = adjacentCell.querySelector('.feature');
                    const isPlayerHere = playerPosition.x === adjPos.x && playerPosition.y === adjPos.y;

                    if (adjacentFeatureLayer.style.backgroundImage === '' && !isPlayerHere && Math.random() < growthChance) {
                        const featureType = growableFeatures.find(feature => featureLayer.style.backgroundImage.includes(feature));
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

// Call growFeatures every 5 seconds
setInterval(growFeatures, 5000);

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

document.getElementById('up').addEventListener('click', () => movePlayer(0, -1));
document.getElementById('down').addEventListener('click', () => movePlayer(0, 1));
document.getElementById('left').addEventListener('click', () => movePlayer(-1, 0));
document.getElementById('right').addEventListener('click', () => movePlayer(1, 0));

document.getElementById('reset').addEventListener('click', createMap);

// Initialize the map when the page loads
createMap();