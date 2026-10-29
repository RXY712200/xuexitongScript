import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../v3_optimized.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf('    const SETTINGS_KEY'),source.indexOf('    // The native card is evidenced;'));
const api=vm.runInNewContext(code+';({defaultSettings,validateSettings,createTaskPacingCoordinator,createActionScheduler})',{URL,console,Date,Math});
const {defaultSettings,validateSettings,createTaskPacingCoordinator:factory}=api;
let time=1000000,draw=0,draws=0;const random=()=>{draws++;return draw;};
function setup(store=new Map(),settings=defaultSettings()) {
 const env={location:{href:'https://mooc1.chaoxing.com/?courseId=synthetic'},localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)}};
 return {store,settings,env,coordinator:factory(env,()=>settings,()=>time,random)};
}
const id=(n,kind='video',lesson='leaf')=>({course:'synthetic',lesson,kind,inventory:'video,video,video,video,document',ordinal:n});
const record=(c,n,kind)=>c.recordCompletion(id(n,kind),'natural-ended');
for(const [kind,min,max] of [['nextContent',3000,7000],['nextLesson',2000,8000],['nextChapter',3000,8000]]) {
 for(const [r,expected] of [[0,min],[0.99999999,max],[0.3827,min+Math.floor(.3827*(max-min+1))]]) {
  draw=r;const {coordinator:c,settings}=setup();const p=c.beforeNextContent(kind,kind,settings.delays[kind]);assert.equal(p.delayMs,expected);assert.equal(p.deadline,time+expected);
 }
}
console.log('PASS inclusive integer transition bounds, independent samples and millisecond variation');
draw=0;let {coordinator:c,settings,store}=setup();assert.equal(c.getStatus().target,3);
for(let n=0;n<2;n++)assert.equal(record(c,n),true);
assert.equal(record(c,1),false);assert.equal(c.getStatus().count,2);
// Four videos plus a document are five distinct tasks, not a lesson or chapter count.
for(let n=2;n<4;n++)record(c,n);c.recordCompletion(id(4,'document'),'verified-bottom');assert.equal(c.getStatus().count,5);
assert.equal(c.recordCompletion(id(8),'skipped-green'),false);
const rest=c.beforeNextContent('nextLesson','destination',settings.delays.nextLesson);assert.equal(rest.delayMs,300000);
assert.equal(c.beforeNextContent('nextLesson','destination',settings.delays.nextLesson).deadline,rest.deadline);
const before=draws;c=setup(store,settings).coordinator;assert.equal(draws,before);assert.equal(c.getStatus().restEndsAt,rest.deadline);
time+=12345;assert.equal(c.beforeNextContent('nextLesson','destination',settings.delays.nextLesson).delayMs,287655);
c.cancelPending();time=rest.deadline;assert.equal(c.getStatus().count,5);assert.equal(c.consume(rest.key),true);assert.equal(c.getStatus().count,0);assert.equal(c.beforeNextContent('nextLesson','destination',settings.delays.nextLesson).delayMs,0);
assert.equal(record(c,1),false);console.log('PASS five independent items, duplicate/skip rejection, one rest replaces short delay, persisted deadline and one-shot consumption');
// Expired rest on a rediscovered current task is consumed without a second short wait.
draw=.99999999;({coordinator:c,settings,store}=setup());assert.equal(c.getStatus().target,6);for(let n=0;n<6;n++)record(c,n);
let p=c.beforeNextContent('nextChapter','old',settings.delays.nextChapter);assert.equal(p.delayMs,420000);time=p.deadline+100;
c=setup(store,settings).coordinator;p=c.beforeNextContent('nextContent','rediscovered',settings.delays.nextContent);assert.equal(p.delayMs,0);assert.equal(c.consume(p.key),true);
console.log('PASS quota upper bound, rest upper bound and expired-rest reload without stacked delay');
draw=0;({coordinator:c,settings}=setup());for(let n=0;n<3;n++)record(c,n);p=c.beforeNextContent('nextContent','next',settings.delays.nextContent);settings.rest.enabled=false;
assert.equal(c.beforeNextContent('nextContent','next',settings.delays.nextContent).delayMs,0);assert.equal(c.consume(p.key),true);
({coordinator:c,settings}=setup());p=c.beforeNextContent('nextLesson','next',settings.delays.nextLesson);settings.delays.nextLesson.enabled=false;assert.equal(c.beforeNextContent('nextLesson','next',settings.delays.nextLesson).delayMs,0);
const live={course:'synthetic',lesson:'live',kind:'live',inventory:'live',ordinal:0};assert.equal(c.recordCompletion(live,'platform-live-ended'),true);assert.equal(c.recordCompletion(live,'platform-live-ended'),false);
console.log('PASS explicit settings cancellation/resume behavior and live-return persistent deduplication');
const legacy=defaultSettings();delete legacy.pacingVersion;delete legacy.rest;delete legacy.delays.nextContent;legacy.features.background=false;legacy.features.audioPlayback=false;legacy.delays.documentScroll.minMs=413;
const migrated=validateSettings(legacy);assert.equal(migrated.delays.nextContent.minMs,3000);assert.equal(migrated.delays.nextLesson.maxMs,8000);assert.equal(migrated.delays.nextChapter.minMs,3000);assert.equal(migrated.features.background,false);assert.equal(migrated.features.audioPlayback,false);assert.equal(migrated.delays.documentScroll.minMs,413);
assert.throws(()=>validateSettings({...migrated,rest:{...migrated.rest,taskTargetMin:0}}));
console.log('PASS migration preserves unrelated preferences and rejects invalid rest parameters');
// Real scheduler with a deterministic VM clock: one timer, same absolute display/action deadline.
let clock=2000000,next=0,fired=0;const timers=new Map();const fakeDate={now:()=>clock};
const schedulerAPI=vm.runInNewContext(code+';({createActionScheduler})',{URL,console:{log(){}},Date:fakeDate,Math});
const scheduler=schedulerAPI.createActionScheduler({setTimeout:(fn,ms)=>{timers.set(++next,{fn,ms});return next;},clearTimeout:id=>timers.delete(id)},{rule:()=>({enabled:true,minMs:2000,maxMs:8000}),enabled:()=>true});
let shown;const action=scheduler.run('nextLesson','nav',()=>fired++,{deadline:clock+2432,onScheduled:a=>shown=a.deadline,isValid:()=>true});
assert.equal(action.deadline,shown);assert.equal(timers.get(action.timer).ms,2432);assert.equal(scheduler.run('nextLesson','nav',()=>fired++),action);assert.equal(timers.size,1);
action.cancel();clock+=3000;for(const t of timers.values())t.fn();assert.equal(fired,0);
let valid=true;const stale=scheduler.run('nextLesson','nav2',()=>fired++,{deadline:clock+2000,isValid:()=>valid});valid=false;timers.get(stale.timer).fn();assert.equal(fired,0);
assert.ok(!source.includes('delayMs: 5000'));assert.match(source,/_navigationPreview\(action.deadline\)/);
console.log('PASS scheduler deadline/preview agreement, duplicate suppression, Stop and stale callback cancellation');
console.log('RESULT: 6 focused synthetic pacing groups passed; not authenticated browser acceptance.');

