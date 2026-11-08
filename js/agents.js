function slugifyValue(value){
 return String(value||"").toLowerCase().trim().replace(/[^a-z0-9\s-]/g,"").split(/\s+/).filter(Boolean).join("-").replace(/^-+|-+$/g,"")||"agent";
}
const DEFAULT_AGENT_PROFESSION="Customer Service and Business Solutions Representative";
const FALLBACK_SYSTEM_PROMPT="You are Abbie, an experienced Customer Care and Solutions Consultant at ABI Tech.";
function composeSystemPrompt(input){
 const base=(document.getElementById("defaultSystemPrompt")?.textContent||FALLBACK_SYSTEM_PROMPT).trim();
 const personaName=input.personaName||"Sarah";
 const personaProfession=input.personaProfession||DEFAULT_AGENT_PROFESSION;
 const businessName=input.businessName||"My Business";
 const identityLine="You are Abbie, an experienced Customer Care and Solutions Consultant at ABI Tech.";
 let prompt=base;
 if(prompt.includes(identityLine)){
  prompt=prompt.split(identityLine).join(`You are ${personaName}, an experienced ${personaProfession} at ${businessName}.`);
 }
 const custom=[
  "# CUSTOM AGENT CONTEXT",
  `You are the AI Customer Service Representative for ${businessName}.`,
  `Business Name: ${businessName}.`,
  `Business Website: ${input.businessUrl||"Not provided"}.`,
  `Persona Name: ${personaName}.`,
  `Persona Profession: ${personaProfession}.`,
  `CSR Role & Responsibility: ${input.roles||"Not specified"}.`,
  `CSR Description: ${input.description||"Not specified"}.`,
  `Agent Backstory: ${input.backstory||"Not specified"}.`,
  `Agent Main Goal in Accepting Inbound Calls: ${input.primaryGoal||"Not specified"}.`,
  "You still follow the CORE DEMEANOR, CONVERSATIONAL PLAYBOOK, RESPONSE GUIDELINES, and BACKGROUND FUNCTION defined below, adapted to this business.",
  ""
 ].join("\n");
 const marker="# CORE DEMEANOR";
 if(prompt.includes(marker)){
  prompt=prompt.split(marker).join(`${custom}\n\n${marker}`);
 }else{
  prompt=`${custom}\n\n${prompt}`;
 }
 return prompt;
}
async function generateAgentSlug(businessName,personaName){
 const fb=window.abbieFirebase;
 const base=`${slugifyValue(businessName)}-${slugifyValue(personaName)}`.replace(/-+/g,"-");
 let slug=base.replace(/^-+|-+$/g,"")||"csr-agent";
 let guard=0;
 while(await fb.agentExists(slug)){
  guard++;
  if(guard>10)break;
  slug=`${slug}-${Math.random().toString(36).slice(2,6)}`;
 }
 return slug;
}
function buildAgentId(uid){
 return `agent-${String(uid||window.abbieFirebaseUser?.uid||"anon").toLowerCase()}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
}
function buildEmbedCode(slug){
 const origin=window.location.origin;
 return `<iframe src="${origin}/agent/${slug}" width="100%" height="560" style="border:0;border-radius:18px;background:transparent" allow="microphone; autoplay; clipboard-write" loading="lazy"></iframe>`;
}
