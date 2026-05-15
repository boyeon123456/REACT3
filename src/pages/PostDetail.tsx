import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  AlertOctagon,
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Edit2,
  Eye,
  Heart,
  MessageCircle,
  MoreVertical,
  Send,
  Share2,
  Shield,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import StorageImage from '../components/media/StorageImage';
import ConfirmModal from '../components/ui/ConfirmModal';
import { db, storage } from '../firebase';
import { createNotification } from '../hooks/useNotifications';
import { isAdminUser } from '../lib/isAdmin';
import { getVisibleSchoolName } from '../lib/schoolPrivacy';
import { resolveStorageSrc } from '../lib/storageAsset';
import { useAuthStore, type User } from '../store/authStore';
import { formatBoardDate, normalizePost, type NormalizedPost } from '../constants/boardUi';
import './PostDetail.css';

type CommentRow = {
  id: string;
  content?: string;
  author?: string;
  author_id?: string;
  authorDisplayName?: string;
  authorEquipped?: Record<string, string>;
  replyTo_id?: string | null;
  likes?: number;
  created_at?: number;
};

type ShopItemRow = {
  id: string;
  style?: string;
};
type AuthorProfile = Pick<User, 'id' | 'schoolCode' | 'schoolName' | 'settings'>;

type DetailToast = {
  type: 'success' | 'error';
  message: string;
};

