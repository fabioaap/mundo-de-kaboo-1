import React, {useEffect, useRef, useState} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useBaseUrlUtils} from '@docusaurus/useBaseUrl';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

type Source = {title: string; url: string};
type Msg = {role: 'user' | 'assistant'; text: string; sources?: Source[]};

const SAUDACAO: Msg = {
  role: 'assistant',
  text: 'Oi! Sou o assistente da wiki. Pergunte sobre voucher, acesso, marcas ou administração.',
};

// Histórico persistido na sessão (sobrevive a reload / clique em link / voltar).
const STORE_MSGS = 'wiki-assistant-msgs';
const STORE_OPEN = 'wiki-assistant-open';

function loadMsgs(): Msg[] {
  try {
    const raw = sessionStorage.getItem(STORE_MSGS);
    if (raw) return JSON.parse(raw) as Msg[];
  } catch {
    /* ignore */
  }
  return [SAUDACAO];
}

// Formata um subconjunto de Markdown (negrito, código, links, listas, títulos)
// em HTML de bloco. Escapa o HTML antes — sem risco de injeção.
function formatar(text: string): string {
  const escAll = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const inline = (s: string): string =>
    s
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, t, u) => {
        const url = String(u);
        // Whitelist de scheme — bloqueia javascript:/data: etc. (anti-XSS).
        return /^(https?:\/\/|\/|#|mailto:)/.test(url)
          ? `<a href="${url.replace(/"/g, '')}">${t}</a>`
          : t;
      });

  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${para.map(inline).join('<br>')}</p>`);
      para = [];
    }
  };
  const closeList = () => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };

  for (const raw of escAll.split('\n')) {
    const line = raw.trim();
    const ol = line.match(/^\d+[.)]\s+(.*)$/);
    const ul = line.match(/^[-*•]\s+(.*)$/);
    const h = line.match(/^#{1,4}\s+(.*)$/);
    if (ol) {
      flushPara();
      if (list !== 'ol') {
        closeList();
        out.push('<ol>');
        list = 'ol';
      }
      out.push(`<li>${inline(ol[1])}</li>`);
    } else if (ul) {
      flushPara();
      if (list !== 'ul') {
        closeList();
        out.push('<ul>');
        list = 'ul';
      }
      out.push(`<li>${inline(ul[1])}</li>`);
    } else if (h) {
      flushPara();
      closeList();
      out.push(`<p class="${styles.mdHeading}">${inline(h[1])}</p>`);
    } else if (line === '') {
      flushPara();
      closeList();
    } else {
      closeList();
      para.push(line);
    }
  }
  flushPara();
  closeList();
  return out.join('');
}

// Fallback (mock) quando o backend não está configurado ou falha.
const SUGESTOES = [
  'Como funciona o voucher?',
  'O que é o modelo white-label?',
  'Quando o acesso expira?',
  'Como emitir um lote de códigos?',
];

function respostaMock(pergunta: string): string {
  const q = pergunta.toLowerCase();
  if (q.includes('voucher') || q.includes('código') || q.includes('codigo'))
    return 'O voucher segue o ciclo Modelo → Lote → Códigos → Resgate. Um modelo define o pacote de conteúdo e o prazo; um lote gera os códigos; o usuário resgata na plataforma e ganha acesso pelo período configurado. Veja **Regras de negócio → Ciclo do voucher**.';
  if (q.includes('white') || q.includes('marca') || q.includes('label'))
    return 'White-label significa uma base de código só servindo duas marcas (Kaboo e Central Coruja). A diferença entre elas é tema + feature flags. Em produção, cada marca terá domínio e app próprios. Veja **Regras de negócio → White-label & marcas**.';
  if (q.includes('expira') || q.includes('acesso') || q.includes('prazo'))
    return 'O acesso é temporal: liberado por um período a partir do resgate (ex.: 6 meses). Ao expirar, a plataforma mostra a tela de acesso expirado, onde dá pra informar um novo código. Veja **Regras de negócio → Modelo de acesso**.';
  if (q.includes('lote') || q.includes('emitir'))
    return 'No módulo de Vouchers você usa o wizard: configura o modelo, escolhe o conteúdo, revisa e emite o lote de códigos. Veja **Usabilidade → Admin: Vouchers**.';
  return 'No modo demonstração eu respondo com base em alguns tópicos da wiki. Configure o backend (secrets no Supabase) para respostas reais sobre toda a documentação.';
}

export default function WikiAssistant(): React.ReactElement {
  const {siteConfig} = useDocusaurusContext();
  const {withBaseUrl} = useBaseUrlUtils();
  const cfg = (siteConfig.customFields?.wikiAssistant ?? {}) as {
    supabaseUrl?: string;
    anonKey?: string;
  };
  const endpoint = cfg.supabaseUrl && cfg.anonKey
    ? `${cfg.supabaseUrl.replace(/\/+$/, '')}/functions/v1/wiki-assistant`
    : '';

  const [aberto, setAberto] = useState(() => {
    try {
      return sessionStorage.getItem(STORE_OPEN) === '1';
    } catch {
      return false;
    }
  });
  const [pergunta, setPergunta] = useState('');
  const [modoReal, setModoReal] = useState(Boolean(endpoint));
  const [msgs, setMsgs] = useState<Msg[]>(loadMsgs);
  const [pensando, setPensando] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({behavior: 'smooth'});
  }, [msgs, pensando, aberto]);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORE_MSGS, JSON.stringify(msgs));
    } catch {
      /* ignore */
    }
  }, [msgs]);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORE_OPEN, aberto ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [aberto]);

  function limpar() {
    setMsgs([SAUDACAO]);
  }

  async function perguntar(texto: string) {
    const t = texto.trim();
    if (!t || pensando) return;
    setMsgs((m) => [...m, {role: 'user', text: t}]);
    setPergunta('');
    setPensando(true);

    // Tenta o backend real; qualquer falha cai no mock.
    if (endpoint) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            apikey: cfg.anonKey!,
            Authorization: `Bearer ${cfg.anonKey}`,
          },
          body: JSON.stringify({question: t}),
        });
        const data = await res.json();
        if (data?.configured && typeof data.answer === 'string') {
          setModoReal(true);
          setMsgs((m) => [
            ...m,
            {role: 'assistant', text: data.answer, sources: data.sources ?? []},
          ]);
          setPensando(false);
          return;
        }
        setModoReal(false); // backend respondeu configured:false → demo
      } catch {
        /* rede indisponível → mock */
      }
    }

    setTimeout(() => {
      setMsgs((m) => [...m, {role: 'assistant', text: respostaMock(t)}]);
      setPensando(false);
    }, 400);
  }

  return (
    <>
      <button
        className={styles.launcher}
        aria-label="Abrir assistente da wiki"
        onClick={() => setAberto((v) => !v)}>
        {aberto ? '✕' : '✨ Perguntar à IA'}
      </button>

      {aberto && (
        <div className={styles.panel} role="dialog" aria-label="Assistente da wiki">
          <div className={styles.header}>
            <div>
              <strong>Assistente da wiki</strong>
              {!modoReal && <span className={styles.badge}>modo demo</span>}
            </div>
            <div className={styles.headerActions}>
              {msgs.length > 1 && (
                <button className={styles.clear} onClick={limpar}>
                  Limpar
                </button>
              )}
              <button
                className={styles.close}
                aria-label="Fechar"
                onClick={() => setAberto(false)}>
                ✕
              </button>
            </div>
          </div>

          <div className={styles.messages}>
            {msgs.map((m, i) => (
              <div
                key={i}
                className={m.role === 'user' ? styles.user : styles.assistant}>
                {m.role === 'assistant' ? (
                  <div
                    className={styles.md}
                    dangerouslySetInnerHTML={{__html: formatar(m.text)}}
                  />
                ) : (
                  m.text
                )}
                {m.sources && m.sources.length > 0 && (
                  <div className={styles.sources}>
                    {m.sources.map((s) => (
                      <Link key={s.url} to={withBaseUrl(s.url)} className={styles.source}>
                        {s.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {pensando && (
              <div className={styles.assistant}>
                <span className={styles.dots}>digitando…</span>
              </div>
            )}
            {msgs.length <= 1 && (
              <div className={styles.chips}>
                {SUGESTOES.map((s) => (
                  <button key={s} className={styles.chip} onClick={() => perguntar(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div ref={fimRef} />
          </div>

          <form
            className={styles.inputRow}
            onSubmit={(e) => {
              e.preventDefault();
              perguntar(pergunta);
            }}>
            <input
              className={styles.input}
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              placeholder="Pergunte algo sobre a plataforma…"
              aria-label="Sua pergunta"
            />
            <button className={styles.send} type="submit" disabled={!pergunta.trim()}>
              Enviar
            </button>
          </form>
          <div className={styles.disclaimer}>
            {modoReal
              ? 'Respostas geradas por IA a partir da documentação. Confirme informações críticas.'
              : 'Modo demonstração — respostas de exemplo. Nenhuma chave ou API real em uso.'}
          </div>
        </div>
      )}
    </>
  );
}
