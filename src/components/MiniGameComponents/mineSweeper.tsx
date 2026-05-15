import { useState, useEffect, useCallback, useRef, type MouseEvent } from 'react';
import { RotateCcw, Flag, Clock, Trophy, ChevronDown } from 'lucide-react';

interface Props {
  addPoints: (p: number) => void;
}

type Difficulty = 'easy' | 'normal' | 'hard';

const DIFFICULTIES: Record<Difficulty, { rows: number; cols: number; mines: number; label: string; emoji: string }> = {
  easy: { rows: 8, cols: 8, mines: 8, label: '쉬움', emoji: '🌼' },
  normal: { rows: 8, cols: 8, mines: 10, label: '보통', emoji: '🧭' },
  hard: { rows: 10, cols: 10, mines: 20, label: '어려움', emoji: '🔥' },
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
    if (!board[r][c].mine) {
      board[r][c].mine = true;
      placed += 1;
    }
  }
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (board[r][c].mine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].mine) count += 1;
        }
      }
      board[r][c].adjacent = count;
    }
  }
  return board;
}

function revealCells(board: Cell[][], r: number, c: number, rows: number, cols: number): Cell[][] {
  const next = board.map((row) => row.map((cell) => ({ ...cell })));
  const stack = [[r, c]];
  while (stack.length) {
    const [cr, cc] = stack.pop()!;
    if (cr < 0 || cr >= rows || cc < 0 || cc >= cols) continue;
    if (next[cr][cc].revealed || next[cr][cc].flagged) continue;
    next[cr][cc].revealed = true;
    if (next[cr][cc].adjacent === 0 && !next[cr][cc].mine) {
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          stack.push([cr + dr, cc + dc]);
        }
      }
    }
  }
  return next;
}

