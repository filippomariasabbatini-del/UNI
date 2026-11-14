precision highp float;
uniform vec2 uRes;
uniform float uTime, uH, uExit, uYaw, uGlow;
uniform int uObj;
uniform vec3 uTint, uAccent, uBg, uInk;
// uMat: forza del riflesso, esponente, lucentezza "silk" lungo gli strati, grana (> 0 fibre lucenti, < 0 venature)
uniform vec4 uNoz, uMat;

const vec3 CAM = vec3(0., 2.05, 4.7);
const vec3 TGT = vec3(0., .5, 0.);
const vec3 LIG = vec3(-.36, .9, .25);

float smin(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.) / k;
  return min(a, b) - h * h * k * .25;
}
float box2(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r;
}
float box3(vec3 p, vec3 b, float r) {
  vec3 q = abs(p) - b + r;
  return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.) - r;
}
float taper(vec3 p, vec3 a, vec3 b, float ra, float rb) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.);
  return length(pa - ba * h) - mix(ra, rb, h);
}
float ell(vec3 p, vec3 r) {
  float k0 = length(p / r), k1 = length(p / (r * r));
  return k0 * (k0 - 1.) / k1;
}
// Estrusione di una sagoma 2D: h = semi-spessore, e = raggio dello spigolo
float extr(float d, float z, float h, float e) {
  vec2 w = vec2(d + e, abs(z) - h + e);
  return min(max(w.x, w.y), 0.) + length(max(w, 0.)) - e;
}
float hash(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}

float tag(vec3 p) {
  vec2 q = p.xy - vec2(0., .6);
  float d = extr(box2(q, vec2(.4, .6), .2), p.z, .07, .06);
  d = smin(d, ell(vec3(q, p.z), vec3(.36, .55, .15)), .14);
  vec2 c = q + vec2(0., .1);
  d -= .02 * (smoothstep(.065, 0., abs(length(c) - .2)) + smoothstep(.11, .04, length(c)));
  return -smin(-d, length(q - vec2(0., .4)) - .085, .03);
}
float cat(vec3 p) {
  vec3 q = vec3(abs(p.x), p.y, p.z);
  float d = ell(p - vec3(0., .37, -.02), vec3(.33, .39, .3));
  d = smin(d, length(p - vec3(0., .88, .05)) - .25, .12);
  d = smin(d, taper(q, vec3(.13, 1.02, .04), vec3(.21, 1.21, .02), .085, .02), .06);
  d = smin(d, length(q - vec3(.13, .07, .2)) - .1, .1);
  return smin(d, taper(p, vec3(.26, .08, -.14), vec3(.33, .07, .17), .085, .05), .09);
}
float logo(vec3 p) {
  float d = box3(p - vec3(0., .07, 0.), vec3(.5, .07, .24), .07);
  float t = smin(box2(p.xy - vec2(0., .62), vec2(.13, .52), .06), box2(p.xy - vec2(0., 1.05), vec2(.44, .13), .09), .08);
  return smin(d, extr(t, p.z, .13, .06), .08);
}
float shape(vec3 q) {
  return uObj == 0 ? tag(q) : uObj == 1 ? cat(q) : logo(q);
}

// Dal mondo allo spazio dell'oggetto: rotazione e, a pezzo finito, sollevamento dal piano
vec3 local(vec3 p) {
  float c = cos(uYaw), s = sin(uYaw);
  return vec3(c * p.x - s * p.z, p.y - .55 * uExit * uExit, s * p.x + c * p.z);
}

// Il pezzo, tagliato alla quota di stampa
float piece(vec3 p) {
  return -smin(-shape(local(p)), uH - p.y, .008);
}

float nozzle(vec3 p) {
  vec3 q = local(p) - uNoz.xyz;
  float d = taper(q, vec3(0., .014, 0.), vec3(0., .13, 0.), .012, .06);
  d = smin(d, box3(q - vec3(0., .2, 0.), vec3(.105, .07, .085), .03), .02);
  return min(d, taper(q, vec3(0., .27, 0.), vec3(0., 3., 0.), .019, .019));
}

float scene(vec3 p) {
  return min(piece(p), nozzle(p));
}

vec3 normalAt(vec3 p) {
  vec2 e = vec2(.0015, 0.);
  return normalize(vec3(
    scene(p + e.xyy) - scene(p - e.xyy),
    scene(p + e.yxy) - scene(p - e.yxy),
    scene(p + e.yyx) - scene(p - e.yyx)));
}

// Studio procedurale per i riflessi: softbox chiari e una fascia scura all'orizzonte
vec3 env(vec3 d) {
  vec3 c = mix(uBg * .9, vec3(1.), smoothstep(-.3, .8, d.y));
  float band = smoothstep(.34, 0., abs(d.y + .04)) * (.5 + .5 * sin(atan(d.z, d.x) * 3. + 1.2));
  c = mix(c, uInk, band * .6);
  c += 1.1 * smoothstep(.62, .93, dot(d, normalize(vec3(-.6, .62, .5))));
  c += .5 * smoothstep(.8, .97, dot(d, normalize(vec3(.8, .3, .5))));
  return c;
}

float shadow(vec3 ro) {
  float res = 1., t = .03;
  for (int i = 0; i < 16; i++) {
    float h = scene(ro + LIG * t);
    res = min(res, 7. * h / t);
    t += clamp(h, .04, .22);
    if (res < .01 || t > 2.6) break;
  }
  return clamp(res, 0., 1.);
}

