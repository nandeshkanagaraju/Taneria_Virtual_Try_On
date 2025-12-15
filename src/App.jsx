import React from 'react';
import { Routes, Route } from 'react-router-dom'; // <--- REMOVE 'BrowserRouter'
import Home from './pages/Home';
import Showcase from './pages/Showcase';

export default function App() {
    return (
        // <--- REMOVE <Router> TAGS, KEEP <Routes> --->
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/showcase" element={<Showcase />} />
        </Routes>
    );
}