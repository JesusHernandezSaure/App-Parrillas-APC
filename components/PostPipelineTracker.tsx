import React from 'react';
import { Post, PostStatus } from '../types';
import { 
  Check, Clock, AlertTriangle, AlertCircle, TrendingUp, CheckCircle2, 
  Layers, ArrowRight, Sparkles, Filter, ChevronRight
} from 'lucide-react';

export interface MacroStage {
  id: 'copy' | 'apc_review' | 'client_approval' | 'production' | 'ready';
  name: string;
  shortName: string;
  order: number;
  statuses: PostStatus[];
  description: string;
  colorTheme: {
    accent: string;
    bg: string;
    border: string;
    text: string;
    bar: string;
  };
}

export const MACRO_STAGES: MacroStage[] = [
  {
    id: 'copy',
    name: 'Redacción de Copy',
    shortName: '1. Copy',
    order: 0,
    statuses: ['Borrador', 'En Community', 'Ajustes de Copy'],
    description: 'Redacción inicial de copies in/out por el Community Manager',
    colorTheme: {
      accent: 'indigo',
      bg: 'bg-indigo-50/70',
      border: 'border-indigo-200',
      text: 'text-indigo-700',
      bar: 'bg-indigo-500'
    }
  },
  {
    id: 'apc_review',
    name: 'Filtro Interno APC',
    shortName: '2. Filtro APC',
    order: 1,
    statuses: ['Corrección de Copy', 'Revisión Médica', 'Esperando Ejecutivo'],
    description: 'Control de calidad ortotipográfico, rigor médico y filtro del ejecutivo',
    colorTheme: {
      accent: 'blue',
      bg: 'bg-blue-50/70',
      border: 'border-blue-200',
      text: 'text-blue-700',
      bar: 'bg-blue-500'
    }
  },
  {
    id: 'client_approval',
    name: 'Aprobación Cliente',
    shortName: '3. Cliente',
    order: 2,
    statuses: ['Aprobación Copy Cliente', 'Cambios solicitados por Cliente'],
    description: 'En manos del cliente para aprobación final de copys o solicitud de ajustes',
    colorTheme: {
      accent: 'purple',
      bg: 'bg-purple-50/70',
      border: 'border-purple-200',
      text: 'text-purple-700',
      bar: 'bg-purple-500'
    }
  },
  {
    id: 'production',
    name: 'Producción Arte / Video',
    shortName: '4. Producción',
    order: 3,
    statuses: [
      'Producción Arte',
      'Producción Audio/Video',
      'Corrección Material',
      'Revisión Médica Material',
      'Aprobación Interna Final',
      'Aprobación Material Cliente'
    ],
    description: 'Diseño gráfico, edición audiovisual y control de calidad final',
    colorTheme: {
      accent: 'amber',
      bg: 'bg-amber-50/70',
      border: 'border-amber-200',
      text: 'text-amber-700',
      bar: 'bg-amber-500'
    }
  },
  {
    id: 'ready',
    name: 'Listo para Publicar',
    shortName: '5. Listo',
    order: 4,
    statuses: ['Listo para Publicar', 'Programado', 'Publicado'],
    description: 'Material aprobado listo en repositorio o publicado en canales',
    colorTheme: {
      accent: 'emerald',
      bg: 'bg-emerald-50/70',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      bar: 'bg-emerald-500'
    }
  }
];

export function getMacroStageForStatus(status: PostStatus): MacroStage {
  const found = MACRO_STAGES.find(stage => stage.statuses.includes(status));
  return found || MACRO_STAGES[0];
}

/**
 * Calcula los días reales que un post lleva en su etapa actual
 * Revisa el historial de transiciones del post o sus marcas de tiempo
 */
