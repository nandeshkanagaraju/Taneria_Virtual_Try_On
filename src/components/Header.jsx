import React from 'react';
import { Gem } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-white shadow-sm z-10 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Gem className="text-yellow-600 w-6 h-6" />
          <h1 className="text-2xl font-serif font-bold text-gray-900 tracking-wide">
            Taneria Jewels
          </h1>
        </div>
        <button className="bg-yellow-600 hover:bg-yellow-700 text-white px-5 py-2 rounded-full text-sm font-medium transition shadow-md">
          Shop Collection
        </button>
      </div>
    </header>
  );
}