precision highp float;
uniform vec2 uRes;
uniform float uTime, uH, uMelt, uYaw, uGlow;
uniform int uObj;
uniform vec3 uTint, uAccent, uBg, uInk;
uniform vec4 uNoz;

const vec3 CAM = vec3(0., 2.05, 4.7);
const vec3 TGT = vec3(0., .5, 0.);
const vec3 LIG = vec3(-.36, .9, .25);

// Rilievi di superficie: spenti quando il raggio viaggia dentro il vetro, così la rifrazione resta pulita
float relief = 1.;

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

float tag(vec3 p) {
  vec2 q = p.xy - vec2(0., .6);
  float d = extr(box2(q, vec2(.4, .6), .2), p.z, .07, .06);
  // Pancia a cuscino: la faccia curva riflette lo studio invece di restare piatta
  d = smin(d, ell(vec3(q, p.z), vec3(.36, .55, .15)), .14);
  vec2 c = q + vec2(0., .1);
  d -= .02 * relief * (smoothstep(.065, 0., abs(length(c) - .2)) + smoothstep(.11, .04, length(c)));
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

vec3 spin(vec3 p) {
  float c = cos(uYaw), s = sin(uYaw);
  return vec3(c * p.x - s * p.z, p.y, s * p.x + c * p.z);
}

float glass(vec3 p) {
  vec3 q = spin(p);
  float d = uObj == 0 ? tag(q) : uObj == 1 ? cat(q) : logo(q);
  if (uMelt > 0.) {
    float s = 1. - smoothstep(.5, 1., uMelt);
    vec3 r = vec3(.5, .27, .5) * max(s, .02);
    float blob = ell(q - vec3(0., r.y * .92, 0.), r);
    blob += .035 * s * sin(7. * q.x + uTime * 4.) * sin(6. * q.z - uTime * 3.);
    d = mix(d, blob, smoothstep(0., .6, uMelt));
  }
  // Taglio all'altezza di stampa, con bordo arrotondato come un menisco
  return -smin(-d, uH - p.y, .03);
}

float nozzle(vec3 p) {
  vec3 q = spin(p) - uNoz.xyz;
  float d = taper(q, vec3(0., .014, 0.), vec3(0., .13, 0.), .012, .06);
  d = smin(d, box3(q - vec3(0., .2, 0.), vec3(.105, .07, .085), .03), .02);
  return min(d, taper(q, vec3(0., .27, 0.), vec3(0., 3., 0.), .019, .019));
}

float scene(vec3 p) {
  return min(glass(p), nozzle(p));
}

vec3 normalAt(vec3 p) {
  vec2 e = vec2(.0015, 0.);
  return normalize(vec3(
    scene(p + e.xyy) - scene(p - e.xyy),
    scene(p + e.yxy) - scene(p - e.yxy),
    scene(p + e.yyx) - scene(p - e.yyx)));
}
vec3 glassNormal(vec3 p) {
  vec2 e = vec2(.0015, 0.);
  return normalize(vec3(
    glass(p + e.xyy) - glass(p - e.xyy),
    glass(p + e.yxy) - glass(p - e.yxy),
    glass(p + e.yyx) - glass(p - e.yyx)));
}

// Studio procedurale: softbox chiari e una fascia scura all'orizzonte che disegna i bordi del vetro
vec3 env(vec3 d) {
  vec3 c = mix(uBg * .9, vec3(1.), smoothstep(-.3, .8, d.y));
  float band = smoothstep(.34, 0., abs(d.y + .04)) * (.5 + .5 * sin(atan(d.z, d.x) * 3. + 1.2));
  c = mix(c, uInk, band * .82);
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

// Piano di stampa e fondale: un unico piano y = 0
vec3 ground(vec3 ro, vec3 rd, float lit) {
  if (rd.y > -.001) return env(rd);
  float t = -ro.y / rd.y;
  vec3 p = ro + rd * t;
  float r = length(p.xz);
  float w = .004 + t * .0012 / max(-rd.y, .1);
  vec3 c = uBg;
  c = mix(c, vec3(1.), .6 * smoothstep(1.02 + w, 1.02 - w, r));
  c -= .07 * smoothstep(w * 2.5, 0., abs(r - 1.02));
  c -= .03 * smoothstep(w * 2., 0., abs(r - .6));
  if (lit > 0. && r < 2.2) {
    float sh = 1. - shadow(p + vec3(0., .002, 0.));
    c *= mix(vec3(1.), mix(vec3(.62), uTint, .55), sh * .62);
    c += uTint * .2 * sh * sh * smoothstep(.75, .1, r);
    c += uAccent * uGlow * .1 * smoothstep(.9, 0., r);
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

  vec3 col = ground(ro, rd, 1.);
  if (hit) {
    vec3 p = ro + rd * t;
    if (nozzle(p) < glass(p)) {
      // Ugello: grafite lucida, punta calda
      vec3 n = normalAt(p);
      float fr = pow(1. - max(dot(-rd, n), 0.), 4.);
      vec3 q = spin(p) - uNoz.xyz;
      vec3 c = uInk * (.55 + .5 * max(dot(n, LIG), 0.)) + env(reflect(rd, n)) * (.1 + .5 * fr);
      c += uAccent * 1.6 * smoothstep(.1, 0., q.y) * uGlow;
      col = mix(col, c, uNoz.w);
    } else {
      vec3 n = glassNormal(p);
      // Linee di layer: increspatura fine della normale sulle pareti
      n = normalize(n + vec3(0., .09 * sin(p.y * 230.) * (1. - abs(n.y)), 0.));
      float fr = .05 + .95 * pow(1. - max(dot(-rd, n), 0.), 5.);
      vec3 refl = env(reflect(rd, n));

      vec3 ri = refract(rd, n, 1. / 1.46);
      relief = 0.;
      float ti = .045;
      vec3 pi = p;
      for (int i = 0; i < 20; i++) {
        pi = p + ri * ti;
        float h = -glass(pi);
        if (h < .002) break;
        ti += max(h, .012);
        if (ti > 2.2) break;
      }
      vec3 n2 = -glassNormal(pi);
      vec3 ro2 = pi - n2 * .004;
      vec3 through;
      for (int k = 0; k < 3; k++) {
        vec3 rr = refract(ri, n2, 1.44 + .025 * float(k));
        if (dot(rr, rr) < .5) rr = reflect(ri, n2);
        float v = ground(ro2, rr, 0.)[k];
        if (k == 0) through.r = v; else if (k == 1) through.g = v; else through.b = v;
      }
      vec3 absorb = exp(-(1. - uTint) * (.3 + ti * 2.1));
      vec3 c = through * absorb + uTint * .1 * (1. - exp(-ti * 3.));
      c = mix(c, refl, fr);
      vec3 rv = reflect(rd, n);
      c += 1.2 * pow(max(dot(rv, LIG), 0.), 120.) + .22 * pow(max(dot(rv, LIG), 0.), 12.);
      // Ultimo strato ancora caldo
      c += uAccent * uGlow * (1.3 * exp(-(uH - p.y) * 24.) + .12 * exp(-(uH - p.y) * 7.));
      col = c;
    }
  } else if (edge < 1.) {
    // Antialias del profilo
    col = mix(col * mix(uTint, vec3(1.), .5) * .8, col, smoothstep(0., 1., edge));
  }
  col += .025 * (1. - 2.2 * dot(uv, uv));
  gl_FragColor = vec4(clamp(col, 0., 1.), 1.);
}
