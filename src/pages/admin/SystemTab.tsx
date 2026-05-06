import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { logAdminAction } from '../../lib/adminAudit';
import { useAuthStore } from '../../store/authStore';

export default function SystemTab() {
  const { user } = useAuthStore();
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [newAnnounce, setNewAnnounce] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', 'announcements'),
      (snap) => {
        if (snap.exists()) {
          setAnnouncements(snap.data().list || []);
        }
      },
      (err) => console.error('Announcements sync error:', err)
    );
    return () => unsub();
  }, []);

  const updateAnnouncements = async (newList: string[]) => {
    setSavingSettings(true);
    try {
      await setDoc(
        doc(db, 'settings', 'announcements'),
        {
          list: newList,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
      await logAdminAction(user, 'settings.announcements', {
        targetCollection: 'settings',
        targetId: 'announcements',
        detail: { count: newList.length },
      });
    } catch (e) {
      console.error(e);
      alert('업데이트 실패');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="admin-content">
      <h3 className="section-title" style={{ marginBottom: '24px' }}>
        📢 공지사항(Ticker) 관리
      </h3>

      <div style={{ marginBottom: '24px', display: 'flex', gap: '8px' }}>
        <input
          type="text"
          placeholder="새로운 공지 내용을 입력하세요..."
          value={newAnnounce}
          onChange={(e) => setNewAnnounce(e.target.value)}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '12px',
            border: '1px solid var(--border-light)',
            background: 'var(--bg-main)',
            color: 'var(--text-main)',
          }}
        />
        <button
          type="button"
          onClick={() => {
            if (!newAnnounce.trim()) return;
            updateAnnouncements([...announcements, newAnnounce.trim()]);
            setNewAnnounce('');
          }}
          disabled={savingSettings}
          style={{
            padding: '0 24px',
            background: 'var(--primary)',
            color: 'white',
            fontWeight: 800,
            borderRadius: '12px',
            opacity: savingSettings ? 0.7 : 1,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          추가
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {announcements.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            등록된 공지가 없습니다.
          </div>
        ) : (
          announcements.map((text, idx) => (
            <div
              key={`${idx}-${text.slice(0, 12)}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 18px',
                background: 'var(--bg-main)',
                border: '1px solid var(--border-light)',
                borderRadius: '12px',
              }}
            >
              <div style={{ flex: 1, fontSize: '15px', fontWeight: 500 }}>{text}</div>
              <button
                type="button"
                onClick={() => updateAnnouncements(announcements.filter((_, i) => i !== idx))}
                style={{
                  color: '#FF4757',
                  padding: '6px',
                  background: 'rgba(255, 71, 87, 0.05)',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
