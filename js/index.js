const form=document.getElementById("leadForm");
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