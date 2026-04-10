const neisApi = require('../backend/neisApi');

async function test() {
  console.log('오늘의 급식 데이터를 가져오는 중...');
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const meal = await neisApi.getMealData(today);
  
  if (meal) {
    console.log('가져오기 성공!');
    console.log('중식:', meal.lunch);
    console.log('석식:', meal.dinner);
  } else {
    console.log('데이터를 찾을 수 없거나 오늘 급식이 없습니다.');
  }
  
  console.log('\n이번 주 급식 데이터를 가져오는 중 (시간이 약간 걸립니다)...');
  const weekly = await neisApi.getWeeklyMeals();
  console.log('결과:', weekly);
}

test();
