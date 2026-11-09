/**
 * THE UNNECESSARILY COMPLICATED TOBITO LAB
 * Original hidden-object illustration, absurd wind tunnel, reversible chaos.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const svg = $('find-art'), scene = $('find-scene'), viewport = $('find-viewport');
  const layer = $('find-hits'), list = $('find-list');
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const W = 1440, H = 880, NS = 'http://www.w3.org/2000/svg';
  const targets = [
    { id:'tobito', name:'本物のとびと君', clue:'青いつなぎと、四角い白い頭。', x:1160, y:505, kind:'bird' },
    { id:'ramen', name:'脱走したラーメン', clue:'食品なのに、翼を装備した。', x:296, y:507, kind:'ramen' },
    { id:'fridge', name:'空飛ぶ冷蔵庫', clue:'電気代より航空力学を優先。', x:904, y:412, kind:'fridge' },
    { id:'egg', name:'純金っぽい卵', clue:'金色に光る、正体不明の卵。', x:577, y:693, kind:'egg' },
    { id:'cpu', name:'羽根付きCPUクーラー', clue:'冷やしすぎて自分が飛びそう。', x:1314, y:254, kind:'fan' },
    { id:'bolt', name:'伝説のネジ', clue:'小さすぎる。ズーム推奨。', x:183, y:702, kind:'bolt' }
  ];
  let seed = 473829, found = new Set(), hintsUsed = 0, startedAt = performance.now();
  let zoom = 1, panX = 0, panY = 0, dragged = false, anchorX = 0, anchorY = 0, baseX = 0, baseY = 0;
  const rand = () => ((seed = (Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const choice = arr => arr[Math.floor(rand()*arr.length)];
  function node(tag,attrs,parent) {
    const e = document.createElementNS(NS,tag);
    Object.keys(attrs || {}).forEach(key => e.setAttribute(key,String(attrs[key])));
    (parent || svg).appendChild(e);
    return e;
  }
  const shape=(tag,attrs,parent)=>node(tag,attrs,parent);
  const rect=(x,y,w,h,fill,parent,rx=3)=>shape('rect',{x,y,width:w,height:h,fill,rx,stroke:'#24384b','stroke-width':2},parent);
  const circle=(x,y,r,fill,parent)=>shape('circle',{cx:x,cy:y,r,fill,stroke:'#24384b','stroke-width':2},parent);
  function text(t,x,y,sz=14,color='#253e55',parent){
    const el=node('text',{x,y,'font-size':sz,'font-family':'sans-serif','font-weight':800,'text-anchor':'middle',fill:color},parent);
    el.textContent=t;
    return el;
  }
  function group(x,y,scale=1,rotate=0,parent){
    return node('g',{transform:'translate('+x+' '+y+') rotate('+rotate+') scale('+scale+')'},parent);
  }
  function bird(x,y,s=1,real=false) {
    const g=group(x,y,s,real?-5:(rand()-.5)*30);
    const color=real?'#315ca2':choice(['#b17d63','#aebc7c','#7b9894','#a49ac2','#d6a583']);
    rect(-20,-34,40,42,'#fffbef',g);
    circle(-12,-41,7,'#e4423a',g);circle(-3,-47,9,'#e4423a',g);circle(8,-41,7,'#e4423a',g);
    rect(-18,9,36,33,color,g);rect(-29,12,12,22,color,g);rect(17,12,12,22,color,g);
    circle(-8,-16,2,'#182939',g);circle(8,-16,2,'#182939',g);
    shape('path',{d:'M-5 -5 L5 -5 L0 4Z',fill:'#ffdb6d',stroke:'#24384b','stroke-width':2},g);
    rect(-17,40,13,7,'#2d3540',g);rect(4,40,13,7,'#2d3540',g);
  }
  function robot(x,y,s=1){
    const g=group(x,y,s);const m=choice(['#a8c2c7','#dfc29e','#bcc0dc']);
    rect(-23,-27,46,42,m,g);rect(-16,15,32,36,m,g);
    rect(-13,-9,10,9,'#28364c',g);rect(5,-9,10,9,'#28364c',g);
    rect(-34,20,17,8,m,g);rect(17,20,17,8,m,g);
    rect(-15,51,9,11,'#586779',g);rect(6,51,9,11,'#586779',g);
    rect(-2,-39,4,12,'#24384b',g);circle(0,-41,4,'#df4642',g);
  }
  function fan(x,y,s=1){
    const g=group(x,y,s);rect(-32,-32,64,64,'#b6c7ca',g);
    circle(0,0,27,'#d8e4e8',g);
    for(let i=0;i<4;i++){
      const b=group(0,0,1,i*90,g);
      shape('path',{d:'M-3 -5 Q-25 -29 3 -30 Q22 -19 7 0Z',fill:'#376a92',stroke:'#24384b','stroke-width':2},b);
    }
    circle(0,0,6,'#f5c965',g);
  }
  function cup(x,y,s=1){
    const g=group(x,y,s);rect(-17,-19,34,38,choice(['#d6dcd3','#ecc79d','#abcbd6']),g);
    shape('path',{d:'M17 -12 Q39 -15 34 7 Q27 15 17 9',fill:'none',stroke:'#24384b','stroke-width':4},g);
    text('風',0,7,18,'#366a8e',g);
  }
  function crate(x,y,s=1){
    const g=group(x,y,s);
    rect(-26,-21,52,42,choice(['#c2d6d5','#e4cfac','#c4d0b4','#bacbe2']),g);
    text(choice(['?','TBT','風','∞','卵','！','42']),0,8,17,'#24384b',g);
  }
  function ramen(x,y,s=1,wings=false){
    const g=group(x,y,s);
    if(wings)shape('path',{d:'M-23 0 Q-68 -28 -70 0 L-23 16 M23 0 Q68 -28 70 0 L23 16',stroke:'#24384b','stroke-width':4,fill:'#eff8eb'},g);
    shape('path',{d:'M-28 -14 Q0 -25 28 -14 L19 20 Q0 36 -19 20Z',fill:'#fff5d7',stroke:'#24384b','stroke-width':3},g);
    shape('path',{d:'M-20 -16 Q0 -42 23 -16 M-12 -21 Q0 -31 11 -17',stroke:'#ddaa4d','stroke-width':4,fill:'none'},g);
    circle(-7,0,2,'#24384b',g);circle(7,0,2,'#24384b',g);
    text('麺',0,21,13,'#ce6759',g);
  }
  function targetArt(t){
    if(t.kind==='bird')bird(t.x,t.y,1.33,true);
    if(t.kind==='ramen')ramen(t.x,t.y,1.15,true);
    if(t.kind==='fridge'){
      const g=group(t.x,t.y,1.12,-7);
      shape('path',{d:'M-37 -23 Q-81 -50 -83 -23 L-37 13 M37 -23 Q81 -50 83 -23 L37 13',fill:'#f7f6ec',stroke:'#24384b','stroke-width':4},g);
      rect(-35,-52,70,105,'#d9e7ec',g);rect(17,-34,5,22,'#58788c',g);rect(17,10,5,22,'#58788c',g);
      text('冷',0,1,25,'#427a92',g);
    }
    if(t.kind==='egg'){
      const g=group(t.x,t.y,1.3);
      shape('ellipse',{cx:0,cy:0,rx:19,ry:26,fill:'#f7c83d',stroke:'#24384b','stroke-width':3},g);
      shape('ellipse',{cx:-5,cy:-8,rx:4,ry:10,fill:'#fff6c4'},g);
    }
    if(t.kind==='fan')fan(t.x,t.y,1.1);
    if(t.kind==='bolt'){
      const g=group(t.x,t.y,1.3,-28);
      rect(-7,-15,14,31,'#8497a4',g,2);rect(-12,-22,24,10,'#a9bbc5',g,2);
    }
  }
  function buildScene(){
    if(!svg||!layer)return;
    svg.replaceChildren();seed=473829;
    node('title',{},svg).textContent='とびとくんを探せ：謎だらけの格納庫';
    node('desc',{},svg).textContent='オリジナルのカラフルな格納庫。ロボット、変なニワトリ、ラーメン、風洞実験の部品がぎっしり。';
    rect(0,0,W,H,'#dbe7e6');
    for(let x=0;x<W;x+=56)shape('line',{x1:x,y1:0,x2:x,y2:H,stroke:'#b5cbd0','stroke-width':1});
    for(let y=0;y<H;y+=56)shape('line',{x1:0,y1:y,x2:W,y2:y,stroke:'#b5cbd0','stroke-width':1});
    rect(25,28,1390,99,'#27455f');
    text('TBT HANGAR // 迷子と謎機械の研究所',550,90,37,'#fff6df');
    text('※ 関係者以外も歓迎',1215,90,21,'#ffe6ad');
    for(let i=0;i<7;i++){
      const x=57+i*197;
      rect(x,150,144,96,'#a6c9d7');
      shape('line',{x1:x+72,y1:150,x2:x+72,y2:246,stroke:'#2c506a','stroke-width':4});
      shape('line',{x1:x,y1:198,x2:x+144,y2:198,stroke:'#2c506a','stroke-width':4});
    }
    for(let y=340;y<780;y+=155){
      rect(32,y,W-64,13,'#466a7b');
      for(let x=38;x<1415;x+=138)rect(x,y+13,8,150,'#3c6173');
    }
    shape('path',{d:'M0 790 L1440 755 L1440 880 L0 880Z',fill:'#cbc3a9',stroke:'#9f9075','stroke-width':4});
    for(let i=0;i<15;i++)rect(40+i*94,833,37,5,'#fbf5dc');
    text('非常口 ←（出口ではない）',250,858,22,'#42606c');
    const stuff=[bird,robot,fan,cup,crate,ramen];
    for(let row=0;row<11;row++)for(let col=0;col<23;col++){
      const x=49+col*60+(rand()-.5)*16,y=291+row*45+(rand()-.5)*15;
      if(y>807||x>1404||targets.some(t=>Math.hypot(t.x-x,t.y-y)<65))continue;
      const fn=choice(stuff);
      fn(x,y,.45+rand()*.34);
    }
    const notes=[['研究費：うまい棒',345,309],['風を保管中',130,648],['ここに天才はいない',966,807],['なぜか猫',1228,689],['逆噴射禁止',1197,309]];
    for(const note of notes){
      rect(note[1]-81,note[2]-25,162,37,'#ffebb1');
      text(note[0],note[1],note[2],16,'#273d53');
    }
    for(const t of targets)targetArt(t);
    layer.replaceChildren();
    for(const t of targets){
      const button=document.createElement('button');
      button.type='button';button.className='find-hit';button.dataset.target=t.id;
      button.style.left=(t.x/W*100)+'%';button.style.top=(t.y/H*100)+'%';
      const extent=t.kind==='fridge'?105:t.kind==='bolt'?43:76;
      button.style.width=extent+'px';button.style.height=extent+'px';
      button.setAttribute('aria-label',t.name+'を発見する');
      button.textContent='✓';
      button.addEventListener('click',()=>foundTarget(t.id));
      layer.appendChild(button);
    }
  }
  function showHunt(){
    if(!list)return;
    list.replaceChildren();
    for(const t of targets){
      const li=document.createElement('li');
      li.className=found.has(t.id)?'is-found':'';
      const mark=document.createElement('span');mark.className='find-check';mark.textContent=found.has(t.id)?'✓':'？';
      const copy=document.createElement('span');
      const name=document.createElement('strong');name.textContent=t.name;
      const clue=document.createElement('small');clue.textContent=t.clue;
      copy.append(name,clue);li.append(mark,copy);list.appendChild(li);
    }
    $('find-found-count').textContent=found.size+' / '+targets.length+' 発見';
    $('find-hints-used').textContent=String(hintsUsed);
    $('find-share').disabled=found.size===0;
    if(found.size===targets.length){
      const secs=Math.round((performance.now()-startedAt)/1000);
      $('find-result').textContent='全員発見！ 名誉捜索隊員に認定。所要約'+secs+'秒。無駄に偉い！';
      anomaly('とびと君を発見。本人は職場復帰を拒否。');
      confetti(34);
    }
  }
  function foundTarget(id){
    if(found.has(id))return;
    found.add(id);
    const b=layer.querySelector('[data-target="'+id+'"]');
    if(b){b.classList.add('is-found');b.disabled=true;}
    $('find-hint-marker').hidden=true;
    $('find-result').textContent='発見：「'+targets.find(x=>x.id===id).name+'」！ 残り'+(targets.length-found.size)+'個。';
    showHunt();confetti(12);
  }
  function view(){
    if(!viewport||!scene)return;
    const w=viewport.clientWidth,h=viewport.clientHeight;
    const scale=Math.min(w/W,h/H)*zoom,ww=W*scale,hh=H*scale;
    panX=ww<=w?0:Math.max((w-ww)/2,Math.min((ww-w)/2,panX));
    panY=hh<=h?0:Math.max((h-hh)/2,Math.min((hh-h)/2,panY));
    scene.style.transform='translate('+((w-ww)/2+panX)+'px,'+((h-hh)/2+panY)+'px) scale('+scale+')';
    $('find-zoom-label').textContent=Math.round(zoom*100)+'%';
  }
  function setZoom(x){zoom=Math.min(3.5,Math.max(1,x));view();}
  $('find-zoom-in')?.addEventListener('click',()=>setZoom(zoom+.45));
  $('find-zoom-out')?.addEventListener('click',()=>setZoom(zoom-.45));
  $('find-reset-view')?.addEventListener('click',()=>{zoom=1;panX=0;panY=0;view();});
  viewport?.addEventListener('pointerdown',e=>{
    if(e.button!==0||e.target.closest('.find-hit'))return;
    dragged=true;anchorX=e.clientX;anchorY=e.clientY;baseX=panX;baseY=panY;
    viewport.setPointerCapture?.(e.pointerId);
  });
  viewport?.addEventListener('pointermove',e=>{
    if(!dragged)return;
    panX=baseX+e.clientX-anchorX;panY=baseY+e.clientY-anchorY;view();
  });
  const stopDrag=()=>{dragged=false;};
  viewport?.addEventListener('pointerup',stopDrag);
  viewport?.addEventListener('pointercancel',stopDrag);
  viewport?.addEventListener('lostpointercapture',stopDrag);
  viewport?.addEventListener('wheel',e=>{
    if(!e.ctrlKey)return;
    e.preventDefault();setZoom(zoom+(e.deltaY<0?.25:-.25));
  },{passive:false});
  window.addEventListener('resize',view,{passive:true});
  let hintTimer=0;
  $('find-hint')?.addEventListener('click',()=>{
    const next=targets.find(t=>!found.has(t.id));
    if(!next){$('find-result').textContent='捜索完了。研究所の職員は帰宅しました。';return;}
    hintsUsed++;zoom=Math.max(zoom,1.7);
    const w=viewport.clientWidth,h=viewport.clientHeight,scale=Math.min(w/W,h/H)*zoom;
    panX=(W/2-next.x)*scale;panY=(H/2-next.y)*scale;
    view();showHunt();
    $('find-result').textContent='ヒント：「'+next.clue+'」 おおむね中心に移動したよ。';
    const marker=$('find-hint-marker');marker.hidden=false;
    clearTimeout(hintTimer);hintTimer=setTimeout(()=>marker.hidden=true,2500);
  });
  $('find-restart')?.addEventListener('click',()=>{
    found=new Set();hintsUsed=0;startedAt=performance.now();
    buildScene();view();showHunt();
    $('find-result').textContent='捜索再開。今度は何秒で見つかる？';
  });
  $('find-share')?.addEventListener('click',async()=>{
    const message='とびとくんの秘密基地で'+found.size+'/6個発見！ヒント'+hintsUsed+'回。謎の物体だらけ。 #とびとくんを探せ '+location.href.split('#')[0]+'#oddities';
    try{
      if(navigator.share)await navigator.share({title:'とびとくんを探せ',text:message});
      else if(navigator.clipboard){await navigator.clipboard.writeText(message);$('find-result').textContent='結果をコピー！';}
      else $('find-result').textContent=message;
    }catch(e){if(e?.name!=='AbortError')$('find-result').textContent='共有できませんでした。';}
  });
  if(svg&&viewport){buildScene();view();showHunt();}

  // This intentionally silly experiment is NOT a scientifically valid wind tunnel.
  const subjects=[
    {name:'ラーメン',icon:'🍜',mass:1.3,drag:1.9,line:'替え玉は成層圏に達しました。'},
    {name:'とびとくん',icon:'🐔',mass:3,drag:2.8,line:'本人の実験同意は未確認。'},
    {name:'冷蔵庫',icon:'🧊',mass:42,drag:.6,line:'冷蔵庫は飛べない。電気代だけ飛んだ。'},
    {name:'CPUクーラー',icon:'🌀',mass:8,drag:2.3,line:'空冷のはずなのに、本人が空へ。'},
    {name:'納豆',icon:'🫘',mass:.7,drag:1.9,line:'粘り強さが、空気抵抗を超えた。'},
    {name:'校長室の椅子',icon:'🪑',mass:13,drag:1.1,line:'権威も風には勝てませんでした。'},
    {name:'猫のぬいぐるみ',icon:'🐈',mass:.8,drag:2.9,line:'猫は液体なので計算できません。'},
    {name:'地球',icon:'🌍',mass:999,drag:.02,line:'ついに計算の意味が消滅しました。'}
  ];
  let subject=subjects[0],running=false,frame=0,windStart=0,windLast=0,x=0,vx=0,rotation=0,experiment=0;
  const stage=$('absurd-wind-stage'),object=$('absurd-object'),speed=$('absurd-speed');
  function selectSubject(item){
    subject=item;
    object.style.transform='';x=0;vx=0;rotation=0;
    $('absurd-object-icon').textContent=item.icon;$('absurd-object-label').textContent=item.name;
    $('absurd-distance').textContent='0.0';$('absurd-state').textContent='発射待ち';
    $('wind-object-choices').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.name===item.name)));
  }
  if($('wind-object-choices')){
    for(const item of subjects){
      const b=document.createElement('button');b.type='button';b.dataset.name=item.name;b.textContent=item.icon+' '+item.name;
      b.addEventListener('click',()=>{stopWind();selectSubject(item);});
      $('wind-object-choices').appendChild(b);
    }
  }
  function setSpeed(){
    const v=Number(speed.value)||0;
    $('absurd-speed-label').textContent=v+' m/s';
    $('absurd-speed-readout').textContent=String(v);
    stage?.style.setProperty('--wind-speed',(1.5-v*.024)+'s');
  }
  speed?.addEventListener('input',setSpeed);
  if(speed&&stage){selectSubject(subject);setSpeed();}
  function stopWind(){
    running=false;cancelAnimationFrame(frame);frame=0;
    if($('absurd-fire'))$('absurd-fire').disabled=false;
  }
  function windTick(now){
    if(!running)return;
    if(document.hidden){windLast=now;frame=requestAnimationFrame(windTick);return;}
    const dt=Math.max(0,Math.min(.05,(now-windLast)/1000));windLast=now;
    const w=Number(speed.value)||0;
    vx=Math.max(0,vx+(w*w*.003*subject.drag/Math.sqrt(subject.mass)-vx*.3)*dt);
    x+=vx*dt*43;rotation+=vx*dt*(subject.mass>20?.12:1.6);
    object.style.transform='translate('+Math.min(1000,x)+'px,'+(-Math.min(65,x*.09))+'px) rotate('+rotation+'deg)';
    $('absurd-distance').textContent=(x/12).toFixed(1);
    if(x>=Math.max(280,stage.clientWidth-90)||now-windStart>4400){
      stopWind();
      $('absurd-state').textContent=w<2?'無風で不発':'だいたい飛んだ';
      $('absurd-comment').textContent=subject.line+' 結果 '+(x/12).toFixed(1)+' m（数値はすべてフィクション）';
      anomaly(subject.name+'を風洞に投入。物理学は欠席。');
      return;
    }
    frame=requestAnimationFrame(windTick);
  }
  $('absurd-fire')?.addEventListener('click',()=>{
    stopWind();experiment++;
    $('wind-experiment-no').textContent='EXPERIMENT '+String(experiment).padStart(3,'0');
    x=0;vx=0;rotation=0;object.style.transform='';running=true;
    $('absurd-state').textContent='送風中！';$('absurd-fire').disabled=true;
    $('absurd-comment').textContent='研究員「説明はあとで考える」';
    windStart=performance.now();windLast=windStart;frame=requestAnimationFrame(windTick);confetti(14);
  });
  $('absurd-reset')?.addEventListener('click',()=>{
    stopWind();selectSubject(subject);$('absurd-comment').textContent='リセットしました。すべてなかったことに。';
  });

  // Site-wide reversible chaos; no autoplay sound or unbounded particles.
  const symbols=['🍜','🐔','🛩️','🪑','🥚','⚙️','🧊','📎','🦀','❓','🔧','🌀'];
  let enabled=!reduced,count=0,mode=0,surpriseTimer=0;
  const fall=$('chaos-fall'),toast=$('chaos-notice'),switcher=$('chaos-toggle');
  function anomaly(message){
    count++;if($('chaos-counter'))$('chaos-counter').textContent=String(count);
    if(toast){
      toast.textContent=message;toast.classList.add('is-visible');
      clearTimeout(toast.expire);
      toast.expire=setTimeout(()=>toast.classList.remove('is-visible'),3500);
    }
  }
  function confetti(number){
    if(!enabled||!fall)return;
    for(let i=0;i<Math.min(number,45);i++){
      const el=document.createElement('span');el.className='chaos-bit';el.textContent=choice(symbols);
      el.style.left=(rand()*98)+'%';el.style.setProperty('--chaos-delay',rand()+'s');
      el.style.setProperty('--chaos-duration',(3+rand()*3)+'s');
      el.style.setProperty('--chaos-rotation',(rand()*1080-540)+'deg');
      fall.appendChild(el);setTimeout(()=>el.remove(),7000);
    }
  }
  function clearModes(){
    document.body.classList.remove('chaos-party','chaos-glitch','chaos-tilt','chaos-rain');
  }
  const modes=['chaos-party','chaos-glitch','chaos-tilt','chaos-rain'];
  const reasons=['何者かが研究資料を紙吹雪にしました。','サイトの座標が一時的にずれました。','重力担当者が有給を取得しました。','謎の物体が降っています。'];
  $('chaos-trigger')?.addEventListener('click',()=>{
    anomaly(reasons[mode%modes.length]);
    if(enabled){
      clearModes();document.body.classList.add(modes[mode%modes.length]);confetti(34);
      setTimeout(clearModes,2200);
    }
    mode++;
  });
  switcher?.addEventListener('click',()=>{
    enabled=!enabled;switcher.textContent=enabled?'演出を止める':'演出を再開';
    switcher.setAttribute('aria-pressed',String(enabled));
    if(!enabled){clearModes();fall?.replaceChildren();}
    else confetti(20);
    anomaly(enabled?'異常現象を再開しました。':'異常現象を停止しました。');
  });
  if(reduced&&switcher){switcher.textContent='演出を再開';switcher.setAttribute('aria-pressed','false');}
  function scheduleSurprise(){
    if(reduced)return;
    clearTimeout(surpriseTimer);
    surpriseTimer=setTimeout(()=>{
      if(enabled&&!document.hidden){
        anomaly(choice([
          '【速報】とびと君、レポート提出期限を知らない。',
          '【警告】風洞に納豆を入れないでください。',
          '【連絡】冷蔵庫がフライト準備を開始。',
          '【未解決】ネジがまた逃げました。',
          '【調査中】研究費でラーメンを食べた人がいます。'
        ]));
        confetti(8);
      }
      scheduleSurprise();
    },23000+rand()*17000);
  }
  scheduleSurprise();
  window.addEventListener('pagehide',()=>{clearTimeout(surpriseTimer);stopWind();});
})();
