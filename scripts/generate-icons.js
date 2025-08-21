const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [192, 512, 180, 167, 152, 120];

const svgContent = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1D4ED8;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <rect width="512" height="512" rx="102" fill="url(#bgGradient)"/>
  
  <path d="M154 256 L218 314 L358 174" 
        stroke="white" 
        stroke-width="24" 
        stroke-linecap="round" 
        stroke-linejoin="round" 
        fill="none"/>
  
  <ellipse cx="200" cy="178" rx="58" ry="80" fill="rgba(255,255,255,0.2)" transform="rotate(-45 200 178)"/>
</svg>
`;

async function generateIcons() {
  const publicDir = path.join(__dirname, '..', 'public');
  
  for (const size of sizes) {
    try {
      await sharp(Buffer.from(svgContent))
        .resize(size, size)
        .png()
        .toFile(path.join(publicDir, `icon-${size}x${size}.png`));
      
      console.log(`Generated icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`Error generating icon-${size}x${size}.png:`, error);
    }
  }
  
  console.log('Icon generation complete!');
}

generateIcons();