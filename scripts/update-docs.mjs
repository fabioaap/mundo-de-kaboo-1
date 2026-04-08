#!/usr/bin/env node

/**
 * @fileoverview Auto-update documentation from live codebase
 * 
 * Funcionalidades:
 * - Escaneia projeto por mudanças (components, screens, types, etc)
 * - Extrai JSDoc, tipos e comentários
 * - Atualiza INFRAESTRUTURA.md com mudanças
 * - Gera/atualiza documentação de componentes
 * - Gera/atualiza documentação de API
 * - Mantém histórico de mudanças
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(PROJECT_ROOT, 'docs');

// ============================================================
// CONFIGURAÇÃO
// ============================================================

const CONFIG = {
    projectRoot: PROJECT_ROOT,
    docsDir: DOCS_DIR,
    sourcePatterns: {
        components: 'components/**/*.tsx',
        screens: 'screens/**/*.tsx',
        hooks: 'hooks/**/*.ts',
        lib: 'lib/**/*.ts',
        types: 'types.ts',
    },
    outputFiles: {
        infra: path.join(PROJECT_ROOT, 'INFRAESTRUTURA.md'),
        apiDocs: path.join(DOCS_DIR, 'API.md'),
        componentsDocs: path.join(DOCS_DIR, 'COMPONENTES.md'),
        hooksDocs: path.join(DOCS_DIR, 'HOOKS.md'),
        screensDocs: path.join(DOCS_DIR, 'SCREENS.md'),
        changelog: path.join(DOCS_DIR, 'CHANGELOG.md'),
    },
    timestamp: new Date().toISOString(),
};

// ============================================================
// UTILITIES
// ============================================================

const logger = {
    info: (msg) => console.log(`✓ ${msg}`),
    warn: (msg) => console.warn(`⚠ ${msg}`),
    error: (msg) => console.error(`✗ ${msg}`),
    section: (msg) => console.log(`\n📋 ${msg}\n`),
};

function getAllFiles(dir, pattern = '') {
    const files = [];

    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                files.push(...getAllFiles(fullPath, pattern));
            } else if (entry.isFile()) {
                if (!pattern || entry.name.match(pattern)) {
                    files.push(fullPath);
                }
            }
        }
    } catch (err) {
        logger.warn(`Erro ao ler ${dir}: ${err.message}`);
    }

    return files;
}

function readFile(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch (err) {
        logger.error(`Erro ao ler ${filePath}: ${err.message}`);
        return '';
    }
}

function writeFile(filePath, content) {
    try {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, content, 'utf-8');
        return true;
    } catch (err) {
        logger.error(`Erro ao escrever ${filePath}: ${err.message}`);
        return false;
    }
}

function extractJSDoc(content) {
    const jsdocRegex = /\/\*\*[\s\S]*?\*\//g;
    const matches = content.match(jsdocRegex) || [];
    return matches.map(match => match.replace(/\s*\*\s*/g, ' ').trim());
}

function extractExports(content) {
    const exportRegex = /export\s+(const|function|interface|type|class)\s+(\w+)/g;
    const exports = [];
    let match;

    while ((match = exportRegex.exec(content)) !== null) {
        exports.push({
            type: match[1],
            name: match[2],
        });
    }

    return exports;
}

// ============================================================
// ANÁLISE DE CÓDIGO
// ============================================================

function analyzeComponents() {
    logger.section('Analisando Componentes');

    const componentFiles = getAllFiles(path.join(PROJECT_ROOT, 'components'), /\.tsx$/);
    const components = [];

    for (const file of componentFiles) {
        const content = readFile(file);
        const relativePath = path.relative(PROJECT_ROOT, file);
        const fileName = path.basename(file, '.tsx');
        const jsdocs = extractJSDoc(content);
        const exports = extractExports(content);

        components.push({
            name: fileName,
            path: relativePath,
            exports,
            jsdocs,
            hasProps: content.includes('interface Props') || content.includes('type Props'),
            hasStories: false, // futuro: verificar stories
        });
    }

    logger.info(`${components.length} componentes encontrados`);
    return components;
}

function analyzeScreens() {
    logger.section('Analisando Telas');

    const screenFiles = getAllFiles(path.join(PROJECT_ROOT, 'screens'), /\.tsx$/);
    const screens = [];

    for (const file of screenFiles) {
        const content = readFile(file);
        const relativePath = path.relative(PROJECT_ROOT, file);
        const fileName = path.basename(file, '.tsx');
        const exports = extractExports(content);

        screens.push({
            name: fileName,
            path: relativePath,
            exports,
            isProtected: content.includes('PROTECTED_SCREENS'),
        });
    }

    logger.info(`${screens.length} telas encontradas`);
    return screens;
}

