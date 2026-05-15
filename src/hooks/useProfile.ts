import { useEffect, useState } from 'react';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { BookmarkItem, PostItem } from '../types/profile';
import { useAuthStore, type User } from '../store/authStore';

export function useProfile(profileUserId?: string) {
  const user = useAuthStore((state) => state.user);
  const targetUserId = profileUserId || user?.id;
  const isOwnProfile = Boolean(user?.id && targetUserId === user.id);
  const [profileUser, setProfileUser] = useState<User | null>(profileUserId ? null : user);
  const [myPosts, setMyPosts] = useState<PostItem[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(Boolean(profileUserId));

  useEffect(() => {
    if (!targetUserId) {
      const timeout = window.setTimeout(() => {
        setProfileUser(null);
        setLoadingProfile(false);
      }, 0);
      return () => window.clearTimeout(timeout);
    }

    if (isOwnProfile && user) {
      const timeout = window.setTimeout(() => {
        setProfileUser(user);
        setLoadingProfile(false);
      }, 0);
      return () => window.clearTimeout(timeout);
    }

    const loadingTimeout = window.setTimeout(() => setLoadingProfile(true), 0);
    const unsubscribeUser = onSnapshot(
      doc(db, 'users', targetUserId),
      (snapshot) => {
        setProfileUser(snapshot.exists() ? ({ ...(snapshot.data() as Omit<User, 'id'>), id: snapshot.id } as User) : null);
        setLoadingProfile(false);
      },
      (error) => {
        console.error('Profile user subscription error:', error);
        setProfileUser(null);
        setLoadingProfile(false);
      }
    );

    return () => {
      window.clearTimeout(loadingTimeout);
      unsubscribeUser();
    };
  }, [isOwnProfile, targetUserId, user]);

  useEffect(() => {
    if (!targetUserId) return undefined;

    const postsQuery = query(collection(db, 'posts'), where('author_id', '==', targetUserId));
    let authoredPosts: PostItem[] = [];
    let ownedPosts: PostItem[] = [];
    let disposed = false;

    const publishPosts = () => {
      const merged = new Map<string, PostItem>();
      [...authoredPosts, ...ownedPosts].forEach((post) => {
        if (isOwnProfile || post.anonymous !== true) merged.set(post.id, post);
      });
      setMyPosts([...merged.values()].sort((a, b) => (b.created_at || 0) - (a.created_at || 0)));
    };

    const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
      authoredPosts = snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<PostItem, 'id'>) }));
      publishPosts();
    });

    let unsubscribeOwnedPosts: (() => void) | undefined;
    if (isOwnProfile) {
      const ownedQuery = query(collection(db, 'post_owners'), where('ownerId', '==', targetUserId));
      unsubscribeOwnedPosts = onSnapshot(ownedQuery, async (snapshot) => {
        const posts = await Promise.all(
          snapshot.docs.map(async (ownerDoc) => {
            const postSnap = await getDoc(doc(db, 'posts', ownerDoc.id));
            return postSnap.exists() ? ({ id: postSnap.id, ...(postSnap.data() as Omit<PostItem, 'id'>) } as PostItem) : null;
          })
        );
        if (disposed) return;
        ownedPosts = posts.filter((post): post is PostItem => Boolean(post));
        publishPosts();
      });
    }

    return () => {
      disposed = true;
      unsubscribePosts();
      unsubscribeOwnedPosts?.();
    };
  }, [isOwnProfile, targetUserId]);

  useEffect(() => {
    if (!user?.id || !isOwnProfile) {
      const timeout = window.setTimeout(() => setBookmarks([]), 0);
      return () => window.clearTimeout(timeout);
    }

    const bookmarksQuery = query(collection(db, 'users', user.id, 'bookmarks'));
    const unsubscribeBookmarks = onSnapshot(bookmarksQuery, (snapshot) => {
      const saved = snapshot.docs
        .map((item) => ({ id: item.id, ...(item.data() as Omit<BookmarkItem, 'id'>) }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setBookmarks(saved);
    });

    return () => {
      unsubscribeBookmarks();
    };
  }, [isOwnProfile, user?.id]);

  const latestPost = myPosts[0];

  return {
    user: profileUser,
    myPosts,
    bookmarks,
    latestPost,
    isOwnProfile,
    loadingProfile,
  };
}
