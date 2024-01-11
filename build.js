import rimraf from 'rimraf';
import { mkdir } from 'node:fs/promises';
import { build } from 'esbuild';

const isDevelopment = process.argv.includes('--dev');

rimraf('dist', async () => { //rimraf was being a meanie to me
    await mkdir('dist');

    await build({
        platform: 'browser',
        sourcemap: true,
        minify: !isDevelopment,
        entryPoints: {
            client: './src/Client/entry.js',
            worker: './src/Worker/entry.js',
            bootstrapper: './src/Bootstrapper/Bootstrapper.js',
        },
        bundle: true,
        logLevel: 'info',
        outdir: 'dist/',
    });
});