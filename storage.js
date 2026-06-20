// Local Storage & Vault Obfuscation Layer for SmartConcierge AI
const storage = {
  // Key name for localstorage
  STORAGE_KEY: 'smartconcierge_secure_vault',
  DEFAULT_PIN_KEY: 'SmartConciergeKey_Fallback',

  // Current session state (unlocked/decrypted in memory)
  state: null,
  
  // Vault encryption keys
  currentPIN: '',
  isLocked: false,

  // Default state initialization
  getDefaultState() {
    return {
      events: [
        { id: '1', title: 'Concierge Launch Day', date: new Date().toISOString().split('T')[0], time: '09:00', category: 'Work' },
        { id: '2', title: 'Review SmartConcierge Features', date: new Date().toISOString().split('T')[0], time: '14:00', category: 'Work' }
      ],
      tasks: [
        { id: 't1', title: 'Set up my personal profile', priority: 'High', due: new Date().toISOString().split('T')[0], tag: 'Setup', status: 'todo' },
        { id: 't2', title: 'Test natural language commands', priority: 'Medium', due: new Date().toISOString().split('T')[0], tag: 'Testing', status: 'inprogress' },
        { id: 't3', title: 'Read documentation on privacy vault', priority: 'Low', due: '', tag: 'Learning', status: 'done' }
      ],
      finances: {
        transactions: [
          { id: 'tx1', desc: 'Monthly Salary Credit', amount: 3500.00, type: 'income', category: 'Salary', date: new Date().toISOString().split('T')[0] },
          { id: 'tx2', desc: 'Organic Groceries', amount: 84.50, type: 'expense', category: 'Food', date: new Date().toISOString().split('T')[0] },
          { id: 'tx3', desc: 'Electric Bill', amount: 120.00, type: 'expense', category: 'Utilities', date: new Date().toISOString().split('T')[0] }
        ],
        budgets: {
          Food: 400,
          Utilities: 200,
          Entertainment: 150,
          Health: 100,
          Shopping: 200,
          Misc: 100
        }
      },
      habits: [
        { id: 'h1', name: 'Drink 3L Water', frequency: 'daily', streak: 4, lastCompleted: '' },
        { id: 'h2', name: 'Read 15 Pages', frequency: 'daily', streak: 2, lastCompleted: '' },
        { id: 'h3', name: '30 min Exercise', frequency: 'daily', streak: 0, lastCompleted: '' }
      ],
      fitness: {
        waterIntake: 750, // in ml
        sleepHours: 7.5,
        sleepQuality: 'Good',
        caloriesConsumed: 1850,
        caloriesBurned: 350
      },
      notes: [
        { id: 'n1', title: 'Welcome Note', content: 'Welcome to SmartConcierge! All notes are stored securely and encrypted when you lock your vault.', tags: ['welcome', 'guide'], date: new Date().toLocaleDateString() }
      ],
      vaultPIN: '', // Empty means no password lock set yet
      isLocked: false
    };
  },

  // Encryption Helpers (XOR + Base64)
  xorCipher(input, key) {
    let output = '';
    for (let i = 0; i < input.length; i++) {
      let charCode = input.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      output += String.fromCharCode(charCode);
    }
    return output;
  },

  encrypt(text, key) {
    const ciphered = this.xorCipher(text, key);
    return btoa(unescape(encodeURIComponent(ciphered)));
  },

  decrypt(ciphertext, key) {
    try {
      const deciphered = decodeURIComponent(escape(atob(ciphertext)));
      return this.xorCipher(deciphered, key);
    } catch (e) {
      console.error("Decryption failed:", e);
      return null;
    }
  },

  // Save the in-memory state back to LocalStorage
  save() {
    if (!this.state) return;
    
    const key = this.state.vaultPIN || this.DEFAULT_PIN_KEY;
    const jsonStr = JSON.stringify(this.state);
    const encrypted = this.encrypt(jsonStr, key);
    
    localStorage.setItem(this.STORAGE_KEY, encrypted);
  },

  // Load state from local storage.
  // Returns true on success, false if locked and needs PIN, or decrypt error
  load(providedPIN = '') {
    const rawData = localStorage.getItem(this.STORAGE_KEY);
    
    if (!rawData) {
      // Create brand new state if none exists
      this.state = this.getDefaultState();
      this.isLocked = false;
      this.currentPIN = '';
      this.save();
      return true;
    }

    // Try default fallback key first
    let decrypted = this.decrypt(rawData, this.DEFAULT_PIN_KEY);
    
    if (decrypted) {
      try {
        const parsed = JSON.parse(decrypted);
        if (!parsed.vaultPIN) {
          this.state = parsed;
          this.isLocked = false;
          this.currentPIN = '';
          return true;
        }
      } catch (e) {
        // Parse error, proceed to encrypted check
      }
    }

    // If default key failed, it means a custom PIN is set
    if (!providedPIN) {
      this.isLocked = true;
      this.state = null; // Don't expose anything in memory
      return false; // Requires password
    }

    // Attempt to decrypt with provided PIN
    decrypted = this.decrypt(rawData, providedPIN);
    if (!decrypted) {
      return false; // Wrong PIN
    }

    try {
      const parsed = JSON.parse(decrypted);
      if (parsed.vaultPIN === providedPIN) {
        this.state = parsed;
        this.currentPIN = providedPIN;
        this.isLocked = false;
        return true;
      }
    } catch (e) {
      // Invalid structure after decrypt
    }
    
    return false;
  },

  // Lock the vault explicitly (wipe state from memory, mark locked)
  lock() {
    if (this.state && this.state.vaultPIN) {
      this.save();
      this.state = null;
      this.currentPIN = '';
      this.isLocked = true;
      return true;
    }
    return false; // Can't lock if PIN is not set
  },

  // Set PIN for the first time or change it
  setPIN(newPIN) {
    if (!this.state) return false;
    this.state.vaultPIN = newPIN;
    this.currentPIN = newPIN;
    this.isLocked = false;
    this.save();
    return true;
  },

  // Export current encrypted data as a downloadable file
  exportBackup() {
    const rawData = localStorage.getItem(this.STORAGE_KEY);
    if (!rawData) return;
    
    const blob = new Blob([rawData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartconcierge_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Import data from a backup file
  importBackup(encryptedString, callback) {
    // Attempt decrypting with default fallback first, then PIN if set
    let decrypted = this.decrypt(encryptedString, this.DEFAULT_PIN_KEY);
    let parsedState = null;
    
    if (decrypted) {
      try {
        parsedState = JSON.parse(decrypted);
      } catch (e) {}
    }

    if (parsedState && !parsedState.vaultPIN) {
      this.state = parsedState;
      this.currentPIN = '';
      this.isLocked = false;
      this.save();
      if (callback) callback(true, "Backup imported successfully");
      return;
    }

    // Prompt for PIN to verify import
    if (callback) {
      callback(false, "Requires PIN verification", encryptedString);
    }
  },

  importWithPIN(encryptedString, pin, callback) {
    const decrypted = this.decrypt(encryptedString, pin);
    if (!decrypted) {
      if (callback) callback(false, "Invalid PIN. Decryption failed.");
      return;
    }

    try {
      const parsed = JSON.parse(decrypted);
      if (parsed.vaultPIN === pin) {
        this.state = parsed;
        this.currentPIN = pin;
        this.isLocked = false;
        this.save();
        if (callback) callback(true, "Backup imported and decrypted successfully");
      } else {
        if (callback) callback(false, "Decryption succeeded but data signature doesn't match PIN.");
      }
    } catch (e) {
      if (callback) callback(false, "Parsing data error.");
    }
  },

  // Delete everything
  purge() {
    localStorage.removeItem(this.STORAGE_KEY);
    this.state = this.getDefaultState();
    this.isLocked = false;
    this.currentPIN = '';
    this.save();
  }
};
