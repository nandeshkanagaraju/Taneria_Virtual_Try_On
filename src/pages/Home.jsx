import React, { useState, useRef, useEffect } from 'react';

// --- FIX: UPDATED PATHS (Added "../") ---
import Header from '../components/Header.jsx';
import Sidebar from '../components/Sidebar.jsx';
import Canvas from '../components/Canvas.jsx';
import AIModal from '../components/AIModal.jsx';

export default function Home() {
    const [baseImage, setBaseImage] = useState(null);
    const [placedItems, setPlacedItems] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);

    // AI Modal State
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [activeAIItem, setActiveAIItem] = useState(null);

    // --- Handlers ---
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setBaseImage(event.target.result);
                setPlacedItems([]);
                setSelectedId(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGarmentUpload = (e) => {
        const file = e.target.files[0];
        if (!baseImage) {
            alert("Please upload the Customer/Model photo first!");
            return;
        }
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const customItem = {
                    id: 'custom-upload',
                    name: "Custom Uploaded Saree",
                    type: 'clothing',
                    src: event.target.result
                };
                setActiveAIItem(customItem);
                setIsAIModalOpen(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSampleImage = () => {
        setBaseImage('https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1000&auto=format&fit=crop');
        setPlacedItems([]);
        setSelectedId(null);
    };

    const addItem = (item) => {
        if (!baseImage) {
            alert("Please upload a photo first!");
            return;
        }
        const newItem = {
            uid: Date.now(),
            ...item,
            x: 100,
            y: 100,
            size: 150,
            rotation: 0
        };
        setPlacedItems([...placedItems, newItem]);
        setSelectedId(newItem.uid);
    };

    const handleDirectTryOn = (item) => {
        if (!baseImage) {
            alert("Please upload a photo of the customer first!");
            return;
        }
        setActiveAIItem(item);
        setIsAIModalOpen(true);
    };

    const updateItem = (uid, updates) => {
        setPlacedItems(items => items.map(item => item.uid === uid ? { ...item, ...updates } : item));
    };

    const removeItem = () => {
        if (selectedId) {
            setPlacedItems(items => items.filter(i => i.uid !== selectedId));
            setSelectedId(null);
        }
    };

    const handleResize = (delta) => {
        if (!selectedId) return;
        const item = placedItems.find(i => i.uid === selectedId);
        if (item) updateItem(selectedId, { size: Math.max(50, item.size + delta) });
    };

    const handleRotate = () => {
        if (!selectedId) return;
        const item = placedItems.find(i => i.uid === selectedId);
        if (item) updateItem(selectedId, { rotation: item.rotation + 15 });
    };

    // Dragging Logic
    const handleMouseDown = (e, uid) => {
        e.stopPropagation();
        setSelectedId(uid);
        setIsDragging(true);
        const item = placedItems.find(i => i.uid === uid);
        setDragOffset({ x: e.clientX - item.x, y: e.clientY - item.y });
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDragging && selectedId && containerRef.current) {
                const newX = e.clientX - dragOffset.x;
                const newY = e.clientY - dragOffset.y;
                updateItem(selectedId, { x: newX, y: newY });
            }
        };
        const handleMouseUp = () => setIsDragging(false);
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, selectedId, dragOffset]);

    const getAIItem = () => {
        if (activeAIItem) return activeAIItem;
        if (selectedId) return placedItems.find(i => i.uid === selectedId);
        if (placedItems.length > 0) return placedItems[placedItems.length - 1];
        return null;
    };

    return (
        <div className="flex flex-col h-screen font-sans">
            <Header />
            <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
                <Sidebar
                    onUpload={handleImageUpload}
                    onSample={handleSampleImage}
                    onAddItem={addItem}
                    onResize={handleResize}
                    onRotate={handleRotate}
                    onRemove={removeItem}
                    selectedId={selectedId}
                    onDirectTryOn={handleDirectTryOn}
                    onUploadGarment={handleGarmentUpload}
                />
                <Canvas
                    baseImage={baseImage}
                    placedItems={placedItems}
                    selectedId={selectedId}
                    containerRef={containerRef}
                    onMouseDownItem={handleMouseDown}
                    isDragging={isDragging}
                />
            </main>

            <AIModal
                isOpen={isAIModalOpen}
                onClose={() => setIsAIModalOpen(false)}
                baseImage={baseImage}
                jewelryItem={getAIItem()}
            />
        </div>
    );
}