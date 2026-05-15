import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, Eye, MessageCircle, Search, ThumbsUp, UserRound } from 'lucide-react';
import { collection, doc, getDoc, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { formatBoardDate, normalizePost, type NormalizedPost } from '../constants/boardUi';
import { db } from '../firebase';
import { getVisibleSchoolName } from '../lib/schoolPrivacy';
import { useAuthStore, type User } from '../store/authStore';
import './SearchPage.css';

const USER_LIMIT = 120;
const POST_LIMIT = 160;

type SearchUser = {
  id: string;
  email?: string;
  name?: string;
  handle?: string;
  photoURL?: string | null;
  schoolName?: string;
  schoolCode?: string;
  settings?: User['settings'];
  points?: number;
  level?: number;
};

function normalizeKeyword(value: string) {
  return value.trim().toLowerCase().replace(/^#/, '');
}

function includesKeyword(values: Array<string | number | null | undefined>, keyword: string) {
  return values.some((value) => String(value ?? '').toLowerCase().includes(keyword));
}

function buildPostPreview(content: string) {
  const compact = content.replace(/\s+/g, ' ').trim();
  if (!compact) return '본문 미리보기가 없습니다.';
  return compact.length > 96 ? `${compact.slice(0, 96)}...` : compact;
}

export default function SearchPage() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const queryText = searchParams.get('q') || '';
  const keyword = useMemo(() => normalizeKeyword(queryText), [queryText]);
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [posts, setPosts] = useState<NormalizedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!keyword) {
      setUsers([]);
      setPosts([]);
      setLoading(false);
      setError('');
      return;
    }

    let cancelled = false;

    const fetchResults = async () => {
      setLoading(true);
      setError('');

      try {
        const [userSnap, postSnap] = await Promise.all([
          getDocs(query(collection(db, 'users'), orderBy('points', 'desc'), limit(USER_LIMIT))),
          getDocs(query(collection(db, 'posts'), orderBy('created_at', 'desc'), limit(POST_LIMIT))),
        ]);

        if (cancelled) return;

        const normalizedPosts = postSnap.docs.map((entry) => normalizePost(entry.id, entry.data()));
        const loadedUsers = userSnap.docs.map((entry) => ({ id: entry.id, ...(entry.data() as Omit<SearchUser, 'id'>) }));
        const loadedUserIds = new Set(loadedUsers.map((entry) => entry.id));
        const missingAuthorIds = Array.from(
          new Set(normalizedPosts.map((post) => post.authorId).filter((authorId): authorId is string => Boolean(authorId)))
        ).filter((authorId) => !loadedUserIds.has(authorId));
        const missingAuthors = await Promise.all(
          missingAuthorIds.map(async (authorId) => {
            const snap = await getDoc(doc(db, 'users', authorId));
            return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<SearchUser, 'id'>) } as SearchUser) : null;
          })
        );

        if (cancelled) return;

        setUsers([...loadedUsers, ...missingAuthors.filter((entry): entry is SearchUser => Boolean(entry))]);
        setPosts(normalizedPosts);
      } catch (searchError) {
        console.error('Global search error:', searchError);
        if (!cancelled) {
          setError('검색 결과를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchResults();

    return () => {
      cancelled = true;
    };
  }, [keyword]);

  const filteredUsers = useMemo(
    () =>
      users.filter((entry) => {
        const visibleSchoolName = getVisibleSchoolName(entry, user);
        return includesKeyword([entry.name, entry.handle, entry.email, visibleSchoolName], keyword);
      }),
    [keyword, user, users]
  );

  const usersById = useMemo(
    () =>
      users.reduce<Record<string, SearchUser>>((acc, entry) => {
        acc[entry.id] = entry;
        return acc;
      }, {}),
    [users]
  );

  const filteredPosts = useMemo(
    () =>
      posts.filter((post) => {
        const authorProfile = post.authorId ? usersById[post.authorId] : undefined;
        const visibleSchoolName = getVisibleSchoolName(
          authorProfile || {
            id: post.authorId || '',
            schoolCode: post.schoolCode || '',
            schoolName: post.schoolName || '',
          },
          user
        );
        return includesKeyword(
          [post.title, post.content, post.authorDisplayName, post.boardLabel, visibleSchoolName, ...post.tags],
          keyword
        );
      }),
    [keyword, posts, user, usersById]
  );

  const hasResults = filteredUsers.length > 0 || filteredPosts.length > 0;

  return (
    <div className="search-page">
      <section className="search-hero">
        <div>
          <span className="search-kicker">Global Search</span>
          <h1>통합 검색</h1>
          <p>{queryText ? `"${queryText}" 검색 결과입니다.` : '상단 검색창에서 계정이나 게시물을 찾아보세요.'}</p>
        </div>
      </section>

      {!keyword ? (
        <div className="search-state-card">
          <Search size={28} />
          <strong>검색어를 입력해 주세요.</strong>
          <span>게시글 제목, 내용, 작성자, 태그와 계정 이름, 핸들, 학교를 검색할 수 있습니다.</span>
        </div>
      ) : loading ? (
        <div className="search-state-card">
          <div className="search-spinner" />
          <strong>검색 중입니다.</strong>
          <span>계정과 게시물을 함께 찾고 있어요.</span>
        </div>
      ) : error ? (
        <div className="search-state-card search-error">
          <strong>{error}</strong>
        </div>
      ) : !hasResults ? (
        <div className="search-state-card">
          <Search size={28} />
          <strong>검색 결과가 없습니다.</strong>
          <span>다른 이름, 태그, 제목으로 다시 검색해 보세요.</span>
        </div>
      ) : (
        <div className="search-results-grid">
          <section className="search-section">
            <div className="search-section-header">
              <h2>계정</h2>
              <span>{filteredUsers.length.toLocaleString()}개</span>
            </div>

            {filteredUsers.length === 0 ? (
              <p className="search-empty-line">일치하는 계정이 없습니다.</p>
            ) : (
              <div className="account-result-list">
                {filteredUsers.map((entry) => {
                  const displayName = entry.name || '이름 없음';
                  const handle = entry.handle || entry.id.slice(0, 8);
                  const profilePath = entry.id === user?.id ? '/mypage' : `/profile/${entry.id}`;
                  const visibleSchoolName = getVisibleSchoolName(entry, user);

                  return (
                    <Link className="account-result-card" to={profilePath} key={entry.id}>
                      {entry.photoURL ? (
                        <img src={entry.photoURL} alt={displayName} />
                      ) : (
                        <div className="account-result-avatar">{displayName.slice(0, 1)}</div>
                      )}
                      <div>
                        <strong>{displayName}</strong>
                        <span>@{handle}</span>
                        <small>{visibleSchoolName || '학교 정보 없음'}</small>
                      </div>
                      <em>{(entry.points || 0).toLocaleString()}P</em>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section className="search-section">
            <div className="search-section-header">
              <h2>게시물</h2>
              <span>{filteredPosts.length.toLocaleString()}개</span>
            </div>

            {filteredPosts.length === 0 ? (
              <p className="search-empty-line">일치하는 게시물이 없습니다.</p>
            ) : (
              <div className="post-result-list">
                {filteredPosts.map((post) => (
                  <Link className="post-result-card" to={`/post/${post.id}`} key={post.id}>
                    <div className="post-result-topline">
                      <span>{post.boardLabel}</span>
                      <span>
                        <CalendarDays size={14} />
                        {formatBoardDate(post.createdAt)}
                      </span>
                    </div>
                    <h3>{post.title}</h3>
                    <p>{buildPostPreview(post.content)}</p>
                    {post.tags.length > 0 && (
                      <div className="post-result-tags">
                        {post.tags.slice(0, 4).map((tag) => (
                          <span key={tag}>#{tag}</span>
                        ))}
                      </div>
                    )}
                    <div className="post-result-meta">
                      <span>
                        <UserRound size={14} />
                        {post.authorDisplayName}
                      </span>
                      <span>
                        <ThumbsUp size={14} />
                        {post.likes.toLocaleString()}
                      </span>
                      <span>
                        <MessageCircle size={14} />
                        {post.comments.toLocaleString()}
                      </span>
                      <span>
                        <Eye size={14} />
                        {post.views.toLocaleString()}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
