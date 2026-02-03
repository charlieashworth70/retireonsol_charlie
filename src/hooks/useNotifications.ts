import { useEffect, useState } from 'react';
import { notificationService } from '../services/notificationService';

export function useNotifications() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Web-only: don't auto-initialize (user triggers via demo panel)
    setIsInitialized(true);
    setIsAvailable(false);
  }, []);

  return {
    isAvailable,
    isInitialized,
    isNative: false,
    scheduleDCAReminder: notificationService.scheduleDCAReminder.bind(notificationService),
    scheduleMissedDCAReminder: notificationService.scheduleMissedDCAReminder.bind(notificationService),
    cancelNotification: notificationService.cancelNotification.bind(notificationService),
    cancelAllNotifications: notificationService.cancelAllNotifications.bind(notificationService),
    getPendingNotifications: notificationService.getPendingNotifications.bind(notificationService),
    sendTestNotification: notificationService.sendTestNotification.bind(notificationService),
  };
}
