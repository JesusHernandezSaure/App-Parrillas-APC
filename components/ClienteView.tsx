import React, { useState, useMemo, useEffect } from 'react';
import { Post, ODT, Client, User } from '../types';
import { 
  Building2, CheckCircle2, AlertTriangle, ShieldCheck, 
  MessageSquare, History, Sparkles, Send, Check, AlertCircle,
  Phone, Mail, MessageCircle, Clock, UserCheck, ExternalLink,
  Copy, CheckCheck, X, ChevronRight, ChevronLeft, Eye,
  ChevronDown, Layers, Calendar
} from 'lucide-react';
import { 
  checkParrillaCopyReadiness, 
  getCurrentRoundNumber,
  sanitizePostForClient 
} from '../services/odtService';
import { RichTextDisplay } from './RichTextDisplay';

interface ClienteViewProps {
  posts: Post[];
  odts: ODT[];
  client: Client;
  availableClients?: Client[];
  onSelectClient?: (clientId: string) => void;
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
  onApproveSinglePost?: (post: Post, comment?: string) => void;
  onRequestChangeSinglePost?: (post: Post, comment: string) => void;
}

export const ClienteView: React.FC<ClienteViewProps> = ({
  posts,
  odts,
  client,
  availableClients,
  onSelectClient,
  currentUser,
  users,
  onBatchApproveParrilla,
  onBatchRequestChanges,
  onSelectPost,
  onApproveSinglePost,
  onRequestChangeSinglePost
}) => {
  // Filtro estricto por cliente
  const clientOdts = useMemo(() => {
    return odts.filter(o => o.clientId === client.id);
  }, [odts, client.id]);

  // Selección de Parrilla (consultar únicamente la ODT abierta)
  const [selectedOdtId, setSelectedOdtId] = useState<string>(() => {
    return clientOdts.length > 0 ? clientOdts[0].id : '';
  });

  // Si cambia el cliente seleccionado (por conmutador multi-marca), resetear a la primera ODT de esa marca
  useEffect(() => {
    const brandOdts = odts.filter(o => o.clientId === client.id);
    if (brandOdts.length > 0) {
      if (!brandOdts.some(o => o.id === selectedOdtId)) {
        setSelectedOdtId(brandOdts[0].id);
      }
    } else {
      setSelectedOdtId('');
    }
  }, [client.id, odts]);

  // Asegurar ODT seleccionada válida si cambia la lista
  const activeOdt = useMemo(() => {
    if (!selectedOdtId && clientOdts.length > 0) return clientOdts[0];
    return clientOdts.find(o => o.id === selectedOdtId) || (clientOdts.length > 0 ? clientOdts[0] : null);
  }, [clientOdts, selectedOdtId]);

  // Pestaña activa dentro de la Parrilla: únicamente 'copy' e 'historial'
  const [activeTab, setActiveTab] = useState<'copy' | 'historial'>('copy');

  // Filtro estricto para Cliente: sólo lo que expresamente el ejecutivo envió o ya está aprobado/dictaminado
  const isPostVisibleToClient = (p: Post) => {
    // 1. Enviado expresamente por el ejecutivo a revisión de copy o material
    if (p.estado === 'Aprobación Copy Cliente' || p.estado === 'Aprobación Material Cliente') {
      return true;
    }
    // 2. Posts donde el cliente solicitó cambios en esta o rondas previas
    if (
      p.estado === 'Cambios solicitados por Cliente' || 
      p.aprobacionClienteCopy?.status === 'Cambios Solicitados' || 
      p.aprobacionClienteMaterial?.status === 'Cambios Solicitados'
    ) {
      return true;
    }
    // 3. Posts ya aprobados previamente por el cliente
    if (p.aprobacionClienteCopy?.status === 'Aprobado' || p.aprobacionClienteMaterial?.status === 'Aprobado') {
      return true;
    }
    // 4. Posts en etapas avanzadas de producción que ya pasaron visto bueno de cliente
    if ([
      'Producción Arte', 'Producción Audio/Video', 'Corrección Material',
      'Revisión Médica Material', 'Aprobación Interna Final',
      'Listo para Publicar', 'Programado', 'Publicado'
    ].includes(p.estado)) {
      return true;
    }
    // Ocultar al 100% lo que esté en filtro interno (Borrador, Redacción de Copy, Revisión Copy, Revisión Médica Copy, Ajustes de Copy, Esperando Ejecutivo)
    return false;
  };

  // Posts ÚNICAMENTE de la ODT seleccionada que han sido expresamente enviados al cliente o aprobados
  const odtPosts = useMemo(() => {
    if (!activeOdt) return [];
    return posts
      .filter(p => p.odtId === activeOdt.id && isPostVisibleToClient(p))
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

  // Estado para copiar correo u otros datos
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, field: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
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
    setViewingPost(null);
  };

  // Modal "Ver Post" exclusivo para revisión del Cliente (sin opciones de edición)
  const [viewingPost, setViewingPost] = useState<Post | null>(null);
  const [modalComment, setModalComment] = useState<string>('');
  const [isModalChangeActive, setIsModalChangeActive] = useState<boolean>(false);

  // Sincronizar comentario del modal con los cambios registrados
  useEffect(() => {
    if (viewingPost) {
      if (postChanges[viewingPost.id]) {
        setModalComment(postChanges[viewingPost.id]);
        setIsModalChangeActive(true);
      } else {
        setModalComment('');
        setIsModalChangeActive(false);
      }
    }
  }, [viewingPost, postChanges]);

  // Navegación entre posts visibles en el modal
  const viewingPostIndex = useMemo(() => {
    if (!viewingPost) return -1;
    return odtPosts.findIndex(p => p.id === viewingPost.id);
  }, [viewingPost, odtPosts]);

  const handlePrevPost = () => {
    if (viewingPostIndex > 0) {
      setViewingPost(odtPosts[viewingPostIndex - 1]);
    }
  };

  const handleNextPost = () => {
    if (viewingPostIndex >= 0 && viewingPostIndex < odtPosts.length - 1) {
      setViewingPost(odtPosts[viewingPostIndex + 1]);
    }
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

  // Notificación de confirmación tras acción directa
  const [successNotif, setSuccessNotif] = useState<{ postId: string; message: string; type: 'change' | 'approved' } | null>(null);

  // Enviar cambio de un post individual directamente al Community Manager
  const handleSendSinglePostChange = (post: Post) => {
    const comment = (postChanges[post.id] || '').trim();
    if (!comment) {
      alert('Por favor escribe los ajustes o comentarios que necesitas en esta publicación.');
      return;
    }

    if (onRequestChangeSinglePost) {
      onRequestChangeSinglePost(post, comment);
    } else if (activeOdt) {
      onBatchRequestChanges(activeOdt.id, 'COPY', '', [{ postId: post.id, comment }]);
    }

    // Limpiar borrador local
    setPostChanges(prev => {
      const next = { ...prev };
      delete next[post.id];
      return next;
    });

    setSuccessNotif({
      postId: post.id,
      message: `¡Observación enviada al Community Manager! El post #${post.numeroInterno} pasó a Ajustes de Copy.`,
      type: 'change'
    });
    setTimeout(() => setSuccessNotif(null), 4500);
  };

  // Aprobar un post individual directamente
  const handleDirectApprovePost = (post: Post) => {
    if (onApproveSinglePost) {
      onApproveSinglePost(post);
    } else {
      handleMarkApproved(post.id);
    }

    // Limpiar borrador local si existía
    setPostChanges(prev => {
      const next = { ...prev };
      delete next[post.id];
      return next;
    });

    setSuccessNotif({
      postId: post.id,
      message: `¡Post #${post.numeroInterno} autorizado exitosamente!`,
      type: 'approved'
    });
    setTimeout(() => setSuccessNotif(null), 3500);
  };

  // Modal: Aprobar post actual y avanzar de inmediato al siguiente sin cerrarse
  const handleModalApproveAndNext = (post: Post) => {
    handleDirectApprovePost(post);
    if (viewingPostIndex < odtPosts.length - 1) {
      setViewingPost(odtPosts[viewingPostIndex + 1]);
    } else {
      setViewingPost(null);
    }
  };

  // Modal: Enviar cambio del post actual al Community Manager y avanzar de inmediato al siguiente
  const handleModalSubmitChangeAndNext = (post: Post) => {
    const comment = (modalComment || postChanges[post.id] || '').trim();
    if (!comment) {
      alert('Por favor describe los ajustes que necesitas en esta publicación.');
      return;
    }

    if (onRequestChangeSinglePost) {
      onRequestChangeSinglePost(post, comment);
    } else if (activeOdt) {
      onBatchRequestChanges(activeOdt.id, 'COPY', '', [{ postId: post.id, comment }]);
    }

    setModalComment('');
    setIsModalChangeActive(false);
    setPostChanges(prev => {
      const next = { ...prev };
      delete next[post.id];
      return next;
    });

    setSuccessNotif({
      postId: post.id,
      message: `¡Observación enviada al Community Manager! El post #${post.numeroInterno} pasó a Ajustes de Copy.`,
      type: 'change'
    });
    setTimeout(() => setSuccessNotif(null), 4500);

    if (viewingPostIndex < odtPosts.length - 1) {
      setViewingPost(odtPosts[viewingPostIndex + 1]);
    } else {
      setViewingPost(null);
    }
  };

  // Limpiar borradores locales de observaciones no enviadas
  const handleClearAllChanges = () => {
    setPostChanges({});
    setShowGeneralChangePrompt(false);
  };

  // Guardar / Enviar únicamente el comentario general de la parrilla (100% independiente de los posts)
  const handleSaveGeneralCommentOnly = () => {
    if (!activeOdt) return;
    const cleanComment = generalComment.trim();
    if (!cleanComment) {
      alert('Por favor escribe una indicación o comentario general para toda la parrilla antes de enviar.');
      return;
    }
    // Registra el comentario general de la parrilla sin alterar las notas individuales de los posts
    onBatchRequestChanges(activeOdt.id, 'COPY', cleanComment, []);
    setSuccessNotif({
      postId: 'general',
      message: '¡Comentario general de la parrilla registrado y enviado al equipo de cuenta!',
      type: 'change'
    });
    setTimeout(() => setSuccessNotif(null), 4000);
  };

  // Enviar solicitud de cambios (observaciones individuales de posts + comentario general si existe)
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

    onBatchRequestChanges(activeOdt.id, 'COPY', generalComment.trim(), affected);
    setPostChanges({});
    setShowGeneralChangePrompt(false);
    setSuccessNotif({
      postId: 'batch',
      message: `¡Observaciones enviadas al equipo de cuenta! (${affected.length} post(s)${generalComment.trim() ? ' + Comentario general' : ''})`,
      type: 'change'
    });
    setTimeout(() => setSuccessNotif(null), 4500);
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
      <div className="space-y-4">
        {/* Selector de Marcas Asignadas (Multi-Empresa) para cambiar de marca aun si esta no tiene parrillas */}
        {availableClients && availableClients.length > 1 && (
          <div className="bg-white rounded-2xl p-4 border border-cyan-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-black uppercase tracking-wider text-cyan-900">
                  Tus Marcas / Empresas Asignadas
                </div>
                <div className="text-xs text-slate-500">
                  Tienes acceso a {availableClients.length} cuentas. Selecciona una marca para revisar sus parrillas:
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {availableClients.map(c => {
                const isCurrent = c.id === client.id;
                const brandOdts = odts.filter(o => o.clientId === c.id);
                const brandPending = posts.filter(p => p.clientId === c.id && p.estado === 'Aprobación Copy Cliente').length;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onSelectClient?.(c.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                      isCurrent
                        ? 'bg-cyan-700 text-white border-cyan-800 shadow-xs ring-2 ring-cyan-400/50'
                        : 'bg-slate-50 hover:bg-cyan-50 text-slate-700 hover:text-cyan-900 border-slate-200 hover:border-cyan-300'
                    }`}
                  >
                    <Building2 className={`w-3.5 h-3.5 ${isCurrent ? 'text-cyan-200' : 'text-slate-400'}`} />
                    <span>{c.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isCurrent ? 'bg-cyan-900 text-cyan-100' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {brandOdts.length}
                    </span>
                    {brandPending > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900 font-black animate-pulse">
                        {brandPending}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center shadow-xs">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No hay Parrillas disponibles para {client.name}</h3>
          <p className="text-xs text-slate-500 mt-1">
            Tu equipo de cuenta APC no ha asignado ninguna parrilla activa en este momento para esta marca.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Selector Superior de Marcas / Empresas Asignadas (Multi-Empresa) */}
      {availableClients && availableClients.length > 1 && (
        <div className="bg-white rounded-2xl p-4 border border-cyan-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-pink-500 text-white flex items-center justify-center font-bold shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-900">
                  Tus Marcas / Empresas Asignadas
                </span>
                <span className="text-[10px] px-2 py-0.2 bg-cyan-100 text-cyan-900 rounded-full font-extrabold border border-cyan-200">
                  {availableClients.length} marcas autorizadas
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Haz clic en cualquier marca para auditar y dictaminar sus contenidos correspondientes:
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {availableClients.map(c => {
              const isCurrent = c.id === client.id;
              const brandOdts = odts.filter(o => o.clientId === c.id);
              const brandPending = posts.filter(p => p.clientId === c.id && p.estado === 'Aprobación Copy Cliente').length;

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectClient?.(c.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                    isCurrent
                      ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white border-teal-800 shadow-sm ring-2 ring-emerald-400/50'
                      : 'bg-slate-50 hover:bg-cyan-50 text-slate-700 hover:text-cyan-900 border-slate-200 hover:border-cyan-300'
                  }`}
                >
                  <Building2 className={`w-3.5 h-3.5 ${isCurrent ? 'text-emerald-100' : 'text-slate-400'}`} />
                  <span>{c.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isCurrent ? 'bg-black/30 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {brandOdts.length} {brandOdts.length === 1 ? 'parrilla' : 'parrillas'}
                  </span>
                  {brandPending > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black animate-pulse shadow-2xs">
                      {brandPending} por revisar
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Header Cliente & Selector de Parrillas */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm space-y-4 relative overflow-hidden">
        {/* Barra superior con gradiente Verde y Rosa de APC Digital Hub */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-pink-500" />
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

        {/* Selector de Parrilla Activa en Menú Desplegable */}
        <div className="pt-3.5 border-t border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold shrink-0">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Parrilla activa:</span>
            </div>

            {clientOdts.length > 1 ? (
              <div className="relative inline-block w-full sm:w-auto min-w-[280px] lg:min-w-[340px]">
                <select
                  value={activeOdt.id}
                  onChange={(e) => handleSwitchOdt(e.target.value)}
                  aria-label="Seleccionar parrilla activa"
                  className="w-full appearance-none bg-slate-800/90 hover:bg-slate-800 text-white font-bold text-xs pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-700 hover:border-cyan-500/50 focus:outline-hidden focus:ring-2 focus:ring-cyan-500/50 transition-all cursor-pointer shadow-xs"
                >
                  {clientOdts.map((odt) => {
                    const visibleCount = posts.filter(p => p.odtId === odt.id && isPostVisibleToClient(p)).length;
                    const pendingCount = posts.filter(p => p.odtId === odt.id && p.estado === 'Aprobación Copy Cliente').length;
                    const extraLabel = pendingCount > 0 ? `(${pendingCount} por revisar)` : visibleCount > 0 ? `(${visibleCount} posts)` : '(En preparación)';
                    return (
                      <option key={odt.id} value={odt.id} className="bg-slate-900 text-white py-2">
                        {odt.nombreParrilla} — {odt.mesPeriodo} {extraLabel}
                      </option>
                    );
                  })}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-cyan-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 bg-slate-800/70 border border-slate-700/80 px-3.5 py-1.5 rounded-xl text-xs">
                <span className="font-bold text-white">{activeOdt.nombreParrilla}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold">
                  {activeOdt.mesPeriodo}
                </span>
              </div>
            )}
          </div>

          {/* Resumen rápido de la parrilla seleccionada */}
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="text-slate-400">Posts en revisión:</span>
            <span className="font-bold text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
              {totalPostsCount} {totalPostsCount === 1 ? 'publicación' : 'publicaciones'}
            </span>
            {pendingClientPosts.length > 0 && (
              <span className="text-[11px] font-bold text-amber-300 bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-800 flex items-center gap-1.5 shadow-2xs animate-pulse">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                {pendingClientPosts.length} por dictaminar
              </span>
            )}
          </div>
        </div>

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

          {/* Acciones directas de comunicación: WhatsApp, Teléfono y Correo */}
          <div className="flex items-center gap-2 flex-wrap">
            {ejecutivoUser.whatsapp && (
              <a
                href={`https://wa.me/${ejecutivoUser.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola ${ejecutivoUser.name.split(' ')[0]}, te escribo desde el portal de ${client.name} sobre la parrilla: ${activeOdt?.nombreParrilla || 'Contenidos'}.`)}`}
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
              <div className="inline-flex items-center rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shadow-xs">
                <a
                  href={`mailto:${ejecutivoUser.email}?subject=${encodeURIComponent(`Consulta Parrilla: ${activeOdt?.nombreParrilla || 'Contenidos'} (${client.name})`)}`}
                  className="px-3 py-1.5 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title={`Enviar correo electrónico directo a ${ejecutivoUser.email}`}
                >
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">{ejecutivoUser.email}</span>
                  <span className="sm:hidden">Correo</span>
                </a>
                <button
                  type="button"
                  onClick={() => handleCopy(ejecutivoUser.email, 'email')}
                  className="px-2 py-1.5 hover:bg-slate-700 text-slate-400 hover:text-white border-l border-slate-700 transition-colors"
                  title="Copiar correo al portapapeles"
                >
                  {copiedField === 'email' ? (
                    <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold">
                      <Check className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Copiado</span>
                    </span>
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            )}
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
            ) : totalPostsCount === 0 ? (
              <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-xl text-xs text-cyan-950 flex items-start gap-3">
                <Clock className="w-5 h-5 text-cyan-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold text-sm block mb-0.5 text-cyan-900">
                    Parrilla en preparación interna por el equipo de APC
                  </strong>
                  <p className="text-cyan-800 leading-relaxed">
                    Tu equipo de redacción y corrección se encuentra preparando los contenidos con todos los filtros de calidad. En cuanto tu ejecutiva ({ejecutivoUser.name}) te envíe los posts a revisión, se habilitarán aquí para tu visto bueno.
                  </p>
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
                  href={`https://wa.me/${ejecutivoUser.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola ${ejecutivoUser.name.split(' ')[0]}, te contacto desde el portal de ${client.name} sobre la parrilla: ${activeOdt?.nombreParrilla || 'Contenidos'}.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                  title="Abrir chat en WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp</span>
                </a>
              )}

              {ejecutivoUser.phone && (
                <a
                  href={`tel:${ejecutivoUser.phone.replace(/[^0-9+]/g, '')}`}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                  title={`Llamar al ${ejecutivoUser.phone}`}
                >
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span>{ejecutivoUser.phone}</span>
                </a>
              )}

              {ejecutivoUser.email && (
                <div className="inline-flex items-center rounded-xl bg-slate-800 border border-slate-600 shadow-2xs overflow-hidden">
                  <a
                    href={`mailto:${ejecutivoUser.email}?subject=${encodeURIComponent(`Consulta Parrilla: ${activeOdt?.nombreParrilla || 'Contenidos'}`)}`}
                    className="px-3.5 py-2 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                    title={`Enviar correo a ${ejecutivoUser.email}`}
                  >
                    <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>{ejecutivoUser.email}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopy(ejecutivoUser.email || '', 'email')}
                    className="px-2.5 py-2 hover:bg-slate-700 text-slate-400 hover:text-cyan-300 border-l border-slate-700 text-xs font-medium transition-colors cursor-pointer"
                    title="Copiar dirección de correo"
                  >
                    {copiedField === 'email' ? (
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Notificación de acción individual */}
          {successNotif && (
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-2 text-xs font-bold transition-all shadow-xs animate-in fade-in duration-200 ${
              successNotif.type === 'approved' 
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                : 'bg-amber-50 text-amber-900 border-amber-300'
            }`}>
              <div className="flex items-center gap-2">
                {successNotif.type === 'approved' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <Send className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span>{successNotif.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessNotif(null)}
                className="p-1 hover:bg-black/5 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Tabla Condensada o Estado Vacío */}
          {odtPosts.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 border border-slate-200 shadow-2xs text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center mx-auto border border-cyan-100">
                <Clock className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-800">
                Publicaciones en preparación interna por APC
              </h4>
              <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
                Tu equipo de redacción y corrección se encuentra trabajando en la preparación y filtros de calidad de esta parrilla.
                En cuanto tu ejecutiva ({ejecutivoUser.name}) te envíe los posts a revisión, se habilitarán aquí para tu dictamen.
              </p>
              {ejecutivoUser.whatsapp && (
                <div className="pt-2">
                  <a
                    href={`https://wa.me/${ejecutivoUser.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola ${ejecutivoUser.name.split(' ')[0]}, te consulto sobre la entrega de la parrilla ${activeOdt.nombreParrilla}.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Consultar estatus con {ejecutivoUser.name.split(' ')[0]}</span>
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                      <th className="p-3 w-44">Publicación</th>
                      <th className="p-3 w-[36%] min-w-[200px]">Copy In</th>
                      <th className="p-3 w-[36%] min-w-[200px]">Copy Out</th>
                      <th className="p-3 w-36 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {odtPosts.map((post) => {
                      const statusInfo = postStatusMap.get(post.id);
                      const isPostApproved = statusInfo?.isApproved;
                      const isPendingClient = statusInfo?.isPendingClient;
                      const hasChange = post.id in postChanges;
                      const isApproved = Boolean(explicitlyApproved[post.id]);
                      const isChangeRequested = post.estado === 'Cambios solicitados por Cliente';

                      // Buscar observación previa de cambios enviada por el cliente para no perderla jamás de vista
                      const clientSentComment = (post.aprobacionClienteCopy?.status === 'Cambios Solicitados' ? post.aprobacionClienteCopy.comment : null) || 
                        post.comentarios?.find(c => c.isClientVisible && (c.userRole === 'Cliente' || c.text.includes('[Revisión') || c.text.includes('Cliente')) && !c.text.startsWith('[Nota General de Parrilla]:') && !c.text.toLowerCase().includes('aprobado'))?.text || 
                        null;

                      return (
                        <React.Fragment key={post.id}>
                          <tr className={`hover:bg-slate-50/80 transition-colors ${
                            hasChange ? 'bg-amber-50/60' : isApproved ? 'bg-emerald-50/30' : isChangeRequested ? 'bg-amber-50/30' : isPendingClient ? 'bg-amber-50/20' : ''
                          }`}>
                            {/* Columna Vertical de Metadatos de la Publicación */}
                            <td className="p-3 align-top">
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono text-[11px] font-bold tracking-tight">
                                    {post.numeroInterno}
                                  </span>
                                  {isPendingClient && approvedPostsCount > 0 && (
                                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                      Nuevo
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                                    {post.redSocial}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>{post.fechaPrevista}</span>
                                </div>
                                {post.tipoMaterial && (
                                  <span className="text-[10px] text-slate-500 font-semibold truncate max-w-[140px]" title={post.tipoMaterial}>
                                    {post.tipoMaterial}
                                  </span>
                                )}

                                {/* Enlace de la Imagen / Material de Referencia */}
                                {post.enlaceReferencia ? (
                                  <div className="pt-1 mt-0.5 border-t border-slate-100">
                                    <a
                                      href={post.enlaceReferencia}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1.5 px-2 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 hover:border-cyan-300 rounded-lg text-[10px] font-bold transition-all shadow-2xs group max-w-[155px]"
                                      title={`Abrir referencia: ${post.enlaceReferencia}`}
                                    >
                                      <ExternalLink className="w-3 h-3 text-cyan-600 shrink-0 group-hover:scale-110 transition-transform" />
                                      <span className="truncate">Ref. Imagen</span>
                                    </a>
                                  </div>
                                ) : (
                                  <div className="pt-0.5">
                                    <span className="text-[10px] text-slate-400 italic">
                                      Sin ref.
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Columna Copy In con salto de línea y ancho controlado */}
                            <td className="p-3 align-top text-slate-800 leading-relaxed font-medium">
                              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 max-h-56 overflow-y-auto break-words">
                                <RichTextDisplay content={post.copyIn} fallbackText="Sin copy in" showCopyButton copyButtonLabel="Copiar" />
                              </div>
                            </td>

                            {/* Columna Copy Out con salto de línea y ancho controlado */}
                            <td className="p-3 align-top text-slate-700 leading-relaxed">
                              <div className="bg-slate-50/60 p-2.5 rounded-lg border border-slate-200/60 max-h-56 overflow-y-auto break-words">
                                <RichTextDisplay content={post.copyOut} fallbackText="Sin copy out" showCopyButton copyButtonLabel="Copiar" />
                              </div>
                            </td>

                            {/* Columna Acciones Verticales y Compactas */}
                            <td className="p-3 align-top">
                              <div className="flex flex-col gap-1.5 w-full">
                                {/* Botón "Ver post completo" */}
                                <button
                                  type="button"
                                  onClick={() => setViewingPost(post)}
                                  className="w-full px-2 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs hover:shadow-xs"
                                  title="Abrir vista detallada para revisar cómodamente"
                                >
                                  <Eye className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                  <span>Ver completo</span>
                                </button>

                                {/* Decisiones de Estado */}
                                {isPostApproved ? (
                                  <div className="w-full py-1.5 px-2 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1 border border-emerald-300">
                                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                                    <span>Aprobado</span>
                                  </div>
                                ) : isChangeRequested ? (
                                  <div className="flex flex-col gap-1 w-full">
                                    <div className="w-full py-1 px-1.5 rounded-lg bg-amber-100 text-amber-900 font-bold text-[11px] flex items-center justify-center gap-1 border border-amber-300">
                                      <Clock className="w-3 h-3 text-amber-700 shrink-0" />
                                      <span>En Ajustes</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleRequestChange(post.id)}
                                      className="text-[10px] text-center text-slate-600 hover:text-amber-800 font-semibold underline transition-colors cursor-pointer"
                                      title="Editar o agregar notas adicionales a este post"
                                    >
                                      Editar nota
                                    </button>
                                  </div>
                                ) : hasChange ? (
                                  <div className="flex flex-col gap-1 w-full">
                                    <span className="w-full text-center py-1 px-1.5 rounded-md bg-amber-100 border border-amber-300 text-amber-900 font-bold text-[11px] flex items-center justify-center gap-1">
                                      <MessageSquare className="w-3 h-3 text-amber-700" />
                                      <span>Editando nota</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleDirectApprovePost(post)}
                                      className="text-[10px] text-center text-slate-500 hover:text-emerald-700 font-semibold underline transition-colors cursor-pointer"
                                    >
                                      Aprobar post
                                    </button>
                                  </div>
                                ) : isApproved ? (
                                  <div className="flex flex-col gap-1 w-full">
                                    <span className="w-full text-center py-1 px-1.5 rounded-md bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-[11px] flex items-center justify-center gap-1">
                                      <Check className="w-3 h-3 text-emerald-700" />
                                      <span>Listo p/ aprobar</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleRequestChange(post.id)}
                                      className="text-[10px] text-center text-slate-500 hover:text-amber-700 font-semibold underline transition-colors cursor-pointer"
                                    >
                                      Pedir cambio
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleDirectApprovePost(post)}
                                      className="w-full px-2 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                                      title="Aprobar el copy de este post directamente"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Aprobar</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRequestChange(post.id)}
                                      className="w-full px-2 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                                      title="Solicitar cambios en este post"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                                      <span>Cambios</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Fila con la Observación Ya Enviada al Community (Solo visible si el post NO está aprobado y requiere ajustes) */}
                          {!isPostApproved && (clientSentComment || isChangeRequested) && !hasChange && (
                            <tr className="bg-amber-50/40 border-b border-amber-200/80">
                              <td colSpan={4} className="p-2.5 pl-6 sm:pl-8">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-amber-50/90 p-2.5 rounded-xl border border-amber-200 text-xs">
                                  <div className="space-y-0.5 min-w-0">
                                    <div className="flex items-center gap-1.5 font-bold text-amber-900 text-[11px]">
                                      <MessageSquare className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                      <span>Observación registrada para este post (enviada al Community Manager):</span>
                                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-950 font-black">
                                        En Ajustes
                                      </span>
                                    </div>
                                    <p className="text-slate-800 italic font-medium pl-5 whitespace-pre-wrap">
                                      "{clientSentComment || 'Ajustes solicitados en esta publicación.'}"
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPostChanges(prev => ({
                                        ...prev,
                                        [post.id]: prev[post.id] || clientSentComment || ''
                                      }));
                                    }}
                                    className="shrink-0 text-[11px] px-3 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-bold transition-colors cursor-pointer shadow-2xs self-start sm:self-auto"
                                    title="Modificar o ampliar la observación para este post"
                                  >
                                    Editar observación
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}

                          {/* Observación contextual para este post si se seleccionó para cambio */}
                          {!isPostApproved && hasChange && (
                            <tr className="bg-amber-50/80 border-b border-amber-200">
                              <td colSpan={4} className="p-3.5 pl-6 sm:pl-8">
                                <div className="space-y-2 max-w-3xl">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1.5">
                                      <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                                      Observación específica para el Post {post.numeroInterno} ({post.redSocial}):
                                    </span>
                                    <button
                                      onClick={() => {
                                        setPostChanges(prev => {
                                          const next = { ...prev };
                                          delete next[post.id];
                                          return next;
                                        });
                                      }}
                                      className="text-[11px] text-slate-500 hover:text-slate-800 font-medium underline cursor-pointer"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                  <textarea
                                    rows={2}
                                    value={postChanges[post.id] || ''}
                                    onChange={(e) => updatePostChangeComment(post.id, e.target.value)}
                                    placeholder="Escribe aquí los ajustes que necesitas en el copy in, copy out o llamada a la acción de este post..."
                                    className="w-full text-xs p-2.5 rounded-xl border border-amber-300 bg-white text-slate-800 focus:ring-2 focus:ring-amber-500 placeholder:text-slate-400 focus:outline-hidden"
                                    autoFocus
                                  />
                                  <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                                    <span className="text-[11px] text-amber-800">
                                      Puedes enviar esta observación ahora o dejarla lista para enviar junto al comentario general.
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleSendSinglePostChange(post)}
                                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <Send className="w-3.5 h-3.5" />
                                      <span>Enviar cambio de este post a Community</span>
                                    </button>
                                  </div>
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
          )}

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
                  {ejecutivoUser.email && (
                    <a 
                      href={`mailto:${ejecutivoUser.email}?subject=${encodeURIComponent(`Consulta Parrilla: ${activeOdt.nombreParrilla} (${client.name})`)}`}
                      className="text-cyan-700 hover:text-cyan-800 underline font-bold cursor-pointer flex items-center gap-1"
                      title="Escribir por correo electrónico"
                    >
                      <Mail className="w-3.5 h-3.5" /> Correo
                    </a>
                  )}
                </div>
              </div>

              {/* Sección de Comentario General para toda la Parrilla (Completamente Independiente) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/90 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-cyan-700" />
                      <span>Comentario General para toda la Parrilla (Opcional):</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Indicaciones de alcance global para la entrega (ej. tono, directrices de marca o felicitaciones). <strong>Es independiente de las observaciones que dejes en cada post.</strong>
                    </p>
                  </div>
                  {generalComment.trim() && (
                    <button
                      type="button"
                      onClick={handleSaveGeneralCommentOnly}
                      className="self-start sm:self-auto px-3.5 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0"
                      title="Enviar únicamente este comentario general al equipo sin alterar las observaciones de los posts"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Enviar Nota General</span>
                    </button>
                  )}
                </div>

                <textarea
                  rows={2}
                  value={generalComment}
                  onChange={(e) => setGeneralComment(e.target.value)}
                  placeholder="Escribe aquí cualquier indicación general para el equipo de contenidos y tu ejecutiva..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-cyan-600 focus:outline-hidden"
                />
              </div>

              {/* Botonera de Envío y Dictamen */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="text-xs text-slate-500">
                  {changedCount > 0 ? (
                    <span className="text-amber-900 font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Tienes {changedCount} post(s) con notas pendientes de enviar en bloque{generalComment.trim() ? ' y 1 nota general' : ''}.</span>
                    </span>
                  ) : (
                    <span>Puedes enviar observaciones en cada post individualmente o autorizar la parrilla cuando todo esté conforme.</span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {changedCount > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllChanges}
                      className="text-xs text-slate-500 hover:text-slate-800 font-semibold underline px-2 cursor-pointer"
                    >
                      Descartar borradores ({changedCount})
                    </button>
                  )}

                  {changedCount > 0 && (
                    <button
                      type="button"
                      onClick={handleSubmitChanges}
                      className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Enviar Observaciones ({changedCount} posts{generalComment.trim() ? ' + General' : ''})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowApprovalModal(true)}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {hasPendingAdditionalPosts && approvedPostsCount > 0
                        ? `Aprobar Posts Nuevos (${pendingClientPosts.length})`
                        : 'Aprobar Toda la Parrilla'}
                    </span>
                  </button>
                </div>
              </div>
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

      {/* MODAL CLIENTE: "VER POST" (Vista limpia, enriquecida, sin edición, con Aprobar o Solicitar Cambios) */}
      {viewingPost && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-4 px-5 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-2.5 py-1 rounded-md bg-white/10 text-white font-mono text-xs font-bold border border-white/20">
                  Post #{viewingPost.numeroInterno}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-xs font-bold border border-indigo-400/30">
                  {viewingPost.redSocial}
                </span>
                <span className="text-xs text-slate-300 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  Fecha: <strong className="text-white">{viewingPost.fechaPrevista}</strong>
                </span>
                {viewingPost.tipoMaterial && (
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                    Formato: {viewingPost.tipoMaterial}
                  </span>
                )}
              </div>

              {/* Botones de navegación y cierre */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="flex items-center bg-white/10 rounded-lg p-0.5 border border-white/15">
                  <button
                    type="button"
                    onClick={handlePrevPost}
                    disabled={viewingPostIndex <= 0}
                    className="p-1 rounded text-white hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                    title="Post Anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-mono px-2 text-slate-300 select-none">
                    {viewingPostIndex + 1}/{odtPosts.length}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextPost}
                    disabled={viewingPostIndex >= odtPosts.length - 1}
                    className="p-1 rounded text-white hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                    title="Siguiente Post"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingPost(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-1"
                  title="Cerrar ventana"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Copys y Enlaces */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-800">
              {/* COPY IN */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                    <span>Copy In (Texto para la imagen o gráfica)</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Texto que integrará el diseñador</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <RichTextDisplay
                    content={viewingPost.copyIn}
                    fallbackText="Sin texto para gráfica (copy in)"
                    showCopyButton
                    copyButtonLabel="Copiar"
                  />
                </div>
              </div>

              {/* COPY OUT */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-600"></span>
                    <span>Copy Out (Texto de la publicación / Caption)</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Texto para el feed / descripción</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <RichTextDisplay
                    content={viewingPost.copyOut}
                    fallbackText="Sin texto de publicación (copy out)"
                    showCopyButton
                    copyButtonLabel="Copiar Caption"
                  />
                </div>
              </div>

              {/* Enlace de Referencia si existe */}
              {viewingPost.enlaceReferencia && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-slate-700 block">Enlace de Referencia / Benchmark:</span>
                    <span className="text-[11px] text-slate-500 truncate max-w-sm block">{viewingPost.enlaceReferencia}</span>
                  </div>
                  <a
                    href={viewingPost.enlaceReferencia}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition-colors shadow-2xs"
                  >
                    <span>Abrir Enlace</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Enlace de Material Final si existe */}
              {viewingPost.enlaceMaterialFinal && (
                <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-indigo-900 block">Material Producido (Arte / Video):</span>
                    <span className="text-[11px] text-indigo-600 truncate max-w-sm block">{viewingPost.enlaceMaterialFinal}</span>
                  </div>
                  <a
                    href={viewingPost.enlaceMaterialFinal}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition-colors shadow-2xs"
                  >
                    <span>Ver Material</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Modal Footer: Acciones del Cliente para este Post */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 px-5 shrink-0 space-y-3">
              {/* Caso 1: Post ya aprobado previamente en base de datos */}
              {postStatusMap.get(viewingPost.id)?.isApproved ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Esta publicación ya fue autorizada por ti para producción técnica.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (viewingPostIndex < odtPosts.length - 1) {
                          handleNextPost();
                        } else {
                          setViewingPost(null);
                        }
                      }}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      {viewingPostIndex < odtPosts.length - 1 ? 'Ver Siguiente Post →' : 'Cerrar'}
                    </button>
                  </div>
                </div>
              ) : isModalChangeActive || viewingPost.id in postChanges ? (
                /* Caso 2: El cliente solicita cambios en este post */
                <div className="space-y-2.5 bg-amber-50 p-3.5 rounded-xl border border-amber-300">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-amber-700" />
                      Observación para el Post #{viewingPost.numeroInterno} ({viewingPost.redSocial}):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        handleMarkApproved(viewingPost.id);
                        setIsModalChangeActive(false);
                        setModalComment('');
                      }}
                      className="text-[11px] text-slate-500 hover:text-emerald-700 font-semibold underline cursor-pointer"
                    >
                      Descartar y marcar como Aprobado
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={modalComment}
                    onChange={(e) => {
                      setModalComment(e.target.value);
                      updatePostChangeComment(viewingPost.id, e.target.value);
                    }}
                    placeholder="Describe aquí los ajustes que necesitas en el copy in, caption, tono o llamada a la acción..."
                    className="w-full text-xs p-2.5 rounded-xl border border-amber-300 bg-white text-slate-800 focus:ring-2 focus:ring-amber-500 placeholder:text-slate-400 focus:outline-hidden"
                    autoFocus
                  />
                  <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                    <span className="text-[11px] text-amber-800">
                      Se enviará el ajuste al Community Manager y pasarás al siguiente post.
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleModalSubmitChangeAndNext(viewingPost)}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>
                          {viewingPostIndex < odtPosts.length - 1 ? 'Enviar cambio y pasar al siguiente →' : 'Enviar cambio y finalizar'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Caso 3: Post pendiente de dictamen */
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    {explicitlyApproved[viewingPost.id] ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <Check className="w-4 h-4" /> Listo para aprobar
                      </span>
                    ) : (
                      <span>¿El copy de esta publicación cumple con lo solicitado?</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalChangeActive(true);
                      }}
                      className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                      <span>Solicitar Cambios</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModalApproveAndNext(viewingPost)}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>
                        {viewingPostIndex < odtPosts.length - 1 ? 'Aprobar este Post y Siguiente →' : 'Aprobar este Post'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
