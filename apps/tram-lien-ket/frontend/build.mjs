import { mkdir, copyFile, writeFile } from 'node:fs/promises';

const base = process.env.API_BASE_URL;
if (!base) throw new Error('Set API_BASE_URL to the Render backend URL.');
const api = new URL(base);
if (!['http:', 'https:'].includes(api.protocol) || api.username || api.password || api.pathname !== '/' || api.search || api.hash) {
  throw new Error('API_BASE_URL must contain only an HTTP(S) origin.');
}
await mkdir('dist', { recursive: true });
for (const file of ['index.html', 'style.css', 'app.js']) await copyFile(file, 'dist/' + file);
await writeFile('dist/config.js', 'export const API_BASE = ' + JSON.stringify(api.origin) + ';\n');
