function $(id){return document.getElementById(id)}
function getAbbieFirebase(){return window.abbieFirebase||null}
function waitForAbbieUser(){
 if(window.abbieAuthUser&&window.abbieAuthUser.uid)return Promise.resolve(window.abbieAuthUser);
 if(window.abbieFirebase&&window.abbieFirebaseReady&&window.abbieFirebase.uid)return Promise.resolve({uid:window.abbieFirebase.uid});
 return new Promise((resolve)=>{
  let settled=false;
  const done=()=>{ if(settled)return; settled=true; window.clearTimeout(timer); window.removeEventListener("abbie-firebase-ready",check); window.removeEventListener("abbie-auth-change",check); resolve(window.abbieAuthUser||{uid:window.abbieFirebase?.uid||"anonymous"}); };
  const check=()=>{ if(window.abbieAuthUser||window.abbieFirebase?.uid)done(); };
  window.addEventListener("abbie-firebase-ready",check);
  window.addEventListener("abbie-auth-change",check);
  const timer=setTimeout(done,8000);
 });
}
function note(msg){
 const el=$("authNote")||document.querySelector(".note");
 if(el){el.textContent=msg||"";el.style.color="#fbbf24"}
}
async function handleAgentSubmit(e){
 e.preventDefault();
 const submit=$("agentSubmit");
 const personaName=String($("agentPersonaName")?.value||"").trim();
 const businessName=String($("agentBusinessName")?.value||"").trim();
 const businessUrl=String($("agentBusinessUrl")?.value||"").trim();
 const roles=String($("agentRoles")?.value||"").trim();
 const description=String($("agentDescription")?.value||"").trim();
 const backstory=String($("agentBackstory")?.value||"").trim();
 const primaryGoal=String($("agentPrimaryGoal")?.value||"").trim();
 const personaProfession=String($("agentPersonaProfession")?.value||"").trim()||"Customer Service and Business Solutions Representative";
 const voiceId=String($("agentVoiceId")?.value||"");
 const status=String($("agentStatus")?.value||"live");
 if(submit){submit.disabled=true;submit.textContent="Creating your AI CSR…"}
 try{
  const fb=getAbbieFirebase();
  if(!fb)throw new Error("Firebase is not connected. Check your internet connection and reload.");
  const user=await waitForAbbieUser();
  const systemPrompt=composeSystemPrompt({personaName,personaProfession,businessName,businessUrl:businessUrl||"Not provided",roles,description,backstory,primaryGoal});
  const finalSlug=$("agentSlug")?.value||await generateAgentSlug(businessName,personaName);
  if($("agentSlugText"))$("agentSlugText").textContent='/agent/'+finalSlug;
  const agentObject={
   ownerUid:user.uid,
   agentId:String($("agentId")?.value||"")||buildAgentId(user.uid),
   slug:finalSlug,
   personaName,
   personaProfession,
   businessName,
   businessUrl,
   roles,
   description,
   backstory,
   primaryGoal,
   status,
   voiceId,
   systemPrompt
  };
  const savedSlug=await fb.saveAgent(agentObject);
  window.dispatchEvent(new CustomEvent("abbie-agent-saved",{detail:{slug:savedSlug}}));
  window.location.href=`/agent/${savedSlug}`;
 }catch(err){
  note(err?.message||String(err));
  if(submit){submit.disabled=false;submit.textContent="Create My AI CSR Agent"}
 }
}
function bindForm(){
 const form=$("agentForm");
 if(form&&form.dataset.bound!=="1"){
  form.dataset.bound="1";
  form.addEventListener("submit",handleAgentSubmit);
 }
}
async function initAbbieOnboarding(){
 bindForm(); // attach submit handler BEFORE firebase initializes so the button always works
 const user=await waitForAbbieUser();
 const fb=getAbbieFirebase();
 if(!user||!(fb&&fb.getOwnerAgent)){ note("Firebase is not connected — please reload in a moment."); return; }
 const agent=await fb.getOwnerAgent();
 if(agent){
  if($("agentPersonaName"))$("agentPersonaName").value=String(agent.personaName||"Abbie");
  if($("agentBusinessName"))$("agentBusinessName").value=String(agent.businessName||"ABI Tech");
  if($("agentBusinessUrl"))$("agentBusinessUrl").value=String(agent.businessUrl||"");
  if($("agentRoles"))$("agentRoles").value=String(agent.roles||"");
  if($("agentDescription"))$("agentDescription").value=String(agent.description||"");
  if($("agentBackstory"))$("agentBackstory").value=String(agent.backstory||"");
  if($("agentPrimaryGoal"))$("agentPrimaryGoal").value=String(agent.primaryGoal||"");
  if($("agentVoiceId"))$("agentVoiceId").value=String(agent.voiceId||"Emma");
  if($("agentStatus"))$("agentStatus").textContent=String(agent.status||"live");
  if($("agentId"))$("agentId").value=String(agent.agentId||"");
  if($("agentSlug"))$("agentSlug").value=String(agent.slug||"");
  if($("agentSlugText"))$("agentSlugText").textContent='/agent/'+String(agent.slug||"");
 }
}
if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",initAbbieOnboarding,{once:true});}else{initAbbieOnboarding();}