function ensureSafeStart(board: Cell[][], r: number, c: number, rows: number, cols: number, mines: number): Cell[][] {
  const safeZone = new Set<string>();
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      safeZone.add(`${r + dr},${c + dc}`);
    }
  }

  let attempts = 0;
  while (attempts < 100) {
    const nextBoard = createBoard(rows, cols, mines);
    const conflict = [...safeZone].some((key) => {
      const [nr, nc] = key.split(',').map(Number);
      return nr >= 0 && nr < rows && nc >= 0 && nc < cols && nextBoard[nr][nc].mine;
    });
    if (!conflict) return nextBoard;
    attempts += 1;
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

  const countRevealed = (nextBoard: Cell[][]) => nextBoard.flat().filter((cell) => cell.revealed && !cell.mine).length;
  const countFlagged = (nextBoard: Cell[][]) => nextBoard.flat().filter((cell) => cell.flagged).length;

  useEffect(() => {
    if (phase === 'playing') {
      timerRef.current = setInterval(() => setElapsed((value) => value + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
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

  const handleClick = (r: number, c: number) => {
    if (phase === 'win' || phase === 'lose') return;
    const cell = board[r][c];
    if (cell.revealed || cell.flagged) return;

    let currentBoard = board;
    if (firstClick) {
      currentBoard = ensureSafeStart(board, r, c, rows, cols, mines);
      setFirstClick(false);
      setPhase('playing');
    }

    if (currentBoard[r][c].mine) {
      const nextBoard = currentBoard.map((row) => row.map((entry) => ({ ...entry, revealed: true })));
      setBoard(nextBoard);
      setExplodedCell([r, c]);
      setPhase('lose');
      return;
    }

    const nextBoard = revealCells(currentBoard, r, c, rows, cols);
    const nowRevealed = countRevealed(nextBoard);

    const newly = new Set<string>();
    for (let nr = 0; nr < rows; nr += 1) {
      for (let nc = 0; nc < cols; nc += 1) {
        if (!currentBoard[nr][nc].revealed && nextBoard[nr][nc].revealed) newly.add(`${nr}-${nc}`);
      }
    }
    setNewlyRevealed(newly);
    setTimeout(() => setNewlyRevealed(new Set()), 400);

    setBoard(nextBoard);
    setFlagCount(countFlagged(nextBoard));

    if (nowRevealed === safeCount) {
      const bonus = difficulty === 'easy' ? 100 : difficulty === 'normal' ? 200 : 400;
      const timeBonus = Math.max(0, 300 - elapsed) * 2;
      addPoints(bonus + nowRevealed * 5 + timeBonus);
      setPhase('win');
    }
  };

  const handleFlag = (e: MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (phase === 'win' || phase === 'lose' || phase === 'idle') return;
    if (board[r][c].revealed) return;
    const nextBoard = board.map((row) => row.map((cell) => ({ ...cell })));
    nextBoard[r][c].flagged = !nextBoard[r][c].flagged;
    setBoard(nextBoard);
    setFlagCount(countFlagged(nextBoard));
  };

  const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const cellSize = cols <= 8 ? 36 : 30;
  const revealed = countRevealed(board);
  const diff = DIFFICULTIES[difficulty];

  return (
    <div style={{ fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif", padding: '0 4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
          {diff.emoji} 지뢰찾기
        </h3>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowDiffMenu((value) => !value)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '5px 10px',
              borderRadius: 8,
              border: '1.5px solid var(--border-light)',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {diff.label} <ChevronDown size={13} />
          </button>
          {showDiffMenu && (
            <div
              style={{
                position: 'absolute',
                top: '110%',
                right: 0,
                zIndex: 99,
                background: 'var(--bg-card)',
                border: '1.5px solid var(--border-light)',
                borderRadius: 10,
                overflow: 'hidden',
                minWidth: 110,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              }}
            >
              {(Object.entries(DIFFICULTIES) as [Difficulty, typeof diff][]).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => {
                    setDifficulty(key);
                    setBoard(createBoard(value.rows, value.cols, value.mines));
                    setPhase('idle');
                    setFirstClick(true);
                    setFlagCount(0);
                    setElapsed(0);
                    setExplodedCell(null);
                    setNewlyRevealed(new Set());
                    setShowDiffMenu(false);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '9px 14px',
                    border: 'none',
                    cursor: 'pointer',
                    background: key === difficulty ? 'var(--primary)' : 'transparent',
                    color: key === difficulty ? '#fff' : 'var(--text-main)',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {value.emoji} {value.label}
                  <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 6 }}>{value.mines}개</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          borderRadius: 10,
          background: 'var(--bg-card)',
          marginBottom: 12,
          fontSize: 13,
          fontWeight: 600,
        }}
      >
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

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`, gap: 3, margin: '0 auto', width: 'fit-content' }}>
        {board.map((row, r) =>
          row.map((cell, c) => {
            const isExploded = explodedCell?.[0] === r && explodedCell?.[1] === c;
            const isNew = newlyRevealed.has(`${r}-${c}`);
            const isMineRevealed = cell.mine && cell.revealed;

            let bg = 'var(--primary)';
            if (cell.revealed) {
              bg = isMineRevealed ? (isExploded ? '#EF4444' : '#7f1d1d30') : 'var(--bg-card)';
            }

            return (
              <div
                key={`${r}-${c}`}
                onClick={() => handleClick(r, c)}
                onContextMenu={(e) => handleFlag(e, r, c)}
                title="우클릭으로 깃발 표시"
                style={{
                  width: cellSize,
                  height: cellSize,
                  borderRadius: 7,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isMineRevealed ? 16 : cell.flagged ? 15 : 13,
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
                {cell.flagged && !cell.revealed ? '🚩' : cell.revealed && cell.mine ? '💣' : cell.revealed && cell.adjacent > 0 ? cell.adjacent : ''}
              </div>
            );
          })
        )}
      </div>

      {(phase === 'win' || phase === 'lose') && (
        <div
          style={{
            marginTop: 16,
            textAlign: 'center',
            padding: '16px',
            borderRadius: 14,
            background: phase === 'win' ? '#064e3b20' : '#7f1d1d20',
            border: `1.5px solid ${phase === 'win' ? '#34D399' : '#F87171'}`,
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 4 }}>{phase === 'win' ? '🏆' : '💥'}</div>
          <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 16 }}>{phase === 'win' ? '클리어!' : '게임 오버'}</p>
          {phase === 'win' && (() => {
            const bonus = difficulty === 'easy' ? 100 : difficulty === 'normal' ? 200 : 400;
            const timeBonus = Math.max(0, 300 - elapsed) * 2;
            const total = bonus + revealed * 5 + timeBonus;
            return (
              <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 10 }}>
                <span>기본 {bonus}P</span>
                <span style={{ margin: '0 6px', opacity: 0.4 }}>+</span>
                <span>안전 칸 {revealed * 5}P</span>
                <span style={{ margin: '0 6px', opacity: 0.4 }}>+</span>
                <span>시간 보너스 {timeBonus}P</span>
                <div style={{ fontWeight: 800, fontSize: 17, color: '#34D399', marginTop: 4 }}>
                  <Trophy size={14} style={{ display: 'inline', marginRight: 4 }} />
                  총 +{total}P
                </div>
              </div>
            );
          })()}
          {phase === 'lose' && <p style={{ fontSize: 13, opacity: 0.7, margin: '0 0 10px' }}>{formatTime(elapsed)} 만에 지뢰를 밟았어요.</p>}
          <button
            onClick={reset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 18px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--primary)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={15} /> 다시 하기
          </button>
        </div>
      )}

      {phase === 'idle' && <p style={{ textAlign: 'center', fontSize: 12, opacity: 0.6, marginTop: 12 }}>왼쪽 클릭으로 열고, 우클릭으로 깃발을 꽂을 수 있어요.</p>}
    </div>
  );
}
