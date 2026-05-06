import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  startAfter,
  where,
  doc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { Trash2, Pin, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '../../firebase';
import { BOARD_TAG_COLORS } from '../../constants/boardUi';
import { logAdminAction } from '../../lib/adminAudit';
import { useAuthStore } from '../../store/authStore';
import ConfirmModal from '../../components/ui/ConfirmModal';
import type { AdminNotify } from '../../hooks/useAdminToast';

const PAGE_SIZE = 25;
const BOARD_OPTIONS = ['전체', '1학년', '2학년', '3학년', '학생회', '자유게시판', '공지사항'];

type PostRow = {
  id: string;
  title?: string;
  board?: string;
  author?: string;
  created_at?: number;
  isPinned?: boolean;
};

type Props = {
  onNotify?: AdminNotify;
};

export default function PostsTab({ onNotify }: Props) {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [boardFilter, setBoardFilter] = useState('전체');
  const [useClientBoardFallback, setUseClientBoardFallback] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<
    Record<string, { id: string; content?: string; author?: string; created_at?: number }[]>
  >({});

  const [confirmDeletePost, setConfirmDeletePost] = useState<PostRow | null>(null);
  const [confirmDeleteComment, setConfirmDeleteComment] = useState<{
    postId: string;
    commentId: string;
  } | null>(null);

  useEffect(() => {
    if (boardFilter === '전체') {
      setUseClientBoardFallback(false);
    }
  }, [boardFilter]);

  const fetchPage = useCallback(
    async (cursor: DocumentSnapshot | null, append: boolean) => {
      const useServerBoard =
        boardFilter !== '전체' && !useClientBoardFallback;

      try {
        let q;
        if (useServerBoard) {
          q = cursor
            ? query(
                collection(db, 'posts'),
                where('board', '==', boardFilter),
                orderBy('created_at', 'desc'),
                startAfter(cursor),
                limit(PAGE_SIZE)
              )
            : query(
                collection(db, 'posts'),
                where('board', '==', boardFilter),
                orderBy('created_at', 'desc'),
                limit(PAGE_SIZE)
              );
        } else {
          q = cursor
            ? query(
                collection(db, 'posts'),
                orderBy('created_at', 'desc'),
                startAfter(cursor),
                limit(PAGE_SIZE)
              )
            : query(collection(db, 'posts'), orderBy('created_at', 'desc'), limit(PAGE_SIZE));
        }

        const snap = await getDocs(q);
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as PostRow[];

        const last = snap.docs[snap.docs.length - 1];
        setLastDoc(snap.docs.length === PAGE_SIZE ? last ?? null : null);
        if (append) setPosts((prev) => [...prev, ...rows]);
        else setPosts(rows);
      } catch (e: unknown) {
        console.error(e);
        const err = e as { code?: string };
        if (
          useServerBoard &&
          (err.code === 'failed-precondition' || err.code === 'unimplemented')
        ) {
          onNotify?.(
            '게시판별 조회에 Firestore 인덱스가 필요합니다. 전체 목록에서 필터합니다.',
            'error'
          );
          setUseClientBoardFallback(true);
          return;
        }
        onNotify?.('게시글 목록을 불러오지 못했습니다.', 'error');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [boardFilter, useClientBoardFallback, onNotify]
  );

  useEffect(() => {
    setLoading(true);
    setPosts([]);
    setLastDoc(null);
    void fetchPage(null, false);
  }, [boardFilter, useClientBoardFallback, fetchPage]);

  const loadMore = async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    await fetchPage(lastDoc, true);
  };

  useEffect(() => {
    if (!expandedId) return;
    const q = query(
      collection(db, 'posts', expandedId, 'comments'),
      orderBy('created_at', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setCommentsByPost((prev) => ({
        ...prev,
        [expandedId]: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
      }));
    });
    return () => unsub();
  }, [expandedId]);

  const filtered = posts.filter((p) => {
    if (boardFilter !== '전체' && p.board !== boardFilter) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (p.title || '').toLowerCase().includes(q);
  });

  const runDeletePost = async (post: PostRow) => {
    try {
      await deleteDoc(doc(db, 'posts', post.id));
      await logAdminAction(user, 'post.delete', {
        targetCollection: 'posts',
        targetId: post.id,
        detail: { title: post.title },
      });
      setPosts((prev) => prev.filter((x) => x.id !== post.id));
      if (expandedId === post.id) setExpandedId(null);
      onNotify?.('게시글을 삭제했습니다.');
    } catch (e) {
      console.error(e);
      onNotify?.('삭제에 실패했습니다.', 'error');
    }
  };

  const togglePin = async (post: PostRow) => {
    try {
      const next = !post.isPinned;
      await updateDoc(doc(db, 'posts', post.id), { isPinned: next });
      await logAdminAction(user, 'post.pin_toggle', {
        targetCollection: 'posts',
        targetId: post.id,
        detail: { isPinned: next },
      });
      setPosts((prev) =>
        prev.map((x) => (x.id === post.id ? { ...x, isPinned: next } : x))
      );
      onNotify?.(next ? '상단에 고정했습니다.' : '핀을 해제했습니다.');
    } catch (e) {
      console.error(e);
      onNotify?.('핀 처리에 실패했습니다.', 'error');
    }
  };

  const runDeleteComment = async (postId: string, commentId: string) => {
    try {
      await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
      await logAdminAction(user, 'comment.delete', {
        targetCollection: 'posts/' + postId + '/comments',
        targetId: commentId,
      });
      onNotify?.('댓글을 삭제했습니다.');
    } catch (e) {
      console.error(e);
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
        message={
          confirmDeletePost
            ? `「${confirmDeletePost.title || '(제목 없음)'}」을(를) 삭제합니다. 복구할 수 없습니다.`
            : ''
        }
        confirmText="삭제"
        type="danger"
      />

      <ConfirmModal
        isOpen={!!confirmDeleteComment}
        onClose={() => setConfirmDeleteComment(null)}
        onConfirm={() => {
          if (confirmDeleteComment) {
            void runDeleteComment(confirmDeleteComment.postId, confirmDeleteComment.commentId);
          }
        }}
        title="댓글 삭제"
        message="이 댓글을 삭제합니다. 되돌릴 수 없습니다."
        confirmText="삭제"
        type="danger"
      />

      <h3 className="section-title" style={{ marginBottom: '16px' }}>
        게시글 · 댓글 관리
      </h3>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
          alignItems: 'center',
        }}
      >
        <select
          value={boardFilter}
          onChange={(e) => setBoardFilter(e.target.value)}
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid var(--border-light)',
            background: 'var(--bg-main)',
            color: 'var(--text-main)',
          }}
        >
          {BOARD_OPTIONS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <input
          type="search"
          placeholder="제목 검색 (현재 페이지 내)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            minWidth: '200px',
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid var(--border-light)',
            background: 'var(--bg-main)',
            color: 'var(--text-main)',
          }}
        />
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          불러오는 중...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          표시할 게시글이 없습니다. 다른 페이지를 불러오거나 필터를 바꿔 보세요.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map((post) => (
            <div
              key={post.id}
              style={{
                border: '1px solid var(--border-light)',
                borderRadius: '14px',
                padding: '16px',
                background: 'var(--bg-main)',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-start' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: '10px',
                    background: `${BOARD_TAG_COLORS[post.board || ''] || 'var(--primary)'}22`,
                    color: BOARD_TAG_COLORS[post.board || ''] || 'var(--primary)',
                  }}
                >
                  {post.board || '기타'}
                </span>
                {post.isPinned && (
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>
                    고정됨
                  </span>
                )}
              </div>
              <div style={{ fontWeight: 800, fontSize: '16px', marginTop: '8px' }}>
                {post.title || '(제목 없음)'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {post.author} ·{' '}
                {post.created_at
                  ? new Date(post.created_at).toLocaleString('ko-KR')
                  : '-'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                <Link
                  to={`/post/${post.id}`}
                  className="admin-btn"
                  style={{ textDecoration: 'none', fontSize: '13px' }}
                  target="_blank"
                  rel="noreferrer"
                >
                  상세
                </Link>
                <button
                  type="button"
                  className="admin-btn"
                  onClick={() => togglePin(post)}
                  style={{ fontSize: '13px' }}
                >
                  <Pin size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  {post.isPinned ? '핀 해제' : '핀'}
                </button>
                <button
                  type="button"
                  className="admin-btn delete"
                  onClick={() => setConfirmDeletePost(post)}
                  style={{ fontSize: '13px' }}
                >
                  <Trash2 size={14} /> 삭제
                </button>
                <button
                  type="button"
                  className="admin-btn"
                  onClick={() => setExpandedId(expandedId === post.id ? null : post.id)}
                  style={{ fontSize: '13px' }}
                >
                  <MessageSquare size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  댓글
                </button>
              </div>
              {expandedId === post.id && (
                <div
                  style={{
                    marginTop: '14px',
                    paddingTop: '14px',
                    borderTop: '1px solid var(--border-light)',
                  }}
                >
                  {(commentsByPost[post.id] || []).length === 0 ? (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>댓글 없음</div>
                  ) : (
                    (commentsByPost[post.id] || []).map((c) => (
                      <div
                        key={c.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '10px',
                          padding: '10px 0',
                          borderBottom: '1px dashed var(--border-light)',
                          fontSize: '13px',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <strong>{c.author}</strong>{' '}
                          <span style={{ color: 'var(--text-muted)' }}>
                            {c.created_at
                              ? new Date(c.created_at).toLocaleString('ko-KR')
                              : ''}
                          </span>
                          <div style={{ marginTop: '4px' }}>{c.content}</div>
                        </div>
                        <button
                          type="button"
                          className="admin-btn dismiss"
                          style={{ flexShrink: 0, height: 'fit-content' }}
                          onClick={() =>
                            setConfirmDeleteComment({ postId: post.id, commentId: c.id })
                          }
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

      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <button
          type="button"
          className="admin-btn approve"
          disabled={loadingMore || !lastDoc}
          onClick={() => loadMore()}
          style={{ padding: '12px 28px' }}
        >
          {loadingMore ? '불러오는 중...' : '더 불러오기'}
        </button>
      </div>
    </div>
  );
}
