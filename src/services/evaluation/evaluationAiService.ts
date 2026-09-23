import {
  EvaluationBlueprint,
  EvaluationBlueprintItem,
  EvaluationQuestion,
  EvaluationQuestionPackage,
  EvaluationReviewResult,
  NonPgSummaryItem,
  EvaluationMaterialSource,
  MultipleChoiceOptionsCount,
  EvaluationTopicItem,
  EvaluationDistributionConfig,
  QuestionForm,
  CognitiveLevel,
} from '../../types/evaluationTypes';
import { getCurriculumRecommendations } from './curriculumDataService';
import { getStoredQuestionPackages, getStoredBlueprints } from './evaluationStorageService';

interface GenerateBlueprintParams {
  subjectName: string;
  className: string;
  semester: string;
  schoolYear: string;
  examType: string;
  teacherName: string;
  materialTopic: string;
  topics?: EvaluationTopicItem[];
  materials: EvaluationMaterialSource;
  itemCount: number;
  distributionConfig?: EvaluationDistributionConfig;
  outputStyle?: 'concise' | 'detailed';
}

interface GenerateQuestionsParams {
  subjectName: string;
  className: string;
  examType: string;
  schoolYear: string;
  teacherName: string;
  blueprint?: EvaluationBlueprint;
  materials: EvaluationMaterialSource;
  outputStyle?: 'concise' | 'detailed';
  config: {
    pgCount: number;
    pgOptions: MultipleChoiceOptionsCount;
    isianCount: number;
    partCType: 'Essay' | 'Uraian' | 'Menjodohkan';
    partCCount: number;
    matchingMode?: 'text_to_text' | 'image_to_image' | 'image_to_text' | 'text_to_image';
  };
}

interface GenerateReviewParams {
  subjectName: string;
  className: string;
  examType: string;
  examQuestionsText: string;
  analysisDataSummary: {
    totalStudents: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    passPercentage: number;
    questionStats: Array<{
      number: number;
      correctCount: number;
      percentage: number;
      type?: string;
      sectionNumber?: number;
      sectionLabel?: string;
    }>;
    rawNotes?: string;
  };
}

/* ============================================================
 * HELPER
 * ============================================================
 */

function normalizeQuestionForm(
  value: any
): QuestionForm {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();

  if (
    normalized === 'PG' ||
    normalized.includes('PILIHAN GANDA') ||
    normalized.includes('MULTIPLE CHOICE')
  ) {
    return 'PG';
  }

  if (
    normalized === 'ISIAN' ||
    normalized.includes('ISIAN SINGKAT') ||
    normalized.includes('FILL')
  ) {
    return 'ISIAN';
  }

  if (
    normalized === 'MENJODOHKAN' ||
    normalized.includes('MENJODOHKAN') ||
    normalized.includes('MATCHING')
  ) {
    return 'MENJODOHKAN';
  }

  if (
    normalized === 'ESSAY' ||
    normalized === 'URAIAN' ||
    normalized.includes('ESSAY') ||
    normalized.includes('URAIAN')
  ) {
    return 'URAIAN';
  }

  return 'PG';
}

/* ============================================================
 * MEMBENTUK TARGET DISTRIBUSI
 *
 * CONTOH:
 * PG 20
 * ISIAN 5
 * MENJODOHKAN 1
 * URAIAN 2
 *
 * HASIL:
 * [
 *   PG x20,
 *   ISIAN x5,
 *   MENJODOHKAN x1,
 *   URAIAN x2
 * ]
 * ============================================================
 */

function buildTargetQuestionForms(
  distribution?: EvaluationDistributionConfig
): QuestionForm[] {
  if (!distribution) {
    return [];
  }

  const forms: QuestionForm[] = [];

  const pgCount = Math.max(
    0,
    Number(distribution.pgCount) || 0
  );

  const isianCount = Math.max(
    0,
    Number(distribution.isianCount) || 0
  );

  const menjodohkanCount = Math.max(
    0,
    Number(distribution.menjodohkanCount) || 0
  );

  const uraianCount = Math.max(
    0,
    Number(distribution.uraianCount) || 0
  );

  for (let i = 0; i < pgCount; i++) {
    forms.push('PG');
  }

  for (let i = 0; i < isianCount; i++) {
    forms.push('ISIAN');
  }

  for (let i = 0; i < menjodohkanCount; i++) {
    forms.push('MENJODOHKAN');
  }

  for (let i = 0; i < uraianCount; i++) {
    forms.push('URAIAN');
  }

  return forms;
}

/* ============================================================
 * DEFAULT TOPIC
 * ============================================================
 */

function getValidTopics(
  params: GenerateBlueprintParams
): string[] {
  const topics =
    params.topics
      ?.map((topic) => topic.title)
      .filter(
        (title): title is string =>
          Boolean(
            title &&
              title.trim()
          )
      ) || [];

  if (topics.length > 0) {
    return topics;
  }

  return [
    params.materialTopic ||
      params.subjectName,
  ];
}

/* ============================================================
 * FALLBACK ITEM
 *
 * Digunakan jika Gemini menghasilkan item
 * lebih sedikit dari jumlah yang diminta.
 * ============================================================
 */

function createFallbackBlueprintItem(
  params: GenerateBlueprintParams,
  index: number,
  questionForm: QuestionForm
): EvaluationBlueprintItem {
  const validTopics =
    getValidTopics(params);

  const topic =
    validTopics[
      index % validTopics.length
    ];

  const globalNumber =
    index + 1;

  let section:
    | 'A'
    | 'B'
    | 'C'
    | 'D' = 'A';

  let sectionLabel =
    'Bagian A: Pilihan Ganda';

  let cognitiveLevel:
    CognitiveLevel = 'C2';

  if (questionForm === 'ISIAN') {
    section = 'B';
    sectionLabel =
      'Bagian B: Isian Singkat';
    cognitiveLevel = 'C2';
  } else if (
    questionForm === 'MENJODOHKAN'
  ) {
    section = 'C';
    sectionLabel =
      'Bagian C: Menjodohkan';
    cognitiveLevel = 'C3';
  } else if (
    questionForm === 'URAIAN'
  ) {
    section = 'D';
    sectionLabel =
      'Bagian D: Uraian / Essay';
    cognitiveLevel = 'C4';
  }

  let indicator =
    `Disajikan stimulus, peserta didik mampu menentukan jawaban yang tepat mengenai ${topic}.`;

  if (questionForm === 'ISIAN') {
    indicator =
      `Disajikan kalimat rumpang, peserta didik mampu melengkapi konsep atau istilah tentang ${topic} dengan tepat.`;
  }

  if (
    questionForm === 'MENJODOHKAN'
  ) {
    indicator =
      `Disajikan beberapa pasangan konsep, peserta didik mampu memasangkan pernyataan tentang ${topic} dengan tepat.`;
  }

  if (questionForm === 'URAIAN') {
    indicator =
      `Disajikan permasalahan atau studi kasus, peserta didik mampu menjelaskan dan menganalisis ${topic} secara runtut.`;
  }

  // Cari capaian pembelajaran asli dari database kurikulum nasional jika ada
  let matchingGoal = 'Memahami dan menerapkan konsep materi sesuai capaian pembelajaran kurikulum nasional.';
  try {
    const recs = getCurriculumRecommendations(params.subjectName, params.className);
    if (recs && recs.length > 0) {
      const match = recs.find((r) => r.title.toLowerCase().includes(topic.toLowerCase()) || topic.toLowerCase().includes(r.title.toLowerCase()));
      if (match && match.curriculumGoal) {
        matchingGoal = match.curriculumGoal;
      } else if (recs[index % recs.length]?.curriculumGoal) {
        matchingGoal = recs[index % recs.length].curriculumGoal;
      }
    }
  } catch {
    // Gunakan fallback default jika pencarian tidak cocok
  }

  return {
    id: `item_fallback_${Date.now()}_${index}`,
    number: globalNumber,
    section,
    sectionNumber:
      questionForm === 'PG'
        ? globalNumber
        : 0,
    sectionLabel,
    material: topic,
    curriculumGoal: matchingGoal,
    indicator,
    cognitiveLevel,
    questionForm,
    questionNumber:
      `${globalNumber}`,
  };
}