float occlusion(vec3 p, vec3 n) {
  float o = 0., w = 1.;
  for (int i = 1; i <= 4; i++) {
    float h = .035 * float(i);
    o += (h - scene(p + n * h)) * w;
    w *= .6;
  }
  return clamp(1. - 2.4 * o, 0., 1.);
}

// Piano di stampa e fondale: un unico piano y = 0
vec3 ground(vec3 ro, vec3 rd) {
  if (rd.y > -.001) return uBg;
  float t = -ro.y / rd.y;
  vec3 p = ro + rd * t;
  float r = length(p.xz);
  float w = .004 + t * .0012 / max(-rd.y, .1);
  vec3 c = uBg;
  c = mix(c, vec3(1.), .6 * smoothstep(1.02 + w, 1.02 - w, r));
  c -= .07 * smoothstep(w * 2.5, 0., abs(r - 1.02));
  c -= .03 * smoothstep(w * 2., 0., abs(r - .6));
  if (r < 2.2) {
    float sh = (1. - shadow(p + vec3(0., .002, 0.))) * (1. - uExit);
    float contact = smoothstep(.14, 0., piece(p)) * (1. - uExit);
    c *= 1. - .36 * sh - .2 * contact;
    // Un po' del colore del pezzo rimbalza sul piano
    c = mix(c, c * uTint, .22 * max(sh, contact));
  }
  return c;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - .5 * uRes) / min(uRes.y, uRes.x * 1.32);
  uv.y -= .065;
  vec3 f = normalize(TGT - CAM), rgt = normalize(cross(f, vec3(0., 1., 0.))), up = cross(rgt, f);
  vec3 rd = normalize(f * 2.25 + rgt * uv.x + up * uv.y);
  vec3 ro = CAM;

  // Volume utile: fuori da qui c'è solo il fondale
  vec3 inv = 1. / rd;
  vec3 t0 = (vec3(-.78, 0., -.78) - ro) * inv, t1 = (vec3(.78, 2.3, .78) - ro) * inv;
  vec3 tmin = min(t0, t1), tmax = max(t0, t1);
  float tn = max(max(tmin.x, tmin.y), tmin.z), tf = min(min(tmax.x, tmax.y), tmax.z);

  float t = tn, d = 1., edge = 1.;
  bool hit = false;
  if (tf > tn) {
    for (int i = 0; i < 72; i++) {
      d = scene(ro + rd * t);
      edge = min(edge, d / (t * .0022));
      if (d < .0012) { hit = true; break; }
      t += d * .85;
      if (t > tf) break;
    }
  }

  vec3 col = ground(ro, rd);
  if (hit) {
    vec3 p = ro + rd * t;
    vec3 n = normalAt(p);
    vec3 q = local(p);
    vec3 hv = normalize(LIG - rd);
    float fr = pow(1. - max(dot(-rd, n), 0.), 5.);
    if (nozzle(p) < piece(p)) {
      // Ugello: grafite lucida, punta calda
      vec3 c = uInk * (.55 + .5 * max(dot(n, LIG), 0.)) + env(reflect(rd, n)) * (.1 + .5 * fr);
      c += uAccent * 1.6 * smoothstep(.1, 0., q.y - uNoz.y) * uGlow;
      col = mix(col, c, uNoz.w);
    } else {
      vec3 base = uTint;
      float fresh = uGlow * exp(-(uH - p.y) * 40.);
      if (uGlow > 0. && n.y > .7 && uH - p.y < .02) {
        // Sezione in stampa: pareti piene e riempimento a griglia
        float wall = smoothstep(-.06, -.04, shape(q));
        vec2 g = abs(fract(vec2(q.x + q.z, q.x - q.z) * 8.) - .5);
        base *= mix(.52, 1., max(wall, smoothstep(.1, .06, min(g.x, g.y))));
      } else {
        // Linee di layer: increspatura della normale e solco appena più scuro
        float line = sin(q.y * 230.);
        n = normalize(n + vec3(0., .13 * line * (1. - abs(n.y)), 0.));
        base *= .94 + .06 * line;
        if (uMat.w < 0.) base *= .85 + .3 * hash(vec3(floor(q.y * 36.6), 1., 2.));
        if (uMat.w > 0.) base += .13 * uMat.w * step(.982, hash(floor(q * 150.)));
      }
      float lit = max(dot(n, LIG), 0.) * shadow(p + n * .012);
      vec3 sky = mix(uBg * .6, vec3(1.), .5 + .5 * n.y);
      vec3 c = base * (sky * .62 * occlusion(p, n) + .74 * lit);
      // Riflesso morbido, più la fascia lucida del filamento "silk" che segue gli strati
      float along = dot(normalize(cross(n, vec3(0., 1., 0.)) + 1e-4), hv);
      c += uMat.x * pow(max(dot(n, hv), 0.), uMat.y) * lit;
      c += uMat.z * mix(vec3(1.), base, .55) * pow(1. - along * along, 26.) * (.25 + .75 * lit);
      c = mix(c, env(reflect(rd, n)), fr * (.04 + .3 * uMat.x));
      // Strato appena deposto e calore dell'ugello
      c *= 1. + .22 * fresh;
      c += uAccent * uGlow * (.14 * fresh + .75 * exp(-length(q - uNoz.xyz) * 9.));
      col = mix(c, col, uExit);
    }
  } else if (edge < 1.) {
    // Antialias del profilo
    col = mix(col * mix(vec3(.72), vec3(1.), uExit), col, smoothstep(0., 1., edge));
  }
  col += .025 * (1. - 2.2 * dot(uv, uv));
  gl_FragColor = vec4(clamp(col, 0., 1.), 1.);
}
