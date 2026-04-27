// src/components/games/Gatcha.tsx
import { useState, useEffect } from 'react';
import { RotateCcw, TrendingUp } from 'lucide-react';

interface Props {
    addPoints: (p: number) => void;
    currentPoints: number;
}

const COST = 50;

/* ───────── 도형 SVG ───────── */
const ShapeIcon = ({ grade, size = 28 }: { grade: string; size?: number }) => {
    switch (grade) {
        case 'SSR':
            return (
                <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
                    <polygon
                        points="14,2 16.8,10.2 25,10.2 18.6,15.4 21,23.5 14,18.8 7,23.5 9.4,15.4 3,10.2 11.2,10.2"
                        fill="#E89B2A" stroke="#C47D10" strokeWidth="0.8"
                    />
                </svg>
            );
        case 'SR':
            return (
                <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
                    <polygon points="14,2 26,14 14,26 2,14"
                        fill="#8B6FD4" stroke="#6B4FB8" strokeWidth="0.8" />
                </svg>
            );
        case 'R':
            return (
                <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
                    <path d="M14 2 L24 6 L24 15 C24 20.5 19.5 24.5 14 26 C8.5 24.5 4 20.5 4 15 L4 6 Z"
                        fill="#3A82D4" stroke="#1E60B0" strokeWidth="0.8" />
                </svg>
            );
        default:
            return (
                <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
                    <circle cx="14" cy="14" r="11" fill="#8A8882" stroke="#6A6864" strokeWidth="0.8" />
                </svg>
            );
    }
};

/* ───────── 데이터 ───────── */
const PRIZES = [
    { grade: 'SSR', label: '전설의 카드', bgColor: '#FAEEDA', borderColor: '#FAC775', textColor: '#854F0B', subColor: '#633806', prob: 0.03, points: 500 },
    { grade: 'SR', label: '희귀 카드', bgColor: '#EEEDFE', borderColor: '#AFA9EC', textColor: '#3C3489', subColor: '#26215C', prob: 0.10, points: 200 },
    { grade: 'R', label: '레어 카드', bgColor: '#E6F1FB', borderColor: '#85B7EB', textColor: '#0C447C', subColor: '#042C53', prob: 0.20, points: 80 },
    { grade: 'N', label: '일반 카드', bgColor: '#F1EFE8', borderColor: '#D3D1C7', textColor: '#5F5E5A', subColor: '#444441', prob: 0.67, points: 20 },
] as const;

type Prize = typeof PRIZES[number];

function pickPrize(): Prize {
    const rand = Math.random();
    let c = 0;
    for (const p of PRIZES) { c += p.prob; if (rand < c) return p; }
    return PRIZES[PRIZES.length - 1];
}

/* ───────── 뒤집히는 카드 ───────── */
function FlipCard({ prize, delay }: { prize: Prize; delay: number }) {
    const [flipped, setFlipped] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setFlipped(true), delay);
        return () => clearTimeout(t);
    }, [delay]);

    const face: React.CSSProperties = {
        position: 'absolute', inset: 0, borderRadius: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backfaceVisibility: 'hidden',
    };

    return (
        <div style={{ perspective: 600, width: 88, height: 112 }}>
            <div style={{
                position: 'relative', width: '100%', height: '100%',
                transformStyle: 'preserve-3d',
                transition: 'transform 0.52s cubic-bezier(.4,0,.2,1)',
                transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}>
                {/* 카드 뒷면 */}
                <div style={{
                    ...face,
                    background: 'linear-gradient(135deg, #2d2d3a, #1a1a26)',
                    border: '0.5px solid rgba(255,255,255,0.1)',
                }}>
                    <svg width={30} height={30} viewBox="0 0 28 28" fill="none" style={{ opacity: 0.2 }}>
                        <polygon points="14,2 16.8,10.2 25,10.2 18.6,15.4 21,23.5 14,18.8 7,23.5 9.4,15.4 3,10.2 11.2,10.2" fill="#fff" />
                    </svg>
                </div>
                {/* 카드 앞면 */}
                <div style={{
                    ...face,
                    background: prize.bgColor,
                    border: `0.5px solid ${prize.borderColor}`,
                    transform: 'rotateY(180deg)',
                    flexDirection: 'column', gap: 4, padding: '10px 8px',
                }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: prize.textColor, letterSpacing: '0.5px' }}>
                        {prize.grade}
                    </span>
                    <ShapeIcon grade={prize.grade} size={28} />
                    <span style={{ fontSize: 10, color: prize.textColor, opacity: 0.7, textAlign: 'center' }}>
                        {prize.label}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: prize.subColor }}>
                        +{prize.points}P
                    </span>
                </div>
            </div>
        </div>
    );
}

