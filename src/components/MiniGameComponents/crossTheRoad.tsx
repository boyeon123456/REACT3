import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw, Sparkles } from 'lucide-react';
import { formatDelta, formatPoints, type ArcadeSessionReporter } from './arcadeShared';

interface Props {
  addPoints: (p: number) => void;
  onSessionChange?: ArcadeSessionReporter;
}

const COLS = 7;
const ROWS = 9;
const TARGET_CLEARS = 4;
const START_ROW = ROWS - 1;
const START_COL = Math.floor(COLS / 2);
const CAR_ROWS = [1, 2, 3, 4, 5, 6, 7];

type Phase = 'idle' | 'playing' | 'resolving' | 'result';
type Car = { row: number; col: number; dir: 1 | -1; speed: number };

function createCars(stage: number): Car[] {
  return CAR_ROWS.map((row, index) => ({
    row,
    col: Math.floor(Math.random() * COLS),
    dir: index % 2 === 0 ? 1 : -1,
    speed: 0.55 + Math.random() * 0.45 + stage * 0.08,
  }));
}

function getStageReward(stage: number) {
  return 45 + stage * 35;
}

export default function CrossTheRoad({ addPoints, onSessionChange }: Props) {
  const [playerRow, setPlayerRow] = useState(START_ROW);
  const [playerCol, setPlayerCol] = useState(START_COL);
  const [cars, setCars] = useState<Car[]>(() => createCars(1));
  const [phase, setPhase] = useState<Phase>('idle');
  const [clears, setClears] = useState(0);
  const [stage, setStage] = useState(1);
  const [lastReward, setLastReward] = useState(0);
  const [totalReward, setTotalReward] = useState(0);
  const [resultMessage, setResultMessage] = useState('출발 준비 완료');
  const resolvingRef = useRef(false);

  const move = useCallback(
    (dr: number, dc: number) => {
      if (phase !== 'playing') return;

      setPlayerRow((row) => Math.max(0, Math.min(ROWS - 1, row + dr)));
      setPlayerCol((col) => Math.max(0, Math.min(COLS - 1, col + dc)));
    },
    [phase]
  );

  const resetBoardPosition = () => {
    setPlayerRow(START_ROW);
    setPlayerCol(START_COL);
  };

  const startRun = useCallback(() => {
    resolvingRef.current = false;
    resetBoardPosition();
    setStage(1);
    setClears(0);
    setCars(createCars(1));
    setLastReward(0);
    setTotalReward(0);
    setResultMessage('차선을 읽으면서 네 번 건너면 클리어예요.');
    setPhase('playing');
  }, []);

  const reset = useCallback(() => {
    resolvingRef.current = false;
    resetBoardPosition();
    setCars(createCars(1));
    setPhase('idle');
    setClears(0);
    setStage(1);
    setLastReward(0);
    setTotalReward(0);
    setResultMessage('출발 준비 완료');
  }, []);

  useEffect(() => {
    onSessionChange?.({
      phase,
      statusLabel:
        phase === 'idle'
          ? '출발 준비'
          : phase === 'playing'
            ? `${stage} 스테이지`
            : phase === 'resolving'
              ? '판정 중'
              : totalReward > 0
                ? '클리어 결과'
                : '충돌 종료',
      progressLabel: phase === 'playing' ? `${clears} / ${TARGET_CLEARS} 클리어` : `누적 ${formatPoints(totalReward)}`,
      recentDelta: phase === 'result' ? totalReward : undefined,
      recentMessage: resultMessage,
      tone: phase === 'result' ? (totalReward > 0 ? 'positive' : 'negative') : 'neutral',
    });
  }, [clears, onSessionChange, phase, resultMessage, stage, totalReward]);

  useEffect(() => {
    if (phase !== 'playing') return;

    const interval = window.setInterval(() => {
      setCars((prev) =>
        prev.map((car) => ({
          ...car,
          col: (car.col + car.dir * car.speed + COLS) % COLS,
        }))
      );
    }, 260);

    return () => window.clearInterval(interval);
  }, [phase, stage]);

  useEffect(() => {
    if (phase !== 'playing' || resolvingRef.current) return;

    const hit = cars.some((car) => car.row === playerRow && Math.abs(car.col - playerCol) < 0.45);
    if (hit) {
      resolvingRef.current = true;
      window.setTimeout(() => {
        setPhase('resolving');
        setResultMessage('차량과 부딪혔어요. 조금 더 느리게 보고 들어가면 안전합니다.');
        window.setTimeout(() => {
          setPhase('result');
        }, 450);
      }, 0);
      return;
    }

    if (playerRow !== 0) return;

    resolvingRef.current = true;
    const reward = getStageReward(stage);
    const nextClears = clears + 1;
    const nextTotal = totalReward + reward;

    window.setTimeout(() => {
      setPhase('resolving');
      setResultMessage(`${stage} 스테이지 돌파! ${formatPoints(reward)} 확보.`);

      window.setTimeout(() => {
        addPoints(reward);
        setLastReward(reward);
        setTotalReward(nextTotal);
        setClears(nextClears);

        if (nextClears >= TARGET_CLEARS) {
          const finalBonus = 120;
          addPoints(finalBonus);
          setLastReward(reward + finalBonus);
          setTotalReward(nextTotal + finalBonus);
          setResultMessage(`완주 성공! 마지막 보너스 ${formatPoints(finalBonus)}까지 획득했어요.`);
          setPhase('result');
        } else {
          const nextStage = stage + 1;
          setStage(nextStage);
          setCars(createCars(nextStage));
          resetBoardPosition();
          setPhase('playing');
          resolvingRef.current = false;
        }
      }, 360);
    }, 0);
  }, [addPoints, cars, clears, phase, playerCol, playerRow, stage, totalReward]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (phase === 'idle' && event.key === 'Enter') {
        event.preventDefault();
        startRun();
        return;
      }

      if (phase !== 'playing' || !event.key.startsWith('Arrow')) return;

      event.preventDefault();

      if (event.key === 'ArrowUp') move(-1, 0);
      if (event.key === 'ArrowDown') move(1, 0);
      if (event.key === 'ArrowLeft') move(0, -1);
      if (event.key === 'ArrowRight') move(0, 1);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [move, phase, startRun]);

  const gridCells = useMemo(
    () =>
      Array.from({ length: ROWS * COLS }, (_, index) => {
        const row = Math.floor(index / COLS);
        const col = index % COLS;
        const isGoal = row === 0;
        const isStart = row === START_ROW;
        const isPlayer = row === playerRow && col === playerCol;
        const car = cars.find((entry) => entry.row === row && Math.round(entry.col) === col);

        return {
          key: `${row}-${col}`,
          row,
          col,
          isGoal,
          isStart,
          isPlayer,
          carDir: car?.dir ?? null,
          hasCar: Boolean(car),
        };
      }),
    [cars, playerCol, playerRow]
  );

  return (
    <div className="game-play-area arcade-game cross-road-game">
      <div className="game-play-header">
        <h3>길 건너기</h3>
      </div>

      <div className="cross-road-shell">
        <div className="game-pill-row">
          <span className="game-pill">클리어 {clears} / {TARGET_CLEARS}</span>
          <span className="game-pill">현재 스테이지 {stage}</span>
          <span className="game-pill">최근 확보 {formatPoints(lastReward)}</span>
        </div>

        <p className="game-note">
          화살표 키 또는 화면 버튼으로 이동합니다. 한 번 건널 때마다 차가 빨라지고 보상도 커져요.
        </p>

        <div className="cross-road-scorebar">
          <div>
            <span>누적 보상</span>
            <strong>{formatPoints(totalReward)}</strong>
          </div>
          <div>
            <span>현재 상태</span>
            <strong>{phase === 'playing' ? 'RUN' : phase === 'resolving' ? 'CHECK' : 'READY'}</strong>
          </div>
          <div>
            <span>다음 보상</span>
            <strong>{formatPoints(getStageReward(stage))}</strong>
          </div>
        </div>

        <div className="cross-road-board" role="grid" aria-label="길 건너기 보드">
          {gridCells.map((cell) => (
            <div
              key={cell.key}
              className={[
                'cross-road-cell',
                cell.isGoal ? 'is-goal' : '',
                cell.isStart ? 'is-start' : '',
                cell.isPlayer ? 'is-player' : '',
                cell.hasCar ? 'has-car' : '',
              ].join(' ')}
            >
              {cell.hasCar && <span className={`cross-road-car ${cell.carDir === -1 ? 'is-left' : ''}`}>🚗</span>}
              {cell.isPlayer && <span className="cross-road-player">🧍</span>}
              {!cell.isPlayer && cell.isGoal && <span className="cross-road-label">GOAL</span>}
              {!cell.isPlayer && cell.isStart && <span className="cross-road-label">START</span>}
            </div>
          ))}
        </div>

        {phase === 'idle' ? (
          <button className="game-start-btn" onClick={startRun}>
            레이스 시작
          </button>
        ) : (
          <div className="cross-road-controls" aria-label="이동 버튼">
            <button type="button" className="cross-road-control up" onClick={() => move(-1, 0)} disabled={phase !== 'playing'}>
              <ArrowUp size={18} />
            </button>
            <button type="button" className="cross-road-control left" onClick={() => move(0, -1)} disabled={phase !== 'playing'}>
              <ArrowLeft size={18} />
            </button>
            <button type="button" className="cross-road-control down" onClick={() => move(1, 0)} disabled={phase !== 'playing'}>
              <ArrowDown size={18} />
            </button>
            <button type="button" className="cross-road-control right" onClick={() => move(0, 1)} disabled={phase !== 'playing'}>
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        <p className="game-status-copy">{resultMessage}</p>
      </div>

      {phase === 'result' && (
        <div className="game-result-card arcade-result-card">
          <div className="result-badge">
            <Sparkles size={16} />
            {totalReward > 0 ? '완주 결과' : '충돌 종료'}
          </div>
          <p className="fortune-text">{resultMessage}</p>
          <p className={`result-amount ${totalReward > 0 ? 'is-positive' : 'is-negative'}`}>{formatDelta(totalReward)}</p>
          <p className="result-subcopy">4스테이지 완주 시 추가 보너스 120P가 붙습니다.</p>
          <button type="button" className="game-retry-btn" onClick={reset}>
            <RotateCcw size={16} /> 다시 하기
          </button>
        </div>
      )}
    </div>
  );
}
