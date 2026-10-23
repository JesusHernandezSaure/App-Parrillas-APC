import React, { useState } from 'react';
import { ODT, Client, User, DEFAULT_PILARES } from '../types';
import { Layers, X, Plus, Calendar, CheckSquare, Sparkles, Save, Edit3, Trash2 } from 'lucide-react';
import { getPilarColor } from './InteractiveCalendarPicker';

interface CreateOdtModalProps {
  clients: Client[];
  users: User[];
  currentUser: User;
  onClose: () => void;
  onCreate: (newOdt: ODT) => void;
  initialClientId?: string;
  odtToEdit?: ODT;
  onSave?: (updatedOdt: ODT) => void;
  onDelete?: (odtId: string) => void;
}

const SOCIAL_OPTIONS = ['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'X (Twitter)', 'YouTube'];

export const CreateOdtModal: React.FC<CreateOdtModalProps> = ({
  clients,
  users,
  currentUser,
  onClose,
  onCreate,
  initialClientId,
  odtToEdit,
  onSave,
  onDelete
}) => {
  const isEditing = Boolean(odtToEdit);

  const [clientId, setClientId] = useState(odtToEdit?.clientId || initialClientId || (clients[0]?.id || ''));
  const [numeroODT, setNumeroODT] = useState(odtToEdit?.numeroODT || `ODT-2026-00${Math.floor(Math.random() * 900 + 100)}`);
  const [nombreParrilla, setNombreParrilla] = useState(odtToEdit?.nombreParrilla || '');
  
  // Pilares de contenido heredados de la ODT o del cliente seleccionado
  const [pilares, setPilares] = useState<string[]>(() => {
    if (odtToEdit?.pilares && odtToEdit.pilares.length > 0) {
      return [...odtToEdit.pilares];
    }
    const cli = clients.find(c => c.id === (initialClientId || clients[0]?.id));
    return (cli?.pilares && cli.pilares.length > 0) ? [...cli.pilares] : [...DEFAULT_PILARES];
  });
  const [pilarInput, setPilarInput] = useState('');
  const [mesPeriodo, setMesPeriodo] = useState(() => {
    if (odtToEdit?.mesPeriodo) return odtToEdit.mesPeriodo;
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const now = new Date();
    return `${months[now.getMonth()]} ${now.getFullYear()}`;
  });
  const [brief, setBrief] = useState(odtToEdit?.brief || '');
  const [objetivo, setObjetivo] = useState(odtToEdit?.objetivo || '');
  const [redesSociales, setRedesSociales] = useState<string[]>(
    odtToEdit?.redesSociales && odtToEdit.redesSociales.length > 0 
      ? odtToEdit.redesSociales 
      : ['Instagram', 'Facebook']
  );
  
  const [fechaInicio, setFechaInicio] = useState(odtToEdit?.fechaInicio || new Date().toISOString().split('T')[0]);
  const [fechaObjetivo, setFechaObjetivo] = useState(
    odtToEdit?.fechaObjetivo || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  const [requiereMedico, setRequiereMedico] = useState(odtToEdit ? Boolean(odtToEdit.requiereMedico) : false);
  const [requiereArte, setRequiereArte] = useState(odtToEdit ? Boolean(odtToEdit.requiereArte) : true);
  const [requiereAudioVideo, setRequiereAudioVideo] = useState(odtToEdit ? Boolean(odtToEdit.requiereAudioVideo) : true);
  const [estadoGeneral, setEstadoGeneral] = useState<ODT['estadoGeneral']>(odtToEdit?.estadoGeneral || 'En Creación');

  // Responsables (admite rol principal y roles secundarios/compartidos)
  const communityUsers = users.filter(u => u.role === 'Community' || u.role === 'Admin' || u.secondaryRoles?.includes('Community'));
  const correctorUsers = users.filter(u => u.role === 'Corrector' || u.role === 'Admin' || u.secondaryRoles?.includes('Corrector'));
  const medicoUsers = users.filter(u => u.role === 'Médico' || u.role === 'Admin' || u.secondaryRoles?.includes('Médico'));
  const arteUsers = users.filter(u => u.role === 'Arte' || u.role === 'Admin' || u.secondaryRoles?.includes('Arte'));
  const avUsers = users.filter(u => u.role === 'Audio y Video' || u.role === 'Admin' || u.secondaryRoles?.includes('Audio y Video'));

  const [communityId, setCommunityId] = useState(odtToEdit?.communityId || communityUsers[0]?.id || '');
  const [correctorId, setCorrectorId] = useState(odtToEdit?.correctorId || correctorUsers[0]?.id || '');
  const [medicoId, setMedicoId] = useState(odtToEdit?.medicoId || medicoUsers[0]?.id || '');
  const [disenadorId, setDisenadorId] = useState(odtToEdit?.disenadorId || arteUsers[0]?.id || '');
  const [editorAvId, setEditorAvId] = useState(odtToEdit?.editorAvId || avUsers[0]?.id || '');

  const toggleSocial = (social: string) => {
    setRedesSociales(prev => 
      prev.includes(social) ? prev.filter(s => s !== social) : [...prev, social]
    );
  };

  const handleClientChange = (newClientId: string) => {
    setClientId(newClientId);
    const cli = clients.find(c => c.id === newClientId);
    if (!isEditing) {
      if (cli?.pilares && cli.pilares.length > 0) {
        setPilares([...cli.pilares]);
      } else {
        setPilares([...DEFAULT_PILARES]);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedClient = clients.find(c => c.id === clientId);
    const commUser = users.find(u => u.id === communityId);
    const corrUser = users.find(u => u.id === correctorId);
    const medUser = requiereMedico ? users.find(u => u.id === medicoId) : undefined;
    const artUser = requiereArte ? users.find(u => u.id === disenadorId) : undefined;
    const avUser = requiereAudioVideo ? users.find(u => u.id === editorAvId) : undefined;

    const finalOdt: ODT = {
      ...(odtToEdit || {}),
      id: odtToEdit?.id || ('odt-' + Date.now()),
      numeroODT: numeroODT.trim(),
      clientId,
      clientName: selectedClient ? selectedClient.name : (odtToEdit?.clientName || 'Cliente'),
      nombreParrilla: nombreParrilla.trim(),
      mesPeriodo: mesPeriodo.trim(),
      brief: brief.trim(),
      objetivo: objetivo.trim(),
      redesSociales,
      pilares: (pilares && pilares.length > 0) ? pilares : (selectedClient?.pilares || [...DEFAULT_PILARES]),
      ejecutivoId: odtToEdit?.ejecutivoId || currentUser.id,
      ejecutivoName: odtToEdit?.ejecutivoName || currentUser.name,
      fechaInicio,
      fechaObjetivo,
      requiereMedico,
      requiereArte,
      requiereAudioVideo,
      communityId,
      communityName: commUser ? commUser.name : (odtToEdit?.communityName || 'Community Manager'),
      correctorId,
      correctorName: corrUser ? corrUser.name : (odtToEdit?.correctorName || 'Corrector'),
      medicoId: requiereMedico ? medicoId : undefined,
      medicoName: requiereMedico ? (medUser ? medUser.name : odtToEdit?.medicoName) : undefined,
      disenadorId: requiereArte ? disenadorId : undefined,
      disenadorName: requiereArte ? (artUser ? artUser.name : odtToEdit?.disenadorName) : undefined,
      editorAvId: requiereAudioVideo ? editorAvId : undefined,
      editorAvName: requiereAudioVideo ? (avUser ? avUser.name : odtToEdit?.editorAvName) : undefined,
      estadoGeneral: estadoGeneral,
      createdAt: odtToEdit?.createdAt || new Date().toISOString().split('T')[0],
      rondasAprobacion: odtToEdit?.rondasAprobacion || [],
      estadoAprobacionCopy: odtToEdit?.estadoAprobacionCopy,
      estadoAprobacionMaterial: odtToEdit?.estadoAprobacionMaterial
    };

    if (odtToEdit && onSave) {
      onSave(finalOdt);
    } else {
      onCreate(finalOdt);
    }
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
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>{isEditing ? `Editar ODT / Parrilla: ${odtToEdit?.numeroODT}` : 'Crear Nueva ODT / Parrilla de Contenidos'}</span>
                {isEditing && (
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                    Modo Edición
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditing 
                  ? 'Actualiza brief, pilares, requerimientos, fechas y equipo asignado a esta parrilla' 
                  : 'Parámetros operativos y asignación de equipo para APC'}
              </p>
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
          <div className={`grid grid-cols-1 ${isEditing ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
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
                onChange={(e) => handleClientChange(e.target.value)}
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
                list="meses-sugeridos"
                placeholder="ej. Noviembre 2026"
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                value={mesPeriodo}
                onChange={(e) => setMesPeriodo(e.target.value)}
              />
              <datalist id="meses-sugeridos">
                <option value="Octubre 2026" />
                <option value="Noviembre 2026" />
                <option value="Diciembre 2026" />
                <option value="Enero 2027" />
                <option value="Febrero 2027" />
                <option value="Marzo 2027" />
              </datalist>
            </div>

            {isEditing && (
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Estado de la ODT *
                </label>
                <select
                  className="w-full text-sm font-semibold px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
                  value={estadoGeneral}
                  onChange={(e) => setEstadoGeneral(e.target.value as ODT['estadoGeneral'])}
                >
                  <option value="En Creación">🟡 En Creación (Community)</option>
                  <option value="En Producción">🎨 En Producción (Arte / Video)</option>
                  <option value="En Aprobación">🔍 En Aprobación (Revisión / Cliente)</option>
                  <option value="Listo para Publicar">🚀 Listo para Publicar</option>
                  <option value="Completado">✅ Completado al 100%</option>
                  <option value="Pausado">⏸️ Pausado</option>
                </select>
              </div>
            )}
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

          {/* Pilares de Contenido Heredados de la Marca para esta ODT */}
          <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Pilares de Contenido para esta ODT</span>
                    <span className="text-[10px] font-black text-emerald-700 lowercase px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-300">
                      heredados de {clients.find(c => c.id === clientId)?.name || 'la marca'}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    Define las categorías temáticas que el Community Manager tendrá disponibles al crear los posts de esta parrilla.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white text-emerald-800 border border-emerald-300">
                {pilares.length} pilares activos
              </span>
            </div>

            {/* Lista interactiva de pilares */}
            <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 bg-white rounded-xl border border-emerald-200">
              {pilares.length === 0 ? (
                <span className="text-xs text-slate-400 italic">No hay pilares activos. Añade uno abajo.</span>
              ) : (
                pilares.map((pil, idx) => {
                  const col = getPilarColor(pil);
                  return (
                    <span
                      key={`${pil}-${idx}`}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border shadow-2xs ${col.bg} ${col.text} ${col.border}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${col.dot}`}></span>
                      <span>{pil}</span>
                      <button
                        type="button"
                        onClick={() => setPilares(prev => prev.filter((_, i) => i !== idx))}
                        className="ml-1 hover:text-rose-600 cursor-pointer"
                        title="Quitar este pilar de esta ODT"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  );
                })
              )}
            </div>

            {/* Input para agregar pilar extra para esta campaña */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={pilarInput}
                onChange={(e) => setPilarInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = pilarInput.trim();
                    if (val && !pilares.includes(val)) {
                      setPilares(prev => [...prev, val]);
                      setPilarInput('');
                    }
                  }
                }}
                placeholder="Agregar pilar específico de campaña (ej. Promoción Especial, FAQ)"
                className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => {
                  const val = pilarInput.trim();
                  if (val && !pilares.includes(val)) {
                    setPilares(prev => [...prev, val]);
                    setPilarInput('');
                  }
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                + Agregar Pilar
              </button>
              <button
                type="button"
                onClick={() => {
                  const cli = clients.find(c => c.id === clientId);
                  if (cli?.pilares && cli.pilares.length > 0) {
                    setPilares([...cli.pilares]);
                  } else {
                    setPilares([...DEFAULT_PILARES]);
                  }
                }}
                className="px-2.5 py-1.5 text-[11px] text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors cursor-pointer shrink-0"
                title="Restablecer a los pilares oficiales de la marca seleccionada"
              >
                Restablecer a marca
              </button>
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
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 flex-wrap gap-3">
            <div>
              {isEditing && onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`¿Estás seguro de que deseas eliminar la ODT "${odtToEdit?.nombreParrilla}" y todos sus posts asociados? Esta acción no se puede deshacer.`)) {
                      onDelete(odtToEdit!.id);
                      onClose();
                    }
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-rose-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar ODT</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                {isEditing ? (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar Cambios de la ODT</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Crear ODT y Parrilla</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
