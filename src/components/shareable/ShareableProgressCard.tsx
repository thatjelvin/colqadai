import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: string[]) {
  return twMerge(clsx(inputs));
}

import React from 'react';

interface ShareableProgressCardProps {
  type: 'streak' | 'topic-mastery' | 'problems-solved';
  title: string;
  subtitle: string;
  value: number | string;
  icon: React.ReactNode;
  shareText: string;
}

export function ShareableProgressCard({
  type,
  title,
  subtitle,
  value,
  icon,
  shareText,
}: ShareableProgressCardProps) {
  // Generate a shareable image URL
  const shareUrl = `/api/share/image?type=${type}&title=${encodeURIComponent(
    title
  )}&value=${encodeURIComponent(String(value))}`;

  // Handle image download
  const handleDownloadImage = async () => {
    try {
      const response = await fetch(shareUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.toLowerCase().replace(/\s+/g, '-')}-${value}.svg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
      alert('Failed to download image. Please try again.');
    }
  };

  return (
    <div className={cn('group', 'relative', 'overflow-hidden', 'rounded-2xl', 'border', 'border-border', 'bg-card', 'shadow-lg', 'transition-all', 'duration-300', 'hover:shadow-xl')}>
      <div className={cn('absolute', 'inset-0', '-z-10')}>
        <div className="absolute inset-0" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-muted/5"></div>
          <div className="absolute inset-0 bg-[url('/assets/grid-pattern.svg')] opacity-5"></div>
        </div>
      </div>

      <div className="relative p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <div className="flex items-center space-x-2 text-sm">
            {/* Share button */}
            <button
              onClick={() => navigator.clipboard.writeText(shareText)}
              className={cn('p-2 rounded-md bg-muted hover:bg-accent/50 transition-colors')}
              aria-label="Copy share text"
            >
              <svg
                className="h-4 w-4 text-muted-foreground group-hover:text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6h6m2 0a2 2 0 002 2v8a2 2 0 01-2 2zM12 12a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
            </button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{subtitle}</p>

        <div className="flex items-baseline space-x-2">
          <span className={cn('text-4xl font-bold tracking-tight', 'text-primary-foreground', 'drop-shadow-lg')}>
            {value}
          </span>
          <span className="text-sm text-muted-foreground">
            {/* Unit could be days, topics, problems etc */}
            {type === 'streak' && ' days'}
            {type === 'topic-mastery' && ' topics'}
            {type === 'problems-solved' && ' problems'}
          </span>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            {icon}
            <span>Keep learning!</span>
          </div>

          {/* Download/Save image button */}
          <button
            onClick={handleDownloadImage}
            className={cn('px-3 py-1 rounded-md text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground transition-colors')}
          >
            Save Image
          </button>
        </div>
      </div>
    </div>
  );
}