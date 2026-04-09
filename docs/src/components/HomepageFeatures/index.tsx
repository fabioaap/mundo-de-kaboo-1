import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  emoji: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Biblioteca Digital',
    emoji: '📖',
    description: (
      <>
        Acesso a livros em PDF com visualizador interativo estilo flipbook.
        Suporte a zoom, navegação por páginas e modo paisagem otimizado.
      </>
    ),
  },
  {
    title: 'Audiobooks & Vídeos',
    emoji: '🎧',
    description: (
      <>
        Player de áudio e vídeo integrados para conteúdo educacional
        multimídia, com controles intuitivos e progresso sincronizado.
      </>
    ),
  },
  {
    title: 'Organização por Coleções',
    emoji: '📁',
    description: (
      <>
        Organize conteúdo por categorias, nível escolar e tags personalizadas.
        Cada coleção possui tema visual único com cor personalizável.
      </>
    ),
  },
  {
    title: 'Busca Avançada',
    emoji: '🔍',
    description: (
      <>
        Sistema de busca em tempo real para encontrar coleções rapidamente
        por título, tema, personagens ou habilidades BNCC.
      </>
    ),
  },
  {
    title: 'Autenticação Segura',
    emoji: '🔒',
    description: (
      <>
        Sistema completo de autenticação via Supabase Auth com suporte a
        recuperação de senha e confirmação por e-mail.
      </>
    ),
  },
  {
    title: 'Design Responsivo',
    emoji: '📱',
    description: (
      <>
        Interface otimizada para desktop e dispositivos móveis. Navegação
        adaptativa com menu inferior em mobile e lateral em desktop.
      </>
    ),
  },
];

function Feature({title, emoji, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md">
        <div style={{fontSize: '3rem', marginBottom: '1rem'}}>{emoji}</div>
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
