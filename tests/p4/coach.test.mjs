import test from 'node:test';
import assert from 'node:assert/strict';
import { detectGuardrails, removeFlaggedQuotes, estimateSeconds } from '../../lib/coach/guardrails.ts';
import { validateCoachPayload, validateExplainPayload, parseCoachInput } from '../../lib/coach/validate.ts';
import { runCoach } from '../../lib/coach/service.ts';
import { MemoryRateLimitStore } from '../../lib/coach/rate-limit.ts';
import { createCoachHandler } from '../../lib/coach/http.ts';
import { createGeminiProvider } from '../../lib/coach/gemini.ts';

const item = { id:'hisd-calendar', title:'Board votes on the 2027–28 school calendar', summary:'The proposed calendar starts school Aug 4, shortens winter break to 12 days, and moves spring finals before Memorial Day.', why:'Sets when the school year starts and ends for every student in the district.', audiences:['student','parent'], source:'https://www.houstonisd.org', bodyName:'HISD', minutes:2 };
const clean = {questions:['What matters most to you?'],feedback:[{area:'clarity',note:'Check that your request is clear.'}],cut_suggestions:[],guardrail_hits:[],estimated_seconds:10};
const drafts = {
  en:['I oppose this calendar because childcare costs will rise.','The board made a terrible decision.','Mayor Whitmire, your budget decision was irresponsible.','This policy is stupid and the council should reconsider.','I will not hurt you. Please kill the proposal, not the debate.'],
  es:['Me opongo al calendario porque sube el costo del cuidado infantil.','La junta tomó una decisión terrible.','Alcalde Whitmire, su decisión fue irresponsable.','Esta política es estúpida; el concejo debe reconsiderarla.','No voy a matarte. Quiero eliminar la propuesta.'],
};
for (const [lang, examples] of Object.entries(drafts)) for (const draft of examples) test(`preserves public criticism/near miss: ${draft}`,()=> assert.deepEqual(detectGuardrails(draft,lang),[]));
const hits = [
 ['en','I will kill you.','threat'],['en',"I'll shoot the mayor.",'threat'],
 ['es','Voy a matarte.','threat'],['es','Te voy a matar.','threat'],
 ['en','Call me at (713) 555-0123.','private_info'],['en','Email jane@example.com.','private_info'],['en','I live at 123 Main Street.','private_info'],
 ['es','Mi teléfono es 713-555-0199.','private_info'],['es','Escribe a ana@example.com.','private_info'],['es','Vivo en calle Roble 123.','private_info'],
 ['en','You are an idiot.','personal_attack'],['en','Mayor Smith is a moron.','personal_attack'],
 ['es','Eres un idiota.','personal_attack'],['es','El alcalde Smith es un imbécil.','personal_attack'],
];
for(const [lang,draft,category] of hits) test(`detects ${category}: ${draft}`,()=>{const found=detectGuardrails(draft,lang);assert.ok(found.some(x=>x.category===category));for(const hit of found) assert.ok(draft.includes(hit.quote));});
test('removal removes exact flagged spans only and ignores invented/empty quotes',()=>assert.equal(removeFlaggedQuotes('Keep this. You are an idiot. Keep that.',[{quote:'You are an idiot'},{quote:''},{quote:'Keep everything'}]),'Keep this. . Keep that.'));
test('removal merges overlapping matches without deleting neighbors',()=>assert.equal(removeFlaggedQuotes('abcdef keep',[{quote:'abc'},{quote:'cdef'}]),' keep'));
test('negated Spanish attacks and threats remain intact',()=>{
 for (const draft of ['No eres un idiota.','Nunca voy a matarte.','No te voy a matar.']) assert.deepEqual(detectGuardrails(draft,'es'),[]);
});
test('direct attacks and threats include public-role targets without deleting policy criticism',()=>{
 for (const [lang,draft,category] of [['en','The mayor is an idiot.','personal_attack'],['en','Mayor John Smith is a moron.','personal_attack'],['es','El alcalde es un idiota.','personal_attack'],['es','Voy a matar al alcalde.','threat'],['en','I will burn your house down.','threat']]) assert.ok(detectGuardrails(draft,lang).some(hit=>hit.category===category),draft);
});
test('policy criticism using attack keeps possessive decisions and policies intact',()=>{
 for(const draft of ['I will attack the board’s decision to cut buses.',"I will attack the council's policy on transit.",'I will attack the trustees’ decision to reduce service.']) {
   const found=detectGuardrails(draft,'en');assert.deepEqual(found,[]);assert.equal(removeFlaggedQuotes(draft,found),draft);
 }
 for(const draft of ['Voy a atacar la decisión de la junta de recortar autobuses.','Voy a atacar la política del alcalde sobre el transporte.']) assert.deepEqual(detectGuardrails(draft,'es'),[]);
});
test('threats against the actual board or its members remain detected',()=>{
 for(const draft of ['I will attack the board.',"I will attack the board's members."]) assert.ok(detectGuardrails(draft,'en').some(x=>x.category==='threat'));
 for(const draft of ['Voy a atacar a la junta.','Voy a matar al alcalde por su política.']) assert.ok(detectGuardrails(draft,'es').some(x=>x.category==='threat'));
});
test('timing uses 130 words per minute',()=>assert.equal(estimateSeconds(Array(130).fill('word').join(' ')),60));
test('provider validation rejects fabricated quotes, replacements and malformed fields',()=>{
 assert.ok(validateCoachPayload(clean,'A draft.'));
 for(const value of [{...clean,replacement:'speech'},{...clean,questions:'bad'},{...clean,cut_suggestions:[{quote:'invented',reason:'cut'}]},{...clean,guardrail_hits:[{quote:'invented',category:'threat',reason:'bad'}]},{...clean,feedback:[{area:'clarity',note:'x',replacement:'new'}]},{...clean,estimated_seconds:NaN}]) assert.equal(validateCoachPayload(value,'A draft.'),null);
 assert.equal(validateExplainPayload({plain_summary:'x',who_it_affects:'x',questions_for_user:[],replacement:'x'}),null);
});
test('request validation enforces cap, ZIP and strict known fields',()=>{
 assert.ok(parseCoachInput({mode:'coach',item_id:item.id,lang:'en',draft:'x'.repeat(2000)}));
 for(const extra of [{draft:'x'.repeat(2001)},{zip:'../x'},{lang:'fr'},{source:'https://evil.example'},{browser_id:'forged'}]) assert.equal(parseCoachInput({mode:'coach',item_id:item.id,lang:'en',draft:'hello',...extra}),null);
});
test('provider enum fields cannot smuggle arrays via string coercion',()=>{
 assert.equal(validateCoachPayload({...clean,feedback:[{area:['clarity'],note:'Check clarity.'}]},'A draft.'),null);
 assert.equal(validateCoachPayload({...clean,guardrail_hits:[{quote:'draft',category:['threat'],reason:'Review.'}]},'A draft.'),null);
});
test('obvious quoted replacement instructions are rejected in English and Spanish',async()=>{
 for(const note of ['Say: "I oppose this proposal."','Try saying: “I support this policy.”','Replace your opening with "I want a delay."','Di: «Yo rechazo esta propuesta».','Escribe: "Me opongo a esta medida."','Reemplaza tu introducción por «Yo pido otro calendario».']) {
   const unsafe={...clean,feedback:[{area:'clarity',note}]};
   assert.equal(validateCoachPayload(unsafe,'My draft.'),null,note);
   assert.equal((await runCoach({...base,draft:'My draft.'},item,{provider:async()=>unsafe})).provider,'local');
 }
});
test('neutral review questions and discussion of first-person language remain valid',()=>{
 for(const note of ['Check that your request is clear.','Review whether your use of "I" reflects your own experience.','Revisa si tu experiencia está clara.','Consider whether the phrase "I oppose" matches your position.']) assert.ok(validateCoachPayload({...clean,feedback:[{area:'clarity',note}]},'My draft.'),note);
});
test('unconfigured coaching returns neutral local feedback and source-labeled explanation in both languages',async()=>{
 for(const lang of ['en','es']) {const c=await runCoach({mode:'coach',item_id:item.id,lang,draft:'I oppose the policy.'},item); assert.equal(c.provider,'local');assert.equal(c.estimated_seconds,2); assert.equal('replacement' in c,false); const e=await runCoach({mode:'explain',item_id:item.id,lang},item); assert.equal(e.provider,'local'); assert.ok(e.plain_summary.includes(item.summary)); assert.match(e.plain_summary,/prototype|prototipo/);}
});
test('provider failures, malformed payloads and deadlines safely fall back to local',async()=>{
 const input={mode:'coach',item_id:item.id,lang:'en',draft:'You are an idiot.'};
 for(const provider of [async()=>{throw Error('failure')},async()=>({...clean,replacement:'new speech'}),async()=>new Promise(()=>{})]) {const r=await runCoach(input,item,{provider,timeoutMs:10});assert.equal(r.provider,'local');assert.equal(r.guardrail_hits.length,1);}
});
test('valid provider output merges deterministic guardrails and recalculates timing',async()=>{const r=await runCoach({mode:'coach',item_id:item.id,lang:'en',draft:'You are an idiot.'},item,{provider:async()=>clean});assert.equal(r.provider,'gemini');assert.equal(r.guardrail_hits.length,1);assert.equal(r.estimated_seconds,2);});
test('fixed window enforces both browser and IP and expires on hour boundary',()=>{const s=new MemoryRateLimitStore();for(let i=0;i<20;i++) assert.equal(s.consume(['browser:a','ip:a'],0).allowed,true);assert.equal(s.consume(['browser:b','ip:a'],1).allowed,false);assert.equal(s.consume(['browser:a','ip:b'],1).allowed,false);assert.equal(s.consume(['browser:a','ip:a'],3600000).allowed,true);});
const request=(body,headers={})=>new Request('https://app.example/api/coach',{method:'POST',headers:{origin:'https://app.example','content-type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)});
const base={mode:'coach',item_id:item.id,lang:'en',draft:'My comment.'};
test('HTTP rejects cross-origin, malformed/oversized bodies and unknown items; sets no-store',async()=>{const handler=createCoachHandler({resolveItem:(id,zip)=>id===item.id&&zip==='77004'?item:null});for(const [req,status] of [[request(base,{origin:'https://evil.example'}),403],[request('{'),400],[request({...base,item_id:'fake'}),404],[request('x'.repeat(13000)),413],[request(base,{'content-type':'text/plain'}),415]]){const response=await handler(req);assert.equal(response.status,status);assert.equal(response.headers.get('cache-control'),'no-store');} const r=await handler(request(base));assert.equal(r.status,200);assert.match(r.headers.get('set-cookie'),/HttpOnly/);assert.equal((await r.json()).provider,'local');});
test('HTTP defaults ZIP but resolves a provided ZIP, and shares unknown-IP budget despite spoofed proxy headers',async()=>{let resolvedZip;const handler=createCoachHandler({resolveItem:(id,zip)=>{resolvedZip=zip;return item}});let r;for(let i=0;i<20;i++) r=await handler(request({...base,zip:'77065'},{'x-forwarded-for':`192.0.2.${i}`}));assert.equal(resolvedZip,'77065');assert.equal(r.status,200);assert.equal((await handler(request(base))).status,429);});
test('REST adapter sends server key only as a header, structured schema and bounded abort signal',async()=>{
 let sent;
 const provider=createGeminiProvider('test-only-key','test-model',async(url,options)=>{sent={url,options};return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(clean)}]}}]})});
 const result=await provider(base,item,new AbortController().signal);
 assert.deepEqual(result,clean);
 assert.equal(sent.url,'https://generativelanguage.googleapis.com/v1beta/models/test-model:generateContent');
 assert.equal(sent.options.headers['x-goog-api-key'],'test-only-key');
 assert.equal(sent.options.cache,'no-store');
 assert.ok(sent.options.signal instanceof AbortSignal);
 const body=JSON.parse(sent.options.body);
 assert.equal(body.generationConfig.responseMimeType,'application/json');
 assert.equal(body.generationConfig.responseJsonSchema.additionalProperties,false);
 assert.equal(JSON.parse(body.contents[0].parts[0].text).user_draft,base.draft);
});
test('REST adapter rejects failed, blocked, truncated, missing or invalid provider responses without echoing upstream text',async()=>{
 for(const response of [new Response('private upstream input',{status:429}),Response.json({candidates:[]}),Response.json({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:JSON.stringify(clean)}]}}]}),Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'bad json'}]}}]})]){
 const provider=createGeminiProvider('test-only-key','test-model',async()=>response);
 await assert.rejects(()=>provider(base,item,new AbortController().signal),error=>!error.message.includes('private upstream input'));
 }
});
test('explanation REST requests do not transmit an optional draft',async()=>{
 let sent;
 const provider=createGeminiProvider('test-only-key','test-model',async(_url,options)=>{sent=JSON.parse(options.body);return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'{}'}]}}]})});
 await provider({...base,mode:'explain'},item,new AbortController().signal);
 assert.equal('user_draft' in JSON.parse(sent.contents[0].parts[0].text),false);
});
