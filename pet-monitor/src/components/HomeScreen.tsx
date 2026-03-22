import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatRoomCode, isValidRoomCode } from '../services/peerService';
import { requestNotificationPermission, isNotificationSupported } from '../services/notifications';

interface HomeScreenProps {
  onStartCamera: () => void;
  onJoinViewer: (roomCode: string) => void;
  onViewRecordings: () => void;
}

export function HomeScreen({ onStartCamera, onJoinViewer, onViewRecordings }: HomeScreenProps) {
  const { state } = useApp();
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [showJoinInput, setShowJoinInput] = useState(false);

  const handleRoomCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRoomCode(e.target.value);
    setRoomCodeInput(formatted);
    setInputError(null);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomCodeInput) {
      setInputError('Please enter a room code');
      return;
    }

    if (!isValidRoomCode(roomCodeInput)) {
      setInputError('Room code must be 6 characters');
      return;
    }

    onJoinViewer(roomCodeInput.toUpperCase());
  };

  const handleStartCamera = async () => {
    if (isNotificationSupported()) {
      await requestNotificationPermission();
    }
    onStartCamera();
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 safe-area-inset-top safe-area-inset-bottom">
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-accent-500 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-primary-500/30">
          <svg className="w-14 h-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold mb-2">Pet Monitor</h1>
        <p className="text-gray-400 text-center mb-12 max-w-sm">
          Stream live video from your phone and watch from any device with motion detection alerts
        </p>

        <div className="w-full max-w-sm space-y-4">
          <button
            onClick={handleStartCamera}
            className="btn-primary w-full flex items-center justify-center gap-3 py-4"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="font-semibold">Start Camera</span>
          </button>

          {!showJoinInput ? (
            <button
              onClick={() => setShowJoinInput(true)}
              className="btn-secondary w-full flex items-center justify-center gap-3 py-4"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="font-semibold">Join as Viewer</span>
            </button>
          ) : (
            <form onSubmit={handleJoinSubmit} className="space-y-3">
              <div>
                <input
                  type="text"
                  value={roomCodeInput}
                  onChange={handleRoomCodeChange}
                  placeholder="Enter 6-digit code"
                  className={`input text-center text-2xl font-mono tracking-widest uppercase ${
                    inputError ? 'border-red-500 focus:ring-red-500' : ''
                  }`}
                  maxLength={6}
                  autoFocus
                />
                {inputError && (
                  <p className="text-red-500 text-sm mt-1 text-center">{inputError}</p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinInput(false);
                    setRoomCodeInput('');
                    setInputError(null);
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Connect
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="p-6 border-t border-gray-800">
        <button
          onClick={onViewRecordings}
          className="w-full flex items-center justify-between bg-gray-800 rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-medium">Recordings</p>
              <p className="text-sm text-gray-400">View saved motion clips</p>
            </div>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {state.error && (
        <div className="absolute bottom-20 left-4 right-4 bg-red-500 text-white p-4 rounded-xl">
          <p className="text-sm">{state.error}</p>
        </div>
      )}
    </div>
  );
}
