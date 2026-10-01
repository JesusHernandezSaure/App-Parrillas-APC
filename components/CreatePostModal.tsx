import React, { useState, useEffect } from 'react';
import { Post, ODT, MaterialType, PostDimensions, PriorityLevel, User } from '../types';
import { Sparkles, X, Plus, ExternalLink, Send, Calendar, Clock, Layers, AlertCircle } from 'lucide-react';

interface CreatePostModalProps {
  odt: ODT;
  existingPostsCount: number;
  currentUser: User;
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
  onClose,
  onCreate
}) => {
  const availableRedes = Array.isArray(odt?.redesSociales) && odt.redesSociales.length > 0
    ? odt.redesSociales
    : ['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'X (Twitter)', 'YouTube'];

  const nextNumber = `POST-${String((existingPostsCount || 0) + 1).padStart(2, '0')}`;
  const [numeroInterno, setNumeroInterno] = useState(nextNumber);
  const [redSocial, setRedSocial] = useState(availableRedes[0] || 'Instagram');
  
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

  // Auto-ajustar sugerencia de dimensiones si cambia a Video
  useEffect(() => {
    if (tipoMaterial === 'Video' && dimensiones === '1080x1080 (1:1 Cuadrado)') {
      setDimensiones('1080x1920 (9:16 Vertical / Reels)');
    }
  }, [tipoMaterial]);

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
      fechaPrevista,
      fechaEntregaMaterial: fechaEntregaMaterial || fechaPrevista,
      tipoMaterial,
      dimensiones,
      nivelPrioridad,
      copyIn: copyIn.trim(),
      copyOut: copyOut.trim(),
      enlaceReferencia: enlaceReferencia.trim(),
      enlaceMaterialFinal: '',
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

          {/* Pestañas de Tamaños / Dimensiones en Píxeles */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block flex items-center justify-between">
              <span>Tamaño / Medidas en Píxeles *</span>
              <span className="text-[11px] text-slate-400 font-normal">Las 3 resoluciones estándar</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Fecha Prevista de Publicación *</span>
              </label>
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
              Copy In (Texto que irá dentro de la imagen / diseño)
            </label>
            <textarea
              rows={3}
              placeholder="Titular, bullet points, llamados a la acción sobre la gráfica..."
              className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
              value={copyIn}
              onChange={(e) => setCopyIn(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Copy Out (Texto del Post / Caption / Hashtags)
            </label>
            <textarea
              rows={4}
              placeholder="Texto completo que acompañará la publicación en redes sociales..."
              className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
              value={copyOut}
              onChange={(e) => setCopyOut(e.target.value)}
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
    </div>
  );
};
