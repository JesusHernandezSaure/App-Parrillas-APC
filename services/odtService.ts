import { 
  User, Client, ODT, Post, PostStatus, PostComment, PostIntervention, 
  ApprovalRecord, ParrillaApprovalRound, PostChangeRequest, UserRole, UserPermissions
} from '../types';
import { INITIAL_USERS, INITIAL_CLIENTS, INITIAL_ODTS, INITIAL_POSTS, FULL_PERMISSIONS } from '../data/initialData';

const CLIENTS_KEY = 'apc_clients_v4';
const ODTS_KEY = 'apc_odts_v4';
const POSTS_KEY = 'apc_posts_v4';
const USERS_KEY = 'apc_users_v4';

export function getDefaultPermissions(role: UserRole): UserPermissions {
  if (role === 'Super Admin' || role === 'Admin') {
    return {
      canCreateOdt: true,
      canEditOdt: true,
      canDeleteOdt: true,
      canCreatePost: true,
      canEditAnyPost: true,
      canDeletePost: true,
      canApproveAnyStage: true,
      canBypassWorkflow: true,
      canPublishPost: true,
      canManageUsers: true,
      canManageClients: true,
      canViewInternalComments: true,
      canSuperviseAll: true,
    };
  }
  if (role === 'Ejecutivo') {
    return {
      canCreateOdt: true,
      canEditOdt: true,
      canDeleteOdt: false,
      canCreatePost: true,
      canEditAnyPost: true,
      canDeletePost: false,
      canApproveAnyStage: true,
      canBypassWorkflow: true,
      canPublishPost: true,
      canManageUsers: false,
      canManageClients: true,
      canViewInternalComments: true,
      canSuperviseAll: true,
    };
  }
  if (role === 'Community') {
    return {
      canCreateOdt: false,
      canEditOdt: false,
      canDeleteOdt: false,
      canCreatePost: true,
      canEditAnyPost: false,
      canDeletePost: false,
      canApproveAnyStage: false,
      canBypassWorkflow: false,
      canPublishPost: true,
      canManageUsers: false,
      canManageClients: false,
      canViewInternalComments: true,
      canSuperviseAll: false,
    };
  }
  if (['Médico', 'Corrector', 'Arte', 'Audio y Video'].includes(role)) {
    return {
      canCreateOdt: false,
      canEditOdt: false,
      canDeleteOdt: false,
      canCreatePost: false,
      canEditAnyPost: false,
      canDeletePost: false,
      canApproveAnyStage: false,
      canBypassWorkflow: false,
      canPublishPost: false,
      canManageUsers: false,
      canManageClients: false,
      canViewInternalComments: true,
      canSuperviseAll: false,
    };
  }
  // Cliente
  return {
    canCreateOdt: false,
    canEditOdt: false,
    canDeleteOdt: false,
    canCreatePost: false,
    canEditAnyPost: false,
    canDeletePost: false,
    canApproveAnyStage: false,
    canBypassWorkflow: false,
    canPublishPost: false,
    canManageUsers: false,
    canManageClients: false,
    canViewInternalComments: false,
    canSuperviseAll: false,
  };
}

// Formato de fecha estándar local y ligero
export function getNowTimestamp(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

export function loadInitialData() {
  if (!localStorage.getItem(CLIENTS_KEY)) {
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(INITIAL_CLIENTS));
  }
  if (!localStorage.getItem(ODTS_KEY)) {
    localStorage.setItem(ODTS_KEY, JSON.stringify(INITIAL_ODTS));
  }
  if (!localStorage.getItem(POSTS_KEY)) {
    localStorage.setItem(POSTS_KEY, JSON.stringify(INITIAL_POSTS));
  }
  if (!localStorage.getItem(USERS_KEY)) {
    localStorage.setItem(USERS_KEY, JSON.stringify(INITIAL_USERS));
  }
}

