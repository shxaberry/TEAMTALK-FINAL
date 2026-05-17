import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RoomCard from './RoomCard';

const Dashboard = ({ 
    rooms = [],
    displayName, 
    setIsCreateModalOpen, 
    setIsJoinModalOpen, 
    setStep, 
    setRoomCode,
    onJoinRoom,
    onDeleteRoom,
    onRenameRoom,
    onChangeCover,
    onLogout
}) => {
    // 1. Sidebar State for Mobile
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    const currentUser = (displayName || "").trim().toLowerCase();
    const userColor = localStorage.getItem("userColor") || "#6366f1";

    const myDesigns = rooms.filter(r => 
        (r.owner_name || r.ownerName || "").trim().toLowerCase() === currentUser
    );

    const joinedRooms = rooms.filter(r => 
        (r.owner_name || r.ownerName || "").trim().toLowerCase() !== currentUser
    );

    return (
        <div className="flex min-h-screen bg-white font-sans overflow-hidden">
            
            {/* MOBILE BACKDROP - Closes menu when clicking outside sidebar */}
            {isMenuOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden" 
                    onClick={() => setIsMenuOpen(false)} 
                />
            )}

            {/* 1. SIDEBAR (RESPONSIVE) */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-50 p-8 
                flex flex-col gap-4 transition-transform duration-300 ease-in-out
                ${isMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                md:relative md:flex
            `}>
                <div className="flex items-center gap-3 mb-12">
                    <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                    </div>
                    <span className="font-extrabold text-2xl tracking-tighter text-gray-900 leading-none">Team Talk</span>
                </div>

                <button className="flex items-center gap-4 bg-indigo-50 text-indigo-600 px-6 py-4 rounded-2xl font-extrabold text-sm transition-all shadow-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    Projects
                </button>

                <div className="mt-auto">
                    <button 
                        onClick={onLogout}
                        className="flex items-center gap-4 w-full text-red-400 hover:bg-red-50 hover:text-red-500 px-6 py-4 rounded-2xl font-extrabold text-sm transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                    </button>
                </div>
            </aside>

            {/* 2. MAIN CONTENT AREA */}
            <main className="flex-1 bg-white overflow-y-auto relative">
                
                {/* STICKY MOBILE TOP BAR */}
                <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-50 bg-white sticky top-0 z-30">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                        </div>
                        <span className="font-black text-lg tracking-tighter">Team Talk</span>
                    </div>
                    <button onClick={() => setIsMenuOpen(true)} className="p-2 text-gray-500 bg-gray-50 rounded-lg">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
                    </button>
                </div>

                <div className="p-6 md:p-16 max-w-6xl mx-auto relative">
                    
                    {/* TOP RIGHT PROFILE */}
                    <div className="absolute top-6 md:top-10 right-6 md:right-0 flex items-center gap-3 z-10">
                        <div className="text-right hidden sm:block">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Logged in as</p>
                            <p className="text-sm font-bold text-gray-800 leading-none">{displayName || "Guest"}</p>
                        </div>
                        <div 
                            className="w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center text-[11px] font-black text-white shadow-xl ring-4 ring-gray-50 relative cursor-pointer"
                            style={{ backgroundColor: userColor }} 
                        >
                            {displayName ? displayName.substring(0, 2).toUpperCase() : "YO"}
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        </div>
                    </div>

                    <header className="mb-12 md:mb-16">
                        <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tighter">Projects</h1>
                        <p className="text-gray-400 text-sm md:text-lg mt-3 font-medium">Manage and organize your team's creative assets.</p>
                    </header>

                    {/* SECTION 1: MY DESIGNS */}
                    <section className="mb-20 md:mb-24">
                        <div className="flex items-center justify-between mb-8 md:mb-10">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center">
                                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                                    </svg>
                                </div>
                                <h2 className="text-xl md:text-2xl font-extrabold text-gray-800">My Designs</h2>
                                <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase shadow-sm">
                                    {myDesigns.length}
                                </span>
                            </div>
                            <span className="hidden sm:block text-[10px] font-black text-gray-300 uppercase tracking-widest">Rooms you created</span>
                        </div>

                        {/* Updated Grid: 3 columns on mobile, 2 on tablet, 3 on desktop */}
<div className="grid grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-10">
                            <div 
    onClick={() => { setIsCreateModalOpen(true); setStep(1); }} 
    className="group flex flex-col items-center cursor-pointer transition-all"
>
    {/* The Square Thumbnail */}
    <div className="w-full aspect-square border-2 border-dashed border-indigo-100 rounded-xl md:rounded-[2.5rem] flex items-center justify-center bg-white group-hover:bg-indigo-50/20 group-hover:border-indigo-300 transition-all md:min-h-[350px]">
        <div className="w-8 h-8 md:w-16 md:h-16 bg-brand-50 rounded-lg md:rounded-2xl flex items-center justify-center text-brand-500 text-xl md:text-3xl group-hover:scale-110 transition-transform shadow-inner">
            +
        </div>
    </div>
    {/* Label below */}
    <h3 className="mt-2 text-[10px] md:text-xl font-extrabold text-gray-800 tracking-tight text-center truncate w-full px-1">
        New Room
    </h3>
    <p className="hidden md:block text-sm text-gray-400 mt-1 text-center font-medium">
        Create custom room
    </p>
</div>

                            <AnimatePresence>
                                {myDesigns.map((room) => (
                                    <motion.div key={room.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                        <RoomCard 
                                            room={room} 
                                            onClick={() => onJoinRoom(room)} 
                                            currentUser={displayName}
                                            onDelete={() => onDeleteRoom(room.id)}
                                            onRename={() => onRenameRoom(room.id, room.title)}
                                            onChangeCover={() => onChangeCover(room.id)}
                                        />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </section>

                    {/* SECTION 2: JOINED ROOMS */}
                    <section>
                        <div className="flex items-center justify-between mb-8 md:mb-10">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-4a4 4 0 11-8 0 4 4 0 018 0zm6 4a2 2 0 11-4 0 2 2 0 014 0zM7 16a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <h2 className="text-xl md:text-2xl font-extrabold text-gray-800">Joined Rooms</h2>
                                <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase shadow-sm">
                                    {joinedRooms.length}
                                </span>
                            </div>
                        </div>

                        <div 
                            onClick={() => { setIsJoinModalOpen(true); setRoomCode(""); }} 
                            className="w-full bg-brand-500 p-8 md:p-10 rounded-[2.5rem] flex items-center justify-between cursor-pointer text-white shadow-2xl shadow-indigo-500/30 mb-12 group hover:bg-brand-600 transition-all relative overflow-hidden"
                        >
                            <div className="flex items-center gap-4 md:gap-8 relative z-10">
                                <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg">
                                    <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-lg md:text-2xl tracking-tight">Enter a Room Code</h3>
                                    <p className="opacity-80 text-sm md:text-lg mt-1 font-medium">Collaborate on a teammate's design.</p>
                                </div>
                            </div>
                            <div className="hidden sm:block mr-6 group-hover:translate-x-3 transition-transform">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </div>
                        </div>

                        {/* Updated Grid: 3 columns on mobile, 2 on tablet, 3 on desktop */}
<div className="grid grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-10">
                            <AnimatePresence>
                                {joinedRooms.map((room) => (
                                    <motion.div key={room.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                        <RoomCard 
                                            room={room} 
                                            onClick={undefined}
                                            currentUser={displayName}
                                            onDelete={() => onDeleteRoom(room.id)}
                                            onRename={() => onRenameRoom(room.id, room.title)}
                                            isJoined={true}
                                        />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;