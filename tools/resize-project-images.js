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
    // The filePath is now expected to be inside the 'full' folder.
    const projectDir = path.dirname(path.dirname(filePath)); // .../project/full/file

    for (const [label, width] of Object.entries(outputSizes)) {
        // Skip 'full' as it's just a copy, but still convert to .webp for consistency
        const outputDir = path.join(projectDir, label);
        await fs.ensureDir(outputDir);
        const outputPath = path.join(outputDir, `${fileName}.webp`);
        const exists = await fs.pathExists(outputPath);
        if (exists) {
            console.log(`${projectName}: ${label} version already exists — skipping`);
            continue;
        }
        try {
            let transformer = sharp(filePath);
            if (width !== null) {
                transformer = transformer.resize({ width });
            }
            await transformer
                .toFormat('webp')
                .toFile(outputPath);
            if (label === 'full' && supportedExtensions.includes(ext)) {
                await fs.remove(filePath);
            }
            console.log(`✓ ${projectName}: ${label} version saved → ${outputPath}`);
        } catch (err) {
            console.error(`✗ ${projectName}: Failed to process ${fileName}${ext} for ${label} size — ${err.message}`);
        }
    }
}

function hasExpectedSubdirs(projectPath) {
    const expected = ['full', 'medium', 'small'];
    return expected.every(folder => {
        const folderPath = path.join(projectPath, folder);
        if (!fs.existsSync(folderPath)) return false;
        const files = fs.readdirSync(folderPath);
        return files.some(f => path.extname(f).toLowerCase() === '.webp');
    });
}

async function getProjectDirs() {
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
    return projectDirs;
}

async function processFullDirImages(fullDir, projectName) {
    const filesInFullDir = fs.readdirSync(fullDir).filter(f => supportedExtensions.includes(path.extname(f).toLowerCase()));
    for (const file of filesInFullDir) {
        const fullPath = path.join(fullDir, file);
        await processImage(fullPath, projectName);
        await fs.remove(fullPath);
    }
}

async function generateThumbnail(projectPath, files) {
    const fullDir = path.join(projectPath, 'full');
    const webpFiles = (await fs.readdir(fullDir)).filter(f => path.extname(f).toLowerCase() === '.webp');
    if (webpFiles.length === 0) return;
    const thumbSrc = path.join(fullDir, webpFiles[0]);
    const thumbDst = path.join(projectPath, 'thumbnail', path.parse(webpFiles[0]).name + '.webp');
    await fs.ensureDir(path.join(projectPath, 'thumbnail'));
    await sharp(thumbSrc)
        .resize({ width: 400 })
        .toFormat('webp')
        .toFile(thumbDst);
    console.log(`✓ ${path.basename(projectPath)}: thumbnail generated → ${thumbDst}`);
}

async function run() {
    let projectDirs = await getProjectDirs();

    // Filter out .DS_Store and non-directories
    projectDirs = projectDirs.filter(({ name }) => {
        if (name === '.DS_Store') return false;
        if (includeOnly && !includeOnly.includes(name)) return false;
        if (exclude.includes(name)) return false;
        return true;
    });

    for (const { name, path: projectPath } of projectDirs) {
        if (!force && hasExpectedSubdirs(projectPath)) {
            console.log(`${name}: already structured — skipping`);
            continue;
        }

        const files = (await fs.readdir(projectPath)).filter(f => {
            const ext = path.extname(f).toLowerCase();
            return supportedExtensions.includes(ext);
        });

        const fullDir = path.join(projectPath, 'full');
        await fs.ensureDir(fullDir);

        if (
            fs.existsSync(fullDir) &&
            fs.readdirSync(fullDir).some(f => supportedExtensions.includes(path.extname(f).toLowerCase()))
        ) {
            await processFullDirImages(fullDir, name);
        } else {
            for (const file of files) {
                const srcPath = path.join(projectPath, file);
                const dstPath = path.join(fullDir, file);
                await fs.copy(srcPath, dstPath);
                await processImage(dstPath, name);
            }
        }

        await generateThumbnail(projectPath, files);
    }

    console.log('\nAll project images processed.');
}

const argv = process.argv.slice(2);
const includeOnly = argv.includes('--include') ? argv[argv.indexOf('--include') + 1].split(',') : null;
const exclude = argv.includes('--exclude') ? argv[argv.indexOf('--exclude') + 1].split(',') : [];
const force = argv.includes('--force');

run().catch(console.error);