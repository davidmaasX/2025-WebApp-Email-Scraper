import React, { useEffect } from "react";
import { ToastState } from "@/lib/types";
import { CheckCircle, AlertCircle } from 'lucide-react';

interface ToastProps {
  toast: ToastState;
  onClose: () => void;
}

export function Toast({ toast, onClose }: ToastProps) {
  const { message, type, visible } = toast;
  
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (visible) {
      timer = setTimeout(() => {
        onClose();
      }, 3000);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [visible, onClose]);
  
  if (!visible) return null;
  
  return (
    <div 
      className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg transition-opacity duration-300 ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
      }`}
    >
      <div className="flex items-center text-white">
        {type === 'success' ? (
          <CheckCircle className="h-5 w-5 mr-2" />
        ) : (
          <AlertCircle className="h-5 w-5 mr-2" />
        )}
        <span>{message}</span>
      </div>
    </div>
  );
}
