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
if (fs.existsSync(path.join(distDir, 'logo.png'))) {
  fs.copyFileSync(path.join(distDir, 'logo.png'), path.join(assetsRoot, 'logo.png'));
}
if (fs.existsSync(path.join(distDir, 'favicon.png'))) {
  fs.copyFileSync(path.join(distDir, 'favicon.png'), path.join(assetsRoot, 'favicon.png'));
}
console.log('✓ Successfully synced dist/ to App/app/src/main/assets/dist/');

