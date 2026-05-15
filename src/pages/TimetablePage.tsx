import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, BookOpen, ChevronLeft, ChevronRight, Loader2, RefreshCw, Settings } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { getWeeklyTimetable, type TimetableEntry } from '../api/neisApi';
import { db } from '../firebase';
import { useAuthStore } from '../store/authStore';
import './TimetablePage.css';

type WeeklyTimetable = Record<string, TimetableEntry[]>;
type StoredTimetable = Record<string, Record<number, string>>;
type TimetableSource = 'saved' | 'neis' | null;
type DayScheduleItem = {
  period: number;
  subject: string;
  isEmpty: boolean;
};
type DaySchedule = {
  dayKey: string;
  label: string;
  dateLabel: string;
  items: DayScheduleItem[];
};

const DAY_LABELS = ['월', '화', '수', '목', '금'] as const;
const PERIODS = [1, 2, 3, 4, 5, 6, 7] as const;

function getTodayIndex() {
  const day = new Date().getDay();
  if (day >= 1 && day <= 5) return day - 1;
  return 0;
}

function getCurrentWeekDateLabels() {
  const today = new Date();
  const currentDay = today.getDay();
  const monday = new Date(today);
  const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
  monday.setDate(diff);

  return DAY_LABELS.map((_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  });
}

const WEEK_DATE_LABELS = getCurrentWeekDateLabels();

function createEmptyWeek(): DaySchedule[] {
  return DAY_LABELS.map((day, index) => ({
    dayKey: day,
    label: `${day}요일`,
    dateLabel: WEEK_DATE_LABELS[index],
    items: PERIODS.map((period) => ({
      period,
      subject: '',
      isEmpty: true,
    })),
  }));
}

function hasStoredTimetableData(data: StoredTimetable | null | undefined) {
  if (!data) return false;

  return DAY_LABELS.some((day) =>
    PERIODS.some((period) => {
      const subject = data?.[day]?.[period];
      return typeof subject === 'string' && subject.trim().length > 0;
    })
  );
}

function hasScheduleData(schedules: DaySchedule[]) {
  return schedules.some((day) => day.items.some((item) => !item.isEmpty));
}

function normalizeStoredTimetable(data: StoredTimetable): DaySchedule[] {
  return DAY_LABELS.map((day, index) => ({
    dayKey: day,
    label: `${day}요일`,
    dateLabel: WEEK_DATE_LABELS[index],
    items: PERIODS.map((period) => {
      const subject = data?.[day]?.[period]?.trim() || '';
      return {
        period,
        subject,
        isEmpty: subject.length === 0,
      };
    }),
  }));
}

function normalizeNeisTimetable(data: WeeklyTimetable): DaySchedule[] {
  return DAY_LABELS.map((day, index) => {
    const dayEntries = data?.[day] || [];

    return {
      dayKey: day,
      label: `${day}요일`,
      dateLabel: WEEK_DATE_LABELS[index],
      items: PERIODS.map((period) => {
        const match = dayEntries.find((entry) => Number(entry.period) === period);
        const subject = match?.subject?.trim() || '';
        return {
          period,
          subject,
          isEmpty: subject.length === 0,
        };
      }),
    };
  });
}

