// src/components/games/Gatcha.tsx
import { useState } from 'react';
import { RotateCcw } from 'lucide-react';

interface Props {
    addPoints: (p: number) => void;
    currentPoints: number;
}

const COST = 50;

const PRIZES = [
    { grade: 'SSR', label: '전설의 카드 ✨', color: '#FFD700', points: 500, prob: 0.03 },
    { grade: 'SR', label: '희귀 카드 💜', color: '#9B59B6', points: 200, prob: 0.10 },
    { grade: 'R', label: '레어 카드 💙', color: '#3498DB', points: 80, prob: 0.20 },
    { grade: 'N', label: '일반 카드 🩶', color: '#95A5A6', points: 20, prob: 0.67 },
];

function pickPrize() {
    const rand = Math.random();
    let cumulative = 0;
    for (const p of PRIZES) {
        cumulative += p.prob;
        if (rand < cumulative) return p;
    }
    return PRIZES[PRIZES.length - 1];
}

export default function Gatcha({ addPoints, currentPoints }: Props) {
    const [pulling, setPulling] = useState(false);
    const [results, setResults] = useState<typeof PRIZES>([]);
    const [showResult, setShowResult] = useState(false);
    const [error, setError] = useState('');

    const pull = (count: 1 | 10) => {
        const cost = COST * count;
        if (cost > currentPoints) { setError(`포인트가 부족합니다. (필요: ${cost}P)`); return; }
        setError('');
        addPoints(-cost);
        setPulling(true);
        setTimeout(() => {
            const drawn = Array.from({ length: count }, () => pickPrize());
            const earned = drawn.reduce((sum, d) => sum + d.points, 0);
            addPoints(earned);
            setResults(drawn);
            setShowResult(true);
            setPulling(false);
        }, 1200);
    };

    const reset = () => {
        setResults([]);
        setShowResult(false);
        setError('');
    };

    return (
        <div className="game-play-area">
            <div className="game-play-header"><h3>🎴 가챠</h3></div>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 4 }}>
                1회 뽑기: 50P / 10회 뽑기: 500P
            </p>
            <p className="bet-balance">보유 포인트: <strong>{currentPoints}P</strong></p>

            {/* 확률표 */}
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                {PRIZES.map(p => (
                    <span key={p.grade} style={{
                        background: `${p.color}30`, color: p.color,
                        border: `1px solid ${p.color}`, borderRadius: 8,
                        padding: '3px 10px', fontSize: 12, fontWeight: 700
                    }}>
                        {p.grade} {(p.prob * 100).toFixed(0)}%
                    </span>
                ))}
            </div>

            {error && <p className="bet-error">{error}</p>}

            {!showResult && !pulling && (
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    <button className="game-start-btn" style={{ margin: 0 }} onClick={() => pull(1)}>1회 뽑기</button>
                    <button className="game-start-btn" style={{ margin: 0 }} onClick={() => pull(10)}>10회 뽑기</button>
                </div>
            )}

            {pulling && (
                <div className="fortune-spinner" style={{ fontSize: 48 }}>🎴</div>
            )}

            {showResult && (
                <div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', margin: '12px 0' }}>
                        {results.map((r, i) => (
                            <div key={i} style={{
                                background: `${r.color}20`, border: `2px solid ${r.color}`,
                                borderRadius: 12, padding: '8px 14px', textAlign: 'center', minWidth: 80
                            }}>
                                <div style={{ color: r.color, fontWeight: 800, fontSize: 14 }}>{r.grade}</div>
                                <div style={{ fontSize: 11, marginTop: 2 }}>{r.label}</div>
                                <div style={{ color: r.color, fontWeight: 700, marginTop: 4 }}>+{r.points}P</div>
                            </div>
                        ))}
                    </div>
                    <p className="fortune-points">
                        총 +{results.reduce((s, r) => s + r.points, 0)}P 획득!
                    </p>
                    <button className="game-retry-btn" onClick={reset}><RotateCcw size={16} /> 다시하기</button>
                </div>
            )}
        </div>
    );
}