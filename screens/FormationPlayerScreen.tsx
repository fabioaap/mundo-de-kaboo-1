import React, { useEffect, useState } from 'react';
import { Icons } from '../components/Icons';
import { api } from '../lib/api';
import { Formation, FormationLesson, ScreenName } from '../types';

interface FormationPlayerScreenProps {
  formationId: string;
  onBack: () => void;
  onNavigate: (screen: ScreenName, params?: Record<string, unknown>) => void;
}

const getYouTubeVideoId = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const shortMatch = value.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/i);
  if (shortMatch?.[1]) {
    return shortMatch[1];
  }

  const watchMatch = value.match(/[?&]v=([A-Za-z0-9_-]{6,})/i);
  if (watchMatch?.[1]) {
    return watchMatch[1];
  }

  const embedMatch = value.match(/(?:embed|shorts)\/([A-Za-z0-9_-]{6,})/i);
  if (embedMatch?.[1]) {
    return embedMatch[1];
  }

  return null;
};

const LessonVideo: React.FC<{ lesson: FormationLesson }> = ({ lesson }) => {
  const youTubeId = getYouTubeVideoId(lesson.video_url);

  if (!lesson.video_url && lesson.pdf_url) {
    return (
      <div className="w-full overflow-hidden rounded-[20px] border border-brand-primary/10 shadow-[0_16px_34px_rgba(15,23,42,0.12)]" style={{ height: '60vh' }}>
        <iframe
          src={lesson.pdf_url}
          title={lesson.title}
          className="h-full w-full"
        />
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-[20px] border border-brand-primary/10 bg-black shadow-[0_16px_34px_rgba(15,23,42,0.12)]">
      <div className="aspect-video w-full">
        {!lesson.video_url ? (
          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(180deg,#143043,#0C1A34)] text-white/70">
            <span className="text-sm font-bold">Esta aula não possui vídeo.</span>
          </div>
        ) : youTubeId ? (
          <iframe
            src={`https://www.youtube.com/embed/${youTubeId}`}
            title={lesson.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video src={lesson.video_url} controls className="h-full w-full bg-black" />
        )}
      </div>
    </div>
  );
};

const LessonList: React.FC<{
  lessons: FormationLesson[];
  activeIndex: number;
  completedIds: string[];
  onSelect: (index: number) => void;
}> = ({ lessons, activeIndex, completedIds, onSelect }) => (
  <ul className="flex flex-col gap-2">
    {lessons.map((lesson, index) => {
      const isActive = index === activeIndex;
      const isDone = completedIds.includes(lesson.id);

      return (
        <li key={lesson.id}>
          <button
            type="button"
            onClick={() => onSelect(index)}
            className={`flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors ${isActive
              ? 'border-brand-primary/25 bg-brand-primary/[0.08] shadow-sm'
              : 'border-brand-primary/10 bg-white hover:border-brand-primary/25 hover:bg-brand-primary/[0.03]'
              }`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-black ${isDone
                ? 'bg-green-500 text-white'
                : isActive
                  ? 'bg-brand-primary text-white'
                  : 'bg-brand-primary/[0.08] text-brand-primary/70'
                }`}
            >
              {isDone ? <Icons.Check size={14} className="stroke-[3]" /> : index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block text-[0.92rem] font-bold leading-tight line-clamp-2 ${isActive ? 'text-brand-primary' : 'text-gray-700'}`}>
                {lesson.title}
              </span>
              {isActive && (
                <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.16em] text-brand-primary/70">
                  <Icons.Play size={10} className="fill-current stroke-none" />
                  Em exibição
                </span>
              )}
            </span>
          </button>
        </li>
      );
    })}
  </ul>
);

export const FormationPlayerScreen: React.FC<FormationPlayerScreenProps> = ({ formationId, onBack }) => {
  const [formation, setFormation] = useState<Formation | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [progressPercent, setProgressPercent] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);

  useEffect(() => {
    let isActive = true;
    setLoading(true);
    api.getFormationById(formationId)
      .then(async (f) => {
        if (!isActive) return;
        setFormation(f);
        setLoading(false);

        if (!f) return;
        const progress = await api.getFormationProgress(formationId);
        if (!isActive || !progress) return;
        setCompletedLessonIds(progress.completed_lesson_ids ?? []);
        setProgressPercent(progress.progress_percent ?? 0);
        if (progress.last_lesson_id) {
          const idx = f.lessons?.findIndex((l) => l.id === progress.last_lesson_id) ?? -1;
          if (idx >= 0) setActiveLessonIndex(idx);
        }
      })
      .catch(() => {
        if (!isActive) return;
        setLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [formationId]);

  const handleLessonChange = (newIndex: number) => {
    setActiveLessonIndex(newIndex);
    const lesson = formation?.lessons?.[newIndex];
    if (lesson) {
      api.saveFormationProgress({
        formationId,
        completedLessonIds,
        lastLessonId: lesson.id,
        progressPercent,
      }).catch(() => {});
    }
  };

  const handleToggleComplete = async () => {
    const lessons = formation?.lessons ?? [];
    const lesson = lessons[activeLessonIndex];
    if (!lesson) return;

    const result = await api.toggleLessonComplete(
      formationId,
      lesson.id,
      lessons,
      completedLessonIds,
    );
    setCompletedLessonIds(result.completedLessonIds);
    setProgressPercent(result.progressPercent);
  };

  if (loading) {
    return (
      <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-4 bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-primary/30 border-t-brand-primary" />
        <p className="text-sm font-bold text-gray-500">Carregando formação...</p>
      </div>
    );
  }

  if (!formation) {
    return (
      <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-4 bg-white px-6 text-center">
        <p className="text-base font-black text-gray-700">Não foi possível abrir esta formação.</p>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full border border-brand-primary/20 bg-white px-5 py-2.5 text-sm font-bold text-brand-primary transition-colors hover:bg-brand-primary/[0.06]"
        >
          <Icons.ChevronLeft size={16} />
          Voltar para Formações
        </button>
      </div>
    );
  }

  const lessons = formation.lessons ?? [];
  const hasLessons = lessons.length > 0;
  const safeIndex = Math.min(activeLessonIndex, Math.max(0, lessons.length - 1));
  const activeLesson = hasLessons ? lessons[safeIndex] : null;
  const isFirst = safeIndex === 0;
  const isLast = safeIndex === lessons.length - 1;

  const breadcrumb = (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-primary/70 transition-colors hover:text-brand-primary"
    >
      <Icons.ChevronLeft size={16} />
      Formações
    </button>
  );

  if (!hasLessons) {
    return (
      <div className="flex h-full flex-col bg-white pb-24 md:pb-0">
        <div className="px-4 pt-4 md:px-8 md:pt-6">{breadcrumb}</div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <Icons.BookOpen size={40} className="text-brand-primary/40" />
          <h1 className="text-lg font-black text-gray-800">{formation.title}</h1>
          <p className="max-w-md text-sm text-gray-500">Este curso não possui aulas ainda.</p>
        </div>
      </div>
    );
  }

  const isActiveLessonDone = activeLesson ? completedLessonIds.includes(activeLesson.id) : false;

  const lessonContent = activeLesson && (
    <>
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-[11px] font-black uppercase tracking-[0.16em] text-brand-primary/60">
          <span>Progresso do curso</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-primary/10">
          <div
            className="h-full rounded-full bg-brand-primary transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <LessonVideo lesson={activeLesson} />

      <div className="mt-5">
        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-primary/60">
          Aula {safeIndex + 1} de {lessons.length}
        </span>
        <h2 className="mt-1.5 text-xl font-black leading-tight text-gray-800 md:text-2xl">{activeLesson.title}</h2>
        {activeLesson.description && (
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{activeLesson.description}</p>
        )}
      </div>

      {activeLesson.pdf_url && (
        <a
          href={activeLesson.pdf_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-brand-primary/20 bg-white px-4 py-2.5 text-sm font-bold text-brand-primary transition-colors hover:bg-brand-primary/[0.06]"
        >
          <Icons.FileText size={16} />
          Abrir PDF
          <Icons.ExternalLink size={14} className="opacity-60" />
        </a>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleToggleComplete}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-black transition-colors ${isActiveLessonDone
            ? 'border border-green-500/30 bg-green-50 text-green-700 hover:bg-green-100'
            : 'bg-brand-primary text-white hover:bg-brand-primary/90'
            }`}
        >
          <Icons.CheckCircle size={16} />
          {isActiveLessonDone ? 'Concluída' : 'Marcar como concluída'}
        </button>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-brand-primary/10 pt-5">
        <button
          type="button"
          onClick={() => handleLessonChange(safeIndex - 1)}
          disabled={isFirst}
          className="inline-flex items-center gap-1.5 rounded-full border border-brand-primary/15 bg-white px-4 py-2.5 text-sm font-bold text-brand-primary transition-colors enabled:hover:bg-brand-primary/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Icons.ChevronLeft size={16} />
          Anterior
        </button>
        {isLast ? (
          // Última aula: em vez de um "Próxima" morto (desabilitado), fecha o ciclo com
          // um CTA de conclusão que devolve o usuário à biblioteca de Formações.
          <button
            type="button"
            onClick={() => setShowCompletion(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-primary px-5 py-2.5 text-sm font-black text-white transition-colors hover:bg-brand-primary/90"
          >
            <Icons.CheckCircle size={16} />
            Concluir curso
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleLessonChange(safeIndex + 1)}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-primary px-5 py-2.5 text-sm font-black text-white transition-colors hover:bg-brand-primary/90"
          >
            Próxima
            <Icons.ChevronRight size={16} />
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-full flex-col bg-white pb-24 md:pb-0">
      <div className="flex flex-1 flex-col md:flex-row md:overflow-hidden">
        {/* Conteúdo da aula */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 md:px-8 md:pt-6">
          {breadcrumb}
          <div className="mt-4">{lessonContent}</div>

          {/* Lista de aulas — mobile (abaixo do conteúdo) */}
          <div className="mt-8 md:hidden">
            <h3 className="mb-3 text-sm font-black uppercase tracking-[0.16em] text-brand-primary/60">
              Aulas do curso
            </h3>
            <LessonList lessons={lessons} activeIndex={safeIndex} completedIds={completedLessonIds} onSelect={handleLessonChange} />
          </div>
        </div>

        {/* Painel lateral de aulas — desktop */}
        <aside className="hidden w-[360px] shrink-0 flex-col border-l border-brand-primary/10 bg-[#fcfbfd] md:flex">
          <div className="border-b border-brand-primary/10 px-5 py-5">
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-primary/60">Curso</span>
            <h2 className="mt-1 text-lg font-black leading-tight text-gray-800">{formation.title}</h2>
            <p className="mt-1 text-xs text-gray-500">{lessons.length} {lessons.length === 1 ? 'aula' : 'aulas'}</p>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <LessonList lessons={lessons} activeIndex={safeIndex} completedIds={completedLessonIds} onSelect={handleLessonChange} />
          </div>
        </aside>
      </div>

      {showCompletion && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-label="Curso concluído"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={onBack}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="h-1.5 w-full bg-gradient-to-r from-[#5D1F58] via-[#883E82] to-[#EA9A3B]" />
            <div className="px-8 pb-8 pt-9 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-600 ring-1 ring-green-100">
                <Icons.CheckCircle size={36} />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-primary/70">
                Curso concluído
              </p>
              <h2 className="mt-2 text-2xl font-black leading-tight text-gray-900">
                {formation.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                Você concluiu todas as {lessons.length} {lessons.length === 1 ? 'aula' : 'aulas'} deste curso.
                Continue explorando as formações para levar mais recursos para a sua prática.
              </p>
              <button
                type="button"
                onClick={onBack}
                className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-primary px-6 py-3 text-sm font-black text-white transition-colors hover:bg-brand-primary/90"
              >
                Voltar às Formações
                <Icons.ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
