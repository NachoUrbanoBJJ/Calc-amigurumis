// ---------------------------------------------------------------------------
// Genera los iconos de la PWA (PNG + SVG) sin dependencias externas.
// Uso:  npm run icons
// ---------------------------------------------------------------------------
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "..", "public");
mkdirSync(OUT, { recursive: true });

// Paleta (igual que la app)
const BG = [168, 67, 77]; // #a8434d (lana teñida)
const BALL = [255, 250, 241]; // #fffaf1 (papel)
const STRAND = [246, 221, 216]; // #f6ddd8
const ANGLES = [Math.PI / 6, Math.PI / 2, (5 * Math.PI) / 6];

// ---------------------------------------------------------------------------
// Dibujo
// ---------------------------------------------------------------------------
function sample(px, py, S, maskable) {
    const cx = S / 2;
    const cy = S / 2;
    const radio = S * (maskable ? 0.3 : 0.32);
    const esquina = S * 0.22;

    if (!maskable) {
        const nx = Math.min(px, S - px);
        const ny = Math.min(py, S - py);
        const dentro =
            nx >= esquina || ny >= esquina ? true : (esquina - nx) ** 2 + (esquina - ny) ** 2 <= esquina * esquina;
        if (px < 0 || py < 0 || px > S || py > S || !dentro) return [0, 0, 0, 0];
    }

    const dx = px - cx;
    const dy = py - cy;
    if (Math.hypot(dx, dy) > radio) return [...BG, 255];

    const grosor = S * 0.018;
    for (const a of ANGLES) {
        const d = Math.abs(dx * Math.sin(a) - dy * Math.cos(a));
        if (d <= grosor) return [...STRAND, 255];
    }
    return [...BALL, 255];
}

function render(S, maskable) {
    const SS = 3; // supersampling
    const buf = Buffer.alloc(S * S * 4);
    for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
            let r = 0;
            let g = 0;
            let b = 0;
            let a = 0;
            for (let sy = 0; sy < SS; sy++) {
                for (let sx = 0; sx < SS; sx++) {
                    const [sr, sg, sb, sa] = sample(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS, S, maskable);
                    r += sr * sa;
                    g += sg * sa;
                    b += sb * sa;
                    a += sa;
                }
            }
            const n = SS * SS;
            const idx = (y * S + x) * 4;
            if (a === 0) continue;
            buf[idx] = Math.round(r / a);
            buf[idx + 1] = Math.round(g / a);
            buf[idx + 2] = Math.round(b / a);
            buf[idx + 3] = Math.round(a / n);
        }
    }
    return buf;
}

// ---------------------------------------------------------------------------
// Codificación PNG
// ---------------------------------------------------------------------------
const crcTabla = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c >>> 0;
    }
    return t;
})();

function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = crcTabla[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const tipo = Buffer.from(type, "ascii");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([tipo, data])), 0);
    return Buffer.concat([len, tipo, data, crc]);
}

function encodePng(S, rgba) {
    const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(S, 0);
    ihdr.writeUInt32BE(S, 4);
    ihdr[8] = 8; // bits por canal
    ihdr[9] = 6; // RGBA
    const stride = S * 4;
    const raw = Buffer.alloc((stride + 1) * S);
    for (let y = 0; y < S; y++) {
        raw[y * (stride + 1)] = 0; // filtro "none"
        rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
    }
    return Buffer.concat([
        sig,
        chunk("IHDR", ihdr),
        chunk("IDAT", deflateSync(raw, { level: 9 })),
        chunk("IEND", Buffer.alloc(0)),
    ]);
}

// ---------------------------------------------------------------------------
// SVG (mismo diseño, escalable)
// ---------------------------------------------------------------------------
function makeSvg() {
    const S = 512;
    const c = S / 2;
    const rb = 150;
    const L = 200;
    const lineas = ANGLES.map((a) => {
        const dx = Math.cos(a) * L;
        const dy = Math.sin(a) * L;
        return `<line x1="${(c - dx).toFixed(1)}" y1="${(c - dy).toFixed(1)}" x2="${(c + dx).toFixed(1)}" y2="${(c + dy).toFixed(1)}" />`;
    }).join("\n        ");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
    <defs>
        <clipPath id="bola"><circle cx="${c}" cy="${c}" r="${rb}" /></clipPath>
    </defs>
    <rect width="${S}" height="${S}" rx="112" fill="#a8434d" />
    <circle cx="${c}" cy="${c}" r="${rb}" fill="#fffaf1" />
    <g clip-path="url(#bola)" stroke="#f6ddd8" stroke-width="9" stroke-linecap="round">
        ${lineas}
    </g>
</svg>
`;
}

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------
function escribir(nombre, S, maskable) {
    writeFileSync(resolve(OUT, nombre), encodePng(S, render(S, maskable)));
    console.log("✔ " + nombre);
}

escribir("icon-192.png", 192, false);
escribir("icon-512.png", 512, false);
escribir("icon-maskable-512.png", 512, true);
writeFileSync(resolve(OUT, "icon.svg"), makeSvg());
console.log("✔ icon.svg");
