const cfg = window.IMAMTECH_CONFIG || {};
const hasBackend = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
const state={devices:[],files:[],contacts:[]};
let supabaseClient=null;
let currentUser=null;
let pendingEmail=null;
const DEVICE_ID_KEY='imamtech_device_id';

const $=s=>document.querySelector(s);
const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)};

async function loadSupabase(){
  if(!hasBackend) return;
  const {createClient}=window.supabase;
  supabaseClient=createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
  const {data}=await supabaseClient.auth.getUser();
  currentUser=data?.user||null;
  supabaseClient.auth.onAuthStateChange((_event,session)=>{currentUser=session?.user||null; if(currentUser){enterApp();registerCurrentDevice();}});
  if(currentUser) registerCurrentDevice();
}

function showPage(p){
 document.querySelectorAll('.page').forEach(x=>x.classList.remove('active-page'));
 $('#'+p).classList.add('active-page');
 document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x.dataset.page===p));
 $('#pageTitle').textContent=p==='contacts'?'Contacts / Numbers':p[0].toUpperCase()+p.slice(1);
 if(innerWidth<701) $('.sidebar').classList.remove('open');
}

function renderDevices(){
 const html=state.devices.map(d=>`<div class="device-card"><div class="device-icon">${d.type==='Computer'?'💻':'📱'}</div><h3>${escapeHtml(d.name)}</h3><p class="muted">${escapeHtml(d.role||'Linked Device')}</p><span class="online">● ${d.online?'Online':'Offline'}</span></div>`).join('');
 $('#deviceGrid').innerHTML=html||'<div class="card"><b>No linked devices yet.</b><p class="muted">Create a share link and open it on another device.</p></div>';
 $('#deviceMini').innerHTML=state.devices.slice(0,5).map(d=>`<div class="mini-row"><div class="device-icon">${d.type==='Computer'?'💻':'📱'}</div><div><b>${escapeHtml(d.name)}</b><div class="online">● ${d.online?'Online':'Offline'}</div></div></div>`).join('')||'<div class="muted">No linked devices.</div>';
}
function icon(type){return type==='Photos'?'🖼️':type==='Videos'?'🎥':type==='Audio'?'🎵':'📄'}
function renderFiles(){
 const q=$('#fileSearch').value.toLowerCase(), f=$('#fileFilter').value;
 $('#fileList').innerHTML=state.files.filter(x=>(f==='All'||x.type===f)&&x.name.toLowerCase().includes(q)).map(x=>`<div class="file-row"><div class="file-type">${icon(x.type)}</div><div><b>${escapeHtml(x.name)}</b><div class="muted">${x.type}</div></div><div class="meta">${x.size||''}</div></div>`).join('')||'<div class="card">No files found.</div>';
 $('#fileMini').innerHTML=state.files.slice(0,3).map(x=>`<div class="mini-row"><div class="device-icon">${icon(x.type)}</div><div><b>${escapeHtml(x.name)}</b><div class="muted">${x.size||''}</div></div></div>`).join('')||'<div class="muted">No files yet.</div>';
}
function renderContacts(){
 const q=$('#contactSearch').value.toLowerCase();
 $('#contactsList').innerHTML=state.contacts.filter(x=>(x.name+x.number).toLowerCase().includes(q)).map(x=>`<div class="contact"><b>${escapeHtml(x.name)}</b><span class="muted">${escapeHtml(x.number)}</span></div>`).join('')||'<div class="muted">No contacts found.</div>';
}
function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function randomToken(){return crypto.getRandomValues(new Uint32Array(8)).join('')+Date.now().toString(36)}
async function sha256(text){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}

async function makeLink(){
 if(!supabaseClient||!currentUser){return location.href.split('#')[0]+'?join=demo-'+randomToken()}
 const token=randomToken(); const hash=await sha256(token); const expires=new Date(Date.now()+15*60*1000).toISOString();
 const {error}=await supabaseClient.from('device_links').insert({owner_id:currentUser.id,token_hash:hash,expires_at:expires});
 if(error) throw error;
 return location.href.split('#')[0]+'?join='+encodeURIComponent(token);
}
async function openLinkModal(){
 try{$('#linkValue').textContent=await makeLink();$('#linkModal').classList.remove('hidden')}catch(e){console.error(e);toast('Could not create link. Check backend setup.')}}

