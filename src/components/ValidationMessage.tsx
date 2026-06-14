import { AlertCircle, CheckCircle } from 'lucide-react';

interface ValidationMessageProps {
  error?: string;
  success?: string;
  className?: string;
}

export default function ValidationMessage({ error, success, className = '' }: ValidationMessageProps) {
  if (!error && !success) return null;

  if (error) {
    return (
      <div className={`flex items-center gap-2 text-xs text-red-600 mt-1 ${className}`}>
        <AlertCircle className="w-3 h-3 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (success) {
    return (
      <div className={`flex items-center gap-2 text-xs text-green-600 mt-1 ${className}`}>
        <CheckCircle className="w-3 h-3 flex-shrink-0" />
        <span>{success}</span>
      </div>
    );
  }

  return null;
}