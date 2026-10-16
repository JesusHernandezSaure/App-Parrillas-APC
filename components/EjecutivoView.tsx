import React, { useState, useMemo } from 'react';
import { Client, ODT, Post, User, PostStatus } from '../types';
import { 
  Building2, Layers, Folder, FolderOpen, Plus, ChevronRight, CheckCircle2, 
  Clock, AlertTriangle, ShieldCheck, ExternalLink, ShieldAlert, Send, 
  Search, Filter, Sparkles, UserCheck, Calendar, ArrowRight, TrendingUp, AlertCircle,
  Copy, RefreshCw, X, Share2, Globe, Edit3, CheckSquare, Palette, Video, FileText
} from 'lucide-react';
import { 
  OdtPipelineFunnel, PostStageMap, MACRO_STAGES, getMacroStageForStatus, 
  getDaysInCurrentStage, getPostPacing 
} from './PostPipelineTracker';
import { RichTextDisplay, stripHtml } from './RichTextDisplay';
import { PostContentFourPanels } from './PostContentFourPanels';

export type Level3StageKey = 'all' | 'copy' | 'correction' | 'waiting_exec' | 'with_client' | 'production' | 'ready_publish' | 'published' | 'delayed';

export const LEVEL3_STAGES_CONFIG: {
  id: Level3StageKey;
  label: string;
  shortLabel: string;
  description: string;
  iconName: 'copy' | 'correction' | 'waiting_exec' | 'with_client' | 'production' | 'ready_publish' | 'published' | 'delayed';
  color: {
    badge: string;
    text: string;
    border: string;
    activeRing: string;
    bgIcon: string;
  };
}[] = [
  {
    id: 'copy',
    label: 'Post en Copy',
    shortLabel: '1. Copy',
    description: 'En redacción Community',
    iconName: 'copy',
    color: {
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      text: 'text-indigo-600',
      border: 'border-slate-200 hover:border-indigo-400',
      activeRing: 'ring-2 ring-indigo-500 border-indigo-400 bg-indigo-50/20 shadow-xs scale-[1.02]',
      bgIcon: 'bg-indigo-50 text-indigo-600'
    }
  },
  {
    id: 'correction',
    label: 'Post en Corrección',
    shortLabel: '2. Corrección',
    description: 'Revisión médica y estilo',
    iconName: 'correction',
    color: {
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      text: 'text-blue-600',
      border: 'border-slate-200 hover:border-blue-400',
      activeRing: 'ring-2 ring-blue-500 border-blue-400 bg-blue-50/20 shadow-xs scale-[1.02]',
      bgIcon: 'bg-blue-50 text-blue-700'
    }
  },
  {
    id: 'waiting_exec',
    label: 'Listos para Enviar',
    shortLabel: '3. A Cliente',
    description: '¡Acción Ejecutiva!',
    iconName: 'waiting_exec',
    color: {
      badge: 'bg-amber-100 text-amber-900 border-amber-300 font-black',
      text: 'text-amber-700',
      border: 'border-amber-300 hover:border-amber-500 bg-amber-50/30',
      activeRing: 'ring-2 ring-amber-500 border-amber-500 bg-amber-50/40 shadow-xs scale-[1.02]',
      bgIcon: 'bg-amber-500 text-slate-950 font-bold'
    }
  },
  {
    id: 'with_client',
    label: 'Posts con Cliente',
    shortLabel: '4. Con Cliente',
    description: 'Aprobación o cambios',
    iconName: 'with_client',
    color: {
      badge: 'bg-purple-50 text-purple-700 border-purple-200',
      text: 'text-purple-600',
      border: 'border-slate-200 hover:border-purple-400',
      activeRing: 'ring-2 ring-purple-500 border-purple-400 bg-purple-50/20 shadow-xs scale-[1.02]',
      bgIcon: 'bg-purple-50 text-purple-700'
    }
  },
  {
    id: 'production',
    label: 'En Producción',
    shortLabel: '5. Producción',
    description: 'Arte visual y video',
    iconName: 'production',
    color: {
      badge: 'bg-pink-50 text-pink-700 border-pink-200',
      text: 'text-pink-600',
      border: 'border-slate-200 hover:border-pink-400',
      activeRing: 'ring-2 ring-pink-500 border-pink-400 bg-pink-50/20 shadow-xs scale-[1.02]',
      bgIcon: 'bg-pink-50 text-pink-700'
    }
  },
  {
    id: 'ready_publish',
    label: 'Listos Publicar',
    shortLabel: '6. Listos',
    description: 'Autorizados y listos',
    iconName: 'ready_publish',
    color: {
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      text: 'text-emerald-700',
      border: 'border-slate-200 hover:border-emerald-400',
      activeRing: 'ring-2 ring-emerald-500 border-emerald-400 bg-emerald-50/20 shadow-xs scale-[1.02]',
      bgIcon: 'bg-emerald-50 text-emerald-700'
    }
  },
  {
    id: 'published',
    label: 'Publicados',
    shortLabel: '7. Al Aire',
    description: 'Concluidos al 100%',
    iconName: 'published',
    color: {
      badge: 'bg-teal-50 text-teal-700 border-teal-200',
      text: 'text-teal-700',
      border: 'border-slate-200 hover:border-teal-400',
      activeRing: 'ring-2 ring-teal-500 border-teal-400 bg-teal-50/20 shadow-xs scale-[1.02]',
      bgIcon: 'bg-teal-50 text-teal-700'
    }
  },
  {
    id: 'delayed',
    label: 'Demorados (+3 días)',
    shortLabel: '8. Demorados',
    description: 'Estancados (¡Presionar!)',
    iconName: 'delayed',
    color: {
      badge: 'bg-rose-100 text-rose-800 border-rose-300 font-black animate-pulse',
      text: 'text-rose-600',
      border: 'border-rose-300 hover:border-rose-500 bg-rose-50/30',
      activeRing: 'ring-2 ring-rose-500 border-rose-500 bg-rose-50/40 shadow-xs scale-[1.02]',
      bgIcon: 'bg-rose-500 text-white font-bold'
    }
  }
];

interface EjecutivoViewProps {
  clients: Client[];
  odts: ODT[];
  posts: Post[];
  currentUser: User;
  onOpenCreateOdt: (clientId?: string) => void;
  onOpenCreatePost: (odt: ODT) => void;
  onSelectPost: (post: Post) => void;
  onOpenIntervention: (post: Post) => void;
  onSendToClientApproval: (post: Post, odt: ODT) => void;
  onOpenApprovalModal?: (post: Post, type: 'aprobacion_interna_final' | 'esperando_ejecutivo') => void;
  onSendToReview?: (post: Post, odt: ODT) => void;
  onOpenPublishModal?: (post: Post) => void;
  onDuplicatePost?: (post: Post, newRedSocial: string) => void;
  onRecyclePost?: (post: Post) => void;
  canCreateOdt?: boolean;
  selectedClientId?: string;
  selectedOdtId?: string;
  onSelectClient: (clientId: string | null) => void;
  onSelectOdt: (odtId: string | null) => void;
}

