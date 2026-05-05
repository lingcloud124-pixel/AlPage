export function initDesktopBehavior(container: HTMLElement): void {
  initDesktopSidebarBehavior(container);
  initDesktopTemplateBehavior(container);
}

function initDesktopSidebarBehavior(container: HTMLElement): void {
  container.querySelectorAll<HTMLElement>('.sidebar-group-title').forEach((header) => {
    if (header.dataset.behaviorBound === 'true') return;
    header.dataset.behaviorBound = 'true';
    header.addEventListener('click', () => {
      const icon = header.querySelector('.collapse-icon');
      if (icon) icon.classList.toggle('collapsed');
    });
  });
}

function initDesktopTemplateBehavior(container: HTMLElement): void {
  const tabBtns = container.querySelectorAll<HTMLElement>('.tab-btn');
  tabBtns.forEach((btn) => {
    if (btn.dataset.behaviorBound === 'true') return;
    btn.dataset.behaviorBound = 'true';
    btn.addEventListener('click', () => {
      tabBtns.forEach((candidate) => candidate.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  const monthLabel = container.querySelector<HTMLElement>('.current-month');
  const calendarGrid = container.querySelector<HTMLElement>('.calendar-grid');
  const prevBtn = container.querySelector<HTMLElement>('#prev-month');
  const nextBtn = container.querySelector<HTMLElement>('#next-month');

  if (!monthLabel || !calendarGrid) return;
  if (calendarGrid.dataset.behaviorBound === 'true') return;
  calendarGrid.dataset.behaviorBound = 'true';

  const now = new Date();
  let displayYear = now.getFullYear();
  let displayMonth = now.getMonth();

  const renderCalendarWeek = () => {
    monthLabel.textContent = `${displayYear}-${String(displayMonth + 1).padStart(2, '0')}`;
    calendarGrid.innerHTML = '';

    const weekDays = [
      { day: 2, lunar: '十三', muted: true, event: false },
      { day: 3, lunar: '十四', muted: false, event: false },
      { day: 4, lunar: '十四', muted: false, event: false },
      { day: 5, lunar: '十五', muted: false, event: true, highlighted: true },
      { day: 6, lunar: '十六', muted: false, event: true },
      { day: 7, lunar: '十七', muted: false, event: true },
      { day: 8, lunar: '十八', muted: true, event: false },
    ];

    for (const item of weekDays) {
      const dayElement = document.createElement('div');
      dayElement.className = 'calendar-day';
      if (item.muted) dayElement.classList.add('other-month');
      if (item.highlighted) dayElement.classList.add('is-highlighted');

      const dayNumber = document.createElement('span');
      dayNumber.className = 'calendar-day-number';
      dayNumber.textContent = String(item.day);

      const lunar = document.createElement('span');
      lunar.className = 'calendar-day-lunar';
      lunar.textContent = item.lunar;

      dayElement.appendChild(dayNumber);
      dayElement.appendChild(lunar);

      if (item.event) {
        const eventDot = document.createElement('div');
        eventDot.className = 'event-dot';
        dayElement.appendChild(eventDot);
      }

      calendarGrid.appendChild(dayElement);
    }
  };

  prevBtn?.addEventListener('click', () => {
    displayMonth -= 1;
    if (displayMonth < 0) {
      displayMonth = 11;
      displayYear -= 1;
    }
    renderCalendarWeek();
  });

  nextBtn?.addEventListener('click', () => {
    displayMonth += 1;
    if (displayMonth > 11) {
      displayMonth = 0;
      displayYear += 1;
    }
    renderCalendarWeek();
  });

  renderCalendarWeek();
}
