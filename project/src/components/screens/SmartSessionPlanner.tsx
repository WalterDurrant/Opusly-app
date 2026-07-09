import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, Clock, Lightbulb, ArrowRight, MapPin, Pencil, LocateFixed } from 'lucide-react';
import TimeChipSelector from '../ui/TimeChipSelector';
import type { Tab } from '../ui/BottomNav';
import type { Space, UserProfile } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';
import { getUserLocation, fetchWalkingTravelMinutes, type Coords } from '../../lib/geo';

interface Props {
  onNavigate: (tab: Tab) => void;
  onBack: () => void;
  space?: Space | null;
}

function formatClock(h: number, m: number): string {
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')}${ampm}`;
}

function getLeaveByTime(commitTime: string, durationHours: number, travelMins: number): string {
  const [ch, cm] = commitTime.split(':').map(Number);
  const eventTime = new Date();
  eventTime.setHours(ch, cm, 0, 0);
  const leaveTime = new Date(eventTime.getTime() - (durationHours * 60 + travelMins) * 60000);
  return formatClock(leaveTime.getHours(), leaveTime.getMinutes());
}

export default function SmartSessionPlanner({ onNavigate, onBack, space }: Props) {
  const [duration, setDuration] = useState(2);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editingCommitment, setEditingCommitment] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftTime, setDraftTime] = useState('15:00');
  const [savingCommitment, setSavingCommitment] = useState(false);

  const [coords, setCoords] = useState<Coords | null>(null);
  const [travelMins, setTravelMins] = useState<number | null>(null);
  const [travelEstimated, setTravelEstimated] = useState(false);
  const [travelLoading, setTravelLoading] = useState(false);

  // Load the user's saved next-commitment
  useEffect(() => {
    supabase.from('user_profile').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data) {
        const p = data as UserProfile;
        setProfile(p);
        setDraftTitle(p.next_commitment_title ?? '');
        setDraftTime(p.next_commitment_time ?? '15:00');
      }
    });
  }, []);

  // Real travel time: only computable once we know the user's location and
  // have a destination space (opened from a specific location's "Plan Session" button)
  const loadTravelTime = () => {
    if (!space?.lat || !space?.lng) return;
    setTravelLoading(true);
    getUserLocation().then(async res => {
      if (!res.coords) {
        setTravelLoading(false);
        return;
      }
      setCoords(res.coords);
      const { minutes, estimated } = await fetchWalkingTravelMinutes(res.coords, { lat: space.lat!, lng: space.lng! });
      setTravelMins(minutes);
      setTravelEstimated(estimated);
      setTravelLoading(false);
    });
  };

  useEffect(() => {
    loadTravelTime();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [space?.id]);

  const saveCommitment = async () => {
    setSavingCommitment(true);
    const { data } = await supabase
      .from('user_profile')
      .update({ next_commitment_title: draftTitle || null, next_commitment_time: draftTime })
      .eq('id', 1)
      .select()
      .maybeSingle();
    if (data) setProfile(data as UserProfile);
    setSavingCommitment(false);
    setEditingCommitment(false);
  };

  const hasCommitment = !!profile?.next_commitment_title;
  const effectiveTravelMins = travelMins ?? 15; // fallback estimate while loading / no space selected
  const totalMins = duration * 60 + effectiveTravelMins;

  let leaveBy: string | null = null;
  let conflict = false;
  if (hasCommitment && profile?.next_commitment_time) {
    leaveBy = getLeaveByTime(profile.next_commitment_time, duration, effectiveTravelMins);
    const [ch, cm] = profile.next_commitment_time.split(':').map(Number);
    const eventTime = new Date();
    eventTime.setHours(ch, cm, 0, 0);
    conflict = totalMins * 60000 > eventTime.getTime() - Date.now();
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-14 pb-5">
        <button onClick={onBack} className="mb-4 flex items-center gap-2 text-gray-500 text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Plan your session</h1>
        <p className="text-gray-400 text-sm mt-1">
          {space ? `Planning your visit to ${space.name}` : "We'll find the best window for you"}
        </p>
      </div>

      <div className="px-5 pt-5 space-y-5">
        {/* Duration */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">How long do you need?</p>
          <TimeChipSelector value={duration} onChange={setDuration} />
        </div>

        {/* Next commitment — real, editable, persisted */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Your next commitment</p>
            {!editingCommitment && (
              <button
                onClick={() => setEditingCommitment(true)}
                className="text-indigo-500 hover:text-indigo-600 flex items-center gap-1 text-xs font-medium"
              >
                <Pencil className="w-3 h-3" />
                {hasCommitment ? 'Edit' : 'Add'}
              </button>
            )}
          </div>

          {editingCommitment ? (
            <div className="space-y-3">
              <input
                type="text"
                value={draftTitle}
                onChange={e => setDraftTitle(e.target.value)}
                placeholder="e.g. Team Standup"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <input
                type="time"
                value={draftTime}
                onChange={e => setDraftTime(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <div className="flex gap-2">
                <button
                  onClick={saveCommitment}
                  disabled={savingCommitment}
                  className="flex-1 py-2.5 bg-indigo-600 text-white font-semibold text-sm rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  {savingCommitment ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setEditingCommitment(false)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-500 font-semibold text-sm rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : hasCommitment ? (
            <div className="flex items-center gap-3 bg-indigo-50 rounded-xl p-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-gray-800 font-semibold text-sm">{profile?.next_commitment_title}</p>
                <p className="text-gray-400 text-xs">{profile?.next_commitment_time}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No commitment set — add one so we can work out when you need to leave.</p>
          )}

          {conflict && (
            <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl p-3">
              <p className="text-amber-700 text-xs font-medium">⚠️ Your session overlaps with this event. Consider reducing duration.</p>
            </div>
          )}
        </div>

        {/* Timing breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Your window</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-gray-400 text-xs">Leave by</span>
              </div>
              <p className="text-gray-900 font-bold text-lg">{leaveBy ?? '—'}</p>
              {!leaveBy && <p className="text-gray-400 text-xs mt-0.5">Add a commitment above</p>}
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-gray-400 text-xs">Travel time</span>
              </div>
              {space ? (
                travelLoading ? (
                  <p className="text-gray-400 font-medium text-sm">Calculating…</p>
                ) : (
                  <p className="text-gray-900 font-bold text-lg">
                    {travelEstimated ? '~' : ''}{effectiveTravelMins} min
                  </p>
                )
              ) : (
                <p className="text-gray-400 font-medium text-sm">Pick a space</p>
              )}
            </div>
          </div>
          {space && !travelLoading && coords === null && (
            <button
              onClick={loadTravelTime}
              className="mt-3 flex items-center gap-1.5 text-indigo-500 hover:text-indigo-600 text-xs font-medium"
            >
              <LocateFixed className="w-3.5 h-3.5" />
              Retry travel time
            </button>
          )}
          {space && (
            <div className="mt-3 flex items-center gap-1.5 text-gray-400 text-xs">
              <MapPin className="w-3.5 h-3.5" />
              Walking time to {space.name}{travelEstimated ? ' (straight-line estimate)' : ' (live route)'}
            </div>
          )}
        </div>

        {/* Tip */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex gap-3">
          <Lightbulb className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
          <p className="text-indigo-700 text-sm">Quiet spaces fill up fastest between 9–11am. Book your spot early!</p>
        </div>

        {/* CTA */}
        <button
          onClick={() => onNavigate('map')}
          className="w-full py-4 bg-indigo-600 text-white font-semibold text-base rounded-2xl flex items-center justify-center gap-2 shadow-sm hover:bg-indigo-700 active:scale-95 transition-all"
        >
          Find Best Spaces
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
