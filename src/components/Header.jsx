import React from 'react';
import { Gem, Grid } from 'lucide-react';
import { Link } from 'react-router-dom'; // Import Link

export default function Header() {
    return (
        <header className="bg-white shadow-sm z-10 border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition">
                    <Gem className="text-yellow-600 w-6 h-6" />
                    <h1 className="text-2xl font-serif font-bold text-gray-900 tracking-wide">
                        Taneria Jewels
                    </h1>
                </Link>

                <div className="flex gap-3">
                    {/* NEW BUTTON: Gallery */}
                    <Link to="/showcase">
                        <button className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 px-5 py-2 rounded-full text-sm font-medium transition">
                            <Grid size={16} /> Gallery Showcase
                        </button>
                    </Link>

                    <button className="bg-yellow-600 hover:bg-yellow-700 text-white px-5 py-2 rounded-full text-sm font-medium transition shadow-md">
                        Shop Collection
                    </button>
                </div>
            </div>
        </header>
    );
}