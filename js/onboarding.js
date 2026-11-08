function $(id){return document.getElementById(id)}
function getAbbieFirebase(){return window.abbieFirebase||null}
function waitForAbbieUser(){
 if(window.abbieAuthUser&&window.abbieAuthUser.uid)return Promise.resolve(window.abbieAuthUser);
 if(window.abbieFirebase&&window.abbieFirebaseReady&&window.abbieFirebase.uid)return Promise.resolve({uid:window.abbieFirebase.uid});
 return new Promise((resolve)=>{
  let settled=false;
  const done=()=>{ if(settled)return; settled=true; window.clearTimeout(timer); window.removeEventListener("abbie-firebase-ready",check); window.removeEventListener("abbie-auth-change",check); resolve(window.abbieAuthUser||{uid:window.abbieFirebase?.uid||"anonymous"}); };
  const check=()=>{ if(window.abbieAuthUser)done(); };
  window.addEventListener("abbie-firebase-ready",check);
  window.addEventListener("abbie-auth-change",check);
  const timer=setTimeout(done,15000);
 });
}
async function initAbbieOnboarding(){
 const user=await waitForAbbieUser();
 const fb=getAbbieFirebase();
 if(!user||!(fb&&fb.getOwnerAgent)){
  window.location.href="/auth";
  return null;
 }
 const agent=await fb.getOwnerAgent();
 /* New users see the prefilled Abbie defaults; edit mode loads their stored values. */
 if(agent){
  if($("agentPersonaName"))$("agentPersonaName").value=String(agent.personaName||"Abbie");
  if($("agentPersonaProfession"))$("agentPersonaProfession").value=String(agent.personaProfession||"Customer Service and Business Solutions Representative");
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
 }
 const form=$("agentForm");
 if(!form)return;
 form.addEventListener("submit",async e=>{
  e.preventDefault();
  const fbNow=getAbbieFirebase();
  if(!fbNow){ window.location.href="/auth"; return; }
  const personaName=String($("agentPersonaName")?.value||"").trim();
  const personaProfession=String($("agentPersonaProfession")?.value||"").trim();
  const businessName=String($("agentBusinessName")?.value||"").trim();
  const businessUrl=String($("agentBusinessUrl")?.value||"").trim();
  const roles=String($("agentRoles")?.value||"").trim();
  const description=String($("agentDescription")?.value||"").trim();
  const backstory=String($("agentBackstory")?.value||"").trim();
  const primaryGoal=String($("agentPrimaryGoal")?.value||"").trim();
  const voiceId=String($("agentVoiceId")?.value||"");
  const status=String($("agentStatus")?.value||"live");
  const agentId=String($("agentId")?.value||"");
  const slug=String($("agentSlug")?.value||"");
  const submit=$("agentSubmit");
  if(submit){submit.disabled=true;submit.textContent="Creating your AI CSR…"}
  try{
   const systemPrompt=composeSystemPrompt({
    personaName,
    personaProfession:personaProfession||"Customer Service and Business Solutions Representative",
    businessName,
    businessUrl:businessUrl||"Not provided",
    roles,
    description,
    backstory,
    primaryGoal
   });
   const finalSlug=slug||await generateAgentSlug(businessName,personaName);
   if($("agentSlugText"))$("agentSlugText").textContent='/agent/'+finalSlug;
   const finalAgentId=agentId||buildAgentId(user.uid);
   const agentObject={
    ownerUid:user.uid,
    agentId:finalAgentId,
    slug:finalSlug,
    personaName,
    personaProfession:personaProfession||"Customer Service and Business Solutions Representative",
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
   const savedSlug=await fbNow.saveAgent(agentObject);
   window.dispatchEvent(new CustomEvent("abbie-agent-saved",{detail:{slug:savedSlug,agentId:finalAgentId}}));
   window.location.href=`/agent/${savedSlug}`;
  }catch(err){
   if(submit){submit.disabled=false;submit.textContent="Create My AI CSR Agent"}
   window.dispatchEvent(new CustomEvent("abbie-agent-error",{detail:{message:err?.message||String(err)}}));
  }
  });
}
if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",initAbbieOnboarding,{once:true});}else{initAbbieOnboarding();}
