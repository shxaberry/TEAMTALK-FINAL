import React from 'react';

const RoomCard = ({ room, onClick, currentUser, onDelete, onRename, onChangeCover, isJoined }) => {
const isOwner = (room.owner_name || room.ownerName || "").trim().toLowerCase() === (currentUser || "").trim().toLowerCase();
    return React.createElement('div', {
        className: `group bg-white border border-gray-100 p-0 rounded-[2.5rem] shadow-sm transition-all relative overflow-hidden flex flex-col min-h-[400px] ${isJoined ? 'opacity-80 cursor-not-allowed' : 'hover:shadow-2xl hover:border-brand-100 cursor-pointer'}`
    },

        // 1. THE COVER IMAGE
        React.createElement('div', { className: "h-48 w-full bg-gray-50 relative overflow-hidden" },

            (room.coverImage || room.cover_image)
                ? React.createElement('img', { src: room.coverImage || room.cover_image, alt: "cover", className: "w-full h-full object-cover" })
                : React.createElement('div', { className: "w-full h-full bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center" },
                    React.createElement('svg', { className: "w-10 h-10 text-indigo-200", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", d: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" })
                    )
                ),

            // Lock overlay for joined rooms
            isJoined && React.createElement('div', { className: "absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2" },
                React.createElement('div', { className: "w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm" },
                    React.createElement('svg', { className: "w-6 h-6 text-white", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" })
                    )
                ),
                React.createElement('span', { className: "text-white text-[10px] font-black uppercase tracking-widest" }, "Enter Code to Join")
            ),

            // Change Cover button — owners only
            isOwner && !isJoined && React.createElement('button', {
                onClick: (e) => { e.stopPropagation(); onChangeCover(); },
                className: "absolute bottom-4 left-4 px-3 py-1.5 bg-black/50 hover:bg-black/70 text-white text-[9px] font-black uppercase tracking-widest rounded-lg backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
            }, "Change Cover"),

            // Edit / Delete buttons — owners only
            isOwner && !isJoined && React.createElement('div', { className: "absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity" },
                React.createElement('button', {
                    onClick: (e) => { e.stopPropagation(); onRename(); },
                    className: "w-8 h-8 flex items-center justify-center rounded-lg bg-white/90 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all shadow-lg"
                },
                    React.createElement('svg', { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" })
                    )
                ),
                React.createElement('button', {
                    onClick: (e) => { e.stopPropagation(); onDelete(); },
                    className: "w-8 h-8 flex items-center justify-center rounded-lg bg-white/90 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg"
                },
                    React.createElement('svg', { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" })
                    )
                )
            )
        ),

        // 2. THE CONTENT
        React.createElement('div', {
            className: `p-8 flex-1 flex flex-col ${!isJoined ? 'cursor-pointer' : 'cursor-not-allowed'}`,
            onClick: !isJoined ? onClick : undefined
        },
            React.createElement('h3', { className: "text-xl font-extrabold text-gray-800 tracking-tight mb-1 group-hover:text-brand-500 transition-colors" }, room.title),

            React.createElement('div', { className: "flex items-center gap-4 mb-6" },
                // Eye icon — Visits
                React.createElement('span', { className: "flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-tight" },
                    React.createElement('svg', { className: "w-3 h-3", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z" }),
                        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" })
                    ),
                    (room.visitCount || 0) + " Visits"
                ),
                // Pencil icon — Edits
                React.createElement('span', { className: "flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-tight" },
                    React.createElement('svg', { className: "w-3 h-3", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" })
                    ),
                    (room.editCount || 0) + " Edits"
                )
            ),

            React.createElement('div', { className: "mt-auto flex items-center gap-3 pt-4 border-t border-gray-50" },
                React.createElement('div', {
                    className: "w-6 h-6 rounded-full flex items-center justify-center text-[7px] font-black text-white shadow-sm",
                    style: { backgroundColor: room.avatar_color || room.avatarColor }                
                    },
                    (room.owner_name || room.ownerName) ? (room.owner_name || room.ownerName).substring(0, 2).toUpperCase() : "??"),
                    React.createElement('span', { className: "text-[11px] font-bold text-gray-500 italic" },
                    "By ", isOwner ? "You" : (room.owner_name || room.ownerName)
                )
            ),

            // Lock notice at bottom for joined rooms
            isJoined && React.createElement('div', { className: "mt-4 pt-4 border-t border-gray-50 flex items-center gap-2 text-gray-400" },
                React.createElement('svg', { className: "w-3 h-3", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" })
                ),
                React.createElement('span', { className: "text-[9px] font-black uppercase tracking-widest" }, "Use room code to enter")
            )
        )
    );
};

export default RoomCard;