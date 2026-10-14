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
  const isArte = currentUser.role === 'Arte';
  const isVideo = currentUser.role === 'Audio y Video';

  const [urlsMap, setUrlsMap] = useState<Record<string, string>>({});
  const [errorsMap, setErrorsMap] = useState<Record<string, string>>({});
  const [editableUrlsMap, setEditableUrlsMap] = useState<Record<string, string>>({});
  const [notasArteMap, setNotasArteMap] = useState<Record<string, string>>({});
  const [editableErrorsMap, setEditableErrorsMap] = useState<Record<string, string>>({});
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'Nivel 1' | 'Nivel 2' | 'Nivel 3'>('all');
  const [selectedOdtFilter, setSelectedOdtFilter] = useState<string>('all');

  // Soporte para supervisores/administradores (permitir alternar entre asignadas y todas)
  const isSupervisorOrAdmin = currentUser.role === 'Super Admin' || currentUser.role === 'Admin' || Boolean(currentUser.permissions?.canSuperviseAll);
  const [viewScope, setViewScope] = useState<'assigned' | 'all'>('assigned');

  // Parrillas donde el usuario actual está explícitamente asignado (Arte como diseñador o AV como editor)
  const assignedOdts = useMemo(() => {
    return odts.filter(o => {
      if (isArte) {
        return (
          o.disenadorId === currentUser.id ||
          (o.disenadorName && o.disenadorName.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
        );
      }
      if (isVideo) {
        return (
          o.editorAvId === currentUser.id ||
          (o.editorAvName && o.editorAvName.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
        );
      }
      return (
        o.disenadorId === currentUser.id ||
        o.editorAvId === currentUser.id ||
        (o.disenadorName && o.disenadorName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) ||
        (o.editorAvName && o.editorAvName.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
      );
    });
  }, [odts, currentUser, isArte, isVideo]);

  // Verificación estricta de asignación por post u ODT
  const isPostAssignedToUser = (post: Post) => {
    if (isSupervisorOrAdmin && viewScope === 'all') return true;

    // Asignación directa en el post
    if (post.responsableActualId && post.responsableActualId === currentUser.id) return true;

    // Asignación por la ODT del post
    const odt = odts.find(o => o.id === post.odtId);
    if (!odt) return false;

    if (isArte) {
      return (
        odt.disenadorId === currentUser.id ||
        (odt.disenadorName && odt.disenadorName.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
      );
    }

    if (isVideo) {
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

  // Posts de video que están actualmente en espera en el departamento de Arte (filtrado para el editor asignado)
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

  // Filtrar posts asignados a esta área técnica y usuario específico
  const pendingPosts = useMemo(() => {
    let list = posts.filter(p => isPostAssignedToUser(p));

    if (isArte) {
      list = list.filter(p => p.estado === 'Producción Arte' || p.estado === 'Diseño de Editables (Arte)');
    } else if (isVideo) {
      list = list.filter(p => p.estado === 'Producción Audio/Video');
    } else {
      list = list.filter(p => p.estado === 'Producción Arte' || p.estado === 'Producción Audio/Video' || p.estado === 'Diseño de Editables (Arte)');
    }

    if (priorityFilter !== 'all') {
      list = list.filter(p => p.nivelPrioridad === priorityFilter);
    }

    if (selectedOdtFilter !== 'all') {
      list = list.filter(p => p.odtId === selectedOdtFilter);
    }

    // Ordenar: Nivel 1 primero, luego Nivel 2, luego Nivel 3, y por fecha límite
    return [...list].sort((a, b) => {
      const pMap: Record<string, number> = { 'Nivel 1': 1, 'Nivel 2': 2, 'Nivel 3': 3 };
      const pA = pMap[a.nivelPrioridad || 'Nivel 2'] || 2;
      const pB = pMap[b.nivelPrioridad || 'Nivel 2'] || 2;
      if (pA !== pB) return pA - pB;
      const dateA = a.fechaEntregaMaterial || a.fechaPrevista || '';
      const dateB = b.fechaEntregaMaterial || b.fechaPrevista || '';
      return dateA.localeCompare(dateB);
    });
  }, [posts, isArte, isVideo, priorityFilter, selectedOdtFilter, odts, currentUser, isSupervisorOrAdmin, viewScope]);

  const deliveredPosts = useMemo(() => {
    return posts.filter(p => {
      const isDelivered = Boolean(p.enlaceMaterialFinal && p.estado !== 'Producción Arte' && p.estado !== 'Producción Audio/Video' && p.estado !== 'Diseño de Editables (Arte)');
      if (!isDelivered) return false;
      if (selectedOdtFilter !== 'all' && p.odtId !== selectedOdtFilter) return false;
      return isPostAssignedToUser(p);
    });
  }, [posts, isPostAssignedToUser, selectedOdtFilter]);

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

  return (
    <div className="space-y-6">
      
      {/* Header Info */}
      <div className={`text-white p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        isArte ? 'bg-pink-900' : 'bg-amber-900'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${
            isArte ? 'bg-pink-800 text-pink-200' : 'bg-amber-800 text-amber-200'
          }`}>
            {isArte ? <Palette className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold">
                {isArte ? 'Taller de Arte y Diseño Gráfico' : 'Estudio de Producción Audio y Video'}
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 border ${
                isArte 
                  ? 'bg-pink-800 text-pink-200 border-pink-700' 
                  : 'bg-amber-800 text-amber-200 border-amber-700'
              }`}>
                <UserCheck className="w-3.5 h-3.5" />
                {currentUser.name}
              </span>
            </div>
            <p className={`text-xs ${isArte ? 'text-pink-200' : 'text-amber-200'}`}>
              {viewScope === 'assigned'
                ? `Mostrando piezas de tus ${assignedOdts.length} parrilla(s) asignada(s)`
                : 'Modo Supervisión: Mostrando todas las piezas técnicas del equipo'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Selector de modo para Administrador / Supervisor */}
          {isSupervisorOrAdmin && (
            <div className="bg-black/30 p-1 rounded-xl flex items-center border border-white/20">
              <button
                onClick={() => setViewScope('assigned')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewScope === 'assigned'
                    ? isArte ? 'bg-pink-600 text-white shadow-xs' : 'bg-amber-600 text-white shadow-xs'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Mis Asignadas ({assignedOdts.length})
              </button>
              <button
                onClick={() => setViewScope('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  viewScope === 'all'
                    ? isArte ? 'bg-pink-600 text-white shadow-xs' : 'bg-amber-600 text-white shadow-xs'
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
            <span className="text-2xl font-black text-white">{pendingPosts.length}</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtro por Parrilla Asignada */}
      {(assignedOdts.length > 1 || (isSupervisorOrAdmin && viewScope === 'all' && odts.length > 0)) && (
        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <Filter className={`w-4 h-4 shrink-0 ${isArte ? 'text-pink-600' : 'text-amber-600'}`} />
          <span className="text-xs font-bold text-slate-700 shrink-0">Filtrar por Parrilla / ODT:</span>
          <select
            value={selectedOdtFilter}
            onChange={(e) => setSelectedOdtFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 font-medium focus:outline-hidden focus:ring-2 max-w-md"
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
              className={`text-xs hover:underline font-semibold ${isArte ? 'text-pink-600' : 'text-amber-600'}`}
            >
              Ver todas
            </button>
          )}
        </div>
      )}

      {/* AVISO OBLIGATORIO DE POLÍTICA DE ALMACENAMIENTO LIGERO (SECCIÓN 2 / 10) */}
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

      {/* AVISO PARA AUDIO Y VIDEO: POSTS EN DISEÑO DE EDITABLES POR ARTE */}
      {isVideo && videoWaitingInArte.length > 0 && (
        <div className="bg-purple-50 border border-purple-300 rounded-2xl p-4 flex items-start justify-between gap-3 text-xs text-purple-950 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <strong className="font-bold text-sm block text-purple-950">
                Parrilla Telefém / Videos con Editables en Arte ({videoWaitingInArte.length})
              </strong>
              <p className="text-purple-800 text-xs mt-0.5 leading-relaxed">
                El equipo de <strong>Arte</strong> está diseñando las ilustraciones y recursos editables para {videoWaitingInArte.length} post(s) de video. En cuanto Arte entregue los editables, se habilitarán aquí automáticamente con el enlace listo para animación.
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

      {/* Lista de Trabajos Pendientes */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span>Posts en Producción ({pendingPosts.length})</span>
            <span className="text-[11px] font-normal text-slate-400">Ordenados por nivel de urgencia</span>
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

        {pendingPosts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
            <p className="text-sm font-semibold text-slate-700">¡Al día! No tienes piezas pendientes en este filtro.</p>
          </div>
        ) : (
          pendingPosts.map(post => {
            const client = clients.find(c => c.id === post.clientId);
            const odt = odts.find(o => o.id === post.odtId);
            const currentUrl = urlsMap[post.id] !== undefined ? urlsMap[post.id] : (post.enlaceMaterialFinal || '');
            const isUrgent = post.nivelPrioridad === 'Nivel 1';

            return (
              <div 
                key={post.id} 
                className={`bg-white rounded-2xl p-5 border shadow-2xs space-y-4 transition-all ${
                  isUrgent 
                    ? 'border-2 border-rose-400 bg-rose-50/15' 
                    : 'border-slate-200'
                }`}
              >
                
                {/* Meta header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-md bg-slate-900 text-white font-mono text-xs font-bold">
                      {post.numeroInterno}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold">
                      {client?.name || 'Cliente'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold">
                      {post.redSocial}
                    </span>
                    
                    {/* Formato reducido a Imagen, Video o Carrusel */}
                    <span className="text-xs px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold border border-purple-200">
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
                      <span>Entrega Límite Arte/Video: {post.fechaEntregaMaterial || post.fechaPrevista}</span>
                    </span>

                    <span className="text-xs text-slate-500">
                      Fecha de publicación en redes: <strong>{post.fechaPrevista}</strong>
                    </span>
                  </div>

                  <button
                    onClick={() => onSelectPost(post)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Ver Ficha Completa
                  </button>
                </div>

                {/* Copies aprobados para plasmar */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Copy In (Texto que DEBE ir en la gráfica/video):
                    </span>
                    <RichTextDisplay
                      content={post.copyIn}
                      fallbackText="Sin texto en gráfica"
                      showCopyButton
                      copyButtonLabel="Copiar Copy In"
                    />
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Copy Out (Caption de contexto):
                    </span>
                    <RichTextDisplay
                      content={post.copyOut}
                      fallbackText="Sin caption"
                      showCopyButton
                      copyButtonLabel="Copiar Caption"
                    />
                  </div>
                </div>

                {/* Enlace de Referencia */}
                {post.enlaceReferencia && (
                  <div>
                    <a
                      href={post.enlaceReferencia}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Consultar Enlace de Referencia Visual
                    </a>
                  </div>
                )}

                {/* Indicador Especial si requiere Recursos de Arte (Telefém) */}
                {post.estado === 'Diseño de Editables (Arte)' ? (
                  <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="text-xs font-black uppercase tracking-wider text-purple-950 block">
                          🎨 Tarea de Arte: Preparar Recursos Editables para Audio y Video (Parrilla Telefém)
                        </strong>
                        <p className="text-[11px] text-purple-800 leading-relaxed mt-0.5">
                          Diseña las ilustraciones y recursos gráficos en capas separadas (Figma, Illustrator, PSD) y compártelos a continuación para que el editor de <strong>Audio y Video</strong> pueda animar el video.
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
                              Recursos Editables de Arte Disponibles (Parrilla Telefém)
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

                    {/* Formulario de entrega estándar: Enlace del Material Final */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        {isArte ? 'Enlace del Arte Final Producido (OneDrive / Google Drive URL) *' : 'Enlace del Video Final Producido (OneDrive / Google Drive URL) *'}
                      </label>
                      
                      <div className="flex flex-col sm:flex-row items-center gap-2">
                        <div className="relative flex-1 w-full">
                          <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="url"
                            placeholder="https://apcpublicidad-my.sharepoint.com/... o Google Drive"
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
                            Entregar y Enviar a Corrección de Material
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
          })
        )}
      </div>

    </div>
  );
};
