import ProfileActivityList from '../components/profile/ProfileActivityList';
import ProfilePageShell from '../components/profile/ProfilePageShell';

export default function MyPageActivity() {
  return (
    <ProfilePageShell currentTab="activity">
      {({ myPosts }) => (
        <section className="profile-simple-content">
          <ProfileActivityList posts={myPosts} />
        </section>
      )}
    </ProfilePageShell>
  );
}
