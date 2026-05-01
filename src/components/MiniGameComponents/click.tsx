import { useState, useRef, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';

interface Props {
    addPoints: (p: number) => void;
    currentPoints: number;
}

export default function ClickGame({ addPoints, currentPoints }: Props) {
    const [betAmount, setBetAmount] = useState('');
    const [betError, setBetError] = useState('');
    const [phase, setPhase] = useState<'bet' | 'playing' | 'finished'>('bet');
    const [clicks, setClicks] = useState(0);
    const [timeLeft, setTimeLeft] = useState(10);
    const timerRef = useRef<number | null>(null);

    const parsedBet = parseInt(betAmount) || 0;

    const startGame = () => {
        const bet = parseInt(betAmount);
        if (!bet || bet <= 0) { setBetError('베팅 금액을 입력해주세요.'); return; }
        if (bet > currentPoints) { setBetError('보유 포인트가 부족합니다.'); return; }
        setBetError('');
        addPoints(-bet);
        setClicks(0);
        setTimeLeft(10);
        setPhase('playing');

        timerRef.current = window.setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    setPhase('finished');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    useEffect(() => {
        if (phase === 'finished') {
            const earned = Math.floor(clicks / 5) * 10;
            addPoints(parsedBet + earned);
        }
    }, [phase]);

    const reset = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setBetAmount('');
        setBetError('');
        setClicks(0);
        setTimeLeft(10);
        setPhase('bet');
    };

    const getResultLabel = () => {
        const earned = Math.floor(clicks / 5) * 10;
        if (earned > parsedBet) return '🎉 대박!';
        if (earned > 0) return '👍 선방했어요!';
        return '😢 아쉽네요...';
    };

    const getEarned = () => Math.floor(clicks / 5) * 10;

    return (
        <div className="game-play-area">
            <div className="game-play-header">
                <h3>⚡ 광클릭 레이스</h3>
                {phase === 'playing' && <span className="game-timer">{timeLeft}초</span>}
            </div>

            {phase === 'bet' && (
                <>
                    <p className="bet-balance">보유 포인트: <strong>{currentPoints}P</strong></p>
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 12 }}>
                        10초 안에 최대한 많이 클릭하세요! (5클릭당 10P 획득)
                    </p>
                    <div className="bet-input-row">
                        <input
                            type="number"
                            className="bet-input"
                            placeholder="베팅 금액"
                            value={betAmount}
                            min={1}
                            max={currentPoints}
                            onChange={e => { setBetAmount(e.target.value); setBetError(''); }}
                        />
                        <span className="bet-unit">P</span>
                    </div>
                    <div className="bet-quick-btns">
                        {[10, 50, 100].map(v => (
                            <button key={v} className="bet-quick-btn"
                                onClick={() => setBetAmount(String(Math.min(v, currentPoints)))}>{v}P</button>
                        ))}
                        <button className="bet-quick-btn" onClick={() => setBetAmount(String(currentPoints))}>MAX</button>
                    </div>
                    {betError && <p className="bet-error">{betError}</p>}
                    <button className="game-start-btn" onClick={startGame} disabled={!parsedBet}>시작!</button>
                </>
            )}

            {phase === 'playing' && (
                <>
                    <div style={{ textAlign: 'center', marginBottom: 16 }}>
                        <span style={{ fontSize: 48, fontWeight: 700 }}>{clicks}</span>
                        <span style={{ fontSize: 16, color: 'var(--text-secondary)', marginLeft: 8 }}>클릭</span>
                    </div>
                    <button className="game-start-btn" onClick={() => setClicks(c => c + 1)}>
                        클릭!
                    </button>
                </>
            )}

            {phase === 'finished' && (
                <div className="fortune-result" style={{ marginTop: 16 }}>
                    <p className="fortune-text">{getResultLabel()}</p>
                    <p style={{ textAlign: 'center', marginBottom: 4 }}>
                        총 <strong>{clicks}회</strong> 클릭
                    </p>
                    <p className="fortune-points">
                        {getEarned() > 0 ? `+${getEarned()}P 획득!` : '획득 포인트 없음'}
                    </p>
                    <button className="game-retry-btn" onClick={reset}>
                        <RotateCcw size={16} /> 다시하기
                    </button>
                </div>
            )}
        </div>
    );
}