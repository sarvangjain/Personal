/**
 * NotificationSettings - UI for managing push notification preferences
 */

import { useState } from 'react';
import { 
  X, Bell, BellOff, Clock, Calendar, AlertTriangle, 
  CreditCard, Target, Check, Loader2, Smartphone, Info
} from 'lucide-react';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';

const DAYS_OF_WEEK = [
  { id: 'sunday', label: 'Sun' },
  { id: 'monday', label: 'Mon' },
  { id: 'tuesday', label: 'Tue' },
  { id: 'wednesday', label: 'Wed' },
  { id: 'thursday', label: 'Thu' },
  { id: 'friday', label: 'Fri' },
  { id: 'saturday', label: 'Sat' },
];

const REMINDER_DAYS_OPTIONS = [
  { days: 1, label: '1 day before' },
  { days: 2, label: '2 days before' },
  { days: 3, label: '3 days before' },
];

const THRESHOLD_OPTIONS = [60, 70, 80, 90, 95];

// Toggle switch component
function Toggle({ enabled, onToggle, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${enabled ? 'bg-teal-500' : 'bg-stone-700'}`}
    >
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
        enabled ? 'translate-x-5' : 'translate-x-0.5'
      }`} />
    </button>
  );
}

// Setting row component
function SettingRow({ icon: Icon, title, description, children, disabled = false }) {
  return (
    <div className={`flex items-start gap-3 p-4 bg-stone-800/30 rounded-xl ${disabled ? 'opacity-60' : ''}`}>
      <div className="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center flex-shrink-0">
        <Icon size={18} className="text-stone-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-200">{title}</p>
        <p className="text-xs text-stone-500 mt-0.5">{description}</p>
        {children && <div className="mt-3">{children}</div>}
      </div>
    </div>
  );
}

