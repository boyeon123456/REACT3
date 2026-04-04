import { useState, useEffect } from 'react';
import { ArrowLeft, MoreVertical, Heart, Share2, AlertOctagon, Bookmark, ThumbsUp, Send, Eye } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../firebase';
import { doc, updateDoc, collection, addDoc, onSnapshot, query, orderBy, increment } from 'firebase/firestore';
import { useAuthStore } from '../store/authStore';
import './PostDetail.css';

export default function PostDetail() {
  const { id } = useParams<{id: string}>();
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);

  const [post, setPost] = useState<any>(null);
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    if (!id) return;
    
    // Increment view
    const postRef = doc(db, 'posts', id);
    updateDoc(postRef, { views: increment(1) }).catch(console.error);

    // Subscribe to post changes
    const unsubPost = onSnapshot(postRef, (docSnap) => {
      if (docSnap.exists()) {
        setPost({ id: docSnap.id, ...docSnap.data() });
        setLoading(false);
      } else {
        alert('존재하지 않는 게시글입니다.');
        navigate('/board');
      }
    });

    // Subscribe to comments
    const qComments = query(collection(db, 'posts', id, 'comments'), orderBy('created_at', 'asc'));
    const unsubComments = onSnapshot(qComments, (snap) => {
      setCommentsList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubPost();
      unsubComments();
    };
  }, [id]);

  const handleLike = async () => {
    if (!user) return alert('로그인해주세요.');
    if (liked) return;
    try {
      setLiked(true);
      await updateDoc(doc(db, 'posts', id!), { likes: increment(1) });
    } catch (err) {
      console.error(err);
    }
  };

  const handleComment = async () => {
    if (!user) {
      alert('댓글을 작성하려면 로그인해주세요.');
      navigate('/login');
      return;
    }
    if (!commentText.trim()) return;

    try {
      await addDoc(collection(db, 'posts', id!, 'comments'), {
        content: commentText,
        author: user.name,
        author_id: user.id,
        likes: 0,
        created_at: Date.now()
      });
      await updateDoc(doc(db, 'posts', id!), { comments: increment(1) });
      setCommentText('');
    } catch (err) {
      console.error(err);
      alert('댓글 게시에 실패했습니다.');
    }
  };

  if (loading) return <div style={{padding: '40px', textAlign: 'center'}}>로딩 중...</div>;
  if (!post) return null;

  const formatDate = (ts: number) => {
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const isWriter = user && user.id === post.author_id;

  return (
    <div className="post-detail-page animate-fade-in">
      <div className="detail-header">
        <button className="icon-button back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <span className="detail-category">{post.board}</span>
        <div className="detail-header-actions">
          <button className={`icon-button ${bookmarked ? 'bookmarked' : ''}`} onClick={() => setBookmarked(!bookmarked)}>
            <Bookmark size={20} fill={bookmarked ? 'var(--primary)' : 'none'} />
          </button>
          <button className="icon-button">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      <article className="detail-content">
        <h1 className="detail-title">{post.title}</h1>
        <div className="detail-meta">
          <div className="author-info">
            <div className="author-avatar" style={{display: 'flex', alignItems:'center', justifyContent:'center', fontWeight: 'bold', background: 'var(--border-light)', color: 'var(--text-muted)'}}>{post.author?.[0]}</div>
            <div className="author-text">
              <span className="author-name">{post.author} {isWriter && <span className="writer-tag">작성자</span>}</span>
              <span className="post-time">{formatDate(post.created_at)}</span>
            </div>
          </div>
          <div className="post-view-count"><Eye size={14}/> {post.views}</div>
        </div>

        <div className="detail-body">
          <p style={{whiteSpace: 'pre-wrap'}}>{post.content}</p>
        </div>

        <div className="detail-actions">
          <button className={`action-btn ${liked ? 'active-like' : ''}`} onClick={handleLike}>
            <Heart size={20} fill={liked ? '#FF4757' : 'none'} /> {post.likes}
          </button>
          <button className="action-btn">
            <Share2 size={20} /> 공유
          </button>
          <button className="action-btn danger">
            <AlertOctagon size={20} /> 신고
          </button>
        </div>
      </article>

      <section className="comment-section">
        <h3 className="comment-section-title">💬 댓글 <span className="comment-count">{post.comments || 0}</span></h3>

        <div className="comment-input-area">
          <div className="comment-my-avatar" style={{display: 'flex', alignItems:'center', justifyContent:'center', fontWeight: 'bold', background: 'var(--gradient)', color: 'white'}}>
            {user ? user.name[0] : '?'}
          </div>
          <div className="comment-input-wrap">
            <input
              type="text"
              placeholder={user ? "댓글을 남겨보세요..." : "로그인 후 댓글을 남길 수 있습니다"}
              className="comment-input"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={!user}
              onKeyDown={(e) => e.key === 'Enter' && handleComment()}
            />
            <button className={`submit-comment ${commentText ? 'active' : ''}`} onClick={handleComment}>
              <Send size={18} />
            </button>
          </div>
        </div>

        <div className="comment-list">
          {commentsList.length === 0 ? (
            <div style={{padding: '20px', textAlign: 'center', color: '#888'}}>첫 번째 댓글을 남겨보세요!</div>
          ) : commentsList.map((comment: any) => (
            <div key={comment.id} className="comment-thread">
              <div className="comment-item">
                <div className="comment-avatar" style={{display: 'flex', alignItems:'center', justifyContent:'center', fontWeight: 'bold', background: 'var(--border-light)', color: 'var(--text-muted)'}}>{comment.author?.[0]}</div>
                <div className="comment-body">
                  <div className="comment-header">
                    <span className={`comment-author ${comment.author_id === post.author_id ? 'is-writer' : ''}`}>
                      {comment.author}
                      {comment.author_id === post.author_id && <span className="writer-tag">작성자</span>}
                    </span>
                    <span className="comment-time">{formatDate(comment.created_at)}</span>
                  </div>
                  <p className="comment-text">{comment.content}</p>
                  <div className="comment-actions">
                    <button className="comment-btn like-btn"><ThumbsUp size={13} /> {comment.likes || 0}</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
