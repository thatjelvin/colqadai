import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getOrCreateUserForSupabaseId } from '@/lib/supabase-db-user';

// Define color schemes for different types
const colorSchemes: Record<string, { bgGradient: string; textColor: string; accentColor: string }> = {
  streak: { bgGradient: 'from-orange-400 to-yellow-400', textColor: 'white', accentColor: '#ff9e0b' },
  'topic-mastery': { bgGradient: 'from-green-400 to-emerald-400', textColor: 'white', accentColor: '#10b981' },
  'problems-solved': { bgGradient: 'from-blue-400 to-indigo-400', textColor: 'white', accentColor: '#3b82f6' },
};

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'streak';
    const title = searchParams.get('title') || 'Learning Progress';
    const value = searchParams.get('value') || '0';

    // Get color scheme for this type
    const colors = colorSchemes[type] || colorSchemes.streak;

    // Generate SVG markup
    const svg = `
      <svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:var(--start-color);stop-opacity:1" />
            <stop offset="100%" style="stop-color:var(--end-color);stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="800" height="400" fill="url(#grad1)" rx="20" />

        <!-- Icons based on type -->
        ${type === 'streak' ? '<circle cx="120" cy="100" r="40" fill="rgba(255,255,255,0.2)"/><path d="M90,100 L110,100 M100,90 L100,110 M80,90 C90,80 110,80 120,90 C130,100 130,120 120,130 C110,120 90,120 80,110" stroke="white" stroke-width="8" fill="none" stroke-linecap="round"/>' : ''}
        ${type === 'topic-mastery' ? '<path d="M120,60 L100,100 L140,100 L120,60 Z" fill="rgba(255,255,255,0.2)"/><polygon points="100,100 120,60 140,100" fill="white"/>' : ''}
        ${type === 'problems-solved' ? '<circle cx="120" cy="100" r="35" fill="rgba(255,255,255,0.2)"/><circle cx="120" cy="100" r="20" fill="white"/><path d="M120,60 L120,140 M80,100 L160,100" stroke="white" stroke-width="8" stroke-linecap="round"/>' : ''}

        <!-- Text content -->
        <text x="50%" y="200" text-anchor="middle" fill="${colors.textColor}" font-size="48" font-weight="bold" letter-spacing="-0.5px">${value}</text>
        <text x="50%" y="260" text-anchor="middle" fill="${colors.textColor}" font-size="24" opacity="0.9">${title}</text>

        <!-- Footer -->
        <rect x="0" y="350" width="800" height="50" fill="rgba(0,0,0,0.1)" />
        <text x="400" y="380" text-anchor="middle" fill="${colors.textColor}" opacity="0.8" font-size="18">
          Shared via Colqad Math Learning
        </text>
      </svg>
    `.replace(/var\(--start-color\)/g, colors.bgGradient.split('from')[1].split(' ')[0])
      .replace(/var\(--end-color\)/g, colors.bgGradient.split('to')[1].split(')')[0]);

    // Return the SVG with proper headers
    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error generating shareable image:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}