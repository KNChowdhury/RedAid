// Regenerates every logo/icon file from the one master mark,
// public/brand/rbb-icon.svg (red drop + green hands, transparent).
//
//   node scripts/generate-brand-assets.js
//   npx capacitor-assets generate --android   # then fan out Android sizes
//
// The master was traced from the AI-generated PNG approved on 2026-10-03.
// Edit the master, never the derived files below; rerun this to update them.
import fs from 'node:fs';
import sharp from 'sharp';

const MASTER = 'public/brand/rbb-icon.svg';
const DARK_BG = '#0F172A'; // slate-900, the app's dark surface

const master = fs.readFileSync(MASTER, 'utf8');
const viewBox = master.match(/viewBox="([^"]+)"/)[1];
const paths = master.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim();

// The mark scaled into a box at (x, y) of the given size, inside a parent SVG.
const mark = (x, y, size) =>
  `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="${viewBox}">${paths}</svg>`;

const svgDoc = (size, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">\n${body}\n</svg>\n`;

const write = (file, contents) => {
  fs.writeFileSync(file, contents);
  console.log('wrote', file);
};

const png = async (svg, size, file) => {
  await sharp(Buffer.from(svg), { density: 300 }).resize(size, size).png().toFile(file);
  console.log('wrote', file);
};

// Navbar/footer/auth-modal badge: white card with a soft rose edge so it
// still reads as a distinct tile on the white navbar.
const logoMark = svgDoc(64,
  `<rect x="1" y="1" width="62" height="62" rx="13" fill="#FFFFFF" stroke="#FECDD3" stroke-width="2"/>\n${mark(7, 7, 50)}`);
write('public/logo-mark.svg', logoMark);

// Browser tab icon: white tile (visible on dark tab strips), mark as large
// as possible because tabs render it at 16px.
const favicon = svgDoc(64, `<rect width="64" height="64" rx="14" fill="#FFFFFF"/>\n${mark(4, 4, 56)}`);
write('public/favicon.svg', favicon);

// iOS home screen (iOS rounds the corners itself; it needs a full-bleed PNG).
await png(svgDoc(180, `<rect width="180" height="180" fill="#FFFFFF"/>\n${mark(22, 22, 136)}`), 180, 'public/apple-touch-icon.png');

// Web notification icon (full colour) and badge (Android only uses its alpha,
// so the transparent mark becomes a clean silhouette in the status bar).
await png(svgDoc(192, `<rect width="192" height="192" fill="#FFFFFF"/>\n${mark(20, 20, 152)}`), 192, 'public/icon-192.png');
await png(svgDoc(96, mark(4, 4, 88)), 96, 'public/notification-badge.png');

// Android adaptive icon: the launcher masks a 108-unit canvas to whatever
// shape it likes and only guarantees the central 66 units, so keep the mark
// inside that safe zone on a white background.
const foreground = svgDoc(108, mark(25, 25, 58));
write('resources/icon-foreground.svg', foreground);
await png(foreground, 1024, 'resources/icon-foreground.png');
await png(svgDoc(108, '<rect width="108" height="108" fill="#FFFFFF"/>'), 1024, 'resources/icon-background.png');
// Legacy (pre-adaptive) launcher icon.
await png(svgDoc(108, `<rect width="108" height="108" rx="24" fill="#FFFFFF"/>\n${mark(16, 16, 76)}`), 1024, 'resources/icon.png');

// Splash screens. On the dark one the green hands would sink into slate-900,
// so the mark sits on the same white card used in the navbar.
await png(svgDoc(2732, `<rect width="2732" height="2732" fill="#FFFFFF"/>\n${mark(1066, 1066, 600)}`), 2732, 'resources/splash.png');
await png(svgDoc(2732,
  `<rect width="2732" height="2732" fill="${DARK_BG}"/>\n<rect x="986" y="986" width="760" height="760" rx="160" fill="#FFFFFF"/>\n${mark(1066, 1066, 600)}`),
  2732, 'resources/splash-dark.png');
