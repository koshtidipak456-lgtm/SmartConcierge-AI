// Kanban Tasks Module
const tasks = {
  activeFilter: 'all',

  init() {
    // Bind buttons
    document.getElementById('open-task-modal-btn').addEventListener('click', () => {
      // Set default date
      document.getElementById('m-task-due').value = new Date().toISOString().split('T')[0];
      document.getElementById('task-modal').classList.add('active');
    });

    // Form submission
    document.getElementById('modal-task-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveTask();
    });

    // Filtering
    document.querySelectorAll('.tasks-filters button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tasks-filters button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.activeFilter = e.target.getAttribute('data-filter');
        this.render();
      });
    });

    // Setup drag and drop for columns
    this.setupDragAndDrop();
    this.render();
  },

  setupDragAndDrop() {
    const columns = document.querySelectorAll('.kanban-column');
    
    columns.forEach(col => {
      col.addEventListener('dragover', (e) => {
        e.preventDefault();
        const container = col.querySelector('.column-cards');
        container.classList.add('drag-over');
      });

      col.addEventListener('dragleave', () => {
        const container = col.querySelector('.column-cards');
        container.classList.remove('drag-over');
      });

      col.addEventListener('drop', (e) => {
        e.preventDefault();
        const container = col.querySelector('.column-cards');
        container.classList.remove('drag-over');
        
        const taskId = e.dataTransfer.getData('text/plain');
        const status = col.getAttribute('data-status');
        
        this.moveTask(taskId, status);
      });
    });
  },

  moveTask(taskId, newStatus) {
    if (storage.isLocked) return;

    const task = storage.state.tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
      task.status = newStatus;
      storage.save();
      this.render();
      app.updateAllViews();

      // Proactive feedback
      agent.addAgentMessage(`Task "${task.title}" moved to ${newStatus === 'inprogress' ? 'In Progress' : newStatus === 'done' ? 'Completed' : 'To Do'}.`);
    }
  },

  saveTask() {
    if (storage.isLocked) return;

    const title = document.getElementById('m-task-title').value.trim();
    const priority = document.getElementById('m-task-priority').value;
    const due = document.getElementById('m-task-due').value;
    const tag = document.getElementById('m-task-tag').value.trim() || 'General';

    if (!title) return;

    const newTask = {
      id: 't_' + Date.now(),
      title,
      priority,
      due,
      tag,
      status: 'todo'
    };

    storage.state.tasks.push(newTask);
    storage.save();

    document.getElementById('task-modal').classList.remove('active');
    document.getElementById('modal-task-form').reset();

    this.render();
    app.updateAllViews();

    agent.addAgentMessage(`Added a new ${priority} priority task: "${title}".`);
  },

  deleteTask(taskId) {
    if (storage.isLocked) return;
    storage.state.tasks = storage.state.tasks.filter(t => t.id !== taskId);
    storage.save();
    this.render();
    app.updateAllViews();
  },

  toggleTaskStatus(taskId) {
    if (storage.isLocked) return;
    const task = storage.state.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = task.status === 'done' ? 'todo' : 'done';
      storage.save();
      this.render();
      app.updateAllViews();
    }
  },

  render() {
    if (storage.isLocked) {
      document.getElementById('todo-cards').innerHTML = '<div class="empty-state">Locked</div>';
      document.getElementById('inprogress-cards').innerHTML = '<div class="empty-state">Locked</div>';
      document.getElementById('done-cards').innerHTML = '<div class="empty-state">Locked</div>';
      return;
    }

    const todoCards = document.getElementById('todo-cards');
    const inprogressCards = document.getElementById('inprogress-cards');
    const doneCards = document.getElementById('done-cards');

    todoCards.innerHTML = '';
    inprogressCards.innerHTML = '';
    doneCards.innerHTML = '';

    const allTasks = storage.state.tasks || [];
    
    // Filter
    const filteredTasks = allTasks.filter(t => {
      if (this.activeFilter === 'all') return true;
      return t.priority === this.activeFilter;
    });

    let counts = { todo: 0, inprogress: 0, done: 0 };

    filteredTasks.forEach(t => {
      counts[t.status]++;
      
      const card = document.createElement('div');
      card.className = 'task-card';
      card.setAttribute('draggable', 'true');
      card.setAttribute('data-id', t.id);
      
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', t.id);
        e.dataTransfer.effectAllowed = 'move';
      });

      const dateBadge = t.due ? `<span class="task-due-date">📅 ${t.due}</span>` : '';

      card.innerHTML = `
        <div class="task-card-header">
          <span class="task-priority-tag ${t.priority}">${t.priority}</span>
          <span class="badge">${t.tag}</span>
        </div>
        <div class="task-card-body">
          <h4>${t.title}</h4>
        </div>
        <div class="task-card-footer">
          ${dateBadge}
          <div class="task-card-actions">
            <button class="task-action-btn" onclick="tasks.toggleTaskStatus('${t.id}')" title="Move status">${t.status === 'done' ? '↩️' : '✅'}</button>
            <button class="task-action-btn" onclick="tasks.deleteTask('${t.id}')" title="Delete Task">🗑️</button>
          </div>
        </div>
      `;

      if (t.status === 'todo') {
        todoCards.appendChild(card);
      } else if (t.status === 'inprogress') {
        inprogressCards.appendChild(card);
      } else if (t.status === 'done') {
        doneCards.appendChild(card);
      }
    });

    // Update Counts Labels
    document.getElementById('todo-count').textContent = counts.todo;
    document.getElementById('inprogress-count').textContent = counts.inprogress;
    document.getElementById('done-count').textContent = counts.done;

    // Check empty columns and render placeholders
    if (counts.todo === 0) todoCards.innerHTML = '<div class="empty-state">No tasks to do. Drag or add items here.</div>';
    if (counts.inprogress === 0) inprogressCards.innerHTML = '<div class="empty-state">No tasks in progress.</div>';
    if (counts.done === 0) doneCards.innerHTML = '<div class="empty-state">No completed tasks yet.</div>';
  }
};
