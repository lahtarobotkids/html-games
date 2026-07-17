(() => {
  const canvas = document.querySelector('#game'), ctx = canvas.getContext('2d');
  const start = document.querySelector('#start'), play = document.querySelector('#play'), message = document.querySelector('#message');
  const W=480,H=270,RAYS=240,FOV=Math.PI/3;
  const makeTexture=(kind)=>{const t=document.createElement('canvas');t.width=t.height=64;const c=t.getContext('2d');
    c.fillStyle=kind===0?'#63382e':kind===1?'#37434a':'#4b3b28';c.fillRect(0,0,64,64);
    if(kind===0){for(let y=0;y<64;y+=16){c.fillStyle='#2d1a18';c.fillRect(0,y,64,2);c.fillStyle='#9a5740';c.fillRect(0,y+2,64,1)}for(let x=0;x<64;x+=16){c.fillStyle='#2d1a18';c.fillRect(x,0,2,64);c.fillStyle='#bc714c';c.fillRect(x+2,0,1,64)}c.fillStyle='#d0834b';for(let x=6;x<64;x+=16)for(let y=6;y<64;y+=16)c.fillRect(x,y,2,2)}
    if(kind===1){c.fillStyle='#20282c';for(let y=0;y<64;y+=20){c.fillRect(0,y,64,3);c.fillStyle='#56636a';c.fillRect(0,y+3,64,1)}for(let x=6;x<64;x+=20){c.fillStyle='#111719';c.fillRect(x,7,12,10);c.fillStyle='#748188';c.fillRect(x+2,9,2,2)}c.fillStyle='#b9472b';c.fillRect(27,0,4,64)}
    if(kind===2){c.fillStyle='#211a12';for(let x=0;x<64;x+=8){c.fillRect(x,0,2,64);c.fillStyle='#7a6235';c.fillRect(x+2,0,1,64)}c.fillStyle='#b7913c';for(let y=4;y<64;y+=12)c.fillRect(0,y,64,2)}return t};
  const textures=[makeTexture(0),makeTexture(1),makeTexture(2)];
  const map=[
    '111111111111111111','100000000000000001','101111011111011101','101001010001010001','101001011101011101',
    '100001000101000001','111101110101111101','100001010100000001','101111010111011111','101000010001010001',
    '101011111101010101','100010000001000DE1','111111111111111111'
  ].map(x=>[...x]);
  const player={x:1.5,y:1.5,a:0,hp:100,ammo:42,key:false,fire:0,bob:0};
  let enemies=[
    {x:5.5,y:3.5,hp:3,type:'raider',phase:0},{x:11.5,y:2.5,hp:4,type:'brute',phase:1.3},{x:14.5,y:5.5,hp:3,type:'raider',phase:2},
    {x:8.5,y:7.5,hp:3,type:'sentinel',phase:.7},{x:3.5,y:9.5,hp:4,type:'brute',phase:3},{x:13.5,y:10.5,hp:3,type:'sentinel',phase:4}
  ];
  const yellowKey={x:8.5,y:5.5,taken:false}, keys=new Set(); let projectiles=[], running=false,last=0,showMap=false;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const isWall=(x,y)=>{const cell=map[Math.floor(y)]?.[Math.floor(x)];return cell===undefined||cell==='1'||(cell==='D'&&!player.key)};
  function toast(t){message.textContent=t;message.classList.add('show');setTimeout(()=>message.classList.remove('show'),1400)}
  function cast(a){
    const dx=Math.cos(a),dy=Math.sin(a), mx=Math.floor(player.x),my=Math.floor(player.y);
    const ddx=Math.abs(1/(dx||.00001)),ddy=Math.abs(1/(dy||.00001));
    let sx=dx<0?-1:1,sy=dy<0?-1:1, mapX=mx,mapY=my;
    let sideX=dx<0?(player.x-mx)*ddx:(mx+1-player.x)*ddx;
    let sideY=dy<0?(player.y-my)*ddy:(my+1-player.y)*ddy, side=false;
    while(!isWall(mapX,mapY)){if(sideX<sideY){sideX+=ddx;mapX+=sx;side=false}else{sideY+=ddy;mapY+=sy;side=true}}
    const raw=side?(sideY-ddy):(sideX-ddx), hx=player.x+dx*raw,hy=player.y+dy*raw;
    let u=side?hx-Math.floor(hx):hy-Math.floor(hy);if((side&&dy>0)||(!side&&dx<0))u=1-u;
    return {d:raw*Math.cos(a-player.a),u,side,cellX:mapX,cellY:mapY};
  }
  function background(){
    const sky=ctx.createLinearGradient(0,0,0,H/2);sky.addColorStop(0,'#071019');sky.addColorStop(1,'#34404a');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H/2);
    ctx.fillStyle='#d47731';ctx.fillRect(0,H/2-2,W,2);
    for(let y=H/2;y<H;y+=2){const p=(y-H/2)/(H/2),tone=Math.floor(34+Math.min(27,p*55));ctx.fillStyle=`rgb(${tone},${tone-3},${tone-9})`;ctx.fillRect(0,y,W,2)}
    for(let y=H/2+5;y<H;y+=5){const perspective=(y-H/2)/(H/2);ctx.fillStyle=`rgba(5,8,9,${.28*perspective})`;ctx.fillRect(0,y,W,1)}
  }
  function wallSlice(x,ray,h){
    const top=H/2-h/2, shade=clamp(1-ray.d/15,.18,1)*(ray.side?.68:1), texture=textures[Math.abs(ray.cellX*3+ray.cellY*5)%textures.length], sx=clamp(Math.floor(ray.u*63),0,63);
    ctx.drawImage(texture,sx,0,1,64,x,top,2,h);ctx.fillStyle=`rgba(0,0,0,${1-shade})`;ctx.fillRect(x,top,2,h);
    if(ray.u<.025||ray.u>.975){ctx.fillStyle='rgba(0,0,0,.65)';ctx.fillRect(x,top,2,h)}
  }
  function sprite(e,depths){
    const delta=Math.atan2(e.y-player.y,e.x-player.x)-player.a, a=Math.atan2(Math.sin(delta),Math.cos(delta)),d=Math.hypot(e.x-player.x,e.y-player.y);
    if(Math.abs(a)>FOV*.62)return;const x=W/2+Math.tan(a)*W*.87,ri=clamp(Math.floor(x/2),0,RAYS-1);if(d>depths[ri]+.15)return;
    const s=Math.min(200,120/d), bob=Math.sin(e.phase*7)*s*.025,base=H/2+s*.52+bob, brute=e.type==='brute',sentinel=e.type==='sentinel', body=brute?'#563a23':sentinel?'#283f45':'#742c27', trim=brute?'#b67c32':sentinel?'#4d9aa0':'#c7462c';
    ctx.fillStyle='#0b0908';ctx.fillRect(x-s*.34,base-s*.55,s*.68,s*.58); // shadow and legs
    ctx.fillStyle=body;ctx.fillRect(x-s*(brute?.3:.25),base-s*.76,s*(brute?.6:.5),s*.52);
    ctx.fillStyle=trim;ctx.fillRect(x-s*.22,base-s*.69,s*.44,s*.13);
    if(sentinel){ctx.fillStyle='#192a2e';ctx.fillRect(x-s*.19,base-s*1.02,s*.38,s*.29);ctx.fillStyle='#58e2e5';ctx.fillRect(x-s*.12,base-s*.93,s*.24,s*.07);ctx.fillStyle='#15353a';ctx.fillRect(x-s*.4,base-s*.66,s*.15,s*.12);ctx.fillRect(x+s*.25,base-s*.66,s*.15,s*.12)}
    else {ctx.fillStyle=brute?'#b98b5e':'#c39a76';ctx.fillRect(x-s*.16,base-s*.99,s*.32,s*.31);ctx.fillStyle='#371310';ctx.fillRect(x-s*.19,base-s*.93,s*.38,s*.09);ctx.fillStyle=brute?'#ffd24f':'#ff542c';ctx.fillRect(x-s*.105,base-s*.89,s*.065,s*.052);ctx.fillRect(x+s*.04,base-s*.89,s*.065,s*.052);ctx.fillStyle='#1e1511';ctx.fillRect(x+s*.17,base-s*.61,s*.24,s*.12);ctx.fillStyle=brute?'#e9b94a':'#c18c4a';ctx.fillRect(x+s*.35,base-s*.59,s*.13,s*.07)}
  }
  function drawKey(depths){
    if(yellowKey.taken)return;const da=Math.atan2(yellowKey.y-player.y,yellowKey.x-player.x)-player.a,a=Math.atan2(Math.sin(da),Math.cos(da)),d=Math.hypot(yellowKey.x-player.x,yellowKey.y-player.y);if(Math.abs(a)>FOV/2)return;
    const x=W/2+Math.tan(a)*W*.87,ri=clamp(Math.floor(x/2),0,RAYS-1);if(d>depths[ri])return;const s=65/d;
    ctx.fillStyle='#4d3210';ctx.fillRect(x-s*.14,H/2-s*.2,s*.28,s*.54);ctx.fillStyle='#f0c13c';ctx.fillRect(x-s*.1,H/2-s*.17,s*.2,s*.45);ctx.fillRect(x-s*.28,H/2+s*.08,s*.56,s*.11);
  }
  function drawProjectile(p,depths){const da=Math.atan2(p.y-player.y,p.x-player.x)-player.a,a=Math.atan2(Math.sin(da),Math.cos(da)),d=Math.hypot(p.x-player.x,p.y-player.y);if(Math.abs(a)>FOV/2)return;const x=W/2+Math.tan(a)*W*.87,ri=clamp(Math.floor(x/2),0,RAYS-1);if(d>depths[ri])return;const s=clamp(18/d,2,14);ctx.fillStyle='#8c211f';ctx.fillRect(x-s,H/2-s,s*2,s*2);ctx.fillStyle='#ffc044';ctx.fillRect(x-s*.55,H/2-s*.55,s*1.1,s*1.1)}
  function hud(){
    ctx.fillStyle='#11100e';ctx.fillRect(0,H-38,W,38);ctx.strokeStyle='#a37a3b';ctx.strokeRect(1,H-37,W-2,35);
    ctx.fillStyle='#ded3b9';ctx.font='bold 13px monospace';ctx.fillText(`HEALTH ${Math.max(0,player.hp)|0}`,11,H-15);ctx.fillText(`SHELLS ${player.ammo}`,183,H-15);ctx.fillStyle=player.key?'#f1c53f':'#665f53';ctx.fillText('YELLOW KEY',351,H-15);
    const bob=Math.sin(player.bob)*2, flash=player.fire>0;ctx.fillStyle=flash?'#f6d890':'#553d2d';ctx.fillRect(W/2-29,H-54+bob,58,29);ctx.fillStyle='#211b17';ctx.fillRect(W/2-8,H-88+bob,16,40);ctx.fillStyle=flash?'#fff0b5':'#7b5b43';ctx.fillRect(W/2-5,H-91+bob,10,8);
    ctx.strokeStyle='#d6c7a1';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(W/2-5,H/2);ctx.lineTo(W/2+5,H/2);ctx.moveTo(W/2,H/2-5);ctx.lineTo(W/2,H/2+5);ctx.stroke();
  }
  function automap(){
    const cell=18, mw=map[0].length*cell,mh=map.length*cell,ox=(W-mw)/2,oy=(H-mh)/2;
    ctx.fillStyle='rgba(3,7,9,.91)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#d7c69c';ctx.font='bold 14px monospace';ctx.fillText('AUTOMAP  —  M: CLOSE',W/2-93,15);
    for(let y=0;y<map.length;y++)for(let x=0;x<map[y].length;x++){const c=map[y][x],px=ox+x*cell,py=oy+y*cell;ctx.fillStyle=c==='1'?'#824434':'#1b2a2d';ctx.fillRect(px,py,cell-1,cell-1);if(c==='D'){ctx.fillStyle=player.key?'#765f22':'#d7ae34';ctx.fillRect(px+2,py+2,cell-5,cell-5)}if(c==='E'){ctx.fillStyle=player.key?'#4bba73':'#af3831';ctx.fillRect(px+4,py+4,cell-9,cell-9)}}
    if(!yellowKey.taken){ctx.fillStyle='#ffe256';ctx.fillRect(ox+yellowKey.x*cell-4,oy+yellowKey.y*cell-4,8,8)}
    for(const e of enemies){ctx.fillStyle=e.type==='sentinel'?'#5de2e7':e.type==='brute'?'#dd9d3c':'#e6533d';ctx.fillRect(ox+e.x*cell-3,oy+e.y*cell-3,6,6)}
    const px=ox+player.x*cell,py=oy+player.y*cell;ctx.save();ctx.translate(px,py);ctx.rotate(player.a);ctx.fillStyle='#f0eee1';ctx.beginPath();ctx.moveTo(9,0);ctx.lineTo(-6,-5);ctx.lineTo(-3,0);ctx.lineTo(-6,5);ctx.fill();ctx.restore();
    ctx.fillStyle='#bdb6a1';ctx.font='9px monospace';ctx.fillText('YOU',12,H-25);ctx.fillStyle='#ffe256';ctx.fillRect(40,H-32,7,7);ctx.fillStyle='#bdb6a1';ctx.fillText('KEY',51,H-25);ctx.fillStyle='#d7ae34';ctx.fillRect(83,H-32,7,7);ctx.fillStyle='#bdb6a1';ctx.fillText('YELLOW DOOR',94,H-25);ctx.fillStyle='#4bba73';ctx.fillRect(186,H-32,7,7);ctx.fillStyle='#bdb6a1';ctx.fillText('EXIT',197,H-25);
  }
  function render(){
    ctx.imageSmoothingEnabled=false;background();const depths=[];
    for(let i=0;i<RAYS;i++){const ray=cast(player.a-FOV/2+i/RAYS*FOV),h=Math.min(H*2,H/(ray.d+.001));depths[i]=ray.d;wallSlice(i*2,ray,h)}
    drawKey(depths);enemies.sort((a,b)=>Math.hypot(b.x-player.x,b.y-player.y)-Math.hypot(a.x-player.x,a.y-player.y)).forEach(e=>sprite(e,depths));projectiles.forEach(p=>drawProjectile(p,depths));hud();if(showMap)automap();
    if(player.hp<=0)end('КРЕПОСТЬ ПОГЛОТИЛА ВАС');
  }
  function shoot(){if(!running||player.ammo<1||player.fire>0)return;player.ammo--;player.fire=.12;let hit,best=99;for(const e of enemies){const d=Math.hypot(e.x-player.x,e.y-player.y),q=Math.abs(Math.atan2(Math.sin(Math.atan2(e.y-player.y,e.x-player.x)-player.a),Math.cos(Math.atan2(e.y-player.y,e.x-player.x)-player.a)));if(q<.075&&d<best){hit=e;best=d}}if(hit&&best<12){hit.hp--;if(hit.hp<=0){enemies=enemies.filter(e=>e!==hit);toast('ЦЕЛЬ УНИЧТОЖЕНА')}}}
  function move(dt){
    const speed=(keys.has('ShiftLeft')||keys.has('ShiftRight')?3.8:2.3)*dt;let x=player.x,y=player.y,moving=false;
    if(keys.has('KeyW')){x+=Math.cos(player.a)*speed;y+=Math.sin(player.a)*speed;moving=true}if(keys.has('KeyS')){x-=Math.cos(player.a)*speed;y-=Math.sin(player.a)*speed;moving=true}
    if(keys.has('KeyQ')){x+=Math.cos(player.a-Math.PI/2)*speed;y+=Math.sin(player.a-Math.PI/2)*speed;moving=true}if(keys.has('KeyE')){x+=Math.cos(player.a+Math.PI/2)*speed;y+=Math.sin(player.a+Math.PI/2)*speed;moving=true}
    if(!isWall(x,player.y))player.x=x;if(!isWall(player.x,y))player.y=y;if(moving)player.bob+=dt*12;
    if(keys.has('KeyA')||keys.has('ArrowLeft'))player.a-=2.1*dt;if(keys.has('KeyD')||keys.has('ArrowRight'))player.a+=2.1*dt;
    if(!yellowKey.taken&&Math.hypot(player.x-yellowKey.x,player.y-yellowKey.y)<.55){yellowKey.taken=true;player.key=true;toast('ПОЛУЧЕН ЖЁЛТЫЙ КЛЮЧ')}
    if(map[Math.floor(player.y)][Math.floor(player.x)]==='E'&&player.key&&enemies.length===0)end('КРЕПОСТЬ ЗАЧИЩЕНА');
  }
  function updateEnemies(dt){
    for(const e of enemies){e.phase+=dt;const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy),ux=dx/(d||1),uy=dy/(d||1);let speed=0;if(e.type==='raider'&&d<6)speed=1.05;if(e.type==='brute'&&d<7)speed=.55;if(e.type==='sentinel'&&d<8){speed=.32;const side=Math.sin(e.phase*2.2);const tx=-uy*side,ty=ux*side;if(!isWall(e.x+tx*speed*dt,e.y))e.x+=tx*speed*dt;if(!isWall(e.x,e.y+ty*speed*dt))e.y+=ty*speed*dt;e.cooldown=(e.cooldown||0)-dt;if(e.cooldown<=0&&d>2){projectiles.push({x:e.x,y:e.y,vx:ux*2.3,vy:uy*2.3,life:4});e.cooldown=1.6+Math.random()*.8}}if(speed){const nx=e.x+ux*speed*dt,ny=e.y+uy*speed*dt;if(!isWall(nx,e.y))e.x=nx;if(!isWall(e.x,ny))e.y=ny}if(d<1.05)player.hp-=(e.type==='brute'?13:7)*dt}
    projectiles=projectiles.filter(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(Math.hypot(p.x-player.x,p.y-player.y)<.28){player.hp-=12;return false}return p.life>0&&!isWall(p.x,p.y)})
  }
  function update(t){if(!running)return;const dt=Math.min(.05,(t-last)/1000||0);last=t;if(!showMap){move(dt);updateEnemies(dt);player.fire=Math.max(0,player.fire-dt)}render();requestAnimationFrame(update)}
  function end(title){if(!running)return;running=false;start.querySelector('h1').textContent=title;start.querySelector('p:not(.eyebrow)').textContent='Нажмите кнопку, чтобы начать уровень заново.';play.textContent='ПОВТОРИТЬ';start.classList.remove('hidden');document.exitPointerLock?.()}
  play.onclick=()=>{if(play.textContent!=='НАЧАТЬ'){location.reload();return}running=true;start.classList.add('hidden');last=performance.now();canvas.requestPointerLock?.();requestAnimationFrame(update)};
  addEventListener('keydown',e=>{keys.add(e.code);if(e.code==='KeyM'&&!e.repeat&&running){showMap=!showMap;toast(showMap?'КАРТА ОТКРЫТА':'КАРТА ЗАКРЫТА')}if(e.code==='Space'){e.preventDefault();shoot()}});addEventListener('keyup',e=>keys.delete(e.code));canvas.addEventListener('click',()=>{if(running){canvas.requestPointerLock?.();shoot()}});document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas)player.a+=e.movementX*.0028});
})();
