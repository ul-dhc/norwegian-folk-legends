const topicMotion = matchMedia(
  '(hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference)',
);
document.querySelectorAll<HTMLElement>('.topic-block').forEach((card) => {
  card.addEventListener(
    'pointermove',
    (event) => {
      if (!topicMotion.matches) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--topic-x', `${((event.clientX - rect.left) / rect.width) * 100}%`);
      card.style.setProperty('--topic-y', `${((event.clientY - rect.top) / rect.height) * 100}%`);
    },
    { passive: true },
  );
});
const refreshTopicCopy = () => {
  const lang = document.documentElement.dataset.uiLang === 'en' ? 'en' : 'no';
  document.querySelectorAll<HTMLElement>('[data-topic-copy]').forEach((element) => {
    element.textContent = element.dataset[lang] || element.dataset.no || '';
  });
};
refreshTopicCopy();
window.addEventListener('ui-language-change', refreshTopicCopy);
const map = document.querySelector<HTMLElement>('.norway-map');
const ambientMotion = matchMedia(
  '(hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference)',
);
if (map) {
  const svg = map.querySelector('svg')!,
    light = map.querySelector('radialGradient')!;
  let frame = 0,
    previousTime = 0,
    currentX = 310,
    currentY = 345,
    targetX = 310,
    targetY = 345;
  const drift = (now: number) => {
    const elapsed = previousTime ? Math.min(64, now - previousTime) : 16;
    previousTime = now;
    const ease = 1 - Math.exp(-elapsed / 240);
    currentX += (targetX - currentX) * ease;
    currentY += (targetY - currentY) * ease;
    light.setAttribute('cx', String(currentX));
    light.setAttribute('cy', String(currentY));
    if (Math.hypot(targetX - currentX, targetY - currentY) > 0.15)
      frame = requestAnimationFrame(drift);
    else {
      frame = 0;
      previousTime = 0;
    }
  };
  const locate = (event: PointerEvent) => {
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    targetX = point.x;
    targetY = point.y;
  };
  map.addEventListener('pointerenter', (event) => {
    if (!ambientMotion.matches) return;
    locate(event);
    currentX = targetX;
    currentY = targetY;
    light.setAttribute('cx', String(currentX));
    light.setAttribute('cy', String(currentY));
    map.classList.add('is-lit');
  });
  map.addEventListener(
    'pointermove',
    (event) => {
      if (!ambientMotion.matches) return;
      locate(event);
      if (!frame) frame = requestAnimationFrame(drift);
    },
    { passive: true },
  );
  const settle = () => {
    map.classList.remove('is-lit');
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
  };
  map.addEventListener('pointerleave', settle);
  ambientMotion.addEventListener('change', settle);
}
const dateElement = document.querySelector<HTMLTimeElement>('[data-daily-date]');
const refreshDate = () => {
  if (!dateElement) return;
  const now = new Date();
  dateElement.dateTime = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Oslo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  dateElement.textContent = new Intl.DateTimeFormat('nb-NO', {
    timeZone: 'Europe/Oslo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(now);
};
refreshDate();
setInterval(refreshDate, 60000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) refreshDate();
});
const counters = [...document.querySelectorAll<HTMLElement>('[data-count-up]')];
const numberFormat = () =>
  new Intl.NumberFormat(document.documentElement.dataset.uiLang === 'en' ? 'en-US' : 'nb-NO');
const showFinal = () =>
  counters.forEach(
    (counter) =>
      (counter.textContent = numberFormat().format(Number(counter.dataset.countUp || 0))),
  );
const animateCounter = (counter: HTMLElement) => {
  const target = Number(counter.dataset.countUp || 0),
    started = performance.now(),
    duration = 1100;
  const tick = (now: number) => {
    const progress = Math.min((now - started) / duration, 1),
      eased = 1 - Math.pow(1 - progress, 3);
    counter.textContent = numberFormat().format(Math.round(target * eased));
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
if (
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
  'IntersectionObserver' in window
) {
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      counters.forEach((counter, index) =>
        window.setTimeout(() => animateCounter(counter), index * 90),
      );
    },
    { threshold: 0.35 },
  );
  const summary = document.querySelector('.collection-summary');
  if (summary) observer.observe(summary);
} else showFinal();
window.addEventListener('ui-language-change', showFinal);

export {};
