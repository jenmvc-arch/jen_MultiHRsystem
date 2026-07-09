import React from 'react';
import { Employee } from '../types';

interface EmployeeAvatarProps {
  employee?: Partial<Employee>;
  className?: string;
}

export default function EmployeeAvatar({ employee, className = "w-8 h-8 rounded-full" }: EmployeeAvatarProps) {
  const gender = employee?.gender || 'Male';
  const name = employee?.name || 'User';
  const avatarUrl = employee?.avatarUrl;
  const [hasError, setHasError] = React.useState(false);

  // Reset error state if employee or avatarUrl changes
  React.useEffect(() => {
    setHasError(false);
  }, [employee, avatarUrl]);

  const initials = name
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'HR';

  const isFemale = gender === 'Female';

  if (avatarUrl && avatarUrl.trim() !== '' && !hasError) {
    return (
      <img 
        src={avatarUrl} 
        alt={name} 
        className={`${className} object-cover border border-neutral-border shadow-xs`}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div className={`${className} bg-gradient-to-tr ${isFemale ? 'from-pink-500 to-rose-400 border-rose-200/50' : 'from-blue-500 to-indigo-400 border-blue-200/50'} text-white flex items-center justify-center overflow-hidden shrink-0 border shadow-xs relative`}>
      <span className="font-bold text-[10px] tracking-wider select-none leading-none">
        {initials}
      </span>
    </div>
  );
}