export function getDaysInCurrentStage(post: Post): number {
  let entryDateStr = '';
  
  if (post.historial && post.historial.length > 0) {
    // Buscar la última intervención donde entró al estado actual
    const match = [...post.historial].reverse().find(h => h.newState === post.estado);
    if (match && match.date) {
      entryDateStr = match.date;
    } else {
      entryDateStr = post.historial[post.historial.length - 1].date;
    }
  }
  
  if (!entryDateStr) {
    entryDateStr = post.updatedAt || post.createdAt || '';
  }
  
  if (!entryDateStr) return 0;

  try {
    // Normalizar "YYYY-MM-DD HH:MM" a ISO
    const normalized = entryDateStr.includes('T') ? entryDateStr : entryDateStr.replace(' ', 'T');
    const entryTime = new Date(normalized).getTime();
    if (isNaN(entryTime)) return 0;

    const now = new Date().getTime();
    const diffMs = now - entryTime;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  } catch (e) {
    return 0;
  }
}

export type PacingType = 'ready' | 'ahead' | 'on_track' | 'warning' | 'delayed';

export interface PacingInfo {
  type: PacingType;
  label: string;
  badgeClass: string;
  daysUntilPublish: number;
  daysInStage: number;
}

/**
 * Evalúa si el post está adelantado, a tiempo, en riesgo de SLA o retrasado respecto a su fecha prevista
 */
export function getPostPacing(post: Post): PacingInfo {
  const daysInStage = getDaysInCurrentStage(post);
  const currentStage = getMacroStageForStatus(post.estado);

  if (post.estado === 'Listo para Publicar' || post.estado === 'Publicado' || post.estado === 'Programado') {
    return {
      type: 'ready',
      label: post.estado === 'Publicado' ? 'Publicado' : 'Listo',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      daysUntilPublish: 0,
      daysInStage
    };
  }

  let daysUntilPublish = 99;
  if (post.fechaPrevista) {
    const target = new Date(post.fechaPrevista).getTime();
    if (!isNaN(target)) {
      const now = new Date().getTime();
      daysUntilPublish = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    }
  }

  // Si faltan 3 días o menos para publicarse y aún no entra a producción (etapas 0, 1 o 2)
  if (daysUntilPublish <= 3 && currentStage.order <= 2) {
    return {
      type: 'delayed',
      label: 'Atrasado / Crítico',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
      daysUntilPublish,
      daysInStage
    };
  }

  // Si lleva 4 o más días en la misma etapa (cuello de botella de área)
  if (daysInStage >= 4) {
    return {
      type: 'warning',
      label: 'Cuello de Botella',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 font-semibold',
      daysUntilPublish,
      daysInStage
    };
  }

  // Si faltan 5 días o menos y está en etapas previas a producción
  if (daysUntilPublish <= 5 && currentStage.order < 3) {
    return {
      type: 'warning',
      label: 'Tiempo Justo',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      daysUntilPublish,
      daysInStage
    };
  }

  // Si ya está en producción o listo y faltan más de 7 días para su publicación
  if (currentStage.order >= 3 && daysUntilPublish >= 7) {
    return {
      type: 'ahead',
      label: 'Adelantado',
      badgeClass: 'bg-teal-50 text-teal-700 border-teal-200 font-semibold',
      daysUntilPublish,
      daysInStage
    };
  }

  return {
    type: 'on_track',
    label: 'A Tiempo',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    daysUntilPublish,
    daysInStage
  };
}

/**
 * COMPONENTE: Embudo Macro de la ODT (Pipeline General)
 */
interface OdtPipelineFunnelProps {
  posts: Post[];
  selectedStageId: string | null;
  onSelectStage: (stageId: string | null) => void;
}

