// Publica a pasta dist/ no ramo gh-pages (GitHub Pages).
// Uso: npm run deploy
import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';

const run = (cmd, cwd) => execSync(cmd, { stdio: 'inherit', cwd });
const remote = execSync('git remote get-url origin').toString().trim();

run('npm test');
run('npm run build');
if (!existsSync('dist/index.html')) throw new Error('Build não gerou dist/index.html');

rmSync('dist/.git', { recursive: true, force: true });
run('git init -q -b gh-pages', 'dist');
run('git add -A', 'dist');
run(`git commit -q -m "Publicar ${new Date().toISOString().slice(0, 16).replace('T', ' ')}"`, 'dist');
run(`git push -f -q "${remote}" gh-pages`, 'dist');
rmSync('dist/.git', { recursive: true, force: true });
console.log('\nPublicado. Em 1 a 2 minutos a nova versão aparece no endereço do Giro.');
