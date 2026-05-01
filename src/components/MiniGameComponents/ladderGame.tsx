// src/components/games/LadderGame.tsx
import { useState, useRef, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';

interface Props {
    addPoints: (p: number) => void;
}

const COLS = 4;
const ROWS = 8;
const PRIZES = [-10, 20, 50, 100];

function generateLadder() {
    const rungs: boolean[][] = Array.from({ length: ROWS }, () =>
        Array.from({ length: COLS - 1 }, () => false)
    );
    for (let r = 0; r < ROWS; r++) {
        let c = 0;
        while (c < COLS - 1) {
            if (Math.random() > 0.55) {
                rungs[r][c] = true;
                c += 2;
            } else {
                c++;
            }
        }
    }
    return rungs;
}

function tracePath(start: number, rungs: boolean[][]): number[] {
    const path: number[] = [start];
    let col = start;
    for (let r = 0; r < ROWS; r++) {
        if (col > 0 && rungs[r][col - 1]) col--;
        else if (col < COLS - 1 && rungs[r][col]) col++;
        path.push(col);
    }
    return path;
}

export default function LadderGame({ addPoints }: Props) {
    const [phase, setPhase] = useState<'pick' | 'animate' | 'result'>('pick');
    const [rungs] = useState(() => generateLadder());
    const [shuffledPrizes] = useState(() => [...PRIZES].sort(() => Math.random() - 0.5));
    const [chosen, setChosen] = useState<number | null>(null);
    const [path, setPath] = useState<number[]>([]);
    const [animStep, setAnimStep] = useState(0);
    const [finalCol, setFinalCol] = useState<number | null>(null);
    const intervalRef = useRef<number | null>(null);

    const start = (col: number) => {
        const p = tracePath(col, rungs);
        setChosen(col);
        setPath(p);
        setAnimStep(0);
        setPhase('animate');
    };

    useEffect(() => {
        if (phase !== 'animate') return;
        intervalRef.current = window.setInterval(() => {
            setAnimStep(prev => {
                if (prev >= path.length - 1) {
                    clearInterval(intervalRef.current!);
                    setFinalCol(path[path.length - 1]);
                    setPhase('result');
                    const prize = shuffledPrizes[path[path.length - 1]];
                    addPoints(prize);
                    return prev;
                }
                return prev + 1;
            });
        }, 250);
        return () => clearInterval(intervalRef.current!);
    }, [phase]);

    const reset = () => window.location.reload();

    const W = 220, H = 260;
    const colX = (c: number) => 20 + c * ((W - 40) / (COLS - 1));
    const rowY = (r: number) => 20 + r * ((H - 40) / ROWS);

    return (
        <div className="game-play-area">
            <div className="game-play-header"><h3>🪜 사다리타기</h3></div>

            {/* 상단 선택지 */}
            <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 4 }}>
                {Array.from({ length: COLS }).map((_, i) => (
                    <button
                        key={i}
                        className={`coin-btn ${chosen === i ? 'selected' : ''}`}
                        style={{ width: 44, padding: '6px 0', fontSize: 14 }}
                        onClick={() => phase === 'pick' && start(i)}
                        disabled={phase !== 'pick'}
                    >
                        {i + 1}번
                    </button>
                ))}
            </div>

            {/* SVG 사다리 */}
            <svg width={W} height={H} style={{ display: 'block', margin: '0 auto' }}>
                {/* 세로선 */}
                {Array.from({ length: COLS }).map((_, c) => (
                    <line key={c} x1={colX(c)} y1={rowY(0)} x2={colX(c)} y2={rowY(ROWS)}
                        stroke="var(--text-secondary)" strokeWidth={2} />
                ))}
                {/* 가로 연결선 */}
                {rungs.map((row, r) =>
                    row.map((has, c) =>
                        has ? (
                            <line key={`${r}-${c}`}
                                x1={colX(c)} y1={rowY(r) + (H - 40) / ROWS / 2}
                                x2={colX(c + 1)} y2={rowY(r) + (H - 40) / ROWS / 2}
                                stroke="var(--text-secondary)" strokeWidth={2} />
                        ) : null
                    )
                )}
                {/* 이동 경로 */}
                {phase !== 'pick' && path.slice(0, animStep + 1).map((col, idx) => {
                    if (idx === 0) return null;
                    const prevCol = path[idx - 1];
                    const r = idx - 1;
                    const midY = rowY(r) + (H - 40) / ROWS / 2;
                    return (
                        <g key={idx}>
                            {prevCol !== col ? (
                                <>
                                    <line x1={colX(prevCol)} y1={rowY(r)} x2={colX(prevCol)} y2={midY}
                                        stroke="#FF9F43" strokeWidth={3} />
                                    <line x1={colX(prevCol)} y1={midY} x2={colX(col)} y2={midY}
                                        stroke="#FF9F43" strokeWidth={3} />
                                    <line x1={colX(col)} y1={midY} x2={colX(col)} y2={rowY(r + 1)}
                                        stroke="#FF9F43" strokeWidth={3} />
                                </>
                            ) : (
                                <line x1={colX(col)} y1={rowY(r)} x2={colX(col)} y2={rowY(r + 1)}
                                    stroke="#FF9F43" strokeWidth={3} />
                            )}
                        </g>
                    );
                })}
                {/* 공 */}
                {phase !== 'pick' && (
                    <circle
                        cx={colX(path[Math.min(animStep, path.length - 1)])}
                        cy={rowY(Math.min(animStep, ROWS))}
                        r={6} fill="#FF9F43" />
                )}
            </svg>

            {/* 하단 결과 */}
            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 4 }}>
                {shuffledPrizes.map((p, i) => (
                    <div key={i} style={{
                        width: 44, textAlign: 'center', padding: '4px 0',
                        borderRadius: 8, fontSize: 12, fontWeight: 700,
                        background: finalCol === i ? '#FF9F4320' : 'var(--bg-secondary)',
                        border: finalCol === i ? '2px solid #FF9F43' : '2px solid transparent',
                        color: p < 0 ? '#E74C3C' : '#27AE60'
                    }}>
                        {p > 0 ? `+${p}P` : `${p}P`}
                    </div>
                ))}
            </div>

            {phase === 'result' && finalCol !== null && (
                <div className="fortune-result" style={{ marginTop: 16 }}>
                    <p className="fortune-text">
                        {shuffledPrizes[finalCol] > 0 ? '🎉 행운이에요!' : '😢 아쉽네요...'}
                    </p>
                    <p className="fortune-points">
                        {shuffledPrizes[finalCol] > 0
                            ? `+${shuffledPrizes[finalCol]}P 획득!`
                            : `${shuffledPrizes[finalCol]}P`}
                    </p>
                    <button className="game-retry-btn" onClick={reset}><RotateCcw size={16} /> 다시하기</button>
                </div>
            )}
        </div>
    );
}