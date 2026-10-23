import React, { useState, useMemo } from 'react';
import { Post, ODT, Client, User } from '../types';
import { 
  Sparkles, CheckCircle2, Clock, Globe, Plus, Send, ExternalLink, 
  Layers, Info, ShieldAlert, ShieldCheck, AlertTriangle, Edit3,
  Copy, RefreshCw, X, Calendar, Share2, UserCheck, Trash2
} from 'lucide-react';
import { EjecutivoView } from './EjecutivoView';
import { RichTextDisplay } from './RichTextDisplay';
import { PostContentFourPanels } from './PostContentFourPanels';
import { getPilarColor } from './InteractiveCalendarPicker';

interface CommunityViewProps {
  odts: ODT[];
  posts: Post[];
  clients: Client[];
  currentUser: User;
  selectedClientId?: string;
  selectedOdtId?: string;
  onSelectClient?: (clientId: string | null) => void;
  onSelectOdt?: (odtId: string | null) => void;
  onOpenCreatePost: (odt: ODT) => void;
  onOpenEditOdt?: (odt: ODT) => void;
  onSelectPost: (post: Post, startEditing?: boolean) => void;
  onSendToReview: (post: Post, odt: ODT) => void;
  onOpenPublishModal: (post: Post) => void;
  onOpenIntervention?: (post: Post) => void;
  onSendToClientApproval?: (post: Post, odt: ODT) => void;
  onOpenApprovalModal?: (post: Post, type: 'aprobacion_interna_final' | 'esperando_ejecutivo') => void;
  onUpdatePost?: (postId: string, data: { copyIn?: string; copyOut?: string; enlaceReferencia?: string; enlaceMaterialFinal?: string }) => void;
  onDuplicatePost?: (post: Post, newRedSocial: string) => void;
  onRecyclePost?: (post: Post) => void;
  onDeletePost?: (postId: string) => void;
}

