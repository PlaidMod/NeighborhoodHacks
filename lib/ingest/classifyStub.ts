import type { Classifier } from '@/lib/adapters/types';

// Phase 1 stand-in for P3's classify() (§5.3). Real rules live in lib/rules/classify.ts (P3 owns it).
export const classifyStub: Classifier = () => ({ item_type: 'other', tier: 'timeline' });
