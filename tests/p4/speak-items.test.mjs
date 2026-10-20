import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isSpeakItem, speakingTarget } from '../../lib/speak/items.ts'
test('picker and coach admit known agendas even without prototype comment metadata', () => {
  for (const type of ['agenda','hearing','meeting']) assert.equal(isSpeakItem({type}), true)
  assert.equal(isSpeakItem({type:'decision'}), false)
  assert.equal(isSpeakItem({type:'election',comment:{minutes:2}}), true)
})
test('coaching and rehearsal share verified limits and conservative unknown targets', () => {
  assert.deepEqual(speakingTarget({minutes:5}), {minutes:5,verified:true})
  assert.deepEqual(speakingTarget({minutes:null,practiceMinutes:1}), {minutes:1,verified:false})
  assert.deepEqual(speakingTarget(null), {minutes:2,verified:false})
  assert.deepEqual(speakingTarget({minutes:NaN,practiceMinutes:-1}), {minutes:2,verified:false})
})
