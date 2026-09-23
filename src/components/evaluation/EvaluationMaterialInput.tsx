import React, { useRef, useState } from 'react';
import { Image, FileText, Upload, Trash2, Clipboard, Eraser, Check } from 'lucide-react';
import { EvaluationMaterialSource } from '../../types/evaluationTypes';

interface EvaluationMaterialInputProps {
  materials: EvaluationMaterialSource;
  onChange: (updated: EvaluationMaterialSource) => void;
  label?: string;
  curriculumSummaryRecommendation?: string;
}

export const EvaluationMaterialInput: React.FC<EvaluationMaterialInputProps> = ({
  materials,
  onChange,
  label = 'Sumber Bahan Materi Guru',
  curriculumSummaryRecommendation,
}) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pasteSuccess, setPasteSuccess] = useState(false);
  const [copiedFromCurriculum, setCopiedFromCurriculum] = useState(false);

  const handleCopyCurriculumSummary = () => {
    if (!curriculumSummaryRecommendation) return;
    const combined = materials.textNotes
      ? `${materials.textNotes}\n\n[Ringkasan Kurikulum]:\n${curriculumSummaryRecommendation}`
      : curriculumSummaryRecommendation;
    onChange({ ...materials, textNotes: combined });
    setCopiedFromCurriculum(true);
    setTimeout(() => setCopiedFromCurriculum(false), 2500);
  };

  const handleTextChange = (textNotes: string) => {
    onChange({ ...materials, textNotes });
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator?.clipboard?.readText) {
        const clipText = await navigator.clipboard.readText();
        if (clipText) {
          onChange({
            ...materials,
            textNotes: materials.textNotes ? `${materials.textNotes}\n\n${clipText}` : clipText,
          });
          setPasteSuccess(true);
          setTimeout(() => setPasteSuccess(false), 2000);
        }
      }
    } catch (err) {
      console.warn('Clipboard read failed or permission denied:', err);
    }
  };

  const handleClearText = () => {
    if (materials.textNotes) {
      onChange({ ...materials, textNotes: '' });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const url = loadEvt.target?.result as string;
        const newImg = {
          id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          name: file.name,
          url,
          size: file.size,
        };
        onChange({
          ...materials,
          images: [...materials.images, newImg],
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      // If text or doc, attempt reading text
      if (file.name.endsWith('.txt') || file.type.includes('text/plain')) {
        const textReader = new FileReader();
        textReader.onload = (evt) => {
          const txt = evt.target?.result as string;
          if (txt) {
            onChange({
              ...materials,
              textNotes: materials.textNotes ? `${materials.textNotes}\n\n${txt}` : txt,
            });
          }
        };
        textReader.readAsText(file);
      }

      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const base64Data = loadEvt.target?.result as string;
        const newFile = {
          id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          name: file.name,
          type: file.type || 'application/pdf',
          size: file.size,
          base64Data,
        };
        onChange({
          ...materials,
          files: [...materials.files, newFile],
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (id: string) => {
    onChange({
      ...materials,
      images: materials.images.filter((img) => img.id !== id),
    });
  };

  const removeFile = (id: string) => {
    onChange({
      ...materials,
      files: materials.files.filter((f) => f.id !== id),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
          <label className="block text-xs font-bold text-slate-300">{label}</label>
          <div className="flex items-center flex-wrap gap-2">
            {curriculumSummaryRecommendation && (
              <button
                type="button"
                onClick={handleCopyCurriculumSummary}
                className={`px-2.5 py-1 ${
                  copiedFromCurriculum
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-emerald-600/20 hover:bg-emerald-600/30 border-emerald-500/40 text-emerald-300'
                } border rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm`}
                title="Salin ringkasan materi/CP resmi dari referensi kurikulum nasional"
              >
                {copiedFromCurriculum ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tersalin ke Catatan!</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Salin Rangkuman Kurikulum</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className={`px-2.5 py-1 ${
                pasteSuccess
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-indigo-600/20 hover:bg-indigo-600/30 border-indigo-500/40 text-indigo-300'
              } border rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm`}
              title="Tempel teks materi langsung dari clipboard"
            >
              {pasteSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Teks Ditempel!</span>
                </>
              ) : (
                <>
                  <Clipboard className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Tempel dari Clipboard</span>
                </>
              )}
            </button>

            {materials.textNotes && (
              <button
                type="button"
                onClick={handleClearText}
                className="px-2 py-1 bg-slate-800 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                title="Hapus / Kosongkan Teks Materi"
              >
                <Eraser className="w-3 h-3" />
                <span>Bersihkan</span>
              </button>
            )}
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mb-2.5">
          Guru dapat memasukkan sumber materi melalui: <b>1. Tulisan Teks</b>, <b>2. Foto Halaman Buku</b>, dan/atau <b>3. Berkas File PDF / Dokumen</b>.
        </p>

        {/* Input Teks Langsung */}
        <textarea
          value={materials.textNotes}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Tuliskan ringkasan materi, poin-poin bab, rangkuman, atau paste teks naskah soal / modul ajar di sini..."
          className="w-full h-32 bg-[#090D16] border border-[#222B3D] focus:border-indigo-500 rounded-xl p-3 text-xs text-slate-200 outline-none resize-y placeholder:text-slate-500 leading-relaxed font-mono"
        />
      </div>

      {/* Buttons Upload Foto & File */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Upload Foto */}
        <div className="p-3.5 rounded-xl bg-[#0E131F] border border-[#222B3D] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Image className="w-3.5 h-3.5 text-cyan-400" />
              Foto Halaman / Gambar ({materials.images.length})
            </span>
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
            >
              <Upload className="w-3 h-3" />
              + Upload Foto
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          {materials.images.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1 max-h-28 overflow-y-auto">
              {materials.images.map((img) => (
                <div
                  key={img.id}
                  className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-900 w-14 h-14"
                >
                  <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    className="absolute inset-0 bg-black/70 flex items-center justify-center text-rose-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    title="Hapus foto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-slate-500 italic">Belum ada foto halaman yang diunggah.</p>
          )}
        </div>

        {/* Upload File / PDF */}
        <div className="p-3.5 rounded-xl bg-[#0E131F] border border-[#222B3D] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              Berkas PDF / Dokumen ({materials.files.length})
            </span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
            >
              <Upload className="w-3 h-3" />
              + Upload Berkas
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          {materials.files.length > 0 ? (
            <div className="space-y-1.5 max-h-28 overflow-y-auto">
              {materials.files.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between px-2.5 py-1 bg-[#141B2D] border border-slate-700/60 rounded-lg text-[11px] text-slate-300"
                >
                  <span className="truncate max-w-[180px] font-medium">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(f.id)}
                    className="text-slate-400 hover:text-rose-400 p-0.5 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-slate-500 italic">Belum ada berkas dokumen materi yang diunggah.</p>
          )}
        </div>
      </div>
    </div>
  );
};
