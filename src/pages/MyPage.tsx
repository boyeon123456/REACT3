import { useState } from 'react';
import { Shield } from 'lucide-react';
import { useProfile } from '../hooks/useProfile';
import { useInventory } from '../hooks/useInventory';
import { useProfileActions } from '../hooks/useProfileActions';
import type { TabKey } from '../types/profile';

import ProfileHero from '../components/profile/ProfileHero';
import ProfileStats from '../components/profile/ProfileStats';
import ProfileTabs from '../components/profile/ProfileTabs';
import ProfileActivity from '../components/profile/ProfileActivity';
import ProfileInventory from '../components/profile/ProfileInventory';
import ProfileSettings from '../components/profile/ProfileSettings';
import EditProfileModal from '../components/profile/EditProfileModal';

import './MyPage.css';

export default function MyPage() {
  const { user, myPosts, levelProgress, latestPost } = useProfile();
  const { inventory, shopItemsMap, equippedItems } = useInventory();
  const {
    toast,
    isSavingProfile,
    savingSettingKey,
    handleSaveProfile,
    handleToggleNotification,
    handleEquip,
    handleLogout,
    showToast,
  } = useProfileActions();

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  if (!user) {
    return (
      <div className="mypage-empty-state animate-fade-in">
        <Shield size={64} className="empty-icon" />
        <h2>로그인이 필요한 페이지입니다.</h2>
        <p>프로필을 꾸미고 내 활동을 관리하려면 먼저 로그인해 주세요.</p>
      </div>
    );
  }

  const completionCount = [
    Boolean(user?.photoURL),
    Boolean(user?.grade && user?.class),
    inventory.length > 0,
  ].filter(Boolean).length;
  const completionPercent = Math.round((completionCount / 3) * 100);

  const profileNameColor = user?.equipped_items?.nameColor
    ? shopItemsMap[user.equipped_items.nameColor]?.style
    : undefined;
  const profileBackground = user?.equipped_items?.profileBg
    ? shopItemsMap[user.equipped_items.profileBg]?.style
    : 'var(--gradient)';
  const avatarFrameColor = user?.equipped_items?.avatarFrame
    ? shopItemsMap[user.equipped_items.avatarFrame]?.style
    : undefined;

  return (
    <div className="mypage-v4 animate-fade-in">
      <div className="mypage-shell">
        <ProfileHero
          user={user}
          levelProgress={levelProgress}
          equippedItems={equippedItems}
          completionPercent={completionPercent}
          completionCount={completionCount}
          profileNameColor={profileNameColor}
          profileBackground={profileBackground}
          avatarFrameColor={avatarFrameColor}
          openEditModal={() => setIsEditModalOpen(true)}
        />

        <ProfileStats
          user={user}
          latestPost={latestPost}
          myPostsCount={myPosts.length}
          inventoryCount={inventory.length}
        />

        <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} />

        <section className="profile-content-area">
          {activeTab === 'overview' && (
            <ProfileActivity myPosts={myPosts} equippedItems={equippedItems} />
          )}

          {activeTab === 'inventory' && (
            <ProfileInventory user={user} inventory={inventory} handleEquip={handleEquip} />
          )}

          {activeTab === 'settings' && (
            <ProfileSettings
              settings={user?.settings}
              savingSettingKey={savingSettingKey}
              handleToggleNotification={handleToggleNotification}
              openEditModal={() => setIsEditModalOpen(true)}
              handleLogout={handleLogout}
              showToast={showToast}
            />
          )}
        </section>
      </div>

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={user}
        isSavingProfile={isSavingProfile}
        handleSaveProfile={handleSaveProfile}
        showToast={showToast}
      />

      {toast && (
        <div className={`mypage-toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
