import { Room, RoomEvent, Track } from 'https://esm.sh/livekit-client@2';

const $=id=>document.getElementById(id);
const STORAGE_KEY="abi-tech-assistant-settings";
const DEFAULT_SETTINGS={voiceId:window.ABITECH_CONFIG.assistant.defaultVoice,personaName:"Samantha",personaProfession:"Customer Service and Business Solutions Representative",firstMessage:"Hi, thanks for calling Abitech Services. I can help with questions, troubleshooting, or account issues. What are you trying to do today?"};
function loadSettings(){try{return {...DEFAULT_SETTINGS,...JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")}}catch(_){return {...DEFAULT_SETTINGS}}}
const currentSettings=loadSettings();

let submittedLead=null;
let agentConfig=null;
let callMode="demo";
try{submittedLead=JSON.parse(sessionStorage.getItem("abi-tech-pending-lead")||localStorage.getItem("abi-tech-last-lead")||"null")}catch(_){}
const agentSlug=(location.pathname.match(/^\/agent\/([^/]+)/)||[])[1]||null;
if(agentSlug)callMode="agent";
else if(!submittedLead){window.location.replace("/index.html");throw new Error("No submitted lead found");}
if(callMode==="agent"&&!agentSlug)callMode="demo";

let activePersona=null;
let activeContext=null;
let firebaseLeadId=null,currentCallId=null,callStartedAt=null;
let leadWriteQueue=Promise.resolve();
let room=null,micEnabled=false,startedAt=0,timerId=null,connecting=false,inCall=false,ended=false;
const $st=id=>document.getElementById(id);

function toast(t){$st("toast").textContent=t;$st("toast").classList.add("show");setTimeout(()=>$st("toast").classList.remove("show"),2200)}
function status(t,type=""){$st("status").textContent=t;$st("dot").className="dot"+(type?" "+type:"")}
function renderTimer(){if(!startedAt){$st("timer").textContent="00:00";return}const s=Math.max(0,Math.floor((Date.now()-startedAt)/1000));$st("timer").textContent=String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")}
function startTimer(){if(!startedAt)startedAt=Date.now();clearInterval(timerId);renderTimer();timerId=setInterval(renderTimer,1000)}
function stopTimer(){clearInterval(timerId);timerId=null;startedAt=0;renderTimer()}
function wait(ms){return new Promise(r=>setTimeout(r,ms))}

async function getFirebaseService(){
 if(window.abbieFirebaseReady && window.abbieFirebase){
  return Promise.resolve(window.abbieFirebase);
 }
 if(window.abbieFirebaseError){
  return Promise.reject(window.abbieFirebaseError);
 }
 return new Promise((resolve,reject)=>{
  let done=false;
  const cleanup=()=>{
   window.removeEventListener("abbie-firebase-ready",onReady);
   window.removeEventListener("abbie-firebase-error",onError);
   clearTimeout(timeout);
  };
  const onReady=()=>{
   if(done)return; done=true; cleanup();
   resolve(window.abbieFirebase);
  };
  const onError=e=>{
   if(done)return; done=true; cleanup();
   reject(new Error(e?.detail?.message||"Firebase failed to initialize"));
  };
  window.addEventListener("abbie-firebase-ready",onReady,{once:true});
  window.addEventListener("abbie-firebase-error",onError,{once:true});
  const timeout=setTimeout(()=>{
   if(done)return; done=true; cleanup();
   reject(new Error("Firebase initialization timed out."));
  },15000);
  if(window.firebaseReady && typeof window.firebaseReady.then==="function"){
   window.firebaseReady.then(api=>{
    if(done)return; done=true; cleanup(); resolve(api);
   }).catch(err=>{
    if(done)return; done=true; cleanup(); reject(err);
   });
  }
 });
}

async function saveClientLead(data={}){
 leadWriteQueue=leadWriteQueue.then(async()=>{
  const fb=await getFirebaseService();
  if(!fb || typeof fb.createLead!=="function" || typeof fb.updateLead!=="function"){
   return;
  }
  const clean={};
  for(const key of ["name","phone","email","company","requirement","status"]){
   if(typeof data[key]==="string" && data[key].trim())clean[key]=data[key].trim();
  }
  if(typeof data.proposalRequested==="boolean")clean.proposalRequested=data.proposalRequested;
  if(data.callId)clean.callId=data.callId;
  if(!firebaseLeadId){
   firebaseLeadId=await fb.createLead({
    source:"LiveKit CSR + Voice",
    status:"submitted",
    callId:currentCallId||null,
    ...clean
   });
  }else{
   await fb.updateLead(firebaseLeadId,clean);
  }
 }).catch(e=>console.error("Lead save failed:",e));
 return leadWriteQueue;
}

async function finalizeLead(value="call_ended"){
 try{
  if(!firebaseLeadId)return;
  const fb=await getFirebaseService();
  await fb.updateLead(firebaseLeadId,{
   status:value,
   callEndedAt:fb.serverTime(),
   durationSeconds:callStartedAt?Math.max(0,Math.floor((Date.now()-callStartedAt)/1000)):0
  });
 }catch(e){
  console.error("Lead finalization failed:",e);
 }
}

async function connectToLiveKit(){
 const tokenUrl=(window.ABITECH_CONFIG.livekit&&window.ABITECH_CONFIG.livekit.tokenUrl)||("http://127.0.0.1:5087/api/livekit/token");
 status("Connecting…","live");
 const headers={"Content-Type":"application/json"};
 if(window.ABITECH_CONFIG.livekit.sharedKey)headers["x-agent-key"]=window.ABITECH_CONFIG.livekit.sharedKey;
 const r=await fetch(tokenUrl,{method:"POST",headers,credentials:"same-origin"});
 if(!r.ok){
  let detail="Voice session unavailable";
  try{detail=(await r.json()).detail||detail}catch(_){}
  throw new Error(detail);
 }
 const {serverUrl,token}=await r.json();
 room=new Room({adaptiveStream:true,dynacast:true});
 room.on(RoomEvent.TrackSubscribed,track=>{
  if(track.kind===Track.Kind.Audio){
   const el=track.attach();
   el.autoplay=true;
   document.body.appendChild(el);
  }
 });
 room.on(RoomEvent.TrackUnsubscribed,track=>track.detach().forEach(el=>el.remove()));
 room.on(RoomEvent.Disconnected,()=>{ inCall=false; if(!ended)handleCallEnded(); });
 await room.connect(serverUrl,token);
 await room.localParticipant.setMicrophoneEnabled(true);
}

async function startCall(){
 if(connecting||inCall||ended)return;
 connecting=true;
 currentCallId=crypto.randomUUID?crypto.randomUUID():`call-${Date.now()}`;
 try{
  status("Preparing your CSR…","live");
  if(callMode==="demo"&&submittedLead){
   await saveClientLead({...submittedLead,status:"submitted",callId:currentCallId});
  }
  await connectToLiveKit();
  inCall=true; connecting=false; ended=false; callStartedAt=Date.now();
  $("avatar").classList.remove("live");
  $("callTitle").textContent=currentSettings.personaName||"Samantha";
  $("callSub").textContent="Abitech Services — AI Customer Support";
  $("endBtn").textContent="End Call";
  status("Connected","live");
  startTimer();
  if(callMode==="demo")saveClientLead({status:"in_call",callId:currentCallId}).catch(console.error);
 }catch(e){
  connecting=false;
  handleCallError(e?.message||String(e));
 }
}

function handleCallEnded(){
 ended=true; connecting=false; inCall=false;
 stopTimer();
 finalizeLead("call_ended");
 $("avatar").classList.remove("live");
 $("callTitle").textContent="Call ended";
 $("endBtn").textContent=callMode==="agent"?"Talk Now":"Back to Form";
 $("endBtn").classList.toggle("talk-now",callMode==="agent");
 status("Call ended","");
 if(callMode!=="agent")sessionStorage.removeItem("abi-tech-pending-lead");
}
function handleCallError(msg){
 ended=false; connecting=false; inCall=false;
 $("avatar").classList.remove("live");
 $("callTitle").textContent="Unable to connect";
 $("endBtn").textContent=callMode==="agent"?"Talk Now":"Back to Form";
 $("endBtn").classList.toggle("talk-now",callMode==="agent");
 status(msg,"bad");
 toast(msg);
}

async function endCall(){
 if(ended){return;}
 if(connecting||inCall){
  const old=room; room=null;
  try{ if(old)await old.disconnect(); }catch(_){}
  if(callMode==="agent"){ handleCallEnded(); return; }
  handleCallEnded(); return;
 }
 if(callMode==="agent"){ await startCall(); return; }
 window.location.href="/index.html";
}
$("endBtn").addEventListener("click",endCall);
$("backBtn").addEventListener("click",()=>{if(inCall||connecting){if(confirm("End the current call?"))endCall()}else window.location.href=callMode==="agent"?"/agent":"/index.html"});
window.addEventListener("beforeunload",e=>{if(inCall||connecting){e.preventDefault();e.returnValue=""}});
function bootstrap(){
 status("Initializing secure connection…","live");
 if(callMode==="agent"){
  $("callTitle").textContent=currentSettings.personaName||"Samantha";
  if($("callSub"))$("callSub").textContent="Abitech Services — AI Customer Support";
  $("endBtn").textContent="Talk Now";
  $("endBtn").classList.add("talk-now");
  status("Your AI CSR is ready","live");
 }else{
  startCall();
 }
}
if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",bootstrap,{once:true});}else{bootstrap();}
