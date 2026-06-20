// Proactive AI Concierge Assistant Module
const agent = {
  recognition: null,
  isListening: false,
  speechEnabled: true,

  init() {
    // Chat Submit Form
    document.getElementById('agent-chat-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleUserInput();
    });

    // Mic Toggle Button
    const micBtn = document.getElementById('agent-mic-btn');
    if (micBtn) {
      micBtn.addEventListener('click', () => this.toggleListening());
    }

    // Speech synthesis toggle
    const speechToggle = document.getElementById('agent-speech-toggle');
    if (speechToggle) {
      speechToggle.addEventListener('click', () => {
        this.speechEnabled = !this.speechEnabled;
        speechToggle.classList.toggle('active', this.speechEnabled);
        speechToggle.textContent = this.speechEnabled ? '🔊' : '🔇';
      });
    }

    // Initialize Web Speech Recognition if available
    this.setupSpeechRecognition();
  },

  setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.lang = 'en-US';
      this.recognition.interimResults = false;

      this.recognition.onstart = () => {
        this.isListening = true;
        document.getElementById('agent-mic-btn').classList.add('active');
      };

      this.recognition.onend = () => {
        this.isListening = false;
        document.getElementById('agent-mic-btn').classList.remove('active');
      };

      this.recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        document.getElementById('agent-chat-input').value = text;
        this.handleUserInput();
      };

      this.recognition.onerror = (e) => {
        console.error("Speech recognition error", e);
        this.stopListening();
      };
    } else {
      console.warn("Web Speech API is not supported in this browser.");
      document.getElementById('agent-mic-btn').style.display = 'none';
    }
  },

  toggleListening() {
    if (!this.recognition) return;
    if (this.isListening) {
      this.stopListening();
    } else {
      this.recognition.start();
    }
  },

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  },

  // Speech output synthesizer
  speak(text) {
    if (!this.speechEnabled) return;
    window.speechSynthesis.cancel(); // cancel current speech
    
    // Clean text from emojis for speech
    const cleanText = text.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "");
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    // Prefer a nice standard English voice if available
    const englishVoice = voices.find(voice => voice.lang.includes('en-'));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
    window.speechSynthesis.speak(utterance);
  },

  addMessage(sender, text) {
    const chatContainer = document.getElementById('agent-chat-messages');
    
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;
    bubble.innerHTML = `<p>${text}</p>`;
    
    chatContainer.appendChild(bubble);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  },

  // Shortcut for agent messages
  addAgentMessage(text) {
    this.addMessage('agent', text);
    this.speak(text);
  },

  handleUserInput() {
    const inputEl = document.getElementById('agent-chat-input');
    const rawText = inputEl.value.trim();
    if (!rawText) return;

    // Display user bubble
    this.addMessage('user', rawText);
    inputEl.value = '';

    if (storage.isLocked) {
      this.addAgentMessage("The privacy vault is currently locked. Please unlock it using your PIN first so I can access your schedule and data.");
      return;
    }

    // Process NLP parsing
    this.processNLP(rawText);
  },

  // Proactive welcome advice based on state
  triggerWelcomeAdvice() {
    if (storage.isLocked) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const todayEvents = storage.state.events.filter(e => e.date === todayStr);
    const pendingTasks = storage.state.tasks.filter(t => t.status !== 'done');
    const highTasks = pendingTasks.filter(t => t.priority === 'High');

    let msg = `Welcome back! `;
    
    if (todayEvents.length > 0) {
      msg += `You have ${todayEvents.length} planner events today. `;
    } else {
      msg += `Your agenda is clear today. `;
    }

    if (highTasks.length > 0) {
      msg += `You have ${highTasks.length} high priority tasks pending. `;
    } else if (pendingTasks.length > 0) {
      msg += `You have ${pendingTasks.length} active tasks on your Kanban board. `;
    }

    // Hydration check
    const water = storage.state.fitness.waterIntake || 0;
    if (water < 1000) {
      msg += `💧 Remember to stay hydrated! You have only logged ${water}ml of water so far.`;
    }

    this.addAgentMessage(msg);
  },

  // Rule-based Natural Language Processing Parser
  processNLP(text) {
    const textLower = text.toLowerCase();
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // 1. SCHEDULING INTENT: e.g., "schedule lunch tomorrow at 2 pm" or "meet alice on 2026-06-25 at 10:00"
    if (textLower.includes('schedule') || textLower.includes('meet') || textLower.includes('appointment') || textLower.includes('calendar')) {
      // Parse Date
      let eventDate = todayStr;
      if (textLower.includes('tomorrow')) {
        eventDate = tomorrowStr;
      } else {
        // Try to match date format YYYY-MM-DD
        const dateMatch = textLower.match(/\b\d{4}-\d{2}-\d{2}\b/);
        if (dateMatch) eventDate = dateMatch[0];
      }

      // Parse Time (e.g. 2:00 PM, 14:00, 3 PM)
      let eventTime = '12:00';
      const timeMatch = textLower.match(/\b\d{1,2}(:\d{2})?\s*(pm|am|pm|am)?\b/);
      if (timeMatch) {
        let rawTime = timeMatch[0];
        let hours = 12;
        let mins = "00";

        if (rawTime.includes(':')) {
          const parts = rawTime.split(':');
          hours = parseInt(parts[0]);
          mins = parts[1].replace(/[a-zA-Z]/g, '').trim();
        } else {
          hours = parseInt(rawTime);
        }

        if (rawTime.toLowerCase().includes('pm') && hours < 12) {
          hours += 12;
        } else if (rawTime.toLowerCase().includes('am') && hours === 12) {
          hours = 0;
        }
        eventTime = `${String(hours).padStart(2, '0')}:${mins}`;
      }

      // Extract Title (strip keywords)
      let title = text
        .replace(/schedule|meet|appointment|calendar|tomorrow|today|at\b|on\b/gi, '')
        .replace(/\b\d{1,2}(:\d{2})?\s*(pm|am)?\b/gi, '')
        .replace(/\b\d{4}-\d{2}-\d{2}\b/gi, '')
        .trim();
        
      if (!title) title = "Meeting Scheduled by AI";

      // Save event
      const newEvent = {
        id: 'e_' + Date.now(),
        title,
        date: eventDate,
        time: eventTime,
        category: 'Personal'
      };
      storage.state.events.push(newEvent);
      storage.save();
      app.updateAllViews();
      this.addAgentMessage(`📅 I've added "${title}" to your planner on ${eventDate} at ${eventTime}.`);
      return;
    }

    // 2. TASK INTENT: e.g., "add task buy groceries", "add high priority task study"
    if (textLower.includes('task') || textLower.includes('todo') || textLower.includes('kanban')) {
      let priority = 'Medium';
      if (textLower.includes('high')) priority = 'High';
      if (textLower.includes('low')) priority = 'Low';

      let title = text
        .replace(/add task|create task|todo|high priority|medium priority|low priority|priority/gi, '')
        .trim();

      if (!title) {
        this.addAgentMessage("What is the description of the task you want to add?");
        return;
      }

      const newTask = {
        id: 't_' + Date.now(),
        title,
        priority,
        due: todayStr,
        tag: 'General',
        status: 'todo'
      };
      storage.state.tasks.push(newTask);
      storage.save();
      app.updateAllViews();
      this.addAgentMessage(`✅ Added task: "${title}" with ${priority} priority.`);
      return;
    }

    // 3. FINANCE INTENT: e.g., "spent $25 on lunch", "earned $150 freelance", "record expense $15"
    if (textLower.includes('spent') || textLower.includes('expense') || textLower.includes('earned') || textLower.includes('income') || textLower.includes('$')) {
      // Find amount
      const amountMatch = text.match(/\$?(\d+(\.\d+)?)/);
      if (!amountMatch) {
        this.addAgentMessage("I couldn't parse the cash amount. Try saying 'spent $15 on lunch'.");
        return;
      }
      const amount = parseFloat(amountMatch[1]);
      
      let type = 'expense';
      if (textLower.includes('earned') || textLower.includes('income') || textLower.includes('salary')) {
        type = 'income';
      }

      // Try to determine category
      let category = 'Misc';
      if (type === 'income') {
        category = 'Salary';
      } else {
        if (textLower.includes('food') || textLower.includes('lunch') || textLower.includes('dinner') || textLower.includes('coffee') || textLower.includes('grocery')) {
          category = 'Food';
        } else if (textLower.includes('electricity') || textLower.includes('utility') || textLower.includes('water') || textLower.includes('rent')) {
          category = 'Utilities';
        } else if (textLower.includes('movie') || textLower.includes('game') || textLower.includes('party') || textLower.includes('show')) {
          category = 'Entertainment';
        } else if (textLower.includes('doctor') || textLower.includes('medicine') || textLower.includes('gym')) {
          category = 'Health';
        } else if (textLower.includes('clothes') || textLower.includes('mall') || textLower.includes('buy') || textLower.includes('shoes')) {
          category = 'Shopping';
        }
      }

      // Extract Description
      let desc = text
        .replace(/spent|expense|earned|income|record/gi, '')
        .replace(/\$?(\d+(\.\d+)?)/, '')
        .replace(/on\b|for\b|under\b/gi, '')
        .trim();

      if (!desc) desc = type === 'income' ? 'Income logged' : 'Expense logged';

      const newTx = {
        id: 'tx_' + Date.now(),
        desc,
        amount,
        type,
        category,
        date: todayStr
      };
      
      storage.state.finances.transactions.push(newTx);
      storage.save();
      app.updateAllViews();

      if (type === 'expense') {
        const budgetLimit = storage.state.finances.budgets[category] || 0;
        const spent = finances.getCategorySpent(category);
        
        let reply = `💸 Recorded $${amount.toFixed(2)} expense for "${desc}" under ${category}.`;
        if (budgetLimit > 0 && spent > budgetLimit) {
          reply += ` ⚠️ Alert: You exceeded your budget limit of $${budgetLimit} for ${category}! (Spent: $${spent.toFixed(2)})`;
        }
        this.addAgentMessage(reply);
      } else {
        this.addAgentMessage(`🟢 Income of $${amount.toFixed(2)} logged for "${desc}".`);
      }
      return;
    }

    // 4. NOTES INTENT: e.g., "create note Project Ideas: build new features"
    if (textLower.includes('note') || textLower.includes('memo')) {
      let content = text
        .replace(/create note|write note|add note|note/gi, '')
        .trim();

      let title = "Quick Note";
      if (content.includes(':')) {
        const parts = content.split(':');
        title = parts[0].trim();
        content = parts.slice(1).join(':').trim();
      }

      if (!content) {
        this.addAgentMessage("What is the content of the note you'd like me to write?");
        return;
      }

      const newNote = {
        id: 'n_' + Date.now(),
        title,
        content,
        tags: ['assistant'],
        date: today.toLocaleDateString()
      };
      
      storage.state.notes.push(newNote);
      storage.save();
      app.updateAllViews();
      this.addAgentMessage(`📝 Note "${title}" saved to your encrypted Vault.`);
      return;
    }

    // 5. HABITS INTENT: e.g., "complete drink water" or "check off read book"
    if (textLower.includes('habit') || textLower.includes('complete') || textLower.includes('check off')) {
      const habitsList = storage.state.habits || [];
      
      // Try to find matching habit name
      const habitName = textLower.replace(/complete|check off|habit|habit|mark/gi, '').trim();
      const matched = habitsList.find(h => h.name.toLowerCase().includes(habitName));

      if (matched) {
        habits.toggleHabit(matched.id);
        return;
      } else {
        this.addAgentMessage(`I couldn't find a habit named "${habitName}". Make sure it is added under your Habits tab first.`);
        return;
      }
    }

    // 6. HEALTH/WELLNESS INTENT: e.g. "drank 500ml water" or "slept 8 hours"
    if (textLower.includes('water') || textLower.includes('drink') || textLower.includes('sleep') || textLower.includes('calorie')) {
      // Water ml parsing
      if (textLower.includes('water') || textLower.includes('drink')) {
        const numMatch = textLower.match(/(\d+)\s*(ml|cups?|oz)/);
        if (numMatch) {
          let ml = parseInt(numMatch[1]);
          if (numMatch[2].includes('cup')) ml = ml * 250; // 1 cup = 250ml approx
          
          storage.state.fitness.waterIntake = (storage.state.fitness.waterIntake || 0) + ml;
          storage.save();
          app.updateAllViews();
          this.addAgentMessage(`💧 Great job logging ${ml}ml of water! Total hydration today: ${storage.state.fitness.waterIntake}ml.`);
          return;
        }
      }

      // Sleep parsing
      if (textLower.includes('sleep') || textLower.includes('slept')) {
        const numMatch = textLower.match(/(\d+(\.\d+)?)\s*(hr|hour)/);
        if (numMatch) {
          const hrs = parseFloat(numMatch[1]);
          storage.state.fitness.sleepHours = hrs;
          storage.state.fitness.sleepQuality = hrs >= 7 ? 'Good' : 'Fair';
          storage.save();
          app.updateAllViews();
          this.addAgentMessage(`🌙 Logged ${hrs} hours of sleep last night.`);
          return;
        }
      }
    }

    // Standard fallback replies
    const standardReplies = [
      "I parsed your command but didn't match a specific tool task. You can try saying: 'spent $20 on food', 'add task test code', or 'schedule coffee tomorrow at 11 AM'.",
      "I'm keeping your data secure and client-side. Let me know if you want to log expenses, create calendar events, or write new notes.",
      "I can assist you with your day. Try instructing me to: 'schedule team sync tomorrow at 9 am' or 'complete drink water habit'."
    ];
    
    const randomReply = standardReplies[Math.floor(Math.random() * standardReplies.length)];
    this.addAgentMessage(randomReply);
  }
};
