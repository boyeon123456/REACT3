import { useMemo, useState } from 'react';
import { BadgeCheck, ChevronRight, ShoppingBag, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { typeLabels, type InventoryFilter, type InventoryItem } from '../../types/profile';
import type { User } from '../../store/authStore';

const inventoryFilters: { key: InventoryFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'badge', label: '배지' },
  { key: 'nameColor', label: '이름색' },
  { key: 'profileBg', label: '배경' },
  { key: 'avatarFrame', label: '프레임' },
];

interface ProfileContext {
  user: User;
  profileNameColor?: string;
  profileBackground?: string;
  avatarFrameColor?: string;
  featuredBadge?: InventoryItem;
}

interface ProfileInventoryProps {
  user: User;
  inventory: InventoryItem[];
  equippedItems: InventoryItem[];
  handleEquip: (item: InventoryItem) => void;
  profileContext: ProfileContext;
  previewLimit?: number;
}

function renderItemPreview(item: InventoryItem, user: User) {
  const style = item.style || 'var(--primary)';

  if (item.type === 'profileBg') {
    return (
      <div className="inventory-profile-bg-preview" style={{ background: style }}>
        <span>프로필 배경</span>
      </div>
    );
  }

  if (item.type === 'avatarFrame') {
    return (
      <div className="inventory-frame-preview" style={{ borderColor: style }}>
        <span>{user.name?.[0] || '?'}</span>
      </div>
    );
  }

  if (item.type === 'nameColor') {
    return (
      <strong className="inventory-name-preview" style={{ color: style }}>
        {user.name || '이름 미리보기'}
      </strong>
    );
  }

  return (
    <strong className="inventory-badge-preview" style={{ background: style }}>
      {item.name}
    </strong>
  );
}

export default function ProfileInventory({
  user,
  inventory,
  equippedItems,
  handleEquip,
  profileContext,
  previewLimit,
}: ProfileInventoryProps) {
  const navigate = useNavigate();
  const [inventoryFilter, setInventoryFilter] = useState<InventoryFilter>('all');

  const filteredInventory = useMemo(() => {
    const base = inventoryFilter === 'all' ? inventory : inventory.filter((item) => item.type === inventoryFilter);
    return typeof previewLimit === 'number' ? base.slice(0, previewLimit) : base;
  }, [inventory, inventoryFilter, previewLimit]);

  const filtersWithCounts = useMemo(
    () =>
      inventoryFilters.map((filter) => ({
        ...filter,
        count: filter.key === 'all' ? inventory.length : inventory.filter((item) => item.type === filter.key).length,
      })),
    [inventory]
  );

  const hasInventory = inventory.length > 0;
  const equippedCount = equippedItems.length;

  return (
    <article className="content-card inventory-summary-card inventory-page-card">
      <div className="section-heading inventory-page-heading">
        <div>
          <p className="section-kicker">INVENTORY</p>
          <h3>인벤토리</h3>
          <span>보유한 아이템을 장착해서 프로필 분위기를 바꿔보세요.</span>
        </div>
        <button type="button" className="inline-action" onClick={() => navigate('/shop')}>
          상점 이동
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="inventory-overview">
        <div className="inventory-showcase-card" style={{ background: profileContext.profileBackground || 'var(--gradient)' }}>
          <div
            className="inventory-showcase-avatar"
            style={{ borderColor: profileContext.avatarFrameColor || 'rgba(255,255,255,0.82)' }}
          >
            {profileContext.user.photoURL ? (
              <img src={profileContext.user.photoURL} alt={profileContext.user.name} />
            ) : (
              <div className="showcase-fallback">{profileContext.user.name?.[0] || '?'}</div>
            )}
          </div>
          <div className="inventory-showcase-copy">
            <strong style={{ color: profileContext.profileNameColor || '#fff' }}>{profileContext.user.name}</strong>
            <p>{equippedCount > 0 ? `${equippedCount}개의 아이템을 장착 중이에요.` : '아직 장착한 아이템이 없어요.'}</p>
            {profileContext.featuredBadge && (
              <span>
                <BadgeCheck size={14} />
                {profileContext.featuredBadge.name}
              </span>
            )}
          </div>
        </div>

        <div className="inventory-summary-metrics" aria-label="인벤토리 요약">
          <div>
            <span>보유 아이템</span>
            <strong>{inventory.length}</strong>
          </div>
          <div>
            <span>장착 중</span>
            <strong>{equippedCount}</strong>
          </div>
        </div>
      </div>

      <div className="filter-row inventory-filter-row" aria-label="인벤토리 필터">
        {filtersWithCounts.map((filter) => (
          <button
            key={filter.key}
            type="button"
            aria-pressed={inventoryFilter === filter.key}
            className={`filter-chip ${inventoryFilter === filter.key ? 'active' : ''}`}
            onClick={() => setInventoryFilter(filter.key)}
          >
            <span>{filter.label}</span>
            <strong>{filter.count}</strong>
          </button>
        ))}
      </div>

      {!hasInventory ? (
        <div className="empty-panel inventory-empty-panel">
          <ShoppingBag size={22} />
          <strong>아직 보유한 아이템이 없어요.</strong>
          <span>상점에서 아이템을 구매하면 여기에서 바로 장착할 수 있어요.</span>
          <button type="button" className="inventory-empty-action" onClick={() => navigate('/shop')}>
            상점 둘러보기
          </button>
        </div>
      ) : filteredInventory.length === 0 ? (
        <div className="empty-panel inventory-empty-panel">
          <Sparkles size={22} />
          <strong>선택한 카테고리에 아이템이 없어요.</strong>
          <span>다른 필터를 선택하거나 상점에서 새 아이템을 찾아보세요.</span>
        </div>
      ) : (
        <div className="inventory-grid-v6">
          {filteredInventory.map((item) => {
            const isEquipped = user.equipped_items?.[item.type] === item.id;
            const isFeaturedBadge = item.type === 'badge' && user.featuredBadgeId === item.id;

            return (
              <article key={item.id} className={`inventory-card compact mobile-lean-card ${isEquipped ? 'equipped' : ''}`}>
                <div className="inventory-card-top">
                  <span className="inventory-type">{typeLabels[item.type]}</span>
                  <div className="inventory-card-flags">
                    {isEquipped && <span className="equipped-badge">장착 중</span>}
                    {isFeaturedBadge && <span className="featured-badge">대표</span>}
                  </div>
                </div>

                <div className="inventory-preview">{renderItemPreview(item, user)}</div>

                <div className="inventory-card-copy">
                  <strong>{item.name}</strong>
                  <p>{typeLabels[item.type]} 아이템</p>
                </div>

                <button
                  type="button"
                  className={`inventory-action ${isEquipped ? 'secondary' : ''}`}
                  onClick={() => handleEquip(item)}
                >
                  {isEquipped ? '해제하기' : '장착하기'}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </article>
  );
}
