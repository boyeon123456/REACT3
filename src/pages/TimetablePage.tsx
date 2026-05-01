import { useState, useEffect, useCallback } from 'react';
import { BookOpen, AlertCircle, Settings, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { getWeeklyTimetable } from '../api/neisApi';
import './TimetablePage.css';

export default function TimetablePage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [timetable, setTimetable] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);

  const days = ['월', '화', '수', '목', '금'];
  const periods = [1, 2, 3, 4, 5, 6, 7];

  const fetchTimetable = useCallback(async () => {
    if (!user?.isStudent || !user?.schoolCode || !user?.grade || !user?.class) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getWeeklyTimetable(
        user.grade, 
        user.class, 
        user.officeCode || '', 
        user.schoolCode
      );
      setTimetable(data);
    } catch (err) {
      console.error('Failed to fetch timetable:', err);
      setError('시간표를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [user?.isStudent, user?.schoolCode, user?.officeCode, user?.grade, user?.class]);

  useEffect(() => {
    fetchTimetable();
  }, [fetchTimetable]);

  // Case 1: Not a student
  if (!user?.isStudent) {
    return (
      <div className="timetable-page empty">
        <div className="empty-state animate-fade-in">
          <div className="icon-circle">
            <BookOpen size={48} />
          </div>
          <h2>학생 전용 기능입니다</h2>
          <p>시간표 서비스는 학생 유저에게만 제공됩니다.<br/>프로필에서 '학생 여부'를 확인해 주세요!</p>
          <button className="go-mypage" onClick={() => window.location.href='/mypage'}>
            프로필 설정으로 이동
          </button>
        </div>
      </div>
    );
  }

  // Case 2: Student but school not set
  if (!user?.schoolCode || !user?.grade || !user?.class) {
    return (
      <div className="timetable-page empty">
        <div className="empty-state animate-fade-in">
          <div className="icon-circle warning">
            <AlertCircle size={48} />
          </div>
          <h2>학교 정보가 부족합니다</h2>
          <p>전국 실시간 시간표를 확인하려면<br/>학교, 학년, 반 정보를 모두 등록해야 합니다.</p>
          <button className="go-mypage" onClick={() => window.location.href='/mypage'}>
            <Settings size={16} /> 학교 정보 설정하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="timetable-page animate-fade-in">
      <div className="timetable-header">
        <div className="title-area">
          <h1>🗓️ 실시간 학급 시간표</h1>
          <p className="subtitle">
            <span className="school-badge">{user.schoolName}</span> {user.grade}학년 {user.class}반 시간표입니다.
          </p>
        </div>
        <button className="refresh-btn" onClick={fetchTimetable} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" size={16} /> : <BookOpen size={16} />}
          <span>동기화</span>
        </button>
      </div>

      <div className="timetable-container glass-panel">
        {error ? (
          <div className="error-container">
            <p>{error}</p>
            <button onClick={fetchTimetable}>다시 시도</button>
          </div>
        ) : (
          <div className="timetable-grid">
            <div className="grid-header">
              <div className="period-label">교시</div>
              {days.map(day => (
                <div key={day} className="day-label">{day}</div>
              ))}
            </div>

            <div className="grid-body">
              {periods.map(p => (
                <div key={p} className="period-row">
                  <div className="period-num">
                    <span className="p-num">{p}</span>
                  </div>
                  {days.map(day => {
                    const daySchedule = timetable[day] || [];
                    const item = daySchedule.find((s: any) => parseInt(s.period) === p);
                    const subject = item ? item.subject : '-';
                    
                    return (
                      <div key={`${day}-${p}`} className={`subject-cell ${subject === '-' ? 'empty' : ''}`}>
                        <span className="subject-name">{subject}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {loading && (
          <div className="timetable-overlay">
            <div className="spinner"></div>
            <p>실시간 데이터를 가져오는 중...</p>
          </div>
        )}
      </div>

      <div className="timetable-footer">
        <p>※ 나이스(NEIS) 교육정보 개방포털의 실시간 데이터를 기반으로 제공됩니다.</p>
      </div>

    </div>
  );
}
