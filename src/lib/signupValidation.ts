import type { SchoolInfo } from '../api/neisApi';

export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 15;
export const PASSWORD_MIN_LENGTH = 8;
export const MAX_CLASS_NUMBER = 15;

export type SignupStepOneInput = {
  name: string;
  email: string;
  password: string;
};

export type SignupStepTwoInput = {
  isStudent: boolean;
  schoolInfo: SchoolInfo | null;
  grade: string;
  classNum: string;
  gradeCount: number;
};

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function validateName(value: string) {
  const trimmed = value.trim();

  if (trimmed.length < NAME_MIN_LENGTH) {
    return `이름은 ${NAME_MIN_LENGTH}자 이상으로 입력해 주세요.`;
  }

  if (trimmed.length > NAME_MAX_LENGTH) {
    return `이름은 ${NAME_MAX_LENGTH}자 이하로 입력해 주세요.`;
  }

  return '';
}

export function validateEmail(value: string) {
  const normalized = normalizeEmail(value);

  if (!normalized) {
    return '이메일을 입력해 주세요.';
  }

  if (/\s/.test(value)) {
    return '이메일에는 공백을 포함할 수 없습니다.';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return '이메일 형식이 올바르지 않습니다.';
  }

  return '';
}

export function validatePassword(value: string, email: string) {
  const normalizedEmail = normalizeEmail(email);

  if (value.length < PASSWORD_MIN_LENGTH) {
    return `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`;
  }

  if (/\s{2,}/.test(value)) {
    return '비밀번호에 연속된 공백은 사용할 수 없습니다.';
  }

  if (normalizedEmail && value.toLowerCase() === normalizedEmail) {
    return '비밀번호는 이메일과 동일할 수 없습니다.';
  }

  if (normalizedEmail) {
    const emailLocal = normalizedEmail.split('@')[0];
    if (emailLocal && value.toLowerCase().includes(emailLocal.toLowerCase())) {
      return '비밀번호에 이메일 아이디를 포함할 수 없습니다.';
    }
  }

  return '';
}

export function validateSignupStepOne({ name, email, password }: SignupStepOneInput) {
  return validateName(name) || validateEmail(email) || validatePassword(password, email);
}

export function validateSignupStepTwo({ isStudent, schoolInfo, grade, classNum, gradeCount }: SignupStepTwoInput) {
  if (!isStudent) {
    return '';
  }

  if (!schoolInfo) {
    return '학생으로 가입하려면 학교를 먼저 선택해 주세요.';
  }

  const gradeNumber = Number(grade);
  if (!Number.isInteger(gradeNumber) || gradeNumber < 1 || gradeNumber > gradeCount) {
    return '올바른 학년을 선택해 주세요.';
  }

  const classNumber = Number(classNum);
  if (!Number.isInteger(classNumber) || classNumber < 1 || classNumber > MAX_CLASS_NUMBER) {
    return '올바른 반을 선택해 주세요.';
  }

  return '';
}
