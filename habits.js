// Habits Tracker Module
const habits = {
  init() {
    document.getElementById('habit-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.createHabit();
    });

    this.render();
  },

  createHabit() {
    if (storage.isLocked) return;

    const name = document.getElementById('habit-name').value.trim();
    const frequency = document.getElementById('habit-frequency').value;

    if (!name) return;

    const newHabit = {
      id: 'h_' + Date.now(),
      name,
      frequency,
      streak: 0,
      lastCompleted: ''
    };

    storage.state.habits.push(newHabit);
    storage.save();

    document.getElementById('habit-name').value = '';
    this.render();
    app.updateAllViews();

    agent.addAgentMessage(`I've added the daily habit: "${name}". Let's build a streak!`);
  },

  toggleHabit(habitId) {
    if (storage.isLocked) return;

    const habit = storage.state.habits.find(h => h.id === habitId);
    if (!habit) return;

    const todayStr = new Date().toISOString().split('T')[0];
    
    if (habit.lastCompleted === todayStr) {
      // Undo completion
      habit.lastCompleted = '';
      habit.streak = Math.max(0, habit.streak - 1);
      agent.addAgentMessage(`Undone: "${habit.name}". Streak adjusted.`);
    } else {
      // Completed today
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (habit.lastCompleted === yesterdayStr) {
        habit.streak += 1;
      } else {
        habit.streak = 1; // Started new streak
      }
      
      habit.lastCompleted = todayStr;
      agent.addAgentMessage(`Awesome job! You completed your habit: "${habit.name}". Current Streak: ${habit.streak} days! 🔥`);
    }

    storage.save();
    this.render();
    app.updateAllViews();
  },

  deleteHabit(habitId) {
    if (storage.isLocked) return;
    storage.state.habits = storage.state.habits.filter(h => h.id !== habitId);
    storage.save();
    this.render();
    app.updateAllViews();
  },

  render() {
    if (storage.isLocked) {
      document.getElementById('habits-list-container').innerHTML = '<div class="empty-state">Unlock vault to view habits</div>';
      return;
    }

    const container = document.getElementById('habits-list-container');
    container.innerHTML = '';

    const list = storage.state.habits || [];
    const todayStr = new Date().toISOString().split('T')[0];

    if (list.length === 0) {
      container.innerHTML = '<div class="empty-state">No habits created. Use the form on the left to add one!</div>';
      return;
    }

    list.forEach(h => {
      const isCompletedToday = h.lastCompleted === todayStr;
      
      const row = document.createElement('div');
      row.className = 'habit-row';
      row.innerHTML = `
        <div class="habit-details">
          <h4>${h.name}</h4>
          <p>Frequency: <span class="badge">${h.frequency}</span> | Current Streak: <strong>${h.streak} days</strong></p>
        </div>
        <div class="habit-tracker-actions">
          <button class="habit-check-btn ${isCompletedToday ? 'completed' : ''}" 
                  onclick="habits.toggleHabit('${h.id}')" 
                  title="${isCompletedToday ? 'Mark Incomplete' : 'Complete Habit'}">
            ${isCompletedToday ? '✓' : '○'}
          </button>
          <button class="btn btn-icon btn-sm" onclick="habits.deleteHabit('${h.id}')" title="Delete Habit">🗑️</button>
        </div>
      `;
      container.appendChild(row);
    });
  }
};
