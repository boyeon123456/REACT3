import { useEffect, useMemo, useRef, useState } from 'react';
import { GripVertical, PencilLine, Plus, Save, Trash2 } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useSearchParams } from 'react-router-dom';
import { db } from '../../firebase';
import { logAdminAction } from '../../lib/adminAudit';
import { useAuthStore } from '../../store/authStore';
import type { AdminNotify } from '../../hooks/useAdminToast';

type Props = {
  onNotify?: AdminNotify;
};

export default function SystemTab({ onNotify }: Props) {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const composeRef = useRef<HTMLDivElement | null>(null);
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', 'announcements'),
      (snap) => {
        if (snap.exists()) {
          setAnnouncements(((snap.data().list as string[] | undefined) ?? []).filter(Boolean));
        } else {
          setAnnouncements([]);
        }
      },
      (err) => console.error('Announcements sync error:', err)
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (searchParams.get('focus') === 'announcement-new') {
      composeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      searchParams.delete('focus');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const isEditing = editingIndex !== null;

  const helperText = useMemo(() => {
    if (savingSettings) return '저장 중입니다...';
    if (isEditing) return '공지 수정 모드입니다.';
    return '홈 화면 공지 티커에 바로 노출됩니다.';
  }, [isEditing, savingSettings]);

  const updateAnnouncements = async (
    nextList: string[],
    action: 'settings.announcements' | 'settings.announcements_reorder',
    detail: Record<string, unknown>
  ) => {
    setSavingSettings(true);
    try {
      await setDoc(
        doc(db, 'settings', 'announcements'),
        {
          list: nextList,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
      await logAdminAction(user, action, {
        targetCollection: 'settings',
        targetId: 'announcements',
        detail,
      });
    } catch (e) {
      console.error(e);
      onNotify?.('공지 저장에 실패했습니다.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const resetForm = () => {
    setDraft('');
    setEditingIndex(null);
  };

  const handleSubmit = async () => {
    const value = draft.trim();
    if (!value) {
      onNotify?.('빈 공지는 저장할 수 없습니다.', 'error');
      return;
    }

    const next = [...announcements];
    if (editingIndex === null) {
      next.unshift(value);
    } else {
      next[editingIndex] = value;
    }

    await updateAnnouncements(next, 'settings.announcements', {
      mode: editingIndex === null ? 'create' : 'update',
      count: next.length,
    });
    resetForm();
    onNotify?.(editingIndex === null ? '공지를 추가했습니다.' : '공지를 수정했습니다.');
  };

  const moveAnnouncement = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= announcements.length) return;
    const next = [...announcements];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    await updateAnnouncements(next, 'settings.announcements_reorder', {
      from: index,
      to: targetIndex,
    });
    onNotify?.('공지 순서를 변경했습니다.');
  };

  return (
    <div className="admin-content">
      <div className="table-header-actions">
        <div>
          <h3 className="section-title">공지사항 티커 관리</h3>
          <p className="admin-section-description">{helperText}</p>
        </div>
      </div>

      <div ref={composeRef} className="admin-panel">
        <div className="admin-panel-header">
          <span>{isEditing ? '공지 수정' : '새 공지 작성'}</span>
        </div>
        <div className="admin-form-row">
          <textarea
            className="admin-textarea"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="공지 문구를 입력해 주세요."
          />
        </div>
        <div className="admin-panel-actions">
          {isEditing && (
            <button type="button" className="admin-btn dismiss" onClick={resetForm}>
              수정 취소
            </button>
          )}
          <button type="button" className="admin-btn approve" onClick={handleSubmit} disabled={savingSettings}>
            {isEditing ? <PencilLine size={16} /> : <Plus size={16} />}
            {isEditing ? '공지 수정' : '공지 추가'}
          </button>
        </div>
      </div>

      <div className="admin-list">
        {announcements.length === 0 ? (
          <div className="admin-empty">등록된 공지가 없습니다.</div>
        ) : (
          announcements.map((text, idx) => (
            <div key={`${idx}-${text.slice(0, 12)}`} className="admin-list-card">
              <div className="admin-list-main">
                <div className="admin-inline-icon">
                  <GripVertical size={16} />
                </div>
                <div>
                  <div className="admin-list-title">공지 {idx + 1}</div>
                  <div className="admin-list-description">{text}</div>
                </div>
              </div>
              <div className="admin-inline-actions">
                <button type="button" className="admin-btn" onClick={() => moveAnnouncement(idx, -1)} disabled={idx === 0}>
                  위로
                </button>
                <button
                  type="button"
                  className="admin-btn"
                  onClick={() => moveAnnouncement(idx, 1)}
                  disabled={idx === announcements.length - 1}
                >
                  아래로
                </button>
                <button
                  type="button"
                  className="admin-btn"
                  onClick={() => {
                    setEditingIndex(idx);
                    setDraft(text);
                  }}
                >
                  <Save size={16} />
                  수정
                </button>
                <button
                  type="button"
                  className="admin-btn delete"
                  onClick={async () => {
                    const next = announcements.filter((_, i) => i !== idx);
                    await updateAnnouncements(next, 'settings.announcements', {
                      mode: 'delete',
                      removedIndex: idx,
                    });
                    onNotify?.('공지를 삭제했습니다.');
                    if (editingIndex === idx) resetForm();
                  }}
                >
                  <Trash2 size={16} />
                  삭제
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
