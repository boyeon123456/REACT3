// src/components/games/CrossTheRoad.tsx
import { useState, useEffect, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';

interface Props {
    addPoints: (p: number) => void;
}

const COLS = 7;
const ROWS = 9; // 0=start, 1~7=road, 8=goal
const CAR_ROWS = [1, 2, 3, 4, 5, 6, 7];

type Car = { row: number; col: number; dir: 1 | -1; speed: number };

function initCars(): Car[] {
    return CAR_ROWS.map((row, i) => ({
        row,
        col: Math.floor(Math.random() * COLS),
        dir: i % 2 === 0 ? 1 : -1,
        speed: 0.6 + Math.random() * 0.6,
    }));
}

export default function CrossTheRoad({ addPoints }: Props) {
    const [playerRow, setPlayerRow] = useState(ROWS - 1);
    const [playerCol, setPlayerCol] = useState(Math.floor(COLS / 2));
    const [cars, setCars] = useState<Car[]>(initCars());
    const [phase, setPhase] = useState<'playing' | 'win' | 'lose'>('playing');
    const [score, setScore] = useState(0);
    const [tick, setTick] = useState(0);

    // 자동차 이동
    useEffect(() => {
        if (phase !== 'playing') return;
        const interval = setInterval(() => {
            setCars(prev => prev.map(car => ({
                ...car,
                col: ((car.col + car.dir * car.speed + COLS) % COLS),
            })));
            setTick(t => t + 1);
        }, 300);
        return () => clearInterval(interval);
    }, [phase]);

    // 충돌 감지
    useEffect(() => {
        if (phase !== 'playing') return;
        const hit = cars.some(car =>
            car.row === playerRow && Math.abs(Math.round(car.col) - playerCol) < 1
        );
        if (hit) setPhase('lose');
        if (playerRow === 0) {
            const earned = 50 + score * 20;
            addPoints(earned);
            setScore(s => s + 1);
            setPlayerRow(ROWS - 1);
            setPlayerCol(Math.floor(COLS / 2));
            if (score + 1 >= 3) setPhase('win');
        }
    }, [tick, playerRow, playerCol, cars]);

    const move = useCallback((dr: number, dc: number) => {
        if (phase !== 'playing') return;
        setPlayerRow(r => Math.max(0, Math.min(ROWS - 1, r + dr)));
        setPlayerCol(c => Math.max(0, Math.min(COLS - 1, c + dc)));
    }, [phase]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowUp') move(-1, 0);
            if (e.key === 'ArrowDown') move(1, 0);
            if (e.key === 'ArrowLeft') move(0, -1);
            if (e.key === 'ArrowRight') move(0, 1);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [move]);

    const reset = () => {
        setPlayerRow(ROWS - 1);
        setPlayerCol(Math.floor(COLS / 2));
        setCars(initCars());
        setPhase('playing');
        setScore(0);
    };

    const CELL = 36;

    return (
        <div className="game-play-area">
            <div className="game-play-header"><h3>🚶 길건너 친구들</h3></div>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 8, fontSize: 13 }}>
                3번 건너면 클리어! | 건너기: 50P + 성공당 20P
            </p>
            <p style={{ textAlign: 'center', marginBottom: 8, fontWeight: 700 }}>
                완료: {score} / 3
            </p>

            {/* 게임 보드 */}
            <div style={{
                position: 'relative',
                width: COLS * CELL, height: ROWS * CELL,
                margin: '0 auto', borderRadius: 8, overflow: 'hidden',
                border: '2px solid var(--primary)'
            }}>
                {/* 행 배경 */}
                {Array.from({ length: ROWS }).map((_, r) => (
                    <div key={r} style={{
                        position: 'absolute', top: r * CELL, left: 0,
                        width: COLS * CELL, height: CELL,
                        background: r === 0 ? '#27AE6020'
                            : r === ROWS - 1 ? '#3498DB20'
                                : r % 2 === 0 ? '#33333320' : '#22222220',
                    }} />
                ))}
                {/* 목적지 / 출발 텍스트 */}
                <div style={{
                    position: 'absolute', top: 0, left: 0,
                    width: '100%', height: CELL, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, color: '#27AE60', fontWeight: 700
                }}>🏁 목적지</div>
                <div style={{
                    position: 'absolute', top: (ROWS - 1) * CELL, left: 0,
                    width: '100%', height: CELL, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, color: '#3498DB', fontWeight: 700
                }}>🚶 출발</div>

                {/* 자동차 */}
                {cars.map((car, i) => (
                    <div key={i} style={{
                        position: 'absolute',
                        top: car.row * CELL + 4,
                        left: Math.round(car.col) * CELL + 2,
                        width: CELL - 4, height: CELL - 8,
                        fontSize: 20, textAlign: 'center', lineHeight: `${CELL - 8}px`,
                        transition: 'left 0.3s linear',
                        transform: car.dir === -1 ? 'scaleX(-1)' : 'none'
                    }}>🚗</div>
                ))}

                {/* 플레이어 */}
                <div style={{
                    position: 'absolute',
                    top: playerRow * CELL + 2,
                    left: playerCol * CELL + 2,
                    width: CELL - 4, height: CELL - 4,
                    fontSize: 22, textAlign: 'center', lineHeight: `${CELL - 4}px`,
                    zIndex: 10
                }}>🐥</div>
            </div>

            {/* 방향키 버튼 */}
            {phase === 'playing' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginTop: 12 }}>
                    <button className="coin-btn" style={{ width: 48 }} onClick={() => move(-1, 0)}>▲</button>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="coin-btn" style={{ width: 48 }} onClick={() => move(0, -1)}>◀</button>
                        <button className="coin-btn" style={{ width: 48 }} onClick={() => move(1, 0)}>▼</button>
                        <button className="coin-btn" style={{ width: 48 }} onClick={() => move(0, 1)}>▶</button>
                    </div>
                </div>
            )}

            {phase !== 'playing' && (
                <div className="fortune-result" style={{ marginTop: 12 }}>
                    <p className="fortune-text">
                        {phase === 'win' ? '🎉 클리어!' : '💥 치였어요!'}
                    </p>
                    {phase === 'win' && (
                        <p className="fortune-points">+{50 + score * 20}P 획득!</p>
                    )}
                    <button className="game-retry-btn" onClick={reset}><RotateCcw size={16} /> 다시하기</button>
                </div>
            )}
        </div>
    );
}