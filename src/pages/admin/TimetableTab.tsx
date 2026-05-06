import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { logAdminAction } from '../../lib/adminAudit';
import { useAuthStore } from '../../store/authStore';

const days = ['월', '화', '수', '목', '금'];
const periods = [1, 2, 3, 4, 5, 6, 7];

export default function TimetableTab() {
  const { user } = useAuthStore();
  const [ttGrade, setTtGrade] = useState('1');
  const [ttClass, setTtClass] = useState('1');
  const [ttData, setTtData] = useState<Record<string, Record<number, string>> | null>(null);
  const [ttSaving, setTtSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'timetables', `${ttGrade}-${ttClass}`), (snap) => {
      if (snap.exists()) {
        setTtData(snap.data() as Record<string, Record<number, string>>);
      } else {
        const emptyData: Record<string, Record<number, string>> = {};
        days.forEach((d) => {
          emptyData[d] = {};
          periods.forEach((p) => {
            emptyData[d][p] = '';
          });
        });
        setTtData(emptyData);
      }
    });
    return () => unsub();
  }, [ttGrade, ttClass]);

  const handleTtChange = (day: string, period: number, value: string) => {
    const newData = { ...ttData } as Record<string, Record<number, string>>;
    if (!newData[day]) newData[day] = {};
    newData[day][period] = value;
    setTtData(newData);
  };

  const saveTimetable = async () => {
    setTtSaving(true);
    try {
      const cleanData: Record<string, Record<number, string>> = {};
      days.forEach((d) => {
        cleanData[d] = {};
        periods.forEach((p) => {
          cleanData[d][p] = ttData?.[d]?.[p] || '';
        });
      });

      await setDoc(doc(db, 'timetables', `${ttGrade}-${ttClass}`), cleanData, { merge: true });
      await logAdminAction(user, 'timetable.save', {
        targetCollection: 'timetables',
        targetId: `${ttGrade}-${ttClass}`,
      });
      alert('시간표가 저장되었습니다.');
    } catch (e) {
      console.error(e);
      alert('시간표 저장 실패');
    } finally {
      setTtSaving(false);
    }
  };

  return (
    <div className="admin-content">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <h3 className="section-title">🗓️ 학급 시간표 편집기</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            value={ttGrade}
            onChange={(e) => setTtGrade(e.target.value)}
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: '1px solid var(--border-light)',
              background: 'var(--bg-main)',
              color: 'var(--text-main)',
            }}
          >
            <option value="1">1학년</option>
            <option value="2">2학년</option>
            <option value="3">3학년</option>
          </select>
          <select
            value={ttClass}
            onChange={(e) => setTtClass(e.target.value)}
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: '1px solid var(--border-light)',
              background: 'var(--bg-main)',
              color: 'var(--text-main)',
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={String(n)}>
                {n}반
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid var(--border-light)',
          }}
        >
          <thead>
            <tr style={{ background: 'var(--bg-main)' }}>
              <th style={{ padding: '12px', border: '1px solid var(--border-light)', width: '60px' }}>
                교시
              </th>
              {days.map((d) => (
                <th key={d} style={{ padding: '12px', border: '1px solid var(--border-light)' }}>
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p}>
                <td
                  style={{
                    padding: '12px',
                    border: '1px solid var(--border-light)',
                    textAlign: 'center',
                    fontWeight: 800,
                    background: 'var(--bg-main)',
                  }}
                >
                  {p}
                </td>
                {days.map((d) => (
                  <td key={d} style={{ padding: '0', border: '1px solid var(--border-light)' }}>
                    <input
                      type="text"
                      value={ttData?.[d]?.[p] || ''}
                      onChange={(e) => handleTtChange(d, p, e.target.value)}
                      placeholder="-"
                      style={{
                        width: '100%',
                        border: 'none',
                        padding: '12px',
                        background: 'transparent',
                        textAlign: 'center',
                        fontSize: '14px',
                        color: 'var(--text-main)',
                      }}
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
          type="button"
          className="admin-btn approve"
          onClick={saveTimetable}
          disabled={ttSaving}
          style={{ padding: '12px 32px', fontSize: '15px' }}
        >
          {ttSaving ? '저장 중...' : '시간표 일괄 저장'}
        </button>
      </div>
    </div>
  );
}
