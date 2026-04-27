import { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { PostItem } from '../types/profile';
import { useAuthStore } from '../store/authStore';

export function getLevelProgress(points: number) {
  const levels = [
    { level: 1, min: 0, max: 100 },
    { level: 2, min: 100, max: 400 },
    { level: 3, min: 400, max: 800 },
    { level: 4, min: 800, max: 1500 },
    { level: 5, min: 1500, max: 1500 },
  ];

  const current = levels.findLast((item) => points >= item.min) || levels[0];
  if (current.level === 5) {
    return { currentLevel: 5, nextLabel: 'MAX LEVEL', progress: 100, remaining: 0 };
  }

  const range = current.max - current.min;
  const progress = Math.max(0, Math.min(100, ((points - current.min) / range) * 100));
  return {
    currentLevel: current.level,
    nextLabel: `Lv.${current.level + 1}`,
    progress,
    remaining: current.max - points,
  };
}

export function useProfile() {
  const user = useAuthStore((state) => state.user);
  const [myPosts, setMyPosts] = useState<PostItem[]>([]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const postsQuery = query(collection(db, 'posts'), where('author_id', '==', user.id));
    const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
      const posts = snapshot.docs
        .map((item) => ({ id: item.id, ...(item.data() as Omit<PostItem, 'id'>) }))
        .sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
      setMyPosts(posts);
    });

    return () => {
      unsubscribePosts();
    };
  }, [user?.id]);

  const levelProgress = useMemo(() => getLevelProgress(user?.points || 0), [user?.points]);
  const latestPost = myPosts[0];

  return {
    user,
    myPosts,
    levelProgress,
    latestPost,
  };
}
