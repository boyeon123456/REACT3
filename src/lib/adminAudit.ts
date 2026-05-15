import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import type { User } from '../store/authStore';

export type AdminAuditAction =
  | 'report.resolve'
  | 'report.dismiss'
  | 'report.delete_with_optional_post'
  | 'report.delete_record'
  | 'report.clear_handled'
  | 'report.batch_resolve'
  | 'report.batch_dismiss'
  | 'report.batch_delete_record'
  | 'post.delete'
  | 'post.pin_toggle'
  | 'comment.delete'
  | 'user.points_update'
  | 'user.ban_toggle'
  | 'settings.announcements'
  | 'settings.announcements_reorder'
  | 'timetable.save'
  | 'shop.seed_defaults'
  | 'shop.item_create'
  | 'shop.item_update'
  | 'shop.item_delete';

export async function logAdminAction(
  actor: User | null,
  action: AdminAuditAction,
  opts: { targetCollection?: string; targetId?: string; detail?: Record<string, unknown> }
): Promise<void> {
  if (!actor) return;

  try {
    await addDoc(collection(db, 'admin_audit_logs'), {
      actorUid: actor.id,
      actorEmail: actor.email ?? '',
      action,
      targetCollection: opts.targetCollection ?? null,
      targetId: opts.targetId ?? null,
      detail: opts.detail ?? {},
      createdAt: Date.now(),
    });
  } catch (e) {
    console.warn('admin audit log failed', e);
  }
}
