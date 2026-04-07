import { useEffect, useState } from 'react';
import { Flame, Trophy, Calendar, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import './RightPanel.css';

// Static items removed as we now fetch from backend

export default function RightPanel() {
  const [trendingPosts, setTrendingPosts] = useState<any[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [currentDay, setCurrentDay] = useState('');

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

    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const today = days[new Date().getDay()];
    setCurrentDay(today);

    // Fetch timetable from backend
    fetch(`http://localhost:3000/api/timetable?grade=1&class=1`)
      .then(res => res.json())
      .then(data => {
        if (data[today]) {
          setTimetable(data[today]);
        } else if (today === '토' || today === '일') {
          // Fallback to Monday for demo if it's weekend
          setTimetable(data['월'] || []);
        }
      })
      .catch(err => console.error('Failed to fetch timetable:', err));

    return () => {
      unsubPosts();
      unsubUsers();
    };
  }, []);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🏆';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank.toString();
  };

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
        <h3 className="widget-title">
          <Clock size={18} className="text-secondary" /> 1학년 시간표 ({currentDay}요일)
        </h3>
        <div className="schedule-list">
          {timetable.length === 0 ? (
            <div className="schedule-item">오늘 일정이 없습니다.</div>
          ) : (
            timetable.map((item, i) => (
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
        <h3 className="widget-title">
          <Calendar size={18} className="text-secondary" /> 오늘의 급식
        </h3>
        <div className="school-info-card">
          <div className="date-badge">4월 4일 (목)</div>
          <div className="meal-section">
            <div className="meal-info">
              <span className="meal-label">🍚 중식</span>
              <p>혼합잡곡밥<br />쇠고기미역국<br />돈육강정<br />배추김치<br />요구르트</p>
            </div>
          </div>
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
