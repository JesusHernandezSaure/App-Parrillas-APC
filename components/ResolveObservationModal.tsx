import React, { useState } from 'react';
import { Post, User } from '../types';
import { CheckCircle2, X, AlertTriangle, MessageSquareQuote, FileCheck, FileEdit, Send, Layers } from 'lucide-react';

interface ResolveObservationModalProps {
  post: Post;
  currentUser: User;
  onClose: () => void;
  onConfirm: (post: Post, nota: string, updatedCopys?: { copyIn: string; copyOut: string }) => void;
}

export const ResolveObservationModal: React.FC<ResolveObservationModalProps> = ({
  post,
  currentUser,
  onClose,
  onConfirm,
}) => {
  const clientObservation = 
    (post.aprobacionClienteCopy?.status === 'Cambios Solicitados' ? post.aprobacionClienteCopy?.comment : null) || 
    (post.aprobacionClienteMaterial?.status === 'Cambios Solicitados' ? post.aprobacionClienteMaterial?.comment : null) ||
    post.comentarios.find(c => c.text.includes('[Revisión') || c.userRole === 'Cliente')?.text ||
    'Ajuste solicitado por el cliente en la publicación.';

  const clientAuthor = 
    post.aprobacionClienteCopy?.user || 
    post.aprobacionClienteMaterial?.user || 
    post.solicitadoPorName || 
    'Cliente';

  // Copys editables integrados directamente en el modal para asegurar que se guarden
  const [copyIn, setCopyIn] = useState(post.copyIn || '');
  const [copyOut, setCopyOut] = useState(post.copyOut || '');
  const [nota, setNota] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nota.trim()) {
      setError('Por favor describe brevemente la corrección o ajuste realizado en el copy.');
      return;
    }
    onConfirm(post, nota.trim(), {
      copyIn: copyIn.trim(),
      copyOut: copyOut.trim()
    });
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-70 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-emerald-100 flex items-center justify-between bg-emerald-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Atender y Corregir Observación del Cliente</h2>
              <p className="text-xs text-emerald-800 font-semibold">
                Post #{post.numeroInterno} • {post.redSocial} • {post.tipoMaterial} {post.dimensiones ? `(${post.dimensiones})` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-white/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4.5 flex-1 text-slate-800">
          {/* Observación original del cliente */}
          <div className="p-4 bg-amber-50/90 rounded-2xl border border-amber-200/90 text-xs text-amber-950 space-y-1.5 shadow-2xs">
            <div className="flex items-center gap-1.5 text-amber-900 font-bold">
              <MessageSquareQuote className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Observación registrada por {clientAuthor}:</span>
            </div>
            <p className="italic text-amber-950 font-medium pl-3 leading-relaxed bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
              "{clientObservation}"
            </p>
          </div>

          {/* Edición de Copys en el mismo modal para evitar pérdidas */}
          <div className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileEdit className="w-4 h-4 text-indigo-600" />
                <span>Ajustar Textos de la Publicación</span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Edita aquí el texto con las correcciones requeridas
              </span>
            </div>

            {/* Copy In */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Copy In (Texto en la imagen / gráfica / portada)
              </label>
              <textarea
                rows={2}
                value={copyIn}
                onChange={(e) => setCopyIn(e.target.value)}
                placeholder="Escribe el texto corregido que irá montado en la imagen o video..."
                className="w-full text-xs p-3 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 font-medium leading-relaxed"
              />
            </div>

            {/* Copy Out */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Copy Out (Texto del cuerpo / pie de publicación en redes)
              </label>
              <textarea
                rows={4}
                value={copyOut}
                onChange={(e) => setCopyOut(e.target.value)}
                placeholder="Escribe el copy final corregido que acompañará al post..."
                className="w-full text-xs p-3 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 font-medium leading-relaxed font-sans"
              />
            </div>
          </div>

          {/* Campo de Evidencia / Nota de Atención */}
          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
              Evidencia / Detalle de la corrección realizada *
            </label>
            <textarea
              rows={2}
              className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium leading-relaxed"
              placeholder="Ej: Se ajustó el Copy Out reduciendo la extensión del texto y se agregó el llamado a la acción acordado con el cliente."
              value={nota}
              onChange={(e) => {
                setNota(e.target.value);
                if (error) setError('');
              }}
            />
            {error && (
              <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {error}
              </p>
            )}
            <p className="text-[11px] text-slate-500 mt-1 leading-normal">
              Esta nota quedará grabada como evidencia en el historial con tu usuario (<strong>{currentUser.name}</strong>) y fecha actual.
            </p>
          </div>

          {/* Banner de nuevo proceso: Pasa a Corrección de Estilo antes de Producción */}
          <div className="p-3.5 bg-blue-50/80 rounded-2xl border border-blue-200 text-xs text-blue-950 flex items-start gap-2.5">
            <FileCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <div className="leading-snug text-[11px]">
              <strong className="text-blue-900 font-bold block mb-0.5">Control de Calidad y Estilo:</strong>
              Al confirmar, los copys se guardarán de inmediato y el post pasará automáticamente a <strong>Corrección de Estilo</strong> para certificar la ortografía y redacción. Una vez que Corrección apruebe, avanzará a <strong>Producción</strong> (Arte o Audio/Video).
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="pt-3 border-t border-slate-100 flex justify-end items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Guardar Copys y Enviar a Corrección</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