/* ============================================================
 * NORMALISASI HASIL AI
 *
 * INI BAGIAN PALING PENTING.
 *
 * AI BOLEH MEMBUAT ISI KISI-KISI,
 * TETAPI TIDAK BOLEH MENENTUKAN JUMLAH AKHIR.
 * ============================================================
 */

function normalizeBlueprintItems(
  params: GenerateBlueprintParams,
  aiItems: any[]
): EvaluationBlueprintItem[] {
  const distribution =
    params.distributionConfig;

  /*
   * Kalau distribusi tidak tersedia,
   * gunakan perilaku lama berbasis itemCount.
   */
  if (!distribution) {
    const targetCount = Math.max(
      1,
      Number(params.itemCount) || 1
    );

    const sourceItems =
      Array.isArray(aiItems)
        ? aiItems
        : [];

    const result: EvaluationBlueprintItem[] =
      [];

    for (
      let index = 0;
      index < targetCount;
      index++
    ) {
      const source =
        sourceItems[index];

      if (source) {
        result.push({
          ...source,
          id:
            source.id ||
            `item_${index + 1}`,
          number: index + 1,
          questionForm:
            normalizeQuestionForm(
              source.questionForm
            ),
          questionNumber:
            `${index + 1}`,
          material:
            source.material ||
            params.materialTopic ||
            params.subjectName,
          curriculumGoal:
            source.curriculumGoal ||
            '-',
          indicator:
            source.indicator ||
            'Peserta didik dapat memahami materi dengan tepat.',
          cognitiveLevel:
            source.cognitiveLevel ||
            'C2',
        });
      } else {
        /*
         * Bila AI kurang menghasilkan item,
         * tambahkan fallback.
         */
        result.push(
          createFallbackBlueprintItem(
            params,
            index,
            'PG'
          )
        );
      }
    }

    return result;
  }

  /*
   * TARGET FORMS ADALAH SUMBER KEBENARAN.
   */
  const targetForms =
    buildTargetQuestionForms(
      distribution
    );

  const targetTotal =
    targetForms.length;

  const sourceItems =
    Array.isArray(aiItems)
      ? aiItems
      : [];

  const normalizedItems: EvaluationBlueprintItem[] =
    [];

  /*
   * LOOP BERDASARKAN TARGET,
   * BUKAN BERDASARKAN DATA AI.
   *
   * INI YANG MEMASTIKAN JUMLAH SELALU BENAR.
   */
  for (
    let index = 0;
    index < targetTotal;
    index++
  ) {
    const targetForm =
      targetForms[index];

    const source =
      sourceItems[index];

    if (source) {
      let section:
        | 'A'
        | 'B'
        | 'C'
        | 'D' = 'A';

      let sectionLabel =
        'Bagian A: Pilihan Ganda';

      let sectionNumber = 1;

      if (
        targetForm === 'PG'
      ) {
        section = 'A';
        sectionLabel =
          'Bagian A: Pilihan Ganda';

        sectionNumber =
          targetForms
            .slice(0, index + 1)
            .filter(
              (form) =>
                form === 'PG'
            ).length;
      } else if (
        targetForm === 'ISIAN'
      ) {
        section = 'B';
        sectionLabel =
          'Bagian B: Isian Singkat';

        sectionNumber =
          targetForms
            .slice(0, index + 1)
            .filter(
              (form) =>
                form === 'ISIAN'
            ).length;
      } else if (
        targetForm ===
        'MENJODOHKAN'
      ) {
        section = 'C';
        sectionLabel =
          'Bagian C: Menjodohkan';

        sectionNumber =
          targetForms
            .slice(0, index + 1)
            .filter(
              (form) =>
                form ===
                'MENJODOHKAN'
            ).length;
      } else if (
        targetForm === 'URAIAN'
      ) {
        section = 'D';
        sectionLabel =
          'Bagian D: Uraian / Essay';

        sectionNumber =
          targetForms
            .slice(0, index + 1)
            .filter(
              (form) =>
                form === 'URAIAN'
            ).length;
      }

      /*
       * PERHATIKAN:
       *
       * source.questionForm TIDAK DIGUNAKAN.
       *
       * Bentuk soal dipaksa menggunakan
       * targetForm dari konfigurasi guru.
       */
      normalizedItems.push({
        ...source,

        id:
          source.id ||
          `item_${index + 1}`,

        number:
          index + 1,

        section,

        sectionNumber,

        sectionLabel,

        material:
          source.material ||
          params.materialTopic ||
          params.subjectName,

        curriculumGoal:
          source.curriculumGoal ||
          '-',

        indicator:
          source.indicator ||
          'Peserta didik dapat memahami dan menerapkan materi dengan tepat.',

        cognitiveLevel:
          source.cognitiveLevel ||
          (
            targetForm === 'URAIAN'
              ? 'C4'
              : targetForm ===
                'MENJODOHKAN'
              ? 'C3'
              : 'C2'
          ),

        /*
         * KUNCI:
         * selalu gunakan distribusi guru.
         */
        questionForm:
          targetForm,

        /*
         * Nomor global.
         */
        questionNumber:
          `${index + 1}`,
      });
    } else {
      /*
       * AI KURANG MENGHASILKAN ITEM.
       *
       * Kita buat item tambahan otomatis.
       */
      normalizedItems.push(
        createFallbackBlueprintItem(
          params,
          index,
          targetForm
        )
      );

      /*
       * Pastikan sectionNumber dan
       * sectionLabel juga benar.
       */
      const generatedItem =
        normalizedItems[
          normalizedItems.length - 1
        ];

      const sameFormBefore =
        targetForms
          .slice(0, index + 1)
          .filter(
            (form) =>
              form === targetForm
          ).length;

      generatedItem.sectionNumber =
        sameFormBefore;

      generatedItem.questionNumber =
        `${index + 1}`;
    }
  }

  /*
   * HASIL AKHIR HANYA SEBANYAK TARGET.
   *
   * Kalau AI mengirim 35 item tetapi target 26,
   * hanya 26 yang digunakan.
   *
   * Kalau AI mengirim 24 tetapi target 26,
   * 2 item fallback ditambahkan.
   */
  return normalizedItems.slice(
    0,
    targetTotal
  );
}

