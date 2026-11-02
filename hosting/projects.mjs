// Current publication policy. Migration provenance stays in the local history.
import {createRequire} from 'node:module';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import projects from './projects.json' with {type: 'json'};
const require = createRequire(import.meta.url);
const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const directories = new Set();
for (const project of projects) {
    if (!/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(project.directory) || directories.has(project.directory)
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
    const project = projects.filter(project => file === project.directory || file.startsWith(project.directory + '/'))
        .sort((a,b) => b.directory.length - a.directory.length)[0];
    if (!project) return !file.startsWith('000/') && file !== '000' || directory && projects.some(project => project.directory.startsWith(file+'/'));
    if (file === project.directory) return directory;
    const relative = file.slice(project.directory.length + 1);
    const runtime = projectRuntime(project);
    if (runtime) return directory
        ? runtime.runtimeFiles(resolve(repository, project.directory)).some(path => path.startsWith(`${relative}/`))
        : runtime.isRuntimeFile(relative);
    return project.publicPaths.some(path => path.endsWith('/') && relative.startsWith(path)
        || (directory ? path.startsWith(`${relative}/`) || path === `${relative}/` : relative === path));
}