export default function TimetablePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [schedules, setSchedules] = useState<DaySchedule[]>(createEmptyWeek);
  const [source, setSource] = useState<TimetableSource>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeDayIndex, setActiveDayIndex] = useState(getTodayIndex);

  const fetchTimetable = useCallback(async () => {
    if (!user?.isStudent || !user?.schoolCode || !user?.grade || !user?.class) {
      setSchedules(createEmptyWeek());
      setSource(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const timetableId = `${user.grade}-${user.class}`;
      const storedSnap = await getDoc(doc(db, 'timetables', timetableId));
      const storedData = storedSnap.exists() ? (storedSnap.data() as StoredTimetable) : null;

      if (hasStoredTimetableData(storedData)) {
        setSchedules(normalizeStoredTimetable(storedData as StoredTimetable));
        setSource('saved');
        return;
      }

      const neisData = await getWeeklyTimetable(user.grade, user.class, user.officeCode || '', user.schoolCode);
      const normalized = normalizeNeisTimetable(neisData);
      setSchedules(normalized);
      setSource(hasScheduleData(normalized) ? 'neis' : null);
    } catch (fetchError) {
      console.error('Failed to fetch timetable:', fetchError);
      setSchedules(createEmptyWeek());
      setSource(null);
      setError('시간표를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }, [user?.class, user?.grade, user?.isStudent, user?.officeCode, user?.schoolCode]);

  useEffect(() => {
    setActiveDayIndex(getTodayIndex());
  }, []);

  useEffect(() => {
    void fetchTimetable();
  }, [fetchTimetable]);

  if (!user?.isStudent) {
    return (
      <div className="timetable-page timetable-empty-page animate-fade-in">
        <div className="timetable-empty-card">
          <div className="timetable-empty-icon">
            <BookOpen size={28} />
          </div>
          <h2>학생 프로필이 필요해요</h2>
          <p>시간표는 학생 프로필을 켠 계정에서만 볼 수 있어요.</p>
          <button type="button" className="timetable-primary-btn" onClick={() => navigate('/mypage/edit-profile')}>
            <Settings size={16} />
            프로필 설정으로 이동
          </button>
        </div>
      </div>
    );
  }

  if (!user.schoolCode || !user.grade || !user.class) {
    return (
      <div className="timetable-page timetable-empty-page animate-fade-in">
        <div className="timetable-empty-card">
          <div className="timetable-empty-icon warning">
            <AlertCircle size={28} />
          </div>
          <h2>학교 정보가 아직 없어요</h2>
          <p>학교, 학년, 반을 설정하면 시간표를 바로 보여드릴게요.</p>
          <button type="button" className="timetable-primary-btn" onClick={() => navigate('/mypage/edit-profile')}>
            <Settings size={16} />
            학교 정보 설정하기
          </button>
        </div>
      </div>
    );
  }

  const activeDay = schedules[activeDayIndex] || schedules[0];
  const hasAnyData = hasScheduleData(schedules);
  const sourceLabel =
    source === 'saved' ? '학교 저장 시간표 기준' : source === 'neis' ? 'NEIS 최신 데이터 기준' : '등록된 시간표 없음';

  return (
    <div className="timetable-page animate-fade-in">
      <div className="timetable-hero">
        <div className="timetable-hero-copy">
          <h1>우리 반 시간표</h1>
          <p>
            <span className="timetable-school-chip">{user.schoolName || '학교 정보'}</span>
            {user.grade}학년 {user.class}반
          </p>
        </div>

        <div className="timetable-hero-actions">
          <span className="timetable-source-chip">{sourceLabel}</span>
          <button type="button" className="timetable-refresh-btn" onClick={() => void fetchTimetable()} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            새로고침
          </button>
        </div>
      </div>

      {error ? (
        <div className="timetable-status-card error">
          <p>{error}</p>
          <button type="button" className="timetable-inline-btn" onClick={() => void fetchTimetable()}>
            다시 시도
          </button>
        </div>
      ) : !loading && !hasAnyData ? (
        <div className="timetable-status-card">
          <p>등록된 시간표가 없어요. 학교 저장 시간표가 없으면 NEIS 데이터도 함께 확인해요.</p>
          <button type="button" className="timetable-inline-btn" onClick={() => void fetchTimetable()}>
            다시 확인
          </button>
        </div>
      ) : (
        <>
          <section className="timetable-mobile-view" aria-label="요일별 시간표">
            <div className="mobile-day-switcher">
              <button
                type="button"
                className="day-nav-btn"
                onClick={() => setActiveDayIndex((prev) => (prev === 0 ? DAY_LABELS.length - 1 : prev - 1))}
                aria-label="이전 요일"
              >
                <ChevronLeft size={18} />
              </button>

              <div className="mobile-day-tabs">
                {schedules.map((day, index) => (
                  <button
                    key={day.dayKey}
                    type="button"
                    className={`mobile-day-tab ${index === activeDayIndex ? 'active' : ''}`}
                    onClick={() => setActiveDayIndex(index)}
                  >
                    {day.dayKey}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="day-nav-btn"
                onClick={() => setActiveDayIndex((prev) => (prev === DAY_LABELS.length - 1 ? 0 : prev + 1))}
                aria-label="다음 요일"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="mobile-day-card">
              <div className="mobile-day-card-header">
                <div className="mobile-day-heading">
                  <strong>{activeDay.label}</strong>
                  <small>{activeDay.dateLabel}</small>
                </div>
                <span>{sourceLabel}</span>
              </div>

              <div className="mobile-period-list">
                {activeDay.items.map((item) => (
                  <div key={`${activeDay.dayKey}-${item.period}`} className={`mobile-period-item ${item.isEmpty ? 'empty' : ''}`}>
                    <span className="mobile-period-badge">{item.period}교시</span>
                    <strong>{item.isEmpty ? '수업 없음' : item.subject}</strong>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="timetable-desktop-view" aria-label="주간 시간표">
            <div className="timetable-desktop-shell">
              <div className="desktop-grid-header">
                <div className="desktop-corner-cell">교시</div>
                {schedules.map((day) => (
                  <div key={day.dayKey} className="desktop-day-cell">
                    <strong>{day.dayKey}</strong>
                    <small>{day.dateLabel}</small>
                  </div>
                ))}
              </div>

              <div className="desktop-grid-body">
                {PERIODS.map((period) => (
                  <div key={period} className="desktop-period-row">
                    <div className="desktop-period-label">{period}</div>
                    {schedules.map((day) => {
                      const item = day.items.find((entry) => entry.period === period);
                      const isEmpty = item?.isEmpty ?? true;

                      return (
                        <div key={`${day.dayKey}-${period}`} className={`desktop-subject-cell ${isEmpty ? 'empty' : ''}`}>
                          <span>{isEmpty ? '-' : item?.subject}</span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      <div className="timetable-footnote">
        <p>학교 저장 시간표가 있으면 우선 표시하고, 없을 때만 NEIS 데이터를 사용해요.</p>
      </div>
    </div>
  );
}