/* ============================================================
 * VALIDASI DISTRIBUSI
 * ============================================================
 */

function validateBlueprintItems(
  items: EvaluationBlueprintItem[],
  distribution?: EvaluationDistributionConfig
): boolean {
  if (!distribution) {
    return true;
  }

  const expectedTotal =
    Math.max(
      0,
      Number(distribution.pgCount) || 0
    ) +
    Math.max(
      0,
      Number(distribution.isianCount) || 0
    ) +
    Math.max(
      0,
      Number(
        distribution.menjodohkanCount
      ) || 0
    ) +
    Math.max(
      0,
      Number(distribution.uraianCount) || 0
    );

  if (
    items.length !== expectedTotal
  ) {
    return false;
  }

  const pgCount =
    items.filter(
      (item) =>
        item.questionForm === 'PG'
    ).length;

  const isianCount =
    items.filter(
      (item) =>
        item.questionForm === 'ISIAN'
    ).length;

  const menjodohkanCount =
    items.filter(
      (item) =>
        item.questionForm ===
        'MENJODOHKAN'
    ).length;

  const uraianCount =
    items.filter(
      (item) =>
        item.questionForm ===
        'URAIAN'
    ).length;

  return (
    pgCount ===
      Number(distribution.pgCount || 0) &&
    isianCount ===
      Number(
        distribution.isianCount || 0
      ) &&
    menjodohkanCount ===
      Number(
        distribution.menjodohkanCount ||
          0
      ) &&
    uraianCount ===
      Number(
        distribution.uraianCount || 0
      )
  );
}

/**
 * 1. AI GENERATOR KISI-KISI
 */
export async function generateBlueprintWithAi(
  params: GenerateBlueprintParams
): Promise<EvaluationBlueprint> {
  const payload = {
    ...params,

    /*
     * PASTIKAN API MENDAPAT JUMLAH
     * YANG SAMA DENGAN DISTRIBUSI.
     */
    itemCount:
      params.distributionConfig
        ? (
            Number(
              params.distributionConfig
                .pgCount
            ) || 0
          ) +
          (
            Number(
              params.distributionConfig
                .isianCount
            ) || 0
          ) +
          (
            Number(
              params.distributionConfig
                .menjodohkanCount
            ) || 0
          ) +
          (
            Number(
              params.distributionConfig
                .uraianCount
            ) || 0
          )
        : params.itemCount,
  };

  try {
    const response = await fetch(
      '/api/evaluation/generate-blueprint',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify(
          payload
        ),
      }
    );

    if (response.ok) {
      const data =
        await response.json();

      const aiItems =
        data?.items &&
        Array.isArray(data.items)
          ? data.items
          : [];

      /*
       * JANGAN LAGI MENGGUNAKAN:
       *
       * data.items.map(...)
       *
       * SECARA LANGSUNG.
       *
       * Semua hasil AI harus melewati
       * normalizeBlueprintItems().
       */
      const normalizedItems =
        normalizeBlueprintItems(
          params,
          aiItems
        );

      /*
       * Validasi akhir.
       */
      const isValid =
        validateBlueprintItems(
          normalizedItems,
          params.distributionConfig
        );

      if (
        normalizedItems.length > 0 &&
        isValid
      ) {
        return {
          id: `bp_${Date.now()}`,

          title:
            `Kisi-Kisi ${params.subjectName} ${params.className} - ${params.examType}`,

          subjectName:
            params.subjectName,

          className:
            params.className,

          semester:
            params.semester,

          schoolYear:
            params.schoolYear,

          examType:
            params.examType,

          teacherName:
            params.teacherName,

          createdAt:
            new Date().toISOString(),

          updatedAt:
            new Date().toISOString(),

          materialContextSummary:
            params.topics
              ?.map(
                (t) => t.title
              )
              .join(', ') ||
            params.materialTopic,

          topics:
            params.topics,

          distributionConfig:
            params.distributionConfig,

          items:
            normalizedItems,
        };
      }

      /*
       * Kalau API berhasil tetapi hasil
       * tidak valid, jangan langsung
       * dipercaya.
       *
       * Kita jatuhkan ke fallback lokal
       * yang distribusinya sudah pasti benar.
       */
      console.warn(
        'AI blueprint response was normalized but failed final validation. Using structured fallback blueprint.'
      );
    }
  } catch (err) {
    console.warn(
      'Backend AI endpoint not reachable, fallback to structured pedagogical draft engine:',
      err
    );
  }

  /*
   * Fallback lokal.
   *
   * Karena createFallbackBlueprint()
   * juga menggunakan distributionConfig,
   * jumlahnya akan tetap presisi.
   */
  return createFallbackBlueprint(
    params
  );
}

/* ============================================================
 * FALLBACK BLUEPRINT
 * ============================================================
 */