/* ───────── SSR 파티클 버스트 ───────── */
function SSRBurst() {
    return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: 10 }}>
            {Array.from({ length: 20 }, (_, i) => {
                const angle = (i / 20) * 360;
                const dist = 60 + Math.random() * 60;
                const rad = (angle * Math.PI) / 180;
                const tx = Math.cos(rad) * dist;
                const ty = Math.sin(rad) * dist;
                const size = 4 + Math.floor(Math.random() * 5);
                const colors = ['#FFD700', '#FFA500', '#FFE066', '#FFC107', '#FFAA00'];
                return (
                    <div key={i} style={{
                        position: 'absolute', left: '50%', top: '50%',
                        width: size, height: size, borderRadius: '50%',
                        background: colors[i % colors.length],
                        animation: `gc-burst 0.9s ease-out ${i * 16}ms forwards`,
                        ['--tx' as string]: `${tx}px`,
                        ['--ty' as string]: `${ty}px`,
                    }} />
                );
            })}
        </div>
    );
}

/* ───────── 메인 컴포넌트 ───────── */
type Phase = 'idle' | 'cinematic' | 'flipping';

export default function Gatcha({ addPoints, currentPoints }: Props) {
    const [phase, setPhase] = useState<Phase>('idle');
    const [results, setResults] = useState<Prize[]>([]);
    const [error, setError] = useState('');
    const [allFlipped, setAllFlipped] = useState(false);

    const hasSSR = results.some(r => r.grade === 'SSR');

    // 모든 카드 뒤집기 완료 감지
    useEffect(() => {
        if (phase !== 'flipping') return;
        const t = setTimeout(
            () => setAllFlipped(true),
            (results.length - 1) * 60 + 580,
        );
        return () => clearTimeout(t);
    }, [phase, results.length]);

    const pull = (count: 1 | 10) => {
        const cost = COST * count;
        if (cost > currentPoints) { setError(`포인트가 부족합니다. (필요: ${cost}P)`); return; }
        setError('');
        setAllFlipped(false);
        addPoints(-cost);
        setPhase('cinematic');

        setTimeout(() => {
            const drawn = Array.from({ length: count }, pickPrize);
            addPoints(drawn.reduce((s, d) => s + d.points, 0));
            setResults(drawn);
            setPhase('flipping');
        }, 1500);
    };

    const reset = () => { setPhase('idle'); setResults([]); setAllFlipped(false); };

    return (
        <>
            <style>{`
                @keyframes gc-shake {
                    0%,100%{ transform:translateX(0) rotate(0) }
                    20%    { transform:translateX(-8px) rotate(-1.5deg) }
                    40%    { transform:translateX(8px)  rotate(1.5deg)  }
                    60%    { transform:translateX(-5px) rotate(-0.8deg) }
                    80%    { transform:translateX(5px)  rotate(0.8deg)  }
                }
                @keyframes gc-flash {
                    0%,100%{ opacity:0.25 } 50%{ opacity:1 }
                }
                @keyframes gc-burst {
                    0%  { transform:translate(-50%,-50%) scale(1.2); opacity:1 }
                    100%{ transform:translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0); opacity:0 }
                }
                @keyframes gc-glow {
                    0%,100%{ filter:drop-shadow(0 0 2px #FFD70044) }
                    50%    { filter:drop-shadow(0 0 12px #FFD700BB) }
                }
                @keyframes gc-slide-up {
                    from{ opacity:0; transform:translateY(10px) }
                    to  { opacity:1; transform:translateY(0) }
                }
                @keyframes gc-pop {
                    from{ opacity:0; transform:scale(0.88) }
                    to  { opacity:1; transform:scale(1) }
                }
                .gc-shake  { animation: gc-shake 0.44s ease-in-out 0.2s, gc-shake 0.38s ease-in-out 0.72s; }
                .gc-flash  { animation: gc-flash 0.42s ease-in-out 0s 4; }
                .gc-glow   { animation: gc-glow 1.4s ease-in-out infinite; }
                .gc-fadeup { animation: gc-slide-up 0.3s ease both; }
                .gc-pop    { animation: gc-pop 0.28s ease both; }
            `}</style>

            <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto', fontFamily: 'inherit' }}>

                {/* 헤더 */}
                <div style={{ marginBottom: 14 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 500, margin: 0, letterSpacing: '-0.3px' }}>카드 뽑기</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary, #888)', marginTop: 2 }}>운명의 카드를 뽑아보세요</p>
                </div>

                {/* 등급 확률 */}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
                    {PRIZES.map(p => (
                        <span key={p.grade} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '3px 9px', borderRadius: 100, fontSize: 11, fontWeight: 500,
                            background: p.bgColor, color: p.textColor, border: `0.5px solid ${p.borderColor}`,
                        }}>
                            <ShapeIcon grade={p.grade} size={13} />
                            {p.grade}&nbsp;{(p.prob * 100).toFixed(0)}%
                        </span>
                    ))}
                </div>

                {/* 보유 포인트 */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'rgba(0,0,0,0.04)', borderRadius: 10,
                    padding: '10px 14px', marginBottom: 12,
                }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary, #888)' }}>보유 포인트</span>
                    <span style={{ fontSize: 16, fontWeight: 500 }}>{currentPoints.toLocaleString()}P</span>
                </div>

                {error && <p style={{ fontSize: 13, color: '#c0392b', textAlign: 'center', marginBottom: 8 }}>{error}</p>}

                {/* ── idle ── */}
                {phase === 'idle' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {([1, 10] as const).map(count => (
                            <button key={count} onClick={() => pull(count)} style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                                padding: 12, borderRadius: 12,
                                border: '0.5px solid rgba(0,0,0,0.15)', background: '#fff', cursor: 'pointer',
                            }}>
                                <span style={{ fontSize: 14, fontWeight: 500 }}>{count}회 뽑기</span>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary, #888)' }}>{COST * count}P</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* ── cinematic ── */}
                {phase === 'cinematic' && (
                    <div className="gc-shake" style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', padding: '36px 0',
                    }}>
                        <div className="gc-flash">
                            <ShapeIcon grade="SSR" size={56} />
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary, #888)', marginTop: 16 }}>카드를 뽑는 중…</p>
                    </div>
                )}

                {/* ── flipping ── */}
                {phase === 'flipping' && (
                    <div className="gc-fadeup">
                        {/* SSR 축하 배너 */}
                        {hasSSR && allFlipped && (
                            <div className="gc-pop" style={{
                                position: 'relative', overflow: 'hidden',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                background: '#FAEEDA', border: '0.5px solid #FAC775', borderRadius: 10,
                                padding: '9px 14px', marginBottom: 12,
                            }}>
                                <SSRBurst />
                                <ShapeIcon grade="SSR" size={18} />
                                <span style={{ fontWeight: 500, fontSize: 13, color: '#854F0B' }}>
                                    전설 등장! 축하합니다 🎉
                                </span>
                            </div>
                        )}

                        {/* 카드들 */}
                        <div style={{
                            display: 'flex', flexWrap: 'wrap', gap: 8,
                            justifyContent: 'center', marginBottom: 12,
                        }}>
                            {results.map((r, i) => (
                                <div key={i} className={r.grade === 'SSR' && allFlipped ? 'gc-glow' : ''}>
                                    <FlipCard prize={r} delay={i * 60} />
                                </div>
                            ))}
                        </div>

                        {/* 합계 + 다시하기 (flip 완료 후) */}
                        {allFlipped && (
                            <div className="gc-fadeup">
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: 'rgba(0,0,0,0.04)', borderRadius: 10,
                                    padding: '10px 14px', marginBottom: 10,
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <TrendingUp size={14} color="var(--text-secondary, #888)" />
                                        <span style={{ fontSize: 13, color: 'var(--text-secondary, #888)' }}>이번 획득</span>
                                    </div>
                                    <span style={{ fontSize: 16, fontWeight: 500 }}>
                                        +{results.reduce((s, r) => s + r.points, 0).toLocaleString()}P
                                    </span>
                                </div>
                                <button onClick={reset} style={{
                                    width: '100%', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', gap: 6, padding: 10, borderRadius: 10,
                                    border: '0.5px solid rgba(0,0,0,0.15)', background: '#fff',
                                    fontSize: 14, cursor: 'pointer',
                                }}>
                                    <RotateCcw size={14} />
                                    다시 뽑기
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}