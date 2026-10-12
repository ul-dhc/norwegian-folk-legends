// Retains the existing clipboard fallback and copied-state feedback.
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
}
export function showCopied(button: HTMLButtonElement, restoreIcon = 'copy') {
  const icon = button.querySelector<HTMLElement>('[data-lucide]')!,
    label = button.querySelector<HTMLElement>('span'),
    oldLabel = label?.textContent || '';
  button.classList.add('copied');
  icon.dataset.lucide = 'check';
  if (label) label.textContent = 'Kopiert';
  window.renderLucideIcons?.();
  setTimeout(() => {
    button.classList.remove('copied');
    icon.dataset.lucide = restoreIcon;
    if (label) label.textContent = oldLabel;
    window.renderLucideIcons?.();
  }, 1800);
}
