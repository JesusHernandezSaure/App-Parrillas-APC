import React, { useState } from 'react';
import { ODT, Client, User } from '../types';
import { Layers, X, Plus, Calendar, CheckSquare } from 'lucide-react';

interface CreateOdtModalProps {
  clients: Client[];
  users: User[];
  currentUser: User;
  onClose: () => void;
  onCreate: (newOdt: ODT) => void;
  initialClientId?: string;
}

const SOCIAL_OPTIONS = ['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'X (Twitter)', 'YouTube'];

export const CreateOdtModal: React.FC<CreateOdtModalProps> = ({
  clients,
  users,
  currentUser,
  onClose,
  onCreate,
  initialClientId
}) => {
  const [clientId, setClientId] = useState(initialClientId || (clients[0]?.id || ''));
  const [numeroODT, setNumeroODT] = useState(`ODT-2026-00${Math.floor(Math.random() * 900 + 100)}`);
  const [nombreParrilla, setNombreParrilla] = useState('');
  const [mesPeriodo, setMesPeriodo] = useState('Noviembre 2026');
  const [brief, setBrief] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [redesSociales, setRedesSociales] = useState<string[]>(['Instagram', 'Facebook']);
  
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  const [fechaObjetivo, setFechaObjetivo] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  const [requiereMedico, setRequiereMedico] = useState(false);
  const [requiereArte, setRequiereArte] = useState(true);
  const [requiereAudioVideo, setRequiereAudioVideo] = useState(true);

  // Responsables
  const communityUsers = users.filter(u => u.role === 'Community' || u.role === 'Admin');
  const correctorUsers = users.filter(u => u.role === 'Corrector' || u.role === 'Admin');
  const medicoUsers = users.filter(u => u.role === 'Médico' || u.role === 'Admin');
  const arteUsers = users.filter(u => u.role === 'Arte' || u.role === 'Admin');
  const avUsers = users.filter(u => u.role === 'Audio y Video' || u.role === 'Admin');

  const [communityId, setCommunityId] = useState(communityUsers[0]?.id || '');
  const [correctorId, setCorrectorId] = useState(correctorUsers[0]?.id || '');
  const [medicoId, setMedicoId] = useState(medicoUsers[0]?.id || '');
  const [disenadorId, setDisenadorId] = useState(arteUsers[0]?.id || '');
  const [editorAvId, setEditorAvId] = useState(avUsers[0]?.id || '');

  const toggleSocial = (social: string) => {
    setRedesSociales(prev => 
      prev.includes(social) ? prev.filter(s => s !== social) : [...prev, social]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedClient = clients.find(c => c.id === clientId);
    const commUser = users.find(u => u.id === communityId);
    const corrUser = users.find(u => u.id === correctorId);
    const medUser = requiereMedico ? users.find(u => u.id === medicoId) : undefined;
    const artUser = requiereArte ? users.find(u => u.id === disenadorId) : undefined;
    const avUser = requiereAudioVideo ? users.find(u => u.id === editorAvId) : undefined;

    const newOdt: ODT = {
      id: 'odt-' + Date.now(),
      numeroODT: numeroODT.trim(),
      clientId,
      clientName: selectedClient ? selectedClient.name : 'Cliente',
      nombreParrilla: nombreParrilla.trim(),
      mesPeriodo: mesPeriodo.trim(),
      brief: brief.trim(),
      objetivo: objetivo.trim(),
      redesSociales,
      ejecutivoId: currentUser.id,
      ejecutivoName: currentUser.name,
      fechaInicio,
      fechaObjetivo,
      requiereMedico,
      requiereArte,
      requiereAudioVideo,
      communityId,
      communityName: commUser ? commUser.name : 'Community Manager',
      correctorId,
      correctorName: corrUser ? corrUser.name : 'Corrector',
      medicoId: requiereMedico ? medicoId : undefined,
      medicoName: medUser ? medUser.name : undefined,
      disenadorId: requiereArte ? disenadorId : undefined,
      disenadorName: artUser ? artUser.name : undefined,
      editorAvId: requiereAudioVideo ? editorAvId : undefined,
      editorAvName: avUser ? avUser.name : undefined,
      estadoGeneral: 'En Creación',
      createdAt: new Date().toISOString().split('T')[0]
    };

    onCreate(newOdt);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Crear Nueva ODT / Parrilla de Contenidos</h2>
              <p className="text-xs text-slate-500">Parámetros operativos y asignación de equipo para APC</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Identificación */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Número de ODT *
              </label>
              <input
                type="text"
                required
                className="w-full text-sm font-mono px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={numeroODT}
                onChange={(e) => setNumeroODT(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Cliente *
              </label>
              <select
                required
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Mes / Periodo *
              </label>
              <input
                type="text"
                required
                placeholder="ej. Noviembre 2026"
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={mesPeriodo}
                onChange={(e) => setMesPeriodo(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Nombre de la Parrilla / Campaña *
            </label>
            <input
              type="text"
              required
              placeholder="ej. Parrilla Redes Noviembre 2026 - Black Friday & Ofertas"
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={nombreParrilla}
              onChange={(e) => setNombreParrilla(e.target.value)}
            />
          </div>

          {/* Brief y Objetivos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Brief del Contenido *
              </label>
              <textarea
                rows={3}
                required
                placeholder="Temáticas, lineamientos de marca, mensajes centrales..."
                className="w-full text-sm p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Objetivo de la Parrilla *
              </label>
              <textarea
                rows={3}
                required
                placeholder="KPIs, conversiones esperadas, alcance, registros..."
                className="w-full text-sm p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={objetivo}
                onChange={(e) => setObjetivo(e.target.value)}
              />
            </div>
          </div>

          {/* Redes Sociales */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              Redes Sociales *
            </label>
            <div className="flex flex-wrap gap-2">
              {SOCIAL_OPTIONS.map(social => {
                const active = redesSociales.includes(social);
                return (
                  <button
                    key={social}
                    type="button"
                    onClick={() => toggleSocial(social)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      active 
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {social}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Fecha de Inicio *
              </label>
              <input
                type="date"
                required
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Fecha Objetivo de Publicación *
              </label>
              <input
                type="date"
                required
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={fechaObjetivo}
                onChange={(e) => setFechaObjetivo(e.target.value)}
              />
            </div>
          </div>

          {/* Compuertas / Participaciones Requeridas */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
              Áreas Involucradas en el Flujo
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requiereMedico}
                  onChange={(e) => setRequiereMedico(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-sm focus:ring-blue-500"
                />
                <span>Revisión Médica</span>
              </label>

              <label className="flex items-center gap-2 text-sm font-medium text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requiereArte}
                  onChange={(e) => setRequiereArte(e.target.checked)}
                  className="w-4 h-4 text-pink-600 rounded-sm focus:ring-pink-500"
                />
                <span>Producción Gráfica (Arte)</span>
              </label>

              <label className="flex items-center gap-2 text-sm font-medium text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requiereAudioVideo}
                  onChange={(e) => setRequiereAudioVideo(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded-sm focus:ring-amber-500"
                />
                <span>Producción Audio/Video</span>
              </label>
            </div>
          </div>

          {/* Asignación de Miembros del Equipo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Community Manager *
              </label>
              <select
                required
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
                value={communityId}
                onChange={(e) => setCommunityId(e.target.value)}
              >
                {communityUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Corrector de Estilo / QA *
              </label>
              <select
                required
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
                value={correctorId}
                onChange={(e) => setCorrectorId(e.target.value)}
              >
                {correctorUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {requiereMedico && (
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Médico Responsable *
                </label>
                <select
                  required={requiereMedico}
                  className="w-full text-xs px-3 py-2 border border-blue-300 rounded-xl bg-blue-50/50 focus:ring-2 focus:ring-blue-500"
                  value={medicoId}
                  onChange={(e) => setMedicoId(e.target.value)}
                >
                  {medicoUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}

            {requiereArte && (
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Diseñador Gráfico *
                </label>
                <select
                  required={requiereArte}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-pink-500"
                  value={disenadorId}
                  onChange={(e) => setDisenadorId(e.target.value)}
                >
                  {arteUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}

            {requiereAudioVideo && (
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Editor de Video *
                </label>
                <select
                  required={requiereAudioVideo}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-amber-500"
                  value={editorAvId}
                  onChange={(e) => setEditorAvId(e.target.value)}
                >
                  {avUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Crear ODT y Parrilla
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
