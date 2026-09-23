import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Loader2,
  Download,
  FileText,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  CheckCircle2,
  ListOrdered,
  BookOpen,
  Layers,
  FolderTree,
} from 'lucide-react';
import {
  EvaluationBlueprint,
  EvaluationBlueprintItem,
  EvaluationMaterialSource,
  CognitiveLevel,
  QuestionForm,
  MultipleChoiceOptionsCount,
  EvaluationTopicItem,
  EvaluationDistributionConfig,
} from '../../types/evaluationTypes';
import { generateBlueprintWithAi } from '../../services/evaluation/evaluationAiService';
import {
  getCurriculumSubjects,
  getCurriculumRecommendations,
  getCurriculumSourceInfo,
} from '../../services/evaluation/curriculumDataService';
import { saveBlueprint } from '../../services/evaluation/evaluationStorageService';
import {
  exportBlueprintToExcel,
  exportBlueprintToWordDocx,
} from '../../services/evaluation/evaluationExportService';
import { EvaluationMaterialInput } from './EvaluationMaterialInput';
import { PillStepper } from '../analysis/PillStepper';

interface EvaluationKisiKisiViewProps {
  onSelectBlueprintForQuestions?: (
    blueprint: EvaluationBlueprint
  ) => void;

  // Blueprint yang dikirim dari menu Naskah Soal saat guru menekan Edit.
  // Jika tersedia, seluruh data blueprint dipulihkan ke form dan editor.
  initialBlueprint?: EvaluationBlueprint | null;
}

const PRESET_SUBJECTS = [
  ...getCurriculumSubjects(),
  'Lainnya (Ketik Custom...)',
];

const PRESET_GRADES = [
  'Kelas 1',
  'Kelas 2',
  'Kelas 3',
  'Kelas 4',
  'Kelas 5',
  'Kelas 6',
];

export const EvaluationKisiKisiView: React.FC<
  EvaluationKisiKisiViewProps