async function processJoin(){
 const token=new URLSearchParams(location.search).get('join');
 if(!token) return;
 document.body.classList.add('join-mode');
 $('#loginView').classList.remove('hidden');
 $('#emailStep').classList.add('hidden');
 $('#codeStep').classList.add('hidden');
 $('#loginBtn').style.display='block';
 $('#loginBtn').textContent='Join this Imamtech device';
 $('#loginCardTitle').textContent='Join Imamtech';
 $('#loginCardText').textContent='This link can connect this device to the Main Device. You will be asked to confirm before anything is shared.';
 $('#loginBtn').onclick=()=>joinDevice(token);
}
async function joinDevice(token){
 if(!supabaseClient){toast('Backend is not configured yet.');return}
 const hash=await sha256(token);
 const {data:links,error}=await supabaseClient.from('device_links').select('*').eq('token_hash',hash).is('used_at',null).gt('expires_at',new Date().toISOString()).limit(1);
 if(error||!links?.length){toast('This link is invalid or expired.');return}
 const link=links[0];
 const deviceName=prompt('Name this device:',navigator.userAgent.includes('Mobile')?'My Phone':'My Computer')||'Linked Device';
 const type=navigator.userAgent.includes('Mobile')?'Android Phone':'Computer';
 const {error:insertError}=await supabaseClient.from('devices').insert({owner_id:link.owner_id,name:deviceName,type,role:'Linked Device',online:true,last_seen:new Date().toISOString()});
 if(insertError){toast('Could not join device.');return}
 await supabaseClient.from('device_links').update({used_at:new Date().toISOString()}).eq('id',link.id);
 history.replaceState({},'',location.pathname);
 $('#loginView').classList.add('hidden'); $('#appView').classList.remove('hidden');
 toast('Device linked successfully');
}

async function loadData(){
 if(!supabaseClient||!currentUser){
   state.devices=[{name:'This Main Device',type:'Android Phone',online:true,role:'Main Device'}];
   state.files=[]; state.contacts=[]; renderAll(); return;
 }
 const [d,f,c]=await Promise.all([
  supabaseClient.from('devices').select('*').eq('owner_id',currentUser.id).order('created_at',{ascending:false}),
  supabaseClient.from('files').select('*').eq('owner_id',currentUser.id).order('created_at',{ascending:false}),
  supabaseClient.from('contacts').select('*').eq('owner_id',currentUser.id).order('created_at',{ascending:false})
 ]);
 state.devices=d.data||[];
 state.files=(f.data||[]).map(x=>({name:x.name,type:fileType(x.mime_type,x.name),size:x.size_bytes?formatBytes(x.size_bytes):''}));
 state.contacts=c.data||[];
 renderAll();
 supabaseClient.channel('imamtech-devices').on('postgres_changes',{event:'*',schema:'public',table:'devices',filter:`owner_id=eq.${currentUser.id}`},loadData).subscribe();
}
function fileType(mime,name){if(mime?.startsWith('image/'))return'Photos';if(mime?.startsWith('video/'))return'Videos';if(mime?.startsWith('audio/'))return'Audio';return'Documents'}
function formatBytes(n){return n<1048576?(n/1024).toFixed(0)+' KB':(n/1048576).toFixed(1)+' MB'}
function renderAll(){renderDevices();renderFiles();renderContacts();}

async function sync(){
 $('#syncText').textContent='Checking linked devices...';$('#progress').style.width='20%';
 if(supabaseClient&&currentUser){await loadData()}
 setTimeout(()=>{$('#progress').style.width='100%';$('#syncText').textContent='Sync check complete.';toast('Sync check complete')},350);
}
async function login(){
 if(!supabaseClient){$('#loginView').classList.add('hidden');$('#appView').classList.remove('hidden');toast('Demo mode — add Supabase config for real sync');return}
}

function deviceLabel(){
 const ua=navigator.userAgent;
 const isMobile=/Mobile|Android|iPhone/i.test(ua);
 const type=isMobile?'Android Phone':'Computer';
 let name=isMobile?'My Phone':'My Computer';
 if(/Windows/i.test(ua)) name='Windows Computer';
 else if(/Macintosh/i.test(ua)) name='Mac Computer';
 else if(/iPhone/i.test(ua)) name='iPhone';
 else if(/Android/i.test(ua)) name='Android Phone';
 return {name,type};
}

async function registerCurrentDevice(){
 if(!supabaseClient||!currentUser) return;
 try{
  const existingId=localStorage.getItem(DEVICE_ID_KEY);
  if(existingId){
   const {data,error}=await supabaseClient.from('devices').update({online:true,last_seen:new Date().toISOString()}).eq('id',existingId).eq('owner_id',currentUser.id).select();
   if(!error && data && data.length) return;
   // Row didn't exist anymore (e.g. deleted) — fall through and create a new one.
  }
  const {name,type}=deviceLabel();
  const {data:inserted,error:insertError}=await supabaseClient.from('devices').insert({owner_id:currentUser.id,name,type,role:'This Device',online:true,last_seen:new Date().toISOString()}).select().single();
  if(insertError){console.error(insertError);return}
  localStorage.setItem(DEVICE_ID_KEY,inserted.id);
 }catch(e){console.error(e)}
}

async function markDeviceOffline(){
 const id=localStorage.getItem(DEVICE_ID_KEY);
 if(!supabaseClient||!currentUser||!id) return;
 try{await supabaseClient.from('devices').update({online:false,last_seen:new Date().toISOString()}).eq('id',id).eq('owner_id',currentUser.id)}catch(e){}
}

