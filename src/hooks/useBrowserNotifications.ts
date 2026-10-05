import { useCallback, useEffect, useState } from 'react';

/**
 * Browser notifications for matching blood requests.
 *
 * On modern Android Chrome the in-page Notification API works, but service-worker
 * notifications are more reliable when the tab is in the background and the
 * browser decides to wallpaper the notification itself. We prefer a service
 * worker when available and fall back to a normal in-page notification.
 */

export type NotifyPermission = 'unsupported' | 'default' | 'granted' | 'denied';

function currentPermission(): NotifyPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission as NotifyPermission;
}

export function useBrowserNotifications(onNotificationClick?: () => void) {
  const [permission, setPermission] = useState<NotifyPermission>(currentPermission);

  useEffect(() => {
    setPermission(currentPermission());
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'unsupported' as NotifyPermission;
    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotifyPermission);
      return result as NotifyPermission;
    } catch {
      return currentPermission();
    }
  }, []);

  const notify = useCallback(
    (title: string, body: string, tag?: string) => {
      const permissionState = currentPermission();
      if (permissionState !== 'granted') return;

      const notificationOptions = {
        body,
        tag,
        icon: '/icon-192.png',
        badge: '/notification-badge.png',
        requireInteraction: false,
        data: { url: '/' }
      };

      const showNativeNotification = () => {
        try {
          const n = new Notification(title, notificationOptions);
          n.onclick = () => {
            window.focus();
            onNotificationClick?.();
            n.close();
          };
        } catch (err) {
          console.error('Notification failed:', err);
        }
      };

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready
          .then(registration => {
            registration.showNotification(title, notificationOptions).catch(() => {
              showNativeNotification();
            });
          })
          .catch(() => {
            showNativeNotification();
          });
        return;
      }

      showNativeNotification();
    },
    [onNotificationClick]
  );

  return { permission, requestPermission, notify };
}
