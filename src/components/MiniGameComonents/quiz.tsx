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