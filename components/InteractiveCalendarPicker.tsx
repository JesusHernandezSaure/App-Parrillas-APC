import React, { useState, useMemo } from 'react';
import { Post, DEFAULT_PILARES } from '../types';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Clock, 
  Sparkles, CheckCircle2, AlertCircle, Info, Layers, AlertTriangle, Filter
} from 'lucide-react';

export interface PilarColorInfo {
  bg: string;
  text: string;
  border: string;
  dot: string;
  accent: string;
  label: string;
}

export const PILAR_COLORS: Record<string, PilarColorInfo> = {
  'Educativo': { 
    bg: 'bg-purple-100', 
    text: 'text-purple-900', 
    border: 'border-purple-300', 
    dot: 'bg-purple-600', 
    accent: '#9333ea', 
    label: 'Educativo' 
  },
  'Producto': { 
    bg: 'bg-emerald-100', 
    text: 'text-emerald-900', 
    border: 'border-emerald-300', 
    dot: 'bg-emerald-600', 
    accent: '#059669', 
    label: 'Producto' 
  },
  'Médico / Científico': { 
    bg: 'bg-blue-100', 
    text: 'text-blue-900', 
    border: 'border-blue-300', 
    dot: 'bg-blue-600', 
    accent: '#2563eb', 
    label: 'Médico / Científico' 
  },
  'Institucional': { 
    bg: 'bg-amber-100', 
    text: 'text-amber-950', 
    border: 'border-amber-300', 
    dot: 'bg-amber-600', 
    accent: '#d97706', 
    label: 'Institucional' 
  },
  'Testimonial': { 
    bg: 'bg-pink-100', 
    text: 'text-pink-900', 
    border: 'border-pink-300', 
    dot: 'bg-pink-600', 
    accent: '#db2777', 
    label: 'Testimonial' 
  },
  'Promocional': { 
    bg: 'bg-rose-100', 
    text: 'text-rose-900', 
    border: 'border-rose-300', 
    dot: 'bg-rose-600', 
    accent: '#e11d48', 
    label: 'Promocional' 
  }
};

const PALETTE_COLORS: Omit<PilarColorInfo, 'label'>[] = [
  { bg: 'bg-purple-100', text: 'text-purple-900', border: 'border-purple-300', dot: 'bg-purple-600', accent: '#9333ea' },
  { bg: 'bg-emerald-100', text: 'text-emerald-900', border: 'border-emerald-300', dot: 'bg-emerald-600', accent: '#059669' },
  { bg: 'bg-blue-100', text: 'text-blue-900', border: 'border-blue-300', dot: 'bg-blue-600', accent: '#2563eb' },
  { bg: 'bg-amber-100', text: 'text-amber-950', border: 'border-amber-300', dot: 'bg-amber-600', accent: '#d97706' },
  { bg: 'bg-pink-100', text: 'text-pink-900', border: 'border-pink-300', dot: 'bg-pink-600', accent: '#db2777' },
  { bg: 'bg-rose-100', text: 'text-rose-900', border: 'border-rose-300', dot: 'bg-rose-600', accent: '#e11d48' },
  { bg: 'bg-teal-100', text: 'text-teal-900', border: 'border-teal-300', dot: 'bg-teal-600', accent: '#0d9488' },
  { bg: 'bg-cyan-100', text: 'text-cyan-900', border: 'border-cyan-300', dot: 'bg-cyan-600', accent: '#0891b2' },
  { bg: 'bg-indigo-100', text: 'text-indigo-900', border: 'border-indigo-300', dot: 'bg-indigo-600', accent: '#4f46e5' },
  { bg: 'bg-violet-100', text: 'text-violet-900', border: 'border-violet-300', dot: 'bg-violet-600', accent: '#7c3aed' }
];

