// Gera os ícones PNG do app (lâmpada a óleo dourada sobre verde-oliva).
// Uso: node scripts/gen-icons.mjs
import sharp from "sharp";

const lamp = `
  <g transform="translate(21 0)">
    <path transform="translate(24 12)" d="M352 150c20 35 32 55 22 78-8 18-34 22-46 8-12-14-6-36 10-54 6-8 12-18 14-32Z" fill="#F2D28B"/>
    <path d="M118 300c0-38 64-56 138-56 46 0 66 6 82 12l30-5c12-2 18 8 10 16l-30 25c-8 38-46 60-92 60-74 0-138-14-138-52Z" fill="#D9AE5A"/>
    <ellipse cx="236" cy="254" rx="30" ry="9" fill="#3F5A4A" opacity=".55"/>
    <path d="M124 288c-40-4-44 44-4 36" fill="none" stroke="#D9AE5A" stroke-width="16" stroke-linecap="round"/>
    <rect x="196" y="350" width="104" height="20" rx="10" fill="#B8892B"/>
  </g>`;

const svg = (bg) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">` +
      `<rect width="512" height="512" ${bg}/>` +
      lamp +
      `</svg>`,
  );

const rounded = svg(`rx="112" fill="#3F5A4A"`);
const square = svg(`fill="#3F5A4A"`);

await sharp(rounded).resize(192).png().toFile("public/icons/icon-192.png");
await sharp(rounded).resize(512).png().toFile("public/icons/icon-512.png");
await sharp(square).resize(512).png().toFile("public/icons/maskable-512.png");
await sharp(square).resize(180).png().toFile("public/icons/apple-touch-icon.png");
console.log("ícones gerados em public/icons");
