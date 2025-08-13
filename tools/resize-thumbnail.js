/* resize-thumbnail.js
 * This script resizes an image to a width of 400 pixels while maintaining the aspect ratio.
 * Usage: node resize-thumbnail.js <path-to-image>
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const inputArg = process.argv[2];
if (!inputArg) {
    console.error('Usage: node resize-thumbnail.js <path-to-image>');
    process.exit(1);
}

const inputPath = path.resolve(inputArg);
if (!fs.existsSync(inputPath)) {
    console.error(`File not found: ${inputPath}`);
    process.exit(1);
}

const { dir, name, ext } = path.parse(inputPath);
const outputPath = path.join(dir, `${name}_400${ext}`);

sharp(inputPath)
    .resize({ width: 400 })
    .toFile(outputPath)
    .then(() => console.log(`Image resized to 400px width: ${outputPath}`))
    .catch(err => console.error('Error resizing image:', err));