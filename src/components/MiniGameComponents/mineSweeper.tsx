// src/components/games/MineSweeper.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { RotateCcw, Flag, Clock, Trophy, ChevronDown } from 'lucide-react';

interface Props {
    addPoints: (p: number) => void;
}

type Difficulty = 'easy' | 'normal' | 'hard';

const DIFFICULTIES: Record<Difficulty, { rows: number; cols: number; mines: number; label: string; emoji: string }> = {
    easy: { rows: 8, cols: 8, mines: 8, label: '쉬움', emoji: '🌱' },
    normal: { rows: 8, cols: 8, mines: 10, label: '보통', emoji: '💣' },
    hard: { rows: 10, cols: 10, mines: 20, label: '어려움', emoji: '☠️' },
};

type Cell = {
    mine: boolean;
    revealed: boolean;
    flagged: boolean;
    adjacent: number;
};

type Phase = 'idle' | 'playing' | 'win' | 'lose';

function createBoard(rows: number, cols: number, mines: number): Cell[][] {
    const board: Cell[][] = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 }))
    );
    let placed = 0;
    while (placed < mines) {
        const r = Math.floor(Math.random() * rows);
        const c = Math.floor(Math.random() * cols);
        if (!board[r][c].mine) { board[r][c].mine = true; placed++; }
    }
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (board[r][c].mine) continue;
            let count = 0;
            for (let dr = -1; dr <= 1; dr++)
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].mine) count++;
                }
            board[r][c].adjacent = count;
        }
    }
    return board;
}

function revealCells(board: Cell[][], r: number, c: number, rows: number, cols: number): Cell[][] {
    const newBoard = board.map(row => row.map(cell => ({ ...cell })));
    const stack = [[r, c]];
    while (stack.length) {
        const [cr, cc] = stack.pop()!;
        if (cr < 0 || cr >= rows || cc < 0 || cc >= cols) continue;
        if (newBoard[cr][cc].revealed || newBoard[cr][cc].flagged) continue;
        newBoard[cr][cc].revealed = true;
        if (newBoard[cr][cc].adjacent === 0 && !newBoard[cr][cc].mine) {
            for (let dr = -1; dr <= 1; dr++)
                for (let dc = -1; dc <= 1; dc++)
                    stack.push([cr + dr, cc + dc]);
        }
    }
    return newBoard;
}

// 첫 클릭 보호: 첫 클릭 셀과 주변에 지뢰가 없도록 보드 재생성
function ensureSafeStart(board: Cell[][], r: number, c: number, rows: number, cols: number, mines: number): Cell[][] {
    const safeZone = new Set<string>();
    for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++)
            safeZone.add(`${r + dr},${c + dc}`);

    let attempts = 0;
    while (attempts < 100) {
        const newBoard = createBoard(rows, cols, mines);
        const conflict = [...safeZone].some(key => {
            const [nr, nc] = key.split(',').map(Number);
            return nr >= 0 && nr < rows && nc >= 0 && nc < cols && newBoard[nr][nc].mine;
        });
        if (!conflict) return newBoard;
        attempts++;
    }
    return board;
}

const ADJ_COLORS = ['', '#60A5FA', '#34D399', '#F87171', '#A78BFA', '#FB923C', '#22D3EE', '#94A3B8', '#CBD5E1'];