function createFallbackBlueprint(
  params: GenerateBlueprintParams
): EvaluationBlueprint {
  const items: EvaluationBlueprintItem[] =
    [];

  const validTopics =
    getValidTopics(params);

  const cpSummary =
    'Memahami & menerapkan konsep dasar materi sesuai capaian pembelajaran';

  if (params.distributionConfig) {
    const {
      pgCount,
      isianCount,
      menjodohkanCount,
      uraianCount,
    } = params.distributionConfig;

    let currentGlobalNo = 1;

    /*
     * BAGIAN A: PG
     */
    for (
      let i = 0;
      i < pgCount;
      i++
    ) {
      const topic =
        validTopics[
          i %
            validTopics.length
        ];

      const secNum =
        i + 1;

      items.push({
        id: `item_${currentGlobalNo}`,

        number:
          currentGlobalNo,

        section: 'A',

        sectionNumber:
          secNum,

        sectionLabel:
          'Bagian A: Pilihan Ganda',

        material:
          topic,

        curriculumGoal:
          cpSummary,

        indicator:
          `Disajikan stimulus pertanyaan, peserta didik mampu menentukan jawaban yang benar mengenai ${topic}.`,

        cognitiveLevel:
          i % 3 === 0
            ? 'C1'
            : i % 3 === 1
            ? 'C2'
            : 'C3',

        questionForm:
          'PG',

        questionNumber:
          `${currentGlobalNo}`,
      });

      currentGlobalNo++;
    }

    /*
     * BAGIAN B: ISIAN
     */
    for (
      let i = 0;
      i < isianCount;
      i++
    ) {
      const topic =
        validTopics[
          i %
            validTopics.length
        ];

      const secNum =
        i + 1;

      items.push({
        id: `item_${currentGlobalNo}`,

        number:
          currentGlobalNo,

        section: 'B',

        sectionNumber:
          secNum,

        sectionLabel:
          'Bagian B: Isian Singkat',

        material:
          topic,

        curriculumGoal:
          cpSummary,

        indicator:
          `Disajikan kalimat rumpang, peserta didik mampu melengkapi konsep/istilah tentang ${topic} dengan tepat.`,

        cognitiveLevel:
          'C2',

        questionForm:
          'ISIAN',

        questionNumber:
          `${currentGlobalNo}`,
      });

      currentGlobalNo++;
    }

    /*
     * BAGIAN C: MENJODOHKAN
     */
    for (
      let i = 0;
      i < menjodohkanCount;
      i++
    ) {
      const topic =
        validTopics[
          i %
            validTopics.length
        ];

      const secNum =
        i + 1;

      items.push({
        id: `item_${currentGlobalNo}`,

        number:
          currentGlobalNo,

        section: 'C',

        sectionNumber:
          secNum,

        sectionLabel:
          'Bagian C: Menjodohkan',

        material:
          topic,

        curriculumGoal:
          cpSummary,

        indicator:
          `Disajikan premis dan opsi jawaban, peserta didik mampu memasangkan pernyataan tentang ${topic} dengan benar.`,

        cognitiveLevel:
          'C3',

        questionForm:
          'MENJODOHKAN',

        questionNumber:
          `${currentGlobalNo}`,
      });

      currentGlobalNo++;
    }

    /*
     * BAGIAN D: URAIAN
     */
    for (
      let i = 0;
      i < uraianCount;
      i++
    ) {
      const topic =
        validTopics[
          i %
            validTopics.length
        ];

      const secNum =
        i + 1;

      items.push({
        id: `item_${currentGlobalNo}`,

        number:
          currentGlobalNo,

        section: 'D',

        sectionNumber:
          secNum,

        sectionLabel:
          'Bagian D: Uraian / Essay',

        material:
          topic,

        curriculumGoal:
          cpSummary,

        indicator:
          `Disajikan studi kasus/permasalahan, peserta didik mampu menjelaskan dan menganalisis ${topic} secara mendalam.`,

        cognitiveLevel:
          'C4',

        questionForm:
          'URAIAN',

        questionNumber:
          `${currentGlobalNo}`,
      });

      currentGlobalNo++;
    }
  } else {
    /*
     * FALLBACK LAMA JIKA TIDAK ADA DISTRIBUSI
     */
    const count =
      Math.max(
        1,
        params.itemCount
      );

    for (
      let i = 1;
      i <= count;
      i++
    ) {
      const topic =
        validTopics[
          (i - 1) %
            validTopics.length
        ];

      let form:
        QuestionForm = 'PG';

      let cog:
        CognitiveLevel = 'C2';

      let sec:
        | 'A'
        | 'B'
        | 'C' = 'A';

      let secNum =
        i;

      let qNumStr =
        `${i}`;

      if (
        i <=
        Math.round(
          count * 0.6
        )
      ) {
        form =
          'PG';

        cog =
          i % 2 === 1
            ? 'C1'
            : 'C2';

        sec =
          'A';

        secNum =
          i;

        qNumStr =
          `${i}`;
      } else if (
        i <=
        Math.round(
          count * 0.85
        )
      ) {
        form =
          'ISIAN';

        cog =
          'C2';

        sec =
          'B';

        secNum =
          i -
          Math.round(
            count * 0.6
          );

        qNumStr =
          `${i}`;
      } else {
        form =
          'URAIAN';

        cog =
          'C3';

        sec =
          'C';

        secNum =
          i -
          Math.round(
            count * 0.85
          );

        qNumStr =
          `${i}`;
      }

      items.push({
        id: `item_${i}`,

        number:
          i,

        section:
          sec,

        sectionNumber:
          secNum,

        sectionLabel:
          sec === 'A'
            ? 'Bagian A: Pilihan Ganda'
            : sec === 'B'
            ? 'Bagian B: Isian'
            : 'Bagian C: Uraian',

        material:
          topic,

        curriculumGoal:
          cpSummary,

        indicator:
          `Disajikan stimulus, peserta didik mampu menganalisis konsep ${topic} dengan tepat.`,

        cognitiveLevel:
          cog,

        questionForm:
          form,

        questionNumber:
          qNumStr,
      });
    }
  }

  return {
    id:
      `bp_${Date.now()}`,

    title:
      `Kisi-Kisi ${params.subjectName} ${params.className} - ${params.examType}`,

    subjectName:
      params.subjectName,

    className:
      params.className,

    semester:
      params.semester,

    schoolYear:
      params.schoolYear,

    examType:
      params.examType,

    teacherName:
      params.teacherName,

    createdAt:
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString(),

    materialContextSummary:
      validTopics.join(', '),

    topics:
      params.topics,

    distributionConfig:
      params.distributionConfig,

    items,
  };
}

/**
 * 2. AI GENERATOR SOAL
 */
export async function generateQuestionsWithAi(
  params: GenerateQuestionsParams
): Promise<EvaluationQuestionPackage> {
  try {
    const response = await fetch(
      '/api/evaluation/generate-questions',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify(
          params
        ),
      }
    );

    if (response.ok) {
      const data =
        await response.json();

      if (
        data.questions &&
        Array.isArray(
          data.questions
        ) &&
        data.questions.length > 0
      ) {
        return {
          id:
            `pkg_${Date.now()}`,

          blueprintId:
            params.blueprint?.id,

          title:
            `Naskah Soal ${params.subjectName} ${params.className} - ${params.examType}`,

          subjectName:
            params.subjectName,

          className:
            params.className,

          schoolYear:
            params.schoolYear,

          examType:
            params.examType,

          teacherName:
            params.teacherName,

          createdAt:
            new Date().toISOString(),

          updatedAt:
            new Date().toISOString(),

          config:
            params.config,

          questions:
            data.questions.map(
              (
                q: any,
                idx: number
              ) => ({
                ...q,
                id:
                  q.id ||
                  `q_${idx + 1}`,
                globalNumber:
                  idx + 1,
              })
            ),
        };
      }
    }
  } catch (err) {
    console.warn(
      'Backend AI endpoint not reachable, fallback to structured pedagogical questions engine:',
      err
    );
  }

  return createFallbackQuestions(
    params
  );
}

/* ============================================================
 * FALLBACK QUESTIONS
 * ============================================================
 */

