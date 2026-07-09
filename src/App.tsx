import { useEffect, useState, useCallback } from 'react';
import type { Space } from './lib/supabase';
import { supabase } from './lib/supabase';
import BottomNav, { type Tab } from './components/ui/BottomNav';
import SplashScreen from './components/screens/SplashScreen';
import HomeScreen from './components/screens/HomeScreen';
import MapView from './components/screens/MapView';
import LocationDetails from './components/screens/LocationDetails';
import SmartSessionPlanner from './components/screens/SmartSessionPlanner';
import FeedScreen from './components/screens/FeedScreen';
import RateVisit from './components/screens/RateVisit';
import ProfileScreen from './components/screens/ProfileScreen';
import SavedSpaces from './components/screens/SavedSpaces';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [detailSpace, setDetailSpace] = useState<Space | null>(null);
  const [rateSpace, setRateSpace] = useState<Space | null>(null);
  const [showPlanner, setShowPlanner] = useState(false);
  const [plannerSpace, setPlannerSpace] = useState<Space | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // Load saved space IDs once
  useEffect(() => {
    supabase.from('saved_spaces').select('space_id').then(({ data }) => {
      if (data) setSavedIds(new Set(data.map((r: { space_id: string }) => r.space_id)));
    });
  }, []);

  const handleSaveToggle = useCallback(async (space: Space) => {
    const isSaved = savedIds.has(space.id);
    if (isSaved) {
      setSavedIds(prev => { const next = new Set(prev); next.delete(space.id); return next; });
      await supabase.from('saved_spaces').delete().eq('space_id', space.id);
    } else {
      setSavedIds(prev => new Set([...prev, space.id]));
      await supabase.from('saved_spaces').insert({ space_id: space.id }).select().maybeSingle();
    }
  }, [savedIds]);

  function navigate(tab: Tab, space?: Space) {
    if (space) {
      setDetailSpace(space);
    } else {
      setDetailSpace(null);
      setRateSpace(null);
      setShowPlanner(false);
      setPlannerSpace(null);
      setActiveTab(tab);
    }
  }

  function openPlanner(space?: Space) {
    setDetailSpace(null);
    setPlannerSpace(space ?? null);
    setShowPlanner(true);
  }

  function closePlanner() {
    setShowPlanner(false);
    setPlannerSpace(null);
  }

  if (showSplash) {
    return (
      <div className="max-w-sm mx-auto min-h-screen">
        <SplashScreen onComplete={() => setShowSplash(false)} />
      </div>
    );
  }

  if (rateSpace) {
    return (
      <div className="max-w-sm mx-auto min-h-screen">
        <RateVisit
          space={rateSpace}
          onBack={() => setRateSpace(null)}
          onSubmit={() => { setRateSpace(null); setDetailSpace(null); }}
        />
      </div>
    );
  }

  if (showPlanner) {
    return (
      <div className="max-w-sm mx-auto min-h-screen">
        <SmartSessionPlanner
          space={plannerSpace}
          onNavigate={tab => { closePlanner(); setActiveTab(tab); }}
          onBack={closePlanner}
        />
      </div>
    );
  }

  if (detailSpace) {
    return (
      <div className="max-w-sm mx-auto min-h-screen">
        <LocationDetails
          space={detailSpace}
          onBack={() => setDetailSpace(null)}
          onNavigate={(tab, space) => {
            if (tab === 'map' && space) {
              // "Start Study Session" → go to rate
              setRateSpace(space);
            } else {
              navigate(tab, space);
            }
          }}
          isSaved={savedIds.has(detailSpace.id)}
          onSaveToggle={() => handleSaveToggle(detailSpace)}
          onPlanSession={openPlanner}
        />
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto min-h-screen relative">
      {activeTab === 'home' && (
        <HomeScreen
          onNavigate={(tab, space) => space ? setDetailSpace(space) : setActiveTab(tab)}
          savedIds={savedIds}
          onSaveToggle={handleSaveToggle}
          onOpenPlanner={() => openPlanner()}
        />
      )}
      {activeTab === 'map' && (
        <MapView
          onNavigate={(tab, space) => space ? setDetailSpace(space) : setActiveTab(tab)}
          savedIds={savedIds}
          onSaveToggle={handleSaveToggle}
        />
      )}
      {activeTab === 'feed' && <FeedScreen />}
      {activeTab === 'saved' && (
        <SavedSpaces
          onNavigate={(tab, space) => space ? setDetailSpace(space) : setActiveTab(tab)}
          savedIds={savedIds}
          onSaveToggle={handleSaveToggle}
        />
      )}
      {activeTab === 'profile' && <ProfileScreen />}

      <BottomNav active={activeTab} onNavigate={tab => { setDetailSpace(null); setActiveTab(tab); }} />
    </div>
  );
}
