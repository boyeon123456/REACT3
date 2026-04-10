import { useEffect, useState } from 'react';
import { Clock, Sunset, Sunrise, ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';
import { getMonthlyMeals } from '../api/neisApi';
import './MealPage.css';

export default function MealPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [meals, setMeals] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1 ~ 12
  const today = new Date();
  
  const formatDateStr = (y: number, m: number, d: number) => {
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  useEffect(() => {
    setLoading(true);
    getMonthlyMeals(year, month)
      .then(data => {
        setMeals(data || {});
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [year, month]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  // Calendar logic
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0 (Sun) to 6 (Sat)
  const daysInMonth = new Date(year, month, 0).getDate();
  
  const calendarCells = [];
  
  for (let i = 0; i < firstDay; i++) {
    calendarCells.push(<div key={`empty-${i}`} className="calendar-cell empty"></div>);
  }
  
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month - 1, d);
    const dayOfWeek = dateObj.getDay();
    const dateStr = formatDateStr(year, month, d);
    const isToday = dateStr === formatDateStr(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const isSelected = dateStr === selectedDateStr;
    const hasMeal = meals[dateStr] && (meals[dateStr].breakfast || meals[dateStr].lunch || meals[dateStr].dinner);

    let dayClass = '';
    if (dayOfWeek === 0) dayClass = 'sun';
    if (dayOfWeek === 6) dayClass = 'sat';

    calendarCells.push(
      <div 
        key={dateStr} 
        className={`calendar-cell ${dayClass} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
        onClick={() => setSelectedDateStr(dateStr)}
      >
        <span className="day-number">{d}</span>
        {hasMeal ? <div className="meal-marker"></div> : null}
      </div>
    );
  }

  const closeModal = () => setSelectedDateStr(null);
  const selectedMeal = selectedDateStr ? meals[selectedDateStr] : null;
  const selectedDayOfWeek = selectedDateStr ? new Date(selectedDateStr).getDay() : null;
  const isWeekend = selectedDayOfWeek === 0 || selectedDayOfWeek === 6;

  return (
    <div className="meal-page animate-fade-in">
      <div className="meal-header">
        <h1>🍱 월간 급식 달력</h1>
        <p>확인하고 싶은 날짜를 눌러 식단을 확인하세요!</p>
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
        
        <div className="calendar-grid">
          {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
            <div key={d} className={`cal-weekday ${i === 0 ? 'sun' : ''} ${i === 6 ? 'sat' : ''}`}>
              {d}
            </div>
          ))}
          {calendarCells}
        </div>
        
        {loading && <div className="calendar-loading">식단 데이터를 불러오는 중입니다...</div>}
      </div>

      {/* Modal Overlay */}
      {selectedDateStr && (
        <div className="meal-modal-overlay" onClick={closeModal}>
          <div className="meal-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="meal-modal-header">
              <span className="meal-modal-title">
                {selectedDateStr} 식단
                {selectedDateStr === formatDateStr(today.getFullYear(), today.getMonth() + 1, today.getDate()) && 
                  <span className="today-badge" style={{fontSize: '12px', background: 'var(--primary)', padding: '4px 10px', borderRadius: '12px', marginLeft: '12px', color: 'white'}}>TODAY</span>
                }
              </span>
              <button className="modal-close-btn" onClick={closeModal}>
                <X size={24} />
              </button>
            </div>
            
            <div className="meal-modal-body">
              {isWeekend ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#888', fontSize: '18px', fontWeight: 'bold' }}>
                  급식이 제공되지 않습니다.
                </div>
              ) : (!selectedMeal || (!selectedMeal.breakfast && !selectedMeal.lunch && !selectedMeal.dinner)) ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#888', fontSize: '18px' }}>
                  이 날은 등록된 급식 정보가 없습니다.
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
                          {selectedMeal.breakfast.split(', ').map((item: string, i: number) => (
                            <div key={i}>{item}</div>
                          ))}
                        </div>
                      </div>
                      <div className="meal-divider"></div>
                    </>
                  )}
                  
                  {selectedMeal.lunch && (
                    <>
                      <div className="meal-section">
                        <div className="meal-type">
                          <Clock size={20} /> <span>중식</span>
                        </div>
                        <div className="menu-text">
                          {selectedMeal.lunch.split(', ').map((item: string, i: number) => (
                            <div key={i}>{item}</div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {selectedMeal.lunch && selectedMeal.dinner && <div className="meal-divider"></div>}

                  {selectedMeal.dinner && (
                    <div className="meal-section">
                      <div className="meal-type dinner">
                        <Sunset size={20} /> <span>석식</span>
                      </div>
                      <div className="menu-text">
                        {selectedMeal.dinner.split(', ').map((item: string, i: number) => (
                          <div key={i}>{item}</div>
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
