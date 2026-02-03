import { LocalNotifications } from '@capacitor/local-notifications';
import type { ScheduleOptions } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export interface DCANotification {
  id: number;
  title: string;
  body: string;
  scheduledAt: Date;
}

class NotificationService {
  private isAvailable = false;
  private isNative = false;
  private webNotificationQueue: Map<number, ReturnType<typeof setTimeout>> = new Map();

  async initialize() {
    this.isNative = Capacitor.isNativePlatform();

    if (this.isNative) {
      // Native platform: use Capacitor LocalNotifications
      try {
        const permission = await LocalNotifications.requestPermissions();
        this.isAvailable = permission.display === 'granted';
        
        if (this.isAvailable) {
          console.log('Native notification permissions granted');
        } else {
          console.log('Native notification permissions denied');
        }
        
        return this.isAvailable;
      } catch (error) {
        console.error('Error initializing native notifications:', error);
        return false;
      }
    } else {
      // Web platform: use browser Notification API
      if (!('Notification' in window)) {
        console.log('Browser does not support notifications');
        return false;
      }

      if (Notification.permission === 'granted') {
        this.isAvailable = true;
        console.log('Web notification permissions already granted');
        return true;
      } else if (Notification.permission !== 'denied') {
        try {
          const permission = await Notification.requestPermission();
          this.isAvailable = permission === 'granted';
          console.log(`Web notification permission: ${permission}`);
          return this.isAvailable;
        } catch (error) {
          console.error('Error requesting web notification permission:', error);
          return false;
        }
      } else {
        console.log('Web notification permissions denied');
        return false;
      }
    }
  }

  async scheduleDCAReminder(
    dcaDate: Date,
    amount: number,
    frequency: string
  ): Promise<number | null> {
    if (!this.isAvailable) {
      console.log('Notifications not available');
      return null;
    }

    const id = Math.floor(Math.random() * 1000000);
    const title = '💰 DCA Reminder';
    const body = `Time to buy $${amount} of SOL (${frequency})`;

    try {
      if (this.isNative) {
        // Native: use Capacitor LocalNotifications
        const schedule: ScheduleOptions = {
          notifications: [
            {
              id,
              title,
              body,
              schedule: {
                at: dcaDate,
              },
              sound: 'default',
              actionTypeId: 'DCA_ACTION',
              extra: {
                type: 'dca',
                amount,
                frequency,
                scheduledFor: dcaDate.toISOString(),
              },
            },
          ],
        };

        await LocalNotifications.schedule(schedule);
        console.log(`Scheduled native DCA notification ${id} for ${dcaDate}`);
      } else {
        // Web: schedule with setTimeout
        const delay = dcaDate.getTime() - Date.now();
        if (delay > 0) {
          const timeout = setTimeout(() => {
            new Notification(title, { body, icon: 'icons/icon-192.png' });
            this.webNotificationQueue.delete(id);
          }, delay);
          this.webNotificationQueue.set(id, timeout);
          console.log(`Scheduled web DCA notification ${id} for ${dcaDate}`);
        } else {
          console.log('Cannot schedule notification in the past');
          return null;
        }
      }
      
      return id;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  async scheduleMissedDCAReminder(
    amount: number,
    daysMissed: number
  ): Promise<number | null> {
    if (!this.isAvailable) return null;

    const id = Math.floor(Math.random() * 1000000);
    const title = '💰 DCA Time';
    const body = `Time to invest $${amount} into JitoSOL. Tap to swap.`;

    try {
      if (this.isNative) {
        // Native: immediate notification via LocalNotifications
        const schedule: ScheduleOptions = {
          notifications: [
            {
              id,
              title,
              body,
              schedule: {
                at: new Date(Date.now() + 1000), // 1 second from now
              },
              sound: 'default',
              actionTypeId: 'MISSED_DCA_ACTION',
              extra: {
                type: 'missed-dca',
                amount,
                daysMissed,
              },
            },
          ],
        };

        await LocalNotifications.schedule(schedule);
        console.log(`Scheduled native missed DCA notification ${id}`);
      } else {
        // Web: show immediately
        new Notification(title, { body, icon: 'icons/icon-192.png' });
        console.log(`Showed web missed DCA notification ${id}`);
      }
      
      return id;
    } catch (error) {
      console.error('Error scheduling missed DCA notification:', error);
      return null;
    }
  }

  async cancelNotification(id: number) {
    if (!this.isAvailable) return;

    try {
      if (this.isNative) {
        await LocalNotifications.cancel({ notifications: [{ id }] });
        console.log(`Cancelled native notification ${id}`);
      } else {
        // Web: clear timeout if exists
        const timeout = this.webNotificationQueue.get(id);
        if (timeout) {
          clearTimeout(timeout);
          this.webNotificationQueue.delete(id);
          console.log(`Cancelled web notification ${id}`);
        }
      }
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  async cancelAllNotifications() {
    if (!this.isAvailable) return;

    try {
      if (this.isNative) {
        await LocalNotifications.cancel({ notifications: [] }); // Empty array cancels all
        console.log('Cancelled all native notifications');
      } else {
        // Web: clear all timeouts
        this.webNotificationQueue.forEach((timeout) => clearTimeout(timeout));
        this.webNotificationQueue.clear();
        console.log('Cancelled all web notifications');
      }
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  async getPendingNotifications() {
    if (!this.isAvailable) return [];

    try {
      if (this.isNative) {
        const pending = await LocalNotifications.getPending();
        return pending.notifications;
      } else {
        // Web: return scheduled notifications from queue
        return Array.from(this.webNotificationQueue.keys()).map(id => ({
          id,
          title: 'Scheduled notification',
          body: '',
        }));
      }
    } catch (error) {
      console.error('Error getting pending notifications:', error);
      return [];
    }
  }

  // Test notification - useful for debugging
  async sendTestNotification() {
    if (!this.isAvailable) {
      console.log('Notifications not available - requesting permission...');
      await this.initialize();
      if (!this.isAvailable) return;
    }

    const title = '🧪 Test Notification';
    const body = 'RetireOnSol notifications are working!';

    try {
      if (this.isNative) {
        const schedule: ScheduleOptions = {
          notifications: [
            {
              id: 999999,
              title,
              body,
              schedule: {
                at: new Date(Date.now() + 2000), // 2 seconds from now
              },
              sound: 'default',
            },
          ],
        };

        await LocalNotifications.schedule(schedule);
        console.log('Native test notification scheduled');
      } else {
        // Web: show after 2 seconds
        setTimeout(() => {
          new Notification(title, { body, icon: 'icons/icon-192.png' });
        }, 2000);
        console.log('Web test notification scheduled');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
