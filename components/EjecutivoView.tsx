import React, { useState, useMemo } from 'react';
import { Client, ODT, Post, User, PostStatus } from '../types';
import { 
  Building2, Layers, Folder, FolderOpen, Plus, ChevronRight, CheckCircle2, 
  Clock, AlertTriangle, ShieldCheck, ExternalLink, ShieldAlert, Send, 
  Search, Filter, Sparkles, UserCheck, Calendar, ArrowRight, TrendingUp, AlertCircle,
  Copy, RefreshCw, X, Share2, Globe
} from 'lucide-react';
import { 
  OdtPipelineFunnel, PostStageMap, MACRO_STAGES, getMacroStageForStatus, 
  getDaysInCurrentStage, getPostPacing 
} from './PostPipelineTracker';

interface EjecutivoViewProps {
  clients: Client[];
  odts: ODT[];
  posts: Post[];
  currentUser: User;
  onOpenCreateOdt: (clientId?: string) => void;
  onOpenCreatePost: (odt: ODT) => void;
  onSelectPost: (post: Post) => void;
  onOpenIntervention: (post: Post) => void;
  onSendToClientApproval: (post: Post, odt: ODT) => void;
  onOpenApprovalModal?: (post: Post, type: 'aprobacion_interna_final' | 'esperando_ejecutivo') => void;
  onSendToReview?: (post: Post, odt: ODT) => void;
  onOpenPublishModal?: (post: Post) => void;
  onDuplicatePost?: (post: Post, newRedSocial: string) => void;
  onRecyclePost?: (post: Post) => void;
  canCreateOdt?: boolean;
  selectedClientId?: string;
  selectedOdtId?: string;
  onSelectClient: (clientId: string | null) => void;
  onSelectOdt: (odtId: string | null) => void;
}

