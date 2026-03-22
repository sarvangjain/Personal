import { useEffect, useState, useCallback } from 'react';
import { Recording } from '../types';
import { getAllRecordings, deleteRecording, deleteOldRecordings, getStorageUsage } from '../services/storage';
import { generateThumbnail } from '../services/mediaRecorder';

interface RecordingsListProps {
  onBack: () => void;
}

export function RecordingsList({ onBack }: RecordingsListProps) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [storageUsage, setStorageUsage] = useState(0);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  const loadRecordings = useCallback(async () => {
    setIsLoading(true);
    try {
      await deleteOldRecordings(24);
      const recs = await getAllRecordings();
      setRecordings(recs);

      const usage = await getStorageUsage();
      setStorageUsage(usage);

      for (const rec of recs.slice(0, 10)) {
        if (!thumbnails[rec.id] && rec.blob) {
          try {
            const thumb = await generateThumbnail(rec.blob, 1);
            setThumbnails((prev) => ({ ...prev, [rec.id]: thumb }));
          } catch (e) {
            console.error('[RecordingsList] Failed to generate thumbnail:', e);
          }
        }
      }
    } catch (error) {
      console.error('[RecordingsList] Failed to load recordings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [thumbnails]);

  useEffect(() => {
    loadRecordings();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteRecording(id);
      setRecordings((prev) => prev.filter((r) => r.id !== id));
      if (selectedRecording?.id === id) {
        setSelectedRecording(null);
      }
      const usage = await getStorageUsage();
      setStorageUsage(usage);
    } catch (error) {
      console.error('[RecordingsList] Failed to delete recording:', error);
    }
  };

  const handleDownload = (recording: Recording) => {
    const url = URL.createObjectURL(recording.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recording-${recording.timestamp.toISOString()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const d = new Date(date);
    const isToday = d.toDateString() === now.toDateString();
    const isYesterday = new Date(now.getTime() - 86400000).toDateString() === d.toDateString();

    if (isToday) {
      return `Today ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (isYesterday) {
      return `Yesterday ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (selectedRecording) {
    return (
      <div className="h-full flex flex-col bg-black">
        <div className="flex-1 relative">
          <video
            src={URL.createObjectURL(selectedRecording.blob)}
            controls
            autoPlay
            className="w-full h-full object-contain"
          />

          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent safe-area-inset-top">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSelectedRecording(null)}
                className="btn-icon bg-black/40 hover:bg-black/60"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => handleDownload(selectedRecording)}
                  className="btn-icon bg-black/40 hover:bg-black/60"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(selectedRecording.id)}
                  className="btn-icon bg-red-500/80 hover:bg-red-500"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-900 safe-area-inset-bottom">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{formatDate(selectedRecording.timestamp)}</p>
              <p className="text-sm text-gray-400">
                {formatDuration(selectedRecording.duration)} • {formatFileSize(selectedRecording.blob.size)}
              </p>
            </div>
            {selectedRecording.motionTriggered && (
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-500 rounded-full text-sm font-medium">
                Motion
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 safe-area-inset-top safe-area-inset-bottom">
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="btn-icon bg-gray-800">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold">Recordings</h1>
          </div>
          <div className="text-sm text-gray-400">
            {formatFileSize(storageUsage)} used
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : recordings.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
          </div>
          <p className="text-gray-400 text-center">No recordings yet</p>
          <p className="text-gray-500 text-sm text-center mt-1">
            Recordings will appear here when motion is detected
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-2 gap-3 p-4">
            {recordings.map((recording) => (
              <button
                key={recording.id}
                onClick={() => setSelectedRecording(recording)}
                className="relative aspect-video bg-gray-800 rounded-xl overflow-hidden group"
              >
                {thumbnails[recording.id] ? (
                  <img
                    src={thumbnails[recording.id]}
                    alt="Recording thumbnail"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-xs text-gray-300">{formatDate(recording.timestamp)}</p>
                  <p className="text-xs text-gray-400">{formatDuration(recording.duration)}</p>
                </div>

                {recording.motionTriggered && (
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-0.5 bg-yellow-500 text-black text-xs font-medium rounded">
                      Motion
                    </span>
                  </div>
                )}

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center">
                  <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
