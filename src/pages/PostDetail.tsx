import { useState, useEffect } from 'react';
import { ArrowLeft, MoreVertical, Heart, Share2, AlertOctagon, ThumbsUp, Send, Eye, Trash2, Edit2, Shield } from 'lucide-react';

import { useNavigate, useParams } from 'react-router-dom';
import { db, storage } from '../firebase';
import { doc, updateDoc, collection, addDoc, onSnapshot, query, orderBy, increment, deleteDoc, getDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { useAuthStore } from '../store/authStore';
import ConfirmModal from '../components/ui/ConfirmModal';
import { createNotification } from '../hooks/useNotifications';
import './PostDetail.css';

export default function PostDetail() {
  const { id } = useParams<{id: string}>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const ADMIN_EMAILS = ['admin_test_123@school.com', 'boyeon5600@gmail.com'];
  const isAdmin = user?.role === 'admin' || (user?.email && ADMIN_EMAILS.includes(user.email));

  const [post, setPost] = useState<any>(null);
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string, author: string } | null>(null);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [authorInfo, setAuthorInfo] = useState<any>(null);
  const [shopItemsMap, setShopItemsMap] = useState<Record<string, any>>({});


  useEffect(() => {
    if (!id) return;
    
    // Increment view
    const postRef = doc(db, 'posts', id);
    updateDoc(postRef, { views: increment(1) }).catch(console.error);

    // Subscribe to post changes
    const unsubPost = onSnapshot(postRef, async (docSnap) => {
      if (docSnap.exists()) {
        const pData = { id: docSnap.id, ...(docSnap.data() as any) };
        setPost(pData);
        setLoading(false);

        // 작성자 정보 가져오기 (배지, 색상)
        if (pData.author_id) {
            const authorSnap = await getDoc(doc(db, 'users', pData.author_id));

            if (authorSnap.exists()) setAuthorInfo(authorSnap.data());
        }
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

    // 상점 아이템 정보 로드 (스타일 참조용)
    const unsubItems = onSnapshot(collection(db, 'shop_items'), (snap) => {
        const itemMap: any = {};
        snap.forEach(d => { itemMap[d.id] = { id: d.id, ...d.data() }; });
        setShopItemsMap(itemMap);
    });

    return () => {
      unsubPost();
      unsubComments();
      unsubItems();
    };

  }, [id]);

  const handleLike = async () => {
    if (!user) return alert('로그인해주세요.');
    if (liked) return;
    try {
      setLiked(true);
      await updateDoc(doc(db, 'posts', id!), { likes: increment(1) });
      // 게시글 작성자에게 좋아요 알림 (본인 글 제외)
      if (post && post.author_id && post.author_id !== user.id) {
        await createNotification({
          userId: post.author_id,
          type: 'like',
          fromUser: user.name,
          postId: id!,
          postTitle: post.title,
          read: false,
          createdAt: Date.now(),
        });
      }
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
        authorEquipped: user.equipped_items || {},
        replyTo_id: replyTo ? replyTo.id : null,
        likes: 0,
        created_at: Date.now()
      });

      await updateDoc(doc(db, 'posts', id!), { comments: increment(1) });
      
      if (user.role !== 'admin') {
        await updateDoc(doc(db, 'users', user.id), { points: increment(5) });
      }

      // 댓글 알림: 게시글 작성자에게
      if (post && post.author_id && post.author_id !== user.id) {
        if (!replyTo) {
          await createNotification({
            userId: post.author_id,
            type: 'comment',
            fromUser: user.name,
            postId: id!,
            postTitle: post.title,
            read: false,
            createdAt: Date.now(),
          });
        }
      }

      // 답글 알림: 원 댓글 작성자에게
      if (replyTo) {
        const replyCommentSnap = await getDoc(doc(db, 'posts', id!, 'comments', replyTo.id));
        if (replyCommentSnap.exists()) {
          const replyCommentData = replyCommentSnap.data();
          if (replyCommentData.author_id && replyCommentData.author_id !== user.id) {
            await createNotification({
              userId: replyCommentData.author_id,
              type: 'reply',
              fromUser: user.name,
              postId: id!,
              postTitle: post?.title || '',
              read: false,
              createdAt: Date.now(),
            });
          }
        }
      }

      setCommentText('');
      setReplyTo(null);
    } catch (err) {
      console.error(err);
      alert('댓글 게시에 실패했습니다.');
    }
  };

  const handleCommentLike = async (commentId: string) => {
    if (!user) return alert('로그인해주세요.');
    if (likedComments.has(commentId)) return;
    try {
      setLikedComments(prev => new Set(prev).add(commentId));
      await updateDoc(doc(db, 'posts', id!, 'comments', commentId), { likes: increment(1) });
    } catch (err) {
      console.error(err);
    }
  };

  const handleReport = async () => {
    if (!user) return alert('로그인해주세요.');
    if (!post) return;
    const reason = prompt('신고 사유를 입력해주세요:');
    if (!reason || !reason.trim()) return;
    try {
      await addDoc(collection(db, 'reports'), {
        type: '게시글',
        contentId: id,
        content: post.title,
        reason: reason.trim(),
        reporter: user.name,
        reporter_id: user.id,
        author_id: post.author_id,
        date: new Date().toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }).replace('. ', '/').replace('.', ''),
        status: 'pending',
        createdAt: Date.now(),
      });
      alert('신고가 접수되었습니다. 검토 후 조치하겠습니다.');
    } catch (err) {
      console.error(err);
      alert('신고 접수에 실패했습니다.');
    }
  };

  const handleTogglePin = async () => {
    if (!id || !post) return;
    try {
      await updateDoc(doc(db, 'posts', id), { isPinned: !post.isPinned });
      setShowMore(false);
    } catch (err) {
      console.error(err);
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

  const isAuthor = user && user.id === post.author_id;

  return (
    <div className="post-detail-page animate-fade-in">
      <div className="detail-header">
        <button className="icon-button back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <span className="detail-category">{post.board}</span>
        <div className="detail-header-actions">
          <div style={{ position: 'relative' }}>
            <button className="icon-button" onClick={() => setShowMore(!showMore)}>
              <MoreVertical size={20} />
            </button>
            {showMore && (isAuthor || isAdmin) && (
              <div className="more-menu glass-panel animate-fade-in" style={{ position: 'absolute', top: '100%', right: 0, zIndex: 10, width: '150px' }}>
                {isAdmin && (
                  <button className="menu-item" onClick={handleTogglePin}>
                    <Shield size={16} /> {post.isPinned ? '공지 해제' : '공지로 등록'}
                  </button>
                )}
                {isAuthor && <button className="menu-item" onClick={() => navigate(`/edit/${id}`)}><Edit2 size={16} /> 수정하기</button>}
                <button className="menu-item delete" onClick={() => setShowDeleteModal(true)}><Trash2 size={16} /> 삭제하기</button>
              </div>
            )}
          </div>
        </div>
      </div>


      <article className="detail-content">
        <h1 className="detail-title">{post.title}</h1>
        <div className="detail-meta">
          <div className="author-info">
            <div className="author-avatar" style={{
                display: 'flex', alignItems:'center', justifyContent:'center', fontWeight: 'bold', 
                background: authorInfo?.equipped_items?.nameColor ? `${shopItemsMap[authorInfo.equipped_items.nameColor]?.style}22` : 'var(--border-light)', 
                color: shopItemsMap[authorInfo?.equipped_items?.nameColor]?.style || 'var(--text-muted)',
                border: authorInfo?.equipped_items?.avatarFrame ? `3px solid ${shopItemsMap[authorInfo.equipped_items.avatarFrame]?.style}` : 'none',
                boxShadow: authorInfo?.equipped_items?.avatarFrame ? `0 0 10px ${shopItemsMap[authorInfo.equipped_items.avatarFrame]?.style}55` : 'none'
            }}>{post.author?.[0]}</div>

            <div className="author-text">
              <span className="author-name" style={{ color: shopItemsMap[authorInfo?.equipped_items?.nameColor]?.style || 'inherit', fontWeight: 800 }}>
                {post.author} 
                {authorInfo?.equipped_items?.badge && (
                    <span className="shop-badge-inline" style={{ marginLeft: '6px', background: shopItemsMap[authorInfo.equipped_items.badge]?.style, color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', verticalAlign: 'middle' }}>
                        {shopItemsMap[authorInfo.equipped_items.badge]?.name}
                    </span>
                )}
                {isAuthor && <span className="writer-tag">작성자</span>}
              </span>
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

          {/* 해시태그 렌더링 섹션 */}
          {post.tags && post.tags.length > 0 && (
            <div className="post-tags-container" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '24px' }}>
              {post.tags.map((tag: string, idx: number) => (
                <span 
                    key={idx} 
                    onClick={() => navigate(`/board?search=${encodeURIComponent('#' + tag)}`)}
                    style={{ background: 'var(--primary-light)', border: '1px solid var(--primary)', padding: '6px 12px', borderRadius: '16px', fontSize: '13px', color: 'var(--primary)', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="detail-actions">
          <button className={`action-btn ${liked ? 'active-like' : ''}`} onClick={handleLike}>
            <Heart size={20} fill={liked ? '#FF4757' : 'none'} /> {post.likes}
          </button>
          <button className="action-btn">
            <Share2 size={20} /> 공유
          </button>
          <button className="action-btn danger" onClick={handleReport}>
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
            {replyTo && (
              <div style={{ background: 'var(--bg-main)', padding: '6px 12px', borderRadius: '8px 8px 0 0', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><strong>{replyTo.author}</strong>님에게 답글 작성 중...</span>
                <button onClick={() => setReplyTo(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 4px' }}>✕</button>
              </div>
            )}
            <input
              type="text"
              placeholder={user?.isBanned ? "활동이 정지되어 댓글을 작성할 수 없습니다." : (user ? "댓글을 남겨보세요..." : "로그인 후 댓글을 남길 수 있습니다")}
              className="comment-input"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={!user || user.isBanned}
              onKeyDown={(e) => e.key === 'Enter' && handleComment()}
              style={replyTo ? { borderRadius: '0 0 20px 20px' } : {}}
            />
            <button className={`submit-comment ${commentText ? 'active' : ''}`} onClick={handleComment} disabled={user?.isBanned}>
              <Send size={18} />
            </button>
          </div>
        </div>

        <div className="comment-list">
          {commentsList.length === 0 ? (
            <div style={{padding: '20px', textAlign: 'center', color: '#888'}}>첫 번째 댓글을 남겨보세요!</div>
          ) : commentsList.map((comment: any) => (
            <div key={comment.id} className="comment-thread" style={{ marginLeft: comment.replyTo_id ? '32px' : '0', borderLeft: comment.replyTo_id ? '2px solid var(--border-light)' : 'none', paddingLeft: comment.replyTo_id ? '16px' : '0' }}>
              <div className="comment-item">
                <div className="comment-avatar" style={{
                    display: 'flex', alignItems:'center', justifyContent:'center', fontWeight: 'bold', 
                    background: 'var(--border-light)', color: 'var(--text-muted)',
                    border: comment.authorEquipped?.avatarFrame ? `2px solid ${shopItemsMap[comment.authorEquipped.avatarFrame]?.style}` : 'none',
                    boxShadow: comment.authorEquipped?.avatarFrame ? `0 0 6px ${shopItemsMap[comment.authorEquipped.avatarFrame]?.style}44` : 'none'
                }}>{comment.author?.[0]}</div>

                <div className="comment-body">
                  <div className="comment-header">
                    <span className={`comment-author ${comment.author_id === post.author_id ? 'is-writer' : ''}`} style={{ color: shopItemsMap[comment.authorEquipped?.nameColor]?.style || 'inherit', fontWeight: 700 }}>
                      {comment.author}
                      {comment.authorEquipped?.badge && (
                          <span className="shop-badge-inline" style={{ marginLeft: '4px', background: shopItemsMap[comment.authorEquipped.badge]?.style, color: 'white', fontSize: '9px', padding: '1px 4px', borderRadius: '3px', verticalAlign: 'middle' }}>
                              {shopItemsMap[comment.authorEquipped.badge]?.name}
                          </span>
                      )}
                      {comment.author_id === post.author_id && <span className="writer-tag">작성자</span>}
                    </span>
                    <span className="comment-time">{formatDate(comment.created_at)}</span>
                  </div>

                  <p className="comment-text">{comment.content}</p>
                  <div className="comment-actions">
                    <button className={`comment-btn like-btn ${likedComments.has(comment.id) ? 'active' : ''}`} onClick={() => handleCommentLike(comment.id)} style={likedComments.has(comment.id) ? { color: '#ff4757' } : {}}>
                      <ThumbsUp size={13} fill={likedComments.has(comment.id) ? '#ff4757' : 'none'} /> {comment.likes || 0}
                    </button>
                    {!comment.replyTo_id && (
                      <button className="comment-btn reply-btn" onClick={() => setReplyTo({ id: comment.id, author: comment.author })}>답글 달기</button>
                    )}
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