// Isolated recovery budget: no media engine or real reload in this simulation.
const recoveryBody=source.slice(source.indexOf('    function createUnattendedRecoveryCoordinator('),source.indexOf('    function pacingCourse('));
const makeRecovery=Function(recoveryBody+';return createUnattendedRecoveryCoordinator;')();
const recoveryStore=new Map(),recoveryTimers=new Map();let timerID=0,retries=0,reloads=0,failed='',allowed=true;
const recoveryEnv={sessionStorage:{getItem:k=>recoveryStore.get(k)??null,setItem:(k,v)=>recoveryStore.set(k,v)},setTimeout:fn=>{recoveryTimers.set(++timerID,fn);return timerID;},clearTimeout:id=>recoveryTimers.delete(id),location:{reload:()=>reloads++}};
const hooks={identity:()=> 'course-class-lesson',safe:()=>allowed,canReload:()=>true,notice(){},fail:r=>failed=r,retry:()=>retries++,progress:()=>false};
const tickRecovery=()=>{const callbacks=[...recoveryTimers.values()];recoveryTimers.clear();callbacks.forEach(fn=>fn());};
let recovery=makeRecovery(recoveryEnv,hooks);assert.equal(recovery.requestRecovery('user-interaction'),false);
assert.equal(recovery.requestRecovery('context-stale'),true);tickRecovery();assert.equal(retries,1);tickRecovery();tickRecovery();assert.equal(retries,2);tickRecovery();tickRecovery();assert.equal(reloads,1);
recovery=makeRecovery(recoveryEnv,hooks);assert.equal(recovery.getStatus().attempts,3);recovery.observe();tickRecovery();assert.equal(recovery.getStatus().stage,'terminal');assert.equal(reloads,1);
recovery.resumeExplicitly();recovery.requestRecovery('readiness');recovery.markExplicitStop();tickRecovery();assert.equal(reloads,1);assert.equal(makeRecovery(recoveryEnv,hooks).getStatus().stopped,true);
recovery.resumeExplicitly();recovery.requestRecovery('readiness');recovery.confirmProgress();assert.equal(recovery.getStatus().attempts,0);allowed=false;assert.equal(recovery.requestRecovery('frame-replaced'),false);
console.log('PASS recovery three-attempt budget, one reload, reinjection persistence, Stop/Resume and progress reset (simulated)');

