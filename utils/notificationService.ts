// Servicio de Notificaciones del Navegador (Web Notifications API)

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      localStorage.setItem('apc_notifications_enabled', 'true');
    } else {
      localStorage.setItem('apc_notifications_enabled', 'false');
    }
    return permission;
  } catch (error) {
    console.error('Error solicitando permisos de notificación:', error);
    return 'denied';
  }
}

export function sendBrowserNotification(title: string, options?: NotificationOptions) {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== 'granted') return;

  try {
    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (err) {
    console.warn('No se pudo emitir la notificación del navegador:', err);
  }
}
