'use client';

import { useState } from 'react';
import { Note } from '@/types';
import { PlusCircle, Pencil, Trash2, Check, X, StickyNote } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  candidateId: number;
  notes: Note[];
  onNotesChange: (notes: Note[]) => void;
}

function fmtDate(d: string) {
  try {
    return new Date(d).toLocaleString('tr-TR', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return d; }
}

export default function NoteEditor({ candidateId, notes, onNotesChange }: Props) {
  const [newNote, setNewNote] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);

  const addNote = async () => {
    if (!newNote.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: candidateId, content: newNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onNotesChange([data.note, ...notes]);
      setNewNote('');
      toast.success('Not eklendi');
    } catch (e) { toast.error('Not eklenemedi', { description: e instanceof Error ? e.message : undefined }); }
    finally { setLoading(false); }
  };

  const saveEdit = async (id: number) => {
    if (!editContent.trim()) return;
    setSavingId(id);
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onNotesChange(notes.map((n) => (n.id === id ? data.note : n)));
      setEditId(null);
      toast.success('Not güncellendi');
    } catch { toast.error('Güncellenemedi'); }
    finally { setSavingId(null); }
  };

  const deleteNote = async (id: number) => {
    if (!confirm('Bu notu silmek istiyor musunuz?')) return;
    try {
      const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onNotesChange(notes.filter((n) => n.id !== id));
      toast.success('Not silindi');
    } catch { toast.error('Silinemedi'); }
  };

  return (
    <div className="space-y-4">
      {/* New note */}
      <div className="space-y-2">
        <label className="label">Yeni Not</label>
        <textarea
          className="input resize-none" rows={3}
          placeholder="Mülakat notu, değerlendirme..."
          value={newNote} onChange={(e) => setNewNote(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addNote(); }}
        />
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-400">Ctrl+Enter ile kaydet</span>
          <button onClick={addNote} disabled={!newNote.trim() || loading} className="btn-primary flex items-center gap-2 text-sm py-1.5">
            <PlusCircle className="w-4 h-4" />{loading ? 'Kaydediliyor...' : 'Not Ekle'}
          </button>
        </div>
      </div>

      {/* Notes list */}
      <div className="space-y-3">
        {notes.length === 0 ? (
          <div className="text-center py-8">
            <StickyNote className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Henüz not yok</p>
          </div>
        ) : notes.map((note) => (
          <div key={note.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            {editId === note.id ? (
              <div className="space-y-2">
                <textarea className="input resize-none bg-white" rows={3} value={editContent}
                  onChange={(e) => setEditContent(e.target.value)} autoFocus />
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(note.id)} disabled={savingId === note.id}
                    className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3">
                    <Check className="w-3.5 h-3.5" />{savingId === note.id ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                  <button onClick={() => setEditId(null)} className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3">
                    <X className="w-3.5 h-3.5" />İptal
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-amber-600">
                    {fmtDate(note.created_at)}
                    {note.updated_at !== note.created_at && <span className="text-amber-400 ml-1">(düzenlendi)</span>}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditId(note.id); setEditContent(note.content); }}
                      className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-600 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteNote(note.id)}
                      className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
