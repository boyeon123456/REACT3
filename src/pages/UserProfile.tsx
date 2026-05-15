import { Navigate, useParams } from 'react-router-dom';
import ProfileActivityList from '../components/profile/ProfileActivityList';
import ProfilePageShell from '../components/profile/ProfilePageShell';
import ProfilePostGrid from '../components/profile/ProfilePostGrid';

interface UserProfileProps {
  tab?: 'posts' | 'activity';
}

export default function UserProfile({ tab = 'posts' }: UserProfileProps) {
  const { userId } = useParams<{ userId: string }>();

  if (!userId) {
    return <Navigate to="/board" replace />;
  }

  return (
    <ProfilePageShell currentTab={tab} profileUserId={userId}>
      {({ myPosts }) => (
        <section className="profile-simple-content">
          {tab === 'activity' ? <ProfileActivityList posts={myPosts} /> : <ProfilePostGrid posts={myPosts} variant="posts" />}
        </section>
      )}
    </ProfilePageShell>
  );
}
