import { useState, useEffect } from 'react';
import { Settings, Shield, Activity } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('활동');
  const [myPosts, setMyPosts] = useState<any[]>([]);

  // Settings State (Mock for UI)
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [emailNotif, setEmailNotif] = useState(false);

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
      <div className="mypage-light animate-fade-in" style={{padding: '100px 20px', textAlign: 'center'}}>
        <Shield size={64} style={{color: 'var(--primary)', marginBottom: '24px', opacity: 0.2}} />
        <h2 style={{fontSize: '24px', fontWeight: '800'}}>로그인이 필요한 페이지입니다.</h2>
        <p style={{color: 'var(--text-muted)', marginTop: '8px'}}>커뮤니티의 다양한 기능을 이용해 보세요.</p>
      </div>
    );
  }


  return (
    <div className="mypage-v3 animate-fade-in">
      <div className="mypage-header-bg"></div>
      
      <div className="mypage-container-v3">
        {/* Profile Info V3 */}
        <div className="profile-section-v3">
            <div className="profile-avatar-v3">
                {user.photoURL ? (
                    <img src={user.photoURL} alt={user.name} />
                ) : (
                    <div className="initial-avatar-v3">{user.name[0]}</div>
                )}
                <div className="avatar-status"></div>
            </div>
            <div className="profile-text-v3">
                <h1 className="profile-name-v3">{user.name} <span className="profile-id-v3">@{user.id.slice(0, 5)}</span></h1>
                <p className="profile-email-v3">{user.email}</p>
                <div className="profile-badges-v3">
                    <span className="badge-v3">Lv.{user.level} {user.role === 'admin' ? '운영진' : '학교 멤버'}</span>
                    <span className="badge-v3 points">💎 {user.points?.toLocaleString()} P</span>
                </div>
            </div>
            <div className="profile-actions-v3">
                <button className="v3-btn secondary" onClick={() => setActiveTab('설정')}><Settings size={18} /> 계정 관리</button>
            </div>
        </div>

        {/* Tab Navigation V3 */}
        <div className="tabs-v3">
            <button className={`tab-btn-v3 ${activeTab === '활동' ? 'active' : ''}`} onClick={() => setActiveTab('활동')}>작성한 글</button>
            <button className={`tab-btn-v3 ${activeTab === '배지' ? 'active' : ''}`} onClick={() => setActiveTab('배지')}>내 배지</button>
            <button className={`tab-btn-v3 ${activeTab === '설정' ? 'active' : ''}`} onClick={() => setActiveTab('설정')}>환경 설정</button>
        </div>

        <div className="content-v3">
            {activeTab === '활동' && (
                <div className="activity-grid-v3">
                    <div className="v3-card stats-card">
                        <div className="v3-stat">
                            <span className="stat-num">{myPosts.length}</span>
                            <span className="stat-label">게시글 수</span>
                        </div>
                        <div className="v3-divider"></div>
                        <div className="v3-stat">
                            <span className="stat-num">{user.level}</span>
                            <span className="stat-label">현재 레벨</span>
                        </div>
                    </div>
                    
                    <div className="activity-list-v3">
                        <h3 className="v3-title">최근 작성 목록</h3>
                        {myPosts.length === 0 ? (
                            <div className="v3-empty">작성된 게시글이 없습니다.</div>
                        ) : (
                            myPosts.map(post => (
                                <div key={post.id} className="v3-item">
                                    <div className="v3-item-icon"><Activity size={16} /></div>
                                    <div className="v3-item-body">
                                        <p><strong>{post.board}</strong>에 글을 작성했습니다.</p>
                                        <span className="v3-item-title-text">"{post.title}"</span>
                                    </div>
                                    <span className="v3-item-time">{new Date(post.created_at).toLocaleDateString()}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {activeTab === '배지' && (
                <div className="v3-card badges-v3">
                    <h3 className="v3-title">칭호 및 배지</h3>
                    <div className="badges-grid-v3">
                        {badges.map(badge => (
                            <div key={badge.id} className={`badge-item-v3 ${badge.earned ? 'earned' : 'locked'}`}>
                                <div className="badge-icon-v3">{badge.icon}</div>
                                <div className="badge-info-v3">
                                    <h4>{badge.name}</h4>
                                    <p>{badge.desc}</p>
                                </div>
                                {!badge.earned && <Shield size={14} className="lock-v3" />}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === '설정' && (
                <div className="settings-v3 animate-slide-up">
                    <div className="v3-card">
                        <h3 className="v3-title"><Settings size={18} /> 프로필 개인정보 설정</h3>
                        <div className="setting-group-v3">
                            <div className="setting-row-v3">
                                <div className="setting-info-v3">
                                    <h4>닉네임 수정</h4>
                                    <p>커뮤니티에서 사용되는 이름을 변경합니다.</p>
                                </div>
                                <button className="v3-btn-small">변경하기</button>
                            </div>
                            <div className="setting-row-v3">
                                <div className="setting-info-v3">
                                    <h4>프로필 사진 관리</h4>
                                    <p>이미지를 업로드하거나 구글 사진을 연동합니다.</p>
                                </div>
                                <button className="v3-btn-small">관리</button>
                            </div>
                        </div>
                    </div>

                    <div className="v3-card">
                        <h3 className="v3-title">알림 설정</h3>
                        <div className="setting-group-v3">
                            <div className="setting-row-v3">
                                <div className="setting-info-v3">
                                    <h4>푸시 알림</h4>
                                    <p>새로운 댓글이나 소식이 오면 앱 알림을 받습니다.</p>
                                </div>
                                <div className={`v3-toggle ${notifEnabled ? 'on' : ''}`} onClick={() => setNotifEnabled(!notifEnabled)}></div>
                            </div>
                            <div className="setting-row-v3">
                                <div className="setting-info-v3">
                                    <h4>이메일 수신</h4>
                                    <p>주요 소식을 이메일로 받아봅니다.</p>
                                </div>
                                <div className={`v3-toggle ${emailNotif ? 'on' : ''}`} onClick={() => setEmailNotif(!emailNotif)}></div>
                            </div>
                        </div>
                    </div>

                    <div className="v3-card danger">
                        <h3 className="v3-title">기타 서비스</h3>
                        <div className="setting-group-v3">
                            <div className="setting-row-v3">
                                <div className="setting-info-v3">
                                    <h4>데이터 내보내기</h4>
                                    <p>내가 작성한 모든 게시글 데이터를 다운로드합니다.</p>
                                </div>
                                <button className="v3-btn-small">다운로드</button>
                            </div>
                            <div className="setting-row-v3">
                                <div className="setting-info-v3">
                                    <h4 style={{color: '#ff4757'}}>계정 탈퇴</h4>
                                    <p>작성된 모든 데이터와 함께 계정을 삭제합니다.</p>
                                </div>
                                <button className="v3-btn-small danger">탈퇴하기</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
