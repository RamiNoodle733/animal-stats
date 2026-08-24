import { defineConfig } from 'astro/config';

export default defineConfig({
    site: 'https://animalbattlestats.com',
    srcDir: './astro/src',
    publicDir: './astro/public',
    outDir: './.cache/astro-dist',
    cacheDir: './.cache/astro-cache',
    output: 'static',
    trailingSlash: 'never',
    compressHTML: true,
    build: {
        format: 'file'
    }
});
