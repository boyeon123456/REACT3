// src/components/games/Bakara.tsx
import { useState } from 'react';
import { RotateCcw } from 'lucide-react';

interface Props {
    addPoints: (p: number) => void;
    currentPoints: number;
}

const CUP_COUNT = 4;
const PRIZES = [-50, 0, 30, 100, 200];

export default function Bakara({ addPoints, currentPoints }: Props) {
    const [betAmount, setBetAmount] = useState('');
    const [betError, setBetError] = useState('');
    const [phase, setPhase] = useState<'bet' | 'pick' | 'reveal'>('bet');
    const [prizes, setPrizes] = useState<number[]>([]);
    const [revealed, setRevealed] = useState<number[]>([]);
    const [chosen, setChosen] = useState<number | null>(null);

    const parsedBet = parseInt(betAmount) || 0;

    const startGame = () => {
        const bet = parseInt(betAmount);
        if (!bet || bet <= 0) { setBetError('베팅 금액을 입력해주세요.'); return; }
        if (bet > currentPoints) { setBetError('보유 포인트가 부족합니다.'); return; }
        setBetError('');
        addPoints(-bet);
        const shuffled = [...PRIZES].sort(() => Math.random() - 0.5).slice(0, CUP_COUNT);
        setPrizes(shuffled);
        setRevealed([]);
        setChosen(null);
        setPhase('pick');
    };

    const pick = (i: number) => {
        setChosen(i);
        const prize = prizes[i];
        const isMultiplier = prize > 0;
        if (isMultiplier) addPoints(parsedBet + prize);
        else addPoints(Math.max(0, parsedBet + prize));
        setRevealed(Array.from({ length: CUP_COUNT }, (_, j) => j));
        setPhase('reveal');
    };

    const reset = () => {
        setPrizes([]);
        setRevealed([]);
        setChosen(null);
        setBetAmount('');
        setBetError('');
        setPhase('bet');
    };

    const getPrizeLabel = (p: number) => {
        if (p < 0) return `💸 -${Math.abs(p)}P`;
        if (p === 0) return '😐 ±0P';
        if (p <= 30) return `🎁 +${p}P`;
        if (p <= 100) return `💰 +${p}P`;
        return `💎 +${p}P`;
    };

    const getPrizeColor = (p: number) => {
        if (p < 0) return '#E74C3C';
        if (p === 0) return '#95A5A6';
        if (p <= 30) return '#27AE60';
        if (p <= 100) return '#F39C12';
        return '#9B59B6';
    };

    return (
        <div className="game-play-area">
            <div className="game-play-header"><h3>🥤 종이 컵뽑기</h3></div>

            {phase === 'bet' && (
                <>
                    <p className="bet-balance">보유 포인트: <strong>{currentPoints}P</strong></p>
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 12 }}>
                        {CUP_COUNT}개의 컵 중 하나를 선택하세요!
                    </p>
                    <div className="bet-input-row">
                        <input type="number" className="bet-input" placeholder="베팅 금액"
                            value={betAmount} min={1} max={currentPoints}
                            onChange={e => { setBetAmount(e.target.value); setBetError(''); }} />
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

            {(phase === 'pick' || phase === 'reveal') && (
                <>
                    <p style={{ textAlign: 'center', marginBottom: 16, fontWeight: 600 }}>
                        {phase === 'pick' ? '컵을 선택하세요!' : '결과!'}
                    </p>
                    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {Array.from({ length: CUP_COUNT }).map((_, i) => (
                            <div key={i} style={{ textAlign: 'center' }}>
                                <button
                                    onClick={() => phase === 'pick' && pick(i)}
                                    style={{
                                        width: 64, height: 80, fontSize: 40, borderRadius: 16,
                                        border: chosen === i ? '3px solid #F39C12' : '2px solid var(--primary)',
                                        background: chosen === i ? '#F39C1220' : 'var(--bg-secondary)',
                                        cursor: phase === 'pick' ? 'pointer' : 'default',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                >🥤</button>
                                {revealed.includes(i) && (
                                    <div style={{
                                        marginTop: 6, fontWeight: 700, fontSize: 12,
                                        color: getPrizeColor(prizes[i])
                                    }}>
                                        {getPrizeLabel(prizes[i])}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {phase === 'reveal' && chosen !== null && (
                        <div className="fortune-result" style={{ marginTop: 16 }}>
                            <p className="fortune-text" style={{ color: getPrizeColor(prizes[chosen]) }}>
                                {prizes[chosen] > 0 ? '🎉 행운이에요!' : prizes[chosen] === 0 ? '😐 아쉽네요' : '😢 꽝...'}
                            </p>
                            <p className="fortune-points">{getPrizeLabel(prizes[chosen])}</p>
                            <button className="game-retry-btn" onClick={reset}><RotateCcw size={16} /> 다시하기</button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}