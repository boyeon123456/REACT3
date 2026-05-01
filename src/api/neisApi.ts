import axios from 'axios';

// 나이스 API 기본 설정
const NEIS_BASE_URL = 'https://open.neis.go.kr/hub';

interface MealData {
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

/**
 * 키워드로 학교를 검색합니다.
 */
export async function searchSchool(keyword: string): Promise<SchoolInfo[]> {
  const url = `${NEIS_BASE_URL}/schoolInfo`;
  try {
    const response = await axios.get(url, {
      params: {
        Type: 'json',
        pIndex: 1,
        pSize: 10,
        SCHUL_NM: keyword
      }
    });

    const data = response.data;
    if (data.schoolInfo) {
      return data.schoolInfo[1].row.map((item: any) => ({
        schoolName: item.SCHUL_NM,
        schoolCode: item.SD_SCHUL_CODE,
        officeCode: item.ATPT_OFCDC_SC_CODE,
        address: item.ORG_RDNMA
      }));
    }
    return [];
  } catch (error) {
    console.error('학교 검색 중 오류 발생:', error);
    return [];
  }
}

/**
 * 나이스 API를 통해 특정 날짜의 급식 정보를 가져옵니다.
 */
export async function getMealData(
  date: string, 
  officeCode: string, 
  schoolCode: string
): Promise<MealData | null> {
  if (!officeCode || !schoolCode) return null;
  const url = `${NEIS_BASE_URL}/mealServiceDietInfo`;
  
  try {
    const response = await axios.get(url, {
      params: {
        Type: 'json',
        pIndex: 1,
        pSize: 10,
        ATPT_OFCDC_SC_CODE: officeCode,
        SD_SCHUL_CODE: schoolCode,
        MLSV_YMD: date
      }
    });

    const data = response.data;
    
    if (data.mealServiceDietInfo) {
      const meals = data.mealServiceDietInfo[1].row;
      const result: MealData = { breakfast: '', lunch: '', dinner: '' };
      
      meals.forEach((item: any) => {
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
    }
    
    return null;
  } catch (error: any) {
    console.error('나이스 급식 API 호출 중 오류 발생:', error.message);
    return null;
  }
}

/**
 * 이번 주(월~금)의 급식 데이터를 모두 가져옵니다.
 */
export async function getWeeklyMeals(
  officeCode: string, 
  schoolCode: string
): Promise<Record<string, MealData>> {
  if (!officeCode || !schoolCode) return {};
  const days = ['월', '화', '수', '목', '금'];
  const today = new Date();
  const currentDay = today.getDay(); 
  
  const monday = new Date(today);
  const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
  monday.setDate(diff);
  
  const weeklyData: Record<string, MealData> = {};
  
  const promises = [];
  for (let i = 0; i < 5; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const yyyymmdd = date.toISOString().split('T')[0].replace(/-/g, '');
    
    promises.push(
      getMealData(yyyymmdd, officeCode, schoolCode).then(meal => {
        if (meal) weeklyData[days[i]] = meal;
      })
    );
  }
  
  await Promise.all(promises);
  return weeklyData;
}

/**
 * 특정 월의 전체 급식 데이터를 가져옵니다.
 */
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

  const promises = [];
  
  for (let d = 1; d <= lastDay; d++) {
    const paddedDay = String(d).padStart(2, '0');
    const yyyymmdd = `${year}${paddedMonth}${paddedDay}`;
    const formattedDate = `${year}-${paddedMonth}-${paddedDay}`;
    
    promises.push(
      getMealData(yyyymmdd, officeCode, schoolCode).then(meal => {
        if (meal && (meal.breakfast || meal.lunch || meal.dinner)) {
          result[formattedDate] = meal;
        }
      })
    );
  }
  
  await Promise.all(promises);
  return result;
}

/**
 * 특정 날짜의 학급 시간표를 가져옵니다.
 */
export async function getTimetableData(
  date: string, 
  grade: string, 
  className: string,
  officeCode: string,
  schoolCode: string
) {
  if (!officeCode || !schoolCode) return [];
  const url = `${NEIS_BASE_URL}/hisTimetable`;
  try {
    const response = await axios.get(url, {
      params: {
        Type: 'json',
        pIndex: 1,
        pSize: 20,
        ATPT_OFCDC_SC_CODE: officeCode,
        SD_SCHUL_CODE: schoolCode,
        ALL_TI_YMD: date,
        GRADE: grade,
        CLASS_NM: className
      }
    });

    const data = response.data;
    if (data.hisTimetable) {
      return data.hisTimetable[1].row.map((item: any) => ({
        period: item.PERIO,
        subject: item.ITRT_CNTNT
      }));
    }
    return [];
  } catch (err) {
    console.error('Timetable API error:', err);
    return [];
  }
}

/**
 * 이번 주(월~금)의 전체 시간표를 가져옵니다.
 */
export async function getWeeklyTimetable(
  grade: string, 
  className: string,
  officeCode: string,
  schoolCode: string
) {
  if (!grade || !className || !officeCode || !schoolCode) return {};
  
  const days = ['월', '화', '수', '목', '금'];
  const today = new Date();
  const currentDay = today.getDay();
  const monday = new Date(today);
  const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
  monday.setDate(diff);

  const weeklyTimetable: any = {};
  const promises = [];

  for (let i = 0; i < 5; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const yyyymmdd = date.toISOString().split('T')[0].replace(/-/g, '');
    
    promises.push(
      getTimetableData(yyyymmdd, grade, className, officeCode, schoolCode).then(data => {
        weeklyTimetable[days[i]] = data;
      })
    );
  }

  await Promise.all(promises);
  return weeklyTimetable;
}

