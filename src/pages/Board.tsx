import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ThumbsUp, MessageCircle, Eye, LayoutGrid, List, Image } from 'lucide-react';
import FloatingAction from '../components/ui/FloatingAction';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import './Board.css';

const categories = ['전체', '1학년', '2학년', '3학년', '학생회', '자유게시판', '공지사항'];
const filters = ['최신순', '인기순', '댓글많은순'];

const tagColors: Record<string, string> = {
  '1학년': '#00B894', '2학년': '#6C5CE7', '3학년': '#E17055',
  '학생회': '#0984E3', '자유게시판': '#FDCB6E', '공지사항': '#FF4757'
};

export default function Board() {
  const [posts, setPosts] = useState<any[]>([]);
  const [activeCat, setActiveCat] = useState('전체');
  const [activeFilter, setActiveFilter] = useState('최신순');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('created_at', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const formatDate = (ts: number) => {
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const filtered = activeCat === '전체'
    ? posts
    : posts.filter(p => p.board === activeCat);

  // Client side sorting for simple filter
  if (activeFilter === '인기순') filtered.sort((a, b) => (b.likes || 0) - (a.likes || 0));
  if (activeFilter === '댓글많은순') filtered.sort((a, b) => (b.comments || 0) - (a.comments || 0));

  return (
    <div className="board-page animate-fade-in">
      <div className="board-header">
        <h1 className="page-title">게시판</h1>
        <p className="page-desc">우리 학교의 모든 이야기를 자유롭게 나눠보세요.</p>
      </div>

      <div className="board-nav">
        <div className="category-tabs">
          {categories.map(cat => (
            <button
              key={cat}
              className={`cat-tab ${activeCat === cat ? 'active' : ''}`}
              onClick={() => setActiveCat(cat)}
              style={activeCat === cat && cat !== '전체' ? { backgroundColor: tagColors[cat], borderColor: tagColors[cat] } : {}}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="board-controls">
          <div className="filter-tabs">
            {filters.map(f => (
              <button key={f} className={`filter-tab ${activeFilter === f ? 'active' : ''}`} onClick={() => setActiveFilter(f)}>{f}</button>
            ))}
          </div>
          <div className="view-toggle">
            <button className={`toggle-btn ${viewMode === 'card' ? 'active' : ''}`} onClick={() => setViewMode('card')}><LayoutGrid size={16}/></button>
            <button className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}><List size={16}/></button>
          </div>
        </div>
      </div>

      <div className="board-count">총 <strong>{filtered.length}</strong>개의 게시글</div>

      {loading ? (
        <div style={{padding: '40px', textAlign: 'center', color: '#888'}}>로딩 중...</div>
      ) : filtered.length === 0 ? (
        <div style={{padding: '60px', textAlign: 'center', color: '#888', background: '#fff', borderRadius: '12px'}}>
          아직 작성된 게시글이 없습니다. 첫 번째 글을 남겨보세요!
        </div>
      ) : viewMode === 'card' ? (
        <div className="board-grid">
          {filtered.map((post, idx) => (
            <Link to={`/post/${post.id}`} key={post.id} className="board-card" style={{ animationDelay: `${idx * 0.05}s` }}>
              <div className="card-top">
                <span className="card-tag" style={{ color: tagColors[post.board] || 'var(--primary)' }}>{post.board}</span>
                <span className="card-time">{formatDate(post.created_at)}</span>
              </div>
              {post.imageUrl && (
                <div className="card-thumb">
                  <img src={post.imageUrl} alt="thumbnail" />
                </div>
              )}
              <h3 className="card-title">{post.title}</h3>
              <p className="card-content">{post.content}</p>
              <div className="card-bottom">
                <div className="card-author-area">
                  <div className="mini-avatar" style={{ backgroundColor: tagColors[post.board] || '#ccc' }}>{(post.author || '익명')[0]}</div>
                  <span className="card-author">{post.author}</span>
                </div>
                <div className="card-metrics">
                  <span className="metric"><ThumbsUp size={13}/> {post.likes}</span>
                  <span className="metric"><MessageCircle size={13}/> {post.comments}</span>
                  <span className="metric"><Eye size={13}/> {post.views}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="board-list-view">
          {filtered.map((post, idx) => (
            <Link to={`/post/${post.id}`} key={post.id} className="board-list-item" style={{ animationDelay: `${idx * 0.03}s` }}>
              <span className="bl-tag" style={{ color: tagColors[post.board] }}>{post.board}</span>
              <div className="bl-main">
                {post.imageUrl && <Image size={14} className="bl-img-icon" />}
                <h4 className="bl-title">{post.title}</h4>
                <span className="bl-comment-count">[{post.comments}]</span>
              </div>
              <span className="bl-author">{post.author}</span>
              <span className="bl-views"><Eye size={13}/> {post.views}</span>
              <span className="bl-likes"><ThumbsUp size={13}/> {post.likes}</span>
              <span className="bl-time">{formatDate(post.created_at)}</span>
            </Link>
          ))}
        </div>
      )}

      <FloatingAction />
    </div>
  );
}
