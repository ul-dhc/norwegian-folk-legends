// Existing reading-time curve and punctuation pauses.
export const typingScale = (value) =>
  value <= 100 ? 0.5 + (value - 70) / 60 : 1 + (value - 100) * 0.015;
export function characterDelay(char) {
  return /[.!?…]/u.test(char) ? 380 : /[,;:]/u.test(char) ? 170 : char === ' ' ? 45 : 32;
}
