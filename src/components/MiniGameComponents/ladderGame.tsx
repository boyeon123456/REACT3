import { useEffect, useRef, useState } from 'react';
import { formatDelta, formatPoints } from './arcadeShared';
import { ArcadeChoiceButton, ArcadeChoiceGrid, ArcadeGameShell, ArcadePanel, ArcadeResetButton, ArcadeResultCard } from './arcadeUi';

interface Props {
  addPoints: (p: number) => void;
}

const COLS = 4;
const ROWS = 8;
const PRIZES = [-50, 80, 180, 420];

function generateLadder() {
  const rungs: boolean[][] = Array.from({ length: ROWS }, () => Array.from({ length: COLS - 1 }, () => false));
  for (let row = 0; row < ROWS; row += 1) {
    let col = 0;
    while (col < COLS - 1) {
      if (Math.random() > 0.58) {
        rungs[row][col] = true;
        col += 2;
      } else {
        col += 1;
      }
    }
  }
  return rungs;
}

function tracePath(start: number, rungs: boolean[][]): number[] {
  const path = [start];
  let col = start;
  for (let row = 0; row < ROWS; row += 1) {
    if (col > 0 && rungs[row][col - 1]) col -= 1;
    else if (col < COLS - 1 && rungs[row][col]) col += 1;
    path.push(col);
  }
  return path;
}

function createPrizeSet() {
  return [...PRIZES].sort(() => Math.random() - 0.5);
}

export default function LadderGame({ addPoints }: Props) {
  const [rungs, setRungs] = useState(generateLadder);
  const [prizes, setPrizes] = useState(createPrizeSet);
  const [phase, setPhase] = useState<'pick' | 'animate' | 'result'>('pick');
  const [chosen, setChosen] = useState<number | null>(null);
  const [path, setPath] = useState<number[]>([]);
  const [animStep, setAnimStep] = useState(0);
  const [finalCol, setFinalCol] = useState<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const width = 340;
  const height = 300;
  const colX = (col: number) => 36 + col * ((width - 72) / (COLS - 1));
  const rowY = (row: number) => 24 + row * ((height - 48) / ROWS);
  const result = finalCol === null ? 0 : prizes[finalCol];

  const reset = () => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    setRungs(generateLadder());
    setPrizes(createPrizeSet());
    setPhase('pick');
    setChosen(null);
    setPath([]);
    setAnimStep(0);
    setFinalCol(null);
  };

  const start = (col: number) => {
    const nextPath = tracePath(col, rungs);
    setChosen(col);
    setPath(nextPath);
    setAnimStep(0);
    setFinalCol(null);
    setPhase('animate');
  };

  useEffect(() => {
    if (phase !== 'animate') return undefined;

    intervalRef.current = window.setInterval(() => {
      setAnimStep((prev) => {
        if (prev >= path.length - 1) {
          if (intervalRef.current) window.clearInterval(intervalRef.current);
          const nextFinalCol = path[path.length - 1];
          setFinalCol(nextFinalCol);
          addPoints(prizes[nextFinalCol]);
          setPhase('result');
          return prev;
        }
        return prev + 1;
      });
    }, 210);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [addPoints, path, phase, prizes]);

  return (
    <ArcadeGameShell
      title="사다리 타기"
      subtitle="출발 번호를 고르면 경로를 따라 결과까지 내려갑니다."
      stats={[
        { label: '출발', value: chosen === null ? '-' : `${chosen + 1}번` },
        { label: '최대 보상', value: formatPoints(420), tone: 'positive' },
        { label: '상태', value: phase === 'pick' ? '선택 대기' : phase === 'animate' ? '이동 중' : '결과' },
      ]}
    >
      <ArcadePanel>
        <ArcadeChoiceGrid columns="four">
          {Array.from({ length: COLS }).map((_, index) => (
            <ArcadeChoiceButton key={index} onClick={() => start(index)} selected={chosen === index} disabled={phase !== 'pick'}>
              <strong>{index + 1}번</strong>
              <span>출발 선택</span>
            </ArcadeChoiceButton>
          ))}
        </ArcadeChoiceGrid>

        <div className="modern-ladder-wrap">
          <svg className="modern-ladder-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="사다리 경로">
            {Array.from({ length: COLS }).map((_, col) => (
              <line key={col} x1={colX(col)} y1={rowY(0)} x2={colX(col)} y2={rowY(ROWS)} stroke="#94a3b8" strokeWidth={3} strokeLinecap="round" />
            ))}
            {rungs.map((row, rowIndex) =>
              row.map((hasRung, col) =>
                hasRung ? (
                  <line
                    key={`${rowIndex}-${col}`}
                    x1={colX(col)}
                    y1={rowY(rowIndex) + (height - 48) / ROWS / 2}
                    x2={colX(col + 1)}
                    y2={rowY(rowIndex) + (height - 48) / ROWS / 2}
                    stroke="#94a3b8"
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                ) : null
              )
            )}
            {phase !== 'pick' &&
              path.slice(0, animStep + 1).map((col, index) => {
                if (index === 0) return null;
                const prevCol = path[index - 1];
                const row = index - 1;
                const midY = rowY(row) + (height - 48) / ROWS / 2;
                return prevCol !== col ? (
                  <g key={index}>
                    <line x1={colX(prevCol)} y1={rowY(row)} x2={colX(prevCol)} y2={midY} stroke="#2563eb" strokeWidth={5} strokeLinecap="round" />
                    <line x1={colX(prevCol)} y1={midY} x2={colX(col)} y2={midY} stroke="#2563eb" strokeWidth={5} strokeLinecap="round" />
                    <line x1={colX(col)} y1={midY} x2={colX(col)} y2={rowY(row + 1)} stroke="#2563eb" strokeWidth={5} strokeLinecap="round" />
                  </g>
                ) : (
                  <line key={index} x1={colX(col)} y1={rowY(row)} x2={colX(col)} y2={rowY(row + 1)} stroke="#2563eb" strokeWidth={5} strokeLinecap="round" />
                );
              })}
            {phase !== 'pick' && <circle cx={colX(path[Math.min(animStep, path.length - 1)])} cy={rowY(Math.min(animStep, ROWS))} r={8} fill="#2563eb" />}
          </svg>
        </div>

        <ArcadeChoiceGrid columns="four">
          {prizes.map((prize, index) => (
            <ArcadeChoiceButton key={`${prize}-${index}`} selected={finalCol === index} tone={prize > 0 ? 'positive' : 'negative'} disabled>
              <strong>{formatDelta(prize)}</strong>
              <span>도착 {index + 1}</span>
            </ArcadeChoiceButton>
          ))}
        </ArcadeChoiceGrid>
      </ArcadePanel>

      {phase === 'result' && (
        <>
          <ArcadeResultCard title={result > 0 ? '좋은 도착지' : '아쉬운 도착지'} delta={result} message="새 판을 시작하면 사다리와 보상이 다시 섞입니다." />
          <ArcadeResetButton onClick={reset} />
        </>
      )}
    </ArcadeGameShell>
  );
}
