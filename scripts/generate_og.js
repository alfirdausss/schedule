const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generateExactOG() {
  const width = 1200;
  const height = 630;

  // Read the original logo and encode to base64
  const logoPath = path.join(__dirname, '..', 'public', 'assets', 'logo.png');
  const logoBuffer = fs.readFileSync(logoPath);
  const logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;

  const svgBanner = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="glowLeft" cx="10%" cy="0%" r="60%">
          <stop offset="0%" stop-color="#ec268f" stop-opacity="0.18" />
          <stop offset="100%" stop-color="#ec268f" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="glowRight" cx="90%" cy="40%" r="65%">
          <stop offset="0%" stop-color="#7552aa" stop-opacity="0.22" />
          <stop offset="100%" stop-color="#7552aa" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="glowLogo" cx="80%" cy="50%" r="40%">
          <stop offset="0%" stop-color="#ec268f" stop-opacity="0.15" />
          <stop offset="100%" stop-color="#ec268f" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e1e26" stop-opacity="0.95" />
          <stop offset="100%" stop-color="#15151a" stop-opacity="0.95" />
        </linearGradient>
        <filter id="logoShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#ec268f" flood-opacity="0.28" />
        </filter>
        <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="24" stdDeviation="40" flood-color="#000000" flood-opacity="0.55" />
        </filter>
      </defs>

      <!-- Background -->
      <rect width="${width}" height="${height}" fill="#101013" />
      <rect width="${width}" height="${height}" fill="url(#glowLeft)" />
      <rect width="${width}" height="${height}" fill="url(#glowRight)" />

      <!-- Inner Hero Panel Card -->
      <g filter="url(#cardShadow)">
        <rect x="50" y="45" width="1100" height="540" rx="28" fill="url(#cardGrad)" stroke="rgba(255, 255, 255, 0.1)" stroke-width="1.5" />
      </g>
      <rect x="50" y="45" width="1100" height="540" rx="28" fill="url(#glowLogo)" />

      <!-- Left Content -->
      <g transform="translate(110, 150)">
        <!-- Kicker -->
        <text x="0" y="0" font-family="'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif" font-size="20" font-weight="900" letter-spacing="3.5" fill="#ec268f" text-transform="uppercase">PRODUCTION SCHEDULING</text>

        <!-- Main Title Line 1 -->
        <text x="0" y="80" font-family="'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif" font-size="64" font-weight="900" letter-spacing="-1.5" fill="#ffffff">Jadwal Operator &amp;</text>
        
        <!-- Main Title Line 2 -->
        <text x="0" y="160" font-family="'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif" font-size="64" font-weight="900" letter-spacing="-1.5" fill="#ffffff">Rekap Penugasan</text>

        <!-- Description Line 1 -->
        <text x="0" y="235" font-family="'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif" font-size="23" font-weight="500" fill="#a0a0b0">Kelola operator, isi penugasan acara, dan ekspor rekap</text>

        <!-- Description Line 2 -->
        <text x="0" y="272" font-family="'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif" font-size="23" font-weight="500" fill="#a0a0b0">bulanan dalam satu dashboard lokal.</text>

        <!-- Badge -->
        <g transform="translate(0, 318)">
          <rect width="260" height="42" rx="21" fill="rgba(236, 38, 143, 0.15)" stroke="rgba(236, 38, 143, 0.35)" stroke-width="1.2" />
          <text x="130" y="27" font-family="'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif" font-size="16" font-weight="800" letter-spacing="2" fill="#ffffff" text-anchor="middle">ALFACOM PRODUCTION</text>
        </g>
      </g>

      <!-- Right Logo (Original exact logo) -->
      <g filter="url(#logoShadow)">
        <image href="${logoBase64}" x="740" y="115" width="370" height="400" preserveAspectRatio="xMidYMid meet" />
      </g>
    </svg>
  `;

  const outputPathPng = path.join(__dirname, '..', 'public', 'assets', 'og-image.png');
  const outputPathJpg = path.join(__dirname, '..', 'public', 'assets', 'og-image.jpg');

  await sharp(Buffer.from(svgBanner))
    .png({ quality: 100 })
    .toFile(outputPathPng);

  await sharp(Buffer.from(svgBanner))
    .jpeg({ quality: 95 })
    .toFile(outputPathJpg);

  console.log('OG Banner generated successfully at 1200x630 with original logo!');
}

generateExactOG().catch(console.error);