function analyzeHooks() {
    logger.section('Analisando Hooks');

    const hookFiles = getAllFiles(path.join(PROJECT_ROOT, 'hooks'), /\.ts$/);
    const hooks = [];

    for (const file of hookFiles) {
        const content = readFile(file);
        const relativePath = path.relative(PROJECT_ROOT, file);
        const fileName = path.basename(file, '.ts');
        const jsdocs = extractJSDoc(content);
        const exports = extractExports(content);

        hooks.push({
            name: fileName,
            path: relativePath,
            exports,
            jsdocs,
            description: jsdocs[0]?.substring(0, 100) || 'Sem descrição',
        });
    }

    logger.info(`${hooks.length} hooks encontrados`);
    return hooks;
}

function analyzeTypes() {
    logger.section('Analisando Types');

    const typesFile = path.join(PROJECT_ROOT, 'types.ts');
    const content = readFile(typesFile);

    const interfaces = extractExports(content).filter(e => e.type === 'interface');
    const types = extractExports(content).filter(e => e.type === 'type');

    logger.info(`${interfaces.length} interfaces, ${types.length} types encontrados`);

    return { interfaces, types, total: interfaces.length + types.length };
}

function analyzeAPI() {
    logger.section('Analisando API');

    const apiFile = path.join(PROJECT_ROOT, 'lib', 'api.ts');
    const content = readFile(apiFile);
    const exports = extractExports(content);

    logger.info(`${exports.length} funções/constantes de API encontradas`);

    return exports;
}

// ============================================================
// GERAÇÃO DE DOCUMENTAÇÃO
// ============================================================

function generateComponentsDocs(components) {
    logger.section('Gerando documentação de Componentes');

    let doc = `# Documentação de Componentes

**Atualizado em**: ${new Date().toLocaleString('pt-BR')}

## Índice

${components.map(c => `- [${c.name}](#${c.name.toLowerCase()})`).join('\n')}

---

`;

    for (const component of components) {
        doc += `## ${component.name}

**Arquivo**: \`${component.path}\`

${component.jsdocs.length > 0 ? `**Descrição**: ${component.jsdocs[0]}\n` : ''}

${component.hasProps ? '**Props**: Interface Props definida\n' : ''}

**Exports**: ${component.exports.map(e => `\`${e.name}\``).join(', ') || 'Nenhum export encontrado'}

---

`;
    }

    return doc;
}

function generateHooksDocs(hooks) {
    logger.section('Gerando documentação de Hooks');

    let doc = `# Documentação de React Hooks Customizados

**Atualizado em**: ${new Date().toLocaleString('pt-BR')}

## Índice

${hooks.map(h => `- [${h.name}](#${h.name.toLowerCase()})`).join('\n')}

---

`;

    for (const hook of hooks) {
        doc += `## ${hook.name}

**Arquivo**: \`${hook.path}\`

**Descrição**: ${hook.description}

${hook.jsdocs.length > 0 ? `\n\`\`\`\n${hook.jsdocs[0]}\n\`\`\`` : ''}

**Exports**: ${hook.exports.map(e => `\`${e.name}\``).join(', ')}

---

`;
    }

    return doc;
}

function generateScreensDocs(screens) {
    logger.section('Gerando documentação de Telas');

    const protectedScreens = screens.filter(s => s.isProtected);
    const publicScreens = screens.filter(s => !s.isProtected);

    let doc = `# Documentação de Telas (Screens)

**Atualizado em**: ${new Date().toLocaleString('pt-BR')}

## Resumo

- **Total de telas**: ${screens.length}
- **Telas protegidas**: ${protectedScreens.length}
- **Telas públicas**: ${publicScreens.length}

## Telas Públicas

${publicScreens.map(s => `- **${s.name}** (\`${s.path}\`)`).join('\n')}

## Telas Protegidas (Requer autenticação)

${protectedScreens.map(s => `- **${s.name}** (\`${s.path}\`)`).join('\n')}

---

`;

    return doc;
}

function generateAPIDocs(apis, types) {
    logger.section('Gerando documentação de API');

    let doc = `# Documentação de API

**Atualizado em**: ${new Date().toLocaleString('pt-BR')}

## Funções de API

**Arquivo**: \`lib/api.ts\`

### Autenticação
${apis.filter(a => ['signIn', 'signUp', 'signOut', 'resetPassword'].some(keyword => a.name.toLowerCase().includes(keyword)))
            .map(a => `- \`${a.name}()\``)
            .join('\n')}

### Perfil & Acesso
${apis.filter(a => ['profile', 'access', 'role'].some(keyword => a.name.toLowerCase().includes(keyword)))
            .map(a => `- \`${a.name}()\``)
            .join('\n')}

### Coleções
${apis.filter(a => ['collection', 'resource', 'progress'].some(keyword => a.name.toLowerCase().includes(keyword)))
            .map(a => `- \`${a.name}()\``)
            .join('\n')}

