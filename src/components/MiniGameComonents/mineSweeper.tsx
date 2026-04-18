// src/components/games/MineSweeper.tsx
import { useState } from 'react';
import { RotateCcw } from 'lucide-react';

interface Props {
    addPoints: (p: number) => void;
}

const ROWS = 8, COLS = 8, MINES = 10;

type Cell = {
    mine: boolean; revealed: boolean; flagged: boolean; adjacent: number;
};

function createBoard(): Cell[][] {
    const board: Cell[][] = Array.from({ length: ROWS }, () =>
        Array.from({ length: COLS }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 }))
    );
    let placed = 0;
    while (placed < MINES) {
        const r = Math.floor(Math.random() * ROWS);
        const c = Math.floor(Math.random() * COLS);
        if (!board[r][c].mine) { board[r][c].mine = true; placed++; }
    }
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c].mine) continue;
            let count = 0;
            for (let dr = -1; dr <= 1; dr++)
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc].mine) count++;
                }
            board[r][c].adjacent = count;
        }
    }
    return board;
}

function reveal(board: Cell[][], r: number, c: number): Cell[][] {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return board;
    if (board[r][c].revealed || board[r][c].flagged) return board;
    const newBoard = board.map(row => row.map(cell => ({ ...cell })));
    const stack = [[r, c]];
    while (stack.length) {
        const [cr, cc] = stack.pop()!;
        if (cr < 0 || cr >= ROWS || cc < 0 || cc >= COLS) continue;
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

const ADJ_COLORS = ['', '#3498DB', '#27AE60', '#E74C3C', '#8E44AD', '#C0392B', '#1ABC9C', '#2C3E50', '#7F8C8D'];

export default function MineSweeper({ addPoints }: Props) {
    const [board, setBoard] = useState<Cell[][]>(() => createBoard());
    const [phase, setPhase] = useState<'playing' | 'win' | 'lose'>('playing');
    const [revealedCount, setRevealedCount] = useState(0);

    const checkWin = (b: Cell[][]) => {
        const safe = ROWS * COLS - MINES;
        const revealed = b.flat().filter(c => c.revealed && !c.mine).length;
        return revealed === safe;
    };

    const handleClick = (r: number, c: number) => {
        if (phase !== 'playing') return;
        const cell = board[r][c];
        if (cell.revealed || cell.flagged) return;
        if (cell.mine) {
            const newBoard = board.map(row => row.map(cell => ({ ...cell, revealed: true })));
            setBoard(newBoard);
            setPhase('lose');
            return;
        }
        const newBoard = reveal(board, r, c);
        const revealed = newBoard.flat().filter(c => c.revealed && !c.mine).length;
        setRevealedCount(revealed);
        setBoard(newBoard);
        if (checkWin(newBoard)) {
            const earned = 200 + revealed * 5;
            addPoints(earned);
            setPhase('win');
        }
    };

    const handleFlag = (e: React.MouseEvent, r: number, c: number) => {
        e.preventDefault();
        if (phase !== 'playing') return;
        if (board[r][c].revealed) return;
        const newBoard = board.map(row => row.map(cell => ({ ...cell })));
        newBoard[r][c].flagged = !newBoard[r][c].flagged;
        setBoard(newBoard);
    };

    const reset = () => {
        setBoard(createBoard());
        setPhase('playing');
        setRevealedCount(0);
    };

    return (
        <div className="game-play-area">
            <div className="game-play-header"><h3>💣 지뢰찾기</h3></div>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 8, fontSize: 13 }}>
                우클릭으로 깃발 꽂기 | 지뢰: {MINES}개 | 열린 칸 수 × 5P + 200P
            </p>

            <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                gap: 2, maxWidth: 320, margin: '0 auto'
            }}>
                {board.map((row, r) =>
                    row.map((cell, c) => (
                        <div
                            key={`${r}-${c}`}
                            onClick={() => handleClick(r, c)}
                            onContextMenu={e => handleFlag(e, r, c)}
                            style={{
                                width: 36, height: 36, borderRadius: 6, display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                fontSize: cell.mine && cell.revealed ? 18 : 14,
                                fontWeight: 700, cursor: 'pointer',
                                background: cell.revealed
                                    ? (cell.mine ? '#E74C3C30' : 'var(--bg-secondary)')
                                    : 'var(--primary)',
                                color: cell.adjacent ? ADJ_COLORS[cell.adjacent] : 'inherit',
                                userSelect: 'none',
                            }}
                        >
                            {cell.flagged && !cell.revealed ? '🚩'
                                : cell.revealed && cell.mine ? '💣'
                                    : cell.revealed && cell.adjacent > 0 ? cell.adjacent
                                        : ''}
                        </div>
                    ))
                )}
            </div>

            {phase !== 'playing' && (
                <div className="fortune-result" style={{ marginTop: 16 }}>
                    <p className="fortune-text">{phase === 'win' ? '🎉 클리어!' : '💥 폭발!'}</p>
                    {phase === 'win' && (
                        <p className="fortune-points">+{200 + revealedCount * 5}P 획득!</p>
                    )}
                    <button className="game-retry-btn" onClick={reset}><RotateCcw size={16} /> 다시하기</button>
                </div>
            )}
        </div>
    );
}