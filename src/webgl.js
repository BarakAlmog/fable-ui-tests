import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  IcosahedronGeometry,
  ShaderMaterial,
  Mesh,
  Color,
  MathUtils,
} from "three";

/* GLSL: Ashima 3D simplex noise -------------------------------------------- */
const noiseGLSL = /* glsl */ `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+1.0*C.xxx;
  vec3 x2=x0-i2+2.0*C.xxx;
  vec3 x3=x0-1.0+3.0*C.xxx;
  i=mod(i,289.0);
  vec4 p=permute(permute(permute(
    i.z+vec4(0.0,i1.z,i2.z,1.0))
    +i.y+vec4(0.0,i1.y,i2.y,1.0))
    +i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=1.0/7.0;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){
  float f=0.0, a=0.5;
  for(int i=0;i<3;i++){ f+=a*snoise(p); p*=2.02; a*=0.5; }
  return f;
}
`;

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uAmp;
uniform float uFreq;
uniform float uMouse;
varying vec3 vNormalW;
varying vec3 vWorldPos;
varying float vDistort;
${noiseGLSL}

vec3 distort(vec3 pos, vec3 nor){
  float n = fbm(pos * uFreq + vec3(0.0, uTime * 0.18, uTime * 0.12));
  n += 0.45 * fbm(pos * uFreq * 2.1 - vec3(uTime * 0.1));
  float amp = uAmp * (0.85 + uMouse * 0.8);
  vDistort = n;
  return pos + nor * n * amp;
}

void main(){
  vec3 nor = normalize(normal);
  vec3 displaced = distort(position, nor);

  // recompute normal via tangent neighbours
  vec3 tangent = normalize(cross(nor, vec3(0.0, 1.0, 0.0) + 0.001));
  vec3 bitangent = normalize(cross(nor, tangent));
  float eps = 0.02;
  vec3 d1 = distort(position + tangent * eps, nor);
  vec3 d2 = distort(position + bitangent * eps, nor);
  vec3 newNormal = normalize(cross(d1 - displaced, d2 - displaced));

  vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
  vWorldPos = worldPos.xyz;
  vNormalW = normalize(mat3(modelMatrix) * newNormal);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const fragmentShader = /* glsl */ `
precision highp float;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform float uTime;
varying vec3 vNormalW;
varying vec3 vWorldPos;
varying float vDistort;

void main(){
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float fres = pow(1.0 - clamp(dot(viewDir, vNormalW), 0.0, 1.0), 2.4);

  vec3 col = mix(uColorA, uColorB, fres);

  // iridescent shimmer driven by distortion + position
  float irid = 0.5 + 0.5 * sin(vDistort * 7.0 + vWorldPos.y * 2.5 + uTime * 0.8);
  col = mix(col, uColorC, irid * fres * 0.55);

  // inner glow where surface bulges outward
  col += uColorB * smoothstep(0.05, 0.45, vDistort) * 0.13;

  // subtle top light
  float topLight = clamp(dot(vNormalW, normalize(vec3(0.3, 1.0, 0.4))), 0.0, 1.0);
  col += uColorB * pow(topLight, 3.0) * 0.06;

  gl_FragColor = vec4(col, 1.0);
}
`;

export function initWebGL(canvas) {
  if (!canvas) return null;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new Scene();
  const camera = new PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.z = 4.4;

  const isMobile = window.innerWidth < 768;
  const detail = isMobile ? 4 : 6; // icosahedron subdivisions
  const geometry = new IcosahedronGeometry(1.3, detail);

  const uniforms = {
    uTime: { value: 0 },
    uAmp: { value: 0.42 },
    uFreq: { value: 0.95 },
    uMouse: { value: 0 },
    uColorA: { value: new Color(0x0a0a0d) }, // dark core
    uColorB: { value: new Color(0xc7f546) }, // lime rim
    uColorC: { value: new Color(0x7c9cff) }, // periwinkle shimmer
  };

  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
  });

  const mesh = new Mesh(geometry, material);
  scene.add(mesh);

  // ---- pointer + state ----
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let mouseEnergy = 0;
  let targetEnergy = 0;

  function onPointerMove(e) {
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = (e.clientY / window.innerHeight) * 2 - 1;
    pointer.tx = nx;
    pointer.ty = ny;
    targetEnergy = 1;
  }
  window.addEventListener("pointermove", onPointerMove, { passive: true });

  // ---- sizing (square canvas centered) ----
  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep sphere scaled to viewport so it never dominates small screens
    const fit = Math.min(w, h);
    const scale = MathUtils.clamp(fit / 720, 0.62, 1.15);
    mesh.scale.setScalar(scale);
    camera.updateProjectionMatrix();
    if (reduce) renderer.render(scene, camera); // keep static frame crisp
  }

  // Reduced motion: render a single pleasing static pose, skip the loop
  if (reduce) {
    uniforms.uTime.value = 2.4;
    mesh.rotation.set(0.2, 0.5, 0);
    resize();
    return {
      dispose() {
        geometry.dispose();
        material.dispose();
        renderer.dispose();
      },
    };
  }

  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  // ---- visibility (pause offscreen) ----
  let visible = true;
  const io = new IntersectionObserver(
    ([entry]) => (visible = entry.isIntersecting),
    { threshold: 0 }
  );
  io.observe(canvas);

  // ---- render loop (delta from rAF timestamp) ----
  let raf = 0;
  let prev = 0;
  function tick(now) {
    raf = requestAnimationFrame(tick);
    if (!prev) prev = now;
    const dt = Math.min((now - prev) / 1000, 0.05);
    prev = now;
    if (!visible) return;

    uniforms.uTime.value += dt;

    // ease pointer + energy
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    targetEnergy *= 0.94; // decay back toward 0 between moves
    mouseEnergy += (targetEnergy - mouseEnergy) * 0.08;
    uniforms.uMouse.value = mouseEnergy;

    // gentle auto-rotation + pointer parallax
    mesh.rotation.y += dt * 0.18;
    mesh.rotation.x += (pointer.y * 0.4 - mesh.rotation.x) * 0.04;
    mesh.rotation.z += (-pointer.x * 0.25 - mesh.rotation.z) * 0.04;

    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(tick);

  return {
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}
