import axios from 'axios';

// 학교 정보 (예시: 옥종고등학교)
const SCHOOL_CONFIG = {
  ATPT_OFCDC_SC_CODE: 'S10', // 경상남도교육청
  SD_SCHUL_CODE: '9010061'    // 옥종고등학교
};

interface MealData {
  breakfast: string;
  lunch: string;
  dinner: string;
}

/**
 * 나이스 API를 통해 특정 날짜의 급식 정보를 가져옵니다.
 * @param date YYYYMMDD 형식의 날짜 (예: 20260409)
 */
export async function getMealData(date: string): Promise<MealData | null> {
  const url = 'https://open.neis.go.kr/hub/mealServiceDietInfo';
  
  try {
    const response = await axios.get(url, {
      params: {
        Type: 'json',
        pIndex: 1,
        pSize: 10,
        ATPT_OFCDC_SC_CODE: SCHOOL_CONFIG.ATPT_OFCDC_SC_CODE,
        SD_SCHUL_CODE: SCHOOL_CONFIG.SD_SCHUL_CODE,
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
    console.error('나이스 API 호출 중 오류 발생:', error.message);
    return null;
  }
}

/**
 * 이번 주(월~금)의 급식 데이터를 모두 가져옵니다.
 */
export async function getWeeklyMeals(): Promise<Record<string, MealData>> {
  const days = ['월', '화', '수', '목', '금'];
  const today = new Date();
  const currentDay = today.getDay(); 
  
  const monday = new Date(today);
  const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
  monday.setDate(diff);
  
  const weeklyData: Record<string, MealData> = {};
  
  for (let i = 0; i < 5; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const yyyymmdd = date.toISOString().split('T')[0].replace(/-/g, '');
    
    const meal = await getMealData(yyyymmdd);
    if (meal) {
      weeklyData[days[i]] = meal;
    }
  }
  
  return weeklyData;
}

/**
 * 특정 월의 전체 급식 데이터를 가져옵니다.
 * @param year 년도
 * @param month 월 (1~12)
 */
export async function getMonthlyMeals(year: number, month: number): Promise<Record<string, MealData>> {
  const lastDay = new Date(year, month, 0).getDate();
  const paddedMonth = String(month).padStart(2, '0');
  const result: Record<string, MealData> = {};

  const promises = [];
  
  for (let d = 1; d <= lastDay; d++) {
    const paddedDay = String(d).padStart(2, '0');
    const yyyymmdd = `${year}${paddedMonth}${paddedDay}`;
    const formattedDate = `${year}-${paddedMonth}-${paddedDay}`;
    
    promises.push(
      getMealData(yyyymmdd).then(meal => {
        if (meal && (meal.breakfast || meal.lunch || meal.dinner)) {
          result[formattedDate] = meal;
        }
      })
    );
  }
  
  await Promise.all(promises);
  return result;
}
