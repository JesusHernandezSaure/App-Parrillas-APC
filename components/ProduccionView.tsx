import React, { useState, useMemo } from 'react';
import { Post, ODT, Client, User } from '../types';
import { 
  Palette, Video, ExternalLink, Send, CheckCircle2, Clock, 
  Cloud, Info, AlertCircle, Link as LinkIcon, Sparkles, ArrowRight, Layers,
  Filter, UserCheck, Eye 
} from 'lucide-react';
import { RichTextDisplay } from './RichTextDisplay';

interface ProduccionViewProps {
  posts: Post[];
  odts: ODT[];
  clients: Client[];
  currentUser: User;
  onSubmitMaterial: (post: Post, odt: ODT, materialUrl: string) => void;
  onSubmitArteEditables?: (post: Post, odt: ODT, editableUrl: string, notasArte?: string) => void;
  onSelectPost: (post: Post) => void;
}

export const ProduccionView: React.FC<ProduccionViewProps> = ({
  posts,
  odts,
  clients,
  currentUser,
  onSubmitMaterial,
  onSubmitArteEditables,
  onSelectPost
}) => {
  // Detección de especialidades y perfiles (admite rol principal, roles secundarios y permisos de supervisión)
  const isSupervisorOrAdmin = currentUser.role === 'Super Admin' || currentUser.role === 'Admin' || Boolean(currentUser.permissions?.canSuperviseAll);
  const hasArteCapability = currentUser.role === 'Arte' || Boolean(currentUser.secondaryRoles?.includes('Arte')) || isSupervisorOrAdmin;
  const hasVideoCapability = currentUser.role === 'Audio y Video' || Boolean(currentUser.secondaryRoles?.includes('Audio y Video')) || isSupervisorOrAdmin;
  const hasBothDisciplines = hasArteCapability && hasVideoCapability;

  // Estado de la bandeja / especialidad activa ('arte', 'video' o 'all')
  const [activeDiscipline, setActiveDiscipline] = useState<'arte' | 'video' | 'all'>(() => {
    if (currentUser.role === 'Audio y Video' && !currentUser.secondaryRoles?.includes('Arte')) return 'video';
    if (currentUser.role === 'Arte' && !currentUser.secondaryRoles?.includes('Audio y Video')) return 'arte';
    return currentUser.role === 'Audio y Video' ? 'video' : 'arte';
  });

  const [urlsMap, setUrlsMap] = useState<Record<string, string>>({});
  const [errorsMap, setErrorsMap] = useState<Record<string, string>>({});
  const [editableUrlsMap, setEditableUrlsMap] = useState<Record<string, string>>({});
  const [notasArteMap, setNotasArteMap] = useState<Record<string, string>>({});
  const [editableErrorsMap, setEditableErrorsMap] = useState<Record<string, string>>({});
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'Nivel 1' | 'Nivel 2' | 'Nivel 3'>('all');
  const [selectedOdtFilter, setSelectedOdtFilter] = useState<string>('all');
  const [viewScope, setViewScope] = useState<'assigned' | 'all'>('assigned');

  // Parrillas donde el usuario actual está asignado (filtrado según la disciplina activa)
  const assignedOdts = useMemo(() => {
    return odts.filter(o => {
      const isAssignedArte = (
        o.disenadorId === currentUser.id ||
        (o.disenadorName && o.disenadorName.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
      );
      const isAssignedVideo = (
        o.editorAvId === currentUser.id ||
        (o.editorAvName && o.editorAvName.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
      );

      if (activeDiscipline === 'arte') return isAssignedArte;
      if (activeDiscipline === 'video') return isAssignedVideo;
      return isAssignedArte || isAssignedVideo;
    });
  }, [odts, currentUser, activeDiscipline]);

  // Verificación estricta de asignación por post u ODT según disciplina
  const isPostAssignedToUser = (post: Post, discipline?: 'arte' | 'video') => {
    if (isSupervisorOrAdmin && viewScope === 'all') return true;

    // Asignación directa en el post
    if (post.responsableActualId && post.responsableActualId === currentUser.id) return true;

    const odt = odts.find(o => o.id === post.odtId);
    if (!odt) return false;

    const targetDiscipline = discipline || (
      (post.estado === 'Producción Audio/Video' || (post.tipoMaterial === 'Video' && post.estado !== 'Diseño de Editables (Arte)'))
        ? 'video'
        : 'arte'
    );

    if (targetDiscipline === 'arte') {
      return (
        odt.disenadorId === currentUser.id ||
        (odt.disenadorName && odt.disenadorName.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
      );
    }

    if (targetDiscipline === 'video') {
      return (
        odt.editorAvId === currentUser.id ||
        (odt.editorAvName && odt.editorAvName.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
      );
    }

    return (
      odt.disenadorId === currentUser.id ||
      odt.editorAvId === currentUser.id ||
      (odt.disenadorName && odt.disenadorName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) ||
      (odt.editorAvName && odt.editorAvName.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
    );
  };

  // Función ordenadora por urgencia y fecha límite
  const sortPostList = (list: Post[]) => {
    return [...list].sort((a, b) => {
      const pMap: Record<string, number> = { 'Nivel 1': 1, 'Nivel 2': 2, 'Nivel 3': 3 };
      const pA = pMap[a.nivelPrioridad || 'Nivel 2'] || 2;
      const pB = pMap[b.nivelPrioridad || 'Nivel 2'] || 2;
      if (pA !== pB) return pA - pB;
      const dateA = a.fechaEntregaMaterial || a.fechaPrevista || '';
      const dateB = b.fechaEntregaMaterial || b.fechaPrevista || '';
      return dateA.localeCompare(dateB);
    });
  };

  // 1. Posts de Arte (Producción Arte + Diseño de Recursos Editables)
  const artePosts = useMemo(() => {
    let list = posts.filter(p => 
      (p.estado === 'Producción Arte' || p.estado === 'Diseño de Editables (Arte)') && 
      isPostAssignedToUser(p, 'arte')
    );
    if (priorityFilter !== 'all') list = list.filter(p => p.nivelPrioridad === priorityFilter);
    if (selectedOdtFilter !== 'all') list = list.filter(p => p.odtId === selectedOdtFilter);
    return sortPostList(list);
  }, [posts, priorityFilter, selectedOdtFilter, odts, currentUser, isSupervisorOrAdmin, viewScope]);

  // 2. Posts de Audio y Video (Producción Audio/Video)
  const videoPosts = useMemo(() => {
    let list = posts.filter(p => 
      p.estado === 'Producción Audio/Video' && 
      isPostAssignedToUser(p, 'video')
    );
    if (priorityFilter !== 'all') list = list.filter(p => p.nivelPrioridad === priorityFilter);
    if (selectedOdtFilter !== 'all') list = list.filter(p => p.odtId === selectedOdtFilter);
    return sortPostList(list);
  }, [posts, priorityFilter, selectedOdtFilter, odts, currentUser, isSupervisorOrAdmin, viewScope]);

  // Posts de video que están actualmente en espera en Arte (para información del editor de video)
  const videoWaitingInArte = useMemo(() => {
    return posts.filter(p => {
      if (p.estado !== 'Diseño de Editables (Arte)' || p.tipoMaterial !== 'Video') return false;
      if (selectedOdtFilter !== 'all' && p.odtId !== selectedOdtFilter) return false;
      if (isSupervisorOrAdmin && viewScope === 'all') return true;
      const odt = odts.find(o => o.id === p.odtId);
      if (!odt) return false;
      return (
        odt.editorAvId === currentUser.id ||
        (odt.editorAvName && odt.editorAvName.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
      );
    });
  }, [posts, odts, currentUser, isSupervisorOrAdmin, viewScope, selectedOdtFilter]);

  // Total de piezas pendientes según la vista actual
  const currentTotalPending = useMemo(() => {
    if (activeDiscipline === 'arte') return artePosts.length;
    if (activeDiscipline === 'video') return videoPosts.length;
    return artePosts.length + videoPosts.length;
  }, [activeDiscipline, artePosts.length, videoPosts.length]);

  const handleUrlChange = (postId: string, val: string) => {
    setUrlsMap(prev => ({ ...prev, [postId]: val }));
    setErrorsMap(prev => ({ ...prev, [postId]: '' }));
  };

  const handleEditableUrlChange = (postId: string, val: string) => {
    setEditableUrlsMap(prev => ({ ...prev, [postId]: val }));
    setEditableErrorsMap(prev => ({ ...prev, [postId]: '' }));
  };

  const handleNotasArteChange = (postId: string, val: string) => {
    setNotasArteMap(prev => ({ ...prev, [postId]: val }));
  };

  const handleSubmit = (post: Post, odt: ODT) => {
    const url = urlsMap[post.id]?.trim() || post.enlaceMaterialFinal?.trim();
    if (!url) {
      setErrorsMap(prev => ({ ...prev, [post.id]: 'Debes ingresar el enlace de OneDrive o Google Drive del material producido.' }));
      return;
    }
    onSubmitMaterial(post, odt, url);
  };

  const handleSubmitEditableArte = (post: Post, odt: ODT) => {
    const url = editableUrlsMap[post.id]?.trim() || post.enlaceEditableArte?.trim();
    if (!url) {
      setEditableErrorsMap(prev => ({ ...prev, [post.id]: 'Debes ingresar el enlace (OneDrive o Google Drive) a los archivos editables/ilustraciones.' }));
      return;
    }
    const notas = notasArteMap[post.id]?.trim() || post.notasArteParaVideo || '';
    if (onSubmitArteEditables) {
      onSubmitArteEditables(post, odt, url, notas);
    }
  };

  // Renderizador unificado y contextual de tarjeta de post
  const renderPostCard = (post: Post) => {
    const client = clients.find(c => c.id === post.clientId);
    const odt = odts.find(o => o.id === post.odtId);
    const currentUrl = urlsMap[post.id] !== undefined ? urlsMap[post.id] : (post.enlaceMaterialFinal || '');
    const isUrgent = post.nivelPrioridad === 'Nivel 1';
    const isVideoDiscipline = post.estado === 'Producción Audio/Video' || (post.tipoMaterial === 'Video' && post.estado !== 'Diseño de Editables (Arte)');

    return (
      <div 
        key={post.id} 
        className={`bg-white rounded-2xl p-5 border shadow-2xs space-y-4 transition-all ${
          isUrgent 
            ? 'border-2 border-rose-400 bg-rose-50/15' 
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        {/* Meta header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-md bg-slate-900 text-white font-mono text-xs font-bold shadow-2xs">
              {post.numeroInterno}
            </span>

            {/* Badge de Disciplina / Especialidad Técnica */}
            {isVideoDiscipline ? (
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold border border-purple-200 flex items-center gap-1">
                <Video className="w-3.5 h-3.5 text-purple-600" />
                <span>Audio y Video</span>
              </span>
            ) : (
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-pink-50 text-pink-700 font-bold border border-pink-200 flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-pink-600" />
                <span>Arte & Diseño Gráfico</span>
              </span>
            )}

            <span className="text-xs px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold">
              {client?.name || 'Cliente'}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold">
              {post.redSocial}
            </span>
            
            <span className="text-xs px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200">
              Formato: {post.tipoMaterial}
            </span>

            {/* Medidas / Dimensiones */}
            <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono font-semibold">
              📐 {post.dimensiones || '1080x1080 (1:1)'}
            </span>

            {/* Nivel de Importancia / Prioridad Operativa */}
            <span className={`text-xs px-2.5 py-0.5 rounded-md font-black border flex items-center gap-1 ${
              isUrgent 
                ? 'bg-rose-100 text-rose-900 border-rose-300 ring-2 ring-rose-400/40 animate-pulse' 
                : post.nivelPrioridad === 'Nivel 3'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-900 border-amber-300'
            }`}>
              {isUrgent ? '🔴 Nivel 1 (Prioridad Máxima)' : post.nivelPrioridad === 'Nivel 3' ? '🟢 Nivel 3 (Normal)' : '🟡 Nivel 2 (Estándar)'}
            </span>

            {/* Fecha de Entrega Requerida de Material */}
            <span className="text-xs px-2.5 py-0.5 rounded-md font-bold bg-amber-100 text-amber-950 border border-amber-300 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-700" />
              <span>Entrega Límite: {post.fechaEntregaMaterial || post.fechaPrevista}</span>
            </span>

            <span className="text-xs text-slate-500">
              Parrilla: <strong>{odt?.nombreParrilla || odt?.numeroODT}</strong>
            </span>
          </div>

          <button
            onClick={() => onSelectPost(post)}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
          >
            <span>Ver Ficha Completa</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Textos aprobados para guiar el diseño/edición */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Texto sobre la imagen / gráfica (Copy In):
            </span>
            <RichTextDisplay content={post.copyIn} fallbackText="Sin copy in especificado" />
          </div>
          
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Texto de la publicación (Copy Out / Caption):
            </span>
            <RichTextDisplay content={post.copyOut} fallbackText="Sin copy out especificado" />
          </div>
        </div>

        {/* Enlace de Referencia Visual si existe */}
        {post.enlaceReferencia && (
          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="text-slate-700 font-medium">Referencia visual / Brief del Community:</span>
            </div>
            <a
              href={post.enlaceReferencia}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Consultar Enlace de Referencia Visual
            </a>
          </div>
        )}

        {/* Indicador Especial si requiere Recursos de Arte (Telefém) */}
        {post.estado === 'Diseño de Editables (Arte)' ? (
          <div className="p-4 bg-purple-50 rounded-xl border-2 border-purple-300 space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-xs font-black uppercase tracking-wider text-purple-950 block">
                  🎨 Tarea de Arte: Preparar Recursos Editables para Audio y Video
                </strong>
                <p className="text-[11px] text-purple-800 leading-relaxed mt-0.5">
                  Diseña las ilustraciones y recursos gráficos en capas separadas (.AI, .PSD, Figma) y compártelos a continuación para que el editor de <strong>Audio y Video</strong> pueda animar el video.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-1 border-t border-purple-200/70">
              <div>
                <label className="text-[11px] font-bold text-purple-950 uppercase tracking-wider block mb-1">
                  Enlace a Archivos Editables / Ilustraciones (OneDrive corporativo o Google Drive) *
                </label>
                <div className="relative">
                  <LinkIcon className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    placeholder="https://apcpublicidad-my.sharepoint.com/... o Drive con archivos editables"
                    className="w-full text-xs pl-9 pr-3 py-2 border border-purple-200 rounded-xl bg-white focus:ring-2 focus:ring-purple-500 font-medium"
                    value={editableUrlsMap[post.id] !== undefined ? editableUrlsMap[post.id] : (post.enlaceEditableArte || '')}
                    onChange={(e) => handleEditableUrlChange(post.id, e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-purple-950 uppercase tracking-wider block mb-1">
                  Indicaciones / Notas para Audio y Video (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Capas de personajes separadas en artboards para After Effects, fuentes adjuntas."
                  className="w-full text-xs px-3 py-2 border border-purple-200 rounded-xl bg-white focus:ring-2 focus:ring-purple-500 font-medium"
                  value={notasArteMap[post.id] !== undefined ? notasArteMap[post.id] : (post.notasArteParaVideo || '')}
                  onChange={(e) => handleNotasArteChange(post.id, e.target.value)}
                />
              </div>

              {editableErrorsMap[post.id] && (
                <p className="text-xs text-rose-600 font-semibold">{editableErrorsMap[post.id]}</p>
              )}

              {odt && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleSubmitEditableArte(post, odt)}
                    className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Entregar Editables y Transferir a Audio y Video</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Alerta Destacada para Audio y Video si este video requería recursos de Arte */}
            {post.requiereArtePrevio && (
              <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/70 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                    <strong className="text-xs font-bold text-purple-950">
                      Recursos Editables de Arte Disponibles
                    </strong>
                  </div>

                  {post.enlaceEditableArte ? (
                    <a
                      href={post.enlaceEditableArte}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs self-start sm:self-auto"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Abrir Editables de Arte
                    </a>
                  ) : (
                    <span className="text-xs text-amber-700 font-semibold bg-amber-100 px-2 py-0.5 rounded-md">
                      Pendiente de enlace por Arte
                    </span>
                  )}
                </div>

                {post.notasArteParaVideo && (
                  <div className="bg-white/90 p-2.5 rounded-lg border border-purple-100 text-xs text-purple-950">
                    <strong className="block text-[10px] text-purple-600 uppercase tracking-wider font-bold">
                      Indicaciones de Arte para Video:
                    </strong>
                    <p className="mt-0.5 whitespace-pre-wrap">{post.notasArteParaVideo}</p>
                  </div>
                )}
              </div>
            )}

            {/* Formulario de entrega contextual: Arte vs Audio/Video */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                {isVideoDiscipline 
                  ? 'Enlace del Video Final Producido (OneDrive / Google Drive URL) *' 
                  : 'Enlace del Arte Final Producido (OneDrive / Google Drive URL) *'}
              </label>
              
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative flex-1 w-full">
                  <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    placeholder="https://apcpublicidad-my.sharepoint.com/... o Google Drive con el archivo final"
                    className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                    value={currentUrl}
                    onChange={(e) => handleUrlChange(post.id, e.target.value)}
                  />
                </div>

                {odt && (
                  <button
                    type="button"
                    onClick={() => handleSubmit(post, odt)}
                    className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Entregar y Enviar a Corrección de Material</span>
                  </button>
                )}
              </div>

              {errorsMap[post.id] && (
                <p className="text-xs text-rose-600 font-semibold">{errorsMap[post.id]}</p>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Selector de Especialidad para Usuarios con Perfiles Compartidos (Arte + Audio y Video) */}
      {hasBothDisciplines && (
        <div className="bg-white p-3.5 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold shrink-0">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Perfiles Compartidos Activos (Multi-Especialidad)
                </h3>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                  Arte & Diseño + Audio y Video
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Selecciona la bandeja de trabajo para atender tus pendientes por disciplina sin mezclar formatos, entregas ni especificaciones.
              </p>
            </div>
          </div>

          {/* Botones de Selector de Bandeja */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl shrink-0 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setActiveDiscipline('arte')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeDiscipline === 'arte'
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Bandeja de Arte</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeDiscipline === 'arte' ? 'bg-pink-800 text-pink-100' : 'bg-slate-200 text-slate-700'
              }`}>
                {artePosts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveDiscipline('video')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeDiscipline === 'video'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Bandeja Audio y Video</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeDiscipline === 'video' ? 'bg-purple-800 text-purple-100' : 'bg-slate-200 text-slate-700'
              }`}>
                {videoPosts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveDiscipline('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeDiscipline === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Ver Ambas</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeDiscipline === 'all' ? 'bg-slate-700 text-slate-100' : 'bg-slate-200 text-slate-700'
              }`}>
                {artePosts.length + videoPosts.length}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Header Info Banner con Temática Dinámica */}
      <div className={`text-white p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
        activeDiscipline === 'arte'
          ? 'bg-gradient-to-r from-pink-900 via-rose-900 to-pink-950'
          : activeDiscipline === 'video'
          ? 'bg-gradient-to-r from-purple-900 via-indigo-900 to-violet-950'
          : 'bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold bg-white/10 backdrop-blur-xs">
            {activeDiscipline === 'arte' ? (
              <Palette className="w-6 h-6 text-pink-200" />
            ) : activeDiscipline === 'video' ? (
              <Video className="w-6 h-6 text-purple-200" />
            ) : (
              <Layers className="w-6 h-6 text-indigo-200" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold">
                {activeDiscipline === 'arte' 
                  ? 'Taller de Arte y Diseño Gráfico' 
                  : activeDiscipline === 'video'
                  ? 'Estudio de Producción Audio y Video'
                  : 'Taller Técnico Multi-Disciplina (Arte & Video)'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 border bg-white/10 border-white/20">
                <UserCheck className="w-3.5 h-3.5" />
                {currentUser.name}
              </span>
            </div>
            <p className="text-xs text-white/80 mt-0.5">
              {activeDiscipline === 'arte'
                ? 'Bandeja exclusiva de Arte: Mostrando piezas estáticas, carruseles, infografías y diseño de editables.'
                : activeDiscipline === 'video'
                ? 'Bandeja exclusiva de Video: Mostrando reels, clips audiovisuales, musicalización y animación.'
                : 'Vista unificada: Visualización estructurada y separada por disciplina técnica.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Selector de modo para Administrador / Supervisor */}
          {isSupervisorOrAdmin && (
            <div className="bg-black/30 p-1 rounded-xl flex items-center border border-white/20">
              <button
                onClick={() => setViewScope('assigned')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewScope === 'assigned'
                    ? 'bg-white/20 text-white shadow-xs font-black'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Mis Asignadas ({assignedOdts.length})
              </button>
              <button
                onClick={() => setViewScope('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  viewScope === 'all'
                    ? 'bg-white/20 text-white shadow-xs font-black'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Todas las Parrillas
              </button>
            </div>
          )}

          <div className="px-4 py-2 bg-black/20 backdrop-blur-xs rounded-xl text-center">
            <span className="text-xs text-white/80 block font-medium">Asignados Pendientes</span>
            <span className="text-2xl font-black text-white">{currentTotalPending}</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtro por Parrilla Asignada */}
      {(assignedOdts.length > 1 || (isSupervisorOrAdmin && viewScope === 'all' && odts.length > 0)) && (
        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <Filter className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="text-xs font-bold text-slate-700 shrink-0">Filtrar por Parrilla / ODT:</span>
          <select
            value={selectedOdtFilter}
            onChange={(e) => setSelectedOdtFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 font-medium focus:outline-hidden focus:ring-2 max-w-md cursor-pointer"
          >
            <option value="all">Todas mis parrillas asignadas ({viewScope === 'assigned' ? assignedOdts.length : odts.length})</option>
            {(viewScope === 'assigned' ? assignedOdts : odts).map(o => (
              <option key={o.id} value={o.id}>
                {o.numeroODT} - {o.clientName} ({o.nombreParrilla})
              </option>
            ))}
          </select>
          {selectedOdtFilter !== 'all' && (
            <button
              onClick={() => setSelectedOdtFilter('all')}
              className="text-xs text-indigo-600 hover:underline font-semibold cursor-pointer"
            >
              Ver todas
            </button>
          )}
        </div>
      )}

      {/* AVISO OBLIGATORIO DE POLÍTICA DE ALMACENAMIENTO LIGERO */}
      <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-sky-900">
        <Cloud className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold block">Política de Rendimiento y Almacenamiento Externo:</strong>
          <span>
            No almacene videos, archivos editables (.psd, .ai, .pr) ni materiales pesados dentro de la base de datos de la aplicación.
            Aloje el archivo final exportado en <strong>OneDrive corporativo o Google Drive</strong> y pegue el enlace de acceso compartido a continuación.
          </span>
        </div>
      </div>

      {/* AVISO PARA AUDIO Y VIDEO: POSTS EN DISEÑO DE EDITABLES POR ARTE (Visible en Video y en All) */}
      {(activeDiscipline === 'video' || activeDiscipline === 'all') && videoWaitingInArte.length > 0 && (
        <div className="bg-purple-50 border border-purple-300 rounded-2xl p-4 flex items-start justify-between gap-3 text-xs text-purple-950 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <strong className="font-bold text-sm block text-purple-950">
                Videos en espera de Recursos Editables en Arte ({videoWaitingInArte.length})
              </strong>
              <p className="text-purple-800 text-xs mt-0.5 leading-relaxed">
                El departamento de <strong>Arte</strong> está diseñando las ilustraciones y recursos gráficos para {videoWaitingInArte.length} post(s) de video. En cuanto Arte entregue los editables, se habilitarán aquí automáticamente con el enlace listo para animación.
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {videoWaitingInArte.map(vp => (
                  <span key={vp.id} className="px-2.5 py-0.5 rounded-md bg-purple-200/90 text-purple-900 font-mono font-bold text-[11px]">
                    {vp.numeroInterno} • {vp.redSocial}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-purple-200 text-purple-900 shrink-0">
            En Cola de Arte
          </span>
        </div>
      )}

      {/* Barra de Filtros de Prioridad */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <span>Piezas en Producción ({currentTotalPending})</span>
          <span className="text-[11px] font-normal text-slate-400">Ordenadas por urgencia</span>
        </h3>

        {/* Filtros de Nivel de Prioridad */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-slate-500 font-semibold mr-1">Filtrar prioridad:</span>
          <button
            onClick={() => setPriorityFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              priorityFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setPriorityFilter('Nivel 1')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
              priorityFilter === 'Nivel 1'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <span>🔴</span>
            <span>Nivel 1 (Urgentes)</span>
          </button>
          <button
            onClick={() => setPriorityFilter('Nivel 2')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
              priorityFilter === 'Nivel 2'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <span>🟡</span>
            <span>Nivel 2</span>
          </button>
          <button
            onClick={() => setPriorityFilter('Nivel 3')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
              priorityFilter === 'Nivel 3'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <span>🟢</span>
            <span>Nivel 3</span>
          </button>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL: BANDEJAS SEGÚN SELECCIÓN (SEPARACIÓN ESTRICTA DE TRABAJOS) */}

      {/* 1. MODO ARTE EXCLUSIVO */}
      {activeDiscipline === 'arte' && (
        <div className="space-y-4">
          {artePosts.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
              <p className="text-sm font-semibold text-slate-700">¡Al día en Arte! No tienes piezas gráficas pendientes en este filtro.</p>
            </div>
          ) : (
            artePosts.map(post => renderPostCard(post))
          )}
        </div>
      )}

      {/* 2. MODO AUDIO Y VIDEO EXCLUSIVO */}
      {activeDiscipline === 'video' && (
        <div className="space-y-4">
          {videoPosts.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
              <p className="text-sm font-semibold text-slate-700">¡Al día en Video! No tienes piezas audiovisuales pendientes en este filtro.</p>
            </div>
          ) : (
            videoPosts.map(post => renderPostCard(post))
          )}
        </div>
      )}

      {/* 3. MODO VISTA COMBINADA (SEPARADA CLARAMENTE EN DOS SECCIONES INDEPENDIENTES) */}
      {activeDiscipline === 'all' && (
        <div className="space-y-8">
          {/* Sub-sección 1: Arte y Diseño Gráfico */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b-2 border-pink-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-pink-100 text-pink-700 font-bold">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    1. Bandeja de Arte & Diseño Gráfico
                  </h4>
                  <p className="text-[11px] text-slate-500">Piezas estáticas, carruseles, infografías y editables</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-pink-100 text-pink-800 border border-pink-200">
                {artePosts.length} {artePosts.length === 1 ? 'pendiente' : 'pendientes'}
              </span>
            </div>

            {artePosts.length === 0 ? (
              <div className="bg-slate-50 rounded-xl p-6 text-center border border-slate-200 text-slate-400 text-xs font-medium">
                No tienes piezas gráficas pendientes en Arte.
              </div>
            ) : (
              <div className="space-y-4">
                {artePosts.map(post => renderPostCard(post))}
              </div>
            )}
          </div>

          {/* Sub-sección 2: Audio y Video */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b-2 border-purple-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700 font-bold">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    2. Bandeja de Audio y Video
                  </h4>
                  <p className="text-[11px] text-slate-500">Reels, videos, motion graphics y animación</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-800 border border-purple-200">
                {videoPosts.length} {videoPosts.length === 1 ? 'pendiente' : 'pendientes'}
              </span>
            </div>

            {videoPosts.length === 0 ? (
              <div className="bg-slate-50 rounded-xl p-6 text-center border border-slate-200 text-slate-400 text-xs font-medium">
                No tienes piezas de video pendientes en Audio y Video.
              </div>
            ) : (
              <div className="space-y-4">
                {videoPosts.map(post => renderPostCard(post))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
