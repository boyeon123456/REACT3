import { useCallback, useEffect, useMemo, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Bookmark,
  Eye,
  Flame,
  Image as ImageIcon,
  MessageCircle,
  PenLine,
  Search,
  ShieldCheck,
  ThumbsUp,
  X,
} from 'lucide-react';
import { collection, doc, getDoc, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore, type User } from '../store/authStore';
import StorageImage from '../components/media/StorageImage';
import { getVisibleSchoolName } from '../lib/schoolPrivacy';
import {
  BOARD_FILTERS,
  BOARD_SORT_OPTIONS,
  type BoardKey,
  type BoardScope,
  type BoardSort,
  formatBoardDate,
  normalizePost,
  type NormalizedPost,
} from '../constants/boardUi';
import './Board.css';

const LOAD_SIZE = 80;
const DESKTOP_INITIAL_VISIBLE = 25;
const MOBILE_INITIAL_VISIBLE = 12;
const MOBILE_QUERY = '(max-width: 768px)';
type BoardFilter = 'all' | BoardKey;
type ShopItemRow = {
  id: string;
  style?: string;
};
type AuthorProfile = Pick<User, 'id' | 'schoolCode' | 'schoolName' | 'settings'>;

const isBoardFilter = (value: string | null): value is BoardFilter =>
  value === 'all' || BOARD_FILTERS.some((board) => board.key === value);

const isBoardScope = (value: string | null): value is BoardScope => value === 'global' || value === 'school';

const isBoardSort = (value: string | null): value is BoardSort =>
  BOARD_SORT_OPTIONS.some((option) => option.key === value);

function getInitialVisibleLimit() {
  if (typeof window === 'undefined') return DESKTOP_INITIAL_VISIBLE;
  return window.matchMedia(MOBILE_QUERY).matches ? MOBILE_INITIAL_VISIBLE : DESKTOP_INITIAL_VISIBLE;
}