export const CommunityView: React.FC<CommunityViewProps> = ({
  odts,
  posts,
  clients,
  currentUser,
  selectedClientId,
  selectedOdtId,
  onSelectClient,
  onSelectOdt,
  onOpenCreatePost,
  onOpenEditOdt,
  onSelectPost,
  onSendToReview,
  onOpenPublishModal,
  onOpenIntervention,
  onSendToClientApproval,
  onOpenApprovalModal,
  onUpdatePost,
  onDuplicatePost,
  onRecyclePost,
  onDeletePost
}) => {
  // Por defecto abrimos la vista de gestión integral de Parrillas & Posts solicitada
  const [activeTab, setActiveTab] = useState<'parrillas' | 'todo' | 'ready_to_publish' | 'published'>('parrillas');

  // Estado local para navegación de carpetas/ODTs en caso de no venir de props externas
  const [localClientId, setLocalClientId] = useState<string | null>(selectedClientId || null);
  const [localOdtId, setLocalOdtId] = useState<string | null>(selectedOdtId || null);

  // Modal rápido de duplicación
  const [duplicatingPost, setDuplicatingPost] = useState<Post | null>(null);
  const [targetDuplicateRed, setTargetDuplicateRed] = useState('Instagram');

  const activeClientId = selectedClientId !== undefined ? selectedClientId : localClientId;
  const activeOdtId = selectedOdtId !== undefined ? selectedOdtId : localOdtId;

  const handleSelectClient = (id: string | null) => {
    setLocalClientId(id);
    onSelectClient?.(id);
  };

  const handleSelectOdt = (id: string | null) => {
    setLocalOdtId(id);
    onSelectOdt?.(id);
  };

  // Filtro de alcance: 'all' (todas las parrillas de la agencia) o 'mine' (solo asignadas a mí)
  // Por defecto 'all' para que todos los Community Managers puedan ver y trabajar en cualquier parrilla
  const [scopeFilter, setScopeFilter] = useState<'all' | 'mine'>('all');

  // Verificación de si un post u ODT está asignado directamente al Community
  const isOdtAssignedToCommunity = (o: ODT) => {
    return (
      o.communityId === currentUser.id ||
      (o.communityName && o.communityName.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
    );
  };

  const isPostAssignedToCommunity = (p: Post) => {
    if (p.responsableActualId && p.responsableActualId === currentUser.id) return true;
    const odt = odts.find(o => o.id === p.odtId);
    if (!odt) return false;
    return isOdtAssignedToCommunity(odt);
  };

  // Conteo de ODTs asignadas directamente a este CM
  const myAssignedOdtsCount = useMemo(() => {
    return odts.filter(isOdtAssignedToCommunity).length;
  }, [odts, currentUser]);

  // Parrillas y clientes visibles para el Community según el filtro de alcance
  const communityOdts = useMemo(() => {
    if (scopeFilter === 'mine') {
      return odts.filter(isOdtAssignedToCommunity);
    }
    return odts;
  }, [odts, scopeFilter, currentUser]);

  const communityClients = useMemo(() => {
    if (scopeFilter === 'mine') {
      return clients.filter(c => communityOdts.some(o => o.clientId === c.id));
    }
    return clients;
  }, [clients, communityOdts, scopeFilter]);

  const communityPosts = useMemo(() => {
    if (scopeFilter === 'mine') {
      return posts.filter(p => communityOdts.some(o => o.id === p.odtId));
    }
    return posts;
  }, [posts, communityOdts, scopeFilter]);

  // Bandeja 1: "Lo que tengo que hacer" (Creación de copy, Borradores, y Ajustes solicitados por Médico/QA/Cliente)
  const pendingActionPosts = useMemo(() => {
    return posts.filter(p => 
      (p.estado === 'Borrador' || 
      p.estado === 'En Community' || 
      p.estado === 'Ajustes de Copy' ||
      p.estado === 'Cambios solicitados por Cliente') &&
      (scopeFilter === 'all' || isPostAssignedToCommunity(p))
    );
  }, [posts, odts, currentUser, scopeFilter]);

  // Bandeja 2: "LISTO PARA PUBLICAR" y "PROGRAMADOS"
  const readyToPublishPosts = useMemo(() => {
    return posts.filter(p => 
      (p.estado === 'Listo para Publicar' || p.estado === 'Programado') &&
      (scopeFilter === 'all' || isPostAssignedToCommunity(p))
    );
  }, [posts, odts, currentUser, scopeFilter]);

  // Bandeja 3: "Publicados"
  const publishedPosts = useMemo(() => {
    return posts.filter(p => 
      p.estado === 'Publicado' &&
      (scopeFilter === 'all' || isPostAssignedToCommunity(p))
    );
  }, [posts, odts, currentUser, scopeFilter]);

  // Balance de pilares para contabilizar los tipos de post en la bandeja activa
  const pilarBalance = useMemo(() => {
    const counts: Record<string, number> = {};
    const targetPosts = activeTab === 'todo' ? pendingActionPosts : communityPosts;
    targetPosts.forEach(p => {
      const pil = p.pilar || 'Sin pilar';
      counts[pil] = (counts[pil] || 0) + 1;
    });
    return counts;
  }, [activeTab, pendingActionPosts, communityPosts]);

  return (
    <div className="space-y-6">
      
      {/* Selector de Bandejas, Pestañas y Conmutador de Alcance */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Pestaña Principal: Parrillas & Posts con permisos de Ejecutivo y Creación de Posts */}
          <button
            onClick={() => setActiveTab('parrillas')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'parrillas'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Parrillas & Posts</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeTab === 'parrillas' ? 'bg-slate-800 text-emerald-300' : 'bg-slate-200 text-slate-700'
            }`}>
              {communityOdts.length} ODTs • {communityPosts.length} Posts
            </span>
          </button>

          {/* Bandeja Operativa: Redacción y Ajustes de Copy */}
          <button
            onClick={() => setActiveTab('todo')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'todo'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Redacción & Ajustes de Copy</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeTab === 'todo' ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-800'
            }`}>
              {pendingActionPosts.length}
            </span>
          </button>

          {/* Bandeja Operativa: Listo para Publicar */}
          <button
            onClick={() => setActiveTab('ready_to_publish')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'ready_to_publish'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Listo para Publicar</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeTab === 'ready_to_publish' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {readyToPublishPosts.length}
            </span>
          </button>

          {/* Bandeja: Publicados */}
          <button
            onClick={() => setActiveTab('published')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'published'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Publicados ({publishedPosts.length})</span>
          </button>
        </div>

        {/* Conmutador de Alcance de Visibilidad */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setScopeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              scopeFilter === 'all'
                ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Ver todas las parrillas, clientes y publicaciones de la agencia"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Ver Todo ({clients.length} Clientes • {odts.length} Parrillas)</span>
          </button>

          <button
            type="button"
            onClick={() => setScopeFilter('mine')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              scopeFilter === 'mine'
                ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Filtrar únicamente las parrillas donde estás asignado como Community"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Solo mis asignadas ({myAssignedOdtsCount})</span>
          </button>
        </div>
      </div>

      {/* VISTA 1: GESTIÓN INTEGRAL DE PARRILLAS & POSTS (PERMISOS DE EJECUTIVO + CREACIÓN DE POSTS) */}
      {activeTab === 'parrillas' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 flex items-start gap-3 shadow-2xs">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="text-xs space-y-1">
              <p className="font-bold text-emerald-950 text-sm">
                {scopeFilter === 'all' ? 'Visibilidad Global Habilitada' : 'Parrillas Asignadas Activas'} ({currentUser.name})
              </p>
              <p className="text-emerald-800 leading-relaxed">
                {scopeFilter === 'all' ? (
                  <>Acceso para consultar y operar en <strong>{communityClients.length} cliente(s)</strong> y <strong>{communityOdts.length} parrilla(s)</strong> de la agencia con <strong>{communityPosts.length} post(s)</strong>. Puedes crear posts en cualquier parrilla, redactar o ajustar copys, duplicar, reciclar y enviarlos a revisión.</>
                ) : (
                  <>Mostrando únicamente tus <strong>{communityOdts.length} parrilla(s) asignada(s)</strong> directamente con acceso a creación de posts, copys y envío a revisión.</>
                )}
              </p>
            </div>
          </div>

          <EjecutivoView
            clients={communityClients}
            odts={communityOdts}
            posts={communityPosts}
            currentUser={currentUser}
            canCreateOdt={false}
            selectedClientId={activeClientId || undefined}
            selectedOdtId={activeOdtId || undefined}
            onSelectClient={handleSelectClient}
            onSelectOdt={handleSelectOdt}
            onOpenCreateOdt={() => {}}
            onOpenEditOdt={onOpenEditOdt}
            onOpenCreatePost={onOpenCreatePost}
            onSelectPost={onSelectPost}
            onOpenIntervention={onOpenIntervention || (() => {})}
            onSendToClientApproval={onSendToClientApproval || (() => {})}
            onOpenApprovalModal={onOpenApprovalModal}
            onSendToReview={onSendToReview}
            onOpenPublishModal={onOpenPublishModal}
            onDuplicatePost={onDuplicatePost}
            onRecyclePost={onRecyclePost}
            onDeletePost={onDeletePost}
            onUpdatePost={onUpdatePost}
          />
        </div>
      )}

      {/* VISTA 2: LISTO PARA PUBLICAR */}
      {activeTab === 'ready_to_publish' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-emerald-600" />
                Bandeja: Listo para Publicar
              </h3>
              <p className="text-xs text-slate-500">
                Piezas con Copy aprobado por cliente y Aprobación Interna Final de APC. Listas para programar o subir a redes.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
              {readyToPublishPosts.length} posts autorizados
            </span>
          </div>

          {readyToPublishPosts.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
              <p className="text-sm font-semibold text-slate-700">No hay posts pendientes de publicación en este momento.</p>
              <p className="text-xs text-slate-400 mt-1">
                Cuando el material cuente con la Aprobación Interna Final de APC (tras Copy aprobado por cliente y control de calidad), aparecerá automáticamente aquí.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {readyToPublishPosts.map(post => {
                const odt = odts.find(o => o.id === post.odtId);
                const client = clients.find(c => c.id === post.clientId);
                const isProgramado = post.estado === 'Programado' || post.programado;

                return (
                  <div
                    key={post.id}
                    className={`bg-white rounded-2xl p-5 border-2 shadow-sm transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                      isProgramado 
                        ? 'border-violet-500/30 hover:border-violet-500 bg-violet-50/5' 
                        : 'border-emerald-500/30 hover:border-emerald-500'
                    }`}
                  >
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 rounded-md bg-slate-900 text-white font-mono text-xs font-bold">
                          {post.numeroInterno}
                        </span>
                        <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-bold text-xs">
                          {post.redSocial}
                        </span>
                        {post.pilar && (
                          <span className={`text-[11px] px-2 py-0.5 rounded-md font-bold border ${getPilarColor(post.pilar).bg} ${getPilarColor(post.pilar).text} ${getPilarColor(post.pilar).border}`}>
                            Pilar: {post.pilar}
                          </span>
                        )}
                        {isProgramado ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-900 font-extrabold text-xs flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Programado ({post.fechaProgramada || post.fechaPrevista})
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-950 font-bold text-xs flex items-center gap-1">
                            <Globe className="w-3.5 h-3.5 text-emerald-700" />
                            Listo para Salir
                          </span>
                        )}
                        <span className="text-xs font-bold text-slate-700">
                          Cliente: {client?.name || 'Cliente'}
                        </span>
                        <span className="text-xs text-slate-500">
                          ODT: {odt?.numeroODT}
                        </span>
                      </div>

                      {/* Espacio Central en 4 Divisiones: Copy In, Copy Out, Enlace de Referencia, Material Entregado Arte/AV */}
                      <PostContentFourPanels 
                        post={post} 
                        onEdit={() => onSelectPost(post, true)}
                        canEdit={true}
                      />

                      {isProgramado && post.plataformaProgramacion && (
                        <div className="pt-1">
                          <span className="text-xs text-violet-800 bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            Programado vía: <strong>{post.plataformaProgramacion}</strong>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Botones principales */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <button
                        onClick={() => onSelectPost(post, true)}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Editar nombre y contenido del post"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Editar posts</span>
                      </button>

                      {onDeletePost && (
                        <button
                          onClick={() => {
                            if (confirm(`¿Estás seguro de que deseas eliminar permanentemente el post "${post.numeroInterno}" (${post.redSocial})?\n\nEsta acción quitará la publicación de la parrilla y no se puede deshacer.`)) {
                              onDeletePost(post.id);
                            }
                          }}
                          className="px-2.5 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                          title="Eliminar este post"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span className="hidden sm:inline">Eliminar Posts</span>
                        </button>
                      )}

                      <button
                        onClick={() => onSelectPost(post)}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                      >
                        Ver Detalle
                      </button>

                      <button
                        onClick={() => onOpenPublishModal(post)}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer ${
                          isProgramado
                            ? 'bg-violet-600 hover:bg-violet-700'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        {isProgramado ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            CONFIRMAR PUBLICADO
                          </>
                        ) : (
                          <>
                            <Globe className="w-4 h-4" />
                            PROGRAMAR / PUBLICAR
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VISTA 3: PENDIENTES DE COPY & AJUSTES */}
      {activeTab === 'todo' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                {scopeFilter === 'all' ? 'Posts Pendientes de Copy y Ajustes (Agencia)' : 'Mis Posts Pendientes de Copy y Ajustes'}
              </h3>
              <p className="text-xs text-slate-500">
                Redacta o actualiza el copy de los posts y envíalos a revisión médica o de estilo.
              </p>
            </div>
          </div>

          {/* Balance de Pilares de las publicaciones */}
          {Object.keys(pilarBalance).length > 0 && (
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Balance de Pilares en esta bandeja:
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {Object.entries(pilarBalance).map(([pil, count]) => {
                  const col = getPilarColor(pil);
                  return (
                    <span
                      key={pil}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${col.bg} ${col.text} ${col.border}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${col.dot}`}></span>
                      <span>{pil}:</span>
                      <strong className="font-black text-slate-900">{count}</strong>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Banner de alerta si hay posts devueltos con observaciones o cambios solicitados */}
          {pendingActionPosts.filter(p => 
            p.estado === 'Ajustes de Copy' || 
            p.estado === 'Cambios solicitados por Cliente' || 
            p.solicitadoPorRole !== undefined ||
            p.aprobacionCorreccionCopy?.status === 'Cambios Solicitados' || 
            p.aprobacionMedica?.status === 'Cambios Solicitados' ||
            p.aprobacionClienteCopy?.status === 'Cambios Solicitados'
          ).length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 flex items-start gap-3 shadow-2xs">
              <div className="p-2 rounded-xl bg-amber-600 text-white shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="text-xs space-y-1">
                <p className="font-black text-sm text-amber-950">
                  {pendingActionPosts.filter(p => 
                    p.estado === 'Ajustes de Copy' || 
                    p.estado === 'Cambios solicitados por Cliente' || 
                    p.solicitadoPorRole !== undefined ||
                    p.aprobacionCorreccionCopy?.status === 'Cambios Solicitados' || 
                    p.aprobacionMedica?.status === 'Cambios Solicitados' ||
                    p.aprobacionClienteCopy?.status === 'Cambios Solicitados'
                  ).length} publicación(es) con Observaciones o Cambios Solicitados
                </p>
                <p className="text-amber-900 leading-relaxed">
                  Revisa las notas dejadas por el revisor asignado (Corrector, Médico o Cliente). Al terminar tus ajustes, pulsa el botón de envío para devolver la pieza directo a quien solicitó los ajustes (o reiniciar el ciclo completo si provino del cliente).
                </p>
              </div>
            </div>
          )}

          {pendingActionPosts.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-indigo-400" />
              <p className="text-sm font-semibold text-slate-700">No tienes posts pendientes de redactar o ajustar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {pendingActionPosts.map(post => {
                const odt = odts.find(o => o.id === post.odtId);
                const isClientChange = post.estado === 'Cambios solicitados por Cliente' || post.aprobacionClienteCopy?.status === 'Cambios Solicitados' || post.aprobacionClienteMaterial?.status === 'Cambios Solicitados' || post.solicitadoPorRole === 'Cliente';
                const isChanges = post.estado === 'Ajustes de Copy' || isClientChange || post.solicitadoPorRole !== undefined;

                // Extraer dinámicamente la observación y el perfil exacto que solicitó ajustes
                const getObservationData = () => {
                  if (post.solicitadoPorRole === 'Corrector' || post.aprobacionCorreccionCopy?.status === 'Cambios Solicitados') {
                    return {
                      label: `Comentario de Corrector (${post.aprobacionCorreccionCopy?.user || post.solicitadoPorName || 'Corrector'})`,
                      comment: post.aprobacionCorreccionCopy?.comment || 'Se requieren ajustes ortotipográficos o de redacción.',
                      theme: 'amber' as const
                    };
                  }
                  if (post.solicitadoPorRole === 'Médico' || post.aprobacionMedica?.status === 'Cambios Solicitados') {
                    return {
                      label: `Comentario de Médico (${post.aprobacionMedica?.user || post.solicitadoPorName || 'Médico Responsable'})`,
                      comment: post.aprobacionMedica?.comment || 'Se requieren ajustes clínicos o de rigor médico.',
                      theme: 'blue' as const
                    };
                  }
                  if (post.solicitadoPorRole === 'Cliente' || isClientChange) {
                    const clientComment = 
                      post.aprobacionClienteCopy?.comment || 
                      post.aprobacionClienteMaterial?.comment || 
                      post.comentarios.find(c => c.text.includes('[Revisión') || c.userRole === 'Cliente')?.text;
                    return {
                      label: `Comentario de Cliente (${post.aprobacionClienteCopy?.user || post.aprobacionClienteMaterial?.user || post.solicitadoPorName || 'Cliente'})`,
                      comment: clientComment || 'Se requieren ajustes solicitados por el cliente.',
                      theme: 'rose' as const
                    };
                  }
                  if (post.solicitadoPorRole === 'Ejecutivo') {
                    return {
                      label: `Comentario de Ejecutivo (${post.solicitadoPorName || 'Ejecutivo'})`,
                      comment: 'Se requieren ajustes previos a presentar al cliente.',
                      theme: 'amber' as const
                    };
                  }
                  // Si no hay solicitud formal pero hay comentarios registrados
                  if (post.estado === 'Ajustes de Copy' && post.comentarios.length > 0) {
                    const lastC = post.comentarios[post.comentarios.length - 1];
                    return {
                      label: `Comentario de ${lastC.userRole} (${lastC.userName})`,
                      comment: lastC.text,
                      theme: 'amber' as const
                    };
                  }
                  return null;
                };

                const obsData = getObservationData();

                // Botón de reenvío dinámico inteligente
                const getButtonText = () => {
                  if (post.solicitadoPorRole === 'Corrector') return 'Regresar a Corrección';
                  if (post.solicitadoPorRole === 'Médico') return 'Regresar a Médico';
                  const reqMed = post.requiereRevisionMedica !== undefined ? post.requiereRevisionMedica : odt?.requiereMedico;
                  return reqMed ? 'Enviar a Médico' : 'Enviar a Corrección';
                };

                return (
                  <div
                    key={post.id}
                    className={`bg-white rounded-2xl p-5 border shadow-2xs space-y-3 transition-all ${
                      obsData?.theme === 'rose'
                        ? 'border-2 border-rose-400/80 bg-rose-50/20'
                        : obsData?.theme === 'blue'
                        ? 'border-2 border-blue-400/80 bg-blue-50/20'
                        : isChanges
                        ? 'border-2 border-amber-300 bg-amber-50/20'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 rounded-md bg-slate-900 text-white font-mono text-xs font-bold">
                          {post.numeroInterno}
                        </span>
                        <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-bold text-xs">
                          {post.redSocial}
                        </span>
                        {post.pilar && (
                          <span className={`text-[11px] px-2 py-0.5 rounded-md font-bold border ${getPilarColor(post.pilar).bg} ${getPilarColor(post.pilar).text} ${getPilarColor(post.pilar).border}`}>
                            Pilar: {post.pilar}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-xs">
                          {post.tipoMaterial}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-semibold text-[11px]">
                          {post.dimensiones || '1080x1080'}
                        </span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-md font-black border ${
                          post.nivelPrioridad === 'Nivel 1' 
                            ? 'bg-rose-50 text-rose-700 border-rose-200' 
                            : post.nivelPrioridad === 'Nivel 3'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {post.nivelPrioridad === 'Nivel 1' ? '🔴 Nivel 1' : post.nivelPrioridad === 'Nivel 3' ? '🟢 Nivel 3' : '🟡 Nivel 2'}
                        </span>
                        <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Entrega Arte: {post.fechaEntregaMaterial || post.fechaPrevista}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          Publicación: {post.fechaPrevista}
                        </span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                          obsData?.theme === 'rose'
                            ? 'bg-rose-100 text-rose-800 border-rose-300 font-black' 
                            : obsData?.theme === 'blue'
                            ? 'bg-blue-100 text-blue-800 border-blue-300 font-bold'
                            : isChanges 
                            ? 'bg-amber-50 text-amber-800 border-amber-300' 
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {isChanges && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                          {post.estado}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {onDuplicatePost && (
                          <button
                            onClick={() => {
                              setDuplicatingPost(post);
                              setTargetDuplicateRed(post.redSocial);
                            }}
                            className="px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="Duplicar post para otra red social"
                          >
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Duplicar</span>
                          </button>
                        )}

                        {onRecyclePost && post.estado !== 'Borrador' && (
                          <button
                            onClick={() => {
                              if (confirm(`¿Retomar y reciclar este post #${post.numeroInterno}?\n\nRegresará al inicio del flujo (Borrador) para que puedas adaptar el copy o cambiar el requerimiento de material.`)) {
                                onRecyclePost(post);
                              }
                            }}
                            className="px-2.5 py-1.5 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="Atraer post al inicio para nuevo enfoque"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                            <span>Reciclar</span>
                          </button>
                        )}

                        <button
                          onClick={() => onSelectPost(post, true)}
                          className="px-3.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Abrir editor para modificar nombre, copys y especificaciones"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Editar posts</span>
                        </button>

                        {onDeletePost && (
                          <button
                            onClick={() => {
                              if (confirm(`¿Estás seguro de que deseas eliminar permanentemente el post "${post.numeroInterno}" (${post.redSocial})?\n\nEsta acción quitará la publicación de la parrilla y no se puede deshacer.`)) {
                                onDeletePost(post.id);
                              }
                            }}
                            className="px-2.5 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="Eliminar este post permanentemente de la parrilla"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>Eliminar Posts</span>
                          </button>
                        )}
                        {odt && (
                          <button
                            onClick={() => onSendToReview(post, odt)}
                            className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            {getButtonText()}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Espacio Central en 4 Divisiones: Copy In, Copy Out, Enlace de Referencia, Material Entregado Arte/AV */}
                    <PostContentFourPanels 
                      post={post} 
                      onEdit={() => onSelectPost(post, true)}
                      canEdit={true}
                    />

                    {obsData && (
                      <div className={`p-3.5 rounded-xl border-2 text-xs flex items-start gap-2.5 shadow-2xs ${
                        obsData.theme === 'rose'
                          ? 'bg-rose-50 border-rose-300 text-rose-950'
                          : obsData.theme === 'blue'
                          ? 'bg-blue-50 border-blue-300 text-blue-950'
                          : 'bg-amber-50 border-amber-300 text-amber-950'
                      }`}>
                        <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${
                          obsData.theme === 'rose' ? 'text-rose-600' : obsData.theme === 'blue' ? 'text-blue-600' : 'text-amber-600'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <span className={`font-bold block mb-0.5 ${
                            obsData.theme === 'rose' ? 'text-rose-900' : obsData.theme === 'blue' ? 'text-blue-900' : 'text-amber-900'
                          }`}>
                            {obsData.label}:
                          </span>
                          <p className="italic font-medium leading-relaxed">
                            "{obsData.comment}"
                          </p>
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

      {/* VISTA 4: PUBLICADOS */}
      {activeTab === 'published' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-teal-600" />
              Historial de Posts Publicados
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {publishedPosts.map(post => {
              const hasMultiLinks = post.enlacesPublicacion && post.enlacesPublicacion.length > 0;

              return (
                <div key={post.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between font-bold">
                      <span className="px-2.5 py-1 rounded-md bg-slate-900 text-white font-mono text-xs">
                        {post.numeroInterno}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                        Publicado el {post.fechaRealPublicacion || 'Confirmado'}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">Red Principal: <strong className="text-indigo-700">{post.redSocial}</strong></h4>
                    <p className="text-xs text-slate-600 line-clamp-3 bg-slate-50 p-2.5 rounded-lg italic">"{post.copyOut}"</p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    {hasMultiLinks ? (
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Enlaces de Redes ({post.enlacesPublicacion!.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {post.enlacesPublicacion!.map((link, idx) => (
                            <a
                              key={link.id || idx}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold hover:bg-teal-100 transition-colors"
                              title={`Abrir post en ${link.redSocial}`}
                            >
                              <span>{link.redSocial}</span>
                              <ExternalLink className="w-3 h-3 text-teal-600" />
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : post.urlPublicacion ? (
                      <a
                        href={post.urlPublicacion}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:underline pt-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Ver Post Publicado en Vivo ({post.redSocial})
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400 italic">No se han registrado enlaces web aún</span>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-50 flex-wrap">
                      <button
                        onClick={() => onSelectPost(post, true)}
                        className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 hover:underline cursor-pointer"
                        title="Editar nombre y especificaciones del post"
                      >
                        <Edit3 className="w-3 h-3 text-indigo-600" />
                        <span>Editar posts</span>
                      </button>
                      {onDeletePost && (
                        <>
                          <span className="text-slate-300 text-xs">•</span>
                          <button
                            onClick={() => {
                              if (confirm(`¿Estás seguro de que deseas eliminar permanentemente el post "${post.numeroInterno}" (${post.redSocial})?\n\nEsta acción quitará la publicación de la parrilla y no se puede deshacer.`)) {
                                onDeletePost(post.id);
                              }
                            }}
                            className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 hover:underline cursor-pointer"
                            title="Eliminar este post"
                          >
                            <Trash2 className="w-3 h-3 text-rose-600" />
                            <span>Eliminar Posts</span>
                          </button>
                        </>
                      )}
                      <span className="text-slate-300 text-xs">•</span>
                      <button
                        onClick={() => onSelectPost(post)}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 hover:underline"
                      >
                        Ver Detalle
                      </button>
                      <span className="text-slate-300 text-xs">•</span>
                      <button
                        onClick={() => onOpenPublishModal(post)}
                        className="text-[11px] font-bold text-teal-700 hover:text-teal-900 flex items-center gap-0.5 hover:underline cursor-pointer"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>Gestionar Enlaces</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL DUPLICAR POST EN COMMUNITY VIEW */}
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
                  {(odts.find(o => o.id === duplicatingPost.odtId)?.redesSociales || ['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'X (Twitter)', 'YouTube']).map(r => (
                    <option key={r} value={r}>
                      {r} {r === duplicatingPost.redSocial ? '(Misma red)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Se generará un nuevo número consecutivo dentro de la ODT y el post comenzará en estado <strong>Borrador</strong> para que puedas adaptarlo a la nueva red social.
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
