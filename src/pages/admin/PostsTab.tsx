import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import type { QueryConstraint } from 'firebase/firestore';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  updateDoc,
} from 'firebase/firestore';
import { Bookmark, MessageSquare, Pin, Search, ThumbsUp, Trash2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { db } from '../../firebase';
import { BOARD_FILTERS, BOARD_TAG_COLORS, formatBoardDate, normalizePost, type NormalizedPost } from '../../constants/boardUi';
import { logAdminAction } from '../../lib/adminAudit';
import { useAuthStore } from '../../store/authStore';
import ConfirmModal from '../../components/ui/ConfirmModal';
import type { AdminNotify } from '../../hooks/useAdminToast';

const PAGE_SIZE = 35;

type Props = {
  onNotify?: AdminNotify;
};

export default function PostsTab({ onNotify }: Props) {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<NormalizedPost[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [boardFilter, setBoardFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, { id: string; content?: string; author?: string; created_at?: number }[]>>({});
  const [confirmDeletePost, setConfirmDeletePost] = useState<NormalizedPost | null>(null);
  const [confirmDeleteComment, setConfirmDeleteComment] = useState<{ postId: string; commentId: string } | null>(null);

  const fetchPage = useCallback(
    async (cursor: QueryDocumentSnapshot<DocumentData> | null, append: boolean) => {
      try {
        const constraints: QueryConstraint[] = [orderBy('created_at', 'desc')];
        if (cursor) constraints.push(startAfter(cursor));
        constraints.push(limit(PAGE_SIZE));

        const snap = await getDocs(query(collection(db, 'posts'), ...constraints));
        const rows = snap.docs.map((entry) => normalizePost(entry.id, entry.data()));
        setLastDoc(snap.docs.length === PAGE_SIZE ? snap.docs[snap.docs.length - 1] : null);
        setPosts((prev) => (append ? [...prev, ...rows] : rows));
      } catch (error) {
        console.error(error);
        onNotify?.('게시글 목록을 불러오지 못했습니다.', 'error');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [onNotify]
  );

  useEffect(() => {
    setLoading(true);
    setPosts([]);
    setLastDoc(null);
    void fetchPage(null, false);
  }, [fetchPage]);

  useEffect(() => {
    if (searchParams.get('scope') === 'recent') {
      setBoardFilter('all');
      const next = new URLSearchParams(searchParams);
      next.delete('scope');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!expandedId) return;
    setCommentLoading(true);
    const q = query(collection(db, 'posts', expandedId, 'comments'), orderBy('created_at', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setCommentsByPost((prev) => ({
        ...prev,
        [expandedId]: snap.docs.map((entry) => ({ id: entry.id, ...(entry.data() as { content?: string; author?: string; created_at?: number }) })),
      }));
      setCommentLoading(false);
    });
    return () => unsub();
  }, [expandedId]);

  const filtered = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return posts.filter((post) => {
      if (boardFilter !== 'all' && post.boardKey !== boardFilter) return false;
      if (!keyword) return true;
      return [post.title, post.authorDisplayName, post.boardLabel, post.schoolName].join(' ').toLowerCase().includes(keyword);
    });
  }, [boardFilter, posts, searchQuery]);

  const loadMore = async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    await fetchPage(lastDoc, true);
  };

  const runDeletePost = async (post: NormalizedPost) => {
    try {
      await deleteDoc(doc(db, 'posts', post.id));
      await logAdminAction(user, 'post.delete', {
        targetCollection: 'posts',
        targetId: post.id,
        detail: { title: post.title },
      });
      setPosts((prev) => prev.filter((entry) => entry.id !== post.id));
      if (expandedId === post.id) setExpandedId(null);
      onNotify?.('게시글을 삭제했습니다.');
    } catch (error) {
      console.error(error);
      onNotify?.('게시글 삭제에 실패했습니다.', 'error');
    }
  };

  const togglePin = async (post: NormalizedPost) => {
    try {
      const next = !post.isPinned;
      await updateDoc(doc(db, 'posts', post.id), { isPinned: next });
      await logAdminAction(user, 'post.pin_toggle', {
        targetCollection: 'posts',
        targetId: post.id,
        detail: { isPinned: next },
      });
      setPosts((prev) => prev.map((entry) => (entry.id === post.id ? { ...entry, isPinned: next } : entry)));
      onNotify?.(next ? '게시글을 상단 고정했습니다.' : '게시글 고정을 해제했습니다.');
    } catch (error) {
      console.error(error);
      onNotify?.('고정 상태 변경에 실패했습니다.', 'error');
    }
  };

  const runDeleteComment = async (postId: string, commentId: string) => {
    try {
      await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
      await logAdminAction(user, 'comment.delete', {
        targetCollection: `posts/${postId}/comments`,
        targetId: commentId,
      });
      onNotify?.('댓글을 삭제했습니다.');
    } catch (error) {
      console.error(error);
      onNotify?.('댓글 삭제에 실패했습니다.', 'error');
    }
  };

  return (
    <div className="admin-content">
      <ConfirmModal
        isOpen={!!confirmDeletePost}
        onClose={() => setConfirmDeletePost(null)}
        onConfirm={() => {
          if (confirmDeletePost) void runDeletePost(confirmDeletePost);
        }}
        title="게시글 삭제"
        message={confirmDeletePost ? `"${confirmDeletePost.title}" 글을 삭제할까요?` : ''}
        confirmText="삭제"
        type="danger"
      />
      <ConfirmModal
        isOpen={!!confirmDeleteComment}
        onClose={() => setConfirmDeleteComment(null)}
        onConfirm={() => {
          if (confirmDeleteComment) void runDeleteComment(confirmDeleteComment.postId, confirmDeleteComment.commentId);
        }}
        title="댓글 삭제"
        message="선택한 댓글을 삭제할까요?"
        confirmText="삭제"
        type="danger"
      />

      <div className="table-header-actions">
        <div>
          <h3 className="section-title">게시글 관리</h3>
          <p className="admin-section-description">새 게시판 스키마와 기존 게시글을 함께 관리합니다.</p>
        </div>
      </div>

      <div className="admin-toolbar">
        <select value={boardFilter} onChange={(event) => setBoardFilter(event.target.value)} className="admin-select">
          {BOARD_FILTERS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
        <label className="admin-search-wrap">
          <Search size={16} />
          <input
            className="admin-search"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="제목, 작성자, 게시판 검색"
          />
        </label>
      </div>

      {loading ? (
        <div className="admin-empty">게시글을 불러오는 중입니다.</div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">표시할 게시글이 없습니다.</div>
      ) : (
        <div className="admin-list">
          {filtered.map((post) => (
            <div key={post.id} className="admin-post-card">
              <div className="admin-post-main">
                <div className="admin-badge-row">
                  <span
                    className="admin-chip"
                    style={{
                      color: BOARD_TAG_COLORS[post.boardKey] || 'var(--primary)',
                      background: `${BOARD_TAG_COLORS[post.boardKey] || '#2563eb'}18`,
                    }}
                  >
                    {post.boardLabel}
                  </span>
                  <span className="admin-chip">{post.scope === 'school' ? '학교' : '전체'}</span>
                  {post.anonymous && <span className="admin-chip warning">익명</span>}
                  {post.isPinned && <span className="admin-chip danger">고정</span>}
                </div>
                <div className="admin-list-title">{post.title}</div>
                <div className="admin-meta-row">
                  <span>작성자 {post.authorDisplayName}</span>
                  <span>{formatBoardDate(post.createdAt)}</span>
                  <span>
                    <MessageSquare size={14} /> {post.comments.toLocaleString()}
                  </span>
                  <span>
                    <ThumbsUp size={14} /> {post.likes.toLocaleString()}
                  </span>
                  <span>
                    <Bookmark size={14} /> {post.bookmarks.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="admin-inline-actions">
                <Link to={`/post/${post.id}`} className="admin-btn admin-link-btn" target="_blank" rel="noreferrer">
                  상세 보기
                </Link>
                <button type="button" className="admin-btn" onClick={() => void togglePin(post)}>
                  <Pin size={16} />
                  {post.isPinned ? '고정 해제' : '고정'}
                </button>
                <button type="button" className="admin-btn delete" onClick={() => setConfirmDeletePost(post)}>
                  <Trash2 size={16} />
                  삭제
                </button>
                <button type="button" className="admin-btn" onClick={() => setExpandedId(expandedId === post.id ? null : post.id)}>
                  <MessageSquare size={16} />
                  댓글
                </button>
              </div>

              {expandedId === post.id && (
                <div className="admin-comment-panel">
                  {commentLoading ? (
                    <div className="admin-muted">댓글을 불러오는 중입니다.</div>
                  ) : (commentsByPost[post.id] || []).length === 0 ? (
                    <div className="admin-muted">댓글이 없습니다.</div>
                  ) : (
                    (commentsByPost[post.id] || []).map((comment) => (
                      <div key={comment.id} className="admin-comment-row">
                        <div>
                          <strong>{comment.author || '익명'}</strong>
                          <div className="admin-muted">{formatBoardDate(comment.created_at)}</div>
                          <div>{comment.content || ''}</div>
                        </div>
                        <button
                          type="button"
                          className="admin-btn delete"
                          onClick={() => setConfirmDeleteComment({ postId: post.id, commentId: comment.id })}
                        >
                          삭제
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="admin-pagination">
        <button type="button" className="admin-btn approve" disabled={loadingMore || !lastDoc} onClick={loadMore}>
          {loadingMore ? '불러오는 중' : '더 불러오기'}
        </button>
      </div>
    </div>
  );
}
