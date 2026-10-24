import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Built into ../planners/, which GitHub Pages serves as bang-labs.eu/planners/.
export default defineConfig({
    plugins: [react()],
    base: '/planners/',
    // pdf-lib + fontkit are ~1.1 MB; they load only when a calendar is drawn.
    build: { outDir: '../planners', emptyOutDir: true, chunkSizeWarningLimit: 1200 },
});
