// Notes & Privacy Vault module
const notes = {
  selectedNoteId: null,

  init() {
    // Form submission
    document.getElementById('note-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveNote();
    });

    // Clear form
    document.getElementById('clear-note-btn').addEventListener('click', () => this.clearForm());

    // Search bar
    document.getElementById('note-search-input').addEventListener('input', (e) => {
      this.render(e.target.value.trim());
    });

    this.render();
  },

  clearForm() {
    this.selectedNoteId = null;
    document.getElementById('note-id').value = '';
    document.getElementById('note-editor-title').textContent = 'New Note';
    document.getElementById('note-title').value = '';
    document.getElementById('note-content').value = '';
    document.getElementById('note-tags').value = '';
    document.getElementById('save-note-btn').textContent = 'Save Note';
  },

  loadNoteIntoEditor(noteId) {
    if (storage.isLocked) return;
    
    const note = storage.state.notes.find(n => n.id === noteId);
    if (!note) return;

    this.selectedNoteId = note.id;
    document.getElementById('note-id').value = note.id;
    document.getElementById('note-editor-title').textContent = 'Edit Note';
    document.getElementById('note-title').value = note.title;
    document.getElementById('note-content').value = note.content;
    document.getElementById('note-tags').value = note.tags.join(', ');
    document.getElementById('save-note-btn').textContent = 'Update Note';
  },

  saveNote() {
    if (storage.isLocked) return;

    const title = document.getElementById('note-title').value.trim();
    const content = document.getElementById('note-content').value.trim();
    const rawTags = document.getElementById('note-tags').value;

    if (!title || !content) return;

    const tags = rawTags
      ? rawTags.split(',').map(t => t.trim().toLowerCase()).filter(t => t !== '')
      : [];

    if (this.selectedNoteId) {
      // Update existing
      const note = storage.state.notes.find(n => n.id === this.selectedNoteId);
      if (note) {
        note.title = title;
        note.content = content;
        note.tags = tags;
        note.date = new Date().toLocaleDateString();
      }
      agent.addAgentMessage(`Note "${title}" updated successfully.`);
    } else {
      // Create new
      const newNote = {
        id: 'n_' + Date.now(),
        title,
        content,
        tags,
        date: new Date().toLocaleDateString()
      };
      storage.state.notes.push(newNote);
      agent.addAgentMessage(`Created new note: "${title}".`);
    }

    storage.save();
    this.clearForm();
    this.render();
    app.updateAllViews();
  },

  deleteNote(noteId) {
    if (storage.isLocked) return;
    
    storage.state.notes = storage.state.notes.filter(n => n.id !== noteId);
    storage.save();
    
    if (this.selectedNoteId === noteId) {
      this.clearForm();
    }
    
    this.render();
    app.updateAllViews();
  },

  exportNote(noteId) {
    if (storage.isLocked) return;
    const note = storage.state.notes.find(n => n.id === noteId);
    if (!note) return;

    const fileContent = `Title: ${note.title}\nDate: ${note.date}\nTags: ${note.tags.join(', ')}\n\n${note.content}`;
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  render(searchQuery = '') {
    if (storage.isLocked) {
      document.getElementById('notes-grid-container').innerHTML = '<div class="empty-state">Unlock vault to view notes</div>';
      return;
    }

    const container = document.getElementById('notes-grid-container');
    container.innerHTML = '';

    const list = storage.state.notes || [];
    
    const query = searchQuery.toLowerCase();
    const filtered = list.filter(n => {
      if (!query) return true;
      return n.title.toLowerCase().includes(query) ||
             n.content.toLowerCase().includes(query) ||
             n.tags.some(t => t.includes(query));
    });

    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state">No matching notes found.</div>';
      return;
    }

    filtered.forEach(n => {
      const card = document.createElement('div');
      card.className = 'note-card';
      
      const tagsHTML = n.tags.map(t => `<span class="note-tag">${t}</span>`).join('');

      card.innerHTML = `
        <div class="note-card-header">
          <h4 onclick="notes.loadNoteIntoEditor('${n.id}')" style="cursor:pointer; text-decoration: underline;" title="Edit Note">${n.title}</h4>
          <span style="font-size:0.7rem; color:var(--text-muted);">${n.date}</span>
        </div>
        <div class="note-card-body" onclick="notes.loadNoteIntoEditor('${n.id}')" style="cursor:pointer;" title="Edit Note">
          ${n.content}
        </div>
        <div class="note-card-footer">
          <div class="note-tags-list">
            ${tagsHTML}
          </div>
          <div class="note-card-actions">
            <button class="note-action-btn" onclick="notes.exportNote('${n.id}')" title="Export to TXT">📥</button>
            <button class="note-action-btn" onclick="notes.deleteNote('${n.id}')" title="Delete Note">🗑️</button>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }
};