const VIEWED_POSTS_SESSION_KEY = 'viewed-posts';

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = isAdminUser(user);

  const [post, setPost] = useState<NormalizedPost | null>(null);
  const [commentsList, setCommentsList] = useState<CommentRow[]>([]);
  const [relatedPosts, setRelatedPosts] = useState<NormalizedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; author: string } | null>(null);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [shopItemsMap, setShopItemsMap] = useState<Record<string, ShopItemRow>>({});
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportMessage, setReportMessage] = useState<DetailToast | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  const [detailToast, setDetailToast] = useState<DetailToast | null>(null);
  const [isPostOwner, setIsPostOwner] = useState(false);
  const [authorProfile, setAuthorProfile] = useState<AuthorProfile | null>(null);

  const showDetailToast = (type: DetailToast['type'], message: string) => {
    setDetailToast({ type, message });
    window.setTimeout(() => setDetailToast(null), 2200);
  };

  useEffect(() => {
    if (!id) return;

    const postRef = doc(db, 'posts', id);

    const markViewed = () => {
      if (typeof window === 'undefined') return;

      const viewedRaw = window.sessionStorage.getItem(VIEWED_POSTS_SESSION_KEY);
      const viewedPosts = viewedRaw ? (JSON.parse(viewedRaw) as string[]) : [];
      if (viewedPosts.includes(id)) return;

      window.sessionStorage.setItem(VIEWED_POSTS_SESSION_KEY, JSON.stringify([...viewedPosts, id]));
      updateDoc(postRef, { views: increment(1) }).catch((error) => {
        console.error(error);
        const rollback = viewedPosts.filter((postId) => postId !== id);
        window.sessionStorage.setItem(VIEWED_POSTS_SESSION_KEY, JSON.stringify(rollback));
      });
    };

    markViewed();

    const unsubPost = onSnapshot(
      postRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          alert('존재하지 않는 게시글입니다.');
          navigate('/board');
          return;
        }
        setPost(normalizePost(docSnap.id, docSnap.data()));
        setLoading(false);
      },
      (error) => {
        console.error('Post subscription error:', error);
        setLoading(false);
      }
    );

    const qComments = query(collection(db, 'posts', id, 'comments'), orderBy('created_at', 'asc'));
    const unsubComments = onSnapshot(qComments, (snap) => {
      setCommentsList(snap.docs.map((entry) => ({ id: entry.id, ...entry.data() } as CommentRow)));
    });

    let unsubItems: () => void = () => {};
    if (user) {
      unsubItems = onSnapshot(collection(db, 'shop_items'), (snap) => {
        const next: Record<string, ShopItemRow> = {};
        snap.forEach((entry) => {
          next[entry.id] = { id: entry.id, ...(entry.data() as Omit<ShopItemRow, 'id'>) };
        });
        setShopItemsMap(next);
      });
    } else {
      setShopItemsMap({});
    }

    return () => {
      unsubPost();
      unsubComments();
      unsubItems();
    };
  }, [id, navigate, user]);

  useEffect(() => {
    if (!id || !user?.id) {
      setLiked(false);
      setBookmarked(false);
      return;
    }

    const unsubLike = onSnapshot(doc(db, 'posts', id, 'likes', user.id), (snap) => setLiked(snap.exists()));
    const unsubBookmark = onSnapshot(doc(db, 'users', user.id, 'bookmarks', id), (snap) => setBookmarked(snap.exists()));

    return () => {
      unsubLike();
      unsubBookmark();
    };
  }, [id, user?.id]);

  useEffect(() => {
    if (!post) return;

    const q = query(collection(db, 'posts'), orderBy('created_at', 'desc'), limit(12));
    const unsubscribe = onSnapshot(q, (snap) => {
      const next = snap.docs
        .map((entry) => normalizePost(entry.id, entry.data()))
        .filter((item) => item.id !== post.id && item.boardKey === post.boardKey)
        .slice(0, 3);
      setRelatedPosts(next);
    });

    return () => unsubscribe();
  }, [post]);

  useEffect(() => {
    if (!post?.authorId) {
      setAuthorProfile(null);
      return;
    }

    let active = true;
    getDoc(doc(db, 'users', post.authorId))
      .then((snap) => {
        if (!active) return;
        setAuthorProfile(snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<User, 'id'>) } as AuthorProfile) : null);
      })
      .catch((error) => {
        console.error('Author profile load error:', error);
        if (active) setAuthorProfile(null);
      });

    return () => {
      active = false;
    };
  }, [post?.authorId]);

  const rootComments = useMemo(() => commentsList.filter((comment) => !comment.replyTo_id), [commentsList]);
  const repliesByParent = useMemo(
    () =>
      commentsList.reduce<Record<string, CommentRow[]>>((acc, comment) => {
        if (comment.replyTo_id) {
          acc[comment.replyTo_id] = [...(acc[comment.replyTo_id] || []), comment];
        }
        return acc;
      }, {}),
    [commentsList]
  );

  useEffect(() => {
    if (!id || !user || !post) {
      setIsPostOwner(false);
      return;
    }

    if (isAdmin || post.authorId === user.id) {
      setIsPostOwner(true);
      return;
    }

    let active = true;
    getDoc(doc(db, 'post_owners', id))
      .then((snap) => {
        if (!active) return;
        setIsPostOwner(snap.exists() && snap.data().ownerId === user.id);
      })
      .catch(() => {
        if (active) setIsPostOwner(false);
      });

    return () => {
      active = false;
    };
  }, [id, isAdmin, post, user]);

  const handleLike = async () => {
    if (!user || !id) {
      showDetailToast('error', '\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD574\uC694.');
      return;
    }

    let nextLiked = false;

    try {
      await runTransaction(db, async (transaction) => {
        const likeRef = doc(db, 'posts', id, 'likes', user.id);
        const postRef = doc(db, 'posts', id);
        const likeSnap = await transaction.get(likeRef);
        const postSnap = await transaction.get(postRef);
        const currentLikes = Number(postSnap.data()?.likes || 0);

        if (likeSnap.exists()) {
          transaction.delete(likeRef);
          transaction.update(postRef, { likes: Math.max(0, currentLikes - 1) });
          nextLiked = false;
          return;
        }

        transaction.set(likeRef, {
          userId: user.id,
          createdAt: Date.now(),
        });
        transaction.update(postRef, { likes: currentLikes + 1 });
        nextLiked = true;
      });
      setLiked(nextLiked);

      if (nextLiked && post?.authorId && post.authorId !== user.id) {
        await createNotification({
          userId: post.authorId,
          type: 'like',
          fromUser: user.name,
          postId: id,
          postTitle: post.title,
          read: false,
          createdAt: Date.now(),
        });
      }
    } catch {
      showDetailToast('error', '\uC88B\uC544\uC694 \uCC98\uB9AC\uC5D0 \uC2E4\uD328\uD588\uC5B4\uC694.');
    }
  };

  const handleBookmark = async () => {
    if (!user || !id || !post) return alert('로그인이 필요합니다.');

    try {
      const bookmarkRef = doc(db, 'users', user.id, 'bookmarks', id);
      const postRef = doc(db, 'posts', id);

      if (bookmarked) {
        await deleteDoc(bookmarkRef);
        await updateDoc(postRef, { bookmarks: increment(-1) });
        setBookmarked(false);
      } else {
        await setDoc(bookmarkRef, {
          postId: id,
          title: post.title,
          boardKey: post.boardKey,
          createdAt: Date.now(),
        });
        await updateDoc(postRef, { bookmarks: increment(1) });
        setBookmarked(true);
      }
    } catch (error) {
      console.error(error);
      alert('북마크 처리에 실패했습니다.');
    }
  };

  const handleComment = async () => {
    if (!user || !id) {
      alert('댓글 작성에는 로그인이 필요합니다.');
      navigate('/login');
      return;
    }
    if (user.isBanned) return;
    if (!commentText.trim()) return;

    try {
      await addDoc(collection(db, 'posts', id, 'comments'), {
        content: commentText.trim(),
        author: user.name,
        authorDisplayName: user.name,
        author_id: user.id,
        authorEquipped: user.equipped_items || {},
        replyTo_id: replyTo?.id || null,
        likes: 0,
        created_at: Date.now(),
      });

      await updateDoc(doc(db, 'posts', id), { comments: increment(1) });
      if (user.role !== 'admin') {
        await updateDoc(doc(db, 'users', user.id), { points: increment(5) });
      }

      if (!replyTo && post?.authorId && post.authorId !== user.id) {
        await createNotification({
          userId: post.authorId,
          type: 'comment',
          fromUser: user.name,
          postId: id,
          postTitle: post.title,
          read: false,
          createdAt: Date.now(),
        });
      }

      if (replyTo) {
        const replyCommentSnap = await getDoc(doc(db, 'posts', id, 'comments', replyTo.id));
        const replyComment = replyCommentSnap.data();
        if (replyComment?.author_id && replyComment.author_id !== user.id) {
          await createNotification({
            userId: replyComment.author_id,
            type: 'reply',
            fromUser: user.name,
            postId: id,
            postTitle: post?.title || '',
            read: false,
            createdAt: Date.now(),
          });
        }
      }

      setCommentText('');
      setReplyTo(null);
    } catch (error) {
      console.error(error);
      alert('댓글 등록에 실패했습니다.');
    }
  };

  const handleCommentLike = async (commentId: string) => {
    if (!user || !id) return alert('로그인이 필요합니다.');
    if (likedComments.has(commentId)) return;

    try {
      setLikedComments((prev) => new Set(prev).add(commentId));
      await updateDoc(doc(db, 'posts', id, 'comments', commentId), { likes: increment(1) });
    } catch (error) {
      console.error(error);
    }
  };

  const handleReport = () => {
    if (!user || !id || !post) {
      showDetailToast('error', '\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD574\uC694.');
      return;
    }

    setReportReason('');
    setReportMessage(null);
    setShowReportModal(true);
  };

  const submitReport = async () => {
    if (!user || !id || !post) {
      showDetailToast('error', '\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD574\uC694.');
      return;
    }

    const reason = reportReason.trim();
    if (!reason) {
      setReportMessage({ type: 'error', message: '\uC2E0\uACE0 \uC0AC\uC720\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.' });
      return;
    }

    try {
      setIsReporting(true);
      setReportMessage(null);
      await addDoc(collection(db, 'reports'), {
        type: '\uAC8C\uC2DC\uAE00',
        contentId: id,
        content: post.title,
        reason,
        reporter: user.name,
        reporter_id: user.id,
        author_id: post.authorId,
        date: new Date().toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }).replace('. ', '/').replace('.', ''),
        status: 'pending',
        createdAt: Date.now(),
      });
      setReportMessage({ type: 'success', message: '\uC2E0\uACE0\uAC00 \uC811\uC218\uB410\uC5B4\uC694.' });
      showDetailToast('success', '\uC2E0\uACE0\uAC00 \uC811\uC218\uB410\uC5B4\uC694.');
      window.setTimeout(() => {
        setShowReportModal(false);
        setReportReason('');
        setReportMessage(null);
      }, 800);
    } catch {
      setReportMessage({
        type: 'error',
        message: '\uC2E0\uACE0 \uC811\uC218\uC5D0 \uC2E4\uD328\uD588\uC5B4\uC694. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.',
      });
    } finally {
      setIsReporting(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      alert('게시글 링크를 복사했습니다.');
    } catch {
      window.open(url, '_blank');
    }
  };

  const openUserProfile = (userId?: string | null) => {
    if (!userId) return;
    navigate(userId === user?.id ? '/mypage' : `/profile/${userId}`);
  };

  const handleOpenImage = async () => {
    if (!post?.imageUrl) return;

    try {
      const url = await resolveStorageSrc(post.imageUrl);
      if (url) {
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Image open error:', error);
    }
  };

  const handleTogglePin = async () => {
    if (!id || !post) return;
    try {
      await updateDoc(doc(db, 'posts', id), { isPinned: !post.isPinned });
      setShowMore(false);
    } catch (error) {
      console.error(error);
      alert('고정 상태 변경에 실패했습니다.');
    }
  };

  const confirmDelete = async () => {
    if (!id || !post) return;

    try {
      if (post.imageUrl) {
        try {
          await deleteObject(ref(storage, post.imageUrl));
        } catch (storageError) {
          console.error('Storage deletion error:', storageError);
        }
      }
      await deleteDoc(doc(db, 'posts', id));
      await deleteDoc(doc(db, 'post_owners', id)).catch(() => undefined);
      alert('게시글을 삭제했습니다.');
      navigate('/board');
    } catch (error) {
      console.error(error);
      alert('게시글 삭제에 실패했습니다.');
    }
  };

  const renderComment = (comment: CommentRow, isReply = false) => {
    const displayName = comment.authorDisplayName || comment.author || '익명';
    const equipped = comment.authorEquipped || {};
    const avatarFrameId = equipped.avatarFrame;
    const avatarFrameStyle = avatarFrameId ? shopItemsMap[avatarFrameId]?.style : undefined;

    return (
      <div key={comment.id} className={`comment-item ${isReply ? 'reply' : ''}`}>
        <div
          className="comment-avatar"
          style={{
            border: avatarFrameStyle ? `2px solid ${avatarFrameStyle}` : undefined,
            boxShadow: avatarFrameStyle ? `0 0 8px ${avatarFrameStyle}44` : undefined,
          }}
        >
          {displayName[0]}
        </div>
        <div className="comment-body">
          <div className="comment-header">
            {comment.author_id ? (
              <button
                type="button"
                className={`comment-author-link ${comment.author_id === post?.authorId ? 'is-writer' : ''}`}
                onClick={() => openUserProfile(comment.author_id)}
              >
                {displayName}
              </button>
            ) : (
              <strong className={comment.author_id === post?.authorId ? 'is-writer' : ''}>{displayName}</strong>
            )}
            {comment.author_id === post?.authorId && <span className="writer-tag">작성자</span>}
            <time>{formatBoardDate(comment.created_at)}</time>
          </div>
          <p>{comment.content}</p>
          <div className="comment-actions">
            <button
              type="button"
              className={likedComments.has(comment.id) ? 'active' : ''}
              onClick={() => handleCommentLike(comment.id)}
            >
              <ThumbsUp size={13} />
              {comment.likes || 0}
            </button>
            {!isReply && (
              <button type="button" onClick={() => setReplyTo({ id: comment.id, author: displayName })}>
                답글
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="post-state">게시글을 불러오는 중입니다.</div>;
  if (!post || !id) return null;

  const authorBannerStyle = !post.anonymous
    ? post.authorEquipped.profileBg
      ? shopItemsMap[post.authorEquipped.profileBg]?.style || '#00aeff'
      : '#00aeff'
    : undefined;
  const detailContentStyle = authorBannerStyle ? ({ '--author-banner': authorBannerStyle } as CSSProperties) : undefined;
  const visibleSchoolName = authorProfile
    ? getVisibleSchoolName(authorProfile, user)
    : post.authorId
      ? ''
      : getVisibleSchoolName(
          {
            id: '',
            schoolCode: post.schoolCode || '',
            schoolName: post.schoolName || '',
          },
          user
        );

  return (
    <div className="post-detail-page animate-fade-in">
      <div className="detail-topbar">
        <button className="icon-button" onClick={() => navigate(-1)} type="button" aria-label="뒤로 가기">
          <ArrowLeft size={20} />
        </button>
        <span className={`detail-board detail-board-${post.boardKey}`}>{post.boardLabel}</span>
        <div className="detail-header-actions">
          <button className="icon-button" onClick={handleShare} type="button" aria-label="공유">
            <Share2 size={19} />
          </button>
          {isPostOwner && (
            <div className="more-wrap">
              <button className="icon-button" onClick={() => setShowMore((value) => !value)} type="button" aria-label="더 보기">
                <MoreVertical size={20} />
              </button>
              {showMore && (
                <div className="more-menu">
                  {isAdmin && (
                    <button type="button" onClick={handleTogglePin}>
                      <Shield size={16} />
                      {post.isPinned ? '고정 해제' : '상단 고정'}
                    </button>
                  )}
                  {isPostOwner && (
                    <button type="button" onClick={() => navigate(`/edit/${id}`)}>
                      <Edit2 size={16} />
                      수정
                    </button>
                  )}
                  <button type="button" className="danger" onClick={() => setShowDeleteModal(true)}>
                    <Trash2 size={16} />
                    삭제
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <article className={`detail-content ${authorBannerStyle ? 'has-author-banner' : ''}`} style={detailContentStyle}>
        <header className="detail-title-block">
          {post.isPinned && <span className="detail-pin">상단 고정</span>}
          <h1>{post.title}</h1>
          <div className="detail-meta">
            {!post.anonymous && post.authorId ? (
              <button type="button" className="detail-author detail-author-link" onClick={() => openUserProfile(post.authorId)}>
                {post.authorDisplayName}
              </button>
            ) : (
              <span className="detail-author">{post.authorDisplayName}</span>
            )}
            {visibleSchoolName && <span>{visibleSchoolName}</span>}
            <time>{formatBoardDate(post.createdAt)}</time>
            <span>
              <Eye size={14} />
              {post.views}
            </span>
          </div>
        </header>

        {post.imageUrl && (
          <button className="post-image-content" type="button" onClick={() => void handleOpenImage()}>
            <StorageImage src={post.imageUrl} alt="게시글 이미지" />
          </button>
        )}

        <div className="detail-body">{post.content}</div>

        {post.tags.length > 0 && (
          <div className="post-tags-container">
            {post.tags.map((tag) => (
              <button type="button" key={tag} onClick={() => navigate(`/board?search=${encodeURIComponent(`#${tag}`)}`)}>
                #{tag}
              </button>
            ))}
          </div>
        )}

        <div className="detail-actions">
          <button type="button" className={liked ? 'active-like' : ''} onClick={handleLike}>
            <Heart size={20} fill={liked ? 'currentColor' : 'none'} />
            추천 {post.likes}
          </button>
          <button type="button" className={bookmarked ? 'active-bookmark' : ''} onClick={handleBookmark}>
            {bookmarked ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
            북마크 {post.bookmarks}
          </button>
          <button type="button" className="danger" onClick={handleReport}>
            <AlertOctagon size={20} />
            신고
          </button>
        </div>
      </article>

      {relatedPosts.length > 0 && (
        <section className="related-section">
          <div className="related-header">
            <h2>같은 카테고리의 다른 글</h2>
            <span>{post.boardLabel}</span>
          </div>
          <div className="related-grid">
            {relatedPosts.map((item) => (
              <button key={item.id} type="button" className="related-card" onClick={() => navigate(`/post/${item.id}`)}>
                <span>{item.boardLabel}</span>
                <strong>{item.title}</strong>
                <p>
                  {item.authorDisplayName} · {formatBoardDate(item.createdAt)}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="comment-section">
        <h2>
          <MessageCircle size={19} />
          댓글 {post.comments || commentsList.length}
        </h2>

        <div className="comment-input-area">
          <div className="comment-my-avatar">{user?.name?.[0] || '?'}</div>
          <div className="comment-input-wrap">
            {replyTo && (
              <div className="reply-banner">
                <span>{replyTo.author}님에게 답글 작성 중</span>
                <button type="button" onClick={() => setReplyTo(null)}>
                  취소
                </button>
              </div>
            )}
            <input
              type="text"
              placeholder={user?.isBanned ? '제재 상태에서는 댓글을 작성할 수 없습니다.' : '댓글을 입력해 주세요.'}
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleComment()}
              disabled={!user || user.isBanned}
            />
            <button type="button" className={commentText.trim() ? 'active' : ''} onClick={handleComment} disabled={!commentText.trim()}>
              <Send size={18} />
            </button>
          </div>
        </div>

        <div className="comment-list">
          {rootComments.length === 0 ? (
            <div className="comment-empty">첫 댓글을 남겨 보세요.</div>
          ) : (
            rootComments.map((comment) => (
              <div key={comment.id} className="comment-thread">
                {renderComment(comment)}
                {(repliesByParent[comment.id] || []).map((reply) => renderComment(reply, true))}
              </div>
            ))
          )}
        </div>
      </section>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="게시글 삭제"
        message="이 게시글을 삭제할까요? 삭제 후에는 복구할 수 없습니다."
        confirmText="삭제"
        type="danger"
      />

      {showReportModal && (
        <div className="report-modal-overlay" role="presentation" onMouseDown={() => setShowReportModal(false)}>
          <section
            className="report-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="report-modal-header">
              <div>
                <h2 id="report-modal-title">게시글 신고</h2>
                <p>문제가 되는 이유를 짧게 적어 주세요.</p>
              </div>
              <button type="button" className="report-modal-close" onClick={() => setShowReportModal(false)} aria-label="신고 창 닫기">
                <X size={18} />
              </button>
            </div>
            <textarea
              className="report-reason-input"
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value)}
              placeholder="예: 욕설, 괴롭힘, 부적절한 내용"
              maxLength={300}
              autoFocus
            />
            <div className="report-modal-footer">
              <span>{reportReason.trim().length}/300</span>
              {reportMessage && <p className={`report-message ${reportMessage.type}`}>{reportMessage.message}</p>}
            </div>
            <div className="report-modal-actions">
              <button type="button" className="report-cancel-button" onClick={() => setShowReportModal(false)} disabled={isReporting}>
                취소
              </button>
              <button
                type="button"
                className="report-submit-button"
                onClick={submitReport}
                disabled={isReporting || !reportReason.trim()}
              >
                {isReporting ? '접수 중' : '신고하기'}
              </button>
            </div>
          </section>
        </div>
      )}

      {detailToast && <div className={`post-detail-toast ${detailToast.type}`}>{detailToast.message}</div>}
    </div>
  );
}
