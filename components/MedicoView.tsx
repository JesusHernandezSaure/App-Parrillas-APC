import React, { useState, useMemo } from 'react';
import { Post, ODT, Client, User } from '../types';
import { Stethoscope, CheckCircle2, AlertTriangle, ExternalLink, ShieldCheck, Clock, Check } from 'lucide-react';

interface MedicoViewProps {
  posts: Post[];
  odts: ODT[];
  clients: Client[];
  currentUser: User;
  onOpenApprovalModal: (post: Post) => void;
  onSelectPost: (post: Post) => void;
}

export const MedicoView: React.FC<MedicoViewProps> = ({
  posts,
  odts,
  clients,
  currentUser,
  onOpenApprovalModal,
  onSelectPost
}) => {
  const [tab, setTab] = useState<'pending' | 'approved' | 'returned'>('pending');

  // Posts asignados al médico: tanto de Copy como de Material
  const pendingPosts = useMemo(() => {
    return posts.filter(p => p.estado === 'Revisión Médica' || p.estado === 'Revisión Médica Material');
  }, [posts]);

  const approvedPosts = useMemo(() => {
    return posts.filter(p => p.aprobacionMedica?.status === 'Aprobado' || p.aprobacionMedicaMaterial?.status === 'Aprobado');
  }, [posts]);

  const returnedPosts = useMemo(() => {
    return posts.filter(p => p.aprobacionMedica?.status === 'Cambios Solicitados' || p.aprobacionMedicaMaterial?.status === 'Cambios Solicitados');
  }, [posts]);

  return (
    <div className="space-y-6">
      
      {/* Header Info */}
      <div className="bg-blue-900 text-white p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-800 text-blue-200 flex items-center justify-center font-bold">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Panel de Validación Médica y Ética</h2>
            <p className="text-xs text-blue-200">Compuerta obligatoria para marcas de salud y farmacéuticas</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-4 py-2 bg-blue-800/80 rounded-xl text-center">
            <span className="text-xs text-blue-200 block font-medium">Pendientes</span>
            <span className="text-xl font-black text-white">{pendingPosts.length}</span>
          </div>
          <div className="px-4 py-2 bg-blue-800/80 rounded-xl text-center">
            <span className="text-xs text-blue-200 block font-medium">Aprobados</span>
            <span className="text-xl font-black text-emerald-300">{approvedPosts.length}</span>
          </div>
        </div>
      </div>

      {/* Selector de Bandejas */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setTab('pending')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
            tab === 'pending'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Lo que tengo que hacer ({pendingPosts.length})</span>
        </button>

        <button
          onClick={() => setTab('approved')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
            tab === 'approved'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Aprobados Médicos ({approvedPosts.length})</span>
        </button>

        <button
          onClick={() => setTab('returned')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
            tab === 'returned'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Devueltos con Observación ({returnedPosts.length})</span>
        </button>
      </div>

      {/* Lista según pestaña */}
      <div className="space-y-4">
        {tab === 'pending' && (
          pendingPosts.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-blue-400" />
              <p className="text-sm font-semibold text-slate-700">No tienes piezas pendientes de revisión médica.</p>
            </div>
          ) : (
            pendingPosts.map(post => {
              const client = clients.find(c => c.id === post.clientId);
              const odt = odts.find(o => o.id === post.odtId);

              return (
                <div key={post.id} className="bg-white rounded-2xl p-5 border border-blue-200 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-md bg-slate-900 text-white font-mono text-xs font-bold">
                        {post.numeroInterno}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 font-bold border border-blue-200">
                        {client?.name || 'Cliente'}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold">
                        {post.redSocial}
                      </span>
                      <span className="text-xs text-slate-500">
                        ODT: {odt?.numeroODT} • Previsto: {post.fechaPrevista}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectPost(post)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        Ver Detalle
                      </button>
                      <button
                        onClick={() => onOpenApprovalModal(post)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Revisar y Dictaminar
                      </button>
                    </div>
                  </div>

                  {/* Textos a revisar */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Copy In (Texto en gráfica)
                      </span>
                      <p className="text-slate-900 font-medium whitespace-pre-wrap">{post.copyIn || 'Sin texto'}</p>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Copy Out (Texto del post)
                      </span>
                      <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{post.copyOut || 'Sin texto'}</p>
                    </div>
                  </div>

                  {/* Enlaces de Referencia y Material Producido */}
                  <div className="flex flex-wrap gap-3 pt-1">
                    {post.enlaceReferencia && (
                      <a
                        href={post.enlaceReferencia}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Enlace de Referencia Externa
                      </a>
                    )}

                    {post.enlaceMaterialFinal && (
                      <a
                        href={post.enlaceMaterialFinal}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Abrir Material Producido para Validación Médica
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )
        )}

        {tab === 'approved' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {approvedPosts.map(p => (
              <div key={p.id} className="bg-white rounded-2xl p-4 border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">{p.numeroInterno} • {p.redSocial}</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">Aprobado</span>
                </div>
                <p className="text-slate-600 line-clamp-2">{p.copyOut}</p>
                <span className="text-[11px] text-slate-400 block">{p.aprobacionMedica?.date}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'returned' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {returnedPosts.map(p => (
              <div key={p.id} className="bg-white rounded-2xl p-4 border border-amber-200 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">{p.numeroInterno} • {p.redSocial}</span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold">Devuelto</span>
                </div>
                <p className="text-slate-600 line-clamp-2">{p.copyOut}</p>
                <div className="p-2 bg-amber-50 rounded-lg text-amber-900 italic">
                  "{p.aprobacionMedica?.comment}"
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
