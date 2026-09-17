'use client';

import { useState } from 'react';
import { FilterParams, CandidateStatus } from '@/types';
import { Search, Filter, X } from 'lucide-react';

const STATUSES: CandidateStatus[] = ['Yeni', 'İncelendi', 'Görüşme Planlandı', 'Teklif Yapıldı', 'Reddedildi'];
const COMMON_SKILLS = [
  'JavaScript','TypeScript','Python','Java','React','Vue','Angular','Node.js','Next.js',
  'SQL','PostgreSQL','MongoDB','Docker','AWS','Azure','Git','Linux','C#','Go',
  'GraphQL','REST API','Kubernetes','Machine Learning','Figma','Scrum','Agile',
];

interface Props { filters: FilterParams; onChange: (f: FilterParams) => void; }

export default function FilterBar({ filters, onChange }: Props) {
  const [skillInput, setSkillInput] = useState('');
  const [showDrop, setShowDrop] = useState(false);
  const skills = filters.skills || [];

  const addSkill = (s: string) => {
    const t = s.trim();
    if (t && !skills.includes(t)) onChange({ ...filters, skills: [...skills, t] });
    setSkillInput(''); setShowDrop(false);
  };
  const removeSkill = (s: string) => onChange({ ...filters, skills: skills.filter((x) => x !== s) });
  const clearAll = () => { onChange({}); setSkillInput(''); };

  const hasActive = filters.search || filters.university || filters.department ||
    (skills.length > 0) || filters.status ||
    filters.min_experience !== undefined || filters.max_experience !== undefined;

  const suggestions = COMMON_SKILLS.filter(
    (s) => s.toLowerCase().includes(skillInput.toLowerCase()) && !skills.includes(s)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-slate-400" /><span className="text-sm font-semibold text-slate-700">Filtreler</span></div>
        {hasActive && (
          <button onClick={clearAll} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
            <X className="w-3 h-3" />Temizle
          </button>
        )}
      </div>

      {/* Search */}
      <div>
        <label className="label">Arama</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="İsim, pozisyon..." value={filters.search || ''}
            onChange={(e) => onChange({ ...filters, search: e.target.value })} />
        </div>
      </div>

      {/* University */}
      <div>
        <label className="label">Üniversite</label>
        <input className="input" placeholder="Üniversite adı..." value={filters.university || ''}
          onChange={(e) => onChange({ ...filters, university: e.target.value })} />
      </div>

      {/* Department */}
      <div>
        <label className="label">Bölüm</label>
        <input className="input" placeholder="Bölüm..." value={filters.department || ''}
          onChange={(e) => onChange({ ...filters, department: e.target.value })} />
      </div>

      {/* Experience */}
      <div>
        <label className="label">Deneyim (Yıl)</label>
        <div className="flex items-center gap-2">
          <input type="number" className="input" placeholder="Min" min={0}
            value={filters.min_experience ?? ''}
            onChange={(e) => onChange({ ...filters, min_experience: e.target.value ? +e.target.value : undefined })} />
          <span className="text-slate-400">—</span>
          <input type="number" className="input" placeholder="Max" min={0}
            value={filters.max_experience ?? ''}
            onChange={(e) => onChange({ ...filters, max_experience: e.target.value ? +e.target.value : undefined })} />
        </div>
      </div>

      {/* Skills */}
      <div>
        <label className="label">Beceriler</label>
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {skills.map((s) => (
              <span key={s} onClick={() => removeSkill(s)}
                className="skill-badge cursor-pointer hover:bg-red-50 hover:text-red-600 hover:border-red-200 gap-1">
                {s}<X className="w-3 h-3" />
              </span>
            ))}
          </div>
        )}
        <div className="relative">
          <input className="input" placeholder="Beceri ekle..." value={skillInput}
            onChange={(e) => { setSkillInput(e.target.value); setShowDrop(true); }}
            onFocus={() => setShowDrop(true)}
            onBlur={() => setTimeout(() => setShowDrop(false), 150)}
            onKeyDown={(e) => { if (e.key === 'Enter' && skillInput.trim()) addSkill(skillInput); }} />
          {showDrop && (skillInput || suggestions.length > 0) && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
              {skillInput.trim() && !COMMON_SKILLS.includes(skillInput.trim()) && (
                <button className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 border-b border-slate-100 font-medium"
                  onMouseDown={() => addSkill(skillInput)}>+ &quot;{skillInput.trim()}&quot; ekle</button>
              )}
              {suggestions.slice(0, 8).map((s) => (
                <button key={s} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onMouseDown={() => addSkill(s)}>{s}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status */}
      <div>
        <label className="label">Durum</label>
        <div className="space-y-1">
          <button onClick={() => onChange({ ...filters, status: undefined })}
            className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${!filters.status ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
            Tüm Durumlar
          </button>
          {STATUSES.map((st) => (
            <button key={st} onClick={() => onChange({ ...filters, status: filters.status === st ? undefined : st })}
              className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${filters.status === st ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
              {st}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
