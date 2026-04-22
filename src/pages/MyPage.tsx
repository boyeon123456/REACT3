import { useState, useEffect } from 'react';
import { Settings, Shield, Activity, X, LogOut, Check, ShoppingBag } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { db, auth, storage } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './MyPage.css';

// 배지는 Firestore user.badges 기반으로 동적 연산

export default function MyPage() {
    const user = useAuthStore(state => state.user);
    const logout = useAuthStore(state => state.logout);
    const { theme, toggleTheme } = useThemeStore();
    const [activeTab, setActiveTab] = useState<'활동' | '설정' | '인벤토리'>('활동');
    const [myPosts, setMyPosts] = useState<any[]>([]);
    const [inventory, setInventory] = useState<any[]>([]);
    const [shopItemsMap, setShopItemsMap] = useState<Record<string, any>>({});




    // Settings State
    const [notifEnabled, setNotifEnabled] = useState(true);
    const [emailNotif, setEmailNotif] = useState(false);
    
    // Profile Edit State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editName, setEditName] = useState('');
    const [editGrade, setEditGrade] = useState('');
    const [editClass, setEditClass] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const handleOpenEditModal = () => {
        if(user) {
            setEditName(user.name);
            setEditGrade(user.grade || '');
            setEditClass(user.class || '');
            setIsEditModalOpen(true);
        }
    };

    const handleSaveProfile = async () => {
        if (!user || !auth.currentUser) return;
        try {
            await updateProfile(auth.currentUser, { displayName: editName });
            await updateDoc(doc(db, 'users', user.id), { 
                name: editName,
                grade: editGrade,
                class: editClass
            });
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

    const handleEquip = async (item: any) => {
        if (!user) return;
        try {
            const equipped = user.equipped_items || {};
            const isEquipped = equipped[item.type] === item.id;
            
            const newEquipped = { ...equipped };
            if (isEquipped) {
                delete newEquipped[item.type];
            } else {
                newEquipped[item.type] = item.id;
            }

            await updateDoc(doc(db, 'users', user.id), {
                equipped_items: newEquipped
            });
            alert(isEquipped ? '장착 해제되었습니다.' : '장착되었습니다!');
        } catch (e) {
            console.error(e);
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

            onSnapshot(collection(db, 'users', user.id, 'inventory'), (snap) => {
                setInventory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            });

            // 상점 아이템 정보 로드 (스타일 참조용)
            onSnapshot(collection(db, 'shop_items'), (snap) => {
                const itemMap: any = {};
                snap.forEach(d => { itemMap[d.id] = { id: d.id, ...d.data() }; });
                setShopItemsMap(itemMap);
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
            <div className="mypage-header-bg" style={{ 
                background: user.equipped_items?.profileBg ? shopItemsMap[user.equipped_items.profileBg]?.style : 'var(--gradient)',
                height: '220px',
                transition: 'all 0.5s ease'
            }}></div>


            <div className="mypage-container-v3">
                <div className="profile-section-v3">
                    <div className="profile-avatar-v3" style={{ 
                        border: user.equipped_items?.avatarFrame ? `4px solid ${shopItemsMap[user.equipped_items.avatarFrame]?.style}` : '4px solid var(--bg-card)',
                        boxShadow: user.equipped_items?.avatarFrame ? `0 0 15px ${shopItemsMap[user.equipped_items.avatarFrame]?.style}55` : 'none',
                        transition: 'all 0.3s'
                    }}>
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
                            {(user.grade && user.class) ? (
                                <span className="badge-v3 school">🏫 {user.grade}학년 {user.class}반</span>
                            ) : (
                                <button className="badge-v3 school pulse-btn" onClick={handleOpenEditModal} style={{ cursor: 'pointer', border: 'none' }}>
                                    🎓 학년/반 설정하기
                                </button>
                            )}
                            <span className="badge-v3 points">💎 {user.points?.toLocaleString()} P</span>
                        </div>
                    </div>
                    <div className="profile-actions-v3" style={{ display: 'flex', gap: '8px' }}>
                        <button className="v3-btn primary" onClick={handleOpenEditModal}><Settings size={18} /> 프로필 편집</button>
                    </div>
                </div>

                <div className="tabs-v3">
                    <button className={`tab-btn-v3 ${activeTab === '활동' ? 'active' : ''}`} onClick={() => setActiveTab('활동')}>내 활동</button>
                    <button className={`tab-btn-v3 ${activeTab === '인벤토리' ? 'active' : ''}`} onClick={() => setActiveTab('인벤토리')}>인벤토리</button>
                    <button className={`tab-btn-v3 ${activeTab === '설정' ? 'active' : ''}`} onClick={() => setActiveTab('설정')}>계정 설정</button>
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

                    {activeTab === '인벤토리' && (
                        <div className="inventory-section-v3" style={{ animation: 'slideUp 0.4s ease-out' }}>
                            <div className="section-title-wrap" style={{ marginBottom: '24px' }}>
                                <h3 className="v3-title"><ShoppingBag size={20} /> 나의 가방</h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>구매한 아이템을 자유롭게 장착하고 해제할 수 있습니다.</p>
                            </div>

                            {inventory.length === 0 ? (
                                <div className="v3-card" style={{ textAlign: 'center', padding: '60px', borderRadius: '24px' }}>
                                    <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>아직 소유한 아이템이 없네요.</p>
                                    <button className="v3-btn primary" onClick={() => window.location.href='/shop'}>상점 방문하기</button>
                                </div>
                            ) : (
                                <div className="inventory-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                                    {inventory.map(item => {
                                        const isEquipped = user?.equipped_items?.[item.type] === item.id;
                                        return (
                                            <div key={item.id} className={`v3-card inv-item ${isEquipped ? 'equipped' : ''}`} style={{ 
                                                border: isEquipped ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                                                padding: '20px',
                                                borderRadius: '20px',
                                                background: 'var(--bg-card)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                transition: 'all 0.2s'
                                            }}>
                                                <div style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>{item.type}</div>
                                                <div style={{ 
                                                    fontSize: '16px', 
                                                    fontWeight: 800, 
                                                    marginBottom: '16px', 
                                                    color: item.type === 'nameColor' ? item.style : (item.type === 'badge' ? item.style : 'var(--text-main)'),
                                                    flex: 1
                                                }}>
                                                    {item.name}
                                                    {item.type === 'profileBg' && <div style={{ height: '30px', background: item.style, borderRadius: '4px', marginTop: '8px' }}></div>}
                                                    {item.type === 'avatarFrame' && <div style={{ width: '30px', height: '30px', border: `3px solid ${item.style}`, borderRadius: '50%', marginTop: '8px', margin: '8px auto 0' }}></div>}
                                                </div>

                                                <button 
                                                    className={`v3-btn-small ${isEquipped ? 'secondary' : 'primary'}`} 
                                                    style={{ width: '100%' }}
                                                    onClick={() => handleEquip(item)}
                                                >
                                                    {isEquipped ? '장착 해제' : '장착하기'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
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
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                                    <div className="input-group-v3" style={{ marginBottom: 0 }}>
                                        <label>학년</label>
                                        <select value={editGrade} onChange={(e) => setEditGrade(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
                                            <option value="">학년 선택</option>
                                            <option value="1">1학년</option>
                                            <option value="2">2학년</option>
                                            <option value="3">3학년</option>
                                        </select>
                                    </div>
                                    <div className="input-group-v3" style={{ marginBottom: 0 }}>
                                        <label>반</label>
                                        <select value={editClass} onChange={(e) => setEditClass(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
                                            <option value="">반 선택</option>
                                            {[1,2,3,4,5,6,7,8,9,10].map(n => (
                                                <option key={n} value={String(n)}>{n}반</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                
                                <button className="v3-btn full-width" onClick={handleSaveProfile} disabled={!editName.trim() || (editName === user.name && editGrade === user.grade && editClass === user.class)}>

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