export function saveStoredUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getStoredUsers(): User[] {
  try {
    const data = localStorage.getItem(USERS_KEY);
    const parsed: User[] = data ? JSON.parse(data) : INITIAL_USERS;
    
    // Garantizar que superadmin siempre exista
    const hasSuperAdmin = parsed.some(u => u.id === 'u1' || u.role === 'Super Admin');
    const baseList = hasSuperAdmin ? parsed : [INITIAL_USERS[0], ...parsed];

    return baseList.map(u => {
      const init = INITIAL_USERS.find(iu => iu.id === u.id);
      const isSuper = u.id === 'u1' || u.role === 'Super Admin';
      const role = isSuper ? 'Super Admin' : u.role;
      return {
        ...init,
        ...u,
        role,
        isActive: u.isActive !== undefined ? u.isActive : true,
        permissions: isSuper 
          ? FULL_PERMISSIONS 
          : (u.permissions || getDefaultPermissions(role)),
        phone: u.phone || init?.phone,
        email: u.email || init?.email,
        cargo: u.cargo || init?.cargo,
        whatsapp: u.whatsapp || init?.whatsapp,
        horarioAtencion: u.horarioAtencion || init?.horarioAtencion,
        avatar: u.avatar || init?.avatar
      };
    });
  } catch (e) {
    return INITIAL_USERS;
  }
}

export function getStoredClients(): Client[] {
  try {
    const data = localStorage.getItem(CLIENTS_KEY);
    if (!data) return INITIAL_CLIENTS;
    const parsed: Client[] = JSON.parse(data);
    return parsed.map(c => {
      const init = INITIAL_CLIENTS.find(ic => ic.id === c.id);
      return init ? {
        ...init,
        ...c,
        ejecutivoCargo: c.ejecutivoCargo || init.ejecutivoCargo,
        ejecutivoEmail: c.ejecutivoEmail || init.ejecutivoEmail,
        ejecutivoPhone: c.ejecutivoPhone || init.ejecutivoPhone,
        ejecutivoWhatsapp: c.ejecutivoWhatsapp || init.ejecutivoWhatsapp,
        ejecutivoHorario: c.ejecutivoHorario || init.ejecutivoHorario
      } : c;
    });
  } catch (e) {
    return INITIAL_CLIENTS;
  }
}

export function saveStoredClients(clients: Client[]) {
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
}

export function getStoredOdts(): ODT[] {
  try {
    const data = localStorage.getItem(ODTS_KEY);
    const rawList: any[] = data ? JSON.parse(data) : INITIAL_ODTS;
    
    // Mapeo inicial de respaldo para autoreparación de ODTs dañadas
    const initialMap = new Map<string, ODT>();
    INITIAL_ODTS.forEach(o => initialMap.set(o.id, o));

    let wasHealed = false;
    const healedList: ODT[] = [];

    for (const item of rawList) {
      // Si el elemento fue corrompido con una ronda de aprobación en vez de una ODT (ej. id empieza con 'ronda-')
      if (item && item.id && (item.id.startsWith('ronda-') || !item.numeroODT || !item.nombreParrilla)) {
        const realOdtId = item.odtId || 'odt-1';
        const baseOdt = initialMap.get(realOdtId) || INITIAL_ODTS[0];
        
        healedList.push({
          ...baseOdt,
          estadoAprobacionCopy: 'Cambios Solicitados',
          rondasAprobacion: [
            ...(baseOdt.rondasAprobacion || []),
            ...(item.ronda ? [item] : [])
          ]
        });
        wasHealed = true;
      } else if (item && item.id) {
        healedList.push(item);
      }
    }

    // Asegurar que ninguna ODT base (como odt-1 de Sanitas) falte
    for (const [id, initialOdt] of initialMap.entries()) {
      if (!healedList.some(o => o.id === id)) {
        healedList.push(initialOdt);
        wasHealed = true;
      }
    }

    const sanitized = healedList.map(o => ({
      ...o,
      redesSociales: Array.isArray(o.redesSociales) && o.redesSociales.length > 0
        ? o.redesSociales
        : ['Instagram', 'Facebook', 'LinkedIn']
    }));

    if (wasHealed) {
      localStorage.setItem(ODTS_KEY, JSON.stringify(sanitized));
    }

    return sanitized;
  } catch (e) {
    return INITIAL_ODTS;
  }
}

