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

  if (avatarUrl && avatarUrl.trim() !== '') {
    return (
      <img 
        src={avatarUrl} 
        alt={name} 
        className={`${className} object-cover border border-neutral-border shadow-xs`}
        referrerPolicy="no-referrer"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
          if (fallback) fallback.style.display = 'flex';
        }}
      />
    );
  }

  // Fallback SVGs depending on gender
  if (gender === 'Female') {
    return (
      <div className={`${className} bg-gradient-to-tr from-pink-500 to-rose-400 text-white flex items-center justify-center overflow-hidden shrink-0 border border-rose-200/50 shadow-xs relative`}>
        {/* Beautiful Female Silhouette Graphic */}
        <svg className="w-4/5 h-4/5 translate-y-[10%]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z" fill="currentColor" fillOpacity="0.85"/>
          <path d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z" fill="currentColor" fillOpacity="0.85"/>
          <path d="M12 13.5C11.5 13.5 10 15 10 15.5H14C14 15 12.5 13.5 12 13.5Z" fill="currentColor" fillOpacity="0.4"/>
        </svg>
      </div>
    );
  }

  // Male Default
  return (
    <div className={`${className} bg-gradient-to-tr from-blue-500 to-indigo-400 text-white flex items-center justify-center overflow-hidden shrink-0 border border-blue-200/50 shadow-xs relative`}>
      {/* Beautiful Male Silhouette Graphic */}
      <svg className="w-4/5 h-4/5 translate-y-[10%]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z" fill="currentColor" fillOpacity="0.85"/>
        <path d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z" fill="currentColor" fillOpacity="0.85"/>
      </svg>
    </div>
  );
}
