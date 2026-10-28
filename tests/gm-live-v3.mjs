import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
const source=readFileSync(new URL('../v3_optimized.js',import.meta.url),'utf8');
const body=source.slice(source.lastIndexOf('    function createGMLive('),source.lastIndexOf('})(typeof unsafeWindow'));
const node={id:'lesson'};const catalog={current:()=>node};
const factory=Function('catalog','return '+body)(catalog);
const key='xtx-v34-native-session-v1';
function setup(){
 const store=new Map(),listeners=new Map();let id=0;
 const gm={get:(k,d)=>structuredClone(store.get(k)??d),set:(k,v)=>{store.set(k,structuredClone(v));for(const [name,fn]of listeners.values())if(name===k)fn();},remove:k=>store.delete(k),listen:(k,fn)=>{listeners.set(++id,[k,fn]);return id;},unlisten:i=>listeners.delete(i)};
 const environment=host=>{const intervals=new Map(),timeouts=new Map(),panels=new Map(),events=new Map();let next=0;return{crypto:{randomUUID},location:{origin:'https://'+host,href:'https://'+host+'/?courseId=synthetic&chapterId=lesson',reload(){this.reloads=(this.reloads||0)+1;}},document:{getElementById:k=>panels.get(k),createElement:()=>({style:{},textContent:''}),body:{append:el=>panels.set(el.id,el)}},setInterval:fn=>{intervals.set(++next,fn);return next;},clearInterval:i=>intervals.delete(i),setTimeout:fn=>{timeouts.set(++next,fn);return next;},clearTimeout:i=>timeouts.delete(i),addEventListener(type,fn){const list=events.get(type)||[];list.push(fn);events.set(type,list);},dispatch(type){for(const fn of events.get(type)||[])fn();},close(){this.closeAttempts=(this.closeAttempts||0)+1;},tick(){for(const fn of [...intervals.values()])fn();},flush(){const f=[...timeouts.values()];timeouts.clear();for(const fn of f)fn();},intervals,panels};};
 const parent=environment('mooc1.chaoxing.com'),child=environment('zhibo.chaoxing.com');
 let credited=false;const app={_generation:1,settings:{features:{live:true,videoPlayback:true,background:true}},_nodeTitle:()=> 'Lecture',_priorProof:()=>credited,stopAutomation(){this.stops=(this.stops||0)+1;},run(){this.runs=(this.runs||0)+1;},_notify(t){this.notice=t;}};
 const player=new EventTarget();Object.assign(player,{currentTime:0,ended:false,paused:true,playbackRate:2,play(){this.paused=false;return Promise.resolve();}});
 const adapter={isRecognized:()=>true,getPlayer:()=>player};
 return{store,gm,parent,child,app,player,adapter,credit:()=>credited=true};
}
let passed=0;
function check(name,fn){fn();passed++;console.log('PASS '+name);}
check('no-opener claim/ack, progression and one natural-ended terminal result',()=>{
 const h=setup(),p=factory(h.parent,h.gm),c=factory(h.child,{...h.gm,close:()=>h.child.close()});assert.equal(p.begin(h.app,{}, {validateScope:()=>true}),true);assert.equal(p.begin(h.app,{}, {validateScope:()=>true}),false);h.app._generation++;assert.equal(p.begin(h.app,{}, {validateScope:()=>true},true),true);c.child(h.adapter);h.parent.tick();h.child.tick();
 assert.equal(h.gm.get(key).phase,'active');assert.equal(h.player.playbackRate,1);assert.equal(h.child.opener,undefined);
 h.player.currentTime=10;h.player.dispatchEvent(new Event('timeupdate'));h.player.ended=true;h.player.dispatchEvent(new Event('ended'));h.player.dispatchEvent(new Event('ended'));assert.equal(h.gm.get(key).seq,2);assert.equal(h.gm.get(key).phase,'ended');
 h.child.flush();assert.equal(h.child.closeAttempts,1);h.child.flush();assert.ok(h.child.panels.get('xtx-native-replay-status').textContent.includes('手动关闭'));
 h.parent.flush();assert.equal(h.parent.location.reloads,1);p.restore(h.app);assert.equal(h.parent.location.reloads,1);assert.equal(h.app.runs,undefined);h.credit();p.restore(h.app);assert.equal(h.app.runs,1);
});
check('unrelated identifiers and expired sessions do not install child',()=>{
 const h=setup();factory(h.parent,h.gm).begin(h.app,{}, {validateScope:()=>true});h.child.location.href='https://zhibo.chaoxing.com/?courseId=other&chapterId=lesson';factory(h.child,{...h.gm,close:()=>h.child.close()}).child(h.adapter);assert.equal(h.child.__xuexitongLiveChild,undefined);
 h.child.location.href='https://zhibo.chaoxing.com/?courseId=synthetic&chapterId=lesson';const r=h.gm.get(key);h.gm.set(key,{...r,expires:0});factory(h.child,{...h.gm,close:()=>h.child.close()}).child(h.adapter);assert.equal(h.child.__xuexitongLiveChild,undefined);
});
check('duplicate claim and already-ended player cannot finish new session',()=>{
 const h=setup(),p=factory(h.parent,h.gm);p.begin(h.app,{}, {validateScope:()=>true});factory(h.child,{...h.gm,close:()=>h.child.close()}).child(h.adapter);
 const other=setup().child;factory(other,h.gm).child(h.adapter);assert.equal(other.__xuexitongLiveChild,undefined);
 h.player.ended=true;h.parent.tick();h.child.tick();h.player.dispatchEvent(new Event('ended'));assert.equal(h.gm.get(key).phase,'active');assert.equal(h.child.closeAttempts,undefined);
});
check('premature lifecycle exit and disabled settings never create success',()=>{
 const h=setup();factory(h.parent,h.gm).begin(h.app,{}, {validateScope:()=>true});factory(h.child,{...h.gm,close:()=>h.child.close()}).child(h.adapter);h.parent.tick();h.child.tick();h.app.settings.features.live=false;h.parent.tick();h.child.tick();assert.equal(h.gm.get(key).phase,'cancelled');assert.equal(h.app.runs,undefined);assert.equal(h.child.closeAttempts,undefined);
 const early=setup();factory(early.parent,early.gm).begin(early.app,{}, {validateScope:()=>true});factory(early.child,{...early.gm,close:()=>early.child.close()}).child(early.adapter);early.parent.tick();early.child.tick();early.child.dispatch('pagehide');early.player.currentTime=30;early.player.ended=true;early.player.dispatchEvent(new Event('ended'));assert.equal(early.gm.get(key).phase,'active');assert.equal(early.child.closeAttempts,undefined);
});
check('pending timeout and cancelled attempts need explicit retry with fresh identity',()=>{
 const h=setup(),p=factory(h.parent,h.gm);p.begin(h.app,{}, {validateScope:()=>true});const first=h.gm.get(key);
 h.gm.set(key,{...first,created:Date.now()-121000});h.parent.tick();assert.equal(h.gm.get(key).phase,'cancelled');
 assert.equal(p.begin(h.app,{}, {validateScope:()=>true}),false);assert.equal(p.begin(h.app,{}, {validateScope:()=>true},true),true);assert.notEqual(h.gm.get(key).id,first.id);
});
check('missing child expires separately from parent heartbeat; active child remains protected',()=>{
 const h=setup(),p=factory(h.parent,h.gm);p.begin(h.app,{}, {validateScope:()=>true});factory(h.child,{...h.gm,close:()=>h.child.close()}).child(h.adapter);h.parent.tick();h.child.tick();
 assert.equal(p.retryBlocked(h.app),true);assert.equal(p.begin(h.app,{}, {validateScope:()=>true},true),false);
 const r=h.gm.get(key);h.gm.set(key+':child',{id:r.id,nonce:r.nonce,child:r.child,at:Date.now()-181000,seq:2});h.gm.set(key,{...r,created:Date.now()-200000,childBoundAt:Date.now()-181000});h.parent.tick();
 assert.equal(h.gm.get(key).phase,'cancelled');assert.equal(p.retryBlocked(h.app),false);assert.equal(h.app.runs,undefined);assert.equal(p.begin(h.app,{}, {validateScope:()=>true},true),true);
});
check('expired same lesson may retry, while completed and refresh guards never reopen',()=>{
 const h=setup(),p=factory(h.parent,h.gm);p.begin(h.app,{}, {validateScope:()=>true});let r=h.gm.get(key);h.gm.set(key,{...r,expires:0});assert.equal(p.begin(h.app,{}, {validateScope:()=>true}),false);assert.equal(p.begin(h.app,{}, {validateScope:()=>true},true),true);
 r=h.gm.get(key);h.gm.set(key,{...r,phase:'verify',refreshUsed:true});assert.equal(p.begin(h.app,{}, {validateScope:()=>true},true),false);assert.equal(h.parent.location.reloads,undefined);
 h.gm.set(key,{...r,phase:'done',expires:0});assert.equal(p.begin(h.app,{}, {validateScope:()=>true},true),false);
});
console.log(`RESULT: ${passed} focused GM lifecycle checks passed; mocked GM/tabs, not Tampermonkey acceptance.`);
