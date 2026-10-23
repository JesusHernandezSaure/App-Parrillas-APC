import React, { useState, useEffect, useMemo } from 'react';
import { Post, ODT, User, PostComment, MaterialType, PostDimensions, PriorityLevel, DEFAULT_PILARES } from '../types';
import { 
  X, CheckCircle2, Clock, AlertTriangle, ExternalLink, ShieldCheck, 
  MessageSquare, Send, History, ArrowRight, UserCircle2, Eye, EyeOff,
  Edit3, Save, Check, Copy, RefreshCw, Calendar, Sparkles, Globe, Share2, Trash2,
  Stethoscope, Palette, Video, Layers, Plus
} from 'lucide-react';
import { getNowTimestamp } from '../services/odtService';
import { PostStageMap } from './PostPipelineTracker';
import { RichTextEditor } from './RichTextEditor';
import { RichTextDisplay } from './RichTextDisplay';
import { InteractiveCalendarPicker, getPilarColor } from './InteractiveCalendarPicker';

interface PostDetailModalProps {
  post: Post;
  odt?: ODT;
  currentUser: User;
  posts?: Post[];
  onClose: () => void;
  onAddComment: (commentText: string, isClientVisible: boolean) => void;
  onOpenIntervention?: () => void;
  onUpdatePost?: (postId: string, data: { 
    numeroInterno?: string;
    copyIn?: string; 
    copyOut?: string; 
    enlaceReferencia?: string; 
    enlaceMaterialFinal?: string;
    fechaPrevista?: string;
    fechaEntregaMaterial?: string;
    tipoMaterial?: MaterialType;
    dimensiones?: string;
    nivelPrioridad?: PriorityLevel;
    pilar?: string;
    requiereRevisionMedica?: boolean;
    areaResponsable?: string;
    responsableActualId?: string;
    responsableActualName?: string;
    requiereArtePrevio?: boolean;
    enlaceEditableArte?: string;
    notasArteParaVideo?: string;
  }) => void;
  onDeletePost?: (postId: string) => void;
  onSendToReview?: (post: Post, odt: ODT) => void;
  onDuplicatePost?: (post: Post, newRedSocial: string) => void;
  onRecyclePost?: (post: Post) => void;
  onOpenPublishModal?: (post: Post) => void;
  initialEditMode?: boolean;
}

const MATERIAL_TYPES: MaterialType[] = ['Imagen', 'Video', 'Carrusel'];

const DIMENSION_OPTIONS: { id: PostDimensions; label: string; desc: string }[] = [
  { id: '1080x1080 (1:1 Cuadrado)', label: '1:1 Cuadrado (1080 × 1080 px)', desc: 'Feed Instagram / FB / LinkedIn' },
  { id: '1080x1350 (4:5 Vertical)', label: '4:5 Vertical (1080 × 1350 px)', desc: 'Feed vertical Instagram / FB' },
  { id: '1080x1920 (9:16 Vertical / Reels)', label: '9:16 Vertical (1080 × 1920 px)', desc: 'Reels / TikTok / Shorts' },
  { id: '1920x1080 (16:9 Horizontal)', label: '16:9 Horizontal (1920 × 1080 px)', desc: 'YouTube / Web horizontal' }
];

