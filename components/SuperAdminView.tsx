import React, { useState, useMemo } from 'react';
import { 
  User, Client, ODT, Post, UserRole, UserPermissions, PostStatus 
} from '../types';
import { getDefaultPermissions } from '../services/odtService';
import { 
  Crown, Users, Building2, Layers, FileText, Plus, Search, Edit3, Trash2, 
  CheckCircle2, XCircle, ShieldCheck, ShieldAlert, Key, Sparkles, Filter, 
  Eye, ArrowRight, UserCheck, Stethoscope, CheckSquare, Palette, Video, 
  ExternalLink, Lock, Unlock, AlertTriangle, RefreshCw
} from 'lucide-react';

interface SuperAdminViewProps {
  currentUser: User;
  users: User[];
  clients: Client[];
  odts: ODT[];
  posts: Post[];
  onSaveUser: (user: User) => void;
  onDeleteUser: (userId: string, action: 'reassign' | 'cascade' | 'vacant', reassignToId?: string) => void;
  onSaveClient: (client: Client) => void;
  onDeleteClient: (clientId: string) => void;
  onSaveOdt: (odt: ODT) => void;
  onDeleteOdt: (odtId: string) => void;
  onSavePost: (post: Post) => void;
  onDeletePost: (postId: string) => void;
  onSelectPost: (post: Post) => void;
  onOpenCreateOdt: () => void;
  onOpenCreatePost: (odt: ODT) => void;
  onSwitchUser: (user: User) => void;
  onSuperApprovePost: (post: Post) => void;
  onOpenIntervention: (post: Post) => void;
  onSelectRoleView: (role: UserRole) => void;
}

