import React, { useState, useMemo } from 'react';
import { Post, ODT, Client, User } from '../types';
import { 
  Palette, Video, ExternalLink, Send, CheckCircle2, Clock, 
  Cloud, Info, AlertCircle, Link as LinkIcon 
} from 'lucide-react';

interface ProduccionViewProps {
  posts: Post[];
  odts: ODT[];
  clients: Client[];
  currentUser: User;
  onSubmitMaterial: (post: Post, odt: ODT, materialUrl: string) => void;
  onSelectPost: (post: Post) => void;
}

export const ProduccionView: React.FC<ProduccionViewProps> = ({
  posts,
  odts,
  clients,
  currentUser,
  onSubmitMaterial,
  onSelectPost
}) => {
  const isArte = currentUser.role === 'Arte';
  const isVideo = currentUser.role === 'Audio y Video';

  const [urlsMap, setUrlsMap] = useState<Record<string, string>>({});
  const [errorsMap, setErrorsMap] = useState<Record<string, string>>({});
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'Nivel 1' | 'Nivel 2' | 'Nivel 3'>('all');

  // Filtrar posts asignados a esta área técnica y ordenar por urgencia (Nivel 1 primero)
  const pendingPosts = useMemo(() => {
    let list = posts;
    if (isArte) {
      list = list.filter(p => p.estado === 'Producción Arte');
    } else if (isVideo) {
      list = list.filter(p => p.estado === 'Producción Audio/Video');
    } else {
      list = list.filter(p => p.estado === 'Producción Arte' || p.estado === 'Producción Audio/Video');
    }

    if (priorityFilter !== 'all') {
      list = list.filter(p => p.nivelPrioridad === priorityFilter);
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
  }, [posts, isArte, isVideo, priorityFilter]);

  const deliveredPosts = useMemo(() => {
    return posts.filter(p => p.enlaceMaterialFinal && p.estado !== 'Producción Arte' && p.estado !== 'Producción Audio/Video');
  }, [posts]);

  const handleUrlChange = (postId: string, val: string) => {
    setUrlsMap(prev => ({ ...prev, [postId]: val }));
    setErrorsMap(prev => ({ ...prev, [postId]: '' }));
  };

  const handleSubmit = (post: Post, odt: ODT) => {
    const url = urlsMap[post.id]?.trim() || post.enlaceMaterialFinal?.trim();
    if (!url) {
      setErrorsMap(prev => ({ ...prev, [post.id]: 'Debes ingresar el enlace de OneDrive o Google Drive del material producido.' }));
      return;
    }
    onSubmitMaterial(post, odt, url);
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
            <h2 className="text-lg font-bold">
              {isArte ? 'Taller de Arte y Diseño Gráfico' : 'Estudio de Producción Audio y Video'}
            </h2>
            <p className={`text-xs ${isArte ? 'text-pink-200' : 'text-amber-200'}`}>
              Desarrollo de piezas visuales a partir de Copies aprobados por el cliente
            </p>
          </div>
        </div>

        <div className="px-4 py-2 bg-black/20 backdrop-blur-xs rounded-xl text-center">
          <span className="text-xs text-white/80 block font-medium">Asignados Pendientes</span>
          <span className="text-2xl font-black text-white">{pendingPosts.length}</span>
        </div>
      </div>

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
                    <p className="text-slate-900 font-semibold text-sm whitespace-pre-wrap">
                      {post.copyIn || <span className="text-slate-400 italic">Sin texto en gráfica</span>}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Copy Out (Caption de contexto):
                    </span>
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed line-clamp-3">
                      {post.copyOut || 'Sin texto'}
                    </p>
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

                {/* Formulario de entrega: Enlace del Material Final */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Enlace del Material Final Producido (OneDrive / Google Drive URL) *
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
                        className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 shrink-0"
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

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
