import { useState, useEffect } from 'react';
import { AlertCircle, Users, FileText, Trash2, CheckCircle, XCircle, Clock, TrendingUp, Edit, Sparkles } from 'lucide-react';


import { db } from '../firebase';
import {
  collection, query, orderBy, onSnapshot, updateDoc, doc,
  deleteDoc, getDocs, where, getCountFromServer, addDoc, setDoc, writeBatch
} from 'firebase/firestore';
import './Admin.css';

export default function Admin() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [reports, setReports] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [shopItems, setShopItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'reports' | 'users' | 'system' | 'timetable' | 'shop'>('reports');


  const [stats, setStats] = useState({ totalUsers: 0, todayPosts: 0, pendingReports: 0, totalPosts: 0, boardStats: {} as any });
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [editPointsId, setEditPointsId] = useState<string | null>(null);
  const [editPointsVal, setEditPointsVal] = useState(0);

  // 시스템 설정 관련
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [newAnnounce, setNewAnnounce] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  
  // 시간표 관리 관련
  const [ttGrade, setTtGrade] = useState('1');
  const [ttClass, setTtClass] = useState('1');
  const [ttData, setTtData] = useState<any>(null);
  const [ttSaving, setTtSaving] = useState(false);
  const days = ['월', '화', '수', '목', '금'];
  const periods = [1,2,3,4,5,6,7];

  // 상점 관리 관련
  const [newItemName, setNewItemName] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemPrice, setNewItemPrice] = useState(1000);
  const [newItemType, setNewItemType] = useState<'badge' | 'nameColor' | 'profileBg' | 'avatarFrame'>('badge');

  const [newItemStyle, setNewItemStyle] = useState('');
  const [shopSaving, setShopSaving] = useState(false);




  // 실시간 신고 목록
  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, 
      (snap) => {
        setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('Reports sync error:', err);
        setError('신고 내역을 불러오지 못했습니다. 권한을 확인하세요.');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);


  // 실시간 유저 목록
  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('points', 'desc'));
    const unsub = onSnapshot(q, 
      (snap) => {
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      (err) => console.error('Users sync error:', err)
    );
    return () => unsub();
  }, []);


  // 공지사항 로드
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'announcements'), 
      (snap) => {
        if (snap.exists()) {
          setAnnouncements(snap.data().list || []);
        }
      },
      (err) => console.error('Announcements sync error:', err)
    );
    return () => unsub();
  }, []);

  // 시간표 로드
  useEffect(() => {
    if (activeTab !== 'timetable') return;
    const unsub = onSnapshot(doc(db, 'timetables', `${ttGrade}-${ttClass}`), (snap) => {
        if (snap.exists()) {
            setTtData(snap.data());
        } else {
            // 빈 시간표 객체 초기화 (undefined 방지)
            const emptyData: any = {};
            days.forEach(d => {
                emptyData[d] = {};
                periods.forEach(p => { emptyData[d][p] = ''; });
            });
            setTtData(emptyData);
        }
    });

    return () => unsub();
  }, [activeTab, ttGrade, ttClass]);

  // 상점 아이템 로드
  useEffect(() => {
    if (activeTab !== 'shop') return;
    const q = query(collection(db, 'shop_items'), orderBy('price', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
        setShopItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [activeTab]);





  // 통계 조회
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const usersSnap = await getCountFromServer(collection(db, 'users'));
        const postsSnap = await getCountFromServer(collection(db, 'posts'));
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const todayPostsSnap = await getCountFromServer(
          query(collection(db, 'posts'), where('created_at', '>=', todayStart.getTime()))
        );
        const pendingSnap = await getCountFromServer(
          query(collection(db, 'reports'), where('status', '==', 'pending'))
        );

        // 카테고리별 통계
        const boardCounts: any = {};
        const allPostsSnap = await getDocs(collection(db, 'posts'));
        allPostsSnap.docs.forEach(d => {
            const board = d.data().board || '기타';
            boardCounts[board] = (boardCounts[board] || 0) + 1;
        });

        setStats({
          totalUsers: usersSnap.data().count,
          todayPosts: todayPostsSnap.data().count,
          pendingReports: pendingSnap.data().count,
          totalPosts: postsSnap.data().count,
          boardStats: boardCounts
        });
      } catch (e: any) {
        console.error('Stats fetch error:', e);
        setError(e.message || '데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [reports]);


  const tagColors: Record<string, string> = {
    '1학년': '#00B894', '2학년': '#6C5CE7', '3학년': '#E17055',
    '학생회': '#0984E3', '자유게시판': '#FDCB6E', '공지사항': '#FF4757', '기기기타': '#8E8E93'
  };


  const handleResolve = async (id: string) => {
    await updateDoc(doc(db, 'reports', id), { status: 'resolved' });
  };

  const handleDeleteReport = async (report: any) => {
    if (!window.confirm('이 신고를 삭제하시겠습니까?')) return;
    // 신고된 게시글도 함께 삭제 옵션
    if (window.confirm('신고된 게시글도 함께 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'posts', report.contentId));
      } catch (e) { console.error(e); }
    }
    await deleteDoc(doc(db, 'reports', report.id));
  };

  const handleDismiss = async (id: string) => {
    await updateDoc(doc(db, 'reports', id), { status: 'dismissed' });
  };

  const handleSavePoints = async (userId: string) => {
    await updateDoc(doc(db, 'users', userId), { points: editPointsVal });
    setEditPointsId(null);
  };

  // 공지사항 업데이트
  const updateAnnouncements = async (newList: string[]) => {
    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'announcements'), {
        list: newList,
        updatedAt: Date.now()
      }, { merge: true });
    } catch (e) {
      console.error(e);
      alert('업데이트 실패');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleClearHandledReports = async () => {
    if (!window.confirm('처리 완료되거나 기각된 모든 신고를 삭제하시겠습니까?')) return;
    const handled = reports.filter(r => r.status !== 'pending');
    if (handled.length === 0) return;

    try {
      const batch = writeBatch(db);
      handled.forEach(r => batch.delete(doc(db, 'reports', r.id)));
      await batch.commit();
      alert('정리되었습니다.');
    } catch (e) { console.error(e); }
  };

  const deleteSingleReport = async (id: string) => {
    if (!window.confirm('이 신고 내역을 삭제하시겠습니까?')) return;
    await deleteDoc(doc(db, 'reports', id));
  };

  const handleTogglePin = async (postId: string, currentPinned: boolean) => {
    try {
      await updateDoc(doc(db, 'posts', postId), { isPinned: !currentPinned });
      alert(currentPinned ? '핀 고정이 해제되었습니다.' : '핀 고정되었습니다.');
    } catch (e) {
      console.error(e);
      alert('핀 작업 실패 (삭제된 게시글일 수 있습니다)');
    }
  };

  const handleToggleBan = async (userId: string, currentBanned: boolean) => {
    if (!window.confirm(currentBanned ? '해당 유저의 제재를 해제하시겠습니까?' : '해당 유저의 활동을 정지시키겠습니까?')) return;
    try {
      await updateDoc(doc(db, 'users', userId), { isBanned: !currentBanned });
      alert(currentBanned ? '제재가 해제되었습니다.' : '활동이 정지되었습니다.');
    } catch (e) { console.error(e); }
  };

  const saveTimetable = async () => {
    setTtSaving(true);
    try {
        // 데이터 정제 (undefined 제거)
        const cleanData: any = {};
        days.forEach(d => {
            cleanData[d] = {};
            periods.forEach(p => {
                cleanData[d][p] = ttData?.[d]?.[p] || '';
            });
        });

        await setDoc(doc(db, 'timetables', `${ttGrade}-${ttClass}`), cleanData, { merge: true });
        alert('시간표가 저장되었습니다.');
    } catch (e) {

        console.error(e);
        alert('시간표 저장 실패');
    } finally {
        setTtSaving(false);
    }
  };

  const handleTtChange = (day: string, period: number, value: string) => {
    const newData = { ...ttData };
    if (!newData[day]) newData[day] = [];
    
    // 배열 인덱스 맞추기 (데이터 구조: { 월: [{period: 1, subject: "국어"}...] })
    // 또는 간단하게 { 월: { "1": "국어", "2": "수학" } }
    if (!newData[day]) newData[day] = {};
    newData[day][period] = value;
    setTtData(newData);
  };

  const handleCreateShopItem = async () => {
    if (!newItemName.trim() || newItemPrice === undefined || newItemPrice === null) return;
    setShopSaving(true);
    try {
        await addDoc(collection(db, 'shop_items'), {
            name: newItemName,
            description: newItemDesc,
            price: newItemPrice,
            type: newItemType,
            style: newItemStyle,
            createdAt: Date.now()
        });
        setNewItemName('');
        setNewItemDesc('');
        setNewItemPrice(1000);
        alert('아이템이 등록되었습니다.');
    } catch (e: any) { 
        console.error(e); 
        alert('아이템 등록 실패: ' + (e.message || e));
    } finally { setShopSaving(false); }
  };

  const handleDeleteShopItem = async (id: string) => {
    if (!window.confirm('이 상품을 상점에서 삭제할까요?')) return;
    try {
        await deleteDoc(doc(db, 'shop_items', id));
    } catch (e) { console.error(e); }
  };






  const filteredReports = reports.filter(r =>
    filter === 'all' ? true :
    filter === 'pending' ? r.status === 'pending' :
    r.status === 'resolved' || r.status === 'dismissed'
  );

  const statCards = [
    { title: '총 가입자', value: `${stats.totalUsers.toLocaleString()}명`, icon: Users, color: '#6C5CE7', bg: 'rgba(108,92,231,0.1)' },
    { title: '오늘 게시글', value: `${stats.todayPosts}개`, icon: FileText, color: '#4DA3FF', bg: 'rgba(77,163,255,0.1)' },
    { title: '미처리 신고', value: `${stats.pendingReports}건`, icon: AlertCircle, color: '#FF4757', bg: 'rgba(255,71,87,0.1)' },
    { title: '총 게시글', value: `${stats.totalPosts.toLocaleString()}개`, icon: TrendingUp, color: '#00B894', bg: 'rgba(0,184,148,0.1)' },
  ];

  return (
    <div className="admin-page animate-fade-in">
      <div className="admin-header"><h1 className="page-title">🛡️ 관리자 대시보드</h1></div>

      <div className="admin-stats">
        {statCards.map((s, i) => (
          <div key={i} className="admin-stat-card">
            <div className="stat-icon-wrap" style={{ backgroundColor: s.bg, color: s.color }}><s.icon size={24} /></div>
            <div className="stat-info">
              <span className="stat-title">{s.title}</span>
              <span className="stat-value" style={{ color: s.color }}>{s.value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-stats-secondary" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="admin-content" style={{ padding: '24px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><TrendingUp size={18}/> 게시판별 게시글 분포</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {stats.boardStats && Object.entries(stats.boardStats).length > 0 ? (
                    Object.entries(stats.boardStats).sort((a: any, b: any) => b[1] - a[1]).map(([board, count]: any) => (
                        <div key={board}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px', fontWeight: 700 }}>
                                <span>{board}</span>
                                <span>{count}개</span>
                            </div>
                            <div style={{ height: '6px', background: 'var(--bg-main)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ 
                                    height: '100%', 
                                    width: `${(count / (stats.totalPosts || 1)) * 100}%`, 
                                    background: tagColors[board] || 'var(--primary)',
                                    transition: 'width 1s ease-out'
                                }} />
                            </div>
                        </div>
                    ))
                ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>통계 데이터가 없거나 불러오는 중입니다.</div>
                )}
            </div>
        </div>

        <div className="admin-content" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ color: 'var(--primary)', marginBottom: '12px' }}><Sparkles size={32} /></div>
            <h4 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '4px' }}>커뮤니티 활성도</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>오늘 하루도 고생 많으셨습니다!<br/>학생들이 남긴 소중한 의견들을 관리해보세요.</p>
        </div>
      </div>


      {/* 관리 탭 */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '2px solid var(--border-light)', marginBottom: '24px' }}>
        <button
          className={`af-tab ${activeTab === 'reports' ? 'active' : ''}`}
          style={{ padding: '10px 24px', fontWeight: 700, borderBottom: activeTab === 'reports' ? '3px solid var(--primary)' : '3px solid transparent', marginBottom: '-2px', background: 'transparent', color: activeTab === 'reports' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
          onClick={() => setActiveTab('reports')}
        >
          🚨 신고 관리
        </button>
        <button
          className={`af-tab ${activeTab === 'system' ? 'active' : ''}`}
          style={{ padding: '10px 24px', fontWeight: 700, borderBottom: activeTab === 'system' ? '3px solid var(--primary)' : '3px solid transparent', marginBottom: '-2px', background: 'transparent', color: activeTab === 'system' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
          onClick={() => setActiveTab('system')}
        >
          ⚙️ 시스템 설정
        </button>
        <button
          className={`af-tab ${activeTab === 'users' ? 'active' : ''}`}
          style={{ padding: '10px 24px', fontWeight: 700, borderBottom: activeTab === 'users' ? '3px solid var(--primary)' : '3px solid transparent', marginBottom: '-2px', background: 'transparent', color: activeTab === 'users' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
          onClick={() => setActiveTab('users')}
        >
          👥 유저 관리
        </button>
        <button
          className={`af-tab ${activeTab === 'timetable' ? 'active' : ''}`}
          style={{ padding: '10px 24px', fontWeight: 700, borderBottom: activeTab === 'timetable' ? '3px solid var(--primary)' : '3px solid transparent', marginBottom: '-2px', background: 'transparent', color: activeTab === 'timetable' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
          onClick={() => setActiveTab('timetable')}
        >
          🗓️ 시간표 관리
        </button>
        <button
          className={`af-tab ${activeTab === 'shop' ? 'active' : ''}`}
          style={{ padding: '10px 24px', fontWeight: 700, borderBottom: activeTab === 'shop' ? '3px solid var(--primary)' : '3px solid transparent', marginBottom: '-2px', background: 'transparent', color: activeTab === 'shop' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
          onClick={() => setActiveTab('shop')}
        >
          🛍️ 상점 관리
        </button>



      </div>

      {/* 신고 관리 */}
      {activeTab === 'reports' && (
        <div className="admin-content">
          <div className="table-header-actions">
            <h3 className="section-title">신고 내역</h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {filter === 'resolved' && (
                <button 
                  onClick={handleClearHandledReports}
                  style={{ padding: '8px 12px', background: 'var(--bg-hover)', color: '#FF4757', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >
                  기록 전체 삭제
                </button>
              )}
              <div className="admin-filter-tabs">
                <button className={`af-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>전체</button>
                <button className={`af-tab ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>미처리</button>
                <button className={`af-tab ${filter === 'resolved' ? 'active' : ''}`} onClick={() => setFilter('resolved')}>완료/기각</button>
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>로딩 중...</div>
          ) : filteredReports.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>신고 내역이 없습니다.</div>
          ) : (
            <div className="report-cards">
              {filteredReports.map(report => (
                <div key={report.id} className={`report-card ${report.status}`}>
                  <div className="report-top">
                    <span className="report-type-badge">{report.type}</span>
                    <span className={`report-status ${report.status}`}>
                      {report.status === 'pending' ? <><Clock size={14}/> 미처리</> :
                       report.status === 'dismissed' ? <><XCircle size={14}/> 기각</> :
                       <><CheckCircle size={14}/> 완료</>}
                    </span>
                  </div>
                  <p className="report-content">"{report.content}"</p>
                  <div className="report-meta">
                    <span>사유: {report.reason}</span>
                    <span>신고자: {report.reporter}</span>
                    <span>{report.date}</span>
                  </div>
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                    <button 
                      className="admin-btn" 
                      onClick={() => handleTogglePin(report.contentId, !!report.isPinned)}
                      style={{ color: report.isPinned ? 'var(--primary)' : 'var(--text-muted)', borderColor: report.isPinned ? 'var(--primary)' : 'var(--border-light)' }}
                    >
                      📌 {report.isPinned ? '핀 해제' : '상단 고정'}
                    </button>
                    <a href={`/post/${report.contentId}`} target="_blank" rel="noreferrer" className="admin-btn" style={{ textDecoration: 'none' }}>
                      🔗 게시글 보기
                    </a>
                  </div>
                  {report.status === 'pending' ? (

                    <div className="report-actions">
                      <button className="admin-btn approve" onClick={() => handleResolve(report.id)}><CheckCircle size={16}/> 처리 완료</button>
                      <button className="admin-btn delete" onClick={() => handleDeleteReport(report)}><Trash2 size={16}/> 게시글 삭제</button>
                      <button className="admin-btn dismiss" onClick={() => handleDismiss(report.id)}><XCircle size={16}/> 기각</button>
                    </div>
                  ) : (
                    <div className="report-actions">
                      <button className="admin-btn dismiss" onClick={() => deleteSingleReport(report.id)}><Trash2 size={16}/> 기록 삭제</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 유저 관리 */}
      {activeTab === 'users' && (
        <div className="admin-content">
          <h3 className="section-title" style={{ marginBottom: '16px' }}>전체 유저 목록 ({users.length}명)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {users.map(u => (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 18px', borderRadius: '12px',
                background: 'var(--bg-main)', border: '1px solid var(--border-light)'
              }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '50%',
                  background: 'var(--gradient)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '16px', overflow: 'hidden', flexShrink: 0
                }}>
                  {u.photoURL ? <img src={u.photoURL} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (u.name || '?')[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {u.name}
                    {u.role === 'admin' && <span style={{ fontSize: '11px', background: '#FF4757', color: 'white', padding: '2px 7px', borderRadius: '10px' }}>관리자</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.email}</div>
                </div>
                <div style={{ textAlign: 'center', minWidth: '60px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>레벨</div>
                  <div style={{ fontWeight: 800, color: 'var(--primary)' }}>Lv.{u.level || 1}</div>
                </div>
                <div style={{ textAlign: 'center', minWidth: '80px' }}>
                  {editPointsId === u.id ? (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <input
                        type="number"
                        value={editPointsVal}
                        onChange={e => setEditPointsVal(Number(e.target.value))}
                        style={{ width: '70px', padding: '4px 6px', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '13px' }}
                      />
                      <button onClick={() => handleSavePoints(u.id)} style={{ padding: '4px 8px', background: '#00B894', color: 'white', borderRadius: '6px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>저장</button>
                      <button onClick={() => setEditPointsId(null)} style={{ padding: '4px 8px', background: 'var(--bg-hover)', borderRadius: '6px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>취소</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => { setEditPointsId(u.id); setEditPointsVal(u.points || 0); }}>
                      <span style={{ fontWeight: 800 }}>{(u.points || 0).toLocaleString()}P</span>
                      <Edit size={13} color="var(--text-muted)" />
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => handleToggleBan(u.id, !!u.isBanned)}
                  style={{
                    padding: '8px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                    background: u.isBanned ? '#FF4757' : 'var(--bg-hover)',
                    color: u.isBanned ? 'white' : 'var(--text-muted)',
                    border: '1px solid ' + (u.isBanned ? '#FF4757' : 'var(--border-light)'),
                    cursor: 'pointer'
                  }}
                >
                  {u.isBanned ? '정지됨' : '정지'}
                </button>
              </div>
            ))}

          </div>
        </div>
      )}

      {/* 시스템 설정 */}
      {activeTab === 'system' && (
        <div className="admin-content">
          <h3 className="section-title" style={{ marginBottom: '24px' }}>📢 공지사항(Ticker) 관리</h3>
          
          <div style={{ marginBottom: '24px', display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              placeholder="새로운 공지 내용을 입력하세요..." 
              value={newAnnounce}
              onChange={e => setNewAnnounce(e.target.value)}
              style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
            />
            <button 
              onClick={() => {
                if (!newAnnounce.trim()) return;
                updateAnnouncements([...announcements, newAnnounce.trim()]);
                setNewAnnounce('');
              }}
              disabled={savingSettings}
              style={{ padding: '0 24px', background: 'var(--primary)', color: 'white', fontWeight: 800, borderRadius: '12px', opacity: savingSettings ? 0.7 : 1 }}
            >
              추가
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {announcements.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>등록된 공지가 없습니다.</div>
            ) : announcements.map((text, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
                <div style={{ flex: 1, fontSize: '15px', fontWeight: 500 }}>{text}</div>
                <button 
                  onClick={() => updateAnnouncements(announcements.filter((_, i) => i !== idx))}
                  style={{ color: '#FF4757', padding: '6px', background: 'rgba(255, 71, 87, 0.05)', borderRadius: '8px' }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 시간표 관리 */}
      {activeTab === 'timetable' && (
        <div className="admin-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 className="section-title">🗓️ 학급 시간표 편집기</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
                <select value={ttGrade} onChange={e => setTtGrade(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
                    <option value="1">1학년</option>
                    <option value="2">2학년</option>
                    <option value="3">3학년</option>
                </select>
                <select value={ttClass} onChange={e => setTtClass(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
                    {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={String(n)}>{n}반</option>)}
                </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                <thead>
                    <tr style={{ background: 'var(--bg-main)' }}>
                        <th style={{ padding: '12px', border: '1px solid var(--border-light)', width: '60px' }}>교시</th>
                        {days.map(d => <th key={d} style={{ padding: '12px', border: '1px solid var(--border-light)' }}>{d}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {periods.map(p => (
                        <tr key={p}>
                            <td style={{ padding: '12px', border: '1px solid var(--border-light)', textAlign: 'center', fontWeight: 800, background: 'var(--bg-main)' }}>{p}</td>
                            {days.map(d => (
                                <td key={d} style={{ padding: '0', border: '1px solid var(--border-light)' }}>
                                    <input 
                                        type="text" 
                                        value={ttData?.[d]?.[p] || ''}
                                        onChange={e => handleTtChange(d, p, e.target.value)}
                                        placeholder="-"
                                        style={{ width: '100%', border: 'none', padding: '12px', background: 'transparent', textAlign: 'center', fontSize: '14px', color: 'var(--text-main)' }}
                                    />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
            <button 
                className="admin-btn approve" 
                onClick={saveTimetable} 
                disabled={ttSaving}
                style={{ padding: '12px 32px', fontSize: '15px' }}
            >
                {ttSaving ? '저장 중...' : '시간표 일괄 저장'}
            </button>
          </div>
        </div>
      )}

      {/* 상점 관리 */}
      {activeTab === 'shop' && (
        <div className="admin-content">
          <div style={{ background: 'var(--bg-main)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-light)', marginBottom: '32px' }}>
            <h3 className="section-title" style={{ marginBottom: '20px' }}>🎁 새 상품 등록</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-field">
                    <label style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>아이템 이름</label>
                    <input type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="예: [Gold] 칭호" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--bg-card)', color: 'var(--text-main)' }} />
                </div>
                <div className="input-field">
                    <label style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>가격 (Points)</label>
                    <input type="number" value={newItemPrice} onChange={e => setNewItemPrice(Number(e.target.value))} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--bg-card)', color: 'var(--text-main)' }} />
                </div>
                <div className="input-field">
                    <label style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>아이템 종류</label>
                    <select value={newItemType} onChange={e => setNewItemType(e.target.value as any)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--bg-card)', color: 'var(--text-main)' }}>
                        <option value="badge">칭호 (Badge)</option>
                        <option value="nameColor">이름 색상 (Color)</option>
                        <option value="profileBg">프로필 배경 (Background)</option>
                        <option value="avatarFrame">아바타 테두리 (Frame)</option>

                    </select>
                </div>
                <div className="input-field">
                    <label style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>스타일 (Color Hex / Gradient)</label>
                    <input type="text" value={newItemStyle} onChange={e => setNewItemStyle(e.target.value)} placeholder="예: #FFD700 또는 linear-gradient(...)" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--bg-card)', color: 'var(--text-main)' }} />
                </div>
                <div className="input-field" style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>상품 설명</label>
                    <textarea value={newItemDesc} onChange={e => setNewItemDesc(e.target.value)} placeholder="아이템에 대한 설명을 간단히 입력하세요." style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--bg-card)', color: 'var(--text-main)', minHeight: '80px' }} />
                </div>
            </div>
            <button onClick={handleCreateShopItem} disabled={shopSaving} className="admin-btn approve" style={{ marginTop: '20px', width: '100%', padding: '14px', fontSize: '16px' }}>
                {shopSaving ? '등록 중...' : '상품 출시하기'}
            </button>
          </div>

          <h3 className="section-title" style={{ marginBottom: '16px' }}>현재 판매 중인 목록 ({shopItems.length})</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {shopItems.map(item => (
                <div key={item.id} style={{ padding: '20px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-light)', position: 'relative' }}>
                    <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 800, marginBottom: '4px' }}>{item.type.toUpperCase()}</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: item.type === 'nameColor' ? item.style : 'var(--text-main)' }}>{item.name}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', minHeight: '32px' }}>{item.description}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 800, color: '#f59e0b' }}>💎 {item.price.toLocaleString()} P</div>
                        <button onClick={() => handleDeleteShopItem(item.id)} style={{ padding: '6px', color: '#FF4757', background: 'rgba(255,71,87,0.05)', borderRadius: '8px', border: 'none', cursor: 'pointer' }}><Trash2 size={18}/></button>
                    </div>
                </div>
            ))}
          </div>
        </div>
      )}
    </div>


  );
}
