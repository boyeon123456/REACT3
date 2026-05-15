import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Hand, Play, ShieldCheck } from 'lucide-react';
import { formatPoints, getBetLimit, getQuickBetValues, getRiskLabel, validateBet } from './arcadeShared';
import { ArcadeActionBar, ArcadeButton, ArcadeGameShell, ArcadePanel, ArcadeResetButton, ArcadeResultCard } from './arcadeUi';

type Card = {
  suit: string;
  rank: string;
};

type GameState = 'betting' | 'playing' | 'dealer' | 'ended';
type ResultTone = 'win' | 'lose' | 'push' | 'blackjack' | null;

interface BlackjackGameProps {
  addPoints: (amount: number) => void | Promise<void>;
  currentPoints: number;
}

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const BLACKJACK_RISK = 'high' as const;

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

function shuffleDeck(deck: Card[]) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getCardValue(card: Card) {
  if (card.rank === 'A') return 11;
  if (['J', 'Q', 'K'].includes(card.rank)) return 10;
  return Number.parseInt(card.rank, 10);
}

function calculateScore(hand: Card[]) {
  let score = 0;
  let aces = 0;

  for (const card of hand) {
    score += getCardValue(card);
    if (card.rank === 'A') aces += 1;
  }

  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }

  return score;
}

function PlayingCard({ card, hidden }: { card?: Card; hidden?: boolean }) {
  if (hidden || !card) {
    return (
      <div className="modern-playing-card is-hidden">
        <strong>?</strong>
        <span>◆</span>
        <strong>?</strong>
      </div>
    );
  }

  const isRed = card.suit === '♥' || card.suit === '♦';

  return (
    <div className="modern-playing-card" style={{ '--card-color': isRed ? '#dc2626' : '#0f172a' } as CSSProperties}>
      <strong>{card.rank}</strong>
      <span>{card.suit}</span>
      <strong>{card.rank}</strong>
    </div>
  );
}

