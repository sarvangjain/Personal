class LimitNotifier {
  constructor() {
    this.localTimeouts = new Map();
    this.countdownInterval = null;
    this.NOTIFY_BEFORE_MS = 5 * 60 * 1000;
    this.API_BASE = '/api/notifications';
    this.syncInterval = null;

    this.elements = {
      timeInput: document.getElementById('timeInput'),
      ntfyTopic: document.getElementById('ntfyTopic'),
      setButton: document.getElementById('setNotification'),
      activeSection: document.getElementById('activeNotifications'),
      activeList: document.getElementById('activeList'),
      permissionWarning: document.getElementById('permissionWarning'),
      enableButton: document.getElementById('enableNotifications'),
      historyList: document.getElementById('historyList'),
      syncIndicator: document.getElementById('syncIndicator'),
      syncText: document.getElementById('syncText'),
    };

    this.init();
  }

  init() {
    this.loadSettings();
    this.checkNotificationPermission();
    this.loadHistory();
    this.bindEvents();
    this.syncNotifications();
    this.startSyncInterval();
    this.startCountdownInterval();
  }

  bindEvents() {
    this.elements.setButton.addEventListener('click', () => this.handleSetNotification());
    this.elements.enableButton.addEventListener('click', () => this.requestPermission());
    this.elements.timeInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleSetNotification();
    });
    this.elements.ntfyTopic.addEventListener('change', () => this.saveSettings());
    this.elements.ntfyTopic.addEventListener('blur', () => this.saveSettings());
  }

  loadSettings() {
    const topic = localStorage.getItem('ntfyTopic') || '';
    this.elements.ntfyTopic.value = topic;
  }

  saveSettings() {
    const topic = this.elements.ntfyTopic.value.trim();
    localStorage.setItem('ntfyTopic', topic);
  }

  checkNotificationPermission() {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'denied') {
      this.showPermissionWarning();
    } else if (Notification.permission === 'default') {
      this.showPermissionWarning();
    }
  }

  showPermissionWarning() {
    this.elements.permissionWarning.classList.remove('hidden');
  }

  async requestPermission() {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      this.elements.permissionWarning.classList.add('hidden');
    }
  }

  parseTimeInput(input) {
    const text = input.trim().toLowerCase();
    const now = new Date();

    const relativePattern = /(?:resets?\s+)?in\s+(?:(\d+)\s*(?:hr|hour)s?)?\s*(?:(\d+)\s*(?:min|minute)s?)?/i;
    const relativeMatch = text.match(relativePattern);

    if (relativeMatch && (relativeMatch[1] || relativeMatch[2])) {
      const hours = parseInt(relativeMatch[1]) || 0;
      const minutes = parseInt(relativeMatch[2]) || 0;
      const targetTime = new Date(now.getTime() + (hours * 60 + minutes) * 60 * 1000);
      return targetTime;
    }

    const absolutePattern = /(?:resets?\s+)?(\d{1,2}):(\d{2})\s*(am|pm)?/i;
    const absoluteMatch = text.match(absolutePattern);

    if (absoluteMatch) {
      let hours = parseInt(absoluteMatch[1]);
      const minutes = parseInt(absoluteMatch[2]);
      const meridiem = absoluteMatch[3]?.toLowerCase();

      if (meridiem === 'pm' && hours !== 12) {
        hours += 12;
      } else if (meridiem === 'am' && hours === 12) {
        hours = 0;
      }

      const targetTime = new Date(now);
      targetTime.setHours(hours, minutes, 0, 0);

      if (targetTime <= now) {
        targetTime.setDate(targetTime.getDate() + 1);
      }

      return targetTime;
    }

    return null;
  }

  async handleSetNotification() {
    const input = this.elements.timeInput.value;

    if (!input.trim()) {
      this.showError('Please enter a time');
      return;
    }

    const targetTime = this.parseTimeInput(input);

    if (!targetTime) {
      this.showError('Could not parse time. Try "Resets 2:30 PM" or "in 3 hr 9 min"');
      return;
    }

    const now = new Date();

    if (targetTime <= now) {
      this.showError('The reset time has already passed');
      return;
    }

    let notifyTime = new Date(targetTime.getTime() - this.NOTIFY_BEFORE_MS);

    if (notifyTime <= now) {
      notifyTime = new Date(now.getTime() + 3000);
    }

    await this.createNotification(targetTime, notifyTime, input);
    this.elements.timeInput.value = '';
  }

  async createNotification(targetTime, notifyTime, originalInput) {
    const ntfyTopic = this.elements.ntfyTopic.value.trim();

    this.setSyncStatus('syncing');

    try {
      const response = await fetch(this.API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetTime: targetTime.toISOString(),
          notifyTime: notifyTime.toISOString(),
          originalInput,
          ntfyTopic: ntfyTopic || null,
        }),
      });

      if (!response.ok) throw new Error('Failed to create notification');

      const notification = await response.json();
      this.setupLocalTimeout(notification);
      this.setSyncStatus('synced');
      await this.syncNotifications();
    } catch (error) {
      console.error('Error creating notification:', error);
      this.setSyncStatus('error');
      this.showError('Failed to save. Check connection.');
    }
  }

  async syncNotifications() {
    try {
      const response = await fetch(this.API_BASE);
      if (!response.ok) throw new Error('Failed to fetch');

      const notifications = await response.json();
      const activeNotifications = notifications.filter(n => !n.sent);

      this.clearLocalTimeouts();
      activeNotifications.forEach(n => this.setupLocalTimeout(n));

      this.renderActiveNotifications(activeNotifications);
      this.setSyncStatus('synced');
    } catch (error) {
      console.error('Sync error:', error);
      this.setSyncStatus('error');
    }
  }

  setupLocalTimeout(notification) {
    const notifyTime = new Date(notification.notifyTime).getTime();
    const now = Date.now();
    const delay = notifyTime - now;

    if (delay <= 0) return;

    const timeoutId = setTimeout(() => {
      this.sendBrowserNotification(notification);
      this.localTimeouts.delete(notification.id);
    }, delay);

    this.localTimeouts.set(notification.id, {
      timeoutId,
      notification,
    });
  }

  clearLocalTimeouts() {
    for (const [id, { timeoutId }] of this.localTimeouts) {
      clearTimeout(timeoutId);
    }
    this.localTimeouts.clear();
  }

  sendBrowserNotification(notification) {
    const targetTime = new Date(notification.targetTime);
    const timeStr = targetTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (Notification.permission === 'granted') {
      const notif = new Notification('Claude Limit Reset Soon!', {
        body: `Your Claude limit resets in 5 minutes (at ${timeStr})`,
        tag: 'claude-limit-reset',
        requireInteraction: true,
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    }

    this.playSound();
    this.addToHistory(targetTime, 'sent');
    this.syncNotifications();
  }

  renderActiveNotifications(notifications) {
    if (notifications.length === 0) {
      this.elements.activeSection.classList.add('hidden');
      return;
    }

    this.elements.activeSection.classList.remove('hidden');
    this.elements.activeList.innerHTML = notifications.map(n => {
      const targetTime = new Date(n.targetTime);
      const notifyTime = new Date(n.notifyTime);
      const timeStr = targetTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const hasPhone = n.ntfyTopic ? '📱' : '';

      return `
        <li data-id="${n.id}" data-notify-time="${notifyTime.getTime()}">
          <div class="notif-info">
            <div class="notif-time">Resets at ${timeStr} ${hasPhone}</div>
            <div class="notif-countdown" data-countdown></div>
            <div class="notif-meta">Notifying 5 min before</div>
          </div>
          <button class="btn-cancel" onclick="app.cancelNotification('${n.id}')">Cancel</button>
        </li>
      `;
    }).join('');
  }

  startCountdownInterval() {
    this.countdownInterval = setInterval(() => {
      this.updateCountdowns();
    }, 1000);
  }

  updateCountdowns() {
    const now = Date.now();
    const countdownElements = document.querySelectorAll('[data-countdown]');

    countdownElements.forEach(el => {
      const li = el.closest('li');
      const notifyTime = parseInt(li.dataset.notifyTime);
      const remaining = notifyTime - now;

      if (remaining <= 0) {
        el.textContent = 'Notifying now!';
        return;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      let timeStr = '';
      if (hours > 0) {
        timeStr = `${hours}h ${minutes}m ${seconds}s`;
      } else if (minutes > 0) {
        timeStr = `${minutes}m ${seconds}s`;
      } else {
        timeStr = `${seconds}s`;
      }

      el.textContent = timeStr;
    });
  }

  async cancelNotification(id) {
    try {
      await fetch(`${this.API_BASE}/${id}`, { method: 'DELETE' });

      const timeout = this.localTimeouts.get(id);
      if (timeout) {
        clearTimeout(timeout.timeoutId);
        const targetTime = new Date(timeout.notification.targetTime);
        this.addToHistory(targetTime, 'cancelled');
        this.localTimeouts.delete(id);
      }

      await this.syncNotifications();
    } catch (error) {
      console.error('Error cancelling:', error);
    }
  }

  startSyncInterval() {
    this.syncInterval = setInterval(() => {
      this.syncNotifications();
    }, 30000);
  }

  setSyncStatus(status) {
    const indicator = this.elements.syncIndicator;
    const text = this.elements.syncText;

    indicator.className = 'sync-indicator';

    if (status === 'syncing') {
      indicator.classList.add('syncing');
      text.textContent = 'Syncing...';
    } else if (status === 'error') {
      indicator.classList.add('error');
      text.textContent = 'Sync error';
    } else {
      text.textContent = 'Synced';
    }
  }

  playSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.log('Could not play sound:', e);
    }
  }

  showError(message) {
    this.elements.timeInput.style.borderColor = '#ef4444';
    this.elements.timeInput.placeholder = message;

    setTimeout(() => {
      this.elements.timeInput.style.borderColor = '';
      this.elements.timeInput.placeholder = "e.g., 'Resets 2:30 PM' or 'Resets in 3 hr 9 min'";
    }, 2000);
  }

  addToHistory(targetTime, status) {
    const history = this.getHistory();
    const timeStr = targetTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = targetTime.toLocaleDateString([], { month: 'short', day: 'numeric' });

    history.unshift({
      time: `${dateStr}, ${timeStr}`,
      status,
      timestamp: Date.now(),
    });

    if (history.length > 10) {
      history.pop();
    }

    localStorage.setItem('notificationHistory', JSON.stringify(history));
    this.renderHistory();
  }

  getHistory() {
    try {
      return JSON.parse(localStorage.getItem('notificationHistory')) || [];
    } catch {
      return [];
    }
  }

  loadHistory() {
    this.renderHistory();
  }

  renderHistory() {
    const history = this.getHistory();

    if (history.length === 0) {
      this.elements.historyList.innerHTML = '<li style="color: var(--text-secondary);">No notifications yet</li>';
      return;
    }

    this.elements.historyList.innerHTML = history.map(item => `
      <li>
        <span class="time">${item.time}</span>
        <span class="status-badge ${item.status}">${item.status}</span>
      </li>
    `).join('');
  }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new LimitNotifier();
});
