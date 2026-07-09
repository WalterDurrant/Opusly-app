import { useEffect, useState } from 'react';
import { User, ChevronRight, Edit2, Check, X } from 'lucide-react';
import type { UserProfile } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';
import { getAvatarColor, getInitials } from '../../lib/utils';

const PREF_OPTIONS: Record<string, string[]> = {
  study_preferences: ['Deep Focus', 'Casual Work', 'Group Study', 'Calls'],
  workspace_needs: ['WiFi', 'Plug Sockets', 'Quiet', 'Food', 'Accessible'],
  food_preferences: ['Coffee', 'Snacks', 'Full Meals', 'None needed'],
  accessibility_requirements: ['Wheelchair', 'Step-free', 'Hearing loop', 'None'],
};

const PREF_LABELS: Record<string, string> = {
  study_preferences: 'Study Preferences',
  workspace_needs: 'Workspace Needs',
  food_preferences: 'Food Preferences',
  accessibility_requirements: 'Accessibility Requirements',
  typical_session_length: 'Typical Session Length',
  preferred_travel_time: 'Preferred Travel Time',
};

const TIME_OPTS = ['30 min', '1 hour', '2 hours', '3+ hours'];
const TRAVEL_OPTS = ['5 min', '10 min', '15 min', '30 min+'];

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [expandedPref, setExpandedPref] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('user_profile').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data) {
        setProfile(data as UserProfile);
        setName(data.name);
        setEmail(data.email);
      }
    });
  }, []);

  async function saveProfile() {
    await supabase.from('user_profile').update({ name, email }).eq('id', 1);
    setProfile(prev => prev ? { ...prev, name, email } : prev);
    setEditing(false);
  }

  async function togglePrefItem(field: keyof UserProfile, item: string) {
    if (!profile) return;
    const current = (profile[field] as string[]) ?? [];
    const updated = current.includes(item) ? current.filter((x: string) => x !== item) : [...current, item];
    await supabase.from('user_profile').update({ [field]: updated }).eq('id', 1);
    setProfile(prev => prev ? { ...prev, [field]: updated } : prev);
  }

  async function setSinglePref(field: keyof UserProfile, value: string) {
    await supabase.from('user_profile').update({ [field]: value }).eq('id', 1);
    setProfile(prev => prev ? { ...prev, [field]: value } : prev);
    setExpandedPref(null);
  }

  if (!profile) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-600 px-5 pt-14 pb-16">
        <div className="flex items-center justify-between">
          <h1 className="text-white font-bold text-xl">Profile</h1>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 bg-white/20 text-white text-sm px-3 py-1.5 rounded-full">
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <X className="w-4 h-4 text-white" />
              </button>
              <button onClick={saveProfile} className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-indigo-600" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Avatar card */}
      <div className="px-5 -mt-10 mb-4 relative z-10">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-5 py-5 flex items-center gap-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0 ${getAvatarColor(profile.name)}`}>
            {getInitials(profile.name)}
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-2">
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 text-gray-800" />
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 text-gray-600" />
              </div>
            ) : (
              <>
                <p className="text-gray-900 font-bold text-base">{profile.name}</p>
                <p className="text-gray-400 text-sm truncate">{profile.email}</p>
              </>
            )}
          </div>
          {!editing && <User className="w-5 h-5 text-gray-300 flex-shrink-0" />}
        </div>
      </div>

      {/* Preferences */}
      <div className="px-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">My Preferences</p>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {Object.keys(PREF_OPTIONS).map((field, idx, arr) => {
            const values = (profile[field as keyof UserProfile] as string[]) ?? [];
            return (
              <div key={field}>
                <button
                  onClick={() => setExpandedPref(expandedPref === field ? null : field)}
                  className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div>
                    <p className="text-gray-800 text-sm font-medium">{PREF_LABELS[field]}</p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {values.length > 0 ? values.join(', ') : 'Not set'}
                    </p>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-gray-300 transition-transform ${expandedPref === field ? 'rotate-90' : ''}`} />
                </button>
                {expandedPref === field && (
                  <div className="px-4 pb-4 flex flex-wrap gap-2 animate-fadeIn">
                    {PREF_OPTIONS[field].map(opt => (
                      <button
                        key={opt}
                        onClick={() => togglePrefItem(field as keyof UserProfile, opt)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${values.includes(opt) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
                {idx < arr.length - 1 && <div className="h-px bg-gray-50 mx-4" />}
              </div>
            );
          })}

          <div className="h-px bg-gray-50 mx-4" />

          {/* Session length */}
          {['typical_session_length', 'preferred_travel_time'].map((field, idx) => {
            const opts = field === 'typical_session_length' ? TIME_OPTS : TRAVEL_OPTS;
            const val = profile[field as keyof UserProfile] as string;
            return (
              <div key={field}>
                <button
                  onClick={() => setExpandedPref(expandedPref === field ? null : field)}
                  className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div>
                    <p className="text-gray-800 text-sm font-medium">{PREF_LABELS[field]}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{val || 'Not set'}</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-gray-300 transition-transform ${expandedPref === field ? 'rotate-90' : ''}`} />
                </button>
                {expandedPref === field && (
                  <div className="px-4 pb-4 flex flex-wrap gap-2 animate-fadeIn">
                    {opts.map(opt => (
                      <button
                        key={opt}
                        onClick={() => setSinglePref(field as keyof UserProfile, opt)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${val === opt ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
                {idx < 1 && <div className="h-px bg-gray-50 mx-4" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
