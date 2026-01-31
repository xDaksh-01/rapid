import React from 'react';

export default function TopTabs({ selected, onSelect }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onSelect('Overview')}
        className={`px-3 py-1 rounded-t-md ${selected === 'Overview' ? 'bg-[var(--bg-tertiary)] text-white' : 'text-[var(--text-secondary)] hover:text-white'}`}
      >
        Overview
      </button>
      <button
        onClick={() => onSelect('Filter')}
        className={`px-3 py-1 rounded-t-md ${selected === 'Filter' ? 'bg-[var(--bg-tertiary)] text-white' : 'text-[var(--text-secondary)] hover:text-white'}`}
      >
        Filter
      </button>
    </div>
  );
}