function createFallbackQuestions(
  params: GenerateQuestionsParams
): EvaluationQuestionPackage {
  const questions: EvaluationQuestion[] =
    [];

  const optCount =
    params.config.pgOptions ||
    'A-C';

  /*
   * JIKA ADA BLUEPRINT,
   * BLUEPRINT MENJADI SUMBER KEBENARAN.
   */
  if (
    params.blueprint &&
    params.blueprint.items &&
    params.blueprint.items.length >
      0
  ) {
    let pgIdx = 0;
    let isianIdx = 0;
    let cIdx = 0;

    params.blueprint.items.forEach(
      (
        item,
        globalIdx
      ) => {
        const globalNum =
          globalIdx + 1;

        if (
          item.questionForm ===
          'PG'
        ) {
          pgIdx++;

          const keysPool: Array<'A' | 'B' | 'C' | 'D'> = optCount === 'A-D' ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C'];
          const correctKey = keysPool[(globalNum - 1) % keysPool.length];

          const stemTemplates = [
            `Berdasarkan konsep materi ${item.material}, manakah pernyataan berikut yang paling tepat?`,
            `Perhatikan indikator pembelajaran pada materi ${item.material}! Konsep atau prinsip utama yang benar adalah ....`,
            `Dalam pembahasan mengenai ${item.material}, hal mendasar yang perlu dipahami secara tepat adalah ....`,
            `Manakah di antara pilihan berikut yang merupakan contoh penerapan atau penjelasan benar terkait ${item.material}?`,
            `Terkait materi ${item.material}, pernyataan yang sesuai dengan fakta dan konsep pembelajaran adalah ....`,
            `Perhatikan pernyataan terkait ${item.material}! Penjelasan yang paling akurat dan logis ditunjukkan oleh ....`
          ];
          const questionStem = stemTemplates[(globalNum - 1) % stemTemplates.length];

          const optionTemplates = {
            correct: `Pernyataan yang sesuai dan tepat mengenai konsep ${item.material}`,
            distractor1: `Konsep umum yang kurang tepat untuk konteks materi terkait`,
            distractor2: `Pernyataan alternatif yang sering menjadi kesalahpahaman umum`,
            distractor3: `Penjelasan yang belum mencakup prinsip inti dari materi`
          };

          const opts: Array<{
            key: 'A' | 'B' | 'C' | 'D';
            text: string;
          }> = [];

          keysPool.forEach((k) => {
            if (k === correctKey) {
              opts.push({ key: k, text: optionTemplates.correct });
            } else if (opts.filter(o => o.key !== correctKey).length === 0) {
              opts.push({ key: k, text: optionTemplates.distractor1 });
            } else if (opts.filter(o => o.key !== correctKey).length === 1) {
              opts.push({ key: k, text: optionTemplates.distractor2 });
            } else {
              opts.push({ key: k, text: optionTemplates.distractor3 });
            }
          });

          questions.push({
            id:
              `q_${globalNum}`,

            number:
              pgIdx,

            globalNumber:
              globalNum,

            section:
              'A',

            sectionTitle:
              'Bagian I. Pilihan Ganda',

            type:
              'PG',

            material:
              item.material,

            indicator:
              item.indicator,

            cognitiveLevel:
              item.cognitiveLevel || 'C2',

            questionText:
              questionStem,

            optionsCount:
              optCount,

            options:
              opts,

            answerKey:
              correctKey,

            explanation:
              `Jawaban ${correctKey} tepat karena sesuai dengan indikator: ${item.indicator}`,
          });
        } else if (
          item.questionForm ===
          'ISIAN'
        ) {
          isianIdx++;

          questions.push({
            id:
              `q_${globalNum}`,

            number:
              isianIdx,

            globalNumber:
              globalNum,

            section:
              'B',

            sectionTitle:
              'Bagian II. Isian Singkat',

            type:
              'ISIAN',

            material:
              item.material,

            indicator:
              item.indicator,

            cognitiveLevel:
              item.cognitiveLevel,

            questionText:
              `Istilah atau konsep kunci yang tepat mengenai ${item.material} adalah ............................................................`,

            answerKey:
              `Konsep Utama ${item.material}`,

            explanation:
              `Jawaban singkat mengacu pada materi ${item.material}.`,
          });
        } else if (
          item.questionForm ===
          'MENJODOHKAN'
        ) {
          cIdx++;

          const mode =
            params.config
              .matchingMode ||
            'text_to_text';

          questions.push({
            id:
              `q_${globalNum}`,

            number:
              cIdx,

            globalNumber:
              globalNum,

            section:
              'C',

            sectionTitle:
              'Bagian III. Menjodohkan',

            type:
              'MENJODOHKAN',

            material:
              item.material,

            indicator:
              item.indicator,

            cognitiveLevel:
              item.cognitiveLevel,

            questionText:
              `Pasangkanlah setiap pernyataan pada Kolom A dengan pilihan yang tepat pada Kolom B terkait ${item.material}!`,

            matchingData: {
              mode,

              left: [
                {
                  id: '1',
                  type: 'text',
                  text: `Karakteristik / Ciri 1 dari ${item.material}`,
                },
                {
                  id: '2',
                  type: 'text',
                  text: `Karakteristik / Ciri 2 dari ${item.material}`,
                },
                {
                  id: '3',
                  type: 'text',
                  text: `Karakteristik / Ciri 3 dari ${item.material}`,
                },
              ],

              right: [
                {
                  id: 'A',
                  type: 'text',
                  text: `Penjelasan Konsep A`,
                },
                {
                  id: 'B',
                  type: 'text',
                  text: `Penjelasan Konsep B`,
                },
                {
                  id: 'C',
                  type: 'text',
                  text: `Penjelasan Konsep C`,
                },
              ],

              answerPair: {
                '1':
                  'B',
                '2':
                  'A',
                '3':
                  'C',
              },
            },

            answerKey:
              '1 → B, 2 → A, 3 → C',

            explanation:
              `Pasangan konsep dihubungkan berdasarkan materi ${item.material}.`,
          });
        } else {
          cIdx++;

          questions.push({
            id:
              `q_${globalNum}`,

            number:
              cIdx,

            globalNumber:
              globalNum,

            section:
              'D',

            sectionTitle:
              'Bagian IV. Uraian / Essay',

            type:
              item.questionForm ===
              'ESSAY'
                ? 'ESSAY'
                : 'URAIAN',

            material:
              item.material,

            indicator:
              item.indicator,

            cognitiveLevel:
              item.cognitiveLevel,

            questionText:
              `Jelaskan pemahaman Anda serta berikan 2 (dua) contoh nyata terkait ${item.material} dalam kehidupan sehari-hari!`,

            answerKey:
              `Kriteria Penilaian: Penjelasan konsep ${item.material} tepat (skor 3), menyertakan 2 contoh relevan (skor 2).`,

            explanation:
              `Jawaban uraian lengkap mencakup definisi dan contoh nyata.`,
          });
        }
      }
    );

    return {
      id:
        `pkg_${Date.now()}`,

      blueprintId:
        params.blueprint.id,

      title:
        `Naskah Soal ${params.subjectName} ${params.className} - ${params.examType}`,

      subjectName:
        params.subjectName,

      className:
        params.className,

      schoolYear:
        params.schoolYear,

      examType:
        params.examType,

      teacherName:
        params.teacherName,

      createdAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString(),

      config:
        params.config,

      questions,
    };
  }

  /*
   * FALLBACK TANPA BLUEPRINT
   */
  let globalNum = 1;

  /* PG */
  const teacherMaterialLabel = params.materials?.textNotes?.trim()
    ? params.materials.textNotes.split('\n')[0].substring(0, 40)
    : `Materi ${params.subjectName}`;

  for (
    let i = 1;
    i <=
    params.config.pgCount;
    i++
  ) {
    const keysPool: Array<'A' | 'B' | 'C' | 'D'> = optCount === 'A-D' ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C'];
    const correctKey = keysPool[(globalNum - 1) % keysPool.length];

    const stemTemplates = [
      `Berdasarkan materi ${teacherMaterialLabel}, pernyataan berikut yang paling tepat adalah ....`,
      `Perhatikan konsep inti pada ${teacherMaterialLabel}! Manakah yang merupakan penjelasan yang benar?`,
      `Dalam mempelajari ${teacherMaterialLabel}, hal penting yang perlu dipahami secara mendalam adalah ....`,
      `Manakah di antara pilihan berikut yang merupakan contoh atau karakteristik utama dari ${teacherMaterialLabel}?`,
      `Terkait capaian pembelajaran ${teacherMaterialLabel}, pernyataan yang logis dan sesuai konsep adalah ....`
    ];
    const questionStem = stemTemplates[(globalNum - 1) % stemTemplates.length];

    const optionTemplates = {
      correct: `Penjelasan yang tepat dan sesuai dengan kaidah konsep ${teacherMaterialLabel}`,
      distractor1: `Pernyataan umum yang kurang spesifik untuk konsep yang diujikan`,
      distractor2: `Alternatif jawaban yang mengandung kekeliruan pemahaman konsep`,
      distractor3: `Pilihan yang belum menggambarkan prinsip pokok materi`
    };

    const opts: Array<{
      key: 'A' | 'B' | 'C' | 'D';
      text: string;
    }> = [];

    keysPool.forEach((k) => {
      if (k === correctKey) {
        opts.push({ key: k, text: optionTemplates.correct });
      } else if (opts.filter(o => o.key !== correctKey).length === 0) {
        opts.push({ key: k, text: optionTemplates.distractor1 });
      } else if (opts.filter(o => o.key !== correctKey).length === 1) {
        opts.push({ key: k, text: optionTemplates.distractor2 });
      } else {
        opts.push({ key: k, text: optionTemplates.distractor3 });
      }
    });

    questions.push({
      id:
        `q_${globalNum}`,

      number:
        i,

      globalNumber:
        globalNum,

      section:
        'A',

      sectionTitle:
        'Bagian I. Pilihan Ganda',

      type:
        'PG',

      material:
        teacherMaterialLabel,

      indicator:
        `Peserta didik dapat menganalisis konsep ${teacherMaterialLabel} dengan tepat`,

      cognitiveLevel:
        'C2',

      questionText:
        questionStem,

      optionsCount:
        optCount,

      options:
        opts,

      answerKey:
        correctKey,

      explanation:
        `Jawaban ${correctKey} tepat karena memuat penjelasan yang sesuai dengan konsep inti ${teacherMaterialLabel}.`,
    });

    globalNum++;
  }

  /* ISIAN */
  for (
    let i = 1;
    i <=
    params.config.isianCount;
    i++
  ) {
    questions.push({
      id:
        `q_${globalNum}`,

      number:
        i,

      globalNumber:
        globalNum,

      section:
        'B',

      sectionTitle:
        'Bagian II. Isian Singkat',

      type:
        'ISIAN',

      material:
        'Materi Pokok',

      indicator:
        'Peserta didik dapat melengkapi pernyataan konsep',

      cognitiveLevel:
        'C2',

      questionText:
        `Istilah yang tepat untuk menggambarkan proses atau prinsip utama dalam ${params.subjectName} adalah ............................................................`,

      answerKey:
        'Konsep Inti',

      explanation:
        'Jawaban singkat mengacu pada istilah kunci dalam buku pegangan siswa.',
    });

    globalNum++;
  }

  /* BAGIAN C */
  if (
    params.config.partCType ===
    'Menjodohkan'
  ) {
    const mode =
      params.config
        .matchingMode ||
      'text_to_text';

    for (
      let i = 1;
      i <=
      params.config
        .partCCount;
      i++
    ) {
      questions.push({
        id:
          `q_${globalNum}`,

        number:
          i,

        globalNumber:
          globalNum,

        section:
          'C',

        sectionTitle:
          'Bagian III. Menjodohkan',

        type:
          'MENJODOHKAN',

        material:
          'Hubungan Pasangan Konsep',

        indicator:
          'Peserta didik dapat memasangkan konsep Kolom A dengan jawaban di Kolom B',

        cognitiveLevel:
          'C3',

        questionText:
          'Pasangkanlah setiap butir pernyataan pada Kolom A dengan pilihan yang tepat pada Kolom B!',

        matchingData: {
          mode,

          left: [
            {
              id: '1',
              type: 'text',
              text: 'Pernyataan / Ciri Konsep 1',
            },
            {
              id: '2',
              type: 'text',
              text: 'Pernyataan / Ciri Konsep 2',
            },
            {
              id: '3',
              type: 'text',
              text: 'Pernyataan / Ciri Konsep 3',
            },
          ],

          right: [
            {
              id: 'A',
              type: 'text',
              text: 'Pasangan Penjelasan A',
            },
            {
              id: 'B',
              type: 'text',
              text: 'Pasangan Penjelasan B',
            },
            {
              id: 'C',
              type: 'text',
              text: 'Pasangan Penjelasan C',
            },
          ],

          answerPair: {
            '1':
              'B',
            '2':
              'A',
            '3':
              'C',
          },
        },

        answerKey:
          '1 → B, 2 → A, 3 → C',

        explanation:
          'Setiap pasangan dihubungkan berdasarkan kesesuaian definisi dan fungsi.',
      });

      globalNum++;
    }
  } else {
    for (
      let i = 1;
      i <=
      params.config
        .partCCount;
      i++
    ) {
      questions.push({
        id:
          `q_${globalNum}`,

        number:
          i,

        globalNumber:
          globalNum,

        section:
          'C',

        sectionTitle:
          'Bagian III. Uraian / Essay',

        type:
          params.config
            .partCType ===
          'Essay'
            ? 'ESSAY'
            : 'URAIAN',

        material:
          'Analisis Mendalam',

        indicator:
          'Peserta didik dapat menguraikan penjelasan logis secara runtut',

        cognitiveLevel:
          'C4',

        questionText:
          `Jelaskan secara runtut dan berikan 2 (dua) contoh penerapan nyata dari ${params.subjectName} dalam kehidupan sehari-hari!`,

        answerKey:
          'Kriteria Penilaian: Menjelaskan konsep secara tepat (skor 3), menyertakan 2 contoh relevan (skor 2).',

        explanation:
          'Peserta didik diharapkan menyusun uraian yang terstruktur dengan bahasa yang jelas.',
      });

      globalNum++;
    }
  }

  return {
    id:
      `pkg_${Date.now()}`,

    blueprintId:
      params.blueprint?.id,

    title:
      `Naskah Soal ${params.subjectName} ${params.className} - ${params.examType}`,

    subjectName:
      params.subjectName,

    className:
      params.className,

    schoolYear:
      params.schoolYear,

    examType:
      params.examType,

    teacherName:
      params.teacherName,

    createdAt:
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString(),

    config:
      params.config,

    questions,
  };
}

