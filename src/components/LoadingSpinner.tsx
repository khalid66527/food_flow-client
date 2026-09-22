'use client';

import React from 'react';
import { HashLoader } from 'react-spinners';

export interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  fullScreen?: boolean;
  message?: string;
  className?: string;
  minHeight?: string;
}

export default function LoadingSpinner({
  size = 50,
  color = '#f97316',
  fullScreen = false,
  message,
  className = '',
  minHeight = '400px',
}: LoadingSpinnerProps) {
  const content = (
    <div
      className={`flex items-center justify-center w-full py-8 px-4 ${className}`}
      style={{ minHeight: minHeight || '450px' }}
    >
      <HashLoader color={color} size={size} />
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center min-h-screen w-full bg-white/85 dark:bg-gray-950/85 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
}
