import React from 'react';
import { User, Move } from 'lucide-react';

export default function Canvas({ 
  baseImage, 
  placedItems, 
  selectedId, 
  containerRef, 
  onMouseDownItem,
  isDragging
}) {
  return (
    <section className="flex-1 bg-gray-200/50 flex items-center justify-center p-8 relative overflow-hidden h-full">
      <div 
        ref={containerRef}
        className="relative shadow-2xl rounded-sm overflow-hidden bg-white select-none ring-8 ring-white"
        style={{ 
           maxWidth: '100%', 
           maxHeight: '80vh',
           width: baseImage ? 'auto' : '500px',
           height: baseImage ? 'auto' : '600px'
        }}
      >
        {baseImage ? (
          <img 
            src={baseImage} 
            alt="Model" 
            className="max-h-[80vh] w-auto object-contain pointer-events-none block" 
            draggable="false"
          />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center text-gray-400">
             <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <User className="w-8 h-8 opacity-20" />
             </div>
             <p>Select a model to start</p>
          </div>
        )}

        {/* Jewelry Overlays */}
        {placedItems.map(item => (
          <div
            key={item.uid}
            onMouseDown={(e) => onMouseDownItem(e, item.uid)}
            style={{
              position: 'absolute',
              left: item.x,
              top: item.y,
              width: `${item.size}px`,
              transform: `rotate(${item.rotation}deg)`,
              cursor: isDragging && selectedId === item.uid ? 'grabbing' : 'grab',
              zIndex: 10,
            }}
            className={`group transition-transform ${selectedId === item.uid ? 'ring-2 ring-yellow-500 ring-offset-2 ring-offset-transparent' : ''}`}
          >
            <img 
              src={item.src} 
              alt="Jewelry" 
              className="w-full h-full object-contain pointer-events-none drop-shadow-xl" 
            />
            {selectedId === item.uid && (
               <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-yellow-500 text-white text-[10px] px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                 <Move size={10} className="inline mr-1"/> Drag
               </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}