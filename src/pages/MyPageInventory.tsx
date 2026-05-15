import ProfileInventory from '../components/profile/ProfileInventory';
import ProfilePageShell from '../components/profile/ProfilePageShell';
import { useInventory } from '../hooks/useInventory';
import { useProfileActions } from '../hooks/useProfileActions';

export default function MyPageInventory() {
  const { inventory, equippedItems, equippedItemsByType } = useInventory();
  const actions = useProfileActions();

  return (
    <ProfilePageShell currentTab="inventory">
      {({ user }) => {
        const featuredBadge = inventory.find((item) => item.type === 'badge' && item.id === user.featuredBadgeId);

        return (
          <section className="profile-simple-content">
            <ProfileInventory
              user={user}
              inventory={inventory}
              equippedItems={equippedItems}
              handleEquip={actions.handleEquip}
              profileContext={{
                user,
                profileNameColor: equippedItemsByType.nameColor?.style,
                profileBackground: equippedItemsByType.profileBg?.style,
                avatarFrameColor: equippedItemsByType.avatarFrame?.style,
                featuredBadge,
              }}
            />
            {actions.toast && <div className={`mypage-toast ${actions.toast.type}`}>{actions.toast.message}</div>}
          </section>
        );
      }}
    </ProfilePageShell>
  );
}
