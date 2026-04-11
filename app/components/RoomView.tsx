"use client";
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

interface Hotspot {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  action: 'open_modal' | 'navigate_floor';
  modal?: string;
}

interface RoomConfig {
  room_display_name: string;
  owner: string;
  background_image: string;
  hotspots: Hotspot[];
}

interface RegistryEntry {
  id: string;
  name: string;
  github_username: string;
  registry_id: string;
  status: string;
}

export default function RoomView({ onBack, registryId }: {
  onBack: () => void;
  registryId: string;
}) {
  const [config, setConfig] = useState<RoomConfig | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [hoveredHotspot, setHoveredHotspot] = useState<string | null>(null);
  const [registryEntries, setRegistryEntries] = useState<RegistryEntry[]>([]);
  const [registryLoading, setRegistryLoading] = useState(false);

  useEffect(() => {
    fetch(`/registry/${registryId}/config.json`)
      .then(r => r.json())
      .then(setConfig);
  }, [registryId]);

  const openRegistry = async () => {
    setActiveModal('registry');
    setRegistryLoading(true);
    const { data } = await supabase
      .from('rooms')
      .select('id, name, github_username, registry_id, status')
      .neq('status', 'expired')
      .not('registry_id', 'is', null)
      .order('reserved_at', { ascending: true });
    setRegistryEntries(data || []);
    setRegistryLoading(false);
  };

  const handleHotspot = (hotspot: Hotspot) => {
    if (hotspot.action === 'navigate_floor') {
      onBack();
    } else if (hotspot.action === 'open_modal') {
      if (hotspot.modal === 'registry') {
        openRegistry();
      } else {
        setActiveModal(hotspot.modal || null);
      }
    }
  };

  if (!config) {
    return (
      <div className="h-screen w-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-500 text-sm">Loading room...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen w-screen overflow-y-auto overflow-x-hidden bg-stone-100">
      {/* Image + hotspots share the same container so % positions always track the image */}
      <div className="relative w-full">
        <img
          src={config.background_image}
          alt={config.room_display_name}
          className="w-full h-auto block"
          draggable={false}
        />

        {/* Hotspots */}
        {config.hotspots.map(hotspot => (
          <button
            key={hotspot.id}
            onClick={() => handleHotspot(hotspot)}
            onMouseEnter={() => setHoveredHotspot(hotspot.id)}
            onMouseLeave={() => setHoveredHotspot(null)}
            className="absolute rounded-lg transition-all duration-150"
            style={{
              left: `${hotspot.x}%`,
              top: `${hotspot.y}%`,
              width: `${hotspot.width}%`,
              height: `${hotspot.height}%`,
              background: hoveredHotspot === hotspot.id ? 'rgba(0,0,0,0.35)' : 'transparent',
              cursor: 'pointer',
            }}
            title={hotspot.label}
            aria-label={hotspot.label}
          />
        ))}

        {/* Tooltip */}
        {hoveredHotspot && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs font-medium px-3 py-1.5 rounded-full pointer-events-none backdrop-blur-sm">
            {config.hotspots.find(h => h.id === hoveredHotspot)?.label}
          </div>
        )}
      </div>

      {/* Welcome Guide Modal */}
      {activeModal === 'welcome_guide' && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-slate-900 text-2xl font-black tracking-tight mb-1">Welcome to Open Room</h2>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              An infinite building constructed one room at a time by real people, with help from AI.
            </p>

            <div className="space-y-5 mb-8">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1.5">How to explore</p>
                <ul className="space-y-1 text-sm text-slate-700">
                  <li>→ Enter any room on the floor plan</li>
                  <li>→ Click the door to return to the floor plan</li>
                </ul>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1.5">How to contribute a room</p>
                <ol className="space-y-1 text-sm text-slate-700 list-none">
                  <li>1. Fork the repo on GitHub</li>
                  <li>2. Copy <code className="bg-slate-100 px-1 rounded text-xs">registry/_template/</code> to <code className="bg-slate-100 px-1 rounded text-xs">registry/room-yourname/</code></li>
                  <li>3. Add a background image and edit <code className="bg-slate-100 px-1 rounded text-xs">config.json</code> to place your hotspots</li>
                  <li>4. Open a Pull Request — once merged, your room appears on the floor plan</li>
                </ol>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1.5">Building codes</p>
                <ul className="space-y-1 text-sm text-slate-700">
                  <li>• Images: WebP, max 200KB</li>
                  <li>• Total room folder: max 5MB</li>
                  <li>• One room per builder</li>
                </ul>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
              <p className="text-[10px] uppercase font-black text-slate-400 mb-1 tracking-widest">Contribute on GitHub</p>
              <a
                href="https://github.com/alyssafuward/open-room"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-indigo-500 hover:text-indigo-700 break-all underline underline-offset-4"
              >
                github.com/alyssafuward/open-room
              </a>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-indigo-600 transition-colors"
            >
              Back to Room
            </button>
          </div>
        </div>
      )}

      {/* Registry Modal */}
      {activeModal === 'registry' && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 overflow-y-auto p-6"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl mx-auto my-6"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-slate-900 text-2xl font-black tracking-tight mb-1">Room Registry</h2>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              Reserved rooms and their IDs. If you've reserved a room, find your room ID here.
            </p>

            {registryLoading ? (
              <div className="text-center py-8 text-slate-400 text-sm">Loading registry…</div>
            ) : registryEntries.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">No rooms reserved yet.</div>
            ) : (
              <div className="space-y-2 mb-6">
                {registryEntries.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{entry.name}</p>
                      <p className="text-xs text-slate-400">@{entry.github_username}</p>
                    </div>
                    <div className="text-right">
                      <code className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{entry.registry_id}</code>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-indigo-600 transition-colors"
            >
              Back to Room
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