export default function BlackjackGame({ addPoints, currentPoints }: BlackjackGameProps) {
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [gameState, setGameState] = useState<GameState>('betting');
  const [dealerRevealed, setDealerRevealed] = useState(false);
  const [betAmount, setBetAmount] = useState('');
  const [currentBet, setCurrentBet] = useState(0);
  const [betError, setBetError] = useState('');
  const [message, setMessage] = useState('베팅 금액을 정하고 카드를 받으세요.');
  const [resultTone, setResultTone] = useState<ResultTone>(null);
  const [lastDelta, setLastDelta] = useState<number | undefined>(undefined);

  const playerScore = calculateScore(playerHand);
  const dealerScore = calculateScore(dealerHand);
  const maxBet = getBetLimit(currentPoints, BLACKJACK_RISK);
  const quickBets = useMemo(() => getQuickBetValues(currentPoints, maxBet), [currentPoints, maxBet]);
  const parsedBet = Number.parseInt(betAmount, 10) || 0;

  const pay = (amount: number) => {
    void addPoints(amount);
  };

  const finishRound = (tone: Exclude<ResultTone, null>, nextMessage: string, payout: number, stake = currentBet) => {
    if (payout > 0) pay(payout);
    setResultTone(tone);
    setLastDelta(payout - stake);
    setMessage(nextMessage);
    setGameState('ended');
    setDealerRevealed(true);
  };

  const startGame = () => {
    const validation = validateBet(betAmount, currentPoints, { max: maxBet });
    if (!validation.ok) {
      setBetError(validation.error);
      return;
    }

    const newDeck = shuffleDeck(createDeck());
    const player = [newDeck[0], newDeck[2]];
    const dealer = [newDeck[1], newDeck[3]];

    setBetError('');
    setCurrentBet(validation.bet);
    setDeck(newDeck.slice(4));
    setPlayerHand(player);
    setDealerHand(dealer);
    setGameState('playing');
    setDealerRevealed(false);
    setResultTone(null);
    setLastDelta(undefined);
    setMessage('카드를 더 받을지 멈출지 선택하세요.');
    pay(-validation.bet);

    window.setTimeout(() => {
      const playerBlackjack = calculateScore(player) === 21;
      const dealerBlackjack = calculateScore(dealer) === 21;
      if (!playerBlackjack) return;

      if (dealerBlackjack) {
        finishRound('push', '둘 다 블랙잭입니다. 베팅금을 돌려받았어요.', validation.bet, validation.bet);
      } else {
        finishRound('blackjack', '블랙잭. 2.5배 보상을 획득했습니다.', Math.floor(validation.bet * 2.5), validation.bet);
      }
    }, 550);
  };

  const hit = () => {
    if (gameState !== 'playing' || deck.length === 0) return;

    const nextCard = deck[0];
    const nextPlayerHand = [...playerHand, nextCard];
    const nextDeck = deck.slice(1);
    const nextScore = calculateScore(nextPlayerHand);

    setPlayerHand(nextPlayerHand);
    setDeck(nextDeck);

    if (nextScore > 21) {
      finishRound('lose', '버스트. 21을 넘겼습니다.', 0);
    } else if (nextScore === 21) {
      stand(nextPlayerHand, nextDeck);
    }
  };

  const stand = (currentPlayerHand = playerHand, currentDeck = deck) => {
    if (gameState !== 'playing') return;

    setGameState('dealer');
    setDealerRevealed(true);
    setMessage('딜러가 17 이상이 될 때까지 카드를 받습니다.');

    let nextDealerHand = [...dealerHand];
    let nextDeck = [...currentDeck];

    const drawDealer = () => {
      const score = calculateScore(nextDealerHand);
      if (score < 17 && nextDeck.length > 0) {
        window.setTimeout(() => {
          nextDealerHand = [...nextDealerHand, nextDeck[0]];
          nextDeck = nextDeck.slice(1);
          setDealerHand(nextDealerHand);
          setDeck(nextDeck);
          drawDealer();
        }, 520);
        return;
      }

      const finalPlayer = calculateScore(currentPlayerHand);
      const finalDealer = calculateScore(nextDealerHand);

      if (finalDealer > 21 || finalPlayer > finalDealer) {
        finishRound('win', finalDealer > 21 ? '딜러 버스트. 승리했습니다.' : '플레이어 승리입니다.', currentBet * 2);
      } else if (finalPlayer < finalDealer) {
        finishRound('lose', '딜러가 더 높은 점수입니다.', 0);
      } else {
        finishRound('push', '무승부. 베팅금을 돌려받았습니다.', currentBet);
      }
    };

    drawDealer();
  };

  const reset = () => {
    setDeck([]);
    setPlayerHand([]);
    setDealerHand([]);
    setGameState('betting');
    setDealerRevealed(false);
    setBetAmount('');
    setCurrentBet(0);
    setBetError('');
    setMessage('베팅 금액을 정하고 카드를 받으세요.');
    setResultTone(null);
    setLastDelta(undefined);
  };

  return (
    <ArcadeGameShell
      title="블랙잭"
      subtitle="21에 가깝게 만들되 넘기지 않는 카드 승부입니다."
      stats={[
        { label: '보유 포인트', value: formatPoints(currentPoints) },
        { label: '최대 베팅', value: formatPoints(maxBet), tone: 'warning' },
        { label: '위험도', value: getRiskLabel(BLACKJACK_RISK) },
      ]}
    >
      <ArcadePanel>
        {gameState === 'betting' && (
          <>
            <div className="arcade-modern-input-row">
              <input
                type="number"
                className="arcade-modern-input"
                placeholder="베팅 금액"
                value={betAmount}
                min={1}
                max={maxBet}
                onChange={(event) => {
                  setBetAmount(event.target.value);
                  setBetError('');
                }}
              />
              <span className="bet-unit">P</span>
            </div>

            <div className="bet-quick-btns">
              {quickBets.map((value) => (
                <button key={value} type="button" className="bet-quick-btn" onClick={() => setBetAmount(String(value))}>
                  {formatPoints(value)}
                </button>
              ))}
            </div>

            {betError && <p className="arcade-modern-error">{betError}</p>}

            <ArcadeActionBar>
              <ArcadeButton onClick={startGame} disabled={!parsedBet || parsedBet > maxBet}>
                <Play size={16} />
                카드 받기
              </ArcadeButton>
            </ArcadeActionBar>
          </>
        )}

        {gameState !== 'betting' && (
          <>
            <div className="game-pill-row">
              <span className="game-pill">베팅 {formatPoints(currentBet)}</span>
              <span className="game-pill">플레이어 {playerScore}</span>
              <span className="game-pill">딜러 {dealerRevealed ? dealerScore : '?'}</span>
            </div>

            <div className="modern-blackjack-table">
              <div className="modern-blackjack-hand">
                <div className="modern-blackjack-hand-head">
                  <span>딜러</span>
                  <span className="modern-blackjack-score">{dealerRevealed ? dealerScore : '?'}</span>
                </div>
                <div className="modern-blackjack-cards">
                  {dealerHand.map((card, index) => (
                    <PlayingCard key={`dealer-${index}`} card={card} hidden={index === 1 && !dealerRevealed} />
                  ))}
                </div>
              </div>

              <div className="modern-blackjack-hand">
                <div className="modern-blackjack-hand-head">
                  <span>플레이어</span>
                  <span className="modern-blackjack-score">{playerScore}</span>
                </div>
                <div className="modern-blackjack-cards">
                  {playerHand.map((card, index) => (
                    <PlayingCard key={`player-${index}`} card={card} />
                  ))}
                </div>
              </div>
            </div>

            <p className="arcade-modern-helper">{message}</p>

            {gameState === 'playing' && (
              <ArcadeActionBar>
                <ArcadeButton onClick={hit}>
                  <Hand size={16} />
                  한 장 더
                </ArcadeButton>
                <ArcadeButton variant="secondary" onClick={() => stand()}>
                  <ShieldCheck size={16} />
                  멈추기
                </ArcadeButton>
              </ArcadeActionBar>
            )}
          </>
        )}
      </ArcadePanel>

      {gameState === 'ended' && (
        <>
          <ArcadeResultCard
            title={resultTone === 'blackjack' ? '블랙잭' : resultTone === 'win' ? '승리' : resultTone === 'push' ? '무승부' : '패배'}
            delta={lastDelta ?? 0}
            message={message}
          />
          <ArcadeResetButton onClick={reset} label="새 판 시작" />
        </>
      )}
    </ArcadeGameShell>
  );
}
