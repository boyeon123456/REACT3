import type { FirebaseError } from 'firebase/app';
import { PASSWORD_MIN_LENGTH } from './signupValidation';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'auth/email-already-in-use': '이미 가입된 이메일입니다. 로그인하거나 다른 이메일을 사용해 주세요.',
  'auth/weak-password': `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`,
  'auth/invalid-email': '이메일 형식이 올바르지 않습니다.',
  'auth/network-request-failed': '네트워크 연결을 확인한 뒤 다시 시도해 주세요.',
  'auth/too-many-requests': '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  'auth/user-disabled': '사용이 제한된 계정입니다.',
  AUTH_EMAIL_MISMATCH: '인증 이메일 확인 중 문제가 발생했습니다. 다시 로그인해 주세요.',
};

const PROFILE_ERROR_MESSAGES: Record<string, string> = {
  'permission-denied': '계정은 생성됐지만 프로필 설정 권한 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.',
  unavailable: '계정은 생성됐지만 프로필 설정 중 네트워크 문제가 발생했습니다. 다시 시도해 주세요.',
  'deadline-exceeded': '계정은 생성됐지만 프로필 설정 응답이 지연되고 있습니다. 다시 시도해 주세요.',
};

export function getFirebaseErrorCode(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error && typeof (error as FirebaseError).code === 'string') {
    return (error as FirebaseError).code;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return '';
}

export function getAuthErrorMessage(error: unknown) {
  const code = getFirebaseErrorCode(error);
  return AUTH_ERROR_MESSAGES[code] || '인증 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
}

export function getProfileCreationErrorMessage(error: unknown) {
  const code = getFirebaseErrorCode(error);
  return (
    PROFILE_ERROR_MESSAGES[code] ||
    '계정은 생성됐지만 프로필 설정에 실패했습니다. 입력 내용을 확인한 뒤 다시 시도해 주세요.'
  );
}
