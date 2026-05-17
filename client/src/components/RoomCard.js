import React from 'react';

const RoomCard = ({ room, onClick, currentUser, onDelete, onRename, onChangeCover, isJoined }) => {
    const isOwner = (room.owner_name || room.ownerName || "").trim().toLowerCase() === (currentUser || "").trim().toLowerCase();
    
    return (
        <div className="group flex flex-col cursor-pointer" onClick={!isJoined ? onClick : undefined}>
            
            {/* 1. SQUARE THUMBNAIL AREA */}
            <div className={`
                relative w-full aspect-square overflow-hidden rounded-xl md:rounded-[2.5rem] bg-gray-50 border border-gray-100 transition-all
                ${isJoined ? 'opacity-90' : 'group-hover:shadow-xl group-hover:border-brand-200'}
                md:aspect-auto md:h-48
            `}>
                {/* Image */}
                {(room.coverImage || room.cover_image)
                    ? <img src={room.coverImage || room.cover_image} alt="cover" className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
                        <svg className="w-6 h-6 md:w-8 md:h-8 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                }

                {/* Lock overlay - visible on both but styled for both */}
                {isJoined && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center backdrop-blur-[1px]">
                        <svg className="w-4 h-4 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                )}

                {/* Controls - Desktop Only */}
                {isOwner && !isJoined && (
                    <div className="hidden md:flex absolute top-3 right-3 gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={(e) => { e.stopPropagation(); onRename(); }} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-indigo-500 shadow-md"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                         <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-red-500 shadow-md"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                )}
            </div>

            {/* 2. TEXT AREA BELOW THUMBNAIL */}
            <div className="mt-2 px-1">
                <h3 className="text-[10px] md:text-xl font-extrabold text-gray-800 truncate group-hover:text-brand-500 transition-colors">
                    {room.title}
                </h3>
                
                {/* Desktop-only Info */}
                <div className="hidden md:flex flex-col gap-3 mt-2">
                    <div className="flex items-center gap-3">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight flex items-center gap-1">
                             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                             {room.visitCount || 0} Visits
                        </span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight flex items-center gap-1">
                             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                             {room.editCount || 0} Edits
                        </span>
                    </div>
                    <div className="pt-3 border-t border-gray-50 flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[6px] font-black text-white" style={{ backgroundColor: room.avatar_color || room.avatarColor }}>
                            {(room.owner_name || room.ownerName || "??").substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 italic">
                            By {isOwner ? "You" : (room.owner_name || room.ownerName)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoomCard;