import { defaultSettings } from '../types/profile';
import type { User } from '../store/authStore';

type SchoolPrivacySubject = Pick<User, 'id' | 'schoolCode' | 'schoolName' | 'grade' | 'class' | 'settings'>;
type SchoolPrivacyViewer = Pick<User, 'id' | 'schoolCode'> | null | undefined;

export function canViewSchoolName(subject: SchoolPrivacySubject, viewer?: SchoolPrivacyViewer) {
  const hideSchoolName = subject.settings?.privacy?.hideSchoolName ?? defaultSettings.privacy.hideSchoolName;
  if (!hideSchoolName) return true;
  if (viewer?.id && viewer.id === subject.id) return true;
  return Boolean(viewer?.schoolCode && subject.schoolCode && viewer.schoolCode === subject.schoolCode);
}

export function getVisibleSchoolName(subject: SchoolPrivacySubject, viewer?: SchoolPrivacyViewer) {
  if (!subject.schoolName) return '';
  return canViewSchoolName(subject, viewer) ? subject.schoolName : '';
}

export function getVisibleSchoolLabel(subject: SchoolPrivacySubject, viewer?: SchoolPrivacyViewer) {
  const schoolName = getVisibleSchoolName(subject, viewer);
  if (!schoolName) return '';
  return `${schoolName}${subject.grade && subject.class ? ` ${subject.grade}학년 ${subject.class}반` : ''}`;
}
