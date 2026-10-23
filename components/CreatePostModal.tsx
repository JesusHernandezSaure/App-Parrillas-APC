import React, { useState, useEffect, useMemo } from 'react';
import { Post, ODT, MaterialType, PostDimensions, PriorityLevel, User, DEFAULT_PILARES } from '../types';
import { Sparkles, X, Plus, ExternalLink, Send, Calendar, Clock, Layers, AlertCircle, Palette } from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';
import { InteractiveCalendarPicker, getPilarColor } from './InteractiveCalendarPicker';

interface CreatePostModalProps {
  odt: ODT;
  existingPostsCount: number;
  currentUser: User;
  posts?: Post[];
  onClose: () => void;
  onCreate: (newPost: Post, sendToReview: boolean) => void;
}

const MATERIAL_TYPES: MaterialType[] = ['Imagen', 'Video', 'Carrusel'];

const DIMENSION_OPTIONS: { id: PostDimensions; label: string; desc: string }[] = [
  { 
    id: '1080x1080 (1:1 Cuadrado)', 
    label: '1:1 Cuadrado (1080 × 1080 px)', 
    desc: 'Feed principal de Instagram, Facebook y LinkedIn' 
  },
  { 
    id: '1080x1350 (4:5 Vertical)', 
    label: '4:5 Vertical (1080 × 1350 px)', 
    desc: 'Feed vertical Instagram y FB (Mayor presencia móvil)' 
  },
  { 
    id: '1080x1920 (9:16 Vertical / Reels)', 
    label: '9:16 Vertical (1080 × 1920 px)', 
    desc: 'Reels, TikTok, YouTube Shorts e Instagram Stories' 
  },
  { 
    id: '1920x1080 (16:9 Horizontal)', 
    label: '16:9 Horizontal (1920 × 1080 px)', 
    desc: 'YouTube, Web banners, Facebook/X horizontal' 
  }
];

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  odt,
  existingPostsCount,
  currentUser,
  posts = [],
  onClose,
  onCreate
}) => {
  const availableRedes = Array.isArray(odt?.redesSociales) && odt.redesSociales.length > 0
    ? odt.redesSociales
    : ['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'X (Twitter)', 'YouTube'];

  // Pilares de contenido heredados de la ODT o marca cliente
  const availablePilares: string[] = useMemo(() => {
    if (odt?.pilares && odt.pilares.length > 0) {
      return odt.pilares;
    }
    return [...DEFAULT_PILARES];
  }, [odt]);

  const nextNumber = `POST-${String((existingPostsCount || 0) + 1).padStart(2, '0')}`;
  const [numeroInterno, setNumeroInterno] = useState(nextNumber);
  const [redSocial, setRedSocial] = useState(availableRedes[0] || 'Instagram');
  const [pilar, setPilar] = useState<string>(() => {
    if (odt?.pilares && odt.pilares.length > 0) {
      return odt.pilares[0];
    }
    return DEFAULT_PILARES[0];
  });
  const [customPilarInput, setCustomPilarInput] = useState('');
  const [isAddingCustomPilar, setIsAddingCustomPilar] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // Fechas: Publicación vs Entrega Material
  const defaultPubDate = odt?.fechaObjetivo || new Date().toISOString().split('T')[0];
  const [fechaPrevista, setFechaPrevista] = useState(defaultPubDate);
  
  // Calcular sugerencia de fecha de entrega de material (3 días antes de la publicación)
  const calcDeliveryDate = (pubDate: string) => {
    try {
      const d = new Date(pubDate);
      d.setDate(d.getDate() - 3);
      return d.toISOString().split('T')[0];
    } catch {
      return pubDate;
    }
  };

  const [fechaEntregaMaterial, setFechaEntregaMaterial] = useState(() => calcDeliveryDate(defaultPubDate));
  const [tipoMaterial, setTipoMaterial] = useState<MaterialType>('Imagen');
  const [dimensiones, setDimensiones] = useState<PostDimensions>('1080x1080 (1:1 Cuadrado)');
  const [nivelPrioridad, setNivelPrioridad] = useState<PriorityLevel>('Nivel 2');
  const [copyIn, setCopyIn] = useState('');
  const [copyOut, setCopyOut] = useState('');
  const [enlaceReferencia, setEnlaceReferencia] = useState('');

  // Para videos: detección inteligente si la ODT/cliente es Telefém
  const isTelefemOdt = Boolean(
    odt?.clientName?.toLowerCase().includes('telefem') || 
    odt?.nombreParrilla?.toLowerCase().includes('telefem')
  );
  const [requiereArtePrevio, setRequiereArtePrevio] = useState<boolean>(() => isTelefemOdt);

  // Auto-ajustar sugerencia de dimensiones si cambia a Video y pre-activar editables si es Telefém
  useEffect(() => {
    if (tipoMaterial === 'Video') {
      if (dimensiones === '1080x1080 (1:1 Cuadrado)') {
        setDimensiones('1080x1920 (9:16 Vertical / Reels)');
      }
      if (isTelefemOdt) {
        setRequiereArtePrevio(true);
      }
    }
  }, [tipoMaterial, isTelefemOdt]);

  const handlePubDateChange = (newDate: string) => {
    setFechaPrevista(newDate);
    // Si la fecha de entrega de material aún no ha sido editada manualmente o queda después de la publicación, actualizarla
    if (!fechaEntregaMaterial || fechaEntregaMaterial >= newDate) {
      setFechaEntregaMaterial(calcDeliveryDate(newDate));
    }
  };

  const handleSave = (sendToReview: boolean) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Si se envía directo a revisión:
    // Si la ODT requiere médico -> 'Revisión Médica', else -> 'Corrección de Copy'
    let initialStatus: Post['estado'] = 'Borrador';
    let area = 'Community';
    let respId = currentUser.id;
    let respName = currentUser.name;

    if (sendToReview) {
      if (odt?.requiereMedico) {
        initialStatus = 'Revisión Médica';
        area = 'Médico';
        respId = odt.medicoId || '';
        respName = odt.medicoName || 'Médico';
      } else {
        initialStatus = 'Corrección de Copy';
        area = 'Corrección';
        respId = odt?.correctorId || '';
        respName = odt?.correctorName || 'Corrector';
      }
    }

    const newPost: Post = {
      id: 'post-' + Date.now(),
      numeroInterno: numeroInterno.trim(),
      odtId: odt?.id || '',
      clientId: odt?.clientId || '',
      redSocial,
      pilar,
      fechaPrevista,
      fechaEntregaMaterial: fechaEntregaMaterial || fechaPrevista,
      tipoMaterial,
      dimensiones,
      nivelPrioridad,
      copyIn: copyIn.trim(),
      copyOut: copyOut.trim(),
      enlaceReferencia: enlaceReferencia.trim(),
      enlaceMaterialFinal: '',
      requiereArtePrevio: tipoMaterial === 'Video' ? requiereArtePrevio : false,
      enlaceEditableArte: '',
      notasArteParaVideo: '',
      arteCompletado: false,
      areaResponsable: area,
      responsableActualId: respId,
      responsableActualName: respName,
      estado: initialStatus,
      comentarios: [],
      historial: [
        {
          id: 'h-' + Date.now(),
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          action: sendToReview ? 'Post creado y enviado a Revisión' : 'Post creado en Borrador',
          motivo: `Registro inicial por Community • Prioridad: ${nivelPrioridad} • Medida: ${dimensiones}`,
          previousState: 'Borrador',
          newState: initialStatus
        }
      ],
      publicado: false,
      createdAt: today,
      updatedAt: today
    };

    onCreate(newPost, sendToReview);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Agregar Nuevo Post a la ODT</h2>
              <p className="text-xs text-slate-500">{odt.numeroODT} • {odt.nombreParrilla}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* Grid Principal: Identificador, Red Social y Formato */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Número Interno *
              </label>
              <input
                type="text"
                required
                className="w-full text-xs font-mono px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                value={numeroInterno}
                onChange={(e) => setNumeroInterno(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Red Social *
              </label>
              <select
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500"
                value={redSocial}
                onChange={(e) => setRedSocial(e.target.value)}
              >
                {availableRedes.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Formato de Entrega *
              </label>
              <select
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold focus:ring-2 focus:ring-emerald-500"
                value={tipoMaterial}
                onChange={(e) => setTipoMaterial(e.target.value as MaterialType)}
              >
                {MATERIAL_TYPES.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Selector de Pilar Temático del Post */}
          <div className="p-3.5 bg-emerald-50/40 rounded-2xl border border-emerald-200/80">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pilar del Contenido *</span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.2 rounded-full">
                  Parrilla: {odt.nombreParrilla}
                </span>
              </label>
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${getPilarColor(pilar).bg} ${getPilarColor(pilar).text} ${getPilarColor(pilar).border}`}>
                Pilar: {pilar}
              </span>
            </div>
            
            <div className="flex flex-wrap gap-1.5 items-center">
              {availablePilares.map(pil => {
                const isSelected = pilar === pil;
                const col = getPilarColor(pil);
                return (
                  <button
                    key={pil}
                    type="button"
                    onClick={() => {
                      setPilar(pil);
                      setIsAddingCustomPilar(false);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? `${col.bg} ${col.text} ${col.border} ring-2 ring-emerald-400/50 shadow-xs font-black`
                        : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isSelected ? col.dot : 'bg-slate-300'}`}></span>
                    <span>{pil}</span>
                  </button>
                );
              })}

              {/* Si el post actual tiene un pilar que no está en availablePilares (ej. histórico o personalizado) */}
              {!availablePilares.includes(pilar) && pilar && (
                <button
                  type="button"
                  className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center gap-1.5 ring-2 ring-emerald-400/50 shadow-xs ${getPilarColor(pilar).bg} ${getPilarColor(pilar).text} ${getPilarColor(pilar).border}`}
                >
                  <span className={`w-2 h-2 rounded-full ${getPilarColor(pilar).dot}`}></span>
                  <span>{pilar} (Personalizado)</span>
                </button>
              )}

              {/* Botón para especificar otro pilar */}
              {!isAddingCustomPilar ? (
                <button
                  type="button"
                  onClick={() => setIsAddingCustomPilar(true)}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-dashed border-emerald-300 hover:border-emerald-500 bg-white hover:bg-emerald-50 text-emerald-700 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Otro pilar...</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-emerald-300 shadow-2xs">
                  <input
                    type="text"
                    value={customPilarInput}
                    onChange={(e) => setCustomPilarInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (customPilarInput.trim()) {
                          setPilar(customPilarInput.trim());
                          setIsAddingCustomPilar(false);
                          setCustomPilarInput('');
                        }
                      }
                    }}
                    placeholder="Nombre del pilar..."
                    className="text-xs px-2 py-1 outline-none text-slate-800 w-36"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customPilarInput.trim()) {
                        setPilar(customPilarInput.trim());
                        setIsAddingCustomPilar(false);
                        setCustomPilarInput('');
                      }
                    }}
                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                  >
                    Usar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomPilar(false)}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">
              Pilares asignados para esta marca y ODT. Permite balancear la frecuencia de temas en el calendario mensual.
            </p>
          </div>

          {/* Pestañas de Tamaños / Dimensiones en Píxeles */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block flex items-center justify-between">
              <span>Tamaño / Medidas en Píxeles *</span>
              <span className="text-[11px] text-slate-400 font-normal">4 resoluciones estándar</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {DIMENSION_OPTIONS.map((dim) => {
                const isSelected = dimensiones === dim.id;
                return (
                  <button
                    key={dim.id}
                    type="button"
                    onClick={() => setDimensiones(dim.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-bold shadow-xs ring-1 ring-emerald-400'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-extrabold flex items-center justify-between">
                      <span>{dim.label}</span>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-emerald-600"></span>}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{dim.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Opciones Específicas para Post de Video (Parrillas como Telefém u otras marcas) */}
          {tipoMaterial === 'Video' && (
            <div className={`p-4 rounded-2xl border transition-all ${
              requiereArtePrevio 
                ? 'bg-gradient-to-r from-purple-50/80 to-indigo-50/80 border-purple-300 ring-1 ring-purple-300/40' 
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    requiereArtePrevio ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'
                  }`}>
                    <Palette className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <label 
                        onClick={() => setRequiereArtePrevio(!requiereArtePrevio)}
                        className="text-xs font-bold text-slate-900 cursor-pointer"
                      >
                        ¿Este video requiere que Arte prepare diseño o editables previos?
                      </label>
                      {isTelefemOdt && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                          Recomendado Telefém
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                      Para parrillas como <strong>Telefém</strong> o videos con animaciones/ilustraciones que el equipo de <strong>Arte</strong> debe diseñar en capas antes de que <strong>Audio y Video</strong> anime.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input 
                    type="checkbox" 
                    checked={requiereArtePrevio} 
                    onChange={(e) => setRequiereArtePrevio(e.target.checked)} 
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {requiereArtePrevio && (
                <div className="mt-3 pt-2.5 border-t border-purple-200/70 flex items-center gap-2 text-[11px] text-purple-950 font-medium bg-white/80 p-2.5 rounded-xl">
                  <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0"></span>
                  <span>
                    <strong>Flujo asignado:</strong> Copy Aprobado ➔ <strong>1. Arte diseña editables</strong> ➔ <strong>2. Audio y Video produce la animación</strong>.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Nivel de Importancia / Prioridad para Producción */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block flex items-center justify-between">
              <span>Nivel de Importancia / Prioridad Operativa *</span>
              <span className="text-[11px] text-slate-400 font-normal">Define la urgencia para Arte y Audio/Video</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setNivelPrioridad('Nivel 1')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  nivelPrioridad === 'Nivel 1'
                    ? 'border-rose-500 bg-rose-50 text-rose-900 font-black shadow-xs ring-1 ring-rose-400'
                    : 'border-slate-200 bg-slate-50 hover:bg-rose-50/40 text-slate-700'
                }`}
              >
                <div className="text-xs font-black text-rose-600 flex items-center justify-center gap-1">
                  <span>🔴</span>
                  <span>Nivel 1</span>
                </div>
                <div className="text-[10px] text-slate-500 font-medium">Muy importante / Crítico</div>
              </button>

              <button
                type="button"
                onClick={() => setNivelPrioridad('Nivel 2')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  nivelPrioridad === 'Nivel 2'
                    ? 'border-amber-500 bg-amber-50 text-amber-900 font-black shadow-xs ring-1 ring-amber-400'
                    : 'border-slate-200 bg-slate-50 hover:bg-amber-50/40 text-slate-700'
                }`}
              >
                <div className="text-xs font-black text-amber-600 flex items-center justify-center gap-1">
                  <span>🟡</span>
                  <span>Nivel 2</span>
                </div>
                <div className="text-[10px] text-slate-500 font-medium">Importante / Estándar</div>
              </button>

              <button
                type="button"
                onClick={() => setNivelPrioridad('Nivel 3')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  nivelPrioridad === 'Nivel 3'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-black shadow-xs ring-1 ring-emerald-400'
                    : 'border-slate-200 bg-slate-50 hover:bg-emerald-50/40 text-slate-700'
                }`}
              >
                <div className="text-xs font-black text-emerald-600 flex items-center justify-center gap-1">
                  <span>🟢</span>
                  <span>Nivel 3</span>
                </div>
                <div className="text-[10px] text-slate-500 font-medium">Flexible / No urgente</div>
              </button>
            </div>
          </div>

          {/* Fechas de Entrega Operativa vs Publicación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="bg-amber-50/50 border border-amber-200/70 p-3 rounded-xl">
              <label className="text-xs font-bold text-amber-900 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Fecha Entrega de Material (Arte/Video) *</span>
              </label>
              <input
                type="date"
                required
                className="w-full text-xs px-3 py-2 border border-amber-300 rounded-lg bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500"
                value={fechaEntregaMaterial}
                onChange={(e) => setFechaEntregaMaterial(e.target.value)}
              />
              <p className="text-[10px] text-amber-700 mt-1">
                * Meta para el diseñador/editor para permitir revisiones antes de publicar.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Fecha Prevista de Publicación *</span>
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
                required
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                value={fechaPrevista}
                onChange={(e) => handlePubDateChange(e.target.value)}
              />
              <p className="text-[10px] text-slate-500 mt-1">
                * Fecha en la que el post saldrá al aire en redes sociales.
              </p>
            </div>
          </div>

          {/* Advertencia de coherencia de fechas */}
          {fechaEntregaMaterial && fechaPrevista && fechaEntregaMaterial > fechaPrevista && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-[11px] flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Atención: La fecha de entrega de material ({fechaEntregaMaterial}) es posterior a la fecha de publicación ({fechaPrevista}). Te sugerimos programar la entrega antes para permitir revisiones técnicas y médicas.</span>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Copy In (Texto enriquecido sobre la imagen / gráfica)
            </label>
            <RichTextEditor
              value={copyIn}
              onChange={setCopyIn}
              placeholder="Titular, bullet points, llamados a la acción sobre la gráfica..."
              minHeight="85px"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Copy Out (Texto enriquecido del Post / Caption / Hashtags)
            </label>
            <RichTextEditor
              value={copyOut}
              onChange={setCopyOut}
              placeholder="Texto completo que acompañará la publicación en redes sociales..."
              minHeight="120px"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Enlace de Referencia (Google Drive / Pinterest / Benchmark)
            </label>
            <input
              type="url"
              placeholder="https://drive.google.com/..."
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
              value={enlaceReferencia}
              onChange={(e) => setEnlaceReferencia(e.target.value)}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              * Enlace externo de consulta visual o inspiración para el diseñador/editor.
            </p>
          </div>

          {/* Botones de Guardar */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => handleSave(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Guardar en Borrador
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {odt.requiereMedico ? 'Enviar a Revisión Médica' : 'Enviar a Corrección de Copy'}
            </button>
          </div>

        </div>

      </div>

      {/* Modal Interactivo de Calendario y Balance de Pilares */}
      {isCalendarOpen && (
        <InteractiveCalendarPicker
          isOpen={isCalendarOpen}
          selectedDate={fechaPrevista}
          onChange={(newDate) => handlePubDateChange(newDate)}
          posts={posts}
          currentPilar={pilar}
          availablePilares={availablePilares}
          onClose={() => setIsCalendarOpen(false)}
          title={`Planificador de Publicación — ODT: ${odt.nombreParrilla}`}
        />
      )}

    </div>
  );
};
