import { useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';

interface GaltonBoardProps {
    addPoints: (p: number) => void;
    currentPoints: number; // 현재 보유 포인트 (새로 추가)
}

const ROWS = 10;

// 하단 구간별 배수 (왼쪽 끝 ~ 오른쪽 끝, 총 11칸)
const SLOT_MULTIPLIERS = [50, 10, 5, 3, 2, 1, 2, 3, 5, 10, 50];

export function GaltonBoard({ addPoints, currentPoints }: GaltonBoardProps) {
    const [ballPos, setBallPos] = useState({ x: 0, y: -1 });
    const [dropping, setDropping] = useState(false);
    const [result, setResult] = useState<{ slot: number; multiplier: number; earned: number } | null>(null);
    const [betAmount, setBetAmount] = useState<string>('');
    const [betError, setBetError] = useState<string>('');

    const parsedBet = parseInt(betAmount) || 0;

    const drop = () => {
        if (dropping) return;

        const bet = parseInt(betAmount);
        if (!bet || bet <= 0) {
            setBetError('베팅 금액을 입력해주세요.');
            return;
        }
        if (bet > currentPoints) {
            setBetError('보유 포인트가 부족합니다.');
            return;
        }

        setBetError('');
        // 베팅 금액 차감 (음수로 전달)
        addPoints(-bet);

        setDropping(true);
        setResult(null);
        setBallPos({ x: 0, y: 0 });

        let currentCol = 0;
        let currentRow = 0;

        const interval = window.setInterval(() => {
            if (currentRow >= ROWS) {
                clearInterval(interval);
                const finalSlot = currentCol; // 0 ~ ROWS (11개 슬롯)
                const multiplier = SLOT_MULTIPLIERS[finalSlot];
                const earned = bet * multiplier;
                if (earned > 0) addPoints(earned);
                setResult({ slot: finalSlot, multiplier, earned });
                setDropping(false);
            } else {
                currentCol += Math.random() > 0.5 ? 1 : 0;
                currentRow++;
                setBallPos({ x: currentCol, y: currentRow });
            }
        }, 200);
    };

    const reset = () => {
        setResult(null);
        setBallPos({ x: 0, y: -1 });
        setBetAmount('');
    };

    return (
        <div className="galton-container">
            <div className="game-play-header">
                <h3>📐 갈튼 보드 (확률 게임)</h3>
                <p>구슬이 양 끝에 도착할수록 높은 배수!</p>
            </div>

            {/* 베팅 입력 */}
            {!dropping && result === null && (
                <div className="bet-section">
                    <p className="bet-balance">보유 포인트: <strong>{currentPoints}P</strong></p>
                    <div className="bet-input-row">
                        <input
                            type="number"
                            className="bet-input"
                            placeholder="베팅 금액 입력"
                            value={betAmount}
                            min={1}
                            max={currentPoints}
                            onChange={e => {
                                setBetAmount(e.target.value);
                                setBetError('');
                            }}
                        />
                        <span className="bet-unit">P</span>
                    </div>
                    {/* 빠른 선택 버튼 */}
                    <div className="bet-quick-btns">
                        {[10, 50, 100, 500].map(v => (
                            <button
                                key={v}
                                className="bet-quick-btn"
                                onClick={() => setBetAmount(String(Math.min(v, currentPoints)))}
                            >
                                {v}P
                            </button>
                        ))}
                        <button
                            className="bet-quick-btn"
                            onClick={() => setBetAmount(String(currentPoints))}
                        >
                            MAX
                        </button>
                    </div>
                    {betError && <p className="bet-error">{betError}</p>}
                </div>
            )}

            {/* SVG 보드 */}
            <div className="board-visualizer">
                <svg viewBox={`0 -1 ${ROWS + 1} ${ROWS + 2}`} className="galton-svg">
                    {[...Array(ROWS + 1)].map((_, r) =>
                        [...Array(r + 1)].map((_, c) => (
                            <circle
                                key={`pin-${r}-${c}`}
                                cx={c + (ROWS - r) / 2}
                                cy={r}
                                r="0.1"
                                className="pin"
                            />
                        ))
                    )}
                    {ballPos.y >= 0 && (
                        <circle
                            cx={ballPos.x + (ROWS - ballPos.y) / 2}
                            cy={ballPos.y}
                            r="0.2"
                            className="ball"
                        />
                    )}
                </svg>
            </div>

            {/* 하단 배수 슬롯 */}
            <div className="galton-slots">
                {SLOT_MULTIPLIERS.map((m, i) => (
                    <div
                        key={i}
                        className={`galton-slot ${result?.slot === i ? 'slot-active' : ''
                            } ${m >= 10 ? 'slot-high' : m >= 3 ? 'slot-mid' : m === 0 ? 'slot-zero' : ''
                            }`}
                    >
                        {m}x
                    </div>
                ))}
            </div>

            {/* 버튼 / 결과 */}
            <div className="controls">
                {!dropping && result === null && (
                    <button
                        className="game-start-btn"
                        onClick={drop}
                        disabled={!parsedBet || parsedBet > currentPoints}
                    >
                        <Play size={18} /> 구슬 떨어뜨리기!
                    </button>
                )}

                {result !== null && (
                    <div className="fortune-result">
                        <p className="fortune-text">
                            {result.multiplier >= 10
                                ? '🎉 대박! 높은 배수에 도착!'
                                : result.multiplier >= 3
                                    ? '😄 좋아요! 수익이 났어요!'
                                    : result.multiplier >= 1
                                        ? '😊 본전 근처네요'
                                        : '😢 아쉽네요...'}
                        </p>
                        <p className="fortune-points">
                            {result.multiplier}x → +{result.earned}P 획득
                            <span className={parsedBet > result.earned ? 'loss-text' : 'profit-text'}>
                                {' '}({result.earned - parsedBet >= 0 ? '+' : ''}{result.earned - parsedBet}P)
                            </span>
                        </p>
                        <button className="game-retry-btn" onClick={reset}>
                            <RotateCcw size={16} /> 다시 하기
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}