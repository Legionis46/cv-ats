/**
 * Hybrid Database Module
 * - If TURSO_DATABASE_URL is set -> uses Turso (cloud LibSQL/SQLite)
 * - If not set -> falls back to local JSON database.
 * - On Vercel / serverless: uses os.tmpdir() + in-memory store so it NEVER crashes with EROFS (Read-only filesystem)!
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Candidate, Note } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// TURSO MODE (Cloud SQLite)
// ─────────────────────────────────────────────────────────────────────────────

function isTursoEnabled(): boolean {
  return Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_DATABASE_URL.trim().length > 0);
}

let tursoClientInstance: any = null;
let tursoSchemaInitialized = false;

async function getTursoClient() {
  if (!tursoClientInstance) {
    const { createClient } = await import('@libsql/client');
    tursoClientInstance = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    });
  }
  return tursoClientInstance;
}

async function ensureTursoSchema() {
  if (tursoSchemaInitialized) return;
  const db = await getTursoClient();
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      location TEXT,
      university TEXT,
      department TEXT,
      graduation_year TEXT,
      skills TEXT DEFAULT '[]',
      experience_years REAL DEFAULT 0,
      last_position TEXT,
      last_company TEXT,
      languages TEXT DEFAULT '[]',
      summary TEXT,
      status TEXT DEFAULT 'Yeni',
      file_path TEXT,
      file_name TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
    );
  `);
  tursoSchemaInitialized = true;
}

function rowToCandidate(row: Record<string, any>): Candidate {
  return {
    ...row,
    id: Number(row.id),
    skills: typeof row.skills === 'string' ? JSON.parse(row.skills) : (row.skills ?? []),
    languages: typeof row.languages === 'string' ? JSON.parse(row.languages) : (row.languages ?? []),
    experience_years: row.experience_years ? Number(row.experience_years) : 0,
  } as Candidate;
}

function rowToNote(row: Record<string, any>): Note {
  return {
    ...row,
    id: Number(row.id),
    candidate_id: Number(row.candidate_id),
  } as Note;
}

// ─────────────────────────────────────────────────────────────────────────────
// SAFE LOCAL / SERVERLESS JSON STORE
// ─────────────────────────────────────────────────────────────────────────────

// Global memory cache so candidates stay available across requests in serverless functions
// eslint-disable-next-line no-var
declare global {
  // eslint-disable-next-line no-var
  var __memoryCandidates: Candidate[] | undefined;
  // eslint-disable-next-line no-var
  var __memoryNotes: Note[] | undefined;
}

if (!global.__memoryCandidates) {
  global.__memoryCandidates = [];
}
if (!global.__memoryNotes) {
  global.__memoryNotes = [];
}

export function getStorageBaseDir(): string {
  // Vercel serverless has a read-only root directory; /tmp is the only writable area
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return os.tmpdir();
  }
  return process.cwd();
}

function getDataDir(): string {
  return path.join(getStorageBaseDir(), 'data');
}

function ensureLocalFiles() {
  try {
    const dataDir = getDataDir();
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const candFile = path.join(dataDir, 'candidates.json');
    if (!fs.existsSync(candFile)) {
      fs.writeFileSync(candFile, '[]', 'utf-8');
    }
    const notesFile = path.join(dataDir, 'notes.json');
    if (!fs.existsSync(notesFile)) {
      fs.writeFileSync(notesFile, '[]', 'utf-8');
    }

    const uploadsDir = path.join(getStorageBaseDir(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  } catch (err) {
    console.warn('Disk storage warning, falling back to memory:', err);
  }
}

function readJSON<T>(filename: 'candidates.json' | 'notes.json'): T[] {
  ensureLocalFiles();
  const filePath = path.join(getDataDir(), filename);
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as T[];
      if (filename === 'candidates.json') {
        global.__memoryCandidates = parsed as unknown as Candidate[];
      } else {
        global.__memoryNotes = parsed as unknown as Note[];
      }
      return parsed;
    }
  } catch (err) {
    console.warn(`readJSON ${filename} failed, using memory:`, err);
  }

  // Fallback to in-memory store
  return (filename === 'candidates.json'
    ? global.__memoryCandidates
    : global.__memoryNotes) as unknown as T[];
}

function writeJSON<T>(filename: 'candidates.json' | 'notes.json', data: T[]): void {
  ensureLocalFiles();
  if (filename === 'candidates.json') {
    global.__memoryCandidates = data as unknown as Candidate[];
  } else {
    global.__memoryNotes = data as unknown as Note[];
  }

  try {
    const filePath = path.join(getDataDir(), filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn(`writeJSON ${filename} disk write failed, preserved in memory:`, err);
  }
}

function nextId(items: Array<{ id: number }>): number {
  return items.length === 0 ? 1 : Math.max(...items.map((i) => i.id)) + 1;
}

function now(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

// ─────────────────────────────────────────────────────────────────────────────
// CANDIDATE REPOSITORY METHODS (Unified async API)
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllCandidates(): Promise<Candidate[]> {
  if (isTursoEnabled()) {
    await ensureTursoSchema();
    const db = await getTursoClient();
    const result = await db.execute('SELECT * FROM candidates ORDER BY created_at DESC');
    return result.rows.map((r: Record<string, unknown>) => rowToCandidate(r));
  } else {
    return readJSON<Candidate>('candidates.json');
  }
}

export async function getCandidateById(id: number): Promise<Candidate | null> {
  if (isTursoEnabled()) {
    await ensureTursoSchema();
    const db = await getTursoClient();
    const result = await db.execute({ sql: 'SELECT * FROM candidates WHERE id = ?', args: [id] });
    if (result.rows.length === 0) return null;
    return rowToCandidate(result.rows[0] as Record<string, unknown>);
  } else {
    const list = readJSON<Candidate>('candidates.json');
    return list.find((c) => c.id === id) || null;
  }
}

export async function createCandidate(
  data: Omit<Candidate, 'id' | 'created_at' | 'updated_at'>
): Promise<Candidate> {
  if (isTursoEnabled()) {
    await ensureTursoSchema();
    const db = await getTursoClient();
    const result = await db.execute({
      sql: `INSERT INTO candidates (name, email, phone, location, university, department,
            graduation_year, skills, experience_years, last_position, last_company,
            languages, summary, status, file_path, file_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        data.name,
        data.email ?? null,
        data.phone ?? null,
        data.location ?? null,
        data.university ?? null,
        data.department ?? null,
        data.graduation_year ?? null,
        JSON.stringify(data.skills ?? []),
        data.experience_years ?? 0,
        data.last_position ?? null,
        data.last_company ?? null,
        JSON.stringify(data.languages ?? []),
        data.summary ?? null,
        data.status,
        data.file_path ?? null,
        data.file_name ?? null,
      ],
    });
    const candidate = await getCandidateById(Number(result.lastInsertRowid));
    return candidate!;
  } else {
    const candidates = readJSON<Candidate>('candidates.json');
    const candidate: Candidate = {
      ...data,
      id: nextId(candidates),
      created_at: now(),
      updated_at: now(),
    };
    writeJSON('candidates.json', [...candidates, candidate]);
    return candidate;
  }
}

export async function updateCandidateStatus(
  id: number,
  status: Candidate['status']
): Promise<Candidate | null> {
  if (isTursoEnabled()) {
    await ensureTursoSchema();
    const db = await getTursoClient();
    await db.execute({
      sql: "UPDATE candidates SET status = ?, updated_at = datetime('now','localtime') WHERE id = ?",
      args: [status, id],
    });
    return getCandidateById(id);
  } else {
    const candidates = readJSON<Candidate>('candidates.json');
    const idx = candidates.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    candidates[idx] = { ...candidates[idx], status, updated_at: now() };
    writeJSON('candidates.json', candidates);
    return candidates[idx];
  }
}

export async function deleteCandidate(id: number): Promise<boolean> {
  if (isTursoEnabled()) {
    await ensureTursoSchema();
    const db = await getTursoClient();
    const result = await db.execute({ sql: 'DELETE FROM candidates WHERE id = ?', args: [id] });
    return (result.rowsAffected ?? 0) > 0;
  } else {
    const candidates = readJSON<Candidate>('candidates.json');
    const filtered = candidates.filter((c) => c.id !== id);
    if (filtered.length === candidates.length) return false;
    writeJSON('candidates.json', filtered);

    const notes = readJSON<Note>('notes.json').filter((n) => n.candidate_id !== id);
    writeJSON('notes.json', notes);
    return true;
  }
}

export async function queryCandidates(params: {
  search?: string;
  university?: string;
  department?: string;
  skills?: string[];
  min_experience?: number;
  max_experience?: number;
  status?: string;
}): Promise<Candidate[]> {
  if (isTursoEnabled()) {
    await ensureTursoSchema();
    const db = await getTursoClient();
    let sql = 'SELECT * FROM candidates WHERE 1=1';
    const args: any[] = [];

    if (params.search) {
      sql += ' AND (name LIKE ? OR last_position LIKE ? OR last_company LIKE ? OR summary LIKE ?)';
      const s = `%${params.search}%`;
      args.push(s, s, s, s);
    }
    if (params.university) {
      sql += ' AND university LIKE ?';
      args.push(`%${params.university}%`);
    }
    if (params.department) {
      sql += ' AND department LIKE ?';
      args.push(`%${params.department}%`);
    }
    if (params.status) {
      sql += ' AND status = ?';
      args.push(params.status);
    }
    if (params.min_experience !== undefined) {
      sql += ' AND experience_years >= ?';
      args.push(params.min_experience);
    }
    if (params.max_experience !== undefined) {
      sql += ' AND experience_years <= ?';
      args.push(params.max_experience);
    }
    if (params.skills?.length) {
      for (const skill of params.skills) {
        sql += ' AND LOWER(skills) LIKE ?';
        args.push(`%${skill.toLowerCase()}%`);
      }
    }

    sql += ' ORDER BY created_at DESC';
    const result = await db.execute({ sql, args });
    return result.rows.map((r: Record<string, unknown>) => rowToCandidate(r));
  } else {
    let list = readJSON<Candidate>('candidates.json');

    if (params.search) {
      const s = params.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          (c.last_position ?? '').toLowerCase().includes(s) ||
          (c.last_company ?? '').toLowerCase().includes(s) ||
          (c.summary ?? '').toLowerCase().includes(s)
      );
    }
    if (params.university) {
      const u = params.university.toLowerCase();
      list = list.filter((c) => (c.university ?? '').toLowerCase().includes(u));
    }
    if (params.department) {
      const d = params.department.toLowerCase();
      list = list.filter((c) => (c.department ?? '').toLowerCase().includes(d));
    }
    if (params.status) {
      list = list.filter((c) => c.status === params.status);
    }
    if (params.min_experience !== undefined) {
      list = list.filter((c) => (c.experience_years ?? 0) >= params.min_experience!);
    }
    if (params.max_experience !== undefined) {
      list = list.filter((c) => (c.experience_years ?? 0) <= params.max_experience!);
    }
    if (params.skills && params.skills.length > 0) {
      list = list.filter((c) =>
        params.skills!.every((skill) =>
          c.skills.some((s) => s.toLowerCase().includes(skill.toLowerCase()))
        )
      );
    }

    return list.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTE REPOSITORY METHODS (Unified async API)
// ─────────────────────────────────────────────────────────────────────────────

export async function getNotesByCandidate(candidateId: number): Promise<Note[]> {
  if (isTursoEnabled()) {
    await ensureTursoSchema();
    const db = await getTursoClient();
    const result = await db.execute({
      sql: 'SELECT * FROM notes WHERE candidate_id = ? ORDER BY created_at DESC',
      args: [candidateId],
    });
    return result.rows.map((r: Record<string, unknown>) => rowToNote(r));
  } else {
    return readJSON<Note>('notes.json')
      .filter((n) => n.candidate_id === candidateId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
}

export async function createNote(candidateId: number, content: string): Promise<Note> {
  if (isTursoEnabled()) {
    await ensureTursoSchema();
    const db = await getTursoClient();
    const result = await db.execute({
      sql: 'INSERT INTO notes (candidate_id, content) VALUES (?, ?)',
      args: [candidateId, content],
    });
    const res2 = await db.execute({
      sql: 'SELECT * FROM notes WHERE id = ?',
      args: [Number(result.lastInsertRowid)],
    });
    return rowToNote(res2.rows[0] as Record<string, unknown>);
  } else {
    const notes = readJSON<Note>('notes.json');
    const note: Note = {
      id: nextId(notes),
      candidate_id: candidateId,
      content,
      created_at: now(),
      updated_at: now(),
    };
    writeJSON('notes.json', [...notes, note]);
    return note;
  }
}

export async function updateNote(id: number, content: string): Promise<Note | null> {
  if (isTursoEnabled()) {
    await ensureTursoSchema();
    const db = await getTursoClient();
    await db.execute({
      sql: "UPDATE notes SET content = ?, updated_at = datetime('now','localtime') WHERE id = ?",
      args: [content, id],
    });
    const result = await db.execute({ sql: 'SELECT * FROM notes WHERE id = ?', args: [id] });
    if (result.rows.length === 0) return null;
    return rowToNote(result.rows[0] as Record<string, unknown>);
  } else {
    const notes = readJSON<Note>('notes.json');
    const idx = notes.findIndex((n) => n.id === id);
    if (idx === -1) return null;
    notes[idx] = { ...notes[idx], content, updated_at: now() };
    writeJSON('notes.json', notes);
    return notes[idx];
  }
}

export async function deleteNote(id: number): Promise<boolean> {
  if (isTursoEnabled()) {
    await ensureTursoSchema();
    const db = await getTursoClient();
    const result = await db.execute({ sql: 'DELETE FROM notes WHERE id = ?', args: [id] });
    return (result.rowsAffected ?? 0) > 0;
  } else {
    const notes = readJSON<Note>('notes.json');
    const filtered = notes.filter((n) => n.id !== id);
    if (filtered.length === notes.length) return false;
    writeJSON('notes.json', filtered);
    return true;
  }
}
