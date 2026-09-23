import React, { useState, useEffect } from 'react';
import { X, Save, FolderUp, Link as LinkIcon, Settings, Plus, Trash2 } from 'lucide-react';
import { ExamUploadConfig, ExamBreakdownItem, ExamQuestionRuleRow, DEFAULT_EXAM_BREAKDOWNS } from '../types';
import { sanitizeDriveUrl, isValidUrl } from '../utils/driveHelpers';

interface EditExamConfigModalProps {
  isOpen: boolean;
  config: ExamUploadConfig;
  onClose: () => void;
  onSave: (updates: Partial<ExamUploadConfig>) => Promise<void>;
}

export const EditExamConfigModal: React.FC<EditExamConfigModalProps> = ({
  isOpen,
  config,
  onClose,
  onSave,
}) => {
  const [driveFolderUrl, setDriveFolderUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [activePeriod, setActivePeriod] = useState('');
  const [deadline, setDeadline] = useState('');
  const [instructions, setInstructions] = useState('');
  const [examBreakdowns, setExamBreakdowns] = useState<ExamBreakdownItem[]>(DEFAULT_EXAM_BREAKDOWNS.slice(0, 3));
  const [activeBreakdownTab, setActiveBreakdownTab] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (config && isOpen) {
      setDriveFolderUrl(config.driveFolderUrl || '');
      setTitle(config.title || '');
      setDescription(config.description || '');
      setActivePeriod(config.activePeriod || '');
      setDeadline(config.deadline || '');
      setInstructions(config.instructions || '');
      const savedBreakdowns =
        config.examBreakdowns && config.examBreakdowns.length > 0
          ? JSON.parse(JSON.stringify(config.examBreakdowns))
          : DEFAULT_EXAM_BREAKDOWNS;

      const supportedBreakdowns = savedBreakdowns
        .filter((item: ExamBreakdownItem) => item.id !== 'penilaian-harian')
        .slice(0, 3);

      setExamBreakdowns(
        supportedBreakdowns.length === 3
          ? supportedBreakdowns
          : DEFAULT_EXAM_BREAKDOWNS.slice(0, 3)
      );
      setErrorMsg(null);
    }
  }, [config, isOpen]);

  if (!isOpen) return null;

  const getRulesForBreakdown = (
    breakdown: ExamBreakdownItem,
    breakdownIndex: number
  ): ExamQuestionRuleRow[] => {
    if (Array.isArray(breakdown.questionRules) && breakdown.questionRules.length > 0) {
      return breakdown.questionRules.map((row, rowIndex) => ({
        id: row.id || `${breakdown.id}-${rowIndex}`,
        label: row.label || '',
        pg: Number(row.pg) || 0,
        isian: Number(row.isian) || 0,
        essay: Number(row.essay) || 0,
      }));
    }

    return [
      { id: `${breakdown.id}-1-2`, label: '1–2', pg: 20, isian: 10, essay: 5 },
      { id: `${breakdown.id}-3`, label: '3', pg: 25, isian: 10, essay: 5 },
      { id: `${breakdown.id}-4-6`, label: '4–6', pg: 30, isian: 5, essay: 5 },
      { id: `${breakdown.id}-arab`, label: 'B. Arab', pg: 30, isian: 5, essay: 5 },
      { id: `${breakdown.id}-english`, label: 'B. Inggris', pg: 30, isian: 5, essay: 5 },
      { id: `${breakdown.id}-math`, label: 'Matematika', pg: 30, isian: 5, essay: 5 },
    ];
  };

  const handleQuestionRuleChange = (
    breakdownIndex: number,
    rowIndex: number,
    field: 'label' | 'pg' | 'isian' | 'essay',
    value: string
  ) => {
    setExamBreakdowns((current) => {
      const updated = JSON.parse(JSON.stringify(current)) as ExamBreakdownItem[];
      const breakdown = updated[breakdownIndex];
      if (!breakdown) return current;

      const rules = getRulesForBreakdown(breakdown, breakdownIndex).map((row) => ({ ...row }));
      const target = rules[rowIndex];
      if (!target) return current;

      if (field === 'label') {
        target.label = value;
      } else {
        target[field] = Math.max(0, parseInt(value || '0', 10) || 0);
      }

      breakdown.questionRules = rules;
      return updated;
    });
  };

  const handleAddQuestionRule = (breakdownIndex: number) => {
    setExamBreakdowns((current) => {
      const updated = JSON.parse(JSON.stringify(current)) as ExamBreakdownItem[];
      const breakdown = updated[breakdownIndex];
      if (!breakdown) return current;

      const rules = getRulesForBreakdown(breakdown, breakdownIndex).map((row) => ({ ...row }));

      rules.push({
        id: `${breakdown.id}-custom-${Date.now()}`,
        label: 'Mapel Baru',
        pg: 0,
        isian: 0,
        essay: 0,
      });

      breakdown.questionRules = rules;
      return updated;
    });
  };

  const handleDeleteQuestionRule = (
    breakdownIndex: number,
    rowIndex: number
  ) => {
    setExamBreakdowns((current) => {
      const updated = JSON.parse(JSON.stringify(current)) as ExamBreakdownItem[];
      const breakdown = updated[breakdownIndex];
      if (!breakdown) return current;

      const rules = getRulesForBreakdown(breakdown, breakdownIndex).map((row) => ({ ...row }));

      if (rowIndex < 0 || rowIndex >= rules.length) {
        return current;
      }

      rules.splice(rowIndex, 1);
      breakdown.questionRules = rules;
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!driveFolderUrl.trim() || !isValidUrl(driveFolderUrl)) {
      setErrorMsg('Masukkan tautan Google Drive folder yang valid.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);

      const normalizedBreakdowns = examBreakdowns
        .filter((item) => item.id !== 'penilaian-harian')
        .slice(0, 3)
        .map((item, index) => ({
          ...item,
          questionRules: getRulesForBreakdown(item, index),
        }));

      await onSave({
        driveFolderUrl: sanitizeDriveUrl(driveFolderUrl),
        title: title.trim() || 'Folder Pengumpulan Soal Ujian',
        description: description.trim(),
        activePeriod: activePeriod.trim() || 'STS / SAS / US Semester Berjalan',
        deadline: deadline.trim(),
        instructions: instructions.trim(),
        examBreakdowns: normalizedBreakdowns,
      });

      onClose();
    } catch (err: any) {
      setErrorMsg(
        'Gagal menyimpan pengaturan folder: ' +
        (err?.message || 'Terjadi kesalahan')
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-[680px] bg-[#181B26] border border-[#2B3245] rounded-[20px] shadow-2xl text-slate-100 max-h-[92vh] overflow-hidden flex flex-col">

        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#24293A] flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-400 flex items-center justify-center flex-shrink-0">
              <FolderUp className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate">
                Pengaturan Folder & Info Butir Soal
              </h3>
              <p className="text-[9px] text-slate-500 mt-0.5 truncate">
                Atur folder dan ketentuan soal STS, SAS, dan US.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-[#252B3B] flex items-center justify-center flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto min-h-0">
          {errorMsg && (
            <div className="mx-3.5 mt-3 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-[10px] text-rose-300">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-3.5 space-y-3.5">

            <section className="rounded-2xl border border-[#272D3E] bg-[#12141D] p-3">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-6 h-6 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
                  <FolderUp className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                    Folder Pengumpulan Soal
                  </div>
                  <div className="text-[8px] text-slate-500">
                    Pengaturan dasar pengumpulan.
                  </div>
                </div>
              </div>

              <div className="relative mb-2">
                <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="url"
                  required
                  value={driveFolderUrl}
                  onChange={(e) => setDriveFolderUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full h-9 pl-8 pr-3 bg-[#0F1219] border border-[#272D3E] rounded-lg text-[10px] text-slate-100 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={activePeriod}
                  onChange={(e) => setActivePeriod(e.target.value)}
                  placeholder="Periode ujian"
                  className="h-8 px-2.5 bg-[#0F1219] border border-[#272D3E] rounded-lg text-[9px] text-slate-100 focus:outline-none focus:border-amber-400"
                />
                <input
                  type="text"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  placeholder="Deadline"
                  className="h-8 px-2.5 bg-[#0F1219] border border-[#272D3E] rounded-lg text-[9px] text-slate-100 focus:outline-none focus:border-amber-400"
                />
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Format file"
                  className="h-8 px-2.5 bg-[#0F1219] border border-[#272D3E] rounded-lg text-[9px] text-slate-100 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>
            </section>

            <section className="rounded-2xl border border-[#272D3E] bg-[#12141D] overflow-hidden">
              <div className="px-3 py-2.5 border-b border-[#272D3E] flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
                  <Settings className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-cyan-400">
                    Ketentuan Butir Soal
                  </div>
                  <div className="text-[8px] text-slate-500">
                    Ubah jumlah Bagian A, B, dan C.
                  </div>
                </div>
              </div>

              <div className="p-2.5">
                <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#0F1219] border border-[#272D3E] mb-2.5">
                  {examBreakdowns.slice(0, 3).map((breakdown, index) => (
                    <button
                      key={breakdown.id}
                      type="button"
                      onClick={() => setActiveBreakdownTab(index)}
                      className={`h-8 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                        activeBreakdownTab === index
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'text-slate-500 hover:text-white hover:bg-[#1B2030]'
                      }`}
                    >
                      {index === 0 ? 'STS' : index === 1 ? 'SAS' : 'US'}
                    </button>
                  ))}
                </div>

                {examBreakdowns[activeBreakdownTab] && (
                  <>
                    {/* ==================================================
                        TABEL COMPACT
                        Hanya A / B / C.
                        Tidak ada kolom Total dan tidak ada horizontal scroll.
                        ================================================== */}

                    <div className="w-full max-w-full overflow-hidden rounded-xl border border-[#293246]">

                      <table className="w-full table-fixed border-collapse">

                        <colgroup>
                          <col className="w-[42%]" />
                          <col className="w-[14%]" />
                          <col className="w-[14%]" />
                          <col className="w-[14%]" />
                          <col className="w-[16%]" />
                        </colgroup>

                        <thead>
                          <tr className="bg-[#0F151E] border-b border-[#293246]">
                            <th className="px-2 py-2 text-left text-[8px] font-extrabold uppercase tracking-wide text-cyan-300">
                              Kelas / Mapel
                            </th>
                            <th className="px-1 py-2 text-center text-[9px] font-black text-cyan-300">A</th>
                            <th className="px-1 py-2 text-center text-[9px] font-black text-amber-300">B</th>
                            <th className="px-1 py-2 text-center text-[9px] font-black text-purple-300">C</th>
                            <th className="px-1 py-2 text-center text-[8px] font-black text-rose-300">Aksi</th>
                          </tr>
                        </thead>

                        <tbody>
                          {getRulesForBreakdown(
                            examBreakdowns[activeBreakdownTab],
                            activeBreakdownTab
                          ).map((row, rowIndex) => (
                            <tr
                              key={row.id}
                              className="border-b border-[#222C3A] last:border-b-0"
                            >
                              <td className="min-w-0 px-2 py-1.5">
                                <input
                                  type="text"
                                  value={row.label}
                                  onChange={(e) =>
                                    handleQuestionRuleChange(
                                      activeBreakdownTab,
                                      rowIndex,
                                      'label',
                                      e.target.value
                                    )
                                  }
                                  className="block w-full min-w-0 h-7 rounded-md border border-[#303849] bg-[#0C1017] px-2 text-[9px] font-bold text-white outline-none focus:border-cyan-400/60"
                                />
                              </td>

                              <td className="min-w-0 px-1 py-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  step={1}
                                  inputMode="numeric"
                                  value={row.pg}
                                  onChange={(e) =>
                                    handleQuestionRuleChange(
                                      activeBreakdownTab,
                                      rowIndex,
                                      'pg',
                                      e.target.value
                                    )
                                  }
                                  className="block w-full min-w-0 h-7 rounded-md border border-[#303849] bg-[#0C1017] px-1 text-center text-[10px] font-black text-white outline-none focus:border-cyan-400/60"
                                />
                              </td>

                              <td className="min-w-0 px-1 py-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  step={1}
                                  inputMode="numeric"
                                  value={row.isian}
                                  onChange={(e) =>
                                    handleQuestionRuleChange(
                                      activeBreakdownTab,
                                      rowIndex,
                                      'isian',
                                      e.target.value
                                    )
                                  }
                                  className="block w-full min-w-0 h-7 rounded-md border border-[#303849] bg-[#0C1017] px-1 text-center text-[10px] font-black text-white outline-none focus:border-cyan-400/60"
                                />
                              </td>

                              <td className="min-w-0 px-1 py-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  step={1}
                                  inputMode="numeric"
                                  value={row.essay}
                                  onChange={(e) =>
                                    handleQuestionRuleChange(
                                      activeBreakdownTab,
                                      rowIndex,
                                      'essay',
                                      e.target.value
                                    )
                                  }
                                  className="block w-full min-w-0 h-7 rounded-md border border-[#303849] bg-[#0C1017] px-1 text-center text-[10px] font-black text-white outline-none focus:border-cyan-400/60"
                                />
                              </td>

                              <td className="px-1 py-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteQuestionRule(
                                      activeBreakdownTab,
                                      rowIndex
                                    )
                                  }
                                  disabled={
                                    getRulesForBreakdown(
                                      examBreakdowns[activeBreakdownTab],
                                      activeBreakdownTab
                                    ).length <= 1
                                  }
                                  className="mx-auto flex h-7 w-7 items-center justify-center rounded-md border border-rose-400/20 bg-rose-400/5 text-rose-300 hover:bg-rose-400/15 hover:border-rose-400/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                  title="Hapus ketentuan"
                                  aria-label="Hapus ketentuan"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>

                      </table>

                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddQuestionRule(activeBreakdownTab)}
                      className="mt-2.5 w-full h-8 rounded-lg border border-dashed border-cyan-400/30 bg-cyan-400/5 hover:bg-cyan-400/10 hover:border-cyan-400/50 text-[9px] font-black text-cyan-300 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah Ketentuan
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 mt-2.5">
                      <div className="rounded-lg border border-cyan-400/15 bg-cyan-400/5 px-2.5 py-1.5">
                        <div className="text-[9px] font-black text-cyan-300">A · Pilihan Ganda</div>
                      </div>
                      <div className="rounded-lg border border-amber-400/15 bg-amber-400/5 px-2.5 py-1.5">
                        <div className="text-[9px] font-black text-amber-300">B · Isian</div>
                      </div>
                      <div className="rounded-lg border border-purple-400/15 bg-purple-400/5 px-2.5 py-1.5">
                        <div className="text-[9px] font-black text-purple-300">C · Essay / Menjodohkan</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-3.5 py-2 rounded-lg bg-[#12141D] hover:bg-[#202534] border border-[#272D3E] text-slate-300 text-[10px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-[10px] font-black text-slate-950 shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
              >
                {isSaving ? (
                  <>
                    <span className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Pengaturan</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
