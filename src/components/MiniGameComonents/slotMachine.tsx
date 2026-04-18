// src/components/games/SlotMachine.tsx
import { useState } from 'react';
import { RotateCcw } from 'lucide-react';

interface Props {
    addPoints: (p: number) => void;
    currentPoints: number;
}

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '7️⃣'];
const PAYOUTS: Record<string, number> = {
    '7️⃣7️⃣7️⃣': 500,
    '💎💎💎': 200,
    '⭐⭐⭐': 50,
    '🍇🍇🍇': 20,
    '🍊🍊🍊': 10,
    '🍋🍋🍋': 5,
    '🍒🍒🍒': 3,
};

export default function SlotMachine({ addPoints, currentPoints }: Props) {
    const [reels, setReels] = useState(['❓', '❓', '❓']);
    const [spinning, setSpinning] = useState(false);
    const [result, setResult] = useState<{ key: string; multiplier: number } | null>(null);
    const [betAmount, setBetAmount] = useState('');
    const [betError, setBetError] = useState('');

    const parsedBet = parseInt(betAmount) || 0;

    const spin = () => {
        const bet = parseInt(betAmount);
        if (!bet || bet <= 0) { setBetError('베팅 금액을 입력해주세요.'); return; }
        if (bet > currentPoints) { setBetError('보유 포인트가 부족합니다.'); return; }

        setBetError('');
        addPoints(-bet);
        setSpinning(true);
        setResult(null);

        let tick = 0;
        const interval = setInterval(() => {
            setReels([
                SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
                SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
                SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
            ]);
            tick++;
            if (tick >= 15) {
                clearInterval(interval);
                const final = [
                    SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
                    SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
                    SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
                ];
                setReels(final);
                const key = final.join('');
                const multiplier = PAYOUTS[key] || 0;
                if (multiplier > 0) addPoints(bet * multiplier);
                setResult({ key, multiplier });
                setSpinning(false);
            }
        }, 80);
    };

    const reset = () => {
        setReels(['❓', '❓', '❓']);
        setResult(null);
        setBetAmount('');
        setBetError('');
    };

    return (
        <div className="game-play-area">
            <div className="game-play-header"><h3>🎰 슬롯머신</h3></div>

            <div style={{
                display: 'flex', justifyContent: 'center', gap: 8,
                fontSize: 56, background: 'var(--bg-secondary)',
                borderRadius: 16, padding: '16px 24px', margin: '12px 0'
            }}>
                {reels.map((r, i) => <span key={i}>{r}</span>)}
            </div>

            {/* 배당표 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 12 }}>
                {Object.entries(PAYOUTS).map(([k, v]) => (
                    <span key={k} style={{
                        background: 'var(--bg-secondary)', borderRadius: 8,
                        padding: '4px 8px', fontSize: 12
                    }}>{k} = {v}x</span>
                ))}
            </div>

            {result === null && (
                <>
                    <p className="bet-balance">보유 포인트: <strong>{currentPoints}P</strong></p>
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
                    {!spinning && (
                        <button className="game-start-btn" onClick={spin} disabled={!parsedBet}>🎰 돌리기!</button>
                    )}
                </>
            )}

            {result !== null && (
                <div className="fortune-result">
                    <p className="fortune-text">
                        {result.multiplier >= 100 ? '🎊 잭팟!!' : result.multiplier > 0 ? '🎉 당첨!' : '😢 꽝...'}
                    </p>
                    <p className="fortune-points">
                        {result.multiplier > 0
                            ? `${result.multiplier}x → +${parsedBet * result.multiplier}P`
                            : `아쉽네요... -${parsedBet}P`}
                    </p>
                    <button className="game-retry-btn" onClick={reset}><RotateCcw size={16} /> 다시하기</button>
                </div>
            )}
        </div>
    );
}