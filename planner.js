// Planner & Calendar Module
const planner = {
  currentDate: new Date(),
  selectedDate: new Date(),
  monthNames: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],

  init() {
    this.selectedDate = new Date();
    this.currentDate = new Date();
    
    // Bind navigation buttons
    document.getElementById('prev-month-btn').addEventListener('click', () => this.changeMonth(-1));
    document.getElementById('next-month-btn').addEventListener('click', () => this.changeMonth(1));
    
    // Add Event Buttons
    document.getElementById('add-event-btn').addEventListener('click', () => {
      // Set input defaults
      const dateStr = this.selectedDate.toISOString().split('T')[0];
      document.getElementById('event-date').value = dateStr;
      document.getElementById('event-time').value = "12:00";
      document.getElementById('event-modal').classList.add('active');
    });

    // Form submission
    document.getElementById('modal-event-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveEvent();
    });

    this.render();
  },

  changeMonth(dir) {
    this.currentDate.setMonth(this.currentDate.getMonth() + dir);
    this.render();
  },

  selectDate(year, month, day) {
    this.selectedDate = new Date(year, month, day);
    this.render();
  },

  saveEvent() {
    if (storage.isLocked) return;

    const title = document.getElementById('event-title').value.trim();
    const date = document.getElementById('event-date').value;
    const time = document.getElementById('event-time').value;
    const category = document.getElementById('event-category').value;

    if (!title || !date || !time) return;

    const newEvent = {
      id: 'e_' + Date.now(),
      title,
      date,
      time,
      category
    };

    storage.state.events.push(newEvent);
    storage.save();

    document.getElementById('event-modal').classList.remove('active');
    document.getElementById('modal-event-form').reset();

    // Re-render
    this.render();
    app.updateAllViews();
    
    // Trigger proactive notification
    agent.addAgentMessage(`I've scheduled "${title}" on your planner for ${date} at ${time}.`);
  },

  deleteEvent(eventId) {
    if (storage.isLocked) return;
    storage.state.events = storage.state.events.filter(e => e.id !== eventId);
    storage.save();
    this.render();
    app.updateAllViews();
  },

  render() {
    if (storage.isLocked) {
      document.getElementById('calendar-days').innerHTML = '<div class="empty-state">Unlock vault to view calendar.</div>';
      document.getElementById('agenda-timeline').innerHTML = '<div class="empty-state">Unlock vault to view agenda.</div>';
      return;
    }

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    // Update Header Label
    document.getElementById('calendar-month-year').textContent = `${this.monthNames[month]} ${year}`;

    // Get calendar grid calculations
    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    
    const daysContainer = document.getElementById('calendar-days');
    daysContainer.innerHTML = '';

    // Render empty space for offset days
    for (let i = 0; i < firstDayIndex; i++) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'calendar-day empty';
      daysContainer.appendChild(emptyDiv);
    }

    // Render actual month days
    const today = new Date();
    const events = storage.state.events || [];

    for (let day = 1; day <= lastDay; day++) {
      const dayDiv = document.createElement('div');
      dayDiv.className = 'calendar-day';
      
      const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
      const isSelected = this.selectedDate.getDate() === day && this.selectedDate.getMonth() === month && this.selectedDate.getFullYear() === year;
      
      if (isToday) dayDiv.classList.add('today');
      if (isSelected) dayDiv.classList.add('selected');

      dayDiv.innerHTML = `<span class="day-number">${day}</span>`;
      
      // Filter events on this specific date
      const dateStr = `${year}-${String(month+1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = events.filter(e => e.date === dateStr);

      if (dayEvents.length > 0) {
        const indicatorContainer = document.createElement('div');
        indicatorContainer.className = 'day-events-indicator';
        dayEvents.forEach(e => {
          const dot = document.createElement('span');
          dot.className = `event-dot ${e.category || 'Work'}`;
          indicatorContainer.appendChild(dot);
        });
        dayDiv.appendChild(indicatorContainer);
      }

      dayDiv.addEventListener('click', () => this.selectDate(year, month, day));
      daysContainer.appendChild(dayDiv);
    }

    // Render Agenda details for Selected Date
    const selYear = this.selectedDate.getFullYear();
    const selMonth = this.selectedDate.getMonth();
    const selDay = this.selectedDate.getDate();
    const selDateStr = `${selYear}-${String(selMonth+1).padStart(2, '0')}-${String(selDay).padStart(2, '0')}`;

    document.getElementById('selected-date-label').textContent = `Agenda: ${this.selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;

    const selectedEvents = events
      .filter(e => e.date === selDateStr)
      .sort((a, b) => a.time.localeCompare(b.time));

    const timelineContainer = document.getElementById('agenda-timeline');
    timelineContainer.innerHTML = '';

    if (selectedEvents.length === 0) {
      timelineContainer.innerHTML = '<div class="empty-state">No agenda events scheduled for this day. Click "+ Event" to add one.</div>';
    } else {
      selectedEvents.forEach(e => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.innerHTML = `
          <div class="timeline-time">${e.time}</div>
          <div class="timeline-details">
            <h4>${e.title}</h4>
            <p>Category: <span class="badge">${e.category}</span></p>
          </div>
          <button class="btn btn-icon btn-sm" onclick="planner.deleteEvent('${e.id}')" title="Delete Event">🗑️</button>
        `;
        timelineContainer.appendChild(item);
      });
    }
  }
};