recovery.resumeExplicitly();allowed=true;recovery.requestRecovery('context-stale');recovery.cancel('terminal-block');const terminalAttempts=recovery.getStatus().attempts;recovery.confirmProgress();assert.equal(recovery.getStatus().stage,'terminal');
hooks.identity=()=>null;recovery.restore();assert.equal(recovery.getStatus().attempts,terminalAttempts);assert.equal(recovery.getStatus().stage,'terminal');
hooks.identity=()=> 'course-class-different-lesson';recovery.restore();assert.equal(recovery.getStatus().attempts,0);assert.equal(recovery.getStatus().stage,'idle');
console.log('PASS terminal ignores late progress and missing identity; verified different lesson gets fresh budget');

const readerCode=source.slice(source.indexOf('        function readDocument('),source.indexOf('        return { createParent, installChild, readDocument'));
for(const range of [80,800,80000])for(const sample of [0,.191,.99999999]){
 let t=0,draws=0,complete=false,error='',valid=true;const queue=[];
 const env={performance:{now:()=>t},setTimeout:(fn,ms)=>{const job={fn,at:t+ms};queue.push(job);return job;},clearTimeout:job=>{if(job)job.cancelled=true;}};
 const math=Object.create(Math);math.random=()=>{draws++;return sample;};
 const read=vm.runInNewContext(readerCode+';readDocument',{env,Math:math,Date});
 const el={isConnected:true,clientHeight:100,scrollHeight:range+100,scrollTop:0};
 const controller=read({element:el,isValid:()=>valid,onComplete:()=>complete=true,onError:r=>error=r});
 let midway=false;
 while(queue.length&&!complete&&!error){queue.sort((a,b)=>a.at-b.at);const job=queue.shift();t=job.at;if(!job.cancelled)job.fn();if(t>2000&&t<4000&&el.scrollTop>0&&el.scrollTop<range)midway=true;if(t>10000)throw Error('unbounded reader');}
 const duration=5000+Math.floor(sample*2001);assert.equal(controller.durationMs,duration);assert.equal(draws,1);assert.equal(complete,true);assert.equal(error,'');assert.equal(el.scrollTop,range);assert.equal(midway,true);assert.ok(t>=duration&&t<=duration+550);
}
console.log('PASS adaptive reader: 80/800/80000px, inclusive duration bounds, millisecond samples, single draw, intermediate motion and stable bottom');

for(const mode of ['grow','stop','stale','stuck']){
 let t=0,done=false,error='',valid=true;const jobs=[];const env={performance:{now:()=>t},setTimeout:(fn,ms)=>{const j={fn,at:t+ms};jobs.push(j);return j;},clearTimeout:j=>{if(j)j.cancelled=true;}};
 const read=vm.runInNewContext(readerCode+';readDocument',{env,Math,Date});const el={isConnected:true,clientHeight:100,scrollHeight:900,scrollTop:0};
 if(mode==='stuck')Object.defineProperty(el,'scrollTop',{get:()=>0,set(){}});
 const c=read({element:el,isValid:()=>valid,onComplete:()=>done=true,onError:r=>error=r});let changed=false;
 while(jobs.length&&!done&&!error){jobs.sort((a,b)=>a.at-b.at);const j=jobs.shift();t=j.at;if(!changed&&t>=2000){changed=true;if(mode==='grow')el.scrollHeight=8100;if(mode==='stop')c.cancel();if(mode==='stale')valid=false;}if(!j.cancelled)j.fn();if(t>15000)throw Error('unbounded');}
 if(mode==='grow'){assert.equal(done,true);assert.equal(el.scrollTop,8000);}else{assert.equal(done,false);if(mode!=='stop')assert.ok(error);}
}
console.log('PASS dynamic extent, cancellation, stale context and blocked scrolling never completing on timer alone');
