import { useState, useEffect, useMemo } from 'react';
import { Edit } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { logAdminAction } from '../../lib/adminAudit';
import { useAuthStore } from '../../store/authStore';

export default function UsersTab() {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<
    {
      id: string;
      name?: string;
      email?: string;
      photoURL?: string;
      role?: string;
      level?: number;
      points?: number;
      isBanned?: boolean;
    }[]
  >([]);
  const [editPointsId, setEditPointsId] = useState<string | null>(null);
  const [editPointsVal, setEditPointsVal] = useState(0);
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('points', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = (u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [users, userSearch]);

  const handleSavePoints = async (userId: string) => {
    await updateDoc(doc(db, 'users', userId), { points: editPointsVal });
    await logAdminAction(user, 'user.points_update', {
      targetCollection: 'users',
      targetId: userId,
      detail: { points: editPointsVal },
    });
    setEditPointsId(null);
  };

  const handleToggleBan = async (userId: string, currentBanned: boolean) => {
    if (
      !window.confirm(
        currentBanned ? '해당 유저의 제재를 해제하시겠습니까?' : '해당 유저의 활동을 정지시키겠습니까?'
      )
    )
      return;
    try {
      await updateDoc(doc(db, 'users', userId), { isBanned: !currentBanned });
      await logAdminAction(user, 'user.ban_toggle', {
        targetCollection: 'users',
        targetId: userId,
        detail: { isBanned: !currentBanned },
      });
      alert(currentBanned ? '제재가 해제되었습니다.' : '활동이 정지되었습니다.');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="admin-content">
      <h3 className="section-title" style={{ marginBottom: '16px' }}>
        전체 유저 목록 ({users.length}명)
        {userSearch.trim() ? ` · 표시 ${filteredUsers.length}명` : ''}
      </h3>
      <input
        type="search"
        placeholder="이름 또는 이메일 검색…"
        value={userSearch}
        onChange={(e) => setUserSearch(e.target.value)}
        style={{
          width: '100%',
          maxWidth: '400px',
          marginBottom: '16px',
          padding: '12px 16px',
          borderRadius: '12px',
          border: '1px solid var(--border-light)',
          background: 'var(--bg-main)',
          color: 'var(--text-main)',
          fontSize: '14px',
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredUsers.map((u) => (
          <div
            key={u.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px 18px',
              borderRadius: '12px',
              background: 'var(--bg-main)',
              border: '1px solid var(--border-light)',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'var(--gradient)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '16px',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {u.photoURL ? (
                <img
                  src={u.photoURL}
                  alt={u.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                (u.name || '?')[0]
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {u.name}
                {u.role === 'admin' && (
                  <span
                    style={{
                      fontSize: '11px',
                      background: '#FF4757',
                      color: 'white',
                      padding: '2px 7px',
                      borderRadius: '10px',
                    }}
                  >
                    관리자
                  </span>
                )}
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
                    onChange={(e) => setEditPointsVal(Number(e.target.value))}
                    style={{
                      width: '70px',
                      padding: '4px 6px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-light)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-main)',
                      fontSize: '13px',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSavePoints(u.id)}
                    style={{
                      padding: '4px 8px',
                      background: '#00B894',
                      color: 'white',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      border: 'none',
                    }}
                  >
                    저장
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPointsId(null)}
                    style={{
                      padding: '4px 8px',
                      background: 'var(--bg-hover)',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      border: 'none',
                    }}
                  >
                    취소
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setEditPointsId(u.id);
                    setEditPointsVal(u.points || 0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setEditPointsId(u.id);
                      setEditPointsVal(u.points || 0);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <span style={{ fontWeight: 800 }}>{(u.points || 0).toLocaleString()}P</span>
                  <Edit size={13} color="var(--text-muted)" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleToggleBan(u.id, !!u.isBanned)}
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 700,
                background: u.isBanned ? '#FF4757' : 'var(--bg-hover)',
                color: u.isBanned ? 'white' : 'var(--text-muted)',
                border: `1px solid ${u.isBanned ? '#FF4757' : 'var(--border-light)'}`,
                cursor: 'pointer',
              }}
            >
              {u.isBanned ? '정지됨' : '정지'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
