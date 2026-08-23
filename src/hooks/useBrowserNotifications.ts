import { useCallback, useEffect, useState } from 'react';

/**
 * Desktop/mobile browser notifications for incoming blood requests.
 *
 * This is deliberately the simple version: it fires while LifelineBD is open in
 * a tab, including a backgrounded one. That covers the realistic case of a donor
 * with the site open on their phone or laptop, and needs no service worker, no
 * server keys and no third party.
 *
 * It is NOT true push — a fully closed browser won't wake up. Adding that needs
 * a service worker plus a server-side sender, which is a separate step.
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

  /**
   * Shows a notification. Uses a tag so repeated alerts for the same request
   * replace each other instead of stacking up.
   */
  const notify = useCallback(
    (title: string, body: string, tag?: string) => {
      if (currentPermission() !== 'granted') return;
      try {
        const n = new Notification(title, {
          body,
          tag,
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          // Blood requests are time-critical, so don't let the OS silently
          // collapse them into a quiet group.
          requireInteraction: false
        });
        n.onclick = () => {
          window.focus();
          onNotificationClick?.();
          n.close();
        };
      } catch (err) {
        console.error('Notification failed:', err);
      }
    },
    [onNotificationClick]
  );

  return { permission, requestPermission, notify };
}
