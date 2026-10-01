import React, { useState } from 'react';
import { Post, PostPublicationLink } from '../types';
import { 
  CheckCircle2, Globe, Calendar, Clock, Plus, Trash2, 
  ExternalLink, X, AlertCircle, Share2, Layers
} from 'lucide-react';

const REDES_DISPONIBLES = [
  'Instagram',
  'Facebook',
  'LinkedIn',
  'TikTok',
  'X',
  'YouTube',
  'Threads',
  'Pinterest',
  'Otra'
];

const PLATAFORMAS_PROGRAMACION = [
  'Meta Business Suite (Facebook & Instagram)',
  'Metricool',
  'Hootsuite',
  'TikTok Studio',
  'LinkedIn Campaign / Page Manager',
  'X Pro (TweetDeck)',
  'Buffer',
  'Sprout Social',
  'Plataforma Nativa / Otra'
];

export interface PublishPostModalData {
  status: 'Programado' | 'Publicado';
  fecha: string;
  plataformaProgramacion?: string;
  enlaces: PostPublicationLink[];
}

interface PublishPostModalProps {
  post: Post;
  onClose: () => void;
  onConfirmPublish: (data: PublishPostModalData) => void;
}

export const PublishPostModal: React.FC<PublishPostModalProps> = ({
  post,
  onClose,
  onConfirmPublish
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Modo inicial: Si ya estaba programado, sugerir Publicado o mantener Programado
  const [mode, setMode] = useState<'Programado' | 'Publicado'>(() => {
    if (post.estado === 'Programado') return 'Publicado';
    return 'Programado';
  });

  const [fecha, setFecha] = useState<string>(() => {
    if (post.fechaRealPublicacion) return post.fechaRealPublicacion;
    if (post.fechaProgramada) return post.fechaProgramada;
    if (post.fechaPrevista) return post.fechaPrevista;
    return todayStr;
  });

  const [plataforma, setPlataforma] = useState<string>(
    post.plataformaProgramacion || 'Meta Business Suite (Facebook & Instagram)'
  );

  // Inicializar enlaces existentes o fila con la red social base del post
  const [enlaces, setEnlaces] = useState<PostPublicationLink[]>(() => {
    if (post.enlacesPublicacion && post.enlacesPublicacion.length > 0) {
      return post.enlacesPublicacion;
    }
    if (post.urlPublicacion) {
      return [{
        id: 'link-' + Date.now(),
        redSocial: post.redSocial || 'Instagram',
        url: post.urlPublicacion
      }];
    }
    return [{
      id: 'link-' + Date.now(),
      redSocial: post.redSocial || 'Instagram',
      url: ''
    }];
  });

  const handleAddLinkRow = () => {
    // Determinar siguiente red social no repetida o sugerir Facebook/LinkedIn
    const usedNets = enlaces.map(l => l.redSocial);
    const nextNet = REDES_DISPONIBLES.find(r => !usedNets.includes(r)) || 'Facebook';

    setEnlaces(prev => [
      ...prev,
      {
        id: 'link-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        redSocial: nextNet,
        url: ''
      }
    ]);
  };

  const handleRemoveLinkRow = (id: string) => {
    setEnlaces(prev => {
      const filtered = prev.filter(l => l.id !== id);
      return filtered.length > 0 ? filtered : [{
        id: 'link-' + Date.now(),
        redSocial: post.redSocial || 'Instagram',
        url: ''
      }];
    });
  };

  const handleUpdateLink = (id: string, field: 'redSocial' | 'url' | 'nota', value: string) => {
    setEnlaces(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Limpiar enlaces vacíos pero conservar si hay al menos uno con URL válida
    const validLinks = enlaces
      .map(l => ({ ...l, url: l.url.trim() }))
      .filter(l => Boolean(l.url));

    onConfirmPublish({
      status: mode,
      fecha,
      plataformaProgramacion: mode === 'Programado' ? plataforma : undefined,
      enlaces: validLinks
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-6">
        
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          mode === 'Programado' 
            ? 'bg-violet-50/70 border-violet-100' 
            : 'bg-emerald-50/70 border-emerald-100'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
              mode === 'Programado' ? 'bg-violet-600' : 'bg-emerald-600'
            }`}>
              {mode === 'Programado' ? <Clock className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {mode === 'Programado' ? 'Programar Publicación en Plataforma' : 'Confirmar Publicación en Redes'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Post #{post.numeroInterno} • Red Social Principal: <strong className="text-slate-700">{post.redSocial}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-white/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Selector de Modo: Programado vs Publicado en Vivo */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Estado de la Publicación *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('Programado')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                  mode === 'Programado'
                    ? 'border-violet-500 bg-violet-50/60 ring-2 ring-violet-400/40 text-violet-950 font-bold'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Clock className={`w-5 h-5 mt-0.5 shrink-0 ${mode === 'Programado' ? 'text-violet-600' : 'text-slate-400'}`} />
                <div>
                  <span className="text-xs font-bold block">1. Queda Programado</span>
                  <span className="text-[11px] font-normal text-slate-500 block leading-tight mt-0.5">
                    Cargado en Meta/Metricool. El enlace se generará cuando salga en vivo.
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('Publicado')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                  mode === 'Publicado'
                    ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-400/40 text-emerald-950 font-bold'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <CheckCircle2 className={`w-5 h-5 mt-0.5 shrink-0 ${mode === 'Publicado' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <div>
                  <span className="text-xs font-bold block">2. Publicado en Vivo</span>
                  <span className="text-[11px] font-normal text-slate-500 block leading-tight mt-0.5">
                    Ya está al aire en redes. Permite registrar URLs definitivas por red.
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Ficha Resumen del Post */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700">Copy Out Autorizado:</span>
              {post.enlaceMaterialFinal && (
                <a
                  href={post.enlaceMaterialFinal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline font-semibold inline-flex items-center gap-1 text-[11px]"
                >
                  <ExternalLink className="w-3 h-3" /> Ver Material Aprobado (Drive/OneDrive)
                </a>
              )}
            </div>
            <p className="text-slate-600 line-clamp-2 italic bg-white p-2 rounded-lg border border-slate-200/60">
              "{post.copyOut}"
            </p>
          </div>

          {/* Fechas y Plataforma */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                {mode === 'Programado' ? 'Fecha Programada para Publicar *' : 'Fecha Real de Publicación *'}
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  required
                  className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </div>
            </div>

            {mode === 'Programado' ? (
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Plataforma Programadora
                </label>
                <select
                  value={plataforma}
                  onChange={(e) => setPlataforma(e.target.value)}
                  className="w-full text-xs py-2 px-3 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-slate-900 font-medium"
                >
                  {PLATAFORMAS_PROGRAMACION.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex flex-col justify-end">
                <span className="text-[11px] text-slate-500 leading-tight">
                  Al confirmar como <strong className="text-emerald-700">Publicado</strong>, el ciclo operativo concluye y quedará registrado en las métricas finales.
                </span>
              </div>
            )}
          </div>

          {/* Mensaje de apoyo para Programado */}
          {mode === 'Programado' && (
            <div className="p-3 bg-violet-50/70 border border-violet-200 rounded-xl text-xs text-violet-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">No es obligatorio ingresar enlaces ahora: </strong>
                Las plataformas de redes sociales (Instagram, Facebook, etc.) sólo generan el enlace web definitivo una vez que el post sale al aire. 
                Puedes programarlo ahora y, el día de la publicación, entrar a la ficha del post para colocar los enlaces en vivo correspondientes.
              </div>
            </div>
          )}

          {/* Sección de Múltiples Enlaces por Red Social */}
          <div className="space-y-3 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Enlaces de Publicación por Red Social</span>
                  {mode === 'Programado' && (
                    <span className="text-[10px] font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full lowercase">
                      opcional
                    </span>
                  )}
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Si este mismo contenido se publicó o publicará en varias redes sociales, puedes registrar cada enlace indicando su plataforma.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddLinkRow}
                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Red Social</span>
              </button>
            </div>

            {/* Lista de filas de enlaces */}
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {enlaces.map((linkItem, idx) => (
                <div key={linkItem.id} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  {/* Selector de Red Social */}
                  <div className="w-full sm:w-36 shrink-0">
                    <select
                      value={linkItem.redSocial}
                      onChange={(e) => handleUpdateLink(linkItem.id, 'redSocial', e.target.value)}
                      className="w-full text-xs py-1.5 px-2 border border-slate-300 rounded-lg bg-white font-bold text-slate-800"
                    >
                      {REDES_DISPONIBLES.map(net => (
                        <option key={net} value={net}>{net}</option>
                      ))}
                    </select>
                  </div>

                  {/* Input de URL */}
                  <div className="flex-1 min-w-0 relative">
                    <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      placeholder={`URL en ${linkItem.redSocial} (ej. https://${linkItem.redSocial.toLowerCase().replace(/[^a-z0-9]/g, '')}.com/...)`}
                      value={linkItem.url}
                      onChange={(e) => handleUpdateLink(linkItem.id, 'url', e.target.value)}
                      className="w-full text-xs pl-8 pr-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  {/* Botón Eliminar fila */}
                  {enlaces.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLinkRow(linkItem.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors self-end sm:self-center cursor-pointer"
                      title="Quitar esta red social"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer de Acciones */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className={`px-5 py-2.5 text-xs font-black text-white rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer ${
                mode === 'Programado'
                  ? 'bg-violet-600 hover:bg-violet-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {mode === 'Programado' ? (
                <>
                  <Clock className="w-4 h-4" />
                  <span>Guardar como Programado</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar Publicado en Vivo</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