/**
  Helper untuk mengekstrak kalimat fisik soal asli dari teks naskah berdasarkan nomor & jenis section
 */
function extractQuestionSentenceFromText(
  rawText: string,
  qNum: number,
  secNum?: number,
  type?: string
): string {
  if (!rawText || rawText.length < 5) return '';

  const numToFind = secNum || qNum;
  let textToSearch = rawText;

  // Jika type adalah Isian/Menjodohkan/Uraian, coba cari blok section tersebut di naskah
  if (type && type !== 'PG') {
    const sectionKeywords: Record<string, RegExp> = {
      Isian: /(?:II|B|bagian\s*2|isian|isian\s*singkat)/i,
      Menjodohkan: /(?:III|C|bagian\s*3|menjodohkan|jodohkan)/i,
      Uraian: /(?:IV|III|D|C|bagian\s*4|uraian|essay)/i,
    };

    const kwRegex = sectionKeywords[type];
    if (kwRegex) {
      const secMatch = rawText.search(kwRegex);
      if (secMatch !== -1) {
        textToSearch = rawText.slice(secMatch);
      }
    }
  }

  // Pola pencarian bertahap:
  // 1. Cari nomor section di dalam blok section (misal: "7. Arti dari...")
  // 2. Cari nomor global di seluruh teks (misal: "32. Arti dari...")
  const numbersToTry = [numToFind, qNum].filter((n, idx, arr) => n > 0 && arr.indexOf(n) === idx);

  for (const n of numbersToTry) {
    const regexes = [
      new RegExp(`(?:^|\\n|Soal\\s*No\\.?\\s*|\\b)${n}\\s*[.\\)]\\s*([^\\n]{8,250})`, 'i'),
      new RegExp(`(?:^|\\n)${n}\\s+([^\\n]{10,250})`, 'i'),
    ];

    // Coba di textToSearch dulu (blok section)
    for (const rgx of regexes) {
      const match = textToSearch.match(rgx);
      if (match && match[1]) {
        let clean = match[1].trim();
        clean = clean.split(/\s+[A-D]\.\s+/)[0].trim();
        if (clean.length > 5) {
          return `${n}. ${clean}`;
        }
      }
    }

    // Jika belum ketemu di blok section, coba di seluruh rawText
    if (textToSearch !== rawText) {
      for (const rgx of regexes) {
        const match = rawText.match(rgx);
        if (match && match[1]) {
          let clean = match[1].trim();
          clean = clean.split(/\s+[A-D]\.\s+/)[0].trim();
          if (clean.length > 5) {
            return `${n}. ${clean}`;
          }
        }
      }
    }
  }

  return '';
}