export function saveStoredOdts(odts: ODT[]) {
  localStorage.setItem(ODTS_KEY, JSON.stringify(odts));
}

export function getStoredPosts(): Post[] {
  try {
    const data = localStorage.getItem(POSTS_KEY);
    const rawPosts: Post[] = data ? JSON.parse(data) : INITIAL_POSTS;

    let wasRepaired = false;
    const sanitizedPosts = rawPosts.map(p => {
      let tipo = p.tipoMaterial;
      if (tipo as string === 'Reel' || tipo as string === 'Animación') {
        tipo = 'Video';
        wasRepaired = true;
      } else if (tipo as string === 'Otro') {
        tipo = 'Imagen';
        wasRepaired = true;
      }

      const dimensiones = p.dimensiones || (tipo === 'Video' ? '1080x1920 (9:16 Vertical / Reels)' : '1080x1080 (1:1 Cuadrado)');
      const nivelPrioridad = p.nivelPrioridad || 'Nivel 2';
      const fechaEntregaMaterial = p.fechaEntregaMaterial || p.fechaPrevista;

      // Si el post quedó en 'Cambios solicitados por Cliente' o con responsable Ejecutivo,
      // asegurar que regrese a 'Ajustes de Copy' con responsable Community para que no se pierda
      if (p.estado === 'Cambios solicitados por Cliente') {
        wasRepaired = true;
        return {
          ...p,
          tipoMaterial: tipo,
          dimensiones,
          nivelPrioridad,
          fechaEntregaMaterial,
          estado: 'Ajustes de Copy' as PostStatus,
          areaResponsable: 'Community'
        };
      }
      return {
        ...p,
        tipoMaterial: tipo,
        dimensiones,
        nivelPrioridad,
        fechaEntregaMaterial
      };
    });

    if (wasRepaired) {
      localStorage.setItem(POSTS_KEY, JSON.stringify(sanitizedPosts));
    }

    return sanitizedPosts;
  } catch (e) {
    return INITIAL_POSTS;
  }
}

export function saveStoredPosts(posts: Post[]) {
  localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
}

// Helpers de transición y lógica de workflow
export function createIntervention(
  user: User, 
  action: string, 
  motivo: string, 
  previousState?: PostStatus, 
  newState?: PostStatus
): PostIntervention {
  return {
    id: 'h-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    date: getNowTimestamp(),
    action,
    motivo,
    previousState,
    newState
  };
}

export function createApproval(
  user: User, 
  status: 'Aprobado' | 'Cambios Solicitados', 
  comment?: string
): ApprovalRecord {
  return {
    status,
    user: user.name,
    userId: user.id,
    date: getNowTimestamp(),
    comment: comment || undefined
  };
}

export function isAudioVisual(tipo: string): boolean {
  return tipo === 'Video' || tipo === 'Reel' || tipo === 'Animación';
}

