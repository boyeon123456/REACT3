// src/components/games/Quiz.tsx
import { useState } from 'react';
import { RotateCcw } from 'lucide-react';

interface Props {
    addPoints: (p: number) => void;
}

const QUESTIONS = [
    { q: '대한민국의 수도는?', options: ['부산', '서울', '인천', '대구'], answer: 1 },
    { q: '1 + 1 = ?', options: ['1', '2', '3', '4'], answer: 1 },
    { q: '지구에서 가장 큰 대륙은?', options: ['아프리카', '북아메리카', '아시아', '유럽'], answer: 2 },
    { q: '태양계에서 가장 큰 행성은?', options: ['지구', '화성', '토성', '목성'], answer: 3 },
    { q: '물의 화학식은?', options: ['CO2', 'H2O', 'O2', 'NaCl'], answer: 1 },
    { q: '피카소의 국적은?', options: ['프랑스', '이탈리아', '스페인', '독일'], answer: 2 },
    { q: '1년은 몇 일인가요?', options: ['365일', '360일', '366일', '364일'], answer: 0 },
    { q: '빛의 속도에 가장 가까운 것은?', options: ['300km/s', '300,000km/s', '3,000km/s', '30,000km/s'], answer: 1 },
    { q: '나폴레옹의 출신 섬은?', options: ['시칠리아', '사르데냐', '코르시카', '크레타'], answer: 2 },
    { q: '모나리자를 그린 화가는?', options: ['미켈란젤로', '라파엘로', '다빈치', '피카소'], answer: 2 },
    { q: '바다가 육지로 들어온 부분은?', options: ['만', '반도', '해협', '섬'], answer: 0 },
    { q: '다음 중 포유류가 아닌 것은?', options: ['고래', '박쥐', '펭귄', '돌고래'], answer: 2 },
    { q: '태양계에서 가장 뜨거운 행성은?', options: ['수성', '금성', '지구', '화성'], answer: 1 },
    { q: '뉴턴이 발견한 만유인력 법칙은?', options: ['F = ma', 'F = -F', 'F = G(m1m2)/r²', 'E = mc²'], answer: 2 },
    { q: '피라미드가 처음 세워진 나라는?', options: ['이집트', '그리스', '중국', '로마'], answer: 0 },
    { q: '인류 최초의 우주인은?', options: ['닐 암스트롱', '유리 가가린', '알렌 셰퍼드', '존 글렌'], answer: 1 },
    { q: '다음 중 가장 많은 인구를 가진 도시는?', options: ['도쿄', '델리', '상하이', '멕시코시티'], answer: 0 },
    { q: '가장 오랫동안 통치한 영국 여왕은?', options: ['빅토리아 여왕', '엘리자베스 1세', '엘리자베스 2세', '빅토리아 여왕'], answer: 2 },
    { q: '세계 최초의 컴퓨터 프로그래머는?', options: ['앨런 튜링', '찰스 배비지', '에이다 러브레이스', '존 폰 노이만'], answer: 2 },
    { q: '가장 큰 나무로 알려진 자이언트 세쿼이아의 고향은?', options: ['캘리포니아', '하와이', '알래스카', '메인'], answer: 0 },
    { q: '지구 표면의 약 71%를 차지하는 것은?', options: ['육지', '바다', '하늘', '얼음'], answer: 1 },
    { q: '물의 어는점은 섭씨 몇 도인가요?', options: ['0도', '100도', '20도', '-10도'], answer: 0 },
    { q: '다음 중 동물이 아닌 것은?', options: ['상어', '돌고래', '문어', '해파리'], answer: 0 },
    { q: '다음 중 가장 큰 포유류는?', options: ['코끼리', '고래', '기린', '코뿔소'], answer: 1 },
    { q: '가장 빠른 육상 동물은?', options: ['사자', '치타', '표범', '호랑이'], answer: 1 },
    { q: '다음 중 가장 작은 새는?', options: ['참새', '벌새', '종달새', '제비'], answer: 1 },
    { q: '다음 중 가장 큰 파충류는?', options: ['악어', '도마뱀', '뱀', '거북'], answer: 0 },
    { q: '다음 중 가장 독성이 강한 거미는?', options: ['블랙 위도우', '브라운 리클루스', '시드니 퍼즐 스파이더', '황금 가시 거미'], answer: 2 },
];

function shuffle<T>(arr: T[]): T[] {
    return [...arr].sort(() => Math.random() - 0.5);
}

export default function Quiz({ addPoints }: Props) {
    const [questions] = useState(() => shuffle(QUESTIONS).slice(0, 5));
    const [idx, setIdx] = useState(0);
    const [score, setScore] = useState(0);
    const [selected, setSelected] = useState<number | null>(null);
    const [finished, setFinished] = useState(false);

    const current = questions[idx];

    const choose = (i: number) => {
        if (selected !== null) return;
        setSelected(i);
        const correct = i === current.answer;
        if (correct) setScore(s => s + 1);
        setTimeout(() => {
            if (idx + 1 >= questions.length) {
                const earned = correct
                    ? (score + 1) * 10
                    : score * 10;
                addPoints(earned);
                setFinished(true);
            } else {
                setIdx(i => i + 1);
                setSelected(null);
            }
        }, 900);
    };

    const reset = () => window.location.reload();

    if (finished) {
        return (
            <div className="game-play-area">
                <div className="game-play-header"><h3>📝 퀴즈</h3></div>
                <div className="fortune-result">
                    <p className="fortune-text">🎉 퀴즈 완료!</p>
                    <p style={{ fontSize: 18, textAlign: 'center', marginBottom: 8 }}>
                        {questions.length}문제 중 <strong>{score}</strong>개 정답
                    </p>
                    <p className="fortune-points">+{score * 10}P 획득!</p>
                    <button className="game-retry-btn" onClick={reset}><RotateCcw size={16} /> 다시하기</button>
                </div>
            </div>
        );
    }

    return (
        <div className="game-play-area">
            <div className="game-play-header"><h3>📝 퀴즈</h3></div>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 12 }}>
                {idx + 1} / {questions.length} | 현재 점수: {score}
            </p>
            <div style={{
                background: 'var(--bg-secondary)', borderRadius: 16,
                padding: '20px 16px', marginBottom: 16, textAlign: 'center',
                fontSize: 17, fontWeight: 600
            }}>
                {current.q}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {current.options.map((opt, i) => {
                    let bg = 'var(--bg-secondary)';
                    let border = '2px solid transparent';
                    if (selected !== null) {
                        if (i === current.answer) { bg = '#27AE6030'; border = '2px solid #27AE60'; }
                        else if (i === selected) { bg = '#E74C3C30'; border = '2px solid #E74C3C'; }
                    }
                    return (
                        <button key={i} onClick={() => choose(i)}
                            style={{
                                padding: '12px 16px', borderRadius: 12,
                                background: bg, border,
                                fontSize: 15, textAlign: 'left', cursor: 'pointer',
                                fontWeight: selected !== null && i === current.answer ? 700 : 400,
                                transition: 'all 0.2s'
                            }}>
                            {['①', '②', '③', '④'][i]} {opt}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}