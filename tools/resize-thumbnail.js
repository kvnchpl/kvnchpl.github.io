const sharp = require('sharp');
const path = require('path');

const inputPath = path.join(__dirname, 'img/projects/archipelago/thumbnail/archipelago_thumbnail.webp');
const outputPath = inputPath;

sharp(inputPath)
  .resize({ width: 400 })
  .toFile(outputPath)
  .then(() => console.log('Image resized successfully.'))
  .catch(err => console.error('Error resizing image:', err));