import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');
const targetDir = path.resolve('App/app/src/main/assets/dist');

if (!fs.existsSync(distDir)) {
  console.error('dist/ does not exist. Please run npm run build first.');
  process.exit(1);
}

fs.mkdirSync(targetDir, { recursive: true });
fs.cpSync(distDir, targetDir, { recursive: true });

// Also ensure root-level assets are available at App/app/src/main/assets/
const assetsRoot = path.resolve('App/app/src/main/assets');
const rootFiles = ['logo.png', 'favicon.png', 'favicon.ico', 'favicon.svg', 'icon-192.png', 'icon-512.png'];
for (const file of rootFiles) {
  const src = path.join(distDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(assetsRoot, file));
  }
}

console.log('✓ Successfully synced dist/ to App/app/src/main/assets/dist/');