function showEmailStep(){
 $('#codeStep').classList.add('hidden');
 $('#emailStep').classList.remove('hidden');
 $('#loginCode').value='';
}
function showCodeStep(email){
 pendingEmail=email;
 $('#emailStep').classList.add('hidden');
 $('#codeStep').classList.remove('hidden');
 $('#codeSentText').textContent=`Enter the 6-digit code sent to ${email}.`;
 $('#loginCode').focus();
}

async function sendCode(){
 if(!supabaseClient){toast('Backend is not configured yet.');return}
 const email=$('#loginEmail').value.trim();
 if(!email||!email.includes('@')){toast('Enter a valid email address.');return}
 $('#sendCodeBtn').disabled=true;
 const {error}=await supabaseClient.auth.signInWithOtp({email,options:{shouldCreateUser:true}});
 $('#sendCodeBtn').disabled=false;
 if(error){toast('Could not send code: '+error.message);return}
 showCodeStep(email);
 toast('Code sent — check your email.');
}

async function verifyCode(){
 if(!supabaseClient||!pendingEmail){toast('Enter your email first.');return}
 const token=$('#loginCode').value.trim();
 if(token.length<6){toast('Enter the 6-digit code.');return}
 $('#verifyCodeBtn').disabled=true;
 const {error}=await supabaseClient.auth.verifyOtp({email:pendingEmail,token,type:'email'});
 $('#verifyCodeBtn').disabled=false;
 if(error){toast('Invalid or expired code: '+error.message);return}
 // onAuthStateChange will fire enterApp() + registerCurrentDevice() automatically.
}

async function signout(){
 await markDeviceOffline();
 localStorage.removeItem(DEVICE_ID_KEY);
 if(supabaseClient) await supabaseClient.auth.signOut();
 location.reload();
}

function bind(){
 document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>showPage(b.dataset.page));
 document.querySelectorAll('[data-page-jump]').forEach(b=>b.onclick=()=>showPage(b.dataset.pageJump));
 $('#menuBtn').onclick=()=>$('.sidebar').classList.toggle('open');
 $('#shareBtn').onclick=openLinkModal; $('#newLink').onclick=openLinkModal;
 $('#closeModal').onclick=()=>$('#linkModal').classList.add('hidden');
 $('#copyLink').onclick=async()=>{try{await navigator.clipboard.writeText($('#linkValue').textContent);toast('Link copied')}catch{toast('Copy failed — long press the link to copy')}};
 $('#syncBtn').onclick=sync; $('#syncHome').onclick=sync;
 $('#fileSearch').oninput=renderFiles; $('#fileFilter').onchange=renderFiles; $('#contactSearch').oninput=renderContacts;
 $('#loginBtn').onclick=login; $('#signoutBtn').onclick=signout;
 $('#sendCodeBtn').onclick=sendCode;
 $('#verifyCodeBtn').onclick=verifyCode;
 $('#loginCode').onkeydown=e=>{if(e.key==='Enter')verifyCode()};
 $('#loginEmail').onkeydown=e=>{if(e.key==='Enter')sendCode()};
 $('#resendCode').onclick=e=>{e.preventDefault();showEmailStep()};
 document.addEventListener('visibilitychange',()=>{if(document.hidden) markDeviceOffline(); else registerCurrentDevice();});
 window.addEventListener('beforeunload',()=>{if(supabaseClient&&currentUser&&navigator.sendBeacon){/* best-effort only, most browsers block fetch on unload */}});
 $('#addContact').onclick=async()=>{const name=prompt('Contact name');if(!name)return;const number=prompt('Phone number');if(!number)return;if(supabaseClient&&currentUser) await supabaseClient.from('contacts').insert({owner_id:currentUser.id,name,number});else state.contacts.unshift({name,number});renderContacts();toast('Contact added')};
 $('#fileInput').onchange=async e=>{for(const f of e.target.files){if(supabaseClient&&currentUser){const path=`${currentUser.id}/${crypto.randomUUID()}-${f.name}`;const {error}=await supabaseClient.storage.from('imamtech-files').upload(path,f);if(error){toast('File upload failed');continue}await supabaseClient.from('files').insert({owner_id:currentUser.id,name:f.name,path,mime_type:f.type,size_bytes:f.size});}else state.files.unshift({name:f.name,type:fileType(f.type,f.name),size:formatBytes(f.size)});}await loadData();toast('File processed')};
 $('#removeDemo').onclick=()=>{state.files=[];state.contacts=[];renderFiles();renderContacts();toast('Local demo data removed')};
}
function enterApp(){
 $('#loginView').classList.add('hidden');$('#appView').classList.remove('hidden');
 document.querySelectorAll('.account-mini b, .setting small').forEach(el=>{if(el.textContent.includes('@')&&currentUser?.email) el.textContent=currentUser.email});
 const avatar=$('.avatar'); if(avatar&&currentUser?.email) avatar.textContent=currentUser.email[0].toUpperCase();
 loadData();
}

(async()=>{bind();await loadSupabase();await processJoin();if(!new URLSearchParams(location.search).get('join')){if(currentUser)enterApp();else if(!hasBackend){enterApp()}}})();
