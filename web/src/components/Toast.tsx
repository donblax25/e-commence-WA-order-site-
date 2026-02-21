"use client";

import { useState, useEffect } from "react";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps extends Toast {
  onClose: (id: string) => void;
}

export function ToastItem({ id, message, type, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose(id), 300);
    }, 3500);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  const colors = {
    success: "bg-green-500 border-green-600",
    error: "bg-red-500 border-red-600",
    info: "bg-blue-500 border-blue-600"
  };

  const icons = {
    success: "✓",
    error: "✕",
    info: "ℹ"
  };

  return (
    <div
      className={`${colors[type]} border-l-4 text-white px-4 py-3 rounded shadow-lg flex items-center gap-3 min-w-[280px] 
        ${isExiting ? "toast-exit" : "toast-enter"}`}
    >
      <span className="text-xl font-bold flex-shrink-0">{icons[type]}</span>
      <span className="text-sm font-medium flex-1">{message}</span>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} onClose={onRemove} />
      ))}
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: ToastType = "info") => {
    const id = Date.now().toString() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, addToast, removeToast };
}