/**
 * 3. AI REVIEW HASIL UJIAN
 */
export async function generateReviewWithAi(
  params: GenerateReviewParams
): Promise<EvaluationReviewResult> {
  try {
    const response = await fetch('/api/evaluation/generate-review', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (response.ok) {
      const data = await response.json();

      if (data && data.summary) {
        // Enreach attentionQuestions dengan questionText asli dari naskah & metadata section jika kurang
        const enrichedAttention = (data.attentionQuestions || [])
          .filter((aq: any) => {
            const matchedStat = params.analysisDataSummary?.questionStats?.find(
              (qs) => qs.number === aq.questionNumber
            );
            const qType = aq.questionType || matchedStat?.type || 'PG';
            return qType === 'PG';
          })
          .map((aq: any) => {
            const matchedStat = params.analysisDataSummary?.questionStats?.find(
              (qs) => qs.number === aq.questionNumber
            );
            const qType = 'PG';
            const secNum = matchedStat?.sectionNumber || aq.questionNumber;
            const secLabel = aq.sectionLabel || matchedStat?.sectionLabel || `PG No. ${secNum}`;

            let qText = aq.questionText || '';
            if (!qText || qText.length < 10) {
              qText = extractQuestionSentenceFromText(
                params.examQuestionsText || '',
                aq.questionNumber,
                secNum,
                'PG'
              );
            }

            return {
              ...aq,
              questionType: 'PG',
              sectionLabel: secLabel,
              questionText: qText || aq.questionText || '',
            };
          });

        // Buat nonPgSummary dari questionStats Non-PG (Urutkan dari yang paling banyak salah, maksimal 8)
        const nonPgStats = (params.analysisDataSummary?.questionStats || []).filter(
          (q) => q.type && q.type !== 'PG'
        );
        const total = params.analysisDataSummary?.totalStudents || 0;
        const nonPgSummary: NonPgSummaryItem[] = [...nonPgStats]
          .sort((a, b) => a.percentage - b.percentage)
          .slice(0, 8)
          .map((q) => {
            const incorrect = Math.round(((100 - q.percentage) / 100) * total);
            let status: 'HIGH' | 'MEDIUM' | 'GOOD' = 'GOOD';
            if (q.percentage < 60) status = 'HIGH';
            else if (q.percentage < 75) status = 'MEDIUM';

            const secNum = q.sectionNumber || q.number;
            const secLabel = q.sectionLabel || `${q.type} No. ${secNum}`;

            return {
              type: q.type,
              sectionNumber: secNum,
              sectionLabel: secLabel,
              successRate: q.percentage,
              incorrectCount: incorrect,
              totalStudents: total,
              status: status,
            };
          });

        return {
          id: `rev_${Date.now()}`,
          title: `Review Pedagogis Hasil ${params.examType} - ${params.subjectName} (${params.className})`,
          subjectName: params.subjectName,
          className: params.className,
          examType: params.examType,
          analyzedAt: new Date().toISOString(),
          ...data,
          attentionQuestions: enrichedAttention,
          nonPgSummary: nonPgSummary,
        };
      }
    }
  } catch (err) {
    console.warn(
      'Backend AI endpoint not reachable, fallback to pedagogical review parser:',
      err
    );
  }

  return createFallbackReview(params);
}

/* ============================================================
 * FALLBACK REVIEW
 * ============================================================
 */

function createFallbackReview(
  params: GenerateReviewParams
): EvaluationReviewResult {
  const {
    totalStudents,
    averageScore,
    highestScore,
    lowestScore,
    passPercentage,
    questionStats,
  } = params.analysisDataSummary;

  // Try matching stored Question Package / Blueprint for exact material & indicator names
  let matchedPkg: EvaluationQuestionPackage | undefined;
  let matchedBp: EvaluationBlueprint | undefined;

  try {
    const storedPackages = getStoredQuestionPackages();
    const storedBlueprints = getStoredBlueprints();

    // Strict subject & class matching to avoid cross-subject data contamination
    matchedPkg = storedPackages.find(
      (p) =>
        (p.subjectName?.toLowerCase() === params.subjectName?.toLowerCase() ||
         (params.subjectName?.toLowerCase().includes('pkn') && p.subjectName?.toLowerCase().includes('pkn')) ||
         (params.subjectName?.toLowerCase().includes('pancasila') && p.subjectName?.toLowerCase().includes('pancasila')) ||
         (params.subjectName?.toLowerCase().includes('pai') && p.subjectName?.toLowerCase().includes('pai'))) &&
        (p.className === params.className || !params.className)
    );

    matchedBp = storedBlueprints.find(
      (b) =>
        (b.subjectName?.toLowerCase() === params.subjectName?.toLowerCase() ||
         (params.subjectName?.toLowerCase().includes('pkn') && b.subjectName?.toLowerCase().includes('pkn')) ||
         (params.subjectName?.toLowerCase().includes('pancasila') && b.subjectName?.toLowerCase().includes('pancasila')) ||
         (params.subjectName?.toLowerCase().includes('pai') && b.subjectName?.toLowerCase().includes('pai'))) &&
        (b.className === params.className || !params.className)
    );
  } catch (e) {
    console.warn('Could not fetch stored packages for fallback matching:', e);
  }

  const lowQuestions = questionStats.filter((q) => q.percentage < 60);
  const medQuestions = questionStats.filter((q) => q.percentage >= 60 && q.percentage < 75);
  const goodQuestions = questionStats.filter((q) => q.percentage >= 75);

  const pgStats = questionStats.filter((q) => !q.type || q.type === 'PG');
  const nonPgStats = questionStats.filter((q) => q.type && q.type !== 'PG');

  const attentionQuestions = pgStats.slice(0, 10).map((q) => {
    let prio: 'HIGH' | 'MEDIUM' | 'GOOD' = 'GOOD';
    let note = 'Tingkat ketercapaian siswa sangat baik dan pemahaman konsep merata.';
    let act = 'Pertahankan metode apersepsi dan variasi latihan yang sudah efektif.';

    if (q.percentage < 60) {
      prio = 'HIGH';
      note = `Tingkat keberhasilan butir ini hanya ${q.percentage}%. Mayoritas peserta didik mengalami miskonsepsi atau kesulitan memahami stimulus soal.`;
      act = 'Lakukan remedial teaching fokus pada kata kunci dan berikan latihan bertahap dengan bimbingan langsung.';
    } else if (q.percentage < 75) {
      prio = 'MEDIUM';
      note = `Tingkat keberhasilan butir ini sebesar ${q.percentage}%, berada pada kategori cukup namun perlu penguatan daya serap.`;
      act = 'Berikan ulasan singkat pada awal jam pelajaran berikutnya dengan studi kasus serupa.';
    }

    const qItem = matchedPkg?.questions?.find((item) => item.number === q.number);
    const bpItem = matchedBp?.items?.find((item) => item.number === q.number);

    const materialName = qItem?.material || bpItem?.material || `Materi Pokok Butir Soal Nomor ${q.number}`;
    const indicatorText = qItem?.indicator || bpItem?.indicator || `Indikator Kompetensi Butir ${q.number}`;

    const qType = 'PG';
    const secNum = q.sectionNumber || q.number;
    const secLabel = q.sectionLabel || `PG No. ${secNum}`;
    const qText = qItem?.questionText || extractQuestionSentenceFromText(params.examQuestionsText || '', q.number, secNum, 'PG');

    return {
      questionNumber: q.number,
      questionType: qType,
      sectionLabel: secLabel,
      questionText: qText,
      material: materialName,
      indicator: indicatorText,
      successRate: q.percentage,
      priority: prio,
      diagnosticNote: note,
      recommendedAction: act,
    };
  });

  const nonPgSummary: NonPgSummaryItem[] = [...nonPgStats]
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 8)
    .map((q) => {
      const incorrect = Math.round(((100 - q.percentage) / 100) * totalStudents);
      let status: 'HIGH' | 'MEDIUM' | 'GOOD' = 'GOOD';
      if (q.percentage < 60) status = 'HIGH';
      else if (q.percentage < 75) status = 'MEDIUM';

      const secNum = q.sectionNumber || q.number;
      const secLabel = q.sectionLabel || `${q.type} No. ${secNum}`;

      return {
        type: q.type,
        sectionNumber: secNum,
        sectionLabel: secLabel,
        successRate: q.percentage,
        incorrectCount: incorrect,
        totalStudents: totalStudents,
        status: status,
      };
    });

  return {
    id:
      `rev_${Date.now()}`,

    title:
      `Review Pedagogis Hasil ${params.examType} - ${params.subjectName} (${params.className})`,

    subjectName:
      params.subjectName,

    className:
      params.className,

    examType:
      params.examType,

    analyzedAt:
      new Date().toISOString(),

    summary: {
      totalStudents,
      averageScore,
      highestScore,
      lowestScore,
      passPercentage,

      generalConclusion:
        passPercentage >= 80
          ? `Ketercapaian pembelajaran kelas ${params.className} pada mata pelajaran ${params.subjectName} berada pada tingkat Sangat Baik dengan ketuntasan klasikal ${passPercentage}%.`
          : `Ketercapaian pembelajaran kelas ${params.className} pada mata pelajaran ${params.subjectName} menunjukkan ketuntasan ${passPercentage}% dan memerlukan intervensi terarah pada beberapa butir krusial.`,
    },

    attentionQuestions,
    nonPgSummary,

    materialsNeedingReinforcement:
      [
        {
          material:
            `Konsep Butir Soal Performa Rendah (No. ${lowQuestions.map((q) => q.number).join(', ') || '7, 12'})`,

          status:
            'HIGH',

          observation:
            'Banyak peserta didik terkecoh pada pilihan distraktor yang mirip.',

          actionableAdvice:
            'Gunakan visualisasi konkret atau analogi kontekstual untuk membedakan konsep.',
        },

        {
          material:
            `Konsep Butir Soal Kategori Sedang (No. ${medQuestions.map((q) => q.number).join(', ') || '3, 5'})`,

          status:
            'MEDIUM',

          observation:
            'Pemahaman peserta didik sudah terlihat namun ketelitian membaca stimulus masih perlu ditingkatkan.',

          actionableAdvice:
            'Latih peserta didik menggarisbawahi kata kunci sebelum menentukan jawaban akhir.',
        },
      ],

    indicatorsNeedingGuidance:
      [
        {
          indicator:
            'Indikator Penalaran dan Analisis Stimulus Soal',

          note:
            'Peserta didik membutuhkan scaffolding ketika berhadapan dengan soal bertingkat kognitif C3-C4.',
        },

        {
          indicator:
            'Indikator Ketelitian Konseptual dan Istilah Khusus',

          note:
            'Perlu penguatan kamus istilah atau glosarium materi sebelum asesmen dilaksanakan.',
        },
      ],

    keyFindings: [
      `Rata-rata kelas mencapai ${averageScore} dengan rentang nilai antara ${lowestScore} hingga ${highestScore}.`,

      `${lowQuestions.length} butir soal memerlukan perhatian khusus karena memiliki daya serap di bawah 60%.`,

      `${goodQuestions.length} butir soal telah dikuasai dengan sangat baik (ketercapaian di atas 75%).`,

      'Pola kesalahan cenderung berulang pada butir yang memerlukan pembacaan stimulus teks panjang.',
    ],

    followUpRecommendations:
      [
        'Jadwalkan 1 sesi remedial teaching klasikal untuk 2 materi butir dengan performa terendah.',

        'Sediakan lembar pengayaan mandiri bagi peserta didik yang telah mencapai nilai maksimal.',

        'Perbaiki formulasi kalimat distraktor pada butir soal tertentu untuk bank naskah periode berikutnya.',

        'Laporkan ringkasan ketuntasan ini dalam evaluasi berkala bersama Wali Kelas dan Tim Kurikulum.',
      ],
  };
}