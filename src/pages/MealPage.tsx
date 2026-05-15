import { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, School, Sunrise, Sunset, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getMonthlyMeals, type MealData } from '../api/neisApi';
import { useAuthStore } from '../store/authStore';
import './MealPage.css';

type MealsByDate = Record<string, MealData>;

function formatDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseDateStr(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export default function MealPage() {
  const { user } = useAuthStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [meals, setMeals] = useState<MealsByDate>({});
  const [loading, setLoading] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const today = new Date();

  const syncSelectedDate = (nextDate: Date) => {
    setCurrentDate(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
    setSelectedDateStr(formatDateStr(nextDate.getFullYear(), nextDate.getMonth() + 1, nextDate.getDate()));
  };

  useEffect(() => {
    if (!user?.isStudent || !user?.schoolCode) return undefined;

    let cancelled = false;

    const loadMeals = async () => {
      setLoading(true);

      try {
        const data = await getMonthlyMeals(year, month, user.officeCode || '', user.schoolCode || '');
        if (!cancelled) {
          setMeals(data || {});
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadMeals();

    return () => {
      cancelled = true;
    };
  }, [month, user?.isStudent, user?.officeCode, user?.schoolCode, year]);

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 2, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month, 1));

  const handleMoveSelectedDate = (offset: number) => {
    const baseDate = selectedDateStr ? parseDateStr(selectedDateStr) : today;
    const nextDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + offset);
    syncSelectedDate(nextDate);
  };

  const handleGoToToday = () => {
    syncSelectedDate(today);
  };

  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const calendarCells: React.JSX.Element[] = [];

  for (let i = 0; i < firstDay; i += 1) {
    calendarCells.push(<div key={`empty-${i}`} className="calendar-cell empty" />);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay();
    const dateStr = formatDateStr(year, month, day);
    const isToday = dateStr === formatDateStr(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const isSelected = dateStr === selectedDateStr;
    const hasMeal = Boolean(meals[dateStr] && (meals[dateStr].breakfast || meals[dateStr].lunch || meals[dateStr].dinner));

    let dayClass = '';
    if (dayOfWeek === 0) dayClass = 'sun';
    if (dayOfWeek === 6) dayClass = 'sat';

    calendarCells.push(
      <div
        key={dateStr}
        className={`calendar-cell ${dayClass} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
        onClick={() => setSelectedDateStr(dateStr)}
      >
        <span className="day-number">{day}</span>
        {hasMeal ? <div className="meal-marker" /> : null}
      </div>
    );
  }

  const closeModal = () => setSelectedDateStr(null);
  const selectedMeal = selectedDateStr ? meals[selectedDateStr] : null;
  const selectedDayOfWeek = selectedDateStr ? new Date(selectedDateStr).getDay() : null;
  const isWeekend = selectedDayOfWeek === 0 || selectedDayOfWeek === 6;

  if (!user?.isStudent || !user?.schoolCode) {
    return (
      <div className="meal-page animate-fade-in">
        <div className="meal-header" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <School size={64} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <h1 style={{ marginBottom: '10px' }}>
            {!user?.isStudent ? '학생 전용 기능입니다.' : '학교 정보를 먼저 등록해 주세요.'}
          </h1>
          <p style={{ opacity: 0.6, marginBottom: '24px' }}>
            {!user?.isStudent
              ? '급식 정보는 학생 사용자에게만 제공됩니다.'
              : '마이페이지에서 학교 정보를 연결하면 월별 급식표를 바로 확인할 수 있어요.'}
          </p>
          <Link
            to="/mypage"
            style={{
              display: 'inline-block',
              padding: '12px 28px',
              borderRadius: '12px',
              background: 'var(--primary)',
              color: '#fff',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            마이페이지로 이동
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="meal-page animate-fade-in">
      <div className="meal-header">
        <h1>{user.schoolName} 월간 급식표</h1>
        <p>날짜를 눌러 해당 일자의 급식 정보를 확인해 보세요.</p>
      </div>

      <div className="calendar-container">
        <div className="calendar-header">
          <button onClick={handlePrevMonth} className="cal-nav-btn"><ChevronLeft size={28} /></button>
          <div className="cal-title">
            <CalendarIcon size={28} className="text-primary" />
            <span>{year}년 {month}월</span>
          </div>
          <button onClick={handleNextMonth} className="cal-nav-btn"><ChevronRight size={28} /></button>
        </div>

        <div className="meal-date-controls">
          <button type="button" className="meal-date-btn" onClick={() => handleMoveSelectedDate(-1)}>
            이전 날
          </button>
          <button type="button" className="meal-date-btn meal-date-btn-today" onClick={handleGoToToday}>
            오늘
          </button>
          <button type="button" className="meal-date-btn" onClick={() => handleMoveSelectedDate(1)}>
            다음 날
          </button>
        </div>

        <div className="calendar-grid">
          {['일', '월', '화', '수', '목', '금', '토'].map((label, index) => (
            <div key={label} className={`cal-weekday ${index === 0 ? 'sun' : ''} ${index === 6 ? 'sat' : ''}`}>
              {label}
            </div>
          ))}
          {calendarCells}
        </div>

        {loading && <div className="calendar-loading">급식 데이터를 불러오는 중입니다...</div>}
      </div>

      {selectedDateStr && (
        <div className="meal-modal-overlay" onClick={closeModal}>
          <div className="meal-modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="meal-modal-header">
              <span className="meal-modal-title">
                {selectedDateStr} 급식
                {selectedDateStr === formatDateStr(today.getFullYear(), today.getMonth() + 1, today.getDate()) && (
                  <span
                    className="today-badge"
                    style={{
                      fontSize: '12px',
                      background: 'var(--primary)',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      marginLeft: '12px',
                      color: 'white',
                    }}
                  >
                    TODAY
                  </span>
                )}
              </span>
              <button type="button" className="modal-close-btn" onClick={closeModal} aria-label="닫기">
                <X size={24} />
              </button>
            </div>

            <div className="meal-modal-body">
              {isWeekend ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#888', fontSize: '18px', fontWeight: 'bold' }}>
                  주말에는 급식이 제공되지 않습니다.
                </div>
              ) : !selectedMeal || (!selectedMeal.breakfast && !selectedMeal.lunch && !selectedMeal.dinner) ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#888', fontSize: '18px' }}>
                  등록된 급식 정보가 없습니다.
                </div>
              ) : (
                <>
                  {selectedMeal.breakfast && (
                    <>
                      <div className="meal-section">
                        <div className="meal-type breakfast">
                          <Sunrise size={20} /> <span>조식</span>
                        </div>
                        <div className="menu-text">
                          {selectedMeal.breakfast.split(', ').map((item, index) => (
                            <div key={`${item}-${index}`}>{item}</div>
                          ))}
                        </div>
                      </div>
                      <div className="meal-divider" />
                    </>
                  )}

                  {selectedMeal.lunch && (
                    <div className="meal-section">
                      <div className="meal-type">
                        <Clock size={20} /> <span>중식</span>
                      </div>
                      <div className="menu-text">
                        {selectedMeal.lunch.split(', ').map((item, index) => (
                          <div key={`${item}-${index}`}>{item}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedMeal.lunch && selectedMeal.dinner && <div className="meal-divider" />}

                  {selectedMeal.dinner && (
                    <div className="meal-section">
                      <div className="meal-type dinner">
                        <Sunset size={20} /> <span>석식</span>
                      </div>
                      <div className="menu-text">
                        {selectedMeal.dinner.split(', ').map((item, index) => (
                          <div key={`${item}-${index}`}>{item}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
