import React, { useState, useMemo } from 'react';
import { Post, ODT, Client, User } from '../types';
import { CheckSquare, CheckCircle2, AlertTriangle, ExternalLink, ShieldCheck, Clock, Layers, Sparkles, Filter, UserCheck, Eye, Edit3, Copy, Check, ChevronDown, ChevronUp, Film, Image } from 'lucide-react';
import { RichTextDisplay } from './RichTextDisplay';

interface CorrectorViewProps {
  posts: Post[];
  odts: ODT[];
  clients: Client[];
  currentUser: User;
  onOpenApprovalModal: (post: Post, type: 'correccion_copy' | 'correccion_material') => void;
  onSelectPost: (post: Post, startEditing?: boolean) => void;
}

export const CorrectorView: React.FC<CorrectorViewProps> = ({
  posts,
  odts,
  clients,
  currentUser,
  onOpenApprovalModal,
  onSelectPost
}) => {
  const [subQueue, setSubQueue] = useState<'copy' | 'material' | 'history'>('copy');
  const [selectedOdtFilter, setSelectedOdtFilter] = useState<string>('all');
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const [expandedPostIds, setExpandedPostIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedPostIds(prev => ({ ...prev, [id]: !prev[id] }));
  };
  
  // Soporte para supervisores/administradores (permitir alternar entre asignadas y todas)
  const isSupervisorOrAdmin = currentUser.role === 'Super Admin' || currentUser.role === 'Admin' || Boolean(currentUser.permissions?.canSuperviseAll);
  const [viewScope, setViewScope] = useState<'assigned' | 'all'>('assigned');

  // Parrillas donde el usuario actual está explícitamente asignado como corrector
  const assignedOdts = useMemo(() => {
    return odts.filter(o => 
      o.correctorId === currentUser.id ||
      (o.correctorName && o.correctorName.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
    );
  }, [odts, currentUser]);

  // Función de verificación de asignación estricta
  const isPostAssignedToUser = (post: Post) => {
    // Si el usuario es supervisor/admin y eligió ver todo el equipo
    if (isSupervisorOrAdmin && viewScope === 'all') return true;

    // Asignación directa en el post
    if (post.responsableActualId && post.responsableActualId === currentUser.id) return true;

    // Asignación por la ODT del post
    const odt = odts.find(o => o.id === post.odtId);
    if (!odt) return false;

    return (
      odt.correctorId === currentUser.id ||
      (odt.correctorName && odt.correctorName.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
    );
  };

  // Cola 1: Corrección de Copy
  const pendingCopyPosts = useMemo(() => {
    return posts.filter(p => {
      if (p.estado !== 'Corrección de Copy') return false;
      if (selectedOdtFilter !== 'all' && p.odtId !== selectedOdtFilter) return false;
      return isPostAssignedToUser(p);
    });
  }, [posts, odts, currentUser, isSupervisorOrAdmin, viewScope, selectedOdtFilter]);

  // Cola 2: Corrección de Material (Arte / Video producido)
  const pendingMaterialPosts = useMemo(() => {
    return posts.filter(p => {
      if (p.estado !== 'Corrección Material') return false;
      if (selectedOdtFilter !== 'all' && p.odtId !== selectedOdtFilter) return false;
      return isPostAssignedToUser(p);
    });
  }, [posts, odts, currentUser, isSupervisorOrAdmin, viewScope, selectedOdtFilter]);

  // Historial aprobado/devuelto
  const historicalPosts = useMemo(() => {
    return posts.filter(p => {
      const hasReviewed = Boolean(p.aprobacionCorreccionCopy || p.aprobacionCorreccionMaterial);
      if (!hasReviewed) return false;
      if (selectedOdtFilter !== 'all' && p.odtId !== selectedOdtFilter) return false;
      if (isSupervisorOrAdmin && viewScope === 'all') return true;
      return (
        p.aprobacionCorreccionCopy?.userId === currentUser.id ||
        p.aprobacionCorreccionMaterial?.userId === currentUser.id ||
        isPostAssignedToUser(p)
      );
    });
  }, [posts, odts, currentUser, isSupervisorOrAdmin, viewScope, selectedOdtFilter]);

  return (
    <div className="space-y-6">
      
      {/* Header Info */}
      <div className="bg-purple-900 text-white p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-800 text-purple-200 flex items-center justify-center font-bold">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold">Garantía de Calidad (QA & Corrección de Estilo)</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-800 text-purple-200 border border-purple-700 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-purple-300" />
                {currentUser.name}
              </span>
            </div>
            <p className="text-xs text-purple-200">
              {viewScope === 'assigned'
                ? `Mostrando únicamente posts de tus ${assignedOdts.length} parrilla(s) asignada(s)`
                : 'Modo Supervisión: Mostrando todos los posts del equipo'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Selector de modo para Administrador / Supervisor */}
          {isSupervisorOrAdmin && (
            <div className="bg-purple-950/80 p-1 rounded-xl flex items-center border border-purple-800">
              <button
                onClick={() => setViewScope('assigned')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewScope === 'assigned'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                Mis Asignadas ({assignedOdts.length})
              </button>
              <button
                onClick={() => setViewScope('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  viewScope === 'all'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Todas las Parrillas
              </button>
            </div>
          )}

          <div className="px-4 py-2 bg-purple-800/80 rounded-xl text-center">
            <span className="text-xs text-purple-200 block font-medium">Copies Pendientes</span>
            <span className="text-xl font-black text-white">{pendingCopyPosts.length}</span>
          </div>
          <div className="px-4 py-2 bg-purple-800/80 rounded-xl text-center">
            <span className="text-xs text-purple-200 block font-medium">Materiales Pendientes</span>
            <span className="text-xl font-black text-amber-300">{pendingMaterialPosts.length}</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtro por Parrilla Asignada */}
      {(assignedOdts.length > 1 || (isSupervisorOrAdmin && viewScope === 'all' && odts.length > 0)) && (
        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <Filter className="w-4 h-4 text-purple-600 shrink-0" />
          <span className="text-xs font-bold text-slate-700 shrink-0">Filtrar por Parrilla / ODT:</span>
          <select
            value={selectedOdtFilter}
            onChange={(e) => setSelectedOdtFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-purple-500 max-w-md"
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
              className="text-xs text-purple-600 hover:underline font-semibold"
            >
              Ver todas
            </button>
          )}
        </div>
      )}

      {/* Selector de Sub-colas */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setSubQueue('copy')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
            subQueue === 'copy'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Corrección de Copy ({pendingCopyPosts.length})</span>
        </button>

        <button
          onClick={() => setSubQueue('material')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
            subQueue === 'material'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Corrección de Material Final ({pendingMaterialPosts.length})</span>
        </button>

        <button
          onClick={() => setSubQueue('history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
            subQueue === 'history'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Historial de Intervenciones ({historicalPosts.length})</span>
        </button>
      </div>

      {/* COLA 1: CORRECCIÓN DE COPY */}
      {subQueue === 'copy' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Posts Pendientes de Revisión de Copy y Redacción
            </h3>
            <span className="text-xs text-slate-500">
              Al aprobar, pasará al Ejecutivo para validación y envío al Cliente.
            </span>
          </div>

          {pendingCopyPosts.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-purple-400" />
              <p className="text-sm font-semibold text-slate-700">No hay copies pendientes de corrección.</p>
            </div>
          ) : (
            pendingCopyPosts.map(post => {
              const client = clients.find(c => c.id === post.clientId);
              const odt = odts.find(o => o.id === post.odtId);

              return (
                <div key={post.id} className="bg-white rounded-2xl p-5 border border-purple-200 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-md bg-slate-900 text-white font-mono text-xs font-bold">
                        {post.numeroInterno}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-800 font-bold border border-purple-200">
                        {client?.name || 'Cliente'}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold">
                        {post.redSocial}
                      </span>
                      {/* Badge Destacado de Formato */}
                      {post.tipoMaterial === 'Video' ? (
                        <span className="text-xs px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-900 font-extrabold border border-purple-200 flex items-center gap-1">
                          <Film className="w-3.5 h-3.5 text-purple-700" />
                          <span>Video</span>
                        </span>
                      ) : post.tipoMaterial === 'Carrusel' ? (
                        <span className="text-xs px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 font-extrabold border border-amber-200 flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-amber-700" />
                          <span>Carrusel</span>
                        </span>
                      ) : (
                        <span className="text-xs px-2.5 py-0.5 rounded-md bg-sky-100 text-sky-900 font-extrabold border border-sky-200 flex items-center gap-1">
                          <Image className="w-3.5 h-3.5 text-sky-700" />
                          <span>Imagen</span>
                        </span>
                      )}
                      {post.dimensiones && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200">
                          {post.dimensiones}
                        </span>
                      )}
                      {post.pilar && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                          {post.pilar}
                        </span>
                      )}
                      <span className="text-xs text-slate-500">
                        ODT: {odt?.numeroODT}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectPost(post)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      >
                        Ver Ficha
                      </button>
                      <button
                        onClick={() => onSelectPost(post, true)}
                        className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Editar Copy In, Copy Out y detalles directamente"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Editar Copys
                      </button>
                      <button
                        onClick={() => onOpenApprovalModal(post, 'correccion_copy')}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Aprobar o Solicitar Cambios
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Copy In (Texto en gráfica)
                      </span>
                      <RichTextDisplay content={post.copyIn} fallbackText="Sin texto en gráfica" showCopyButton copyButtonLabel="Copiar" />
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Copy Out (Texto del post / Caption)
                      </span>
                      <RichTextDisplay content={post.copyOut} fallbackText="Sin texto de caption" showCopyButton copyButtonLabel="Copiar" />
                    </div>
                  </div>

                  {post.enlaceReferencia && (
                    <div className="pt-1">
                      <a
                        href={post.enlaceReferencia}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Enlace de Referencia Externa
                      </a>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* COLA 2: CORRECCIÓN DE MATERIAL FINAL (ARTE / AUDIO-VIDEO) */}
      {subQueue === 'material' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Corrección Final del Material (Garantía de Calidad Interna)
              </h3>
              <p className="text-xs text-slate-500">
                Verifica: Ortografía • Textos en diseño/video • Concordancia con Copy aprobado • Elementos visibles • Enlace accesible.
              </p>
            </div>
            <span className="text-xs text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 font-bold">
              Pasa a Aprobación Interna Final del Ejecutivo
            </span>
          </div>

          {pendingMaterialPosts.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-indigo-400" />
              <p className="text-sm font-semibold text-slate-700">No hay materiales finales pendientes de revisión.</p>
            </div>
          ) : (
            pendingMaterialPosts.map(post => {
              const client = clients.find(c => c.id === post.clientId);
              const odt = odts.find(o => o.id === post.odtId);

              return (
                <div key={post.id} className="bg-white rounded-2xl p-5 border border-indigo-200 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-md bg-slate-900 text-white font-mono text-xs font-bold">
                        {post.numeroInterno}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-800 font-bold border border-indigo-200">
                        {client?.name || 'Cliente'}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold">
                        {post.redSocial}
                      </span>
                      {/* Badge Destacado de Formato */}
                      {post.tipoMaterial === 'Video' ? (
                        <span className="text-xs px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-900 font-extrabold border border-purple-200 flex items-center gap-1">
                          <Film className="w-3.5 h-3.5 text-purple-700" />
                          <span>Video</span>
                        </span>
                      ) : post.tipoMaterial === 'Carrusel' ? (
                        <span className="text-xs px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 font-extrabold border border-amber-200 flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-amber-700" />
                          <span>Carrusel</span>
                        </span>
                      ) : (
                        <span className="text-xs px-2.5 py-0.5 rounded-md bg-sky-100 text-sky-900 font-extrabold border border-sky-200 flex items-center gap-1">
                          <Image className="w-3.5 h-3.5 text-sky-700" />
                          <span>Imagen</span>
                        </span>
                      )}
                      {post.dimensiones && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200">
                          {post.dimensiones}
                        </span>
                      )}
                      {post.pilar && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                          {post.pilar}
                        </span>
                      )}
                      <span className="text-xs text-slate-500">
                        Entregado por: {post.responsableActualName || 'Producción'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectPost(post)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        Ver Ficha
                      </button>
                      <button
                        onClick={() => onOpenApprovalModal(post, 'correccion_material')}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Revisar Material y Dictaminar
                      </button>
                    </div>
                  </div>

                  {/* Acceso al material con URL explícita y auditoría */}
                  {post.enlaceMaterialFinal ? (
                    <div className="p-3.5 bg-emerald-50/80 rounded-xl border border-emerald-200/90 space-y-2.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-xs font-bold text-emerald-950">
                            Material Final Producido (OneDrive / Google Drive)
                          </span>
                          {post.historial.some(h => h.action.includes('Re-entrega') || h.action.includes('Ajustado')) && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                              🔄 Versión Actualizada tras Ajustes
                            </span>
                          )}
                        </div>

                        <a
                          href={post.enlaceMaterialFinal}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center gap-1.5 transition-colors shadow-2xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Abrir y Validar Material
                        </a>
                      </div>

                      {/* URL Visible y Botón Copiar */}
                      <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-emerald-200/70 font-mono text-[11px] text-slate-700">
                        <span className="truncate max-w-md select-all" title={post.enlaceMaterialFinal}>
                          {post.enlaceMaterialFinal}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(post.enlaceMaterialFinal);
                            setCopiedPostId(post.id);
                            setTimeout(() => setCopiedPostId(null), 2000);
                          }}
                          className="text-xs text-emerald-700 hover:text-emerald-900 font-bold shrink-0 flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
                        >
                          {copiedPostId === post.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>¡Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar Enlace</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Auditoría de última entrega */}
                      {(() => {
                        const lastDelivery = post.historial.find(h => h.action.includes('Material'));
                        if (!lastDelivery) return null;
                        return (
                          <div className="text-[11px] text-emerald-800 flex items-center justify-between pt-1 border-t border-emerald-200/50">
                            <span>Entregado: <strong>{lastDelivery.date}</strong> por <strong>{lastDelivery.userName}</strong></span>
                            <span className="italic truncate max-w-xs">{lastDelivery.action}</span>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 font-semibold">
                      Atención: No se ha adjuntado el enlace del material final.
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Copy In Aprobado:
                      </span>
                      <RichTextDisplay content={post.copyIn} fallbackText="Sin texto" showCopyButton copyButtonLabel="Copiar" />
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Copy Out Aprobado:
                      </span>
                      <RichTextDisplay content={post.copyOut} fallbackText="Sin texto" showCopyButton copyButtonLabel="Copiar" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* COLA 3: HISTORIAL DE INTERVENCIONES CON COPYS DESPLEGABLES */}
      {subQueue === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Historial de Publicaciones Dictaminadas ({historicalPosts.length})
            </h3>
            <span className="text-xs text-slate-500">
              Despliega cualquier post para corroborar el texto íntegro aprobado de Copy In y Copy Out.
            </span>
          </div>

          {historicalPosts.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">No hay historial de revisiones registradas aún.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {historicalPosts.map(p => {
                const client = clients.find(c => c.id === p.clientId);
                const odt = odts.find(o => o.id === p.odtId);
                const isExpanded = Boolean(expandedPostIds[p.id]);
                const approval = p.aprobacionCorreccionCopy || p.aprobacionCorreccionMaterial;

                return (
                  <div key={p.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3.5 transition-all">
                    {/* Header de la tarjeta */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 rounded-md bg-slate-900 text-white font-mono text-xs font-bold">
                          {p.numeroInterno}
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-800 font-bold border border-purple-200">
                          {client?.name || 'Cliente'}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold">
                          {p.redSocial}
                        </span>

                        {/* Badges de Formato y Medidas */}
                        {p.tipoMaterial === 'Video' ? (
                          <span className="text-xs px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-900 font-extrabold border border-purple-200 flex items-center gap-1">
                            <Film className="w-3.5 h-3.5 text-purple-700" />
                            <span>Video</span>
                          </span>
                        ) : p.tipoMaterial === 'Carrusel' ? (
                          <span className="text-xs px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 font-extrabold border border-amber-200 flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-amber-700" />
                            <span>Carrusel</span>
                          </span>
                        ) : (
                          <span className="text-xs px-2.5 py-0.5 rounded-md bg-sky-100 text-sky-900 font-extrabold border border-sky-200 flex items-center gap-1">
                            <Image className="w-3.5 h-3.5 text-sky-700" />
                            <span>Imagen</span>
                          </span>
                        )}

                        {p.dimensiones && (
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200">
                            {p.dimensiones}
                          </span>
                        )}

                        {p.pilar && (
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                            {p.pilar}
                          </span>
                        )}

                        <span className="text-xs text-slate-500">
                          ODT: {odt?.numeroODT}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                          p.estado === 'Publicado' ? 'bg-teal-50 text-teal-800 border-teal-200' :
                          p.estado === 'Listo para Publicar' || p.estado === 'Programado' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          p.estado.includes('Producción') ? 'bg-pink-50 text-pink-800 border-pink-200' :
                          'bg-purple-50 text-purple-800 border-purple-200'
                        }`}>
                          Estado: {p.estado}
                        </span>
                        <button
                          onClick={() => onSelectPost(p)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          Ver Ficha
                        </button>
                      </div>
                    </div>

                    {/* Resumen de dictamen previo */}
                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
                      <div>
                        <span>Dictaminado por: <strong>{approval?.user || 'Corrector'}</strong></span>
                        {approval?.date && <span className="text-slate-400 ml-2">({approval.date})</span>}
                        {approval?.comment && (
                          <p className="italic text-slate-600 mt-1">"{approval.comment}"</p>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        approval?.status === 'Aprobado' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {approval?.status || 'Aprobado'}
                      </span>
                    </div>

                    {/* Botón Acordeón Desplegable */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(p.id)}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                        isExpanded
                          ? 'bg-purple-100/80 text-purple-900 border border-purple-300 shadow-2xs'
                          : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-purple-700" />
                        <span>{isExpanded ? 'Ocultar Copys Aprobados' : 'Desplegar y Ver Texto Completo de Copys Aprobados'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-purple-700">
                        <span>{isExpanded ? 'Cerrar' : 'Ver todo'}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    {/* Contenido desplegado: Textos completos con RichTextDisplay y botón de copiar */}
                    {isExpanded && (
                      <div className="pt-2 space-y-3 animate-in fade-in duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          {/* Copy In */}
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                            <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                              <span className="font-extrabold text-slate-600 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                                <span>Copy In Aprobado (Texto en Gráfica / Arte)</span>
                              </span>
                            </div>
                            <RichTextDisplay content={p.copyIn} fallbackText="(Sin texto en gráfica)" showCopyButton copyButtonLabel="Copiar" />
                          </div>

                          {/* Copy Out */}
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                            <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                              <span className="font-extrabold text-slate-600 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                                <span>Copy Out Aprobado (Pie de post / Caption)</span>
                              </span>
                            </div>
                            <RichTextDisplay content={p.copyOut} fallbackText="(Sin texto de caption)" showCopyButton copyButtonLabel="Copiar" />
                          </div>
                        </div>

                        {/* Evidencia de observación de cliente si aplica */}
                        {p.observacionClienteAtendida?.atendido && (
                          <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                            <div className="text-[11px] leading-relaxed">
                              <strong>Ajuste de cliente atendido por {p.observacionClienteAtendida.atendidoPor} ({p.observacionClienteAtendida.fecha}):</strong>
                              <p className="italic text-emerald-900 mt-0.5">"{p.observacionClienteAtendida.nota}"</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
