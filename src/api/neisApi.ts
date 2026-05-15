import axios from 'axios';

const NEIS_BASE_URL = 'https://open.neis.go.kr/hub';
const WEEKDAY_KEYS = ['월', '화', '수', '목', '금'] as const;

export interface MealData {
  breakfast: string;
  lunch: string;
  dinner: string;
}

export interface SchoolInfo {
  schoolName: string;
  schoolCode: string;
  officeCode: string;
  address: string;
}

export interface TimetableEntry {
  period: string;
  subject: string;
}

type NeisSchoolRow = {
  SCHUL_NM: string;
  SD_SCHUL_CODE: string;
  ATPT_OFCDC_SC_CODE: string;
  ORG_RDNMA: string;
};

type NeisMealRow = {
  DDISH_NM: string;
  MMEAL_SC_NM: string;
};

type NeisTimetableRow = {
  PERIO: string;
  ITRT_CNTNT: string;
};

type NeisApiBlock<T> = [{ head?: unknown }, { row: T[] }];

type SchoolSearchResponse = {
  schoolInfo?: NeisApiBlock<NeisSchoolRow>;
};

type MealResponse = {
  mealServiceDietInfo?: NeisApiBlock<NeisMealRow>;
};

type TimetableResponse = {
  hisTimetable?: NeisApiBlock<NeisTimetableRow>;
};

export async function searchSchool(keyword: string): Promise<SchoolInfo[]> {
  const url = `${NEIS_BASE_URL}/schoolInfo`;

  try {
    const response = await axios.get<SchoolSearchResponse>(url, {
      params: {
        Type: 'json',
        pIndex: 1,
        pSize: 10,
        SCHUL_NM: keyword,
      },
    });

    const rows = response.data.schoolInfo?.[1]?.row ?? [];
    return rows.map((item) => ({
      schoolName: item.SCHUL_NM,
      schoolCode: item.SD_SCHUL_CODE,
      officeCode: item.ATPT_OFCDC_SC_CODE,
      address: item.ORG_RDNMA,
    }));
  } catch (error) {
    console.error('School search error:', error);
    return [];
  }
}

export async function getMealData(
  date: string,
  officeCode: string,
  schoolCode: string
): Promise<MealData | null> {
  if (!officeCode || !schoolCode) return null;

  const url = `${NEIS_BASE_URL}/mealServiceDietInfo`;

  try {
    const response = await axios.get<MealResponse>(url, {
      params: {
        Type: 'json',
        pIndex: 1,
        pSize: 10,
        ATPT_OFCDC_SC_CODE: officeCode,
        SD_SCHUL_CODE: schoolCode,
        MLSV_YMD: date,
      },
    });

    const meals = response.data.mealServiceDietInfo?.[1]?.row ?? [];
    if (meals.length === 0) return null;

    const result: MealData = { breakfast: '', lunch: '', dinner: '' };

    meals.forEach((item) => {
      const menu = item.DDISH_NM.replace(/<br\/>/g, ', ').replace(/\([0-9.]+\)/g, '');

      if (item.MMEAL_SC_NM === '조식') {
        result.breakfast = menu;
      } else if (item.MMEAL_SC_NM === '중식') {
        result.lunch = menu;
      } else if (item.MMEAL_SC_NM === '석식') {
        result.dinner = menu;
      }
    });

    return result;
  } catch (error) {
    console.error('Meal API error:', error);
    return null;
  }
}

export async function getWeeklyMeals(
  officeCode: string,
  schoolCode: string
): Promise<Record<string, MealData>> {
  if (!officeCode || !schoolCode) return {};

  const today = new Date();
  const currentDay = today.getDay();
  const monday = new Date(today);
  const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
  monday.setDate(diff);

  const weeklyData: Record<string, MealData> = {};
  const promises: Promise<void>[] = [];

  for (let i = 0; i < 5; i += 1) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const yyyymmdd = date.toISOString().split('T')[0].replace(/-/g, '');

    promises.push(
      getMealData(yyyymmdd, officeCode, schoolCode).then((meal) => {
        if (meal) weeklyData[WEEKDAY_KEYS[i]] = meal;
      })
    );
  }

  await Promise.all(promises);
  return weeklyData;
}

export async function getMonthlyMeals(
  year: number,
  month: number,
  officeCode: string,
  schoolCode: string
): Promise<Record<string, MealData>> {
  if (!officeCode || !schoolCode) return {};

  const lastDay = new Date(year, month, 0).getDate();
  const paddedMonth = String(month).padStart(2, '0');
  const result: Record<string, MealData> = {};
  const promises: Promise<void>[] = [];

  for (let day = 1; day <= lastDay; day += 1) {
    const paddedDay = String(day).padStart(2, '0');
    const yyyymmdd = `${year}${paddedMonth}${paddedDay}`;
    const formattedDate = `${year}-${paddedMonth}-${paddedDay}`;

    promises.push(
      getMealData(yyyymmdd, officeCode, schoolCode).then((meal) => {
        if (meal && (meal.breakfast || meal.lunch || meal.dinner)) {
          result[formattedDate] = meal;
        }
      })
    );
  }

  await Promise.all(promises);
  return result;
}

export async function getTimetableData(
  date: string,
  grade: string,
  className: string,
  officeCode: string,
  schoolCode: string
): Promise<TimetableEntry[]> {
  if (!officeCode || !schoolCode) return [];

  const url = `${NEIS_BASE_URL}/hisTimetable`;

  try {
    const response = await axios.get<TimetableResponse>(url, {
      params: {
        Type: 'json',
        pIndex: 1,
        pSize: 20,
        ATPT_OFCDC_SC_CODE: officeCode,
        SD_SCHUL_CODE: schoolCode,
        ALL_TI_YMD: date,
        GRADE: grade,
        CLASS_NM: className,
      },
    });

    const rows = response.data.hisTimetable?.[1]?.row ?? [];
    return rows.map((item) => ({
      period: item.PERIO,
      subject: item.ITRT_CNTNT,
    }));
  } catch (error) {
    console.error('Timetable API error:', error);
    return [];
  }
}

export async function getWeeklyTimetable(
  grade: string,
  className: string,
  officeCode: string,
  schoolCode: string
): Promise<Record<string, TimetableEntry[]>> {
  if (!grade || !className || !officeCode || !schoolCode) return {};

  const today = new Date();
  const currentDay = today.getDay();
  const monday = new Date(today);
  const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
  monday.setDate(diff);

  const weeklyTimetable: Record<string, TimetableEntry[]> = {};
  const promises: Promise<void>[] = [];

  for (let i = 0; i < 5; i += 1) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const yyyymmdd = date.toISOString().split('T')[0].replace(/-/g, '');

    promises.push(
      getTimetableData(yyyymmdd, grade, className, officeCode, schoolCode).then((data) => {
        weeklyTimetable[WEEKDAY_KEYS[i]] = data;
      })
    );
  }

  await Promise.all(promises);
  return weeklyTimetable;
}
