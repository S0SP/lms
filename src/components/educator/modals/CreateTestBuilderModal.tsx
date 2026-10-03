'use client';

import React, { useState } from 'react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { 
  X, 
  Trash2, 
  PlusCircle, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  HelpCircle,
  Loader2,
  CheckSquare
} from 'lucide-react';

interface CreateTestBuilderModalProps {
  isOpen: boolean;
  courseId: string;
  sectionId?: string;
  sections?: Array<{ id: string; title: string }>;
  onClose: () => void;
  onCreated?: (quiz: any) => void;
}

interface QuestionOption {
  body: string;
  isCorrect: boolean;
}

interface QuestionItem {
  id: string;
  bodyRichtext: string;
  type: 'single_correct' | 'multi_correct';
  marks: number;
  options: QuestionOption[];
}

export default function CreateTestBuilderModal({
  isOpen,
  courseId,
  sectionId,
  sections,
  onClose,
  onCreated,
}: CreateTestBuilderModalProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    sectionId || (sections && sections.length > 0 ? sections[0].id : '')
  );
  const [testName, setTestName] = useState('');
  const [timeLimitMins, setTimeLimitMins] = useState('15');
  const [isPublished, setIsPublished] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [questions, setQuestions] = useState<QuestionItem[]>([
    {
      id: 'q-1',
      bodyRichtext: '',
      type: 'single_correct',
      marks: 1,
      options: [
        { body: '', isCorrect: true },
        { body: '', isCorrect: false },
        { body: '', isCorrect: false },
        { body: '', isCorrect: false },
      ],
    },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (sectionId) {
      setSelectedSectionId(sectionId);
    } else if (sections && sections.length > 0 && !selectedSectionId) {
      setSelectedSectionId(sections[0].id);
    }
  }, [sectionId, sections, selectedSectionId]);

  if (!isOpen) return null;

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: `q-${Date.now()}`,
        bodyRichtext: '',
        type: 'single_correct',
        marks: 1,
        options: [
          { body: '', isCorrect: true },
          { body: '', isCorrect: false },
          { body: '', isCorrect: false },
        ],
      },
    ]);
  };

  const handleRemoveQuestion = (qIndex: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, idx) => idx !== qIndex));
  };

  const handleQuestionTextChange = (qIndex: number, text: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[qIndex] = { ...copy[qIndex], bodyRichtext: text };
      return copy;
    });
  };

  const handleQuestionMarksChange = (qIndex: number, marks: number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[qIndex] = { ...copy[qIndex], marks: Math.max(1, marks) };
      return copy;
    });
  };

  const handleQuestionTypeChange = (qIndex: number, type: 'single_correct' | 'multi_correct') => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[qIndex] = { ...copy[qIndex], type };
      return copy;
    });
  };

  const handleOptionTextChange = (qIndex: number, oIndex: number, text: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const q = { ...copy[qIndex] };
      const opts = [...q.options];
      opts[oIndex] = { ...opts[oIndex], body: text };
      q.options = opts;
      copy[qIndex] = q;
      return copy;
    });
  };

  const handleToggleCorrectOption = (qIndex: number, oIndex: number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const q = { ...copy[qIndex] };
      const opts = [...q.options];

      if (q.type === 'single_correct') {
        // Only one option can be correct
        q.options = opts.map((opt, idx) => ({
          ...opt,
          isCorrect: idx === oIndex,
        }));
      } else {
        // Multi-correct toggle
        opts[oIndex] = { ...opts[oIndex], isCorrect: !opts[oIndex].isCorrect };
        q.options = opts;
      }

      copy[qIndex] = q;
      return copy;
    });
  };

  const handleAddOption = (qIndex: number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const q = { ...copy[qIndex] };
      q.options = [...q.options, { body: '', isCorrect: false }];
      copy[qIndex] = q;
      return copy;
    });
  };

  const handleRemoveOption = (qIndex: number, oIndex: number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const q = { ...copy[qIndex] };
      if (q.options.length <= 2) return prev; // Keep at least 2 options
      q.options = q.options.filter((_, idx) => idx !== oIndex);
      // Ensure at least one is correct if none left
      if (!q.options.some((o) => o.isCorrect) && q.options.length > 0) {
        q.options[0].isCorrect = true;
      }
      copy[qIndex] = q;
      return copy;
    });
  };

  const handleSaveQuiz = async () => {
    if (!testName.trim()) {
      setError('Please provide a quiz name.');
      return;
    }
    const targetSectionId = sectionId || selectedSectionId;
    if (!targetSectionId) {
      setError('Please select a course section for this quiz.');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.bodyRichtext.trim()) {
        setError(`Question ${i + 1} cannot have an empty question prompt.`);
        return;
      }
      if (q.options.length < 2) {
        setError(`Question ${i + 1} must have at least 2 options.`);
        return;
      }
      if (!q.options.some((o) => o.isCorrect)) {
        setError(`Question ${i + 1} must have at least one correct option marked.`);
        return;
      }
      if (q.options.some((o) => !o.body.trim())) {
        setError(`Question ${i + 1} has empty option choices. Please fill them out or remove them.`);
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        sectionId: targetSectionId,
        name: testName.trim(),
        timeLimitSeconds: timeLimitMins ? Number(timeLimitMins) * 60 : undefined,
        shuffleOptions,
        isPublished,
        questions: questions.map((q) => ({
          bodyRichtext: q.bodyRichtext.trim(),
          type: q.type,
          marks: q.marks,
          options: q.options.map((o) => ({
            body: o.body.trim(),
            isCorrect: o.isCorrect,
          })),
        })),
      };

      const res = await fetch(`/api/v1/courses/${courseId}/quizzes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to create quiz');
      }

      if (onCreated) onCreated(json.data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error saving quiz');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#131b2d]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#161B26] w-full max-w-4xl rounded-2xl shadow-2xl border border-[#c1c6d6] dark:border-gray-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Interactive Quiz Builder
              </h2>
              <p className="text-xs text-gray-500">
                Create auto-graded quiz questions with single or multiple correct options
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Test Name & Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
            {sections && sections.length > 0 && !sectionId && (
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Course Section / Module *
                </label>
                <CustomSelect
                  value={selectedSectionId}
                  onChange={setSelectedSectionId}
                  options={(sections || []).map((s) => ({ value: s.id, label: s.title }))}
                  placeholder="Select a module..."
                  size="sm"
                />
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Quiz Name *
              </label>
              <input 
                type="text"
                placeholder="e.g. Chapter 4: Data Structures Quick Quiz"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                className="w-full h-10 px-3.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0D1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-600 text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Time Limit (Minutes)
              </label>
              <input 
                type="number"
                min="1"
                placeholder="15"
                value={timeLimitMins}
                onChange={(e) => setTimeLimitMins(e.target.value)}
                className="w-full h-10 px-3.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0D1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-600 text-sm"
              />
            </div>
          </div>

          {/* Question Blocks */}
          <div className="space-y-6">
            {questions.map((q, qIndex) => (
              <div 
                key={q.id} 
                className="bg-white dark:bg-[#080D16] border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center">
                      Q{qIndex + 1}
                    </span>
                    <CustomSelect
                      value={q.type}
                      onChange={(v) => handleQuestionTypeChange(qIndex, v as any)}
                      options={[
                        { value: 'single_correct', label: 'Single Choice (1 Correct)' },
                        { value: 'multi_correct', label: 'Multiple Choice (Multiple Correct)' },
                      ]}
                      size="sm"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span>Marks:</span>
                      <input
                        type="number"
                        min="1"
                        value={q.marks}
                        onChange={(e) => handleQuestionMarksChange(qIndex, Number(e.target.value))}
                        className="w-12 h-7 px-1.5 rounded border border-gray-200 dark:border-gray-700 text-center bg-gray-50 dark:bg-gray-800 font-semibold"
                      />
                    </div>
                    {questions.length > 1 && (
                      <button 
                        onClick={() => handleRemoveQuestion(qIndex)}
                        className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                        title="Delete Question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Question Prompt */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Question Prompt
                  </label>
                  <textarea 
                    rows={2}
                    value={q.bodyRichtext}
                    onChange={(e) => handleQuestionTextChange(qIndex, e.target.value)}
                    className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#161B26] text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:border-blue-600 transition-all resize-none placeholder:text-gray-400"
                    placeholder="Enter the question text here..."
                  />
                </div>

                {/* Options List */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Answers (Click circle to set as correct answer)
                    </span>
                    <button 
                      type="button"
                      onClick={() => handleAddOption(qIndex)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Add Option
                    </button>
                  </div>

                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2.5">
                      <button 
                        type="button"
                        onClick={() => handleToggleCorrectOption(qIndex, oIndex)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          opt.isCorrect
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400'
                        }`}
                        title={opt.isCorrect ? 'Correct option' : 'Click to mark as correct'}
                      >
                        {opt.isCorrect && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </button>

                      <input 
                        type="text"
                        placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                        value={opt.body}
                        onChange={(e) => handleOptionTextChange(qIndex, oIndex, e.target.value)}
                        className={`flex-1 h-9 px-3 rounded-lg border text-sm bg-white dark:bg-[#161B26] text-gray-900 dark:text-gray-100 focus:outline-none transition-all ${
                          opt.isCorrect 
                            ? 'border-emerald-500/50 bg-emerald-50/20 focus:border-emerald-500' 
                            : 'border-gray-200 dark:border-gray-700 focus:border-blue-600'
                        }`}
                      />

                      {q.options.length > 2 && (
                        <button 
                          type="button"
                          onClick={() => handleRemoveOption(qIndex, oIndex)}
                          className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                          title="Delete Option"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Add Question Button */}
          <button 
            type="button"
            onClick={handleAddQuestion}
            className="w-full py-3.5 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 text-xs font-semibold hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            Add Another Question
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#161B26] flex justify-between items-center shrink-0 rounded-b-2xl">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300 cursor-pointer">
              <input 
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              Publish to Students Immediately
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="button"
              onClick={handleSaveQuiz}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Save & Create Quiz
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
