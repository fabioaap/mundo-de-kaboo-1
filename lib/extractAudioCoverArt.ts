import { parseBlob } from 'music-metadata';

/**
 * Tenta extrair a imagem de capa embutida em um arquivo de áudio (ID3/FLAC/Vorbis/M4A).
 * Retorna um File pronto para upload, ou null se não houver capa.
 * Formatos suportados: MP3, M4A/AAC, OGG, FLAC, WAV, AIFF, Opus, WebM.
 */
export async function extractAudioCoverArt(audioFile: File): Promise<File | null> {
  try {
    const metadata = await parseBlob(audioFile, { skipCovers: false });
    const picture = metadata.common.picture?.[0];
    if (!picture) return null;

    const blob = new Blob([picture.data], { type: picture.format });
    const ext = picture.format === 'image/png' ? 'png' : 'jpg';
    const baseName = audioFile.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}-cover.${ext}`, { type: picture.format });
  } catch (err) {
    console.warn('[extractAudioCoverArt] falhou ao ler metadados:', err);
    return null;
  }
}
