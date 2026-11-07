import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // caminhos relativos: funciona em qualquer endereço (ex.: usuario.github.io/giro/)
  base: './',
  server: { port: 5180 },
});
