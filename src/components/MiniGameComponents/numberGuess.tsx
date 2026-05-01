// src/components/games/NumberGuess.tsx
import { useState } from 'react';
import { RotateCcw } from 'lucide-react';

interface Props {
    addPoints: (p: number) => void;
}

export default function NumberGuess({ addPoints }: Props) {
    const [target] = useState(() => Math.floor(Math.random() * 100) + 1);
    const [guess, setGuess] = useState('');
    const [tries, setTries] = useState(0);
    const [hint, setHint] = useState('');
    const [finished, setFinished] = useState(false);
    const MAX_TRIES = 7;

    const submit = () => {
        const n = parseInt(guess);
        if (!n || n < 1 || n > 100) { setHint('1~100 사이 숫자를 입력하세요!'); return; }

        const newTries = tries + 1;
        setTries(newTries);
        setGuess('');

        if (n === target) {
            const earned = Math.max(500 - (newTries - 1) * 70, 10);
            addPoints(earned);
            setHint(`🎉 정답! ${newTries}번 만에 맞췄어요!`);
            setFinished(true);
        } else if (newTries >= MAX_TRIES) {
            setHint(`😢 실패! 정답은 ${target}이었어요.`);
            setFinished(true);
        } else {
            const remaining = MAX_TRIES - newTries;
            setHint(n < target ? `📈 더 큰 숫자예요! (남은 기회: ${remaining}번)` : `📉 더 작은 숫자예요! (남은 기회: ${remaining}번)`);
        }
    };

    const reset = () => window.location.reload(); // 새 target 위해 리셋

    return (
        <div className="game-play-area">
            <div className="game-play-header"><h3>🔢 숫자 맞추기</h3></div>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 8 }}>
                1~100 사이 숫자를 맞춰보세요! ({MAX_TRIES}번 기회)
            </p>
            <p style={{ textAlign: 'center', marginBottom: 16 }}>
                시도: <strong>{tries}</strong> / {MAX_TRIES}
            </p>

            {!finished && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
                    <input
                        type="number"
                        className="bet-input"
                        placeholder="숫자 입력"
                        value={guess}
                        min={1} max={100}
                        onChange={e => setGuess(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && submit()}
                        style={{ width: 120 }}
                    />
                    <button className="game-start-btn" style={{ margin: 0 }} onClick={submit}>제출</button>
                </div>
            )}

            {hint && (
                <p style={{ textAlign: 'center', fontSize: 18, fontWeight: 600, marginBottom: 12 }}>{hint}</p>
            )}

            {finished && (
                <div className="fortune-result">
                    {tries <= MAX_TRIES && hint.includes('정답') && (
                        <p className="fortune-points">+{Math.max(500 - (tries - 1) * 70, 10)}P 획득!</p>
                    )}
                    <button className="game-retry-btn" onClick={reset}><RotateCcw size={16} /> 다시하기</button>
                </div>
            )}
        </div>
    );
}