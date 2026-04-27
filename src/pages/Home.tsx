import { useState, useEffect } from 'react';
import { Megaphone, TrendingUp, Clock, ThumbsUp, MessageCircle, Eye, ChevronRight, Sparkles, Utensils, CalendarDays } from 'lucide-react';
import { getMealData } from '../api/neisApi';
import { useAuthStore } from '../store/authStore';
import { Link } from 'react-router-dom';
import FloatingAction from '../components/ui/FloatingAction';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, limit } from 'firebase/firestore';
import './Home.css';

// const announcements = [
//   "🔐 교내 와이파이 비밀번호 변경 안내",
//   "🎉 미니게임 신규 업데이트! 운세뽑기 추가됨",
// ];


const hotTopics = [
  { keyword: '없음', count: 0 },

];

export default function Home() {
  const [popularPosts, setPopularPosts] = useState<any[]>([]);
  const [latestPosts, setLatestPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<string[]>(["환영합니다! 우리 학교 커뮤니티입니다.", "건전한 커뮤니티 문화를 함께 만들어가요."]);

  // 오늘의 정보 State
  const { user } = useAuthStore();
  const [todayMeal, setTodayMeal] = useState<any>(null);
  const [todayTimetable, setTodayTimetable] = useState<any[]>([]);



  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('created_at', 'desc'), limit(20));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      setLatestPosts(data.slice(0, 8));
      const sortedByLikes = [...data].sort((a, b) => (b.likes || 0) - (a.likes || 0));
      setPopularPosts(sortedByLikes.slice(0, 4));
      setLoading(false);
    }, (err) => {
      console.error('Home posts error:', err);
      setLoading(false);
    });


    // 공지사항 구독
    const unsubAnnounce = onSnapshot(doc(db, 'settings', 'announcements'),
      (snap) => {
        if (snap.exists()) {
          const list = snap.data().list;
          if (list && list.length > 0) setAnnouncements(list);
        }
      },
      (err) => console.error('Announcements error:', err)
    );

    // 오늘의 급식 & 시간표 조회
    const now = new Date();
    const fetchTodayInfo = async () => {
      try {
        const yyyymmdd = now.toISOString().split('T')[0].replace(/-/g, '');
        const meal = await getMealData(yyyymmdd);
        setTodayMeal(meal);
      } catch (e) {
        console.error('Meal fetch error:', e);
      }
    };

    fetchTodayInfo();

    // 오늘의 시간표 실시간 구독 (Firestore Manual)
    let unsubTT: any = null;
    if (user?.grade && user?.class) {
      unsubTT = onSnapshot(doc(db, 'timetables', `${user.grade}-${user.class}`),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const daysK = ['일', '월', '화', '수', '목', '금', '토'];
            const dayName = daysK[now.getDay()];
            const todayList = data[dayName] || {};

            const formatted = Object.entries(todayList)
              .filter(([_, s]) => s !== '') // 빈 값 제외
              .map(([p, s]) => ({
                period: p,
                subject: s
              })).sort((a: any, b: any) => parseInt(a.period) - parseInt(b.period));

            setTodayTimetable(formatted);
          }
        },
        (err) => {
          console.error('Timetable sync error:', err);
        }
      );
    }

    return () => {
      unsub();
      unsubAnnounce();
      if (unsubTT) unsubTT();
    };
  }, [user?.grade, user?.class]);






  const formatDate = (ts: number) => {
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const getTagColor = (tag: string) => {
    const colors: Record<string, string> = {
      '1학년': '#00B894', '2학년': '#6C5CE7', '3학년': '#E17055',
      '학생회': '#0984E3', '자유게시판': '#FDCB6E', '공지사항': '#FF4757'
    };
    return colors[tag] || '#6C5CE7';
  };

  return (
    <div className="home-page animate-fade-in">
      <div className="announcement-banner">
        <Megaphone size={20} />
        <div className="ticker-wrap">
          <div className="ticker-content">
            {announcements.map((text, i) => (
              <span key={i} className="ticker-item">{text}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="home-dashboard">
        <div className="dash-card meal-dash" onClick={() => window.location.href = '/meals'}>
          <div className="dash-card-header">
            <Utensils size={18} /> <span>오늘의 식단</span>
          </div>
          <div className="dash-card-content">
            {todayMeal ? (
              <div className="meal-summary">
                <p className="meal-main-text">{todayMeal?.lunch || todayMeal?.dinner || '식단 정보가 없습니다.'}</p>
                <span className="meal-info-v3">가장 가까운 식단 정보입니다.</span>
              </div>
            ) : <p className="loading-text">급식을 불러오는 중...</p>}
          </div>

        </div>

        <div className="dash-card timetable-dash" onClick={() => window.location.href = '/timetable'}>
          <div className="dash-card-header">
            <CalendarDays size={18} /> <span>오늘의 시간표</span>
          </div>
          <div className="dash-card-content">
            {user?.grade && user?.class ? (
              todayTimetable.length > 0 ? (
                <div className="tt-summary">
                  <div className="tt-scroll-box">
                    {todayTimetable.slice(0, 4).map((item, i) => (
                      <div key={i} className="tt-mini-cell">
                        <span className="tt-p">{item.period}</span>
                        <span className="tt-s">{item.subject}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="loading-text">시간표를 불러오는 중...</p>
            ) : (
              <div className="tt-request">
                <p>정보를 설정해주세요</p>
                <Link to="/mypage" className="tt-link-btn">설정하러가기</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="hot-topics">

        <Sparkles size={16} className="text-primary" />
        <span className="hot-label">인기 키워드</span>
        {hotTopics.map((t, i) => (
          <button key={i} className="hot-chip">{t.keyword} <span className="chip-count">{t.count}</span></button>
        ))}
      </div>

      <section className="home-section">
        <div className="section-header">
          <h2 className="section-title"><TrendingUp size={22} /> <span className="text-gradient">인기 게시글</span></h2>
          <Link to="/board" className="view-more">더보기 <ChevronRight size={16} /></Link>
        </div>

        {loading ? <div style={{ padding: '20px', color: '#888' }}>로딩 중...</div> : (
          <div className="post-grid">
            {popularPosts.length === 0 ? <p style={{ color: '#888', gridColumn: 'span 2' }}>인기 게시글이 없습니다.</p> : popularPosts.map((post, idx) => (
              <Link to={`/post/${post.id}`} key={post.id} className="post-card" style={{ animationDelay: `${idx * 0.08}s` }}>
                <div className="card-accent" style={{ background: getTagColor(post.board) }}></div>
                <div className="post-tag" style={{ backgroundColor: `${getTagColor(post.board)}18`, color: getTagColor(post.board) }}>{post.board}</div>
                <h3 className="post-title">{post.title}</h3>
                <p className="post-preview">{post.content}</p>
                <div className="post-footer">
                  <span className="post-author">{post.author}</span>
                  <div className="post-stats-row">
                    <span className="post-stat"><ThumbsUp size={13} /> {post.likes}</span>
                    <span className="post-stat"><MessageCircle size={13} /> {post.comments}</span>
                    <span className="post-stat"><Eye size={13} /> {post.views}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="home-section">
        <div className="section-header">
          <h2 className="section-title"><Clock size={22} className="text-primary" /> 최신 게시글</h2>
          <Link to="/board" className="view-more">더보기 <ChevronRight size={16} /></Link>
        </div>
        {loading ? <div style={{ padding: '20px', color: '#888' }}>로딩 중...</div> : (
          <div className="post-list">
            {latestPosts.length === 0 ? <div style={{ padding: '20px', color: '#888' }}>작성된 글이 없습니다.</div> : latestPosts.map((post, idx) => (
              <Link to={`/post/${post.id}`} key={post.id} className="list-item" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="list-item-main">
                  <span className="list-tag" style={{ color: getTagColor(post.board) }}>{post.board}</span>
                  <h4 className="list-title">{post.title}</h4>
                </div>
                <div className="list-item-meta">
                  <span className="list-comments" style={{ color: 'var(--primary)' }}>[{post.comments}]</span>
                  <span className="list-time">{formatDate(post.created_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <FloatingAction />
    </div>
  );
}
