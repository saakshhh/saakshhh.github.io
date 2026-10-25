/* Four distinct, interactive Three.js scenes. All geometry is generated locally. */
(function(){
  'use strict';
  const canvas=document.querySelector('[data-scene]');
  if(!canvas||!window.THREE)return;
  const type=canvas.dataset.scene;
  const host=canvas.parentElement;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try {renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});}catch(e){host.classList.add('scene-unavailable');return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
  renderer.setClearColor(0x000000,0);
  const scene=new THREE.Scene();
  const cam=new THREE.PerspectiveCamera(40,1,0.1,100);
  cam.position.set(0,0,13);
  const root=new THREE.Group();scene.add(root);
  scene.add(new THREE.AmbientLight(0xc5d5ff,0.75));
  const sun=new THREE.DirectionalLight(0xffffff,2.25);sun.position.set(-4,7,10);scene.add(sun);
  const rim=new THREE.PointLight(0xfa503d,2.2,28);rim.position.set(5,-2,-1);scene.add(rim);
  const C={red:0xfa503d,ice:0xa5b7ff,amber:0xffc277,white:0xf6f4ef,blue:0x526ab3,base:0x141d3f};
  const tmp=new THREE.Vector3();
  const standard=(color,emissive,transparency)=>new THREE.MeshStandardMaterial({color,roughness:.29,metalness:.47,emissive:emissive||0x000000,emissiveIntensity:.19,transparent:!!transparency,opacity:transparency||1,side:THREE.DoubleSide});
  const lineMat=(color,opacity)=>new THREE.LineBasicMaterial({color,transparent:true,opacity:opacity===undefined?1:opacity,depthWrite:false});
  const glowMat=(color,opacity)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
  function line(points,col,alpha){const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),lineMat(col,alpha));root.add(l);return l;}
  function ball(pos,r,color,emissive){const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(r,2),standard(color,emissive||color));mesh.position.copy(pos);root.add(mesh);return mesh;}
  function ring(radius,tube,color,opacity,tiltX,tiltY,group){const m=new THREE.Mesh(new THREE.TorusGeometry(radius,tube,8,180),glowMat(color,opacity));m.rotation.set(tiltX||0,tiltY||0,0);(group||root).add(m);return m;}
  function stars(count,spread){const pos=new Float32Array(count*3);for(let i=0;i<count;i++){pos[i*3]=(Math.random()-.5)*spread;pos[i*3+1]=(Math.random()-.5)*spread*.9;pos[i*3+2]=-4-Math.random()*11;}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));const p=new THREE.Points(geo,new THREE.PointsMaterial({color:C.ice,size:.035,transparent:true,opacity:.48,depthWrite:false}));scene.add(p);return p;}
  const state={spin:null,update:()=>{},cameraZ:13};
  stars(310,24);
  // ABOUT: network of ideas, disciplines and connections
  if(type==='about'){
    const system=new THREE.Group();root.add(system);state.spin=system;state.cameraZ=12.5;
    const core=new THREE.Mesh(new THREE.IcosahedronGeometry(1.13,4),standard(0x192f6a,C.blue));system.add(core);
    const cage=new THREE.Mesh(new THREE.IcosahedronGeometry(1.32,1),new THREE.MeshBasicMaterial({color:C.ice,transparent:true,opacity:.27,wireframe:true}));system.add(cage);
    const hub=new THREE.Mesh(new THREE.IcosahedronGeometry(.46,2),standard(C.red,C.red));system.add(hub);
    let orbital=[];let nodes=[];
    for(let k=0;k<4;k++){
      const g=new THREE.Group();g.rotation.set(.15+k*.5,k*.85,.2);system.add(g);
      const orbit=new THREE.Mesh(new THREE.TorusGeometry(2.15+k*.13,.013,6,170),glowMat(k%2?C.red:C.ice,.46));g.add(orbit);
      const angle=[0.25,1.82,3.65,5.35][k];
      const pos=new THREE.Vector3(Math.cos(angle)*(2.15+k*.13),Math.sin(angle)*(2.15+k*.13),0);
      const marker=new THREE.Mesh(new THREE.IcosahedronGeometry(.23,2),standard([C.red,C.ice,C.amber,C.white][k]));marker.position.copy(pos);g.add(marker);
      const shell=new THREE.Mesh(new THREE.IcosahedronGeometry(.33,1),new THREE.MeshBasicMaterial({color:[C.red,C.ice,C.amber,C.white][k],transparent:true,opacity:.23,wireframe:true}));marker.add(shell);
      orbital.push({g,marker,k});
    }
    const nodePositions=[];
    for(let i=0;i<33;i++){
      const y=1-2*(i+.5)/33,a=i*Math.PI*(3-Math.sqrt(5)),r=Math.sqrt(1-y*y),v=new THREE.Vector3(Math.cos(a)*r*1.87,y*1.87,Math.sin(a)*r*1.87);
      nodePositions.push(v);
      const d=new THREE.Mesh(new THREE.SphereGeometry(i%6===0?.075:.033,8,8),glowMat(i%5===0?C.red:C.ice,i%6===0?1:.6));d.position.copy(v);system.add(d);nodes.push(d);
    }
    for(let i=0;i<nodePositions.length;i++)for(let j=i+1;j<nodePositions.length;j++)if(nodePositions[i].distanceTo(nodePositions[j])<1.18){
      const geo=new THREE.BufferGeometry().setFromPoints([nodePositions[i],nodePositions[j]]);system.add(new THREE.Line(geo,lineMat(C.ice,.23)));
    }
    const outer=ring(3.1,.013,C.amber,.16,.95,.5,system);
    state.update=t=>{core.rotation.set(t*.06,t*.15,0);cage.rotation.y=-t*.13;orbital.forEach((x,i)=>{x.g.rotation.z+=i%2?.00032:-.00026;x.marker.rotation.y=t*.55});outer.rotation.z=t*.08;hub.rotation.y=t*.3;};
  }
  // EXPERIENCE: telemetry-like trajectory through career milestones
  if(type==='experience'){
    state.cameraZ=14;
    const track=new THREE.Group();root.add(track);state.spin=track;
    const xs=[-4.0,-2.15,-.3,1.55,3.4],heights=[1.3,2.1,2.8,3.6,4.4];
    let markers=[];
    const routePoints=[];
    for(let i=0;i<5;i++){
      const x=xs[i],y=-2.55+heights[i];
      const pillar=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,heights[i],12),glowMat(i===4?C.red:C.ice,.55));pillar.position.set(x,-2.55+heights[i]/2,-.15);track.add(pillar);
      // rectangular pedestal and its top marker
      const base=new THREE.Mesh(new THREE.BoxGeometry(.76,.14,.72),standard(0x25345c));base.position.set(x,-2.58,0);track.add(base);
      const top=new THREE.Mesh(new THREE.IcosahedronGeometry(i===4?.23:.18,2),standard(i===4?C.red:C.amber,i===4?C.red:C.amber));top.position.set(x,y,0);track.add(top);
      const halo=ring(.39,.014,i===4?C.red:C.ice,.73,0,0,track);halo.position.set(x,y,0);halo.rotation.x=.32;
      const vertical=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,y+.1,0),new THREE.Vector3(x,y+.1,-2.7)]),lineMat(C.ice,.22));track.add(vertical);
      const txt=labelTexture(String(2023+Math.min(i,3)));const tag=new THREE.Sprite(new THREE.SpriteMaterial({map:txt,transparent:true,depthWrite:false}));tag.scale.set(.9,.26,1);tag.position.set(x,-3.0,.5);track.add(tag);
      markers.push({top,halo,index:i,y});routePoints.push(new THREE.Vector3(x,y,0));
    }
    const curve=new THREE.CatmullRomCurve3(routePoints);const path=new THREE.Mesh(new THREE.TubeGeometry(curve,110,.065,10,false),glowMat(C.red,.9));track.add(path);
    const wideLine=new THREE.Mesh(new THREE.TubeGeometry(curve,110,.15,8,false),glowMat(C.red,.1));track.add(wideLine);
    const moving=new THREE.Mesh(new THREE.IcosahedronGeometry(.19,2),standard(C.white,C.red));track.add(moving);
    const floor=new THREE.GridHelper(18,24,C.blue,C.base);floor.position.y=-2.7;floor.material.transparent=true;floor.material.opacity=.34;track.add(floor);
    for(let i=0;i<8;i++){const y=-2.6+i*.52;const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-5.2,y,-1.8),new THREE.Vector3(5.2,y,-1.8)]),lineMat(C.ice,.07));track.add(l);}
    track.rotation.x=-.18;track.rotation.y=-.24;
    state.update=t=>{const u=(t*.035)%1;moving.position.copy(curve.getPointAt(u));markers.forEach((m,i)=>{m.top.rotation.y=t*.65+i;m.halo.scale.setScalar(1+.09*Math.sin(t*2+i))});};
  }
  // PROJECTS: four individual floating, kinetic three-dimensional artifacts.
  if(type==='projects'){
    state.cameraZ=12.8;
    const exhibition=new THREE.Group();root.add(exhibition);state.spin=exhibition;
    const cells=[[-2.15,1.75,0],[2.15,1.75,.15],[-2.15,-1.85,.2],[2.15,-1.85,-.1]];
    const objects=[];
    cells.forEach((p,i)=>{
      const g=new THREE.Group();g.position.set(...p);exhibition.add(g);
      const rim=ring(1.6,.022,i%2?C.ice:C.red,.35,.52,.22,g);
      const core=new THREE.Group();g.add(core);
      if(i===0){ // BoilerPark: a 3D grid / navigation beacon
        const blocks=[];for(let r=-1;r<=1;r++)for(let c=-1;c<=1;c++){
          const h=.13+(((r+3)*5+c+5)%4)*.16;
          const cube=new THREE.Mesh(new THREE.BoxGeometry(.49,h,.49),standard((r+c)%2?0x2a4278:0x4566a6));cube.position.set(c*.56,h/2-.35,r*.56);core.add(cube);blocks.push(cube);
        }
        const pin=new THREE.Mesh(new THREE.ConeGeometry(.19,.42,6),standard(C.red,C.red));pin.position.y=.76;pin.rotation.z=Math.PI;core.add(pin);
        core.rotation.set(-.55,.65,0);
      }else if(i===1){ // sentiment: complex analytic polyhedron
        const geometry=new THREE.IcosahedronGeometry(1.03,2);
        const solid=new THREE.Mesh(geometry,standard(0x4255a0,C.blue,.85));core.add(solid);
        const wire=new THREE.Mesh(new THREE.IcosahedronGeometry(1.15,1),new THREE.MeshBasicMaterial({color:C.ice,wireframe:true,transparent:true,opacity:.6}));core.add(wire);
        for(let k=0;k<3;k++){const rr=ring(1.38,.014,[C.red,C.amber,C.ice][k],.7,k*.5,k*.4,core);}
      }else if(i===2){ // campus events: layered panels / cards
        for(let k=0;k<4;k++){
          const card=new THREE.Mesh(new THREE.BoxGeometry(1.4,.9,.09),standard(k===0?C.red:0x38528c));card.position.set((k-1.5)*.16,(k-1.5)*.23,(k-1.5)*-.24);card.rotation.y=-.15;core.add(card);
          const accent=new THREE.Mesh(new THREE.BoxGeometry(.7,.04,.12),new THREE.MeshBasicMaterial({color:C.white}));accent.position.set(card.position.x,card.position.y+.08,card.position.z+.04);core.add(accent);
        }
        core.rotation.y=-.3;
      }else{ // Snap Study: sound and intelligence rings
        const shape=new THREE.Mesh(new THREE.OctahedronGeometry(.75,1),standard(C.ice,C.blue));core.add(shape);
        const knot=new THREE.Mesh(new THREE.TorusKnotGeometry(1.03,.095,120,8,2,3),glowMat(C.red,.77));core.add(knot);
        ring(1.47,.018,C.amber,.66,.7,.3,core);
      }
      objects.push({g,core,rim,i});
    });
    state.update=t=>{objects.forEach(({g,core,rim,i})=>{g.position.y=cells[i][1]+.11*Math.sin(t*1.1+i);core.rotation.y+=i%2?.0028:-.0032;core.rotation.x+=.001;rim.rotation.z+=.0017});};
  }
  // CONTACT: open communication / beacon, radiating concentric signals.
  if(type==='contact'){
    const emitter=new THREE.Group();root.add(emitter);state.spin=emitter;state.cameraZ=12.6;
    const nucleus=new THREE.Mesh(new THREE.IcosahedronGeometry(.76,3),standard(C.red,C.red));emitter.add(nucleus);
    const inner=new THREE.Mesh(new THREE.IcosahedronGeometry(1.02,1),new THREE.MeshBasicMaterial({color:C.white,wireframe:true,transparent:true,opacity:.7}));emitter.add(inner);
    const arcs=[];
    for(let i=0;i<5;i++){
      const r=1.65+i*.42;
      const torus=new THREE.Mesh(new THREE.TorusGeometry(r,.022,8,190,Math.PI*1.6),glowMat([C.red,C.amber,C.ice][i%3],.8-i*.12));
      torus.rotation.set(.4+i*.21,1.05-i*.14,i*.34);emitter.add(torus);arcs.push(torus);
    }
    const signal=new THREE.Group();emitter.add(signal);
    for(let k=0;k<11;k++){
      const a=k*Math.PI*2/11,r=3.4;
      const v=new THREE.Vector3(Math.sin(a)*r,Math.cos(a)*r,-.5);
      const dot=new THREE.Mesh(new THREE.IcosahedronGeometry(k%2?.07:.105,1),glowMat(k%2?C.ice:C.amber,.78));dot.position.copy(v);signal.add(dot);
      const join=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),v]),lineMat(C.ice,.13));signal.add(join);
    }
    const wave=new THREE.Mesh(new THREE.TorusGeometry(4.1,.018,6,180),glowMat(C.red,.19));wave.rotation.x=.75;emitter.add(wave);
    state.update=t=>{nucleus.rotation.set(t*.16,t*.28,t*.06);inner.rotation.set(-t*.1,-t*.13,0);arcs.forEach((a,i)=>{a.rotation.z+=i%2?.0015:-.001;a.rotation.y+=.0008});signal.rotation.z=t*.06;wave.scale.setScalar(1+.04*Math.sin(t*1.3));};
  }
  function labelTexture(txt){
    const c=document.createElement('canvas');c.width=256;c.height=64;const x=c.getContext('2d');x.font='bold 36px monospace';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#aebce9';x.fillText(txt,128,30);
    return new THREE.CanvasTexture(c);
  }
  // Pointer drag rotates the sculpture. Motion is intentionally restrained.
  let pointer=false,lastX=0,lastY=0,rx=0,ry=0,vr=0,visible=true,frame=0,elapsed=0,then=0;
  function down(e){pointer=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);}
  function move(e){if(!pointer)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;ry+=dx*.0045;rx+=dy*.0035;rx=Math.max(-.7,Math.min(.7,rx));vr=dx*.00015;if(reduced)draw();}
  function up(){pointer=false;}
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('lostpointercapture',up);
  function resize(){const w=host.clientWidth,h=host.clientHeight;if(w<1||h<1)return;renderer.setSize(w,h,false);cam.aspect=w/h;cam.position.z=state.cameraZ;const scale=w<540?.78:w<800?.86:1;root.scale.setScalar(scale);cam.updateProjectionMatrix();draw();}
  function draw(){root.rotation.y=ry;root.rotation.x=rx;state.update(elapsed);cam.lookAt(0,0,0);renderer.render(scene,cam);}
  function animate(now){if(!visible||document.hidden||reduced){frame=0;return;}const dt=Math.min((now-then)/1000,.04);then=now;elapsed+=dt;if(!pointer){ry+=vr;vr*=.95;ry+=dt*.045;rx+=(-.06-rx)*dt*.55;}draw();frame=requestAnimationFrame(animate);}
  function start(){if(reduced){draw();return;}if(!frame){then=performance.now();frame=requestAnimationFrame(animate);}}
  function stop(){if(frame){cancelAnimationFrame(frame);frame=0;}}
  if('IntersectionObserver' in window){new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)start();else stop();},{threshold:.01}).observe(host);}
  document.addEventListener('visibilitychange',()=>document.hidden?stop():visible&&start());
  window.addEventListener('resize',resize,{passive:true});
  resize();start();
})();