export function getPilarColor(pilarName?: string): PilarColorInfo {
  if (!pilarName || !pilarName.trim()) {
    return { 
      bg: 'bg-slate-100', 
      text: 'text-slate-700', 
      border: 'border-slate-300', 
      dot: 'bg-slate-500', 
      accent: '#64748b', 
      label: 'General' 
    };
  }
  const clean = pilarName.trim();
  const foundKey = Object.keys(PILAR_COLORS).find(k => 
    clean.toLowerCase().includes(k.toLowerCase().split('/')[0].trim())
  );
  if (foundKey) return PILAR_COLORS[foundKey];

  // Hash determinista para asignar color distintivo según el nombre del pilar específico
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const colorIndex = Math.abs(hash) % PALETTE_COLORS.length;
  const picked = PALETTE_COLORS[colorIndex];
  return { ...picked, label: clean };
}

interface InteractiveCalendarPickerProps {
  selectedDate: string;
  onChange: (date: string) => void;
  posts: Post[];
  currentPostId?: string;
  currentPilar?: string;
  availablePilares?: string[];
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  odtId?: string;
  clientId?: string;
}

export const InteractiveCalendarPicker: React.FC<InteractiveCalendarPickerProps> = ({
  selectedDate,
  onChange,
  posts,
  currentPostId,
  currentPilar,
  availablePilares,
  isOpen,
  onClose,
  title = 'Planificador de Fecha y Balance de Pilares',
  odtId,
  clientId
}) => {
  // Inicializar el mes y año visualizados con base en selectedDate o la fecha actual
  const initialDateObj = useMemo(() => {
    if (selectedDate && selectedDate.includes('-')) {
      const [y, m, d] = selectedDate.split('-').map(Number);
      return new Date(y, (m || 1) - 1, d || 1);
    }
    return new Date();
  }, [selectedDate]);

  const [currentYear, setCurrentYear] = useState<number>(initialDateObj.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(initialDateObj.getMonth()); // 0-indexed
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [selectedFilterPilar, setSelectedFilterPilar] = useState<string | null>(null);

  if (!isOpen) return null;

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Cálculo de días en el mes
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sun, 1 is Mon...
  const startingOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Ajustado a Lunes = 0

  // Mapa de posts por fecha
  const postsByDateMap = useMemo(() => {
    const map = new Map<string, Post[]>();
    posts.forEach(p => {
      // Excluir el post actual que se está editando o cancelados
      if (p.id === currentPostId || p.estado === 'Cancelado' || !p.fechaPrevista) return;
      const dateKey = p.fechaPrevista.trim();
      const existing = map.get(dateKey) || [];
      map.set(dateKey, [...existing, p]);
    });
    return map;
  }, [posts, currentPostId]);

  // Lista consolidada de pilares disponibles para la leyenda y filtros
  const allPilaresList = useMemo(() => {
    const set = new Set<string>();
    if (availablePilares && availablePilares.length > 0) {
      availablePilares.forEach(p => set.add(p));
    } else {
      DEFAULT_PILARES.forEach(p => set.add(p));
    }
    // Agregar pilares que ya existan en los posts
    posts.forEach(p => {
      if (p.pilar && p.pilar.trim()) set.add(p.pilar.trim());
    });
    return Array.from(set);
  }, [availablePilares, posts]);

  // Información del día sobrevolado con el ratón
  const hoveredInfo = useMemo(() => {
    if (!hoveredDay) return null;
    const dayPosts = postsByDateMap.get(hoveredDay) || [];

    // Comprobar si hay conflicto directo de pilar con el post que se está creando/editando
    const hasSamePilarConflict = !!currentPilar && dayPosts.some(
      p => p.pilar && p.pilar.trim().toLowerCase() === currentPilar.trim().toLowerCase()
    );

    // Calcular posts de la misma semana (Lunes a Domingo)
    const [y, m, d] = hoveredDay.split('-').map(Number);
    const targetDate = new Date(y, m - 1, d);
    const dayOfWeek = targetDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const weekMonday = new Date(targetDate);
    weekMonday.setDate(targetDate.getDate() + mondayOffset);
    
    const weekPosts: Post[] = [];
    for (let i = 0; i < 7; i++) {
      const curr = new Date(weekMonday);
      curr.setDate(weekMonday.getDate() + i);
      const currStr = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;
      const ps = postsByDateMap.get(currStr) || [];
      weekPosts.push(...ps);
    }

    // Desglose de pilares de esa semana
    const weekPilarCounts: Record<string, number> = {};
    weekPosts.forEach(p => {
      const pil = p.pilar || 'Sin pilar';
      weekPilarCounts[pil] = (weekPilarCounts[pil] || 0) + 1;
    });

    return {
      date: hoveredDay,
      dayPosts,
      hasSamePilarConflict,
      weekPostsCount: weekPosts.length,
      weekPilarCounts
    };
  }, [hoveredDay, postsByDateMap, currentPilar]);

  const currentPilarColor = currentPilar ? getPilarColor(currentPilar) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[95vh]">
        
        {/* Cabecera del Calendario */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-indigo-50/90 via-slate-50 to-blue-50/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-slate-900 text-base sm:text-lg leading-tight">
                  {title}
                </h3>
                {currentPilar && (
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border shadow-2xs ${currentPilarColor?.bg} ${currentPilarColor?.text} ${currentPilarColor?.border}`}>
                    <span className={`w-2 h-2 rounded-full ${currentPilarColor?.dot}`}></span>
                    Pilar a programar: <span className="underline decoration-indigo-400">{currentPilar}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Código de color por pilar en cada fecha. Pasa el cursor para ver el detalle y evitar repetir pilares el mismo día.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-2"
            title="Cerrar calendario"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de navegación de mes y año + Filtro rápido de pilar */}
        <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                title="Mes anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-base sm:text-lg font-black text-slate-900 min-w-[170px] text-center">
                {monthNames[currentMonth]} {currentYear}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                title="Mes siguiente"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Acceso directo a Hoy */}
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setCurrentYear(now.getFullYear());
                setCurrentMonth(now.getMonth());
              }}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              Mes Actual
            </button>
          </div>

          {/* Filtro interactivo por pilar */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-slate-500 font-semibold mr-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Resaltar:</span>
            </div>
            {selectedFilterPilar && (
              <button
                type="button"
                onClick={() => setSelectedFilterPilar(null)}
                className="text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-full transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>Mostrar todos</span>
                <X className="w-3 h-3" />
              </button>
            )}
            {allPilaresList.slice(0, 6).map(pil => {
              const col = getPilarColor(pil);
              const isSelectedFilter = selectedFilterPilar === pil;
              return (
                <button
                  key={pil}
                  type="button"
                  onClick={() => setSelectedFilterPilar(prev => prev === pil ? null : pil)}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer flex items-center gap-1 ${
                    isSelectedFilter 
                      ? `${col.bg} ${col.text} ${col.border} ring-2 ring-indigo-500 shadow-xs font-black` 
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                  title={`Filtrar días con el pilar ${pil}`}
                >
                  <span className={`w-2 h-2 rounded-full ${col.dot}`}></span>
                  <span>{pil}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Rejilla del Calendario */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1">
          {/* Nombres de los días de la semana */}
          <div className="grid grid-cols-7 gap-1.5 text-center mb-2">
            {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((dayName, idx) => (
              <span 
                key={dayName} 
                className={`text-[11px] sm:text-xs font-extrabold uppercase tracking-wider py-1 rounded-lg ${
                  idx >= 5 ? 'text-rose-500 bg-rose-50/50' : 'text-slate-500 bg-slate-50/50'
                }`}
              >
                <span className="hidden sm:inline">{dayName}</span>
                <span className="sm:hidden">{dayName.slice(0, 3)}</span>
              </span>
            ))}
          </div>

          {/* Celdas de días */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {/* Días vacíos previos al primer día del mes */}
            {Array.from({ length: startingOffset }).map((_, i) => (
              <div 
                key={`empty-${i}`} 
                className="min-h-[4.75rem] sm:min-h-[5.5rem] rounded-2xl bg-slate-50/30 border border-dashed border-slate-200/50" 
              />
            ))}

            {/* Días del mes */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayPosts = postsByDateMap.get(dateStr) || [];
              const isSelected = selectedDate === dateStr;
              const isHovered = hoveredDay === dateStr;
              const hasPosts = dayPosts.length > 0;

              // Detección de conflicto: ¿Este día ya tiene el mismo pilar del post que se está programando?
              const hasPilarConflict = !!currentPilar && dayPosts.some(
                p => p.pilar && p.pilar.trim().toLowerCase() === currentPilar.trim().toLowerCase()
              );

              // Detección de filtro activo
              const matchesFilter = !selectedFilterPilar || dayPosts.some(
                p => p.pilar && p.pilar.trim().toLowerCase() === selectedFilterPilar.trim().toLowerCase()
              );

              // Color primario del primer post para tintar la celda si hay posts
              const primaryPilar = dayPosts[0]?.pilar;
              const primaryPilarCol = primaryPilar ? getPilarColor(primaryPilar) : null;

              // Calcular posición del tooltip flotante según la columna (0 a 6)
              const cellCol = (startingOffset + i) % 7;
              const tooltipAlignClass = cellCol <= 1 
                ? 'left-0 sm:left-2' 
                : cellCol >= 5 
                ? 'right-0 sm:right-2' 
                : 'left-1/2 -translate-x-1/2';

              // Si está en las últimas filas, mostrar el tooltip arriba; si en las primeras, mostrar abajo
              const cellRow = Math.floor((startingOffset + i) / 7);
              const tooltipVerticalClass = cellRow >= 3
                ? 'bottom-full mb-2'
                : 'top-full mt-2';

              return (
                <div
                  key={dateStr}
                  onMouseEnter={() => setHoveredDay(dateStr)}
                  onMouseLeave={() => {
                    if (hoveredDay === dateStr) setHoveredDay(null);
                  }}
                  onClick={() => {
                    onChange(dateStr);
                    onClose();
                  }}
                  className={`min-h-[4.75rem] sm:min-h-[5.5rem] rounded-2xl p-2 border transition-all flex flex-col justify-between cursor-pointer relative text-left group ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg ring-2 ring-indigo-400 ring-offset-1 z-10'
                      : hasPilarConflict
                      ? 'bg-rose-50/90 border-rose-300 hover:border-rose-400 hover:bg-rose-100/70 shadow-xs ring-1 ring-rose-200'
                      : hasPosts && primaryPilarCol
                      ? `${primaryPilarCol.bg} ${primaryPilarCol.border} hover:shadow-md hover:scale-[1.01]`
                      : 'bg-white hover:bg-slate-50/90 border-slate-200 hover:border-slate-300 hover:shadow-xs'
                  } ${
                    selectedFilterPilar && !matchesFilter ? 'opacity-35 grayscale-[50%]' : 'opacity-100'
                  }`}
                >
                  {/* Fila Superior: Número de día y Contador de posts */}
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-xs sm:text-sm font-black ${
                      isSelected ? 'text-white' : 'text-slate-900'
                    }`}>
                      {dayNum}
                    </span>

                    {/* Insignia de conflicto o contador de posts */}
                    {hasPilarConflict && !isSelected ? (
                      <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-rose-600 text-white shadow-2xs flex items-center gap-0.5 animate-pulse" title="¡Este día ya tiene este pilar!">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        <span className="hidden sm:inline">Repite</span>
                      </span>
                    ) : hasPosts ? (
                      <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                        isSelected 
                          ? 'bg-white text-indigo-700' 
                          : 'bg-slate-900/10 text-slate-800'
                      }`}>
                        {dayPosts.length} {dayPosts.length === 1 ? 'post' : 'posts'}
                      </span>
                    ) : (
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-indigo-500 text-indigo-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        Libre
                      </span>
                    )}
                  </div>

                  {/* Cuerpo de la celda: Badges claros con los nombres de los pilares */}
                  <div className="my-1 flex flex-col gap-1 overflow-hidden">
                    {hasPosts ? (
                      dayPosts.slice(0, 2).map((p, pIdx) => {
                        const col = getPilarColor(p.pilar);
                        const isThisPilarConflict = !!currentPilar && p.pilar?.trim().toLowerCase() === currentPilar.trim().toLowerCase();
                        return (
                          <div
                            key={p.id || pIdx}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold truncate border shadow-2xs ${
                              isSelected 
                                ? 'bg-indigo-700/80 border-indigo-400 text-white' 
                                : isThisPilarConflict
                                ? 'bg-rose-200 border-rose-400 text-rose-950 font-black'
                                : `${col.bg} ${col.text} ${col.border}`
                            }`}
                            title={`#${p.numeroInterno} • ${p.redSocial} • Pilar: ${p.pilar || 'Sin pilar'}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? 'bg-amber-300' : col.dot}`} />
                            <span className="truncate">{p.pilar || 'General'}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold py-0.5">
                        <Sparkles className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span className="hidden sm:inline">Disponible</span>
                      </div>
                    )}

                    {/* Indicador de más posts si hay más de 2 */}
                    {dayPosts.length > 2 && (
                      <span className={`text-[9px] font-extrabold px-1 ${
                        isSelected ? 'text-indigo-200' : 'text-slate-600'
                      }`}>
                        +{dayPosts.length - 2} post(s) más
                      </span>
                    )}
                  </div>

                  {/* Pie de la celda: Estado sutil */}
                  <div className="flex items-center justify-between text-[9px]">
                    {hasPilarConflict && !isSelected ? (
                      <span className="font-extrabold text-rose-700 truncate">
                        ⚠️ Mismo pilar
                      </span>
                    ) : isSelected ? (
                      <span className="font-bold text-indigo-100 flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5 text-amber-300" />
                        Seleccionado
                      </span>
                    ) : hasPosts ? (
                      <span className="text-slate-500 truncate">
                        Ver detalles &rarr;
                      </span>
                    ) : (
                      <span className="text-emerald-700/70 font-medium">
                        Sin conflicto
                      </span>
                    )}
                  </div>

                  {/* TOOLTIP FLOTANTE RICO AL PASAR EL RATÓN */}
                  {isHovered && (
                    <div 
                      className={`absolute ${tooltipAlignClass} ${tooltipVerticalClass} z-50 w-72 sm:w-80 p-3 rounded-2xl bg-slate-950 text-white shadow-2xl border border-slate-700 pointer-events-none animate-in fade-in zoom-in-95 duration-150`}
                      style={{ filter: 'drop-shadow(0 10px 25px rgba(0,0,0,0.4))' }}
                    >
                      {/* Cabecera del Tooltip */}
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                        <span className="text-xs font-black text-slate-100 flex items-center gap-1.5">
                          <CalendarIcon className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{dayNum} de {monthNames[currentMonth]} {currentYear}</span>
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          hasPosts 
                            ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/40' 
                            : 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40'
                        }`}>
                          {hasPosts ? `${dayPosts.length} post(s)` : '✨ 100% Libre'}
                        </span>
                      </div>

                      {/* Alerta de Conflicto si coincide con el pilar actual */}
                      {hasPilarConflict && (
                        <div className="mb-2 p-2 rounded-xl bg-rose-950/80 border border-rose-500 text-rose-200 text-xs flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <div className="leading-tight">
                            <p className="font-extrabold text-rose-300">¡Advertencia de Repetición!</p>
                            <p className="text-[11px] text-rose-200 mt-0.5">
                              Este día ya tiene un post con el pilar <strong className="underline text-white font-bold">{currentPilar}</strong>. Elige otra fecha o varía el pilar para no saturar a la audiencia.
                            </p>
                          </div>
                        </div>
                      )}

                      {!hasPilarConflict && hasPosts && currentPilar && (
                        <div className="mb-2 p-1.5 rounded-xl bg-blue-950/60 border border-blue-500/40 text-blue-200 text-[11px] flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>Pilar <strong>"{currentPilar}"</strong> disponible en esta fecha.</span>
                        </div>
                      )}

                      {!hasPosts && (
                        <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Fecha totalmente disponible. Haz clic para programar este día.</span>
                        </div>
                      )}

                      {/* Lista de posts en esta fecha */}
                      {hasPosts && (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Posts programados este día:
                          </span>
                          {dayPosts.map((p, pIdx) => {
                            const col = getPilarColor(p.pilar);
                            const isConflict = !!currentPilar && p.pilar?.trim().toLowerCase() === currentPilar.trim().toLowerCase();
                            return (
                              <div 
                                key={p.id || pIdx} 
                                className={`p-2 rounded-xl text-xs border ${
                                  isConflict 
                                    ? 'bg-rose-900/40 border-rose-500 text-white' 
                                    : 'bg-slate-900 border-slate-800 text-slate-200'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <span className="font-mono font-black text-indigo-300 text-[11px]">
                                    #{p.numeroInterno} • {p.redSocial}
                                  </span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${col.bg} ${col.text} ${col.border}`}>
                                    {p.pilar || 'Sin pilar'}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 line-clamp-1">
                                  <span className="font-semibold text-slate-300">{p.tipoMaterial}</span>
                                  {(p.copyIn || p.copyOut) && ` — "${(p.copyIn || p.copyOut).replace(/<[^>]+>/g, '').slice(0, 35)}..."`}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Tip para hacer clic */}
                      <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-slate-400 text-center font-medium">
                        Haz clic para seleccionar el día <strong className="text-white">{dayNum}</strong>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>

        {/* Panel Inferior Dinámico: Información detallada y Balance de la semana */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-col justify-center shrink-0">
          {hoveredInfo ? (
            <div className="space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>Día seleccionado al pasar el ratón: {hoveredInfo.date}</span>
                </span>
                <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                  hoveredInfo.hasSamePilarConflict
                    ? 'bg-rose-100 text-rose-900 border-rose-300'
                    : hoveredInfo.dayPosts.length > 0 
                    ? 'bg-amber-100 text-amber-900 border-amber-300' 
                    : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                }`}>
                  {hoveredInfo.hasSamePilarConflict
                    ? `⚠️ Conflicto: Ya existe post con pilar "${currentPilar}"`
                    : hoveredInfo.dayPosts.length > 0 
                    ? `${hoveredInfo.dayPosts.length} post(s) programados` 
                    : '✨ Fecha Libre (Sin posts programados)'}
                </span>
              </div>

              {/* Balance semanal de pilares */}
              <div className="flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2 pt-1 border-t border-slate-200">
                <span>Esta semana: <strong>{hoveredInfo.weekPostsCount} post(s)</strong> programados</span>
                {Object.keys(hoveredInfo.weekPilarCounts).length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-slate-500 text-[11px]">Pilares en esa semana:</span>
                    {Object.entries(hoveredInfo.weekPilarCounts).map(([pil, count]) => {
                      const col = getPilarColor(pil);
                      return (
                        <span key={pil} className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${col.bg} ${col.text} ${col.border}`}>
                          {pil}: {count}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-xs text-slate-500 py-1 flex items-center justify-center gap-2">
              <Info className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>
                Pasa el ratón por los días para ver el desglose en tiempo real y asegurarte de no repetir el mismo pilar el mismo día.
              </span>
            </div>
          )}
        </div>

        {/* Footer con Leyenda Completa de Colores de Pilares */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
            <span className="font-black text-slate-800">Leyenda de Colores:</span>
            {allPilaresList.map(pil => {
              const col = getPilarColor(pil);
              return (
                <div 
                  key={pil} 
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-bold ${col.bg} ${col.text} ${col.border}`}
                >
                  <span className={`w-2 h-2 rounded-full ${col.dot}`}></span>
                  <span>{pil}</span>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer shrink-0 ml-auto"
          >
            Cerrar Calendario
          </button>
        </div>

      </div>
    </div>
  );
};

