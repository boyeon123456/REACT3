import { useEffect, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, Flame, Trophy } from 'lucide-react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { getWeeklyMeals } from '../../api/neisApi';
import { db } from '../../firebase';
import { useAuthStore } from '../../store/authStore';
import './RightPanel.css';

type SimplePost = {
  id: string;
  title?: string;
  board?: string;
  comments?: number;
  likes?: number;
};

type LeaderboardUser = {
  id: string;
  name?: string;
  points?: number;
};

type TimetableEntry = {
  period: string;
  subject: string;
};

type WeeklyTimetable = Record<string, TimetableEntry[]>;
type MealDay = { lunch?: string; dinner?: string };
type WeeklyMeals = Record<string, MealDay>;

export default function RightPanel() {
  const [trendingPosts, setTrendingPosts] = useState<SimplePost[]>([]);
  const [topUsers, setTopUsers] = useState<LeaderboardUser[]>([]);
  const [fullTimetable, setFullTimetable] = useState<WeeklyTimetable | null>(null);
  const [viewDayIndex, setViewDayIndex] = useState(0);
  const [fullMeals, setFullMeals] = useState<WeeklyMeals | null>(null);
  const [mealDayIndex, setMealDayIndex] = useState(0);
  const daysKR = ['월', '화', '수', '목', '금'];

  const { user } = useAuthStore();

  useEffect(() => {
    const qPosts = query(collection(db, 'posts'), orderBy('likes', 'desc'), limit(5));
    const unsubPosts = onSnapshot(qPosts, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SimplePost, 'id'>) }));
      setTrendingPosts(docs.filter((p) => (p.likes || 0) > 0));
    });

    const qUsers = query(collection(db, 'users'), orderBy('points', 'desc'), limit(5));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      setTopUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LeaderboardUser, 'id'>) })));
    });

    if (user?.isStudent && user?.schoolCode) {
      import('../../api/neisApi').then(({ getWeeklyTimetable }) => {
        getWeeklyTimetable(user.grade || '1', user.class || '1', user.officeCode || '', user.schoolCode || '').then(
          (data) => {
            setFullTimetable(data as WeeklyTimetable);
          }
        );
      });

      getWeeklyMeals(user.officeCode || '', user.schoolCode || '')
        .then((data) => {
          setFullMeals(data as WeeklyMeals);
        })
        .catch((err) => console.error('Failed to fetch meals:', err));
    } else {
      setFullTimetable(null);
      setFullMeals(null);
    }

    const day = new Date().getDay();
    let initialIdx = day - 1;
    if (initialIdx < 0 || initialIdx > 4) initialIdx = 0;
    setViewDayIndex(initialIdx);
    setMealDayIndex(initialIdx);

    return () => {
      unsubPosts();
      unsubUsers();
    };
  }, [user?.isStudent, user?.schoolCode, user?.officeCode, user?.grade, user?.class]);

  const currentViewData = fullTimetable ? fullTimetable[daysKR[viewDayIndex]] || [] : [];
  const currentMeal = fullMeals ? fullMeals[daysKR[mealDayIndex]] : null;

  const handlePrevDay = () => setViewDayIndex((prev) => (prev === 0 ? 4 : prev - 1));
  const handleNextDay = () => setViewDayIndex((prev) => (prev === 4 ? 0 : prev + 1));
  const handlePrevMeal = () => setMealDayIndex((prev) => (prev === 0 ? 4 : prev - 1));
  const handleNextMeal = () => setMealDayIndex((prev) => (prev === 4 ? 0 : prev + 1));
  const getProfilePath = (userId: string) => (userId === user?.id ? '/mypage' : `/profile/${userId}`);

  return (
    <aside className="right-panel">
      <div className="panel-widget">
        <h3 className="widget-title">
          <Flame size={18} /> <span className="text-gradient">실시간 인기글</span>
        </h3>
        <ul className="widget-list">
          {trendingPosts.length === 0 ? (
            <li style={{ fontSize: '13px', color: '#888' }}>아직 인기글이 없습니다.</li>
          ) : (
            trendingPosts.map((post, idx) => (
              <li key={post.id} className="widget-item">
                <span className={`rank-num ${idx < 3 ? 'top' : ''}`}>{idx + 1}</span>
                <div className="trend-info">
                  <Link to={`/post/${post.id}`} className="trend-title" style={{ textDecoration: 'none' }}>
                    {idx === 0 && <span className="hot-badge">HOT</span>}
                    {post.title}
                  </Link>
                  <p className="trend-meta">{post.board} · 댓글 {post.comments || 0}</p>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="panel-widget">
        <h3 className="widget-title" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} className="text-secondary" />
            {user?.schoolName ? `${user.schoolName} 시간표` : '학교 시간표'} ({daysKR[viewDayIndex]}요일)
          </div>
          <div className="day-nav-btns">
            <button className="nav-btn" onClick={handlePrevDay} title="이전 요일">
              <ChevronLeft size={16} />
            </button>
            <button className="nav-btn" onClick={handleNextDay} title="다음 요일">
              <ChevronRight size={16} />
            </button>
          </div>
        </h3>
        <div className="schedule-list">
          {!user?.isStudent ? (
            <div className="empty-widget-state">
              <p>학생 사용자에게만 제공되는 정보예요.</p>
            </div>
          ) : !user?.schoolCode ? (
            <div className="empty-widget-state">
              <p>학교 정보를 등록하면 시간표를 바로 볼 수 있어요.</p>
              <Link to="/mypage/edit-profile" className="setup-link">
                설정하기
              </Link>
            </div>
          ) : currentViewData.length === 0 ? (
            <div className="schedule-item">등록된 시간표가 없습니다.</div>
          ) : (
            currentViewData.map((item, i) => (
              <div key={i} className="schedule-item normal">
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
            <Calendar size={18} className="text-secondary" /> 이번 주 급식 ({daysKR[mealDayIndex]}요일)
          </div>
          <div className="day-nav-btns">
            <button className="nav-btn" onClick={handlePrevMeal} title="이전 요일">
              <ChevronLeft size={16} />
            </button>
            <button className="nav-btn" onClick={handleNextMeal} title="다음 요일">
              <ChevronRight size={16} />
            </button>
          </div>
        </h3>
        <div className="school-info-card">
          {!user?.isStudent ? (
            <div className="empty-widget-state">
              <p>급식 정보는 학생 사용자에게만 제공됩니다.</p>
            </div>
          ) : !user?.schoolCode ? (
            <div className="empty-widget-state">
              <p>학교 정보를 등록하면 급식을 바로 확인할 수 있어요.</p>
            </div>
          ) : (
            <div className="meal-section">
              <div className="meal-info">
                <span className="meal-label">중식</span>
                <p>{currentMeal?.lunch || '등록된 식단이 없습니다.'}</p>
              </div>
              <div className="meal-info" style={{ marginTop: '8px' }}>
                <span className="meal-label" style={{ color: '#FF7675' }}>
                  석식
                </span>
                <p>{currentMeal?.dinner || '등록된 식단이 없습니다.'}</p>
              </div>
            </div>
          )}
          {user?.isStudent && user?.schoolCode && (
            <Link to="/meals" className="view-more-btn">
              자세히 보기
            </Link>
          )}
        </div>
      </div>

      <div className="panel-widget">
        <h3 className="widget-title">
          <Trophy size={18} className="text-primary" /> 명예의 전당
        </h3>
        <ul className="ranking-list">
          {topUsers.length === 0 ? (
            <li style={{ fontSize: '13px', color: '#888' }}>랭킹 데이터가 없습니다.</li>
          ) : (
            topUsers.map((entry, idx) => (
              <li key={entry.id}>
                <Link to={getProfilePath(entry.id)} className="ranking-item ranking-profile-link">
                  <span className={`badge-rank rank-${idx + 1}`}>{idx + 1}</span>
                  <div className="ranking-info" style={{ marginLeft: '4px' }}>
                    <p className="ranking-name">{entry.name}</p>
                    <div className="ranking-bar-wrap">
                      <div className="ranking-bar" style={{ width: `${Math.min(((entry.points || 0) / 2500) * 100, 100)}%` }}></div>
                    </div>
                  </div>
                  <span className="ranking-points">{entry.points?.toLocaleString() || 0} P</span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
    </aside>
  );
}
