"use client";
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import RoomView from './components/RoomView';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function Neighborhood() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [activeRoom, setActiveRoom] = useState<any>(null);
  const [myId, setMyId] = useState<string>('');

  // 1. Reusable fetch function to handle the "Refresh on Return"
  const refreshRooms = useCallback(async () => {
    const { data } = await supabase.from('rooms').select('*');
    let roomList = data || [];
    
    // Ensure Home Plaza exists as the anchor
    const home = roomList.find(r => r.grid_x === 0 && r.grid_y === 0);
    if (!home) {
      const { data: newHome } = await supabase.from('rooms').insert([{
        name: 'Home Plaza',
        owner_name: 'Community',
        owner_id: 'public',
        grid_x: 0,
        grid_y: 0
      }]).select().single();
      if (newHome) roomList.push(newHome);
    }
    setRooms(roomList);
  }, []);

  useEffect(() => {
    const id = localStorage.getItem('openroom_owner_id') || Math.random().toString(36).substring(7);
    localStorage.setItem('openroom_owner_id', id);
    setMyId(id);

    refreshRooms();

    // Real-time listener so names update even if you don't click back
    const channel = supabase.channel('neighborhood-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setRooms(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
        } else if (payload.eventType === 'INSERT') {
          setRooms(prev => [...prev, payload.new]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refreshRooms]);

  // 2. The critical fix: refresh data when closing RoomView
  const handleBack = () => {
    setActiveRoom(null);
    refreshRooms(); 
  };

  if (activeRoom) {
    return <RoomView room={activeRoom} myId={myId} onBack={handleBack} />;
  }

  // --- DYNAMIC GRID LOGIC ---
  const xValues = rooms.length > 0 ? rooms.map(r => r.grid_x) : [0];
  const yValues = rooms.length > 0 ? rooms.map(r => r.grid_y) : [0];
  const minX = Math.min(...xValues) - 1;
  const maxX = Math.max(...xValues) + 1;
  const minY = Math.min(...yValues) - 1;
  const maxY = Math.max(...yValues) + 1;

  const xRange = Array.from({ length: maxX - minX + 1 }, (_, i) => minX + i);
  const yRange = Array.from({ length: maxY - minY + 1 }, (_, i) => minY + i);
  const occupied = new Set(rooms.map(r => `${r.grid_x},${r.grid_y}`));

  const createRoom = async (x: number, y: number) => {
    const { data } = await supabase.from('rooms').insert([{
      name: `Room ${myId.slice(-4)}`, 
      owner_name: 'Explorer', 
      owner_id: myId, 
      grid_x: x, 
      grid_y: y
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
        style={{ gridTemplateColumns: `repeat(${xRange.length}, minmax(0, 1fr))` }}
      >
        {yRange.map(y => xRange.map(x => {
          const room = rooms.find(r => r.grid_x === x && r.grid_y === y);
          if (room) {
            return (
              <button 
                key={`${x}-${y}`}
                onClick={() => setActiveRoom(room)}
                className={`w-28 h-28 rounded-2xl shadow-xl flex flex-col items-center justify-center transition-all hover:scale-105 border-4 ${
                  room.owner_id === myId ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white border-slate-700 text-slate-900'
                }`}
              >
                <span className="text-[9px] uppercase tracking-widest opacity-60 font-bold">{room.owner_name}</span>
                <span className="font-black text-center px-1 leading-tight text-sm">{room.name}</span>
              </button>
            );
          }

          const isAdjacent = Array.from(occupied).some(coord => {
            const [ox, oy] = coord.split(',').map(Number);
            return Math.abs(ox - x) <= 1 && Math.abs(oy - y) <= 1;
          });

          return isAdjacent ? (
            <button key={`${x}-${y}`} onClick={() => createRoom(x, y)} className="w-28 h-28 rounded-2xl border-4 border-dashed border-slate-800 hover:border-indigo-500 hover:bg-slate-800/50 flex items-center justify-center text-slate-700 hover:text-indigo-400 transition-all font-bold text-[10px]">
              + NEW ROOM
            </button>
          ) : <div key={`${x}-${y}`} className="w-28 h-28" />;
        }))}
      </div>
    </main>
  );
}