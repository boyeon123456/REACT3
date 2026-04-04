import { useState, useEffect } from 'react';
import { Megaphone, TrendingUp, Clock, ThumbsUp, MessageCircle, Eye, ChevronRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import FloatingAction from '../components/ui/FloatingAction';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import './Home.css';

const announcements = [
  "📢 [필독] 2026학년도 체육대회 종목 안내",
  "🔐 교내 와이파이 비밀번호 변경 안내",
  "📚 도서관 연체자 도서 대출 정지 안내",
  "🎉 미니게임 신규 업데이트! 운세뽑기 추가됨",
];

const hotTopics = [
  { keyword: '#체육대회', count: 128 },
  { keyword: '#급식', count: 95 },
  { keyword: '#중간고사', count: 87 },
  { keyword: '#동아리', count: 64 },
];

export default function Home() {
  const [popularPosts, setPopularPosts] = useState<any[]>([]);
  const [latestPosts, setLatestPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('created_at', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      setLatestPosts(data.slice(0, 8));
      
      const sortedByLikes = [...data].sort((a, b) => (b.likes || 0) - (a.likes || 0));
      setPopularPosts(sortedByLikes.slice(0, 4));
      
      setLoading(false);
    });
    return () => unsub();
  }, []);

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
        
        {loading ? <div style={{padding: '20px', color: '#888'}}>로딩 중...</div> : (
          <div className="post-grid">
            {popularPosts.length === 0 ? <p style={{color: '#888', gridColumn: 'span 2'}}>인기 게시글이 없습니다.</p> : popularPosts.map((post, idx) => (
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
        {loading ? <div style={{padding: '20px', color: '#888'}}>로딩 중...</div> : (
          <div className="post-list">
            {latestPosts.length === 0 ? <div style={{padding: '20px', color: '#888'}}>작성된 글이 없습니다.</div> : latestPosts.map((post, idx) => (
              <Link to={`/post/${post.id}`} key={post.id} className="list-item" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="list-item-main">
                  <span className="list-tag" style={{color: getTagColor(post.board)}}>{post.board}</span>
                  <h4 className="list-title">{post.title}</h4>
                </div>
                <div className="list-item-meta">
                  <span className="list-comments" style={{color: 'var(--primary)'}}>[{post.comments}]</span>
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
