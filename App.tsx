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
import { dbSave, dbDelete, dbSeedIfEmpty, dbListen } from './services/firebase';

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
        // Hydrate or seed default items if empty in Firebase
        await dbSeedIfEmpty('users', getStoredUsers());
        await dbSeedIfEmpty('clients', getStoredClients());
        await dbSeedIfEmpty('odts', getStoredOdts());
        await dbSeedIfEmpty('posts', getStoredPosts());

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

  // Usuario activo (Por defecto: Super Admin para tener el control total inmediato)
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const loaded = getStoredUsers();
    return loaded[0] || {
      id: 'u1',
      name: 'Dirección General (Super Admin)',
      role: 'Super Admin',
      email: 'superadmin@apcpublicidad.com',
      username: 'superadmin'
    };
  });

  // Vista simulada para Super Admin
  const [superAdminRoleView, setSuperAdminRoleView] = useState<UserRole | null>(null);

  // Navegación en vista de ejecutivo
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedOdtId, setSelectedOdtId] = useState<string | null>(null);

  // Modales
  const [activeModalPost, setActiveModalPost] = useState<Post | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailInitialEditMode, setDetailInitialEditMode] = useState(false);
  
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);
  const [approvalType, setApprovalType] = useState<'medico' | 'correccion_copy' | 'correccion_material' | 'medico_material' | 'aprobacion_interna_final' | 'cliente_copy' | 'cliente_material'>('medico');

  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [isInterventionOpen, setIsInterventionOpen] = useState(false);
  const [isCreateOdtOpen, setIsCreateOdtOpen] = useState(false);
  const [createOdtInitialClientId, setCreateOdtInitialClientId] = useState<string | undefined>();
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [createPostOdt, setCreatePostOdt] = useState<ODT | null>(null);

  // Cliente asociado si el usuario es de rol 'Cliente'
  const currentClient = useMemo(() => {
    if (currentUser.role !== 'Cliente' || !currentUser.clientId) return null;
    return clients.find(c => c.id === currentUser.clientId) || null;
  }, [currentUser, clients]);

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
  };

  const handleDeleteUser = (userId: string) => {
    const updated = users.filter(u => u.id !== userId);
    setUsers(updated);
    saveStoredUsers(updated);
    dbDelete('users', userId);
  };

  const handleSaveClient = (client: Client) => {
    const exists = clients.some(c => c.id === client.id);
    const updated = exists ? clients.map(c => c.id === client.id ? client : c) : [client, ...clients];
    setClients(updated);
    saveStoredClients(updated);
    dbSave('clients', client.id, client);
  };

  const handleDeleteClient = (clientId: string) => {
    const updated = clients.filter(c => c.id !== clientId);
    setClients(updated);
    saveStoredClients(updated);
    dbDelete('clients', clientId);
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
    } else if (post.estado === 'Revisión Médica') {
      nextStatus = 'Corrección de Copy';
      nextArea = 'Corrección';
      nextRespName = odt?.correctorName || 'Corrector';
    } else if (post.estado === 'Corrección de Copy' || post.estado === 'Ajustes de Copy') {
      nextStatus = 'Aprobación Copy Cliente';
      nextArea = 'Cliente';
      nextRespName = 'Cliente';
    } else if (post.estado === 'Aprobación Copy Cliente') {
      nextStatus = isAudioVisual(post.tipoMaterial) ? 'Producción Audio/Video' : 'Producción Arte';
      nextArea = isAudioVisual(post.tipoMaterial) ? 'Audio y Video' : 'Arte';
      nextRespName = isAudioVisual(post.tipoMaterial) ? (odt?.editorAvName || 'Editor AV') : (odt?.disenadorName || 'Diseñador');
    } else if (post.estado === 'Producción Arte' || post.estado === 'Producción Audio/Video') {
      nextStatus = 'Corrección Material';
      nextArea = 'Corrección';
      nextRespName = odt?.correctorName || 'Corrector';
    } else if (post.estado === 'Corrección Material') {
      nextStatus = post.requiereRevisionMedicaMaterial ? 'Revisión Médica Material' : 'Aprobación Interna Final';
      nextArea = post.requiereRevisionMedicaMaterial ? 'Médico' : 'Ejecutivo';
      nextRespName = post.requiereRevisionMedicaMaterial ? (odt?.medicoName || 'Médico') : (odt?.ejecutivoName || 'Ejecutivo');
    } else if (post.estado === 'Revisión Médica Material') {
      nextStatus = 'Aprobación Interna Final';
      nextArea = 'Ejecutivo';
      nextRespName = odt?.ejecutivoName || 'Ejecutivo';
    } else if (post.estado === 'Aprobación Interna Final') {
      nextStatus = 'Aprobación Material Cliente';
      nextArea = 'Cliente';
      nextRespName = 'Cliente';
    } else if (post.estado === 'Aprobación Material Cliente' || post.estado === 'Cambios solicitados por Cliente') {
      nextStatus = 'Listo para Publicar';
      nextArea = 'Community';
      nextRespName = odt?.communityName || 'Community';
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
    type: 'medico' | 'correccion_copy' | 'correccion_material' | 'medico_material' | 'aprobacion_interna_final' | 'cliente_copy' | 'cliente_material',
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
      targetDate = dataOrDate;
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
          'Producción Arte', 'Producción Audio/Video', 'Corrección Material',
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

        if (isAudioVisual(p.tipoMaterial)) {
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

        if (isAudioVisual(p.tipoMaterial)) {
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

  const effectiveRole = (currentUser.role === 'Super Admin' && superAdminRoleView) 
    ? superAdminRoleView 
    : currentUser.role;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans antialiased">
      
      {/* Barra de Navegación con Conmutador de Roles */}
      <Navbar
        currentUser={currentUser}
        allUsers={users}
        onSwitchUser={(user) => {
          setCurrentUser(user);
          setSuperAdminRoleView(null);
          // Si pasa a cliente, enfocar a su cliente
          if (user.role === 'Cliente' && user.clientId) {
            setSelectedClientId(user.clientId);
          }
        }}
        onLogout={() => {
          // Reset al Super Admin o primer usuario
          setCurrentUser(users[0]);
          setSuperAdminRoleView(null);
        }}
        clientName={currentClient?.name}
        onOpenSuperAdminPanel={() => setSuperAdminRoleView(null)}
        activeViewRole={superAdminRoleView || currentUser.role}
      />

      {/* Contenido Principal por Rol */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Banner de simulación activa para Super Admin */}
        {currentUser.role === 'Super Admin' && superAdminRoleView && (
          <div 
            style={{ backgroundColor: '#f59e0b' }}
            className="mb-6 bg-amber-500 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 p-3.5 rounded-2xl font-bold text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md border border-amber-400"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-950 text-amber-400 flex items-center justify-center shrink-0">
                <Crown className="w-4 h-4 fill-amber-400" />
              </div>
              <div>
                <span className="font-extrabold uppercase tracking-wide text-[11px] block">Modo Super Admin Activo</span>
                <span className="font-medium text-slate-900 text-xs">
                  Viendo interfaz operativa de: <strong>{superAdminRoleView}</strong> (Conserva permisos de super-aprobación y bypass).
                </span>
              </div>
            </div>
            <button
              onClick={() => setSuperAdminRoleView(null)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-950 text-white font-extrabold rounded-xl hover:bg-slate-800 transition-colors cursor-pointer text-xs shrink-0 self-start sm:self-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a Consola Super Admin</span>
            </button>
          </div>
        )}

        {/* VISTA 0: SUPER ADMIN HUB (CONTROL TOTAL) */}
        {currentUser.role === 'Super Admin' && !superAdminRoleView && (
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
            onSwitchUser={(user) => {
              setCurrentUser(user);
              setSuperAdminRoleView(null);
              if (user.role === 'Cliente' && user.clientId) {
                setSelectedClientId(user.clientId);
              }
            }}
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
              setDetailInitialEditMode(Boolean(startEditing !== undefined ? startEditing : (post.estado === 'Ajustes de Copy' || post.estado === 'Redacción de Copy' || post.estado === 'Cambios solicitados por Cliente')));
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
            client={currentClient || (selectedClientId ? clients.find(c => c.id === selectedClientId) : null) || clients[0]}
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
