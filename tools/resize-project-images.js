/**
 * Usage:
 *   node tools/resize-project-images.js                                → process all folders
 *   node tools/resize-project-images.js --include project1,project2    → include process folders project1 and project2
 *   node tools/resize-project-images.js --exclude project1,project2    → process all except project1 and project2
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
            const outputPath = path.join(outputDir, `${fileName}.webp`);
            const exists = await fs.pathExists(outputPath);
            if (exists) {
                console.log(`${projectName}: full version already exists — skipping`);
                continue;
            }
            try {
                await sharp(filePath)
                    .toFormat('webp')
                    .toFile(outputPath);
                console.log(`✓ ${projectName}: full version saved → ${outputPath}`);
            } catch (err) {
                console.error(`✗ ${projectName}: Failed to process ${fileName}${ext} for full size — ${err.message}`);
            }
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
    const categoryDirs = await fs.readdir(inputRoot);
    let projectDirs = [];

    for (const category of categoryDirs) {
        const categoryPath = path.join(inputRoot, category);
        const stats = await fs.stat(categoryPath);
        if (!stats.isDirectory()) continue;

        const subDirs = await fs.readdir(categoryPath);
        for (const sub of subDirs) {
            const fullPath = path.join(categoryPath, sub);
            const subStats = await fs.stat(fullPath);
            if (subStats.isDirectory()) {
                projectDirs.push({ name: sub, path: fullPath });
            }
        }
    }
    // Filter out .DS_Store and non-directories
    projectDirs = projectDirs.filter(({ name }) => {
        if (name === '.DS_Store') return false;
        if (includeOnly && !includeOnly.includes(name)) return false;
        if (exclude.includes(name)) return false;
        return true;
    });

    for (const { name, path: projectPath } of projectDirs) {
        const files = await fs.readdir(projectPath);
        for (const file of files) {
            const fullPath = path.join(projectPath, file);
            const fileStats = await fs.stat(fullPath);
            if (fileStats.isFile()) {
                await processImage(fullPath, name);
            }
        }
    }

    console.log('\nAll project images processed.');
}

const argv = process.argv.slice(2);
const includeOnly = argv.includes('--include') ? argv[argv.indexOf('--include') + 1].split(',') : null;
const exclude = argv.includes('--exclude') ? argv[argv.indexOf('--exclude') + 1].split(',') : [];

run().catch(console.error);