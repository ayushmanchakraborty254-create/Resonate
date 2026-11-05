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
console.log('✓ Successfully synced dist/ to App/app/src/main/assets/dist/');
