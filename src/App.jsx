import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Showcase from './pages/Showcase';
import EyewearShowcase from './pages/EyewearShowcase'; // Make sure this is imported

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/showcase" element={<Showcase />} />
            <Route path="/eyewear-showcase" element={<EyewearShowcase />} />
        </Routes>
    );
}