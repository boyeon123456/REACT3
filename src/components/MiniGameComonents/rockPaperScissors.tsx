// src/components/games/RockPaperScissors.tsx
import { useState } from 'react';
import { RotateCcw } from 'lucide-react';

interface Props {
    addPoints: (p: number) => void;
    currentPoints: number;
}

type RPS = 'rock' | 'paper' | 'scissors';
const OPTIONS: { id: RPS; label: string; emoji: string }[] = [
    { id: 'rock', label: '바위', emoji: '✊' },
    { id: 'paper', label: '보', emoji: '✋' },
    { id: 'scissors', label: '가위', emoji: '✌️' },
];

const beats: Record<RPS, RPS> = { rock: 'scissors', scissors: 'paper', paper: 'rock' };

export default function RockPaperScissors({ addPoints, currentPoints }: Props) {
    const [choice, setChoice] = useState<RPS | null>(null);
    const [compChoice, setCompChoice] = useState<RPS | null>(null);
    const [outcome, setOutcome] = useState<'win' | 'lose' | 'draw' | null>(null);
    const [betAmount, setBetAmount] = useState('');
    const [betError, setBetError] = useState('');

    const parsedBet = parseInt(betAmount) || 0;

    const play = (selected: RPS) => {
        const bet = parseInt(betAmount);
        if (!bet || bet <= 0) { setBetError('베팅 금액을 입력해주세요.'); return; }
        if (bet > currentPoints) { setBetError('보유 포인트가 부족합니다.'); return; }

        const comp = OPTIONS[Math.floor(Math.random() * 3)].id;
        setChoice(selected);
        setCompChoice(comp);
        setBetError('');

        let result: 'win' | 'lose' | 'draw';
        if (selected === comp) result = 'draw';
        else if (beats[selected] === comp) result = 'win';
        else result = 'lose';

        setOutcome(result);
        addPoints(-bet);
        if (result === 'win') addPoints(bet * 2);
        else if (result === 'draw') addPoints(bet);
    };

    const reset = () => {
        setChoice(null);
        setCompChoice(null);
        setOutcome(null);
        setBetAmount('');
        setBetError('');
    };

    return (
        <div className="game-play-area">
            <div className="game-play-header"><h3>✊ 가위바위보</h3></div>

            {outcome === null && (
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
                    <p style={{ textAlign: 'center', margin: '16px 0 8px', fontWeight: 600 }}>선택하세요!</p>
                    <div className="coin-choices" style={{ gap: 12 }}>
                        {OPTIONS.map(o => (
                            <button key={o.id} className="coin-btn"
                                style={{ fontSize: 36, padding: '12px 20px' }}
                                onClick={() => play(o.id)}
                                disabled={!parsedBet}
                            >
                                {o.emoji}<br />
                                <span style={{ fontSize: 14 }}>{o.label}</span>
                            </button>
                        ))}
                    </div>
                </>
            )}

            {outcome !== null && choice && compChoice && (
                <div className="fortune-result">
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 32, fontSize: 56, margin: '12px 0' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div>{OPTIONS.find(o => o.id === choice)?.emoji}</div>
                            <div style={{ fontSize: 13, marginTop: 4 }}>나</div>
                        </div>
                        <div style={{ fontSize: 28, alignSelf: 'center' }}>VS</div>
                        <div style={{ textAlign: 'center' }}>
                            <div>{OPTIONS.find(o => o.id === compChoice)?.emoji}</div>
                            <div style={{ fontSize: 13, marginTop: 4 }}>컴퓨터</div>
                        </div>
                    </div>
                    <p className="fortune-text">
                        {outcome === 'win' ? '🎉 승리!' : outcome === 'draw' ? '🤝 무승부' : '😢 패배...'}
                    </p>
                    <p className="fortune-points">
                        {outcome === 'win' ? `+${parsedBet}P 획득!` : outcome === 'draw' ? '포인트 반환' : `-${parsedBet}P`}
                    </p>
                    <button className="game-retry-btn" onClick={reset}><RotateCcw size={16} /> 다시하기</button>
                </div>
            )}
        </div>
    );
}