const axios = require('axios');

// 학교 정보 (예시: 옥종고등학교)
const SCHOOL_CONFIG = {
  ATPT_OFCDC_SC_CODE: 'S10', // 경상남도교육청
  SD_SCHUL_CODE: '9010061'    // 옥종고등학교
};


/**
 * 나이스 API를 통해 특정 날짜의 급식 정보를 가져옵니다.
 * @param {string} date YYYYMMDD 형식의 날짜 (예: 20260409)
 * @returns {Promise<Object>} 조식/중식/석식 정보 객체
 */
async function getMealData(date) {
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
      const result = { breakfast: '', lunch: '', dinner: '' };
      
      meals.forEach(item => {
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
  } catch (error) {
    console.error('나이스 API 호출 중 오류 발생:', error.message);
    return null;
  }
}

/**
 * 이번 주(월~금)의 급식 데이터를 모두 가져옵니다.
 */
async function getWeeklyMeals() {
  const days = ['월', '화', '수', '목', '금'];
  const today = new Date();
  const currentDay = today.getDay(); 
  
  const monday = new Date(today);
  const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
  monday.setDate(diff);
  
  const weeklyData = {};
  
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
 * (NEIS 기간 조회 버그 우회를 위해 일별 개별 조회 후 병합)
 * @param {number} year 년도
 * @param {number} month 월 (1~12)
 */
async function getMonthlyMeals(year, month) {
  const lastDay = new Date(year, month, 0).getDate();
  const paddedMonth = String(month).padStart(2, '0');
  const result = {};

  const promises = [];
  
  for (let d = 1; d <= lastDay; d++) {
    const paddedDay = String(d).padStart(2, '0');
    const yyyymmdd = `${year}${paddedMonth}${paddedDay}`;
    const formattedDate = `${year}-${paddedMonth}-${paddedDay}`;
    
    promises.push(
      getMealData(yyyymmdd).then(meal => {
        if (meal) {
          result[formattedDate] = meal;
        }
      })
    );
  }
  
  await Promise.all(promises);
  return result;
}

module.exports = { getMealData, getWeeklyMeals, getMonthlyMeals };
