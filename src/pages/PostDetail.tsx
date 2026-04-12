import { useState, useEffect } from 'react';
import { ArrowLeft, MoreVertical, Heart, Share2, AlertOctagon, Bookmark, ThumbsUp, Send, Eye, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, storage } from '../firebase';
import { doc, updateDoc, collection, addDoc, onSnapshot, query, orderBy, increment, deleteDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { useAuthStore } from '../store/authStore';
import ConfirmModal from '../components/ui/ConfirmModal';
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
      
      if (user.role !== 'admin') {
        await updateDoc(doc(db, 'users', user.id), { points: increment(5) });
      }

      setCommentText('');
    } catch (err) {
      console.error(err);
      alert('댓글 게시에 실패했습니다.');
    }
  };

  const confirmDelete = async () => {
    if (!id || !post) return;

    try {
      // 1. 이미지가 있으면 스토리지에서 삭제
      if (post.imageUrl) {
        try {
          const imageRef = ref(storage, post.imageUrl);
          await deleteObject(imageRef);
        } catch (storageErr) {
          console.error('Storage deletion error:', storageErr);
        }
      }

      // 2. Firestore에서 게시글 삭제
      await deleteDoc(doc(db, 'posts', id));
      
      alert('게시글이 삭제되었습니다.');
      navigate('/board');
    } catch (err) {
      console.error(err);
      alert('게시글 삭제에 실패했습니다.');
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
  const isAdmin = user?.role === 'admin';

  return (
    <div className="post-detail-page animate-fade-in">
      <div className="detail-header">
        <button className="icon-button back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <span className="detail-category">{post.board}</span>
        <div className="detail-header-actions">
          {(isWriter || isAdmin) && (
            <button className="icon-button delete-btn" onClick={() => setShowDeleteModal(true)} title="삭제">
              <Trash2 size={20} />
            </button>
          )}
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
          {post.imageUrl && (
            <div className="post-image-content">
              <img src={post.imageUrl} alt="post content" onClick={() => window.open(post.imageUrl, '_blank')} />
            </div>
          )}
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

      {/* 프리미엄 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="게시글 삭제"
        message="정말로 이 게시글을 삭제하시겠습니까? 삭제된 게시글은 복구할 수 없습니다."
        confirmText="삭제하기"
        type="danger"
      />
    </div>
  );
}
