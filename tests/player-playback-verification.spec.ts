import { expect, test, Page } from '@playwright/test';
import { setupOperationalSession } from './fixtures/auth';

/**
 * JTBD-PLAY-00N — Verificação de reprodução REAL nos players (livro/vídeo/áudio).
 *
 * As specs `tests/central-coruja-*-jtbd.spec.ts` cobrem apenas a presença de texto/chrome
 * das telas de player, nunca o estado real de reprodução (PDF de fato carregado, vídeo
 * com frames decodificados, áudio tocando). Esta spec fecha essa lacuna, fazendo deep-link
 * DIRETO para `player_book` / `player_video` / `player_audio` (sem passar pelo modal de
 * detalhe da coleção — isso é responsabilidade de outra spec, mantida independente desta).
 *
 * Fixture: kit `784b3238-0916-4922-af3c-8627d74cc16c` ("Kaboo e a Carta Misteriosa"), que já
 * vem seedado em `data/catalog.seed.json` (MOCK_COLLECTIONS) — não precisa ser escrito em
 * `kaboo_mock_collections` manualmente, ao contrário do REG-DETAIL-MEDIA-ROUTING-001.
 *
 * Nota de roteamento (importante p/ quem for copiar este padrão): `player_book`,
 * `player_video` e `player_audio` NÃO fazem parte de HASH_ADDRESSABLE_SCREENS
 * (lib/navHistory.ts). Se o deep-link usar hash `#home` (mesmo vazio), o App inicializa
 * `navState` a partir do hash ANTES de olhar `kaboo_nav_state` no localStorage, sobrescrevendo
 * o estado do player. E se o path for `/` (raiz) com 0 ou 1 segmento, `isPortalEntryPath()`
 * intercepta antes mesmo do localStorage ser consultado. Por isso usamos um path com 2
 * segmentos (`/e2e/deep-link`, sem hash) — cai direto em `loadNavState()`, que respeita
 * `navState.currentScreen` + `params.collectionId` (App.tsx linhas ~448-483).
 */

const KIT_ID = '784b3238-0916-4922-af3c-8627d74cc16c';
const KIT_PDF_URL = 'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/pdfs/784b3238-0916-4922-af3c-8627d74cc16c/1768192341842-heqozuo-EFAI1_Livro_Kaboo_e_a_Carta_Misteriosa_app_compres';
const KIT_AUDIO_URL = 'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/audio/784b3238-0916-4922-af3c-8627d74cc16c/1769708145715-6jwjx6e-08_Kaboo_e_a_carta_misteriosa_OK.WAV';
// Único asset de vídeo AUTO-HOSPEDADO (não-YouTube) encontrado no kit fixture: a versão
// "Desenho Animado" (category: animation) em collection_assets. Os outros vídeos do
// catálogo mock (ex.: JTBD de vídeo) usam YouTube, propositalmente fora de escopo aqui.
const KIT_VIDEO_URL = 'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/video/33efdbb5-abed-4037-9eed-bb7017d19f7a/1769203911843-r8hqd9p-Gaio_e_vento_da_coragem_OK.mov#carta-animation';

const READING_STORAGE_KEY = `kaboo_reading_${KIT_ID}_page`;

const deepLinkToPlayer = async (
  page: Page,
  currentScreen: 'player_book' | 'player_video' | 'player_audio',
  params: Record<string, unknown>,
) => {
  await setupOperationalSession(page, {
    role: 'admin',
    brandSlug: 'kaboo',
    navState: { currentScreen, params: { collectionId: KIT_ID, ...params } },
    // Path com 2 segmentos e SEM hash — ver nota de roteamento no topo do arquivo.
    initialUrl: '/e2e/deep-link',
  });
};

