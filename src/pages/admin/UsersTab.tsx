import { useEffect, useMemo, useState } from 'react';
import { Ban, Coins, GraduationCap, Search, Shield } from 'lucide-react';
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { logAdminAction } from '../../lib/adminAudit';
import { useAuthStore } from '../../store/authStore';
import type { AdminNotify } from '../../hooks/useAdminToast';
import type { AdminUserRow } from '../../types/admin';
import ConfirmModal from '../../components/ui/ConfirmModal';

type Props = {
  onNotify?: AdminNotify;
};

export default function UsersTab({ onNotify }: Props) {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [editTarget, setEditTarget] = useState<AdminUserRow | null>(null);
  const [editPointsVal, setEditPointsVal] = useState(0);
  const [banTarget, setBanTarget] = useState<AdminUserRow | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('points', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map((entry) => ({ id: entry.id, ...(entry.data() as Omit<AdminUserRow, 'id'>) })));
    });
    return () => unsub();
  }, []);

  const filteredUsers = useMemo(() => {
    const keyword = userSearch.trim().toLowerCase();
    if (!keyword) return users;
    return users.filter((entry) =>
      [entry.name, entry.email, entry.schoolName, entry.grade, entry.class].join(' ').toLowerCase().includes(keyword)
    );
  }, [userSearch, users]);

  const handleSavePoints = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', editTarget.id), { points: editPointsVal });
      await logAdminAction(user, 'user.points_update', {
        targetCollection: 'users',
        targetId: editTarget.id,
        detail: { points: editPointsVal },
      });
      onNotify?.('포인트를 업데이트했습니다.');
      setEditTarget(null);
    } catch (e) {
      console.error(e);
      onNotify?.('포인트 업데이트에 실패했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBan = async () => {
    if (!banTarget) return;
    const next = !banTarget.isBanned;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', banTarget.id), { isBanned: next });
      await logAdminAction(user, 'user.ban_toggle', {
        targetCollection: 'users',
        targetId: banTarget.id,
        detail: { isBanned: next },
      });
      onNotify?.(next ? '사용자를 차단했습니다.' : '사용자 차단을 해제했습니다.');
    } catch (e) {
      console.error(e);
      onNotify?.('차단 상태 변경에 실패했습니다.', 'error');
    } finally {
      setSaving(false);
      setBanTarget(null);
    }
  };

  return (
    <div className="admin-content">
      <ConfirmModal
        isOpen={!!banTarget}
        onClose={() => setBanTarget(null)}
        onConfirm={handleToggleBan}
        title={banTarget?.isBanned ? '차단 해제' : '사용자 차단'}
        message={
          banTarget?.isBanned
            ? '선택한 사용자의 차단을 해제합니다.'
            : '선택한 사용자는 글 작성과 댓글 작성이 제한됩니다.'
        }
        confirmText={banTarget?.isBanned ? '해제' : '차단'}
        type="danger"
      />

      <div className="table-header-actions">
        <div>
          <h3 className="section-title">유저 관리</h3>
          <p className="admin-section-description">
            전체 {users.length}명 중 검색 결과 {filteredUsers.length}명을 확인하고 있습니다.
          </p>
        </div>
      </div>

      <div className="admin-toolbar">
        <label className="admin-search-wrap">
          <Search size={16} />
          <input
            className="admin-search"
            type="search"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="이름, 이메일, 학교, 학년/반 검색"
          />
        </label>
      </div>

      {editTarget && (
        <div className="admin-floating-panel">
          <div>
            <strong>{editTarget.name || '이름 없음'}</strong> 포인트 수정
          </div>
          <input
            className="admin-inline-input"
            type="number"
            value={editPointsVal}
            onChange={(e) => setEditPointsVal(Number(e.target.value))}
          />
          <button type="button" className="admin-btn approve" onClick={handleSavePoints} disabled={saving}>
            저장
          </button>
          <button type="button" className="admin-btn dismiss" onClick={() => setEditTarget(null)}>
            취소
          </button>
        </div>
      )}

      <div className="admin-user-grid">
        {filteredUsers.length === 0 ? (
          <div className="admin-empty">검색 결과가 없습니다.</div>
        ) : (
          filteredUsers.map((entry) => (
            <div key={entry.id} className="admin-user-card">
              <div className="admin-user-head">
                <div className="admin-user-avatar">
                  {entry.photoURL ? <img src={entry.photoURL} alt={entry.name || 'profile'} /> : (entry.name || '?')[0]}
                </div>
                <div className="admin-user-copy">
                  <div className="admin-user-name">{entry.name || '이름 없음'}</div>
                  <div className="admin-muted">{entry.email || '이메일 없음'}</div>
                  <div className="admin-badge-row">
                    {entry.role === 'admin' && <span className="admin-chip danger"><Shield size={12} /> 관리자</span>}
                    {entry.isBanned && <span className="admin-chip warning"><Ban size={12} /> 차단</span>}
                    {entry.isStudent && <span className="admin-chip"><GraduationCap size={12} /> 학생</span>}
                  </div>
                </div>
              </div>

              <div className="admin-user-stats">
                <div>
                  <span>레벨</span>
                  <strong>Lv.{entry.level || 1}</strong>
                </div>
                <div>
                  <span>포인트</span>
                  <strong>{(entry.points || 0).toLocaleString()}P</strong>
                </div>
                <div>
                  <span>학교</span>
                  <strong>{entry.schoolName || '-'}</strong>
                </div>
                <div>
                  <span>학년/반</span>
                  <strong>{entry.grade ? `${entry.grade}-${entry.class || '-'}` : '-'}</strong>
                </div>
              </div>

              <div className="admin-inline-actions">
                <button
                  type="button"
                  className="admin-btn"
                  onClick={() => {
                    setEditTarget(entry);
                    setEditPointsVal(entry.points || 0);
                  }}
                >
                  <Coins size={16} />
                  포인트 수정
                </button>
                <button type="button" className="admin-btn delete" onClick={() => setBanTarget(entry)}>
                  <Ban size={16} />
                  {entry.isBanned ? '차단 해제' : '차단'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