export const SuperAdminView: React.FC<SuperAdminViewProps> = ({
  currentUser,
  users,
  clients,
  odts,
  posts,
  onSaveUser,
  onDeleteUser,
  onSaveClient,
  onDeleteClient,
  onSaveOdt,
  onDeleteOdt,
  onSavePost,
  onDeletePost,
  onSelectPost,
  onOpenCreateOdt,
  onOpenCreatePost,
  onSwitchUser,
  onSuperApprovePost,
  onOpenIntervention,
  onSelectRoleView,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'clients' | 'odts' | 'posts' | 'views'>('users');
  
  // Filtros de usuarios
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');

  // Modal de Usuario
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState<Partial<User>>({});
  const [userPermissions, setUserPermissions] = useState<UserPermissions>(getDefaultPermissions('Super Admin'));

  // Modal de Cliente
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientFormData, setClientFormData] = useState<Partial<Client>>({});

  // Offboarding states for user deletions
  const [offboardingUser, setOffboardingUser] = useState<User | null>(null);
  const [offboardAction, setOffboardAction] = useState<'reassign' | 'cascade' | 'vacant'>('reassign');
  const [offboardReassignToId, setOffboardReassignToId] = useState<string>('');

  // Custom confirm modal state to replace blocked window.confirm in iframe sandbox
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Filtros de ODTs y Posts
  const [odtSearch, setOdtSearch] = useState('');
  const [postSearch, setPostSearch] = useState('');
  const [postStatusFilter, setPostStatusFilter] = useState('ALL');
  const [postClientFilter, setPostClientFilter] = useState('ALL');

  // Métricas rápidas
  const metrics = useMemo(() => {
    return {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.isActive !== false).length,
      totalClients: clients.length,
      totalOdts: odts.length,
      activeOdts: odts.filter(o => o.estadoGeneral !== 'Completado' && o.estadoGeneral !== 'Pausado').length,
      totalPosts: posts.length,
      publishedPosts: posts.filter(p => p.publicado).length,
      pendingApproval: posts.filter(p => p.estado.includes('Aprobación') || p.estado.includes('Revisión')).length
    };
  }, [users, clients, odts, posts]);

  // Filtrado de usuarios
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase())) ||
        (u.cargo && u.cargo.toLowerCase().includes(userSearch.toLowerCase()));
      const matchRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
      return matchSearch && matchRole;
    });
  }, [users, userSearch, userRoleFilter]);

  // Filtrado de Posts
  const filteredPosts = useMemo(() => {
    return posts.filter(p => {
      const matchSearch = p.copyIn.toLowerCase().includes(postSearch.toLowerCase()) ||
        p.copyOut.toLowerCase().includes(postSearch.toLowerCase()) ||
        p.numeroInterno.includes(postSearch);
      const matchStatus = postStatusFilter === 'ALL' || p.estado === postStatusFilter;
      const matchClient = postClientFilter === 'ALL' || p.clientId === postClientFilter;
      return matchSearch && matchStatus && matchClient;
    });
  }, [posts, postSearch, postStatusFilter, postClientFilter]);

  // Manejo de abrir modal usuario
  const handleOpenUserModal = (userToEdit?: User) => {
    if (userToEdit) {
      setEditingUser(userToEdit);
      setUserFormData({ ...userToEdit });
      setUserPermissions(userToEdit.permissions || getDefaultPermissions(userToEdit.role));
    } else {
      const newId = `u-${Date.now()}`;
      setEditingUser(null);
      const defaultRole: UserRole = 'Community';
      setUserFormData({
        id: newId,
        name: '',
        username: '',
        role: defaultRole,
        email: '',
        phone: '',
        cargo: '',
        whatsapp: '',
        horarioAtencion: 'Lunes a Viernes, 9:00 AM - 6:00 PM',
        password: '123',
        isActive: true,
      });
      setUserPermissions(getDefaultPermissions(defaultRole));
    }
    setIsUserModalOpen(true);
  };

  const handleRoleChangeInModal = (role: UserRole) => {
    setUserFormData(prev => ({ ...prev, role }));
    setUserPermissions(getDefaultPermissions(role));
  };

  const handleSaveUserModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormData.name?.trim() || !userFormData.username?.trim()) {
      alert('Por favor completa el nombre y nombre de usuario.');
      return;
    }
    const finalUser: User = {
      id: userFormData.id || `u-${Date.now()}`,
      name: userFormData.name.trim(),
      username: userFormData.username.trim(),
      role: (userFormData.role as UserRole) || 'Community',
      clientId: userFormData.role === 'Cliente' ? userFormData.clientId : undefined,
      email: userFormData.email?.trim() || undefined,
      phone: userFormData.phone?.trim() || undefined,
      cargo: userFormData.cargo?.trim() || undefined,
      whatsapp: userFormData.whatsapp?.trim() || undefined,
      horarioAtencion: userFormData.horarioAtencion?.trim() || undefined,
      avatar: userFormData.avatar?.trim() || undefined,
      password: userFormData.password || '123',
      isActive: userFormData.isActive !== undefined ? userFormData.isActive : true,
      permissions: userPermissions,
    };
    onSaveUser(finalUser);
    setIsUserModalOpen(false);
  };

  // Manejo de abrir modal cliente
  const handleOpenClientModal = (clientToEdit?: Client) => {
    if (clientToEdit) {
      setEditingClient(clientToEdit);
      setClientFormData({ ...clientToEdit });
    } else {
      const exec = users.find(u => u.role === 'Ejecutivo') || users[0];
      setEditingClient(null);
      setClientFormData({
        id: `c-${Date.now()}`,
        name: '',
        industry: '',
        status: 'Activo',
        ejecutivoId: exec?.id || 'u2',
        ejecutivoName: exec?.name || 'Ana López',
        ejecutivoEmail: exec?.email,
        ejecutivoPhone: exec?.phone,
        clientUserIds: [],
        createdAt: new Date().toISOString().split('T')[0]
      });
    }
    setIsClientModalOpen(true);
  };

  const handleSaveClientModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientFormData.name?.trim()) {
      alert('Por favor ingresa el nombre de la empresa cliente.');
      return;
    }
    const selectedExec = users.find(u => u.id === clientFormData.ejecutivoId);
    const finalClient: Client = {
      id: clientFormData.id || `c-${Date.now()}`,
      name: clientFormData.name.trim(),
      industry: clientFormData.industry?.trim() || 'General',
      status: clientFormData.status || 'Activo',
      ejecutivoId: clientFormData.ejecutivoId || 'u2',
      ejecutivoName: selectedExec?.name || clientFormData.ejecutivoName || 'Ejecutivo Asignado',
      ejecutivoEmail: selectedExec?.email || clientFormData.ejecutivoEmail,
      ejecutivoPhone: selectedExec?.phone || clientFormData.ejecutivoPhone,
      ejecutivoCargo: selectedExec?.cargo || clientFormData.ejecutivoCargo,
      ejecutivoWhatsapp: selectedExec?.whatsapp || clientFormData.ejecutivoWhatsapp,
      clientUserIds: clientFormData.clientUserIds || [],
      createdAt: clientFormData.createdAt || new Date().toISOString().split('T')[0]
    };
    onSaveClient(finalClient);
    setIsClientModalOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Banner Superior Super Admin con Alto Contraste y Máxima Visibilidad */}
      <div 
        style={{ backgroundColor: '#0f172a' }}
        className="bg-slate-900 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 rounded-2xl p-6 sm:p-8 text-white shadow-2xl border-2 border-slate-700 relative overflow-hidden"
      >
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Crown className="w-80 h-80 text-amber-400" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400 text-slate-950 text-xs font-black tracking-wider shadow-sm border border-amber-300">
              <Crown className="w-4 h-4 fill-slate-950 text-slate-950" />
              <span>SUPER ADMIN HUB • CONTROL TOTAL & AUTORIDAD ABSOLUTA</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3 drop-shadow-sm">
              Consola Maestra de Administración
            </h1>
            
            <p className="text-slate-200 text-sm sm:text-base font-medium leading-relaxed max-w-3xl">
              Tienes facultades irrestrictas para crear, ver, modificar y autorizar cualquier elemento del sistema: 
              usuarios, perfiles, matriz de permisos granulares, clientes, ODTs y compuertas de aprobación.
            </p>
          </div>

          {/* Botones de Creación Rápida */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => handleOpenUserModal()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Nuevo Usuario</span>
            </button>
            <button
              onClick={() => handleOpenClientModal()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <Building2 className="w-4 h-4" />
              <span>Nuevo Cliente</span>
            </button>
            <button
              onClick={onOpenCreateOdt}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <Layers className="w-4 h-4" />
              <span>Nueva ODT</span>
            </button>
          </div>
        </div>

        {/* Tarjetas de Métricas del Sistema con Fondo Sólido y Alto Contraste */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-700/80">
          <div style={{ backgroundColor: '#1e293b' }} className="bg-slate-800 rounded-xl p-3.5 border border-slate-700 shadow-sm">
            <div className="text-slate-300 text-[11px] font-bold uppercase tracking-wider">Usuarios</div>
            <div className="text-2xl font-black text-amber-400 mt-1">{metrics.totalUsers}</div>
            <div className="text-xs text-slate-400 font-medium">{metrics.activeUsers} activos</div>
          </div>
          <div style={{ backgroundColor: '#1e293b' }} className="bg-slate-800 rounded-xl p-3.5 border border-slate-700 shadow-sm">
            <div className="text-slate-300 text-[11px] font-bold uppercase tracking-wider">Clientes</div>
            <div className="text-2xl font-black text-cyan-400 mt-1">{metrics.totalClients}</div>
            <div className="text-xs text-slate-400 font-medium">Cuentas activas</div>
          </div>
          <div style={{ backgroundColor: '#1e293b' }} className="bg-slate-800 rounded-xl p-3.5 border border-slate-700 shadow-sm">
            <div className="text-slate-300 text-[11px] font-bold uppercase tracking-wider">ODTs Totales</div>
            <div className="text-2xl font-black text-indigo-400 mt-1">{metrics.totalOdts}</div>
            <div className="text-xs text-slate-400 font-medium">{metrics.activeOdts} en curso</div>
          </div>
          <div style={{ backgroundColor: '#1e293b' }} className="bg-slate-800 rounded-xl p-3.5 border border-slate-700 shadow-sm">
            <div className="text-slate-300 text-[11px] font-bold uppercase tracking-wider">Posts Totales</div>
            <div className="text-2xl font-black text-white mt-1">{metrics.totalPosts}</div>
            <div className="text-xs text-slate-400 font-medium">En sistema</div>
          </div>
          <div style={{ backgroundColor: '#1e293b' }} className="bg-slate-800 rounded-xl p-3.5 border border-slate-700 shadow-sm">
            <div className="text-slate-300 text-[11px] font-bold uppercase tracking-wider">En Aprobación</div>
            <div className="text-2xl font-black text-rose-400 mt-1">{metrics.pendingApproval}</div>
            <div className="text-xs text-rose-300 font-medium">Por dictaminar</div>
          </div>
          <div style={{ backgroundColor: '#1e293b' }} className="bg-slate-800 rounded-xl p-3.5 border border-slate-700 shadow-sm">
            <div className="text-slate-300 text-[11px] font-bold uppercase tracking-wider">Publicados</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">{metrics.publishedPosts}</div>
            <div className="text-xs text-emerald-300 font-medium">En redes en vivo</div>
          </div>
        </div>
      </div>

      {/* Navegación por Pestañas */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4 text-amber-500" />
          <span>Gestión de Usuarios y Permisos ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('clients')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'clients'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4 text-cyan-500" />
          <span>Gestión de Clientes ({clients.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('odts')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'odts'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4 text-indigo-500" />
          <span>Control Global de ODTs ({odts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('posts')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'posts'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4 text-emerald-500" />
          <span>Supervisión y Bypass de Posts ({posts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('views')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'views'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Eye className="w-4 h-4 text-purple-500" />
          <span>Simulador de Vista por Rol</span>
        </button>
      </div>

      {/* PESTAÑA 1: GESTIÓN DE USUARIOS Y PERMISOS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar usuario por nombre, cargo, email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="ALL">Todos los Roles</option>
                <option value="Super Admin">Super Admin</option>
                <option value="Admin">Admin</option>
                <option value="Ejecutivo">Ejecutivo</option>
                <option value="Community">Community</option>
                <option value="Médico">Médico</option>
                <option value="Corrector">Corrector</option>
                <option value="Arte">Arte</option>
                <option value="Audio y Video">Audio y Video</option>
                <option value="Cliente">Cliente</option>
              </select>
            </div>

            <button
              onClick={() => handleOpenUserModal()}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Nuevo Usuario</span>
            </button>
          </div>

          {/* Tabla de Usuarios */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Usuario / Perfil</th>
                    <th className="py-3.5 px-4">Rol & Permisos</th>
                    <th className="py-3.5 px-4">Contacto & Cargo</th>
                    <th className="py-3.5 px-4">Asociación</th>
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => {
                    const isSuper = u.role === 'Super Admin';
                    const perms = u.permissions || getDefaultPermissions(u.role);
                    const client = u.clientId ? clients.find(c => c.id === u.clientId) : null;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-300 overflow-hidden flex items-center justify-center font-bold text-slate-700 shrink-0">
                              {u.avatar ? (
                                <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                              ) : (
                                u.name.charAt(0)
                              )}
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {isSuper && <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">@{u.username}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              isSuper 
                                ? 'bg-amber-100 text-amber-900 border-amber-300' 
                                : u.role === 'Cliente'
                                ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}>
                              {isSuper && <Crown className="w-3 h-3 text-amber-600 fill-amber-500" />}
                              {u.role}
                            </span>
                            
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {perms.canCreateOdt && <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">ODTs</span>}
                              {perms.canCreatePost && <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">Posts</span>}
                              {perms.canApproveAnyStage && <span className="text-[10px] px-1.5 py-0.2 bg-amber-50 text-amber-800 rounded font-semibold">Super-Aprobador</span>}
                              {perms.canPublishPost && <span className="text-[10px] px-1.5 py-0.2 bg-emerald-50 text-emerald-800 rounded">Publicar</span>}
                              {perms.canManageUsers && <span className="text-[10px] px-1.5 py-0.2 bg-purple-50 text-purple-800 rounded font-semibold">Admin Usuarios</span>}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="text-slate-800 font-medium">{u.cargo || 'Sin cargo asignado'}</div>
                          <div className="text-[11px] text-slate-500">{u.email || 'Sin email'}</div>
                          {u.phone && <div className="text-[10px] text-slate-400">{u.phone}</div>}
                        </td>

                        <td className="py-3.5 px-4">
                          {u.role === 'Cliente' ? (
                            client ? (
                              <span className="font-semibold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                                {client.name}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Sin empresa asignada</span>
                            )
                          ) : (
                            <span className="text-slate-600">Equipo APC Publicidad</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {u.isActive !== false ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[11px] font-bold border border-rose-200">
                              <XCircle className="w-3 h-3" /> Inactivo
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => onSwitchUser(u)}
                              title="Simular e iniciar sesión con este usuario"
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenUserModal(u)}
                              title="Editar Perfil y Permisos"
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {!isSuper && (
                              <button
                                onClick={() => {
                                  const alternativeUsers = users.filter(usr => usr.id !== u.id && usr.role !== 'Cliente');
                                  setOffboardReassignToId(alternativeUsers[0]?.id || '');
                                  setOffboardAction('reassign');
                                  setOffboardingUser(u);
                                }}
                                title="Eliminar Usuario"
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: GESTIÓN DE CLIENTES */}
      {activeTab === 'clients' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-slate-900">Directorio de Clientes y Empresas</h2>
              <p className="text-xs text-slate-500">Administra cuentas, ejecutivos asignados y usuarios con acceso de cliente.</p>
            </div>
            <button
              onClick={() => handleOpenClientModal()}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Cliente</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => {
              const clientOdts = odts.filter(o => o.clientId === client.id);
              const clientUsers = users.filter(u => u.clientId === client.id);

              return (
                <div key={client.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-cyan-300 transition-all space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-cyan-700 uppercase tracking-wider bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                        {client.industry || 'Empresa'}
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900 mt-1">{client.name}</h3>
                      <p className="text-xs text-slate-500 font-medium">Registrado: {client.createdAt}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenClientModal(client)}
                        className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                        title="Editar Cliente"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setConfirmModal({
                            isOpen: true,
                            title: '¿Eliminar Empresa / Cliente?',
                            message: `¿Estás seguro de que deseas eliminar la empresa "${client.name}"? Esta acción eliminará en cascada todas sus ODTs/Parrillas y todos sus posts asociados de forma irreversible.`,
                            onConfirm: () => {
                              onDeleteClient(client.id);
                              setConfirmModal(prev => ({ ...prev, isOpen: false }));
                            }
                          });
                        }}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="Eliminar Cliente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 text-xs space-y-1.5">
                    <div className="text-slate-500 font-semibold text-[11px]">Ejecutivo Responsable:</div>
                    <div className="font-bold text-slate-800">{client.ejecutivoName}</div>
                    {client.ejecutivoEmail && <div className="text-slate-500 text-[11px]">{client.ejecutivoEmail}</div>}
                    {client.ejecutivoPhone && <div className="text-slate-500 text-[11px]">{client.ejecutivoPhone}</div>}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <div>
                      <span className="font-bold text-slate-900">{clientOdts.length}</span> Parrillas / ODTs
                    </div>
                    <div>
                      <span className="font-bold text-cyan-700">{clientUsers.length}</span> Usuarios Asociados
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PESTAÑA 3: CONTROL GLOBAL DE ODTS */}
      {activeTab === 'odts' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar ODT por nombre, cliente, número..."
                value={odtSearch}
                onChange={(e) => setOdtSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <button
              onClick={onOpenCreateOdt}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Nueva ODT</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">ODT / Parrilla</th>
                    <th className="py-3.5 px-4">Cliente</th>
                    <th className="py-3.5 px-4">Equipo Asignado</th>
                    <th className="py-3.5 px-4">Posts</th>
                    <th className="py-3.5 px-4">Estado General</th>
                    <th className="py-3.5 px-4 text-right">Super Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {odts
                    .filter(o => o.nombreParrilla.toLowerCase().includes(odtSearch.toLowerCase()) || o.clientName.toLowerCase().includes(odtSearch.toLowerCase()) || o.numeroODT.includes(odtSearch))
                    .map((odt) => {
                      const odtPosts = posts.filter(p => p.odtId === odt.id);
                      return (
                        <tr key={odt.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-slate-900">{odt.nombreParrilla}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{odt.numeroODT} • {odt.mesPeriodo}</div>
                          </td>

                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {odt.clientName}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="text-[11px] space-y-0.5">
                              <div><span className="text-slate-400">CM:</span> <span className="font-semibold text-slate-800">{odt.communityName}</span></div>
                              <div><span className="text-slate-400">QA:</span> <span className="font-semibold text-slate-800">{odt.correctorName}</span></div>
                              {odt.medicoName && <div><span className="text-slate-400">Médico:</span> <span className="font-semibold text-slate-800">{odt.medicoName}</span></div>}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-slate-900">{odtPosts.length} posts</div>
                            <div className="text-[10px] text-slate-400">{odtPosts.filter(p => p.publicado).length} publicados</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <select
                              value={odt.estadoGeneral}
                              onChange={(e) => {
                                const newStatus = e.target.value as any;
                                onSaveOdt({ ...odt, estadoGeneral: newStatus });
                              }}
                              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                            >
                              <option value="En Creación">En Creación</option>
                              <option value="En Producción">En Producción</option>
                              <option value="En Aprobación">En Aprobación</option>
                              <option value="Listo para Publicar">Listo para Publicar</option>
                              <option value="Completado">Completado</option>
                              <option value="Pausado">Pausado</option>
                            </select>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => onOpenCreatePost(odt)}
                                title="Crear Post en esta ODT"
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Post</span>
                              </button>
                              <button
                                onClick={() => {
                                  setConfirmModal({
                                    isOpen: true,
                                    title: '¿Eliminar ODT / Parrilla?',
                                    message: `¿Estás seguro de que deseas eliminar la ODT "${odt.nombreParrilla}"? Esto eliminará también todas sus publicaciones y posts asociados de forma irreversible.`,
                                    onConfirm: () => {
                                      onDeleteOdt(odt.id);
                                      setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                    }
                                  });
                                }}
                                title="Eliminar ODT"
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 4: SUPERVISIÓN Y BYPASS DE POSTS */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar texto en copys o número..."
                  value={postSearch}
                  onChange={(e) => setPostSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <select
                value={postClientFilter}
                onChange={(e) => setPostClientFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="ALL">Todos los Clientes</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={postStatusFilter}
                onChange={(e) => setPostStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="Borrador">Borrador</option>
                <option value="Revisión Médica">Revisión Médica</option>
                <option value="Corrección de Copy">Corrección de Copy</option>
                <option value="Aprobación Copy Cliente">Aprobación Copy Cliente</option>
                <option value="Producción Arte">Producción Arte</option>
                <option value="Producción Audio/Video">Producción Audio/Video</option>
                <option value="Corrección Material">Corrección Material</option>
                <option value="Aprobación Material Cliente">Aprobación Material Cliente</option>
                <option value="Listo para Publicar">Listo para Publicar</option>
                <option value="Publicado">Publicado</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Post / Formato</th>
                    <th className="py-3.5 px-4">Contenido (Copy In / Out)</th>
                    <th className="py-3.5 px-4">Estado del Workflow</th>
                    <th className="py-3.5 px-4">Responsable Actual</th>
                    <th className="py-3.5 px-4 text-right">Supervisión Inmediata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPosts.map((post) => {
                    const odt = odts.find(o => o.id === post.odtId);
                    return (
                      <tr key={post.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-slate-900">Post #{post.numeroInterno}</div>
                          <div className="text-[11px] text-slate-500 font-medium">{post.redSocial} • {post.tipoMaterial}</div>
                          <div className="text-[10px] text-indigo-600 font-medium">{odt?.nombreParrilla || post.odtId}</div>
                        </td>

                        <td className="py-3.5 px-4 max-w-sm">
                          <div className="font-medium text-slate-800 line-clamp-1">
                            <span className="font-bold text-slate-900">In:</span> {post.copyIn || '(Sin texto aún)'}
                          </div>
                          <div className="text-slate-500 line-clamp-1 text-[11px]">
                            <span className="font-semibold text-slate-700">Out:</span> {post.copyOut || '(Sin texto aún)'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                            post.publicado 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                              : post.estado.includes('Aprobación') 
                              ? 'bg-amber-50 text-amber-800 border-amber-300' 
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}>
                            {post.estado}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{post.responsableActualName || 'Sin asignar'}</div>
                          <div className="text-[10px] text-slate-400">Área: {post.areaResponsable}</div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => onSelectPost(post)}
                              title="Ver Detalle y Editar"
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
                            >
                              Ver
                            </button>

                            {/* Super Aprobación Inmediata */}
                            {!post.publicado && post.estado !== 'Listo para Publicar' && (
                              <button
                                onClick={() => onSuperApprovePost(post)}
                                title="Super-Aprobación Inmediata (Avanzar Etapa)"
                                className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer shadow-xs"
                              >
                                <Crown className="w-3 h-3 fill-slate-950" />
                                <span>Aprobar</span>
                              </button>
                            )}

                            {/* Intervención de Emergencia */}
                            <button
                              onClick={() => onOpenIntervention(post)}
                              title="Forzar estado manualmente"
                              className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                            >
                              <ShieldAlert className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => {
                                setConfirmModal({
                                  isOpen: true,
                                  title: '¿Eliminar Publicación / Post?',
                                  message: `¿Estás seguro de que deseas eliminar el post #${post.numeroInterno} (${post.redSocial})? Esta acción es irreversible.`,
                                  onConfirm: () => {
                                    onDeletePost(post.id);
                                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                  }
                                });
                              }}
                              title="Eliminar Post"
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 5: SIMULADOR DE VISTA POR ROL */}
      {activeTab === 'views' && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Simulador de Experiencia por Rol</h2>
              <p className="text-xs text-slate-500">
                Como Super Administrador, puedes ver la interfaz operativa de cada perfil de trabajo para auditar 
                lo que ve cada miembro del equipo y clientes, conservando tu botón de regreso en la barra superior.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              <button
                onClick={() => onSelectRoleView('Ejecutivo')}
                className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-left transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 group-hover:text-indigo-700">Vista Ejecutivo</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Control de cuentas, creación de ODTs, envío a cliente y supervisión.</p>
                </div>
              </button>

              <button
                onClick={() => onSelectRoleView('Community')}
                className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 text-left transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 group-hover:text-emerald-700">Vista Community Manager</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Redacción de copys, creación de posts, ajustes y publicación en vivo.</p>
                </div>
              </button>

              <button
                onClick={() => onSelectRoleView('Médico')}
                className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 text-left transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 group-hover:text-blue-700">Vista Médico Revisor</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Validación científica y regulatoria COFEPRIS/FDA de copys y artes.</p>
                </div>
              </button>

              <button
                onClick={() => onSelectRoleView('Corrector')}
                className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 hover:border-purple-400 hover:bg-purple-50/40 text-left transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 group-hover:text-purple-700">Vista Corrector / QA</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Control de ortografía, estilo de marca y revisión de materiales.</p>
                </div>
              </button>

              <button
                onClick={() => onSelectRoleView('Arte')}
                className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 hover:border-pink-400 hover:bg-pink-50/40 text-left transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center shrink-0">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 group-hover:text-pink-700">Vista Producción (Arte / Video)</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Entrega de materiales finales alojados en OneDrive/Google Drive.</p>
                </div>
              </button>

              <button
                onClick={() => onSelectRoleView('Cliente')}
                className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 hover:border-cyan-400 hover:bg-cyan-50/40 text-left transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 group-hover:text-cyan-700">Vista Portal Cliente</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Aprobación condensada por parrilla y notas blindadas sin fuga interna.</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR USUARIO & PERMISOS */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200">
            
            {/* Header del modal */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {editingUser ? `Editar Perfil & Permisos: ${editingUser.name}` : 'Crear Nuevo Usuario'}
                  </h3>
                  <p className="text-xs text-slate-500">Configura datos personales, rol y matriz de privilegios en el sistema.</p>
                </div>
              </div>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido scrolleable */}
            <form onSubmit={handleSaveUserModal} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              
              {/* Sección 1: Datos Generales */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-200">
                  1. Información de Perfil & Acceso
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      value={userFormData.name || ''}
                      onChange={(e) => setUserFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ej. Laura Gómez"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nombre de Usuario (Login) *</label>
                    <input
                      type="text"
                      required
                      value={userFormData.username || ''}
                      onChange={(e) => setUserFormData(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="Ej. laura.gomez"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Contraseña de Acceso *</label>
                    <input
                      type="text"
                      required
                      value={userFormData.password || ''}
                      onChange={(e) => setUserFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Ej. 123 o contraseña segura"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Rol Operativo *</label>
                    <select
                      value={userFormData.role || 'Community'}
                      onChange={(e) => handleRoleChangeInModal(e.target.value as UserRole)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg font-semibold bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    >
                      <option value="Super Admin">👑 Super Admin (Control Total)</option>
                      <option value="Admin">Admin</option>
                      <option value="Ejecutivo">Ejecutivo de Cuentas</option>
                      <option value="Community">Community Manager</option>
                      <option value="Médico">Médico Revisor</option>
                      <option value="Corrector">Corrector / QA</option>
                      <option value="Arte">Diseñador de Arte</option>
                      <option value="Audio y Video">Editor de Audio y Video</option>
                      <option value="Cliente">Cliente (Externo)</option>
                    </select>
                  </div>

                  {userFormData.role === 'Cliente' && (
                    <div>
                      <label className="block font-bold text-cyan-800 mb-1">Empresa Cliente Asociada *</label>
                      <select
                        value={userFormData.clientId || ''}
                        onChange={(e) => setUserFormData(prev => ({ ...prev, clientId: e.target.value }))}
                        className="w-full px-3 py-2 border border-cyan-300 rounded-lg font-semibold bg-cyan-50/50 text-cyan-900 focus:ring-2 focus:ring-cyan-500 focus:outline-hidden"
                      >
                        <option value="">Selecciona Empresa Cliente...</option>
                        {clients.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Cargo / Puesto</label>
                    <input
                      type="text"
                      value={userFormData.cargo || ''}
                      onChange={(e) => setUserFormData(prev => ({ ...prev, cargo: e.target.value }))}
                      placeholder="Ej. Content Creator Senior"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      value={userFormData.email || ''}
                      onChange={(e) => setUserFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="usuario@apcpublicidad.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Enlace Imagen de Perfil (URL Foto)</label>
                    <input
                      type="text"
                      value={userFormData.avatar || ''}
                      onChange={(e) => setUserFormData(prev => ({ ...prev, avatar: e.target.value }))}
                      placeholder="Ej. https://images.unsplash.com/photo-... o enlace público"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Teléfono / Celular</label>
                    <input
                      type="text"
                      value={userFormData.phone || ''}
                      onChange={(e) => setUserFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+52 (55) 1234-5678"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">WhatsApp</label>
                    <input
                      type="text"
                      value={userFormData.whatsapp || ''}
                      onChange={(e) => setUserFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                      placeholder="+525512345678"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Horario de Atención</label>
                    <input
                      type="text"
                      value={userFormData.horarioAtencion || ''}
                      onChange={(e) => setUserFormData(prev => ({ ...prev, horarioAtencion: e.target.value }))}
                      placeholder="Lunes a Viernes, 9:00 AM - 6:00 PM"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Estado de Cuenta</label>
                    <div className="flex items-center gap-4 mt-2">
                      <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="isActive"
                          checked={userFormData.isActive !== false}
                          onChange={() => setUserFormData(prev => ({ ...prev, isActive: true }))}
                        />
                        <span>Activo</span>
                      </label>
                      <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="isActive"
                          checked={userFormData.isActive === false}
                          onChange={() => setUserFormData(prev => ({ ...prev, isActive: false }))}
                        />
                        <span>Inactivo / Suspendido</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección 2: Matriz de Permisos Granulares */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                      2. Matriz de Permisos Granulares
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Personaliza exactamente qué facultades tiene este usuario en cada fase operativa.
                    </p>
                  </div>

                  {/* Acciones de Preset */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setUserPermissions(getDefaultPermissions((userFormData.role as UserRole) || 'Community'))}
                      className="text-[10px] text-indigo-600 hover:underline font-bold"
                    >
                      Por defecto del Rol
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setUserPermissions(getDefaultPermissions('Super Admin'))}
                      className="text-[10px] text-amber-600 hover:underline font-bold"
                    >
                      Dar Todos
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-amber-400">
                    <input
                      type="checkbox"
                      checked={userPermissions.canCreateOdt}
                      onChange={(e) => setUserPermissions(prev => ({ ...prev, canCreateOdt: e.target.checked }))}
                      className="rounded text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <div className="font-bold text-slate-800">Crear ODTs / Parrillas</div>
                      <div className="text-[10px] text-slate-500">Permite abrir nuevas órdenes de trabajo</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-amber-400">
                    <input
                      type="checkbox"
                      checked={userPermissions.canEditOdt}
                      onChange={(e) => setUserPermissions(prev => ({ ...prev, canEditOdt: e.target.checked }))}
                      className="rounded text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <div className="font-bold text-slate-800">Editar ODTs</div>
                      <div className="text-[10px] text-slate-500">Modificar briefs, fechas y equipos asignados</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-amber-400">
                    <input
                      type="checkbox"
                      checked={userPermissions.canDeleteOdt}
                      onChange={(e) => setUserPermissions(prev => ({ ...prev, canDeleteOdt: e.target.checked }))}
                      className="rounded text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <div className="font-bold text-slate-800">Eliminar ODTs</div>
                      <div className="text-[10px] text-slate-500">Borrar parrillas completas del sistema</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-amber-400">
                    <input
                      type="checkbox"
                      checked={userPermissions.canCreatePost}
                      onChange={(e) => setUserPermissions(prev => ({ ...prev, canCreatePost: e.target.checked }))}
                      className="rounded text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <div className="font-bold text-slate-800">Crear Nuevos Posts</div>
                      <div className="text-[10px] text-slate-500">Añadir publicaciones dentro de una ODT</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-amber-400">
                    <input
                      type="checkbox"
                      checked={userPermissions.canEditAnyPost}
                      onChange={(e) => setUserPermissions(prev => ({ ...prev, canEditAnyPost: e.target.checked }))}
                      className="rounded text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <div className="font-bold text-slate-800">Editar Cualquier Post</div>
                      <div className="text-[10px] text-slate-500">Modificar copys y enlaces en cualquier fase</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-amber-400">
                    <input
                      type="checkbox"
                      checked={userPermissions.canDeletePost}
                      onChange={(e) => setUserPermissions(prev => ({ ...prev, canDeletePost: e.target.checked }))}
                      className="rounded text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <div className="font-bold text-slate-800">Eliminar / Cancelar Posts</div>
                      <div className="text-[10px] text-slate-500">Remover publicaciones de una parrilla</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-amber-400">
                    <input
                      type="checkbox"
                      checked={userPermissions.canApproveAnyStage}
                      onChange={(e) => setUserPermissions(prev => ({ ...prev, canApproveAnyStage: e.target.checked }))}
                      className="rounded text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <div className="font-bold text-amber-800">Super-Aprobación de Etapas</div>
                      <div className="text-[10px] text-slate-500">Dictaminar cualquier revisión sin restricción</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-amber-400">
                    <input
                      type="checkbox"
                      checked={userPermissions.canBypassWorkflow}
                      onChange={(e) => setUserPermissions(prev => ({ ...prev, canBypassWorkflow: e.target.checked }))}
                      className="rounded text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <div className="font-bold text-amber-800">Intervención / Salto de Flujo</div>
                      <div className="text-[10px] text-slate-500">Forzar cualquier estado a discreción</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-amber-400">
                    <input
                      type="checkbox"
                      checked={userPermissions.canPublishPost}
                      onChange={(e) => setUserPermissions(prev => ({ ...prev, canPublishPost: e.target.checked }))}
                      className="rounded text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <div className="font-bold text-slate-800">Publicar en Redes Sociales</div>
                      <div className="text-[10px] text-slate-500">Marcar como Publicado y registrar link</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-amber-400">
                    <input
                      type="checkbox"
                      checked={userPermissions.canManageUsers}
                      onChange={(e) => setUserPermissions(prev => ({ ...prev, canManageUsers: e.target.checked }))}
                      className="rounded text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <div className="font-bold text-purple-800">Administrar Usuarios</div>
                      <div className="text-[10px] text-slate-500">Crear, editar y configurar permisos</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-amber-400">
                    <input
                      type="checkbox"
                      checked={userPermissions.canManageClients}
                      onChange={(e) => setUserPermissions(prev => ({ ...prev, canManageClients: e.target.checked }))}
                      className="rounded text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <div className="font-bold text-cyan-800">Administrar Clientes</div>
                      <div className="text-[10px] text-slate-500">Alta y modificación de empresas clientes</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-amber-400">
                    <input
                      type="checkbox"
                      checked={userPermissions.canViewInternalComments}
                      onChange={(e) => setUserPermissions(prev => ({ ...prev, canViewInternalComments: e.target.checked }))}
                      className="rounded text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <div className="font-bold text-slate-800">Ver Comentarios Internos</div>
                      <div className="text-[10px] text-slate-500">Acceso a notas técnicas confidenciales de APC</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                  <span>Guardar Usuario y Permisos</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR CLIENTE */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {editingClient ? `Editar Cliente: ${editingClient.name}` : 'Crear Nueva Empresa Cliente'}
                  </h3>
                  <p className="text-xs text-slate-500">Datos corporativos y ejecutivo asignado.</p>
                </div>
              </div>
              <button
                onClick={() => setIsClientModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClientModal} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre Comercial de la Empresa *</label>
                <input
                  type="text"
                  required
                  value={clientFormData.name || ''}
                  onChange={(e) => setClientFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej. Laboratorios Sanitas Pharma"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Industria / Sector</label>
                <input
                  type="text"
                  value={clientFormData.industry || ''}
                  onChange={(e) => setClientFormData(prev => ({ ...prev, industry: e.target.value }))}
                  placeholder="Ej. Farmacéutica & Salud"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ejecutivo de Cuentas Asignado</label>
                <select
                  value={clientFormData.ejecutivoId || ''}
                  onChange={(e) => {
                    const exec = users.find(u => u.id === e.target.value);
                    setClientFormData(prev => ({
                      ...prev,
                      ejecutivoId: e.target.value,
                      ejecutivoName: exec?.name || '',
                      ejecutivoEmail: exec?.email,
                      ejecutivoPhone: exec?.phone
                    }));
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-semibold bg-white focus:ring-2 focus:ring-cyan-500 focus:outline-hidden"
                >
                  {users.filter(u => u.role === 'Ejecutivo' || u.role === 'Super Admin' || u.role === 'Admin').map(u => (
                    <option key={u.id} value={u.id}>[{u.role}] {u.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-black rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Guardar Empresa Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reusable, Sandbox-Friendly Custom Confirm Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 className="text-sm font-black text-slate-900">
                  {confirmModal.title || 'Confirmar Acción'}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>
            </div>
            
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer select-none"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md transition-colors cursor-pointer select-none"
              >
                Confirmar Eliminación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE BAJA DE PERSONAL Y REASIGNACIÓN (OFFBOARDING) */}
      {offboardingUser && (() => {
        const assignedClients = clients.filter(c => c.ejecutivoId === offboardingUser.id);
        const assignedOdts = odts.filter(o => 
          o.communityId === offboardingUser.id || 
          o.disenadorId === offboardingUser.id || 
          o.correctorId === offboardingUser.id || 
          o.medicoId === offboardingUser.id || 
          o.editorAvId === offboardingUser.id
        );
        const assignedPosts = posts.filter(p => p.responsableActualId === offboardingUser.id);
        const totalAssignments = assignedClients.length + assignedOdts.length + assignedPosts.length;
        const alternativeUsers = users.filter(u => u.id !== offboardingUser.id && u.role !== 'Cliente' && u.isActive !== false);

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold shadow-sm">
                    <UserCheck className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Baja de Personal e Integridad Operativa
                    </h3>
                    <p className="text-[11px] text-slate-500">Plan de sucesión y reasignación de cuentas.</p>
                  </div>
                </div>
                <button
                  onClick={() => setOffboardingUser(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5 text-xs text-slate-600">
                <p className="leading-relaxed">
                  Estás a punto de dar de baja al usuario <strong>{offboardingUser.name}</strong> ({offboardingUser.role}) de la base de datos de APC Publicidad.
                </p>

                {totalAssignments > 0 ? (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <AlertTriangle className="w-4.5 h-4.5 text-amber-600" />
                      <span>Registros y asignaciones activas detectadas:</span>
                    </div>
                    <ul className="list-disc pl-5 space-y-1 font-medium text-amber-800">
                      {assignedClients.length > 0 && <li><strong>{assignedClients.length}</strong> Cliente(s) bajo su cuenta de Ejecutivo.</li>}
                      {assignedOdts.length > 0 && <li><strong>{assignedOdts.length}</strong> ODTs / Parrillas activas asignadas en su equipo.</li>}
                      {assignedPosts.length > 0 && <li><strong>{assignedPosts.length}</strong> Publicación(es) bajo su responsabilidad operativa actual.</li>}
                    </ul>
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 font-medium">
                    ✨ Este usuario no tiene asignaciones activas en clientes, ODTs o posts. Se puede eliminar de forma totalmente segura e inmediata.
                  </div>
                )}

                {totalAssignments > 0 && (
                  <div className="space-y-4 pt-1">
                    <span className="font-bold text-slate-800 block border-b border-slate-100 pb-2">Selecciona un método de offboarding:</span>
                    
                    <div className="space-y-3">
                      {/* Opción 1: Reasignar todo */}
                      <label className="flex items-start gap-3 p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl cursor-pointer transition-colors">
                        <input
                          type="radio"
                          name="offboardAction"
                          checked={offboardAction === 'reassign'}
                          onChange={() => setOffboardAction('reassign')}
                          className="mt-1 h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500 focus:outline-hidden"
                        />
                        <div className="space-y-1 flex-1">
                          <span className="font-bold text-slate-800 block">Reasignar cuentas y trabajo a otro usuario (Recomendado)</span>
                          <span className="text-slate-500 text-[11px] block leading-relaxed">
                            Transfiere todos sus clientes, ODTs y tareas activas a otro especialista para garantizar la continuidad bajo ISO 9001.
                          </span>
                          
                          {offboardAction === 'reassign' && (
                            <div className="pt-2">
                              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Usuario que asume las cuentas:</label>
                              {alternativeUsers.length > 0 ? (
                                <select
                                  value={offboardReassignToId}
                                  onChange={(e) => setOffboardReassignToId(e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 focus:outline-hidden text-xs"
                                >
                                  {alternativeUsers.map(usr => (
                                    <option key={usr.id} value={usr.id}>[{usr.role}] {usr.name}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-rose-500 italic block text-[11px]">No hay otros usuarios disponibles para asumir estas cuentas. Agrega un usuario de relevo primero.</span>
                              )}
                            </div>
                          )}
                        </div>
                      </label>

                      {/* Opción 2: Dejar vacante */}
                      <label className="flex items-start gap-3 p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl cursor-pointer transition-colors">
                        <input
                          type="radio"
                          name="offboardAction"
                          checked={offboardAction === 'vacant'}
                          onChange={() => setOffboardAction('vacant')}
                          className="mt-1 h-4 w-4 text-slate-600 border-slate-300 focus:ring-slate-500 focus:outline-hidden"
                        />
                        <div className="space-y-1 flex-1">
                          <span className="font-bold text-slate-800 block">Mantener registros y dejar vacante ("Sin Asignar")</span>
                          <span className="text-slate-500 text-[11px] block leading-relaxed">
                            Mantiene las ODTs, clientes y posts intactos, pero los reetiqueta temporalmente como "Sin Asignar" para decidir el relevo más tarde.
                          </span>
                        </div>
                      </label>

                      {/* Opción 3: Eliminar todo en cascada */}
                      <label className="flex items-start gap-3 p-3 bg-rose-50/20 hover:bg-rose-50/40 border border-rose-100 rounded-xl cursor-pointer transition-colors">
                        <input
                          type="radio"
                          name="offboardAction"
                          checked={offboardAction === 'cascade'}
                          onChange={() => setOffboardAction('cascade')}
                          className="mt-1 h-4 w-4 text-rose-600 border-rose-300 focus:ring-rose-500 focus:outline-hidden"
                        />
                        <div className="space-y-1 flex-1">
                          <span className="font-bold text-rose-800 block">Eliminar TODO lo asociado en cascada (¡Peligro!)</span>
                          <span className="text-rose-600/80 text-[11px] block leading-relaxed">
                            Elimina permanentemente a este usuario y purga de la base de datos todos sus clientes, ODTs/Parrillas y sus posts creados. ¡Acción irreversible!
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOffboardingUser(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (offboardAction === 'reassign' && !offboardReassignToId && totalAssignments > 0) {
                      alert('Por favor selecciona un usuario de reemplazo.');
                      return;
                    }
                    onDeleteUser(offboardingUser.id, offboardAction, offboardAction === 'reassign' ? offboardReassignToId : undefined);
                    setOffboardingUser(null);
                  }}
                  className={`px-5 py-2 font-black rounded-xl shadow-md transition-all cursor-pointer ${
                    offboardAction === 'cascade' && totalAssignments > 0
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {totalAssignments === 0 ? 'Eliminar Usuario' : 'Confirmar Acción de Baja'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};