export const EjecutivoView: React.FC<EjecutivoViewProps> = ({
  clients,
  odts,
  posts,
  currentUser,
  onOpenCreateOdt,
  onOpenCreatePost,
  onSelectPost,
  onOpenIntervention,
  onSendToClientApproval,
  onOpenApprovalModal,
  onSendToReview,
  onOpenPublishModal,
  onDuplicatePost,
  onRecyclePost,
  canCreateOdt,
  selectedClientId,
  selectedOdtId,
  onSelectClient,
  onSelectOdt
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedFunnelStage, setSelectedFunnelStage] = useState<string | null>(null);
  const [pacingFilter, setPacingFilter] = useState<string>('all');
  const [duplicatingPost, setDuplicatingPost] = useState<Post | null>(null);
  const [targetDuplicateRed, setTargetDuplicateRed] = useState('Instagram');
  const [selectedMetricFilter, setSelectedMetricFilter] = useState<'all' | 'waitingExecutive' | 'internalFinal' | 'clientChanges' | 'readyToPublish' | 'delayed'>('all');

  const isOdtCreator = canCreateOdt !== false && (currentUser.role === 'Ejecutivo' || currentUser.role === 'Admin');

  // Clientes asignados a este ejecutivo (o todos si es Admin o Community)
  const myClients = useMemo(() => {
    if (currentUser.role === 'Admin' || currentUser.role === 'Community') return clients;
    return clients.filter(c => c.ejecutivoId === currentUser.id);
  }, [clients, currentUser]);

  const activeClient = useMemo(() => {
    if (!selectedClientId) return null;
    return myClients.find(c => c.id === selectedClientId) || null;
  }, [myClients, selectedClientId]);

  // ODTs del cliente seleccionado (o de todos si no hay seleccionado)
  const clientOdts = useMemo(() => {
    if (!selectedClientId) return odts.filter(o => myClients.some(c => c.id === o.clientId));
    return odts.filter(o => o.clientId === selectedClientId);
  }, [odts, selectedClientId, myClients]);

  const activeOdt = useMemo(() => {
    if (!selectedOdtId) return null;
    return odts.find(o => o.id === selectedOdtId) || null;
  }, [odts, selectedOdtId]);

  // Posts totales de la ODT activa (para alimentar el embudo)
  const activeOdtPosts = useMemo(() => {
    if (!activeOdt) return [];
    return posts.filter(p => p.odtId === activeOdt.id);
  }, [posts, activeOdt]);

  // Posts de la ODT seleccionada o filtrados
  const filteredPosts = useMemo(() => {
    let list = posts;
    if (activeOdt) {
      list = list.filter(p => p.odtId === activeOdt.id);
    } else if (activeClient) {
      list = list.filter(p => p.clientId === activeClient.id);
    } else {
      list = list.filter(p => myClients.some(c => c.id === p.clientId));
    }

    // Filtro Interactivo por Métrica de Tarjeta seleccionada
    if (selectedMetricFilter !== 'all') {
      if (selectedMetricFilter === 'waitingExecutive') {
        list = list.filter(p => p.estado === 'Esperando Ejecutivo');
      } else if (selectedMetricFilter === 'internalFinal') {
        list = list.filter(p => p.estado === 'Aprobación Interna Final');
      } else if (selectedMetricFilter === 'clientChanges') {
        list = list.filter(p => 
          p.estado === 'Cambios solicitados por Cliente' || 
          p.estado === 'Ajustes de Copy' ||
          p.aprobacionClienteCopy?.status === 'Cambios Solicitados' ||
          p.aprobacionClienteMaterial?.status === 'Cambios Solicitados'
        );
      } else if (selectedMetricFilter === 'readyToPublish') {
        list = list.filter(p => p.estado === 'Listo para Publicar');
      } else if (selectedMetricFilter === 'delayed') {
        list = list.filter(p => getDaysInCurrentStage(p) >= 4);
      }
    }

    // Filtro por Etapa del Embudo seleccionada
    if (selectedFunnelStage) {
      const stageObj = MACRO_STAGES.find(s => s.id === selectedFunnelStage);
      if (stageObj) {
        list = list.filter(p => stageObj.statuses.includes(p.estado));
      }
    }

    // Filtro por Ritmo / Alertas
    if (pacingFilter !== 'all') {
      if (pacingFilter === 'delayed') {
        list = list.filter(p => getPostPacing(p).type === 'delayed');
      } else if (pacingFilter === 'bottlenecks') {
        list = list.filter(p => getDaysInCurrentStage(p) >= 4);
      } else if (pacingFilter === 'ahead') {
        list = list.filter(p => getPostPacing(p).type === 'ahead');
      } else if (pacingFilter === 'ready') {
        list = list.filter(p => ['Listo para Publicar', 'Programado', 'Publicado'].includes(p.estado));
      }
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'con_cambios_cliente') {
        list = list.filter(p => 
          p.estado === 'Cambios solicitados por Cliente' ||
          p.estado === 'Ajustes de Copy' ||
          p.aprobacionClienteCopy?.status === 'Cambios Solicitados' ||
          p.aprobacionClienteMaterial?.status === 'Cambios Solicitados' ||
          p.comentarios.some(c => c.text.includes('[Revisión') || c.userRole === 'Cliente')
        );
      } else {
        list = list.filter(p => p.estado === statusFilter);
      }
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(p => 
        p.numeroInterno.toLowerCase().includes(q) ||
        p.copyOut.toLowerCase().includes(q) ||
        p.copyIn.toLowerCase().includes(q) ||
        p.redSocial.toLowerCase().includes(q)
      );
    }

    return list;
  }, [posts, activeOdt, activeClient, myClients, selectedFunnelStage, pacingFilter, statusFilter, searchTerm, selectedMetricFilter]);

  // Posts segmentados para el ejecutivo logueado (su alcance: clientes asignados o filtro activo de cliente/ODT)
  const scopedPostsForMetrics = useMemo(() => {
    if (activeOdt) {
      return posts.filter(p => p.odtId === activeOdt.id);
    }
    if (activeClient) {
      return posts.filter(p => p.clientId === activeClient.id);
    }
    return posts.filter(p => myClients.some(c => c.id === p.clientId));
  }, [posts, activeOdt, activeClient, myClients]);

  // Contadores de alertas y bloqueos segmentados y dinámicos
  const alertsSummary = useMemo(() => {
    const waitingExecutive = scopedPostsForMetrics.filter(p => p.estado === 'Esperando Ejecutivo').length;
    const internalFinal = scopedPostsForMetrics.filter(p => p.estado === 'Aprobación Interna Final').length;
    const clientChanges = scopedPostsForMetrics.filter(p => 
      p.estado === 'Cambios solicitados por Cliente' || 
      p.estado === 'Ajustes de Copy' ||
      p.aprobacionClienteCopy?.status === 'Cambios Solicitados' ||
      p.aprobacionClienteMaterial?.status === 'Cambios Solicitados'
    ).length;
    const readyToPublish = scopedPostsForMetrics.filter(p => p.estado === 'Listo para Publicar').length;
    const delayed = scopedPostsForMetrics.filter(p => getDaysInCurrentStage(p) >= 4).length;

    return { waitingExecutive, internalFinal, clientChanges, readyToPublish, delayed };
  }, [scopedPostsForMetrics]);

  return (
    <div className="space-y-6">
      
      {/* Barra Superior de Métricas de Supervisión */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Tarjeta 1: Parrillas Copy */}
        <div 
          onClick={() => setSelectedMetricFilter(prev => prev === 'waitingExecutive' ? 'all' : 'waitingExecutive')}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all duration-200 flex items-center justify-between select-none ${
            selectedMetricFilter === 'waitingExecutive'
              ? 'ring-2 ring-indigo-500 border-indigo-300 bg-indigo-50/20 shadow-xs scale-[1.02]'
              : 'border-slate-200 hover:border-indigo-300 hover:shadow-xs hover:scale-[1.01]'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Parrillas Copy</span>
              {selectedMetricFilter === 'waitingExecutive' && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              )}
            </div>
            <p className="text-2xl font-black text-indigo-600 mt-0.5">{alertsSummary.waitingExecutive}</p>
            <span className="text-[10px] text-slate-500 leading-none block mt-1">Listos para enviar copy a cliente</span>
          </div>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold transition-colors ${
            selectedMetricFilter === 'waitingExecutive' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'
          }`}>
            <Send className="w-4.5 h-4.5" />
          </div>
        </div>

        {/* Tarjeta 2: Aprobación Interna Final */}
        <div 
          onClick={() => setSelectedMetricFilter(prev => prev === 'internalFinal' ? 'all' : 'internalFinal')}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all duration-200 flex items-center justify-between select-none ${
            selectedMetricFilter === 'internalFinal'
              ? 'ring-2 ring-emerald-500 border-emerald-300 bg-emerald-50/20 shadow-xs scale-[1.02]'
              : 'border-slate-200 hover:border-emerald-300 hover:shadow-xs hover:scale-[1.01]'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Aprobación Interna</span>
              {selectedMetricFilter === 'internalFinal' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </div>
            <p className="text-2xl font-black text-emerald-700 mt-0.5">{alertsSummary.internalFinal}</p>
            <span className="text-[10px] text-slate-500 leading-none block mt-1">Material terminado por autorizar</span>
          </div>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold transition-colors ${
            selectedMetricFilter === 'internalFinal' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'
          }`}>
            <ShieldCheck className="w-4.5 h-4.5" />
          </div>
        </div>

        {/* Tarjeta 3: Cambios Solicitados */}
        <div 
          onClick={() => setSelectedMetricFilter(prev => prev === 'clientChanges' ? 'all' : 'clientChanges')}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all duration-200 flex items-center justify-between select-none ${
            selectedMetricFilter === 'clientChanges'
              ? 'ring-2 ring-rose-500 border-rose-300 bg-rose-50/20 shadow-xs scale-[1.02]'
              : 'border-slate-200 hover:border-rose-300 hover:shadow-xs hover:scale-[1.01]'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">Cambios Cliente</span>
              {selectedMetricFilter === 'clientChanges' && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              )}
            </div>
            <p className="text-2xl font-black text-rose-600 mt-0.5">{alertsSummary.clientChanges}</p>
            <span className="text-[10px] text-slate-500 leading-none block mt-1">Requieren reasignación urgente</span>
          </div>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold transition-colors ${
            selectedMetricFilter === 'clientChanges' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-600'
          }`}>
            <AlertTriangle className="w-4.5 h-4.5" />
          </div>
        </div>

        {/* Tarjeta 4: Listo para Publicar */}
        <div 
          onClick={() => setSelectedMetricFilter(prev => prev === 'readyToPublish' ? 'all' : 'readyToPublish')}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all duration-200 flex items-center justify-between select-none ${
            selectedMetricFilter === 'readyToPublish'
              ? 'ring-2 ring-teal-500 border-teal-300 bg-teal-50/20 shadow-xs scale-[1.02]'
              : 'border-slate-200 hover:border-teal-300 hover:shadow-xs hover:scale-[1.01]'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Listos Publicar</span>
              {selectedMetricFilter === 'readyToPublish' && (
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              )}
            </div>
            <p className="text-2xl font-black text-teal-600 mt-0.5">{alertsSummary.readyToPublish}</p>
            <span className="text-[10px] text-slate-500 leading-none block mt-1">En cola de publicación Community</span>
          </div>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold transition-colors ${
            selectedMetricFilter === 'readyToPublish' ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-600'
          }`}>
            <CheckCircle2 className="w-4.5 h-4.5" />
          </div>
        </div>

        {/* Tarjeta 5: Ritmo de Entrega (Pacing / Demorados) */}
        <div 
          onClick={() => setSelectedMetricFilter(prev => prev === 'delayed' ? 'all' : 'delayed')}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition-all duration-200 flex items-center justify-between select-none ${
            selectedMetricFilter === 'delayed'
              ? 'ring-2 ring-amber-500 border-amber-300 bg-amber-50/20 shadow-xs scale-[1.02]'
              : 'border-slate-200 hover:border-amber-300 hover:shadow-xs hover:scale-[1.01]'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Demorados (+4 días)</span>
              {selectedMetricFilter === 'delayed' && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              )}
            </div>
            <p className="text-2xl font-black text-amber-600 mt-0.5">{alertsSummary.delayed}</p>
            <span className="text-[10px] text-slate-500 leading-none block mt-1">Posts estancados en alguna etapa</span>
          </div>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold transition-colors ${
            selectedMetricFilter === 'delayed' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-600'
          }`}>
            <Clock className="w-4.5 h-4.5" />
          </div>
        </div>

      </div>

      {/* RUTA JERÁRQUICA: Clientes -> Cliente Seleccionado -> ODTs -> ODT Seleccionada */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold flex-wrap">
          <button
            onClick={() => { onSelectClient(null); onSelectOdt(null); setSelectedMetricFilter('all'); }}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              !selectedClientId 
                ? 'bg-slate-900 text-white' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Todos los Clientes ({myClients.length})
          </button>

          {activeClient && (
            <>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <button
                onClick={() => { onSelectOdt(null); setSelectedMetricFilter('all'); }}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  selectedClientId && !selectedOdtId 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                {activeClient.name}
              </button>
            </>
          )}

          {activeOdt && (
            <>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <div className="px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 flex items-center gap-1.5 font-bold">
                <Layers className="w-3.5 h-3.5" />
                {activeOdt.numeroODT}: {activeOdt.nombreParrilla}
              </div>
            </>
          )}
        </div>

        {isOdtCreator ? (
          <button
            onClick={() => onOpenCreateOdt(selectedClientId || undefined)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nueva ODT / Parrilla
          </button>
        ) : (
          <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>ODTs iniciadas por Ejecutivo • <strong className="text-emerald-700">Creación de posts habilitada</strong></span>
          </div>
        )}
      </div>

      {/* VISTA NIVEL 1: CARPETAS VISUALES DE CLIENTES (Si no hay ODT seleccionada) */}
      {!activeOdt && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              {selectedClientId ? `Parrillas de ${activeClient?.name}` : 'Carpetas de Clientes'}
            </h3>
            <span className="text-xs text-slate-500">
              Representación visual relacional optimizada
            </span>
          </div>

          {!selectedClientId ? (
            /* Cuadrícula de Clientes */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {myClients.map(c => {
                const clientOdtsCount = odts.filter(o => o.clientId === c.id).length;
                const clientPostsCount = posts.filter(p => p.clientId === c.id).length;
                const clientReadyCount = posts.filter(p => p.clientId === c.id && p.estado === 'Listo para Publicar').length;

                return (
                  <div
                    key={c.id}
                    onClick={() => onSelectClient(c.id)}
                    className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                        <Folder className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                        {c.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 mt-3 group-hover:text-indigo-600 transition-colors">
                      {c.name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">{c.industry || 'Cliente Corporativo'}</p>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                      <span>{clientOdtsCount} Parrillas / ODTs</span>
                      <span className="font-bold text-indigo-600">{clientPostsCount} Posts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Lista de ODTs del Cliente Seleccionado */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clientOdts.length === 0 ? (
                <div className="col-span-2 p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
                  <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-semibold">No hay ODTs registradas para este cliente.</p>
                  {isOdtCreator ? (
                    <button
                      onClick={() => onOpenCreateOdt(selectedClientId)}
                      className="mt-3 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Crear primera ODT
                    </button>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">El Ejecutivo de Cuentas debe inicializar la ODT/Parrilla para este cliente.</p>
                  )}
                </div>
              ) : (
                clientOdts.map(odt => {
                  const odtPosts = posts.filter(p => p.odtId === odt.id);
                  const readyCount = odtPosts.filter(p => p.estado === 'Listo para Publicar' || p.estado === 'Publicado').length;
                  const progressPct = odtPosts.length > 0 ? Math.round((readyCount / odtPosts.length) * 100) : 0;

                  return (
                    <div
                      key={odt.id}
                      onClick={() => onSelectOdt(odt.id)}
                      className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-md bg-slate-900 text-white font-mono text-xs font-bold">
                          {odt.numeroODT}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                            {odt.mesPeriodo}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenCreatePost(odt);
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                            title="Crear un nuevo post en esta parrilla"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Post</span>
                          </button>
                        </div>
                      </div>

                      <h4 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
                        {odt.nombreParrilla}
                      </h4>

                      {/* Alerta si el cliente solicitó cambios en esta ODT */}
                      {(odt.estadoAprobacionCopy === 'Cambios Solicitados' || odt.estadoAprobacionMaterial === 'Cambios Solicitados') && (
                        <div className="px-2.5 py-1.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold flex items-center gap-1.5 animate-pulse shadow-2xs">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>⚠️ Cliente solicitó cambios en {odt.estadoAprobacionCopy === 'Cambios Solicitados' ? 'Copy' : 'Material'}</span>
                        </div>
                      )}

                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {odt.brief}
                      </p>

                      {/* Progreso */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-slate-500">Avance de Parrilla</span>
                          <span className="text-indigo-600">{readyCount} de {odtPosts.length} posts ({progressPct}%)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* VISTA NIVEL 2: DENTRO DE LA ODT SELECCIONADA (Brief + Equipo + Lista de Posts) */}
      {activeOdt && (
        <div className="space-y-6">
          
          {/* Ficha Ejecutiva del Brief */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-slate-900 text-white font-mono text-xs font-bold">
                    {activeOdt.numeroODT}
                  </span>
                  <h3 className="text-lg font-black text-slate-900">{activeOdt.nombreParrilla}</h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Cliente: <strong className="text-slate-800">{activeOdt.clientName}</strong> • Periodo: <strong className="text-slate-800">{activeOdt.mesPeriodo}</strong>
                </p>
              </div>

              <button
                onClick={() => onOpenCreatePost(activeOdt)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                + Crear Post en esta Parrilla
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <strong className="text-slate-700 uppercase tracking-wider block mb-1">Brief:</strong>
                <p className="text-slate-600 leading-relaxed">{activeOdt.brief}</p>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <strong className="text-slate-700 uppercase tracking-wider block mb-1">Objetivo:</strong>
                <p className="text-slate-600 leading-relaxed">{activeOdt.objetivo}</p>
              </div>
            </div>

            {/* Equipo Asignado */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="font-bold text-slate-500 mr-2">Equipo Asignado:</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                CM: {activeOdt.communityName}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                Corrector: {activeOdt.correctorName}
              </span>
              {activeOdt.requiereMedico && (
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium">
                  Médico: {activeOdt.medicoName}
                </span>
              )}
              {activeOdt.requiereArte && (
                <span className="px-2 py-0.5 rounded-md bg-pink-50 text-pink-700 font-medium">
                  Arte: {activeOdt.disenadorName}
                </span>
              )}
              {activeOdt.requiereAudioVideo && (
                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-medium">
                  Video: {activeOdt.editorAvName}
                </span>
              )}
            </div>
          </div>

          {/* Banner Destacado si el Cliente solicitó cambios en esta Parrilla */}
          {(activeOdt.estadoAprobacionCopy === 'Cambios Solicitados' || activeOdt.estadoAprobacionMaterial === 'Cambios Solicitados') && (
            <div className="p-4 rounded-2xl bg-rose-50/90 border-2 border-rose-300 text-rose-950 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-600 text-white shadow-xs">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-rose-950 flex items-center gap-2">
                      ⚠️ El Cliente ha Solicitado Cambios en esta Parrilla
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-800">
                        {activeOdt.estadoAprobacionCopy === 'Cambios Solicitados' ? 'Revisión de Copys' : 'Revisión de Materiales'}
                      </span>
                    </h4>
                    <p className="text-xs text-rose-800 mt-0.5">
                      {activeOdt.rondasAprobacion && activeOdt.rondasAprobacion.length > 0 ? (
                        <>
                          Última ronda registrada por <strong>{activeOdt.rondasAprobacion[activeOdt.rondasAprobacion.length - 1].usuarioName}</strong> el {activeOdt.rondasAprobacion[activeOdt.rondasAprobacion.length - 1].fecha}
                        </>
                      ) : (
                        'El cliente ha devuelto la parrilla con observaciones pendientes de solventar.'
                      )}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black px-3 py-1 bg-white text-rose-700 rounded-lg border border-rose-300 shadow-2xs">
                  {activeOdtPosts.filter(p => p.estado === 'Cambios solicitados por Cliente' || p.estado === 'Ajustes de Copy' || p.aprobacionClienteCopy?.status === 'Cambios Solicitados' || p.aprobacionClienteMaterial?.status === 'Cambios Solicitados').length} posts con ajustes pendientes
                </span>
              </div>

              {/* Comentario General del Cliente si existe */}
              {activeOdt.rondasAprobacion && activeOdt.rondasAprobacion.length > 0 && activeOdt.rondasAprobacion[activeOdt.rondasAprobacion.length - 1].comentarioGeneral && (
                <div className="bg-white p-3 rounded-xl border border-rose-200/80 text-xs text-slate-800">
                  <span className="font-bold text-rose-900 block mb-0.5">Comentario General del Cliente:</span>
                  <p className="italic font-medium leading-relaxed">"{activeOdt.rondasAprobacion[activeOdt.rondasAprobacion.length - 1].comentarioGeneral}"</p>
                </div>
              )}
            </div>
          )}

          {/* EMBUDO / MAPA DE ETAPAS DE LA PARRILLA */}
          <OdtPipelineFunnel
            posts={activeOdtPosts}
            selectedStageId={selectedFunnelStage}
            onSelectStage={setSelectedFunnelStage}
          />

          {/* LISTA Y TABLA DE POSTS */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            
            {/* Header de Filtros */}
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-800">
                  Posts en esta ODT ({filteredPosts.length})
                </h4>
                {(selectedFunnelStage || pacingFilter !== 'all' || statusFilter !== 'all' || searchTerm) && (
                  <button
                    onClick={() => {
                      setSelectedFunnelStage(null);
                      setPacingFilter('all');
                      setStatusFilter('all');
                      setSearchTerm('');
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer"
                  >
                    Restablecer filtros
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar post, copy..."
                    className="text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Filtro de Ritmo & SLA */}
                <select
                  className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-medium text-slate-700"
                  value={pacingFilter}
                  onChange={(e) => setPacingFilter(e.target.value)}
                >
                  <option value="all">Todos los Ritmos & SLAs</option>
                  <option value="delayed">⚠️ Retraso Crítico (Fecha cercana)</option>
                  <option value="bottlenecks">⏱️ Cuellos de Botella (&gt;3 días)</option>
                  <option value="ahead">🚀 Adelantados</option>
                  <option value="ready">✅ Listos / Publicados</option>
                </select>

                {/* Status filter */}
                <select
                  className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-medium text-slate-700"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Todos los Estados</option>
                  <option value="con_cambios_cliente" className="font-bold text-rose-700">⚠️ Posts con Cambios del Cliente</option>
                  <option value="Borrador">Borrador</option>
                  <option value="En Community">En Community</option>
                  <option value="Revisión Médica">Revisión Médica</option>
                  <option value="Corrección de Copy">Corrección de Copy</option>
                  <option value="Esperando Ejecutivo">Esperando Ejecutivo</option>
                  <option value="Aprobación Copy Cliente">Aprobación Copy Cliente</option>
                  <option value="Cambios solicitados por Cliente">Cambios Solicitados por Cliente</option>
                  <option value="Producción Arte">Producción Arte</option>
                  <option value="Producción Audio/Video">Producción Audio/Video</option>
                  <option value="Corrección Material">Corrección Material</option>
                  <option value="Revisión Médica Material">Revisión Médica Material</option>
                  <option value="Aprobación Interna Final">Aprobación Interna Final</option>
                  <option value="Aprobación Material Cliente">Aprobación Material Cliente</option>
                  <option value="Listo para Publicar">Listo para Publicar</option>
                  <option value="Publicado">Publicado</option>
                </select>
              </div>
            </div>

            {/* Lista de Posts */}
            {filteredPosts.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold">No se encontraron posts con los filtros actuales.</p>
                {(selectedFunnelStage || pacingFilter !== 'all' || statusFilter !== 'all' || searchTerm) && (
                  <button
                    onClick={() => {
                      setSelectedFunnelStage(null);
                      setPacingFilter('all');
                      setStatusFilter('all');
                      setSearchTerm('');
                    }}
                    className="mt-3 text-xs text-indigo-600 font-bold hover:underline"
                  >
                    Limpiar todos los filtros
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredPosts.map(post => {
                  const isWaitingExec = post.estado === 'Esperando Ejecutivo';
                  const isInternalFinal = post.estado === 'Aprobación Interna Final';
                  const isClientChange = 
                    post.estado === 'Cambios solicitados por Cliente' ||
                    post.aprobacionClienteCopy?.status === 'Cambios Solicitados' ||
                    post.aprobacionClienteMaterial?.status === 'Cambios Solicitados';

                  const clientObservation = 
                    post.aprobacionClienteCopy?.comment || 
                    post.aprobacionClienteMaterial?.comment || 
                    post.comentarios.find(c => c.text.includes('[Revisión') || c.userRole === 'Cliente')?.text;

                  return (
                    <div
                      key={post.id}
                      className={`p-4 hover:bg-slate-50/70 transition-colors flex flex-col gap-3 ${
                        isClientChange ? 'bg-rose-50/30 border-l-4 border-rose-500' : ''
                      }`}
                    >
                      {/* Fila Superior: Metadatos y Botones de Acción */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono text-xs font-bold">
                            {post.numeroInterno}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold">
                            {post.redSocial}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold">
                            {post.tipoMaterial}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono">
                            {post.dimensiones || '1080x1080'}
                          </span>
                          
                          {/* Nivel de Prioridad Operativa */}
                          <span className={`text-[11px] px-2 py-0.5 rounded-md font-black border ${
                            post.nivelPrioridad === 'Nivel 1' 
                              ? 'bg-rose-50 text-rose-700 border-rose-200' 
                              : post.nivelPrioridad === 'Nivel 3'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {post.nivelPrioridad === 'Nivel 1' ? '🔴 Nivel 1' : post.nivelPrioridad === 'Nivel 3' ? '🟢 Nivel 3' : '🟡 Nivel 2'}
                          </span>

                          {/* Fechas de Entrega Arte y Publicación */}
                          <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Entrega Arte: {post.fechaEntregaMaterial || post.fechaPrevista}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            Publicación: <strong className="text-slate-700">{post.fechaPrevista}</strong>
                          </span>
                          
                          {/* Badge de Estado Operativo */}
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                            post.estado === 'Listo para Publicar' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            post.estado === 'Publicado' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                            isInternalFinal ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold animate-pulse' :
                            isWaitingExec ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse' :
                            isClientChange ? 'bg-rose-100 text-rose-800 border-rose-300 font-black animate-pulse' :
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {isClientChange && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                            {post.estado}
                          </span>
                        </div>

                        {/* Botones de Acción de Supervisión y Operación */}
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          {/* Duplicar Post */}
                          {onDuplicatePost && (
                            <button
                              onClick={() => {
                                setDuplicatingPost(post);
                                setTargetDuplicateRed(post.redSocial);
                              }}
                              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                              title="Duplicar post para otra red social"
                            >
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span className="hidden sm:inline">Duplicar</span>
                            </button>
                          )}

                          {/* Reciclar / Retomar Post */}
                          {onRecyclePost && post.estado !== 'Borrador' && (
                            <button
                              onClick={() => {
                                if (confirm(`¿Retomar y reciclar este post #${post.numeroInterno}?\n\nEl post regresará a la posición inicial (Borrador) para que el Community pueda cambiar el enfoque, adaptar el copy o redefinir el material.`)) {
                                  onRecyclePost(post);
                                }
                              }}
                              className="p-1.5 text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-300 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                              title="Atraer post al inicio para nuevo enfoque"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                              <span className="hidden sm:inline">Reciclar</span>
                            </button>
                          )}

                          {/* Acción de Community: Enviar a Revisión */}
                          {(post.estado === 'Borrador' || post.estado === 'En Community' || post.estado === 'Ajustes de Copy' || post.estado === 'Cambios solicitados por Cliente') && onSendToReview && activeOdt && (
                            <button
                              onClick={() => onSendToReview(post, activeOdt)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                              title="Enviar a Revisión Médica o Corrección"
                            >
                              <Send className="w-3.5 h-3.5" />
                              {activeOdt.requiereMedico ? 'A Revisión Médica' : 'A Corrección'}
                            </button>
                          )}

                          {/* Acción de Community: Publicar / Programar */}
                          {post.estado === 'Listo para Publicar' && onOpenPublishModal && (
                            <button
                              onClick={() => onOpenPublishModal(post)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                              title="Programar o publicar este post en redes"
                            >
                              <Globe className="w-3.5 h-3.5" />
                              PUBLICAR
                            </button>
                          )}

                          {post.estado === 'Programado' && onOpenPublishModal && (
                            <button
                              onClick={() => onOpenPublishModal(post)}
                              className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                              title="Confirmar que ya salió en vivo y registrar enlaces"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              PUBLICAR EN VIVO
                            </button>
                          )}

                          {post.estado === 'Publicado' && onOpenPublishModal && (
                            <button
                              onClick={() => onOpenPublishModal(post)}
                              className="px-2.5 py-1.5 text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Gestionar o añadir enlaces web"
                            >
                              <Share2 className="w-3 h-3" />
                              Gestionar Links
                            </button>
                          )}

                          {/* Acción: Aprobación Interna Final */}
                          {isInternalFinal && (
                            <button
                              onClick={() => onOpenApprovalModal?.(post, 'aprobacion_interna_final')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Aprobación Interna Final
                            </button>
                          )}

                          {/* Acción Rápida: Enviar a Cliente si está en 'Esperando Ejecutivo' */}
                          {isWaitingExec && (
                            <button
                              onClick={() => onSendToClientApproval(post, activeOdt)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              Enviar a Cliente
                            </button>
                          )}

                          {/* Botón de Intervención / Reasignación de Supervisor */}
                          <button
                            onClick={() => onOpenIntervention(post)}
                            title="Intervención manual de supervisor (Reasignar o Devolver)"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <ShieldAlert className="w-4 h-4 text-indigo-500" />
                            <span className="hidden sm:inline">Intervenir</span>
                          </button>

                          {/* Ver Ficha Completa */}
                          <button
                            onClick={() => onSelectPost(post)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            Ver Post
                          </button>
                        </div>
                      </div>

                      {/* Observación destacada del cliente si existe */}
                      {clientObservation && (
                        <div className="p-3 rounded-xl bg-amber-50 border-2 border-amber-300 text-xs text-amber-950 flex items-start gap-2.5 shadow-2xs">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-amber-900 block mb-0.5">
                              Observación del Cliente ({post.aprobacionClienteCopy?.user || post.aprobacionClienteMaterial?.user || 'Cliente'}):
                            </span>
                            <p className="italic text-amber-950 font-medium leading-relaxed">
                              "{clientObservation}"
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Textos Preview y Responsable */}
                      <div className="space-y-1">
                        <div className="text-xs text-slate-700 truncate max-w-3xl">
                          <span className="font-bold text-slate-900 mr-1">Copy In:</span>
                          {post.copyIn ? <span className="italic">"{post.copyIn}"</span> : <span className="text-slate-400">Sin copy in</span>}
                        </div>

                        <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                          <span>Resp: <strong className="text-slate-700">{post.areaResponsable} ({post.responsableActualName || 'Sin asignar'})</strong></span>
                          {post.enlaceMaterialFinal && (
                            <a
                              href={post.enlaceMaterialFinal}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-600 hover:underline font-semibold inline-flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-3 h-3" /> Material OneDrive/Drive
                            </a>
                          )}
                        </div>
                      </div>

                      {/* MAPA DE ETAPAS Y CONTADOR DE DÍAS (EMBUDO INDIVIDUAL) */}
                      <PostStageMap post={post} />
                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>
      )}

      {/* MODAL DUPLICAR POST */}
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
                  {(activeOdt?.redesSociales || ['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'X (Twitter)', 'YouTube']).map(r => (
                    <option key={r} value={r}>
                      {r} {r === duplicatingPost.redSocial ? '(Misma red)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Se generará un nuevo número consecutivo dentro de la ODT y el post comenzará en estado <strong>Borrador</strong> para que el Community pueda adaptarlo a la nueva red social.
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
