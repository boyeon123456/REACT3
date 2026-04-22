import React, { useState, useEffect } from 'react';
import { ShoppingBag, Star, Sparkles, Check, AlertCircle, TrendingUp, Info } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, getDoc, runTransaction, setDoc } from 'firebase/firestore';
import { useAuthStore } from '../store/authStore';
import './Shop.css';

interface ShopItem {
    id: string;
    name: string;
    description: string;
    price: number;
    type: 'badge' | 'nameColor' | 'profileBg' | 'avatarFrame';
    style: string;
}

export default function Shop() {
    const { user } = useAuthStore();
    const [items, setItems] = useState<ShopItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [purchasingId, setPurchasingId] = useState<string | null>(null);
    const [inventory, setInventory] = useState<string[]>([]);

    useEffect(() => {
        const q = query(collection(db, 'shop_items'), orderBy('price', 'asc'));
        const unsub = onSnapshot(q, (snap) => {
            setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as ShopItem)));
            setLoading(false);
        }, (err) => {
            console.error('Shop items error:', err);
            setLoading(false);
        });

        // 유저 인벤토리 구독 (이미 구매한 상품 확인용)
        let unsubInv = () => { };
        if (user) {
            unsubInv = onSnapshot(collection(db, 'users', user.id, 'inventory'), (snap) => {
                setInventory(snap.docs.map(d => d.id));
            });
        }

        return () => {
            unsub();
            unsubInv();
        };
    }, [user]);

    const handlePurchase = async (item: ShopItem) => {
        if (!user) {
            alert('로그인 후 이용 가능합니다.');
            return;
        }

        if (inventory.includes(item.id)) {
            alert('이미 소유하고 있는 아이템입니다.');
            return;
        }

        if (user.points < item.price) {
            alert('포인트가 부족합니다!');
            return;
        }

        if (!window.confirm(`[${item.name}]을(를) ${item.price}P에 구매하시겠습니까?`)) return;

        setPurchasingId(item.id);
        try {
            await runTransaction(db, async (transaction) => {
                const userRef = doc(db, 'users', user.id);
                const userDoc = await transaction.get(userRef);

                if (!userDoc.exists()) throw "User does not exist!";
                const currentPoints = userDoc.data().points || 0;

                if (currentPoints < item.price) throw "Insufficient points!";

                // 1. 포인트 차감
                transaction.update(userRef, { points: currentPoints - item.price });

                // 2. 인벤토리에 추가
                const invRef = doc(db, 'users', user.id, 'inventory', item.id);
                transaction.set(invRef, {
                    ...item,
                    purchasedAt: Date.now()
                });
            });

            alert('구매 완료! 마이페이지에서 장착할 수 있습니다.');
        } catch (e) {
            console.error(e);
            alert('구매 중 오류가 발생했습니다.');
        } finally {
            setPurchasingId(null);
        }
    };

    if (loading) return <div className="shop-loading">상점 물건을 진열 중입니다...</div>;

    return (
        <div className="shop-page animate-fade-in">
            <header className="shop-header">
                <div className="shop-header-content">
                    <div className="shop-badge"><ShoppingBag size={14} /> PREMIUM STORE</div>
                    <h1>포인트 상점</h1>
                    <p>커뮤니티 활동으로 모은 포인트로 특별한 혜택을 누리세요.</p>
                </div>
                <div className="user-points-card">
                    <div className="points-label">보유 포인트</div>
                    <div className="points-value">💎 {user?.points?.toLocaleString() || 0} <span>P</span></div>
                </div>
            </header>

            <section className="shop-featured">
                <div className="section-title-wrap">
                    <h2 className="section-title"><Sparkles size={20} className="text-primary" /> 인기 상품</h2>
                </div>
                <div className="shop-grid">
                    {items.map((item, idx) => (
                        <div key={item.id} className="shop-card" style={{ animationDelay: `${idx * 0.1}s` }}>
                            <div className="shop-card-visual">
                                {item.type === 'badge' ? (
                                    <div className="badge-preview" style={{ background: item.style || 'var(--primary)' }}>
                                        {item.name}
                                    </div>
                                ) : item.type === 'nameColor' ? (
                                    <div className="color-preview">
                                        <span className="preview-label">이름 색상</span>
                                        <span className="preview-name" style={{ color: item.style }}>{user?.name || '사용자'}</span>
                                    </div>
                                ) : item.type === 'profileBg' ? (
                                    <div className="bg-preview" style={{ background: item.style, width: '100%', height: '100%', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800 }}>
                                        프로필 배경
                                    </div>
                                ) : (
                                    <div className="frame-preview" style={{ border: `4px solid ${item.style}`, borderRadius: '50%', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div style={{ width: '60px', height: '60px', background: 'var(--bg-hover)', borderRadius: '50%' }}></div>
                                    </div>
                                )}

                            </div>
                            <div className="shop-card-info">
                                <div className="item-type">
                                    {item.type === 'badge' ? '칭호 배지' :
                                        item.type === 'nameColor' ? '이름 색상' :
                                            item.type === 'profileBg' ? '프로필 배경' : '아바타 테두리'}
                                </div>

                                <h3 className="item-name">{item.name}</h3>
                                <p className="item-desc">{item.description}</p>

                                <div className="shop-card-footer">
                                    <div className="item-price">
                                        <span className="price-icon">💎</span>
                                        <span className="price-num">{item.price.toLocaleString()}</span>
                                    </div>

                                    {inventory.includes(item.id) ? (
                                        <button className="buy-btn owned" disabled>
                                            <Check size={16} /> 소유함
                                        </button>
                                    ) : (
                                        <button
                                            className={`buy-btn ${user && user.points >= item.price ? 'active' : 'disabled'}`}
                                            onClick={() => handlePurchase(item)}
                                            disabled={purchasingId === item.id || !user || user.points < item.price}
                                        >
                                            {purchasingId === item.id ? '처리 중...' : '구매하기'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <aside className="shop-guide">
                <div className="guide-card">
                    <Info size={20} />
                    <div className="guide-text">
                        <h4>포인트 획득 안내</h4>
                        <p>게시글 작성, 댓글 작성, 미니게임 승리 등을 통해 포인트를 모을 수 있습니다.</p>
                    </div>
                </div>
            </aside>
        </div>
    );
}