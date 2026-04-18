// src/components/games/Roulette.tsx
import { useState } from 'react';
import { RotateCcw } from 'lucide-react';

interface Props {
    addPoints: (p: number) => void;
}

const PRIZES = [
    { label: '10P', value: 10, color: '#FF6B6B' },
    { label: '50P', value: 50, color: '#FFD93D' },
    { label: '100P', value: 100, color: '#6BCB77' },
    { label: '200P', value: 200, color: '#4D96FF' },
    { label: '500P', value: 500, color: '#FF87CA' },
    { label: '1000P', value: 1000, color: '#8338EC' },
];

export default function Roulette({ addPoints }: Props) {
    const [angle, setAngle] = useState(0);
    const [result, setResult] = useState<string | null>(null);
    const [spinning, setSpinning] = useState(false);

    const spin = () => {
        if (spinning) return;
        setSpinning(true);
        setResult(null);

        const rand = Math.random();
        let target = 0;
        if (rand < 0.1) target = 0;
        else if (rand < 0.25) target = 1;
        else if (rand < 0.45) target = 2;
        else if (rand < 0.65) target = 3;
        else if (rand < 0.85) target = 4;
        else target = 5;

        const finalAngle = 360 * 5 - (target * 60);
        setAngle(finalAngle);

        setTimeout(() => {
            setSpinning(false);
            const prize = PRIZES[target];
            setResult(prize.label);
            addPoints(prize.value);
        }, 3000);
    };

    const reset = () => {
        setAngle(0);
        setResult(null);
        setSpinning(false);
    };

    return (
        <div className="game-play-area">
            <div className="game-play-header"><h3>🎡 돌림판</h3></div>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 16 }}>
                돌림판을 돌려 포인트를 획득하세요!
            </p>

            <div style={{ position: 'relative', width: 300, height: 300, margin: '0 auto 24px' }}>
                <div style={{
                    width: '100%', height: '100%', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #FF6B6B 0%, #FFD93D 25%, #6BCB77 50%, #4D96FF 75%, #FF87CA 100%)',
                    position: 'relative',
                    transition: 'transform 3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    transform: `rotate(${angle}deg)`,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                }} />
                <div style={{
                    position: 'absolute', top: 10, left: 10, right: 10, bottom: 10,
                    borderRadius: '50%', background: 'var(--bg-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '4px solid var(--primary)', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.1)'
                }}>
                    <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--primary)' }}>START</span>
                </div>
                <div style={{
                    position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)',
                    width: 0, height: 0, borderLeft: '15px solid transparent',
                    borderRight: '15px solid transparent', borderBottom: '20px solid var(--primary)',
                }} />
            </div>

            <button
                onClick={spin}
                disabled={spinning}
                style={{
                    display: 'block', margin: '0 auto', padding: '12px 32px',
                    background: spinning ? 'var(--text-secondary)' : 'var(--primary)',
                    color: 'white', border: 'none', borderRadius: 30,
                    fontSize: 16, fontWeight: 700, cursor: spinning ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s'
                }}
            >
                {spinning ? '돌리는 중...' : '돌리기!'}
            </button>

            {result && (
                <div className="fortune-result" style={{ marginTop: 20 }}>
                    <p className="fortune-text">🎉 {result} 획득!</p>
                    <p className="fortune-points">+{result}</p>
                    <button className="game-retry-btn" onClick={reset}><RotateCcw size={16} /> 다시하기</button>
                </div>
            )}
        </div>
    );
}