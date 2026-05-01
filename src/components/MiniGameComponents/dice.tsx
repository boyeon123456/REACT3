// src/components/games/DiceGame.tsx
import { useState } from 'react';
import { RotateCcw } from 'lucide-react';

interface Props {
    addPoints: (p: number) => void;
}

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export default function DiceGame({ addPoints }: Props) {
    const [rolling, setRolling] = useState(false);
    const [dice, setDice] = useState<number[]>([]);
    const [finished, setFinished] = useState(false);

    const roll = () => {
        setRolling(true);
        setFinished(false);

        let count = 0;
        const interval = setInterval(() => {
            setDice([
                Math.floor(Math.random() * 6),
                Math.floor(Math.random() * 6),
            ]);
            count++;
            if (count >= 10) {
                clearInterval(interval);
                const final = [
                    Math.floor(Math.random() * 6),
                    Math.floor(Math.random() * 6),
                ];
                setDice(final);
                const total = final[0] + final[1] + 2; // 1~6 → display
                const earned = total * 5;
                addPoints(earned);
                setRolling(false);
                setFinished(true);
            }
        }, 80);
    };

    const reset = () => {
        setDice([]);
        setFinished(false);
    };

    const total = dice.length === 2 ? dice[0] + dice[1] + 2 : 0;

    return (
        <div className="game-play-area">
            <div className="game-play-header"><h3>🎲 주사위 굴리기</h3></div>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 12 }}>
                두 주사위의 합 × 5P 획득! (최소 10P ~ 최대 60P)
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, fontSize: 72, margin: '16px 0' }}>
                {dice.length === 2
                    ? dice.map((d, i) => <span key={i}>{DICE_FACES[d]}</span>)
                    : <span style={{ fontSize: 48, color: 'var(--text-secondary)' }}>? ?</span>
                }
            </div>

            {!rolling && !finished && (
                <button className="game-start-btn" onClick={roll}>굴리기!</button>
            )}

            {finished && (
                <div className="fortune-result">
                    <p className="fortune-text">합계: <strong>{total}</strong></p>
                    <p className="fortune-points">+{total * 5}P 획득!</p>
                    <button className="game-retry-btn" onClick={reset}><RotateCcw size={16} /> 다시하기</button>
                </div>
            )}
        </div>
    );
}