/**
 * download-assets.mjs
 *
 * Baixa PDFs e áudios das coleções Kaboo (Supabase Storage) para
 * public/kaboo-assets/. Áudios WAV são convertidos para MP3 192kbps
 * automaticamente (requer ffmpeg instalado no PATH).
 *
 * Uso:
 *   node scripts/download-assets.mjs              → baixa tudo
 *   node scripts/download-assets.mjs --only=pdf   → só PDFs
 *   node scripts/download-assets.mjs --only=audio → só áudios
 *   node scripts/download-assets.mjs --dry-run    → lista sem baixar
 *   node scripts/download-assets.mjs --keep-wav   → mantém WAV original (sem converter)
 *
 * Estrutura gerada:
 *   public/kaboo-assets/pdfs/   ← PDFs dos livros
 *   public/kaboo-assets/audio/  ← MP3s convertidos (ou WAV com --keep-wav)
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { execSync } from 'child_process';
import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT   = path.resolve(__dirname, '..');
const DEST   = path.join(ROOT, 'public', 'kaboo-assets');
const CATALOG = path.join(ROOT, 'data', 'catalog.seed.json');

// --- CLI args ---
const args      = process.argv.slice(2);
const dryRun    = args.includes('--dry-run');
const keepWav   = args.includes('--keep-wav');
const onlyFilter = args.find(a => a.startsWith('--only='))?.split('=')[1];

// --- verifica ffmpeg ---
let hasFfmpeg = false;
if (!keepWav) {
  try { execSync('ffmpeg -version', { stdio: 'ignore' }); hasFfmpeg = true; }
  catch { console.warn('⚠️  ffmpeg não encontrado — áudios serão mantidos no formato original.\n'); }
}

// --- lê o catálogo ---
const raw = fs.readFileSync(CATALOG, 'utf8');
const data = JSON.parse(raw);
const collections = Array.isArray(data) ? data : (data.collections || []);

// --- helpers ---
const DEFAULT_EXT = { document: '.pdf', audio: '.wav' };

const safeFileName = (url, mediaType) => {
  const clean = url.split('#')[0].split('?')[0];
  const parts = clean.split('/');
  let name = decodeURIComponent(parts[parts.length - 1]);
  const hasExt = /\.(pdf|wav|mp3|ogg|m4a)$/i.test(name);
  if (!hasExt && DEFAULT_EXT[mediaType]) name += DEFAULT_EXT[mediaType];
  return name.replace(/[\\/:*?"<>|]/g, '_');
};

const destFolder = (mediaType) =>
  path.join(DEST, mediaType === 'document' ? 'pdfs' : 'audio');

// --- monta lista de assets (sem vídeos) ---
const assets = [];
for (const col of collections) {
  const add = (url, category, mediaType) => {
    if (!url || typeof url !== 'string' || mediaType === 'video') return;
    assets.push({ url: url.trim(), category, mediaType, collectionTitle: col.title });
  };
  for (const a of (col.collection_assets || [])) add(a.url, a.category, a.media_type);
  if (col.pdf_url)   add(col.pdf_url,   'reading',      'document');
  if (col.audio_url) add(col.audio_url, 'storytelling', 'audio');
}

// deduplica por URL (sem fragmento)
const seen = new Set();
const unique = assets.filter(a => {
  const key = a.url.split('#')[0];
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

const MEDIA_FILTERS = { pdf: a => a.mediaType === 'document', audio: a => a.mediaType === 'audio' };
const filtered = onlyFilter ? unique.filter(MEDIA_FILTERS[onlyFilter] ?? (() => true)) : unique;

// --- download ---
const downloadFile = (url, dest) => new Promise((resolve, reject) => {
  const cleanUrl = url.split('#')[0];
  const client = cleanUrl.startsWith('https') ? https : http;
  const tmp = dest + '.tmp';
  const file = createWriteStream(tmp);

  const req = client.get(cleanUrl, res => {
    if (res.statusCode === 301 || res.statusCode === 302) {
      file.close(); fs.unlinkSync(tmp);
      return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
    }
    if (res.statusCode !== 200) {
      file.close(); fs.unlinkSync(tmp);
      return reject(new Error(`HTTP ${res.statusCode}`));
    }
    const total = parseInt(res.headers['content-length'] || '0', 10);
    let received = 0;
    res.on('data', chunk => {
      received += chunk.length;
      if (total > 0) {
        const pct = Math.round(received / total * 100);
        process.stdout.write(`\r    ⬇️  ${pct}% (${(received/1024/1024).toFixed(1)}/${(total/1024/1024).toFixed(1)} MB)   `);
      }
    });
    res.pipe(file);
    file.on('finish', () => {
      file.close(() => {
        fs.renameSync(tmp, dest);
        const mb = (fs.statSync(dest).size / 1024 / 1024).toFixed(1);
        process.stdout.write(`\r    ✅ download concluído (${mb} MB)` + ' '.repeat(15) + '\n');
        resolve();
      });
    });
  });
  req.on('error', err => { file.close(); if (existsSync(tmp)) fs.unlinkSync(tmp); reject(err); });
  req.setTimeout(180_000, () => { req.destroy(); reject(new Error('Timeout')); });
});

// --- converte WAV → MP3 192kbps ---
const toMp3 = (wavPath) => {
  const mp3Path = wavPath.replace(/\.wav$/i, '.mp3');
  process.stdout.write(`    🔄 convertendo para MP3 192kbps...`);
  execSync(`ffmpeg -y -i "${wavPath}" -codec:a libmp3lame -b:a 192k "${mp3Path}"`, { stdio: 'ignore' });
  const origMb = (fs.statSync(wavPath).size  / 1024 / 1024).toFixed(1);
  const mp3Mb  = (fs.statSync(mp3Path).size  / 1024 / 1024).toFixed(1);
  fs.unlinkSync(wavPath);   // remove WAV temporário
  console.log(` ✅ ${origMb} MB → ${mp3Mb} MB`);
  return mp3Path;
};

// --- execução ---
const pdfsCount  = filtered.filter(a => a.mediaType === 'document').length;
const audioCount = filtered.filter(a => a.mediaType === 'audio').length;
const audioFormat = hasFfmpeg && !keepWav ? 'MP3 192kbps' : 'WAV original';

console.log(`\n📦 Kaboo Asset Downloader`);
console.log(`   Destino  : public/kaboo-assets/`);
console.log(`   Áudios   : ${audioFormat}`);
console.log(`   Filtro   : ${onlyFilter || 'todos (sem vídeos)'}`);
console.log(`   Modo     : ${dryRun ? 'DRY RUN' : 'download'}`);
console.log(`   Assets   : ${pdfsCount} PDFs + ${audioCount} áudios = ${filtered.length} arquivos\n`);

const stats = { ok: 0, skip: 0, err: 0 };

for (let i = 0; i < filtered.length; i++) {
  const asset  = filtered[i];
  const folder = destFolder(asset.mediaType);
  const rawName = safeFileName(asset.url, asset.mediaType);

  // nome final: WAV vira MP3 se vamos converter
  const isWav = /\.wav$/i.test(rawName);
  const finalName = (hasFfmpeg && !keepWav && isWav)
    ? rawName.replace(/\.wav$/i, '.mp3')
    : rawName;
  const finalDest = path.join(folder, finalName);

  const icon = asset.mediaType === 'document' ? '📄' : '🎵';
  console.log(`[${i+1}/${filtered.length}] ${icon}  ${asset.collectionTitle}`);
  console.log(`    → ${finalName}`);

  if (dryRun) { console.log(`    (dry-run)\n`); stats.ok++; continue; }
  if (!existsSync(folder)) mkdirSync(folder, { recursive: true });

  // já existe o arquivo final?
  if (existsSync(finalDest)) {
    const mb = (fs.statSync(finalDest).size / 1024 / 1024).toFixed(1);
    console.log(`    ⏭️  já existe (${mb} MB), pulando\n`);
    stats.skip++; continue;
  }

  try {
    // download (para WAV: baixa o original primeiro)
    const downloadDest = (hasFfmpeg && !keepWav && isWav)
      ? path.join(folder, rawName)   // temporário .wav
      : finalDest;

    await downloadFile(asset.url, downloadDest);

    // converte se for WAV
    if (hasFfmpeg && !keepWav && isWav) toMp3(downloadDest);

    stats.ok++;
  } catch (err) {
    console.error(`    ❌ Erro: ${err.message}\n`);
    stats.err++;
  }
  console.log('');
}

console.log('─'.repeat(52));
console.log(`✅ Concluídos : ${stats.ok}`);
console.log(`⏭️  Pulados    : ${stats.skip}`);
console.log(`❌ Erros      : ${stats.err}`);

if (!dryRun && (stats.ok + stats.skip) > 0) {
  console.log(`\n📂 Arquivos em: public/kaboo-assets/`);
  console.log(`\n💡 Para commitar no git com LFS:`);
  console.log(`   git lfs install`);
  console.log(`   git add .gitattributes public/kaboo-assets/`);
  console.log(`   git commit -m "feat: assets Kaboo (PDFs + áudios MP3) via Git LFS"`);
  console.log(`   git push`);
}