export default function Board() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<NormalizedPost[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<NormalizedPost[]>([]);
  const [shopItemsMap, setShopItemsMap] = useState<Record<string, ShopItemRow>>({});
  const [authorProfiles, setAuthorProfiles] = useState<Record<string, AuthorProfile>>({});
  const [loading, setLoading] = useState(true);
  const [activeBoard, setActiveBoard] = useState<BoardFilter>(() => {
    const board = searchParams.get('board');
    return isBoardFilter(board) ? board : 'all';
  });
  const [scope, setScope] = useState<BoardScope>(() => {
    const nextScope = searchParams.get('scope');
    return isBoardScope(nextScope) ? nextScope : 'global';
  });
  const [sort, setSort] = useState<BoardSort>(() => {
    const nextSort = searchParams.get('sort');
    return isBoardSort(nextSort) ? nextSort : 'latest';
  });
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchParams.get('search') || '');
  const [visibleLimit, setVisibleLimit] = useState(() => getInitialVisibleLimit());
  const canUseSchool = Boolean(user?.isStudent && user?.schoolCode);
  const userSchoolCode = user?.schoolCode;

  const resetVisibleLimit = useCallback(() => {
    setVisibleLimit(getInitialVisibleLimit());
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('created_at', 'desc'), limit(LOAD_SIZE));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setPosts(snap.docs.map((entry) => normalizePost(entry.id, entry.data())));
        setLoading(false);
      },
      (error) => {
        console.error('Board subscription error:', error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    if (!user) {
      setShopItemsMap({});
      return undefined;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'shop_items'),
      (snap) => {
        const next: Record<string, ShopItemRow> = {};
        snap.forEach((entry) => {
          next[entry.id] = { id: entry.id, ...(entry.data() as Omit<ShopItemRow, 'id'>) };
        });
        setShopItemsMap(next);
      },
      (error) => console.error('Shop items subscription error:', error)
    );
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('likes', 'desc'), limit(8));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setTrendingPosts(snap.docs.map((entry) => normalizePost(entry.id, entry.data())));
      },
      (error) => console.error('Trending subscription error:', error)
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const authorIds = Array.from(
      new Set(
        [...posts, ...trendingPosts]
          .map((post) => post.authorId)
          .filter((authorId): authorId is string => Boolean(authorId))
      )
    ).filter((authorId) => !authorProfiles[authorId]);

    if (authorIds.length === 0) return;

    let cancelled = false;
    Promise.all(
      authorIds.map(async (authorId) => {
        const snap = await getDoc(doc(db, 'users', authorId));
        return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<User, 'id'>) } as AuthorProfile) : null;
      })
    )
      .then((profiles) => {
        if (cancelled) return;
        setAuthorProfiles((current) => {
          const next = { ...current };
          profiles.forEach((profile) => {
            if (profile) next[profile.id] = profile;
          });
          return next;
        });
      })
      .catch((error) => console.error('Author profile load error:', error));

    return () => {
      cancelled = true;
    };
  }, [authorProfiles, posts, trendingPosts]);

  useEffect(() => {
    const board = searchParams.get('board');
    const nextBoard = isBoardFilter(board) ? board : 'all';
    if (nextBoard !== activeBoard) {
      const timeout = window.setTimeout(() => setActiveBoard(nextBoard), 0);
      return () => window.clearTimeout(timeout);
    }

    const nextScopeParam = searchParams.get('scope');
    const nextScope = isBoardScope(nextScopeParam) ? nextScopeParam : 'global';
    if (nextScope !== scope) {
      const timeout = window.setTimeout(() => setScope(nextScope), 0);
      return () => window.clearTimeout(timeout);
    }

    const nextSortParam = searchParams.get('sort');
    const nextSort = isBoardSort(nextSortParam) ? nextSortParam : 'latest';
    if (nextSort !== sort) {
      const timeout = window.setTimeout(() => setSort(nextSort), 0);
      return () => window.clearTimeout(timeout);
    }

    const nextSearch = searchParams.get('search') || '';
    if (nextSearch !== searchQuery) {
      const timeout = window.setTimeout(() => {
        setSearchQuery(nextSearch);
        setDebouncedSearchQuery(nextSearch);
      }, 0);
      return () => window.clearTimeout(timeout);
    }
  }, [activeBoard, scope, searchParams, searchQuery, sort]);

  useEffect(() => {
    if (scope === 'school' && !canUseSchool) {
      const timeout = window.setTimeout(() => setScope('global'), 0);
      return () => window.clearTimeout(timeout);
    }

    const next = new URLSearchParams();
    if (activeBoard !== 'all') next.set('board', activeBoard);
    if (scope !== 'global') next.set('scope', scope);
    if (sort !== 'latest') next.set('sort', sort);
    if (debouncedSearchQuery.trim()) next.set('search', debouncedSearchQuery);

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [activeBoard, canUseSchool, debouncedSearchQuery, scope, searchParams, setSearchParams, sort]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    resetVisibleLimit();
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    resetVisibleLimit();
  };

  const keyword = debouncedSearchQuery.trim().toLowerCase().replace(/^#/, '');
  const filtered = useMemo(
    () =>
      posts
        .filter((post) => {
      if (scope === 'school') {
        if (!userSchoolCode) return false;
        if (post.scope !== 'school' || post.schoolCode !== userSchoolCode) return false;
      } else if (post.scope !== 'global') {
        return false;
      }

      if (activeBoard !== 'all' && post.boardKey !== activeBoard) return false;
      if (!keyword) return true;

      return (
        post.title.toLowerCase().includes(keyword) ||
        post.content.toLowerCase().includes(keyword) ||
        post.authorDisplayName.toLowerCase().includes(keyword) ||
        post.tags.some((tag) => tag.toLowerCase().includes(keyword))
      );
        })
        .sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          if (sort === 'popular') return b.likes - a.likes || b.createdAt - a.createdAt;
          if (sort === 'comments') return b.comments - a.comments || b.createdAt - a.createdAt;
          return b.createdAt - a.createdAt;
        }),
    [activeBoard, keyword, posts, scope, sort, userSchoolCode]
  );

  const visiblePosts = useMemo(() => filtered.slice(0, visibleLimit), [filtered, visibleLimit]);
  const visibleTrending = useMemo(
    () =>
      trendingPosts
        .filter((post) => post.scope === 'global' || (userSchoolCode && post.schoolCode === userSchoolCode))
        .slice(0, 4),
    [trendingPosts, userSchoolCode]
  );

  const getAuthorBannerStyle = useCallback((post: NormalizedPost) => {
    if (post.anonymous) return undefined;
    const profileBgId = post.authorEquipped.profileBg;
    return profileBgId ? shopItemsMap[profileBgId]?.style || '#00aeff' : '#00aeff';
  }, [shopItemsMap]);

  const openAuthorProfile = useCallback(
    (event: MouseEvent | KeyboardEvent, post: NormalizedPost) => {
      if (!post.authorId || post.anonymous) return;
      event.preventDefault();
      event.stopPropagation();
      navigate(post.authorId === user?.id ? '/mypage' : `/profile/${post.authorId}`);
    },
    [navigate, user?.id]
  );

  return (
    <div className="board-page animate-fade-in">
      <section className="board-hero">
        <div>
          <p className="board-kicker">Schooly Board</p>
          <h1>정돈된 학교 커뮤니티 보드</h1>
          <p className="board-subtitle">찾기 쉽고 읽기 편한 구조로 전체 글과 우리 학교 글을 빠르게 오갈 수 있습니다.</p>
        </div>
        <Link to="/write" className="board-write-button">
          <PenLine size={18} />
          새 글 작성
        </Link>
      </section>

      <section className="board-toolbar" aria-label="게시판 필터">
        <div className="board-scope-tabs">
          <button
            className={scope === 'global' ? 'active' : ''}
            onClick={() => {
              setScope('global');
              resetVisibleLimit();
            }}
            type="button"
          >
            전체 보드
          </button>
          <button
            className={scope === 'school' ? 'active' : ''}
            onClick={() => {
              setScope('school');
              resetVisibleLimit();
            }}
            disabled={!canUseSchool}
            title={canUseSchool ? user?.schoolName : '마이페이지에서 학교 정보를 등록하면 사용할 수 있습니다.'}
            type="button"
          >
            우리 학교
          </button>
        </div>

        <label className="board-search">
          <Search size={18} />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="제목, 내용, 작성자, 태그 검색"
          />
          {searchQuery && (
            <button type="button" className="board-search-clear" onClick={handleClearSearch} aria-label="검색 초기화">
              <X size={14} />
            </button>
          )}
        </label>
      </section>

      {scope === 'school' && !canUseSchool && (
        <div className="board-notice">학교 정보를 등록하면 같은 학교 친구들과 학년 게시판까지 함께 볼 수 있습니다.</div>
      )}

      {visibleTrending.length > 0 && !searchQuery && (
        <section className="board-trending" aria-label="인기 게시글">
          <div className="section-title-row">
            <h2>
              <Flame size={18} />
              지금 많이 보는 글
            </h2>
          </div>
          <div className="trend-list">
            {visibleTrending.map((post) => (
              <Link to={`/post/${post.id}`} className="trend-item" key={post.id}>
                <span className="trend-board">{post.boardLabel}</span>
                <strong>{post.title}</strong>
                <span>
                  <ThumbsUp size={13} />
                  {post.likes}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="board-tabs" aria-label="게시판 카테고리">
        {BOARD_FILTERS.map((board) => (
          <button
            type="button"
            key={board.key}
            className={activeBoard === board.key ? 'active' : ''}
            style={activeBoard === board.key ? { borderColor: board.color, color: board.color } : undefined}
            onClick={() => {
              setActiveBoard(board.key);
              resetVisibleLimit();
            }}
          >
            {board.label}
          </button>
        ))}
      </section>

      <section className="board-list-shell">
        <div className="board-list-head">
          <div>
            <strong>{filtered.length.toLocaleString()}</strong>
            <span>개의 글</span>
          </div>
          <div className="board-sort-tabs">
            {BOARD_SORT_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.key}
                className={sort === option.key ? 'active' : ''}
                onClick={() => {
                  setSort(option.key);
                  resetVisibleLimit();
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="board-empty">게시글을 불러오는 중입니다.</div>
        ) : visiblePosts.length === 0 ? (
          <div className="board-empty">조건에 맞는 게시글이 없습니다.</div>
        ) : (
          <div className="board-list">
            {visiblePosts.map((post) => {
              const authorBannerStyle = getAuthorBannerStyle(post);
              const rowStyle = authorBannerStyle ? ({ '--author-banner': authorBannerStyle } as CSSProperties) : undefined;
              const authorProfile = post.authorId ? authorProfiles[post.authorId] : undefined;
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
                <Link
                  to={`/post/${post.id}`}
                  className={`board-row ${post.isPinned ? 'pinned' : ''} ${authorBannerStyle ? 'has-author-banner' : ''}`}
                  style={rowStyle}
                  key={post.id}
                >
                  <div className="board-row-header">
                    <div
                      className={`board-author-avatar ${!post.anonymous && post.authorId ? 'clickable' : ''}`}
                      aria-hidden="true"
                      onClick={(event) => openAuthorProfile(event, post)}
                    >
                      {post.authorDisplayName.slice(0, 1)}
                    </div>
                    <div className="board-author-info">
                      <div className="board-author-line">
                        <strong
                          className={!post.anonymous && post.authorId ? 'board-author-profile-link' : undefined}
                          role={!post.anonymous && post.authorId ? 'link' : undefined}
                          tabIndex={!post.anonymous && post.authorId ? 0 : undefined}
                          onClick={(event) => openAuthorProfile(event, post)}
                          onKeyDown={(event) => {
                            if ((event.key === 'Enter' || event.key === ' ') && !post.anonymous && post.authorId) {
                              openAuthorProfile(event, post);
                            }
                          }}
                        >
                          {post.authorDisplayName}
                        </strong>
                        <time>{formatBoardDate(post.createdAt)}</time>
                      </div>
                      <div className="board-row-labels">
                        {post.isPinned && (
                          <span className="pin-label">
                            <ShieldCheck size={13} />
                            공지
                          </span>
                        )}
                        <span className={`board-chip board-chip-${post.boardKey}`}>{post.boardLabel}</span>
                        {visibleSchoolName && scope === 'global' && <span className="board-meta-pill">{visibleSchoolName}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="board-row-body">
                    <div className="board-row-main">
                      <div className="board-row-title">
                        <strong>{post.title}</strong>
                        {post.imageUrl && <ImageIcon size={14} />}
                        {post.comments > 0 && <span className="comment-badge">[{post.comments}]</span>}
                      </div>
                      {post.content && <p className="board-row-content">{post.content}</p>}
                      {post.tags.length > 0 && (
                        <div className="board-row-tags">
                          {post.tags.slice(0, 3).map((tag) => (
                            <span key={tag}>#{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {post.imageUrl && (
                      <div className="board-row-thumb" aria-hidden="true">
                        <StorageImage src={post.imageUrl} alt="" loading="lazy" />
                      </div>
                    )}
                  </div>

                  <div className="board-row-stats">
                    <span>
                      <ThumbsUp size={13} />
                      좋아요 {post.likes}
                    </span>
                    <span>
                      <MessageCircle size={13} />
                      댓글 {post.comments}
                    </span>
                    <span>
                      <Eye size={13} />
                      조회 {post.views}
                    </span>
                    <span>
                      <Bookmark size={13} />
                      저장 {post.bookmarks}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {filtered.length > visibleLimit && (
        <button type="button" className="board-more-button" onClick={() => setVisibleLimit((prev) => prev + 25)}>
          더 불러오기
        </button>
      )}
    </div>
  );
}
