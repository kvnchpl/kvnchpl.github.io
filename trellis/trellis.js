// Game class: Initializes the grid and the gardener and binds controls.
class Game {
    constructor(config) {
      this.config = config;
      this.grid = new Grid(config.grid);
      this.gardener = new Gardener(config.gardener, this.grid);
      this.init();
    }
  
    init() {
      // Create the game container and assign it an id for styling.
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
        // If movement occurs, mark the new cell as tended.
        if (moved) {
          this.grid.tendPlot(this.gardener.x, this.gardener.y);
        }
      });
    }
  }
  
  // Grid class: Creates the grid based on configuration and manages the state of each cell.
  class Grid {
    constructor(gridConfig) {
      this.columns = gridConfig.columns;
      this.rows = gridConfig.rows;
      this.cellSize = gridConfig.cellSize;
      this.cells = [];
    }
  
    createGrid(container) {
      // Update CSS variables to reflect the dynamic grid configuration.
      container.style.setProperty('--grid-columns', this.columns);
      container.style.setProperty('--grid-rows', this.rows);
      container.style.setProperty('--cell-size', `${this.cellSize}px`);
  
      // Create grid cells.
      for (let y = 0; y < this.rows; y++) {
        this.cells[y] = [];
        for (let x = 0; x < this.columns; x++) {
          let cell = document.createElement('div');
          cell.classList.add('cell');
          cell.dataset.x = x;
          cell.dataset.y = y;
          container.appendChild(cell);
          this.cells[y][x] = cell;
        }
      }
    }
  
    tendPlot(x, y) {
      // Mark the cell as tended by adding a CSS class.
      let cell = this.cells[y][x];
      if (cell && !cell.classList.contains('tended')) {
        cell.classList.add('tended');
      }
    }
  
    getCell(x, y) {
      if (x < 0 || x >= this.columns || y < 0 || y >= this.rows) return null;
      return this.cells[y][x];
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
      // Create the gardener element if it doesn't exist.
      if (!this.element) {
        this.element = document.createElement('div');
        this.element.classList.add('gardener');
        this.element.style.backgroundImage = `url(https://kvnchpl.github.io/trellis/sprites/${this.sprite})`;
        // Append the gardener to the game container so its positioning is relative.
        document.getElementById('trellis-game').appendChild(this.element);
      }
      // Position the gardener based on grid coordinates.
      let cellSize = this.grid.cellSize;
      this.element.style.width = `${cellSize}px`;
      this.element.style.height = `${cellSize}px`;
      this.element.style.left = `${this.x * cellSize}px`;
      this.element.style.top = `${this.y * cellSize}px`;
    }
  
    move(dx, dy) {
      let newX = this.x + dx;
      let newY = this.y + dy;
      // Check grid boundaries.
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
      // Initialize the game once the DOM is fully loaded.
      window.addEventListener('DOMContentLoaded', () => {
        new Game(config);
      });
    })
    .catch(error => {
      console.error('Error loading game configuration:', error);
    });