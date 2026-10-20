import assert from 'node:assert/strict'
import { test } from 'node:test'
import { remainingSeconds } from '../../lib/speak/timer.ts'
test('rehearsal measures elapsed wall time after a suspended tab', () => {
  assert.equal(remainingSeconds(120, 0, 1000, 61_000), 60)
  assert.equal(remainingSeconds(120, 0, 1000, 181_000), 0)
})
test('paused time and clock rollback cannot extend the limit', () => {
  assert.equal(remainingSeconds(120, 30_000, null, 500_000), 90)
  assert.equal(remainingSeconds(120, 30_000, 50_000, 40_000), 90)
})
