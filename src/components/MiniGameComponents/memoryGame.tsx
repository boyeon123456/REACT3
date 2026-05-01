// src/components/games/MemoryGame.tsx
import { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';

interface Props {
    addPoints: (p: number) => void;
}

const EMOJIS = ['🍎', '🍌', '🍇', '🍓', '🍑', '🥝', '🍍', '🥭'];

function shuffle<T>(arr: T[]): T[] {
    return [...arr].sort(() => Math.random() - 0.5);
}

export default function MemoryGame({ addPoints }: Props) {
    const [cards, setCards] = useState<{ id: number; emoji: string; flipped: boolean; matched: boolean }[]>([]);
    const [selected, setSelected] = useState<number[]>([]);
    const [moves, setMoves] = useState(0);
    const [matchedCount, setMatchedCount] = useState(0);
    const [finished, setFinished] = useState(false);
    const [showing, setShowing] = useState(true);
    const TOTAL_PAIRS = 8;

    const initGame = () => {
        const doubled = shuffle([...EMOJIS, ...EMOJIS]).map((emoji, i) => ({
            id: i, emoji, flipped: true, matched: false,
        }));
        setCards(doubled);
        setSelected([]);
        setMoves(0);
        setMatchedCount(0);
        setFinished(false);
        setShowing(true);
        setTimeout(() => {
            setCards(prev => prev.map(c => ({ ...c, flipped: false })));
            setShowing(false);
        }, 2000);
    };

    useEffect(() => { initGame(); }, []);

    const flip = (idx: number) => {
        if (showing) return;
        if (selected.length >= 2) return;
        if (cards[idx].flipped || cards[idx].matched) return;

        const newCards = [...cards];
        newCards[idx] = { ...newCards[idx], flipped: true };
        setCards(newCards);
        const newSelected = [...selected, idx];
        setSelected(newSelected);

        if (newSelected.length === 2) {
            setMoves(m => m + 1);
            const [a, b] = newSelected;
            if (newCards[a].emoji === newCards[b].emoji) {
                const matched = newCards.map((c, i) =>
                    i === a || i === b ? { ...c, matched: true } : c
                );
                setCards(matched);
                const newMatched = matchedCount + 1;
                setMatchedCount(newMatched);
                setSelected([]);
                if (newMatched === TOTAL_PAIRS) {
                    const earned = Math.max(200 - moves * 5, 20);
                    addPoints(earned);
                    setFinished(true);
                }
            } else {
                setTimeout(() => {
                    setCards(prev => prev.map((c, i) =>
                        (i === a || i === b) && !c.matched ? { ...c, flipped: false } : c
                    ));
                    setSelected([]);
                }, 800);
            }
        }
    };

    return (
        <div className="game-play-area">
            <div className="game-play-header"><h3>🧠 기억력 게임</h3></div>
            {showing && (
                <p style={{ textAlign: 'center', color: '#FF9F43', fontWeight: 700, marginBottom: 8 }}>
                    2초 동안 위치를 기억하세요!
                </p>
            )}
            <p style={{ textAlign: 'center', marginBottom: 12 }}>
                시도: <strong>{moves}</strong> | 맞춘 쌍: <strong>{matchedCount}</strong> / {TOTAL_PAIRS}
            </p>

            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 8, maxWidth: 320, margin: '0 auto'
            }}>
                {cards.map((card, i) => (
                    <div
                        key={card.id}
                        onClick={() => flip(i)}
                        style={{
                            height: 64, borderRadius: 12, display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            fontSize: 28, cursor: card.flipped || card.matched ? 'default' : 'pointer',
                            background: card.matched
                                ? '#2ECC7130'
                                : card.flipped
                                    ? 'var(--bg-secondary)'
                                    : 'var(--primary)',
                            border: card.matched ? '2px solid #2ECC71' : '2px solid transparent',
                            transition: 'all 0.2s',
                            userSelect: 'none',
                        }}
                    >
                        {card.flipped || card.matched ? card.emoji : ''}
                    </div>
                ))}
            </div>

            {finished && (
                <div className="fortune-result" style={{ marginTop: 16 }}>
                    <p className="fortune-text">🎉 완성! {moves}번 만에 클리어!</p>
                    <p className="fortune-points">+{Math.max(200 - (moves - TOTAL_PAIRS) * 5, 20)}P 획득!</p>
                    <button className="game-retry-btn" onClick={initGame}><RotateCcw size={16} /> 다시하기</button>
                </div>
            )}
        </div>
    );
}