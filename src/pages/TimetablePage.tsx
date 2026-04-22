import { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, BookOpen, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import './TimetablePage.css';



export default function TimetablePage() {
  const { user } = useAuthStore();
  const [timetable, setTimetable] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const days = ['월', '화', '수', '목', '금'];
  const periods = [1, 2, 3, 4, 5, 6, 7];

  useEffect(() => {
    if (!user?.grade || !user?.class) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = onSnapshot(doc(db, 'timetables', `${user.grade}-${user.class}`), 
      (snap) => {
        if (snap.exists()) {
          setTimetable(snap.data());
        } else {
          setTimetable({});
        }
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError('시간표를 불러오는 중 오류가 발생했습니다.');
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user?.grade, user?.class]);


  if (!user?.grade || !user?.class) {
    return (
      <div className="timetable-page empty">
        <div className="empty-state">
          <AlertCircle size={48} />
          <h2>학년/반 정보가 없습니다.</h2>
          <p>마이페이지에서 학년과 반 정보를 먼저 설정해주세요!</p>
          <button className="go-mypage" onClick={() => window.location.href='/mypage'}>설정하러 가기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="timetable-page animate-fade-in">
      <div className="timetable-header">
        <div className="title-area">
          <h1>🗓️ 학급 시간표</h1>
          <p className="subtitle">{user.grade}학년 {user.class}반의 주간 시간표입니다.</p>
        </div>
        <div className="info-badge">
          <BookOpen size={16} /> <span>이번 주 수업</span>
        </div>
      </div>

      <div className="timetable-container glass-panel">
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
                    <span className="p-time">{p + 8}:10</span>
                </div>
                {days.map(day => {
                  const subject = timetable[day]?.[p] || '-';
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
        
        {loading && (
          <div className="timetable-overlay">
            <div className="spinner"></div>
            <p>시간표를 가져오는 중...</p>
          </div>
        )}
      </div>

      <div className="timetable-footer">
        <p>※ 관리자가 직접 작성한 수동 시간표 정보입니다.</p>
      </div>

    </div>
  );
}