export const OdtPipelineFunnel: React.FC<OdtPipelineFunnelProps> = ({
  posts,
  selectedStageId,
  onSelectStage
}) => {
  const total = posts.length;

  // Estadísticas por etapa
  const stageStats = MACRO_STAGES.map(stage => {
    const stagePosts = posts.filter(p => stage.statuses.includes(p.estado));
    const bottlenecks = stagePosts.filter(p => getDaysInCurrentStage(p) >= 4).length;
    const delayed = stagePosts.filter(p => getPostPacing(p).type === 'delayed').length;
    const percent = total > 0 ? Math.round((stagePosts.length / total) * 100) : 0;
    return {
      stage,
      count: stagePosts.length,
      percent,
      bottlenecks,
      delayed
    };
  });

  const totalReady = posts.filter(p => ['Listo para Publicar', 'Programado', 'Publicado'].includes(p.estado)).length;
  const totalDelayed = posts.filter(p => getPostPacing(p).type === 'delayed').length;
  const totalBottlenecks = posts.filter(p => getDaysInCurrentStage(p) >= 4).length;
  const overallProgress = total > 0 ? Math.round((totalReady / total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
      {/* Header del Embudo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Embudo y Mapa de Etapas de la Parrilla
              </h4>
              <p className="text-xs text-slate-500">
                Supervisa el flujo de cada post, días de permanencia y cuellos de botella
              </p>
            </div>
          </div>
        </div>

        {/* Resumen de salud global */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {totalDelayed > 0 && (
            <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-bold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              {totalDelayed} con retraso crítico
            </span>
          )}
          {totalBottlenecks > 0 && (
            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-300 font-bold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              {totalBottlenecks} con &gt;3 días en etapa
            </span>
          )}
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {totalReady}/{total} listos ({overallProgress}%)
          </span>
        </div>
      </div>

      {/* Grid de Etapas del Embudo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {stageStats.map(({ stage, count, percent, bottlenecks, delayed }) => {
          const isSelected = selectedStageId === stage.id;

          return (
            <button
              key={stage.id}
              onClick={() => onSelectStage(isSelected ? null : stage.id)}
              className={`p-3 rounded-xl border text-left transition-all relative group cursor-pointer ${
                isSelected 
                  ? 'ring-2 ring-indigo-600 bg-indigo-50/60 border-indigo-300 shadow-xs' 
                  : 'bg-slate-50/70 hover:bg-slate-100/90 border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1">
                <span className="truncate">{stage.shortName}</span>
                {bottlenecks > 0 && (
                  <span 
                    title={`${bottlenecks} post(s) con más de 3 días en esta etapa`}
                    className="w-2 h-2 rounded-full bg-amber-500 animate-ping"
                  />
                )}
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-slate-900">{count}</span>
                <span className="text-xs font-semibold text-slate-500">{percent}%</span>
              </div>

              {/* Barra de progreso de la fase */}
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${stage.colorTheme.bar}`}
                  style={{ width: `${percent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5">
                <span>{count === 1 ? '1 post' : `${count} posts`}</span>
                {delayed > 0 ? (
                  <span className="text-rose-600 font-bold">{delayed} retraso</span>
                ) : bottlenecks > 0 ? (
                  <span className="text-amber-700 font-semibold">{bottlenecks} en riesgo</span>
                ) : count > 0 ? (
                  <span className="text-emerald-600 font-medium">Al día</span>
                ) : (
                  <span className="text-slate-400">Sin posts</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Banner si hay un filtro de etapa activo */}
      {selectedStageId && (
        <div className="flex items-center justify-between text-xs bg-indigo-50/80 px-3.5 py-2 rounded-xl border border-indigo-200 text-indigo-900">
          <span className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            Filtrando posts en etapa: <strong>{MACRO_STAGES.find(s => s.id === selectedStageId)?.name}</strong>
          </span>
          <button
            onClick={() => onSelectStage(null)}
            className="text-xs font-bold text-indigo-700 hover:text-indigo-950 underline cursor-pointer"
          >
            Ver todas las etapas
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * COMPONENTE: Mapa de Etapas Individual y SLA para cada Tarjeta de Post
 */
interface PostStageMapProps {
  post: Post;
}

export const PostStageMap: React.FC<PostStageMapProps> = ({ post }) => {
  const currentStage = getMacroStageForStatus(post.estado);
  const currentStageIndex = currentStage.order;
  const daysInStage = getDaysInCurrentStage(post);
  const pacing = getPostPacing(post);

  return (
    <div className="w-full bg-slate-50/90 rounded-xl p-3 border border-slate-200/90 mt-2.5">
      {/* Header del Stepper: Etapa Actual + SLA Días + Semáforo de Ritmo */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 pb-2 border-b border-slate-200/70">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Fase Actual:
          </span>
          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
            </span>
            <span>{currentStage.name}</span>
            <span className="text-slate-400 font-normal">•</span>
            <span className="text-slate-600 font-medium">({post.estado})</span>
          </span>
        </div>

        {/* Badges de Días en Etapa y Ritmo */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Badge: Días de Permanencia en esta Etapa */}
          {daysInStage === 0 ? (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold" title="Inició o cambió a este estado hoy">
              <Clock className="w-3 h-3 text-emerald-600" />
              <span>Hoy (&lt; 24h en etapa)</span>
            </span>
          ) : daysInStage === 1 ? (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold" title="Lleva 1 día en este estado">
              <Clock className="w-3 h-3 text-emerald-600" />
              <span>1 día en esta etapa</span>
            </span>
          ) : daysInStage <= 3 ? (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-300 font-semibold" title={`Lleva ${daysInStage} días en este estado`}>
              <Clock className="w-3 h-3 text-amber-600" />
              <span>{daysInStage} días en esta etapa</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-300 font-bold animate-pulse" title={`Alerta de cuello de botella: ${daysInStage} días esperando en esta etapa`}>
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              <span>{daysInStage} días en esta etapa (Cuello de botella)</span>
            </span>
          )}

          {/* Badge: Ritmo vs Fecha Prevista */}
          <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border ${pacing.badgeClass}`}>
            {pacing.type === 'ready' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
            {pacing.type === 'ahead' && <TrendingUp className="w-3 h-3 text-teal-600" />}
            {pacing.type === 'on_track' && <Check className="w-3 h-3 text-slate-500" />}
            {pacing.type === 'warning' && <Clock className="w-3 h-3 text-amber-600" />}
            {pacing.type === 'delayed' && <AlertCircle className="w-3 h-3 text-rose-600" />}
            <span>{pacing.label}</span>
          </span>
        </div>
      </div>

      {/* Stepper Horizontal de 5 Etapas Conectadas */}
      <div className="grid grid-cols-5 gap-1.5 pt-1">
        {MACRO_STAGES.map((stage, idx) => {
          const isCompleted = idx < currentStageIndex;
          const isCurrent = idx === currentStageIndex;
          const isPending = idx > currentStageIndex;

          return (
            <div key={stage.id} className="flex flex-col items-center text-center relative group">
              {/* Barra conectora horizontal detrás del círculo */}
              {idx > 0 && (
                <div 
                  className={`absolute top-2.5 -left-1/2 w-full h-0.5 -z-0 transition-colors ${
                    idx <= currentStageIndex ? 'bg-emerald-400' : 'bg-slate-200'
                  }`} 
                />
              )}

              {/* Indicador circular de la etapa */}
              <div 
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold z-10 transition-all ${
                  isCompleted 
                    ? 'bg-emerald-600 text-white shadow-2xs' 
                    : isCurrent 
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 shadow-xs' 
                      : 'bg-white border-2 border-slate-300 text-slate-400'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-3 h-3 text-white stroke-[3]" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>

              {/* Etiqueta del paso */}
              <span className={`text-[10px] sm:text-[11px] mt-1.5 font-semibold truncate max-w-full ${
                isCompleted 
                  ? 'text-emerald-700' 
                  : isCurrent 
                    ? 'text-indigo-900 font-extrabold' 
                    : 'text-slate-400 font-normal'
              }`}>
                {stage.shortName}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
