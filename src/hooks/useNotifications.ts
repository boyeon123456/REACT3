import { useEffect, useState } from 'react';
import { db } from '../firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  writeBatch,
  getDocs,
  limit,
} from 'firebase/firestore';

export interface Notification {
  id: string;
  userId: string;
  type: 'comment' | 'like' | 'reply';
  fromUser: string;
  postId: string;
  postTitle: string;
  read: boolean;
  createdAt: number;
}

// 알림 구독 훅
export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      limit(50)
    );


    const unsub = onSnapshot(q, 
      (snap) => {
        const sorted = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Notification))
          .sort((a, b) => b.createdAt - a.createdAt);
        setNotifications(sorted);

      },
      (error) => {
        console.error('Notification subscription error:', error);
      }
    );


    return () => unsub();
  }, [userId]);

  return notifications;
}

// 단일 알림 읽음 처리
export async function markNotificationRead(notifId: string) {
  await updateDoc(doc(db, 'notifications', notifId), { read: true });
}

// 모든 알림 읽음 처리
export async function markAllNotificationsRead(userId: string) {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    where('read', '==', false)
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
}

// 알림 생성 헬퍼
export async function createNotification(data: Omit<Notification, 'id'>) {
  // 자기 자신에게는 알림 보내지 않음
  if (!data.userId || data.userId === data.fromUser) return;
  await addDoc(collection(db, 'notifications'), data);
}
