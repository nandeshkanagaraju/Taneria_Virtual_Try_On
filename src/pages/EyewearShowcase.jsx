import React, { useState } from 'react';
import { ArrowLeft, X, Sparkles, Glasses } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EYEWEAR_SHOWCASE_ITEMS } from '../data/showcaseData';

export default function EyewearShowcase() {
    const [selectedItem, setSelectedItem] = useState(null);

    // Safety check
    const items = EYEWEAR_SHOWCASE_ITEMS || [];

    return (
        <div className="min-h-screen bg-gray-50 font-sans">

            {/* Header */}
            <div className="bg-white shadow-sm sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
                    <Link to="/" className="p-2 hover:bg-gray-100 rounded-full transition text-gray-600">
                        <ArrowLeft size={24} />
                    </Link>
                    <div className="flex items-center gap-2">
                        <Glasses className="text-gray-900" size={28} />
                        <h1 className="text-2xl font-serif font-bold text-gray-900">
                            Titan Eyewear Gallery
                        </h1>
                    </div>
                </div>
            </div>

            {/* Grid Content */}
            <div className="max-w-7xl mx-auto px-6 py-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => setSelectedItem(item)}
                            className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-2xl border border-gray-100 cursor-pointer transition-all duration-300 hover:-translate-y-2 group"
                        >
                            <div className="aspect-[4/3] bg-gray-50 rounded-xl mb-6 flex items-center justify-center p-8 relative overflow-hidden">
                                <img
                                    src={item.jewelImg}
                                    alt={item.name}
                                    className="w-full h-full object-contain drop-shadow-lg group-hover:scale-110 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                    <span className="bg-white px-6 py-3 rounded-full text-sm font-bold text-gray-900 shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                      View On Model
                    </span>
                                </div>
                            </div>

                            <h3 className="text-center font-serif text-xl font-medium text-gray-900">
                                {item.name}
                            </h3>
                            <p className="text-center text-gray-500 text-sm mt-1">Titan Collection</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Full Screen Modal */}
            {selectedItem && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl w-full max-w-7xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]">

                        {/* Left: Product Info */}
                        <div className="w-full md:w-[350px] bg-gray-50 p-8 flex flex-col items-center justify-center border-r border-gray-200 relative shrink-0 z-10">
                            <button
                                onClick={() => setSelectedItem(null)}
                                className="absolute top-4 left-4 md:hidden bg-white p-2 rounded-full shadow-md text-gray-800"
                            >
                                <X size={20} />
                            </button>

                            <div className="w-64 h-64 bg-white rounded-full shadow-xl flex items-center justify-center p-8 mb-8 border border-gray-100">
                                <img src={selectedItem.jewelImg} className="max-w-full max-h-full object-contain" />
                            </div>

                            <h2 className="text-3xl font-serif font-bold text-gray-900 text-center mb-4 leading-tight">
                                {selectedItem.name}
                            </h2>

                            <div className="flex items-center gap-2 text-purple-700 bg-purple-100 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
                                <Sparkles size={14} /> AI Generated Look
                            </div>
                        </div>

                        {/* Right: The Model Image */}
                        <div className="flex-1 bg-gray-100 relative flex items-center justify-center overflow-hidden group">
                            <img
                                src={selectedItem.modelImg}
                                className="w-full h-full object-cover"
                                alt="Model Preview"
                            />

                            <button
                                onClick={() => setSelectedItem(null)}
                                className="hidden md:block absolute top-6 right-6 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full transition backdrop-blur-md border border-white/30 shadow-lg"
                            >
                                <X size={28} />
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}