import { reportSectionsSchema, renderReportMarkdown } from '../src/validators/reportValidator';

const valid = {
  headline: '3 sessions completed in September 2026',
  summary: 'Aarav attended three of four scheduled sessions and engaged well with the quadratic equations unit.',
  topicsCovered: [
    { topic: 'Quadratic equations', mastery: 4, note: 'Solves by factorisation unaided.' },
    { topic: 'Graphing', mastery: 2 },
  ],
  strengths: ['Consistent attendance', 'Asks for clarification early'],
  areasForGrowth: ['Needs more practice with word problems'],
  nextSteps: ['Complete the practice worksheet before the next session'],
  overallScore: 78,
  engagementRating: 4,
};

const parsed = reportSectionsSchema.safeParse(valid);
if (!parsed.success) {
  console.error('FAIL: valid fixture rejected');
  console.error(parsed.error.issues);
  process.exit(1);
}
console.log('PASS: valid sections accepted');

const bad = { ...valid, overallScore: 140, engagementRating: 9 };
if (reportSectionsSchema.safeParse(bad).success) {
  console.error('FAIL: out-of-range score accepted');
  process.exit(1);
}
console.log('PASS: out-of-range rejected (repair path is required)');

const missing = { ...valid };
delete (missing as Record<string, unknown>).nextSteps;
if (reportSectionsSchema.safeParse(missing).success) {
  console.error('FAIL: missing required field accepted');
  process.exit(1);
}
console.log('PASS: missing required field rejected');

const md = renderReportMarkdown(parsed.data, {
  learnerName: 'Aarav Sharma',
  courseName: 'Mathematics — Grade 10',
  monthYear: 'September 2026',
});

const mustContain = [
  'Aarav Sharma — Mathematics — Grade 10',
  'September 2026',
  '78/100',
  'Quadratic equations',
  'mastery 4/5',
  'Complete the practice worksheet',
];
const missing_ = mustContain.filter((s) => !md.includes(s));
if (missing_.length) {
  console.error('FAIL: rendered markdown missing', missing_);
  process.exit(1);
}
console.log('PASS: markdown renders all sections');
console.log('\n--- rendered output ---\n' + md);
