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
async function initAbbieDashboard(){
 const user=await waitForAbbieUser();
 const fb=getAbbieFirebase();
 if(!user||!fb||fb.uid!==user.uid){
  window.location.href="/auth";
  return null;
 }
 const agent=await fb.getOwnerAgent();
 const statusEl=$("agentStatus");
 const nameEl=$("agentPersonaName");
 const businessEl=$("agentBusinessName");
 const publicUrlEl=$("agentPublicUrl");
 const embedCodeText=$("agentEmbedCodeText");
 const launchBtn=$("agentLaunchBtn");
 const editBtn=$("agentEditBtn");
 const copyUrlBtn=$("agentCopyUrlBtn");
 const copyEmbedBtn=$("agentCopyEmbedBtn");
 const emptyState=$("agentEmptyState");
 const panel=$("agentPanel");
 const createCta=$("agentCreateCta");
 if(!agent){
  if(emptyState)emptyState.style.display="";
  if(panel)panel.style.display="none";
  if(createCta)createCta.style.display="";
  return null;
 }
 if(emptyState)emptyState.style.display="none";
 if(panel)panel.style.display("");
 if(statusEl)statusEl.textContent=String(agent.status||"live");
 if(nameEl)nameEl.textContent=String(agent.personaName||"Sarah");
 if(businessEl)businessEl.textContent=String(agent.businessName||"My Business");
 const publicUrl=agent.slug?`/agent/${agent.slug}`:`/agent/${agent.agentId}`;
 if(publicUrlEl)publicUrlEl.value=publicUrl;
 if(embedCodeText&&agent.slug){
  embedCodeText.value=`<!DOCTYPE html>\n<html>\n<body>\n<iframe src="${window.location.origin}/agent/${agent.slug}" width="100%" height="560" style="border:0;border-radius:18px;background:transparent" allow="microphone; autoplay; clipboard-write" loading="lazy"></iframe>\n</body>\n</html>`;
 }
 if(launchBtn){
  launchBtn.addEventListener("click",()=>{window.location.href=`/agent/${agent.slug}`});
 }
 if(editBtn){
  editBtn.addEventListener("click",()=>{window.location.href="/onboarding"});
 }
 if(copyUrlBtn){
  copyUrlBtn.addEventListener("click",async()=>{
   try{ await navigator.clipboard.writeText(`${window.location.origin}${publicUrl}`); }catch(_){}
  });
 }
 if(copyEmbedBtn){
  copyEmbedBtn.addEventListener("click",async()=>{
   try{ await navigator.clipboard.writeText(embedCodeText?.value||""); }catch(_){}
  });
 }
 const logout=$("agentLogoutBtn");
 if(logout){
  logout.addEventListener("click",async()=>{
   const fb=getAbbieFirebase();
   try{ if(fb&&fb.signOutUser)await fb.signOutUser(); }catch(_){}
   window.location.href="/auth";
  });
 }
 return agent;
}
if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",()=>initAbbieDashboard(),{once:true});}else{initAbbieDashboard();}
