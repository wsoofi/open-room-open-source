"use client";
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function RoomView({ room, myId, onBack }: any) {
  const [objects, setObjects] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState('📦');

  useEffect(() => {
    // 1. Fetch items ONLY for this room
    const fetchRoomData = async () => {
      const { data } = await supabase.from('room_objects').select('*').eq('room_id', room.id);
      setObjects(data || []);
    };
    fetchRoomData();

    // 2. Real-time listener for THIS room's objects
    const channel = supabase.channel(`room-${room.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'room_objects', 
        filter: `room_id=eq.${room.id}` 
      }, (payload) => {
        setObjects(prev => {
          if (prev.some(obj => obj.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room.id]);

  const addObject = async (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).id !== 'room-floor') return;
    
    // Explicitly attach the room.id so it shows up in this specific room
    await supabase.from('room_objects').insert([{ 
      type: selectedType, 
      x: e.clientX - 20, 
      y: e.clientY - 20, 
      room_id: room.id 
    }]);
  };

  return (
    <main id="room-floor" className="h-screen w-screen bg-slate-50 relative overflow-hidden cursor-crosshair" onClick={addObject}>
      <div className="absolute top-6 left-6 z-10 p-6 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 pointer-events-none">
        <button onClick={onBack} className="text-indigo-600 font-bold hover:underline pointer-events-auto">← Exit to Neighborhood</button>
        <h1 className="text-4xl font-black mt-2 tracking-tight">{room.name}</h1>
        <p className="text-slate-500 font-medium">Built by {room.owner_name}</p>
        
        <div className="mt-6 flex gap-3 pointer-events-auto">
          {['📦', '🌲', '🛋️', '🐈', '✨', '🏮'].map(item => (
            <button key={item} onClick={() => setSelectedType(item)} className={`w-14 h-14 text-2xl rounded-xl border-2 transition-all ${selectedType === item ? 'border-indigo-500 bg-indigo-50 scale-110 shadow-md' : 'bg-white border-slate-100 hover:border-slate-300'}`}>{item}</button>
          ))}
        </div>
      </div>

      {objects.map(obj => (
        <div key={obj.id} className="absolute text-5xl select-none pointer-events-none" style={{ left: obj.x, top: obj.y }}>
          {obj.type}
        </div>
      ))}
    </main>
  );
}