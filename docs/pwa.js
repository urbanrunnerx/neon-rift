(() => {
  'use strict';
  let deferredPrompt=null,installedHere=false;
  const button=document.getElementById('installButton'),status=document.getElementById('installStatus'),cache=document.getElementById('cacheStatus');
  const modes=['standalone','fullscreen','minimal-ui'].map(mode=>matchMedia('(display-mode: '+mode+')'));
  const standalone=()=>modes.some(mode=>mode.matches)||navigator.standalone===true;
  const remembered=()=>{try{return localStorage.getItem('neon-rift-installed')==='yes';}catch{return false;}};
  const remember=()=>{try{localStorage.setItem('neon-rift-installed','yes');}catch{}};
  const setStatus=text=>{if(status)status.textContent=text;};
  const manual='Use your browser menu → Add to Home screen / Install app if no prompt appears.';
  function syncInstall(){
    if(standalone()){installedHere=true;remember();}
    const installed=installedHere||standalone()||remembered();
    document.querySelectorAll('[data-install]').forEach(el=>el.hidden=installed);
    if(button)button.hidden=installed;
    if(installed)setStatus('Neon Rift is installed. Open your artwork and explore.');
    else setStatus(deferredPrompt?'Ready to install. Tap Install web app.':manual);
  }
  syncInstall();for(const mode of modes)mode.addEventListener?.('change',syncInstall);
  addEventListener('appinstalled',()=>{installedHere=true;deferredPrompt=null;remember();syncInstall();});
  addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredPrompt=event;if(!standalone()){installedHere=false;try{localStorage.removeItem('neon-rift-installed');}catch{}}syncInstall();});
  if(button)button.addEventListener('click',async()=>{if(!deferredPrompt){setStatus(manual);return;}const prompt=deferredPrompt;deferredPrompt=null;try{await prompt.prompt();const result=await prompt.userChoice;setStatus(result.outcome==='accepted'?'Installation accepted. Your browser will finish the setup.':'Installation dismissed. Open and explore whenever you like.');}catch{setStatus(manual);}});
  const banner=document.getElementById('updateBanner'),reload=document.getElementById('reloadUpdate');
  if(reload)reload.onclick=()=>{dispatchEvent(new Event('neon-rift-before-reload'));location.reload();};
  if('serviceWorker' in navigator&&window.isSecureContext){
    let controlled=!!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange',()=>{if(controlled&&banner)banner.hidden=false;controlled=true;});
    navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(async registration=>{registration.update().catch(()=>{});await navigator.serviceWorker.ready;if(cache)cache.textContent='Offline ready';}).catch(()=>{if(cache)cache.textContent='Online only · cache unavailable';});
  }else if(cache)cache.textContent='Offline access needs HTTPS';
})();