export default function MineSweeper({ addPoints }: Props) {
    const [difficulty, setDifficulty] = useState<Difficulty>('normal');
    const [showDiffMenu, setShowDiffMenu] = useState(false);
    const { rows, cols, mines } = DIFFICULTIES[difficulty];

    const [board, setBoard] = useState<Cell[][]>(() => createBoard(rows, cols, mines));
    const [phase, setPhase] = useState<Phase>('idle');
    const [firstClick, setFirstClick] = useState(true);
    const [flagCount, setFlagCount] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    const [explodedCell, setExplodedCell] = useState<[number, number] | null>(null);
    const [newlyRevealed, setNewlyRevealed] = useState<Set<string>>(new Set());
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const safeCount = rows * cols - mines;

    const countRevealed = (b: Cell[][]) => b.flat().filter(c => c.revealed && !c.mine).length;
    const countFlagged = (b: Cell[][]) => b.flat().filter(c => c.flagged).length;

    // 타이머
    useEffect(() => {
        if (phase === 'playing') {
            timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [phase]);

    const reset = useCallback(() => {
        setBoard(createBoard(rows, cols, mines));
        setPhase('idle');
        setFirstClick(true);
        setFlagCount(0);
        setElapsed(0);
        setExplodedCell(null);
        setNewlyRevealed(new Set());
    }, [rows, cols, mines]);

    // 난이도 변경 시 리셋
    useEffect(() => { reset(); }, [difficulty]);

    const handleClick = (r: number, c: number) => {
        if (phase === 'win' || phase === 'lose') return;
        const cell = board[r][c];
        if (cell.revealed || cell.flagged) return;

        let currentBoard = board;

        // 첫 클릭 보호
        if (firstClick) {
            currentBoard = ensureSafeStart(board, r, c, rows, cols, mines);
            setFirstClick(false);
            setPhase('playing');
        }

        if (currentBoard[r][c].mine) {
            // 지뢰 클릭
            const newBoard = currentBoard.map(row => row.map(cell => ({ ...cell, revealed: true })));
            setBoard(newBoard);
            setExplodedCell([r, c]);
            setPhase('lose');
            return;
        }

        const prevRevealed = countRevealed(currentBoard);
        const newBoard = revealCells(currentBoard, r, c, rows, cols);
        const nowRevealed = countRevealed(newBoard);

        // 새로 열린 셀 애니메이션
        const newly = new Set<string>();
        for (let nr = 0; nr < rows; nr++)
            for (let nc = 0; nc < cols; nc++)
                if (!currentBoard[nr][nc].revealed && newBoard[nr][nc].revealed)
                    newly.add(`${nr}-${nc}`);
        setNewlyRevealed(newly);
        setTimeout(() => setNewlyRevealed(new Set()), 400);

        setBoard(newBoard);
        setFlagCount(countFlagged(newBoard));

        if (nowRevealed === safeCount) {
            const bonus = difficulty === 'easy' ? 100 : difficulty === 'normal' ? 200 : 400;
            const timeBonus = Math.max(0, 300 - elapsed) * 2;
            const earned = bonus + nowRevealed * 5 + timeBonus;
            addPoints(earned);
            setPhase('win');
        }
    };

    const handleFlag = (e: React.MouseEvent, r: number, c: number) => {
        e.preventDefault();
        if (phase === 'win' || phase === 'lose' || phase === 'idle') return;
        if (board[r][c].revealed) return;
        const newBoard = board.map(row => row.map(cell => ({ ...cell })));
        newBoard[r][c].flagged = !newBoard[r][c].flagged;
        setBoard(newBoard);
        setFlagCount(countFlagged(newBoard));
    };

    const handleDiffSelect = (d: Difficulty) => {
        setDifficulty(d);
        setShowDiffMenu(false);
    };

    const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    const cellSize = cols <= 8 ? 36 : 30;
    const diff = DIFFICULTIES[difficulty];
    const revealed = countRevealed(board);

    return (
        <div style={{
            fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
            padding: '0 4px',
        }}>
            {/* 헤더 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {diff.emoji} 지뢰찾기
                </h3>
                {/* 난이도 드롭다운 */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowDiffMenu(v => !v)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '5px 10px', borderRadius: 8, border: '1.5px solid var(--border, #333)',
                            background: 'var(--bg-secondary, #1a1a2e)', color: 'var(--text-primary, #eee)',
                            fontSize: 13, fontWeight: 600, cursor: 'pointer'
                        }}
                    >
                        {diff.label} <ChevronDown size={13} />
                    </button>
                    {showDiffMenu && (
                        <div style={{
                            position: 'absolute', top: '110%', right: 0, zIndex: 99,
                            background: 'var(--bg-secondary, #1a1a2e)', border: '1.5px solid var(--border, #333)',
                            borderRadius: 10, overflow: 'hidden', minWidth: 110,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                        }}>
                            {(Object.entries(DIFFICULTIES) as [Difficulty, typeof diff][]).map(([key, d]) => (
                                <button
                                    key={key}
                                    onClick={() => handleDiffSelect(key)}
                                    style={{
                                        display: 'block', width: '100%', textAlign: 'left',
                                        padding: '9px 14px', border: 'none', cursor: 'pointer',
                                        background: key === difficulty ? 'var(--primary, #4f46e5)' : 'transparent',
                                        color: 'var(--text-primary, #eee)', fontSize: 13, fontWeight: 600,
                                    }}
                                >
                                    {d.emoji} {d.label}
                                    <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 6 }}>{d.mines}개</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* 상태바 */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px', borderRadius: 10,
                background: 'var(--bg-secondary, #1a1a2e)',
                marginBottom: 12, fontSize: 13, fontWeight: 600
            }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Flag size={13} style={{ color: '#F87171' }} />
                    {flagCount} / {mines}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: 0.7, fontSize: 12 }}>
                    {revealed} / {safeCount} 칸
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={13} style={{ color: '#60A5FA' }} />
                    {formatTime(elapsed)}
                </span>
            </div>

            {/* 보드 */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
                    gap: 3,
                    margin: '0 auto',
                    width: 'fit-content',
                }}
            >
                {board.map((row, r) =>
                    row.map((cell, c) => {
                        const isExploded = explodedCell?.[0] === r && explodedCell?.[1] === c;
                        const isNew = newlyRevealed.has(`${r}-${c}`);
                        const isMineRevealed = cell.mine && cell.revealed;

                        let bg = 'var(--primary, #4f46e5)';
                        if (cell.revealed) {
                            bg = isMineRevealed
                                ? (isExploded ? '#EF4444' : '#7f1d1d30')
                                : 'var(--bg-secondary, #1a1a2e)';
                        }

                        return (
                            <div
                                key={`${r}-${c}`}
                                onClick={() => handleClick(r, c)}
                                onContextMenu={e => handleFlag(e, r, c)}
                                title="우클릭: 깃발"
                                style={{
                                    width: cellSize, height: cellSize,
                                    borderRadius: 7,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: isMineRevealed ? 16 : (cell.flagged ? 15 : 13),
                                    fontWeight: 800,
                                    cursor: phase === 'win' || phase === 'lose' ? 'default' : 'pointer',
                                    background: bg,
                                    color: cell.adjacent ? ADJ_COLORS[cell.adjacent] : 'inherit',
                                    userSelect: 'none',
                                    transition: 'transform 0.1s, background 0.15s',
                                    transform: isNew ? 'scale(1.15)' : 'scale(1)',
                                    boxShadow: isExploded ? '0 0 12px #EF4444' : undefined,
                                    opacity: isMineRevealed && !isExploded ? 0.5 : 1,
                                }}
                            >
                                {cell.flagged && !cell.revealed ? '🚩'
                                    : cell.revealed && cell.mine ? '💣'
                                        : cell.revealed && cell.adjacent > 0 ? cell.adjacent
                                            : ''}
                            </div>
                        );
                    })
                )}
            </div>

            {/* 결과 */}
            {(phase === 'win' || phase === 'lose') && (
                <div style={{
                    marginTop: 16, textAlign: 'center',
                    padding: '16px', borderRadius: 14,
                    background: phase === 'win' ? '#064e3b40' : '#7f1d1d40',
                    border: `1.5px solid ${phase === 'win' ? '#34D399' : '#F87171'}`,
                }}>
                    <div style={{ fontSize: 28, marginBottom: 4 }}>
                        {phase === 'win' ? '🎉' : '💥'}
                    </div>
                    <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 16 }}>
                        {phase === 'win' ? '클리어!' : '게임 오버'}
                    </p>
                    {phase === 'win' && (() => {
                        const bonus = difficulty === 'easy' ? 100 : difficulty === 'normal' ? 200 : 400;
                        const timeBonus = Math.max(0, 300 - elapsed) * 2;
                        const total = bonus + revealed * 5 + timeBonus;
                        return (
                            <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 10 }}>
                                <span>기본 {bonus}P</span>
                                <span style={{ margin: '0 6px', opacity: 0.4 }}>+</span>
                                <span>칸 보너스 {revealed * 5}P</span>
                                <span style={{ margin: '0 6px', opacity: 0.4 }}>+</span>
                                <span>시간 보너스 {timeBonus}P</span>
                                <div style={{ fontWeight: 800, fontSize: 17, color: '#34D399', marginTop: 4 }}>
                                    <Trophy size={14} style={{ display: 'inline', marginRight: 4 }} />
                                    총 +{total}P
                                </div>
                            </div>
                        );
                    })()}
                    {phase === 'lose' && (
                        <p style={{ fontSize: 13, opacity: 0.7, margin: '0 0 10px' }}>
                            {formatTime(elapsed)} 만에 폭발 💀
                        </p>
                    )}
                    <button
                        onClick={reset}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '8px 18px', borderRadius: 10, border: 'none',
                            background: 'var(--primary, #4f46e5)', color: '#fff',
                            fontSize: 14, fontWeight: 700, cursor: 'pointer',
                        }}
                    >
                        <RotateCcw size={15} /> 다시하기
                    </button>
                </div>
            )}

            {/* 안내 */}
            {phase === 'idle' && (
                <p style={{ textAlign: 'center', fontSize: 12, opacity: 0.5, marginTop: 12 }}>
                    칸을 클릭해서 시작 · 우클릭으로 깃발 꽂기
                </p>
            )}
        </div>
    );
}