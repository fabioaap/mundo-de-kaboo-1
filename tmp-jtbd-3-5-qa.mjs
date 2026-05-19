process.on('uncaughtException', (e) => { console.error('UNCAUGHT', e); });
process.on('unhandledRejection', (e) => { console.error('UNHANDLED', e); });
import { chromium, devices } from 'playwright';
import fs from 'fs';

const BASE_URL = 'http://127.0.0.1:4100';
const OUT_DIR = 'test-results/jtbd-3-5';
const REPORT_PATH = 'test-results/jtbd-3-5-qa-report.json';

fs.mkdirSync(OUT_DIR, { recursive: true });

const mockUsers = (now, futureDate) => ([
  {
    id: 'mock-admin',
    email: 'demo@mundodekaboo.local',
    password: '123456',
    role: 'admin',
    created_at: now,
    profile: {
      id: 'mock-admin',
      full_name: 'Demo Admin',
      email: 'demo@mundodekaboo.local',
      avatar_id: 'Kaboo',
      role: 'admin',
      voucher_id: null,
      access_starts_at: now,
      access_expires_at: futureDate,
      access_status: 'active',
    },
  },
]);

const JTBD_CLASS = {
  '5.3': 'ausente esperado (v2.0)',
  '5.4': 'ausente esperado (v2.0)',
  '5.5': 'ausente esperado (v2.0)',
};

const findings = [];
const checkState = new Map();

function markCheck(jtbd, ok) {
  const prev = checkState.get(jtbd) || { pass: 0, fail: 0 };
  if (ok) prev.pass += 1;
  else prev.fail += 1;
  checkState.set(jtbd, prev);
}

function addFinding({ jtbd, passo, esperado, encontrado, severidade, ok }) {
  findings.push({ jtbd, passo, esperado, encontrado, severidade, ok });
  markCheck(jtbd, ok);
}

