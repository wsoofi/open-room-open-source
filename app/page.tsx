"use client";
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import RoomView from './components/RoomView';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function Neighborhood() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [activeRoom, setActiveRoom] = useState<any>(null);
  const [myId, setMyId] = useState<string>('');

  useEffect(() => {
    const id = localStorage.getItem('openroom_owner_id') || Math.random().toString(36).substring(7);
    localStorage.setItem('openroom_owner_id', id);
    setMyId(id);

    const fetchRooms = async () => {
      const { data } = await supabase.from('rooms').select('*');
      setRooms(data || []);
    };
    fetchRooms();
  }, []);

  if (activeRoom) {
    return <RoomView room={activeRoom} myId={myId} onBack={() => setActiveRoom(null)} />;
  }

  // --- DYNAMIC GRID LOGIC ---
  // Calculate the current min/max coordinates of all rooms
  const xValues = rooms.length > 0 ? rooms.map(r => r.grid_x) : [0];
  const yValues = rooms.length > 0 ? rooms.map(r => r.grid_y) : [0];
  
  // Add a 1-tile "frontier" buffer around the existing rooms
  const minX = Math.min(...xValues) - 1;
  const maxX = Math.max(...xValues) + 1;
  const minY = Math.min(...yValues) - 1;
  const maxY = Math.max(...yValues) + 1;

  // Generate the ranges for the grid
  const xRange = Array.from({ length: maxX - minX + 1 }, (_, i) => minX + i);
  const yRange = Array.from({ length: maxY - minY + 1 }, (_, i) => minY + i);
  
  const occupied = new Set(rooms.map(r => `${r.grid_x},${r.grid_y}`));

  const createRoom = async (x: number, y: number) => {
    const defaultName = `Room ${myId.slice(-4)}`;
    const { data } = await supabase.from('rooms').insert([{
      name: defaultName, owner_name: 'Explorer', owner_id: myId, grid_x: x, grid_y: y
    }]).select().single();
    
    if (data) {
      setRooms(prev => [...prev, data]);
      setActiveRoom(data); 
    }
  };

  return (
    <main className="min-h-screen w-screen bg-slate-900 flex items-center justify-center p-20 overflow-auto">
      <div 
        className="grid gap-4" 
        style={{ 
          // Dynamically adjust grid columns based on the xRange size
          gridTemplateColumns: `repeat(${xRange.length}, minmax(0, 1fr))` 
        }}
      >
        {yRange.map(y => xRange.map(x => {
          const room = rooms.find(r => r.grid_x === x && r.grid_y === y);
          const isHome = x === 0 && y === 0;
          
          if (room || isHome) {
            const displayRoom = room || { id: '00000000-0000-0000-0000-000000000000', name: 'Home Plaza', owner_name: 'Community' };
            return (
              <button 
                key={`${x}-${y}`}
                onClick={() => setActiveRoom(displayRoom)}
                className={`w-28 h-28 rounded-2xl shadow-xl flex flex-col items-center justify-center transition-all hover:scale-105 border-4 ${
                  room?.owner_id === myId ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white border-slate-700 text-slate-900'
                }`}
              >
                <span className="text-[9px] uppercase tracking-widest opacity-60 font-bold">{room?.owner_name || 'Public'}</span>
                <span className="font-black text-center px-1 leading-tight text-sm">{room?.name || 'Home Plaza'}</span>
              </button>
            );
          }

          // Show "+ NEW" if it touches an existing room
          const isAdjacent = Array.from(occupied).some(coord => {
            const [ox, oy] = coord.split(',').map(Number);
            return Math.abs(ox - x) <= 1 && Math.abs(oy - y) <= 1;
          }) || (Math.abs(x) <= 1 && Math.abs(y) <= 1);

          return isAdjacent ? (
            <button 
              key={`${x}-${y}`} 
              onClick={() => createRoom(x, y)} 
              className="w-28 h-28 rounded-2xl border-4 border-dashed border-slate-800 hover:border-indigo-500 hover:bg-slate-800/50 flex items-center justify-center text-slate-700 hover:text-indigo-400 transition-all font-bold text-[10px]"
            >
              + NEW ROOM
            </button>
          ) : <div key={`${x}-${y}`} className="w-28 h-28" />;
        }))}
      </div>
    </main>
  );
}