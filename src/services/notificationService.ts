export interface DCANotification {
  id: number;
  title: string;
  body: string;
  scheduledAt: Date;
}

class NotificationService {
  private isAvailable = false;
  private webNotificationQueue: Map<number, ReturnType<typeof setTimeout>> = new Map();

  async initialize() {
    // Web platform only: use browser Notification API
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
    const title = 'DCA Reminder';
    const body = `Time to buy $${amount} of SOL (${frequency})`;

    try {
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

      return id;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  async scheduleMissedDCAReminder(
    amount: number,
    _daysMissed: number
  ): Promise<number | null> {
    if (!this.isAvailable) return null;

    const id = Math.floor(Math.random() * 1000000);
    const title = 'DCA Time';
    const body = `Time to invest $${amount} into JitoSOL. Tap to swap.`;

    try {
      new Notification(title, { body, icon: 'icons/icon-192.png' });
      console.log(`Showed web missed DCA notification ${id}`);
      return id;
    } catch (error) {
      console.error('Error scheduling missed DCA notification:', error);
      return null;
    }
  }

  async cancelNotification(id: number) {
    if (!this.isAvailable) return;

    try {
      const timeout = this.webNotificationQueue.get(id);
      if (timeout) {
        clearTimeout(timeout);
        this.webNotificationQueue.delete(id);
        console.log(`Cancelled web notification ${id}`);
      }
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  async cancelAllNotifications() {
    if (!this.isAvailable) return;

    try {
      this.webNotificationQueue.forEach((timeout) => clearTimeout(timeout));
      this.webNotificationQueue.clear();
      console.log('Cancelled all web notifications');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  async getPendingNotifications() {
    if (!this.isAvailable) return [];

    return Array.from(this.webNotificationQueue.keys()).map(id => ({
      id,
      title: 'Scheduled notification',
      body: '',
    }));
  }

  async sendTestNotification() {
    if (!this.isAvailable) {
      console.log('Notifications not available - requesting permission...');
      await this.initialize();
      if (!this.isAvailable) return;
    }

    const title = 'Test Notification';
    const body = 'RetireOnSol notifications are working!';

    try {
      setTimeout(() => {
        new Notification(title, { body, icon: 'icons/icon-192.png' });
      }, 2000);
      console.log('Web test notification scheduled');
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