export const PostDetailModal: React.FC<PostDetailModalProps> = ({
  post,
  odt,
  currentUser,
  posts = [],
  onClose,
  onAddComment,
  onOpenIntervention,
  onUpdatePost,
  onDeletePost,
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
  const isCorrectorOrMedico = 
    currentUser.role === 'Corrector' || 
    currentUser.role === 'Médico' || 
    Boolean(currentUser.secondaryRoles?.includes('Corrector')) || 
    Boolean(currentUser.secondaryRoles?.includes('Médico'));

  const hasFullEditPermission = Boolean(currentUser.permissions?.canEditAnyPost);
  const hasCopysEditPermission = Boolean(currentUser.permissions?.canEditCopys);
  const hasDeletePermission = Boolean(currentUser.permissions?.canDeletePost);
  const isSuperAdminOrAdmin = currentUser.role === 'Super Admin' || currentUser.role === 'Admin';
  const isEjecutivoOrCommunity = currentUser.role === 'Ejecutivo' || currentUser.role === 'Community';

  // Solo pueden editar el post completo (metadatos, dimensiones, formato, fechas, duplicar, reciclar):
  // Admin, SuperAdmin, Ejecutivo, Community, o usuarios que no sean exclusivamente de revisión médica/corrección
  const canEditFullPost = !isClient && (isSuperAdminOrAdmin || isEjecutivoOrCommunity || (hasFullEditPermission && !isCorrectorOrMedico));

  // Pueden editar copys (Copy In y Copy Out):
  // Quien puede editar el post completo, O perfil Corrector/Médico, O quien tenga canEditCopys
  const canEditCopys = !isClient && (canEditFullPost || isCorrectorOrMedico || hasCopysEditPermission || hasFullEditPermission);

  // Indica si el usuario actual solo debe poder editar los copys (no el post)
  const isOnlyCopyEditor = !canEditFullPost && canEditCopys;

  // Puede eliminar si tiene permiso canDeletePost activado, es Admin/SuperAdmin, o es Ejecutivo/Community
  const canDelete = !isClient && (isSuperAdminOrAdmin || isEjecutivoOrCommunity || hasDeletePermission);

  const visibleComments = isClient ? post.comentarios.filter(c => c.isClientVisible) : post.comentarios;

  // Estado para modal emergente de duplicación
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const availableRedes = Array.isArray(odt?.redesSociales) && odt.redesSociales.length > 0
    ? odt.redesSociales
    : ['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'X (Twitter)', 'YouTube'];
  const [targetDuplicateRed, setTargetDuplicateRed] = useState(availableRedes[0] || 'Instagram');

  // Modo edición de textos y especificaciones (bloqueado para clientes)
  const [isEditing, setIsEditing] = useState<boolean>(() => {
    if (currentUser.role === 'Cliente') return false;
    if (initialEditMode !== undefined) return initialEditMode;
    if (isOnlyCopyEditor) {
      return post.estado === 'Corrección de Copy' || post.estado === 'Revisión Médica';
    }
    return post.estado === 'Ajustes de Copy' || post.estado === 'En Community' || post.estado === 'Borrador' || post.estado === 'Cambios solicitados por Cliente';
  });

  // Saber si inicialmente ya requería revisión médica al momento de la creación del post
  const alreadyHadMedicalReview = post.requiereRevisionMedica === true || Boolean(odt?.requiereMedico);

  // Pilares heredados de la ODT o de la marca cliente
  const availablePilares: string[] = useMemo(() => {
    if (odt?.pilares && odt.pilares.length > 0) {
      return odt.pilares;
    }
    return [...DEFAULT_PILARES];
  }, [odt]);

  const [editNumeroInterno, setEditNumeroInterno] = useState(post.numeroInterno || '');
  const [editPilar, setEditPilar] = useState<string>(() => {
    return post.pilar || (odt?.pilares && odt.pilares.length > 0 ? odt.pilares[0] : DEFAULT_PILARES[0]);
  });
  const [customPilarInput, setCustomPilarInput] = useState('');
  const [isAddingCustomPilar, setIsAddingCustomPilar] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [editCopyIn, setEditCopyIn] = useState(post.copyIn || '');
  const [editCopyOut, setEditCopyOut] = useState(post.copyOut || '');
  const [editEnlaceReferencia, setEditEnlaceReferencia] = useState(post.enlaceReferencia || '');
  const [editEnlaceMaterialFinal, setEditEnlaceMaterialFinal] = useState(post.enlaceMaterialFinal || '');
  const [editFechaPrevista, setEditFechaPrevista] = useState(post.fechaPrevista || '');
  const [editFechaEntregaMaterial, setEditFechaEntregaMaterial] = useState(post.fechaEntregaMaterial || post.fechaPrevista || '');
  const [editTipoMaterial, setEditTipoMaterial] = useState<MaterialType>(post.tipoMaterial || 'Imagen');
  const [editDimensiones, setEditDimensiones] = useState<string>(post.dimensiones || '1080x1080 (1:1 Cuadrado)');
  const [editNivelPrioridad, setEditNivelPrioridad] = useState<PriorityLevel>(post.nivelPrioridad || 'Nivel 2');
  const [editRequiereRevisionMedica, setEditRequiereRevisionMedica] = useState<boolean>(() => {
    return alreadyHadMedicalReview;
  });
  const [editRequiereArtePrevio, setEditRequiereArtePrevio] = useState<boolean>(post.requiereArtePrevio || false);
  const [editEnlaceEditableArte, setEditEnlaceEditableArte] = useState<string>(post.enlaceEditableArte || '');
  const [editNotasArteParaVideo, setEditNotasArteParaVideo] = useState<string>(post.notasArteParaVideo || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setEditNumeroInterno(post.numeroInterno || '');
    setEditPilar(post.pilar || (odt?.pilares && odt.pilares.length > 0 ? odt.pilares[0] : DEFAULT_PILARES[0]));
    setEditCopyIn(post.copyIn || '');
    setEditCopyOut(post.copyOut || '');
    setEditEnlaceReferencia(post.enlaceReferencia || '');
    setEditEnlaceMaterialFinal(post.enlaceMaterialFinal || '');
    setEditFechaPrevista(post.fechaPrevista || '');
    setEditFechaEntregaMaterial(post.fechaEntregaMaterial || post.fechaPrevista || '');
    setEditTipoMaterial(post.tipoMaterial || 'Imagen');
    setEditDimensiones(post.dimensiones || '1080x1080 (1:1 Cuadrado)');
    setEditNivelPrioridad(post.nivelPrioridad || 'Nivel 2');
    setEditRequiereRevisionMedica(post.requiereRevisionMedica === true || Boolean(odt?.requiereMedico));
    setEditRequiereArtePrevio(post.requiereArtePrevio || false);
    setEditEnlaceEditableArte(post.enlaceEditableArte || '');
    setEditNotasArteParaVideo(post.notasArteParaVideo || '');
  }, [post, odt]);

  useEffect(() => {
    if (initialEditMode !== undefined) {
      setIsEditing(initialEditMode);
    }
  }, [initialEditMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDuplicateDialogOpen) {
          setIsDuplicateDialogOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isDuplicateDialogOpen]);

  const handleSavePostEdits = () => {
    if (onUpdatePost) {
      if (isOnlyCopyEditor) {
        // Corrector o Médico: solo edita copys, preserva intactos todos los parámetros del post
        onUpdatePost(post.id, {
          copyIn: editCopyIn.trim(),
          copyOut: editCopyOut.trim()
        });
      } else {
        const autoArea = editTipoMaterial === 'Video' ? 'Audio y Video' : 'Arte';
        const autoRespName = editTipoMaterial === 'Video' ? (odt?.editorAvName || '') : (odt?.disenadorName || '');
        const autoRespId = editTipoMaterial === 'Video' ? (odt?.editorAvId || '') : (odt?.disenadorId || '');
        const finalReqMed = alreadyHadMedicalReview ? true : editRequiereRevisionMedica;

        onUpdatePost(post.id, {
          numeroInterno: editNumeroInterno.trim() || post.numeroInterno,
          pilar: editPilar,
          copyIn: editCopyIn.trim(),
          copyOut: editCopyOut.trim(),
          enlaceReferencia: editEnlaceReferencia.trim(),
          enlaceMaterialFinal: editEnlaceMaterialFinal.trim(),
          fechaPrevista: editFechaPrevista,
          fechaEntregaMaterial: editFechaEntregaMaterial,
          tipoMaterial: editTipoMaterial,
          dimensiones: editDimensiones,
          nivelPrioridad: editNivelPrioridad,
          requiereRevisionMedica: finalReqMed,
          areaResponsable: autoArea,
          responsableActualId: autoRespId || undefined,
          responsableActualName: autoRespName || undefined,
          requiereArtePrevio: editTipoMaterial === 'Video' ? editRequiereArtePrevio : false,
          enlaceEditableArte: editEnlaceEditableArte.trim(),
          notasArteParaVideo: editNotasArteParaVideo.trim()
        });
      }
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    setIsEditing(false);
  };

  const handleSaveAndSendToReview = () => {
    const finalName = editNumeroInterno.trim() || post.numeroInterno;
    const autoArea = editTipoMaterial === 'Video' ? 'Audio y Video' : 'Arte';
    const autoRespName = editTipoMaterial === 'Video' ? (odt?.editorAvName || '') : (odt?.disenadorName || '');
    const autoRespId = editTipoMaterial === 'Video' ? (odt?.editorAvId || '') : (odt?.disenadorId || '');
    const finalReqMed = alreadyHadMedicalReview ? true : editRequiereRevisionMedica;

    const updatedData = {
      numeroInterno: finalName,
      pilar: editPilar,
      copyIn: editCopyIn.trim(),
      copyOut: editCopyOut.trim(),
      enlaceReferencia: editEnlaceReferencia.trim(),
      enlaceMaterialFinal: editEnlaceMaterialFinal.trim(),
      fechaPrevista: editFechaPrevista,
      fechaEntregaMaterial: editFechaEntregaMaterial,
      tipoMaterial: editTipoMaterial,
      dimensiones: editDimensiones,
      nivelPrioridad: editNivelPrioridad,
      requiereRevisionMedica: finalReqMed,
      areaResponsable: autoArea,
      responsableActualId: autoRespId || undefined,
      responsableActualName: autoRespName || undefined,
      requiereArtePrevio: editTipoMaterial === 'Video' ? editRequiereArtePrevio : false,
      enlaceEditableArte: editEnlaceEditableArte.trim(),
      notasArteParaVideo: editNotasArteParaVideo.trim()
    };

    if (odt && onSendToReview) {
      const updatedPost: Post = {
        ...post,
        ...updatedData
      };
      onSendToReview(updatedPost, odt);
      onClose();
    } else if (onUpdatePost) {
      onUpdatePost(post.id, updatedData);
      onClose();
    }
  };

  const handleCancelEdits = () => {
    setEditNumeroInterno(post.numeroInterno || '');
    setEditPilar(post.pilar || (odt?.pilares && odt.pilares.length > 0 ? odt.pilares[0] : DEFAULT_PILARES[0]));
    setEditCopyIn(post.copyIn || '');
    setEditCopyOut(post.copyOut || '');
    setEditEnlaceReferencia(post.enlaceReferencia || '');
    setEditEnlaceMaterialFinal(post.enlaceMaterialFinal || '');
    setEditFechaPrevista(post.fechaPrevista || '');
    setEditFechaEntregaMaterial(post.fechaEntregaMaterial || post.fechaPrevista || '');
    setEditTipoMaterial(post.tipoMaterial || 'Imagen');
    setEditDimensiones(post.dimensiones || '1080x1080 (1:1 Cuadrado)');
    setEditNivelPrioridad(post.nivelPrioridad || 'Nivel 2');
    setEditRequiereRevisionMedica(alreadyHadMedicalReview);
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
      case 'Diseño de Editables (Arte)':
        return 'bg-purple-100 text-purple-800 border-purple-300 font-bold';
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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 pt-14 sm:pt-14 overflow-y-auto"
      onClick={onClose}
    >
      {/* Contenedor relativo para alojar el botón Cerrar afuera del modal */}
      <div 
        className="relative max-w-4xl w-full my-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón flotante exterior de Cerrar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-11 right-0 sm:right-1 z-30 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-black text-white text-xs font-bold border border-slate-700/80 shadow-2xl transition-all hover:scale-105 cursor-pointer backdrop-blur-xs"
          title="Cerrar ventana (Esc o clic afuera)"
        >
          <X className="w-4 h-4 text-slate-300" />
          <span>Cerrar</span>
        </button>

        <div className="bg-white rounded-2xl shadow-2xl w-full max-h-[88vh] flex flex-col overflow-hidden border border-slate-200">
          
          {/* Header */}
          <div className="px-5 sm:px-6 py-3.5 border-b border-slate-100 bg-slate-50/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Información e Identificación del Post */}
              <div className="flex items-center gap-3 min-w-0">
                <span 
                  className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-mono text-sm font-bold shadow-xs shrink-0"
                  title="Identificador del Post"
                >
                  {editNumeroInterno || post.numeroInterno}
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-slate-900 leading-tight">{post.redSocial}</h2>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${getStatusBadge(post.estado)}`}>
                      {post.estado}
                    </span>
                    {(editPilar || post.pilar) && (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getPilarColor(editPilar || post.pilar).bg} ${getPilarColor(editPilar || post.pilar).text} ${getPilarColor(editPilar || post.pilar).border}`}>
                        Pilar: {editPilar || post.pilar}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    Previsto: {editFechaPrevista || post.fechaPrevista || 'Sin fecha'} • Formato: {editTipoMaterial || post.tipoMaterial}
                    {!isClient && ` • Resp: ${post.areaResponsable} (${post.responsableActualName || 'Sin asignar'})`}
                  </p>
                </div>
              </div>

              {/* Barra de Acciones del Post */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:justify-end shrink-0">
                {/* Botón Editar (Copys o Post Completo según perfil) */}
                {canEditCopys && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('content');
                      setIsEditing(!isEditing);
                    }}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 ${
                      isEditing 
                        ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200 ring-2 ring-amber-400/30' 
                        : isOnlyCopyEditor
                        ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                    }`}
                    title={
                      isEditing 
                        ? 'Salir del modo edición' 
                        : isOnlyCopyEditor 
                        ? 'Modificar Copy In y Copy Out de esta publicación' 
                        : 'Modificar nombre, textos y especificaciones del post'
                    }
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>
                      {isEditing 
                        ? (isOnlyCopyEditor ? 'Editando Copys' : 'Modo Edición Activo') 
                        : (isOnlyCopyEditor ? 'Editar Copys' : 'Editar posts')}
                    </span>
                  </button>
                )}

                {/* Botón Duplicar (Solo para editores de post completo) */}
                {canEditFullPost && onDuplicatePost && (
                  <button
                    type="button"
                    onClick={() => setIsDuplicateDialogOpen(true)}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                    title="Duplicar post para otra red social"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span className="hidden md:inline">Duplicar</span>
                  </button>
                )}

                {/* Botón Reciclar (Solo para editores de post completo) */}
                {canEditFullPost && onRecyclePost && post.estado !== 'Borrador' && (
                  <button
                    type="button"
                    onClick={handleTriggerRecycle}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                    title="Atraer post al inicio (Borrador) para nuevo enfoque"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                    <span className="hidden md:inline">Reciclar</span>
                  </button>
                )}

                {/* Botón Intervenir Supervisor */}
                {!isClient && (currentUser.role === 'Ejecutivo' || currentUser.role === 'Admin' || currentUser.role === 'Super Admin') && onOpenIntervention && (
                  <button
                    type="button"
                    onClick={onOpenIntervention}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer shrink-0"
                    title="Intervención manual de supervisor"
                  >
                    Intervenir
                  </button>
                )}

                {/* Botón Eliminar Posts */}
                {canDelete && onDeletePost && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`¿Estás seguro de que deseas eliminar permanentemente el post "${post.numeroInterno}" (${post.redSocial})?\n\nEsta acción quitará la publicación de la parrilla y no se puede deshacer.`)) {
                        onDeletePost(post.id);
                        onClose();
                      }
                    }}
                    className="text-xs font-bold px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                    title="Eliminar este post permanentemente de la parrilla"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Eliminar Posts</span>
                  </button>
                )}
              </div>
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
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Pilar:</span>
                  <span className={`inline-block text-xs font-black px-2 py-0.5 rounded-md border mt-0.5 ${getPilarColor(post.pilar).bg} ${getPilarColor(post.pilar).text} ${getPilarColor(post.pilar).border}`}>
                    {post.pilar || 'General'}
                  </span>
                </div>
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

              {/* Alerta Destacada Dinámica de Cambios Solicitados u Observaciones */}
              {(() => {
                const getObservationDetails = () => {
                  if (post.solicitadoPorRole === 'Corrector' || post.aprobacionCorreccionCopy?.status === 'Cambios Solicitados') {
                    return {
                      title: 'Observación de Corrección de Estilo',
                      roleLabel: 'Comentario de Corrector',
                      author: post.aprobacionCorreccionCopy?.user || post.solicitadoPorName || 'Corrector',
                      date: post.aprobacionCorreccionCopy?.date || 'Observación activa',
                      comment: post.aprobacionCorreccionCopy?.comment || 'Se requieren ajustes ortotipográficos o de redacción en los textos.',
                      theme: 'amber' as const
                    };
                  }
                  if (post.solicitadoPorRole === 'Médico' || post.aprobacionMedica?.status === 'Cambios Solicitados') {
                    return {
                      title: 'Observación de Validación Médica',
                      roleLabel: 'Comentario de Médico',
                      author: post.aprobacionMedica?.user || post.solicitadoPorName || 'Médico Responsable',
                      date: post.aprobacionMedica?.date || 'Observación activa',
                      comment: post.aprobacionMedica?.comment || 'Se requieren ajustes clínicos o de rigor médico en los copys.',
                      theme: 'blue' as const
                    };
                  }
                  if (post.solicitadoPorRole === 'Cliente' || post.estado === 'Cambios solicitados por Cliente' || post.aprobacionClienteCopy?.status === 'Cambios Solicitados' || post.aprobacionClienteMaterial?.status === 'Cambios Solicitados') {
                    const clientComment = 
                      post.aprobacionClienteCopy?.comment || 
                      post.aprobacionClienteMaterial?.comment || 
                      post.comentarios.find(c => c.text.includes('[Revisión') || c.userRole === 'Cliente')?.text;
                    return {
                      title: 'El Cliente ha Solicitado Cambios en esta Publicación',
                      roleLabel: 'Comentario de Cliente',
                      author: post.aprobacionClienteCopy?.user || post.aprobacionClienteMaterial?.user || post.solicitadoPorName || 'Cliente',
                      date: post.aprobacionClienteCopy?.date || post.aprobacionClienteMaterial?.date || 'Observación activa',
                      comment: clientComment || 'Se requieren ajustes en esta publicación según la revisión del cliente.',
                      theme: 'rose' as const
                    };
                  }
                  if (post.solicitadoPorRole === 'Ejecutivo') {
                    return {
                      title: 'Observación de Supervisor Ejecutivo',
                      roleLabel: 'Comentario de Ejecutivo',
                      author: post.solicitadoPorName || 'Ejecutivo',
                      date: 'Observación activa',
                      comment: 'Se requieren ajustes previos a presentar al cliente.',
                      theme: 'amber' as const
                    };
                  }
                  if (post.estado === 'Ajustes de Copy' && post.comentarios.length > 0) {
                    const lastC = post.comentarios[post.comentarios.length - 1];
                    return {
                      title: `Observación de ${lastC.userRole}`,
                      roleLabel: `Comentario de ${lastC.userRole}`,
                      author: lastC.userName,
                      date: lastC.createdAt,
                      comment: lastC.text,
                      theme: 'amber' as const
                    };
                  }
                  return null;
                };

                const obs = getObservationDetails();
                if (!obs) return null;

                const themeStyles = {
                  amber: {
                    container: 'bg-amber-50 border-2 border-amber-300 text-amber-950',
                    iconBg: 'bg-amber-600 text-white',
                    badge: 'text-amber-800 bg-amber-100 border-amber-200',
                    quote: 'text-amber-950 border-amber-200'
                  },
                  blue: {
                    container: 'bg-blue-50 border-2 border-blue-300 text-blue-950',
                    iconBg: 'bg-blue-600 text-white',
                    badge: 'text-blue-800 bg-blue-100 border-blue-200',
                    quote: 'text-blue-950 border-blue-200'
                  },
                  rose: {
                    container: 'bg-rose-50 border-2 border-rose-300 text-rose-950',
                    iconBg: 'bg-rose-600 text-white',
                    badge: 'text-rose-700 bg-rose-100 border-rose-200',
                    quote: 'text-rose-900 border-rose-200'
                  }
                }[obs.theme];

                return (
                  <div className={`p-4 rounded-xl flex items-start gap-3 shadow-2xs ${themeStyles.container}`}>
                    <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${themeStyles.iconBg}`}>
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="text-xs space-y-1 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-black text-sm">
                          ⚠️ {obs.title}
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${themeStyles.badge}`}>
                          {obs.date}
                        </span>
                      </div>
                      <p className={`italic font-semibold bg-white/80 p-2.5 rounded-lg border mt-1 leading-relaxed ${themeStyles.quote}`}>
                        "{obs.comment}"
                      </p>
                      <span className="text-[11px] opacity-90 block mt-0.5">
                        {obs.roleLabel}: <strong>{obs.author}</strong>
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Feedback de guardado exitoso */}
              {saveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>¡Cambios guardados con éxito!</strong> El copy in y copy out han sido actualizados en la parrilla.</span>
                </div>
              )}

              {/* Si está en modo edición */}
              {isEditing ? (
                <div className={`space-y-4 p-5 rounded-2xl border-2 shadow-xs ${
                  isOnlyCopyEditor 
                    ? 'bg-purple-50/50 border-purple-300' 
                    : 'bg-slate-50/80 border-indigo-300'
                }`}>
                  <div className={`flex items-center justify-between pb-3 border-b flex-wrap gap-2 ${
                    isOnlyCopyEditor ? 'border-purple-200' : 'border-indigo-100'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl text-white flex items-center justify-center shrink-0 shadow-xs ${
                        isOnlyCopyEditor ? 'bg-purple-600' : 'bg-indigo-600'
                      }`}>
                        <Edit3 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className={`text-xs font-black uppercase tracking-wider ${
                          isOnlyCopyEditor ? 'text-purple-950' : 'text-indigo-950'
                        }`}>
                          {isOnlyCopyEditor 
                            ? 'Edición Exclusiva de Copys (Corrección y Médico)' 
                            : 'Editor de Contenido y Especificaciones'}
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          {isOnlyCopyEditor
                            ? 'Ajusta exclusivamente la redacción, claims, ortografía y textos de Copy In y Copy Out.'
                            : 'Modifica textos, fechas, medidas o el requerimiento de material.'}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                      isOnlyCopyEditor
                        ? 'text-purple-700 bg-purple-100 border-purple-200'
                        : 'text-indigo-700 bg-indigo-100 border-indigo-200'
                    }`}>
                      {isOnlyCopyEditor ? 'Solo Copys' : 'Modo Edición Completo'}
                    </span>
                  </div>

                  {/* Nombre / Número Interno y Especificaciones SOLO para editores de post completo */}
                  {canEditFullPost && (
                    <>
                      {/* Nombre / Número Interno del Post */}
                      <div className="p-3.5 bg-white rounded-xl border border-indigo-200">
                        <label className="font-bold text-slate-800 uppercase tracking-wider text-xs block mb-1">
                          Nombre / Identificador del Post *
                        </label>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <input
                            type="text"
                            value={editNumeroInterno}
                            onChange={(e) => setEditNumeroInterno(e.target.value)}
                            placeholder="ej. 01, Post 01 - Folivital Lanzamiento"
                            className="flex-1 text-sm font-bold text-slate-900 px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
                          />
                          <span className="text-[11px] text-slate-400 font-medium">
                            Identificador visible en parrillas y reportes
                          </span>
                        </div>
                      </div>

                      {/* Especificaciones de Producción: Formato, Tamaño, Prioridad y Fechas */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-white rounded-xl border border-indigo-200 text-xs">
                        <div>
                          <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                            Formato de Entrega:
                          </label>
                          <select
                            value={editTipoMaterial}
                            onChange={(e) => {
                              const newType = e.target.value as MaterialType;
                              setEditTipoMaterial(newType);
                              if (newType === 'Video') {
                                setEditAreaResponsable('Audio y Video');
                                if (odt?.editorAvName) {
                                  setEditResponsableActualName(odt.editorAvName);
                                  setEditResponsableActualId(odt.editorAvId || '');
                                }
                              } else {
                                setEditAreaResponsable('Arte');
                                if (odt?.disenadorName) {
                                  setEditResponsableActualName(odt.disenadorName);
                                  setEditResponsableActualId(odt.disenadorId || '');
                                }
                              }
                            }}
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
                          <div className="flex items-center justify-between mb-1">
                            <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-indigo-600" />
                              <span>Fecha de Publicación en Redes:</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => setIsCalendarOpen(true)}
                              className="text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer"
                              title="Abrir planificador de fechas para ver balance y pilares de la semana"
                            >
                              <Calendar className="w-3 h-3 text-indigo-600" />
                              <span>Planificador & Pilares</span>
                            </button>
                          </div>
                          <input
                            type="date"
                            value={editFechaPrevista}
                            onChange={(e) => setEditFechaPrevista(e.target.value)}
                            className="w-full p-1.5 bg-white border border-slate-300 rounded font-semibold text-xs"
                          />
                        </div>
                      </div>

                      {/* Selector de Pilar Temático del Post */}
                      <div className="p-3.5 bg-white rounded-xl border border-indigo-200">
                        <div className="flex items-center justify-between mb-2">
                          <label className="font-bold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Pilar del Contenido:</span>
                            {odt?.nombreParrilla && (
                              <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.2 rounded-full">
                                {odt.nombreParrilla}
                              </span>
                            )}
                          </label>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${getPilarColor(editPilar).bg} ${getPilarColor(editPilar).text} ${getPilarColor(editPilar).border}`}>
                            Pilar seleccionado: {editPilar}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {availablePilares.map(pil => {
                            const isSelected = editPilar === pil;
                            const col = getPilarColor(pil);
                            return (
                              <button
                                key={pil}
                                type="button"
                                onClick={() => {
                                  setEditPilar(pil);
                                  setIsAddingCustomPilar(false);
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                                  isSelected
                                    ? `${col.bg} ${col.text} ${col.border} ring-2 ring-indigo-400/50 shadow-xs font-black`
                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                                }`}
                              >
                                <span className={`w-2 h-2 rounded-full ${isSelected ? col.dot : 'bg-slate-300'}`}></span>
                                <span>{pil}</span>
                              </button>
                            );
                          })}

                          {/* Pilar personalizado no listado en availablePilares */}
                          {!availablePilares.includes(editPilar) && editPilar && (
                            <button
                              type="button"
                              className={`px-2.5 py-1 rounded-lg text-xs font-black border transition-all cursor-pointer flex items-center gap-1.5 ring-2 ring-indigo-400/50 shadow-xs ${getPilarColor(editPilar).bg} ${getPilarColor(editPilar).text} ${getPilarColor(editPilar).border}`}
                            >
                              <span className={`w-2 h-2 rounded-full ${getPilarColor(editPilar).dot}`}></span>
                              <span>{editPilar} (Personalizado)</span>
                            </button>
                          )}

                          {/* Botón para especificar otro pilar */}
                          {!isAddingCustomPilar ? (
                            <button
                              type="button"
                              onClick={() => setIsAddingCustomPilar(true)}
                              className="px-2 py-1 rounded-lg text-xs font-bold border border-dashed border-indigo-300 hover:border-indigo-500 bg-white hover:bg-indigo-50 text-indigo-700 transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Otro pilar...</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-indigo-300 shadow-2xs">
                              <input
                                type="text"
                                value={customPilarInput}
                                onChange={(e) => setCustomPilarInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (customPilarInput.trim()) {
                                      setEditPilar(customPilarInput.trim());
                                      setIsAddingCustomPilar(false);
                                      setCustomPilarInput('');
                                    }
                                  }
                                }}
                                placeholder="Nombre del pilar..."
                                className="text-xs px-2 py-0.5 outline-none text-slate-800 w-32"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (customPilarInput.trim()) {
                                    setEditPilar(customPilarInput.trim());
                                    setIsAddingCustomPilar(false);
                                    setCustomPilarInput('');
                                  }
                                }}
                                className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold"
                              >
                                Usar
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsAddingCustomPilar(false)}
                                className="p-0.5 text-slate-400 hover:text-slate-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1.5">
                          Asigna el pilar estratégico para monitorear el balance de contenidos en la parrilla.
                        </p>
                      </div>

                      {/* Switch de Revisión Médica: Solo aparece si NO se incluyó inicialmente al crear el post */}
                      {!alreadyHadMedicalReview && (
                        <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                              <Stethoscope className="w-4 h-4" />
                            </div>
                            <div>
                              <label 
                                onClick={() => setEditRequiereRevisionMedica(!editRequiereRevisionMedica)}
                                className="text-xs font-bold text-blue-950 cursor-pointer block"
                              >
                                ¿Requiere Revisión Médica? (Activar para agregar al flujo médico)
                              </label>
                              <p className="text-[11px] text-blue-800 leading-tight mt-0.5">
                                {editRequiereRevisionMedica 
                                  ? 'Activado: Pasará primero por validación del Médico antes de ir a Corrección de Estilo.'
                                  : 'Omitido al crear el post. Si olvidaste asignarlo, actívalo aquí.'}
                              </p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input 
                              type="checkbox" 
                              checked={editRequiereRevisionMedica} 
                              onChange={(e) => setEditRequiereRevisionMedica(e.target.checked)} 
                              className="sr-only peer"
                            />
                            <div className="w-10 h-5.5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      )}
                    </>
                  )}

                  {/* COPY IN */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                      <span>Copy In (Texto enriquecido sobre la imagen / gráfica)</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Texto conciso y de alto impacto que el equipo de diseño integrará dentro del arte visual.
                    </p>
                    <RichTextEditor
                      value={editCopyIn}
                      onChange={setEditCopyIn}
                      placeholder="Escribe el copy in enriquecido que irá sobre la imagen o arte..."
                      minHeight="85px"
                    />
                  </div>

                  {/* COPY OUT */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                      <span>Copy Out (Texto enriquecido de la publicación / Caption)</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Copy del post, descripción detallada, hashtags y llamada a la acción (CTA) para el feed.
                    </p>
                    <RichTextEditor
                      value={editCopyOut}
                      onChange={setEditCopyOut}
                      placeholder="Escribe el caption o copy out completo enriquecido para la publicación..."
                      minHeight="130px"
                    />
                  </div>

                  {/* ENLACES Y CONFIGURACIÓN TÉCNICA (SOLO para editores de post completo) */}
                  {canEditFullPost && (
                    <>
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

                      {/* Configuración de Editables de Arte para Video (Telefém) */}
                      {editTipoMaterial === 'Video' && (
                        <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/60 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <label 
                                onClick={() => setEditRequiereArtePrevio(!editRequiereArtePrevio)}
                                className="text-xs font-bold text-purple-950 cursor-pointer block"
                              >
                                ¿Requiere diseño / editables previos de Arte? (Ej. Telefém / Animación)
                              </label>
                              <span className="text-[11px] text-purple-700">
                                Si está activo, al aprobarse el copy pasa primero a Arte y luego a Audio y Video.
                              </span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                              <input 
                                type="checkbox" 
                                checked={editRequiereArtePrevio} 
                                onChange={(e) => setEditRequiereArtePrevio(e.target.checked)} 
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                            </label>
                          </div>

                          {editRequiereArtePrevio && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-purple-200/80">
                              <div>
                                <label className="text-[11px] font-bold uppercase text-purple-900 block mb-1">
                                  Enlace de Recursos Editables (Subido por Arte)
                                </label>
                                <input
                                  type="url"
                                  value={editEnlaceEditableArte}
                                  onChange={(e) => setEditEnlaceEditableArte(e.target.value)}
                                  placeholder="https://apcpublicidad-my.sharepoint.com/... o Drive"
                                  className="w-full text-xs p-2.5 rounded-xl border border-purple-200 bg-white focus:ring-2 focus:ring-purple-500"
                                />
                              </div>

                              <div>
                                <label className="text-[11px] font-bold uppercase text-purple-900 block mb-1">
                                  Notas de Arte para Audio y Video
                                </label>
                                <input
                                  type="text"
                                  value={editNotasArteParaVideo}
                                  onChange={(e) => setEditNotasArteParaVideo(e.target.value)}
                                  placeholder="Ej. Capas de personajes separadas en archivo .ai..."
                                  className="w-full text-xs p-2.5 rounded-xl border border-purple-200 bg-white focus:ring-2 focus:ring-purple-500"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

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
                        className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                          isOnlyCopyEditor 
                            ? 'bg-purple-600 hover:bg-purple-700' 
                            : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isOnlyCopyEditor ? 'Guardar Copys' : 'Guardar Cambios'}</span>
                      </button>

                      {canEditFullPost && odt && onSendToReview && (post.estado === 'Ajustes de Copy' || post.estado === 'En Community' || post.estado === 'Borrador' || post.estado === 'Cambios solicitados por Cliente') && (
                        <button
                          type="button"
                          onClick={handleSaveAndSendToReview}
                          className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>
                            {post.solicitadoPorRole === 'Corrector' 
                              ? 'Guardar y Regresar a Corrección' 
                              : post.solicitadoPorRole === 'Médico' 
                              ? 'Guardar y Regresar a Médico' 
                              : editRequiereRevisionMedica 
                              ? 'Guardar y Enviar a Médico' 
                              : 'Guardar y Enviar a Corrección'}
                          </span>
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
                      {canEditCopys && (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity cursor-pointer bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Modificar Copy In</span>
                        </button>
                      )}
                    </div>
                    <RichTextDisplay
                      content={post.copyIn}
                      fallbackText="Sin texto en gráfica"
                      showCopyButton
                      copyButtonLabel="Copiar Copy In"
                    />
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 relative group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                        Copy Out (Texto de la publicación / Caption)
                      </span>
                      {canEditCopys && (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity cursor-pointer bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Modificar Copy Out</span>
                        </button>
                      )}
                    </div>
                    <RichTextDisplay
                      content={post.copyOut}
                      fallbackText="Sin caption"
                      showCopyButton
                      copyButtonLabel="Copiar Caption"
                    />
                  </div>

                  {canEditCopys && (
                    <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 text-indigo-900 font-semibold">
                        <Edit3 className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>
                          {isOnlyCopyEditor
                            ? '¿Deseas corregir o perfeccionar los textos de Copy In y Copy Out?'
                            : '¿Deseas editar los textos o aplicar los cambios solicitados por el cliente?'}
                        </span>
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

                  {/* Ficha de Recursos Editables de Arte (Telefém / Motion Graphics) */}
                  {(post.requiereArtePrevio || post.enlaceEditableArte || post.estado === 'Diseño de Editables (Arte)') && (
                    <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/70 space-y-2.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                            <Sparkles className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-purple-950 block">
                              Recursos Editables de Arte (Parrilla Telefém / Motion)
                            </span>
                            <span className="text-[11px] text-purple-700">
                              Ilustraciones y editables provistos por Arte al equipo de Audio y Video
                            </span>
                          </div>
                        </div>

                        <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                          post.arteCompletado || post.enlaceEditableArte
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : post.estado === 'Diseño de Editables (Arte)'
                            ? 'bg-purple-100 text-purple-900 border-purple-300 animate-pulse'
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          {post.arteCompletado || post.enlaceEditableArte
                            ? '✅ Editables Entregados a Video'
                            : post.estado === 'Diseño de Editables (Arte)'
                            ? '🎨 En Diseño por Arte'
                            : '⏳ Esperando Recursos'}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-purple-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        {post.enlaceEditableArte ? (
                          <a
                            href={post.enlaceEditableArte}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Abrir Archivos Editables en OneDrive / Drive</span>
                          </a>
                        ) : (
                          <span className="text-xs text-purple-800 italic">
                            Aún no se ha adjuntado el enlace del editable por parte del equipo de Arte.
                          </span>
                        )}
                      </div>

                      {post.notasArteParaVideo && (
                        <div className="bg-white/90 p-2.5 rounded-lg border border-purple-100 text-xs text-purple-950">
                          <strong className="block text-[10px] text-purple-600 uppercase tracking-wider font-bold">
                            Indicaciones de Arte para Audio y Video:
                          </strong>
                          <p className="mt-0.5 whitespace-pre-wrap">{post.notasArteParaVideo}</p>
                        </div>
                      )}
                    </div>
                  )}
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

      {/* Modal Interactivo de Calendario y Balance de Pilares */}
      {isCalendarOpen && (
        <InteractiveCalendarPicker
          isOpen={isCalendarOpen}
          selectedDate={editFechaPrevista}
          onChange={(newDate) => setEditFechaPrevista(newDate)}
          posts={posts}
          currentPostId={post.id}
          currentPilar={editPilar}
          availablePilares={availablePilares}
          onClose={() => setIsCalendarOpen(false)}
          title={`Planificador de Publicación — Post #${editNumeroInterno || post.numeroInterno}`}
        />
      )}

    </div>
  );
};
