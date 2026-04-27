import { useCallback, useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';

interface Props {
    addPoints: (p: number) => void;
}

const COLS = 7;
const ROWS = 9;
const CELL = 36;
const TARGET_CLEARS = 3;
const START_ROW = ROWS - 1;
const START_COL = Math.floor(COLS / 2);
const CAR_ROWS = [1, 2, 3, 4, 5, 6, 7];

type Phase = 'playing' | 'win' | 'lose';
type Car = { row: number; col: number; dir: 1 | -1; speed: number };

function createCars(): Car[] {
    return CAR_ROWS.map((row, index) => ({
        row,
        col: Math.floor(Math.random() * COLS),
        dir: index % 2 === 0 ? 1 : -1,
        speed: 0.55 + Math.random() * 0.7,
    }));
}

export default function CrossTheRoad({ addPoints }: Props) {
    const [playerRow, setPlayerRow] = useState(START_ROW);
    const [playerCol, setPlayerCol] = useState(START_COL);
    const [cars, setCars] = useState<Car[]>(() => createCars());
    const [phase, setPhase] = useState<Phase>('playing');
    const [clears, setClears] = useState(0);
    const [lastReward, setLastReward] = useState(0);

    const move = useCallback((dr: number, dc: number) => {
        if (phase !== 'playing') return;

        setPlayerRow((row) => Math.max(0, Math.min(ROWS - 1, row + dr)));
        setPlayerCol((col) => Math.max(0, Math.min(COLS - 1, col + dc)));
    }, [phase]);

    const reset = useCallback(() => {
        setPlayerRow(START_ROW);
        setPlayerCol(START_COL);
        setCars(createCars());
        setPhase('playing');
        setClears(0);
        setLastReward(0);
    }, []);

    useEffect(() => {
        if (phase !== 'playing') return;

        const interval = window.setInterval(() => {
            setCars((prev) =>
                prev.map((car) => ({
                    ...car,
                    col: (car.col + car.dir * car.speed + COLS) % COLS,
                }))
            );
        }, 300);

        return () => window.clearInterval(interval);
    }, [phase]);

    useEffect(() => {
        if (phase !== 'playing') return;

        const hit = cars.some(
            (car) => car.row === playerRow && Math.round(car.col) === playerCol
        );

        if (hit) {
            setPhase('lose');
            return;
        }

        if (playerRow !== 0) return;

        const nextClears = clears + 1;
        const reward = 50 + clears * 20;

        addPoints(reward);
        setLastReward(reward);
        setClears(nextClears);
        setPlayerRow(START_ROW);
        setPlayerCol(START_COL);

        if (nextClears >= TARGET_CLEARS) {
            setPhase('win');
        }
    }, [addPoints, cars, clears, phase, playerCol, playerRow]);

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if (!event.key.startsWith('Arrow')) return;

            event.preventDefault();

            if (event.key === 'ArrowUp') move(-1, 0);
            if (event.key === 'ArrowDown') move(1, 0);
            if (event.key === 'ArrowLeft') move(0, -1);
            if (event.key === 'ArrowRight') move(0, 1);
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [move]);

    return (
        <div className="game-play-area">
            <div className="game-play-header">
                <h3>길 건너기</h3>
            </div>

            <p
                style={{
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                    marginBottom: 8,
                    fontSize: 13,
                }}
            >
                방향키 또는 버튼으로 이동해서 3번 완주하세요.
            </p>
            <p
                style={{
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                    marginBottom: 8,
                    fontSize: 13,
                }}
            >
                보상은 도착할 때마다 50P, 70P, 90P 순서로 지급됩니다.
            </p>
            <p style={{ textAlign: 'center', marginBottom: 8, fontWeight: 700 }}>
                진행도: {clears} / {TARGET_CLEARS}
            </p>

            <div
                style={{
                    position: 'relative',
                    width: COLS * CELL,
                    height: ROWS * CELL,
                    margin: '0 auto',
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: '2px solid var(--primary)',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.18)',
                }}
            >
                {Array.from({ length: ROWS }).map((_, row) => (
                    <div
                        key={row}
                        style={{
                            position: 'absolute',
                            top: row * CELL,
                            left: 0,
                            width: COLS * CELL,
                            height: CELL,
                            background:
                                row === 0
                                    ? 'rgba(39, 174, 96, 0.18)'
                                    : row === START_ROW
                                        ? 'rgba(52, 152, 219, 0.18)'
                                        : row % 2 === 0
                                            ? 'rgba(255, 255, 255, 0.08)'
                                            : 'rgba(255, 255, 255, 0.04)',
                            borderBottom:
                                row !== START_ROW ? '1px dashed rgba(255, 255, 255, 0.08)' : 'none',
                        }}
                    />
                ))}

                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: CELL,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        color: '#27AE60',
                        fontWeight: 700,
                    }}
                >
                    도착 지점
                </div>
                <div
                    style={{
                        position: 'absolute',
                        top: START_ROW * CELL,
                        left: 0,
                        width: '100%',
                        height: CELL,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        color: '#3498DB',
                        fontWeight: 700,
                    }}
                >
                    출발 지점
                </div>

                {cars.map((car, index) => (
                    <div
                        key={`${car.row}-${index}`}
                        style={{
                            position: 'absolute',
                            top: car.row * CELL + 4,
                            left: Math.round(car.col) * CELL + 2,
                            width: CELL - 4,
                            height: CELL - 8,
                            fontSize: 20,
                            textAlign: 'center',
                            lineHeight: `${CELL - 8}px`,
                            transition: 'left 0.3s linear',
                            transform: car.dir === -1 ? 'scaleX(-1)' : 'none',
                        }}
                    >
                        🚗
                    </div>
                ))}

                <div
                    style={{
                        position: 'absolute',
                        top: playerRow * CELL + 2,
                        left: playerCol * CELL + 2,
                        width: CELL - 4,
                        height: CELL - 4,
                        fontSize: 22,
                        textAlign: 'center',
                        lineHeight: `${CELL - 4}px`,
                        zIndex: 10,
                    }}
                >
                    🐥
                </div>
            </div>

            {phase === 'playing' && (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        marginTop: 12,
                    }}
                >
                    <button type="button" className="coin-btn" style={{ width: 48 }} onClick={() => move(-1, 0)}>
                        ▲
                    </button>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" className="coin-btn" style={{ width: 48 }} onClick={() => move(0, -1)}>
                            ◀
                        </button>
                        <button type="button" className="coin-btn" style={{ width: 48 }} onClick={() => move(1, 0)}>
                            ▼
                        </button>
                        <button type="button" className="coin-btn" style={{ width: 48 }} onClick={() => move(0, 1)}>
                            ▶
                        </button>
                    </div>
                </div>
            )}

            {phase !== 'playing' && (
                <div className="fortune-result" style={{ marginTop: 12 }}>
                    <p className="fortune-text">
                        {phase === 'win' ? '성공! 모든 구간을 건넜어요!' : '아쉽지만 차에 부딪혔어요.'}
                    </p>
                    <p className="fortune-points">
                        마지막 획득 보상: +{lastReward}P
                    </p>
                    <button type="button" className="game-retry-btn" onClick={reset}>
                        <RotateCcw size={16} /> 다시하기
                    </button>
                </div>
            )}
        </div>
    );
}