export default function NotificationSettings({ 
  isOpen, 
  onClose, 
  settings, 
  permission,
  isSupported,
  onRequestPermission,
  onUpdateSettings,
  onDisable,
  loading = false,
}) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [testingSent, setTestingSent] = useState(false);

  useBodyScrollLock(isOpen);

  // Handle toggle change
  const handleToggle = async (key, subKey = null) => {
    let newSettings;
    
    if (subKey) {
      newSettings = {
        ...localSettings,
        [key]: {
          ...localSettings[key],
          [subKey]: !localSettings[key][subKey],
        },
      };
    } else {
      newSettings = {
        ...localSettings,
        [key]: !localSettings[key],
      };
    }
    
    setLocalSettings(newSettings);
    await onUpdateSettings(newSettings);
  };

  // Handle nested setting change
  const handleNestedChange = async (key, subKey, value) => {
    const newSettings = {
      ...localSettings,
      [key]: {
        ...localSettings[key],
        [subKey]: value,
      },
    };
    
    setLocalSettings(newSettings);
    await onUpdateSettings(newSettings);
  };

  // Enable notifications
  const handleEnable = async () => {
    setSaving(true);
    const granted = await onRequestPermission();
    if (granted) {
      setLocalSettings(prev => ({ ...prev, enabled: true }));
    }
    setSaving(false);
  };

  // Disable all notifications
  const handleDisable = async () => {
    setSaving(true);
    await onDisable();
    setLocalSettings(prev => ({ ...prev, enabled: false }));
    setSaving(false);
  };

  // Send test notification
  const handleTestNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('ExpenseSight Test', {
        body: 'Notifications are working! You\'ll receive updates about your expenses.',
        icon: '/logo192.png',
      });
      setTestingSent(true);
      setTimeout(() => setTestingSent(false), 3000);
    }
  };

  const isEnabled = localSettings.enabled && permission === 'granted';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-auto bg-stone-900 border border-stone-700/50 rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
              <Bell size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-display text-stone-200">Notifications</h2>
              <p className="text-xs text-stone-500">Manage your alerts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-stone-800 text-stone-500 hover:text-stone-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4">
          {/* Not supported warning */}
          {!isSupported && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <div className="flex items-start gap-3">
                <Info size={18} className="text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-400">Not Supported</p>
                  <p className="text-xs text-stone-400 mt-1">
                    Push notifications are not supported in this browser. 
                    Try using Chrome, Firefox, or Edge on desktop.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Master toggle */}
          {isSupported && (
            <div className={`p-4 rounded-xl ${isEnabled ? 'bg-teal-500/10 border border-teal-500/20' : 'bg-stone-800/50 border border-stone-700/50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${isEnabled ? 'bg-teal-500/20' : 'bg-stone-800'} flex items-center justify-center`}>
                    {isEnabled ? (
                      <Bell size={18} className="text-teal-400" />
                    ) : (
                      <BellOff size={18} className="text-stone-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-stone-200">
                      {isEnabled ? 'Notifications Enabled' : 'Notifications Disabled'}
                    </p>
                    <p className="text-xs text-stone-500">
                      {isEnabled ? 'You\'ll receive alerts' : 'Enable to get alerts'}
                    </p>
                  </div>
                </div>
                
                {loading || saving ? (
                  <Loader2 size={20} className="text-teal-400 animate-spin" />
                ) : isEnabled ? (
                  <button
                    onClick={handleDisable}
                    className="px-3 py-1.5 text-xs bg-stone-700 hover:bg-stone-600 text-stone-300 rounded-lg transition-colors"
                  >
                    Disable
                  </button>
                ) : (
                  <button
                    onClick={handleEnable}
                    className="px-3 py-1.5 text-xs bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors"
                  >
                    Enable
                  </button>
                )}
              </div>
              
              {/* Test notification button */}
              {isEnabled && (
                <button
                  onClick={handleTestNotification}
                  className="mt-3 w-full py-2 text-xs bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {testingSent ? (
                    <>
                      <Check size={14} className="text-emerald-400" />
                      Test notification sent!
                    </>
                  ) : (
                    <>
                      <Smartphone size={14} />
                      Send test notification
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Notification types */}
          {isSupported && (
            <div className="space-y-3">
              <h3 className="text-xs text-stone-500 uppercase tracking-wider px-1">Alert Types</h3>

              {/* Daily Summary */}
              <SettingRow
                icon={Clock}
                title="Daily Summary"
                description="End-of-day spending recap"
                disabled={!isEnabled}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-500">At</span>
                    <select
                      value={localSettings.dailySummary?.time || '21:00'}
                      onChange={(e) => handleNestedChange('dailySummary', 'time', e.target.value)}
                      disabled={!isEnabled || !localSettings.dailySummary?.enabled}
                      className="px-2 py-1 bg-stone-800 border border-stone-700 rounded text-xs text-stone-300 focus:outline-none focus:border-teal-500"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                          {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Toggle
                    enabled={localSettings.dailySummary?.enabled}
                    onToggle={() => handleToggle('dailySummary', 'enabled')}
                    disabled={!isEnabled}
                  />
                </div>
              </SettingRow>

              {/* Weekly Check-in */}
              <SettingRow
                icon={Calendar}
                title="Weekly Check-in"
                description="Budget progress reminder"
                disabled={!isEnabled}
              >
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {DAYS_OF_WEEK.map(day => (
                      <button
                        key={day.id}
                        onClick={() => handleNestedChange('weeklyCheckin', 'day', day.id)}
                        disabled={!isEnabled || !localSettings.weeklyCheckin?.enabled}
                        className={`w-9 h-9 sm:w-8 sm:h-8 rounded text-[10px] font-medium transition-colors touch-manipulation ${
                          localSettings.weeklyCheckin?.day === day.id
                            ? 'bg-teal-500/20 text-teal-400'
                            : 'bg-stone-800 text-stone-500 active:bg-stone-700'
                        } ${!isEnabled || !localSettings.weeklyCheckin?.enabled ? 'opacity-50' : ''}`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                  <Toggle
                    enabled={localSettings.weeklyCheckin?.enabled}
                    onToggle={() => handleToggle('weeklyCheckin', 'enabled')}
                    disabled={!isEnabled}
                  />
                </div>
              </SettingRow>

              {/* Budget Warnings */}
              <SettingRow
                icon={AlertTriangle}
                title="Budget Warnings"
                description="Alert when spending exceeds threshold"
                disabled={!isEnabled}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-500">At</span>
                    <select
                      value={localSettings.budgetWarnings?.threshold || 80}
                      onChange={(e) => handleNestedChange('budgetWarnings', 'threshold', parseInt(e.target.value))}
                      disabled={!isEnabled || !localSettings.budgetWarnings?.enabled}
                      className="px-2 py-1 bg-stone-800 border border-stone-700 rounded text-xs text-stone-300 focus:outline-none focus:border-teal-500"
                    >
                      {THRESHOLD_OPTIONS.map(threshold => (
                        <option key={threshold} value={threshold}>{threshold}%</option>
                      ))}
                    </select>
                    <span className="text-xs text-stone-500">of budget</span>
                  </div>
                  <Toggle
                    enabled={localSettings.budgetWarnings?.enabled}
                    onToggle={() => handleToggle('budgetWarnings', 'enabled')}
                    disabled={!isEnabled}
                  />
                </div>
              </SettingRow>

              {/* Bill Reminders */}
              <SettingRow
                icon={CreditCard}
                title="Bill Reminders"
                description="Upcoming bill due alerts"
                disabled={!isEnabled}
              >
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5 flex-wrap">
                    {REMINDER_DAYS_OPTIONS.map(option => (
                      <button
                        key={option.days}
                        onClick={() => handleNestedChange('billReminders', 'daysBefore', option.days)}
                        disabled={!isEnabled || !localSettings.billReminders?.enabled}
                        className={`px-2.5 py-1.5 sm:px-2 sm:py-1 rounded text-[10px] font-medium transition-colors touch-manipulation ${
                          localSettings.billReminders?.daysBefore === option.days
                            ? 'bg-teal-500/20 text-teal-400'
                            : 'bg-stone-800 text-stone-500 active:bg-stone-700'
                        } ${!isEnabled || !localSettings.billReminders?.enabled ? 'opacity-50' : ''}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <Toggle
                    enabled={localSettings.billReminders?.enabled}
                    onToggle={() => handleToggle('billReminders', 'enabled')}
                    disabled={!isEnabled}
                  />
                </div>
              </SettingRow>

              {/* Goal Updates */}
              <SettingRow
                icon={Target}
                title="Goal Updates"
                description="Weekly progress on your savings goals"
                disabled={!isEnabled}
              >
                <div className="flex justify-end">
                  <Toggle
                    enabled={localSettings.goalUpdates?.enabled}
                    onToggle={() => handleToggle('goalUpdates', 'enabled')}
                    disabled={!isEnabled}
                  />
                </div>
              </SettingRow>
            </div>
          )}

          {/* Info note */}
          <div className="p-3 bg-stone-800/30 rounded-xl text-xs text-stone-500">
            <p>
              Notifications require the app to be open or installed as a PWA. 
              For best results, add ExpenseSight to your home screen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
