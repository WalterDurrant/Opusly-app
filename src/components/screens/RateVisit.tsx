import { useState } from 'react';
import { ArrowLeft, Star } from 'lucide-react';
import type { Space } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';
import MetricRow from '../ui/MetricRow';

const ATTRS = ['Noise Level', 'WiFi Quality', 'Plug Sockets', 'Seating Availability', 'Laptop Friendly', 'Food Options', 'Closeness', 'Accessibility'];
const TYPE_ICONS: Record<string, string> = { cafe: '☕', library: '📚', coworking: '💼', park: '🌿', restaurant: '🍽️' };

interface Props {
  space: Space;
  onBack: () => void;
  onSubmit: () => void;
}

export default function RateVisit({ space, onBack, onSubmit }: Props) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [overall, setOverall] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const rated = Object.keys(scores).length;
  const canSubmit = rated >= 3 && overall > 0;

  function setScore(attr: string, s: number) {
    setScores(prev => ({ ...prev, [attr]: s }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    const avgAttr = rated > 0 ? Object.values(scores).reduce((a, b) => a + b, 0) / rated : overall;
    const finalRating = overall || Math.round(avgAttr);

    await supabase.from('reviews').insert({
      space_id: space.id,
      author_name: 'You',
      rating: finalRating,
      comment: comment.trim() || 'No comment',
      attribute_scores: scores,
    });

    // Update space rating
    const { data: existing } = await supabase.from('reviews').select('rating').eq('space_id', space.id);
    if (existing && existing.length > 0) {
      const avg = existing.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / existing.length;
      await supabase.from('spaces').update({ rating: Math.round(avg * 10) / 10, review_count: existing.length }).eq('id', space.id);
    }

    setDone(true);
    setSubmitting(false);
    setTimeout(onSubmit, 1500);
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center px-8 animate-fadeIn">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-gray-900 font-bold text-xl mb-2">Thanks for your review!</h2>
          <p className="text-gray-400 text-sm">Your feedback helps the community</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-14 pb-5">
        <button onClick={onBack} className="mb-4 flex items-center gap-2 text-gray-500 text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Rate your visit</h1>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-lg">{TYPE_ICONS[space.type]}</span>
          <p className="text-gray-500 text-sm">{space.name}</p>
        </div>
      </div>

      <div className="px-5 pt-5 space-y-4">
        {/* Overall rating */}
        <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Overall Rating</p>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} onClick={() => setOverall(s)}>
                <Star className={`w-8 h-8 transition-colors ${s <= overall ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Attribute ratings */}
        <div className="bg-white rounded-2xl border border-gray-100 px-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest pt-4 pb-2">Rate Each Attribute</p>
          {ATTRS.map(attr => (
            <MetricRow
              key={attr}
              label={attr}
              score={scores[attr] ?? 0}
              interactive
              onScore={s => setScore(attr, s)}
            />
          ))}
          <div className="pb-2" />
        </div>

        {/* Comment */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Your Experience</p>
          <textarea
            placeholder="Share what it was like..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={4}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-400 transition-colors resize-none"
          />
        </div>

        {!canSubmit && (
          <p className="text-center text-gray-400 text-xs">Rate at least 3 attributes to submit</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className={`w-full py-4 rounded-2xl font-semibold text-base transition-all ${canSubmit && !submitting ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-sm' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
        >
          {submitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>
    </div>
  );
}
