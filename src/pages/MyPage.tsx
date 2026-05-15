import ProfilePageShell from '../components/profile/ProfilePageShell';
import ProfilePostGrid from '../components/profile/ProfilePostGrid';

export default function MyPage() {
  return (
    <ProfilePageShell currentTab="posts">
      {({ myPosts }) => (
        <section className="profile-simple-content">
          <ProfilePostGrid posts={myPosts} variant="posts" />
        </section>
      )}
    </ProfilePageShell>
  );
}