> = ({
  onSelectBlueprintForQuestions,
  initialBlueprint,
}) => {
  // ============================================================
  // STEP STATE
  // ============================================================
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // ============================================================
  // FORM STATE
  // ============================================================
  const [subjectSelect, setSubjectSelect] = useState(
    PRESET_SUBJECTS[0] || ''
  );

  const [customSubject, setCustomSubject] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('Kelas 1');
  const [rombel, setRombel] = useState('');
  const [semester, setSemester] = useState('1 (Ganjil)');
  const [schoolYear, setSchoolYear] = useState('2026/2027');
  const [examType, setExamType] = useState(
    'SAS (Sumatif Akhir Semester)'
  );
  const [teacherName, setTeacherName] = useState('');

  const className = rombel.trim()
    ? `${selectedGrade} (${rombel.trim()})`
    : selectedGrade;

  // ============================================================
  // MULTI BAB / TOPIK
  // ============================================================
  const [topics, setTopics] = useState<EvaluationTopicItem[]>([
    {
      id: 'topic_1',
      title: 'Bab 1: Surah Al-Ikhlas & Surah Al-Falaq',
      subTopics:
        'Membaca, menulis, dan memahami pesan pokok surah pendek',
    },
  ]);

  // ============================================================
  // DISTRIBUSI BUTIR SOAL
  // ============================================================
  const [pgCount, setPgCount] = useState<number>(20);
  const [pgOptions, setPgOptions] =
    useState<MultipleChoiceOptionsCount>('A-C');

  const [isianCount, setIsianCount] = useState<number>(5);
  const [menjodohkanCount, setMenjodohkanCount] =
    useState<number>(5);
  const [uraianCount, setUraianCount] = useState<number>(0);
  const [outputStyle, setOutputStyle] = useState<'concise' | 'detailed'>('concise');

  // ============================================================
  // MATERIAL SOURCES
  // ============================================================
  const [materials, setMaterials] =
    useState<EvaluationMaterialSource>({
      textNotes: '',
      images: [],
      files: [],
    });

  // ============================================================
  // BLUEPRINT STATE
  // ============================================================
  const [activeBlueprint, setActiveBlueprint] =
    useState<EvaluationBlueprint | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const [
    isLoadingCurriculumRecommendation,
    setIsLoadingCurriculumRecommendation,
  ] = useState(false);

  const [
    curriculumRecommendations,
    setCurriculumRecommendations,
  ] = useState<
    {
      title: string;
      subTopics: string[];
      element: string;
      phase: string;
      curriculumGoal: string;
    }[]
  >([]);

  const [saveSuccessMessage, setSaveSuccessMessage] =
    useState<string | null>(null);

  // ============================================================
  // EFFECTIVE SUBJECT
  // ============================================================
  const effectiveSubjectName =
    subjectSelect === 'Lainnya (Ketik Custom...)'
      ? customSubject.trim() || 'Mata Pelajaran Kustom'
      : subjectSelect;

  // ============================================================
  // RESTORE BLUEPRINT SAAT DATANG DARI TOMBOL "EDIT"
  // ============================================================
  useEffect(() => {
    if (!initialBlueprint) return;

    /*
     * Jangan hanya mengisi identitas.
     * Seluruh struktur kisi-kisi dipulihkan agar Bab/Materi,
     * indikator, level kognitif, bentuk soal, distribusi, dan
     * seluruh item tetap sama seperti sebelum guru pindah ke
     * menu Naskah Soal.
     */

    setActiveBlueprint(initialBlueprint);
    setCurrentStep(2);

    // Pulihkan identitas.
    const matchingSubject = PRESET_SUBJECTS.includes(
      initialBlueprint.subjectName
    );

    if (matchingSubject) {
      setSubjectSelect(initialBlueprint.subjectName);
      setCustomSubject('');
    } else {
      setSubjectSelect('Lainnya (Ketik Custom...)');
      setCustomSubject(initialBlueprint.subjectName || '');
    }

    if (initialBlueprint.className) {
      const rawClass = initialBlueprint.className;
      const numMatch = rawClass.match(/\d+/);

      if (
        numMatch &&
        ['1', '2', '3', '4', '5', '6'].includes(
          numMatch[0]
        )
      ) {
        setSelectedGrade(`Kelas ${numMatch[0]}`);
      } else {
        setSelectedGrade('Kelas 1');
      }

      if (
        rawClass.includes('(') &&
        rawClass.includes(')')
      ) {
        const inner = rawClass.substring(
          rawClass.indexOf('(') + 1,
          rawClass.lastIndexOf(')')
        );

        setRombel(inner.trim());
      } else if (rawClass.includes('-')) {
        const parts = rawClass.split('-');
        setRombel(
          parts.slice(1).join('-').trim()
        );
      } else if (
        !rawClass.startsWith('Kelas ') &&
        !['1', '2', '3', '4', '5', '6'].includes(
          rawClass.trim()
        )
      ) {
        setRombel(rawClass);
      } else {
        setRombel('');
      }
    } else {
      setSelectedGrade('Kelas 1');
      setRombel('');
    }

    setSemester(
      initialBlueprint.semester || '1 (Ganjil)'
    );

    setSchoolYear(
      initialBlueprint.schoolYear || '2026/2027'
    );

    setExamType(
      initialBlueprint.examType ||
        'SAS (Sumatif Akhir Semester)'
    );

    setTeacherName(
      initialBlueprint.teacherName || ''
    );

    // Pulihkan Bab/Materi yang tersimpan.
    if (
      Array.isArray(initialBlueprint.topics) &&
      initialBlueprint.topics.length > 0
    ) {
      setTopics(
        initialBlueprint.topics.map(
          (topic, index) => ({
            ...topic,
            id:
              topic.id ||
              `topic_restored_${Date.now()}_${index}`,
          })
        )
      );
    } else {
      /*
       * Jika blueprint lama belum memiliki field topics,
       * rekonstruksi minimal dari materi yang ada pada item.
       * Ini hanya fallback kompatibilitas.
       */
      const uniqueMaterials = Array.from(
        new Set(
          (initialBlueprint.items || [])
            .map((item) => item.material)
            .filter(
              (material): material is string =>
                Boolean(
                  material &&
                    material.trim()
                )
            )
        )
      );

      if (uniqueMaterials.length > 0) {
        setTopics(
          uniqueMaterials.map(
            (material, index) => ({
              id: `topic_restored_${Date.now()}_${index}`,
              title: material,
              subTopics: '',
            })
          )
        );
      }
    }

    // Pulihkan distribusi soal.
    if (initialBlueprint.distributionConfig) {
      const distribution =
        initialBlueprint.distributionConfig;

      setPgCount(
        Math.max(
          0,
          distribution.pgCount || 0
        )
      );

      setPgOptions(
        distribution.pgOptions || 'A-C'
      );

      setIsianCount(
        Math.max(
          0,
          distribution.isianCount || 0
        )
      );

      setMenjodohkanCount(
        Math.max(
          0,
          distribution.menjodohkanCount || 0
        )
      );

      setUraianCount(
        Math.max(
          0,
          distribution.uraianCount || 0
        )
      );

      if (distribution.outputStyle) {
        setOutputStyle(distribution.outputStyle);
      } else if (initialBlueprint.outputStyle) {
        setOutputStyle(initialBlueprint.outputStyle);
      }
    } else {
      /*
       * Fallback untuk blueprint lama yang belum memiliki
       * distributionConfig: hitung dari item yang tersimpan.
       */
      const items =
        initialBlueprint.items || [];

      const countByForm = (
        form: QuestionForm
      ) =>
        items.filter(
          (item) =>
            normalizeQuestionForm(
              item.questionForm
            ) === form
        ).length;

      setPgCount(countByForm('PG'));
      setIsianCount(countByForm('ISIAN'));
      setMenjodohkanCount(
        countByForm('MENJODOHKAN')
      );
      setUraianCount(
        countByForm('URAIAN')
      );

      setPgOptions('A-C');
    }

    /*
     * Material/bahan ajar tidak disimpan di EvaluationBlueprint
     * saat ini, sehingga jangan menimpa state materials dengan data
     * kosong. Data yang ada di form tetap dipertahankan.
     */
  }, [initialBlueprint]);

  // ============================================================
  // TOTAL SOAL
  // ============================================================
  const totalCalculatedItems =
    pgCount +
    isianCount +
    menjodohkanCount +
    uraianCount;

  // ============================================================
  // CURRICULUM RECOMMENDATION
  // ============================================================
  const handleRecommendCurriculum =
    async () => {
      setIsLoadingCurriculumRecommendation(
        true
      );

      try {
        // 1. Dapatkan rekomendasi langsung dari file JSON
        // yang sudah ter-bundle.
        const localRecommendations =
          getCurriculumRecommendations(
            effectiveSubjectName,
            selectedGrade
          );

        let recommendedList =
          localRecommendations;

        // 2. Coba juga request ke endpoint server
        // jika server aktif.
        try {
          const response =
            await fetch(
              '/api/evaluation/recommend-curriculum',
              {
                method: 'POST',
                headers: {
                  'Content-Type':
                    'application/json',
                },
                body: JSON.stringify({
                  subjectName:
                    effectiveSubjectName,
                  className,
                  semester,
                  schoolYear,
                }),
              }
            );

          if (response.ok) {
            const data =
              await response.json();

            if (
              Array.isArray(
                data.items
              ) &&
              data.items.length > 0
            ) {
              recommendedList =
                data.items;
            }
          }
        } catch {
          /*
           * Abaikan error jaringan backend
           * karena data lokal sudah berhasil
           * dimuat.
           */
        }

        if (
          recommendedList.length > 0
        ) {
          const newTopics: EvaluationTopicItem[] =
            recommendedList.map(
              (rec, idx) => ({
                id: `topic_${Date.now()}_${idx + 1}`,
                title: rec.title,
                subTopics:
                  Array.isArray(
                    rec.subTopics
                  )
                    ? rec.subTopics.join(
                        '\n'
                      )
                    : rec.subTopics || '',
              })
            );

          setTopics(newTopics);

          setCurriculumRecommendations(
            recommendedList
          );

          setSaveSuccessMessage(
            `Rekomendasi kurikulum untuk ${effectiveSubjectName} (${selectedGrade}) berhasil diterapkan!`
          );

          setTimeout(
            () =>
              setSaveSuccessMessage(
                null
              ),
            4000
          );
        } else {
          // Fallback jika mapel custom.
          setTopics([
            {
              id: `topic_${Date.now()}_1`,
              title: `Bab 1: Materi Pokok ${effectiveSubjectName}`,
              subTopics: `Pengenalan konsep dan pemahaman materi ${effectiveSubjectName}`,
            },
          ]);

          setSaveSuccessMessage(
            `Struktur topik disesuaikan untuk ${effectiveSubjectName}!`
          );

          setTimeout(
            () =>
              setSaveSuccessMessage(
                null
              ),
            3000
          );
        }
      } catch (error) {
        console.error(
          'Curriculum recommendation error:',
          error
        );
      } finally {
        setIsLoadingCurriculumRecommendation(
          false
        );
      }
    };

  const handleSelectCurriculumRecommendation =
    (recommendation: {
      title: string;
      subTopics: string[];
      element: string;
      phase: string;
      curriculumGoal: string;
    }) => {
      const nextIdx =
        topics.length + 1;

      setTopics([
        ...topics,
        {
          id: `topic_${Date.now()}_${nextIdx}`,
          title:
            recommendation.title,
          subTopics:
            recommendation.subTopics.join(
              '\n'
            ),
        },
      ]);

      setCurriculumRecommendations(
        (prev) =>
          prev.filter(
            (item) =>
              item.title !==
              recommendation.title
          )
      );
    };

  // ============================================================
  // TOPIC & SUB-TOPIC HANDLERS
  // ============================================================
  const getSubTopicList = (
    subTopics?: string
  ): string[] => {
    if (subTopics === undefined || subTopics === null) return [''];

    const list = subTopics.split('\n');

    return list.length > 0
      ? list
      : [''];
  };

  const handleUpdateSubTopic = (
    topicId: string,
    subIdx: number,
    value: string
  ) => {
    setTopics((prev) =>
      prev.map((t) => {
        if (t.id !== topicId)
          return t;

        const list = [
          ...getSubTopicList(
            t.subTopics
          ),
        ];

        list[subIdx] = value;

        return {
          ...t,
          subTopics:
            list.join('\n'),
        };
      })
    );
  };

  const handleAddSubTopic = (
    topicId: string,
    afterIdx: number
  ) => {
    setTopics((prev) =>
      prev.map((t) => {
        if (t.id !== topicId)
          return t;

        const list = [
          ...getSubTopicList(
            t.subTopics
          ),
        ];

        list.splice(
          afterIdx + 1,
          0,
          ''
        );

        return {
          ...t,
          subTopics:
            list.join('\n'),
        };
      })
    );
  };

  const handleRemoveSubTopic = (
    topicId: string,
    subIdx: number
  ) => {
    setTopics((prev) =>
      prev.map((t) => {
        if (t.id !== topicId)
          return t;

        const list = [
          ...getSubTopicList(
            t.subTopics
          ),
        ];

        if (list.length <= 1) {
          return {
            ...t,
            subTopics: '',
          };
        }

        list.splice(subIdx, 1);

        return {
          ...t,
          subTopics:
            list.join('\n'),
        };
      })
    );
  };

  const handleAddTopic = () => {
    const nextIdx =
      topics.length + 1;

    setTopics([
      ...topics,
      {
        id: `topic_${Date.now()}`,
        title: `Bab ${nextIdx}: Materi Pokok ${nextIdx}`,
        subTopics: '',
      },
    ]);
  };

  const handleUpdateTopic = (
    id: string,
    field:
      | 'title'
      | 'subTopics',
    value: string
  ) => {
    setTopics(
      topics.map((t) =>
        t.id === id
          ? {
              ...t,
              [field]: value,
            }
          : t
      )
    );
  };

  const handleRemoveTopic = (
    id: string
  ) => {
    if (topics.length <= 1)
      return;

    setTopics(
      topics.filter(
        (t) => t.id !== id
      )
    );
  };

  // ============================================================
  // NORMALIZE QUESTION FORM
  // ============================================================
  const normalizeQuestionForm = (
    value: any
  ): QuestionForm => {
    const normalized = String(
      value || ''
    )
      .trim()
      .toUpperCase();

    if (
      normalized === 'PG' ||
      normalized.includes(
        'PILIHAN GANDA'
      ) ||
      normalized.includes(
        'MULTIPLE CHOICE'
      )
    ) {
      return 'PG';
    }

    if (
      normalized === 'ISIAN' ||
      normalized.includes(
        'ISIAN SINGKAT'
      ) ||
      normalized.includes('FILL')
    ) {
      return 'ISIAN';
    }

    if (
      normalized ===
        'MENJODOHKAN' ||
      normalized.includes(
        'MENJODOHKAN'
      ) ||
      normalized.includes(
        'MATCHING'
      )
    ) {
      return 'MENJODOHKAN';
    }

    if (
      normalized === 'URAIAN' ||
      normalized === 'ESSAY' ||
      normalized.includes(
        'URAIAN'
      ) ||
      normalized.includes(
        'ESSAY'
      )
    ) {
      return 'URAIAN';
    }

    return 'PG';
  };

  // ============================================================
  // DEFAULT MATERIAL
  // ============================================================
  const getDefaultMaterial = (
    index: number
  ): string => {
    if (topics.length === 0) {
      return effectiveSubjectName;
    }

    const topic =
      topics[
        index % topics.length
      ];

    return (
      topic?.title ||
      effectiveSubjectName
    );
  };

  // ============================================================
  // CREATE FALLBACK ITEM
  // ============================================================
  const createFallbackItem = (
    index: number,
    questionForm: QuestionForm
  ): EvaluationBlueprintItem => {
    const questionNumber =
      index + 1;

    return {
      id: `item_fallback_${Date.now()}_${index}`,
      number: questionNumber,
      material:
        getDefaultMaterial(index),
      curriculumGoal: '-',
      indicator:
        questionForm === 'PG'
          ? 'Peserta didik dapat memahami dan menjawab pertanyaan berdasarkan materi yang telah dipelajari.'
          : questionForm ===
            'ISIAN'
          ? 'Peserta didik dapat melengkapi jawaban dengan konsep atau informasi yang tepat.'
          : questionForm ===
            'MENJODOHKAN'
          ? 'Peserta didik dapat memasangkan pernyataan dengan jawaban yang sesuai.'
          : 'Peserta didik dapat menjelaskan atau menganalisis materi dengan tepat.',
      cognitiveLevel: 'C2',
      questionForm,
      questionNumber: `${questionNumber}`,
    };
  };

  // ============================================================
  // BUILD TARGET QUESTION FORMS
  // ============================================================
  const buildTargetQuestionForms = (
    distribution: EvaluationDistributionConfig
  ): QuestionForm[] => {
    const forms: QuestionForm[] =
      [];

    for (
      let i = 0;
      i <
      Math.max(
        0,
        distribution.pgCount
      );
      i++
    ) {
      forms.push('PG');
    }

    for (
      let i = 0;
      i <
      Math.max(
        0,
        distribution.isianCount
      );
      i++
    ) {
      forms.push('ISIAN');
    }

    for (
      let i = 0;
      i <
      Math.max(
        0,
        distribution.menjodohkanCount
      );
      i++
    ) {
      forms.push('MENJODOHKAN');
    }

    for (
      let i = 0;
      i <
      Math.max(
        0,
        distribution.uraianCount
      );
      i++
    ) {
      forms.push('URAIAN');
    }

    return forms;
  };

  // ============================================================
  // NORMALIZE GENERATED BLUEPRINT
  // ============================================================
  const normalizeGeneratedBlueprint = (
    generated: EvaluationBlueprint,
    distribution: EvaluationDistributionConfig
  ): EvaluationBlueprint => {
    const targetForms =
      buildTargetQuestionForms(
        distribution
      );

    const targetTotal =
      targetForms.length;

    const sourceItems =
      Array.isArray(
        generated?.items
      )
        ? generated.items
        : [];

    /*
     * AI hanya bertugas membuat isi kisi-kisi.
     * Jumlah dan distribusi bentuk soal ditentukan
     * sepenuhnya oleh parameter guru.
     */
    const normalizedItems: EvaluationBlueprintItem[] =
      [];

    for (
      let index = 0;
      index < targetTotal;
      index++
    ) {
      const targetForm =
        targetForms[index];

      const aiItem =
        sourceItems[index];

      if (aiItem) {
        normalizedItems.push({
          ...aiItem,

          id:
            aiItem.id ||
            `item_${Date.now()}_${index}`,

          number:
            index + 1,

          material:
            aiItem.material ||
            getDefaultMaterial(
              index
            ),

          curriculumGoal:
            aiItem.curriculumGoal ||
            '-',

          indicator:
            aiItem.indicator ||
            'Peserta didik dapat memahami dan menerapkan materi dengan tepat.',

          cognitiveLevel:
            aiItem.cognitiveLevel ||
            'C2',

          /*
           * questionForm AI diabaikan dan
           * diganti berdasarkan distribusi guru.
           */
          questionForm:
            targetForm,

          /*
           * Nomor soal disusun ulang.
           */
          questionNumber:
            `${index + 1}`,
        });
      } else {
        normalizedItems.push(
          createFallbackItem(
            index,
            targetForm
          )
        );
      }
    }

    /*
     * Jika AI menghasilkan lebih banyak item,
     * item tambahan tidak digunakan.
     */
    return {
      ...generated,
      items: normalizedItems,
    };
  };

  // ============================================================
  // VALIDASI AKHIR DISTRIBUSI
  // ============================================================
  const validateBlueprintDistribution = (
    blueprint: EvaluationBlueprint,
    distribution: EvaluationDistributionConfig
  ) => {
    const items =
      blueprint.items || [];

    const countPG =
      items.filter(
        (item) =>
          normalizeQuestionForm(
            item.questionForm
          ) === 'PG'
      ).length;

    const countIsian =
      items.filter(
        (item) =>
          normalizeQuestionForm(
            item.questionForm
          ) === 'ISIAN'
      ).length;

    const countMenjodohkan =
      items.filter(
        (item) =>
          normalizeQuestionForm(
            item.questionForm
          ) ===
          'MENJODOHKAN'
      ).length;

    const countUraian =
      items.filter(
        (item) =>
          normalizeQuestionForm(
            item.questionForm
          ) === 'URAIAN'
      ).length;

    const expectedTotal =
      distribution.pgCount +
      distribution.isianCount +
      distribution.menjodohkanCount +
      distribution.uraianCount;

    const actualTotal =
      items.length;

    return {
      valid:
        actualTotal ===
          expectedTotal &&
        countPG ===
          distribution.pgCount &&
        countIsian ===
          distribution.isianCount &&
        countMenjodohkan ===
          distribution.menjodohkanCount &&
        countUraian ===
          distribution.uraianCount,

      actualTotal,
      expectedTotal,

      countPG,
      countIsian,
      countMenjodohkan,
      countUraian,
    };
  };

  // ============================================================
  // GENERATE KISI-KISI
  // ============================================================
  const handleGenerate = async () => {
    if (
      totalCalculatedItems <= 0
    ) {
      return;
    }

    setIsLoading(true);

    try {
      const distributionConfig: EvaluationDistributionConfig =
        {
          pgCount,
          pgOptions,
          isianCount,
          menjodohkanCount,
          uraianCount,
          outputStyle,
        };

      /*
       * Simpan target distribusi sebelum memanggil AI.
       */
      const requestedTotal =
        totalCalculatedItems;

      const cleanedTopics = topics.map((t) => ({
        ...t,
        subTopics: t.subTopics
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
          .join('\n'),
      }));

      const generated =
        await generateBlueprintWithAi({
          subjectName:
            effectiveSubjectName,
          className,
          semester,
          schoolYear,
          examType,
          teacherName,
          materialTopic: cleanedTopics
            .map((t) => t.title)
            .join(', '),
          topics: cleanedTopics,
          materials,
          outputStyle,

          /*
           * Jumlah total tetap dikirim ke AI.
           */
          itemCount:
            requestedTotal,

          /*
           * Distribusi juga dikirim ke AI.
           */
          distributionConfig,
        });

      /*
       * ========================================================
       * NORMALISASI HASIL AI
       * ========================================================
       */
      const normalizedBlueprint =
        normalizeGeneratedBlueprint(
          generated,
          distributionConfig
        );

      /*
       * Validasi tambahan sebelum disimpan.
       */
      const validation =
        validateBlueprintDistribution(
          normalizedBlueprint,
          distributionConfig
        );

      if (!validation.valid) {
        throw new Error(
          `Distribusi kisi-kisi tidak valid. ` +
            `Target ${validation.expectedTotal} soal, ` +
            `hasil ${validation.actualTotal} soal.`
        );
      }

      /*
       * ========================================================
       * BENTUK BLUEPRINT FINAL
       * ========================================================
       *
       * Semua metadata aktual dari form guru
       * dipastikan masuk ke blueprint.
       */
      const blueprintWithSourceData: EvaluationBlueprint =
        {
          ...normalizedBlueprint,

          subjectName:
            effectiveSubjectName,

          className,

          semester,

          schoolYear,

          examType,

          teacherName,

          topics: [...cleanedTopics],

          distributionConfig: {
            ...distributionConfig,
          },

          outputStyle,

          updatedAt:
            new Date().toISOString(),
        };

      /*
       * ========================================================
       * AUTO-PERSISTENCE
       * ========================================================
       *
       * PERUBAHAN UTAMA MODUL 1:
       *
       * Begitu Generate berhasil dan validasi lolos,
       * blueprint langsung disimpan ke Evaluation Storage.
       *
       * saveBlueprint() menggunakan blueprint.id yang sama,
       * sehingga:
       * - blueprint baru -> dibuat
       * - blueprint lama -> diperbarui
       *
       * Tidak membuat salinan baru secara otomatis.
       */
      saveBlueprint(
        blueprintWithSourceData
      );

      /*
       * Setelah berhasil dipersist,
       * baru tampilkan hasil di editor.
       */
      setActiveBlueprint(
        blueprintWithSourceData
      );

      setCurrentStep(2);

      setSaveSuccessMessage(
        'Kisi-kisi berhasil dibuat dan otomatis disimpan ke Bank Kisi-Kisi.'
      );

      setTimeout(
        () =>
          setSaveSuccessMessage(
            null
          ),
        4000
      );
    } catch (err) {
      console.error(
        'Failed to generate blueprint:',
        err
      );

      const message =
        err instanceof Error
          ? err.message
          : 'Gagal membuat kisi-kisi.';

      window.alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // UPDATE ITEM
  // ============================================================
  const handleUpdateItem = (
    id: string,
    field: keyof EvaluationBlueprintItem,
    val: any
  ) => {
    if (!activeBlueprint)
      return;

    const updatedItems =
      activeBlueprint.items.map(
        (item) => {
          if (item.id === id) {
            return {
              ...item,
              [field]: val,
            };
          }

          return item;
        }
      );

    setActiveBlueprint({
      ...activeBlueprint,
      items: updatedItems,
    });
  };

  // ============================================================
  // ADD ITEM MANUAL
  // ============================================================
  const handleAddItem = () => {
    if (!activeBlueprint)
      return;

    const nextNum =
      activeBlueprint.items
        .length + 1;

    const firstTopic =
      topics[0]?.title ||
      activeBlueprint.subjectName;

    const newItem: EvaluationBlueprintItem =
      {
        id: `item_${Date.now()}`,
        number: nextNum,
        material: firstTopic,
        curriculumGoal: '-',
        indicator:
          'Peserta didik dapat menganalisis materi dengan tepat.',
        cognitiveLevel: 'C2',
        questionForm: 'PG',
        questionNumber:
          `${nextNum}`,
      };

    setActiveBlueprint({
      ...activeBlueprint,
      items: [
        ...activeBlueprint.items,
        newItem,
      ],
    });
  };

  // ============================================================
  // DELETE ITEM
  // ============================================================
  const handleDeleteItem = (
    id: string
  ) => {
    if (!activeBlueprint)
      return;

    const updated =
      activeBlueprint.items
        .filter(
          (it) => it.id !== id
        )
        .map(
          (it, idx) => ({
            ...it,
            number: idx + 1,
            questionNumber:
              `${idx + 1}`,
          })
        );

    setActiveBlueprint({
      ...activeBlueprint,
      items: updated,
    });
  };

  // ============================================================
  // SAVE
  // ============================================================
  const handleSave = () => {
    if (!activeBlueprint)
      return;

    /*
     * Saat mengedit blueprint lama,
     * identitas, topics, dan distributionConfig
     * terbaru ikut tersimpan dengan ID yang sama.
     */
    const blueprintToSave: EvaluationBlueprint =
      {
        ...activeBlueprint,

        subjectName:
          effectiveSubjectName,

        className,

        semester,

        schoolYear,

        examType,

        teacherName,

        topics,

        distributionConfig: {
          pgCount,
          pgOptions,
          isianCount,
          menjodohkanCount,
          uraianCount,
        },

        updatedAt:
          new Date().toISOString(),
      };

    setActiveBlueprint(
      blueprintToSave
    );

    saveBlueprint(
      blueprintToSave
    );

    setSaveSuccessMessage(
      'Kisi-kisi berhasil disimpan.'
    );

    setTimeout(
      () =>
        setSaveSuccessMessage(
          null
        ),
      3000
    );
  };

  // ============================================================
  // EXPORT EXCEL
  // ============================================================
  const handleExport = () => {
    if (!activeBlueprint)
      return;

    exportBlueprintToExcel(
      activeBlueprint
    );
  };

  // ============================================================
  // EXPORT WORD
  // ============================================================
  const handleExportWord =
    async () => {
      if (!activeBlueprint)
        return;

      await exportBlueprintToWordDocx(
        activeBlueprint
      );
    };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-6">
      {/* ====================================================== */}
      {/* HEADER INFO */}
      {/* ====================================================== */}
      <div className="relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#0C101D] via-[#101627] to-[#16122C] border border-indigo-500/25 shadow-xl shadow-black/20">
        <div className="absolute top-0 right-0 w-64 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-center flex-wrap gap-2.5 mb-2">
            <span className="text-[11px] font-black px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/35 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              Sub Menu 1
            </span>

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <ListOrdered className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                Penyusunan Kisi-Kisi Soal Evaluasi (AI Assistant)
              </h2>
            </div>
          </div>

          <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
            Kombinasi <strong className="text-slate-200">Kurikulum Nasional Terpusat (CP/TP)</strong> +{' '}
            <strong className="text-slate-200">Materi Pokok & Bahan Ajar Guru</strong> +{' '}
            <strong className="text-slate-200">Distribusi Bentuk Soal</strong> menjadi draft kisi-kisi terstruktur yang siap diedit dan diekspor.
          </p>
        </div>

        {activeBlueprint &&
          currentStep === 2 && (
            <div className="relative flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  setCurrentStep(1)
                }
                className="px-3 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-700/80 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Ubah Parameter
              </button>

              <button
                type="button"
                onClick={
                  handleSave
                }
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-indigo-600/30 cursor-pointer transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                Simpan
              </button>

              <button
                type="button"
                onClick={
                  handleExportWord
                }
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-blue-600/30 cursor-pointer transition-all"
              >
                <FileText className="w-3.5 h-3.5" />
                Export Word (.docx)
              </button>

              <button
                type="button"
                onClick={
                  handleExport
                }
                className="px-3.5 py-2 bg-[#00a859] hover:bg-[#00944e] text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/30 cursor-pointer transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Excel (.xlsx)
              </button>
            </div>
          )}
      </div>

      {/* ====================================================== */}
      {/* SAVE MESSAGE */}
      {/* ====================================================== */}
      {saveSuccessMessage && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />

          <span>
            {saveSuccessMessage}
          </span>
        </div>
      )}

      {/* ====================================================== */}
      {/* STEP 1 */}
      {/* ====================================================== */}
      {currentStep === 1 && (
        <div className="space-y-5">
          {/* ================================================== */}
          {/* BLOK 1: IDENTITAS & PARAMETER ASESMEN */}
          {/* ================================================== */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#121622] border border-[#232C3F] space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                1. Identitas & Parameter Asesmen
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Nama Guru Pengampu */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Nama Guru Pengampu
                </label>

                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="Nama Lengkap & Gelar Guru"
                  className="w-full bg-[#090D16] border border-[#222B3D] focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none"
                />
              </div>

              {/* Mata Pelajaran */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Mata Pelajaran
                </label>

                <select
                  value={subjectSelect}
                  onChange={(e) => setSubjectSelect(e.target.value)}
                  className="w-full bg-[#090D16] border border-[#222B3D] focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none cursor-pointer"
                >
                  {PRESET_SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                {subjectSelect === 'Lainnya (Ketik Custom...)' && (
                  <div className="mt-1.5">
                    <input
                      type="text"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      placeholder="Ketik mata pelajaran custom..."
                      className="w-full bg-[#070A12] border border-indigo-500/50 rounded-xl px-3 py-1.5 text-xs text-indigo-200 font-bold outline-none placeholder:text-slate-500"
                    />
                  </div>
                )}
              </div>

              {/* Jenis Asesmen / Ujian */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Jenis Asesmen / Ujian
                </label>

                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  className="w-full bg-[#090D16] border border-[#222B3D] focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none cursor-pointer"
                >
                  <option value="STS 1 (Sumatif Tengah Semester 1)">
                    STS 1 (Sumatif Tengah Semester 1)
                  </option>

                  <option value="SAS 1 (Sumatif Akhir Semester 1)">
                    SAS 1 (Sumatif Akhir Semester 1)
                  </option>

                  <option value="STS 2 (Sumatif Tengah Semester 2)">
                    STS 2 (Sumatif Tengah Semester 2)
                  </option>

                  <option value="SAT / SAS 2 (Sumatif Akhir Tahun)">
                    SAT / SAS 2 (Sumatif Akhir Tahun)
                  </option>

                  <option value="Sumatif Harian / Formatif">
                    Sumatif Harian / Formatif
                  </option>
                </select>
              </div>

              {/* Tahun Pelajaran & Semester */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Tahun Pelajaran
                  </label>

                  <input
                    type="text"
                    value={schoolYear}
                    onChange={(e) => setSchoolYear(e.target.value)}
                    placeholder="2026/2027"
                    className="w-full bg-[#090D16] border border-[#222B3D] focus:border-indigo-500 rounded-xl px-2.5 py-2 text-xs text-white font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Semester
                  </label>

                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full bg-[#090D16] border border-[#222B3D] rounded-xl px-2 py-2 text-xs text-white font-bold outline-none cursor-pointer"
                  >
                    <option value="1 (Ganjil)">1 (Ganjil)</option>

                    <option value="2 (Genap)">2 (Genap)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ================================================== */}
          {/* BLOK 2: KELAS, DISTRIBUSI SOAL & GAYA PENULISAN AI */}
          {/* ================================================== */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#121622] border border-[#232C3F] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#222B3D] pb-3">
              <div>
                <h3 className="text-xs font-black text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  2. Pengaturan Kelas, Distribusi Soal & Mode AI
                </h3>

                <p className="text-[11px] text-slate-400 mt-0.5">
                  Atur kelas target, spesifikasi jumlah soal per bagian, serta kedalaman hasil AI secara compact.
                </p>
              </div>

              {/* TOTAL SOAL BADGE */}
              <div className="px-3.5 py-1.5 bg-indigo-600 border border-indigo-400 rounded-xl flex items-center gap-2 shadow-md shadow-indigo-600/30">
                <span className="text-[10px] text-white/90 font-bold uppercase">
                  Total Target:
                </span>

                <span className="text-lg font-black text-white leading-none">
                  {totalCalculatedItems}
                </span>

                <span className="text-[10px] text-white/80 font-bold uppercase tracking-wide">
                  SOAL
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Sub-block 1: Kelas & Fase (3 cols) */}
              <div className="lg:col-span-3 p-3.5 rounded-xl bg-[#090D16] border border-[#222B3D] space-y-3 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-white mb-2 flex items-center justify-between">
                    <span>🏫 Kelas & Fase</span>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {selectedGrade.includes('1') || selectedGrade.includes('2')
                        ? 'Fase A (Kls 1-2)'
                        : selectedGrade.includes('3') || selectedGrade.includes('4')
                        ? 'Fase B (Kls 3-4)'
                        : 'Fase C (Kls 5-6)'}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Jenjang Kelas
                      </label>

                      <select
                        value={selectedGrade}
                        onChange={(e) => setSelectedGrade(e.target.value)}
                        className="w-full bg-[#121622] border border-[#222B3D] focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none cursor-pointer"
                      >
                        {PRESET_GRADES.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Rombel / Paralel (Opsional)
                      </label>

                      <input
                        type="text"
                        value={rombel}
                        onChange={(e) => setRombel(e.target.value)}
                        placeholder="Contoh: 1A, 1B, Bilal..."
                        className="w-full bg-[#121622] border border-[#222B3D] focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none placeholder:text-slate-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#1E2638] text-[10px] text-slate-400">
                  Acuan CP otomatis disesuaikan dengan Fase Kurikulum Merdeka.
                </div>
              </div>

              {/* Sub-block 2: Distribusi Butir Soal (5 cols) */}
              <div className="lg:col-span-5 p-3.5 rounded-xl bg-[#090D16] border border-[#222B3D] space-y-3">
                <div className="text-xs font-bold text-white flex items-center justify-between mb-1">
                  <span>📝 Distribusi Form Soal</span>

                  <span className="text-[10px] text-slate-400 font-normal">
                    (PG, Isian, Menjodohkan, Uraian)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* PG */}
                  <div className="p-2.5 rounded-lg bg-[#121622] border border-[#222B3D] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-white">1. PG (A)</span>

                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setPgOptions('A-C')}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-all ${
                            pgOptions === 'A-C'
                              ? 'bg-indigo-500 text-white'
                              : 'bg-[#090D16] text-slate-400 hover:text-white'
                          }`}
                        >
                          A-C
                        </button>

                        <button
                          type="button"
                          onClick={() => setPgOptions('A-D')}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-all ${
                            pgOptions === 'A-D'
                              ? 'bg-indigo-500 text-white'
                              : 'bg-[#090D16] text-slate-400 hover:text-white'
                          }`}
                        >
                          A-D
                        </button>
                      </div>
                    </div>

                    <PillStepper
                      value={pgCount}
                      onChange={(val) => setPgCount(val)}
                      min={0}
                      max={50}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  {/* ISIAN */}
                  <div className="p-2.5 rounded-lg bg-[#121622] border border-[#222B3D] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-purple-300">2. Isian (B)</span>
                    </div>

                    <PillStepper
                      value={isianCount}
                      onChange={(val) => setIsianCount(val)}
                      min={0}
                      max={30}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  {/* MENJODOHKAN */}
                  <div className="p-2.5 rounded-lg bg-[#121622] border border-[#222B3D] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-300">3. Menjodohkan (C)</span>
                    </div>

                    <PillStepper
                      value={menjodohkanCount}
                      onChange={(val) => setMenjodohkanCount(val)}
                      min={0}
                      max={15}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  {/* URAIAN */}
                  <div className="p-2.5 rounded-lg bg-[#121622] border border-[#222B3D] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-300">4. Uraian (D)</span>
                    </div>

                    <PillStepper
                      value={uraianCount}
                      onChange={(val) => setUraianCount(val)}
                      min={0}
                      max={15}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Sub-block 3: Gaya Penulisan AI (4 cols) */}
              <div className="lg:col-span-4 p-3.5 rounded-xl bg-[#090D16] border border-[#222B3D] space-y-2.5 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-white flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5 text-indigo-300">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      3. Gaya Penulisan AI
                    </span>
                  </div>

                  <div className="space-y-2">
                    {/* Ringkas & Padat */}
                    <div
                      onClick={() => setOutputStyle('concise')}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                        outputStyle === 'concise'
                          ? 'bg-indigo-500/15 border-indigo-500/60 ring-1 ring-indigo-500/30'
                          : 'bg-[#121622] border-[#222B3D] hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                          ⚡ Ringkas & Padat
                          <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded font-semibold">
                            Default
                          </span>
                        </span>

                        <input
                          type="radio"
                          name="outputStyle"
                          checked={outputStyle === 'concise'}
                          onChange={() => setOutputStyle('concise')}
                          className="accent-indigo-500 cursor-pointer"
                        />
                      </div>

                      <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                        Indikator & soal lugas pada inti (10-15 kata), hemat kertas cetak.
                      </p>
                    </div>

                    {/* Detail & Lengkap */}
                    <div
                      onClick={() => setOutputStyle('detailed')}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                        outputStyle === 'detailed'
                          ? 'bg-indigo-500/15 border-indigo-500/60 ring-1 ring-indigo-500/30'
                          : 'bg-[#121622] border-[#222B3D] hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-white">
                          📄 Detail & Lengkap
                        </span>

                        <input
                          type="radio"
                          name="outputStyle"
                          checked={outputStyle === 'detailed'}
                          onChange={() => setOutputStyle('detailed')}
                          className="accent-indigo-500 cursor-pointer"
                        />
                      </div>

                      <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                        Indikator formal CP lengkap, soal naratif/cerita stimulus HOTS mendalam.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ================================================== */}
          {/* 2. MATERI */}
          {/* ================================================== */}
          <div className="p-5 rounded-2xl bg-[#121622] border border-[#232C3F] space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#222B3D] pb-3">
              <div>
                <h3 className="text-xs font-black text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                  <FolderTree className="w-4 h-4" />
                  2. Struktur Bab / Materi Pokok & Bahan Ajar Guru
                </h3>

                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tentukan daftar Bab/Topik pokok yang diujikan beserta catatan teks, foto halaman buku, atau dokumen bahan ajar.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={
                    handleRecommendCurriculum
                  }
                  disabled={
                    isLoadingCurriculumRecommendation
                  }
                  className="px-3 py-2 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-300 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingCurriculumRecommendation ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}

                  {isLoadingCurriculumRecommendation
                    ? 'Membaca Kurikulum...'
                    : 'Rekomendasi dari Kurikulum'}
                </button>

                <button
                  type="button"
                  onClick={
                    handleAddTopic
                  }
                  className="px-3 py-2 bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Bab / Topik
                </button>
              </div>
            </div>

            {curriculumRecommendations.length >
              0 && (
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-black text-emerald-300">
                      Rekomendasi dari Acuan Kurikulum Nasional
                    </div>

                    <div className="text-[10px] text-slate-400 mt-1">
                      Berdasarkan CP, fase, dan elemen yang relevan dengan mata pelajaran dan kelas yang dipilih.
                    </div>
                  </div>

                  <button
  type="button"
  onClick={() =>
    setCurriculumRecommendations([])
  }
  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-300 cursor-pointer transition-all"
>
  Tutup
</button>
                </div>

                {curriculumRecommendations.map(
                  (
                    recommendation,
                    index
                  ) => (
                    <div
                      key={`${recommendation.title}-${index}`}
                      className="p-4 rounded-xl bg-[#090D16] border border-[#263344] hover:border-emerald-500/40 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white">
                            {
                              recommendation.title
                            }
                          </div>

                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {recommendation.phase && (
                              <span className="text-[9px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                {
                                  recommendation.phase
                                }
                              </span>
                            )}

                            {recommendation.element && (
                              <span className="text-[9px] px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-300 border border-sky-500/20">
                                {
                                  recommendation.element
                                }
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleSelectCurriculumRecommendation(
                              recommendation
                            )
                          }
                          className="shrink-0 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/20 cursor-pointer"
                        >
                          + Gunakan
                        </button>
                      </div>

                      {recommendation.curriculumGoal && (
                        <div className="mt-3">
                          <div className="text-[9px] uppercase tracking-wider font-bold text-slate-500">
                            Capaian Pembelajaran
                          </div>

                          <div className="text-[10px] text-slate-300 mt-1 leading-relaxed">
                            {
                              recommendation.curriculumGoal
                            }
                          </div>
                        </div>
                      )}

                      {recommendation.subTopics?.length >
                        0 && (
                        <div className="mt-3">
                          <div className="text-[9px] uppercase tracking-wider font-bold text-slate-500">
                            Rekomendasi Sub-Materi
                          </div>

                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {recommendation.subTopics.map(
                              (
                                subTopic,
                                subIndex
                              ) => (
                                <span
                                  key={
                                    subIndex
                                  }
                                  className="text-[10px] px-2 py-1 rounded-lg bg-slate-800/70 text-slate-300"
                                >
                                  {
                                    subTopic
                                  }
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            )}

            {/* LIST TOPIK */}
            <div className="space-y-4">
              {topics.map(
                (t, idx) => {
                  const subTopicList =
                    getSubTopicList(
                      t.subTopics
                    );

                  return (
                    <div
                      key={t.id}
                      className="p-4 sm:p-5 rounded-2xl bg-[#090D16] border border-[#222B3D] space-y-4"
                    >
                      {/* Header Bab */}
                      <div className="flex items-center justify-between gap-3 border-b border-[#1E2638] pb-3">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-black text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </div>

                          <div className="flex-1">
                            <label className="block text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider mb-1">
                              Judul Bab / Lingkup Materi {idx + 1}
                            </label>

                            <input
                              type="text"
                              value={
                                t.title
                              }
                              onChange={(
                                e
                              ) =>
                                handleUpdateTopic(
                                  t.id,
                                  'title',
                                  e
                                    .target
                                    .value
                                )
                              }
                              placeholder={`Contoh: Bab ${idx + 1} Asmaul Husna & Akhlak`}
                              className="w-full bg-[#121622] border border-[#222B3D] focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none"
                            />
                          </div>
                        </div>

                        {topics.length >
                          1 && (
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveTopic(
                                t.id
                              )
                            }
                            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer shrink-0"
                            title="Hapus Bab ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Tabel Custom Sub-Materi */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                            <span>
                              Sub-Materi / Poin Pembelajaran Pokok
                            </span>

                            <span className="text-[10px] text-slate-500 font-normal">
                              (Tekan tombol [+] di samping baris untuk menambah kotak sub-materi)
                            </span>
                          </label>

                          <button
                            type="button"
                            onClick={() =>
                              handleAddSubTopic(
                                t.id,
                                subTopicList.length -
                                  1
                              )
                            }
                            className="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>
                              Tambah Baris
                            </span>
                          </button>
                        </div>

                        <div className="space-y-2">
                          {subTopicList.map(
                            (
                              sub,
                              subIdx
                            ) => (
                              <div
                                key={`${t.id}_sub_${subIdx}`}
                                className="flex items-center gap-2 bg-[#121622] border border-[#222B3D] focus-within:border-indigo-500/60 rounded-xl px-3 py-1.5 transition-all"
                              >
                                <span className="text-[10px] font-bold text-slate-500 w-5 text-center shrink-0">
                                  {subIdx +
                                    1}
                                  .
                                </span>

                                <input
                                  type="text"
                                  value={
                                    sub
                                  }
                                  onChange={(
                                    e
                                  ) =>
                                    handleUpdateSubTopic(
                                      t.id,
                                      subIdx,
                                      e
                                        .target
                                        .value
                                    )
                                  }
                                  placeholder="Ketik poin sub-materi (contoh: Membaca arti, menghafal ayat, makna pokok...)"
                                  className="flex-1 bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-600 font-medium"
                                />

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleAddSubTopic(
                                      t.id,
                                      subIdx
                                    )
                                  }
                                  className="p-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/35 text-indigo-300 hover:text-white border border-indigo-500/30 transition-all cursor-pointer shrink-0"
                                  title="Tambah kotak sub-materi di bawahnya"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>

                                {subTopicList.length >
                                  1 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveSubTopic(
                                        t.id,
                                        subIdx
                                      )
                                    }
                                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all cursor-pointer shrink-0"
                                    title="Hapus baris sub-materi ini"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            {/* MATERIAL INPUT */}
            <div className="pt-2 border-t border-[#1E2638]">
              <EvaluationMaterialInput
                materials={
                  materials
                }
                onChange={
                  setMaterials
                }
                label="Lampiran Catatan / Dokumen Materi Tambahan Guru"
              />
            </div>
          </div>

          {/* ================================================== */}
          {/* GENERATE */}
          {/* ================================================== */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={
                isLoading ||
                totalCalculatedItems ===
                  0
              }
              onClick={
                handleGenerate
              }
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer transition-all"
            >
              <Sparkles className="w-4 h-4 animate-spin-slow" />

              <span>
                {isLoading
                  ? 'Sedang Menyusun Kisi-Kisi...'
                  : `Generate Draft Kisi-Kisi AI (${totalCalculatedItems} Soal)`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ====================================================== */}
      {/* STEP 2 */}
      {/* ====================================================== */}
      {currentStep === 2 &&
        activeBlueprint && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#0B0F17] border border-[#222B3D] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-white">
                  Mata Pelajaran:{' '}
                  <b className="text-indigo-400">
                    {
                      activeBlueprint.subjectName
                    }
                  </b>
                </span>

                <span className="text-slate-400">
                  |
                </span>

                <span className="text-slate-300">
                  Kelas:{' '}
                  <b>
                    {
                      activeBlueprint.className
                    }
                  </b>
                </span>

                <span className="text-slate-400">
                  |
                </span>

                <span className="text-slate-300">
                  Ujian:{' '}
                  <b>
                    {
                      activeBlueprint.examType
                    }
                  </b>
                </span>
              </div>

              <div className="text-[11px] text-slate-400 italic">
                * Guru dapat mengedit teks indikator, level kognitif, atau bentuk soal secara langsung pada tabel.
              </div>
            </div>

            {/* ================================================= */}
            {/* TABEL */}
            {/* ================================================= */}
            <div className="rounded-2xl border border-[#242E42] bg-[#0E131F] overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#151C2C] text-slate-300 font-bold border-b border-[#242E42]">
                    <th className="p-3 w-12 text-center">
                      No
                    </th>

                    <th className="p-3 w-44">
                      Materi Pokok / Bab
                    </th>

                    <th className="p-3 min-w-[220px]">
                      Indikator Soal
                    </th>

                    <th className="p-3 w-28 text-center">
                      Level Kognitif
                    </th>

                    <th className="p-3 w-28 text-center">
                      Bentuk Soal
                    </th>

                    <th className="p-3 w-20 text-center">
                      No. Soal
                    </th>

                    <th className="p-3 w-12 text-center">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#1D2536] text-slate-200">
                  {activeBlueprint.items.map(
                    (
                      item,
                      idx
                    ) => (
                      <tr
                        key={
                          item.id
                        }
                        className="hover:bg-[#121827] transition-all"
                      >
                        <td className="p-3 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>

                        <td className="p-2">
                          <input
                            type="text"
                            value={
                              item.material
                            }
                            onChange={(
                              e
                            ) =>
                              handleUpdateItem(
                                item.id,
                                'material',
                                e
                                  .target
                                  .value
                              )
                            }
                            className="w-full bg-[#080C14] border border-[#222B3D] rounded-lg px-2.5 py-1.5 text-xs text-white font-medium outline-none"
                          />
                        </td>

                        <td className="p-2">
                          <textarea
                            value={
                              item.indicator
                            }
                            onChange={(
                              e
                            ) =>
                              handleUpdateItem(
                                item.id,
                                'indicator',
                                e
                                  .target
                                  .value
                              )
                            }
                            rows={2}
                            className="w-full bg-[#080C14] border border-[#222B3D] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none resize-y"
                          />
                        </td>

                        <td className="p-2 text-center">
                          <select
                            value={
                              item.cognitiveLevel
                            }
                            onChange={(
                              e
                            ) =>
                              handleUpdateItem(
                                item.id,
                                'cognitiveLevel',
                                e
                                  .target
                                  .value as CognitiveLevel
                              )
                            }
                            className="bg-[#080C14] border border-[#222B3D] rounded-lg px-2 py-1.5 text-xs text-indigo-300 font-bold outline-none cursor-pointer"
                          >
                            <option value="C1">
                              C1 (Mengingat)
                            </option>

                            <option value="C2">
                              C2 (Memahami)
                            </option>

                            <option value="C3">
                              C3 (Menerapkan)
                            </option>

                            <option value="C4">
                              C4 (Menganalisis)
                            </option>

                            <option value="C5">
                              C5 (Mengevaluasi)
                            </option>

                            <option value="C6">
                              C6 (Mencipta)
                            </option>
                          </select>
                        </td>

                        <td className="p-2 text-center">
                          <select
                            value={
                              item.questionForm
                            }
                            onChange={(
                              e
                            ) =>
                              handleUpdateItem(
                                item.id,
                                'questionForm',
                                e
                                  .target
                                  .value as QuestionForm
                              )
                            }
                            className="bg-[#080C14] border border-[#222B3D] rounded-lg px-2 py-1.5 text-xs text-cyan-300 font-bold outline-none cursor-pointer"
                          >
                            <option value="PG">
                              Pilihan Ganda
                            </option>

                            <option value="ISIAN">
                              Isian Singkat
                            </option>

                            <option value="URAIAN">
                              Uraian
                            </option>

                            <option value="ESSAY">
                              Essay
                            </option>

                            <option value="MENJODOHKAN">
                              Menjodohkan
                            </option>
                          </select>
                        </td>

                        <td className="p-2 text-center">
                          <input
                            type="text"
                            value={
                              item.questionNumber
                            }
                            onChange={(
                              e
                            ) =>
                              handleUpdateItem(
                                item.id,
                                'questionNumber',
                                e
                                  .target
                                  .value
                              )
                            }
                            className="w-16 mx-auto text-center bg-[#080C14] border border-[#222B3D] rounded-lg px-2 py-1 text-xs text-amber-300 font-bold outline-none"
                          />
                        </td>

                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteItem(
                                item.id
                              )
                            }
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer transition-all"
                            title="Hapus baris"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            {/* ================================================= */}
            {/* ACTION BAR */}
            {/* ================================================= */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={
                  handleAddItem
                }
                className="px-3.5 py-2 bg-[#172033] hover:bg-[#202c46] text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                + Tambah Baris Kisi-Kisi
              </button>

              {onSelectBlueprintForQuestions && (
                <button
                  type="button"
                  onClick={() => {
                    handleSave();

                    onSelectBlueprintForQuestions(
                      activeBlueprint
                    );
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-cyan-600/30 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <span>
                    Lanjut Buat Naskah Soal dari Kisi-Kisi Ini →
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
    </div>
  );
};