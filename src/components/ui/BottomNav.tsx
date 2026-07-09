import { Home, Map, Newspaper, Bookmark, User } from 'lucide-react';

export type Tab = 'home' | 'map' | 'feed' | 'saved' | 'profile';

interface Props {
  active: Tab;
  onNavigate: (tab: Tab) => void;
}

const TABS = [
  { id: 'home' as Tab, label: 'Home', Icon: Home },
  { id: 'map' as Tab, label: 'Map', Icon: Map },
  { id: 'feed' as Tab, label: 'Feed', Icon: Newspaper },
  { id: 'saved' as Tab, label: 'Saved', Icon: Bookmark },
  { id: 'profile' as Tab, label: 'Profile', Icon: User },
];

export default function BottomNav({ active, onNavigate }: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-lg" style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}>
      <div className="max-w-sm mx-auto flex justify-around pt-2 pb-1">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className="flex flex-col items-center gap-0.5 px-3 py-1 relative"
            >
              {isActive && <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-indigo-600 rounded-full" />}
              <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
              <span className={`text-xs font-medium transition-colors ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
