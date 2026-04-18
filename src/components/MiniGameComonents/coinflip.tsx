// src/components/games/CoinFlip.tsx
import { useState } from 'react';
import { RotateCcw } from 'lucide-react';

interface Props {
    addPoints: (p: number) => void;
    currentPoints: number;
}

export default function CoinFlip({ addPoints, currentPoints }: Props) {
    const [choice, setChoice] = useState<'heads' | 'tails' | null>(null);
    const [result, setResult] = useState<'heads' | 'tails' | null>(null);
    const [flipping, setFlipping] = useState(false);
    const [betAmount, setBetAmount] = useState('');
    const [betError, setBetError] = useState('');

    const parsedBet = parseInt(betAmount) || 0;

    const flip = () => {
        if (!choice) return;
        const bet = parseInt(betAmount);
        if (!bet || bet <= 0) { setBetError('베팅 금액을 입력해주세요.'); return; }
        if (bet > currentPoints) { setBetError('보유 포인트가 부족합니다.'); return; }

        setBetError('');
        addPoints(-bet);
        setFlipping(true);
        setResult(null);

        setTimeout(() => {
            const res: 'heads' | 'tails' = Math.random() > 0.5 ? 'heads' : 'tails';
            setResult(res);
            if (res === choice) addPoints(bet * 2);
            setFlipping(false);
        }, 1200);
    };

    const reset = () => {
        setChoice(null);
        setResult(null);
        setBetAmount('');
        setBetError('');
    };

    const won = result !== null && result === choice;

    return (
        <div className="game-play-area">
            <div className="game-play-header"><h3>🪙 동전 던지기</h3></div>

            {result === null && (
                <>
                    <p className="bet-balance">보유 포인트: <strong>{currentPoints}P</strong></p>
                    <div className="coin-choices">
                        <button
                            className={`coin-btn ${choice === 'heads' ? 'selected' : ''}`}
                            onClick={() => setChoice('heads')}
                        >앞면 👑</button>
                        <button
                            className={`coin-btn ${choice === 'tails' ? 'selected' : ''}`}
                            onClick={() => setChoice('tails')}
                        >뒷면 🌀</button>
                    </div>
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
                        {[10, 50, 100, 500].map(v => (
                            <button key={v} className="bet-quick-btn"
                                onClick={() => setBetAmount(String(Math.min(v, currentPoints)))}>{v}P</button>
                        ))}
                        <button className="bet-quick-btn" onClick={() => setBetAmount(String(currentPoints))}>MAX</button>
                    </div>
                    {betError && <p className="bet-error">{betError}</p>}
                    {flipping
                        ? <div className="fortune-spinner"><span style={{ fontSize: 48 }}>🪙</span></div>
                        : <button className="game-start-btn" onClick={flip} disabled={!choice || !parsedBet}>던지기!</button>
                    }
                </>
            )}

            {result !== null && (
                <div className="fortune-result">
                    <div style={{ fontSize: 60 }}>{result === 'heads' ? '👑' : '🌀'}</div>
                    <p className="fortune-text">{result === 'heads' ? '앞면' : '뒷면'} 나왔어요!</p>
                    <p className={`fortune-points ${won ? 'win' : 'lose'}`}>
                        {won
                            ? `🎉 승리! +${parsedBet * 2}P 획득!`
                            : `😢 패배... -${parsedBet}P`}
                    </p>
                    <button className="game-retry-btn" onClick={reset}><RotateCcw size={16} /> 다시하기</button>
                </div>
            )}
        </div>
    );
}