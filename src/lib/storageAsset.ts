import { getDownloadURL, ref } from 'firebase/storage';
import { storage } from '../firebase';

function isDirectUrl(value: string) {
  return /^(https?:|blob:|data:)/i.test(value);
}

export async function resolveStorageSrc(value?: string | null) {
  if (!value) return null;
  if (isDirectUrl(value)) return value;
  return getDownloadURL(ref(storage, value));
}
