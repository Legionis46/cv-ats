'use client';

import { useState, useEffect, useCallback } from 'react';
import { Candidate, Note, CandidateStatus } from '@/types';
import {
  X, Download, Mail, Phone, MapPin, GraduationCap,
  Briefcase, Globe, Clock, User, FileText, StickyNote,
  Trash2, ChevronDown, Building2, Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import NoteEditor from './NoteEditor';

interface Props {
  candidateId: number | null;
  onClose: () => void;
  onUpdate: () => void;
  onDelete: () => void;
}

const STATUSES: CandidateStatus[] = ['Yeni', 'İncelendi', 'Görüşme Planlandı', 'Teklif Yapıldı', 'Reddedildi'];
const STATUS_CLS: Record<CandidateStatus, string> = {
  'Yeni': 'bg-blue-100 text-blue-800',
  'İncelendi': 'bg-slate-100 text-slate-700',
  'Görüşme Planlandı': 'bg-amber-100 text-amber-800',
  'Teklif Yapıldı': 'bg-green-100 text-green-800',
  'Reddedildi': 'bg-red-100 text-red-700',
};
const AVATAR_COLORS = [
  'from-blue-500 to-blue-700','from-violet-500 to-violet-700',
  'from-emerald-500 to-emerald-700','from-rose-500 to-rose-700',
  'from-amber-500 to-amber-700','from-cyan-500 to-cyan-700',
  'from-indigo-500 to-indigo-700','from-pink-500 to-pink-700',
];
function initials(n: string) { return n.split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]?.toUpperCase() || '').join(''); }
function avatarColor(n: string) { return AVATAR_COLORS[n.charCodeAt(0) % AVATAR_COLORS.length]; }

type Tab = 'profile' | 'notes';

