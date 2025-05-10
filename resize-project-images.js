const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');

const inputRoot = './assets/images/projects';
const outputSizes = {
  small: 600,
  medium: 1280,
  full: null, // just copies original
};

const supportedExtensions = ['.png', '.jpg', '.jpeg'];

async function processImage(filePath, projectName) {
  const ext = path.extname(filePath).toLowerCase();
  if (!supportedExtensions.includes(ext)) return;

  const fileName = path.basename(filePath, ext);
  const inputDir = path.dirname(filePath);

  for (const [label, width] of Object.entries(outputSizes)) {
    const outputDir = path.join(inputDir, label);
    await fs.ensureDir(outputDir);

    const outputPath = path.join(outputDir, `${fileName}.webp`);
    if (width === null) {
      // Copy original file as-is into 'full'
      const rawCopyPath = path.join(outputDir, `${fileName}${ext}`);
      await fs.copyFile(filePath, rawCopyPath);
    } else {
      try {
        await sharp(filePath)
          .resize({ width })
          .toFormat('webp')
          .toFile(outputPath);
        console.log(`✓ ${projectName}: ${label} version saved → ${outputPath}`);
      } catch (err) {
        console.error(`✗ ${projectName}: Failed to process ${fileName}${ext} for ${label} size — ${err.message}`);
      }
    }
  }
}

async function run() {
  let projectDirs = await fs.readdir(inputRoot);
  // Filter out .DS_Store and non-directories
  projectDirs = projectDirs.filter((dir) => dir !== '.DS_Store');

  for (const project of projectDirs) {
    const projectPath = path.join(inputRoot, project);
    const stats = await fs.stat(projectPath);
    if (!stats.isDirectory()) continue;

    const files = await fs.readdir(projectPath);

    for (const file of files) {
      const fullPath = path.join(projectPath, file);
      const fileStats = await fs.stat(fullPath);
      if (fileStats.isFile()) {
        await processImage(fullPath, project);
      }
    }
  }

  console.log('\nAll project images processed.');
}

run().catch(console.error);