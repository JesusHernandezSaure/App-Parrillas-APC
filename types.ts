export type UserRole = 
  | 'Super Admin'
  | 'Admin'
  | 'Ejecutivo' 
  | 'Community' 
  | 'Médico' 
  | 'Corrector' 
  | 'Arte' 
  | 'Audio y Video' 
  | 'Cliente';

export interface UserPermissions {
  canCreateOdt: boolean;
  canEditOdt: boolean;
  canDeleteOdt: boolean;
  canCreatePost: boolean;
  canEditAnyPost: boolean;
  canDeletePost: boolean;
  canApproveAnyStage: boolean;
  canBypassWorkflow: boolean;
  canPublishPost: boolean;
  canManageUsers: boolean;
  canManageClients: boolean;
  canViewInternalComments: boolean;
  canSuperviseAll: boolean;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  clientId?: string; // Solo para usuarios con rol 'Cliente'
  email?: string;
  avatar?: string;
  password?: string;
  phone?: string;
  cargo?: string;
  whatsapp?: string;
  horarioAtencion?: string;
  isActive?: boolean;
  permissions?: UserPermissions;
}

export interface Client {
  id: string;
  name: string;
  ejecutivoId: string;
  ejecutivoName: string;
  ejecutivoEmail?: string;
  ejecutivoPhone?: string;
  ejecutivoCargo?: string;
  ejecutivoWhatsapp?: string;
  ejecutivoHorario?: string;
  clientUserIds: string[]; // IDs de usuarios de este cliente
  status: 'Activo' | 'Inactivo';
  createdAt: string;
  industry?: string;
}

export interface ODT {
  id: string;
  numeroODT: string;
  clientId: string;
  clientName: string;
  nombreParrilla: string;
  mesPeriodo: string;
  brief: string;
  objetivo: string;
  redesSociales: string[];
  ejecutivoId: string;
  ejecutivoName: string;
  fechaInicio: string;
  fechaObjetivo: string;
  requiereMedico: boolean;
  requiereArte: boolean;
  requiereAudioVideo: boolean;
  communityId: string;
  communityName: string;
  correctorId: string;
  correctorName: string;
  medicoId?: string;
  medicoName?: string;
  disenadorId?: string;
  disenadorName?: string;
  editorAvId?: string;
  editorAvName?: string;
  estadoGeneral: 'En Creación' | 'En Producción' | 'En Aprobación' | 'Listo para Publicar' | 'Completado' | 'Pausado';
  createdAt: string;
  rondasAprobacion?: ParrillaApprovalRound[];
  estadoAprobacionCopy?: 'Pendiente Interno' | 'Listo para Revisión Cliente' | 'Aprobada' | 'Cambios Solicitados';
  estadoAprobacionMaterial?: 'Pendiente Interno' | 'Listo para Revisión Cliente' | 'Aprobada' | 'Cambios Solicitados';
}

export interface PostChangeRequest {
  postId: string;
  numeroInterno: string;
  comentario: string;
}

export interface ParrillaApprovalRound {
  id: string;
  odtId: string;
  clientId: string;
  ronda: number; // 1, 2, ...
  tipo: 'COPY' | 'MATERIAL';
  estado: 'Aprobada' | 'Cambios Solicitados';
  fecha: string;
  usuarioId: string;
  usuarioName: string;
  comentarioGeneral?: string;
  cambiosPorPost?: PostChangeRequest[];
}

export type MaterialType = 'Imagen' | 'Video' | 'Carrusel';

export type PostDimensions = 
  | '1080x1080 (1:1 Cuadrado)' 
  | '1080x1920 (9:16 Vertical / Reels)' 
  | '1920x1080 (16:9 Horizontal)';

export type PriorityLevel = 'Nivel 1' | 'Nivel 2' | 'Nivel 3';

export type PostStatus = 
  | 'Borrador'
  | 'En Community'
  | 'Revisión Médica'
  | 'Ajustes de Copy'
  | 'Corrección de Copy'
  | 'Esperando Ejecutivo'
  | 'Aprobación Copy Cliente'
  | 'Producción Arte'
  | 'Producción Audio/Video'
  | 'Corrección Material'
  | 'Revisión Médica Material'
  | 'Aprobación Interna Final'
  | 'Aprobación Material Cliente'
  | 'Cambios solicitados por Cliente'
  | 'Listo para Publicar'
  | 'Programado'
  | 'Publicado'
  | 'Cancelado';

export interface ApprovalRecord {
  status: 'Aprobado' | 'Cambios Solicitados' | 'Pendiente';
  user: string;
  userId?: string;
  date: string;
  comment?: string;
}

export interface PostComment {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  text: string;
  createdAt: string;
  isClientVisible: boolean; // Si es falso, es nota interna y el Cliente NO la ve
}

export interface PostIntervention {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  date: string;
  action: string;
  motivo: string;
  previousState?: PostStatus;
  newState?: PostStatus;
}

export interface PostPublicationLink {
  id: string;
  redSocial: string; // ej. 'Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'X', 'YouTube', 'Otra'
  url: string;
  nota?: string;
  fechaPublicacion?: string;
}

export interface Post {
  id: string;
  numeroInterno: string; // ej. "01", "02"
  odtId: string;
  clientId: string;
  redSocial: string;
  fechaPrevista: string; // Fecha programada de publicación
  fechaEntregaMaterial?: string; // Fecha límite de entrega para Arte / Audio y Video
  tipoMaterial: MaterialType;
  dimensiones?: PostDimensions | string; // Medidas en px (1080x1080, 1080x1920, 1920x1080)
  nivelPrioridad?: PriorityLevel; // Nivel 1 (Muy importante), Nivel 2, Nivel 3
  copyIn: string;
  copyOut: string;
  enlaceReferencia: string; // Enlace externo (Drive, Pinterest, etc.)
  enlaceMaterialFinal: string; // Enlace externo (OneDrive, Google Drive, etc.) NUNCA archivos pesados
  areaResponsable: string;
  responsableActualId?: string;
  responsableActualName?: string;
  estado: PostStatus;
  comentarios: PostComment[];
  historial: PostIntervention[];
  aprobacionMedica?: ApprovalRecord;
  aprobacionCorreccionCopy?: ApprovalRecord;
  aprobacionClienteCopy?: ApprovalRecord;
  aprobacionCorreccionMaterial?: ApprovalRecord;
  aprobacionMedicaMaterial?: ApprovalRecord;
  aprobacionInternaFinal?: ApprovalRecord;
  aprobacionClienteMaterial?: ApprovalRecord;
  requiereRevisionMedicaMaterial?: boolean;
  publicado: boolean;
  programado?: boolean;
  fechaProgramada?: string;
  plataformaProgramacion?: string;
  fechaRealPublicacion?: string;
  urlPublicacion?: string;
  enlacesPublicacion?: PostPublicationLink[];
  createdAt: string;
  updatedAt: string;
}
