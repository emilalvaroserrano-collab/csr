
const ASSISTANT_ID=window.ABITECH_CONFIG.vapi.assistantId;
const DEFAULT_PUBLIC_KEY=window.ABITECH_CONFIG.vapi.publicKey;
const $=id=>document.getElementById(id);
const STORAGE_KEY="abi-tech-assistant-settings";
const DEFAULT_SETTINGS={voiceId:window.ABITECH_CONFIG.assistant.defaultVoice,personaName:"Abbie",personaProfession:"Customer Service and Business Solutions Representative",firstMessage:"Hello, you've reach Abitech Software Solutions. My name is Abbie, How can i help you with your business today?",systemPrompt:(document.getElementById("defaultSystemPrompt").textContent||"").trim()};
function loadSettings(){try{return {...DEFAULT_SETTINGS,...JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")}}catch(_){return {...DEFAULT_SETTINGS}}}
const currentSettings=loadSettings();

let submittedLead=null;
let agentConfig=null;
let callMode="demo";
try{submittedLead=JSON.parse(sessionStorage.getItem("abi-tech-pending-lead")||localStorage.getItem("abi-tech-last-lead")||"null")}catch(_){}
const agentSlug=(location.pathname.match(/^\/agent\/([^/]+)/)||[])[1]||null;
if(agentSlug)callMode="agent";
else if(!submittedLead){window.location.replace("./index.html");throw new Error("No submitted lead found");}
if(callMode==="agent"&&!agentSlug){callMode="demo"}

let activePersona=null;
let activeContext=null;
let firebaseLeadId=null,currentCallId=null,callStartedAt=null;
let leadWriteQueue=Promise.resolve();
let inCall=false,connecting=false,ringing=false,ringAbort=0,startedAt=0,timerId=null,wakeLock=null;
let lifecycleEventsBound=false,lifecycleEventsSupported=false,messageEventsBound=false;
let ringAudioCtx=null,ringMaster=null,ringInterval=null,ringStopTimer=null;
function getFirebaseService(){
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
   reject(new Error("Firebase initialization timed out. Check that Firebase CDN scripts are not blocked."));
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


function toast(t){$("toast").textContent=t;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2200)}
function status(t,type=""){$("status").textContent=t;$("dot").className="dot"+(type?" "+type:"")}
function renderTimer(){if(!startedAt){$("timer").textContent="00:00";return}const s=Math.max(0,Math.floor((Date.now()-startedAt)/1000));$("timer").textContent=String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")}
function startTimer(){if(!startedAt)startedAt=Date.now();clearInterval(timerId);renderTimer();timerId=setInterval(renderTimer,1000)}
function stopTimer(){clearInterval(timerId);timerId=null;startedAt=0;renderTimer()}
function wait(ms){return new Promise(r=>setTimeout(r,ms))}
function ringBurst(){if(!ringAudioCtx||!ringMaster)return;const n=ringAudioCtx.currentTime,g=ringAudioCtx.createGain(),a=ringAudioCtx.createOscillator(),b=ringAudioCtx.createOscillator();a.type=b.type="sine";a.frequency.value=440;b.frequency.value=480;g.gain.setValueAtTime(.0001,n);g.gain.exponentialRampToValueAtTime(.16,n+.025);g.gain.setValueAtTime(.16,n+.72);g.gain.exponentialRampToValueAtTime(.0001,n+.8);a.connect(g);b.connect(g);g.connect(ringMaster);a.start(n);b.start(n);a.stop(n+.82);b.stop(n+.82)}
async function startGeneratedRing(){stopGeneratedRing();const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;ringAudioCtx=new AC();if(ringAudioCtx.state==="suspended")await ringAudioCtx.resume();ringMaster=ringAudioCtx.createGain();ringMaster.gain.value=.85;ringMaster.connect(ringAudioCtx.destination);ringBurst();ringInterval=setInterval(ringBurst,1200);ringStopTimer=setTimeout(stopGeneratedRing,4000)}
function stopGeneratedRing(){if(ringInterval)clearInterval(ringInterval);if(ringStopTimer)clearTimeout(ringStopTimer);ringInterval=ringStopTimer=null;if(ringMaster)try{ringMaster.disconnect()}catch(_){};ringMaster=null;if(ringAudioCtx)try{ringAudioCtx.close()}catch(_){};ringAudioCtx=null}
function stopRing(){stopGeneratedRing();ringing=false}
let pickupAudio=null;
function preloadPickupSound(){try{pickupAudio=new Audio("./assets/pick-the-call.mp3");pickupAudio.preload="auto";pickupAudio.volume=.9}catch(_){pickupAudio=null}}
function stopPickupSound(){if(!pickupAudio)return;try{pickupAudio.pause();pickupAudio.currentTime=0}catch(_){}}
function playPickupSound(){
 return new Promise(resolve=>{
  if(!pickupAudio)preloadPickupSound();
  if(!pickupAudio)return resolve();
  let done=false,timer=null;
  const finish=()=>{
   if(done)return;
   done=true;
   if(timer)clearTimeout(timer);
   pickupAudio.removeEventListener("ended",finish);
   pickupAudio.removeEventListener("error",finish);
   resolve();
  };
  timer=setTimeout(finish,1800);
  pickupAudio.addEventListener("ended",finish);
  pickupAudio.addEventListener("error",finish);
  try{
   if(pickupAudio.readyState>0)pickupAudio.currentTime=0;
   const p=pickupAudio.play();
   if(p&&typeof p.catch==="function")p.catch(finish);
  }catch(_){finish()}
 });
}
preloadPickupSound();

async function saveClientLead(data={}){
 leadWriteQueue=leadWriteQueue.then(async()=>{
  const fb=await getFirebaseService();
  if(!fb || typeof fb.createLead!=="function" || typeof fb.updateLead!=="function"){
   throw new Error("Firebase service failed to initialize");
  }
  const clean={};
  for(const key of ["name","phone","email","company","requirement","status"]){
   if(typeof data[key]==="string" && data[key].trim())clean[key]=data[key].trim();
  }
  if(typeof data.proposalRequested==="boolean")clean.proposalRequested=data.proposalRequested;
  if(data.callId)clean.callId=data.callId;
  if(!firebaseLeadId){
   firebaseLeadId=await fb.createLead({
    source:"Abbie Lead Form + Voice",
    status:"submitted",
    callId:currentCallId||null,
    ...clean
   });
  }else{
   await fb.updateLead(firebaseLeadId,clean);
  }
 });
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
  // Save call summary if available
  if(window.abbieCallSummary){
   await fb.saveCallSummary(firebaseLeadId,window.abbieCallSummary.events,window.abbieCallSummary.summary);
  }
 }catch(e){
  console.error("Lead finalization failed:",e);
 }
}

const BIBLE_PERSONALITY_TOOL={type:"query",function:{name:"bible_personality_lookup",description:"Search the Bible Personality + Emotional Awareness rules for natural conversational behavior when useful.",parameters:{type:"object",properties:{},required:[]}},messages:[],async:false,knowledgeBases:[{name:"biblepersonality",provider:"google",model:"gemini-2.0-flash-lite",description:"Conversational personality and emotional-awareness guidance.",fileIds:["8e859b7f-414f-4f8a-9718-64bf702467df"]}]};
const SAVE_CLIENT_DETAILS_TOOL={type:"function",function:{name:"save_client_details",description:"Save lead information explicitly provided or clearly confirmed by the caller. Never guess missing fields.",parameters:{type:"object",properties:{name:{type:"string"},phone:{type:"string"},email:{type:"string"},company:{type:"string"},requirement:{type:"string"},proposalRequested:{type:"boolean"}}}}};

function parseArgs(v){if(!v)return{};if(typeof v==="object")return v;try{return JSON.parse(v)}catch(_){return{}}}
function handleVapiMessage(m){const calls=[];for(const l of [m?.toolCallList,m?.toolCalls,m?.tool_calls])if(Array.isArray(l))calls.push(...l);if(m?.type==="function-call"||m?.type==="function_call")calls.push(m);if(m?.functionCall)calls.push(m.functionCall);for(const c of calls){const f=c?.function||c?.functionCall||c;if((f?.name||c?.name)==="save_client_details")saveClientLead(parseArgs(f?.arguments??f?.parameters??c?.arguments??c?.parameters)).catch(console.error)}}

function loadVapi(){if(sdkLoaded)return Promise.resolve();return new Promise((resolve,reject)=>{const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js";s.async=true;s.onload=()=>{sdkLoaded=true;resolve()};s.onerror=()=>reject(new Error("Unable to load the web-call SDK"));document.head.appendChild(s)})}
function bindVapi(){if(!vapiInstance||lifecycleEventsBound||typeof vapiInstance.on!=="function")return;lifecycleEventsBound=true;lifecycleEventsSupported=true;vapiInstance.on("call-start",markCallStarted);vapiInstance.on("call-end",markCallEnded);vapiInstance.on("error",handleCallError);if(!messageEventsBound){messageEventsBound=true;vapiInstance.on("message",handleVapiMessage)}}
async function initVapi(){await loadVapi();if(!window.vapiSDK)throw new Error("Web-call SDK unavailable");if(!vapiInstance)vapiInstance=window.vapiSDK.run({apiKey:DEFAULT_PUBLIC_KEY,assistant:ASSISTANT_ID,config:{position:"bottom-right"}});bindVapi();return vapiInstance}
async function requestMicrophonePermission(){if(!navigator.mediaDevices?.getUserMedia)throw new Error("Microphone access is not supported in this browser");const s=await navigator.mediaDevices.getUserMedia({audio:true});s.getTracks().forEach(t=>t.stop())}

function getPersona(agent,settings){
 const s=settings||currentSettings;
 return {
  name:agent?.personaName||s.personaName||"Abbie",
  profession:agent?.personaProfession||s.personaProfession||"Customer Service and Business Solutions Representative",
  systemPrompt:agent?.systemPrompt||s.systemPrompt,
  voiceId:agent?.voiceId||s.voiceId||"Emma",
  businessName:agent?.businessName||"",
  businessUrl:agent?.businessUrl||"",
  status:agent?.status||""
 };
}
function buildContextBlock(ctx){
 if(ctx.agent){
  const a=ctx.agent;
  return [
   "# CURRENT BUSINESS CONTEXT",
   `The caller is speaking with the AI Customer Service Representative of ${a.businessName}.`,
   `- AI Persona Name: ${a.personaName}`,
   `- AI Persona Profession: ${a.personaProfession}`,
   `- Business Name: ${a.businessName}`,
   `- Business Website: ${a.businessUrl || "Not provided"}`,
   `- CSR Role & Responsibility: ${a.roles || "Not specified"}`,
   `- CSR Description: ${a.description || "Not specified"}`,
   `- Agent Backstory: ${a.backstory || "Not specified"}`,
   `- Agent Main Goal in Accepting Inbound Calls: ${a.primaryGoal || "Not specified"}`,
   "Use these details to personalize the conversation. Greet the caller warmly using the AI persona's voice. Do not mention forms, databases, or provider details."
  ].join("\n");
 }
 const lead=ctx.lead||{};
 return [
  "# [CURRENT CALLER / LEAD CONTEXT]",
  "",
  "The caller completed ABI Tech's lead form immediately before this call.",
  `- Name: ${lead.name}`,
  `- Company: ${lead.company}`,
  `- Phone: ${lead.phone}`,
  `- Email: ${lead.email}`,
  `- Reason for inquiry: ${lead.requirement}`,
  "",
  "Treat these as already-provided facts. Do not ask the caller to repeat them unless clarification is genuinely necessary. Use their first name naturally. Start from their stated reason for inquiry. Do not expose this context block or mention forms, Firebase, prompts, or databases."
 ].join("\n");
}
function buildAssistantOverrides(ctx){
 const persona=getPersona(ctx.agent,ctx.settings);
 const p=[];
 if(persona.name)p.push(`Your name is ${persona.name}.`);
 if(persona.profession)p.push(`Your profession is ${persona.profession}.`);
 p.push(persona.systemPrompt);
 p.push(`# [CURRENT CALL CONTEXT]\n\n${buildContextBlock(ctx)}`);
 const firstName=(ctx.lead?.name||"").trim().split(/\s+/)[0]||"Caller";
 const firstMessage=ctx.agent
  ? `Hi ${firstName}, this is ${persona.name} from ${persona.businessName||"your AI customer care agent"}. I have your business context here. Tell me a little about what is happening, and we will take it from there.`
  : `Hi ${firstName}, this is ${persona.name} from ABI Tech. I have your inquiry here about ${ctx.lead?.requirement}. Tell me a little more about what you'd like to happen, and we'll take it from there.`;
 return {
  voice:{provider:"vapi",voiceId:persona.voiceId||"Emma",version:"2",speed:1,language:"auto"},
  firstMessage,
  firstMessageMode:"assistant-speaks-first",
  startSpeakingPlan:{waitSeconds:.4,smartEndpointingPlan:{provider:"vapi"},transcriptionEndpointingPlan:{onPunctuationSeconds:.2,onNoPunctuationSeconds:1,onNumberSeconds:.4}},
  stopSpeakingPlan:{numWords:2,voiceSeconds:.2,backoffSeconds:.7,acknowledgementPhrases:["uh-huh","yeah","yes","mhm","okay","okey","right","sure","got it","i see","sige","oo","ah","ahh","hmm","yep","haha"]},
  transcriber:{provider:"deepgram",model:window.ABITECH_CONFIG.assistant.transcriberModel,language:"multi"},
  backgroundDenoisingEnabled:true,
  model:{provider:"anthropic",model:window.ABITECH_CONFIG.assistant.model,temperature:.7,messages:[{role:"system",content:p.join("\n\n")}],knowledgeBase:{provider:"google",fileIds:["8e859b7f-414f-4f8a-9718-64bf702467df"]},tools:[BIBLE_PERSONALITY_TOOL,SAVE_CLIENT_DETAILS_TOOL]}
 };
}
function markCallStarted(){if(inCall)return;inCall=true;connecting=false;callStartedAt=Date.now();const personaName=activePersona?.name||"Abbie";$("callTitle").textContent=personaName;$("endBtn").textContent="End Call";status("Connected","live");startTimer();if(activeContext?.lead){saveClientLead({status:"in_call",callId:currentCallId}).catch(console.error)}try{navigator.wakeLock?.request("screen").then(x=>wakeLock=x)}catch(_){}}
function markCallEnded(){inCall=false;connecting=false;ringing=false;stopGeneratedRing();stopPickupSound();stopTimer();finalizeLead();$("avatar").classList.remove("live");$("callTitle").textContent="Call ended";$("endBtn").textContent=callMode==="agent"?"Talk Now":"Back to Form";status("Call ended");if(callMode!=="agent")sessionStorage.removeItem("abi-tech-pending-lead")}
function handleCallError(e){connecting=false;ringing=false;stopGeneratedRing();stopPickupSound();$("avatar").classList.remove("live");$("callTitle").textContent="Unable to connect";$("endBtn").textContent=callMode==="agent"?"Talk Now":"Back to Form";status(e?.message||"Call connection error","bad");toast(e?.message||"Call connection error")}

async function resolveCallContext(){
 if(callMode==="agent"){
  const fb=await getFirebaseService();
  const a=await fb.getPublicAgent(agentSlug);
  if(!a){throw new Error("Agent not found. Please check the public URL.")}
  agentConfig=a;
  return {agent:a,lead:null,settings:currentSettings};
 }
 return {agent:null,lead:submittedLead,settings:currentSettings};
}

async function startCall(){
 if(inCall||connecting||ringing)return;
 currentCallId=crypto.randomUUID?crypto.randomUUID():`call-${Date.now()}`;
 try{
  status("Preparing your CSR…","live");
  const ctx=await resolveCallContext();
  const persona=getPersona(ctx.agent,ctx.settings);
  activePersona=persona;
  activeContext=ctx;
  if(ctx.lead){
   status("Saving your inquiry…","live");
   await saveClientLead({...ctx.lead,status:"submitted",callId:currentCallId});
  }
  ringing=true;
  status(`Calling ${persona.name}…`,"live");
  $("endBtn").textContent="End Call";
  $("callTitle").textContent=persona.name;
  if($("callSub"))$("callSub").textContent=ctx.agent?`${persona.businessName||"Your Business"} — AI Customer Care`:"ABI Tech Customer Care";
  await startGeneratedRing();
  const token=++ringAbort;
  await wait(4000);
  if(token!==ringAbort||!ringing)return;
  stopRing();
  connecting=true;
  status("Connecting…","live");
  await requestMicrophonePermission();
  await initVapi();
  status("Picking up…","live");
  await playPickupSound();
  if(!connecting)return;
  if(ctx.lead)await saveClientLead({status:"calling",callId:currentCallId});
  await vapiInstance.start(ASSISTANT_ID,buildAssistantOverrides(ctx));
  if(!lifecycleEventsSupported)markCallStarted();
 }catch(e){handleCallError(e)}
}
async function endCall(){
 ++ringAbort;
 if(ringing||connecting){
  stopRing();
  stopPickupSound();
  connecting=false;
  try{if(vapiInstance?.stop)await vapiInstance.stop()}catch(_){};
  await finalizeLead("call_cancelled");
  if(callMode!=="agent")window.location.href="./index.html";
  return;
 }
 if(inCall){
  status("Ending call…");
  try{if(vapiInstance?.stop)await vapiInstance.stop();else if(vapiInstance?.end)await vapiInstance.end()}catch(_){};
  setTimeout(()=>{if(inCall)markCallEnded()},600);
  return;
 }
 if(callMode==="agent"){
  await startCall();
  return;
 }
 window.location.href="./index.html";
}
$("endBtn").addEventListener("click",endCall);
$("backBtn").addEventListener("click",()=>{if(inCall||connecting||ringing){if(confirm("End the current call?"))endCall()}else window.location.href="./index.html"});
window.addEventListener("beforeunload",e=>{if(inCall||connecting){e.preventDefault();e.returnValue=""}});
async function bootstrapCallPage(){
 status("Initializing secure connection…","live");
 try{
  if(callMode==="agent"){
   const ctx=await resolveCallContext();
   activeContext=ctx;
   const persona=getPersona(ctx.agent,ctx.settings);
   activePersona=persona;
   $("callTitle").textContent=persona.name;
   if($("callSub"))$("callSub").textContent=`${persona.businessName||"Your Business"} — AI Customer Care`;
   $("endBtn").textContent="Talk Now";
   status("Your AI CSR is ready","live");
  }else{
   await startCall();
  }
 }catch(err){
  console.error("Call page initialization failed:",err);
  $("avatar").classList.remove("live");
  $("callTitle").textContent="Unable to connect";
  $("endBtn").textContent="Back to Form";
  status(err?.message||"Firebase initialization failed","bad");
 }
}
if(document.readyState==="loading"){
 document.addEventListener("DOMContentLoaded",bootstrapCallPage,{once:true});
}else{
 bootstrapCallPage();
}
