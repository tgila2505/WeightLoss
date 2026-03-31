const GROQ_KEY = 'ai_groq_key';
const MISTRAL_KEY = 'ai_mistral_key';

export function getGroqKey(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(GROQ_KEY);
}

export function getMistralKey(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(MISTRAL_KEY);
}

export function setAiKeys(groqKey: string, mistralKey: string): void {
  window.localStorage.setItem(GROQ_KEY, groqKey);
  window.localStorage.setItem(MISTRAL_KEY, mistralKey);
}

export function hasAiKeys(): boolean {
  return Boolean(getGroqKey() && getMistralKey());
}

export function clearAiKeys(): void {
  window.localStorage.removeItem(GROQ_KEY);
  window.localStorage.removeItem(MISTRAL_KEY);
}
