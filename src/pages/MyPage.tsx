import { useState, useEffect } from 'react';
import { Settings, Shield, Activity, Camera, X, LogOut, Check, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { db, auth, storage } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './MyPage.css';

const badges = [
    { id: 1, name: '첫 걸음', icon: '🐣', desc: '처음 로그인', earned: true },
    { id: 2, name: '첫 댓글', icon: '💬', desc: '첫 댓글 작성', earned: false },
    { id: 3, name: '수다쟁이', icon: '💬', desc: '댓글 50개 작성', earned: false },
    { id: 4, name: '첫 하트', icon: '✨', desc: '첫 하트 받기', earned: false },
    { id: 5, name: '인기인', icon: '✨', desc: '좋아요 50개 받기', earned: false },
    { id: 6, name: '인플루언서', icon: '✨', desc: '좋아요 100개 받기', earned: false },
    { id: 7, name: '개근', icon: '📅', desc: '30일 연속 출석', earned: false },
    { id: 8, name: '출석왕', icon: '📅', desc: '100일 연속 출석', earned: false },
    { id: 9, name: '참가자', icon: '🎯', desc: '미니게임 1회 참가', earned: false },
    { id: 10, name: '즐기는 자', icon: '🎯', desc: '미니게임 10회 참가', earned: false },
    { id: 11, name: '프로게이머', icon: '🎯', desc: '미니게임 50회 참가', earned: false },
    { id: 12, name: '마스터', icon: '🎯', desc: '미니게임 100회 참가', earned: false },
    { id: 13, name: '신', icon: '🎯', desc: '미니게임 500회 참가', earned: false },
    { id: 14, name: '전설', icon: '🎯', desc: '미니게임 1000회 참가', earned: false },
];

export default function MyPage() {
    const user = useAuthStore(state => state.user);
    const logout = useAuthStore(state => state.logout);
    const { theme, toggleTheme } = useThemeStore();
    const [activeTab, setActiveTab] = useState('활동');
    const [myPosts, setMyPosts] = useState<any[]>([]);

    // Settings State
    const [notifEnabled, setNotifEnabled] = useState(true);
    const [emailNotif, setEmailNotif] = useState(false);
    
    // Profile Edit State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editName, setEditName] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const handleOpenEditModal = () => {
        if(user) {
            setEditName(user.name);
            setIsEditModalOpen(true);
        }
    };

    const handleSaveProfile = async () => {
        if (!user || !auth.currentUser) return;
        try {
            await updateProfile(auth.currentUser, { displayName: editName });
            await updateDoc(doc(db, 'users', user.id), { name: editName });
            setIsEditModalOpen(false);
            alert('프로필이 성공적으로 업데이트 되었습니다!');
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('프로필 업데이트에 실패했습니다.');
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user || !auth.currentUser) return;
        
        setIsUploading(true);
        try {
            const fileRef = ref(storage, `profiles/${user.id}/${file.name}`);
            await uploadBytes(fileRef, file);
            const photoURL = await getDownloadURL(fileRef);
            
            await updateProfile(auth.currentUser, { photoURL });
            await updateDoc(doc(db, 'users', user.id), { photoURL });
            
            alert('프로필 사진이 변경되었습니다.');
        } catch (error) {
            console.error('Error uploading photo:', error);
            alert('사진 업로드에 실패했습니다.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleLogoutBtn = async () => {
        if(window.confirm('정말 로그아웃 하시겠습니까?')) {
            await logout();
        }
    };

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
            <div className="mypage-light animate-fade-in" style={{ padding: '100px 20px', textAlign: 'center' }}>
                <Shield size={64} style={{ color: 'var(--primary)', marginBottom: '24px', opacity: 0.2 }} />
                <h2 style={{ fontSize: '24px', fontWeight: '800' }}>로그인이 필요한 페이지입니다.</h2>
                <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>커뮤니티의 다양한 기능을 이용해 보세요.</p>
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
                                            <h4>닉네임 수정 ({user.name})</h4>
                                            <p>커뮤니티에서 사용되는 이름을 변경합니다.</p>
                                        </div>
                                        <button className="v3-btn-small" onClick={handleOpenEditModal}>변경하기</button>
                                    </div>
                                    <div className="setting-row-v3">
                                        <div className="setting-info-v3">
                                            <h4>프로필 사진 관리</h4>
                                            <p>새로운 프로필 이미지를 업로드합니다.</p>
                                        </div>
                                        <div style={{position: 'relative'}}>
                                            <input 
                                                type="file" 
                                                id="profileUpload" 
                                                style={{display: 'none'}} 
                                                accept="image/*"
                                                onChange={handlePhotoUpload}
                                                disabled={isUploading}
                                            />
                                            <label htmlFor="profileUpload" className="v3-btn-small" style={{cursor: 'pointer', display: 'inline-block'}}>
                                                {isUploading ? '업로드 중...' : '사진 변경'}
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="v3-card">
                                <h3 className="v3-title">시스템 설정</h3>
                                <div className="setting-group-v3">
                                    <div className="setting-row-v3">
                                        <div className="setting-info-v3">
                                            <h4>다크 모드</h4>
                                            <p>눈이 편안한 어두운 테마로 변경합니다. (현재: {theme === 'dark' ? '다크 모드' : '라이트 모드'})</p>
                                        </div>
                                        <div className={`v3-toggle ${theme === 'dark' ? 'on' : ''}`} onClick={toggleTheme}>
                                            <span style={{ position: 'absolute', left: theme === 'dark' ? 6 : 28, top: 5, fontSize: 12, transition: 'all 0.3s' }}>
                                                {theme === 'dark' ? '🌙' : '☀️'}
                                            </span>
                                        </div>
                                    </div>
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
                                            <h4>계정 로그아웃</h4>
                                            <p>현재 기기에서 계정을 로그아웃 합니다.</p>
                                        </div>
                                        <button className="v3-btn-small secondary" onClick={handleLogoutBtn}>
                                            <LogOut size={14} style={{marginRight: '4px', verticalAlign: 'middle'}}/> 로그아웃
                                        </button>
                                    </div>
                                    <div className="setting-row-v3">
                                        <div className="setting-info-v3">
                                            <h4 style={{ color: '#ff4757' }}>계정 탈퇴</h4>
                                            <p>작성된 모든 데이터와 함께 계정을 삭제합니다.</p>
                                        </div>
                                        <button className="v3-btn-small danger" onClick={() => alert('현재 계정 탈퇴는 관리자 문의가 필요합니다.')}>탈퇴하기</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                {isEditModalOpen && (
                    <div className="modal-overlay-v3" onClick={() => setIsEditModalOpen(false)}>
                        <div className="modal-content-v3" onClick={(e) => e.stopPropagation()}>
                            <button className="modal-close-v3" onClick={() => setIsEditModalOpen(false)}>
                                <X size={20} />
                            </button>
                            <h2 className="modal-title-v3">프로필 편집</h2>
                            
                            <div className="modal-body-v3">
                                <div className="input-group-v3">
                                    <label>새 닉네임</label>
                                    <input 
                                        type="text" 
                                        value={editName} 
                                        onChange={(e) => setEditName(e.target.value)} 
                                        placeholder="멋진 닉네임을 입력하세요!"
                                        maxLength={15}
                                    />
                                </div>
                                
                                <button className="v3-btn full-width" onClick={handleSaveProfile} disabled={!editName.trim() || editName === user.name}>
                                    <Check size={18} /> 저장하기
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
