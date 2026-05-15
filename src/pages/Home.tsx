import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Clock3,
  Megaphone,
  Sparkles,
  ThumbsUp,
  Trophy,
  Utensils,
} from 'lucide-react';
import { collection, doc, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { getMealData } from '../api/neisApi';
import FloatingAction from '../components/ui/FloatingAction';
import { db } from '../firebase';
import { useAuthStore } from '../store/authStore';
import './Home.css';

type PostRow = {
  id: string;
  title: string;
  content: string;
  board?: string;
  author?: string;
  likes?: number;
  comments?: number;
  created_at?: number;
};

type SchoolRanking = {
  id: string;
  schoolName?: string;
  points?: number;
};

type MealSummary = {
  lunch?: string;
  dinner?: string;
};

type TimetableSummary = {
  period: string;
  subject: string;
};

export default function Home() {
  const { user } = useAuthStore();
  const [popularPosts, setPopularPosts] = useState<PostRow[]>([]);
  const [latestPosts, setLatestPosts] = useState<PostRow[]>([]);
  const [schoolRankings, setSchoolRankings] = useState<SchoolRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<string[]>([
    'Schooly에 오신 것을 환영합니다.',
    '급식, 시간표, 커뮤니티를 한곳에서 편하게 확인해 보세요.',
  ]);
  const [todayMeal, setTodayMeal] = useState<MealSummary | null>(null);
  const [todayTimetable, setTodayTimetable] = useState<TimetableSummary[]>([]);

  useEffect(() => {
    const postQuery = query(collection(db, 'posts'), orderBy('created_at', 'desc'), limit(20));
    const unsubscribePosts = onSnapshot(
      postQuery,
      (snap) => {
        const rows = snap.docs.map((entry) => ({ id: entry.id, ...(entry.data() as Omit<PostRow, 'id'>) })) as PostRow[];
        setLatestPosts(rows.slice(0, 6));
        setPopularPosts([...rows].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 3));
        setLoading(false);
      },
      (error) => {
        console.error('Home posts error:', error);
        setLoading(false);
      }
    );

    const unsubscribeAnnouncements = onSnapshot(
      doc(db, 'settings', 'announcements'),
      (snap) => {
        if (!snap.exists()) return;
        const list = snap.data().list;
        if (Array.isArray(list) && list.length > 0) {
          setAnnouncements(list as string[]);
        }
      },
      (error) => console.error('Announcements error:', error)
    );

    const unsubscribeRankings = onSnapshot(
      query(collection(db, 'school_stats'), orderBy('points', 'desc'), limit(5)),
      (snap) => {
        setSchoolRankings(snap.docs.map((entry) => ({ id: entry.id, ...(entry.data() as Omit<SchoolRanking, 'id'>) })));
      }
    );

    return () => {
      unsubscribePosts();
      unsubscribeAnnouncements();
      unsubscribeRankings();
    };
  }, []);

  useEffect(() => {
    const fetchTodayInfo = async () => {
      if (!user?.isStudent || !user?.schoolCode) {
        setTodayMeal(null);
        setTodayTimetable([]);
        return;
      }

      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');

      try {
        const meal = (await getMealData(today, user.officeCode || '', user.schoolCode)) as MealSummary | null;
        setTodayMeal(meal);

        const { getTimetableData } = await import('../api/neisApi');
        if (user.grade && user.class) {
          const timetable = (await getTimetableData(
            today,
            user.grade,
            user.class,
            user.officeCode || '',
            user.schoolCode
          )) as TimetableSummary[];
          setTodayTimetable(timetable.slice(0, 4));
        }
      } catch (error) {
        console.error('Home today info fetch error:', error);
      }
    };

    void fetchTodayInfo();
  }, [user?.isStudent, user?.schoolCode, user?.officeCode, user?.grade, user?.class]);

  const primaryMessage = !user
    ? '학교 생활에 필요한 정보를 한곳에서 빠르게 확인해 보세요.'
    : !user.schoolCode
      ? '학교 정보를 연결하면 더 많은 기능을 바로 사용할 수 있어요.'
      : `${user.schoolName || '우리 학교'}의 오늘 흐름을 빠르게 확인해 보세요.`;

  const quickStats = [
    {
      label: '오늘 급식',
      value: todayMeal ? todayMeal.lunch || todayMeal.dinner || '식단 정보 없음' : '학교 정보 연결 필요',
      to: '/meals',
      icon: Utensils,
    },
    {
      label: '오늘 시간표',
      value:
        todayTimetable.length > 0
          ? todayTimetable.map((item) => `${item.period}교시 ${item.subject}`).slice(0, 2).join(' · ')
          : '시간표 정보 없음',
      to: '/timetable',
      icon: CalendarDays,
    },
    {
      label: '바로가기',
      value: user?.schoolCode ? '학교 게시판과 프로필 설정 열기' : '먼저 학교 정보를 등록해 보세요',
      to: user?.schoolCode ? '/board' : '/mypage/edit-profile',
      icon: Sparkles,
    },
  ];

  const summaryLinks = [
    { to: '/board', label: '게시판 보기' },
    { to: '/write', label: '글 작성하기' },
    { to: '/mypage', label: '프로필 관리' },
  ];

  const formatDate = (value?: number) => {
    if (!value) return '';
    const date = new Date(value);
    return `${date.getMonth() + 1}.${date.getDate()} · ${String(date.getHours()).padStart(2, '0')}:${String(
      date.getMinutes()
    ).padStart(2, '0')}`;
  };

  return (
    <div className="home-page animate-fade-in">
      <section className="home-hero">
        <div className="home-hero-main">
          <span className="hero-chip">Schooly Home</span>
          <h1>{user ? `${user.name}님을 위한 오늘의 Schooly` : '복잡하지 않은 학교 커뮤니티'}</h1>
          <p>{primaryMessage}</p>

          <div className="hero-link-row">
            {summaryLinks.map((item) => (
              <Link key={item.to} to={item.to} className="hero-inline-link">
                {item.label}
                <ArrowUpRight size={16} />
              </Link>
            ))}
          </div>
        </div>

        <div className="home-hero-side">
          <div className="hero-notice-card">
            <div className="hero-notice-head">
              <Megaphone size={16} />
              <span>공지</span>
            </div>
            <strong>{announcements[0] || '새 공지를 확인해 보세요.'}</strong>
            <p>{announcements[1] || '여기에 오늘 필요한 핵심 정보를 먼저 보여드릴게요.'}</p>
          </div>
        </div>
      </section>

      <section className="home-strip">
        {quickStats.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} to={item.to} className="strip-card">
              <span className="strip-icon">
                <Icon size={18} />
              </span>
              <div className="strip-copy">
                <small>{item.label}</small>
                <strong>{item.value}</strong>
              </div>
              <ChevronRight size={18} className="strip-arrow" />
            </Link>
          );
        })}
      </section>

      {!user?.schoolCode && (
        <section className="home-banner">
          <div>
            <strong>학교 정보를 등록하면 급식과 시간표가 자동으로 연결됩니다.</strong>
            <p>더 편하게 쓰고 싶다면 마이페이지에서 학교 정보를 먼저 설정해 주세요.</p>
          </div>
          <Link to="/mypage/edit-profile" className="home-banner-link">
            설정하러 가기
          </Link>
        </section>
      )}

      <section className="home-grid">
        <article className="home-panel">
          <div className="panel-head">
            <h2>
              <ThumbsUp size={18} />
              인기 게시글
            </h2>
            <Link to="/board">더 보기</Link>
          </div>

          {loading ? (
            <div className="home-empty">게시글을 불러오는 중입니다.</div>
          ) : popularPosts.length === 0 ? (
            <div className="home-empty">인기 게시글이 아직 없습니다.</div>
          ) : (
            <div className="feature-list">
              {popularPosts.map((post, index) => (
                <Link key={post.id} to={`/post/${post.id}`} className="feature-item">
                  <span className="feature-rank">0{index + 1}</span>
                  <div className="feature-copy">
                    <strong>{post.title}</strong>
                    <p>{post.board || '게시판'} · 좋아요 {post.likes || 0} · 댓글 {post.comments || 0}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </article>

        <article className="home-panel">
          <div className="panel-head">
            <h2>
              <Clock3 size={18} />
              최신 게시글
            </h2>
            <Link to="/board">더 보기</Link>
          </div>

          {loading ? (
            <div className="home-empty">게시글을 불러오는 중입니다.</div>
          ) : latestPosts.length === 0 ? (
            <div className="home-empty">작성된 글이 아직 없습니다.</div>
          ) : (
            <div className="feed-list">
              {latestPosts.map((post) => (
                <Link key={post.id} to={`/post/${post.id}`} className="feed-row">
                  <div className="feed-main">
                    <span className="feed-board">{post.board || '게시판'}</span>
                    <strong>{post.title}</strong>
                  </div>
                  <span className="feed-time">{formatDate(post.created_at)}</span>
                </Link>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="home-ranking-panel">
        <div className="panel-head">
          <h2>
            <Trophy size={18} />
            학교 랭킹
          </h2>
        </div>

        {schoolRankings.length === 0 ? (
          <div className="home-empty">학교 랭킹 데이터가 아직 없습니다.</div>
        ) : (
          <div className="ranking-list-clean">
            {schoolRankings.map((school, index) => (
              <div key={school.id} className="ranking-row-clean">
                <span className="ranking-index">{index + 1}</span>
                <strong>{school.schoolName}</strong>
                <span>{school.points?.toLocaleString() || 0} pts</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <FloatingAction />
    </div>
  );
}