export default function CandidateModal({ candidateId, onClose, onUpdate, onDelete }: Props) {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('profile');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showStatusDrop, setShowStatusDrop] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetch_ = useCallback(async () => {
    if (!candidateId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/candidates/${candidateId}`);
      const data = await res.json();
      if (res.ok) { setCandidate(data.candidate); setNotes(data.notes || []); }
    } catch { toast.error('Aday yüklenemedi.'); }
    finally { setLoading(false); }
  }, [candidateId]);

  useEffect(() => { fetch_(); setTab('profile'); }, [fetch_]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const updateStatus = async (status: CandidateStatus) => {
    if (!candidate) return;
    setUpdatingStatus(true); setShowStatusDrop(false);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCandidate(data.candidate); onUpdate();
      toast.success(`Durum: ${status}`);
    } catch { toast.error('Durum güncellenemedi.'); }
    finally { setUpdatingStatus(false); }
  };

  const handleDelete = async () => {
    if (!candidate || !confirm(`"${candidate.name}" silinsin mi? Bu işlem geri alınamaz.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Aday silindi.'); onDelete(); onClose();
    } catch { toast.error('Silinemedi.'); }
    finally { setDeleting(false); }
  };

  if (!candidateId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {loading && (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && candidate && (
          <>
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white flex-shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${avatarColor(candidate.name)} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                    <span className="text-white font-bold text-xl">{initials(candidate.name)}</span>
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold truncate">{candidate.name}</h2>
                    {candidate.last_position && (
                      <p className="text-slate-300 text-sm mt-0.5 truncate">
                        {candidate.last_position}{candidate.last_company && <span className="text-slate-400"> @ {candidate.last_company}</span>}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {candidate.location && <span className="flex items-center gap-1 text-xs text-slate-300"><MapPin className="w-3 h-3" />{candidate.location}</span>}
                      {!!candidate.experience_years && <span className="flex items-center gap-1 text-xs text-slate-300"><Clock className="w-3 h-3" />{candidate.experience_years} yıl</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Status */}
                  <div className="relative">
                    <button onClick={() => setShowStatusDrop(!showStatusDrop)} disabled={updatingStatus}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${STATUS_CLS[candidate.status]}`}>
                      {updatingStatus && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                      {candidate.status}<ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    {showStatusDrop && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden">
                        {STATUSES.map((s) => (
                          <button key={s} onClick={() => updateStatus(s)}
                            className={`w-full text-left px-4 py-2.5 text-sm ${candidate.status === s ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Download */}
                  {candidate.file_path && (
                    <button onClick={() => window.open(`/api/candidates/${candidate.id}/file`, '_blank')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium text-white transition-colors">
                      <Download className="w-4 h-4" />CV İndir
                    </button>
                  )}

                  <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mt-5">
                {(['profile', 'notes'] as Tab[]).map((t) => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-white text-slate-900' : 'text-slate-300 hover:bg-white/10'}`}>
                    {t === 'profile' ? <User className="w-4 h-4" /> : <StickyNote className="w-4 h-4" />}
                    {t === 'profile' ? 'Profil' : `Notlar${notes.length > 0 ? ` (${notes.length})` : ''}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {tab === 'profile' && (
                <div className="space-y-6">
                  {/* Summary */}
                  {candidate.summary && (
                    <div>
                      <h3 className="label flex items-center gap-1.5 mb-2">Özet</h3>
                      <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100">{candidate.summary}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Contact */}
                    <div>
                      <h3 className="label flex items-center gap-1.5 mb-3"><User className="w-3.5 h-3.5" />İletişim</h3>
                      <div className="space-y-2.5">
                        {candidate.email && (
                          <div className="flex items-center gap-2.5 text-sm">
                            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center"><Mail className="w-4 h-4 text-blue-500" /></div>
                            <a href={`mailto:${candidate.email}`} className="text-blue-600 hover:underline truncate">{candidate.email}</a>
                          </div>
                        )}
                        {candidate.phone && (
                          <div className="flex items-center gap-2.5 text-sm">
                            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center"><Phone className="w-4 h-4 text-green-500" /></div>
                            <span className="text-slate-700">{candidate.phone}</span>
                          </div>
                        )}
                        {candidate.location && (
                          <div className="flex items-center gap-2.5 text-sm">
                            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center"><MapPin className="w-4 h-4 text-red-400" /></div>
                            <span className="text-slate-700">{candidate.location}</span>
                          </div>
                        )}
                        {!candidate.email && !candidate.phone && !candidate.location && (
                          <p className="text-sm text-slate-400 italic">İletişim bilgisi bulunamadı</p>
                        )}
                      </div>
                    </div>

                    {/* Education */}
                    <div>
                      <h3 className="label flex items-center gap-1.5 mb-3"><GraduationCap className="w-3.5 h-3.5" />Eğitim</h3>
                      <div className="bg-violet-50 border border-violet-100 rounded-xl p-3.5">
                        {candidate.university
                          ? <p className="font-semibold text-violet-900 text-sm">{candidate.university}</p>
                          : <p className="text-slate-400 text-sm italic">Üniversite bulunamadı</p>}
                        {candidate.department && <p className="text-violet-700 text-sm mt-0.5">{candidate.department}</p>}
                        {candidate.graduation_year && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <Calendar className="w-3.5 h-3.5 text-violet-500" />
                            <span className="text-xs text-violet-600">Mezuniyet: {candidate.graduation_year}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Experience */}
                    <div>
                      <h3 className="label flex items-center gap-1.5 mb-3"><Briefcase className="w-3.5 h-3.5" />Deneyim</h3>
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 space-y-1.5">
                        {!!candidate.experience_years && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-500" />
                            <span className="font-semibold text-amber-900 text-sm">{candidate.experience_years} yıl deneyim</span>
                          </div>
                        )}
                        {candidate.last_position && <p className="text-amber-800 text-sm font-medium">{candidate.last_position}</p>}
                        {candidate.last_company && (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-amber-700 text-sm">{candidate.last_company}</span>
                          </div>
                        )}
                        {!candidate.experience_years && !candidate.last_position && (
                          <p className="text-slate-400 text-sm italic">Deneyim bilgisi bulunamadı</p>
                        )}
                      </div>
                    </div>

                    {/* Languages */}
                    {candidate.languages?.length > 0 && (
                      <div>
                        <h3 className="label flex items-center gap-1.5 mb-3"><Globe className="w-3.5 h-3.5" />Diller</h3>
                        <div className="space-y-2">
                          {candidate.languages.map((lang, i) => (
                            <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                              <span className="text-sm font-medium text-slate-700">{lang.language}</span>
                              <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">{lang.level}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Skills */}
                  {candidate.skills?.length > 0 && (
                    <div>
                      <h3 className="label flex items-center gap-1.5 mb-3"><FileText className="w-3.5 h-3.5" />Beceriler</h3>
                      <div className="flex flex-wrap gap-2">
                        {candidate.skills.map((s, i) => <span key={i} className="skill-badge">{s}</span>)}
                      </div>
                    </div>
                  )}

                  {/* File */}
                  {candidate.file_name && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
                          <FileText className="w-4 h-4 text-red-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700">{candidate.file_name}</p>
                          <p className="text-xs text-slate-400">Orijinal CV dosyası</p>
                        </div>
                      </div>
                      <button onClick={() => window.open(`/api/candidates/${candidate.id}/file`, '_blank')}
                        className="btn-primary flex items-center gap-2 text-sm py-1.5">
                        <Download className="w-4 h-4" />İndir
                      </button>
                    </div>
                  )}
                </div>
              )}

              {tab === 'notes' && (
                <NoteEditor candidateId={candidate.id} notes={notes} onNotesChange={setNotes} />
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-slate-100 px-6 py-4 flex justify-between items-center bg-slate-50/80">
              <button onClick={handleDelete} disabled={deleting}
                className="btn-danger flex items-center gap-2 text-sm">
                <Trash2 className="w-4 h-4" />{deleting ? 'Siliniyor...' : 'Adayı Sil'}
              </button>
              <span className="text-xs text-slate-400">
                {new Date(candidate.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
