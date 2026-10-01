import React, { useState, useEffect } from 'react';
import { Post, ODT, User, PostComment, MaterialType, PostDimensions, PriorityLevel } from '../types';
import { 
  X, CheckCircle2, Clock, AlertTriangle, ExternalLink, ShieldCheck, 
  MessageSquare, Send, History, ArrowRight, UserCircle2, Eye, EyeOff,
  Edit3, Save, Check, Copy, RefreshCw, Calendar, Sparkles, Globe, Share2
} from 'lucide-react';
import { getNowTimestamp } from '../services/odtService';
import { PostStageMap } from './PostPipelineTracker';

interface PostDetailModalProps {
  post: Post;
  odt?: ODT;
  currentUser: User;
  onClose: () => void;
  onAddComment: (commentText: string, isClientVisible: boolean) => void;
  onOpenIntervention?: () => void;
  onUpdatePost?: (postId: string, data: { 
    copyIn?: string; 
    copyOut?: string; 
    enlaceReferencia?: string; 
    enlaceMaterialFinal?: string;
    fechaPrevista?: string;
    fechaEntregaMaterial?: string;
    tipoMaterial?: MaterialType;
    dimensiones?: string;
    nivelPrioridad?: PriorityLevel;
  }) => void;
  onSendToReview?: (post: Post, odt: ODT) => void;
  onDuplicatePost?: (post: Post, newRedSocial: string) => void;
  onRecyclePost?: (post: Post) => void;
  onOpenPublishModal?: (post: Post) => void;
  initialEditMode?: boolean;
}

const MATERIAL_TYPES: MaterialType[] = ['Imagen', 'Video', 'Carrusel'];

const DIMENSION_OPTIONS: { id: PostDimensions; label: string; desc: string }[] = [
  { id: '1080x1080 (1:1 Cuadrado)', label: '1:1 Cuadrado (1080 × 1080 px)', desc: 'Feed Instagram / FB / LinkedIn' },
  { id: '1080x1920 (9:16 Vertical / Reels)', label: '9:16 Vertical (1080 × 1920 px)', desc: 'Reels / TikTok / Shorts' },
  { id: '1920x1080 (16:9 Horizontal)', label: '16:9 Horizontal (1920 × 1080 px)', desc: 'YouTube / Web horizontal' }
];

