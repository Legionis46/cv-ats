'use client';

import { useState, useEffect, useCallback } from 'react';
import { Candidate, FilterParams } from '@/types';
import UploadZone from '@/components/UploadZone';
import CandidateCard from '@/components/CandidateCard';
import FilterBar from '@/components/FilterBar';
import CandidateModal from '@/components/CandidateModal';
import { Users, Upload, LayoutGrid, List, RefreshCw, Briefcase, TrendingUp, UserCheck, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

function useDebounce<T>(value: T, delay: number): T {
  const [deb, setDeb] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDeb(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return deb;
}

type ViewMode = 'grid' | 'list';

export default function DashboardPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterParams>({});
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showUpload, setShowUpload] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const debouncedFilters = useDebounce(filters, 400);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (debouncedFilters.search) p.set('search', debouncedFilters.search);
      if (debouncedFilters.university) p.set('university', debouncedFilters.university);
      if (debouncedFilters.department) p.set('department', debouncedFilters.department);
      if (debouncedFilters.skills?.length) p.set('skills', debouncedFilters.skills.join(','));
      if (debouncedFilters.min_experience !== undefined) p.set('min_experience', String(debouncedFilters.min_experience));
      if (debouncedFilters.max_experience !== undefined) p.set('max_experience', String(debouncedFilters.max_experience));
      if (debouncedFilters.status) p.set('status', debouncedFilters.status);

      const res = await fetch(`/api/candidates?${p.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCandidates(data.candidates || []);
    } catch { toast.error('Adaylar yüklenemedi.'); }
    finally { setLoading(false); }
  }, [debouncedFilters]);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  const stats = {
    total: candidates.length,
    new: candidates.filter((c) => c.status === 'Yeni').length,
    interview: candidates.filter((c) => c.status === 'Görüşme Planlandı').length,
    offer: candidates.filter((c) => c.status === 'Teklif Yapıldı').length,
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-sm">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 leading-none text-lg">TalentPool</h1>
              <p className="text-xs text-slate-400">CV Havuzu & ATS</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchCandidates} title="Yenile"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
              <button onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}>
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}>
                <List className="w-4 h-4" />
              </button>
            </div>
            <button onClick={() => setShowUpload(!showUpload)}
              className={`btn-primary flex items-center gap-2 ${showUpload ? 'bg-blue-700' : ''}`}>
              <Upload className="w-4 h-4" />CV Yükle
            </button>
          </div>
        </div>
      </header>

      {/* Upload panel */}
      {showUpload && (
        <div className="bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-screen-2xl mx-auto px-6 py-6">
            <div className="max-w-2xl mx-auto">
              <UploadZone onUploadSuccess={() => { fetchCandidates(); setTimeout(() => setShowUpload(false), 2500); }} />
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 max-w-screen-2xl mx-auto w-full px-6 py-6 flex gap-6">
        {/* Sidebar */}
        <div className="relative flex-shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute -right-3 top-4 z-10 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors">
            {sidebarOpen ? <ChevronLeft className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
          </button>
          <aside className={`transition-all duration-300 overflow-hidden ${sidebarOpen ? 'w-64' : 'w-0'}`}>
            {sidebarOpen && (
              <div className="card p-5 w-64 sticky top-24">
                <FilterBar filters={filters} onChange={setFilters} />
              </div>
            )}
          </aside>
        </div>

        {/* Main */}
        <main className="flex-1 min-w-0">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Toplam Aday', value: stats.total, Icon: Users, cls: 'text-blue-600 bg-blue-50' },
              { label: 'Yeni', value: stats.new, Icon: TrendingUp, cls: 'text-emerald-600 bg-emerald-50' },
              { label: 'Görüşme', value: stats.interview, Icon: UserCheck, cls: 'text-amber-600 bg-amber-50' },
              { label: 'Teklif', value: stats.offer, Icon: Briefcase, cls: 'text-violet-600 bg-violet-50' },
            ].map(({ label, value, Icon, cls }) => (
              <div key={label} className="card p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cls}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{value}</p>
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Count */}
          <div className="mb-4">
            <p className="text-sm text-slate-500">{loading ? 'Yükleniyor...' : `${candidates.length} aday bulundu`}</p>
          </div>

          {/* Grid */}
          {loading ? (
            <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card p-5 animate-pulse">
                  <div className="flex gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-slate-200" />
                    <div className="flex-1 space-y-2"><div className="h-4 bg-slate-200 rounded w-3/4" /><div className="h-3 bg-slate-200 rounded w-1/2" /></div>
                  </div>
                  <div className="space-y-2"><div className="h-3 bg-slate-200 rounded" /><div className="h-3 bg-slate-200 rounded w-4/5" /></div>
                </div>
              ))}
            </div>
          ) : candidates.length === 0 ? (
            <div className="card text-center py-20">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="font-semibold text-slate-700 mb-1">Aday bulunamadı</h3>
              <p className="text-sm text-slate-400 mb-6">Filtreleri değiştirin veya yeni CV yükleyin.</p>
              <button onClick={() => setShowUpload(true)} className="btn-primary inline-flex items-center gap-2 mx-auto">
                <Upload className="w-4 h-4" />İlk CV&apos;yi Yükle
              </button>
            </div>
          ) : (
            <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
              {candidates.map((c) => (
                <CandidateCard key={c.id} candidate={c} onClick={() => setSelectedId(c.id)} />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Modal */}
      {selectedId !== null && (
        <CandidateModal
          candidateId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdate={fetchCandidates}
          onDelete={fetchCandidates}
        />
      )}
    </div>
  );
}
