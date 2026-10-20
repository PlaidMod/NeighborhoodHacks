import assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolveDeadline, getWindow, getMethodWindow } from '../../lib/registration/deadlines.ts'
import { getRecipe } from '../../lib/registration/recipes.ts'
import { availableMethods, defaultChannel, buildEmail } from '../../lib/registration/channels.ts'

test('Chicago calendar-day noon survives both DST changes', () => {
  const rule = {anchor:'meeting_start', offset_days:-1, time:'12:00'}
  assert.equal(resolveDeadline(rule, '2026-03-09T17:00:00-05:00'), '2026-03-08T17:00:00.000Z')
  assert.equal(resolveDeadline(rule, '2026-11-02T17:00:00-06:00'), '2026-11-01T18:00:00.000Z')
  assert.equal(resolveDeadline(rule, '2026-03-08T17:00:00-05:00'), '2026-03-07T18:00:00.000Z')
})
test('business days skip weekends and explicit holidays', () => {
  assert.equal(resolveDeadline({anchor:'meeting_start',offset_days:-3,business_days:true,time:'12:00'}, '2026-03-09T17:00:00-05:00'), '2026-03-04T18:00:00.000Z')
  assert.equal(resolveDeadline({anchor:'meeting_start',offset_days:-1,business_days:true,holidays:['2026-10-12'],time:'12:00'}, '2026-10-13T17:00:00-05:00'), '2026-10-09T17:00:00.000Z')
})
test('previous weekday is strictly earlier and hour offsets are elapsed time', () => {
  assert.equal(resolveDeadline({anchor:'previous_weekday',weekday:'monday',time:'15:00'}, '2026-10-20T14:00:00-05:00'), '2026-10-19T20:00:00.000Z')
  assert.equal(resolveDeadline({anchor:'previous_weekday',weekday:'monday',time:'15:00'}, '2026-10-19T14:00:00-05:00'), '2026-10-12T20:00:00.000Z')
  assert.equal(resolveDeadline({anchor:'meeting_start',offset_hours:-1}, '2026-03-08T03:30:00-05:00'), '2026-03-08T07:30:00.000Z')
})
test('invalid and DST ambiguous/nonexistent local deadlines fail closed', () => {
  assert.throws(() => resolveDeadline({anchor:'meeting_start',time:'25:00'}, '2026-10-19T17:00:00Z'))
  assert.throws(() => resolveDeadline({anchor:'meeting_start',time:'02:30'}, '2026-03-08T17:00:00Z'))
  assert.throws(() => resolveDeadline({anchor:'meeting_start',time:'01:30'}, '2026-11-01T17:00:00Z'))
  assert.throws(() => resolveDeadline({anchor:'meeting_start'}, '2026-10-19T17:00:00'))
})
test('window opens inclusively and closes exclusively at exact cutoff', () => {
  const recipe = {...getRecipe('cyfair'), opensRule:{anchor:'meeting_start',offset_days:-1,time:'12:00'}}
  const meeting = '2026-10-19T18:00:00-05:00'
  assert.equal(getWindow(recipe,meeting,new Date('2026-10-18T16:59:59Z')).state,'before_open')
  assert.equal(getWindow(recipe,meeting,new Date('2026-10-18T17:00:00Z')).state,'open')
  assert.equal(getWindow(recipe,meeting,new Date('2026-10-19T17:00:00Z')).state,'closed')
  assert.equal(getWindow(getRecipe('cyfair'),meeting,new Date('2026-10-18T17:00:00Z')).state,'unknown')
  assert.equal(getWindow(getRecipe('hc-mud-489'),meeting,new Date()).state,'unknown')
  assert.equal(getWindow(recipe,'invalid',new Date()).state,'unknown')
  assert.deepEqual(getWindow(getRecipe('houston-council'),'2026-10-21T09:00:00-05:00',new Date('2026-10-18T17:00:00Z')), {state:'unknown'})
})
test('six recipes alias only their own bodies; unknown body has no fabricated method', () => {
  for (const id of ['hisd','cyfair','houston-council','harris-court','hc-mud-489','lonestar','lone-star']) assert.ok(getRecipe(id))
  assert.equal(getRecipe('hc-mud-490'),null)
  assert.equal(getRecipe('hcc'),null)
})
test('closed windows offer only verified written alternatives and student defaults use them', () => {
  assert.deepEqual(availableMethods(getRecipe('houston-council'),'closed'),[])
  const court = getRecipe('harris-court')
  assert.equal(defaultChannel(court,true),'written')
  assert.equal(availableMethods(court,'closed')[0].id,'written')
  assert.equal(availableMethods(court,'unknown').length,court.methods.length)
  assert.equal(defaultChannel(getRecipe('hc-mud-489'),true),null)
})
test('Lone Star card expires at its exact cutoff while online deadline stays unknown', () => {
  const recipe = getRecipe('lonestar')
  const meeting = '2026-11-05T10:30:00-06:00'
  const card = recipe.methods.find(method => method.id === 'card')
  assert.equal(getMethodWindow(card,meeting,new Date('2026-11-05T16:24:59Z')).state,'unknown')
  assert.equal(getMethodWindow(card,meeting,new Date('2026-11-05T16:25:00Z')).state,'closed')
  assert.equal(getMethodWindow(recipe.methods[0],meeting,new Date('2026-11-05T16:25:00Z')).state,'unknown')
  assert.deepEqual(availableMethods(recipe,'unknown',meeting,new Date('2026-11-05T16:24:59Z')).map(method => method.id),['online','card'])
  assert.deepEqual(availableMethods(recipe,'unknown',meeting,new Date('2026-11-05T16:25:00Z')).map(method => method.id),['online'])
  assert.deepEqual(availableMethods(recipe,'unknown',meeting,new Date('2026-11-05T16:30:00Z')),[])
  assert.deepEqual(availableMethods(recipe,'unknown',meeting,new Date('2026-11-06T16:30:00Z')),[])
  assert.deepEqual(availableMethods(getRecipe('harris-court'),'closed',meeting,new Date('2026-11-06T16:30:00Z')).map(method => method.id),['written'])
})
test('variable school speaking allocations are separate from practice targets and locations are bilingual', () => {
  for (const id of ['hisd','cyfair']) {
    assert.equal(getRecipe(id).minutes,null)
    assert.equal(getRecipe(id).practiceMinutes,1)
  }
  for (const id of ['hisd','cyfair','houston-council','harris-court','hc-mud-489','lonestar']) {
    assert.ok(getRecipe(id).meetingLocationText.en)
    assert.ok(getRecipe(id).meetingLocationText.es)
  }
})
test('mail drafts encode content and never accept injected recipients or headers', () => {
  const method = getRecipe('houston-council').methods.find(x => x.kind === 'email')
  const link = buildEmail(method,{name:'Ana & Luis',subject:'Water & drainage',body:'Line 1\nLine 2'},'es')
  assert.ok(link.startsWith('mailto:speakers@houstontx.gov?'))
  assert.ok(link.includes('Ana%20%26%20Luis'))
  assert.equal(buildEmail({...method,email:'good@example.org?bcc=evil@example.org'},{},'en'),null)
  assert.equal(buildEmail({...method,email:'good#fragment@example.org'},{},'en'),null)
  assert.equal(buildEmail({...method,email:'good%0abcc@example.org'},{},'en'),null)
  assert.equal(buildEmail(method,{body:'\uD800'},'en'),null)
  assert.equal(buildEmail(method,{subject:'hello\r\nBcc: evil@example.org'},'en'),null)
  assert.equal(buildEmail({...method,wordLimitSubject:2},{subject:'one two three'},'en'),null)
  assert.equal(buildEmail({id:'written',kind:'written'},{body:'hello'},'en'),null)
})
