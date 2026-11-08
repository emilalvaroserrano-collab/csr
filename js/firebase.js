import {initializeApp} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {getAuth,signInAnonymously,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,signInWithPopup,signOut,GoogleAuthProvider,updateProfile} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import {getDatabase,ref,push,update,get,set,serverTimestamp} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

const firebaseConfig=window.ABITECH_CONFIG.firebase;
const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getDatabase(app);

let readyResolve,readyReject;
window.firebaseReady=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject});
function resolveReady(api){readyResolve(api)}
function rejectReady(err){readyReject(err)}

function makeApi(user){
 return {
  uid:user.uid,
  async createLead(data){
   const leadRef=push(ref(db,`leads/${user.uid}`));
   await update(leadRef,{
    ...data,
    anonymousUid:user.uid,
    createdAt:serverTimestamp(),
    updatedAt:serverTimestamp()
   });
   return leadRef.key;
  },
  async updateLead(leadId,data){
   if(!leadId)throw new Error("Missing lead ID");
   await update(ref(db,`leads/${user.uid}/${leadId}`),{
    ...data,
    updatedAt:serverTimestamp()
   });
  },
  async saveCallSummary(leadId,summary,events=[]){
   if(!leadId)throw new Error("Missing lead ID");
   await update(ref(db,`leads/${user.uid}/${leadId}`),{
    summary,
    events,
    callEndedAt:serverTimestamp(),
    updatedAt:serverTimestamp()
   });
  },
  serverTime(){
   return serverTimestamp();
  },
  async agentExists(slug){
   const snap=await get(ref(db,`publicAgents/${slug}`));
   return !!(snap&&typeof snap.exists==="function"&&snap.exists());
  },
  async getPublicAgent(slug){
   const snap=await get(ref(db,`publicAgents/${slug}`));
   if(snap&&typeof snap.exists==="function"&&snap.exists())return snap.val();
   return null;
  },
  async getOwnerAgent(){
   const snap=await get(ref(db,`users/${user.uid}/agent`));
   if(snap&&typeof snap.exists==="function"&&snap.exists())return snap.val();
   return null;
  },
  async saveAgent(agent){
   const ownerAgent={
    ownerUid:user.uid,
    agentId:agent.agentId,
    slug:agent.slug,
    personaName:agent.personaName||"",
    personaProfession:agent.personaProfession||"",
    businessName:agent.businessName||"",
    businessUrl:agent.businessUrl||"",
    roles:agent.roles||"",
    description:agent.description||"",
    backstory:agent.backstory||"",
    primaryGoal:agent.primaryGoal||"",
    status:agent.status||"live",
    voiceId:agent.voiceId||window.ABITECH_CONFIG.assistant.defaultVoice,
    systemPrompt:agent.systemPrompt||"",
    createdAt:agent.createdAt||serverTimestamp(),
    updatedAt:serverTimestamp()
   };
   await set(ref(db,`users/${user.uid}/agent`),ownerAgent);
   const publicAgent={
    slug:ownerAgent.slug,
    agentId:ownerAgent.agentId,
    personaName:ownerAgent.personaName,
    personaProfession:ownerAgent.personaProfession,
    businessName:ownerAgent.businessName,
    businessUrl:ownerAgent.businessUrl,
    roles:ownerAgent.roles,
    description:ownerAgent.description,
    backstory:ownerAgent.backstory,
    primaryGoal:ownerAgent.primaryGoal,
    status:ownerAgent.status,
    voiceId:ownerAgent.voiceId,
    systemPrompt:ownerAgent.systemPrompt,
    createdAt:ownerAgent.createdAt,
    updatedAt:ownerAgent.updatedAt
   };
   await set(ref(db,`publicAgents/${ownerAgent.slug}`),publicAgent);
   return ownerAgent.slug;
  },
  async signIn(email,password){
   const cred=await signInWithEmailAndPassword(auth,email,password);
   return cred.user;
  },
  async signUp(email,password,displayName){
   const cred=await createUserWithEmailAndPassword(auth,email,password);
   if(displayName)await updateProfile(cred.user,{displayName});
   return cred.user;
  },
  async signInWithGoogle(){
   const cred=await signInWithPopup(auth,new GoogleAuthProvider());
   return cred.user;
  },
  async signOutUser(){
   await signOut(auth);
   window.settled=false;
   window.abbieFirebase=null;
   window.abbieFirebaseReady=false;
  }
 };
}

let settled=false;
function settleAuthenticated(user){
 settled=true;
 const api=makeApi(user);
 window.abbieFirebase=api;
 window.abbieFirebaseReady=true;
 window.abbieFirebaseUser=user;
  window.abbieAuthUser=user;
 resolveReady(api);
 window.dispatchEvent(new CustomEvent("abbie-firebase-ready"));
 window.dispatchEvent(new CustomEvent("abbie-auth-change",{detail:{user}}));
}
onAuthStateChanged(auth,user=>{
 if(user){
  settleAuthenticated(user);
  return;
 }
 window.abbieFirebase=null;
 window.abbieFirebaseUser=null;
 window.abbieFirebaseReady=false;
 window.dispatchEvent(new CustomEvent("abbie-auth-change",{detail:{user:null}}));
 if(!settled){
  settled=true;
  signInAnonymously(auth).catch(err=>{
   window.abbieFirebaseError=err;
   window.abbieFirebaseReady=false;
   rejectReady(err);
   window.dispatchEvent(new CustomEvent("abbie-firebase-error",{detail:{message:err?.message||String(err)}}));
  });
 }
});