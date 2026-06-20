// Budget & Finances Module
const finances = {
  activeForm: 'add-tx', // 'add-tx' or 'set-budget'

  init() {
    // Bind Tab Switching in Form Box
    document.getElementById('tab-add-tx').addEventListener('click', (e) => this.switchForm('add-tx'));
    document.getElementById('tab-set-budget').addEventListener('click', (e) => this.switchForm('set-budget'));

    // Transaction form submit
    document.getElementById('tx-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveTransaction();
    });

    // Budget form submit
    document.getElementById('budget-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveBudgetLimit();
    });

    this.render();
  },

  switchForm(formName) {
    this.activeForm = formName;
    document.getElementById('tab-add-tx').classList.toggle('active', formName === 'add-tx');
    document.getElementById('tab-set-budget').classList.toggle('active', formName === 'set-budget');
    
    document.getElementById('tx-form').classList.toggle('active', formName === 'add-tx');
    document.getElementById('budget-form').classList.toggle('active', formName === 'set-budget');
  },

  saveTransaction() {
    if (storage.isLocked) return;

    const desc = document.getElementById('tx-desc').value.trim();
    const amount = parseFloat(document.getElementById('tx-amount').value);
    const type = document.getElementById('tx-type').value;
    const category = document.getElementById('tx-category').value;

    if (!desc || isNaN(amount) || amount <= 0) return;

    const newTx = {
      id: 'tx_' + Date.now(),
      desc,
      amount,
      type,
      category,
      date: new Date().toISOString().split('T')[0]
    };

    storage.state.finances.transactions.push(newTx);
    storage.save();

    document.getElementById('tx-form').reset();
    
    this.render();
    app.updateAllViews();

    // Proactive check: check budget limit
    if (type === 'expense') {
      const budgetLimit = storage.state.finances.budgets[category] || 0;
      const spent = this.getCategorySpent(category);
      
      let msg = `Recorded $${amount.toFixed(2)} expense for "${desc}" under ${category}.`;
      if (budgetLimit > 0 && spent > budgetLimit) {
        msg += ` ⚠️ Warning: You have exceeded your $${budgetLimit} budget limit for ${category} (Spent: $${spent.toFixed(2)})!`;
      } else if (budgetLimit > 0 && spent >= budgetLimit * 0.8) {
        msg += ` ⚠️ Alert: You have used ${Math.round((spent/budgetLimit)*100)}% of your ${category} budget.`;
      }
      agent.addAgentMessage(msg);
    } else {
      agent.addAgentMessage(`Awesome! Recorded $${amount.toFixed(2)} income from "${desc}".`);
    }
  },

  saveBudgetLimit() {
    if (storage.isLocked) return;

    const category = document.getElementById('budget-cat').value;
    const limit = parseFloat(document.getElementById('budget-limit').value);

    if (isNaN(limit) || limit < 0) return;

    storage.state.finances.budgets[category] = limit;
    storage.save();

    document.getElementById('budget-form').reset();
    this.render();
    app.updateAllViews();

    agent.addAgentMessage(`Updated your monthly budget limit for ${category} to $${limit.toFixed(2)}.`);
  },

  deleteTransaction(txId) {
    if (storage.isLocked) return;
    storage.state.finances.transactions = storage.state.finances.transactions.filter(t => t.id !== txId);
    storage.save();
    this.render();
    app.updateAllViews();
  },

  getCategorySpent(cat) {
    if (storage.isLocked) return 0;
    const txs = storage.state.finances.transactions || [];
    return txs
      .filter(t => t.type === 'expense' && t.category === cat)
      .reduce((sum, t) => sum + t.amount, 0);
  },

  render() {
    if (storage.isLocked) {
      document.getElementById('fin-total-income').textContent = '$0.00';
      document.getElementById('fin-total-expenses').textContent = '$0.00';
      document.getElementById('fin-net-savings').textContent = '$0.00';
      document.getElementById('budget-meters-container').innerHTML = '<div class="empty-state">Unlock vault to view finances</div>';
      document.getElementById('ledger-transactions-body').innerHTML = '<tr><td colspan="6" class="text-center">Vault Locked</td></tr>';
      return;
    }

    const txs = storage.state.finances.transactions || [];
    const budgets = storage.state.finances.budgets || {};

    // 1. Calculate Metrics
    let totalIncome = 0;
    let totalExpenses = 0;

    txs.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else {
        totalExpenses += t.amount;
      }
    });

    const netSavings = totalIncome - totalExpenses;

    document.getElementById('fin-total-income').textContent = `$${totalIncome.toFixed(2)}`;
    document.getElementById('fin-total-expenses').textContent = `$${totalExpenses.toFixed(2)}`;
    
    const savingsEl = document.getElementById('fin-net-savings');
    savingsEl.textContent = `$${netSavings.toFixed(2)}`;
    if (netSavings < 0) {
      savingsEl.style.color = 'var(--accent-danger)';
    } else {
      savingsEl.style.color = 'var(--accent-cyan)';
    }

    // 2. Render Budget Progress Meters
    const metersContainer = document.getElementById('budget-meters-container');
    metersContainer.innerHTML = '';

    Object.keys(budgets).forEach(cat => {
      const limit = budgets[cat];
      if (limit === 0) return; // Ignore if set to 0

      const spent = this.getCategorySpent(cat);
      const percent = Math.min(Math.round((spent / limit) * 100), 100);
      
      const row = document.createElement('div');
      row.className = 'budget-meter-row';
      
      let barClass = '';
      let warningTag = '';
      if (percent >= 100) {
        barClass = 'danger';
        warningTag = ' <span class="warning">Over Budget!</span>';
      } else if (percent >= 80) {
        barClass = 'warning';
      }

      row.innerHTML = `
        <div class="budget-meter-header">
          <span class="cat">${cat}${warningTag}</span>
          <span class="spent-limit">$${spent.toFixed(0)} / $${limit.toFixed(0)} (${percent}%)</span>
        </div>
        <div class="budget-bar-outer">
          <div class="budget-bar-inner ${barClass}" style="width: ${percent}%;"></div>
        </div>
      `;
      metersContainer.appendChild(row);
    });

    if (metersContainer.innerHTML === '') {
      metersContainer.innerHTML = '<div class="empty-state">No active budgets. Set limits above to track.</div>';
    }

    // 3. Render Transaction History (Ledger)
    const ledgerBody = document.getElementById('ledger-transactions-body');
    ledgerBody.innerHTML = '';

    const sortedTxs = [...txs].sort((a,b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

    if (sortedTxs.length === 0) {
      ledgerBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No transactions recorded. Log your first above!</td></tr>';
    } else {
      sortedTxs.forEach(t => {
        const tr = document.createElement('tr');
        tr.className = `type-${t.type}`;
        tr.innerHTML = `
          <td>${t.date}</td>
          <td>${t.desc}</td>
          <td><span class="badge">${t.category}</span></td>
          <td>${t.type === 'income' ? '🟢 Income' : '🔴 Expense'}</td>
          <td class="col-amount">${t.type === 'income' ? '+' : '-'}$${t.amount.toFixed(2)}</td>
          <td>
            <button class="btn btn-icon btn-sm" onclick="finances.deleteTransaction('${t.id}')">🗑️</button>
          </td>
        `;
        ledgerBody.appendChild(tr);
      });
    }
  }
};
