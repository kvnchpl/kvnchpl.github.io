/**
 * Usage:
 *   node tools/resize-project-images.js                    → processes all folders
 *   node tools/resize-project-images.js --include a,b,c    → include process folders a, b, c
 *   node tools/resize-project-images.js --exclude x,y      → process all except x, y
 */
const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');

const inputRoot = path.join(__dirname, '..', 'img');
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

        if (width === null) {
            const rawCopyPath = path.join(outputDir, `${fileName}${ext}`);
            await fs.move(filePath, rawCopyPath, { overwrite: true });
        } else {
            const outputPath = path.join(outputDir, `${fileName}.webp`);
            const exists = await fs.pathExists(outputPath);
            if (exists) {
                console.log(`${projectName}: ${label} version already exists — skipping`);
                continue;
            }
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
    projectDirs = projectDirs.filter((dir) => {
        if (dir === '.DS_Store') return false;
        if (includeOnly && !includeOnly.includes(dir)) return false;
        if (exclude.includes(dir)) return false;
        return true;
    });

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

const argv = process.argv.slice(2);
const includeOnly = argv.includes('--include') ? argv[argv.indexOf('--include') + 1].split(',') : null;
const exclude = argv.includes('--exclude') ? argv[argv.indexOf('--exclude') + 1].split(',') : [];

run().catch(console.error);