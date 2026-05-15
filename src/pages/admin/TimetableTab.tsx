import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Save } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { logAdminAction } from '../../lib/adminAudit';
import { useAuthStore } from '../../store/authStore';
import type { AdminNotify } from '../../hooks/useAdminToast';

const days = ['월', '화', '수', '목', '금'];
const periods = [1, 2, 3, 4, 5, 6, 7];

type Props = {
  onNotify?: AdminNotify;
};

function createEmptyTimetable() {
  const emptyData: Record<string, Record<number, string>> = {};
  days.forEach((day) => {
    emptyData[day] = {};
    periods.forEach((period) => {
      emptyData[day][period] = '';
    });
  });
  return emptyData;
}

export default function TimetableTab({ onNotify }: Props) {
  const { user } = useAuthStore();
  const [ttGrade, setTtGrade] = useState('1');
  const [ttClass, setTtClass] = useState('1');
  const [ttData, setTtData] = useState<Record<string, Record<number, string>>>(createEmptyTimetable);
  const [savedData, setSavedData] = useState<Record<string, Record<number, string>>>(createEmptyTimetable);
  const [ttSaving, setTtSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(doc(db, 'timetables', `${ttGrade}-${ttClass}`), (snap) => {
      const next = snap.exists() ? (snap.data() as Record<string, Record<number, string>>) : createEmptyTimetable();
      setTtData(next);
      setSavedData(next);
      setLoading(false);
    });
    return () => unsub();
  }, [ttGrade, ttClass]);

  const isDirty = useMemo(() => JSON.stringify(ttData) !== JSON.stringify(savedData), [savedData, ttData]);

  const handleTtChange = (day: string, period: number, value: string) => {
    setTtData((prev) => ({
      ...prev,
      [day]: {
        ...(prev[day] ?? {}),
        [period]: value,
      },
    }));
  };

  const saveTimetable = async () => {
    setTtSaving(true);
    try {
      const cleanData: Record<string, Record<number, string>> = {};
      days.forEach((day) => {
        cleanData[day] = {};
        periods.forEach((period) => {
          cleanData[day][period] = ttData?.[day]?.[period] || '';
        });
      });

      await setDoc(doc(db, 'timetables', `${ttGrade}-${ttClass}`), cleanData, { merge: true });
      await logAdminAction(user, 'timetable.save', {
        targetCollection: 'timetables',
        targetId: `${ttGrade}-${ttClass}`,
      });
      setSavedData(cleanData);
      onNotify?.('시간표를 저장했습니다.');
    } catch (e) {
      console.error(e);
      onNotify?.('시간표 저장에 실패했습니다.', 'error');
    } finally {
      setTtSaving(false);
    }
  };

  return (
    <div className="admin-content">
      <div className="table-header-actions">
        <div>
          <h3 className="section-title">시간표 관리</h3>
          <p className="admin-section-description">학년과 반을 선택해 시간표를 바로 수정할 수 있습니다.</p>
        </div>
        <div className="admin-toolbar compact">
          <select value={ttGrade} onChange={(e) => setTtGrade(e.target.value)} className="admin-select">
            <option value="1">1학년</option>
            <option value="2">2학년</option>
            <option value="3">3학년</option>
          </select>
          <select value={ttClass} onChange={(e) => setTtClass(e.target.value)} className="admin-select">
            {Array.from({ length: 10 }, (_, idx) => idx + 1).map((num) => (
              <option key={num} value={String(num)}>
                {num}반
              </option>
            ))}
          </select>
          <button type="button" className="admin-btn approve" onClick={saveTimetable} disabled={!isDirty || ttSaving}>
            <Save size={16} />
            {ttSaving ? '저장 중' : '저장'}
          </button>
        </div>
      </div>

      <div className="admin-status-inline">
        <CalendarDays size={16} />
        {loading ? '시간표를 불러오는 중입니다.' : isDirty ? '저장되지 않은 변경 사항이 있습니다.' : '저장된 최신 시간표입니다.'}
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table admin-timetable">
          <thead>
            <tr>
              <th>교시</th>
              {days.map((day) => (
                <th key={day}>{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((period) => (
              <tr key={period}>
                <td>{period}교시</td>
                {days.map((day) => (
                  <td key={day}>
                    <input
                      className="admin-cell-input"
                      type="text"
                      value={ttData?.[day]?.[period] || ''}
                      onChange={(e) => handleTtChange(day, period, e.target.value)}
                      placeholder="-"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
