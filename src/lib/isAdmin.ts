/** Must match admin emails in firestore.rules isAdmin() token check. */
export const ADMIN_EMAILS = ['boyeon5600@gmail.com'] as const;

export type AdminCheckUser = {
  email?: string | null;
  role?: string;
} | null | undefined;

export function isAdminUser(user: AdminCheckUser): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const email = user.email;
  return !!email && (ADMIN_EMAILS as readonly string[]).includes(email);
}
