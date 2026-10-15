const paletteResets = new WeakMap();

// Each screen owns its colors; toggles add or remove only that color's rectangle.
export function initColorPalette(composition) {
    if (paletteResets.has(composition)) return paletteResets.get(composition);
    const swatches = [...composition.querySelectorAll('[data-color]')];
    const rectangleLayer = composition.querySelector('[data-color-artifacts]');
    rectangleLayer.removeAttribute('aria-hidden');
    rectangleLayer.setAttribute('role', 'group');
    rectangleLayer.setAttribute('aria-label', 'color rectangles');
    const selectedColors = new Set(swatches.filter((button) => button.getAttribute('aria-pressed') === 'true').map((button) => button.dataset.color));
    const rectangles = new Map();
    if (!selectedColors.size) selectedColors.add(swatches[0].dataset.color);
    const random = (min, max) => min + Math.random() * (max - min);
    function moveRectangle(rectangle) {
        // Sample both sides on the same pixel scale so wide screens don't
        // turn most rectangles into landscapes. Closed dialogs use the viewport.
        const layerWidth = rectangleLayer.clientWidth || window.innerWidth;
        const layerHeight = rectangleLayer.clientHeight || window.innerHeight;
        const scale = Math.min(layerWidth, layerHeight);
        Object.assign(rectangle.style, {
            width: `${random(8, 30) * scale / layerWidth}%`,
            height: `${random(8, 30) * scale / layerHeight}%`
        });
        Object.assign(rectangle.style, {
            left: `${random(0, 100 - parseFloat(rectangle.style.width))}%`,
            top: `${random(18, 86 - parseFloat(rectangle.style.height))}%`
        });
    }
    function addRectangle(color) {
        const rectangle = document.createElement('button');
        rectangle.type = 'button';
        rectangle.className = 'color-rectangle';
        const closeMarker = document.createElement('span');
        closeMarker.className = 'rectangle-close';
        closeMarker.textContent = 'x';
        closeMarker.setAttribute('aria-hidden', 'true');
        rectangle.addEventListener('click', (event) => {
            if (event.detail > 0) rectangle.blur();
            toggleColor(color);
            if (event.detail === 0 && !selectedColors.has(color)) swatches.find((button) => button.dataset.color === color).focus();
        });
        rectangle.append(closeMarker);
        rectangle.style.background = color;
        moveRectangle(rectangle);
        rectangles.set(color, rectangle);
        rectangleLayer.append(rectangle);
    }
    function updateSwatches() {
        swatches.forEach((button) => {
            const color = button.dataset.color;
            button.setAttribute('aria-pressed', String(selectedColors.has(color)));
            rectangles.get(color)?.setAttribute('aria-label', `${selectedColors.size === 1 ? 'reposition' : 'close'} ${button.getAttribute('aria-label')} rectangle`);
        });
    }
    function regenerate() {
        rectangleLayer.replaceChildren();
        rectangles.clear();
        selectedColors.forEach(addRectangle);
        updateSwatches();
    }
    function toggleColor(color) {
        if (selectedColors.has(color)) {
            if (selectedColors.size === 1) {
                moveRectangle(rectangles.get(color));
                return;
            }
            selectedColors.delete(color);
            rectangles.get(color).remove();
            rectangles.delete(color);
        } else {
            selectedColors.add(color);
            addRectangle(color);
        }
        updateSwatches();
    }
    swatches.forEach((button) => button.addEventListener('click', () => toggleColor(button.dataset.color)));
    regenerate();
    const reset = function () {
        selectedColors.clear();
        selectedColors.add('#0000ff');
        regenerate();
    };
    paletteResets.set(composition, reset);
    return reset;
}

document.querySelectorAll("[data-color-composition]").forEach(initColorPalette);