export const PostDetailModal: React.FC<PostDetailModalProps> = ({
  post,
  odt,
  currentUser,
  onClose,
  onAddComment,
  onOpenIntervention,
  onUpdatePost,
  onSendToReview,
  onDuplicatePost,
  onRecyclePost,
  onOpenPublishModal,
  initialEditMode
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'approvals' | 'comments' | 'history'>('content');
  const [newCommentText, setNewCommentText] = useState('');
  const [isClientVisible, setIsClientVisible] = useState(currentUser.role === 'Cliente');
  const [copiedLinkIndex, setCopiedLinkIndex] = useState<number | null>(null);

  const handleCopyLink = (url: string, index: number) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
    }
    setCopiedLinkIndex(index);
    setTimeout(() => setCopiedLinkIndex(null), 2000);
  };

  const isClient = currentUser.role === 'Cliente';
  const canEdit = !isClient;
  const visibleComments = isClient ? post.comentarios.filter(c => c.isClientVisible) : post.comentarios;

  // Estado para modal emergente de duplicación
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const availableRedes = Array.isArray(odt?.redesSociales) && odt.redesSociales.length > 0
    ? odt.redesSociales
    : ['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'X (Twitter)', 'YouTube'];
  const [targetDuplicateRed, setTargetDuplicateRed] = useState(availableRedes[0] || 'Instagram');

  // Modo edición de textos y especificaciones
  const [isEditing, setIsEditing] = useState<boolean>(() => {
    if (initialEditMode !== undefined) return initialEditMode;
    return post.estado === 'Ajustes de Copy' || post.estado === 'Redacción de Copy' || post.estado === 'Cambios solicitados por Cliente';
  });

  const [editCopyIn, setEditCopyIn] = useState(post.copyIn || '');
  const [editCopyOut, setEditCopyOut] = useState(post.copyOut || '');
  const [editEnlaceReferencia, setEditEnlaceReferencia] = useState(post.enlaceReferencia || '');
  const [editEnlaceMaterialFinal, setEditEnlaceMaterialFinal] = useState(post.enlaceMaterialFinal || '');
  const [editFechaPrevista, setEditFechaPrevista] = useState(post.fechaPrevista || '');
  const [editFechaEntregaMaterial, setEditFechaEntregaMaterial] = useState(post.fechaEntregaMaterial || post.fechaPrevista || '');
  const [editTipoMaterial, setEditTipoMaterial] = useState<MaterialType>(post.tipoMaterial || 'Imagen');
  const [editDimensiones, setEditDimensiones] = useState<string>(post.dimensiones || '1080x1080 (1:1 Cuadrado)');
  const [editNivelPrioridad, setEditNivelPrioridad] = useState<PriorityLevel>(post.nivelPrioridad || 'Nivel 2');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setEditCopyIn(post.copyIn || '');
    setEditCopyOut(post.copyOut || '');
    setEditEnlaceReferencia(post.enlaceReferencia || '');
    setEditEnlaceMaterialFinal(post.enlaceMaterialFinal || '');
    setEditFechaPrevista(post.fechaPrevista || '');
    setEditFechaEntregaMaterial(post.fechaEntregaMaterial || post.fechaPrevista || '');
    setEditTipoMaterial(post.tipoMaterial || 'Imagen');
    setEditDimensiones(post.dimensiones || '1080x1080 (1:1 Cuadrado)');
    setEditNivelPrioridad(post.nivelPrioridad || 'Nivel 2');
  }, [post]);

  useEffect(() => {
    if (initialEditMode !== undefined) {
      setIsEditing(initialEditMode);
    }
  }, [initialEditMode]);

  const handleSavePostEdits = () => {
    if (onUpdatePost) {
      onUpdatePost(post.id, {
        copyIn: editCopyIn.trim(),
        copyOut: editCopyOut.trim(),
        enlaceReferencia: editEnlaceReferencia.trim(),
        enlaceMaterialFinal: editEnlaceMaterialFinal.trim(),
        fechaPrevista: editFechaPrevista,
        fechaEntregaMaterial: editFechaEntregaMaterial,
        tipoMaterial: editTipoMaterial,
        dimensiones: editDimensiones,
        nivelPrioridad: editNivelPrioridad
      });
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    setIsEditing(false);
  };

  const handleSaveAndSendToReview = () => {
    if (onUpdatePost) {
      onUpdatePost(post.id, {
        copyIn: editCopyIn.trim(),
        copyOut: editCopyOut.trim(),
        enlaceReferencia: editEnlaceReferencia.trim(),
        enlaceMaterialFinal: editEnlaceMaterialFinal.trim(),
        fechaPrevista: editFechaPrevista,
        fechaEntregaMaterial: editFechaEntregaMaterial,
        tipoMaterial: editTipoMaterial,
        dimensiones: editDimensiones,
        nivelPrioridad: editNivelPrioridad
      });
    }
    if (odt && onSendToReview) {
      const updatedPost: Post = {
        ...post,
        copyIn: editCopyIn.trim(),
        copyOut: editCopyOut.trim(),
        enlaceReferencia: editEnlaceReferencia.trim(),
        enlaceMaterialFinal: editEnlaceMaterialFinal.trim(),
        fechaPrevista: editFechaPrevista,
        fechaEntregaMaterial: editFechaEntregaMaterial,
        tipoMaterial: editTipoMaterial,
        dimensiones: editDimensiones,
        nivelPrioridad: editNivelPrioridad
      };
      onSendToReview(updatedPost, odt);
      onClose();
    }
  };

  const handleCancelEdits = () => {
    setEditCopyIn(post.copyIn || '');
    setEditCopyOut(post.copyOut || '');
    setEditEnlaceReferencia(post.enlaceReferencia || '');
    setEditEnlaceMaterialFinal(post.enlaceMaterialFinal || '');
    setEditFechaPrevista(post.fechaPrevista || '');
    setEditFechaEntregaMaterial(post.fechaEntregaMaterial || post.fechaPrevista || '');
    setEditTipoMaterial(post.tipoMaterial || 'Imagen');
    setEditDimensiones(post.dimensiones || '1080x1080 (1:1 Cuadrado)');
    setEditNivelPrioridad(post.nivelPrioridad || 'Nivel 2');
    setIsEditing(false);
  };

  const handleTriggerDuplicate = () => {
    if (onDuplicatePost) {
      onDuplicatePost(post, targetDuplicateRed);
      setIsDuplicateDialogOpen(false);
      onClose();
    }
  };

  const handleTriggerRecycle = () => {
    if (confirm(`¿Retomar y reciclar este post #${post.numeroInterno}?\n\nEl post regresará a Borrador bajo la responsabilidad del Community para que puedas cambiar el enfoque, adaptar el copy o redefinir el material.`)) {
      if (onRecyclePost) {
        onRecyclePost(post);
        setIsEditing(true);
        setActiveTab('content');
      }
    }
  };

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    onAddComment(newCommentText.trim(), isClient ? true : isClientVisible);
    setNewCommentText('');
  };

  const getStatusBadge = (status: Post['estado']) => {
    switch (status) {
      case 'Listo para Publicar':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Publicado':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'Aprobación Copy Cliente':
      case 'Aprobación Material Cliente':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'Revisión Médica':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Corrección de Copy':
      case 'Corrección Material':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Producción Arte':
        return 'bg-pink-50 text-pink-700 border-pink-200';
      case 'Producción Audio/Video':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Cambios solicitados por Cliente':
      case 'Ajustes de Copy':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-mono text-sm font-bold shadow-xs">
              {post.numeroInterno}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{post.redSocial}</h2>
                <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${getStatusBadge(post.estado)}`}>
                  {post.estado}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Previsto: {post.fechaPrevista} • Formato: {post.tipoMaterial}
                {!isClient && ` • Resp: ${post.areaResponsable} (${post.responsableActualName || 'Sin asignar'})`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && onDuplicatePost && (
              <button
                onClick={() => setIsDuplicateDialogOpen(true)}
                className="text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Duplicar post para otra red social"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Duplicar</span>
              </button>
            )}

            {canEdit && onRecyclePost && post.estado !== 'Borrador' && (
              <button
                onClick={handleTriggerRecycle}
                className="text-xs font-bold px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Atraer post al inicio (Borrador) para nuevo enfoque"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Reciclar</span>
              </button>
            )}

            {canEdit && (
              <button
                onClick={() => {
                  setActiveTab('content');
                  setIsEditing(!isEditing);
                }}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isEditing 
                    ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100' 
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                }`}
                title={isEditing ? 'Salir del modo edición' : 'Modificar textos y especificaciones'}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Viendo Modo Edición' : 'Editar Ficha'}</span>
              </button>
            )}
            {!isClient && (currentUser.role === 'Ejecutivo' || currentUser.role === 'Admin') && onOpenIntervention && (
              <button
                onClick={onOpenIntervention}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
              >
                Intervenir Post
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6 gap-6 text-xs font-bold bg-white">
          <button
            onClick={() => setActiveTab('content')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'content' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Contenido y Textos
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'approvals' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Aprobaciones</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'comments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Comentarios</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] text-slate-600">
              {visibleComments.length}
            </span>
          </button>
          {!isClient && (
            <button
              onClick={() => setActiveTab('history')}
              className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Auditoría e Historial</span>
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* TAB: CONTENT */}
          {activeTab === 'content' && (
            <div className="space-y-4">
              {/* Mapa de Etapas y SLA de este Post */}
              <PostStageMap post={post} />

              {/* Barra de Especificaciones Técnicas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Formato & Tamaño:</span>
                  <span className="font-extrabold text-slate-900">{post.tipoMaterial}</span>
                  <div className="text-[10px] text-slate-500 font-medium">{post.dimensiones || '1080x1080 (1:1 Cuadrado)'}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Prioridad Operativa:</span>
                  <span className={`inline-flex items-center gap-1 font-black text-xs mt-0.5 ${
                    post.nivelPrioridad === 'Nivel 1' ? 'text-rose-600' : post.nivelPrioridad === 'Nivel 3' ? 'text-emerald-600' : 'text-amber-600'
                  }`}>
                    {post.nivelPrioridad === 'Nivel 1' ? '🔴 Nivel 1 (Urgente)' : post.nivelPrioridad === 'Nivel 3' ? '🟢 Nivel 3 (Flexible)' : '🟡 Nivel 2 (Estándar)'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Entrega Arte/Video:</span>
                  <span className="font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-300 inline-block mt-0.5">
                    {post.fechaEntregaMaterial || post.fechaPrevista}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Fecha Publicación:</span>
                  <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 inline-block mt-0.5">
                    {post.fechaPrevista}
                  </span>
                </div>
              </div>

              {/* Alerta Destacada de Cambios Solicitados por el Cliente */}
              {(post.aprobacionClienteCopy?.status === 'Cambios Solicitados' || 
                post.aprobacionClienteMaterial?.status === 'Cambios Solicitados' ||
                post.estado === 'Cambios solicitados por Cliente') && (
                <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-950 flex items-start gap-3 shadow-2xs">
                  <div className="p-2 rounded-lg bg-rose-600 text-white shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="text-xs space-y-1 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-black text-rose-950 text-sm">
                        ⚠️ El Cliente ha Solicitado Cambios en esta Publicación
                      </span>
                      <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">
                        {post.aprobacionClienteCopy?.date || post.aprobacionClienteMaterial?.date || 'Observación activa'}
                      </span>
                    </div>
                    <p className="italic text-rose-900 font-semibold bg-white/80 p-2.5 rounded-lg border border-rose-200 mt-1 leading-relaxed">
                      "{post.aprobacionClienteCopy?.comment || 
                        post.aprobacionClienteMaterial?.comment || 
                        post.comentarios.find(c => c.text.includes('[Revisión') || c.userRole === 'Cliente')?.text || 
                        'Se requieren ajustes en esta publicación según la revisión del cliente.'}"
                    </p>
                    <span className="text-[11px] text-rose-700 block mt-0.5">
                      Registrado por: <strong>{post.aprobacionClienteCopy?.user || post.aprobacionClienteMaterial?.user || 'Cliente'}</strong>
                    </span>
                  </div>
                </div>
              )}

              {/* Feedback de guardado exitoso */}
              {saveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>¡Cambios guardados con éxito!</strong> El copy in y copy out han sido actualizados en la parrilla.</span>
                </div>
              )}

              {/* Si está en modo edición */}
              {isEditing ? (
                <div className="space-y-4 bg-slate-50/80 p-5 rounded-2xl border-2 border-indigo-300 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-indigo-100 flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Edit3 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-indigo-950">
                          Editor de Contenido y Especificaciones
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Modifica textos, fechas, medidas o el requerimiento de material.
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full border border-indigo-200">
                      Modo Edición Activo
                    </span>
                  </div>

                  {/* Especificaciones de Producción: Formato, Tamaño, Prioridad y Fechas */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-white rounded-xl border border-indigo-200 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                        Formato de Entrega:
                      </label>
                      <select
                        value={editTipoMaterial}
                        onChange={(e) => setEditTipoMaterial(e.target.value as MaterialType)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-xs"
                      >
                        {MATERIAL_TYPES.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                        Tamaño / Medidas:
                      </label>
                      <select
                        value={editDimensiones}
                        onChange={(e) => setEditDimensiones(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-xs"
                      >
                        {DIMENSION_OPTIONS.map(d => (
                          <option key={d.id} value={d.id}>{d.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                        Nivel de Prioridad:
                      </label>
                      <select
                        value={editNivelPrioridad}
                        onChange={(e) => setEditNivelPrioridad(e.target.value as PriorityLevel)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs"
                      >
                        <option value="Nivel 1">🔴 Nivel 1 (Muy importante / Urgente)</option>
                        <option value="Nivel 2">🟡 Nivel 2 (Importante / Estándar)</option>
                        <option value="Nivel 3">🟢 Nivel 3 (No tan importante / Flexible)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-1 bg-amber-50/60 p-2.5 rounded-lg border border-amber-200">
                      <label className="font-bold text-amber-900 uppercase tracking-wider text-[10px] block mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>Entrega Arte/Video:</span>
                      </label>
                      <input
                        type="date"
                        value={editFechaEntregaMaterial}
                        onChange={(e) => setEditFechaEntregaMaterial(e.target.value)}
                        className="w-full p-1.5 bg-white border border-amber-300 rounded font-semibold text-xs"
                      />
                    </div>

                    <div className="sm:col-span-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-indigo-600" />
                        <span>Fecha de Publicación en Redes:</span>
                      </label>
                      <input
                        type="date"
                        value={editFechaPrevista}
                        onChange={(e) => setEditFechaPrevista(e.target.value)}
                        className="w-full p-1.5 bg-white border border-slate-300 rounded font-semibold text-xs"
                      />
                    </div>
                  </div>

                  {/* COPY IN */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                        <span>Copy In (Texto sobre la imagen / gráfica)</span>
                      </label>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {editCopyIn.length} caracteres
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Texto conciso y de alto impacto que el equipo de diseño integrará dentro del arte visual.
                    </p>
                    <textarea
                      rows={3}
                      value={editCopyIn}
                      onChange={(e) => setEditCopyIn(e.target.value)}
                      placeholder="Escribe el copy in que irá sobre la imagen o arte..."
                      className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium text-slate-900 leading-relaxed shadow-2xs"
                    />
                  </div>

                  {/* COPY OUT */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                        <span>Copy Out (Texto de la publicación / Caption)</span>
                      </label>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {editCopyOut.length} caracteres
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Copy del post, descripción detallada, hashtags y llamada a la acción (CTA) para el feed.
                    </p>
                    <textarea
                      rows={6}
                      value={editCopyOut}
                      onChange={(e) => setEditCopyOut(e.target.value)}
                      placeholder="Escribe el caption o copy out completo para la publicación..."
                      className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 leading-relaxed shadow-2xs"
                    />
                  </div>

                  {/* ENLACES */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-700 block mb-1">
                        Enlace de Referencia (Google Drive / Sitio)
                      </label>
                      <input
                        type="url"
                        value={editEnlaceReferencia}
                        onChange={(e) => setEditEnlaceReferencia(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-700 block mb-1">
                        Enlace del Material Final (Arte / Video)
                      </label>
                      <input
                        type="url"
                        value={editEnlaceMaterialFinal}
                        onChange={(e) => setEditEnlaceMaterialFinal(e.target.value)}
                        placeholder="https://onedrive.live.com/..."
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* BOTONES DE GUARDADO Y ACCIÓN */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-indigo-200/80">
                    <button
                      type="button"
                      onClick={handleCancelEdits}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSavePostEdits}
                        className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Guardar Cambios</span>
                      </button>

                      {odt && onSendToReview && (post.estado === 'Ajustes de Copy' || post.estado === 'Redacción de Copy' || post.estado === 'Cambios solicitados por Cliente') && (
                        <button
                          type="button"
                          onClick={handleSaveAndSendToReview}
                          className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Guardar y Enviar a {odt.requiereMedico ? 'Médico' : 'Corrección'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Modo Lectura con botón de Edición */
                <>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 relative group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                        Copy In (Texto sobre la imagen / gráfica)
                      </span>
                      {canEdit && (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity cursor-pointer bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Modificar Copy In</span>
                        </button>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-900 whitespace-pre-wrap">
                      {post.copyIn || <span className="text-slate-400 italic">Sin texto en gráfica</span>}
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 relative group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                        Copy Out (Texto de la publicación / Caption)
                      </span>
                      {canEdit && (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity cursor-pointer bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Modificar Copy Out</span>
                        </button>
                      )}
                    </div>
                    <p className="text-sm font-normal text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {post.copyOut || <span className="text-slate-400 italic">Sin caption</span>}
                    </p>
                  </div>

                  {canEdit && (
                    <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 text-indigo-900 font-semibold">
                        <Edit3 className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>¿Deseas editar los textos o aplicar los cambios solicitados por el cliente?</span>
                      </div>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-2xs transition-colors shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar Copy In y Copy Out</span>
                      </button>
                    </div>
                  )}

                  {/* Links */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                      <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                        Enlace de Referencia
                      </span>
                      {post.enlaceReferencia ? (
                        <a
                          href={post.enlaceReferencia}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 truncate max-w-full"
                        >
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{post.enlaceReferencia}</span>
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No especificado</span>
                      )}
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                      <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                        Enlace del Material Final
                      </span>
                      {post.enlaceMaterialFinal ? (
                        <a
                          href={post.enlaceMaterialFinal}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-emerald-600 hover:text-emerald-800 inline-flex items-center gap-1 truncate max-w-full"
                        >
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Abrir en OneDrive / Drive</span>
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Pendiente de entrega de producción</span>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* 1. Estado Programado en Plataforma */}
              {(post.estado === 'Programado' || post.programado) && (
                <div className="p-4 rounded-2xl bg-violet-50/80 border border-violet-200 text-violet-950 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center font-bold">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-wider text-violet-800">
                            Post Programado
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-200 text-violet-900 font-bold">
                            En espera de emisión
                          </span>
                        </div>
                        <p className="text-xs text-violet-700 mt-0.5">
                          Fecha prevista: <strong>{post.fechaProgramada || post.fechaPrevista}</strong>
                          {post.plataformaProgramacion && (
                            <> • Plataforma: <strong>{post.plataformaProgramacion}</strong></>
                          )}
                        </p>
                      </div>
                    </div>

                    {onOpenPublishModal && !isClient && (
                      <button
                        onClick={() => onOpenPublishModal(post)}
                        className="px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirmar Publicado / Añadir Enlaces</span>
                      </button>
                    )}
                  </div>

                  {/* Enlaces registrados si ya tiene */}
                  {post.enlacesPublicacion && post.enlacesPublicacion.length > 0 ? (
                    <div className="pt-2 border-t border-violet-200/70 space-y-1.5">
                      <span className="text-[11px] font-bold text-violet-900 block">
                        Enlaces registrados ({post.enlacesPublicacion.length}):
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {post.enlacesPublicacion.map((link, idx) => (
                          <div key={link.id || idx} className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-violet-200 text-xs">
                            <span className="font-bold text-violet-900 mr-1">{link.redSocial}:</span>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-violet-700 hover:underline max-w-[180px] truncate"
                            >
                              {link.url}
                            </a>
                            <button
                              onClick={() => handleCopyLink(link.url, idx)}
                              className="text-slate-400 hover:text-slate-600 p-0.5 ml-1 cursor-pointer"
                              title="Copiar enlace"
                            >
                              {copiedLinkIndex === idx ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-violet-600 italic">
                      💡 El enlace web se generará el día en que la plataforma publique el post. Podrás agregarlo dando clic en el botón superior.
                    </p>
                  )}
                </div>
              )}

              {/* 2. Estado Publicado en Vivo */}
              {post.publicado && (
                <div className="p-4 rounded-2xl bg-teal-50/80 border border-teal-200 text-teal-950 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-wider text-teal-800">
                            Publicado en Redes
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-200 text-teal-900 font-bold">
                            En vivo
                          </span>
                        </div>
                        <p className="text-xs text-teal-700 mt-0.5">
                          Fecha real: <strong>{post.fechaRealPublicacion || 'Confirmada'}</strong>
                        </p>
                      </div>
                    </div>

                    {onOpenPublishModal && !isClient && (
                      <button
                        onClick={() => onOpenPublishModal(post)}
                        className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Añadir / Editar Enlaces</span>
                      </button>
                    )}
                  </div>

                  {/* Lista de enlaces por Red Social */}
                  {post.enlacesPublicacion && post.enlacesPublicacion.length > 0 ? (
                    <div className="pt-2 border-t border-teal-200/70 space-y-2">
                      <span className="text-[11px] font-bold text-teal-900 block">
                        Enlaces en vivo por Red Social ({post.enlacesPublicacion.length}):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {post.enlacesPublicacion.map((link, idx) => (
                          <div 
                            key={link.id || idx} 
                            className="bg-white p-2.5 rounded-xl border border-teal-200/80 shadow-2xs flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <span className="text-[11px] font-bold text-teal-900 px-2 py-0.5 rounded-md bg-teal-100 mr-2">
                                {link.redSocial}
                              </span>
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-teal-700 hover:underline font-mono truncate block mt-1"
                                title={link.url}
                              >
                                {link.url}
                              </a>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleCopyLink(link.url, idx)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Copiar enlace"
                              >
                                {copiedLinkIndex === idx ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-teal-600 hover:text-teal-800 rounded-lg hover:bg-teal-50 transition-colors"
                                title="Abrir post en nueva pestaña"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : post.urlPublicacion ? (
                    <div className="pt-2 border-t border-teal-200/70 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-teal-900">{post.redSocial}:</span>
                        <a
                          href={post.urlPublicacion}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-teal-700 hover:underline font-mono"
                        >
                          {post.urlPublicacion}
                        </a>
                      </div>
                      <a
                        href={post.urlPublicacion}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 transition-colors flex items-center gap-1 shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Ver en Vivo
                      </a>
                    </div>
                  ) : (
                    <p className="text-[11px] text-teal-600 italic">
                      Publicación confirmada. Aún no se han registrado los enlaces web de las redes sociales.
                    </p>
                  )}
                </div>
              )}

              {/* 3. Estado Listo para Publicar */}
              {post.estado === 'Listo para Publicar' && !post.publicado && !post.programado && onOpenPublishModal && !isClient && (
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider block text-emerald-800">
                      Material Aprobado
                    </span>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      Esta publicación completó todos los filtros internos y de cliente. Lista para programarse o publicarse.
                    </p>
                  </div>
                  <button
                    onClick={() => onOpenPublishModal(post)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Programar o Publicar</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB: APPROVALS */}
          {activeTab === 'approvals' && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Estado de las Compuertas de Aprobación
              </span>

              {/* Aprobación Médica (si aplica en la ODT) */}
              {odt?.requiereMedico && (
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">1. Revisión Médica</span>
                      {post.aprobacionMedica ? (
                        <p className="text-xs text-slate-600">
                          {post.aprobacionMedica.user} ({post.aprobacionMedica.date})
                          {post.aprobacionMedica.comment && <span className="italic block text-slate-500">"{post.aprobacionMedica.comment}"</span>}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Pendiente de revisión médica</p>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-0.5 rounded-md font-bold ${
                    post.aprobacionMedica?.status === 'Aprobado' ? 'bg-emerald-100 text-emerald-800' :
                    post.aprobacionMedica?.status === 'Cambios Solicitados' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {post.aprobacionMedica?.status || 'Pendiente'}
                  </span>
                </div>
              )}

              {/* Corrección de Copy */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-purple-600 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">2. Corrección de Copy (Estilo)</span>
                    {post.aprobacionCorreccionCopy ? (
                      <p className="text-xs text-slate-600">
                        {post.aprobacionCorreccionCopy.user} ({post.aprobacionCorreccionCopy.date})
                        {post.aprobacionCorreccionCopy.comment && <span className="italic block text-slate-500">"{post.aprobacionCorreccionCopy.comment}"</span>}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Pendiente de corrección</p>
                    )}
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-0.5 rounded-md font-bold ${
                  post.aprobacionCorreccionCopy?.status === 'Aprobado' ? 'bg-emerald-100 text-emerald-800' :
                  post.aprobacionCorreccionCopy?.status === 'Cambios Solicitados' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {post.aprobacionCorreccionCopy?.status || 'Pendiente'}
                </span>
              </div>

              {/* Aprobación Copy Cliente */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-600 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">3. Aprobación Copy por Cliente</span>
                    {post.aprobacionClienteCopy ? (
                      <p className="text-xs text-slate-600">
                        {post.aprobacionClienteCopy.user} ({post.aprobacionClienteCopy.date})
                        {post.aprobacionClienteCopy.comment && <span className="italic block text-slate-500">"{post.aprobacionClienteCopy.comment}"</span>}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Pendiente de aprobación del cliente</p>
                    )}
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-0.5 rounded-md font-bold ${
                  post.aprobacionClienteCopy?.status === 'Aprobado' ? 'bg-emerald-100 text-emerald-800' :
                  post.aprobacionClienteCopy?.status === 'Cambios Solicitados' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {post.aprobacionClienteCopy?.status || 'Pendiente'}
                </span>
              </div>

              {/* Corrección Material Producido */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">4. Corrección de Material Final (Arte/Video)</span>
                    {post.aprobacionCorreccionMaterial ? (
                      <p className="text-xs text-slate-600">
                        {post.aprobacionCorreccionMaterial.user} ({post.aprobacionCorreccionMaterial.date})
                        {post.aprobacionCorreccionMaterial.comment && <span className="italic block text-slate-500">"{post.aprobacionCorreccionMaterial.comment}"</span>}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Pendiente de material final</p>
                    )}
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-0.5 rounded-md font-bold ${
                  post.aprobacionCorreccionMaterial?.status === 'Aprobado' ? 'bg-emerald-100 text-emerald-800' :
                  post.aprobacionCorreccionMaterial?.status === 'Cambios Solicitados' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {post.aprobacionCorreccionMaterial?.status || 'Pendiente'}
                </span>
              </div>

              {/* Aprobación Final Cliente */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">5. Aprobación Final de Material por Cliente</span>
                    {post.aprobacionClienteMaterial ? (
                      <p className="text-xs text-slate-600">
                        {post.aprobacionClienteMaterial.user} ({post.aprobacionClienteMaterial.date})
                        {post.aprobacionClienteMaterial.comment && <span className="italic block text-slate-500">"{post.aprobacionClienteMaterial.comment}"</span>}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Pendiente de visto bueno final del cliente</p>
                    )}
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-0.5 rounded-md font-bold ${
                  post.aprobacionClienteMaterial?.status === 'Aprobado' ? 'bg-emerald-100 text-emerald-800' :
                  post.aprobacionClienteMaterial?.status === 'Cambios Solicitados' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {post.aprobacionClienteMaterial?.status || 'Pendiente'}
                </span>
              </div>
            </div>
          )}

          {/* TAB: COMMENTS */}
          {activeTab === 'comments' && (
            <div className="space-y-4">
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {visibleComments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-6">No hay comentarios registrados en este Post.</p>
                ) : (
                  visibleComments.map(c => (
                    <div key={c.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <span>{c.userName}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-slate-200 text-slate-700 font-medium">
                            {c.userRole}
                          </span>
                          {!c.isClientVisible && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-amber-100 text-amber-800 font-medium flex items-center gap-0.5">
                              <EyeOff className="w-2.5 h-2.5" /> Interno
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">{c.createdAt}</span>
                      </div>
                      <p className="text-slate-700 whitespace-pre-wrap">{c.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Formulario nuevo comentario */}
              <form onSubmit={handleSendComment} className="pt-3 border-t border-slate-100 space-y-2">
                <textarea
                  rows={2}
                  placeholder="Escribir comentario u observación..."
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                />

                <div className="flex items-center justify-between">
                  {!isClient && (
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isClientVisible}
                        onChange={(e) => setIsClientVisible(e.target.checked)}
                        className="rounded-sm text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                      />
                      <span>Visible para el Cliente</span>
                    </label>
                  )}
                  {isClient && <span></span>}

                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    Comentar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: AUDIT / HISTORY */}
          {!isClient && activeTab === 'history' && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Registro de Auditoría e Intervenciones
              </span>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {post.historial.map((h, index) => (
                  <div key={h.id || index} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{h.action}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{h.date}</span>
                    </div>
                    <div className="text-slate-600 flex items-center gap-2">
                      <span className="font-medium text-slate-800">{h.userName} ({h.userRole})</span>
                      {h.previousState && h.newState && (
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          • {h.previousState} <ArrowRight className="w-3 h-3 text-slate-400 inline" /> {h.newState}
                        </span>
                      )}
                    </div>
                    {h.motivo && (
                      <p className="text-slate-700 bg-white p-2 rounded-md border border-slate-200/60 mt-1 italic">
                        Motivo: "{h.motivo}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* MODAL / DIALOG DUPLICAR POST */}
      {isDuplicateDialogOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  <Copy className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Duplicar Post #{post.numeroInterno}</h4>
                  <p className="text-xs text-slate-500">Copia el contenido y crea una nueva pieza.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsDuplicateDialogOpen(false)}
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
                  {availableRedes.map(r => (
                    <option key={r} value={r}>
                      {r} {r === post.redSocial ? '(Misma red)' : ''}
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
                onClick={() => setIsDuplicateDialogOpen(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleTriggerDuplicate}
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
