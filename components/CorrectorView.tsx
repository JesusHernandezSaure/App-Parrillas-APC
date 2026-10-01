import React, { useState, useMemo } from 'react';
import { Post, ODT, Client, User } from '../types';
import { CheckSquare, CheckCircle2, AlertTriangle, ExternalLink, ShieldCheck, Clock, Layers, Sparkles } from 'lucide-react';

interface CorrectorViewProps {
  posts: Post[];
  odts: ODT[];
  clients: Client[];
  currentUser: User;
  onOpenApprovalModal: (post: Post, type: 'correccion_copy' | 'correccion_material') => void;
  onSelectPost: (post: Post) => void;
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

  // Cola 1: Corrección de Copy
  const pendingCopyPosts = useMemo(() => {
    return posts.filter(p => p.estado === 'Corrección de Copy');
  }, [posts]);

  // Cola 2: Corrección de Material (Arte / Video producido)
  const pendingMaterialPosts = useMemo(() => {
    return posts.filter(p => p.estado === 'Corrección Material');
  }, [posts]);

  // Historial aprobado/devuelto
  const historicalPosts = useMemo(() => {
    return posts.filter(p => p.aprobacionCorreccionCopy || p.aprobacionCorreccionMaterial);
  }, [posts]);

  return (
    <div className="space-y-6">
      
      {/* Header Info */}
      <div className="bg-purple-900 text-white p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-800 text-purple-200 flex items-center justify-center font-bold">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Garantía de Calidad (QA & Corrección de Estilo)</h2>
            <p className="text-xs text-purple-200">Revisión ortográfica, sintáctica y verificación de piezas producidas</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
                      <span className="text-xs text-slate-500">
                        ODT: {odt?.numeroODT} • Formato: {post.tipoMaterial}
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
                        onClick={() => onOpenApprovalModal(post, 'correccion_copy')}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
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
                      <p className="text-slate-900 font-medium whitespace-pre-wrap">{post.copyIn || 'Sin texto'}</p>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Copy Out (Texto del post / Caption)
                      </span>
                      <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{post.copyOut || 'Sin texto'}</p>
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
                      <span className="text-xs px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-semibold">
                        Formato: {post.tipoMaterial}
                      </span>
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

                  {/* Acceso al material */}
                  {post.enlaceMaterialFinal ? (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900">
                        Material alojado externamente (OneDrive / Drive)
                      </span>
                      <a
                        href={post.enlaceMaterialFinal}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Abrir y Validar Material
                      </a>
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
                      <p className="text-slate-900 font-medium">{post.copyIn || 'Sin texto'}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Copy Out Aprobado:
                      </span>
                      <p className="text-slate-800">{post.copyOut || 'Sin texto'}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* COLA 3: HISTORIAL */}
      {subQueue === 'history' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {historicalPosts.map(p => (
            <div key={p.id} className="bg-white rounded-2xl p-4 border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-900">{p.numeroInterno} • {p.redSocial}</span>
                <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold">
                  {p.estado}
                </span>
              </div>
              <p className="text-slate-600 line-clamp-2">{p.copyOut}</p>
              {p.aprobacionCorreccionCopy?.comment && (
                <p className="italic text-slate-500">Nota: "{p.aprobacionCorreccionCopy.comment}"</p>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