test.describe('JTBD-PLAY-001 · Livro — PDF carrega e a página persiste', () => {
  test('flipbook dispara onLoadSuccess e onPageChange grava a página no localStorage', async ({ page }) => {
    await deepLinkToPlayer(page, 'player_book', {});

    // Enquanto pdfLoading=true, o FlipbookViewer mostra o overlay "Carregando livro...".
    // Ele some quando onDocumentLoadSuccess roda (seta pdfLoading=false) e dispara
    // onLoadSuccess no BookReaderScreen — sinal observável de que o PDF de fato carregou.
    await expect(page.getByText('Carregando livro...')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Carregando livro...')).not.toBeVisible({ timeout: 30_000 });

    // Simula virada de página pelo controle real da UI (botão "Próxima página").
    await page.getByRole('button', { name: 'Próxima página' }).click();

    // onPageChange grava `kaboo_reading_<collectionId>_page` no localStorage com a nova página.
    await expect
      .poll(async () => page.evaluate((key) => window.localStorage.getItem(key), READING_STORAGE_KEY), {
        timeout: 10_000,
      })
      .toBe('1');
  });
});

test.describe('JTBD-PLAY-002 · Vídeo auto-hospedado — reprodução realmente inicia', () => {
  test('clicar em Reproduzir leva o <video> nativo a readyState >= 3 (HAVE_FUTURE_DATA)', async ({ page }) => {
    // NOTA: este teste cobre exclusivamente a fonte auto-hospedada (<video> nativo).
    // Cenários com iframe do YouTube são deliberadamente FORA de escopo aqui: autoplay/estado
    // de reprodução via postMessage dentro de um iframe é pouco confiável em modo headless
    // (ver comentário de isTouchDevice/YT.Player em screens/VideoPlayerScreen.tsx) — forçar
    // essa asserção resultaria em um teste frágil, não em uma verificação real de playback.
    await deepLinkToPlayer(page, 'player_video', {
      assetUrl: KIT_VIDEO_URL,
      assetTitle: 'Desenho Animado',
    });

    const video = page.locator('video');
    await expect(video).toBeVisible({ timeout: 15_000 });

    // O <video> não tem autoplay (confirmado lendo VideoPlayerScreen.tsx — nenhum atributo
    // autoPlay e nenhum .play() automático) — precisa do clique no botão central de play.
    // Há 2 botões "Reproduzir" na tela (overlay central grande + controle de
    // transporte pequeno) — o primeiro (maior, h-20 w-20) é o overlay central.
    await page.getByRole('button', { name: 'Reproduzir' }).first().click();

    // onPlaying (screens/VideoPlayerScreen.tsx) só dispara quando o browser genuinamente
    // decodificou frames suficientes. Faz polling em vez de assertar instantaneamente —
    // arquivo de ~300MB, pode levar alguns segundos para bufferizar o necessário.
    await expect
      .poll(async () => video.evaluate((el: HTMLVideoElement) => el.readyState), { timeout: 45_000 })
      .toBeGreaterThanOrEqual(3);

    await expect
      .poll(async () => video.evaluate((el: HTMLVideoElement) => el.paused), { timeout: 5_000 })
      .toBe(false);
  });
});

test.describe('JTBD-PLAY-003 · Áudio — estado de reprodução e sinal de rotação do CD', () => {
  test('reproduzir áudio desmarca "paused" e o disco gira de fato (ângulo aumenta com o tempo)', async ({ page }) => {
    await deepLinkToPlayer(page, 'player_audio', {
      assetUrl: KIT_AUDIO_URL,
      assetTitle: 'Kaboo e a Carta Misteriosa (áudio)',
    });

    const audio = page.locator('audio');
    await expect(audio).toHaveCount(1, { timeout: 15_000 });

    // AudioPlayerScreen não recebeu `autoplay: true` nos params de navegação, então a
    // reprodução exige clique explícito no controle de transporte central (aria-label
    // "Reproduzir"/"Pausar", ver onClick={togglePlay} em screens/AudioPlayerScreen.tsx).
    await page.getByRole('button', { name: 'Reproduzir' }).click();

    await expect
      .poll(async () => audio.evaluate((el: HTMLAudioElement) => el.paused), { timeout: 15_000 })
      .toBe(false);

    // Sinal secundário: o disco (CD) gira via `transform: rotate(${cdRotation}deg)`, atualizado
    // a cada requestAnimationFrame em função do currentTime real do <audio>. Comparar o ângulo
    // em duas leituras com um intervalo prova que é uma animação dirigida pelo tempo real de
    // reprodução, não um render estático.
    const cdDisc = page.locator('div[style*="rotate("]').first();
    await expect(cdDisc).toBeVisible({ timeout: 10_000 });

    const readRotationDeg = async () => {
      const style = await cdDisc.getAttribute('style');
      const match = style?.match(/rotate\(([-\d.]+)deg\)/);
      return match ? parseFloat(match[1]) : NaN;
    };

    const firstReading = await readRotationDeg();
    await page.waitForTimeout(1000);
    const secondReading = await readRotationDeg();

    expect(Number.isNaN(firstReading)).toBe(false);
    expect(Number.isNaN(secondReading)).toBe(false);
    expect(secondReading).toBeGreaterThan(firstReading);
  });
});
