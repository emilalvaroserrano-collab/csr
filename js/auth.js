function $(id){return document.getElementById(id)}
function getAbbieFirebase(){
 return window.abbieFirebase||null;
}
function waitForAbbieUser(){
 if(window.abbieAuthUser&&window.abbieAuthUser.uid)return Promise.resolve(window.abbieAuthUser);
 if(window.abbieFirebase&&window.abbieFirebaseReady&&window.abbieFirebase.uid)return Promise.resolve({uid:window.abbieFirebase.uid});
 return new Promise((resolve)=>{
  let settled=false;
  const done=()=>{ if(settled)return; settled=true; window.clearTimeout(timer); window.removeEventListener("abbie-firebase-ready",check); window.removeEventListener("abbie-auth-change",check); resolve(window.abbieAuthUser||{uid:window.abbieFirebase?.uid||"anonymous"}); };
  const check=()=>{ if(window.abbieAuthUser||window.abbieFirebase?.uid)done(); };
  window.addEventListener("abbie-firebase-ready",check);
  window.addEventListener("abbie-auth-change",check);
  const timer=setTimeout(done,15000);
 });
}
async function getAbbieOwnerAgent(user){
 const fb=getAbbieFirebase();
 if(!fb)return null;
 try{return await fb.getOwnerAgent()}catch(_){return null}
}
function redirectAbbieUser(user){
 if(!user)return;
 getAbbieOwnerAgent(user).then(agent=>{
  window.location.href=agent?"/dashboard":"/onboarding";
 }).catch(()=>window.location.href="/onboarding");
}
function showAbbieAuthError(message){
 const el=$("authError");
 if(el){el.textContent=message||"";el.classList.add("show")}
 const submit=$("authSubmit");
 if(submit){submit.dataset.busy="false";submit.disabled=false;submit.textContent="Create Account"}
}
function setAbbieAuthBusy(busy){
 const submit=$("authSubmit");
 if(submit){submit.dataset.busy=busy?"true":"false";submit.disabled=busy}
 const google=$("googleAuthBtn");
 if(google){google.disabled=busy}
 const note=$("authNote");
 if(note){note.textContent=busy?"Creating your AI CSR…":""}
}
async function handleAbbieAuthSubmit(e){
 e.preventDefault();
 const email=String($("authEmail")?.value||"").trim();
 const password=String($("authPassword")?.value||"");
 const mode=String($("authMode")?.value||"signin");
 if(!email||!password)return;
 setAbbieAuthBusy(true);
 try{
  const fb=getAbbieFirebase();
  const user=mode==="signup"?await fb.signUp(email,password,String($("authName")?.value||"").trim()):await fb.signIn(email,password);
  window.dispatchEvent(new CustomEvent("abbie-auth-pending",{detail:{user}}));
 }catch(err){
  setAbbieAuthBusy(false);
  showAbbieAuthError(err?.message??"Unable to sign in with email. Please try again.");
 }
}
async function handleAbbieGoogleAuth(e){
 e.preventDefault();
 setAbbieAuthBusy(true);
 try{
  const fb=getAbbieFirebase();
  const user=await fb.signInWithGoogle();
  window.dispatchEvent(new CustomEvent("abbie-auth-pending",{detail:{user}}));
 }catch(err){
  setAbbieAuthBusy(false);
  showAbbieAuthError(err?.message??"Google sign-in failed. Please try again.");
 }
}
function initAbbieAuthPage(){
 const form=$("authForm");
 if(form){
  form.addEventListener("submit",handleAbbieAuthSubmit);
 }
 const google=$("googleAuthBtn");
 if(google){
  google.addEventListener("click",handleAbbieGoogleAuth);
 }
 const mode=$("authMode");
 if(mode){
  mode.addEventListener("change",()=>{
   const isSignup=mode.value==="signup";
   const nameField=$("authName");
   if(nameField)nameField.style.display=isSignup?"block":"none";
   const label=$("authSubmit");
   if(label)label.textContent=isSignup?"Create Account":"Sign In";
  });
 }
 window.addEventListener("abbie-auth-change",e=>{
  const user=e?.detail?.user||null;
  if(user&&window.location.pathname!=="/auth")return;
  redirectAbbieUser(user);
 });
}
function initAbbieAuthRedirect(){
 const launch=()=>waitForAbbieUser().then(user=>{ redirectAbbieUser(user); return user; });
 const hasAuthUi=!!document.getElementById("authForm");
 if(!hasAuthUi)return;
 if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",launch,{once:true});}else{launch();}
}
if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",initAbbieAuthPage,{once:true});}else{initAbbieAuthPage();}
if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",initAbbieAuthRedirect,{once:true});}else{initAbbieAuthRedirect();}
