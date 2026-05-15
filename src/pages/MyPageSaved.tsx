import ProfilePageShell from '../components/profile/ProfilePageShell';
import ProfilePostGrid from '../components/profile/ProfilePostGrid';

export default function MyPageSaved() {
  return (
    <ProfilePageShell currentTab="saved">
      {({ bookmarks }) => (
        <section className="profile-simple-content">
          <ProfilePostGrid bookmarks={bookmarks} variant="saved" />
        </section>
      )}
    </ProfilePageShell>
  );
}
