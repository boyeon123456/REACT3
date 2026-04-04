import { useState, useEffect } from 'react';
import { Settings, Edit2, Shield, Activity, Award } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import './MyPage.css';

const badges = [
  { id: 1, name: '첫 걸음', icon: '🐣', desc: '처음 로그인', earned: true },
  { id: 2, name: '수다쟁이', icon: '💬', desc: '댓글 10개 작성', earned: true },
  { id: 3, name: '인기인', icon: '✨', desc: '좋아요 50개 받기', earned: false },
  { id: 4, name: '출석왕', icon: '📅', desc: '30일 연속 출석', earned: false },
];

export default function MyPage() {
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const [activeTab, setActiveTab] = useState('활동');
  const [myPosts, setMyPosts] = useState<any[]>([]);

  useEffect(() => {
    if (user && user.id) {
      const q = query(collection(db, 'posts'), where('author_id', '==', user.id));
      const unsub = onSnapshot(q, snap => {
         const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
         docs.sort((a: any, b: any) => b.created_at - a.created_at);
         setMyPosts(docs);
      });
      return () => unsub();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="mypage animate-fade-in" style={{padding: '50px', textAlign: 'center'}}>
        <h2>로그인 후 이용할 수 있는 페이지입니다.</h2>
      </div>
    );
  }

  const progressPercent = Math.min(((user.points || 0) / 2500) * 100, 100);

  return (
    <div className="mypage animate-fade-in">
      <div className="mypage-header">
        <div className="profile-section">
          <div className="profile-avatar-large">{user.name[0]}</div>
          <div className="profile-info">
            <h1 className="profile-name">{user.name} <span className="profile-role">사용자</span></h1>
            <p className="profile-email">{user.email}</p>
            <div className="profile-stats">
              <span className="p-stat"><strong>{myPosts.length}</strong> 게시글</span>
              <span className="p-stat"><strong>Lv.{user.level || 1}</strong> 레벨</span>
            </div>
          </div>
        </div>
        <div className="profile-actions">
          <button className="edit-btn"><Edit2 size={16} /> 프로필 수정</button>
          <button className="settings-btn"><Settings size={16} /></button>
          <button className="settings-btn" onClick={logout} title="로그아웃" style={{marginLeft: '8px', border: '1px solid #ff4757', color: '#ff4757'}}>로그아웃</button>
        </div>
      </div>

      <div className="level-card">
        <div className="level-header">
          <div className="level-badge"><Shield size={20} /> Lv.{user.level || 1}</div>
          <span className="points">{(user.points || 0).toLocaleString()} P</span>
        </div>
        <div className="level-bar-wrap">
          <div className="level-bar-bg">
            <div className="level-bar-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>
        <p className="level-hint">다음 레벨까지 열심히 활동해보세요!</p>
      </div>

      <div className="mypage-content">
        <div className="mypage-tabs">
          <button className={`m-tab ${activeTab === '활동' ? 'active' : ''}`} onClick={() => setActiveTab('활동')}>내 활동내역</button>
          <button className={`m-tab ${activeTab === '배지' ? 'active' : ''}`} onClick={() => setActiveTab('배지')}>획득한 배지</button>
        </div>

        {activeTab === '활동' && (
          <div className="activity-list">
            <h3 className="section-title"><Activity size={18} /> 내가 쓴 글</h3>
            {myPosts.length === 0 ? <p style={{color: '#888'}}>작성한 글이 없습니다.</p> : myPosts.map(post => (
              <div key={post.id} className="activity-item">
                <div className="activity-icon">📝</div>
                <div className="activity-text">
                  <p><strong>{post.board}</strong>에 <span style={{fontWeight: 'bold'}}>"{post.title}"</span> 글을 작성했습니다.</p>
                  <span className="activity-time">{new Date(post.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === '배지' && (
          <div className="badges-section">
            <h3 className="section-title"><Award size={18} /> 컬렉션</h3>
            <div className="badges-grid">
              {badges.map(badge => (
                <div key={badge.id} className={`badge-card ${badge.earned ? 'earned' : 'locked'}`}>
                  <div className="badge-icon">{badge.icon}</div>
                  <h4 className="badge-name">{badge.name}</h4>
                  <p className="badge-desc">{badge.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
