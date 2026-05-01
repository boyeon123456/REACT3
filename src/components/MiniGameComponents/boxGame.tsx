// src/components/games/BoxGame.tsx
import { useState } from 'react';
import { RotateCcw } from 'lucide-react';

interface Props {
    addPoints: (p: number) => void;
    currentPoints: number;
}

const BOXES = 5;
const PRIZES = [
    { label: '💣 폭탄!', value: -100, color: '#E74C3C', prob: 0.15 },
    { label: '🐛 벌레...', value: -10, color: '#E67E22', prob: 0.20 },
    { label: '🎁 5배!', value: 5, color: '#27AE60', prob: 0.35, isMultiplier: true },
    { label: '💰 10배!', value: 10, color: '#F39C12', prob: 0.20, isMultiplier: true },
    { label: '💎 50배!', value: 50, color: '#9B59B6', prob: 0.10, isMultiplier: true },
];

function pickPrize() {
    const rand = Math.random();
    let cumulative = 0;
    for (const p of PRIZES) {
        cumulative += p.prob;
        if (rand < cumulative) return p;
    }
    return PRIZES[0];
}

export default function BoxGame({ addPoints, currentPoints }: Props) {
    const [betAmount, setBetAmount] = useState('');
    const [betError, setBetError] = useState('');
    const [opened, setOpened] = useState<number[]>([]);
    const [prizes, setPrizes] = useState<typeof PRIZES>([]);
    const [phase, setPhase] = useState<'bet' | 'pick' | 'result'>('bet');
    const [lastPrize, setLastPrize] = useState<typeof PRIZES[0] | null>(null);

    const parsedBet = parseInt(betAmount) || 0;

    const startGame = () => {
        const bet = parseInt(betAmount);
        if (!bet || bet <= 0) { setBetError('베팅 금액을 입력해주세요.'); return; }
        if (bet > currentPoints) { setBetError('보유 포인트가 부족합니다.'); return; }
        setBetError('');
        addPoints(-bet);
        const generated = Array.from({ length: BOXES }, () => pickPrize());
        setPrizes(generated);
        setOpened([]);
        setPhase('pick');
    };

    const openBox = (i: number) => {
        if (opened.includes(i)) return;
        const prize = prizes[i];
        setOpened(prev => [...prev, i]);
        setLastPrize(prize);
        const bet = parsedBet;
        if (prize.isMultiplier) addPoints(bet * prize.value);
        else addPoints(prize.value);
        setPhase('result');
    };

    const reset = () => {
        setPrizes([]);
        setOpened([]);
        setBetAmount('');
        setBetError('');
        setLastPrize(null);
        setPhase('bet');
    };

    return (
        <div className="game-play-area">
            <div className="game-play-header"><h3>📦 상자뽑기</h3></div>

            {phase === 'bet' && (
                <>
                    <p className="bet-balance">보유 포인트: <strong>{currentPoints}P</strong></p>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
                        {PRIZES.map(p => (
                            <span key={p.label} style={{
                                background: `${p.color}25`, color: p.color,
                                border: `1px solid ${p.color}`, borderRadius: 8, padding: '3px 8px', fontSize: 12
                            }}>
                                {p.label} ({(p.prob * 100).toFixed(0)}%)
                            </span>
                        ))}
                    </div>
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
                    <button className="game-start-btn" onClick={startGame} disabled={!parsedBet}>상자 선택하기!</button>
                </>
            )}

            {phase === 'pick' && (
                <>
                    <p style={{ textAlign: 'center', marginBottom: 16, fontWeight: 600 }}>상자를 골라보세요!</p>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {Array.from({ length: BOXES }).map((_, i) => (
                            <button key={i} onClick={() => openBox(i)}
                                style={{
                                    width: 72, height: 72, fontSize: 36, borderRadius: 16,
                                    border: '2px solid var(--primary)', background: 'var(--bg-secondary)',
                                    cursor: 'pointer'
                                }}>📦</button>
                        ))}
                    </div>
                </>
            )}

            {phase === 'result' && lastPrize && (
                <div className="fortune-result">
                    <div style={{ fontSize: 56 }}>{lastPrize.label.split(' ')[0]}</div>
                    <p className="fortune-text" style={{ color: lastPrize.color }}>{lastPrize.label}</p>
                    <p className="fortune-points">
                        {lastPrize.isMultiplier
                            ? `${lastPrize.value}x → +${parsedBet * lastPrize.value}P`
                            : `${lastPrize.value > 0 ? '+' : ''}${lastPrize.value}P`}
                    </p>
                    <button className="game-retry-btn" onClick={reset}><RotateCcw size={16} /> 다시하기</button>
                </div>
            )}
        </div>
    );
}