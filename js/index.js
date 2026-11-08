const form=document.getElementById("leadForm");
if(form){
 form.addEventListener("submit",e=>{
  e.preventDefault();
  if(!form.reportValidity())return;
  const lead={
   name:document.getElementById("leadName").value.trim(),
   company:document.getElementById("leadCompany").value.trim(),
   requirement:document.getElementById("leadReason").value.trim(),
   phone:document.getElementById("leadPhone").value.trim(),
   email:document.getElementById("leadEmail").value.trim(),
   submittedAt:Date.now()
  };
  try{
   sessionStorage.setItem("abi-tech-pending-lead",JSON.stringify(lead));
   localStorage.setItem("abi-tech-last-lead",JSON.stringify(lead));
   window.location.assign("./calling.html");
  }catch(err){
   console.error(err);
   alert("Your browser blocked site storage. Please allow storage and try again.");
  }
 });
}
function updateCreateCta(){
 const link=document.getElementById("createAgentCta");
 if(!link)return;
 waitForAbbieUser().then(user=>{
  const fb=getAbbieFirebase();
  if(!fb)return;
  if(typeof fb.getOwnerAgent==="function"){
   fb.getOwnerAgent().then(agent=>{
    link.href=agent?"/dashboard":"/onboarding";
   }).catch(()=>{link.href="/onboarding"});
  }else{
   link.href="/onboarding";
  }
 }).catch(()=>{link.href="/auth"});
}
function initLanding(){
 const createLink=document.getElementById("createAgentCta");
 if(createLink)updateCreateCta();
 const demoLink=document.getElementById("demoAbbieCta");
 if(demoLink)demoLink.href="/demo";
}
if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",initLanding,{once:true});}else{initLanding();}
