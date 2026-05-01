import { useEffect, useState } from 'react';
import { Flame, Trophy, Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { getWeeklyMeals } from '../../api/neisApi';
import { useAuthStore } from '../../store/authStore';
import './RightPanel.css';

// Static items removed as we now fetch from backend

export default function RightPanel() {
  const [trendingPosts, setTrendingPosts] = useState<any[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [fullTimetable, setFullTimetable] = useState<any>(null);
  const [viewDayIndex, setViewDayIndex] = useState(0);
  const [fullMeals, setFullMeals] = useState<any>(null);
  const [mealDayIndex, setMealDayIndex] = useState(0);
  const daysKR = ['월', '화', '수', '목', '금'];

  const { user } = useAuthStore();

  useEffect(() => {
    const qPosts = query(collection(db, 'posts'), orderBy('likes', 'desc'), limit(5));
    const unsubPosts = onSnapshot(qPosts, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setTrendingPosts(docs.filter(p => p.likes > 0));
    });

    const qUsers = query(collection(db, 'users'), orderBy('points', 'desc'), limit(5));
    const unsubUsers = onSnapshot(qUsers, snap => {
      setTopUsers(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    });

    // Fetch dynamic school data if user is a student
    if (user?.isStudent && user?.schoolCode) {
      // Fetch weekly timetable from NEIS
      import('../../api/neisApi').then(({ getWeeklyTimetable }) => {
        getWeeklyTimetable(
          user.grade || '1', 
          user.class || '1', 
          user.officeCode || '', 
          user.schoolCode || ''
        ).then(data => {
          setFullTimetable(data);
        });
      });

      // Fetch weekly meals from NEIS
      getWeeklyMeals(user.officeCode || '', user.schoolCode || '')
        .then(data => {
          setFullMeals(data);
        })
        .catch(err => console.error('Failed to fetch meals:', err));
    } else {
      setFullTimetable(null);
      setFullMeals(null);
    }

    const day = new Date().getDay(); // 0(Sun) ~ 6(Sat)
    let initialIdx = day - 1; // 0=Mon, 4=Fri
    if (initialIdx < 0 || initialIdx > 4) initialIdx = 0; // Default Mon
    setViewDayIndex(initialIdx);
    setMealDayIndex(initialIdx);

    return () => {
      unsubPosts();
      unsubUsers();
    };
  }, [user?.isStudent, user?.schoolCode, user?.officeCode, user?.grade, user?.class]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🏆';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank.toString();
  };

  const handlePrevDay = () => {
    setViewDayIndex(prev => (prev === 0 ? 4 : prev - 1));
  };

  const handleNextDay = () => {
    setViewDayIndex(prev => (prev === 4 ? 0 : prev + 1));
  };

  const handlePrevMeal = () => {
    setMealDayIndex(prev => (prev === 0 ? 4 : prev - 1));
  };

  const handleNextMeal = () => {
    setMealDayIndex(prev => (prev === 4 ? 0 : prev + 1));
  };

  const currentViewData = fullTimetable ? fullTimetable[daysKR[viewDayIndex]] || [] : [];
  const currentMeal = fullMeals ? fullMeals[daysKR[mealDayIndex]] : null;

  return (
    <aside className="right-panel">
      <div className="panel-widget">
        <h3 className="widget-title">
          <Flame size={18} /> <span className="text-gradient">실시간 트렌드</span>
        </h3>
        <ul className="widget-list">
          {trendingPosts.length === 0 ? <li style={{ fontSize: '13px', color: '#888' }}>트렌드 글이 없습니다.</li> : trendingPosts.map((post, idx) => (
            <li key={post.id} className="widget-item">
              <span className={`rank-num ${idx < 3 ? 'top' : ''}`}>{idx + 1}</span>
              <div className="trend-info">
                <Link to={`/post/${post.id}`} className="trend-title" style={{ textDecoration: 'none' }}>
                  {idx === 0 && <span className="hot-badge">🔥</span>}
                  {post.title}
                </Link>
                <p className="trend-meta">{post.board} • 💬 {post.comments}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="panel-widget">
        <h3 className="widget-title" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} className="text-secondary" />
            {user?.schoolName ? `${user.schoolName} 시간표` : '학급 시간표'} ({daysKR[viewDayIndex]}요일)
          </div>
          <div className="day-nav-btns">
            <button className="nav-btn" onClick={handlePrevDay} title="이전 요일"><ChevronLeft size={16} /></button>
            <button className="nav-btn" onClick={handleNextDay} title="다음 요일"><ChevronRight size={16} /></button>
          </div>
        </h3>
        <div className="schedule-list">
          {!user?.isStudent ? (
            <div className="empty-widget-state">
              <p>학생 유저를 위한 서비스입니다.</p>
            </div>
          ) : !user?.schoolCode ? (
            <div className="empty-widget-state">
              <p>학교 정보를 등록해 주세요.</p>
              <Link to="/mypage" className="setup-link">설정하기</Link>
            </div>
          ) : currentViewData.length === 0 ? (
            <div className="schedule-item">일정이 없습니다.</div>
          ) : (
            currentViewData.map((item: any, i: number) => (
              <div key={i} className={`schedule-item normal`}>
                <span className="schedule-time">{item.period}교시</span>
                <div className="schedule-dot"></div>
                <span className="schedule-event">{item.subject}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="panel-widget">
        <h3 className="widget-title" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} className="text-secondary" /> 오늘의 급식 ({daysKR[mealDayIndex]}요일)
          </div>
          <div className="day-nav-btns">
            <button className="nav-btn" onClick={handlePrevMeal} title="이전 요일"><ChevronLeft size={16} /></button>
            <button className="nav-btn" onClick={handleNextMeal} title="다음 요일"><ChevronRight size={16} /></button>
          </div>
        </h3>
        <div className="school-info-card">
          {!user?.isStudent ? (
            <div className="empty-widget-state">
              <p>급식 정보는 학생 유저 전용입니다.</p>
            </div>
          ) : !user?.schoolCode ? (
            <div className="empty-widget-state">
              <p>학교 정보를 등록해 주세요.</p>
            </div>
          ) : (
            <div className="meal-section">
              <div className="meal-info">
                <span className="meal-label">🍚 중식</span>
                <p>{currentMeal?.lunch || '데이터가 없습니다.'}</p>
              </div>
              <div className="meal-info" style={{ marginTop: '8px' }}>
                <span className="meal-label" style={{ color: '#FF7675' }}>🌙 석식</span>
                <p>{currentMeal?.dinner || '데이터가 없습니다.'}</p>
              </div>
            </div>
          )}
          {user?.isStudent && user?.schoolCode && (
            <Link to="/meals" className="view-more-btn">자세히 보기</Link>
          )}
        </div>
      </div>

      <div className="panel-widget">
        <h3 className="widget-title">
          <Trophy size={18} className="text-primary" /> 명예의 전당
        </h3>
        <ul className="ranking-list">
          {topUsers.length === 0 ? <li style={{ fontSize: '13px', color: '#888' }}>랭킹 데이터가 없습니다.</li> : topUsers.map((u, idx) => (
            <li key={u.id} className="ranking-item">
              <span className={`badge-rank rank-${idx + 1}`}>{getRankBadge(idx + 1)}</span>
              <div className="ranking-info" style={{ marginLeft: '4px' }}>
                <p className="ranking-name">{u.name}</p>
                <div className="ranking-bar-wrap">
                  <div className="ranking-bar" style={{ width: `${Math.min((u.points / 2500) * 100, 100)}%` }}></div>
                </div>
              </div>
              <span className="ranking-points">{u.points?.toLocaleString() || 0} P</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
