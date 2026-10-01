import React, { useState, useMemo } from 'react';
import { Post, ODT, Client, User } from '../types';
import { 
  Building2, CheckCircle2, AlertTriangle, ShieldCheck, 
  MessageSquare, History, Sparkles, Send, Check, AlertCircle,
  Phone, Mail, MessageCircle, Clock, UserCheck, ExternalLink,
  Copy, CheckCheck, X, ChevronRight
} from 'lucide-react';
import { 
  checkParrillaCopyReadiness, 
  getCurrentRoundNumber,
  sanitizePostForClient 
} from '../services/odtService';

interface ClienteViewProps {
  posts: Post[];
  odts: ODT[];
  client: Client;
  currentUser: User;
  users?: User[];
  onBatchApproveParrilla: (odtId: string, tipo: 'COPY' | 'MATERIAL', generalComment?: string) => void;
  onBatchRequestChanges: (
    odtId: string, 
    tipo: 'COPY' | 'MATERIAL', 
    generalComment: string, 
    affectedPosts: { postId: string; comment: string }[]
  ) => void;
  onSelectPost?: (post: Post) => void;
}

export const ClienteView: React.FC<ClienteViewProps> = ({
  posts,
  odts,
  client,
  currentUser,
  users,
  onBatchApproveParrilla,
  onBatchRequestChanges
}) => {
  // Filtro estricto por cliente
  const clientOdts = useMemo(() => {
    return odts.filter(o => o.clientId === client.id);
  }, [odts, client.id]);

  // Selección de Parrilla (consultar únicamente la ODT abierta)
  const [selectedOdtId, setSelectedOdtId] = useState<string>(() => {
    return clientOdts.length > 0 ? clientOdts[0].id : '';
  });

  // Asegurar ODT seleccionada válida si cambia la lista
  const activeOdt = useMemo(() => {
    if (!selectedOdtId && clientOdts.length > 0) return clientOdts[0];
    return clientOdts.find(o => o.id === selectedOdtId) || (clientOdts.length > 0 ? clientOdts[0] : null);
  }, [clientOdts, selectedOdtId]);

  // Pestaña activa dentro de la Parrilla: únicamente 'copy' e 'historial'
  const [activeTab, setActiveTab] = useState<'copy' | 'historial'>('copy');

  // Posts ÚNICAMENTE de la ODT seleccionada, sanitizados para el cliente
  const odtPosts = useMemo(() => {
    if (!activeOdt) return [];
    return posts
      .filter(p => p.odtId === activeOdt.id)
      .map(sanitizePostForClient);
  }, [posts, activeOdt]);

  // Diagnóstico de preparación de la Parrilla de Copy
  const copyReadiness = useMemo(() => {
    if (!activeOdt) return { isReady: false, reviewedCount: 0, totalPosts: 0, percentage: 0, reviewedPosts: [] };
    return checkParrillaCopyReadiness(activeOdt, odtPosts);
  }, [activeOdt, odtPosts]);

  // Rondas de aprobación registradas (sólo tipo COPY relevantes para el cliente)
  const rondasAprobacion = useMemo(() => {
    return (activeOdt?.rondasAprobacion || []).filter(r => r.tipo === 'COPY');
  }, [activeOdt]);

  const latestCopyRound = useMemo(() => {
    return rondasAprobacion[rondasAprobacion.length - 1];
  }, [rondasAprobacion]);

  // Clasificación granular de cada post para aprobación de Copy
  const postStatusMap = useMemo(() => {
    const map = new Map<string, {
      isApproved: boolean;
      isPendingClient: boolean;
      isInternalPrep: boolean;
    }>();

    odtPosts.forEach(post => {
      const isApproved = Boolean(
        post.aprobacionClienteCopy?.status === 'Aprobado' ||
        [
          'Producción Arte', 'Producción Audio/Video', 'Corrección Material',
          'Revisión Médica Material', 'Aprobación Interna Final',
          'Aprobación Material Cliente', 'Listo para Publicar', 'Programado', 'Publicado'
        ].includes(post.estado)
      );
      const isPendingClient = !isApproved && post.estado === 'Aprobación Copy Cliente';
      const isInternalPrep = !isApproved && !isPendingClient;

      map.set(post.id, {
        isApproved,
        isPendingClient,
        isInternalPrep
      });
    });

    return map;
  }, [odtPosts]);

  const totalPostsCount = odtPosts.length;
  const approvedPostsCount = useMemo(() => {
    return odtPosts.filter(p => postStatusMap.get(p.id)?.isApproved).length;
  }, [odtPosts, postStatusMap]);

  const pendingClientPosts = useMemo(() => {
    return odtPosts.filter(p => postStatusMap.get(p.id)?.isPendingClient);
  }, [odtPosts, postStatusMap]);

  const internalPrepPosts = useMemo(() => {
    return odtPosts.filter(p => postStatusMap.get(p.id)?.isInternalPrep);
  }, [odtPosts, postStatusMap]);

  // La parrilla está totalmente aprobada si todos los posts existentes están aprobados
  const isEntireParrillaApproved = totalPostsCount > 0 && approvedPostsCount === totalPostsCount;
  // Existen posts nuevos o adicionales listos para la aprobación del cliente
  const hasPendingAdditionalPosts = pendingClientPosts.length > 0;
  // Existen posts nuevos o adicionales que aún están en preparación interna (médico, corrección)
  const hasPostsInInternalPrep = internalPrepPosts.length > 0;

  // Compatibilidad: la parrilla se considera aprobada en su totalidad únicamente cuando todos los posts lo están
  const isCopyApproved = isEntireParrillaApproved;

  const currentCopyRoundNumber = useMemo(() => {
    if (!activeOdt) return 1;
    return getCurrentRoundNumber(activeOdt, 'COPY');
  }, [activeOdt]);

  // Identificar y resolver los datos del Ejecutivo asignado para el cliente y la ODT
  const ejecutivoUser = useMemo(() => {
    const execId = activeOdt?.ejecutivoId || client.ejecutivoId;
    if (users && users.length > 0) {
      const found = users.find(u => u.id === execId || (u.role === 'Ejecutivo' && (u.name === activeOdt?.ejecutivoName || u.name === client.ejecutivoName)));
      if (found) {
        return {
          id: found.id,
          name: found.name,
          cargo: found.cargo || client.ejecutivoCargo || 'Ejecutiva de Cuentas Senior',
          email: found.email || client.ejecutivoEmail || 'ana.lopez@apcagencia.com',
          phone: found.phone || client.ejecutivoPhone || '+52 (55) 8421-9920',
          whatsapp: found.whatsapp || client.ejecutivoWhatsapp || '+525584219920',
          horarioAtencion: found.horarioAtencion || client.ejecutivoHorario || 'Lunes a Viernes, 9:00 AM - 6:30 PM',
          avatar: found.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
        };
      }
    }
    return {
      id: execId || 'u-exec',
      name: activeOdt?.ejecutivoName || client.ejecutivoName || 'Ana López (Ejecutiva)',
      cargo: client.ejecutivoCargo || 'Ejecutiva de Cuentas Senior',
      email: client.ejecutivoEmail || 'ana.lopez@apcagencia.com',
      phone: client.ejecutivoPhone || '+52 (55) 8421-9920',
      whatsapp: client.ejecutivoWhatsapp || '+525584219920',
      horarioAtencion: client.ejecutivoHorario || 'Lunes a Viernes, 9:00 AM - 6:30 PM',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
    };
  }, [users, activeOdt, client]);

  // Estados para modal de contacto y acciones rápidas
  const [isContactModalOpen, setIsContactModalOpen] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [quickMessage, setQuickMessage] = useState<string>('');
  const [quickMessageSent, setQuickMessageSent] = useState<boolean>(false);

  const handleCopy = (text: string, field: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleSendQuickMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickMessage.trim()) return;
    setQuickMessageSent(true);
    setTimeout(() => {
      setQuickMessage('');
      setQuickMessageSent(false);
      setIsContactModalOpen(false);
    }, 2500);
  };

  // Estados interactivos para decisiones por post y comentarios
  const [postChanges, setPostChanges] = useState<{ [postId: string]: string }>({});
  const [explicitlyApproved, setExplicitlyApproved] = useState<{ [postId: string]: boolean }>({});
  const [generalComment, setGeneralComment] = useState<string>('');
  const [showGeneralChangePrompt, setShowGeneralChangePrompt] = useState<boolean>(false);
  
  // Modal de confirmación para "Aprobar Toda la Parrilla"
  const [showApprovalModal, setShowApprovalModal] = useState<boolean>(false);
  const [approvalGeneralComment, setApprovalGeneralComment] = useState<string>('');

  // Reset de selección al cambiar de Parrilla
  const handleSwitchOdt = (odtId: string) => {
    setSelectedOdtId(odtId);
    setPostChanges({});
    setExplicitlyApproved({});
    setGeneralComment('');
    setShowGeneralChangePrompt(false);
  };

  // Marcar post individual como aprobado
  const handleMarkApproved = (postId: string) => {
    setPostChanges(prev => {
      const next = { ...prev };
      delete next[postId];
      return next;
    });
    setExplicitlyApproved(prev => ({ ...prev, [postId]: true }));
  };

  // Solicitar cambio en post individual
  const handleRequestChange = (postId: string) => {
    setPostChanges(prev => ({
      ...prev,
      [postId]: prev[postId] || ''
    }));
    setExplicitlyApproved(prev => {
      const next = { ...prev };
      delete next[postId];
      return next;
    });
  };

  const updatePostChangeComment = (postId: string, comment: string) => {
    setPostChanges(prev => ({
      ...prev,
      [postId]: comment
    }));
  };

  // Limpiar todas las observaciones y marcar todo listo
  const handleClearAllChanges = () => {
    setPostChanges({});
    setShowGeneralChangePrompt(false);
    setGeneralComment('');
  };

  // Enviar solicitud de cambios (desde el módulo al pie)
  const handleSubmitChanges = () => {
    if (!activeOdt) return;
    const changeIds = Object.keys(postChanges);
    if (changeIds.length === 0 && !generalComment.trim()) {
      alert('Por favor escribe al menos una observación en alguna publicación o un comentario general.');
      return;
    }

    const affected = changeIds.map(id => ({
      postId: id,
      comment: postChanges[id]?.trim() || 'Ajuste solicitado por el cliente en esta publicación.'
    }));

    onBatchRequestChanges(activeOdt.id, 'COPY', generalComment, affected);
    setPostChanges({});
    setGeneralComment('');
    setShowGeneralChangePrompt(false);
  };

  // Manejador: Confirmar Aprobación de Toda la Parrilla
  const handleConfirmApproval = () => {
    if (!activeOdt) return;
    onBatchApproveParrilla(activeOdt.id, 'COPY', approvalGeneralComment);
    setShowApprovalModal(false);
    setApprovalGeneralComment('');
  };

  // Conteos en tiempo real
  const changedCount = Object.keys(postChanges).length;
  const approvedCount = odtPosts.length - changedCount;

  if (!activeOdt || clientOdts.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center shadow-xs">
        <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">No hay Parrillas disponibles</h3>
        <p className="text-xs text-slate-500 mt-1">
          Tu equipo de cuenta APC no ha asignado ninguna parrilla activa en este momento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header Cliente & Selector de Parrillas */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{client.name}</h2>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-200 border border-cyan-700 font-semibold">
                  Aprobación de Copy
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Revisión condensada y validación de copys para tus contenidos de redes sociales
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Revisor:</span>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-semibold border border-slate-700">
              {currentUser.name}
            </span>
          </div>
        </div>

        {/* Selector de Parrilla (carga únicamente la ODT abierta) */}
        {clientOdts.length > 1 && (
          <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-xs text-slate-400 font-medium shrink-0">Parrilla Activa:</span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {clientOdts.map(odt => {
                const isSelected = odt.id === activeOdt.id;
                return (
                  <button
                    key={odt.id}
                    onClick={() => handleSwitchOdt(odt.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 shadow-xs'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                  >
                    <span>{odt.nombreParrilla}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                      isSelected ? 'bg-cyan-900/40 text-slate-900 font-extrabold' : 'bg-slate-900 text-slate-400'
                    }`}>
                      {odt.mesPeriodo}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Ficha Ejecutiva del Cliente: Con quién comunicarse */}
        <div className="pt-3.5 border-t border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              {ejecutivoUser.avatar ? (
                <img 
                  src={ejecutivoUser.avatar} 
                  alt={ejecutivoUser.name} 
                  className="w-11 h-11 rounded-xl object-cover border-2 border-cyan-400/80 shadow-xs"
                />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-cyan-700 text-white font-bold flex items-center justify-center text-sm border-2 border-cyan-400">
                  {ejecutivoUser.name.substring(0, 2).toUpperCase()}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-xs" title="Ejecutivo Disponible" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded-md border border-cyan-800">
                  Tu Ejecutivo de Cuenta Asignado
                </span>
                <span className="text-[11px] text-slate-400">
                  {ejecutivoUser.cargo}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
                {ejecutivoUser.name}
              </h4>
            </div>
          </div>

          {/* Acciones directas de comunicación */}
          <div className="flex items-center gap-2 flex-wrap">
            {ejecutivoUser.whatsapp && (
              <a
                href={`https://wa.me/${ejecutivoUser.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola ${ejecutivoUser.name.split(' ')[0]}, te escribo desde el portal de ${client.name} sobre la parrilla: ${activeOdt.nombreParrilla}.`)}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                title="Abrir chat directo en WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
            )}

            {ejecutivoUser.phone && (
              <a
                href={`tel:${ejecutivoUser.phone.replace(/[^0-9+]/g, '')}`}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
                title={`Llamar al teléfono directo ${ejecutivoUser.phone}`}
              >
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>{ejecutivoUser.phone}</span>
              </a>
            )}

            {ejecutivoUser.email && (
              <a
                href={`mailto:${ejecutivoUser.email}?subject=Consulta Parrilla ${encodeURIComponent(activeOdt.nombreParrilla)}`}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
                title={`Enviar correo electrónico a ${ejecutivoUser.email}`}
              >
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">{ejecutivoUser.email}</span>
                <span className="sm:hidden">Email</span>
              </a>
            )}

            <button
              onClick={() => setIsContactModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Ver Ficha Completa</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navegación: Revisión de Copy e Historial */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          {/* Tab 1: Revisión de Copy */}
          <button
            onClick={() => setActiveTab('copy')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'copy'
                ? 'bg-cyan-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>REVISIÓN DE COPY</span>
            {isEntireParrillaApproved ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold">
                Aprobada (R{latestCopyRound?.ronda || 1})
              </span>
            ) : hasPendingAdditionalPosts ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-extrabold animate-pulse">
                {pendingClientPosts.length} Post(s) por Aprobar
              </span>
            ) : hasPostsInInternalPrep && approvedPostsCount > 0 ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-cyan-100 text-cyan-900 font-bold">
                {approvedPostsCount}/{totalPostsCount} Aprobados
              </span>
            ) : copyReadiness.isReady ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 font-extrabold animate-pulse">
                Lista para Revisar
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-700 font-semibold">
                {copyReadiness.reviewedCount}/{copyReadiness.totalPosts}
              </span>
            )}
          </button>

          {/* Tab 2: Historial de Rondas */}
          <button
            onClick={() => setActiveTab('historial')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'historial'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Historial de Rondas ({rondasAprobacion.length})</span>
          </button>
        </div>

        {/* Acciones principales de Copy en la cabecera */}
        {activeTab === 'copy' && !isEntireParrillaApproved && (hasPendingAdditionalPosts || copyReadiness.isReady || changedCount > 0) && (
          <div className="flex items-center gap-2">
            {changedCount > 0 && (
              <button
                onClick={() => {
                  const bottomEl = document.getElementById('modulo-cierre-parrilla');
                  bottomEl?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                <span>{changedCount} con observaciones</span>
              </button>
            )}
            <button
              onClick={() => setShowApprovalModal(true)}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              {hasPendingAdditionalPosts && approvedPostsCount > 0
                ? `Aprobar Posts Nuevos (${pendingClientPosts.length})`
                : 'Aprobar Toda la Parrilla'}
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* VISTA CONDENSADA: REVISIÓN DE COPY - [Nombre de Parrilla]                 */}
      {/* ========================================================================= */}
      {activeTab === 'copy' && (
        <div className="space-y-4">
          
          {/* Tarjeta Principal de Identificación */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-700 block">
                  Parrilla de Contenidos
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  REVISIÓN DE COPY - {activeOdt.nombreParrilla}
                </h3>
                <p className="text-xs text-slate-500">
                  Cliente: <strong className="text-slate-700">{client.name}</strong> • Periodo: <strong className="text-slate-700">{activeOdt.mesPeriodo}</strong>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block font-medium">Revisión Interna APC</span>
                  <span className="text-sm font-black text-slate-800">
                    {copyReadiness.reviewedCount} de {copyReadiness.totalPosts} Posts validados
                  </span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-800 font-bold text-xs">
                  Ronda {currentCopyRoundNumber}
                </div>
              </div>
            </div>

            {/* Aviso Reasegurador: Fin de Participación o Alerta de Posts Adicionales */}
            {isEntireParrillaApproved ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Participación del Cliente Concluida — Parrilla de Copy Aprobada</span>
                </div>
                <p className="text-emerald-800 leading-relaxed pl-7">
                  Todos los copys de esta parrilla ({approvedPostsCount} de {totalPostsCount}) fueron autorizados por <strong>{latestCopyRound?.usuarioName || currentUser.name}</strong> en <strong>Ronda {latestCopyRound?.ronda || 1}</strong>. 
                  El equipo de APC se encuentra en la etapa de producción técnica y control de calidad interno.
                  <strong> No se requiere ninguna acción adicional de tu parte.</strong>
                </p>
              </div>
            ) : hasPendingAdditionalPosts ? (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 space-y-1">
                <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>Parrilla con {pendingClientPosts.length} Publicación(es) Adicional(es) Pendiente(s) de tu Visto Bueno</span>
                </div>
                <p className="text-amber-900 leading-relaxed pl-7">
                  {approvedPostsCount > 0 ? (
                    <>
                      Esta parrilla cuenta con <strong>{approvedPostsCount} publicación(es) previamente aprobada(s)</strong> que ya se encuentran en producción técnica. 
                      El equipo ha creado <strong>{pendingClientPosts.length} nuevo(s) post(s)</strong> ({pendingClientPosts.map(p => `#${p.numeroInterno}`).join(', ')}) que están listos para tu revisión y visto bueno de copy.
                    </>
                  ) : (
                    <>
                      Hay <strong>{pendingClientPosts.length} publicación(es)</strong> listas para tu dictamen de copy en esta ronda.
                    </>
                  )}
                </p>
              </div>
            ) : hasPostsInInternalPrep && approvedPostsCount > 0 ? (
              <div className="p-3.5 bg-cyan-50 border border-cyan-200 rounded-xl text-xs text-cyan-950 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-cyan-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Parrilla parcialmente aprobada: </strong>
                  Actualmente <strong>{approvedPostsCount} de {totalPostsCount} posts</strong> ya fueron autorizados por ti y avanzan en producción técnica. 
                  El equipo de APC se encuentra redactando y revisando internamente {internalPrepPosts.length} nuevo(s) post(s) adicional(es) ({internalPrepPosts.map(p => `#${p.numeroInterno} - ${p.redSocial}`).join(', ')}). 
                  Tan pronto cuenten con los filtros médicos y de corrección, aparecerán aquí para tu visto bueno.
                </div>
              </div>
            ) : !copyReadiness.isReady ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Parrilla en preparación interna por APC: </strong>
                  Actualmente {copyReadiness.reviewedCount} de {copyReadiness.totalPosts} posts cuentan con visto bueno médico y ortotipográfico. 
                  La autorización completa se habilitará cuando todos los posts estén 100% revisados internamente.
                </div>
              </div>
            ) : null}
          </div>

          {/* Banner / Centro de Contacto Directo con el Ejecutivo Asignado */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 text-white rounded-2xl p-5 shadow-xs border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                {ejecutivoUser.avatar ? (
                  <img
                    src={ejecutivoUser.avatar}
                    alt={ejecutivoUser.name}
                    className="w-13 h-13 rounded-2xl object-cover border-2 border-cyan-400 shadow-sm"
                  />
                ) : (
                  <div className="w-13 h-13 rounded-2xl bg-cyan-700 text-white font-black flex items-center justify-center text-base border-2 border-cyan-400 shadow-sm">
                    {ejecutivoUser.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-xs" title="Disponible" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black text-cyan-300 uppercase tracking-wider bg-cyan-950 px-2 py-0.5 rounded-md border border-cyan-800">
                    Tu Ejecutivo Titular
                  </span>
                  <span className="text-xs text-slate-300 font-medium">
                    {ejecutivoUser.cargo}
                  </span>
                </div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  {ejecutivoUser.name}
                </h4>
                <p className="text-xs text-slate-300 flex items-center gap-1.5 flex-wrap">
                  <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Horario de atención: <strong className="text-white font-semibold">{ejecutivoUser.horarioAtencion}</strong></span>
                </p>
                <p className="text-[11px] text-slate-400 pt-0.5">
                  ¿Dudas sobre algún copy, cambios de fechas o deseas agendar una llamada antes de validar?
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {ejecutivoUser.whatsapp && (
                <a
                  href={`https://wa.me/${ejecutivoUser.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola ${ejecutivoUser.name.split(' ')[0]}, te contacto desde el portal de ${client.name} sobre la parrilla: ${activeOdt.nombreParrilla}.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
                  title="Abrir chat en WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp</span>
                </a>
              )}

              {ejecutivoUser.phone && (
                <a
                  href={`tel:${ejecutivoUser.phone.replace(/[^0-9+]/g, '')}`}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
                  title={`Llamar al ${ejecutivoUser.phone}`}
                >
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span>{ejecutivoUser.phone}</span>
                </a>
              )}

              {ejecutivoUser.email && (
                <a
                  href={`mailto:${ejecutivoUser.email}?subject=Consulta Parrilla ${encodeURIComponent(activeOdt.nombreParrilla)}`}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
                  title={`Enviar correo a ${ejecutivoUser.email}`}
                >
                  <Mail className="w-4 h-4 text-cyan-400" />
                  <span className="hidden xl:inline">{ejecutivoUser.email}</span>
                  <span className="xl:hidden">Correo</span>
                </a>
              )}

              <button
                onClick={() => setIsContactModalOpen(true)}
                className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>Ficha & Mensaje</span>
              </button>
            </div>
          </div>

          {/* Tabla Condensada: Número de Post | Red social | Fecha prevista | Copy In | Copy Out | Revisión */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <th className="p-3 w-28">Número</th>
                    <th className="p-3 w-24">Red Social</th>
                    <th className="p-3 w-28">Fecha Prevista</th>
                    <th className="p-3">Copy In</th>
                    <th className="p-3">Copy Out</th>
                    <th className="p-3 w-48 text-right">Revisión de Copy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {odtPosts.map((post) => {
                    const statusInfo = postStatusMap.get(post.id);
                    const isPostApproved = statusInfo?.isApproved;
                    const isPendingClient = statusInfo?.isPendingClient;
                    const isInternalPrep = statusInfo?.isInternalPrep;

                    const hasChange = post.id in postChanges;
                    const isApproved = Boolean(explicitlyApproved[post.id]);

                    return (
                      <React.Fragment key={post.id}>
                        <tr className={`hover:bg-slate-50/80 transition-colors ${
                          hasChange ? 'bg-amber-50/60' : isApproved ? 'bg-emerald-50/30' : isPendingClient ? 'bg-amber-50/20' : ''
                        }`}>
                          <td className="p-3 font-mono font-bold text-slate-900 align-top">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-800">
                                {post.numeroInterno}
                              </span>
                              {isPendingClient && approvedPostsCount > 0 && (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                  Nuevo
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 align-top font-semibold text-indigo-700">
                            {post.redSocial}
                          </td>
                          <td className="p-3 align-top text-slate-500 font-medium">
                            {post.fechaPrevista}
                          </td>
                          <td className="p-3 align-top text-slate-800 leading-relaxed font-medium">
                            {post.copyIn ? (
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-slate-900">
                                {post.copyIn}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Sin copy in</span>
                            )}
                          </td>
                          <td className="p-3 align-top text-slate-700 leading-relaxed">
                            {post.copyOut ? (
                              <div className="line-clamp-4 hover:line-clamp-none transition-all">
                                {post.copyOut}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Sin copy out</span>
                            )}
                          </td>
                          <td className="p-3 align-top text-right">
                            {isPostApproved ? (
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
                                  <Check className="w-3.5 h-3.5" /> Aprobado
                                </span>
                                <span className="text-[10px] text-emerald-700 font-medium">
                                  Copy autorizado
                                </span>
                              </div>
                            ) : isInternalPrep ? (
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-medium text-[11px]" title={`En flujo interno de APC: ${post.estado}`}>
                                  <Clock className="w-3.5 h-3.5 text-slate-400" /> Revisión APC
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {post.estado}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                {hasChange ? (
                                  <div className="flex flex-col items-end gap-1">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-amber-900 font-bold text-[11px]">
                                      <MessageSquare className="w-3 h-3 text-amber-700" /> Con cambios
                                    </span>
                                    <button
                                      onClick={() => handleMarkApproved(post.id)}
                                      className="text-[11px] text-slate-500 hover:text-emerald-700 font-semibold underline transition-colors"
                                    >
                                      Marcar aprobado
                                    </button>
                                  </div>
                                ) : isApproved ? (
                                  <div className="flex flex-col items-end gap-1">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-[11px]">
                                      <Check className="w-3 h-3 text-emerald-700" /> Listo para aprobar
                                    </span>
                                    <button
                                      onClick={() => handleRequestChange(post.id)}
                                      className="text-[11px] text-slate-500 hover:text-amber-700 font-semibold underline transition-colors"
                                    >
                                      Pedir cambio
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      onClick={() => handleMarkApproved(post.id)}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                      title="Aprobar el copy de este post"
                                    >
                                      <Check className="w-3.5 h-3.5" /> Aprobar
                                    </button>
                                    <button
                                      onClick={() => handleRequestChange(post.id)}
                                      className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                      title="Solicitar cambios en este post"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" /> Cambios
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>

                        {/* Observación contextual para este post si se seleccionó para cambio */}
                        {!isPostApproved && hasChange && (
                          <tr className="bg-amber-50/80 border-b border-amber-200">
                            <td colSpan={6} className="p-3.5 pl-6 sm:pl-10">
                              <div className="space-y-1.5 max-w-3xl">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1">
                                    <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                                    Observación específica para el Post {post.numeroInterno} ({post.redSocial}):
                                  </span>
                                  <button
                                    onClick={() => handleMarkApproved(post.id)}
                                    className="text-[11px] text-slate-500 hover:text-amber-900 font-medium underline"
                                  >
                                    Cancelar y marcar aprobado
                                  </button>
                                </div>
                                <textarea
                                  rows={2}
                                  value={postChanges[post.id] || ''}
                                  onChange={(e) => updatePostChangeComment(post.id, e.target.value)}
                                  placeholder="Escribe aquí los ajustes que necesitas en el copy in, copy out o llamada a la acción..."
                                  className="w-full text-xs p-2.5 rounded-xl border border-amber-300 bg-white text-slate-800 focus:ring-1 focus:ring-amber-500 placeholder:text-slate-400"
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Módulo de Cierre y Aprobación de la Parrilla (Al pie de la lista) */}
          {!isEntireParrillaApproved && (hasPendingAdditionalPosts || copyReadiness.isReady || changedCount > 0) && (
            <div id="modulo-cierre-parrilla" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              {/* Resumen del estado de revisión */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>
                      {hasPendingAdditionalPosts && approvedPostsCount > 0
                        ? 'Decisión sobre Publicaciones Adicionales'
                        : 'Decisión de la Parrilla de Copy'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                      {hasPendingAdditionalPosts && approvedPostsCount > 0 
                        ? `${pendingClientPosts.length} pendientes (${approvedPostsCount} ya autorizados)`
                        : `${odtPosts.length} publicaciones`}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {changedCount > 0 
                      ? `Has indicado observaciones en ${changedCount} publicación(es). Las restantes quedarán autorizadas.`
                      : hasPendingAdditionalPosts && approvedPostsCount > 0
                        ? `Puedes autorizar en bloque los ${pendingClientPosts.length} posts adicionales o indicar observaciones puntuales.`
                        : `Puedes revisar post por post o autorizar en bloque todas las publicaciones de la parrilla.`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> {approvedPostsCount} Aprobados
                  </span>
                  {hasPendingAdditionalPosts && (
                    <span className="px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {pendingClientPosts.length} Por dictaminar
                    </span>
                  )}
                  {changedCount > 0 && (
                    <span className="px-3 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" /> {changedCount} Con cambios
                    </span>
                  )}
                </div>
              </div>

              {/* Coordinación y Contacto Directo con el Ejecutivo */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-cyan-600 shrink-0" />
                  <span>
                    Seguimiento directo con tu ejecutiva: <strong className="text-slate-800">{ejecutivoUser.name}</strong> ({ejecutivoUser.cargo})
                  </span>
                </div>
                <div className="flex items-center gap-3 font-semibold shrink-0">
                  {ejecutivoUser.whatsapp && (
                    <a 
                      href={`https://wa.me/${ejecutivoUser.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola ${ejecutivoUser.name.split(' ')[0]}, te consulto sobre la decisión de la parrilla ${activeOdt.nombreParrilla}.`)}`}
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors"
                      title="Escribir por WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                  )}
                  {ejecutivoUser.phone && (
                    <a 
                      href={`tel:${ejecutivoUser.phone.replace(/[^0-9+]/g, '')}`} 
                      className="text-slate-700 hover:text-slate-900 flex items-center gap-1 transition-colors"
                      title="Llamar al teléfono"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-600" /> {ejecutivoUser.phone}
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsContactModalOpen(true)}
                    className="text-cyan-700 hover:text-cyan-800 underline font-bold cursor-pointer"
                  >
                    Ver Ficha de Contacto
                  </button>
                </div>
              </div>

              {/* Si hay cambios o se desplegó la solicitud general */}
              {(changedCount > 0 || showGeneralChangePrompt) ? (
                <div className="space-y-3 bg-amber-50/50 p-4 rounded-xl border border-amber-200">
                  <div>
                    <label className="text-xs font-bold text-amber-950 block mb-1">
                      Comentario General para el Equipo de Contenidos (Opcional):
                    </label>
                    <textarea
                      rows={2}
                      value={generalComment}
                      onChange={(e) => setGeneralComment(e.target.value)}
                      placeholder="Indicaciones generales para la ronda de ajustes (ej. tono, llamada a la acción general)..."
                      className="w-full text-xs p-2.5 rounded-xl border border-amber-300 bg-white focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <button
                      onClick={handleClearAllChanges}
                      className="text-xs text-slate-500 hover:text-slate-800 font-semibold underline text-left"
                    >
                      Descartar observaciones y marcar todo aprobado
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowApprovalModal(true)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        {hasPendingAdditionalPosts && approvedPostsCount > 0
                          ? `Aprobar Posts Nuevos (${pendingClientPosts.length})`
                          : 'Aprobar Toda la Parrilla'}
                      </button>
                      <button
                        onClick={handleSubmitChanges}
                        className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Enviar Solicitud de Ajustes ({changedCount > 0 ? `${changedCount} posts` : 'Parrilla general'})
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="text-xs text-slate-500">
                    {hasPendingAdditionalPosts && approvedPostsCount > 0
                      ? 'Al presionar "Aprobar Posts Nuevos", se autorizan los copys adicionales y se envían directamente a producción técnica.'
                      : 'Al presionar "Aprobar Toda la Parrilla", se autorizan los copys y pasan a las áreas técnicas de diseño y video.'}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setShowGeneralChangePrompt(true)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Solicitar Ajustes
                    </button>
                    <button
                      onClick={() => setShowApprovalModal(true)}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {hasPendingAdditionalPosts && approvedPostsCount > 0
                        ? `Aprobar Posts Nuevos (${pendingClientPosts.length})`
                        : 'Aprobar Toda la Parrilla'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA HISTORIAL: RONDAS DE REVISIÓN INMUTABLES                            */}
      {/* ========================================================================= */}
      {activeTab === 'historial' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-slate-700" />
              Historial de Rondas de Revisión — {activeOdt.nombreParrilla}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Registro inmutable de todas las revisiones y autorizaciones de Copy de la Parrilla.
            </p>
          </div>

          {rondasAprobacion.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold">No se han registrado rondas de aprobación en esta Parrilla aún.</p>
              <p className="text-xs text-slate-400 mt-1">
                Al presionar "Aprobar Toda la Parrilla" o "Solicitar Cambios" se registrará la Ronda 1.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {rondasAprobacion.map((round, idx) => {
                const isApproved = round.estado === 'Aprobada';

                return (
                  <div 
                    key={round.id || idx}
                    className={`p-4 rounded-xl border ${
                      isApproved 
                        ? 'bg-emerald-50/50 border-emerald-200' 
                        : 'bg-amber-50/50 border-amber-200'
                    } space-y-2`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                          isApproved 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-amber-600 text-white'
                        }`}>
                          Ronda {round.ronda}
                        </span>
                        <span className={`text-xs font-bold ${
                          isApproved ? 'text-emerald-800' : 'text-amber-800'
                        }`}>
                          {round.estado}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 flex items-center gap-3">
                        <span>Revisor: <strong className="text-slate-800">{round.usuarioName}</strong></span>
                        <span>Fecha: <strong className="text-slate-800">{round.fecha}</strong></span>
                      </div>
                    </div>

                    {round.comentarioGeneral && (
                      <div className="text-xs text-slate-700 bg-white/80 p-2.5 rounded-lg border border-slate-200/60">
                        <span className="font-bold text-slate-900 block mb-0.5">Observación General:</span>
                        "{round.comentarioGeneral}"
                      </div>
                    )}

                    {/* Posts afectados por cambios */}
                    {round.cambiosPorPost && round.cambiosPorPost.length > 0 && (
                      <div className="mt-2 space-y-1.5 pt-2 border-t border-amber-200/60">
                        <span className="text-[11px] font-bold text-amber-950 uppercase tracking-wider block">
                          Publicaciones con observaciones ({round.cambiosPorPost.length}):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {round.cambiosPorPost.map((ch, chIdx) => (
                            <div key={chIdx} className="bg-white p-2 rounded-lg border border-amber-200 text-xs">
                              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded mr-1">
                                {ch.numeroInterno}
                              </span>
                              <span className="text-slate-700">{ch.comentario}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CONFIRMACIÓN: APROBAR TODA LA PARRILLA                           */}
      {/* ========================================================================= */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {hasPendingAdditionalPosts && approvedPostsCount > 0
                      ? `Autorizar ${pendingClientPosts.length} Publicación(es) Adicional(es)`
                      : 'Aprobar Toda la Parrilla de Copy'}
                  </h4>
                  <p className="text-xs text-slate-500">{activeOdt.nombreParrilla}</p>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
              <p>
                {hasPendingAdditionalPosts && approvedPostsCount > 0 ? (
                  <>
                    Estás a punto de autorizar los copys de las <strong>{pendingClientPosts.length} publicaciones adicionales</strong> ({pendingClientPosts.map(p => `#${p.numeroInterno}`).join(', ')}) en la <strong>Ronda {currentCopyRoundNumber}</strong>. Las <strong>{approvedPostsCount} publicaciones previamente autorizadas</strong> no se alteran y continúan en producción técnica.
                  </>
                ) : (
                  <>
                    Estás a punto de autorizar en bloque los copys de las <strong>{odtPosts.length} publicaciones</strong> de esta parrilla en la <strong>Ronda {currentCopyRoundNumber}</strong>.
                  </>
                )}
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700">
                <span className="font-bold text-slate-900 block mb-1">Efecto del flujo operativo:</span>
                Al autorizar, las publicaciones pasarán a las áreas de producción técnica (Arte y Audio/Video). Tu dictamen quedará formalmente asentado en la auditoría inmutable de la agencia.
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Nota de autorización o felicitaciones (Opcional):
              </label>
              <textarea
                rows={2}
                value={approvalGeneralComment}
                onChange={(e) => setApprovalGeneralComment(e.target.value)}
                placeholder="Ej: Aprobados los copys. Excelente enfoque..."
                className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Notificación al Ejecutivo */}
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-cyan-50 border border-cyan-200 text-xs text-cyan-950">
              <UserCheck className="w-4 h-4 text-cyan-700 shrink-0" />
              <div>
                <span>
                  Al autorizar, se notificará de inmediato a tu ejecutiva titular: <strong>{ejecutivoUser.name}</strong> ({ejecutivoUser.email}).
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setApprovalGeneralComment('');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmApproval}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                {hasPendingAdditionalPosts && approvedPostsCount > 0
                  ? 'Confirmar y Autorizar Posts Nuevos'
                  : 'Confirmar y Autorizar Parrilla'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: FICHA COMPLETA DE CONTACTO CON TU EJECUTIVO DE CUENTA               */}
      {/* ========================================================================= */}
      {isContactModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 space-y-0">
            {/* Header del Modal */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 p-6 text-white relative">
              <button
                onClick={() => setIsContactModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  {ejecutivoUser.avatar ? (
                    <img
                      src={ejecutivoUser.avatar}
                      alt={ejecutivoUser.name}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-cyan-400 shadow-md"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-cyan-700 text-white font-black flex items-center justify-center text-xl border-2 border-cyan-400 shadow-md">
                      {ejecutivoUser.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900" title="Disponible" />
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded-md border border-cyan-800">
                      Ejecutivo Asignado
                    </span>
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Disponible
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{ejecutivoUser.name}</h3>
                  <p className="text-xs text-slate-300">{ejecutivoUser.cargo}</p>
                  <p className="text-[11px] text-cyan-200">
                    Marca: <strong>{client.name}</strong> • Parrilla: <strong>{activeOdt.nombreParrilla}</strong>
                  </p>
                </div>
              </div>

              {/* Botones de acción principal en el header */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-700/60">
                {ejecutivoUser.whatsapp && (
                  <a
                    href={`https://wa.me/${ejecutivoUser.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola ${ejecutivoUser.name.split(' ')[0]}, te escribo desde el portal de ${client.name} sobre la parrilla: ${activeOdt.nombreParrilla}.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </a>
                )}

                {ejecutivoUser.phone && (
                  <a
                    href={`tel:${ejecutivoUser.phone.replace(/[^0-9+]/g, '')}`}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
                  >
                    <Phone className="w-4 h-4 text-emerald-400" />
                    <span>Llamar</span>
                  </a>
                )}

                {ejecutivoUser.email && (
                  <a
                    href={`mailto:${ejecutivoUser.email}?subject=Consulta Parrilla ${encodeURIComponent(activeOdt.nombreParrilla)}`}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
                  >
                    <Mail className="w-4 h-4 text-cyan-400" />
                    <span>Email</span>
                  </a>
                )}
              </div>
            </div>

            {/* Cuerpo del Modal: Datos Detallados de Contacto */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Teléfono */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" /> Teléfono Directo
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{ejecutivoUser.phone || 'No disponible'}</span>
                    {ejecutivoUser.phone && (
                      <button
                        onClick={() => handleCopy(ejecutivoUser.phone || '', 'phone')}
                        className="text-xs text-cyan-700 hover:text-cyan-800 font-semibold p-1 hover:bg-cyan-50 rounded cursor-pointer"
                        title="Copiar teléfono"
                      >
                        {copiedField === 'phone' ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Correo Electrónico */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-cyan-600" /> Correo Electrónico
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 truncate max-w-[170px]" title={ejecutivoUser.email}>
                      {ejecutivoUser.email}
                    </span>
                    {ejecutivoUser.email && (
                      <button
                        onClick={() => handleCopy(ejecutivoUser.email || '', 'email')}
                        className="text-xs text-cyan-700 hover:text-cyan-800 font-semibold p-1 hover:bg-cyan-50 rounded cursor-pointer"
                        title="Copiar correo"
                      >
                        {copiedField === 'email' ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Horario de Atención */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" /> Horario Habitual
                  </span>
                  <p className="text-xs font-bold text-slate-900 leading-snug">
                    {ejecutivoUser.horarioAtencion}
                  </p>
                </div>

                {/* Tiempo Estimado de Respuesta */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Nivel de Servicio (SLA)
                  </span>
                  <p className="text-xs font-bold text-slate-900 leading-snug">
                    &lt; 15 min en horario hábil
                  </p>
                </div>
              </div>

              {/* Formulario de Mensaje Rápido Directo */}
              <div className="pt-2 border-t border-slate-100">
                <form onSubmit={handleSendQuickMessage} className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-cyan-700" />
                      Enviar Nota o Solicitud de Llamada a {ejecutivoUser.name.split(' ')[0]}:
                    </label>
                  </div>

                  {quickMessageSent ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <strong>¡Mensaje enviado con éxito!</strong> Tu ejecutiva {ejecutivoUser.name} ha recibido tu nota y te contactará a la brevedad.
                      </div>
                    </div>
                  ) : (
                    <>
                      <textarea
                        rows={2}
                        value={quickMessage}
                        onChange={(e) => setQuickMessage(e.target.value)}
                        placeholder={`Ej: Hola ${ejecutivoUser.name.split(' ')[0]}, ¿podemos tener una breve llamada hoy a las 4pm para revisar los copys de la campaña?`}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-1 focus:ring-cyan-500 leading-relaxed"
                        required
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          Recibirás respuesta a tu correo o por WhatsApp.
                        </span>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Enviar Mensaje</span>
                        </button>
                      </div>
                    </>
                  )}
                </form>
              </div>
            </div>

            {/* Footer del Modal */}
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">
                APC Publicidad • Agencia de Contenidos & Estrategia
              </span>
              <button
                onClick={() => setIsContactModalOpen(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