async function ensureVisible(locator, timeout = 10000) {
  try {
    await locator.first().waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

async function safeClick(locator) {
  await locator.first().click({ timeout: 10000, force: true });
}

async function loginAsAdmin(page) {
  const now = new Date().toISOString();
  const futureDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.locator('#field-email').waitFor({ state: 'visible', timeout: 15000 });
  await page.evaluate(({ users }) => {
    localStorage.setItem('kaboo_mock_users', JSON.stringify(users));
  }, { users: mockUsers(now, futureDate) });
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#field-email').fill('demo@mundodekaboo.local');
  await page.locator('#field-password').fill('123456');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForTimeout(800);
  await page.locator('text=Kaboo e a Carta Misteriosa').first().waitFor({ state: 'visible', timeout: 15000 });
}

async function openCollection(page, titleRegex) {
  const card = page.locator('text=' + titleRegex).first();
  await card.click();
  await page.waitForTimeout(700);
}

async function goBack(page) {
  const back = page.locator('button[aria-label="Voltar"], button:has(svg)').first();
  try {
    await back.click({ timeout: 5000 });
  } catch {
    await page.keyboard.press('Escape');
  }
  await page.waitForTimeout(700);
}

async function runViewport(view) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext(view.context);
  const page = await context.newPage();

  const tag = view.name.replace(/\s+/g, '-').toLowerCase();

  try {
    await loginAsAdmin(page);
    await page.screenshot({ path: `${OUT_DIR}/${tag}-home.png`, fullPage: true });

    // JTBD 3.1 / 3.2 / 3.4 / 3.5 / 3.6 / 3.7 on first collection
    await openCollection(page, 'Kaboo e a Carta Misteriosa');
    await page.screenshot({ path: `${OUT_DIR}/${tag}-details-carta.png`, fullPage: true });

    const readingBtn = page.getByRole('button', { name: /Livro|Leitura/i });
    const hasReadingBtn = await ensureVisible(readingBtn);
    addFinding({
      jtbd: '3.1',
      passo: 'Abrir ação de leitura no detalhe',
      esperado: 'Botão de leitura visível e navegável para flipbook',
      encontrado: hasReadingBtn ? `Botão leitura visível em ${view.name}` : `Botão leitura não encontrado em ${view.name}`,
      severidade: hasReadingBtn ? 'Low' : 'High',
      ok: hasReadingBtn,
    });

    if (hasReadingBtn) {
      await safeClick(readingBtn);
      await page.waitForTimeout(1200);
      const hasPagination = await ensureVisible(page.locator('text=/de\\s+\\d+/i'));
      addFinding({
        jtbd: '3.1',
        passo: 'Renderizar leitor flipbook',
        esperado: 'Tela de leitura com paginação visível e navegação',
        encontrado: hasPagination ? `Leitor abriu com paginação em ${view.name}` : `Leitor abriu sem paginação clara em ${view.name}`,
        severidade: hasPagination ? 'Low' : 'Medium',
        ok: hasPagination,
      });

      const textModeToggle = page.getByRole('button', { name: /Modo Texto|Texto/i });
      const hasTextMode = await ensureVisible(textModeToggle, 3000);
      addFinding({
        jtbd: '3.2',
        passo: 'Alternar para modo texto no leitor',
        esperado: 'Toggle de modo texto disponível e acessível',
        encontrado: hasTextMode ? `Toggle modo texto encontrado em ${view.name}` : `Toggle modo texto não encontrado em ${view.name}`,
        severidade: hasTextMode ? 'Low' : 'High',
        ok: hasTextMode,
      });

      await page.screenshot({ path: `${OUT_DIR}/${tag}-book-reader.png`, fullPage: true });
      await goBack(page);
      await page.waitForTimeout(800);
    }

    const animationBtn = page.getByRole('button', { name: /Desenho Animado|Animado/i });
    const hasAnimationBtn = await ensureVisible(animationBtn, 4000);
    addFinding({
      jtbd: '3.6',
      passo: 'Visualizar entrada de conteúdo animado/IA',
      esperado: 'Botão de conteúdo animado visível no detalhe',
      encontrado: hasAnimationBtn ? `Botão animado visível em ${view.name}` : `Botão animado ausente em ${view.name}`,
      severidade: hasAnimationBtn ? 'Low' : 'High',
      ok: hasAnimationBtn,
    });

    if (hasAnimationBtn) {
      const hasIaOrNovoBadge = await ensureVisible(page.locator('text=/IA|Novo/i'), 2000);
      addFinding({
        jtbd: '3.6',
        passo: 'Diferenciar conteúdo animado/IA com badge',
        esperado: 'Badge IA/Novo no acesso ao conteúdo animado',
        encontrado: hasIaOrNovoBadge ? `Badge IA/Novo visível em ${view.name}` : `Sem badge IA/Novo em ${view.name}`,
        severidade: hasIaOrNovoBadge ? 'Low' : 'Medium',
        ok: hasIaOrNovoBadge,
      });

      await safeClick(animationBtn);
      await page.waitForTimeout(1500);
      const hasVideoPlayer = await ensureVisible(page.locator('video, iframe[src*="youtube" i]'), 6000);
      addFinding({
        jtbd: '3.4',
        passo: 'Reproduzir vídeo regular',
        esperado: 'Player de vídeo carregado com controles',
        encontrado: hasVideoPlayer ? `Player vídeo carregado em ${view.name}` : `Player vídeo não carregou em ${view.name}`,
        severidade: hasVideoPlayer ? 'Low' : 'High',
        ok: hasVideoPlayer,
      });
      await page.screenshot({ path: `${OUT_DIR}/${tag}-video-regular.png`, fullPage: true });
      await goBack(page);
      await page.waitForTimeout(800);
    }

    const librasBtn = page.getByRole('button', { name: /Libras|Com Libras/i });
    const hasLibrasBtn = await ensureVisible(librasBtn, 4000);
    addFinding({
      jtbd: '3.5',
      passo: 'Acessar vídeo com Libras no detalhe',
      esperado: 'Botão Com Libras visível',
      encontrado: hasLibrasBtn ? `Botão Libras visível em ${view.name}` : `Botão Libras ausente em ${view.name}`,
      severidade: hasLibrasBtn ? 'Low' : 'High',
      ok: hasLibrasBtn,
    });

    if (hasLibrasBtn) {
      await safeClick(librasBtn);
      await page.waitForTimeout(1400);
      const totalVideoSurfaces = await page.locator('video, iframe[src*="youtube" i]').count();
      const hasPip = totalVideoSurfaces >= 2;
      addFinding({
        jtbd: '3.5',
        passo: 'Exibir layout acessível com intérprete PiP',
        esperado: 'Vídeo principal + janela de intérprete Libras (PiP)',
        encontrado: hasPip
          ? `Detectadas ${totalVideoSurfaces} superfícies de vídeo em ${view.name}`
          : `Detectada apenas ${totalVideoSurfaces} superfície de vídeo em ${view.name}`,
        severidade: hasPip ? 'Low' : 'Medium',
        ok: hasPip,
      });
      await page.screenshot({ path: `${OUT_DIR}/${tag}-video-libras.png`, fullPage: true });
      await goBack(page);
      await page.waitForTimeout(800);
    }

    const materialsBtn = page.getByRole('button', { name: /Materiais|Apoio/i });
    const hasMaterialsBtn = await ensureVisible(materialsBtn, 3000);
    addFinding({
      jtbd: '3.7',
      passo: 'Acessar área de materiais estruturados',
      esperado: 'Entrada para materiais de apoio visível no detalhe',
      encontrado: hasMaterialsBtn ? `Botão de materiais visível em ${view.name}` : `Botão de materiais ausente em ${view.name}`,
      severidade: hasMaterialsBtn ? 'Low' : 'High',
      ok: hasMaterialsBtn,
    });

    if (hasMaterialsBtn) {
      await safeClick(materialsBtn);
      await page.waitForTimeout(1200);
      const hasStructuredSection = await ensureVisible(page.locator('text=/Materiais por Componente|Materiais Genéricos|material/i'), 5000);
      addFinding({
        jtbd: '3.7',
        passo: 'Renderizar categorias de materiais',
        esperado: 'Categorias estruturadas (por componente/genéricos) com cards',
        encontrado: hasStructuredSection ? `Categorias materiais renderizadas em ${view.name}` : `Categorias estruturadas não identificadas em ${view.name}`,
        severidade: hasStructuredSection ? 'Low' : 'Medium',
        ok: hasStructuredSection,
      });
      await page.screenshot({ path: `${OUT_DIR}/${tag}-materials.png`, fullPage: true });
      await goBack(page);
    }

    // Back to home and audio on second collection
    await goBack(page);
    await page.waitForTimeout(1000);
    await openCollection(page, 'Mensageiro e a Can');

    const storytellingBtn = page.getByRole('button', { name: /Contação da História|Contacao da Historia|Áudio|Audio/i });
    const hasStorytellingBtn = await ensureVisible(storytellingBtn, 5000);
    addFinding({
      jtbd: '3.3',
      passo: 'Abrir contação de história em áudio',
      esperado: 'Botão de contação/áudio visível na coleção com storytelling',
      encontrado: hasStorytellingBtn ? `Botão storytelling visível em ${view.name}` : `Botão storytelling ausente em ${view.name}`,
      severidade: hasStorytellingBtn ? 'Low' : 'High',
      ok: hasStorytellingBtn,
    });

    if (hasStorytellingBtn) {
      await safeClick(storytellingBtn);
      await page.waitForTimeout(1500);
      const hasAudioSurface = await ensureVisible(page.locator('audio'), 5000);
      addFinding({
        jtbd: '3.3',
        passo: 'Renderizar player de áudio com controles',
        esperado: 'Player com play/pause e timeline de progresso',
        encontrado: hasAudioSurface ? `Elemento de áudio presente em ${view.name}` : `Elemento de áudio ausente em ${view.name}`,
        severidade: hasAudioSurface ? 'Low' : 'Medium',
        ok: hasAudioSurface,
      });
      await page.screenshot({ path: `${OUT_DIR}/${tag}-audio-player.png`, fullPage: true });
      await goBack(page);
    }

    await goBack(page);
    await page.waitForTimeout(800);

    // JTBD 5.x
    const profileBtn = page.getByRole('button', { name: /Perfil/i }).first();
    const hasProfileBtn = await ensureVisible(profileBtn, 6000);
    if (hasProfileBtn) {
      await profileBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${OUT_DIR}/${tag}-profile.png`, fullPage: true });
    }

    const myDataBtn = page.getByRole('button', { name: /Meus Dados/i });
    const hasMyDataBtn = await ensureVisible(myDataBtn, 6000);
    addFinding({
      jtbd: '5.1',
      passo: 'Entrar em Meus Dados para atualização cadastral',
      esperado: 'Acesso ao formulário de dados pessoais',
      encontrado: hasMyDataBtn ? `Entrada Meus Dados visível em ${view.name}` : `Entrada Meus Dados ausente em ${view.name}`,
      severidade: hasMyDataBtn ? 'Low' : 'High',
      ok: hasMyDataBtn,
    });

    if (hasMyDataBtn) {
      await myDataBtn.click();
      await page.waitForTimeout(900);
      const nameInput = page.locator('#mydata-full-name');
      const saveBtn = page.getByRole('button', { name: /Salvar Alterações|Salvando/i });
      const hasForm = await ensureVisible(nameInput, 5000) && await ensureVisible(saveBtn, 5000);
      addFinding({
        jtbd: '5.1',
        passo: 'Editar e salvar dados pessoais',
        esperado: 'Campos nome/e-mail editáveis e ação de salvar disponível',
        encontrado: hasForm ? `Formulário editável detectado em ${view.name}` : `Formulário incompleto em ${view.name}`,
        severidade: hasForm ? 'Low' : 'Medium',
        ok: hasForm,
      });

      if (hasForm) {
        const oldName = await nameInput.inputValue();
        await nameInput.fill((oldName || 'Demo Admin') + ' QA');
        await saveBtn.click();
        await page.waitForTimeout(1200);
        const hasSuccess = await ensureVisible(page.locator('text=/Dados atualizados com sucesso|Dados salvos|Dados locais atualizados/i'), 5000);
        addFinding({
          jtbd: '5.1',
          passo: 'Feedback visual após salvar dados',
          esperado: 'Mensagem de sucesso visível após submit',
          encontrado: hasSuccess ? `Feedback de sucesso visível em ${view.name}` : `Sem feedback claro de sucesso em ${view.name}`,
          severidade: hasSuccess ? 'Low' : 'Medium',
          ok: hasSuccess,
        });
      }
      await page.screenshot({ path: `${OUT_DIR}/${tag}-my-data.png`, fullPage: true });
      await goBack(page);
    }

    const addChildBtn = page.getByRole('button', { name: /Adicionar Criança|Adicionar Crianca|\+\s*Adicionar/i });
    const hasAddChild = await ensureVisible(addChildBtn, 2000);
    addFinding({
      jtbd: '5.3',
      passo: 'Disponibilizar cadastro de perfil infantil',
      esperado: 'No v1 atual, recurso ainda não presente (planejado v2.0)',
      encontrado: hasAddChild ? `Botão de perfil infantil apareceu em ${view.name}` : `Botão de perfil infantil não apareceu em ${view.name}`,
      severidade: hasAddChild ? 'Medium' : 'Low',
      ok: !hasAddChild,
    });

    const progressSection = page.locator('text=/Progresso|Livros lidos|tempo de escuta|vídeos assistidos|videos assistidos/i');
    const hasProgressDashboard = await ensureVisible(progressSection, 2000);
    addFinding({
      jtbd: '5.4',
      passo: 'Exibir dashboard de progresso infantil',
      esperado: 'No v1 atual, dashboard infantil ausente (planejado v2.0)',
      encontrado: hasProgressDashboard ? `Seção de progresso encontrada em ${view.name}` : `Seção de progresso infantil ausente em ${view.name}`,
      severidade: hasProgressDashboard ? 'Medium' : 'Low',
      ok: !hasProgressDashboard,
    });

    const childModeSwitch = page.locator('text=/Perfil Adulto|interface simplificada|modo criança|modo crianca/i');
    const hasChildSwitch = await ensureVisible(childModeSwitch, 2000);
    addFinding({
      jtbd: '5.5',
      passo: 'Alternar para interface simplificada infantil',
      esperado: 'No v1 atual, switch de interface infantil ausente (planejado v2.0)',
      encontrado: hasChildSwitch ? `Switch infantil encontrado em ${view.name}` : `Switch infantil ausente em ${view.name}`,
      severidade: hasChildSwitch ? 'Medium' : 'Low',
      ok: !hasChildSwitch,
    });

    const logoutBtn = page.getByRole('button', { name: /Sair do App/i });
    const hasLogout = await ensureVisible(logoutBtn, 6000);
    if (hasLogout) {
      await logoutBtn.click();
      await page.getByRole('button', { name: /^Sair$/i }).click({ timeout: 5000 });
      await page.waitForTimeout(1000);
    }

    const forgotLink = page.getByRole('button', { name: /Esqueci minha senha|Esqueci a senha/i });
    const hasForgotLink = await ensureVisible(forgotLink, 6000);
    addFinding({
      jtbd: '5.2',
      passo: 'Acessar fluxo de recuperação de senha',
      esperado: 'Ação “Esqueci a senha” disponível na tela de login',
      encontrado: hasForgotLink ? `CTA de recuperação visível em ${view.name}` : `CTA de recuperação ausente em ${view.name}`,
      severidade: hasForgotLink ? 'Low' : 'High',
      ok: hasForgotLink,
    });

    if (hasForgotLink) {
      await forgotLink.click();
      await page.waitForTimeout(900);
      const hasForgotScreen = await ensureVisible(page.locator('text=/Recuperar senha/i'), 6000);
      const hasEmailInput = await ensureVisible(page.locator('input[type="email"]'), 6000);
      addFinding({
        jtbd: '5.2',
        passo: 'Renderizar tela de recuperação com input de e-mail',
        esperado: 'Tela de recuperação carregada com input e ação de envio',
        encontrado: hasForgotScreen && hasEmailInput
          ? `Tela de recuperação carregada em ${view.name}`
          : `Tela de recuperação incompleta em ${view.name}`,
        severidade: hasForgotScreen && hasEmailInput ? 'Low' : 'Medium',
        ok: hasForgotScreen && hasEmailInput,
      });
      await page.screenshot({ path: `${OUT_DIR}/${tag}-forgot-password.png`, fullPage: true });
    }
      } catch (error) {
    addFinding({
      jtbd: 'BLOQUEADOR',
      passo: `Execução no viewport ${view.name}`,
      esperado: 'Rodada completa sem crash do runner',
      encontrado: `Erro de execução: ${error?.message || error}`,
      severidade: 'Critical',
      ok: false,
    });
  } finally {
    try { await context.close(); } catch {}
    try { await browser.close(); } catch {}
  }
}

(async () => {
  const viewports = [
    { name: 'desktop-1440x900', context: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile-375x667', context: { ...devices['iPhone 8'] } },
  ];

  for (const view of viewports) {
    await runViewport(view);
  }

  const jtbdStatus = {};
  for (const [jtbd, stat] of checkState.entries()) {
    if (JTBD_CLASS[jtbd]) {
      jtbdStatus[jtbd] = stat.fail === 0 ? JTBD_CLASS[jtbd] : 'parcial';
      continue;
    }

    if (stat.fail === 0) jtbdStatus[jtbd] = 'implementado';
    else if (stat.pass > 0) jtbdStatus[jtbd] = 'parcial';
    else jtbdStatus[jtbd] = 'ausente não esperado';
  }

  const severityCount = findings.reduce((acc, item) => {
    if (!item.ok) acc[item.severidade] = (acc[item.severidade] || 0) + 1;
    return acc;
  }, {});

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    statusByJtbd: jtbdStatus,
    summary: {
      totalChecks: findings.length,
      failedChecks: findings.filter(f => !f.ok).length,
      severityCount,
    },
    findings,
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log('JTBD QA report generated at', REPORT_PATH);
  console.log(JSON.stringify(report.summary, null, 2));
  console.log('Status by JTBD:', JSON.stringify(jtbdStatus, null, 2));
})().catch((e)=>{ console.error('FATAL', e); process.exit(1); });
