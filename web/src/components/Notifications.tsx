'use client';

import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface NotificationOptions {
  title?: string;
  message: string;
  type?: NotificationType;
  duration?: number;
}

interface NotificationEntry {
  id: string;
  title?: string;
  message: string;
  type: NotificationType;
  duration: number;
}

interface NotificationContextValue {
  notify: (options: NotificationOptions) => string;
  dismiss: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const typeStyles: Record<NotificationType, string> = {
  success: 'bg-emerald-600/95 border border-emerald-400/60 shadow-emerald-500/40',
  error: 'bg-rose-600/95 border border-rose-400/60 shadow-rose-500/40',
  info: 'bg-sky-600/95 border border-sky-400/60 shadow-sky-500/40',
  warning: 'bg-amber-600/95 border border-amber-400/60 shadow-amber-500/40',
};

const typeIcons: Record<NotificationType, string> = {
  success: 'OK',
  error: 'ERR',
  info: 'INFO',
  warning: 'WARN',
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  const removeNotification = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);

  const notify = useCallback(
    ({ title, message, type = 'info', duration = 4000 }: NotificationOptions) => {
      const id = generateId();
      const entry: NotificationEntry = {
        id,
        title,
        message,
        type,
        duration,
      };

      setNotifications((prev) => [...prev, entry]);

      const timeoutId = window.setTimeout(() => {
        removeNotification(id);
      }, duration);

      timers.current.set(id, timeoutId);
      return id;
    },
    [removeNotification]
  );

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      activeTimers.forEach((timeoutId) => window.clearTimeout(timeoutId));
      activeTimers.clear();
    };
  }, []);

  const contextValue = useMemo<NotificationContextValue>(() => ({
    notify,
    dismiss: removeNotification,
  }), [notify, removeNotification]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <div
        className="pointer-events-none fixed top-4 right-4 z-50 flex max-w-sm flex-col gap-3"
        aria-live="polite"
        role="status"
      >
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`pointer-events-auto flex w-full transform flex-col justify-between gap-2 rounded-xl px-4 py-3 text-white shadow-lg ring-1 ring-white/10 transition-all duration-200 ${
              typeStyles[notification.type]
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-lg" aria-hidden>{typeIcons[notification.type]}</span>
              <div className="flex-1">
                {notification.title ? (
                  <p className="text-sm font-semibold leading-tight">{notification.title}</p>
                ) : null}
                <p className="text-sm leading-snug text-white/90">{notification.message}</p>
              </div>
              <button
                type="button"
                onClick={() => removeNotification(notification.id)}
                className="ml-1 text-sm font-semibold text-white/70 transition hover:text-white"
                aria-label="Cerrar notificacion"
              >
                x
              </button>
            </div>
            <span className="sr-only">Notificacion de {notification.type}</span>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
