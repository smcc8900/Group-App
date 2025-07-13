import { db } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc, getDocs, writeBatch } from 'firebase/firestore';

export interface Notification {
  id: string;
  userId: string;
  username: string;
  type: 'payment_approved' | 'payment_rejected' | 'payment_submitted' | 'general';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  data?: {
    paymentId?: string;
    month?: string;
    amount?: number;
    adminUsername?: string;
  };
}

// Notification service class
export class NotificationService {
  private static instance: NotificationService;
  private listeners: Map<string, () => void> = new Map();

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Create a new notification
  async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'notifications'), {
        ...notification,
        createdAt: new Date(),
        read: false
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Send payment approval notification
  async sendPaymentApprovalNotification(
    userId: string,
    username: string,
    paymentId: string,
    month: string,
    amount: number,
    adminUsername: string
  ): Promise<void> {
    const notification: Omit<Notification, 'id' | 'createdAt'> = {
      userId,
      username,
      type: 'payment_approved',
      title: 'Payment Approved! 🎉',
      message: `Your payment of ₹${amount} for ${month} has been approved by ${adminUsername}.`,
      read: false,
      data: {
        paymentId,
        month,
        amount,
        adminUsername
      }
    };

    await this.createNotification(notification);
  }

  // Send payment rejection notification
  async sendPaymentRejectionNotification(
    userId: string,
    username: string,
    paymentId: string,
    month: string,
    amount: number,
    adminUsername: string,
    reason?: string
  ): Promise<void> {
    const notification: Omit<Notification, 'id' | 'createdAt'> = {
      userId,
      username,
      type: 'payment_rejected',
      title: 'Payment Rejected ❌',
      message: `Your payment of ₹${amount} for ${month} was rejected by ${adminUsername}.${reason ? ` Reason: ${reason}` : ''}`,
      read: false,
      data: {
        paymentId,
        month,
        amount,
        adminUsername
      }
    };

    await this.createNotification(notification);
  }

  // Send payment submission notification to admin
  async sendPaymentSubmissionNotification(
    adminUserId: string,
    username: string,
    paymentId: string,
    month: string,
    amount: number
  ): Promise<void> {
    const notification: Omit<Notification, 'id' | 'createdAt'> = {
      userId: adminUserId,
      username: 'admin',
      type: 'payment_submitted',
      title: 'New Payment Request 📝',
      message: `${username} has submitted a payment of ₹${amount} for ${month}.`,
      read: false,
      data: {
        paymentId,
        month,
        amount,
        adminUsername: username
      }
    };

    await this.createNotification(notification);
  }

  // Listen to notifications for a specific user
  listenToNotifications(userId: string, callback: (notifications: Notification[]) => void): () => void {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Notification[];
      
      // Sort by creation date (newest first)
      notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      callback(notifications);
    });

    this.listeners.set(userId, unsubscribe);
    return unsubscribe;
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      );
      
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { read: true });
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Get unread notification count
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Cleanup listeners
  cleanup(): void {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

// Utility functions for common notification patterns
export const createPaymentApprovalNotification = (
  userId: string,
  username: string,
  paymentId: string,
  month: string,
  amount: number,
  adminUsername: string
) => {
  return notificationService.sendPaymentApprovalNotification(
    userId,
    username,
    paymentId,
    month,
    amount,
    adminUsername
  );
};

export const createPaymentRejectionNotification = (
  userId: string,
  username: string,
  paymentId: string,
  month: string,
  amount: number,
  adminUsername: string,
  reason?: string
) => {
  return notificationService.sendPaymentRejectionNotification(
    userId,
    username,
    paymentId,
    month,
    amount,
    adminUsername,
    reason
  );
};

export const createPaymentSubmissionNotification = (
  adminUserId: string,
  username: string,
  paymentId: string,
  month: string,
  amount: number
) => {
  return notificationService.sendPaymentSubmissionNotification(
    adminUserId,
    username,
    paymentId,
    month,
    amount
  );
}; 