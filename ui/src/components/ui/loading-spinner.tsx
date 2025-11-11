import React from 'react'

interface LoadingSpinnerProps {
  message?: string
  description?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'overlay' | 'inline' | 'centered'
  className?: string
}

export function LoadingSpinner({
  message = 'Loading...',
  description,
  size = 'md',
  variant = 'centered',
  className = ''
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  }

  const containerClasses = {
    overlay: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50',
    inline: 'flex items-center justify-center',
    centered: 'flex items-center justify-center min-h-[200px]'
  }

  return (
    <div className={`${containerClasses[variant]} ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 flex flex-col items-center space-y-4">
        <div className={`${sizeClasses[size]} animate-spin`}>
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              className="text-blue-600"
              strokeDasharray="31.416"
              strokeDashoffset="31.416"
            >
              <animate
                attributeName="stroke-dasharray"
                dur="2s"
                values="0 31.416;15.708 15.708;0 31.416"
                repeatCount="indefinite"
              />
              <animate
                attributeName="stroke-dashoffset"
                dur="2s"
                values="0;-15.708;-31.416"
                repeatCount="indefinite"
              />
            </circle>
          </svg>
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {message}
          </h3>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