### Vouchers
${apis.filter(a => ['voucher'].some(keyword => a.name.toLowerCase().includes(keyword)))
            .map(a => `- \`${a.name}()\``)
            .join('\n')}

---

`;

    return doc;
}

function generateChangelog(components, screens, hooks, types) {
    logger.section('Gerando Changelog');

    const content = `# Changelog - Análise Automática

**Data**: ${new Date().toLocaleString('pt-BR')}

## Resumo do Projeto

- **Componentes**: ${components.length}
- **Telas**: ${screens.length}
- **Hooks**: ${hooks.length}
- **Tipos**: ${types.total}

## Ultimas Mudanças Detectadas

### Componentes
${components.slice(-5).map(c => `- ${c.name}`).join('\n')}

### Telas
${screens.slice(-5).map(s => `- ${s.name}`).join('\n')}

### Hooks
${hooks.slice(-5).map(h => `- ${h.name}`).join('\n')}

---

**Este documento é gerado automaticamente pelo script \`scripts/update-docs.mjs\`**
`;

    return content;
}

// ============================================================
// ATUALIZAÇÃO DE DOCUMENTAÇÃO EXISTENTE
// ============================================================

function updateInfrastructurDoc(components, screens, hooks, types) {
    logger.section('Atualizando INFRAESTRUTURA.md');

    let infra = readFile(CONFIG.outputFiles.infra);

    // Atualiza seção de Componentes
    const componentsList = components
        .map(c => `- [${c.name}](${c.path})`)
        .join('\n');

    const componentsSectionRegex = /### Componentes\n[\s\S]*?(?=\n###|\n---|\Z)/;
    const componentsSection = `### Componentes (${components.length})\n${componentsList}`;

    if (componentsSectionRegex.test(infra)) {
        infra = infra.replace(componentsSectionRegex, componentsSection);
    }

    // Atualiza seção de Tipos
    const typesLine = `**Total**: ${types.total} (${types.interfaces.length} interfaces, ${types.types.length} types)`;
    const typesRegex = /Total of types.*$/m;

    if (typesRegex.test(infra)) {
        infra = infra.replace(typesRegex, `**Total**: ${types.total} tipos`);
    }

    // Atualiza timestamp
    infra = infra.replace(
        /\*\*Última atualização\*\*:.*$/m,
        `**Última atualização**: ${new Date().toLocaleString('pt-BR')}`
    );

    if (writeFile(CONFIG.outputFiles.infra, infra)) {
        logger.info('INFRAESTRUTURA.md atualizado');
    }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
    console.log('\n🚀 Iniciando atualização automática de documentações...\n');

    try {
        // Análise
        const components = analyzeComponents();
        const screens = analyzeScreens();
        const hooks = analyzeHooks();
        const types = analyzeTypes();
        const apis = analyzeAPI();

        // Geração de docs
        const componentsDocs = generateComponentsDocs(components);
        const hooksDocs = generateHooksDocs(hooks);
        const screensDocs = generateScreensDocs(screens);
        const apiDocs = generateAPIDocs(apis, types);
        const changelog = generateChangelog(components, screens, hooks, types);

        // Escrita
        logger.section('Escrevendo documentações');

        const files = [
            [CONFIG.outputFiles.componentsDocs, componentsDocs, 'COMPONENTES.md'],
            [CONFIG.outputFiles.hooksDocs, hooksDocs, 'HOOKS.md'],
            [CONFIG.outputFiles.screensDocs, screensDocs, 'SCREENS.md'],
            [CONFIG.outputFiles.apiDocs, apiDocs, 'API.md'],
            [CONFIG.outputFiles.changelog, changelog, 'CHANGELOG.md'],
        ];

        let successCount = 0;
        for (const [filePath, content, name] of files) {
            if (writeFile(filePath, content)) {
                logger.info(`✓ ${name} criado/atualizado`);
                successCount++;
            }
        }

        // Atualiza infraestrutura existente
        updateInfrastructurDoc(components, screens, hooks, types);

        // Resumo
        console.log(`\n✅ Documentações atualizadas com sucesso!\n`);
        console.log(`📊 Resumo:`);
        console.log(`   - Componentes: ${components.length}`);
        console.log(`   - Telas: ${screens.length}`);
        console.log(`   - Hooks: ${hooks.length}`);
        console.log(`   - Tipos: ${types.total}`);
        console.log(`   - Arquivos criados: ${successCount}/5`);
        console.log(`\n📁 Documentações em: ${CONFIG.docsDir}\n`);

    } catch (err) {
        logger.error(`Erro durante atualização: ${err.message}`);
        console.error(err);
        process.exit(1);
    }
}

// Executa
main();
