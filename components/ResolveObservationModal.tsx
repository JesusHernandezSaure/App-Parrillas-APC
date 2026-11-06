import React, { useState } from 'react';
import { Post, User } from '../types';
import { CheckCircle2, X, AlertTriangle, MessageSquareQuote, FileCheck } from 'lucide-react';

interface ResolveObservationModalProps {
  post: Post;
  currentUser: User;
  onClose: () => void;
  onConfirm: (post: Post, nota: string) => void;
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

  const [nota, setNota] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nota.trim()) {
      setError('Por favor describe brevemente la corrección o ajuste realizado en el copy.');
      return;
    }
    onConfirm(post, nota.trim());
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-emerald-100 flex items-center justify-between bg-emerald-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Atender Observación del Cliente</h2>
              <p className="text-xs text-emerald-800 font-semibold">
                Post #{post.numeroInterno} • {post.redSocial} ({post.tipoMaterial})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Observación original del cliente */}
          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-900 font-bold">
              <MessageSquareQuote className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Observación registrada por {clientAuthor}:</span>
            </div>
            <p className="italic text-amber-950 font-medium pl-5 leading-relaxed bg-white/70 p-2 rounded-lg border border-amber-200/80">
              "{clientObservation}"
            </p>
          </div>

          {/* Campo de Evidencia / Nota de Atención */}
          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
              Evidencia / Detalle de la corrección realizada *
            </label>
            <textarea
              rows={3}
              className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium leading-relaxed"
              placeholder="Ej: Se ajustó el Copy Out reduciendo la extensión del texto y se agregó el llamado a la acción acordado con el cliente."
              value={nota}
              onChange={(e) => {
                setNota(e.target.value);
                if (error) setError('');
              }}
              autoFocus
            />
            {error && (
              <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {error}
              </p>
            )}
            <p className="text-[11px] text-slate-500 mt-1 leading-normal">
              Esta nota quedará grabada como evidencia en el historial de calidad ISO con tu usuario (<strong>{currentUser.name}</strong>) y fecha actual.
            </p>
          </div>

          {/* Banner de buenas prácticas / Fin del texto en rojo */}
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/60 text-xs text-emerald-950 flex items-start gap-2.5">
            <FileCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="leading-snug text-[11px]">
              <strong className="text-emerald-900 font-bold block mb-0.5">Constancia Oficial de Atención:</strong>
              Al registrar la atención, la publicación marcará la solicitud como resuelta, liberando la advertencia de cambios y permitiendo que el equipo creativo avance de fase con total certeza.
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="pt-3 border-t border-slate-100 flex justify-end items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Registrar Atención y Dejar Evidencia</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
