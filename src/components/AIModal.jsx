import React, { useState } from 'react';
import { X, Sparkles, Loader2, Key, Layers } from 'lucide-react';
// IMPORT RUNWAY SERVICE
import { performVirtualTryOn } from '../services/runwayService';

export default function AIModal({ isOpen, onClose, baseImage, jewelryItem }) {
    const [apiKey, setApiKey] = useState('');
    const [status, setStatus] = useState('idle');
    const [resultImage, setResultImage] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');

    if (!isOpen) return null;

    const handleGenerate = async () => {
        // Runway keys usually start with "key_"
        if (!apiKey.startsWith('key_')) {
            setErrorMsg("Please enter a valid Runway API Key (starts with key_...)");
            return;
        }

        setStatus('processing');
        setErrorMsg('');

        try {
            const url = await performVirtualTryOn(baseImage, jewelryItem, apiKey);
            setResultImage(url);
            setStatus('success');
        } catch (err) {
            console.error(err);
            setErrorMsg(err.message || "Failed to generate image with Runway.");
            setStatus('error');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-gray-100">

                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-5 flex justify-between items-center text-white">
                    <div className="flex items-center gap-2">
                        <Layers className="text-white" size={24} />
                        <div>
                            <h2 className="text-lg font-bold leading-tight">Runway Gen-4 Try-On</h2>
                            <p className="text-[10px] text-purple-100 opacity-90 uppercase tracking-wider">Image-to-Image Generation</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition"><X size={20} /></button>
                </div>

                {/* Content */}
                <div className="p-6">

                    {(status === 'idle' || status === 'error') && (
                        <div className="space-y-5">
                            <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                                <p className="text-xs text-purple-800 leading-relaxed">
                                    <strong>Runway Gen-4</strong> uses your photo as a reference to keep the identity consistent while adding the jewelry.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5 ml-1">
                                    Runway API Key
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Key size={16} className="text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder="key_..."
                                        className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm font-mono transition-all"
                                    />
                                </div>
                            </div>

                            {errorMsg && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100 break-words">
                                    {errorMsg}
                                </div>
                            )}

                            <button
                                onClick={handleGenerate}
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg"
                            >
                                Generate Try-On
                            </button>
                        </div>
                    )}

                    {status === 'processing' && (
                        <div className="text-center py-10">
                            <Loader2 className="w-14 h-14 text-purple-600 animate-spin mx-auto mb-4" />
                            <h3 className="font-bold text-gray-800 text-lg">Processing...</h3>
                            <p className="text-sm text-gray-500 mt-2">
                                Uploading references & Generating...<br/>
                                (This usually takes 10-30 seconds)
                            </p>
                        </div>
                    )}

                    {status === 'success' && resultImage && (
                        <div className="flex flex-col gap-4 animate-in fade-in">
                            <img src={resultImage} alt="Result" className="w-full rounded-xl border shadow-md" />
                            <div className="flex gap-3">
                                <button onClick={() => setStatus('idle')} className="flex-1 py-3 border rounded-xl text-sm font-medium hover:bg-gray-50">Retry</button>
                                <a href={resultImage} download="runway-tryon.png" className="flex-1 py-3 bg-purple-600 text-white rounded-xl text-center text-sm font-bold shadow-md hover:bg-purple-700">Download</a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}