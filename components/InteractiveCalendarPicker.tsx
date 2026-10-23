import React, { useState, useMemo } from 'react';
import { Post, DEFAULT_PILARES } from '../types';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Clock, 
  Sparkles, CheckCircle2, AlertCircle, Info, Layers
} from 'lucide-react';

export const PILAR_COLORS: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
  'Educativo': { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', dot: 'bg-purple-500', label: 'Educativo' },
  'Producto': { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', dot: 'bg-emerald-500', label: 'Producto' },
  'Médico / Científico': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', dot: 'bg-blue-500', label: 'Médico / Científico' },
  'Institucional': { bg: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-300', dot: 'bg-amber-500', label: 'Institucional' },
  'Testimonial': { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-300', dot: 'bg-pink-500', label: 'Testimonial' },
  'Promocional': { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300', dot: 'bg-rose-500', label: 'Promocional' }
};

const PALETTE_COLORS = [
  { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', dot: 'bg-purple-500' },
  { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', dot: 'bg-emerald-500' },
  { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', dot: 'bg-blue-500' },
  { bg: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-300', dot: 'bg-amber-500' },
  { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-300', dot: 'bg-pink-500' },
  { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300', dot: 'bg-rose-500' },
  { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300', dot: 'bg-teal-500' },
  { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300', dot: 'bg-cyan-500' },
  { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300', dot: 'bg-indigo-500' },
  { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-300', dot: 'bg-violet-500' }
];

export function getPilarColor(pilarName?: string) {
  if (!pilarName) {
    return { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300', dot: 'bg-slate-400', label: 'General' };
  }
  const clean = pilarName.trim();
  const found = Object.keys(PILAR_COLORS).find(k => 
    clean.toLowerCase().includes(k.toLowerCase().split('/')[0].trim())
  );
  if (found) return PILAR_COLORS[found];

  // Hash determinista para asignar un color distintivo según el nombre del pilar específico de marca
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
  title = 'Planificador de Fecha y Balance de Pilares'
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
      if (p.id === currentPostId || p.estado === 'Cancelado' || !p.fechaPrevista) return;
      const dateKey = p.fechaPrevista.trim();
      const existing = map.get(dateKey) || [];
      map.set(dateKey, [...existing, p]);
    });
    return map;
  }, [posts, currentPostId]);

  // Información del día sobrevolado con el ratón
  const hoveredInfo = useMemo(() => {
    if (!hoveredDay) return null;
    const dayPosts = postsByDateMap.get(hoveredDay) || [];

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
      weekPostsCount: weekPosts.length,
      weekPilarCounts
    };
  }, [hoveredDay, postsByDateMap]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col my-auto">
        
        {/* Cabecera del Calendario */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 via-slate-50 to-purple-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
                {title}
              </h3>
              <p className="text-xs text-slate-500">
                Pasa el ratón sobre los días para ver los pilares ya cubiertos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barra de navegación de mes y año */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <span className="text-base font-black text-slate-900">
              {monthNames[currentMonth]} {currentYear}
            </span>
            {currentPilar && (
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getPilarColor(currentPilar).bg} ${getPilarColor(currentPilar).text} ${getPilarColor(currentPilar).border}`}>
                Pilar actual: {currentPilar}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              title="Mes anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              title="Mes siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Rejilla del Calendario */}
        <div className="p-4 sm:p-5">
          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((dayName, idx) => (
              <span key={dayName} className={`text-[11px] font-bold uppercase tracking-wider ${idx >= 5 ? 'text-rose-400' : 'text-slate-400'}`}>
                {dayName}
              </span>
            ))}
          </div>

          {/* Celdas de días */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Días vacíos previos al 1er día del mes */}
            {Array.from({ length: startingOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="h-14 sm:h-16 rounded-xl bg-slate-50/40 border border-transparent"></div>
            ))}

            {/* Días del mes */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayPosts = postsByDateMap.get(dateStr) || [];
              const isSelected = selectedDate === dateStr;
              const isHovered = hoveredDay === dateStr;
              const hasPosts = dayPosts.length > 0;

              return (
                <div
                  key={dateStr}
                  onMouseEnter={() => setHoveredDay(dateStr)}
                  onClick={() => {
                    onChange(dateStr);
                    onClose();
                  }}
                  className={`h-14 sm:h-16 rounded-xl p-1.5 border transition-all flex flex-col justify-between cursor-pointer relative ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-700 text-white shadow-md ring-2 ring-indigo-400/50'
                      : isHovered
                      ? 'bg-indigo-50 border-indigo-300 shadow-sm'
                      : hasPosts
                      ? 'bg-slate-50/80 hover:bg-slate-100 border-slate-200'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${
                      isSelected ? 'text-white' : 'text-slate-800'
                    }`}>
                      {dayNum}
                    </span>
                    {hasPosts && (
                      <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-white text-indigo-700' : 'bg-slate-200 text-slate-800'
                      }`}>
                        {dayPosts.length}
                      </span>
                    )}
                  </div>

                  {/* Puntos de color por cada pilar presente */}
                  {hasPosts && (
                    <div className="flex items-center gap-1 flex-wrap mt-0.5">
                      {dayPosts.slice(0, 3).map((p, pIdx) => {
                        const col = getPilarColor(p.pilar);
                        return (
                          <span
                            key={p.id || pIdx}
                            className={`w-2 h-2 rounded-full ${isSelected ? 'bg-amber-300' : col.dot}`}
                            title={`#${p.numeroInterno} - Pilar: ${p.pilar || 'Sin pilar'}`}
                          />
                        );
                      })}
                      {dayPosts.length > 3 && (
                        <span className={`text-[8px] font-bold ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                          +{dayPosts.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {!hasPosts && (
                    <span className={`text-[9px] font-semibold ${isSelected ? 'text-indigo-200' : 'text-slate-300'}`}>
                      Libre
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel Inferior Dinámico: Información del día sobrevolado */}
        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50/90 min-h-[110px] flex flex-col justify-center">
          {hoveredInfo ? (
            <div className="space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Fecha: {hoveredInfo.date}</span>
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  hoveredInfo.dayPosts.length > 0 
                    ? 'bg-amber-100 text-amber-900 border-amber-300' 
                    : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                }`}>
                  {hoveredInfo.dayPosts.length > 0 
                    ? `${hoveredInfo.dayPosts.length} post(s) programados hoy` 
                    : '✨ Fecha Libre (Sin posts programados)'}
                </span>
              </div>

              {/* Lista de posts y pilares del día */}
              {hoveredInfo.dayPosts.length > 0 ? (
                <div className="space-y-1.5 max-h-24 overflow-y-auto">
                  {hoveredInfo.dayPosts.map(p => {
                    const col = getPilarColor(p.pilar);
                    return (
                      <div key={p.id} className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white border border-slate-200 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono font-bold text-slate-800 text-[11px]">
                            #{p.numeroInterno}
                          </span>
                          <span className="font-semibold text-slate-600 truncate">
                            {p.redSocial} ({p.tipoMaterial})
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${col.bg} ${col.text} ${col.border}`}>
                          Pilar: {p.pilar || 'Sin pilar'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  No hay publicaciones programadas para este día. Haz clic para seleccionarlo.
                </p>
              )}

              {/* Balance semanal */}
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500 flex-wrap gap-2">
                <span>Esta semana: <strong>{hoveredInfo.weekPostsCount} post(s)</strong> en total</span>
                {Object.keys(hoveredInfo.weekPilarCounts).length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-slate-400">Pilares en semana:</span>
                    {Object.entries(hoveredInfo.weekPilarCounts).map(([pil, count]) => {
                      const col = getPilarColor(pil);
                      return (
                        <span key={pil} className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${col.bg} ${col.text} ${col.border}`}>
                          {pil}: {count}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-xs text-slate-400 py-2 flex items-center justify-center gap-2">
              <Info className="w-4 h-4 text-slate-400" />
              <span>Coloca el cursor sobre cualquier fecha para ver los pilares asignados a esa semana.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 flex-wrap">
            <span className="font-semibold">Leyenda de Pilares:</span>
            {((availablePilares && availablePilares.length > 0) ? availablePilares.slice(0, 5) : DEFAULT_PILARES.slice(0, 4)).map(pil => {
              const col = getPilarColor(pil);
              return (
                <span key={pil} className="flex items-center gap-1 ml-1">
                  <span className={`w-2 h-2 rounded-full ${col.dot}`}></span>
                  <span className="text-[10px] font-medium text-slate-700">{pil}</span>
                </span>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
