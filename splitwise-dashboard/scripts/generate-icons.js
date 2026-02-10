import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir } from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '../public/icons');

// Icon sizes needed for PWA
const sizes = [72, 96, 128, 144, 152, 167, 180, 192, 384, 512];

// SVG source for the icon
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#10b981"/>
      <stop offset="100%" style="stop-color:#0d9488"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="108" fill="url(#bgGrad)"/>
  <circle cx="200" cy="256" r="100" fill="none" stroke="white" stroke-width="36" stroke-opacity="0.95"/>
  <circle cx="312" cy="256" r="100" fill="none" stroke="white" stroke-width="36" stroke-opacity="0.95"/>
  <ellipse cx="256" cy="256" rx="24" ry="80" fill="white" opacity="0.9"/>
</svg>`;

// Maskable icon with more padding (safe zone)
const svgMaskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#10b981"/>
      <stop offset="100%" style="stop-color:#0d9488"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bgGrad)"/>
  <circle cx="210" cy="256" r="70" fill="none" stroke="white" stroke-width="26" stroke-opacity="0.95"/>
  <circle cx="302" cy="256" r="70" fill="none" stroke="white" stroke-width="26" stroke-opacity="0.95"/>
  <ellipse cx="256" cy="256" rx="17" ry="56" fill="white" opacity="0.9"/>
</svg>`;

// Apple touch icon (with some padding)
const svgApple = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#10b981"/>
      <stop offset="100%" style="stop-color:#0d9488"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bgGrad)"/>
  <circle cx="205" cy="256" r="85" fill="none" stroke="white" stroke-width="30" stroke-opacity="0.95"/>
  <circle cx="307" cy="256" r="85" fill="none" stroke="white" stroke-width="30" stroke-opacity="0.95"/>
  <ellipse cx="256" cy="256" rx="20" ry="68" fill="white" opacity="0.9"/>
</svg>`;

// Shortcut icons
const svgShortcutAdd = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <rect width="96" height="96" rx="20" fill="#10b981"/>
  <path d="M48 24v48M24 48h48" stroke="white" stroke-width="8" stroke-linecap="round"/>
</svg>`;

const svgShortcutBalance = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <rect width="96" height="96" rx="20" fill="#6366f1"/>
  <circle cx="48" cy="40" r="16" fill="none" stroke="white" stroke-width="6"/>
  <path d="M24 72c0-13.3 10.7-24 24-24s24 10.7 24 24" fill="none" stroke="white" stroke-width="6" stroke-linecap="round"/>
</svg>`;

async function generateIcons() {
  console.log('Generating PWA icons...');
  
  // Ensure icons directory exists
  await mkdir(iconsDir, { recursive: true });
  
  // Generate regular icons
  for (const size of sizes) {
    await sharp(Buffer.from(svgIcon))
      .resize(size, size)
      .png()
      .toFile(join(iconsDir, `icon-${size}.png`));
    console.log(`  ✓ icon-${size}.png`);
  }
  
  // Generate maskable icons
  for (const size of [192, 512]) {
    await sharp(Buffer.from(svgMaskable))
      .resize(size, size)
      .png()
      .toFile(join(iconsDir, `icon-maskable-${size}.png`));
    console.log(`  ✓ icon-maskable-${size}.png`);
  }
  
  // Generate Apple touch icon
  await sharp(Buffer.from(svgApple))
    .resize(180, 180)
    .png()
    .toFile(join(iconsDir, 'apple-touch-icon.png'));
  console.log('  ✓ apple-touch-icon.png');
  
  // Generate shortcut icons
  await sharp(Buffer.from(svgShortcutAdd))
    .resize(96, 96)
    .png()
    .toFile(join(iconsDir, 'shortcut-add.png'));
  console.log('  ✓ shortcut-add.png');
  
  await sharp(Buffer.from(svgShortcutBalance))
    .resize(96, 96)
    .png()
    .toFile(join(iconsDir, 'shortcut-balance.png'));
  console.log('  ✓ shortcut-balance.png');
  
  // Generate splash screens (simplified - just the icon centered)
  const splashSizes = [
    { w: 1170, h: 2532, name: 'splash-1170x2532.png' },
    { w: 1284, h: 2778, name: 'splash-1284x2778.png' },
  ];
  
  for (const splash of splashSizes) {
    const iconSize = Math.min(splash.w, splash.h) * 0.3;
    await sharp(Buffer.from(svgIcon))
      .resize(Math.round(iconSize), Math.round(iconSize))
      .extend({
        top: Math.round((splash.h - iconSize) / 2),
        bottom: Math.round((splash.h - iconSize) / 2),
        left: Math.round((splash.w - iconSize) / 2),
        right: Math.round((splash.w - iconSize) / 2),
        background: { r: 7, g: 6, b: 5, alpha: 1 }
      })
      .png()
      .toFile(join(iconsDir, splash.name));
    console.log(`  ✓ ${splash.name}`);
  }
  
  console.log('\\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
