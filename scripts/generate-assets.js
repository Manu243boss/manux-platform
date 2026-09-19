import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// ManuX Icon SVG matching the user's uploaded reference:
// A rounded square card with black background and a luminous light-yellow radial aura
// diffusing from the center outward and seamlessly blending into the black background.
const getSvg = (width, height, isSquare = true) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${width}" height="${height}">
  <defs>
    <!-- Multi-stop smooth radial diffusion matching the reference image (yellow on black) -->
    <radialGradient id="luminousSun" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1" />
      <stop offset="6%" stop-color="#FFFDE0" stop-opacity="1" />
      <stop offset="15%" stop-color="#FFF066" stop-opacity="1" />
      <stop offset="28%" stop-color="#FACC15" stop-opacity="0.95" />
      <stop offset="42%" stop-color="#F59E0B" stop-opacity="0.8" />
      <stop offset="58%" stop-color="#D97706" stop-opacity="0.55" />
      <stop offset="74%" stop-color="#78350F" stop-opacity="0.3" />
      <stop offset="88%" stop-color="#261204" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>

    <!-- Intense inner glowing core -->
    <radialGradient id="coreLight" cx="50%" cy="50%" r="30%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1" />
      <stop offset="35%" stop-color="#FEF08A" stop-opacity="0.9" />
      <stop offset="70%" stop-color="#FACC15" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#FACC15" stop-opacity="0" />
    </radialGradient>
  </defs>

  <!-- Deep Black Background Card with Squircle Rounded Corners -->
  <rect width="512" height="512" fill="#000000" rx="${isSquare ? '112' : '0'}" />

  <!-- Outer Ambient Radial Glow -->
  <circle cx="256" cy="256" r="236" fill="url(#luminousSun)" />

  <!-- Inner Bright Radiant Core -->
  <circle cx="256" cy="256" r="120" fill="url(#coreLight)" />

  <!-- Sleek Minimalist ManuX Geometric Monogram integrated at the center of the aura -->
  <g transform="translate(256, 256) scale(0.85) translate(-256, -256)">
    <!-- Elegant X Silhouette in deep dark contrast with subtle gold sheen -->
    <path d="M 180 180 L 225 180 L 332 332 L 287 332 Z" fill="#000000" fill-opacity="0.85" />
    <path d="M 332 180 L 287 180 L 180 332 L 225 332 Z" fill="#000000" fill-opacity="0.85" />
    <!-- White / Gold intersecting diamond core in center -->
    <polygon points="256,236 276,256 256,276 236,256" fill="#FFFFFF" />
  </g>
</svg>
`;

// OpenGraph / Banner (1200x630)
const getOgSvg = () => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <rect width="1200" height="630" fill="#000000" />
  
  <defs>
    <radialGradient id="ogSun" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1" />
      <stop offset="12%" stop-color="#FFF066" stop-opacity="1" />
      <stop offset="30%" stop-color="#FACC15" stop-opacity="0.9" />
      <stop offset="50%" stop-color="#F59E0B" stop-opacity="0.65" />
      <stop offset="70%" stop-color="#78350F" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
  </defs>

  <!-- Large luminous center aura -->
  <circle cx="600" cy="240" r="210" fill="url(#ogSun)" />

  <!-- Centered Icon Card -->
  <g transform="translate(520, 160)">
    <rect width="160" height="160" rx="36" fill="#000000" stroke="#27272a" stroke-width="2" />
    <circle cx="80" cy="80" r="74" fill="url(#ogSun)" />
    <!-- Center diamond -->
    <polygon points="80,68 92,80 80,92 68,80" fill="#FFFFFF" />
  </g>

  <!-- Typography -->
  <text x="600" y="440" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="54" font-weight="900" fill="#FFFFFF" letter-spacing="4">
    Manu<tspan fill="#FACC15">X</tspan>
  </text>
  <text x="600" y="490" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="600" fill="#A1A1AA" letter-spacing="1">
    Découvrez. Apprenez. Achetez vos produits Chariow.
  </text>
  <text x="600" y="540" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700" fill="#FACC15" letter-spacing="2">
    https://manux.xttools.site
  </text>
</svg>
`;

async function run() {
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // 1. Save standard SVG favicon & logo
  const svg512 = getSvg(512, 512, false);
  const svgFavicon = getSvg(512, 512, true);
  fs.writeFileSync(path.join(publicDir, 'logo.svg'), svg512);
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgFavicon);
  console.log('Created logo.svg and favicon.svg');

  // 2. Generate PNGs using sharp
  const targets = [
    { file: 'favicon.png', size: 48, isSquare: true },
    { file: 'favicon-32.png', size: 32, isSquare: true },
    { file: 'apple-touch-icon.png', size: 180, isSquare: true },
    { file: 'icon-192.png', size: 192, isSquare: true },
    { file: 'icon-512.png', size: 512, isSquare: true },
    { file: 'logo.png', size: 512, isSquare: false },
  ];

  for (const t of targets) {
    const svg = getSvg(t.size, t.size, t.isSquare);
    const dest = path.join(publicDir, t.file);
    await sharp(Buffer.from(svg))
      .resize(t.size, t.size)
      .png({ quality: 100 })
      .toFile(dest);
    console.log(`Generated ${t.file} (${t.size}x${t.size})`);
  }

  // 3. Generate OG image (1200x630)
  const ogSvg = getOgSvg();
  await sharp(Buffer.from(ogSvg))
    .resize(1200, 630)
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'og-image.png'));
  console.log('Generated og-image.png (1200x630)');

  console.log('All branding assets generated successfully!');
}

run().catch((err) => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
