'use client';

import { Candidate, CandidateStatus } from '@/types';
import { GraduationCap, MapPin, Clock, Mail, ChevronRight } from 'lucide-react';

interface Props { candidate: Candidate; onClick: () => void; }

const STATUS_CFG: Record<CandidateStatus, { label: string; cls: string; dot: string }> = {
  'Yeni':               { label: 'Yeni',        cls: 'bg-blue-50 text-blue-700 border-blue-200',   dot: 'bg-blue-500' },
  'İncelendi':          { label: 'İncelendi',   cls: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
  'Görüşme Planlandı':  { label: 'Görüşme',     cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  'Teklif Yapıldı':     { label: 'Teklif',      cls: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' },
  'Reddedildi':         { label: 'Reddedildi',  cls: 'bg-red-50 text-red-600 border-red-200',       dot: 'bg-red-400' },
};

const AVATAR_COLORS = [
  'from-blue-500 to-blue-600','from-violet-500 to-violet-600',
  'from-emerald-500 to-emerald-600','from-rose-500 to-rose-600',
  'from-amber-500 to-amber-600','from-cyan-500 to-cyan-600',
  'from-indigo-500 to-indigo-600','from-pink-500 to-pink-600',
];

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase() || '').join('');
}
function avatarColor(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }

export default function CandidateCard({ candidate, onClick }: Props) {
  const s = STATUS_CFG[candidate.status] || STATUS_CFG['Yeni'];
  const displaySkills = candidate.skills.slice(0, 4);
  const extra = candidate.skills.length - 4;

  return (
    <div
      onClick={onClick}
      className="card p-5 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all duration-200 group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${avatarColor(candidate.name)} flex items-center justify-center flex-shrink-0`}>
            <span className="text-white font-semibold text-sm">{initials(candidate.name)}</span>
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 truncate group-hover:text-blue-700 transition-colors">{candidate.name}</h3>
            {candidate.last_position && (
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {candidate.last_position}{candidate.last_company && ` · ${candidate.last_company}`}
              </p>
            )}
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium flex-shrink-0 ml-2 ${s.cls}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
          {s.label}
        </div>
      </div>

      {/* Info */}
      <div className="space-y-1.5 mb-4">
        {candidate.university && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <GraduationCap className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
            <span className="truncate">{candidate.university}</span>
            {candidate.department && <span className="text-slate-400 truncate">· {candidate.department}</span>}
          </div>
        )}
        {!!candidate.experience_years && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <span>{candidate.experience_years} yıl deneyim</span>
          </div>
        )}
        {candidate.location && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <MapPin className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            <span className="truncate">{candidate.location}</span>
          </div>
        )}
        {candidate.email && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Mail className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            <span className="truncate">{candidate.email}</span>
          </div>
        )}
      </div>

      {/* Skills */}
      {candidate.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {displaySkills.map((skill, i) => <span key={i} className="skill-badge">{skill}</span>)}
          {extra > 0 && <span className="badge bg-slate-100 text-slate-500 border border-slate-200">+{extra}</span>}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
        <span className="text-xs text-slate-400">
          {new Date(candidate.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
      </div>
    </div>
  );
}
