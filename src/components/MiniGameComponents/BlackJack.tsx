import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// === TYPES ===

interface Card {
    suit: string;
    rank: string;
}

type GameState = 'betting' | 'playing' | 'dealer' | 'ended';

// === UTILITY FUNCTIONS ===

const suits = ['♠', '♥', '♦', '♣'];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const createDeck = (): Card[] => {
    const deck: Card[] = [];
    for (let suit of suits)
        for (let rank of ranks)
            deck.push({ suit, rank });
    return deck;
};

const shuffleDeck = (deck: Card[]): Card[] => {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

const getCardValue = (card: Card): number => {
    if (card.rank === 'A') return 11;
    if (['J', 'Q', 'K'].includes(card.rank)) return 10;
    return parseInt(card.rank);
};

const calculateScore = (hand: Card[]): number => {
    let score = 0;
    let aces = 0;
    for (let card of hand) {
        score += getCardValue(card);
        if (card.rank === 'A') aces++;
    }
    while (score > 21 && aces > 0) {
        score -= 10;
        aces--;
    }
    return score;
};

// === CARD COMPONENT ===

interface CardProps {
    card: Card;
    hidden: boolean;
    index: number;
}

const CardComponent: React.FC<CardProps> = ({ card, hidden, index }) => {
    const isRed = card.suit === '♥' || card.suit === '♦';

    return (
        <motion.div
            initial={{ rotateY: 180, x: -100, opacity: 0 }}
            animate={{ rotateY: 0, x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: index * 0.15, type: 'spring', stiffness: 120 }}
            className="card"
            style={{ '--card-color': isRed ? '#ef4444' : '#1e293b' } as React.CSSProperties}
        >
            {hidden ? (
                <div className="card-back">
                    <div className="card-pattern" />
                </div>
            ) : (
                <div className="card-front">
                    <div className="card-corner top-left">
                        <div className="rank">{card.rank}</div>
                        <div className="suit">{card.suit}</div>
                    </div>
                    <div className="card-center">
                        <div className="suit-large">{card.suit}</div>
                    </div>
                    <div className="card-corner bottom-right">
                        <div className="rank">{card.rank}</div>
                        <div className="suit">{card.suit}</div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

// === BETTING SECTION COMPONENT (갈튼 보드 스타일 참고) ===

interface BettingSectionProps {
    balance: number;
    betAmount: string;
    setBetAmount: (v: string) => void;
    betError: string;
    setBetError: (v: string) => void;
    onDeal: () => void;
}

const QUICK_BETS = [10, 50, 100, 500];

const BettingSection: React.FC<BettingSectionProps> = ({
    balance,
    betAmount,
    setBetAmount,
    betError,
    setBetError,
    onDeal,
}) => {
    const parsedBet = parseInt(betAmount) || 0;

    const handleQuickBet = (v: number | 'MAX') => {
        if (v === 'MAX') {
            setBetAmount(String(balance));
        } else {
            setBetAmount(String(Math.min(v, balance)));
        }
        setBetError('');
    };

    return (
        <div className="bet-section">
            <div className="bet-input-row">
                <input
                    type="number"
                    className="bet-input"
                    placeholder="베팅 금액 입력"
                    value={betAmount}
                    min={1}
                    max={balance}
                    onChange={(e) => {
                        setBetAmount(e.target.value);
                        setBetError('');
                    }}
                />
                <span className="bet-unit">P</span>
            </div>

            <div className="bet-quick-btns">
                {QUICK_BETS.map((v) => (
                    <button
                        key={v}
                        className="bet-quick-btn"
                        onClick={() => handleQuickBet(v)}
                        disabled={balance < v}
                    >
                        {v}P
                    </button>
                ))}
                <button
                    className="bet-quick-btn"
                    onClick={() => handleQuickBet('MAX')}
                    disabled={balance <= 0}
                >
                    MAX
                </button>
            </div>

            {betError && <p className="bet-error">{betError}</p>}

            <button
                className="btn btn-primary"
                style={{ marginTop: '1rem', width: '100%' }}
                onClick={onDeal}
                disabled={parsedBet <= 0 || parsedBet > balance}
            >
                <span>Deal Cards</span>
            </button>
        </div>
    );
};

// === MAIN APP ===

interface BlackjackGameProps {
    addPoints: (amount: number) => Promise<void>;
    currentPoints: number;
}

export default function BlackjackGame({ addPoints, currentPoints }: BlackjackGameProps) {
    const [deck, setDeck] = useState<Card[]>([]);
    const [playerHand, setPlayerHand] = useState<Card[]>([]);
    const [dealerHand, setDealerHand] = useState<Card[]>([]);
    const [gameState, setGameState] = useState<GameState>('betting');
    const [message, setMessage] = useState('Place your bet to start');
    const [dealerRevealed, setDealerRevealed] = useState(false);
    const [betAmount, setBetAmount] = useState('');
    const [currentBet, setCurrentBet] = useState(0);
    const [betError, setBetError] = useState('');

    const playerScore = calculateScore(playerHand);
    const dealerScore = calculateScore(dealerHand);

    const startGame = () => {
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
        addPoints(-bet); // 베팅 차감
        setCurrentBet(bet);

        const newDeck = shuffleDeck(createDeck());
        const player = [newDeck[0], newDeck[2]];
        const dealer = [newDeck[1], newDeck[3]];

        setDeck(newDeck.slice(4));
        setPlayerHand(player);
        setDealerHand(dealer);
        setGameState('playing');
        setMessage('Hit or Stand?');
        setDealerRevealed(false);

        setTimeout(() => {
            if (calculateScore(player) === 21) {
                setGameState('ended');
                setDealerRevealed(true);
                if (calculateScore(dealer) === 21) {
                    setMessage('Push! Both Blackjack');
                    addPoints(bet); // 베팅액 반환
                } else {
                    setMessage('🎉 Blackjack! You Win!');
                    addPoints(Math.floor(bet * 2.5)); // 블랙잭 지급
                }
            }
        }, 800);
    };

    const hit = () => {
        if (gameState !== 'playing') return;

        const newCard = deck[0];
        const newPlayerHand = [...playerHand, newCard];
        const newDeck = deck.slice(1);

        setPlayerHand(newPlayerHand);
        setDeck(newDeck);

        const newScore = calculateScore(newPlayerHand);
        if (newScore > 21) {
            setGameState('ended');
            setDealerRevealed(true);
            setMessage('💥 Bust! You Lose');
        } else if (newScore === 21) {
            stand(newPlayerHand, newDeck);
        }
    };

    const stand = (currentPlayerHand: Card[] = playerHand, currentDeck: Card[] = deck) => {
        if (gameState !== 'playing') return;

        setGameState('dealer');
        setDealerRevealed(true);
        setMessage('Dealer playing...');

        let currentDealerHand = [...dealerHand];
        let deckCopy = [...currentDeck];

        const dealerDraw = () => {
            const dealerCurrentScore = calculateScore(currentDealerHand);
            if (dealerCurrentScore < 17) {
                setTimeout(() => {
                    const newCard = deckCopy[0];
                    currentDealerHand = [...currentDealerHand, newCard];
                    deckCopy = deckCopy.slice(1);
                    setDealerHand([...currentDealerHand]);
                    setDeck([...deckCopy]);
                    dealerDraw();
                }, 800);
            } else {
                determineWinner(calculateScore(currentPlayerHand), dealerCurrentScore);
            }
        };

        dealerDraw();
    };

    const determineWinner = (playerFinal: number, dealerFinal: number) => {
        setGameState('ended');

        if (dealerFinal > 21) {
            setMessage('🎉 Dealer Bust! You Win!');
            addPoints(currentBet * 2);
        } else if (playerFinal > dealerFinal) {
            setMessage('🎉 You Win!');
            addPoints(currentBet * 2);
        } else if (playerFinal < dealerFinal) {
            setMessage('😔 Dealer Wins');
        } else {
            setMessage("🤝 Push - It's a Tie");
            addPoints(currentBet);
        }
    };

    const reset = () => {
        setPlayerHand([]);
        setDealerHand([]);
        setDeck([]);
        setGameState('betting');
        setMessage('Place your bet to start');
        setDealerRevealed(false);
        setBetAmount('');
        setCurrentBet(0);
        setBetError('');
    };

    return (
        <div className="blackjack-app">
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Rajdhani:wght@400;600;700&display=swap');

        .blackjack-app {
          background: #f5f5f5;
          color: #1a1a1a;
          padding: 1rem;
          font-family: 'Rajdhani', sans-serif;
          width: 100%;
          box-sizing: border-box;
        }

        .game-container { max-width: 480px; margin: 0 auto; }

        .header { text-align: center; margin-bottom: 0.75rem; }

        .title {
          font-family: 'Orbitron', sans-serif;
          font-size: clamp(1.4rem, 5vw, 2rem);
          font-weight: 900;
          color: #1a1a1a;
          letter-spacing: 0.05em;
          margin-bottom: 0.1rem;
        }

        .subtitle { font-size: 0.75rem; color: #888; letter-spacing: 0.2em; text-transform: uppercase; }

        .balance-display {
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          background: #1a1a1a; color: #fff;
          border-radius: 10px; padding: 0.5rem 1rem;
          margin-bottom: 0.75rem;
        }
        .balance-label { font-size: 0.75rem; color: #aaa; text-transform: uppercase; letter-spacing: 0.1em; }
        .balance-amount { font-family: 'Orbitron', sans-serif; font-size: 1.3rem; font-weight: 900; color: #fff; }

        .bet-section {
          background: #fff;
          border: 1.5px solid #e0e0e0;
          border-radius: 12px;
          padding: 0.875rem;
          margin-bottom: 0.75rem;
        }

        .bet-input-row { display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.6rem; }

        .bet-input {
          flex: 1;
          font-family: 'Orbitron', sans-serif;
          font-size: 1.1rem;
          font-weight: 700;
          padding: 0.5rem 0.75rem;
          background: #f8f8f8;
          border: 1.5px solid #ddd;
          border-radius: 8px;
          color: #1a1a1a;
          text-align: right;
        }

        .bet-input:focus { outline: none; border-color: #1a1a1a; }
        .bet-input::placeholder { color: #bbb; }
        .bet-unit { font-family: 'Orbitron', sans-serif; font-size: 1rem; font-weight: 700; color: #888; }

        .bet-quick-btns { display: flex; gap: 0.4rem; flex-wrap: wrap; }

        .bet-quick-btn {
          flex: 1;
          min-width: 48px;
          font-family: 'Rajdhani', sans-serif;
          font-size: 0.85rem;
          font-weight: 700;
          padding: 0.35rem 0.5rem;
          background: #f0f0f0;
          border: 1px solid #ddd;
          border-radius: 6px;
          color: #1a1a1a;
          cursor: pointer;
          transition: all 0.15s;
          touch-action: manipulation;
        }

        .bet-quick-btn:hover:not(:disabled) { background: #1a1a1a; color: #fff; border-color: #1a1a1a; }
        .bet-quick-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .bet-error { color: #e53e3e; font-size: 0.8rem; margin-top: 0.4rem; text-align: center; }

        .current-bet { text-align: center; margin-bottom: 0.5rem; }
        .current-bet-label { font-size: 0.75rem; color: #888; text-transform: uppercase; }
        .current-bet-amount { font-family: 'Orbitron', sans-serif; font-size: 1rem; font-weight: 700; color: #1a1a1a; }

        .table {
          background: #2d6a4f;
          border-radius: 16px;
          padding: 0.875rem;
          margin-bottom: 0.75rem;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }

        .hand-section { margin-bottom: 0.875rem; }
        .hand-section:last-child { margin-bottom: 0; }

        .hand-label {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 0.5rem;
          padding-bottom: 0.4rem;
          border-bottom: 1px solid rgba(255,255,255,0.15);
        }

        .label-text {
          font-family: 'Orbitron', sans-serif;
          font-size: 0.8rem;
          font-weight: 700;
          color: #fff;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .score {
          font-family: 'Orbitron', sans-serif;
          font-size: 1rem;
          font-weight: 900;
          color: #fff;
          background: rgba(255,255,255,0.15);
          padding: 0.2rem 0.6rem;
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.3);
          min-width: 40px;
          text-align: center;
        }

        .score.bust { color: #fca5a5; border-color: rgba(252,165,165,0.5); }
        .score.blackjack { background: rgba(255,215,0,0.25); border-color: rgba(255,215,0,0.7); color: #ffd700; animation: pulse 1s ease-in-out infinite; }

        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }

        .cards { display: flex; gap: 0.4rem; flex-wrap: wrap; justify-content: center; padding: 0.4rem 0; min-height: 80px; }

        .card { width: clamp(52px, 13vw, 72px); height: clamp(73px, 18vw, 100px); position: relative; flex-shrink: 0; }

        .card-front {
          width: 100%; height: 100%;
          border-radius: 7px;
          background: #fff;
          padding: 5px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          border: 1.5px solid var(--card-color);
          display: flex; flex-direction: column;
          color: var(--card-color);
        }

        .card-back {
          width: 100%; height: 100%;
          border-radius: 7px;
          background: #1a1a1a;
          border: 1.5px solid #444;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        }

        .card-pattern {
          width: 200%; height: 200%;
          background:
            repeating-linear-gradient(45deg, rgba(255,255,255,0.08) 0, rgba(255,255,255,0.08) 6px, transparent 6px, transparent 12px),
            repeating-linear-gradient(-45deg, rgba(255,255,255,0.08) 0, rgba(255,255,255,0.08) 6px, transparent 6px, transparent 12px);
        }

        .card-corner { font-family: 'Orbitron', sans-serif; font-weight: 700; line-height: 1; }
        .card-corner.top-left { display: flex; flex-direction: column; align-items: center; gap: 1px; }
        .card-corner.bottom-right { display: flex; flex-direction: column; align-items: center; gap: 1px; margin-top: auto; transform: rotate(180deg); }
        .rank { font-size: clamp(0.6rem, 2.5vw, 0.85rem); }
        .suit { font-size: clamp(0.55rem, 2vw, 0.75rem); }
        .card-center { flex: 1; display: flex; align-items: center; justify-content: center; }
        .suit-large { font-size: clamp(1.2rem, 4vw, 1.8rem); opacity: 0.12; }

        .status { text-align: center; padding: 0.6rem 0; }
        .message {
          font-family: 'Orbitron', sans-serif;
          font-size: clamp(0.9rem, 3.5vw, 1.2rem);
          font-weight: 700;
          color: #1a1a1a;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .controls { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }

        .btn {
          font-family: 'Orbitron', sans-serif;
          font-size: clamp(0.75rem, 2.5vw, 0.9rem);
          font-weight: 700;
          padding: 0.65rem 1.5rem;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          transition: all 0.2s ease;
          min-width: 100px;
          touch-action: manipulation;
        }

        .btn span { position: relative; z-index: 1; }

        .btn-primary { background: #1a1a1a; color: #fff; box-shadow: 0 3px 10px rgba(0,0,0,0.2); }
        .btn-primary:hover:not(:disabled) { background: #333; transform: translateY(-1px); }

        .btn-secondary { background: #e0e0e0; color: #1a1a1a; }
        .btn-secondary:hover:not(:disabled) { background: #ccc; transform: translateY(-1px); }

        .btn-danger { background: #e53e3e; color: #fff; }
        .btn-danger:hover:not(:disabled) { background: #c53030; transform: translateY(-1px); }

        .btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none !important; }

        @media (max-width: 360px) {
          .blackjack-app { padding: 0.6rem; }
          .bet-quick-btn { min-width: 40px; font-size: 0.78rem; }
          .btn { padding: 0.55rem 1rem; min-width: 80px; }
        }
      `}</style>

            <div className="game-container">
                <div className="header">
                    <h1 className="title">BLACKJACK</h1>
                    <p className="subtitle">Twenty-One</p>
                </div>

                {/* Balance */}
                <div className="balance-display">
                    <div className="balance-label">Balance</div>
                    <div className="balance-amount">{currentPoints}P</div>
                </div>

                {/* Betting Section */}
                {gameState === 'betting' && (
                    <BettingSection
                        balance={currentPoints}
                        betAmount={betAmount}
                        setBetAmount={setBetAmount}
                        betError={betError}
                        setBetError={setBetError}
                        onDeal={startGame}
                    />
                )}

                {/* Current Bet */}
                {gameState !== 'betting' && currentBet > 0 && (
                    <div className="current-bet">
                        <div className="current-bet-label">Current Bet</div>
                        <div className="current-bet-amount">{currentBet}P</div>
                    </div>
                )}

                {/* Table */}
                <div className="table">
                    {/* Dealer */}
                    <div className="hand-section">
                        <div className="hand-label">
                            <div className="label-text">Dealer</div>
                            {dealerHand.length > 0 && (
                                <div className={`score ${dealerRevealed && dealerScore > 21 ? 'bust' : ''} ${dealerRevealed && dealerScore === 21 && dealerHand.length === 2 ? 'blackjack' : ''}`}>
                                    {dealerRevealed ? dealerScore : '?'}
                                </div>
                            )}
                        </div>
                        <div className="cards">
                            <AnimatePresence>
                                {dealerHand.map((card, index) => (
                                    <CardComponent
                                        key={`dealer-${index}`}
                                        card={card}
                                        hidden={index === 1 && !dealerRevealed}
                                        index={index}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Player */}
                    <div className="hand-section">
                        <div className="hand-label">
                            <div className="label-text">Player</div>
                            {playerHand.length > 0 && (
                                <div className={`score ${playerScore > 21 ? 'bust' : ''} ${playerScore === 21 && playerHand.length === 2 ? 'blackjack' : ''}`}>
                                    {playerScore}
                                </div>
                            )}
                        </div>
                        <div className="cards">
                            <AnimatePresence>
                                {playerHand.map((card, index) => (
                                    <CardComponent
                                        key={`player-${index}`}
                                        card={card}
                                        hidden={false}
                                        index={index}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Status */}
                <div className="status">
                    <div className="message">{message}</div>
                </div>

                {/* Controls */}
                <div className="controls">
                    {gameState === 'playing' && (
                        <>
                            <button className="btn btn-primary" onClick={hit}>
                                <span>Hit</span>
                            </button>
                            <button className="btn btn-secondary" onClick={() => stand()}>
                                <span>Stand</span>
                            </button>
                        </>
                    )}
                    {gameState === 'ended' && (
                        <button className="btn btn-danger" onClick={reset}>
                            <span>New Game</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
