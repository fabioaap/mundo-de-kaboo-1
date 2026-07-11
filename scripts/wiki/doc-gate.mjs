// Gate de frescor da wiki. Roda no PR (base...HEAD): se o código mudou e a
// documentação NÃO foi atualizada, falha (exit 1) com uma mensagem clara.
//
// Uso: node scripts/wiki/doc-gate.mjs [baseRef]   (default: origin/main)

import { execSync } from 'node:child_process';

const base = process.argv[2] || process.env.BASE_REF || 'origin/main';

let changed;
try {
  changed = execSync(`git diff --name-only ${base}...HEAD`, { encoding: 'utf8' })
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
} catch (e) {
  // Sem base acessível (ex.: rodando local sem fetch) — não bloqueia.
  console.log(`ℹ️  Não consegui comparar com ${base} (${e.message}). Gate ignorado.`);
  process.exit(0);
}

// Código cujo comportamento deveria refletir na wiki.
const CODE =
  /^(screens|components|hooks|lib|supabase\/migrations|supabase\/functions)\/|^App\.tsx$|^types\.ts$/;
const DOCS = /^docs\/docs\//;
const CHANGELOG = /^docs\/docs\/changelog\//;

const codeChanges = changed.filter((f) => CODE.test(f));
const docChanges = changed.filter((f) => DOCS.test(f));
const changelogChanges = changed.filter((f) => CHANGELOG.test(f));

if (codeChanges.length === 0) {
  console.log('✅ Sem mudança de código relevante — gate não se aplica.');
  process.exit(0);
}

if (docChanges.length > 0) {
  console.log(`✅ Código mudou e a wiki foi atualizada (${docChanges.length} doc[s]).`);
  if (changelogChanges.length === 0) {
    console.log('⚠️  Dica: nenhuma entrada de changelog tocada — considere registrar o "antes → depois" com data.');
  }
  process.exit(0);
}

console.error('\n❌ GATE DE WIKI — código mudou, mas a documentação não foi atualizada.\n');
console.error('Código alterado neste PR:');
codeChanges.slice(0, 30).forEach((f) => console.error('   - ' + f));
if (codeChanges.length > 30) console.error(`   … e mais ${codeChanges.length - 30}`);
console.error('\nAtualize a wiki em docs/docs/ (regra de negócio, usabilidade, telas e/ou changelog).');
console.error('Se a UI mudou, adicione/atualize os prints. O índice do assistente é re-gerado no merge.\n');
process.exit(1);
