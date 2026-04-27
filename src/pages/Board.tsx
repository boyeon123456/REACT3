import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ThumbsUp, MessageCircle, Eye, LayoutGrid, List, Image, Search, Flame, ChevronDown } from 'lucide-react';
import FloatingAction from '../components/ui/FloatingAction';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import './Board.css';

const categories = ['전체', '1학년', '2학년', '3학년', '학생회', '자유게시판', '공지사항'];
const filters = ['최신순', '인기순', '댓글많은순'];

const tagColors: Record<string, string> = {
  '1학년': '#00B894', '2학년': '#6C5CE7', '3학년': '#E17055',
  '학생회': '#0984E3', '자유게시판': '#FDCB6E', '공지사항': '#FF4757'
};

export default function Board() {
  const [posts, setPosts] = useState<any[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<any[]>([]);
  const [shopItemsMap, setShopItemsMap] = useState<Record<string, any>>({});
  const [activeCat, setActiveCat] = useState('전체');
  const [activeFilter, setActiveFilter] = useState('최신순');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [visibleLimit, setVisibleLimit] = useState(12);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (val) {
      setSearchParams({ search: val });
    } else {
      setSearchParams(new URLSearchParams());
    }
  };

  const handleTagClick = (e: React.MouseEvent, tag: string) => {
    e.preventDefault();
    const val = `#${tag}`;
    setSearchQuery(val);
    setSearchParams({ search: val });
  };

  useEffect(() => {
    const tq = query(collection(db, 'posts'), orderBy('likes', 'desc'), limit(3));
    const unsubTrending = onSnapshot(tq, (snap) => {
      setTrendingPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const q = query(collection(db, 'posts'), orderBy('created_at', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      const sorted = [...data].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      });
      setPosts(sorted);
      setLoading(false);
    }, (err) => {
      console.error('Board posts error:', err);
      setLoading(false);
    });

    // 상점 아이템 정보 로드
    const unsubItems = onSnapshot(collection(db, 'shop_items'), (snap) => {
      const itemMap: any = {};
      snap.forEach(d => { itemMap[d.id] = { id: d.id, ...d.data() }; });
      setShopItemsMap(itemMap);
    });

    return () => {
      unsub();
      unsubTrending();
      unsubItems();
    };

  }, [visibleLimit]);

  const formatDate = (ts: number) => {
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const filtered = posts.filter(p => {
    const term = searchQuery.toLowerCase();
    const matchesCat = activeCat === '전체' ? true : p.board === activeCat;
    const matchesSearch = !term ? true : (
      (p.title && p.title.toLowerCase().includes(term)) ||
      (p.content && p.content.toLowerCase().includes(term)) ||
      (p.tags && p.tags.some((tag: string) => tag.toLowerCase().includes(term.replace(/^#/, ''))))
    );
    return matchesCat && matchesSearch;
  });

  // Client side sorting for simple filter
  if (activeFilter === '인기순') filtered.sort((a, b) => (b.likes || 0) - (a.likes || 0));
  if (activeFilter === '댓글많은순') filtered.sort((a, b) => (b.comments || 0) - (a.comments || 0));

  return (
    <div className="board-page animate-fade-in">
      <div className="board-header">
        <h1 className="page-title">게시판</h1>
        <p className="page-desc">우리 학교의 모든 이야기를 자유롭게 나눠보세요.</p>

        <div className="board-search-bar" style={{ marginTop: '24px', position: 'relative', maxWidth: '600px', margin: '24px auto 0' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="궁금한 이야기나 해시태그를 검색해보세요..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: '20px', border: '1px solid var(--border-light)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '15px', outline: 'none', transition: 'all 0.2s', boxShadow: 'var(--shadow-sm)' }}
          />
        </div>
      </div>

      {/* 인기 게시글(Trending) 섹션 */}
      {searchQuery === '' && activeCat === '전체' && trendingPosts.length > 0 && (
        <div className="trending-section" style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Flame size={20} color="#ff4757" /> 이번 주 베스트 게시글
          </h2>
          <div className="trending-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {trendingPosts.map(post => (
              <Link to={`/post/${post.id}`} key={`trend-${post.id}`} style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s' }} className="highlight-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: tagColors[post.board] || 'var(--primary)', background: `${tagColors[post.board] || 'var(--primary)'}20`, padding: '4px 10px', borderRadius: '12px' }}>{post.board}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatDate(post.created_at)}</span>
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '12px 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</h3>
                <div style={{ display: 'flex', gap: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><ThumbsUp size={14} color="#ff4757" /> {post.likes}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MessageCircle size={14} /> {post.comments}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

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
            <button className={`toggle-btn ${viewMode === 'card' ? 'active' : ''}`} onClick={() => setViewMode('card')}><LayoutGrid size={16} /></button>
            <button className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}><List size={16} /></button>
          </div>
        </div>
      </div>

      <div className="board-count">총 <strong>{filtered.length}</strong>개의 게시글</div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>로딩 중...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#888', background: '#fff', borderRadius: '12px' }}>
          아직 작성된 게시글이 없습니다. 첫 번째 글을 남겨보세요!
        </div>
      ) : viewMode === 'card' ? (
        <div className="board-grid">
          {filtered.map((post, idx) => (
            <Link to={`/post/${post.id}`} key={post.id} className={`board-card ${post.isPinned ? 'pinned' : ''}`} style={{ animationDelay: `${idx * 0.05}s` }}>
              <div className="card-top">
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {post.isPinned && <span className="pin-badge">📌 공지</span>}
                  <span className="card-tag" style={{ color: tagColors[post.board] || 'var(--primary)' }}>{post.board}</span>
                </div>
                <span className="card-time">{formatDate(post.created_at)}</span>
              </div>

              {post.imageUrl && (
                <div className="card-thumb">
                  <img src={post.imageUrl} alt="thumbnail" />
                </div>
              )}
              <h3 className="card-title">{post.title}</h3>
              <p className="card-content">{post.content}</p>

              {/* 해시태그 표시 영역 */}
              {post.tags && post.tags.length > 0 && (
                <div className="card-tags" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {post.tags.slice(0, 3).map((tag: string, i: number) => (
                    <span
                      key={i}
                      onClick={(e) => handleTagClick(e, tag)}
                      style={{ fontSize: '12px', color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: '10px', cursor: 'pointer' }}
                    >
                      #{tag}
                    </span>
                  ))}
                  {post.tags.length > 3 && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>+{post.tags.length - 3}</span>}
                </div>
              )}

              <div className="card-bottom">
                <div className="card-author-area">
                  <div className="mini-avatar" style={{
                    backgroundColor: post.authorEquipped?.nameColor ? `${shopItemsMap[post.authorEquipped.nameColor]?.style}22` : (tagColors[post.board] || '#ccc'),
                    color: shopItemsMap[post.authorEquipped?.nameColor]?.style || '#fff',
                    border: post.authorEquipped?.avatarFrame ? `2px solid ${shopItemsMap[post.authorEquipped.avatarFrame]?.style}` : 'none',
                    boxShadow: post.authorEquipped?.avatarFrame ? `0 0 8px ${shopItemsMap[post.authorEquipped.avatarFrame]?.style}55` : 'none'
                  }}>{(post.author || '익명')[0]}</div>
                  <span className="card-author" style={{ color: shopItemsMap[post.authorEquipped?.nameColor]?.style || 'inherit', fontWeight: 700 }}>
                    {post.author}
                    {post.authorEquipped?.badge && (
                      <span className="shop-badge-inline" style={{ marginLeft: '4px', background: shopItemsMap[post.authorEquipped.badge]?.style, color: 'white', fontSize: '9px', padding: '1px 4px', borderRadius: '3px', verticalAlign: 'middle' }}>
                        {shopItemsMap[post.authorEquipped.badge]?.name}
                      </span>
                    )}
                  </span>
                </div>

                <div className="card-metrics">
                  <span className="metric"><ThumbsUp size={13} /> {post.likes}</span>
                  <span className="metric"><MessageCircle size={13} /> {post.comments}</span>
                  <span className="metric"><Eye size={13} /> {post.views}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="board-list-view">
          {filtered.map((post, idx) => (
            <Link to={`/post/${post.id}`} key={post.id} className={`board-list-item ${post.isPinned ? 'pinned' : ''}`} style={{ animationDelay: `${idx * 0.03}s` }}>
              <div className="bl-tag-area">
                {post.isPinned && <span className="pin-dot">●</span>}
                <span className="bl-tag" style={{ color: tagColors[post.board] }}>{post.board}</span>
              </div>
              <div className="bl-main">
                {post.imageUrl && <Image size={14} className="bl-img-icon" />}
                <h4 className="bl-title">{post.title}</h4>
                <span className="bl-comment-count">[{post.comments}]</span>
              </div>

              <span className="bl-author">{post.author}</span>
              <span className="bl-views"><Eye size={13} /> {post.views}</span>
              <span className="bl-likes"><ThumbsUp size={13} /> {post.likes}</span>
              <span className="bl-time">{formatDate(post.created_at)}</span>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination / 더보기 */}
      {filtered.length >= visibleLimit && (
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <button
            onClick={() => setVisibleLimit(prev => prev + 12)}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-light)',
              color: 'var(--text-main)', padding: '12px 32px', borderRadius: '20px',
              fontSize: '15px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s',
              display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--shadow-sm)'
            }}>
            더 불러오기 <ChevronDown size={18} />
          </button>
        </div>
      )}

      <FloatingAction />
    </div>
  );
}
