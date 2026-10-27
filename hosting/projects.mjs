// Current publication policy. Migration provenance stays in the local history.
import {createRequire} from 'node:module';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import projects from './projects.json' with {type: 'json'};
const require = createRequire(import.meta.url);
const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const directories = new Set();
for (const project of projects) {
    if (!/^[a-z0-9-]+$/.test(project.directory) || directories.has(project.directory)
        || !['listed', 'unlisted', 'linked'].includes(project.visibility) || project.entry !== 'index.html'
        || Boolean(project.publicPaths) === Boolean(project.runtimeModule)) throw new Error('Invalid project publication policy');
    directories.add(project.directory);
    const paths = project.publicPaths || [project.runtimeModule];
    if (!paths.every(path => typeof path === 'string' && /^[a-zA-Z0-9_./-]+$/.test(path) && !path.startsWith('/') && !path.split('/').includes('..'))) throw new Error('Unsafe project publication path');
    if (project.runtimeModule && !project.runtimeModule.startsWith(`${project.directory}/scripts/`)) throw new Error('Runtime module must belong to its project');
}
export {projects};
export function projectRuntime(project) {
    return project.runtimeModule ? require(resolve(repository, project.runtimeModule)) : null;
}
export function isProjectPath(file, {directory = false} = {}) {
    const [name, ...parts] = file.split('/');
    const project = projects.find(project => project.directory === name);
    if (!project) return true; // The caller owns the portfolio's root allowlist.
    if (!parts.length) return directory;
    const relative = parts.join('/');
    const runtime = projectRuntime(project);
    if (runtime) return directory
        ? runtime.runtimeFiles(resolve(repository, name)).some(path => path.startsWith(`${relative}/`))
        : runtime.isRuntimeFile(relative);
    return project.publicPaths.some(path => path.endsWith('/') && relative.startsWith(path)
        || (directory ? path.startsWith(`${relative}/`) || path === `${relative}/` : relative === path));
}
