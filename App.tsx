import React, { useState, useEffect, useMemo } from 'react';
import { User, Client, ODT, Post, PostStatus, PostComment, PostIntervention, UserRole, MaterialType, PriorityLevel, PostPublicationLink } from './types';
import { 
  loadInitialData, getStoredUsers, getStoredClients, saveStoredClients, 
  getStoredOdts, saveStoredOdts, getStoredPosts, saveStoredPosts,
  getNowTimestamp, createIntervention, createApproval, isAudioVisual,
  createParrillaApproval, saveStoredUsers, duplicatePost, recyclePost
} from './services/odtService';
import { Navbar } from './components/Navbar';
import { EjecutivoView } from './components/EjecutivoView';
import { CommunityView } from './components/CommunityView';
import { MedicoView } from './components/MedicoView';
import { CorrectorView } from './components/CorrectorView';
import { ProduccionView } from './components/ProduccionView';
import { ClienteView } from './components/ClienteView';
import { SuperAdminView } from './components/SuperAdminView';
import { ApprovalModal } from './components/ApprovalModal';
import { PublishPostModal, PublishPostModalData } from './components/PublishPostModal';
import { CreateOdtModal } from './components/CreateOdtModal';
import { CreatePostModal } from './components/CreatePostModal';
import { InterventionModal } from './components/InterventionModal';
import { PostDetailModal } from './components/PostDetailModal';
import { Crown, ArrowLeft } from 'lucide-react';
import { dbSave, dbDelete, dbListen } from './services/firebase';

