// Main App Orchestrator and Navigation Module

// Global Wellness Module Hook
const fitness = {
  addWater(amount) {
    if (storage.isLocked) return;
    storage.state.fitness.waterIntake = (storage.state.fitness.waterIntake || 0) + amount;
    storage.save();
    app.updateAllViews();
  },
  
  resetWater() {
    if (storage.isLocked) return;
    storage.state.fitness.waterIntake = 0;
    storage.save();
    app.updateAllViews();
  },

  logCalories(e) {
    e.preventDefault();
    if (storage.isLocked) return;

    const amount = parseInt(document.getElementById('calorie-amount').value);
    const type = document.getElementById('calorie-type').value;

    if (isNaN(amount) || amount <= 0) return;

    if (type === 'consumed') {
      storage.state.fitness.caloriesConsumed = (storage.state.fitness.caloriesConsumed || 0) + amount;
    } else {
      storage.state.fitness.caloriesBurned = (storage.state.fitness.caloriesBurned || 0) + amount;
    }

    storage.save();
    document.getElementById('calorie-form').reset();
    app.updateAllViews();
  },

  logSleep(e) {
    e.preventDefault();
    if (storage.isLocked) return;

    const hours = parseFloat(document.getElementById('sleep-hours').value);
    const quality = document.getElementById('sleep-quality').value;

    if (isNaN(hours) || hours <= 0) return;

    storage.state.fitness.sleepHours = hours;
    storage.state.fitness.sleepQuality = quality;

    storage.save();
    document.getElementById('sleep-form').reset();
    app.updateAllViews();
  }
};

