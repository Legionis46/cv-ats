'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Candidate } from '@/types';

interface UploadZoneProps {
  onUploadSuccess: (candidate?: Candidate) => void;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export default function UploadZone({ onUploadSuccess }: UploadZoneProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setState('uploading');
      setProgress(0);

      const interval = setInterval(() => setProgress((p) => Math.min(p + 8, 85)), 350);

      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });

        clearInterval(interval);
        setProgress(100);

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Yükleme başarısız.');

        setState('success');
        toast.success(`"${file.name}" başarıyla yüklendi!`, {
          description: `Aday: ${data.candidate?.name || ''}`,
        });
        setTimeout(() => {
          setState('idle');
          setProgress(0);
          onUploadSuccess(data.candidate);
        }, 1200);
      } catch (err) {
        clearInterval(interval);
        setState('error');
        toast.error('Yükleme Başarısız', {
          description: err instanceof Error ? err.message : 'Beklenmeyen hata.',
        });
        setTimeout(() => {
          setState('idle');
          setProgress(0);
        }, 3000);
      }
    },
    [onUploadSuccess]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    disabled: state === 'uploading',
    onDropRejected: (files) => {
      const err = files[0]?.errors[0];
      if (err?.code === 'file-too-large') toast.error('Dosya çok büyük (max 10MB)');
      else if (err?.code === 'file-invalid-type') toast.error('Sadece PDF, DOC veya DOCX');
    },
  });

  const borderClass =
    isDragReject
      ? 'border-red-400 bg-red-50'
      : isDragActive
      ? 'border-blue-500 bg-blue-50 scale-[1.01]'
      : state === 'success'
      ? 'border-green-400 bg-green-50'
      : state === 'error'
      ? 'border-red-400 bg-red-50'
      : state === 'uploading'
      ? 'border-blue-400 bg-blue-50'
      : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/30';

  return (
    <div
      {...getRootProps()}
      className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${borderClass} ${
        state === 'uploading' ? 'cursor-not-allowed' : ''
      }`}
    >
      <input {...getInputProps()} />

      {state === 'uploading' && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-200 rounded-t-2xl overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex justify-center mb-4">
        {state === 'uploading' && (
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        )}
        {state === 'success' && (
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        )}
        {state === 'error' && (
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
        )}
        {state === 'idle' && (
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
              isDragActive ? 'bg-blue-100 scale-110' : 'bg-slate-100'
            }`}
          >
            {isDragActive ? (
              <FileText className="w-8 h-8 text-blue-600" />
            ) : (
              <Upload className="w-8 h-8 text-slate-400" />
            )}
          </div>
        )}
      </div>

      {state === 'uploading' && (
        <>
          <p className="font-semibold text-blue-700">İşleniyor...</p>
          <p className="text-sm text-blue-500 mt-1">Yapay zeka CV&apos;yi analiz ediyor</p>
        </>
      )}
      {state === 'success' && (
        <>
          <p className="font-semibold text-green-700">Başarıyla işlendi!</p>
          <p className="text-sm text-green-500 mt-1">Aday profili listeye eklendi</p>
        </>
      )}
      {state === 'error' && (
        <>
          <p className="font-semibold text-red-700">Yükleme başarısız</p>
          <p className="text-sm text-red-500 mt-1">Tekrar denemek için tıklayın</p>
        </>
      )}
      {state === 'idle' && (
        <>
          <p className="font-semibold text-slate-700">{isDragActive ? 'Bırakın!' : 'CV Yükle'}</p>
          <p className="text-sm text-slate-500 mt-1">
            PDF veya DOCX sürükleyin ya da{' '}
            <span className="text-blue-600 font-medium">dosya seçin</span>
          </p>
          <p className="text-xs text-slate-400 mt-2">Maksimum 10MB</p>
        </>
      )}
    </div>
  );
}