export const EjecutivoView: React.FC<EjecutivoViewProps> = ({
  clients,
  odts,
  posts,
  currentUser,
  onOpenCreateOdt,
  onOpenCreatePost,
  onSelectPost,
  onOpenIntervention,
  onSendToClientApproval,
  onOpenApprovalModal,
  onSendToReview,
  onOpenPublishModal,
  onDuplicatePost,
  onRecyclePost,
  canCreateOdt,
  selectedClientId,
  selectedOdtId,
  onSelectClient,
  onSelectOdt
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedFunnelStage, setSelectedFunnelStage] = useState<string | null>(null);
  const [pacingFilter, setPacingFilter] = useState<string>('all');
  const [duplicatingPost, setDuplicatingPost] = useState<Post | null>(null);
  const [targetDuplicateRed, setTargetDuplicateRed] = useState('Instagram');

  // Estados para el Panel Adaptativo de 3 Niveles
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current');
  const [selectedOdtCardFilter, setSelectedOdtCardFilter] = useState<'all' | 'created' | 'published' | 'carry_over'>('all');
  const [selectedLevel3Stage, setSelectedLevel3Stage] = useState<Level3StageKey>('all');

  const isOdtCreator = canCreateOdt !== false && (currentUser.role === 'Ejecutivo' || currentUser.role === 'Admin');

  // Clientes asignados a este ejecutivo (o todos si es Admin, Super Admin o Community)
  const myClients = useMemo(() => {
    if (currentUser.role === 'Admin' || currentUser.role === 'Super Admin' || currentUser.role === 'Community') return clients;
    return clients.filter(c => 
      c.ejecutivoId === currentUser.id ||
      odts.some(o => o.clientId === c.id && (
        o.ejecutivoId === currentUser.id ||
        (o.ejecutivoName && o.ejecutivoName.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
      ))
    );
  }, [clients, currentUser, odts]);

  const activeClient = useMemo(() => {
    if (!selectedClientId) return null;
    return myClients.find(c => c.id === selectedClientId) || null;
  }, [myClients, selectedClientId]);

  // ODTs del cliente seleccionado (o de todos si no hay seleccionado)
  const clientOdts = useMemo(() => {
    let list = odts;
    if (currentUser.role === 'Ejecutivo') {
      list = list.filter(o => 
        o.ejecutivoId === currentUser.id || 
        (o.ejecutivoName && o.ejecutivoName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) ||
        myClients.some(c => c.id === o.clientId && c.ejecutivoId === currentUser.id)
      );
    }
    if (!selectedClientId) return list.filter(o => myClients.some(c => c.id === o.clientId));
    return list.filter(o => o.clientId === selectedClientId);
  }, [odts, selectedClientId, myClients, currentUser]);

  const activeOdt = useMemo(() => {
    if (!selectedOdtId) return null;
    return odts.find(o => o.id === selectedOdtId) || null;
  }, [odts, selectedOdtId]);

  // Posts totales de la ODT activa (para alimentar el embudo)
  const activeOdtPosts = useMemo(() => {
    if (!activeOdt) return [];
    return posts.filter(p => p.odtId === activeOdt.id);
  }, [posts, activeOdt]);

  // --- REGLAS OPERATIVAS DEL NIVEL 3 (PARRILLA) ---
  const isPostDelayed = (p: Post) => {
    return getDaysInCurrentStage(p) >= 3;
  };

  const getPostLevel3Stage = (p: Post): 'copy' | 'correction' | 'waiting_exec' | 'with_client' | 'production' | 'ready_publish' | 'published' => {
    if (p.estado === 'Publicado') return 'published';
    if (['Aprobación Interna Final', 'Listo para Publicar', 'Programado'].includes(p.estado)) return 'ready_publish';
    if (['Diseño de Editables (Arte)', 'Producción Arte', 'Producción Audio/Video'].includes(p.estado)) return 'production';
    if (['Aprobación Copy Cliente', 'Aprobación Material Cliente', 'Cambios solicitados por Cliente'].includes(p.estado)) return 'with_client';
    if (p.estado === 'Esperando Ejecutivo') return 'waiting_exec';
    if (['Revisión Médica', 'Corrección de Copy', 'Corrección Material', 'Revisión Médica Material'].includes(p.estado)) return 'correction';
    return 'copy'; // 'Borrador', 'En Community', 'Ajustes de Copy'
  };

  const renderLevel3Icon = (iconName: string) => {
    switch (iconName) {
      case 'copy': return <Edit3 className="w-3.5 h-3.5 text-indigo-600" />;
      case 'correction': return <CheckSquare className="w-3.5 h-3.5 text-blue-600" />;
      case 'waiting_exec': return <Send className="w-3.5 h-3.5 text-amber-900" />;
      case 'with_client': return <Building2 className="w-3.5 h-3.5 text-purple-600" />;
      case 'production': return <Palette className="w-3.5 h-3.5 text-pink-600" />;
      case 'ready_publish': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'published': return <Globe className="w-3.5 h-3.5 text-teal-600" />;
      case 'delayed': return <AlertTriangle className="w-3.5 h-3.5 text-white" />;
      default: return <Sparkles className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  // --- REGLAS OPERATIVAS DE PERIODOS Y ARRASTRE CRONOLÓGICO (NIVELES 1 Y 2) ---
  const SPANISH_MONTHS_MAP: Record<string, number> = {
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
    julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12
  };

  /**
   * Obtiene el índice cronológico absoluto (año * 12 + mes) a partir de un texto (ej: "Noviembre 2026", "2026-11-01")
   * Permite evaluar matemáticamente si un período es anterior (<), igual (===) o posterior (>) a otro.
   */
  const getPeriodChronologicalIndex = (periodStr?: string | null): number | null => {
    if (!periodStr || !periodStr.trim()) return null;
    const str = periodStr.toLowerCase().trim();

    // 1. Extraer año de 4 dígitos
    const yearMatch = str.match(/\b(20\d\d)\b/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();

    // 2. Extraer nombre de mes en español
    for (const [monthName, monthIndex] of Object.entries(SPANISH_MONTHS_MAP)) {
      if (str.includes(monthName)) {
        return year * 12 + monthIndex;
      }
    }

    // 3. Extraer formato numérico tipo "YYYY-MM" o "YYYY-MM-DD"
    const dateMatch = str.match(/(20\d\d)[-/](\d{1,2})/);
    if (dateMatch) {
      const y = parseInt(dateMatch[1], 10);
      const m = parseInt(dateMatch[2], 10);
      if (m >= 1 && m <= 12) {
        return y * 12 + m;
      }
    }

    return null;
  };

  /**
   * Obtiene el índice cronológico de una ODT usando mesPeriodo, fechaObjetivo o createdAt
   */
  const getOdtChronologicalIndex = (odt: ODT): number | null => {
    if (odt.mesPeriodo) {
      const idx = getPeriodChronologicalIndex(odt.mesPeriodo);
      if (idx !== null) return idx;
    }
    if (odt.fechaObjetivo) {
      const idx = getPeriodChronologicalIndex(odt.fechaObjetivo);
      if (idx !== null) return idx;
    }
    if (odt.createdAt) {
      const idx = getPeriodChronologicalIndex(odt.createdAt);
      if (idx !== null) return idx;
    }
    return null;
  };

  const availablePeriods = useMemo(() => {
    const set = new Set<string>();
    odts.forEach(o => {
      if (o.mesPeriodo && o.mesPeriodo.trim()) {
        set.add(o.mesPeriodo.trim());
      }
    });

    // Incluir mes actual de sistema si no existe en las ODTs
    const now = new Date();
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const currentMonthLabel = `${months[now.getMonth()]} ${now.getFullYear()}`;
    set.add(currentMonthLabel);

    // Ordenar cronológicamente (de más antiguo a más futuro)
    return Array.from(set).sort((a, b) => {
      const idxA = getPeriodChronologicalIndex(a) ?? 0;
      const idxB = getPeriodChronologicalIndex(b) ?? 0;
      return idxA - idxB;
    });
  }, [odts]);

  const defaultPeriod = useMemo(() => {
    const now = new Date();
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const currentMonthName = months[now.getMonth()];
    const currentYear = now.getFullYear();
    const currentStr = `${currentMonthName} ${currentYear}`;
    
    // Si existe el mes actual en availablePeriods, seleccionarlo
    const found = availablePeriods.find(p => p.toLowerCase().includes(currentMonthName.toLowerCase()) && p.includes(currentYear.toString()));
    if (found) return found;
    return currentStr;
  }, [availablePeriods]);

  const activePeriodName = useMemo(() => {
    if (selectedPeriod === 'current') return defaultPeriod;
    if (selectedPeriod === 'all') return 'Todas las fechas';
    return selectedPeriod;
  }, [selectedPeriod, defaultPeriod]);

  const isOdtPublished = (odt: ODT) => {
    if (odt.estadoGeneral === 'Completado') return true;
    const odtPosts = posts.filter(p => p.odtId === odt.id);
    return odtPosts.length > 0 && odtPosts.every(p => p.publicado || p.estado === 'Publicado');
  };

  const isOdtInPeriod = (odt: ODT) => {
    if (selectedPeriod === 'all') return true;

    // Comparar por índice cronológico exacto
    const activeIdx = getPeriodChronologicalIndex(activePeriodName);
    const odtIdx = getOdtChronologicalIndex(odt);
    if (activeIdx !== null && odtIdx !== null) {
      return activeIdx === odtIdx;
    }

    // Fallback por texto
    const periodToMatch = activePeriodName.toLowerCase().trim();
    if (odt.mesPeriodo && odt.mesPeriodo.toLowerCase().trim() === periodToMatch) return true;
    if (odt.createdAt && odt.createdAt.includes(activePeriodName)) return true;
    return false;
  };

  /**
   * REGLA ESTRICTA DE ARRASTRE:
   * 1. Una ODT completada/publicada al 100% NUNCA es arrastre.
   * 2. ÚNICAMENTE es arrastre si su período asignado es ESTRICTAMENTE ANTERIOR al período activo.
   *    Los meses futuros (ej: Noviembre o Diciembre cuando estás en Octubre) NUNCA son arrastre.
   * 3. Si se visualiza "Todas las fechas", arrastre son aquellas cuya fecha objetivo ya pasó respecto a hoy.
   */
  const isOdtCarryOver = (odt: ODT) => {
    // 1. Si ya está completada/publicada al 100%, no es arrastre
    if (isOdtPublished(odt)) return false;

    // 2. Si estamos en "Todas las fechas"
    if (selectedPeriod === 'all') {
      if (odt.fechaObjetivo) {
        const targetDate = new Date(odt.fechaObjetivo).getTime();
        const today = new Date().setHours(0, 0, 0, 0);
        return !isNaN(targetDate) && targetDate < today;
      }
      return false;
    }

    const activeIdx = getPeriodChronologicalIndex(activePeriodName);
    const odtIdx = getOdtChronologicalIndex(odt);

    // 3. Comparación cronológica estricta:
    // SOLO es arrastre si el período de la ODT es MENOR (anterior) al mes activo
    if (activeIdx !== null && odtIdx !== null) {
      return odtIdx < activeIdx;
    }

    // 4. Si la ODT no tiene mesPeriodo pero tiene fechaObjetivo
    if (odt.fechaObjetivo && activeIdx !== null) {
      const targetIdx = getPeriodChronologicalIndex(odt.fechaObjetivo);
      if (targetIdx !== null) {
        return targetIdx < activeIdx;
      }
    }

    return false;
  };

  // ODTs filtradas para métricas según el nivel (Nivel 1: todas; Nivel 2: cliente seleccionado)
  const scopedOdtsForMetrics = useMemo(() => {
    if (activeClient) {
      return clientOdts.filter(o => o.clientId === activeClient.id);
    }
    return clientOdts;
  }, [clientOdts, activeClient]);

  // Métricas para Niveles 1 y 2
  const level1And2Metrics = useMemo(() => {
    const periodOdts = scopedOdtsForMetrics.filter(isOdtInPeriod);
    const createdCount = periodOdts.length;
    const publishedCount = periodOdts.filter(isOdtPublished).length;
    const carryOverOdts = scopedOdtsForMetrics.filter(isOdtCarryOver);
    const carryOverCount = carryOverOdts.length;

    const efficiencyPct = createdCount > 0 
      ? Math.round((publishedCount / createdCount) * 100) 
      : (scopedOdtsForMetrics.length > 0 && carryOverCount === 0 ? 100 : 0);

    // Clientes con arrastre vs al día (para Nivel 1)
    const clientsWithOverdue = myClients.filter(c => 
      clientOdts.some(o => o.clientId === c.id && isOdtCarryOver(o))
    ).length;
    const clientsOnTrack = Math.max(0, myClients.length - clientsWithOverdue);

    // Posts del cliente (para Nivel 2)
    const clientPosts = activeClient ? posts.filter(p => p.clientId === activeClient.id) : [];
    const clientReadyPosts = clientPosts.filter(p => p.estado === 'Listo para Publicar' || p.estado === 'Publicado').length;

    return {
      createdCount,
      publishedCount,
      efficiencyPct,
      carryOverCount,
      carryOverOdts,
      clientsWithOverdue,
      clientsOnTrack,
      clientPostsCount: clientPosts.length,
      clientReadyPosts
    };
  }, [scopedOdtsForMetrics, selectedPeriod, activePeriodName, posts, activeClient, myClients, clientOdts]);

  // Parrillas a mostrar en la vista de cliente (filtradas por tarjeta si se selecciona)
  const displayedClientOdts = useMemo(() => {
    let list = clientOdts;
    if (selectedOdtCardFilter === 'created') {
      list = list.filter(isOdtInPeriod);
    } else if (selectedOdtCardFilter === 'published') {
      list = list.filter(isOdtPublished);
    } else if (selectedOdtCardFilter === 'carry_over') {
      list = list.filter(isOdtCarryOver);
    }
    return list;
  }, [clientOdts, selectedOdtCardFilter, isOdtInPeriod, isOdtPublished, isOdtCarryOver]);

  // Clientes a mostrar en Nivel 1 (filtrados si se selecciona tarjeta de arrastre, publicadas, etc.)
  const displayedClients = useMemo(() => {
    let list = myClients;
    if (selectedOdtCardFilter === 'carry_over') {
      list = list.filter(c => odts.some(o => o.clientId === c.id && isOdtCarryOver(o)));
    } else if (selectedOdtCardFilter === 'published') {
      list = list.filter(c => odts.some(o => o.clientId === c.id && isOdtPublished(o)));
    } else if (selectedOdtCardFilter === 'created') {
      list = list.filter(c => odts.some(o => o.clientId === c.id && isOdtInPeriod(o)));
    }
    return list;
  }, [myClients, odts, selectedOdtCardFilter, isOdtCarryOver, isOdtPublished, isOdtInPeriod]);

  // Métricas del Nivel 3 (Parrilla activa - 8 Bloques Operativos)
  const level3Metrics = useMemo(() => {
    const currentPosts = activeOdtPosts;
    let copyCount = 0;
    let correctionCount = 0;
    let waitingExecCount = 0;
    let withClientCount = 0;
    let productionCount = 0;
    let readyPublishCount = 0;
    let publishedCount = 0;
    let delayedCount = 0;

    currentPosts.forEach(p => {
      const stage = getPostLevel3Stage(p);
      if (stage === 'copy') copyCount++;
      else if (stage === 'correction') correctionCount++;
      else if (stage === 'waiting_exec') waitingExecCount++;
      else if (stage === 'with_client') withClientCount++;
      else if (stage === 'production') productionCount++;
      else if (stage === 'ready_publish') readyPublishCount++;
      else if (stage === 'published') publishedCount++;

      if (isPostDelayed(p)) {
        delayedCount++;
      }
    });

    return {
      total: currentPosts.length,
      copyCount,
      correctionCount,
      waitingExecCount,
      withClientCount,
      productionCount,
      readyPublishCount,
      publishedCount,
      delayedCount
    };
  }, [activeOdtPosts]);

  // Posts de la ODT seleccionada o filtrados
  const filteredPosts = useMemo(() => {
    let list = posts;
    if (activeOdt) {
      list = list.filter(p => p.odtId === activeOdt.id);

      // Filtro interactivo de 8 etapas en Nivel 3
      if (selectedLevel3Stage !== 'all') {
        if (selectedLevel3Stage === 'delayed') {
          list = list.filter(p => isPostDelayed(p));
        } else {
          list = list.filter(p => getPostLevel3Stage(p) === selectedLevel3Stage);
        }
      }
    } else if (activeClient) {
      list = list.filter(p => p.clientId === activeClient.id);
    } else {
      list = list.filter(p => myClients.some(c => c.id === p.clientId));
    }

    // Filtro por Etapa del Embudo macro
    if (selectedFunnelStage) {
      const stageObj = MACRO_STAGES.find(s => s.id === selectedFunnelStage);
      if (stageObj) {
        list = list.filter(p => stageObj.statuses.includes(p.estado));
      }
    }

    // Filtro por Ritmo / Alertas
    if (pacingFilter !== 'all') {
      if (pacingFilter === 'delayed') {
        list = list.filter(p => getPostPacing(p).type === 'delayed');
      } else if (pacingFilter === 'bottlenecks') {
        list = list.filter(p => getDaysInCurrentStage(p) >= 3);
      } else if (pacingFilter === 'ahead') {
        list = list.filter(p => getPostPacing(p).type === 'ahead');
      } else if (pacingFilter === 'ready') {
        list = list.filter(p => ['Listo para Publicar', 'Programado', 'Publicado'].includes(p.estado));
      }
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'con_cambios_cliente') {
        list = list.filter(p => 
          p.estado === 'Cambios solicitados por Cliente' ||
          p.estado === 'Ajustes de Copy' ||
          p.aprobacionClienteCopy?.status === 'Cambios Solicitados' ||
          p.aprobacionClienteMaterial?.status === 'Cambios Solicitados' ||
          p.comentarios.some(c => c.text.includes('[Revisión') || c.userRole === 'Cliente')
        );
      } else {
        list = list.filter(p => p.estado === statusFilter);
      }
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(p => 
        (p.numeroInterno || '').toLowerCase().includes(q) ||
        stripHtml(p.copyOut || '').toLowerCase().includes(q) ||
        stripHtml(p.copyIn || '').toLowerCase().includes(q) ||
        (p.redSocial || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [posts, activeOdt, activeClient, myClients, selectedFunnelStage, pacingFilter, statusFilter, searchTerm, selectedLevel3Stage]);

  return (
    <div className="space-y-6">
      
      {/* 1. RUTA JERÁRQUICA SUPERIOR (BREADCRUMB Y ACCIONES GLOBALES) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold flex-wrap">
          <button
            onClick={() => { 
              onSelectClient(null); 
              onSelectOdt(null); 
              setSelectedLevel3Stage('all'); 
              setSelectedOdtCardFilter('all'); 
            }}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              !selectedClientId 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Todos los Clientes ({myClients.length})</span>
          </button>

          {activeClient && (
            <>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              <button
                onClick={() => { 
                  onSelectOdt(null); 
                  setSelectedLevel3Stage('all'); 
                  setSelectedOdtCardFilter('all'); 
                }}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                  selectedClientId && !selectedOdtId 
                    ? 'bg-emerald-600 text-white shadow-xs' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>{activeClient.name}</span>
              </button>
            </>
          )}

          {activeOdt && (
            <>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="px-3 py-1.5 rounded-lg bg-pink-50 border border-pink-200 text-pink-900 flex items-center gap-1.5 font-bold shadow-2xs">
                <Layers className="w-3.5 h-3.5 text-pink-600" />
                <span>{activeOdt.numeroODT}: {activeOdt.nombreParrilla}</span>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Selector de Período / Mes (para Niveles 1 y 2) */}
          {!activeOdt && (
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-bold text-slate-600">Período:</span>
              <select
                value={selectedPeriod}
                onChange={(e) => {
                  setSelectedPeriod(e.target.value);
                  setSelectedOdtCardFilter('all');
                }}
                className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer pr-1"
              >
                <option value="current">Mes Actual ({defaultPeriod})</option>
                {availablePeriods.filter(p => p !== defaultPeriod).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
                <option value="all">Todas las Fechas</option>
              </select>
            </div>
          )}

          {isOdtCreator ? (
            <button
              onClick={() => onOpenCreateOdt(selectedClientId || undefined)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva ODT / Parrilla</span>
            </button>
          ) : (
            <div className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>ODTs por Ejecutivo • <strong className="text-emerald-700">Creación de posts habilitada</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* 2. PANEL ADAPTATIVO EN 3 NIVELES */}
      
      {/* ========================================================================= */}
      {/* CASO A: NIVEL 3 — DENTRO DE LA PARRILLA ACTIVA (8 BLOQUES DE AVANCE)     */}
      {/* ========================================================================= */}
      {activeOdt && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-4 py-3 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <span>Avance de Entrega según Estatus Operativo</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {level3Metrics.total} posts en esta parrilla
                </span>
              </h3>
            </div>
            
            {selectedLevel3Stage !== 'all' ? (
              <button
                onClick={() => setSelectedLevel3Stage('all')}
                className="text-xs px-2.5 py-1 rounded-lg bg-pink-50 border border-pink-200 text-pink-700 hover:bg-pink-100 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Restablecer filtro ({LEVEL3_STAGES_CONFIG.find(s => s.id === selectedLevel3Stage)?.label})</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-500">
                Haz clic en cualquier etapa para filtrar los posts abajo
              </span>
            )}
          </div>

          {/* Grilla Interactiva de las 8 Etapas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            {LEVEL3_STAGES_CONFIG.map(stage => {
              const count = stage.id === 'copy' ? level3Metrics.copyCount
                : stage.id === 'correction' ? level3Metrics.correctionCount
                : stage.id === 'waiting_exec' ? level3Metrics.waitingExecCount
                : stage.id === 'with_client' ? level3Metrics.withClientCount
                : stage.id === 'production' ? level3Metrics.productionCount
                : stage.id === 'ready_publish' ? level3Metrics.readyPublishCount
                : stage.id === 'published' ? level3Metrics.publishedCount
                : level3Metrics.delayedCount;

              const pct = level3Metrics.total > 0 ? Math.round((count / level3Metrics.total) * 100) : 0;
              const isSelected = selectedLevel3Stage === stage.id;
              const isDelayedStage = stage.id === 'delayed';
              const isWaitingExec = stage.id === 'waiting_exec';

              return (
                <div
                  key={stage.id}
                  onClick={() => setSelectedLevel3Stage(prev => prev === stage.id ? 'all' : stage.id)}
                  className={`bg-white rounded-2xl p-3 border transition-all cursor-pointer select-none flex flex-col justify-between group ${
                    isSelected 
                      ? stage.color.activeRing 
                      : `${stage.color.border} hover:shadow-xs hover:scale-[1.01]`
                  } ${isDelayedStage && count > 0 ? 'bg-rose-50/20' : ''}`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${stage.color.bgIcon}`}>
                        {renderLevel3Icon(stage.iconName)}
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${stage.color.badge}`}>
                        {pct}%
                      </span>
                    </div>

                    <h4 className={`text-xs font-bold leading-tight ${isSelected ? 'text-slate-950 font-black' : 'text-slate-800'}`}>
                      {stage.label}
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                      {stage.description}
                    </p>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-baseline justify-between">
                    <span className={`text-xl font-black ${stage.color.text}`}>
                      {count}
                    </span>
                    {isWaitingExec && count > 0 && (
                      <span className="text-[9px] font-black uppercase text-amber-800 bg-amber-100 px-1 rounded">
                        Acción
                      </span>
                    )}
                    {isDelayedStage && count > 0 && (
                      <span className="text-[9px] font-black uppercase text-rose-800 bg-rose-100 px-1 rounded animate-pulse">
                        ¡Presionar!
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CASO B: NIVEL 2 — DENTRO DE UN CLIENTE ESPECÍFICO (5 MÉTRICAS DE CLIENTE) */}
      {/* ========================================================================= */}
      {activeClient && !activeOdt && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-4 py-3 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <span>Panel de Desempeño — Cliente: {activeClient.name}</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {activePeriodName}
                </span>
              </h3>
            </div>
            
            {selectedOdtCardFilter !== 'all' ? (
              <button
                onClick={() => setSelectedOdtCardFilter('all')}
                className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Restablecer filtro de parrillas</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-500">
                Métricas exclusivas de las ODTs de este cliente
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Tarjeta 1: Parrillas Creadas */}
            <div 
              onClick={() => setSelectedOdtCardFilter(prev => prev === 'created' ? 'all' : 'created')}
              className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer select-none flex items-center justify-between ${
                selectedOdtCardFilter === 'created'
                  ? 'ring-2 ring-emerald-500 border-emerald-300 bg-emerald-50/20 shadow-xs scale-[1.02]'
                  : 'border-slate-200 hover:border-emerald-300 hover:shadow-xs'
              }`}
            >
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Parrillas del Mes</span>
                <p className="text-2xl font-black text-emerald-700 mt-0.5">{level1And2Metrics.createdCount}</p>
                <span className="text-[10px] text-slate-500 leading-none block mt-1">Planificadas / creadas en {activePeriodName}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            {/* Tarjeta 2: Parrillas Publicadas */}
            <div 
              onClick={() => setSelectedOdtCardFilter(prev => prev === 'published' ? 'all' : 'published')}
              className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer select-none flex items-center justify-between ${
                selectedOdtCardFilter === 'published'
                  ? 'ring-2 ring-teal-500 border-teal-300 bg-teal-50/20 shadow-xs scale-[1.02]'
                  : 'border-slate-200 hover:border-teal-300 hover:shadow-xs'
              }`}
            >
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">Parrillas Publicadas</span>
                <p className="text-2xl font-black text-teal-700 mt-0.5">{level1And2Metrics.publishedCount}</p>
                <span className="text-[10px] text-slate-500 leading-none block mt-1">Concluidas al 100% al aire</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            {/* Tarjeta 3: % Eficiencia del Cliente */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Eficiencia Cliente</span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black text-slate-900">{level1And2Metrics.efficiencyPct}%</span>
                  <span className="text-[10px] text-slate-500">tasa de entrega</span>
                </div>
              </div>
              <div className="mt-2">
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, level1And2Metrics.efficiencyPct)}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {level1And2Metrics.publishedCount} de {level1And2Metrics.createdCount} parrillas
                </span>
              </div>
            </div>

            {/* Tarjeta 4: Parrillas de Arrastre del Cliente (Destacado Rosa/Alerta) */}
            <div 
              onClick={() => setSelectedOdtCardFilter(prev => prev === 'carry_over' ? 'all' : 'carry_over')}
              className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer select-none flex items-center justify-between ${
                selectedOdtCardFilter === 'carry_over'
                  ? 'ring-2 ring-rose-500 border-rose-300 bg-rose-50/30 shadow-xs scale-[1.02]'
                  : level1And2Metrics.carryOverCount > 0 
                  ? 'border-rose-300 bg-rose-50/20 hover:border-rose-400 hover:shadow-xs' 
                  : 'border-slate-200 hover:border-rose-300 hover:shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Arrastre (Meses Previos)</span>
                  {level1And2Metrics.carryOverCount > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  )}
                </div>
                <p className="text-2xl font-black text-rose-600 mt-0.5">{level1And2Metrics.carryOverCount}</p>
                <span className="text-[10px] text-slate-500 leading-none block mt-1">
                  {level1And2Metrics.carryOverCount > 0 ? '⚠️ No entregadas de meses anteriores' : 'Sin pendientes de meses anteriores'}
                </span>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                level1And2Metrics.carryOverCount > 0 ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-600'
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            {/* Tarjeta 5: Volumen de Contenidos */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Posts</span>
                <p className="text-2xl font-black text-indigo-600 mt-0.5">{level1And2Metrics.clientPostsCount}</p>
                <span className="text-[10px] text-slate-500 leading-none block mt-1">
                  {level1And2Metrics.clientReadyPosts} listos o al aire
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CASO C: NIVEL 1 — PANEL GENERAL DEL EJECUTIVO (5 MÉTRICAS GLOBALES)        */}
      {/* ========================================================================= */}
      {!activeClient && !activeOdt && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-4 py-3 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <span>Panel de Supervisión Ejecutiva — Medición Mensual y Arrastre</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {activePeriodName}
                </span>
              </h3>
            </div>
            
            {selectedOdtCardFilter !== 'all' ? (
              <button
                onClick={() => setSelectedOdtCardFilter('all')}
                className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Restablecer filtro global</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-500">
                Control de eficiencia mensual y arrastre acumulado de meses anteriores
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Tarjeta 1: Parrillas Creadas en el Mes */}
            <div 
              onClick={() => setSelectedOdtCardFilter(prev => prev === 'created' ? 'all' : 'created')}
              className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer select-none flex items-center justify-between ${
                selectedOdtCardFilter === 'created'
                  ? 'ring-2 ring-emerald-500 border-emerald-300 bg-emerald-50/20 shadow-xs scale-[1.02]'
                  : 'border-slate-200 hover:border-emerald-300 hover:shadow-xs'
              }`}
            >
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Parrillas del Mes</span>
                <p className="text-2xl font-black text-emerald-700 mt-0.5">{level1And2Metrics.createdCount}</p>
                <span className="text-[10px] text-slate-500 leading-none block mt-1">Planificadas / creadas en {activePeriodName}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            {/* Tarjeta 2: Parrillas Publicadas en el Mes */}
            <div 
              onClick={() => setSelectedOdtCardFilter(prev => prev === 'published' ? 'all' : 'published')}
              className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer select-none flex items-center justify-between ${
                selectedOdtCardFilter === 'published'
                  ? 'ring-2 ring-teal-500 border-teal-300 bg-teal-50/20 shadow-xs scale-[1.02]'
                  : 'border-slate-200 hover:border-teal-300 hover:shadow-xs'
              }`}
            >
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">Parrillas Publicadas</span>
                <p className="text-2xl font-black text-teal-700 mt-0.5">{level1And2Metrics.publishedCount}</p>
                <span className="text-[10px] text-slate-500 leading-none block mt-1">Concluidas al 100% al aire</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            {/* Tarjeta 3: % Eficiencia Mensual */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Eficiencia Mensual</span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black text-slate-900">{level1And2Metrics.efficiencyPct}%</span>
                  <span className="text-[10px] text-slate-500">cumplimiento</span>
                </div>
              </div>
              <div className="mt-2">
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, level1And2Metrics.efficiencyPct)}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {level1And2Metrics.publishedCount} de {level1And2Metrics.createdCount} completadas
                </span>
              </div>
            </div>

            {/* Tarjeta 4: Parrillas de Arrastre de Meses Anteriores (Destacado Rosa/Alerta) */}
            <div 
              onClick={() => setSelectedOdtCardFilter(prev => prev === 'carry_over' ? 'all' : 'carry_over')}
              className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer select-none flex items-center justify-between ${
                selectedOdtCardFilter === 'carry_over'
                  ? 'ring-2 ring-rose-500 border-rose-300 bg-rose-50/30 shadow-xs scale-[1.02]'
                  : level1And2Metrics.carryOverCount > 0 
                  ? 'border-rose-300 bg-rose-50/20 hover:border-rose-400 hover:shadow-xs' 
                  : 'border-slate-200 hover:border-rose-300 hover:shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Arrastre (Meses Previos)</span>
                  {level1And2Metrics.carryOverCount > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  )}
                </div>
                <p className="text-2xl font-black text-rose-600 mt-0.5">{level1And2Metrics.carryOverCount}</p>
                <span className="text-[10px] text-slate-500 leading-none block mt-1">
                  {level1And2Metrics.carryOverCount > 0 ? '⚠️ No entregadas de meses anteriores' : 'Sin pendientes de meses anteriores'}
                </span>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                level1And2Metrics.carryOverCount > 0 ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-600'
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            {/* Tarjeta 5: Salud de Cartera de Clientes */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Salud Cartera</span>
                <p className="text-2xl font-black text-slate-900 mt-0.5">
                  {level1And2Metrics.clientsOnTrack} <span className="text-sm font-semibold text-slate-400">/ {myClients.length}</span>
                </p>
                <span className="text-[10px] text-slate-500 leading-none block mt-1">
                  {level1And2Metrics.clientsWithOverdue > 0 
                    ? `${level1And2Metrics.clientsWithOverdue} clientes con arrastre` 
                    : '100% de clientes al día'}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. CONTENIDO PRINCIPAL SEGÚN EL NIVEL JERÁRQUICO */}

      {/* ========================================================================= */}
      {/* VISTA NIVEL 1 Y 2: CUADRÍCULA DE CLIENTES O LISTA DE PARRILLAS            */}
      {/* ========================================================================= */}
      {!activeOdt && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              {selectedClientId ? (
                <>
                  <span>Parrillas de {activeClient?.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold normal-case">
                    ({displayedClientOdts.length} encontradas)
                  </span>
                </>
              ) : (
                <>
                  <span>Carpetas de Clientes</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold normal-case">
                    ({displayedClients.length} activos)
                  </span>
                </>
              )}
            </h3>
            
            {selectedOdtCardFilter !== 'all' && (
              <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                Filtro activo: {selectedOdtCardFilter === 'carry_over' ? 'Mostrando únicamente arrastre' : selectedOdtCardFilter === 'published' ? 'Mostrando publicadas' : 'Mostrando creadas en período'}
              </span>
            )}
          </div>

          {!selectedClientId ? (
            /* Cuadrícula de Clientes (Nivel 1) */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {displayedClients.map(c => {
                const clientOdtsCount = odts.filter(o => o.clientId === c.id).length;
                const clientPostsCount = posts.filter(p => p.clientId === c.id).length;
                const clientCarryOverCount = odts.filter(o => o.clientId === c.id && isOdtCarryOver(o)).length;

                return (
                  <div
                    key={c.id}
                    onClick={() => onSelectClient(c.id)}
                    className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                        <Folder className="w-5 h-5" />
                      </div>
                      
                      {/* Badge de Salud del Cliente: Arrastre o Al Día */}
                      {clientCarryOverCount > 0 ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-black border border-rose-300 flex items-center gap-1 animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>{clientCarryOverCount} arrastre</span>
                        </span>
                      ) : (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Al día</span>
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-slate-900 mt-3 group-hover:text-emerald-700 transition-colors">
                      {c.name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">{c.industry || 'Cliente Corporativo'}</p>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                      <span>{clientOdtsCount} Parrillas / ODTs</span>
                      <span className="font-bold text-emerald-700">{clientPostsCount} Posts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Lista de ODTs del Cliente Seleccionado (Nivel 2) */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayedClientOdts.length === 0 ? (
                <div className="col-span-2 p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
                  <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-semibold">No hay ODTs registradas para este cliente con el filtro actual.</p>
                  {isOdtCreator ? (
                    <button
                      onClick={() => onOpenCreateOdt(selectedClientId)}
                      className="mt-3 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Crear primera ODT
                    </button>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">El Ejecutivo de Cuentas debe inicializar la ODT/Parrilla para este cliente.</p>
                  )}
                </div>
              ) : (
                displayedClientOdts.map(odt => {
                  const odtPosts = posts.filter(p => p.odtId === odt.id);
                  const readyCount = odtPosts.filter(p => p.estado === 'Listo para Publicar' || p.estado === 'Publicado').length;
                  const progressPct = odtPosts.length > 0 ? Math.round((readyCount / odtPosts.length) * 100) : 0;
                  const isCarry = isOdtCarryOver(odt);
                  const isCompleted = isOdtPublished(odt);

                  return (
                    <div
                      key={odt.id}
                      onClick={() => onSelectOdt(odt.id)}
                      className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer group space-y-3 ${
                        isCarry 
                          ? 'border-rose-300 hover:border-rose-500 hover:shadow-md' 
                          : 'border-slate-200 hover:border-emerald-400 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-md bg-slate-900 text-white font-mono text-xs font-bold">
                            {odt.numeroODT}
                          </span>
                          {isCarry && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold border border-rose-300 flex items-center gap-1 animate-pulse">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              <span>Arrastre ({odt.mesPeriodo || 'Mes anterior'})</span>
                            </span>
                          )}
                          {isCompleted && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Publicada</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                            {odt.mesPeriodo}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenCreatePost(odt);
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                            title="Crear un nuevo post en esta parrilla"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Post</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-900 text-base group-hover:text-emerald-700 transition-colors">
                          {odt.nombreParrilla}
                        </h4>
                        <span className="text-xs font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                          <span>Abrir</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>

                      {/* Alerta si el cliente solicitó cambios en esta ODT */}
                      {(odt.estadoAprobacionCopy === 'Cambios Solicitados' || odt.estadoAprobacionMaterial === 'Cambios Solicitados') && (
                        <div className="px-2.5 py-1.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold flex items-center gap-1.5 animate-pulse shadow-2xs">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>⚠️ Cliente solicitó cambios en {odt.estadoAprobacionCopy === 'Cambios Solicitados' ? 'Copy' : 'Material'}</span>
                        </div>
                      )}

                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {odt.brief}
                      </p>

                      {/* Progreso */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-slate-500">Avance de Parrilla</span>
                          <span className="text-emerald-700 font-bold">{readyCount} de {odtPosts.length} posts ({progressPct}%)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* VISTA NIVEL 2: DENTRO DE LA ODT SELECCIONADA (Brief + Equipo + Lista de Posts) */}
      {activeOdt && (
        <div className="space-y-6">
          
          {/* Ficha Ejecutiva del Brief */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-slate-900 text-white font-mono text-xs font-bold">
                    {activeOdt.numeroODT}
                  </span>
                  <h3 className="text-lg font-black text-slate-900">{activeOdt.nombreParrilla}</h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Cliente: <strong className="text-slate-800">{activeOdt.clientName}</strong> • Periodo: <strong className="text-slate-800">{activeOdt.mesPeriodo}</strong>
                </p>
              </div>

              <button
                onClick={() => onOpenCreatePost(activeOdt)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                + Crear Post en esta Parrilla
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <strong className="text-slate-700 uppercase tracking-wider block mb-1">Brief:</strong>
                <p className="text-slate-600 leading-relaxed">{activeOdt.brief}</p>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <strong className="text-slate-700 uppercase tracking-wider block mb-1">Objetivo:</strong>
                <p className="text-slate-600 leading-relaxed">{activeOdt.objetivo}</p>
              </div>
            </div>

            {/* Equipo Asignado */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="font-bold text-slate-500 mr-2">Equipo Asignado:</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                CM: {activeOdt.communityName}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                Corrector: {activeOdt.correctorName}
              </span>
              {activeOdt.requiereMedico && (
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium">
                  Médico: {activeOdt.medicoName}
                </span>
              )}
              {activeOdt.requiereArte && (
                <span className="px-2 py-0.5 rounded-md bg-pink-50 text-pink-700 font-medium">
                  Arte: {activeOdt.disenadorName}
                </span>
              )}
              {activeOdt.requiereAudioVideo && (
                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-medium">
                  Video: {activeOdt.editorAvName}
                </span>
              )}
            </div>
          </div>

          {/* Banner Destacado si el Cliente solicitó cambios en esta Parrilla */}
          {(activeOdt.estadoAprobacionCopy === 'Cambios Solicitados' || activeOdt.estadoAprobacionMaterial === 'Cambios Solicitados') && (
            <div className="p-4 rounded-2xl bg-rose-50/90 border-2 border-rose-300 text-rose-950 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-600 text-white shadow-xs">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-rose-950 flex items-center gap-2">
                      ⚠️ El Cliente ha Solicitado Cambios en esta Parrilla
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-800">
                        {activeOdt.estadoAprobacionCopy === 'Cambios Solicitados' ? 'Revisión de Copys' : 'Revisión de Materiales'}
                      </span>
                    </h4>
                    <p className="text-xs text-rose-800 mt-0.5">
                      {activeOdt.rondasAprobacion && activeOdt.rondasAprobacion.length > 0 ? (
                        <>
                          Última ronda registrada por <strong>{activeOdt.rondasAprobacion[activeOdt.rondasAprobacion.length - 1].usuarioName}</strong> el {activeOdt.rondasAprobacion[activeOdt.rondasAprobacion.length - 1].fecha}
                        </>
                      ) : (
                        'El cliente ha devuelto la parrilla con observaciones pendientes de solventar.'
                      )}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black px-3 py-1 bg-white text-rose-700 rounded-lg border border-rose-300 shadow-2xs">
                  {activeOdtPosts.filter(p => p.estado === 'Cambios solicitados por Cliente' || p.estado === 'Ajustes de Copy' || p.aprobacionClienteCopy?.status === 'Cambios Solicitados' || p.aprobacionClienteMaterial?.status === 'Cambios Solicitados').length} posts con ajustes pendientes
                </span>
              </div>

              {/* Comentario General del Cliente si existe */}
              {activeOdt.rondasAprobacion && activeOdt.rondasAprobacion.length > 0 && activeOdt.rondasAprobacion[activeOdt.rondasAprobacion.length - 1].comentarioGeneral && (
                <div className="bg-white p-3 rounded-xl border border-rose-200/80 text-xs text-slate-800">
                  <span className="font-bold text-rose-900 block mb-0.5">Comentario General del Cliente:</span>
                  <p className="italic font-medium leading-relaxed">"{activeOdt.rondasAprobacion[activeOdt.rondasAprobacion.length - 1].comentarioGeneral}"</p>
                </div>
              )}
            </div>
          )}

          {/* EMBUDO / MAPA DE ETAPAS DE LA PARRILLA */}
          <OdtPipelineFunnel
            posts={activeOdtPosts}
            selectedStageId={selectedFunnelStage}
            onSelectStage={setSelectedFunnelStage}
          />

          {/* LISTA Y TABLA DE POSTS */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            
            {/* Header de Filtros */}
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-800">
                  Posts en esta ODT ({filteredPosts.length})
                </h4>
                {(selectedFunnelStage || pacingFilter !== 'all' || statusFilter !== 'all' || searchTerm) && (
                  <button
                    onClick={() => {
                      setSelectedFunnelStage(null);
                      setPacingFilter('all');
                      setStatusFilter('all');
                      setSearchTerm('');
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer"
                  >
                    Restablecer filtros
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar post, copy..."
                    className="text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Filtro de Ritmo & SLA */}
                <select
                  className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-medium text-slate-700"
                  value={pacingFilter}
                  onChange={(e) => setPacingFilter(e.target.value)}
                >
                  <option value="all">Todos los Ritmos & SLAs</option>
                  <option value="delayed">⚠️ Retraso Crítico (Fecha cercana)</option>
                  <option value="bottlenecks">⏱️ Cuellos de Botella (&gt;3 días)</option>
                  <option value="ahead">🚀 Adelantados</option>
                  <option value="ready">✅ Listos / Publicados</option>
                </select>

                {/* Status filter */}
                <select
                  className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-medium text-slate-700"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Todos los Estados</option>
                  <option value="con_cambios_cliente" className="font-bold text-rose-700">⚠️ Posts con Cambios del Cliente</option>
                  <option value="Borrador">Borrador</option>
                  <option value="En Community">En Community</option>
                  <option value="Revisión Médica">Revisión Médica</option>
                  <option value="Corrección de Copy">Corrección de Copy</option>
                  <option value="Esperando Ejecutivo">Esperando Ejecutivo</option>
                  <option value="Aprobación Copy Cliente">Aprobación Copy Cliente</option>
                  <option value="Cambios solicitados por Cliente">Cambios Solicitados por Cliente</option>
                  <option value="Diseño de Editables (Arte)">Diseño de Editables (Arte)</option>
                  <option value="Producción Arte">Producción Arte</option>
                  <option value="Producción Audio/Video">Producción Audio/Video</option>
                  <option value="Corrección Material">Corrección Material</option>
                  <option value="Revisión Médica Material">Revisión Médica Material</option>
                  <option value="Aprobación Interna Final">Aprobación Interna Final</option>
                  <option value="Aprobación Material Cliente">Aprobación Material Cliente</option>
                  <option value="Listo para Publicar">Listo para Publicar</option>
                  <option value="Publicado">Publicado</option>
                </select>
              </div>
            </div>

            {/* Lista de Posts */}
            {filteredPosts.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold">No se encontraron posts con los filtros actuales.</p>
                {(selectedFunnelStage || pacingFilter !== 'all' || statusFilter !== 'all' || searchTerm) && (
                  <button
                    onClick={() => {
                      setSelectedFunnelStage(null);
                      setPacingFilter('all');
                      setStatusFilter('all');
                      setSearchTerm('');
                    }}
                    className="mt-3 text-xs text-indigo-600 font-bold hover:underline"
                  >
                    Limpiar todos los filtros
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredPosts.map(post => {
                  const isWaitingExec = post.estado === 'Esperando Ejecutivo';
                  const isInternalFinal = post.estado === 'Aprobación Interna Final';
                  const isClientChange = 
                    post.estado === 'Cambios solicitados por Cliente' ||
                    post.aprobacionClienteCopy?.status === 'Cambios Solicitados' ||
                    post.aprobacionClienteMaterial?.status === 'Cambios Solicitados';

                  const clientObservation = 
                    post.aprobacionClienteCopy?.comment || 
                    post.aprobacionClienteMaterial?.comment || 
                    post.comentarios.find(c => c.text.includes('[Revisión') || c.userRole === 'Cliente')?.text;

                  return (
                    <div
                      key={post.id}
                      className={`p-4 hover:bg-slate-50/70 transition-colors flex flex-col gap-3 ${
                        isClientChange ? 'bg-rose-50/30 border-l-4 border-rose-500' : ''
                      }`}
                    >
                      {/* Fila Superior: Metadatos y Botones de Acción */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono text-xs font-bold">
                            {post.numeroInterno}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold">
                            {post.redSocial}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold">
                            {post.tipoMaterial}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono">
                            {post.dimensiones || '1080x1080'}
                          </span>
                          
                          {/* Nivel de Prioridad Operativa */}
                          <span className={`text-[11px] px-2 py-0.5 rounded-md font-black border ${
                            post.nivelPrioridad === 'Nivel 1' 
                              ? 'bg-rose-50 text-rose-700 border-rose-200' 
                              : post.nivelPrioridad === 'Nivel 3'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {post.nivelPrioridad === 'Nivel 1' ? '🔴 Nivel 1' : post.nivelPrioridad === 'Nivel 3' ? '🟢 Nivel 3' : '🟡 Nivel 2'}
                          </span>

                          {/* Fechas de Entrega Arte y Publicación */}
                          <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Entrega Arte: {post.fechaEntregaMaterial || post.fechaPrevista}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            Publicación: <strong className="text-slate-700">{post.fechaPrevista}</strong>
                          </span>
                          
                          {/* Badge de Estado Operativo */}
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                            post.estado === 'Listo para Publicar' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            post.estado === 'Publicado' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                            isInternalFinal ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold animate-pulse' :
                            isWaitingExec ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse' :
                            isClientChange ? 'bg-rose-100 text-rose-800 border-rose-300 font-black animate-pulse' :
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {isClientChange && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                            {post.estado}
                          </span>
                        </div>

                        {/* Botones de Acción de Supervisión y Operación */}
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          {/* Duplicar Post */}
                          {onDuplicatePost && (
                            <button
                              onClick={() => {
                                setDuplicatingPost(post);
                                setTargetDuplicateRed(post.redSocial);
                              }}
                              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                              title="Duplicar post para otra red social"
                            >
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span className="hidden sm:inline">Duplicar</span>
                            </button>
                          )}

                          {/* Reciclar / Retomar Post */}
                          {onRecyclePost && post.estado !== 'Borrador' && (
                            <button
                              onClick={() => {
                                if (confirm(`¿Retomar y reciclar este post #${post.numeroInterno}?\n\nEl post regresará a la posición inicial (Borrador) para que el Community pueda cambiar el enfoque, adaptar el copy o redefinir el material.`)) {
                                  onRecyclePost(post);
                                }
                              }}
                              className="p-1.5 text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-300 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                              title="Atraer post al inicio para nuevo enfoque"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                              <span className="hidden sm:inline">Reciclar</span>
                            </button>
                          )}

                          {/* Acción de Community: Enviar a Revisión */}
                          {(post.estado === 'Borrador' || post.estado === 'En Community' || post.estado === 'Ajustes de Copy' || post.estado === 'Cambios solicitados por Cliente') && onSendToReview && activeOdt && (
                            <button
                              onClick={() => onSendToReview(post, activeOdt)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                              title="Enviar a Revisión Médica o Corrección"
                            >
                              <Send className="w-3.5 h-3.5" />
                              {activeOdt.requiereMedico ? 'A Revisión Médica' : 'A Corrección'}
                            </button>
                          )}

                          {/* Acción de Community: Publicar / Programar */}
                          {post.estado === 'Listo para Publicar' && onOpenPublishModal && (
                            <button
                              onClick={() => onOpenPublishModal(post)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                              title="Programar o publicar este post en redes"
                            >
                              <Globe className="w-3.5 h-3.5" />
                              PUBLICAR
                            </button>
                          )}

                          {post.estado === 'Programado' && onOpenPublishModal && (
                            <button
                              onClick={() => onOpenPublishModal(post)}
                              className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                              title="Confirmar que ya salió en vivo y registrar enlaces"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              PUBLICAR EN VIVO
                            </button>
                          )}

                          {post.estado === 'Publicado' && onOpenPublishModal && (
                            <button
                              onClick={() => onOpenPublishModal(post)}
                              className="px-2.5 py-1.5 text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Gestionar o añadir enlaces web"
                            >
                              <Share2 className="w-3 h-3" />
                              Gestionar Links
                            </button>
                          )}

                          {/* Acción: Aprobación Interna Final (Exclusivo Ejecutivo / Admin / Super Admin) */}
                          {isInternalFinal && (currentUser.role === 'Ejecutivo' || currentUser.role === 'Admin' || currentUser.role === 'Super Admin') && (
                            <button
                              onClick={() => onOpenApprovalModal?.(post, 'aprobacion_interna_final')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Aprobación Interna Final
                            </button>
                          )}

                          {/* Acción Rápida: Enviar a Cliente si está en 'Esperando Ejecutivo' (Exclusivo Ejecutivo / Admin / Super Admin) */}
                          {isWaitingExec && (currentUser.role === 'Ejecutivo' || currentUser.role === 'Admin' || currentUser.role === 'Super Admin') && (
                            <button
                              onClick={() => onSendToClientApproval(post, activeOdt)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              Enviar a Cliente
                            </button>
                          )}

                          {/* Botón de Intervención / Reasignación de Supervisor (Exclusivo Ejecutivo / Admin / Super Admin) */}
                          {(currentUser.role === 'Ejecutivo' || currentUser.role === 'Admin' || currentUser.role === 'Super Admin') && (
                            <button
                              onClick={() => onOpenIntervention(post)}
                              title="Intervención manual de supervisor (Reasignar o Devolver)"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <ShieldAlert className="w-4 h-4 text-indigo-500" />
                              <span className="hidden sm:inline">Intervenir</span>
                            </button>
                          )}

                          {/* Ver Ficha Completa */}
                          <button
                            onClick={() => onSelectPost(post)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            Ver Post
                          </button>
                        </div>
                      </div>

                      {/* Observación destacada del cliente si existe */}
                      {clientObservation && (
                        <div className="p-3 rounded-xl bg-amber-50 border-2 border-amber-300 text-xs text-amber-950 flex items-start gap-2.5 shadow-2xs">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-amber-900 block mb-0.5">
                              Observación del Cliente ({post.aprobacionClienteCopy?.user || post.aprobacionClienteMaterial?.user || 'Cliente'}):
                            </span>
                            <p className="italic text-amber-950 font-medium leading-relaxed">
                              "{clientObservation}"
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Espacio Central en 4 Divisiones: Copy In, Copy Out, Enlace de Referencia, Material Entregado Arte/AV */}
                      <PostContentFourPanels 
                        post={post} 
                        onEdit={() => onSelectPost(post)}
                        canEdit={currentUser.role === 'Community' || currentUser.role === 'Admin' || currentUser.role === 'Super Admin'}
                      />

                      {/* Información de Responsable y Área */}
                      <div className="text-xs text-slate-500 flex items-center justify-between gap-3 flex-wrap px-1">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-semibold">Responsable actual:</span>
                          <span className="font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                            {post.areaResponsable} • {post.responsableActualName || 'Sin asignar'}
                          </span>
                        </div>
                      </div>

                      {/* MAPA DE ETAPAS Y CONTADOR DE DÍAS (EMBUDO INDIVIDUAL) */}
                      <PostStageMap post={post} />
                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>
      )}

      {/* MODAL DUPLICAR POST */}
      {duplicatingPost && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  <Copy className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Duplicar Post #{duplicatingPost.numeroInterno}</h4>
                  <p className="text-xs text-slate-500">Copia el contenido y crea una nueva pieza para otra red social.</p>
                </div>
              </div>
              <button 
                onClick={() => setDuplicatingPost(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Selecciona la Red Social Destino:
                </label>
                <select
                  value={targetDuplicateRed}
                  onChange={(e) => setTargetDuplicateRed(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {(activeOdt?.redesSociales || ['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'X (Twitter)', 'YouTube']).map(r => (
                    <option key={r} value={r}>
                      {r} {r === duplicatingPost.redSocial ? '(Misma red)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Se generará un nuevo número consecutivo dentro de la ODT y el post comenzará en estado <strong>Borrador</strong> para que el Community pueda adaptarlo a la nueva red social.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDuplicatingPost(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDuplicatePost && duplicatingPost) {
                    onDuplicatePost(duplicatingPost, targetDuplicateRed);
                    setDuplicatingPost(null);
                  }
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Confirmar Duplicación</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
