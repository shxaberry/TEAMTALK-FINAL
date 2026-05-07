import React from 'react';

const RoomCard = ({ room, onClick, currentUser, onDelete, onRename, onChangeCover, isJoined }) => {
    const isOwner = (room.ownerName || "").trim().toLowerCase() === (currentUser || "").trim().toLowerCase();

    return (
        <div className={`group bg-white border border-gray-100 p-0 rounded-[2.5rem] shadow-sm transition-all relative overflow-hidden flex flex-col min-h-[400px] ${isJoined ? 'opacity-80 cursor-not-allowed' : 'hover:shadow-2xl hover:border-brand-100 cursor-pointer'}`}>
            
            {/* 1. THE COVER IMAGE */}
            <div className="h-48 w-full bg-gray-50 relative overflow-hidden">

                {room.coverImage ? (
                    <img 
                        src={room.coverImage} 
                        alt="cover" 
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
                        <span className="text-4xl">🖼️</span>
                    </div>
                )}

                {/* Lock overlay for joined rooms */}
                {isJoined && (
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                            </svg>
                        </div>
                        <span className="text-white text-[10px] font-black uppercase tracking-widest">Enter Code to Join</span>
                    </div>
                )}

                {/* Change Cover button — owners only */}
                {isOwner && !isJoined && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onChangeCover(); }}
                        className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/50 hover:bg-black/70 text-white text-[9px] font-black uppercase tracking-widest rounded-lg backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100">
                        Change Cover 📸
                    </button>
                )}

                {/* Edit / Delete buttons — owners only */}
                {isOwner && !isJoined && (
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRename(); }} 
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/90 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all shadow-lg">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(); }} 
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/90 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            {/* 2. THE CONTENT */}
            <div 
                className={`p-8 flex-1 flex flex-col ${!isJoined ? 'cursor-pointer' : 'cursor-not-allowed'}`} 
                onClick={!isJoined ? onClick : undefined}
            >
                <h3 className="text-xl font-extrabold text-gray-800 tracking-tight mb-1 group-hover:text-brand-500 transition-colors">
                    {room.title}
                </h3>
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-4">
                    Code: {isJoined ? '••••••' : room.roomCode}
                </p>

                <div className="flex items-center gap-4 mb-6">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">👁️ {room.visitCount || 0} Visits</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">✏️ {room.editCount || 0} Edits</span>
                </div>
                
                <div className="mt-auto flex items-center gap-3 pt-4 border-t border-gray-50">
                    <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[7px] font-black text-white shadow-sm" 
                        style={{ backgroundColor: room.avatarColor }}>
                        {room.ownerName ? room.ownerName.substring(0, 2).toUpperCase() : "??"}
                    </div>
                    <span className="text-[11px] font-bold text-gray-500 italic">
                        By {isOwner ? "You" : room.ownerName}
                    </span>
                </div>

                {/* Lock notice at bottom for joined rooms */}
                {isJoined && (
                    <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2 text-gray-400">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                        </svg>
                        <span className="text-[9px] font-black uppercase tracking-widest">Use room code to enter</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoomCard;