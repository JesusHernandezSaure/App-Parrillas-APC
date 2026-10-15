import React from 'react';
import { User, UserRole } from '../types';
import { 
  Shield, CheckCircle2, UserCircle2, LogOut, Sparkles, Building2, 
  Layers, Stethoscope, CheckSquare, Palette, Video, UserCheck, ChevronDown, Crown
} from 'lucide-react';

interface NavbarProps {
  currentUser: User;
  authenticatedUser: User;
  allUsers: User[];
  isSuperAdmin: boolean;
  isSimulating: boolean;
  onSwitchUser: (user: User) => void;
  onExitSimulation: () => void;
  onLogout: () => void;
  clientName?: string;
  onOpenSuperAdminPanel?: () => void;
  activeViewRole?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  authenticatedUser,
  allUsers,
  isSuperAdmin,
  isSimulating,
  onSwitchUser,
  onExitSimulation,
  onLogout,
  clientName,
  onOpenSuperAdminPanel,
  activeViewRole
}) => {
  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'Super Admin': return <Crown className="w-4 h-4 text-amber-500 fill-amber-500" />;
      case 'Ejecutivo': return <Layers className="w-4 h-4 text-indigo-500" />;
      case 'Community': return <Sparkles className="w-4 h-4 text-emerald-500" />;
      case 'Médico': return <Stethoscope className="w-4 h-4 text-blue-500" />;
      case 'Corrector': return <CheckSquare className="w-4 h-4 text-purple-500" />;
      case 'Arte': return <Palette className="w-4 h-4 text-pink-500" />;
      case 'Audio y Video': return <Video className="w-4 h-4 text-amber-500" />;
      case 'Cliente': return <Building2 className="w-4 h-4 text-cyan-600" />;
      case 'Admin': return <Shield className="w-4 h-4 text-rose-500" />;
    }
  };

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'Super Admin': return 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold shadow-xs';
      case 'Ejecutivo': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Community': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Médico': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Corrector': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Arte': return 'bg-pink-50 text-pink-700 border-pink-200';
      case 'Audio y Video': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Cliente': return 'bg-cyan-50 text-cyan-800 border-cyan-200';
      case 'Admin': return 'bg-rose-50 text-rose-700 border-rose-200';
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Barra superior con gradiente Verde y Rosa de APC Digital Hub */}
      <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-pink-500" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Marca APC Digital Hub */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-pink-500 text-white flex items-center justify-center font-black text-lg tracking-wider shadow-sm shadow-emerald-500/20 border border-pink-400/30">
              APC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-base tracking-tight">APC Digital Hub</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  Hub
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Aprobación de contenidos digitales</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Botón Panel Super Admin (Solo para Super Admin) */}
            {isSuperAdmin && onOpenSuperAdminPanel && (
              <button
                onClick={onOpenSuperAdminPanel}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-pink-600 hover:from-emerald-700 hover:to-pink-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                title="Abrir Panel de Super Administrador (Control Total)"
              >
                <Crown className="w-3.5 h-3.5 fill-white text-white" />
                <span>Panel Super Admin</span>
              </button>
            )}

            {/* Selector de Perfil Rápido - EXCLUSIVO PARA SUPER ADMIN */}
            {isSuperAdmin && (
              <div className="flex items-center gap-2">
                <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1">
                  <label htmlFor="user-select" className="text-xs font-semibold text-slate-500 px-2 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden md:inline font-bold text-slate-700">Simular Perfil:</span>
                  </label>
                  <select
                    id="user-select"
                    className="text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-md py-1.5 pl-2 pr-7 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    value={currentUser.id}
                    onChange={(e) => {
                      const target = allUsers.find(u => u.id === e.target.value);
                      if (target) onSwitchUser(target);
                    }}
                  >
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        [{u.role}] {u.name} {u.id === authenticatedUser.id ? '★ (Super Admin)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {isSimulating && (
                  <button
                    onClick={onExitSimulation}
                    className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-900 border border-pink-200 font-extrabold text-xs transition-colors cursor-pointer shadow-2xs"
                    title="Salir de la simulación y regresar a la vista de Super Admin"
                  >
                    <Crown className="w-3.5 h-3.5 text-pink-600 fill-pink-500" />
                    <span>Salir de Simulación</span>
                  </button>
                )}
              </div>
            )}

            {/* Usuario Actual */}
            <div className="hidden lg:flex items-center gap-2.5 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                {currentUser.avatar ? (
                  <img 
                    src={currentUser.avatar} 
                    alt={currentUser.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  currentUser.name.charAt(0)
                )}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-800 leading-none">{currentUser.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-semibold flex items-center gap-1 ${getRoleBadgeStyle(currentUser.role)}`}>
                    {getRoleIcon(currentUser.role)}
                    {currentUser.role}
                  </span>
                </div>
                {currentUser.role === 'Cliente' && clientName ? (
                  <span className="text-[11px] text-cyan-700 font-medium">{clientName}</span>
                ) : isSimulating ? (
                  <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                    <Crown className="w-2.5 h-2.5 fill-amber-500" />
                    <span>Simulación Super Admin</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500">{currentUser.username}</span>
                )}
              </div>
            </div>

            {/* Salir */}
            <button
              onClick={onLogout}
              title="Cerrar sesión"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
