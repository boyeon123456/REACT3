import { useEffect, useState } from 'react';
import { Flame, Trophy, Calendar, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import './RightPanel.css';

const scheduleItems = [
  { time: '08:30', event: '조회 및 자습', type: 'normal' },
  { time: '09:00', event: '1교시 - 국어 (문법)', type: 'normal' },
  { time: '10:00', event: '2교시 - 수학 (미적분)', type: 'normal' },
  { time: '12:20', event: '🍽️ 점심시간', type: 'meal' },
  { time: '16:30', event: '방과후 - 과학탐구', type: 'after' },
];

export default function RightPanel() {
  const [trendingPosts, setTrendingPosts] = useState<any[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);

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
          {trendingPosts.length === 0 ? <li style={{fontSize: '13px', color: '#888'}}>트렌드 글이 없습니다.</li> : trendingPosts.map((post, idx) => (
            <li key={post.id} className="widget-item">
              <span className={`rank-num ${idx < 3 ? 'top' : ''}`}>{idx + 1}</span>
              <div className="trend-info">
                <Link to={`/post/${post.id}`} className="trend-title" style={{textDecoration: 'none'}}>
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
          <Clock size={18} className="text-secondary" /> 오늘 시간표
        </h3>
        <div className="schedule-list">
          {scheduleItems.map((item, i) => (
            <div key={i} className={`schedule-item ${item.type}`}>
              <span className="schedule-time">{item.time}</span>
              <div className="schedule-dot"></div>
              <span className="schedule-event">{item.event}</span>
            </div>
          ))}
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
              <p>혼합잡곡밥<br/>쇠고기미역국<br/>돈육강정<br/>배추김치<br/>요구르트</p>
            </div>
          </div>
        </div>
      </div>

      <div className="panel-widget">
        <h3 className="widget-title">
          <Trophy size={18} className="text-primary" /> 명예의 전당
        </h3>
        <ul className="ranking-list">
          {topUsers.length === 0 ? <li style={{fontSize: '13px', color: '#888'}}>랭킹 데이터가 없습니다.</li> : topUsers.map((u, idx) => (
            <li key={u.id} className="ranking-item">
              <span className={`badge-rank rank-${idx + 1}`}>{getRankBadge(idx + 1)}</span>
              <div className="ranking-info" style={{marginLeft: '4px'}}>
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