export const App: React.FC = () => {
  // Inicialización de datos locales y conexión con Firebase Firestore
  useEffect(() => {
    loadInitialData();

    let isSubscribed = true;
    let unsubUsers = () => {};
    let unsubClients = () => {};
    let unsubOdts = () => {};
    let unsubPosts = () => {};

    const initFirebaseSync = async () => {
      try {
        // Real-time synchronization directly with production database without automatic seeding
        if (!isSubscribed) return;

        // Establish real-time live synchronization listeners
        unsubUsers = dbListen('users', (loadedUsers) => {
          if (loadedUsers.length > 0 && isSubscribed) {
            setUsers(loadedUsers);
            saveStoredUsers(loadedUsers);
          }
        });

        unsubClients = dbListen('clients', (loadedClients) => {
          if (loadedClients.length > 0 && isSubscribed) {
            setClients(loadedClients);
            saveStoredClients(loadedClients);
          }
        });

        unsubOdts = dbListen('odts', (loadedOdts) => {
          if (loadedOdts.length > 0 && isSubscribed) {
            setOdts(loadedOdts);
            saveStoredOdts(loadedOdts);
          }
        });

        unsubPosts = dbListen('posts', (loadedPosts) => {
          if (loadedPosts.length > 0 && isSubscribed) {
            setPosts(loadedPosts);
            saveStoredPosts(loadedPosts);
          }
        });
      } catch (error) {
        console.error("Failed to initialize or synchronize Firebase:", error);
      }
    };

    initFirebaseSync();

    return () => {
      isSubscribed = false;
      unsubUsers();
      unsubClients();
      unsubOdts();
      unsubPosts();
    };
  }, []);

  const [users, setUsers] = useState<User[]>(() => getStoredUsers());
  const [clients, setClients] = useState<Client[]>(() => getStoredClients());
  const [odts, setOdts] = useState<ODT[]>(() => getStoredOdts());
  const [posts, setPosts] = useState<Post[]>(() => getStoredPosts());

  // Real login and user credentials state
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('apc_is_logged_in') === 'true';
  });
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Usuario autenticado originalmente por login
  const [authenticatedUser, setAuthenticatedUser] = useState<User>(() => {
    const loaded = getStoredUsers();
    const savedUserId = localStorage.getItem('apc_logged_user_id');
    if (savedUserId) {
      const matched = loaded.find(u => u.id === savedUserId);
      if (matched) return matched;
    }
    return loaded[0] || {
      id: 'u-jesus',
      name: 'Jesús Hernández Saure',
      role: 'Super Admin',
      email: 'jesus.hernandez@apcpublicidad.com',
      username: 'jesus.apc'
    };
  });

  // Usuario activo en la interfaz (solo Super Admin puede simular a otro usuario)
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const loaded = getStoredUsers();
    const savedUserId = localStorage.getItem('apc_logged_user_id');
    const matchedAuth = savedUserId ? loaded.find(u => u.id === savedUserId) : loaded[0];
    const authUser = matchedAuth || loaded[0];
    
    // Si el usuario autenticado es Super Admin, puede tener un perfil simulado
    if (authUser?.role === 'Super Admin') {
      const simulatedId = localStorage.getItem('apc_simulated_user_id');
      if (simulatedId) {
        const matchedSim = loaded.find(u => u.id === simulatedId);
        if (matchedSim) return matchedSim;
      }
    }
    return authUser || {
      id: 'u-jesus',
      name: 'Jesús Hernández Saure',
      role: 'Super Admin',
      email: 'jesus.hernandez@apcpublicidad.com',
      username: 'jesus.apc'
    };
  });

  // Vista simulada por rol exclusiva para Super Admin
  const [superAdminRoleView, setSuperAdminRoleView] = useState<UserRole | null>(null);

  // Verificación estricta de privilegios de simulación (SOLO SUPER ADMIN)
  const isSuperAdmin = authenticatedUser.role === 'Super Admin';
  const isSimulating = isSuperAdmin && (currentUser.id !== authenticatedUser.id || superAdminRoleView !== null);

  // Navegación en vista de ejecutivo
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedOdtId, setSelectedOdtId] = useState<string | null>(null);

  // Modales
  const [activeModalPost, setActiveModalPost] = useState<Post | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailInitialEditMode, setDetailInitialEditMode] = useState(false);
  
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);
  const [approvalType, setApprovalType] = useState<'medico' | 'correccion_copy' | 'correccion_material' | 'medico_material' | 'aprobacion_interna_final' | 'cliente_copy' | 'cliente_material' | 'esperando_ejecutivo'>('medico');

  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [isInterventionOpen, setIsInterventionOpen] = useState(false);
  const [isCreateOdtOpen, setIsCreateOdtOpen] = useState(false);
  const [createOdtInitialClientId, setCreateOdtInitialClientId] = useState<string | undefined>();
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [createPostOdt, setCreatePostOdt] = useState<ODT | null>(null);

  // Lista de empresas/clientes autorizados para el usuario actual (soporte multi-empresa)
  const authorizedClientsForUser = useMemo(() => {
    if (currentUser.role !== 'Cliente') return clients;
    const allowedIds = new Set<string>();
    if (Array.isArray(currentUser.clientIds) && currentUser.clientIds.length > 0) {
      currentUser.clientIds.forEach(id => allowedIds.add(id));
    }
    if (currentUser.clientId) {
      allowedIds.add(currentUser.clientId);
    }
    if (allowedIds.size === 0) return clients; // fallback seguro si no tiene empresas asignadas
    const list = clients.filter(c => allowedIds.has(c.id));
    return list.length > 0 ? list : clients;
  }, [currentUser, clients]);

  // Cliente activo para la vista del usuario
  const currentClient = useMemo(() => {
    if (currentUser.role !== 'Cliente') return null;
    // 1. Si el usuario ha seleccionado una empresa específica y está autorizada
    if (selectedClientId && authorizedClientsForUser.some(c => c.id === selectedClientId)) {
      return clients.find(c => c.id === selectedClientId) || null;
    }
    // 2. Si el usuario tiene una empresa principal por defecto y está autorizada
    if (currentUser.clientId && authorizedClientsForUser.some(c => c.id === currentUser.clientId)) {
      return clients.find(c => c.id === currentUser.clientId) || null;
    }
    // 3. Primera empresa de las autorizadas
    return authorizedClientsForUser[0] || clients[0] || null;
  }, [currentUser, clients, selectedClientId, authorizedClientsForUser]);

  // Sincronización con persistencia en LocalStorage y Firestore en tiempo real
  const updatePostsState = (newPosts: Post[]) => {
    // Sincronizar diferencias con Firestore
    newPosts.forEach(p => {
      const existing = posts.find(ep => ep.id === p.id);
      if (!existing || JSON.stringify(existing) !== JSON.stringify(p)) {
        dbSave('posts', p.id, p);
      }
    });
    posts.forEach(p => {
      if (!newPosts.some(np => np.id === p.id)) {
        dbDelete('posts', p.id);
      }
    });

    setPosts(newPosts);
    saveStoredPosts(newPosts);
    // Si hay un post activo en modal, sincronizar su copia
    if (activeModalPost) {
      const refreshed = newPosts.find(p => p.id === activeModalPost.id);
      if (refreshed) setActiveModalPost(refreshed);
    }
  };

  const updateOdtsState = (newOdts: ODT[]) => {
    // Sincronizar diferencias con Firestore
    newOdts.forEach(o => {
      const existing = odts.find(eo => eo.id === o.id);
      if (!existing || JSON.stringify(existing) !== JSON.stringify(o)) {
        dbSave('odts', o.id, o);
      }
    });
    odts.forEach(o => {
      if (!newOdts.some(no => no.id === o.id)) {
        dbDelete('odts', o.id);
      }
    });

    setOdts(newOdts);
    saveStoredOdts(newOdts);
  };

  // SUPER ADMIN CRUD & GESTIÓN INTEGRAL
  const handleSaveUser = (user: User) => {
    const exists = users.some(u => u.id === user.id);
    const updated = exists ? users.map(u => u.id === user.id ? user : u) : [user, ...users];
    setUsers(updated);
    saveStoredUsers(updated);
    dbSave('users', user.id, user);
    if (currentUser.id === user.id) {
      setCurrentUser(user);
    }
    if (authenticatedUser.id === user.id) {
      setAuthenticatedUser(user);
    }
  };

  const handleDeleteUser = (
    userId: string,
    action: 'reassign' | 'cascade' | 'vacant' = 'vacant',
    reassignToId?: string
  ) => {
    // 1. Eliminar al usuario
    const updatedUsers = users.filter(u => u.id !== userId);
    setUsers(updatedUsers);
    saveStoredUsers(updatedUsers);
    dbDelete('users', userId);

    const reassignee = users.find(u => u.id === reassignToId);

    if (action === 'reassign' && reassignee) {
      // Reasignar Clientes
      const updatedClients = clients.map(c => {
        if (c.ejecutivoId === userId) {
          const updated = { ...c, ejecutivoId: reassignee.id, ejecutivoName: reassignee.name };
          dbSave('clients', c.id, updated);
          return updated;
        }
        return c;
      });
      setClients(updatedClients);
      saveStoredClients(updatedClients);

      // Reasignar ODTs
      const updatedOdts = odts.map(o => {
        let isChanged = false;
        const patch: Partial<ODT> = {};
        if (o.communityId === userId) { patch.communityId = reassignee.id; patch.communityName = reassignee.name; isChanged = true; }
        if (o.disenadorId === userId) { patch.disenadorId = reassignee.id; patch.disenadorName = reassignee.name; isChanged = true; }
        if (o.correctorId === userId) { patch.correctorId = reassignee.id; patch.correctorName = reassignee.name; isChanged = true; }
        if (o.medicoId === userId) { patch.medicoId = reassignee.id; patch.medicoName = reassignee.name; isChanged = true; }
        if (o.editorAvId === userId) { patch.editorAvId = reassignee.id; patch.editorAvName = reassignee.name; isChanged = true; }
        
        if (isChanged) {
          return { ...o, ...patch };
        }
        return o;
      });
      updateOdtsState(updatedOdts);

      // Reasignar Posts
      const updatedPosts = posts.map(p => {
        if (p.responsableActualId === userId) {
          return { ...p, responsableActualId: reassignee.id, responsableActualName: reassignee.name };
        }
        return p;
      });
      updatePostsState(updatedPosts);

    } else if (action === 'cascade') {
      // Eliminar en cascada todo lo del usuario
      // Clientes asignados a este ejecutivo
      const clientsToDelete = clients.filter(c => c.ejecutivoId === userId);
      const updatedClients = clients.filter(c => c.ejecutivoId !== userId);
      setClients(updatedClients);
      saveStoredClients(updatedClients);
      clientsToDelete.forEach(c => dbDelete('clients', c.id));

      // ODTs asociadas
      const updatedOdts = odts.filter(o => {
        const isOwner = o.communityId === userId || o.disenadorId === userId || o.correctorId === userId || o.medicoId === userId || o.editorAvId === userId;
        return !isOwner;
      });
      updateOdtsState(updatedOdts);

      // Posts asociados
      const updatedPosts = posts.filter(p => {
        const hasOdt = updatedOdts.some(o => o.id === p.odtId);
        const isResponsible = p.responsableActualId === userId;
        return hasOdt && !isResponsible;
      });
      updatePostsState(updatedPosts);

    } else if (action === 'vacant') {
      // Dejar vacante ("Sin Asignar")
      const updatedClients = clients.map(c => {
        if (c.ejecutivoId === userId) {
          const updated = { ...c, ejecutivoId: '', ejecutivoName: 'Sin Asignar' };
          dbSave('clients', c.id, updated);
          return updated;
        }
        return c;
      });
      setClients(updatedClients);
      saveStoredClients(updatedClients);

      const updatedOdts = odts.map(o => {
        let isChanged = false;
        const patch: Partial<ODT> = {};
        if (o.communityId === userId) { patch.communityId = ''; patch.communityName = 'Sin Asignar'; isChanged = true; }
        if (o.disenadorId === userId) { patch.disenadorId = ''; patch.disenadorName = 'Sin Asignar'; isChanged = true; }
        if (o.correctorId === userId) { patch.correctorId = ''; patch.correctorName = 'Sin Asignar'; isChanged = true; }
        if (o.medicoId === userId) { patch.medicoId = ''; patch.medicoName = 'Sin Asignar'; isChanged = true; }
        if (o.editorAvId === userId) { patch.editorAvId = ''; patch.editorAvName = 'Sin Asignar'; isChanged = true; }
        
        if (isChanged) {
          return { ...o, ...patch };
        }
        return o;
      });
      updateOdtsState(updatedOdts);

      const updatedPosts = posts.map(p => {
        if (p.responsableActualId === userId) {
          return { ...p, responsableActualId: '', responsableActualName: 'Sin Asignar' };
        }
        return p;
      });
      updatePostsState(updatedPosts);
    }
  };

  const handleSaveClient = (client: Client) => {
    const exists = clients.some(c => c.id === client.id);
    const updated = exists ? clients.map(c => c.id === client.id ? client : c) : [client, ...clients];
    setClients(updated);
    saveStoredClients(updated);
    dbSave('clients', client.id, client);
  };

  const handleDeleteClient = (clientId: string) => {
    // 1. Eliminar cliente
    const updatedClients = clients.filter(c => c.id !== clientId);
    setClients(updatedClients);
    saveStoredClients(updatedClients);
    dbDelete('clients', clientId);

    // 2. Eliminar ODTs asociadas en cascada
    const updatedOdts = odts.filter(o => o.clientId !== clientId);
    updateOdtsState(updatedOdts);

    // 3. Eliminar Posts asociados en cascada
    const updatedPosts = posts.filter(p => p.clientId !== clientId);
    updatePostsState(updatedPosts);
  };

  const handleSaveOdt = (odt: ODT) => {
    const exists = odts.some(o => o.id === odt.id);
    const updated = exists ? odts.map(o => o.id === odt.id ? odt : o) : [odt, ...odts];
    updateOdtsState(updated);
  };

  const handleDeleteOdt = (odtId: string) => {
    const updatedOdts = odts.filter(o => o.id !== odtId);
    updateOdtsState(updatedOdts);
    const updatedPosts = posts.filter(p => p.odtId !== odtId);
    updatePostsState(updatedPosts);
  };

  const handleDeletePost = (postId: string) => {
    const updated = posts.filter(p => p.id !== postId);
    updatePostsState(updated);
  };

  const handleSuperApprovePost = (post: Post) => {
    const odt = odts.find(o => o.id === post.odtId);
    let nextStatus: PostStatus = 'Listo para Publicar';
    let nextArea = 'Community';
    let nextRespName = odt?.communityName || 'Community';
    let nextRespId = odt?.communityId || '';

    if (post.estado === 'Borrador' || post.estado === 'En Community') {
      nextStatus = odt?.requiereMedico ? 'Revisión Médica' : 'Corrección de Copy';
      nextArea = odt?.requiereMedico ? 'Médico' : 'Corrección';
      nextRespName = odt?.requiereMedico ? (odt.medicoName || 'Médico') : (odt?.correctorName || 'Corrector');
      nextRespId = odt?.requiereMedico ? (odt.medicoId || '') : (odt?.correctorId || '');
    } else if (post.estado === 'Revisión Médica') {
      nextStatus = 'Corrección de Copy';
      nextArea = 'Corrección';
      nextRespName = odt?.correctorName || 'Corrector';
      nextRespId = odt?.correctorId || '';
    } else if (post.estado === 'Corrección de Copy' || post.estado === 'Ajustes de Copy') {
      nextStatus = 'Aprobación Copy Cliente';
      nextArea = 'Cliente';
      nextRespName = 'Cliente';
      nextRespId = '';
    } else if (post.estado === 'Aprobación Copy Cliente') {
      if (isAudioVisual(post.tipoMaterial) && post.requiereArtePrevio) {
        nextStatus = 'Diseño de Editables (Arte)';
        nextArea = 'Arte';
        nextRespName = odt?.disenadorName || 'Diseñador';
        nextRespId = odt?.disenadorId || '';
      } else if (isAudioVisual(post.tipoMaterial)) {
        nextStatus = 'Producción Audio/Video';
        nextArea = 'Audio y Video';
        nextRespName = odt?.editorAvName || 'Editor AV';
        nextRespId = odt?.editorAvId || '';
      } else {
        nextStatus = 'Producción Arte';
        nextArea = 'Arte';
        nextRespName = odt?.disenadorName || 'Diseñador';
        nextRespId = odt?.disenadorId || '';
      }
    } else if (post.estado === 'Diseño de Editables (Arte)') {
      nextStatus = 'Producción Audio/Video';
      nextArea = 'Audio y Video';
      nextRespName = odt?.editorAvName || 'Editor AV';
      nextRespId = odt?.editorAvId || '';
    } else if (post.estado === 'Producción Arte' || post.estado === 'Producción Audio/Video') {
      nextStatus = 'Corrección Material';
      nextArea = 'Corrección';
      nextRespName = odt?.correctorName || 'Corrector';
      nextRespId = odt?.correctorId || '';
    } else if (post.estado === 'Corrección Material') {
      nextStatus = post.requiereRevisionMedicaMaterial ? 'Revisión Médica Material' : 'Aprobación Interna Final';
      nextArea = post.requiereRevisionMedicaMaterial ? 'Médico' : 'Ejecutivo';
      nextRespName = post.requiereRevisionMedicaMaterial ? (odt?.medicoName || 'Médico') : (odt?.ejecutivoName || 'Ejecutivo');
      nextRespId = post.requiereRevisionMedicaMaterial ? (odt?.medicoId || '') : (odt?.ejecutivoId || '');
    } else if (post.estado === 'Revisión Médica Material') {
      nextStatus = 'Aprobación Interna Final';
      nextArea = 'Ejecutivo';
      nextRespName = odt?.ejecutivoName || 'Ejecutivo';
      nextRespId = odt?.ejecutivoId || '';
    } else if (post.estado === 'Aprobación Interna Final') {
      nextStatus = 'Aprobación Material Cliente';
      nextArea = 'Cliente';
      nextRespName = 'Cliente';
      nextRespId = '';
    } else if (post.estado === 'Aprobación Material Cliente' || post.estado === 'Cambios solicitados por Cliente') {
      nextStatus = 'Listo para Publicar';
      nextArea = 'Community';
      nextRespName = odt?.communityName || 'Community';
      nextRespId = odt?.communityId || '';
    }

    const intervention = createIntervention(
      currentUser,
      'Super-Aprobación Inmediata de Etapa',
      `Dirección General / Super Admin aprobó directamente el post #${post.numeroInterno}, transfiriendo el flujo a ${nextStatus}.`,
      post.estado,
      nextStatus
    );

    const updated = posts.map(p => {
      if (p.id !== post.id) return p;
      return {
        ...p,
        estado: nextStatus,
        areaResponsable: nextArea,
        responsableActualName: nextRespName,
        responsableActualId: nextRespId,
        historial: [intervention, ...p.historial],
        updatedAt: getNowTimestamp()
      };
    });

    updatePostsState(updated);
  };

  // HANDLERS DEL WORKFLOW Y MÁQUINA DE ESTADOS

  // 1. Crear nueva ODT
  const handleCreateOdt = (newOdt: ODT) => {
    const updated = [newOdt, ...odts];
    updateOdtsState(updated);
    setIsCreateOdtOpen(false);
    setSelectedClientId(newOdt.clientId);
    setSelectedOdtId(newOdt.id);
  };

  // 2. Crear nuevo Post
  const handleCreatePost = (newPost: Post, sendToReview: boolean) => {
    const updated = [newPost, ...posts];
    updatePostsState(updated);
    setIsCreatePostOpen(false);
  };

  // 2.1 Actualizar contenido y especificaciones de un post (Copy In, Copy Out, Enlaces, Fechas, Medidas, Prioridad)
  const handleUpdatePostContent = (
    postId: string,
    data: {
      copyIn?: string;
      copyOut?: string;
      enlaceReferencia?: string;
      enlaceMaterialFinal?: string;
      fechaPrevista?: string;
      fechaEntregaMaterial?: string;
      tipoMaterial?: MaterialType;
      dimensiones?: string;
      nivelPrioridad?: PriorityLevel;
      requiereArtePrevio?: boolean;
      enlaceEditableArte?: string;
      notasArteParaVideo?: string;
    }
  ) => {
    const updated = posts.map(p => {
      if (p.id !== postId) return p;
      const historyEntry = createIntervention(
        currentUser,
        'Actualización de Ficha y Copys',
        `Textos y especificaciones técnicas editados y guardados por ${currentUser.name} (${currentUser.role}).`,
        p.estado
      );
      return {
        ...p,
        copyIn: data.copyIn !== undefined ? data.copyIn : p.copyIn,
        copyOut: data.copyOut !== undefined ? data.copyOut : p.copyOut,
        enlaceReferencia: data.enlaceReferencia !== undefined ? data.enlaceReferencia : p.enlaceReferencia,
        enlaceMaterialFinal: data.enlaceMaterialFinal !== undefined ? data.enlaceMaterialFinal : p.enlaceMaterialFinal,
        fechaPrevista: data.fechaPrevista !== undefined ? data.fechaPrevista : p.fechaPrevista,
        fechaEntregaMaterial: data.fechaEntregaMaterial !== undefined ? data.fechaEntregaMaterial : p.fechaEntregaMaterial,
        tipoMaterial: data.tipoMaterial !== undefined ? data.tipoMaterial : p.tipoMaterial,
        dimensiones: data.dimensiones !== undefined ? data.dimensiones : p.dimensiones,
        nivelPrioridad: data.nivelPrioridad !== undefined ? data.nivelPrioridad : p.nivelPrioridad,
        requiereArtePrevio: data.requiereArtePrevio !== undefined ? data.requiereArtePrevio : p.requiereArtePrevio,
        enlaceEditableArte: data.enlaceEditableArte !== undefined ? data.enlaceEditableArte : p.enlaceEditableArte,
        notasArteParaVideo: data.notasArteParaVideo !== undefined ? data.notasArteParaVideo : p.notasArteParaVideo,
        historial: [historyEntry, ...p.historial],
        updatedAt: getNowTimestamp()
      };
    });
    updatePostsState(updated);
  };

  // 2.2 Duplicar Post (para otra red social o variante)
  const handleDuplicatePost = (post: Post, newRedSocial: string) => {
    const targetOdt = odts.find(o => o.id === post.odtId);
    if (!targetOdt) return;
    const odtPosts = posts.filter(p => p.odtId === post.odtId);
    const nextNum = `POST-${String(odtPosts.length + 1).padStart(2, '0')}`;
    const newPost = duplicatePost(post, newRedSocial, nextNum, currentUser, targetOdt);
    const updated = [newPost, ...posts];
    updatePostsState(updated);
    
    // Abrir de inmediato el post duplicado en el editor para que el CM lo ajuste
    setActiveModalPost(newPost);
    setDetailInitialEditMode(true);
    setIsDetailOpen(true);
  };

  // 2.3 Reciclar / Retomar Post ("Atraer" al inicio del proceso en Borrador)
  const handleRecyclePost = (post: Post) => {
    const targetOdt = odts.find(o => o.id === post.odtId);
    if (!targetOdt) return;
    const recycled = recyclePost(post, currentUser, targetOdt);
    const updated = posts.map(p => p.id === post.id ? recycled : p);
    updatePostsState(updated);

    // Abrir de inmediato en modo edición para nuevo enfoque
    setActiveModalPost(recycled);
    setDetailInitialEditMode(true);
    setIsDetailOpen(true);
  };

  // 3. Enviar a Revisión (Community -> Médico o Corrección)
  const handleSendToReview = (post: Post, odt: ODT) => {
    let nextStatus: PostStatus = 'Corrección de Copy';
    let nextArea = 'Corrección';
    let nextRespName = odt.correctorName;
    let nextRespId = odt.correctorId;

    if (odt.requiereMedico) {
      nextStatus = 'Revisión Médica';
      nextArea = 'Médico';
      nextRespName = odt.medicoName || 'Médico Responsable';
      nextRespId = odt.medicoId || '';
    }

    const intervention = createIntervention(
      currentUser,
      `Envío a ${nextStatus}`,
      'Community completó el copy y envió a revisión obligatoria',
      post.estado,
      nextStatus
    );

    const updated = posts.map(p => {
      if (p.id !== post.id) return p;
      return {
        ...p,
        estado: nextStatus,
        areaResponsable: nextArea,
        responsableActualName: nextRespName,
        responsableActualId: nextRespId,
        historial: [intervention, ...p.historial],
        updatedAt: getNowTimestamp()
      };
    });

    updatePostsState(updated);
  };

  // 4. Ejecutivo envía a Cliente (Esperando Ejecutivo -> Aprobación Copy Cliente)
  const handleSendToClientApproval = (post: Post, odt: ODT) => {
    const nextStatus: PostStatus = 'Aprobación Copy Cliente';
    const intervention = createIntervention(
      currentUser,
      'Envío a Aprobación de Cliente',
      'Ejecutivo validó el copy interno y lo habilitó en el portal del cliente',
      post.estado,
      nextStatus
    );

    const updated = posts.map(p => {
      if (p.id !== post.id) return p;
      return {
        ...p,
        estado: nextStatus,
        areaResponsable: 'Cliente',
        responsableActualName: 'Cliente',
        responsableActualId: '',
        historial: [intervention, ...p.historial],
        updatedAt: getNowTimestamp()
      };
    });

    updatePostsState(updated);

    // Si la ODT estaba marcada como 'Aprobada' o 'Pendiente Interno', actualizar estado para avisar al cliente
    if (odt.estadoAprobacionCopy === 'Aprobada' || odt.estadoAprobacionCopy === 'Pendiente Interno') {
      const updatedOdts = odts.map(o => o.id === odt.id ? { ...o, estadoAprobacionCopy: 'Listo para Revisión Cliente' as const } : o);
      updateOdtsState(updatedOdts);
    }
  };

  // 5. Dictamen de Aprobación o Solicitud de Cambios (Médico, Corrector, Ejecutivo Interno, Cliente)
  const handleApprovalDecision = (
    post: Post, 
    type: 'medico' | 'correccion_copy' | 'correccion_material' | 'medico_material' | 'aprobacion_interna_final' | 'cliente_copy' | 'cliente_material' | 'esperando_ejecutivo',
    isApproved: boolean,
    comment: string,
    extraOptions?: { requiereRevisionMedica?: boolean }
  ) => {
    const odt = odts.find(o => o.id === post.odtId);
    if (!odt) return;

    let nextStatus: PostStatus = post.estado;
    let nextArea = post.areaResponsable;
    let nextRespName = post.responsableActualName;
    let nextRespId = post.responsableActualId;

    const approvalRecord = createApproval(currentUser, isApproved ? 'Aprobado' : 'Cambios Solicitados', comment);
    let patch: Partial<Post> = {};

    if (type === 'medico') {
      patch.aprobacionMedica = approvalRecord;
      if (isApproved) {
        nextStatus = 'Corrección de Copy';
        nextArea = 'Corrección';
        nextRespName = odt.correctorName;
        nextRespId = odt.correctorId;
      } else {
        nextStatus = 'Ajustes de Copy';
        nextArea = 'Community';
        nextRespName = odt.communityName;
        nextRespId = odt.communityId;
      }
    } else if (type === 'correccion_copy') {
      patch.aprobacionCorreccionCopy = approvalRecord;
      if (isApproved) {
        nextStatus = 'Esperando Ejecutivo';
        nextArea = 'Ejecutivo';
        nextRespName = odt.ejecutivoName;
        nextRespId = odt.ejecutivoId;
      } else {
        nextStatus = 'Ajustes de Copy';
        nextArea = 'Community';
        nextRespName = odt.communityName;
        nextRespId = odt.communityId;
      }
    } else if (type === 'cliente_copy') {
      patch.aprobacionClienteCopy = approvalRecord;
      if (isApproved) {
        if (isAudioVisual(post.tipoMaterial) && post.requiereArtePrevio) {
          nextStatus = 'Diseño de Editables (Arte)';
          nextArea = 'Arte';
          nextRespName = odt.disenadorName || 'Diseñador';
          nextRespId = odt.disenadorId || '';
        } else if (isAudioVisual(post.tipoMaterial)) {
          nextStatus = 'Producción Audio/Video';
          nextArea = 'Audio y Video';
          nextRespName = odt.editorAvName || 'Editor AV';
          nextRespId = odt.editorAvId || '';
        } else {
          nextStatus = 'Producción Arte';
          nextArea = 'Arte';
          nextRespName = odt.disenadorName || 'Diseñador';
          nextRespId = odt.disenadorId || '';
        }
      } else {
        nextStatus = 'Cambios solicitados por Cliente';
        nextArea = 'Ejecutivo';
        nextRespName = odt.ejecutivoName;
        nextRespId = odt.ejecutivoId;
      }
    } else if (type === 'correccion_material') {
      patch.aprobacionCorreccionMaterial = approvalRecord;
      if (isApproved) {
        if (extraOptions?.requiereRevisionMedica) {
          nextStatus = 'Revisión Médica Material';
          nextArea = 'Médico';
          nextRespName = odt.medicoName || 'Médico';
          nextRespId = odt.medicoId || '';
          patch.requiereRevisionMedicaMaterial = true;
        } else {
          nextStatus = 'Aprobación Interna Final';
          nextArea = 'Ejecutivo';
          nextRespName = odt.ejecutivoName;
          nextRespId = odt.ejecutivoId;
        }
      } else {
        // Corrector solicita cambios: regresa a producción (Arte o Video)
        if (isAudioVisual(post.tipoMaterial)) {
          nextStatus = 'Producción Audio/Video';
          nextArea = 'Audio y Video';
          nextRespName = odt.editorAvName || 'Editor AV';
          nextRespId = odt.editorAvId || '';
        } else {
          nextStatus = 'Producción Arte';
          nextArea = 'Arte';
          nextRespName = odt.disenadorName || 'Diseñador';
          nextRespId = odt.disenadorId || '';
        }
      }
    } else if (type === 'medico_material') {
      patch.aprobacionMedicaMaterial = approvalRecord;
      if (isApproved) {
        nextStatus = 'Aprobación Interna Final';
        nextArea = 'Ejecutivo';
        nextRespName = odt.ejecutivoName;
        nextRespId = odt.ejecutivoId;
      } else {
        // Médico solicita ajustes de claims o información médica en el material
        if (isAudioVisual(post.tipoMaterial)) {
          nextStatus = 'Producción Audio/Video';
          nextArea = 'Audio y Video';
          nextRespName = odt.editorAvName || 'Editor AV';
          nextRespId = odt.editorAvId || '';
        } else {
          nextStatus = 'Producción Arte';
          nextArea = 'Arte';
          nextRespName = odt.disenadorName || 'Diseñador';
          nextRespId = odt.disenadorId || '';
        }
      }
    } else if (type === 'aprobacion_interna_final') {
      patch.aprobacionInternaFinal = approvalRecord;
      if (isApproved) {
        nextStatus = 'Listo para Publicar';
        nextArea = 'Community';
        nextRespName = odt.communityName;
        nextRespId = odt.communityId;
      } else {
        // Ejecutivo devuelve para correcciones antes de publicar
        if (isAudioVisual(post.tipoMaterial)) {
          nextStatus = 'Producción Audio/Video';
          nextArea = 'Audio y Video';
          nextRespName = odt.editorAvName || 'Editor AV';
          nextRespId = odt.editorAvId || '';
        } else {
          nextStatus = 'Producción Arte';
          nextArea = 'Arte';
          nextRespName = odt.disenadorName || 'Diseñador';
          nextRespId = odt.disenadorId || '';
        }
      }
    } else if (type === 'cliente_material') {
      patch.aprobacionClienteMaterial = approvalRecord;
      if (isApproved) {
        nextStatus = 'Listo para Publicar';
        nextArea = 'Community';
        nextRespName = odt.communityName;
        nextRespId = odt.communityId;
      } else {
        nextStatus = 'Cambios solicitados por Cliente';
        nextArea = 'Ejecutivo';
        nextRespName = odt.ejecutivoName;
        nextRespId = odt.ejecutivoId;
      }
    } else if (type === 'esperando_ejecutivo') {
      if (isApproved) {
        nextStatus = 'Aprobación Copy Cliente';
        nextArea = 'Cliente';
        nextRespName = 'Cliente';
        nextRespId = odt.clientId;
      } else {
        nextStatus = 'Ajustes de Copy';
        nextArea = 'Community';
        nextRespName = odt.communityName;
        nextRespId = odt.communityId;
      }
    }

    const actionText = isApproved ? `Aprobación en ${type}` : `Cambios solicitados en ${type}`;
    const intervention = createIntervention(
      currentUser,
      actionText,
      comment || (isApproved ? 'Aprobado conforme a lineamientos' : 'Ajustes requeridos'),
      post.estado,
      nextStatus
    );

    // Si hubo comentario, añadir también al hilo de comentarios
    const newComments: PostComment[] = comment.trim() ? [
      ...post.comentarios,
      {
        id: 'c-' + Date.now(),
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        text: comment.trim(),
        createdAt: getNowTimestamp(),
        isClientVisible: type === 'cliente_copy' || type === 'cliente_material' || currentUser.role === 'Cliente'
      }
    ] : post.comentarios;

    const updated = posts.map(p => {
      if (p.id !== post.id) return p;
      return {
        ...p,
        ...patch,
        estado: nextStatus,
        areaResponsable: nextArea,
        responsableActualName: nextRespName,
        responsableActualId: nextRespId,
        comentarios: newComments,
        historial: [intervention, ...p.historial],
        updatedAt: getNowTimestamp()
      };
    });

    updatePostsState(updated);
    setIsApprovalOpen(false);
  };

  // 6. Entrega de Material Final por Diseñador o Video
  const handleSubmitMaterial = (post: Post, odt: ODT, materialUrl: string) => {
    const nextStatus: PostStatus = 'Corrección Material';
    const intervention = createIntervention(
      currentUser,
      'Entrega de Material Producido',
      'Material final exportado y alojado en OneDrive/Drive. Enviado a control de calidad.',
      post.estado,
      nextStatus
    );

    const updated = posts.map(p => {
      if (p.id !== post.id) return p;
      return {
        ...p,
        enlaceMaterialFinal: materialUrl,
        estado: nextStatus,
        areaResponsable: 'Corrección',
        responsableActualName: odt.correctorName,
        responsableActualId: odt.correctorId,
        historial: [intervention, ...p.historial],
        updatedAt: getNowTimestamp()
      };
    });

    updatePostsState(updated);
  };

  // 6b. Diseñador de Arte entrega los materiales editables para animación/video (ej. Telefém)
  const handleSubmitArteEditables = (post: Post, odt: ODT, editableUrl: string, notasArte?: string) => {
    const nextStatus: PostStatus = 'Producción Audio/Video';
    const intervention = createIntervention(
      currentUser,
      'Recursos Editables de Arte Entregados',
      `Arte preparó y entregó los editables/ilustraciones para animación de Audio y Video.${notasArte ? ` Indicaciones: "${notasArte}"` : ''}`,
      post.estado,
      nextStatus
    );

    const updated = posts.map(p => {
      if (p.id !== post.id) return p;
      return {
        ...p,
        enlaceEditableArte: editableUrl,
        notasArteParaVideo: notasArte || p.notasArteParaVideo,
        arteCompletado: true,
        estado: nextStatus,
        areaResponsable: 'Audio y Video',
        responsableActualName: odt.editorAvName || 'Editor AV',
        responsableActualId: odt.editorAvId || '',
        historial: [intervention, ...p.historial],
        updatedAt: getNowTimestamp()
      };
    });

    updatePostsState(updated);
  };

  // 7. Community marca como PROGRAMADO o PUBLICADO con múltiples enlaces por red social
  const handlePublishPost = (
    post: Post,
    dataOrDate: PublishPostModalData | string,
    legacyUrl?: string
  ) => {
    let mode: 'Programado' | 'Publicado' = 'Publicado';
    let targetDate = '';
    let targetPlataforma: string | undefined = undefined;
    let targetEnlaces: PostPublicationLink[] = [];

    if (typeof dataOrDate === 'object' && dataOrDate !== null) {
      mode = dataOrDate.status;
      targetDate = dataOrDate.fecha;
      targetPlataforma = dataOrDate.plataformaProgramacion;
      targetEnlaces = dataOrDate.enlaces;
    } else {
      targetDate = typeof dataOrDate === 'string' ? dataOrDate : '';
      if (legacyUrl) {
        targetEnlaces = [{
          id: 'link-' + Date.now(),
          redSocial: post.redSocial,
          url: legacyUrl
        }];
      }
    }

    const isProgramado = mode === 'Programado';
    const nextStatus: PostStatus = isProgramado ? 'Programado' : 'Publicado';
    const mainUrl = targetEnlaces.length > 0 ? targetEnlaces[0].url : (post.urlPublicacion || '');

    const intervention = createIntervention(
      currentUser,
      isProgramado ? 'Post Programado en Plataforma' : 'Post Publicado en Redes Sociales',
      isProgramado
        ? `Post cargado y programado para salir el ${targetDate}${targetPlataforma ? ` en ${targetPlataforma}` : ''}. Enlaces en vivo pendientes al publicarse.`
        : `Publicación confirmada en vivo en fecha ${targetDate} con ${targetEnlaces.length} enlace(s) registrado(s).`,
      post.estado,
      nextStatus
    );

    const updated = posts.map(p => {
      if (p.id !== post.id) return p;
      return {
        ...p,
        estado: nextStatus,
        publicado: !isProgramado,
        programado: isProgramado,
        fechaProgramada: isProgramado ? targetDate : p.fechaProgramada,
        fechaRealPublicacion: !isProgramado ? targetDate : p.fechaRealPublicacion,
        plataformaProgramacion: targetPlataforma || p.plataformaProgramacion,
        urlPublicacion: mainUrl,
        enlacesPublicacion: targetEnlaces,
        historial: [intervention, ...p.historial],
        updatedAt: getNowTimestamp()
      };
    });

    updatePostsState(updated);
    setIsPublishOpen(false);
  };

  // 8. Intervención manual de Supervisor Ejecutivo
  const handleSupervisorIntervention = (
    newStatus: PostStatus,
    newArea: string,
    newRespName: string,
    newRespId: string,
    motivo: string
  ) => {
    if (!activeModalPost) return;

    const intervention = createIntervention(
      currentUser,
      'Intervención Manual de Supervisor Ejecutivo',
      motivo,
      activeModalPost.estado,
      newStatus
    );

    const updated = posts.map(p => {
      if (p.id !== activeModalPost.id) return p;
      return {
        ...p,
        estado: newStatus,
        areaResponsable: newArea,
        responsableActualName: newRespName,
        responsableActualId: newRespId,
        historial: [intervention, ...p.historial],
        updatedAt: getNowTimestamp()
      };
    });

    updatePostsState(updated);
    setIsInterventionOpen(false);
  };

  // 9. Agregar Comentario en Ficha
  const handleAddComment = (commentText: string, isClientVisible: boolean) => {
    if (!activeModalPost) return;

    const newComment: PostComment = {
      id: 'c-' + Date.now(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      text: commentText,
      createdAt: getNowTimestamp(),
      isClientVisible
    };

    const updated = posts.map(p => {
      if (p.id !== activeModalPost.id) return p;
      return {
        ...p,
        comentarios: [...p.comentarios, newComment],
        updatedAt: getNowTimestamp()
      };
    });

    updatePostsState(updated);
  };

  // 10. Aprobación Integral / Por Lote de Parrilla (Cliente)
  const handleBatchApproveParrilla = (odtId: string, tipo: 'COPY' | 'MATERIAL', generalComment?: string) => {
    const targetOdt = odts.find(o => o.id === odtId);
    if (!targetOdt) return;

    // 1. Crear registro inmutable de la ronda de aprobación
    const roundRecord = createParrillaApproval(
      targetOdt,
      currentUser,
      tipo,
      'Aprobada',
      generalComment || '',
      []
    );

    const updatedOdt: ODT = {
      ...targetOdt,
      ...(tipo === 'COPY' 
        ? { estadoAprobacionCopy: 'Aprobada' as const } 
        : { estadoAprobacionMaterial: 'Aprobada' as const }
      ),
      rondasAprobacion: [...(targetOdt.rondasAprobacion || []), roundRecord]
    };

    const updatedOdts = odts.map(o => o.id === odtId ? updatedOdt : o);
    updateOdtsState(updatedOdts);

    // 2. Transición de los posts pendientes de esa ODT
    const updatedPosts = posts.map(p => {
      if (p.odtId !== odtId) return p;

      if (tipo === 'COPY') {
        // Si el post ya completó o superó la etapa de copy, NO regresarlo a Producción
        const isAlreadyPastCopy = [
          'Diseño de Editables (Arte)', 'Producción Arte', 'Producción Audio/Video', 'Corrección Material',
          'Revisión Médica Material', 'Aprobación Interna Final',
          'Aprobación Material Cliente', 'Listo para Publicar', 'Programado', 'Publicado'
        ].includes(p.estado) || p.aprobacionClienteCopy?.status === 'Aprobado';

        if (isAlreadyPastCopy) {
          return p;
        }

        const approvalRecord = createApproval(currentUser, 'Aprobado', generalComment);
        let nextStatus: PostStatus = 'Producción Arte';
        let nextArea = 'Arte';
        let nextRespName = targetOdt.disenadorName || 'Diseñador';
        let nextRespId = targetOdt.disenadorId || '';

        if (isAudioVisual(p.tipoMaterial) && p.requiereArtePrevio) {
          nextStatus = 'Diseño de Editables (Arte)';
          nextArea = 'Arte';
          nextRespName = targetOdt.disenadorName || 'Diseñador';
          nextRespId = targetOdt.disenadorId || '';
        } else if (isAudioVisual(p.tipoMaterial)) {
          nextStatus = 'Producción Audio/Video';
          nextArea = 'Audio y Video';
          nextRespName = targetOdt.editorAvName || 'Editor AV';
          nextRespId = targetOdt.editorAvId || '';
        }

        const intervention = createIntervention(
          currentUser,
          'Aprobación de Copy por Cliente',
          generalComment 
            ? `Autorización de copy por cliente: "${generalComment}"`
            : `Autorización de copy por cliente. Pasa a producción técnica.`,
          p.estado,
          nextStatus
        );

        return {
          ...p,
          estado: nextStatus,
          areaResponsable: nextArea,
          responsableActualName: nextRespName,
          responsableActualId: nextRespId,
          aprobacionClienteCopy: approvalRecord,
          historial: [intervention, ...p.historial],
          updatedAt: getNowTimestamp()
        };
      } else {
        // tipo === 'MATERIAL'
        const isAlreadyPublished = ['Listo para Publicar', 'Programado', 'Publicado'].includes(p.estado) || p.aprobacionClienteMaterial?.status === 'Aprobado';
        if (isAlreadyPublished) {
          return p;
        }

        const approvalRecord = createApproval(currentUser, 'Aprobado', generalComment);
        const nextStatus: PostStatus = 'Listo para Publicar';
        const intervention = createIntervention(
          currentUser,
          'Aprobación de Materiales por Cliente',
          generalComment 
            ? `Autorización de artes y videos: "${generalComment}"`
            : `Materiales autorizados por el cliente para su programación en redes sociales.`,
          p.estado,
          nextStatus
        );

        return {
          ...p,
          estado: nextStatus,
          areaResponsable: 'Community',
          responsableActualName: targetOdt.communityName,
          responsableActualId: targetOdt.communityId,
          aprobacionClienteMaterial: approvalRecord,
          historial: [intervention, ...p.historial],
          updatedAt: getNowTimestamp()
        };
      }
    });

    updatePostsState(updatedPosts);
  };

  // 11. Solicitud de Cambios por Lote de Parrilla (Cliente)
  const handleBatchRequestChanges = (
    odtId: string,
    tipo: 'COPY' | 'MATERIAL',
    generalComment: string,
    affectedPosts: { postId: string; comment: string }[]
  ) => {
    const targetOdt = odts.find(o => o.id === odtId);
    if (!targetOdt) return;

    // Crear mapa de comentarios específicos por post
    const changeMap = new Map<string, string>();
    affectedPosts.forEach(item => changeMap.set(item.postId, item.comment));

    // Mapear con los números internos para auditoría inmutable
    const affectedRequests = affectedPosts.map(item => {
      const p = posts.find(post => post.id === item.postId);
      return {
        postId: item.postId,
        numeroInterno: p?.numeroInterno || item.postId,
        comentario: item.comment
      };
    });

    const roundRecord = createParrillaApproval(
      targetOdt,
      currentUser,
      tipo,
      'Cambios Solicitados',
      generalComment,
      affectedRequests
    );

    const updatedOdt: ODT = {
      ...targetOdt,
      ...(tipo === 'COPY' 
        ? { estadoAprobacionCopy: 'Cambios Solicitados' as const } 
        : { estadoAprobacionMaterial: 'Cambios Solicitados' as const }
      ),
      rondasAprobacion: [...(targetOdt.rondasAprobacion || []), roundRecord]
    };

    const updatedOdts = odts.map(o => o.id === odtId ? updatedOdt : o);
    updateOdtsState(updatedOdts);

    // Actualizar publicaciones: reasignar a Community para "Ajustes de Copy"
    const isAllAffected = affectedPosts.length === 0 && Boolean(generalComment.trim());

    const updatedPosts = posts.map(p => {
      if (p.odtId !== odtId) return p;

      const hasSpecificChange = changeMap.has(p.id);
      if (hasSpecificChange || isAllAffected) {
        const postCommentText = hasSpecificChange
          ? (changeMap.get(p.id) || 'Ajuste solicitado por el cliente.')
          : (generalComment || 'Ajuste solicitado por el cliente en la parrilla.');

        const nextStatus: PostStatus = 'Cambios solicitados por Cliente';
        const nextArea = tipo === 'COPY' 
          ? 'Community' 
          : (isAudioVisual(p.tipoMaterial) ? 'Audio y Video' : 'Arte');
        const nextRespName = tipo === 'COPY'
          ? (targetOdt.communityName || 'Community Manager')
          : (isAudioVisual(p.tipoMaterial) ? (targetOdt.editorAvName || 'Editor AV') : (targetOdt.disenadorName || 'Diseñador'));
        const nextRespId = tipo === 'COPY'
          ? (targetOdt.communityId || '')
          : (isAudioVisual(p.tipoMaterial) ? (targetOdt.editorAvId || '') : (targetOdt.disenadorId || ''));

        const clientComment: PostComment = {
          id: 'c-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          text: `[Revisión ${tipo} del Cliente]: ${postCommentText}`,
          createdAt: getNowTimestamp(),
          isClientVisible: true
        };

        const intervention = createIntervention(
          currentUser,
          `Cliente solicitó cambios en ${tipo === 'COPY' ? 'Copy' : 'Material'}`,
          postCommentText,
          p.estado,
          nextStatus
        );

        const disapprovalRecord = createApproval(currentUser, 'Cambios Solicitados', postCommentText);

        return {
          ...p,
          estado: nextStatus,
          areaResponsable: nextArea,
          responsableActualName: nextRespName,
          responsableActualId: nextRespId,
          ...(tipo === 'COPY' 
            ? { aprobacionClienteCopy: disapprovalRecord } 
            : { aprobacionClienteMaterial: disapprovalRecord }
          ),
          comentarios: [clientComment, ...p.comentarios],
          historial: [intervention, ...p.historial],
          updatedAt: getNowTimestamp()
        };
      }

      // Si no tiene observaciones, y está en estado de revisión por cliente, se considera aprobado y avanza!
      if (tipo === 'COPY' && p.estado === 'Aprobación Copy Cliente') {
        const approvalRecord = createApproval(currentUser, 'Aprobado', 'Aprobado automáticamente en la ronda de revisión.');
        let nextStatus: PostStatus = 'Producción Arte';
        let nextArea = 'Arte';
        let nextRespName = targetOdt.disenadorName || 'Diseñador';
        let nextRespId = targetOdt.disenadorId || '';

        if (isAudioVisual(p.tipoMaterial) && p.requiereArtePrevio) {
          nextStatus = 'Diseño de Editables (Arte)';
          nextArea = 'Arte';
          nextRespName = targetOdt.disenadorName || 'Diseñador';
          nextRespId = targetOdt.disenadorId || '';
        } else if (isAudioVisual(p.tipoMaterial)) {
          nextStatus = 'Producción Audio/Video';
          nextArea = 'Audio y Video';
          nextRespName = targetOdt.editorAvName || 'Editor AV';
          nextRespId = targetOdt.editorAvId || '';
        }

        const intervention = createIntervention(
          currentUser,
          'Aprobación de Copy por Cliente',
          'Autorización de copy por cliente. Pasa a producción técnica.',
          p.estado,
          nextStatus
        );

        return {
          ...p,
          estado: nextStatus,
          areaResponsable: nextArea,
          responsableActualName: nextRespName,
          responsableActualId: nextRespId,
          aprobacionClienteCopy: approvalRecord,
          historial: [intervention, ...p.historial],
          updatedAt: getNowTimestamp()
        };
      }

      if (tipo === 'MATERIAL' && (p.estado === 'Aprobación Interna Final' || p.estado === 'Aprobación Material Cliente')) {
        const approvalRecord = createApproval(currentUser, 'Aprobado', 'Aprobado automáticamente en la ronda de revisión.');
        const nextStatus: PostStatus = 'Listo para Publicar';
        const intervention = createIntervention(
          currentUser,
          'Aprobación de Materiales por Cliente',
          'Materiales autorizados por el cliente para su programación en redes sociales.',
          p.estado,
          nextStatus
        );

        return {
          ...p,
          estado: nextStatus,
          areaResponsable: 'Community',
          responsableActualName: targetOdt.communityName,
          responsableActualId: targetOdt.communityId,
          aprobacionClienteMaterial: approvalRecord,
          historial: [intervention, ...p.historial],
          updatedAt: getNowTimestamp()
        };
      }

      return p;
    });

    updatePostsState(updatedPosts);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = loginUsername.trim().toLowerCase();
    const cleanPass = loginPassword.trim();

    if (!cleanUser || !cleanPass) {
      setLoginError('Por favor completa todos los campos.');
      return;
    }

    console.log("Attempting login for username:", cleanUser);
    console.log("Current loaded users list:", users);

    let foundUser = users.find(u => 
      u.username && u.username.toLowerCase() === cleanUser && 
      (u.password || '123') === cleanPass
    );

    // Bulletproof Fail-safe fallback login for Super Admin to prevent any lockout
    if (!foundUser && cleanUser === 'superadmin' && cleanPass === '123') {
      console.log("Fail-safe activated: Logging in as default Super Admin");
      foundUser = {
        id: 'u1',
        username: 'superadmin',
        name: 'Dirección General (Super Admin)',
        role: 'Super Admin',
        email: 'superadmin@apcpublicidad.com',
        isActive: true,
        password: '123'
      };
    }

    if (foundUser) {
      if (foundUser.isActive === false) {
        setLoginError('Esta cuenta se encuentra inactiva o suspendida. Contacta a un administrador.');
        return;
      }
      console.log("Login successful! Logged in as:", foundUser.name);
      setAuthenticatedUser(foundUser);
      setCurrentUser(foundUser);
      setSuperAdminRoleView(null);
      localStorage.removeItem('apc_simulated_user_id');
      setIsLoggedIn(true);
      localStorage.setItem('apc_is_logged_in', 'true');
      localStorage.setItem('apc_logged_user_id', foundUser.id);
      setLoginError('');
      setLoginUsername('');
      setLoginPassword('');
      if (foundUser.role === 'Cliente') {
        const targetClientId = (foundUser.clientIds && foundUser.clientIds.length > 0)
          ? (foundUser.clientId && foundUser.clientIds.includes(foundUser.clientId) ? foundUser.clientId : foundUser.clientIds[0])
          : foundUser.clientId;
        if (targetClientId) {
          setSelectedClientId(targetClientId);
        }
      }
    } else {
      console.warn("Login failed: Invalid username or password");
      setLoginError('Nombre de usuario o contraseña incorrectos.');
    }
  };

  // Render login screen if user is not logged in
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 bg-gradient-to-br from-emerald-950 via-slate-950 to-pink-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans antialiased relative overflow-hidden">
        {/* Luces ambientales en Verde y Rosa */}
        <div className="absolute top-10 left-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          {/* Logo en Verde y Rosa */}
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-pink-500 flex items-center justify-center text-white font-black text-2xl tracking-wider shadow-xl shadow-emerald-500/25 border border-pink-300/40 transform hover:scale-105 transition-transform">
            APC
          </div>
          <h2 className="mt-5 text-center text-3xl font-black tracking-tight text-white">
            APC Digital Hub
          </h2>
          <p className="mt-2 text-center text-xs text-pink-300/90 max-w-sm mx-auto uppercase tracking-widest font-bold">
            Aprobación de contenidos digitales
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 relative z-10">
          <div className="bg-slate-900/90 backdrop-blur-xl py-8 px-6 sm:px-8 shadow-2xl rounded-3xl border border-emerald-500/20 shadow-emerald-950/40 relative">
            {/* Acento superior Verde y Rosa */}
            <div className="absolute top-0 inset-x-8 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-pink-500 rounded-full" />

            <form className="space-y-6" onSubmit={handleLoginSubmit}>
              <div>
                <label className="block text-xs font-bold text-emerald-300 uppercase tracking-wider mb-2">
                  Nombre de Usuario (Login)
                </label>
                <input
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => {
                    setLoginUsername(e.target.value);
                    setLoginError('');
                  }}
                  placeholder="Ej. superadmin, ana.ejecutiva"
                  className="w-full text-sm px-4 py-3 border border-slate-700/80 rounded-xl bg-slate-950/80 text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-400 focus:border-pink-500 transition-all focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-300 uppercase tracking-wider mb-2">
                  Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    setLoginError('');
                  }}
                  placeholder="••••••••"
                  className="w-full text-sm px-4 py-3 border border-slate-700/80 rounded-xl bg-slate-950/80 text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-400 focus:border-pink-500 transition-all focus:outline-hidden"
                />
              </div>

              {loginError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold leading-relaxed">
                  ⚠️ {loginError}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  className="w-full py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-emerald-500/25 text-sm font-black text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-pink-500 hover:from-emerald-400 hover:via-teal-400 hover:to-pink-400 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Iniciar Sesión
                </button>
              </div>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-800 text-center">
              <p className="text-[11px] text-slate-400 font-medium">
                APC Digital Hub • Aprobación de contenidos digitales
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const effectiveRole = (isSuperAdmin && superAdminRoleView) 
    ? superAdminRoleView 
    : currentUser.role;

  const handleExitSimulation = () => {
    setCurrentUser(authenticatedUser);
    setSuperAdminRoleView(null);
    localStorage.removeItem('apc_simulated_user_id');
  };

  const handleSwitchUser = (user: User) => {
    // Exclusivo para Super Admin: ningún otro rol puede simular usuarios
    if (!isSuperAdmin) return;

    if (user.id === authenticatedUser.id) {
      handleExitSimulation();
    } else {
      setCurrentUser(user);
      setSuperAdminRoleView(null);
      localStorage.setItem('apc_simulated_user_id', user.id);
      if (user.role === 'Cliente') {
        const targetClientId = (user.clientIds && user.clientIds.length > 0)
          ? (user.clientId && user.clientIds.includes(user.clientId) ? user.clientId : user.clientIds[0])
          : user.clientId;
        if (targetClientId) {
          setSelectedClientId(targetClientId);
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans antialiased">
      
      {/* Barra de Navegación con Conmutador de Roles (Exclusivo Super Admin) */}
      <Navbar
        currentUser={currentUser}
        authenticatedUser={authenticatedUser}
        allUsers={users}
        isSuperAdmin={isSuperAdmin}
        isSimulating={isSimulating}
        onSwitchUser={handleSwitchUser}
        onExitSimulation={handleExitSimulation}
        onLogout={() => {
          setIsLoggedIn(false);
          localStorage.removeItem('apc_is_logged_in');
          localStorage.removeItem('apc_logged_user_id');
          localStorage.removeItem('apc_simulated_user_id');
          setSuperAdminRoleView(null);
        }}
        clientName={currentClient?.name}
        onOpenSuperAdminPanel={handleExitSimulation}
        activeViewRole={superAdminRoleView || currentUser.role}
      />

      {/* Contenido Principal por Rol */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Banner de simulación activa (EXCLUSIVO PARA SUPER ADMIN) */}
        {isSuperAdmin && isSimulating && (
          <div 
            className="mb-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-pink-600 text-white p-3.5 rounded-2xl font-bold text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md border border-pink-400/30"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-950/40 text-pink-200 border border-pink-300/30 flex items-center justify-center shrink-0">
                <Crown className="w-4 h-4 fill-pink-300" />
              </div>
              <div>
                <span className="font-extrabold uppercase tracking-wide text-[11px] block text-emerald-100">Modo Simulación de Perfil (Solo Super Admin)</span>
                <span className="font-medium text-white text-xs">
                  {superAdminRoleView ? (
                    <>Viendo la interfaz operativa de: <strong>{superAdminRoleView}</strong>.</>
                  ) : (
                    <>Viendo la interfaz como: <strong>[{currentUser.role}] {currentUser.name}</strong> (@{currentUser.username}).</>
                  )}{' '}
                  Tu sesión autenticada de Super Admin sigue activa en segundo plano.
                </span>
              </div>
            </div>
            <button
              onClick={handleExitSimulation}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-950 text-white font-extrabold rounded-xl hover:bg-slate-900 transition-colors cursor-pointer text-xs shrink-0 self-start sm:self-auto shadow-sm border border-slate-700"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a Consola Super Admin</span>
            </button>
          </div>
        )}

        {/* VISTA 0: SUPER ADMIN HUB (CONTROL TOTAL) */}
        {isSuperAdmin && !isSimulating && (
          <SuperAdminView
            currentUser={currentUser}
            users={users}
            clients={clients}
            odts={odts}
            posts={posts}
            onSaveUser={handleSaveUser}
            onDeleteUser={handleDeleteUser}
            onSaveClient={handleSaveClient}
            onDeleteClient={handleDeleteClient}
            onSaveOdt={handleSaveOdt}
            onDeleteOdt={handleDeleteOdt}
            onSavePost={(post) => {
              const updated = posts.map(p => p.id === post.id ? post : p);
              updatePostsState(updated);
            }}
            onDeletePost={handleDeletePost}
            onSelectPost={(post) => {
              setActiveModalPost(post);
              setIsDetailOpen(true);
            }}
            onOpenCreateOdt={() => {
              setCreateOdtInitialClientId(undefined);
              setIsCreateOdtOpen(true);
            }}
            onOpenCreatePost={(odt) => {
              setCreatePostOdt(odt);
              setIsCreatePostOpen(true);
            }}
            onSwitchUser={handleSwitchUser}
            onSuperApprovePost={handleSuperApprovePost}
            onOpenIntervention={(post) => {
              setActiveModalPost(post);
              setIsInterventionOpen(true);
            }}
            onSelectRoleView={(role) => {
              setSuperAdminRoleView(role);
              if (role === 'Cliente' && clients.length > 0) {
                setSelectedClientId(clients[0].id);
              }
            }}
          />
        )}
        
        {/* VISTA: EJECUTIVO DE CUENTAS / ADMIN */}
        {(effectiveRole === 'Ejecutivo' || effectiveRole === 'Admin') && (
          <EjecutivoView
            clients={clients}
            odts={odts}
            posts={posts}
            currentUser={currentUser}
            selectedClientId={selectedClientId || undefined}
            selectedOdtId={selectedOdtId || undefined}
            onSelectClient={setSelectedClientId}
            onSelectOdt={setSelectedOdtId}
            onOpenCreateOdt={(cid) => {
              setCreateOdtInitialClientId(cid);
              setIsCreateOdtOpen(true);
            }}
            onOpenCreatePost={(odt) => {
              setCreatePostOdt(odt);
              setIsCreatePostOpen(true);
            }}
            onSelectPost={(post) => {
              setActiveModalPost(post);
              setIsDetailOpen(true);
            }}
            onOpenIntervention={(post) => {
              setActiveModalPost(post);
              setIsInterventionOpen(true);
            }}
            onSendToClientApproval={handleSendToClientApproval}
            onOpenApprovalModal={(post, type) => {
              setActiveModalPost(post);
              setApprovalType(type || 'aprobacion_interna_final');
              setIsApprovalOpen(true);
            }}
            onSendToReview={handleSendToReview}
            onOpenPublishModal={(post) => {
              setActiveModalPost(post);
              setIsPublishOpen(true);
            }}
            onDuplicatePost={handleDuplicatePost}
            onRecyclePost={handleRecyclePost}
          />
        )}

        {/* VISTA: COMMUNITY MANAGER (CON PERMISOS DE EJECUTIVO + CREACIÓN DE POSTS) */}
        {effectiveRole === 'Community' && (
          <CommunityView
            odts={odts}
            posts={posts}
            clients={clients}
            currentUser={currentUser}
            selectedClientId={selectedClientId || undefined}
            selectedOdtId={selectedOdtId || undefined}
            onSelectClient={setSelectedClientId}
            onSelectOdt={setSelectedOdtId}
            onOpenCreatePost={(odt) => {
              setCreatePostOdt(odt);
              setIsCreatePostOpen(true);
            }}
            onSelectPost={(post, startEditing?: boolean) => {
              setActiveModalPost(post);
              setDetailInitialEditMode(Boolean(startEditing !== undefined ? startEditing : (post.estado === 'Ajustes de Copy' || post.estado === 'En Community' || post.estado === 'Borrador' || post.estado === 'Cambios solicitados por Cliente')));
              setIsDetailOpen(true);
            }}
            onUpdatePost={handleUpdatePostContent}
            onSendToReview={handleSendToReview}
            onDuplicatePost={handleDuplicatePost}
            onRecyclePost={handleRecyclePost}
            onOpenPublishModal={(post) => {
              setActiveModalPost(post);
              setIsPublishOpen(true);
            }}
            onOpenIntervention={(post) => {
              setActiveModalPost(post);
              setIsInterventionOpen(true);
            }}
            onSendToClientApproval={handleSendToClientApproval}
            onOpenApprovalModal={(post, type) => {
              setActiveModalPost(post);
              setApprovalType(type || 'aprobacion_interna_final');
              setIsApprovalOpen(true);
            }}
          />
        )}

        {/* VISTA: REVISIÓN MÉDICA */}
        {effectiveRole === 'Médico' && (
          <MedicoView
            posts={posts}
            odts={odts}
            clients={clients}
            currentUser={currentUser}
            onOpenApprovalModal={(post) => {
              setActiveModalPost(post);
              setApprovalType(post.estado === 'Revisión Médica Material' ? 'medico_material' : 'medico');
              setIsApprovalOpen(true);
            }}
            onSelectPost={(post) => {
              setActiveModalPost(post);
              setIsDetailOpen(true);
            }}
          />
        )}

        {/* VISTA: CORRECCIÓN DE COPY Y QA */}
        {effectiveRole === 'Corrector' && (
          <CorrectorView
            posts={posts}
            odts={odts}
            clients={clients}
            currentUser={currentUser}
            onOpenApprovalModal={(post, type) => {
              setActiveModalPost(post);
              setApprovalType(type);
              setIsApprovalOpen(true);
            }}
            onSelectPost={(post) => {
              setActiveModalPost(post);
              setIsDetailOpen(true);
            }}
          />
        )}

        {/* VISTA: PRODUCCIÓN DE ARTE / AUDIO-VIDEO */}
        {(effectiveRole === 'Arte' || effectiveRole === 'Audio y Video') && (
          <ProduccionView
            posts={posts}
            odts={odts}
            clients={clients}
            currentUser={currentUser}
            onSubmitMaterial={handleSubmitMaterial}
            onSubmitArteEditables={handleSubmitArteEditables}
            onSelectPost={(post) => {
              setActiveModalPost(post);
              setIsDetailOpen(true);
            }}
          />
        )}

        {/* VISTA: CLIENTE (ESTRICTAMENTE AISLADA & REVISIÓN CONDENSADA POR PARRILLA) */}
        {effectiveRole === 'Cliente' && (
          <ClienteView
            posts={posts}
            odts={odts}
            client={currentClient || (selectedClientId ? clients.find(c => c.id === selectedClientId) : null) || authorizedClientsForUser[0] || clients[0]}
            availableClients={authorizedClientsForUser}
            onSelectClient={(cId) => setSelectedClientId(cId)}
            currentUser={currentUser}
            users={users}
            onBatchApproveParrilla={handleBatchApproveParrilla}
            onBatchRequestChanges={handleBatchRequestChanges}
            onSelectPost={(post) => {
              setActiveModalPost(post);
              setIsDetailOpen(true);
            }}
          />
        )}

      </main>

      {/* MODALES GLOBALES */}

      {/* 1. Modal Detalle y Auditoría del Post */}
      {isDetailOpen && activeModalPost && (
        <PostDetailModal
          post={activeModalPost}
          odt={odts.find(o => o.id === activeModalPost.odtId)}
          currentUser={currentUser}
          initialEditMode={detailInitialEditMode}
          onClose={() => {
            setIsDetailOpen(false);
            setActiveModalPost(null);
            setDetailInitialEditMode(false);
          }}
          onAddComment={handleAddComment}
          onUpdatePost={handleUpdatePostContent}
          onSendToReview={handleSendToReview}
          onDuplicatePost={handleDuplicatePost}
          onRecyclePost={handleRecyclePost}
          onOpenPublishModal={(p) => {
            setIsDetailOpen(false);
            setActiveModalPost(p);
            setIsPublishOpen(true);
          }}
          onOpenIntervention={() => {
            setIsDetailOpen(false);
            setIsInterventionOpen(true);
          }}
        />
      )}

      {/* 2. Modal Compuerta de Aprobación */}
      {isApprovalOpen && activeModalPost && (
        <ApprovalModal
          post={activeModalPost}
          odt={odts.find(o => o.id === activeModalPost.odtId)}
          currentUser={currentUser}
          type={approvalType}
          onClose={() => setIsApprovalOpen(false)}
          onApprove={(comment, extraOptions) => handleApprovalDecision(activeModalPost, approvalType, true, comment, extraOptions)}
          onRequestChanges={(comment) => handleApprovalDecision(activeModalPost, approvalType, false, comment)}
        />
      )}

      {/* 3. Modal Registrar Publicación / Programación */}
      {isPublishOpen && activeModalPost && (
        <PublishPostModal
          post={activeModalPost}
          onClose={() => setIsPublishOpen(false)}
          onConfirmPublish={(data) => handlePublishPost(activeModalPost, data)}
        />
      )}

      {/* 4. Modal Intervención Manual de Supervisor */}
      {isInterventionOpen && activeModalPost && (
        <InterventionModal
          post={activeModalPost}
          odt={odts.find(o => o.id === activeModalPost.odtId)}
          users={users}
          currentUser={currentUser}
          onClose={() => setIsInterventionOpen(false)}
          onSaveIntervention={handleSupervisorIntervention}
        />
      )}

      {/* 5. Modal Crear Nueva ODT */}
      {isCreateOdtOpen && (
        <CreateOdtModal
          clients={clients}
          users={users}
          currentUser={currentUser}
          initialClientId={createOdtInitialClientId}
          onClose={() => setIsCreateOdtOpen(false)}
          onCreate={handleCreateOdt}
        />
      )}

      {/* 6. Modal Crear Nuevo Post */}
      {isCreatePostOpen && createPostOdt && (
        <CreatePostModal
          odt={createPostOdt}
          existingPostsCount={posts.filter(p => p.odtId === createPostOdt.id).length}
          currentUser={currentUser}
          onClose={() => {
            setIsCreatePostOpen(false);
            setCreatePostOdt(null);
          }}
          onCreate={handleCreatePost}
        />
      )}

    </div>
  );
};

export default App;
