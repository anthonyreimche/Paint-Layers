// src/runtime.ts
var e = null;
function t(t) {
	e = t;
}
function n() {
	if (!e) throw Error("[paint-layers] api() called before activate()");
	return e;
}
function r(e, t, ...r) {
	return n().react.createElement(e, t, ...r);
}
// src/store.ts
var i = {
	brushSpacing: .25,
	brushScatter: 0,
	brushCount: 1,
	brushSizeJitter: 0,
	brushAngle: 0,
	brushAngleJitter: 0,
	brushFollowStroke: !1,
	brushFlowJitter: 0
};
function a(e) {
	return {
		brushSpacing: e?.spacing ?? i.brushSpacing,
		brushScatter: e?.scatter ?? i.brushScatter,
		brushCount: e?.count ?? i.brushCount,
		brushSizeJitter: e?.sizeJitter ?? i.brushSizeJitter,
		brushAngle: e?.angle ?? i.brushAngle,
		brushAngleJitter: e?.angleJitter ?? i.brushAngleJitter,
		brushFollowStroke: e?.followStroke ?? i.brushFollowStroke,
		brushFlowJitter: e?.flowJitter ?? i.brushFlowJitter
	};
}
var o = null;
function s() {
	return o = n().stores.create((e) => ({
		armed: !1,
		activeLayerId: null,
		color: "#ffffff",
		brushSize: .08,
		brushFeather: .5,
		brushOpacity: 1,
		brushFlow: 1,
		brushErase: !1,
		brushPreview: !1,
		tip: null,
		...i,
		setArmed: (t) => e({ armed: t }),
		toggleArmed: () => e((e) => ({ armed: !e.armed })),
		setActiveLayer: (t) => e({ activeLayerId: t }),
		setColor: (t) => e({ color: t }),
		setBrushSize: (t) => e({ brushSize: t }),
		setBrushFeather: (t) => e({ brushFeather: t }),
		setBrushOpacity: (t) => e({ brushOpacity: t }),
		setBrushFlow: (t) => e({ brushFlow: t }),
		setBrushErase: (t) => e({ brushErase: t }),
		setBrushPreview: (t) => e({ brushPreview: t }),
		pickTip: (t, n) => e(t === null ? { tip: null } : {
			tip: t,
			...a(n)
		}),
		setBrushDynamics: (t) => e(t)
	})), o;
}
function c() {
	if (!o) throw Error("[paint-layers] store used before activate()");
	return o;
}
// src/stage.ts
var l = "paint-layers", u = `${l}.composite`, d = {
	mode: 0,
	opacity: 1,
	visible: !0
}, f = (e, t) => `${u}.${e}${t}`, p = {
	layers: `${u}.layers`,
	highlight: `${u}.highlight`,
	highlightStrength: `${u}.highlightStrength`
}, m = [
	.9,
	.25,
	.25
], h = .5, g = [{
	key: "highlight",
	glslType: "int",
	default: -1,
	range: {
		min: -1,
		max: 3,
		step: 1
	},
	label: "Highlighted layer"
}, {
	key: "highlightStrength",
	glslType: "float",
	default: 0,
	range: {
		min: 0,
		max: 1
	},
	label: "Highlight strength"
}], _ = Array.from({ length: 4 }, (e, t) => t), v = (e) => [
	{
		key: `mode${e}`,
		glslType: "int",
		default: d.mode,
		range: {
			min: 0,
			max: 15,
			step: 1
		},
		label: `Layer ${e + 1} blend mode`
	},
	{
		key: `opacity${e}`,
		glslType: "float",
		default: d.opacity,
		range: {
			min: 0,
			max: 1
		},
		label: `Layer ${e + 1} opacity`
	},
	{
		key: `visible${e}`,
		glslType: "bool",
		default: d.visible,
		label: `Layer ${e + 1} visible`
	}
], y = "\nfloat plLum(vec3 c) { return dot(c, vec3(0.3, 0.59, 0.11)); }\nfloat plSat(vec3 c) { return max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b)); }\nvec3 plClipColor(vec3 c) {\n  float l = plLum(c);\n  float n = min(c.r, min(c.g, c.b));\n  float x = max(c.r, max(c.g, c.b));\n  vec3 o = c;\n  if (n < 0.0) o = l + (o - l) * (l / (l - n));\n  if (x > 1.0) o = l + (o - l) * ((1.0 - l) / (x - l));\n  return o;\n}\nvec3 plSetLum(vec3 c, float l) { return plClipColor(c + (l - plLum(c))); }\nvec3 plSetSat(vec3 c, float s) {\n  float mx = max(c.r, max(c.g, c.b));\n  float mn = min(c.r, min(c.g, c.b));\n  return mx > mn ? (c - mn) * (s / (mx - mn)) : vec3(0.0);\n}\nfloat plDodge(float cb, float cs) { return cb <= 0.0 ? 0.0 : (cs >= 1.0 ? 1.0 : min(1.0, cb / (1.0 - cs))); }\nfloat plBurn(float cb, float cs) { return cb >= 1.0 ? 1.0 : (cs <= 0.0 ? 0.0 : 1.0 - min(1.0, (1.0 - cb) / cs)); }\nvec3 plHardLight(vec3 cb, vec3 cs) {\n  vec3 s2 = 2.0 * cs - 1.0;\n  return mix(cb + s2 - cb * s2, cb * (2.0 * cs), vec3(lessThanEqual(cs, vec3(0.5))));\n}\nfloat plSoftLight(float cb, float cs) {\n  if (cs <= 0.5) return cb - (1.0 - 2.0 * cs) * cb * (1.0 - cb);\n  float d = cb <= 0.25 ? ((16.0 * cb - 12.0) * cb + 4.0) * cb : sqrt(cb);\n  return cb + (2.0 * cs - 1.0) * (d - cb);\n}\nvec3 plBlend(int mode, vec3 cb, vec3 cs) {\n  if (mode == 1) return cb * cs;\n  if (mode == 2) return cb + cs - cb * cs;\n  if (mode == 3) return plHardLight(cs, cb);\n  if (mode == 4) return min(cb, cs);\n  if (mode == 5) return max(cb, cs);\n  if (mode == 6) return vec3(plDodge(cb.r, cs.r), plDodge(cb.g, cs.g), plDodge(cb.b, cs.b));\n  if (mode == 7) return vec3(plBurn(cb.r, cs.r), plBurn(cb.g, cs.g), plBurn(cb.b, cs.b));\n  if (mode == 8) return plHardLight(cb, cs);\n  if (mode == 9) return vec3(plSoftLight(cb.r, cs.r), plSoftLight(cb.g, cs.g), plSoftLight(cb.b, cs.b));\n  if (mode == 10) return abs(cb - cs);\n  if (mode == 11) return cb + cs - 2.0 * cb * cs;\n  if (mode == 12) return plSetLum(plSetSat(cs, plSat(cb)), plLum(cb));\n  if (mode == 13) return plSetLum(plSetSat(cb, plSat(cs)), plLum(cb));\n  if (mode == 14) return plSetLum(cs, plLum(cb));\n  if (mode == 15) return plSetLum(cb, plLum(cs));\n  return cs;\n}\nvec3 plComposite(vec3 c, vec4 paint, int mode, float opacity) {\n  float a = paint.a * clamp(opacity, 0.0, 1.0);\n  if (a <= 0.0) return c;\n  return mix(c, plBlend(mode, clamp(c, 0.0, 1.0), paint.rgb), a);\n}", [ee, te, b] = m, x = [..._.map((e) => `if (visible${e}) c = plComposite(c, layers(${e}, srcUv), mode${e}, opacity${e});`), `if (highlight >= 0) c = mix(c, vec3(${ee}, ${te}, ${b}), layers(highlight, srcUv).a * highlightStrength);`].join("\n");
function S() {
	return {
		id: u,
		name: "Paint Layers",
		phase: "effects",
		presetScope: "per-image",
		space: { encoding: "perceptual" },
		uniforms: [..._.flatMap(v), ...g],
		textures: [{
			key: "layers",
			kind: "paint"
		}],
		helpers: y,
		glsl: x
	};
}
// src/brush.ts
function ne(e, t) {
	if (e.tip !== null && t.includes(e.tip)) return {
		id: e.tip,
		spacing: e.brushSpacing,
		scatter: e.brushScatter,
		count: e.brushCount,
		sizeJitter: e.brushSizeJitter,
		angleJitter: e.brushAngleJitter,
		flowJitter: e.brushFlowJitter,
		angle: e.brushAngle,
		followStroke: e.brushFollowStroke
	};
}
var C = .02, w = .25;
function T(e, t, n, r, i) {
	return {
		x: e.x,
		y: e.y,
		radius: t.brushSize,
		erase: r || t.brushErase,
		feather: t.brushFeather,
		opacity: t.brushOpacity,
		flow: t.brushFlow,
		color: [
			n[0],
			n[1],
			n[2]
		],
		...i ? { strokeStart: !0 } : {}
	};
}
function E(e, t, n) {
	return Math.hypot((t.x - e.x) * n, t.y - e.y);
}
function D(e) {
	return e.tip ? e.tip.spacing * 2 * e.brushSize : e.brushSize * w;
}
function O(e, t, n, r) {
	return E(e, t, r) >= D(n);
}
function k(e, t, n, r, i, a, o, s) {
	let c = n.tip;
	if (!c) return [T(e, n, r, a, o)];
	let l = t.x * i, u = t.y, d = Math.hypot(l, u), f = d > 0 ? l / d : 1, p = d > 0 ? u / d : 0, m = Math.atan2(p, f), h = n.brushSize * 2, g = [];
	for (let t = 0; t < c.count; t++) {
		let l = c.scatter * h * (2 * s() - 1), u = s(), d = s(), _ = s(), v = o && t === 0, y = T({
			x: e.x + -p * l / i,
			y: e.y + f * l
		}, n, r, a, v);
		y.radius = Math.max(n.brushSize * C, n.brushSize * (1 - c.sizeJitter * u)), y.flow = n.brushFlow * (1 - c.flowJitter * _), y.angle = c.angle + (c.followStroke ? m : 0) + c.angleJitter * Math.PI * (2 * d - 1), v && (y.tip = c.id), g.push(y);
	}
	return g;
}
function A(e, t, n, r, i, a, o = Math.random) {
	let s = Math.max(1, Math.ceil(E(e, t, i) / D(n))), c = {
		x: t.x - e.x,
		y: t.y - e.y
	}, l = [];
	for (let t = 1; t <= s; t++) {
		let u = t / s, d = {
			x: e.x + c.x * u,
			y: e.y + c.y * u
		};
		l.push(...k(d, c, n, r, i, a, t === 1, o));
	}
	return l;
}
function j(e) {
	let t = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(e);
	return t ? [
		parseInt(t[1], 16) / 255,
		parseInt(t[2], 16) / 255,
		parseInt(t[3], 16) / 255
	] : [
		1,
		1,
		1
	];
}
// src/keys.ts
var M = {
	"brush.smaller": {
		key: "brushSize",
		step: -.01,
		min: .01,
		max: .5
	},
	"brush.larger": {
		key: "brushSize",
		step: .01,
		min: .01,
		max: .5
	},
	"brush.featherDown": {
		key: "brushFeather",
		step: -.05,
		min: 0,
		max: 1
	},
	"brush.featherUp": {
		key: "brushFeather",
		step: .05,
		min: 0,
		max: 1
	},
	"brush.opacityDown": {
		key: "brushOpacity",
		step: -.1,
		min: .01,
		max: 1
	},
	"brush.opacityUp": {
		key: "brushOpacity",
		step: .1,
		min: .01,
		max: 1
	},
	"brush.flowDown": {
		key: "brushFlow",
		step: -.1,
		min: .01,
		max: 1
	},
	"brush.flowUp": {
		key: "brushFlow",
		step: .1,
		min: .01,
		max: 1
	}
};
function N(e, t) {
	let n = M[e];
	if (!n) return null;
	let r = Math.round((t[n.key] + n.step) * 100) / 100;
	return { [n.key]: Math.max(n.min, Math.min(n.max, r)) };
}
// src/blend.ts
var P = [
	{
		id: "normal",
		label: "Normal"
	},
	{
		id: "multiply",
		label: "Multiply"
	},
	{
		id: "screen",
		label: "Screen"
	},
	{
		id: "overlay",
		label: "Overlay"
	},
	{
		id: "darken",
		label: "Darken"
	},
	{
		id: "lighten",
		label: "Lighten"
	},
	{
		id: "colorDodge",
		label: "Colour Dodge"
	},
	{
		id: "colorBurn",
		label: "Colour Burn"
	},
	{
		id: "hardLight",
		label: "Hard Light"
	},
	{
		id: "softLight",
		label: "Soft Light"
	},
	{
		id: "difference",
		label: "Difference"
	},
	{
		id: "exclusion",
		label: "Exclusion"
	},
	{
		id: "hue",
		label: "Hue"
	},
	{
		id: "saturation",
		label: "Saturation"
	},
	{
		id: "color",
		label: "Colour"
	},
	{
		id: "luminosity",
		label: "Luminosity"
	}
];
Object.fromEntries(P.map((e, t) => [e.id, t]));
// src/layers.ts
var F = (e) => typeof e == "number" && Number.isFinite(e), I = (e) => typeof e == "object" && !!e;
function re(e) {
	if (!I(e)) return !1;
	let t = e.color;
	return F(e.x) && F(e.y) && F(e.radius) && F(e.feather) && F(e.opacity) && F(e.flow) && typeof e.erase == "boolean" && (e.strokeStart === void 0 || typeof e.strokeStart == "boolean") && (e.tip === void 0 || typeof e.tip == "string") && (e.angle === void 0 || F(e.angle)) && Array.isArray(t) && t.length === 3 && t.every(F);
}
function L(e) {
	return Number.isInteger(e) && F(e) && e >= 0 && e < P.length ? e : d.mode;
}
function R(e) {
	return F(e) && e >= 0 && e <= 1 ? e : d.opacity;
}
function ie(e) {
	return typeof e == "boolean" ? e : F(e) ? e !== 0 : d.visible;
}
function ae(e) {
	let t = e[p.layers];
	return Array.isArray(t) ? t.slice(0, 4).map((t, n) => {
		let r = I(t) ? t : {};
		return {
			id: typeof r.id == "string" && r.id ? r.id : `layer-${n}`,
			name: typeof r.name == "string" ? r.name : `Layer ${n + 1}`,
			dabs: Array.isArray(r.dabs) ? r.dabs.filter(re) : [],
			mode: L(e[f("mode", n)]),
			opacity: R(e[f("opacity", n)]),
			visible: ie(e[f("visible", n)])
		};
	}) : [];
}
function oe(e) {
	let t = { [p.layers]: se(e) };
	for (let n = 0; n < 4; n++) {
		let r = e[n];
		t[f("mode", n)] = r ? r.mode : d.mode, t[f("opacity", n)] = r ? r.opacity : d.opacity, t[f("visible", n)] = r ? r.visible : d.visible;
	}
	return t;
}
function se(e) {
	return e.map(({ id: e, name: t, dabs: n }) => ({
		id: e,
		name: t,
		dabs: n
	}));
}
function ce(e) {
	let t = new Set(e.map((e) => e.name)), n = 1;
	for (; t.has(`Layer ${n}`);) n++;
	return `Layer ${n}`;
}
function z(e, t) {
	return e.length >= 4 ? e : [...e, {
		id: t,
		name: ce(e),
		dabs: [],
		...d
	}];
}
function B(e, t) {
	return e.filter((e) => e.id !== t);
}
function V(e, t, n) {
	let r = e.findIndex((e) => e.id === t), i = r + n;
	if (r < 0 || i < 0 || i >= e.length) return e;
	let a = [...e];
	return [a[r], a[i]] = [a[i], a[r]], a;
}
function H(e, t, n) {
	return e.map((e) => e.id === t ? {
		...e,
		...n
	} : e);
}
function U(e, t, n) {
	return e.some((e) => e.id === t) ? e.map((e) => e.id === t ? {
		...e,
		dabs: [...e.dabs, ...n]
	} : e) : e;
}
function le(e, t) {
	return e.find((e) => e.id === t) ?? e[e.length - 1] ?? null;
}
// src/persistence.ts
function W() {
	return n().stores.useDevelopStore.getState();
}
var G = () => ae(W().paramBag);
function ue() {
	return `layer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function K(e) {
	W().setDynParams(oe(e));
}
function q(e, t) {
	K(e), W().commitEdit(t);
}
function de(e, t) {
	let n = G(), r = le(n, e);
	if (r) return fe(r.id, t), r.id;
	let i = ue();
	return K(U(z(n, i), i, t)), i;
}
function fe(e, t) {
	W().setDynParams({ [p.layers]: se(U(G(), e, t)) });
}
function pe() {
	return W().commitEdit("Paint Stroke");
}
function me() {
	let e = G(), t = ue(), n = z(e, t);
	return n === e ? null : (q(n, "Add Paint Layer"), t);
}
function he(e) {
	q(B(G(), e), "Delete Paint Layer");
}
function ge(e, t) {
	let n = G(), r = V(n, e, t);
	r !== n && q(r, "Move Paint Layer");
}
function J(e, t, n) {
	let r = H(G(), e, t);
	n ? q(r, n) : K(r);
}
function _e(e) {
	W().commitEdit(e);
}
function ve(e) {
	q(H(G(), e, { dabs: [] }), "Clear Paint Layer");
}
async function ye() {
	K([]), await W().commitEdit("Reset Paint Layers");
}
// src/Overlay.ts
var be = {
	position: "absolute",
	display: "none",
	transform: "translate(-50%, -50%)",
	borderRadius: "50%",
	boxShadow: "0 0 0 1px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.35)",
	pointerEvents: "none"
};
function xe(e) {
	let { brushSize: t, brushFeather: r, brushOpacity: i, brushFlow: a, brushErase: o } = e, s = ne(e, n().develop.brushTips().map((e) => e.id));
	return {
		brushSize: t,
		brushFeather: r,
		brushOpacity: i,
		brushFlow: a,
		brushErase: o,
		...s ? { tip: s } : {}
	};
}
function Se(e) {
	return e instanceof HTMLElement && (e.tagName === "INPUT" || e.tagName === "TEXTAREA" || e.isContentEditable);
}
function Ce() {
	let e = n().react, t = n().stores.useDevelopStore, i = c()((e) => e.armed), a = c()((e) => e.color), o = t((e) => e.photoId), s = c()((e) => e.brushSize), l = c()((e) => e.brushFeather), u = c()((e) => e.brushErase), d = c()((e) => e.brushPreview), f = c()((e) => e.tip), p = !n().develop.useBrushTips().some((e) => e.id === f), { rect: m, imageRect: h, toImage: g, toScreen: _, radiusToScreen: v } = n().develop.useDevelopOverlay(), [y, ee] = e.useState(!1), [te, b] = e.useState(!1), x = e.useRef(!1), S = e.useRef(null), ne = e.useRef(null), C = e.useRef(null), w = e.useRef(null), T = e.useRef({
		lx: 0,
		ly: 0,
		shown: !1
	}), E = i && !!m && !!o && !!g && !!_ && !!v, D = h && h.h > 0 ? h.w / h.h : 1, M = (e) => {
		x.current = e, ee(e);
	};
	e.useEffect(() => {
		if (E && !y) return n().develop.setCanvasCursor("none", { priority: 20 });
	}, [E, y]), e.useEffect(() => {
		C.current = null, w.current = null;
	}, [o]), e.useEffect(() => {
		if (!E) {
			M(!1);
			return;
		}
		let e = (e) => {
			Se(e.target) || ((e.code === "Space" || e.ctrlKey || e.metaKey) && M(!0), e.altKey && b(!0));
		}, t = (e) => {
			e.code !== "Space" && (e.ctrlKey || e.metaKey) || M(!1), e.altKey || b(!1);
		}, n = () => {
			M(!1), b(!1);
		};
		return window.addEventListener("keydown", e, !0), window.addEventListener("keyup", t, !0), window.addEventListener("blur", n), () => {
			window.removeEventListener("keydown", e, !0), window.removeEventListener("keyup", t, !0), window.removeEventListener("blur", n), M(!1);
		};
	}, [E]);
	let N = (e, t, n) => {
		T.current = {
			lx: e,
			ly: t,
			shown: n
		};
		let r = c().getState(), i = v ? v(r.brushSize) : 0, a = (n, r, i) => {
			n && (n.style.display = i ? "block" : "none", n.style.width = `${r}px`, n.style.height = `${r}px`, n.style.left = `${e}px`, n.style.top = `${t}px`);
		};
		a(S.current, Math.max(3, i) * 2, n), a(ne.current, Math.max(1, i * (1 - r.brushFeather)) * 2, n && !xe(r).tip);
	};
	e.useEffect(() => {
		T.current.shown && N(T.current.lx, T.current.ly, !0);
	}, [
		s,
		l,
		p
	]), e.useEffect(() => {
		y && C.current && (C.current = null, pe(), N(0, 0, !1));
	}, [y]);
	let P = (e) => {
		let t = e.currentTarget.getBoundingClientRect(), r = n().stores.useSettings.getState().uiScale || 1;
		return {
			lx: (e.clientX - t.left) / r,
			ly: (e.clientY - t.top) / r
		};
	}, F = (e) => {
		if (!E || x.current || e.button !== 0 || !g) return;
		let { lx: t, ly: n } = P(e), r = g(t, n);
		e.preventDefault(), e.stopPropagation(), e.currentTarget.setPointerCapture(e.pointerId);
		let i = xe(c().getState()), a = j(c().getState().color), o = e.shiftKey && w.current ? A(w.current, r, i, a, D, e.altKey) : k(r, {
			x: 0,
			y: 0
		}, i, a, D, e.altKey, !0, Math.random), s = de(c().getState().activeLayerId, o);
		c().getState().setActiveLayer(s), w.current = r, C.current = {
			last: r,
			layerId: s
		}, N(t, n, !0);
	}, I = (e) => {
		if (!E || x.current || !g) return;
		let { lx: t, ly: n } = P(e);
		N(t, n, !0), b(e.altKey);
		let r = C.current;
		if (!r) return;
		let i = g(t, n), a = xe(c().getState());
		if (!O(r.last, i, a, D)) return;
		let o = {
			x: i.x - r.last.x,
			y: i.y - r.last.y
		};
		fe(r.layerId, k(i, o, a, j(c().getState().color), D, e.altKey, !1, Math.random)), r.last = i, w.current = i;
	}, re = (e) => {
		C.current && (C.current = null, e.currentTarget.releasePointerCapture(e.pointerId), pe());
	};
	if (!E) return null;
	let L = te || u, R = `1.5px ${L ? "dashed" : "solid"} ${L ? "rgba(255,107,107,0.95)" : "rgba(255,255,255,0.9)"}`, ie = m && v ? v(s) : 0, ae = (e, t, n) => ({
		...be,
		display: "block",
		border: t,
		background: n,
		left: `${m ? m.x + m.w / 2 : 0}px`,
		top: `${m ? m.y + m.h / 2 : 0}px`,
		width: `${e}px`,
		height: `${e}px`
	});
	return r("div", {
		onPointerDown: F,
		onPointerMove: I,
		onPointerUp: re,
		onPointerLeave: () => {
			C.current || N(0, 0, !1);
		},
		style: {
			position: "absolute",
			inset: 0,
			pointerEvents: y ? "none" : "auto",
			touchAction: "none",
			cursor: y ? "default" : "none",
			overflow: "hidden"
		}
	}, r("div", {
		ref: S,
		style: {
			...be,
			border: R
		}
	}), r("div", {
		ref: ne,
		style: {
			...be,
			border: "1px solid rgba(255,255,255,0.45)"
		}
	}), d && m ? r("div", { style: {
		position: "absolute",
		inset: 0,
		pointerEvents: "none"
	} }, r("div", { style: ae(Math.max(3, ie) * 2, "1.5px solid rgba(255,255,255,0.9)", a) }), p ? r("div", { style: ae(Math.max(1, ie * (1 - l)) * 2, "1px solid rgba(255,255,255,0.45)") }) : null) : null);
}
function we(e, t) {
	let n = N(e, c().getState());
	return n ? (t && c().setState(n), !0) : !1;
}
var Te = {
	overlay: Ce,
	zoomable: !0,
	onEscape: () => c().getState().setArmed(!1),
	onAction: (e) => we(e, !0),
	wants: (e) => we(e, !1)
}, Y = "safelight-paint-layers", Ee = `${Y}.styles`, X = {
	panel: `${Y}-panel`,
	create: `${Y}-create`,
	head: `${Y}-head`,
	hint: `${Y}-hint`,
	done: `${Y}-done`,
	brush: `${Y}-brush`,
	erase: `${Y}-erase`,
	colour: `${Y}-colour`,
	muted: `${Y}-muted`,
	list: `${Y}-list`,
	row: `${Y}-row`,
	on: `${Y}-on`,
	off: `${Y}-off`,
	eye: `${Y}-eye`,
	hidden: `${Y}-hidden`,
	name: `${Y}-name`,
	rename: `${Y}-rename`,
	act: `${Y}-act`,
	remove: `${Y}-remove`,
	reveal: `${Y}-reveal`,
	editor: `${Y}-editor`,
	section: `${Y}-section`,
	caption: `${Y}-caption`,
	reset: `${Y}-reset`,
	addComponent: `${Y}-add-component`,
	tips: `${Y}-tips`,
	tip: `${Y}-tip`,
	round: `${Y}-round`
}, De = (e, t) => `color-mix(in srgb, ${e} ${t}%, transparent)`;
function Oe(e) {
	return `
:where(.${X.panel} > :not(:last-child)) { margin-block: 0 0.5rem; }
:where(.${X.create}) { display: flex; width: 100%; align-items: center; justify-content: center; gap: 0.25rem; border-radius: 0.25rem; background-color: ${e.surface2}; padding: 0.375rem 0.5rem; font-size: 11px; color: ${e.textSecondary}; }
:where(.${X.create}:hover) { color: ${e.textPrimary}; }
:where(.${X.create}:disabled) { cursor: default; opacity: 0.4; }
:where(.${X.head}) { display: flex; align-items: center; justify-content: space-between; }
:where(.${X.hint}) { font-size: 10px; color: ${e.textMuted}; }
:where(.${X.done}) { border-radius: 0.25rem; background-color: ${e.surface2}; padding: 0.125rem 0.375rem; font-size: 11px; color: ${e.textSecondary}; }
:where(.${X.done}:hover) { color: ${e.textPrimary}; }
:where(.${X.brush}) { border-radius: 0.25rem; background-color: ${De(e.surface2, 50)}; padding: 0.375rem; }
:where(.${X.brush} > :not(:last-child)) { margin-block: 0 0.125rem; }
:where(.${X.erase}) { display: flex; align-items: center; gap: 0.375rem; padding: 0 0.125rem; font-size: 11px; color: ${e.textSecondary}; }
:where(.${X.colour}) { height: 0.875rem; width: 1.5rem; flex-shrink: 0; cursor: pointer; border-radius: 0.25rem; border: 1px solid ${e.borderSubtle}; background: transparent; padding: 0; }
:where(.${X.muted}) { color: ${e.textMuted}; }
:where(.${X.tips}) { display: flex; flex-wrap: wrap; gap: 0.125rem; }
:where(.${X.tip}) { display: flex; height: 2.25rem; width: 2.25rem; flex-shrink: 0; align-items: center; justify-content: center; overflow: hidden; border-radius: 0.25rem; padding: 0.125rem; }
:where(.${X.tip}:hover) { background-color: ${e.surface2}; }
:where(.${X.tip}.${X.on}) { background-color: ${De(e.accent, 20)}; }
:where(.${X.tip} img) { height: 100%; width: 100%; border-radius: 0.125rem; object-fit: contain; }
:where(.${X.round}) { display: block; height: 100%; width: 100%; border-radius: 0.125rem; background: radial-gradient(circle, #ebebeb 35%, rgba(235, 235, 235, 0) 68%), #1c1c1c; }
:where(.${X.list} > :not(:last-child)) { margin-block: 0 0.125rem; }
:where(.${X.row}) { display: flex; cursor: pointer; align-items: center; gap: 0.375rem; border-radius: 0.25rem; padding: 0.25rem 0.375rem; font-size: 11px; color: ${e.textSecondary}; }
:where(.${X.row}:hover) { background-color: ${e.surface2}; }
:where(.${X.row}.${X.on}) { background-color: ${De(e.accent, 20)}; color: ${e.textPrimary}; }
:where(.${X.row}.${X.off}) { opacity: 0.5; }
:where(.${X.eye}) { flex-shrink: 0; border-radius: 0.25rem; padding: 0 0.125rem; color: ${e.textMuted}; }
:where(.${X.eye}.${X.hidden}) { color: ${De(e.textMuted, 40)}; }
:where(.${X.eye}:hover) { color: ${e.textPrimary}; }
:where(.${X.rename}) { min-width: 0; flex: 1 1 0%; border-radius: 0.25rem; background-color: ${e.surface3}; padding: 0 0.25rem; font-size: 11px; color: ${e.textPrimary}; outline: none; }
:where(.${X.name}) { flex: 1 1 0%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
:where(.${X.act}) { border-radius: 0.25rem; padding: 0 0.25rem; color: ${e.textMuted}; }
:where(.${X.act}:hover:not(:disabled)) { color: ${e.textPrimary}; }
:where(.${X.remove}) { border-radius: 0.25rem; padding: 0 0.25rem; color: ${e.textMuted}; }
:where(.${X.remove}:hover) { color: ${e.labelRed}; }
:where(.${X.reveal}) { opacity: 0; }
:where(.${X.row}:hover .${X.reveal}) { opacity: 1; }
:where(.${X.row}:hover .${X.reveal}:disabled) { cursor: default; opacity: 0.3; }
:where(.${X.editor}) { border-top: 1px solid ${e.borderSubtle}; padding-top: 0.5rem; }
:where(.${X.editor} > :not(:last-child)) { margin-block: 0 0.5rem; }
:where(.${X.section} > :not(:last-child)) { margin-block: 0 0.375rem; }
:where(.${X.caption}) { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: ${e.textMuted}; }
:where(.${X.reset}) { border-radius: 0.25rem; padding: 0 0.25rem; font-size: 10px; color: ${e.textMuted}; }
:where(.${X.reset}:hover) { color: ${e.textPrimary}; }
:where(.${X.addComponent}) { display: flex; width: 100%; align-items: center; justify-content: center; gap: 0.25rem; border-radius: 0.25rem; background-color: ${e.surface2}; padding: 0.25rem 0.5rem; font-size: 10px; color: ${e.textSecondary}; }
:where(.${X.addComponent}:hover) { color: ${e.textPrimary}; }
:where(.${X.addComponent}:disabled) { cursor: default; opacity: 0.4; }
html.sl-larger-text .${X.hint}, html.sl-larger-text .${X.addComponent}, html.sl-larger-text .${X.caption}, html.sl-larger-text .${X.reset} { font-size: 12px !important; }
html.sl-larger-text .${X.create}, html.sl-larger-text .${X.done}, html.sl-larger-text .${X.erase}, html.sl-larger-text .${X.row}, html.sl-larger-text .${X.rename} { font-size: 13px !important; line-height: 1.45 !important; }
html.sl-larger-text .${X.caption} { text-transform: none !important; letter-spacing: normal !important; }
`;
}
// src/highlight.ts
var ke = -1, Z = 0, Q = 0, $ = null;
function Ae() {
	Q += (Z - Q) * .3, Math.abs(Z - Q) < .01 && (Q = Z), n().develop.setViewValues(Q > .002 ? {
		[p.highlight]: ke,
		[p.highlightStrength]: Q
	} : null), $ = Q === Z ? null : requestAnimationFrame(Ae);
}
function je(e) {
	let t = e !== null && e !== ke && Q > 0;
	e !== null && (ke = e), Z = e === null ? 0 : h, $ === null && (t || Q !== Z) && ($ = requestAnimationFrame(Ae));
}
function Me() {
	$ !== null && cancelAnimationFrame($), $ = null, ke = -1, Z = 0, Q = 0;
}
function Ne(e) {
	let t = [];
	for (let n of e) {
		let e = t.find((e) => e.group === n.group);
		e ? e.tips.push(n) : t.push({
			group: n.group,
			tips: [n]
		});
	}
	return [...t.filter((e) => e.group === void 0), ...t.filter((e) => e.group !== void 0)];
}
var Pe = /* @__PURE__ */ new Map();
function Fe(e) {
	let t = Pe.get(e.id);
	if (t !== void 0) return t;
	let n = Ie(e);
	return Pe.set(e.id, n), n;
}
function Ie(e) {
	let { width: t, height: n, data: r } = e.alpha, i = document.createElement("canvas"), a = document.createElement("canvas"), o = i.getContext("2d"), s = a.getContext("2d");
	if (!o || !s || t < 1 || n < 1) return null;
	i.width = t, i.height = n;
	let c = o.createImageData(t, n);
	for (let e = 0; e < t * n; e++) c.data[e * 4] = 235, c.data[e * 4 + 1] = 235, c.data[e * 4 + 2] = 235, c.data[e * 4 + 3] = r[e] ?? 0;
	o.putImageData(c, 0, 0), a.width = 32, a.height = 32, s.fillStyle = "#1c1c1c", s.fillRect(0, 0, 32, 32);
	let l = 32 / Math.max(t, n), u = t * l, d = n * l;
	return s.imageSmoothingEnabled = !0, s.drawImage(i, (32 - u) / 2, (32 - d) / 2, u, d), a.toDataURL("image/png");
}
// src/Panel.ts
var Le = P.map((e, t) => ({
	value: String(t),
	label: e.label
}));
function Re() {
	let e = n(), { Panel: t, Slider: i } = e.components, { Select: o, tokens: s } = e.ui, l = e.stores.useDevelopStore, u = e.react, d = c()((e) => e.armed), f = c()((e) => e.activeLayerId), p = c()((e) => e.color), m = l((e) => e.paramBag), h = c()((e) => e.brushSize), g = c()((e) => e.brushFeather), _ = c()((e) => e.brushOpacity), v = c()((e) => e.brushFlow), y = c()((e) => e.brushErase), ee = c()((e) => e.tip), te = c()((e) => e.brushSpacing), b = c()((e) => e.brushScatter), x = c()((e) => e.brushCount), S = c()((e) => e.brushSizeJitter), ne = c()((e) => e.brushAngle), C = c()((e) => e.brushAngleJitter), w = c()((e) => e.brushFollowStroke), T = c()((e) => e.brushFlowJitter), E = e.develop.useBrushTips(), [D, O] = u.useState(null), k = e.develop.useCanvasToolHeld();
	u.useEffect(() => {
		d && !k && c().getState().setArmed(!1);
	}, [d, k]);
	let A = ae(m), j = le(A, f), [M, N] = u.useState(null), F = M ? A.findIndex((e) => e.id === M) : -1;
	u.useEffect(() => {
		je(F >= 0 ? F : null);
	}, [F]), u.useEffect(() => () => je(null), []);
	let I = (e) => c().getState().setActiveLayer(e), re = () => {
		let e = me();
		e && I(e);
	}, L = (e) => e ? ` ${X.on}` : "", R = (e) => (t) => {
		t.stopPropagation(), e();
	}, ie = () => {
		if (!D) return;
		let e = D.value.trim(), t = A.find((e) => e.id === D.id);
		O(null), t && e && e !== t.name && J(t.id, { name: e }, "Rename Paint Layer");
	}, oe = (e) => D?.id === e.id ? r("input", {
		autoFocus: !0,
		value: D.value,
		maxLength: 40,
		"aria-label": "Layer name",
		className: X.rename,
		onClick: (e) => e.stopPropagation(),
		onChange: (t) => O({
			id: e.id,
			value: t.currentTarget.value
		}),
		onBlur: ie,
		onKeyDown: (e) => {
			e.key === "Enter" && e.currentTarget.blur(), e.key === "Escape" && O(null);
		}
	}) : r("span", {
		className: X.name,
		title: "Double-click to rename",
		onDoubleClick: (t) => {
			t.stopPropagation(), O({
				id: e.id,
				value: e.name
			});
		}
	}, e.name || "Untitled", r("span", { className: X.muted }, ` (${P[e.mode]?.label ?? "Normal"})`)), se = (e, t) => r("div", {
		key: e.id,
		title: "Paint on this layer",
		className: X.row + L(e.id === j?.id) + (e.visible ? "" : ` ${X.off}`),
		onClick: () => I(e.id),
		onMouseEnter: () => N(e.id),
		onMouseLeave: () => N(null)
	}, r("button", {
		type: "button",
		title: e.visible ? "Hide" : "Show",
		"aria-label": e.visible ? `Hide ${e.name}` : `Show ${e.name}`,
		"aria-pressed": e.visible,
		className: X.eye + (e.visible ? "" : ` ${X.hidden}`),
		onMouseEnter: () => N(null),
		onMouseLeave: () => N(e.id),
		onClick: R(() => J(e.id, { visible: !e.visible }, e.visible ? "Hide Paint Layer" : "Show Paint Layer"))
	}, e.visible ? "◉" : "○"), oe(e), r("button", {
		type: "button",
		title: "Move up",
		"aria-label": `Move ${e.name} up`,
		className: `${X.act} ${X.reveal}`,
		disabled: t === A.length - 1,
		onClick: R(() => ge(e.id, 1))
	}, "↑"), r("button", {
		type: "button",
		title: "Move down",
		"aria-label": `Move ${e.name} down`,
		className: `${X.act} ${X.reveal}`,
		disabled: t === 0,
		onClick: R(() => ge(e.id, -1))
	}, "↓"), r("button", {
		type: "button",
		title: "Delete layer",
		"aria-label": `Delete ${e.name}`,
		className: `${X.remove} ${X.reveal}`,
		onClick: R(() => he(e.id))
	}, "×")), ce = (e) => r("div", { className: X.editor }, r("div", { className: X.section }, r("div", { className: X.head }, r("span", { className: X.caption }, "Blending"), r("button", {
		type: "button",
		title: "Reset this layer's blend mode and opacity",
		className: X.reset,
		onClick: () => J(e.id, {
			mode: 0,
			opacity: 1
		}, "Reset Paint Layer")
	}, "Reset")), r(o, {
		value: String(e.mode),
		options: Le,
		ariaLabel: "Blend mode",
		onChange: (t) => J(e.id, { mode: Number(t) }, "Paint Layer Blend Mode")
	}), r(i, {
		label: "Opacity",
		value: Math.round(e.opacity * 100),
		min: 0,
		max: 100,
		step: 1,
		defaultValue: 100,
		onChange: (t) => J(e.id, { opacity: t / 100 }),
		onCommit: () => _e("Paint Layer Opacity")
	}), r("button", {
		type: "button",
		className: X.addComponent,
		disabled: e.dabs.length === 0,
		onClick: () => ve(e.id)
	}, "Clear Layer"))), z = (e, t, n, a, o, s = 100, l = 100) => r(i, {
		key: e,
		label: e,
		value: Math.round(t * l),
		min: n,
		max: s,
		step: 1,
		defaultValue: a,
		onChange: (e) => {
			o(e / l), c().getState().setBrushPreview(!0);
		},
		onCommit: () => c().getState().setBrushPreview(!1)
	}), B = E.find((e) => e.id === ee) ?? null, V = a(B?.brush), H = (e) => G.setBrushDynamics(e), U = (e) => {
		let t = Fe(e);
		return r("button", {
			key: e.id,
			type: "button",
			title: e.label,
			"aria-label": e.label,
			"aria-pressed": e.id === B?.id,
			className: X.tip + L(e.id === B?.id),
			onClick: () => G.pickTip(e.id, e.brush)
		}, t ? r("img", {
			src: t,
			alt: "",
			draggable: !1
		}) : null);
	}, W = () => r("div", { className: X.section }, r("span", { className: X.caption }, "Brush"), r("div", { className: X.tips }, r("button", {
		type: "button",
		title: "Round",
		"aria-label": "Round",
		"aria-pressed": B === null,
		className: X.tip + L(B === null),
		onClick: () => G.pickTip(null)
	}, r("span", { className: X.round })), Ne(E).flatMap((e) => e.group === void 0 ? e.tips.map(U) : [])), ...Ne(E).filter((e) => e.group !== void 0).map((e) => r("div", {
		key: e.group,
		className: X.section
	}, r("span", { className: X.caption }, e.group), r("div", { className: X.tips }, e.tips.map(U)))), E.length === 0 ? r("span", { className: X.hint }, "Install Texture Brushes for fog, cloud and other brushes.") : null), G = c().getState(), ue = A.map((e, t) => ({
		layer: e,
		slot: t
	})).reverse(), K = A.length >= 4, q = d ? j ? `${y ? "Erase from" : "Paint on"} ${j.name || "Untitled"}` : "Paint to add a layer" : `${A.length}/4 layers`;
	return r(t, {
		title: "Paint Layers",
		defaultOpen: !0
	}, r("div", { className: X.panel }, r("button", {
		type: "button",
		className: X.create,
		disabled: K,
		title: K ? "Layer limit reached (4)" : void 0,
		onClick: re
	}, "+ Add Layer"), r("div", { className: X.head }, r("span", { className: X.hint }, q), r("button", {
		type: "button",
		className: X.done,
		onClick: () => G.toggleArmed()
	}, d ? "Done" : "Paint")), d ? r("div", { className: X.brush }, r("label", { className: X.erase }, r("input", {
		type: "color",
		value: p,
		"aria-label": "Brush colour",
		className: X.colour,
		onChange: (e) => G.setColor(e.currentTarget.value)
	}), "Colour"), W(), z("Size", h, 1, 8, (e) => G.setBrushSize(e), 50), B ? null : z("Feather", g, 0, 50, (e) => G.setBrushFeather(e)), z("Opacity", _, 1, 100, (e) => G.setBrushOpacity(e)), z("Flow", v, 1, 100, (e) => G.setBrushFlow(e)), B ? [
		z("Spacing", te, 1, Math.round(V.brushSpacing * 100), (e) => H({ brushSpacing: e }), 200),
		z("Scatter", b, 0, Math.round(V.brushScatter * 100), (e) => H({ brushScatter: e }), 200),
		z("Count", x, 1, V.brushCount, (e) => H({ brushCount: e }), 16, 1),
		z("Size jitter", S, 0, Math.round(V.brushSizeJitter * 100), (e) => H({ brushSizeJitter: e })),
		z("Angle", ne, -180, Math.round(V.brushAngle * 180 / Math.PI), (e) => H({ brushAngle: e }), 180, 180 / Math.PI),
		z("Angle jitter", C, 0, Math.round(V.brushAngleJitter * 100), (e) => H({ brushAngleJitter: e })),
		r("label", {
			key: "Follow stroke",
			className: X.erase
		}, r("input", {
			type: "checkbox",
			checked: w,
			onChange: (e) => H({ brushFollowStroke: e.currentTarget.checked }),
			style: { accentColor: s.sliderFill }
		}), "Follow stroke"),
		z("Flow jitter", T, 0, Math.round(V.brushFlowJitter * 100), (e) => H({ brushFlowJitter: e }))
	] : null, r("label", { className: X.erase }, r("input", {
		type: "checkbox",
		checked: y,
		onChange: (e) => G.setBrushErase(e.currentTarget.checked),
		style: { accentColor: s.sliderFill }
	}), "Erase", r("span", { className: X.muted }, "· Alt erase · [ ] size · ⇧ feather · , . opacity · ⇧, ⇧. flow"))) : null, A.length > 0 ? r("div", { className: X.list }, ue.map(({ layer: e, slot: t }) => se(e, t))) : null, j ? ce(j) : null));
}
// src/index.ts
var ze = null;
function Be(e) {
	t(e), s(), e.registerStylesheet({
		id: Ee,
		css: Oe(e.ui.tokens)
	}), e.registerProcessingStage(S()), ze = c().subscribe((t, n) => {
		t.armed !== n.armed && e.develop.setCanvasTool(t.armed ? Te : null);
	}), e.registerPanel({
		id: `${l}.panel`,
		title: "Paint Layers",
		component: Re,
		defaultDock: {
			module: "develop",
			direction: "right",
			order: 9,
			width: 250
		},
		onReset: () => void ye()
	});
}
function Ve() {
	try {
		c().getState().setArmed(!1), Me(), ze?.(), ze = null, n().develop.setCanvasTool(null), n().unregisterProcessingStage(u);
	} catch {}
}
export { Be as activate, Ve as deactivate };

//# sourceMappingURL=index.js.map