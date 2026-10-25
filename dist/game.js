(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, WORLD = 2280;
  const $ = id => document.getElementById(id);
  const ui = Object.fromEntries(['titleScreen','hud','clueScreen','journalScreen','deathScreen','endingScreen','chargeBar','chargeText','dangerPips','carLabel','rideLabel','prompt','toast','clueCount','hintText','soundButton'].map(id => [id,$(id)]));
  const clues = [
    {x:520, name:'One-way ticket', kicker:'CAR 01 · UNDER A SEAT', body:'11:47 PM. Two passengers. One fare paid.\n\nOn the back, in your handwriting: “Mara, wait for me at the end of the line.” The date is the night she died.'},
    {x:1120, name:'The torn note', kicker:'CAR 02 · ON THE FLOOR', body:'A page from Mara’s notebook: “The train repeats the moment we refuse to remember. Light makes it stop moving. Darkness lets it choose where to stand.”\n\nBelow that: “You left before the doors opened.”'},
    {x:2020, name:'The last recording', kicker:'CAR 03 · SERVICE COMPARTMENT', body:'A recorder clicks on. Your own voice: “I heard her calling behind the service door. I pulled the emergency release. The doors opened, but I ran alone.”\n\nMara’s voice, faint beneath the static: “Say my name this time.”'}
  ];
  const saveKey = 'guest-last-train-v1';
  let memory = {deaths:0, clues:[], wins:0};
  try { memory = {...memory,...JSON.parse(localStorage.getItem(saveKey) || '{}')}; } catch (_) {}
  memory.clues = Array.isArray(memory.clues) ? memory.clues.filter(x => Number.isInteger(x) && x >= 0 && x < 3) : [];
  let muted = false;
  let audio, master, humTimer = 0;
  let scene = 'title', paused = false, previousScene = 'playing';
  let keys = new Set(), player, friend, charge, flashTime=0, flashPin=0, danger=0, cameraX=0, toastTime=0, gameTime=0, shake=0, revealed=new Set(), revealTime=0;
  let last = performance.now();
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const distance = (a,b) => Math.abs(a-b);
  const persist = () => { try { localStorage.setItem(saveKey,JSON.stringify(memory)); } catch (_) {} };
  const visible = (node,show) => node.classList.toggle('hidden',!show);
  const text = (id,value) => { $(id).textContent = value; };

  function initAudio() {
    if (!audio) {
      audio = new (window.AudioContext || window.webkitAudioContext)();
      master = audio.createGain(); master.gain.value = muted ? 0 : .24; master.connect(audio.destination);
    }
    if (audio.state === 'suspended') audio.resume();
  }
  function tone(freq,duration,type='sine',volume=.2,slide=1) {
    if (muted) return;
    initAudio();
    const o=audio.createOscillator(),g=audio.createGain(),now=audio.currentTime;
    o.type=type;o.frequency.setValueAtTime(freq,now);o.frequency.exponentialRampToValueAtTime(Math.max(20,freq*slide),now+duration);
    g.gain.setValueAtTime(.001,now);g.gain.exponentialRampToValueAtTime(volume,now+.015);g.gain.exponentialRampToValueAtTime(.001,now+duration);
    o.connect(g);g.connect(master);o.start(now);o.stop(now+duration+.02);
  }
  function cue(kind) {
    if (kind==='flash') {tone(1100,.07,'sawtooth',.28,.5);setTimeout(()=>tone(90,.18,'triangle',.3,.6),30);}
    if (kind==='clue') {tone(540,.25,'sine',.12,1.25);setTimeout(()=>tone(810,.4,'sine',.12,.9),110);}
    if (kind==='death') {tone(160,1.2,'sawtooth',.38,.15);tone(43,1.4,'triangle',.3,.65);}
    if (kind==='danger') tone(65,.2,'triangle',.2,.7);
    if (kind==='door') {tone(130,.6,'sawtooth',.2,.45);tone(55,.8,'triangle',.15,.75);}
    if (kind==='end') [0,240,500,800].forEach((ms,i)=>setTimeout(()=>tone([220,330,440,660][i],1.2,'sine',.15,1.02),ms));
  }
  function setSound(on) {
    muted=!on; if (on) initAudio(); if (master) master.gain.value=on ? .24 : 0;
    ui.soundButton.textContent=on?'SOUND ON':'SOUND OFF';ui.soundButton.setAttribute('aria-label',on?'Turn sound off':'Turn sound on');
  }
  $('soundButton').addEventListener('click',()=>setSound(muted));

  function resetRide() {
    player={x:155,hidden:false,step:0};
    friend={x:memory.deaths>=2?1460:1740,dir:-1,wait:12,shown:0};
    charge=100;flashTime=0;flashPin=0;danger=0;cameraX=0;toastTime=0;gameTime=0;shake=0;revealed=new Set();revealTime=0;
    scene='playing';paused=false;keys.clear();
    ['titleScreen','clueScreen','journalScreen','deathScreen','endingScreen'].forEach(id=>visible(ui[id],false));visible(ui.hud,true);
    ui.rideLabel.textContent=`RIDE ${String(memory.deaths+1).padStart(2,'0')}`;
    ui.clueCount.textContent=`${memory.clues.length}/3`;
    ui.hintText.textContent=memory.deaths===0?'FLASH THE DARK. TRUST WHAT CHANGES.':memory.deaths===1?'THE WINDOW KNOWS WHAT YOU LEFT BEHIND.':'THE SERVICE DOOR IS OPEN. FIND THE TRUTH.';
    if (memory.deaths) showToast(memory.deaths===1?'Something is written on the window.':'The train has changed again.',4);
  }
  function start() {initAudio();resetRide();}
  $('startButton').addEventListener('click',start);
  $('restartButton').addEventListener('click',start);
  $('playAgainButton').addEventListener('click',()=>{memory={deaths:0,clues:[],wins:memory.wins};persist();start();});
  function showToast(message,time=2.4) {ui.toast.textContent=message;visible(ui.toast,true);toastTime=time;}
  function clueOpen(i) {
    if (!memory.clues.includes(i)) {memory.clues.push(i);memory.clues.sort();persist();ui.clueCount.textContent=`${memory.clues.length}/3`;cue('clue');}
    text('clueKicker',clues[i].kicker);text('clueTitle',clues[i].name);text('clueBody',clues[i].body);
    scene='clue';visible(ui.clueScreen,true);visible(ui.prompt,false);
  }
  function closeClue() {visible(ui.clueScreen,false);scene='playing';keys.clear();}
  $('clueClose').addEventListener('click',closeClue);
  function journal() {
    if (scene==='journal') {visible(ui.journalScreen,false);scene=previousScene;keys.clear();return;}
    if (scene!=='playing' && scene!=='clue') return;
    previousScene=scene;scene='journal';
    $('journalEntries').innerHTML=memory.clues.length ? memory.clues.map(i=>`<div class="journal-entry"><h3>0${i+1} / ${clues[i].name}</h3><p>${clues[i].body.replaceAll('\n','<br>')}</p></div>`).join('') : '<div class="journal-entry"><p>Nothing yet. Use the camera flash to find what the dark conceals.</p></div>';
    visible(ui.journalScreen,true);keys.clear();
  }
  $('journalButton').addEventListener('click',journal);$('journalClose').addEventListener('click',journal);
  function flash() {
    if (scene!=='playing') return;
    if (charge<38) {showToast('The flash needs more charge.',1.2);return;}
    charge-=38;flashTime=.62;flashPin=2.2;danger=Math.max(0,danger-.4);shake=4;cue('flash');
    clues.forEach((c,i)=>{if (distance(player.x,c.x)<430 && (i!==2 || memory.deaths>=2)) revealed.add(i);});
    revealTime=5;
    if (distance(player.x,friend.x)<460) {friend.shown=.9;friend.wait=Math.max(friend.wait,2.2);if (memory.deaths>=3) friend.x=clamp(friend.x+(friend.x>player.x?90:-90),0,WORLD);}
  }
  function hide() {
    if (scene!=='playing') return;
    if (player.hidden) {player.hidden=false;showToast('You step into the aisle.',1);return;}
    const seat=seatAt(player.x);
    if (seat!==null) {player.hidden=true;player.x=seat;danger=Math.max(0,danger-.25);showToast('Hold still. Let it pass.',1.6);}
    else showToast('Find a seat to hide behind.',1.3);
  }
  function seatAt(x) {
    let closest=null,best=65;
    for (let car=0;car<3;car++) for (const offset of [275,690]) {const s=car*760+offset,d=distance(x,s);if(d<best){best=d;closest=s;}}
    return closest;
  }
  function interact() {
    if (scene!=='playing') return;
    if (player.hidden) {player.hidden=false;return;}
    for (let i=0;i<3;i++) if(distance(player.x,clues[i].x)<78 && (revealed.has(i)||memory.clues.includes(i)) && (i!==2||memory.deaths>=2)) {clueOpen(i);return;}
    if (distance(player.x,1845)<80 && memory.deaths<2) {showToast('The service door is locked from the other side.',3);cue('door');return;}
    if (distance(player.x,2180)<90) {
      if (memory.clues.length===3) {scene='ending';visible(ui.endingScreen,true);visible(ui.prompt,false);memory.wins++;persist();cue('end');}
      else showToast(`The release needs a name. ${3-memory.clues.length} memory${memory.clues.length===2?'':'s'} missing.`,3);
      return;
    }
  }
  function die() {
    scene='death';visible(ui.deathScreen,true);visible(ui.prompt,false);cue('death');
    memory.deaths++;persist();
    text('deathMessage',memory.deaths===1?'A message appears where the window was blank.':memory.deaths===2?'Somewhere ahead, a service lock clicks open.':memory.deaths===3?'She flinches from the camera now.':'The carriage shifts. You can still remember the way out.');
    shake=11;
  }
  document.addEventListener('keydown',e=>{
    const k=e.key.toLowerCase();
    if ([' ','arrowleft','arrowright','arrowup','arrowdown'].includes(k)) e.preventDefault();
    if (e.repeat && ['f',' ','e','w','arrowup','j'].includes(k)) return;
    if (k==='j') {journal();return;}
    if (scene==='title' && (k==='enter'||k===' ')) {start();return;}
    if (scene==='death' && (k==='enter'||k===' ')) {start();return;}
    if (scene==='clue' && (k==='enter'||k==='escape'||k==='e')) {closeClue();return;}
    if (scene==='journal' && k==='escape') {journal();return;}
    if (scene!=='playing') return;
    keys.add(k);
    if (k==='f'||k===' ') flash();
    if (k==='e') interact();
    if (k==='w'||k==='arrowup') hide();
  });
  document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur',()=>keys.clear());

  function update(dt) {
    if (scene!=='playing') return;
    gameTime+=dt;charge=clamp(charge+dt*7.3,0,100);flashTime=Math.max(0,flashTime-dt);flashPin=Math.max(0,flashPin-dt);friend.shown=Math.max(0,friend.shown-dt);shake=Math.max(0,shake-dt*18);
    if (toastTime>0) {toastTime-=dt;if(toastTime<=0)visible(ui.toast,false);}
    if (revealTime>0) revealTime-=dt; else revealed.clear();
    if (!player.hidden) {
      let dir=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);
      if(dir) {let next=clamp(player.x+dir*155*dt,55,WORLD-55);if(memory.deaths<2 && player.x<1825 && next>1825)next=1825;if(memory.deaths<2 && player.x>1865 && next<1865)next=1865;player.x=next;player.step+=dt*10;}
    }
    if (friend.wait>0) friend.wait-=dt;
    else if (flashPin<=0) {
      const toward=Math.sign(player.x-friend.x);
      const speed=(memory.deaths>=3?50:memory.deaths>=2?68:64)*(player.hidden?.55:1);
      friend.x=clamp(friend.x+toward*speed*dt,75,WORLD-75);
      if (player.hidden && distance(friend.x,player.x)<95) {friend.x+=toward===0?-1:-toward*speed*dt*1.7;friend.wait=.8;}
    }
    const gap=distance(player.x,friend.x);
    const exposed=!player.hidden && flashPin<=0;
    let threat=exposed?clamp((310-gap)/310,0,1):0;
    danger=clamp(danger+(threat*(gap<85?1.5:.55)-(!threat?.38:0))*dt,0,1);
    if (!player.hidden && gap<47 && flashPin<=0) danger=Math.min(1,danger+dt*2.1);
    if(danger>=1)die();
    ui.chargeBar.value=Math.round(charge);ui.chargeText.textContent=`${Math.round(charge)}%`;
    [...ui.dangerPips.children].forEach((pip,i)=>pip.classList.toggle('on',danger>(i*.25+.03)));
    const car=Math.min(3,Math.floor(player.x/760)+1);
    ui.carLabel.textContent=`CAR 0${car} / ${['THE WAKE','THE PASSAGE','THE END'][car-1]}`;
    if (danger>.62 && Math.floor(gameTime*2)!==Math.floor((gameTime-dt)*2))cue('danger');
    humTimer+=dt;if(humTimer>.58){humTimer=0;if(!muted){tone(54,.12,'triangle',.035,.9);setTimeout(()=>tone(48,.12,'triangle',.025,.92),160);}}
    updatePrompt();
  }
  function updatePrompt() {
    let message='';
    if(player.hidden)message='W / ↑  ·  LEAVE HIDING PLACE';
    else if(distance(player.x,2180)<90)message=memory.clues.length===3?'E  ·  SAY HER NAME / RELEASE THE DOORS':'E  ·  EMERGENCY RELEASE';
    else if(distance(player.x,1845)<80 && memory.deaths<2)message='E  ·  INSPECT LOCKED SERVICE DOOR';
    else for(let i=0;i<3;i++)if(distance(player.x,clues[i].x)<75 && (revealed.has(i)||memory.clues.includes(i)) && (i!==2||memory.deaths>=2)){message=`E  ·  INSPECT ${clues[i].name.toUpperCase()}`;break;}
    if(!message && seatAt(player.x)!==null)message='W / ↑  ·  HIDE BEHIND SEAT';
    ui.prompt.textContent=message;visible(ui.prompt,!!message);
  }

  function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  function line(x1,y1,x2,y2,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(Math.round(x1)+.5,Math.round(y1)+.5);ctx.lineTo(Math.round(x2)+.5,Math.round(y2)+.5);ctx.stroke();}
  function label(str,x,y,color='#b4a592',size=10){ctx.fillStyle=color;ctx.font=`${size}px monospace`;ctx.fillText(str,x,y);}
  function train() {
    rect(0,0,W,H,'#101b24');
    for(let car=0;car<3;car++){
      const ox=car*760-cameraX;
      if(ox>W+150||ox+760<-150)continue;
      rect(ox,0,760,62,'#09121a');rect(ox,62,760,11,'#3a4a50');rect(ox,74,760,21,'#172833');
      rect(ox,95,760,249,car===1?'#263541':'#293844');rect(ox,344,760,38,'#394b50');
      rect(ox,382,760,158,'#151d24');rect(ox,388,760,12,'#455057');rect(ox,493,760,8,'#495259');
      for(let x=ox+0;x<ox+760;x+=38){line(x,403,x+21,490,'#23313a');line(x,502,x,540,'#101820');}
      for(const wx of [115,335,555]){
        const x=ox+wx;
        rect(x,119,128,154,'#0b1824');rect(x+5,124,118,143,'#12283a');
        for(let b=0;b<7;b++){const bx=x+8+b*19+((gameTime*8)%19);rect(bx,190+(b%3)*11,9,77-(b%3)*11,'#1b3441');rect(bx,198+(b%3)*11,3,3,'#b28666');}
        rect(x,119,6,154,'#74868a');rect(x+122,119,6,154,'#74868a');rect(x,267,128,7,'#667980');
      }
      for(const sx of [275,690]){
        const x=ox+sx;
        rect(x-55,304,94,77,'#253844');rect(x-58,312,6,76,'#698087');rect(x-50,322,82,53,'#3d5057');rect(x-52,374,96,16,'#1a282f');rect(x-44,390,6,34,'#5b6b6f');rect(x+32,390,6,34,'#5b6b6f');
        rect(x-48,329,74,3,'#647d83');
      }
      for(const px of [56,430]){const x=ox+px;rect(x,78,5,303,'#52676d');rect(x-11,94,27,5,'#7a8786');rect(x-9,101,23,31,'#253a46');}
      rect(ox+742,96,18,287,'#0c151d');rect(ox+735,112,6,254,'#677b7e');
      label(`0${car+1}`,ox+30,109,'#bba884',14);
    }
    // A barely legible message appears after the first death.
    if(memory.deaths>=1){label('YOU LEFT HER HERE',750-cameraX,180,'#b98a79',15);line(749-cameraX,186,916-cameraX,186,'#ae796c');}
    if(memory.deaths>=4)label(`STILL HERE · ${String(memory.deaths).padStart(2,'0')}`,750-cameraX,210,'#b98a79',11);
    // Service door: the second ride changes its state.
    const doorX=1845-cameraX;
    rect(doorX-19,107,64,282,memory.deaths>=2?'#0a1219':'#293942');
    rect(doorX-18,107,6,282,'#75868a');rect(doorX+39,107,7,282,'#75868a');
    if(memory.deaths<2){rect(doorX-2,231,20,12,'#bc9b69');label('LOCKED',doorX-18,92,'#d0af81',10);}
    else {rect(doorX+5,108,45,281,'#081016');line(doorX-20,109,doorX-45,390,'#64777c',4);label('OPEN',doorX-20,91,'#d0af81',10);}
    // Release, visible in the final car.
    const rx=2180-cameraX;rect(rx-29,174,58,110,'#5b696b');rect(rx-22,182,44,84,'#26343b');rect(rx-9,198,18,47,'#a95c4e');rect(rx-3,188,6,66,'#d39374');label('EMERGENCY',rx-38,166,'#d9b88b',10);
    clues.forEach((clue,i)=>{
      if(i===2&&memory.deaths<2)return;
      const x=clue.x-cameraX;if(x<-30||x>W+30)return;
      const glow=flashTime>0||revealed.has(i)||memory.clues.includes(i);
      if(glow){ctx.fillStyle='#dec28a33';ctx.beginPath();ctx.arc(x,353,24,0,Math.PI*2);ctx.fill();}
      if(i===0){rect(x-11,360,24,8,'#e2cfab');rect(x-6,362,12,2,'#695444');}
      if(i===1){rect(x-15,368,28,5,'#ddd0aa');rect(x-5,361,11,5,'#aeb8aa');}
      if(i===2){rect(x-18,337,36,19,'#687c7c');rect(x-14,341,28,12,'#283a40');rect(x-2,344,5,5,'#d9b57e');}
      if(glow&&!memory.clues.includes(i))label('?',x-3,325,'#f2d89e',17);
    });
  }
  function person(x,ghost=false) {
    const px=Math.round(x-cameraX),y=ghost?289:291;
    if(ghost){
      ctx.fillStyle=memory.deaths>=3?'#899399':'#8991a1';
      rect(px-12,y-1,24,60,'#1b252f');rect(px-14,y+10,28,37,'#263540');rect(px-13,y-28,26,31,'#b2a9a0');
      rect(px-16,y-31,32,10,'#141a21');rect(px-17,y-20,6,27,'#171b22');rect(px+11,y-20,6,27,'#171b22');
      rect(px-9,y+56,7,42,'#1c252c');rect(px+3,y+56,7,42,'#1c252c');rect(px-7,y-12,4,3,'#ba6b68');rect(px+4,y-12,4,3,'#ba6b68');
      if(flashTime>0){ctx.strokeStyle='#d7d7d090';ctx.lineWidth=1;ctx.strokeRect(px-19,y-36,38,137);}
    } else {
      const stride=Math.sin(player.step*2)*4;
      rect(px-8,y-28,16,24,'#d4b49b');rect(px-12,y-31,24,10,'#28313b');rect(px-13,y-2,26,55,'#8a715d');rect(px-17,y+7,5,37,'#a88c73');rect(px+12,y+7,5,37,'#a88c73');
      rect(px-11,y+52,8,44+stride,'#28343a');rect(px+3,y+52,8,44-stride,'#28343a');rect(px-12,y+92+stride,12,5,'#0d151c');rect(px+3,y+92-stride,12,5,'#0d151c');
      rect(px+9,y+23,11,14,'#101a22');rect(px+10,y+24,8,7,'#9caaa7');
    }
  }
  function render() {
    ctx.save();
    if(scene==='title')cameraX=480;
    else if(player)cameraX=clamp(player.x-W*.42,0,WORLD-W);
    if(shake>0)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake*.6);
    train();
    if(player&&scene!=='title'){
      if(player.hidden){const x=player.x-cameraX;rect(x-10,344,20,39,'#706357');rect(x-7,331,14,16,'#c3a489');}
      else person(player.x);
      if(flashTime>0||friend.shown>0||distance(player.x,friend.x)<140)person(friend.x,true);
    }
    // The flash exposes the entire car for a fraction of a second; otherwise only a small radius survives.
    if(scene!=='title'&&player){
      const px=player.x-cameraX;
      if(flashTime>0){
        const alpha=flashTime>.48?.12:clamp(1-flashTime/.55,.08,.82);
        rect(0,0,W,H,`rgba(1,5,10,${alpha})`);
        if(flashTime>.46)rect(0,0,W,H,`rgba(238,248,243,${(flashTime-.46)*1.55})`);
      } else {
        const radius=player.hidden?80:112;
        const g=ctx.createRadialGradient(px,350,22,px,350,radius+110);
        g.addColorStop(0,'rgba(1,5,10,.66)');g.addColorStop(.38,'rgba(1,5,10,.84)');g.addColorStop(.75,'rgba(1,5,10,.96)');g.addColorStop(1,'rgba(1,5,10,.985)');
        rect(0,0,W,H,g);
      }
      if(danger>.2){ctx.fillStyle=`rgba(110,8,18,${danger*.2})`;ctx.fillRect(0,0,W,H);}
    } else rect(0,0,W,H,'#060a1190');
    for(let i=0;i<12;i++){const y=(i*47+Math.floor(gameTime*16))%H;rect(0,y,W,1,'#ffffff07');}
    ctx.restore();
  }
  function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;update(dt);render();requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
})();
