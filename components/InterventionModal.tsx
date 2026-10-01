import React, { useState } from 'react';
import { Post, ODT, User, PostStatus } from '../types';
import { ShieldAlert, X, CheckCircle2, RotateCcw, UserCog } from 'lucide-react';

interface InterventionModalProps {
  post: Post;
  odt?: ODT;
  users: User[];
  currentUser: User;
  onClose: () => void;
  onSaveIntervention: (
    newStatus: PostStatus,
    newArea: string,
    newRespName: string,
    newRespId: string,
    motivo: string
  ) => void;
}

const ALL_STATUSES: { status: PostStatus; area: string }[] = [
  { status: 'Borrador', area: 'Community' },
  { status: 'En Community', area: 'Community' },
  { status: 'Revisión Médica', area: 'Médico' },
  { status: 'Ajustes de Copy', area: 'Community' },
  { status: 'Corrección de Copy', area: 'Corrección' },
  { status: 'Esperando Ejecutivo', area: 'Ejecutivo' },
  { status: 'Aprobación Copy Cliente', area: 'Cliente' },
  { status: 'Producción Arte', area: 'Arte' },
  { status: 'Producción Audio/Video', area: 'Audio y Video' },
  { status: 'Corrección Material', area: 'Corrección' },
  { status: 'Aprobación Material Cliente', area: 'Cliente' },
  { status: 'Cambios solicitados por Cliente', area: 'Ejecutivo' },
  { status: 'Listo para Publicar', area: 'Community' },
  { status: 'Programado', area: 'Community' },
  { status: 'Publicado', area: 'Community' },
  { status: 'Cancelado', area: 'Ejecutivo' }
];

export const InterventionModal: React.FC<InterventionModalProps> = ({
  post,
  odt,
  users,
  currentUser,
  onClose,
  onSaveIntervention
}) => {
  const [selectedStatus, setSelectedStatus] = useState<PostStatus>(post.estado);
  const [selectedUserId, setSelectedUserId] = useState<string>(post.responsableActualId || users[0]?.id || '');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim()) {
      setError('La norma de control ISO exige registrar el motivo u orden de la intervención.');
      return;
    }
    const foundStatusObj = ALL_STATUSES.find(s => s.status === selectedStatus);
    const area = foundStatusObj ? foundStatusObj.area : 'Ejecutivo';
    const targetUser = users.find(u => u.id === selectedUserId);
    const respName = targetUser ? targetUser.name : 'Responsable asignado';

    onSaveIntervention(selectedStatus, area, respName, selectedUserId, motivo.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Intervención de Supervisor Ejecutivo</h2>
              <p className="text-xs text-indigo-700 font-medium">{post.numeroInterno} • Reasignación o Ajuste de Etapa</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-slate-700">Estado Actual:</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 font-semibold">{post.estado}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-700">Área / Responsable Actual:</span>
              <span className="text-slate-600">{post.areaResponsable} ({post.responsableActualName || 'No definido'})</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Nuevo Estado Operativo *
            </label>
            <select
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as PostStatus)}
            >
              {ALL_STATUSES.map(s => (
                <option key={s.status} value={s.status}>
                  {s.status} — (Área: {s.area})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Asignar Usuario Responsable *
            </label>
            <select
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  [{u.role}] {u.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Motivo / Justificación Obligatoria de la Intervención *
            </label>
            <textarea
              rows={3}
              required
              placeholder="Describa la causa de la reasignación, cambio de etapa o instrucción de excepción..."
              className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
              value={motivo}
              onChange={(e) => { setMotivo(e.target.value); setError(''); }}
            />
            {error && <p className="text-xs text-rose-600 font-semibold mt-1">{error}</p>}
            <p className="text-[11px] text-slate-400 mt-1">
              * Se registrará una entrada en la auditoría con tu nombre ({currentUser.name}) y fecha exacta.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Aplicar y Guardar Registro
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