const app = {
  currentTab: 'dashboard',

  init() {
    // 1. Initial State Load
    const loadSuccess = storage.load();
    
    // 2. Setup Navigation
    document.querySelectorAll('.nav-menu a').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = item.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    // 3. Vault PIN UI Bindings
    document.getElementById('vault-unlock-btn').addEventListener('click', () => this.unlockVault());
    document.getElementById('vault-lock-btn').addEventListener('click', () => this.lockVault());
    document.getElementById('quick-lock-btn').addEventListener('click', () => this.lockVault());
    document.getElementById('vault-set-pin-btn').addEventListener('click', () => this.setVaultPIN());
    document.getElementById('vault-purge-btn').addEventListener('click', () => this.purgeData());
    
    // Backup bindings
    document.getElementById('vault-export-btn').addEventListener('click', () => storage.exportBackup());
    document.getElementById('vault-import-file').addEventListener('change', (e) => this.importBackup(e));

    // Theme Toggle
    document.getElementById('theme-toggle-btn').addEventListener('click', () => this.toggleTheme());

    // Fitness Submit Hooks
    document.getElementById('calorie-form').addEventListener('submit', (e) => fitness.logCalories(e));
    document.getElementById('sleep-form').addEventListener('submit', (e) => fitness.logSleep(e));

    // 4. Start Clock
    this.startClock();

    // 5. Initialize Sub-Modules
    planner.init();
    tasks.init();
    finances.init();
    habits.init();
    notes.init();
    agent.init();

    // 6. Update Security Indicators
    this.updateSecurityStatusUI();

    // 7. Update View
    this.updateAllViews();

    // 8. Welcome message on start
    setTimeout(() => {
      agent.triggerWelcomeAdvice();
    }, 1200);
  },

  startClock() {
    const updateTime = () => {
      const now = new Date();
      // Format 12hr Time
      let hours = now.getHours();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 is 12
      const mins = String(now.getMinutes()).padStart(2, '0');
      
      document.getElementById('widget-time').textContent = `${hours}:${mins} ${ampm}`;

      // Date Format
      const options = { weekday: 'long', month: 'short', day: 'numeric' };
      document.getElementById('widget-date').textContent = now.toLocaleDateString('en-US', options);
    };

    updateTime();
    setInterval(updateTime, 60000);
  },

  switchTab(tabName) {
    this.currentTab = tabName;

    // Remove active from all sidebar links and views
    document.querySelectorAll('.nav-menu a').forEach(a => a.classList.remove('active'));
    document.querySelectorAll('.view-panel').forEach(panel => panel.classList.remove('active'));

    // Set active link and panel
    const link = document.querySelector(`.nav-menu a[data-tab="${tabName}"]`);
    if (link) link.classList.add('active');

    const panel = document.getElementById(`view-${tabName}`);
    if (panel) panel.classList.add('active');

    // Update Titles
    const titleEl = document.getElementById('current-view-title');
    const subtitleEl = document.getElementById('current-view-subtitle');

    const titles = {
      dashboard: { main: 'Dashboard', sub: 'Welcome back. Here is your concierge overview.' },
      planner: { main: 'Planner & Schedule', sub: 'Organize meetings, daily events, and timelines.' },
      tasks: { main: 'Tasks Board', sub: 'Kanban tasks prioritized for execution.' },
      finances: { main: 'Finances Ledger', sub: 'Budget ceilings, expense entries, and cashflow.' },
      habits: { main: 'Habit Streaks', sub: 'Track and check off daily repetitive actions.' },
      fitness: { main: 'Fitness & Wellness', sub: 'Monitor daily water, sleep cycles, and calorie logs.' },
      notes: { main: 'Notes & Documents', sub: 'Privacy-first structured workspace notes.' },
      vault: { main: 'Privacy Vault', sub: 'Settings for secure PIN locks and offline database backups.' }
    };

    if (titles[tabName]) {
      titleEl.textContent = titles[tabName].main;
      subtitleEl.textContent = titles[tabName].sub;
    }

    this.updateAllViews();
  },

  toggleTheme() {
    const isDark = document.body.classList.contains('dark-theme');
    document.body.classList.toggle('dark-theme', !isDark);
    document.body.classList.toggle('light-theme', isDark);

    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (isDark) {
      toggleBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      `;
    } else {
      toggleBtn.innerHTML = `
        <svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
      `;
    }
  },

  // Security UI Actions
  updateSecurityStatusUI() {
    const indicator = document.getElementById('vault-status-indicator');
    const badgeText = indicator.querySelector('.text');
    const title = document.getElementById('vault-status-title');
    const desc = document.getElementById('vault-status-desc');
    const authArea = document.getElementById('vault-auth-area');
    const actionsArea = document.getElementById('vault-actions-area');
    const lockBtn = document.getElementById('quick-lock-btn');
    const graphicIcon = document.getElementById('vault-graphic-icon');

    if (storage.isLocked) {
      indicator.className = 'security-badge locked';
      badgeText.textContent = 'Vault Encrypted';
      title.textContent = 'Vault is Encrypted & Locked';
      desc.textContent = 'All planner data is currently stored encrypted in LocalStorage. Enter your PIN key to unlock access, export, or import data.';
      authArea.style.display = 'block';
      actionsArea.classList.add('disabled');
      lockBtn.style.display = 'none';
      graphicIcon.textContent = '🔒';
    } else {
      indicator.className = 'security-badge unlocked';
      badgeText.textContent = 'Vault Unlocked';
      title.textContent = 'Vault is Open & Accessible';
      desc.textContent = 'You have unlocked the secure memory space. All dashboard, calendar, finance, and wellness items are editable. Make sure to lock it when leaving.';
      authArea.style.display = 'none';
      actionsArea.classList.remove('disabled');
      graphicIcon.textContent = '🔓';
      
      if (storage.state && storage.state.vaultPIN) {
        lockBtn.style.display = 'flex';
      } else {
        lockBtn.style.display = 'none'; // No lock button if PIN isn't set
      }
    }
  },

  unlockVault() {
    const pin = document.getElementById('vault-pin-input').value;
    if (!pin) {
      alert("Please enter your PIN key.");
      return;
    }

    const success = storage.load(pin);
    if (success) {
      document.getElementById('vault-pin-input').value = '';
      this.updateSecurityStatusUI();
      this.updateAllViews();
      agent.addAgentMessage("🔓 Vault decrypted successfully. Welcome back to your dashboard.");
    } else {
      alert("Invalid PIN code. Decryption failed.");
    }
  },

  lockVault() {
    const success = storage.lock();
    if (success) {
      this.updateSecurityStatusUI();
      this.updateAllViews();
      this.switchTab('vault');
      agent.addAgentMessage("🔒 Vault locked and in-memory variables flushed. Storage encrypted.");
    } else {
      alert("You cannot lock the vault because a custom security PIN has not been set yet. Please set one below first.");
    }
  },

  setVaultPIN() {
    const pin = prompt("Enter a new numeric PIN code to encrypt and lock your data (4 to 8 characters):");
    if (!pin) return;
    
    if (pin.length < 4 || pin.length > 8 || isNaN(pin)) {
      alert("PIN must be a numeric value containing 4 to 8 digits.");
      return;
    }

    storage.setPIN(pin);
    this.updateSecurityStatusUI();
    this.updateAllViews();
    
    agent.addAgentMessage(`🔒 Security PIN has been configured. The vault is active. You can now lock it at any time.`);
  },

  purgeData() {
    if (confirm("WARNING: This will permanently delete all your secure calendar, tasks, finances, habits, wellness logs, and notes. This cannot be undone. Proceed?")) {
      storage.purge();
      this.updateSecurityStatusUI();
      this.updateAllViews();
      this.switchTab('dashboard');
      agent.addAgentMessage("🧹 All local database and configuration variables have been purged.");
    }
  },

  importBackup(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const encryptedString = evt.target.result;
      
      storage.importBackup(encryptedString, (success, msg, rawData) => {
        if (success) {
          alert(msg);
          this.updateSecurityStatusUI();
          this.updateAllViews();
        } else {
          // Requires PIN to unlock
          const pin = prompt("This backup file requires a security PIN to decrypt. Please enter the matching PIN code:");
          if (pin) {
            storage.importWithPIN(rawData, pin, (suc, m) => {
              alert(m);
              if (suc) {
                this.updateSecurityStatusUI();
                this.updateAllViews();
              }
            });
          }
        }
      });
    };
    reader.readAsText(file);
  },

  // Central Hub to trigger individual components render
  updateAllViews() {
    if (storage.isLocked) {
      this.updateSecurityStatusUI();
      // Render locked elements or defaults
      this.renderDashboardLocked();
      planner.render();
      tasks.render();
      finances.render();
      habits.render();
      notes.render();
      return;
    }

    this.updateSecurityStatusUI();

    // 1. Render all sub-modules
    planner.render();
    tasks.render();
    finances.render();
    habits.render();
    notes.render();

    // 2. Refresh Dashboard Cards dynamically
    this.renderDashboardActive();
  },

  renderDashboardLocked() {
    document.getElementById('dash-pending-tasks-count').textContent = '—';
    document.getElementById('dash-budget-remaining').textContent = '$—';
    document.getElementById('dash-habit-streak').textContent = '—';
    document.getElementById('dash-agenda-list').innerHTML = '<div class="empty-state">Unlock vault to view today\'s agenda.</div>';
    document.getElementById('dash-task-list').innerHTML = '<div class="empty-state">Unlock vault to view urgent tasks.</div>';
    document.getElementById('dash-habits-list').innerHTML = '<div class="empty-state">Unlock vault to view habits.</div>';
    document.getElementById('dash-finance-chart').innerHTML = '<text x="100" y="80" text-anchor="middle" fill="var(--text-muted)">Vault Locked</text>';
    document.getElementById('dash-finance-metrics').innerHTML = '';
    document.getElementById('dash-water-intake').textContent = '0 ml';
    document.getElementById('dash-sleep-hours').textContent = '0 hrs';
  },

  renderDashboardActive() {
    if (!storage.state) return;

    // Tasks Count
    const pendingTasks = storage.state.tasks.filter(t => t.status !== 'done');
    document.getElementById('dash-pending-tasks-count').textContent = pendingTasks.length;

    // Streaks Count
    const habitsList = storage.state.habits || [];
    const maxStreak = habitsList.reduce((max, h) => h.streak > max ? h.streak : max, 0);
    document.getElementById('dash-habit-streak').textContent = `${maxStreak}d`;

    // Budgets Remaining
    const budgets = storage.state.finances.budgets || {};
    const txs = storage.state.finances.transactions || [];
    let totalExpenses = 0;
    txs.forEach(t => {
      if (t.type === 'expense') totalExpenses += t.amount;
    });
    const totalBudgetLimit = Object.values(budgets).reduce((sum, limit) => sum + limit, 0);
    const budgetRemaining = Math.max(0, totalBudgetLimit - totalExpenses);
    document.getElementById('dash-budget-remaining').textContent = `$${budgetRemaining.toFixed(0)}`;

    // Today's Agenda list
    const todayStr = new Date().toISOString().split('T')[0];
    const todayEvents = storage.state.events.filter(e => e.date === todayStr);
    const dashAgendaList = document.getElementById('dash-agenda-list');
    dashAgendaList.innerHTML = '';
    
    if (todayEvents.length === 0) {
      dashAgendaList.innerHTML = '<div class="empty-state">No planner events scheduled for today.</div>';
    } else {
      todayEvents.sort((a,b) => a.time.localeCompare(b.time)).slice(0, 3).forEach(e => {
        const item = document.createElement('div');
        item.className = 'dash-agenda-item';
        item.innerHTML = `
          <span>${e.title}</span>
          <span class="time-lbl">${e.time}</span>
        `;
        dashAgendaList.appendChild(item);
      });
    }

    // High priority tasks list
    const highTasks = pendingTasks.filter(t => t.priority === 'High');
    const dashTaskList = document.getElementById('dash-task-list');
    dashTaskList.innerHTML = '';

    if (highTasks.length === 0) {
      dashTaskList.innerHTML = '<div class="empty-state">No urgent tasks due today!</div>';
    } else {
      highTasks.slice(0, 3).forEach(t => {
        const item = document.createElement('div');
        item.className = 'dash-task-item priority-High';
        item.innerHTML = `
          <span>${t.title}</span>
          <span class="badge">${t.tag}</span>
        `;
        dashTaskList.appendChild(item);
      });
    }

    // Habits List today checkins
    const todayStrFull = new Date().toISOString().split('T')[0];
    const dashHabitsList = document.getElementById('dash-habits-list');
    dashHabitsList.innerHTML = '';

    if (habitsList.length === 0) {
      dashHabitsList.innerHTML = '<div class="empty-state">No habits configured.</div>';
    } else {
      habitsList.slice(0, 4).forEach(h => {
        const isCompletedToday = h.lastCompleted === todayStrFull;
        const item = document.createElement('div');
        item.className = 'dash-habit-item';
        item.innerHTML = `
          <span>${h.name} (${h.streak}d)</span>
          <span style="color:${isCompletedToday ? 'var(--accent-emerald)' : 'var(--text-muted)'}; font-weight:700;">
            ${isCompletedToday ? '✓ Done' : '○ Pending'}
          </span>
        `;
        dashHabitsList.appendChild(item);
      });
    }

    // Render Dashboard circular ring gauge
    const chartSvg = document.getElementById('dash-finance-chart');
    const utilizationPercent = totalBudgetLimit > 0 ? Math.min(Math.round((totalExpenses / totalBudgetLimit) * 100), 100) : 0;
    const strokeDashOffset = 251.2 - (251.2 * utilizationPercent) / 100;

    chartSvg.innerHTML = `
      <circle cx="90" cy="75" r="40" stroke="rgba(255,255,255,0.04)" stroke-width="8" fill="transparent"></circle>
      <circle cx="90" cy="75" r="40" stroke="${utilizationPercent >= 100 ? 'var(--accent-danger)' : utilizationPercent >= 80 ? 'var(--accent-warning)' : 'var(--accent-cyan)'}" stroke-width="8" fill="transparent"
              stroke-dasharray="251.2" stroke-dashoffset="${strokeDashOffset}" stroke-linecap="round" transform="rotate(-90 90 75)" style="transition: stroke-dashoffset 0.4s ease;"></circle>
      <text x="90" y="80" text-anchor="middle" font-family="var(--font-title)" font-weight="700" font-size="15" fill="#fff">${utilizationPercent}%</text>
      <text x="90" y="96" text-anchor="middle" font-size="8" fill="var(--text-muted)">Budget Limit</text>
      
      <text x="175" y="55" font-family="var(--font-title)" font-weight="600" font-size="12" fill="#fff">Financial Ratio</text>
      <text x="175" y="75" font-size="10" fill="var(--text-muted)">Spent: $${totalExpenses.toFixed(0)}</text>
      <text x="175" y="92" font-size="10" fill="var(--text-muted)">Ceiling: $${totalBudgetLimit.toFixed(0)}</text>
      <text x="175" y="109" font-size="10" fill="var(--text-muted)">Remaining: $${budgetRemaining.toFixed(0)}</text>
    `;

    // Render wellness summary text
    const fitnessData = storage.state.fitness || {};
    document.getElementById('dash-water-intake').textContent = `${fitnessData.waterIntake || 0} ml`;
    document.getElementById('dash-sleep-hours').textContent = `${fitnessData.sleepHours || 0} hrs`;

    // Hydration fill glass UI
    const waterFill = document.getElementById('water-fill-level');
    const waterText = document.getElementById('water-level-text');
    if (waterFill && waterText) {
      const waterPercent = Math.min(Math.round(((fitnessData.waterIntake || 0) / 2500) * 100), 100);
      waterFill.style.height = `${waterPercent}%`;
      waterText.textContent = `${fitnessData.waterIntake || 0} / 2500 ml`;
    }

    // Calories logs fill UI
    const consTxt = document.getElementById('cal-consumed-text');
    const consBar = document.getElementById('cal-consumed-bar');
    const burnTxt = document.getElementById('cal-burned-text');
    const burnBar = document.getElementById('cal-burned-bar');

    if (consTxt && consBar) {
      const consKcal = fitnessData.caloriesConsumed || 0;
      const consPercent = Math.min(Math.round((consKcal / 2000) * 100), 100);
      consTxt.textContent = `${consKcal} / 2000 kcal`;
      consBar.style.width = `${consPercent}%`;
    }
    if (burnTxt && burnBar) {
      const burnKcal = fitnessData.caloriesBurned || 0;
      const burnPercent = Math.min(Math.round((burnKcal / 500) * 100), 100);
      burnTxt.textContent = `${burnKcal} / 500 kcal`;
      burnBar.style.width = `${burnPercent}%`;
    }

    // Sleep log visual updates
    const sleepHrsVal = document.getElementById('sleep-hours-val');
    const sleepQualLbl = document.getElementById('sleep-quality-lbl');
    if (sleepHrsVal && sleepQualLbl) {
      sleepHrsVal.textContent = `${fitnessData.sleepHours || 0} hrs`;
      sleepQualLbl.textContent = `Quality: ${fitnessData.sleepQuality || 'No sleep logged'}`;
    }
  }
};

// Start bootstrapping on document load
window.addEventListener('DOMContentLoaded', () => {
  app.init();
});
