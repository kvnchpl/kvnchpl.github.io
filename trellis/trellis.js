// Game class: Initializes the grid and gardener and binds controls.
class Game {
    constructor(config) {
      this.config = config;
      this.grid = new Grid(config.grid, config.plots);
      this.gardener = new Gardener(config.gardener, this.grid);
      this.init();
    }
  
    init() {
      // Create the game container.
      this.gameContainer = document.createElement('div');
      this.gameContainer.id = 'trellis-game';
      document.body.appendChild(this.gameContainer);
  
      // Create grid cells.
      this.grid.createGrid(this.gameContainer);
  
      // Render the gardener at the start position.
      this.gardener.render();
  
      // Bind keyboard controls.
      this.bindControls();
    }
  
    bindControls() {
      document.addEventListener('keydown', (e) => {
        let moved = false;
        if (e.key === 'ArrowUp') {
          moved = this.gardener.move(0, -1);
        } else if (e.key === 'ArrowDown') {
          moved = this.gardener.move(0, 1);
        } else if (e.key === 'ArrowLeft') {
          moved = this.gardener.move(-1, 0);
        } else if (e.key === 'ArrowRight') {
          moved = this.gardener.move(1, 0);
        }
        // (Movement does not automatically modify the cell state.)
  
        // Map action keys.
        const actionKeys = {
          'T': 'till',
          'F': 'fertilize',
          'P': 'plant',
          'W': 'water',
          'M': 'mulch',
          'R': 'weed',
          'H': 'harvest',
          'C': 'clear'
        };
        const keyUpper = e.key.toUpperCase();
        if (actionKeys[keyUpper]) {
          this.grid.applyAction(this.gardener.x, this.gardener.y, actionKeys[keyUpper]);
        }
      });
    }
  }
  
  // Grid class: Creates the grid, manages cell states, and applies actions.
  class Grid {
    constructor(gridConfig, plotDefinitions) {
      this.columns = gridConfig.columns;
      this.rows = gridConfig.rows;
      this.cellSize = gridConfig.cellSize;
      this.plots = plotDefinitions;
      this.cells = [];
    }
  
    createGrid(container) {
      container.style.setProperty('--grid-columns', this.columns);
      container.style.setProperty('--grid-rows', this.rows);
      container.style.setProperty('--cell-size', `${this.cellSize}px`);
  
      for (let y = 0; y < this.rows; y++) {
        this.cells[y] = [];
        for (let x = 0; x < this.columns; x++) {
          let cell = document.createElement('div');
          cell.classList.add('cell');
          cell.dataset.x = x;
          cell.dataset.y = y;
          cell.dataset.state = 'empty';
          // Set default sprite.
          cell.style.backgroundImage = `url(https://kvnchpl.github.io/trellis/sprites/${this.plots['empty'].sprite})`;
          container.appendChild(cell);
          this.cells[y][x] = cell;
        }
      }
    }
  
    updateCellState(x, y, newState) {
      let cell = this.getCell(x, y);
      if (!cell) return;
      cell.dataset.state = newState;
      if (this.plots[newState] && this.plots[newState].sprite) {
        cell.style.backgroundImage = `url(https://kvnchpl.github.io/trellis/sprites/${this.plots[newState].sprite})`;
      } else {
        cell.style.backgroundImage = '';
      }
    }
  
    getCell(x, y) {
      if (x < 0 || x >= this.columns || y < 0 || y >= this.rows) return null;
      return this.cells[y][x];
    }
  
    // Apply an action to the cell at (x,y) based on its current state.
    applyAction(x, y, action) {
      let cell = this.getCell(x, y);
      if (!cell) return;
      let currentState = cell.dataset.state;
      let newState = currentState; // default is no change
  
      switch (action) {
        case 'till':
          if (currentState === 'empty' || currentState === 'harvested' || currentState === 'weedy') {
            newState = 'tilled';
          } else {
            console.log("Cannot till: Plot must be empty, harvested, or weedy.");
            return;
          }
          break;
        case 'fertilize':
          if (currentState === 'tilled') {
            newState = 'fertilized';
          } else {
            console.log("Cannot fertilize: Plot must be tilled.");
            return;
          }
          break;
        case 'plant':
          if (currentState === 'tilled' || currentState === 'fertilized' || currentState === 'mulched') {
            newState = 'planted';
          } else {
            console.log("Cannot plant: Plot must be tilled, fertilized, or mulched.");
            return;
          }
          break;
        case 'water':
          if (currentState === 'planted') {
            newState = 'harvestable';
          } else {
            console.log("Cannot water: Plot must be planted.");
            return;
          }
          break;
        case 'mulch':
          if (currentState === 'tilled' || currentState === 'fertilized') {
            newState = 'mulched';
          } else {
            console.log("Cannot mulch: Plot must be tilled or fertilized.");
            return;
          }
          break;
        case 'weed':
          if (currentState === 'weedy') {
            newState = 'tilled';
          } else {
            console.log("Cannot weed: Plot is not weedy.");
            return;
          }
          break;
        case 'harvest':
          if (currentState === 'harvestable') {
            newState = 'harvested';
          } else {
            console.log("Cannot harvest: Plot is not ready for harvest.");
            return;
          }
          break;
        case 'clear':
          if (currentState === 'planted' || currentState === 'harvestable') {
            console.log("Cannot clear: Plot is actively growing; harvest first.");
            return;
          } else {
            newState = 'empty';
          }
          break;
        default:
          console.log("Unknown action:", action);
          return;
      }
      console.log(`Action '${action}' applied at (${x}, ${y}): ${currentState} → ${newState}`);
      this.updateCellState(x, y, newState);
    }
  }
  
  // Gardener class: Handles the gardener's position, movement, and rendering.
  class Gardener {
    constructor(gardenerConfig, grid) {
      this.x = gardenerConfig.startX;
      this.y = gardenerConfig.startY;
      this.sprite = gardenerConfig.sprite;
      this.grid = grid;
      this.element = null;
    }
  
    render() {
      if (!this.element) {
        this.element = document.createElement('div');
        this.element.classList.add('gardener');
        this.element.style.backgroundImage = `url(https://kvnchpl.github.io/trellis/sprites/${this.sprite})`;
        document.getElementById('trellis-game').appendChild(this.element);
      }
      let cellSize = this.grid.cellSize;
      this.element.style.width = `${cellSize}px`;
      this.element.style.height = `${cellSize}px`;
      this.element.style.left = `${this.x * cellSize}px`;
      this.element.style.top = `${this.y * cellSize}px`;
    }
  
    move(dx, dy) {
      let newX = this.x + dx;
      let newY = this.y + dy;
      if (newX < 0 || newX >= this.grid.columns || newY < 0 || newY >= this.grid.rows) {
        return false;
      }
      this.x = newX;
      this.y = newY;
      this.render();
      return true;
    }
  }
  
  // Load configuration from trellis.json and initialize the game.
  fetch('https://kvnchpl.github.io/trellis/trellis.json')
    .then(response => response.json())
    .then(config => {
      window.addEventListener('DOMContentLoaded', () => {
        new Game(config);
      });
    })
    .catch(error => {
      console.error('Error loading game configuration:', error);
    });