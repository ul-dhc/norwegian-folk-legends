// Keep the native select as the form/state source; render its menu with site tokens.
let opened: { select: HTMLSelectElement; trigger: HTMLButtonElement; menu: HTMLElement; active: number } | null = null;
let serial = 0;
let search = '', searchAt = 0;
const labels = new WeakMap<HTMLSelectElement, HTMLButtonElement>();
function close(restore = false) {
  if (!opened) return;
  const { trigger, menu } = opened;
  opened = null;
  menu.remove();
  trigger.setAttribute('aria-expanded', 'false');
  trigger.removeAttribute('aria-activedescendant');
  if (restore && trigger.isConnected) trigger.focus({ preventScroll: true });
}
function highlight(index: number) {
  if (!opened) return;
  const { select, trigger, menu } = opened;
  if (select.options[index]?.disabled) return;
  opened.active = index;
  menu.querySelectorAll<HTMLElement>('[role="option"]').forEach((item, i) => item.classList.toggle('is-highlighted', i === index));
  const item = menu.children[index] as HTMLElement;
  trigger.setAttribute('aria-activedescendant', item.id);
  item.scrollIntoView({ block: 'nearest' });
}
function choose(index: number) {
  if (!opened || opened.select.options[index]?.disabled) return;
  const { select } = opened;
  close();
  select.selectedIndex = index;
  const trigger = labels.get(select)!;
  trigger.querySelector('span')!.textContent = select.selectedOptions[0]?.textContent || '';
  select.dispatchEvent(new Event('change', { bubbles: true }));
  // Dashboard changes rebuild the controls, so focus the new equivalent trigger.
  const replacement = select.id ? document.getElementById(select.id) as HTMLSelectElement :
    document.querySelector<HTMLSelectElement>(select.dataset.networkSetting ? `[data-network-setting="${select.dataset.networkSetting}"]` : `[data-network-filter="${select.dataset.networkFilter}"]`);
  (labels.get(replacement || select) || trigger).focus({ preventScroll: true });
}
function open(select: HTMLSelectElement, trigger: HTMLButtonElement) {
  close(); search = '';
  const menu = document.createElement('div');
  menu.className = 'ml-select-menu'; menu.id = trigger.getAttribute('aria-controls')!;
  menu.setAttribute('role', 'listbox'); menu.setAttribute('aria-label', trigger.getAttribute('aria-label')!);
  [...select.options].forEach((option, index) => {
    const item = document.createElement('button');
    item.type = 'button'; item.tabIndex = -1; item.id = `${menu.id}-${index}`;
    item.setAttribute('role', 'option'); item.setAttribute('aria-selected', String(option.selected));
    item.disabled = option.disabled;
    const text = document.createElement('span'); text.textContent = option.textContent;
    const icon = document.createElement('i'); icon.dataset.lucide = 'check';
    item.append(icon, text); menu.append(item);
    item.addEventListener('pointerdown', event => event.preventDefault());
    item.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); choose(index); });
    item.addEventListener('pointermove', () => highlight(index));
  });
  const theme = getComputedStyle(trigger);
  ['--chart-card', '--raised', '--line', '--ink', '--muted', '--action-fill', '--action-ink', '--blue'].forEach(token => menu.style.setProperty(token, theme.getPropertyValue(token)));
  document.body.append(menu);
  const rect = trigger.getBoundingClientRect(), gap = 6;
  const width = Math.min(Math.max(rect.width, 230), innerWidth - 20);
  menu.style.width = `${width}px`;
  menu.style.left = `${Math.max(10, Math.min(rect.left, innerWidth - width - 10))}px`;
  const below = innerHeight - rect.bottom - gap - 10, above = rect.top - gap - 10;
  const upward = below < 180 && above > below;
  menu.style.maxHeight = `${Math.max(80, Math.min(320, upward ? above : below))}px`;
  if (upward) menu.style.bottom = `${innerHeight - rect.top + gap}px`;
  else menu.style.top = `${rect.bottom + gap}px`;
  opened = { select, trigger, menu, active: select.selectedIndex };
  trigger.setAttribute('aria-expanded', 'true');
  window.dispatchEvent(new Event('lucide-refresh'));
  highlight(select.selectedIndex);
}
export function enhanceSelects(root: HTMLElement) {
  if (opened && !opened.select.isConnected) close();
  root.querySelectorAll<HTMLSelectElement>('select').forEach(select => {
    if (labels.has(select)) return;
    const wrapper = document.createElement('span'); wrapper.className = 'ml-select';
    const trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'ml-select-trigger';
    trigger.setAttribute('role', 'combobox'); trigger.setAttribute('aria-haspopup', 'listbox'); trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', `ml-select-menu-${++serial}`);
    const label = select.closest('label')?.cloneNode(true) as HTMLElement | undefined;
    label?.querySelectorAll('select, input, button').forEach(element => element.remove());
    trigger.setAttribute('aria-label', select.getAttribute('aria-label') || label?.textContent?.trim() || 'Select');
    const value = document.createElement('span'); value.textContent = select.selectedOptions[0]?.textContent || '';
    const icon = document.createElement('i'); icon.dataset.lucide = 'chevron-down'; trigger.append(value, icon);
    trigger.disabled = select.disabled;
    select.before(wrapper); wrapper.append(select, trigger);
    select.classList.add('ml-native-select'); select.tabIndex = -1; select.setAttribute('aria-hidden', 'true');
    labels.set(select, trigger);
    select.addEventListener('focus', () => trigger.focus({ preventScroll: true }));
    trigger.addEventListener('click', event => { event.preventDefault(); opened?.trigger === trigger ? close() : open(select, trigger); });
    trigger.addEventListener('keydown', event => {
      if (event.key === 'Tab') { close(); return; }
      if (event.key === 'Escape') { if (opened) { event.preventDefault(); event.stopPropagation(); close(true); } return; }
      if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        if (!opened || opened.trigger !== trigger) { open(select, trigger); return; }
        if (event.key === 'Enter' || event.key === ' ') { choose(opened.active); return; }
        const direction = event.key === 'ArrowUp' || event.key === 'End' ? -1 : 1;
        let index = event.key === 'Home' ? 0 : event.key === 'End' ? select.options.length - 1 : opened.active + direction;
        while (select.options[index]?.disabled) index += direction;
        if (index >= 0 && index < select.options.length) highlight(index);
      } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault(); if (!opened || opened.trigger !== trigger) open(select, trigger);
        search = Date.now() - searchAt > 700 ? event.key : search + event.key; searchAt = Date.now();
        const index = [...select.options].findIndex(option => !option.disabled && option.textContent?.toLocaleLowerCase().startsWith(search.toLocaleLowerCase()));
        if (index >= 0) highlight(index);
      }
    });
  });
}
document.addEventListener('pointerdown', event => {
  if (opened && !opened.menu.contains(event.target as Node) && !opened.trigger.contains(event.target as Node)) close();
});
window.addEventListener('resize', () => close());
document.addEventListener('scroll', event => { if (opened && !opened.menu.contains(event.target as Node)) close(); }, true);
