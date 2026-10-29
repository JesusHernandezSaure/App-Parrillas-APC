import React, { useState } from 'react';
import { Post, ODT, User } from '../types';
import { 
  CheckCircle2, AlertTriangle, ExternalLink, X, MessageSquare, ShieldCheck, ArrowRight, Copy, Check
} from 'lucide-react';
import { RichTextDisplay } from './RichTextDisplay';

interface ApprovalModalProps {
  post: Post;
  odt?: ODT;
  currentUser: User;
  type: 'medico' | 'correccion_copy' | 'correccion_material' | 'medico_material' | 'aprobacion_interna_final' | 'cliente_copy' | 'cliente_material' | 'esperando_ejecutivo';
  onClose: () => void;
  onApprove: (comment: string, extraOptions?: { requiereRevisionMedica?: boolean }) => void;
  onRequestChanges: (comment: string) => void;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  post,
  odt,
  currentUser,
  type,
  onClose,
  onApprove,
  onRequestChanges
}) => {
  const [action, setAction] = useState<'approve' | 'changes'>('approve');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [requiereRevisionMedica, setRequiereRevisionMedica] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const getTitle = () => {
    switch (type) {
      case 'medico': return 'Revisión Médica y Ética de Copy';
      case 'correccion_copy': return 'Corrección de Estilo & Copy';
      case 'correccion_material': return 'Corrección Final de Material';
      case 'medico_material': return 'Revisión Médica de Material Final';
      case 'aprobacion_interna_final': return 'Aprobación Interna Final (Ejecutivo)';
      case 'esperando_ejecutivo': return 'Revisión de Ejecutivo previa a Cliente';
      case 'cliente_copy': return 'Aprobación de Copy (Cliente)';
      case 'cliente_material': return 'Aprobación de Material';
    }
  };

  const getNextStepDescription = () => {
    if (action === 'approve') {
      switch (type) {
        case 'medico': return 'El Post pasará a Corrección de Copy para revisión de estilo.';
        case 'correccion_copy': return 'El Post pasará al Ejecutivo de Cuentas para consolidar la Parrilla de Copy lista para el Cliente.';
        case 'correccion_material': 
          return requiereRevisionMedica 
            ? 'Corrección final aprobada. Pasará a Revisión Médica del material por incorporar claims o datos científicos.'
            : 'Corrección final aprobada. Pasará a Aprobación Interna Final con el Ejecutivo dueño de la ODT.';
        case 'medico_material': return 'Visto bueno médico otorgado. El Post pasará a Aprobación Interna Final con el Ejecutivo.';
        case 'aprobacion_interna_final': return '¡Aprobado para publicación! Pasará inmediatamente a la bandeja "Listo para Publicar" del Community Manager.';
        case 'esperando_ejecutivo': return 'El Post pasará a la parrilla lista para revisión y visto bueno del Cliente.';
        case 'cliente_copy': return post.tipoMaterial === 'Video'
          ? 'Copy aprobado. El Post pasará a Producción de Audio y Video.'
          : 'Copy aprobado. El Post pasará a Producción de Arte/Diseño.';
        case 'cliente_material': return 'Material aprobado.';
      }
    } else {
      switch (type) {
        case 'medico': return 'El Post regresará al Community Manager a la etapa "Ajustes de Copy".';
        case 'correccion_copy': return 'El Post regresará al Community Manager a la etapa "Ajustes de Copy".';
        case 'correccion_material': return 'El Post regresará al área de producción correspondiente (Arte o Audio/Video) para ajustes técnicos.';
        case 'medico_material': return 'El Post regresará al área de producción técnica para corregir los claims o elementos médicos.';
        case 'esperando_ejecutivo': return 'El Post regresará a Corrección o Ajustes según tus observaciones.';
        case 'aprobacion_interna_final': return 'El Post se devolverá a Producción o Corrección para ajustes antes de su autorización final.';
        case 'cliente_copy': return 'Se registrarán las observaciones del cliente y pasará al Ejecutivo de Cuentas para coordinar los ajustes.';
        case 'cliente_material': return 'Se registrarán las observaciones.';
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (action === 'changes' && !comment.trim()) {
      setError('Es obligatorio ingresar un comentario o motivo al solicitar cambios.');
      return;
    }
    if (action === 'approve') {
      onApprove(comment.trim(), { requiereRevisionMedica });
    } else {
      onRequestChanges(comment.trim());
    }
  };

  const isClientMode = currentUser.role === 'Cliente';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Compuerta de Calidad</span>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              {getTitle()}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Post Header Badges */}
          <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-100">
            <span className="px-2.5 py-1 rounded-md bg-slate-900 text-white font-mono text-xs font-bold">
              {post.numeroInterno}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-semibold text-xs">
              {post.redSocial}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
              Fecha: {post.fechaPrevista}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-medium">
              Formato: {post.tipoMaterial}
            </span>
          </div>

          {/* Textos del Post */}
          <div className="space-y-3">
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Copy In (Texto en Imagen / Gráfica)
              </span>
              <RichTextDisplay
                content={post.copyIn}
                fallbackText="Sin texto en gráfica"
                showCopyButton
                copyButtonLabel="Copiar"
              />
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Copy Out (Texto de Publicación / Caption)
              </span>
              <RichTextDisplay
                content={post.copyOut}
                fallbackText="Sin caption"
                showCopyButton
                copyButtonLabel="Copiar"
              />
            </div>
          </div>

          {/* Enlaces de Referencia / Material Final */}
          <div className="space-y-3">
            {post.enlaceReferencia && (
              <a
                href={post.enlaceReferencia}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ver Enlace de Referencia
              </a>
            )}

            {post.enlaceMaterialFinal && (
              <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-indigo-950">
                      Material Producido (OneDrive / Google Drive)
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Abrir en OneDrive / Drive
                  </a>
                </div>
                
                <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-indigo-100 font-mono text-[11px] text-slate-700">
                  <span className="truncate max-w-md select-all" title={post.enlaceMaterialFinal}>
                    {post.enlaceMaterialFinal}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(post.enlaceMaterialFinal);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="text-xs text-indigo-700 hover:text-indigo-900 font-bold shrink-0 flex items-center gap-1 px-2 py-0.5 rounded hover:bg-indigo-50 transition-colors cursor-pointer"
                  >
                    {copiedLink ? (
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
              </div>
            )}
          </div>

          {/* Formulario de Decisión */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-slate-100">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Decisión
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setAction('approve'); setError(''); }}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-bold transition-all ${
                    action === 'approve'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Aprobar
                </button>

                <button
                  type="button"
                  onClick={() => { setAction('changes'); }}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-bold transition-all ${
                    action === 'changes'
                      ? 'bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/20 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Solicitar Cambios
                </button>
              </div>
            </div>

            {/* Selector Opcional de Validación Médica Adicional (Solo para Corrección Material) */}
            {type === 'correccion_material' && action === 'approve' && (
              <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 space-y-1.5">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiereRevisionMedica}
                    onChange={(e) => setRequiereRevisionMedica(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer mt-0.5 shrink-0"
                  />
                  <div>
                    <span className="font-bold block text-purple-950">
                      ¿Requiere Revisión Médica Adicional del Material Final?
                    </span>
                    <span className="text-purple-700 leading-normal block">
                      Activa esta casilla únicamente si el diseño o video incorpora información científica, claims médicos, posología gráfica o datos clínicos que requieran revalidación por el Médico antes de la aprobación final.
                    </span>
                  </div>
                </label>
              </div>
            )}

            {/* Siguiente paso informativo */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70 text-xs text-slate-600 flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{getNextStepDescription()}</span>
            </div>

            {/* Comentario / Observación */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {action === 'changes' ? 'Detalle de Cambios Solicitados *' : 'Comentarios / Observaciones (Opcional)'}
              </label>
              <textarea
                rows={3}
                className="w-full text-sm p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-400"
                placeholder={action === 'changes' ? 'Indique con precisión qué ajustes deben realizarse...' : 'Comentario adicional...'}
                value={comment}
                onChange={(e) => { setComment(e.target.value); setError(''); }}
              />
              {error && <p className="text-xs text-rose-600 font-semibold mt-1">{error}</p>}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`px-5 py-2 text-sm font-bold text-white rounded-xl shadow-xs transition-colors flex items-center gap-2 ${
                  action === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {action === 'approve' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                Confirmar Decisión
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};
