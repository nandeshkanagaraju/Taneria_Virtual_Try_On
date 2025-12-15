import React from 'react';
import { Upload, User, Trash2, ZoomIn, ZoomOut, RotateCw, Sparkles, Plus, Shirt, Layers } from 'lucide-react';
// IMPORT ALL CATALOGS
import { JEWELRY_CATALOG, JEWELRY_SETS_CATALOG, APPAREL_CATALOG } from '../data/catalog.js';

export default function Sidebar({
                                    onUpload,
                                    onSample,
                                    onAddItem,
                                    onResize,
                                    onRotate,
                                    onRemove,
                                    selectedId,
                                    onDirectTryOn
                                }) {

    const renderItem = (item) => (
        <div
            key={item.id}
            className="relative group bg-white border border-gray-200 rounded-xl p-3 hover:shadow-lg hover:border-purple-500 transition-all duration-300"
        >
            <div
                onClick={() => onAddItem(item)}
                className="h-28 flex items-center justify-center bg-gray-50 rounded-lg mb-2 p-1 cursor-pointer overflow-hidden"
            >
                <img src={item.src} alt={item.name} className="h-full w-full object-contain drop-shadow-sm group-hover:scale-105 transition-transform" />
            </div>

            <p className="text-xs font-medium text-center text-gray-700 truncate mb-1">{item.name}</p>

            {/* OVERLAY BUTTONS */}
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2 z-10">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDirectTryOn(item);
                    }}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] font-bold py-2.5 rounded-lg shadow-md hover:scale-105 transition flex items-center justify-center gap-1"
                >
                    <Sparkles size={12} /> TRY ON
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onAddItem(item);
                    }}
                    className="w-full bg-gray-100 text-gray-700 text-[10px] font-bold py-2.5 rounded-lg hover:bg-gray-200 transition flex items-center justify-center gap-1"
                >
                    <Plus size={12} /> ADD
                </button>
            </div>
        </div>
    );

    return (
        <aside className="w-full md:w-80 bg-white border-r border-gray-200 flex flex-col shadow-xl z-20 h-full">

            {/* 1. Upload */}
            <div className="p-6 border-b border-gray-100">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">1. Model Setup</h2>
                <div className="flex gap-2">
                    <label className="flex-1 cursor-pointer bg-gray-50 hover:bg-gray-100 text-center py-4 rounded-xl border border-dashed border-gray-300 transition group">
                        <Upload className="w-5 h-5 mx-auto mb-1 text-gray-400 group-hover:text-yellow-600" />
                        <span className="text-xs font-semibold text-gray-500">Upload</span>
                        <input type="file" onChange={onUpload} accept="image/*" className="hidden" />
                    </label>
                    <button onClick={onSample} className="flex-1 bg-gray-50 hover:bg-gray-100 py-4 rounded-xl border border-gray-200 transition group">
                        <User className="w-5 h-5 mx-auto mb-1 text-gray-400 group-hover:text-yellow-600" />
                        <span className="text-xs font-semibold text-gray-500">Sample</span>
                    </button>
                </div>
            </div>

            {/* SCROLLABLE AREA */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide space-y-8">

                {/* 2. Jewelry Section */}
                <div>
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Sparkles size={14} /> 2. Jewelry
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        {JEWELRY_CATALOG.map(renderItem)}
                    </div>
                </div>

                {/* 3. Jewelry Sets Section (NEW) */}
                <div>
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Layers size={14} /> 3. Jewelry Sets
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        {JEWELRY_SETS_CATALOG.map(renderItem)}
                    </div>
                </div>

                {/* 4. Apparel Section */}
                <div>
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Shirt size={14} /> 4. Apparel / Sarees
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        {APPAREL_CATALOG.map(renderItem)}
                    </div>
                </div>

            </div>

            {/* 5. Controls */}
            <div className="p-4 bg-gray-50 border-t border-gray-200">
                <div className="flex justify-between gap-2">
                    <ControlButton icon={<ZoomIn size={18} />} onClick={() => onResize(10)} disabled={!selectedId} />
                    <ControlButton icon={<ZoomOut size={18} />} onClick={() => onResize(-10)} disabled={!selectedId} />
                    <ControlButton icon={<RotateCw size={18} />} onClick={onRotate} disabled={!selectedId} />
                    <ControlButton icon={<Trash2 size={18} />} onClick={onRemove} disabled={!selectedId} danger />
                </div>
            </div>
        </aside>
    );
}

function ControlButton({ icon, onClick, disabled, danger }) {
    const baseClass = "flex-1 rounded-lg p-3 transition flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed";
    const normalClass = "bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-yellow-600 hover:border-yellow-500";
    const dangerClass = "bg-red-50 border border-red-200 text-red-500 hover:bg-red-100";
    return <button onClick={onClick} disabled={disabled} className={`${baseClass} ${danger ? dangerClass : normalClass}`}>{icon}</button>;
}