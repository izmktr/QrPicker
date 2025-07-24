import React from 'react';

interface UrlLinkProps {
  url: string;
  title?: string;
  className?: string;
}

export const UrlLink: React.FC<UrlLinkProps> = ({ url, title, className = '' }) => {
  const getUrlTarget = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const currentDomain = window.location.hostname;
      
      if (urlObj.hostname === currentDomain) {
        return '_self';
      }
      
      return '_blank';
    } catch {
      return '_blank';
    }
  };

  const target = getUrlTarget(url);
  
  return (
    <div className={className}>
      {title && (
        <div className="font-bold text-lg text-gray-900 mb-1 break-all">{title}</div>
      )}
      <div className="flex items-center gap-2">
        <svg 
          className="w-4 h-4 text-blue-600" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
          />
        </svg>
        <a 
          href={url} 
          target={target}
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline break-all text-sm"
        >
          {url}
        </a>
      </div>
    </div>
  );
};