// Duplica un post existente (para otra red social o variante)
export function duplicatePost(
  originalPost: Post,
  newRedSocial: string,
  newNumeroInterno: string,
  user: User,
  odt: ODT
): Post {
  const timestamp = getNowTimestamp();
  const intervention: PostIntervention = {
    id: 'h-' + Date.now() + '-dup',
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    date: timestamp,
    action: `Post Duplicado desde #${originalPost.numeroInterno} (${originalPost.redSocial})`,
    motivo: `Duplicación para red social ${newRedSocial}. Se inicia nuevo ciclo de revisión de copy y material.`,
    newState: 'Borrador'
  };

  return {
    id: `post-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    numeroInterno: newNumeroInterno,
    odtId: originalPost.odtId,
    clientId: originalPost.clientId,
    redSocial: newRedSocial,
    fechaPrevista: originalPost.fechaPrevista,
    fechaEntregaMaterial: originalPost.fechaEntregaMaterial || originalPost.fechaPrevista,
    tipoMaterial: originalPost.tipoMaterial,
    dimensiones: originalPost.dimensiones || '1080x1080 (1:1 Cuadrado)',
    nivelPrioridad: originalPost.nivelPrioridad || 'Nivel 2',
    copyIn: originalPost.copyIn,
    copyOut: originalPost.copyOut,
    enlaceReferencia: originalPost.enlaceReferencia || '',
    enlaceMaterialFinal: '',
    areaResponsable: 'Community',
    responsableActualId: odt.communityId,
    responsableActualName: odt.communityName,
    estado: 'Borrador',
    comentarios: [],
    historial: [intervention],
    publicado: false,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

// Recicla / Retoma un post: lo atrae al inicio del flujo (Borrador) para nuevo enfoque
export function recyclePost(
  post: Post,
  user: User,
  odt: ODT,
  motivo?: string
): Post {
  const timestamp = getNowTimestamp();
  const intervention = createIntervention(
    user,
    'Post Reciclado / Retomado al Inicio',
    motivo || 'Community retomó este post y lo atrajo al inicio del flujo para darle un nuevo enfoque, adaptar copys o modificar requerimiento de material.',
    post.estado,
    'Borrador'
  );

  return {
    ...post,
    estado: 'Borrador',
    areaResponsable: 'Community',
    responsableActualId: odt.communityId,
    responsableActualName: odt.communityName,
    // Se limpian dictámenes previos para reiniciar el flujo con el nuevo enfoque
    aprobacionMedica: undefined,
    aprobacionCorreccionCopy: undefined,
    aprobacionClienteCopy: undefined,
    aprobacionCorreccionMaterial: undefined,
    aprobacionMedicaMaterial: undefined,
    aprobacionInternaFinal: undefined,
    aprobacionClienteMaterial: undefined,
    publicado: false,
    fechaRealPublicacion: undefined,
    urlPublicacion: undefined,
    historial: [intervention, ...post.historial],
    updatedAt: timestamp
  };
}

// Filtro estricto de seguridad para CLIENTE
export function sanitizePostForClient(post: Post): Post {
  return {
    ...post,
    comentarios: post.comentarios.filter(c => c.isClientVisible),
    // En la vista de cliente no se muestran notas técnicas de responsables internos
    areaResponsable: post.areaResponsable === 'Cliente' ? 'Tu Aprobación' : 'Producción APC',
    responsableActualName: post.areaResponsable === 'Cliente' ? 'Tu Empresa' : 'Equipo APC'
  };
}

// Determina si un post individual ha completado toda la revisión interna de copy
export function isPostCopyInternallyReviewed(post: Post, odt: ODT): boolean {
  // 1. Debe tener Copy In y Copy Out completos
  if (!post.copyIn?.trim() || !post.copyOut?.trim()) return false;
  
  // 2. Si la ODT requiere médico, debe estar aprobado por médico o en estado avanzado
  if (odt.requiereMedico) {
    const isMedApproved = post.aprobacionMedica?.status === 'Aprobado';
    const isMedAdvanced = [
      'Corrección de Copy', 'Esperando Ejecutivo', 'Aprobación Copy Cliente',
      'Producción Arte', 'Producción Audio/Video', 'Corrección Material',
      'Revisión Médica Material', 'Aprobación Interna Final',
      'Aprobación Material Cliente', 'Listo para Publicar', 'Publicado'
    ].includes(post.estado);
    if (!isMedApproved && !isMedAdvanced) return false;
  }
  
  // 3. Debe estar aprobado por Corrección de Copy o en estado avanzado
  const isCorreccionApproved = post.aprobacionCorreccionCopy?.status === 'Aprobado';
  const isCorreccionAdvanced = [
    'Esperando Ejecutivo', 'Aprobación Copy Cliente',
    'Producción Arte', 'Producción Audio/Video', 'Corrección Material',
    'Revisión Médica Material', 'Aprobación Interna Final',
    'Aprobación Material Cliente', 'Listo para Publicar', 'Publicado'
  ].includes(post.estado);
  
  return isCorreccionApproved || isCorreccionAdvanced;
}

// Verifica si la parrilla completa está lista para la Revisión de Copy del Cliente
export function checkParrillaCopyReadiness(odt: ODT, odtPosts: Post[]) {
  const total = odtPosts.length;
  if (total === 0) {
    return { isReady: false, reviewedCount: 0, totalPosts: 0, percentage: 0, reviewedPosts: [] };
  }
  
  const reviewedPosts = odtPosts.filter(p => isPostCopyInternallyReviewed(p, odt));
  const reviewedCount = reviewedPosts.length;
  const isReady = reviewedCount === total;
  
  return {
    isReady,
    reviewedCount,
    totalPosts: total,
    percentage: Math.round((reviewedCount / total) * 100),
    reviewedPosts
  };
}

// Determina si un post individual ha completado la producción y segunda corrección de material
export function isPostMaterialInternallyReviewed(post: Post): boolean {
  // Debe tener enlace de OneDrive / Google Drive
  if (!post.enlaceMaterialFinal?.trim()) return false;
  
  // Debe estar aprobado por corrección de material o en estado avanzado
  const isCorrectorMatApproved = post.aprobacionCorreccionMaterial?.status === 'Aprobado';
  const isMatAdvanced = [
    'Aprobación Material Cliente', 'Listo para Publicar', 'Publicado'
  ].includes(post.estado);
  
  return isCorrectorMatApproved || isMatAdvanced;
}

// Verifica si la parrilla completa está lista para la Revisión de Materiales del Cliente
export function checkParrillaMaterialReadiness(odt: ODT, odtPosts: Post[]) {
  const total = odtPosts.length;
  if (total === 0) {
    return { isReady: false, reviewedCount: 0, totalPosts: 0, percentage: 0, reviewedPosts: [] };
  }
  
  const reviewedPosts = odtPosts.filter(p => isPostMaterialInternallyReviewed(p));
  const reviewedCount = reviewedPosts.length;
  const isReady = reviewedCount === total;
  
  return {
    isReady,
    reviewedCount,
    totalPosts: total,
    percentage: Math.round((reviewedCount / total) * 100),
    reviewedPosts
  };
}

// Obtiene la ronda actual para una ODT y tipo
export function getCurrentRoundNumber(odt: ODT, tipo: 'COPY' | 'MATERIAL'): number {
  const rounds = (odt.rondasAprobacion || []).filter(r => r.tipo === tipo);
  if (rounds.length === 0) return 1;
  const maxRonda = Math.max(...rounds.map(r => r.ronda));
  const latest = rounds[rounds.length - 1];
  // Si la última ronda tuvo cambios solicitados, la nueva ronda a dictaminar es maxRonda + 1
  if (latest.estado === 'Cambios Solicitados') {
    return maxRonda + 1;
  }
  return maxRonda;
}

// Obtiene la última ronda registrada de un tipo
export function getLatestRound(odt: ODT, tipo: 'COPY' | 'MATERIAL'): ParrillaApprovalRound | undefined {
  const rounds = (odt.rondasAprobacion || []).filter(r => r.tipo === tipo);
  return rounds[rounds.length - 1];
}

// Crea un registro de aprobación de lote por Parrilla
export function createParrillaApproval(
  odt: ODT,
  user: User,
  tipo: 'COPY' | 'MATERIAL',
  estado: 'Aprobada' | 'Cambios Solicitados',
  comentarioGeneral?: string,
  cambiosPorPost?: PostChangeRequest[]
): ParrillaApprovalRound {
  const existingRounds = (odt.rondasAprobacion || []).filter(r => r.tipo === tipo);
  const maxRonda = existingRounds.length > 0 ? Math.max(...existingRounds.map(r => r.ronda)) : 0;
  const ronda = maxRonda + 1;
  return {
    id: `ronda-${tipo.toLowerCase()}-${ronda}-${Date.now()}`,
    odtId: odt.id,
    clientId: odt.clientId,
    ronda,
    tipo,
    estado,
    fecha: getNowTimestamp(),
    usuarioId: user.id,
    usuarioName: user.name,
    comentarioGeneral: comentarioGeneral?.trim() || undefined,
    cambiosPorPost: cambiosPorPost && cambiosPorPost.length > 0 ? cambiosPorPost : undefined
  };
}
