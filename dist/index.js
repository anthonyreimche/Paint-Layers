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
var i = null;
function a() {
	return i = n().stores.create((e) => ({
		armed: !1,
		activeLayerId: null,
		color: "#ffffff",
		brushSize: .08,
		brushFeather: .5,
		brushOpacity: 1,
		brushFlow: 1,
		brushErase: !1,
		brushPreview: !1,
		setArmed: (t) => e({ armed: t }),
		toggleArmed: () => e((e) => ({ armed: !e.armed })),
		setActiveLayer: (t) => e({ activeLayerId: t }),
		setColor: (t) => e({ color: t }),
		setBrushSize: (t) => e({ brushSize: t }),
		setBrushFeather: (t) => e({ brushFeather: t }),
		setBrushOpacity: (t) => e({ brushOpacity: t }),
		setBrushFlow: (t) => e({ brushFlow: t }),
		setBrushErase: (t) => e({ brushErase: t }),
		setBrushPreview: (t) => e({ brushPreview: t })
	})), i;
}
function o() {
	if (!i) throw Error("[paint-layers] store used before activate()");
	return i;
}
// src/stage.ts
var s = "paint-layers", c = `${s}.composite`, l = {
	mode: 0,
	opacity: 1,
	visible: !0
}, u = (e, t) => `${c}.${e}${t}`, d = {
	layers: `${c}.layers`,
	highlight: `${c}.highlight`,
	highlightStrength: `${c}.highlightStrength`
}, f = [
	.9,
	.25,
	.25
], p = .5, m = [{
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
}], h = Array.from({ length: 4 }, (e, t) => t), g = (e) => [
	{
		key: `mode${e}`,
		glslType: "int",
		default: l.mode,
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
		default: l.opacity,
		range: {
			min: 0,
			max: 1
		},
		label: `Layer ${e + 1} opacity`
	},
	{
		key: `visible${e}`,
		glslType: "bool",
		default: l.visible,
		label: `Layer ${e + 1} visible`
	}
], _ = "\nfloat plLum(vec3 c) { return dot(c, vec3(0.3, 0.59, 0.11)); }\nfloat plSat(vec3 c) { return max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b)); }\nvec3 plClipColor(vec3 c) {\n  float l = plLum(c);\n  float n = min(c.r, min(c.g, c.b));\n  float x = max(c.r, max(c.g, c.b));\n  vec3 o = c;\n  if (n < 0.0) o = l + (o - l) * (l / (l - n));\n  if (x > 1.0) o = l + (o - l) * ((1.0 - l) / (x - l));\n  return o;\n}\nvec3 plSetLum(vec3 c, float l) { return plClipColor(c + (l - plLum(c))); }\nvec3 plSetSat(vec3 c, float s) {\n  float mx = max(c.r, max(c.g, c.b));\n  float mn = min(c.r, min(c.g, c.b));\n  return mx > mn ? (c - mn) * (s / (mx - mn)) : vec3(0.0);\n}\nfloat plDodge(float cb, float cs) { return cb <= 0.0 ? 0.0 : (cs >= 1.0 ? 1.0 : min(1.0, cb / (1.0 - cs))); }\nfloat plBurn(float cb, float cs) { return cb >= 1.0 ? 1.0 : (cs <= 0.0 ? 0.0 : 1.0 - min(1.0, (1.0 - cb) / cs)); }\nvec3 plHardLight(vec3 cb, vec3 cs) {\n  vec3 s2 = 2.0 * cs - 1.0;\n  return mix(cb + s2 - cb * s2, cb * (2.0 * cs), vec3(lessThanEqual(cs, vec3(0.5))));\n}\nfloat plSoftLight(float cb, float cs) {\n  if (cs <= 0.5) return cb - (1.0 - 2.0 * cs) * cb * (1.0 - cb);\n  float d = cb <= 0.25 ? ((16.0 * cb - 12.0) * cb + 4.0) * cb : sqrt(cb);\n  return cb + (2.0 * cs - 1.0) * (d - cb);\n}\nvec3 plBlend(int mode, vec3 cb, vec3 cs) {\n  if (mode == 1) return cb * cs;\n  if (mode == 2) return cb + cs - cb * cs;\n  if (mode == 3) return plHardLight(cs, cb);\n  if (mode == 4) return min(cb, cs);\n  if (mode == 5) return max(cb, cs);\n  if (mode == 6) return vec3(plDodge(cb.r, cs.r), plDodge(cb.g, cs.g), plDodge(cb.b, cs.b));\n  if (mode == 7) return vec3(plBurn(cb.r, cs.r), plBurn(cb.g, cs.g), plBurn(cb.b, cs.b));\n  if (mode == 8) return plHardLight(cb, cs);\n  if (mode == 9) return vec3(plSoftLight(cb.r, cs.r), plSoftLight(cb.g, cs.g), plSoftLight(cb.b, cs.b));\n  if (mode == 10) return abs(cb - cs);\n  if (mode == 11) return cb + cs - 2.0 * cb * cs;\n  if (mode == 12) return plSetLum(plSetSat(cs, plSat(cb)), plLum(cb));\n  if (mode == 13) return plSetLum(plSetSat(cb, plSat(cs)), plLum(cb));\n  if (mode == 14) return plSetLum(cs, plLum(cb));\n  if (mode == 15) return plSetLum(cb, plLum(cs));\n  return cs;\n}\nvec3 plComposite(vec3 c, vec4 paint, int mode, float opacity) {\n  float a = paint.a * clamp(opacity, 0.0, 1.0);\n  if (a <= 0.0) return c;\n  return mix(c, plBlend(mode, clamp(c, 0.0, 1.0), paint.rgb), a);\n}", [v, y, b] = f, x = [...h.map((e) => `if (visible${e}) c = plComposite(c, layers(${e}, srcUv), mode${e}, opacity${e});`), `if (highlight >= 0) c = mix(c, vec3(${v}, ${y}, ${b}), layers(highlight, srcUv).a * highlightStrength);`].join("\n");
function S() {
	return {
		id: c,
		name: "Paint Layers",
		phase: "effects",
		presetScope: "per-image",
		space: { encoding: "perceptual" },
		uniforms: [...h.flatMap(g), ...m],
		textures: [{
			key: "layers",
			kind: "paint"
		}],
		helpers: _,
		glsl: x
	};
}
// src/brush.ts
var C = .25;
function w(e, t, n, r, i) {
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
function T(e, t, n) {
	return Math.hypot((t.x - e.x) * n, t.y - e.y);
}
function E(e, t, n, r) {
	return T(e, t, r) >= n.brushSize * C;
}
function ee(e, t, n, r, i, a) {
	let o = Math.max(1, Math.ceil(T(e, t, i) / (n.brushSize * C))), s = [];
	for (let i = 1; i <= o; i++) {
		let c = i / o, l = {
			x: e.x + (t.x - e.x) * c,
			y: e.y + (t.y - e.y) * c
		};
		s.push(w(l, n, r, a, i === 1));
	}
	return s;
}
function D(e) {
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
var O = {
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
function k(e, t) {
	let n = O[e];
	if (!n) return null;
	let r = Math.round((t[n.key] + n.step) * 100) / 100;
	return { [n.key]: Math.max(n.min, Math.min(n.max, r)) };
}
// src/blend.ts
var A = [
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
Object.fromEntries(A.map((e, t) => [e.id, t]));
// src/layers.ts
var j = (e) => typeof e == "number" && Number.isFinite(e), M = (e) => typeof e == "object" && !!e;
function N(e) {
	if (!M(e)) return !1;
	let t = e.color;
	return j(e.x) && j(e.y) && j(e.radius) && j(e.feather) && j(e.opacity) && j(e.flow) && typeof e.erase == "boolean" && (e.strokeStart === void 0 || typeof e.strokeStart == "boolean") && Array.isArray(t) && t.length === 3 && t.every(j);
}
function P(e) {
	return Number.isInteger(e) && j(e) && e >= 0 && e < A.length ? e : l.mode;
}
function F(e) {
	return j(e) && e >= 0 && e <= 1 ? e : l.opacity;
}
function I(e) {
	return typeof e == "boolean" ? e : j(e) ? e !== 0 : l.visible;
}
function te(e) {
	let t = e[d.layers];
	return Array.isArray(t) ? t.slice(0, 4).map((t, n) => {
		let r = M(t) ? t : {};
		return {
			id: typeof r.id == "string" && r.id ? r.id : `layer-${n}`,
			name: typeof r.name == "string" ? r.name : `Layer ${n + 1}`,
			dabs: Array.isArray(r.dabs) ? r.dabs.filter(N) : [],
			mode: P(e[u("mode", n)]),
			opacity: F(e[u("opacity", n)]),
			visible: I(e[u("visible", n)])
		};
	}) : [];
}
function L(e) {
	let t = { [d.layers]: R(e) };
	for (let n = 0; n < 4; n++) {
		let r = e[n];
		t[u("mode", n)] = r ? r.mode : l.mode, t[u("opacity", n)] = r ? r.opacity : l.opacity, t[u("visible", n)] = r ? r.visible : l.visible;
	}
	return t;
}
function R(e) {
	return e.map(({ id: e, name: t, dabs: n }) => ({
		id: e,
		name: t,
		dabs: n
	}));
}
function z(e) {
	let t = new Set(e.map((e) => e.name)), n = 1;
	for (; t.has(`Layer ${n}`);) n++;
	return `Layer ${n}`;
}
function B(e, t) {
	return e.length >= 4 ? e : [...e, {
		id: t,
		name: z(e),
		dabs: [],
		...l
	}];
}
function ne(e, t) {
	return e.filter((e) => e.id !== t);
}
function re(e, t, n) {
	let r = e.findIndex((e) => e.id === t), i = r + n;
	if (r < 0 || i < 0 || i >= e.length) return e;
	let a = [...e];
	return [a[r], a[i]] = [a[i], a[r]], a;
}
function ie(e, t, n) {
	return e.map((e) => e.id === t ? {
		...e,
		...n
	} : e);
}
function ae(e, t, n) {
	return e.some((e) => e.id === t) ? e.map((e) => e.id === t ? {
		...e,
		dabs: [...e.dabs, ...n]
	} : e) : e;
}
function oe(e, t) {
	return e.find((e) => e.id === t) ?? e[e.length - 1] ?? null;
}
// src/persistence.ts
function V() {
	return n().stores.useDevelopStore.getState();
}
var H = () => te(V().paramBag);
function se() {
	return `layer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function U(e) {
	V().setDynParams(L(e));
}
function W(e, t) {
	U(e), V().commitEdit(t);
}
function ce(e, t) {
	let n = H(), r = oe(n, e);
	if (r) return le(r.id, t), r.id;
	let i = se();
	return U(ae(B(n, i), i, t)), i;
}
function le(e, t) {
	V().setDynParams({ [d.layers]: R(ae(H(), e, t)) });
}
function ue() {
	return V().commitEdit("Paint Stroke");
}
function de() {
	let e = H(), t = se(), n = B(e, t);
	return n === e ? null : (W(n, "Add Paint Layer"), t);
}
function fe(e) {
	W(ne(H(), e), "Delete Paint Layer");
}
function pe(e, t) {
	let n = H(), r = re(n, e, t);
	r !== n && W(r, "Move Paint Layer");
}
function G(e, t, n) {
	let r = ie(H(), e, t);
	n ? W(r, n) : U(r);
}
function me(e) {
	V().commitEdit(e);
}
function he(e) {
	W(ie(H(), e, { dabs: [] }), "Clear Paint Layer");
}
async function ge() {
	U([]), await V().commitEdit("Reset Paint Layers");
}
// src/Overlay.ts
var K = {
	position: "absolute",
	display: "none",
	transform: "translate(-50%, -50%)",
	borderRadius: "50%",
	boxShadow: "0 0 0 1px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.35)",
	pointerEvents: "none"
};
function _e(e) {
	let { brushSize: t, brushFeather: n, brushOpacity: r, brushFlow: i, brushErase: a } = e;
	return {
		brushSize: t,
		brushFeather: n,
		brushOpacity: r,
		brushFlow: i,
		brushErase: a
	};
}
function ve(e) {
	return e instanceof HTMLElement && (e.tagName === "INPUT" || e.tagName === "TEXTAREA" || e.isContentEditable);
}
function ye() {
	let e = n().react, t = n().stores.useDevelopStore, i = o()((e) => e.armed), a = o()((e) => e.color), s = t((e) => e.photoId), c = o()((e) => e.brushSize), l = o()((e) => e.brushFeather), u = o()((e) => e.brushErase), d = o()((e) => e.brushPreview), { rect: f, imageRect: p, toImage: m, toScreen: h, radiusToScreen: g } = n().develop.useDevelopOverlay(), [_, v] = e.useState(!1), [y, b] = e.useState(!1), x = e.useRef(!1), S = e.useRef(null), C = e.useRef(null), T = e.useRef(null), O = e.useRef(null), k = e.useRef({
		lx: 0,
		ly: 0,
		shown: !1
	}), A = i && !!f && !!s && !!m && !!h && !!g, j = p && p.h > 0 ? p.w / p.h : 1, M = (e) => {
		x.current = e, v(e);
	};
	e.useEffect(() => {
		if (A && !_) return n().develop.setCanvasCursor("none", { priority: 20 });
	}, [A, _]), e.useEffect(() => {
		T.current = null, O.current = null;
	}, [s]), e.useEffect(() => {
		if (!A) {
			M(!1);
			return;
		}
		let e = (e) => {
			ve(e.target) || ((e.code === "Space" || e.ctrlKey || e.metaKey) && M(!0), e.altKey && b(!0));
		}, t = (e) => {
			e.code !== "Space" && (e.ctrlKey || e.metaKey) || M(!1), e.altKey || b(!1);
		}, n = () => {
			M(!1), b(!1);
		};
		return window.addEventListener("keydown", e, !0), window.addEventListener("keyup", t, !0), window.addEventListener("blur", n), () => {
			window.removeEventListener("keydown", e, !0), window.removeEventListener("keyup", t, !0), window.removeEventListener("blur", n), M(!1);
		};
	}, [A]);
	let N = (e, t, n) => {
		k.current = {
			lx: e,
			ly: t,
			shown: n
		};
		let r = o().getState(), i = g ? g(r.brushSize) : 0, a = (n, r, i) => {
			n && (n.style.display = i ? "block" : "none", n.style.width = `${r}px`, n.style.height = `${r}px`, n.style.left = `${e}px`, n.style.top = `${t}px`);
		};
		a(S.current, Math.max(3, i) * 2, n), a(C.current, Math.max(1, i * (1 - r.brushFeather)) * 2, n);
	};
	e.useEffect(() => {
		k.current.shown && N(k.current.lx, k.current.ly, !0);
	}, [c, l]), e.useEffect(() => {
		_ && T.current && (T.current = null, ue(), N(0, 0, !1));
	}, [_]);
	let P = (e) => {
		let t = e.currentTarget.getBoundingClientRect(), r = n().stores.useSettings.getState().uiScale || 1;
		return {
			lx: (e.clientX - t.left) / r,
			ly: (e.clientY - t.top) / r
		};
	}, F = (e) => {
		if (!A || x.current || e.button !== 0 || !m) return;
		let { lx: t, ly: n } = P(e), r = m(t, n);
		e.preventDefault(), e.stopPropagation(), e.currentTarget.setPointerCapture(e.pointerId);
		let i = _e(o().getState()), a = D(o().getState().color), s = e.shiftKey && O.current ? ee(O.current, r, i, a, j, e.altKey) : [w(r, i, a, e.altKey, !0)], c = ce(o().getState().activeLayerId, s);
		o().getState().setActiveLayer(c), O.current = r, T.current = {
			last: r,
			layerId: c
		}, N(t, n, !0);
	}, I = (e) => {
		if (!A || x.current || !m) return;
		let { lx: t, ly: n } = P(e);
		N(t, n, !0), b(e.altKey);
		let r = T.current;
		if (!r) return;
		let i = m(t, n), a = _e(o().getState());
		E(r.last, i, a, j) && (le(r.layerId, [w(i, a, D(o().getState().color), e.altKey, !1)]), r.last = i, O.current = i);
	}, te = (e) => {
		T.current && (T.current = null, e.currentTarget.releasePointerCapture(e.pointerId), ue());
	};
	if (!A) return null;
	let L = y || u, R = `1.5px ${L ? "dashed" : "solid"} ${L ? "rgba(255,107,107,0.95)" : "rgba(255,255,255,0.9)"}`, z = f && g ? g(c) : 0, B = (e, t, n) => ({
		...K,
		display: "block",
		border: t,
		background: n,
		left: `${f ? f.x + f.w / 2 : 0}px`,
		top: `${f ? f.y + f.h / 2 : 0}px`,
		width: `${e}px`,
		height: `${e}px`
	});
	return r("div", {
		onPointerDown: F,
		onPointerMove: I,
		onPointerUp: te,
		onPointerLeave: () => {
			T.current || N(0, 0, !1);
		},
		style: {
			position: "absolute",
			inset: 0,
			pointerEvents: _ ? "none" : "auto",
			touchAction: "none",
			cursor: _ ? "default" : "none",
			overflow: "hidden"
		}
	}, r("div", {
		ref: S,
		style: {
			...K,
			border: R
		}
	}), r("div", {
		ref: C,
		style: {
			...K,
			border: "1px solid rgba(255,255,255,0.45)"
		}
	}), d && f ? r("div", { style: {
		position: "absolute",
		inset: 0,
		pointerEvents: "none"
	} }, r("div", { style: B(Math.max(3, z) * 2, "1.5px solid rgba(255,255,255,0.9)", a) }), r("div", { style: B(Math.max(1, z * (1 - l)) * 2, "1px solid rgba(255,255,255,0.45)") })) : null);
}
function be(e, t) {
	let n = k(e, o().getState());
	return n ? (t && o().setState(n), !0) : !1;
}
var xe = {
	overlay: ye,
	zoomable: !0,
	onEscape: () => o().getState().setArmed(!1),
	onAction: (e) => be(e, !0),
	wants: (e) => be(e, !1)
}, q = "safelight-paint-layers", Se = `${q}.styles`, J = {
	panel: `${q}-panel`,
	create: `${q}-create`,
	head: `${q}-head`,
	hint: `${q}-hint`,
	done: `${q}-done`,
	brush: `${q}-brush`,
	erase: `${q}-erase`,
	colour: `${q}-colour`,
	muted: `${q}-muted`,
	list: `${q}-list`,
	row: `${q}-row`,
	on: `${q}-on`,
	off: `${q}-off`,
	eye: `${q}-eye`,
	hidden: `${q}-hidden`,
	name: `${q}-name`,
	rename: `${q}-rename`,
	act: `${q}-act`,
	remove: `${q}-remove`,
	reveal: `${q}-reveal`,
	editor: `${q}-editor`,
	section: `${q}-section`,
	caption: `${q}-caption`,
	reset: `${q}-reset`,
	addComponent: `${q}-add-component`
}, Ce = (e, t) => `color-mix(in srgb, ${e} ${t}%, transparent)`;
function we(e) {
	return `
:where(.${J.panel} > :not(:last-child)) { margin-block: 0 0.5rem; }
:where(.${J.create}) { display: flex; width: 100%; align-items: center; justify-content: center; gap: 0.25rem; border-radius: 0.25rem; background-color: ${e.surface2}; padding: 0.375rem 0.5rem; font-size: 11px; color: ${e.textSecondary}; }
:where(.${J.create}:hover) { color: ${e.textPrimary}; }
:where(.${J.create}:disabled) { cursor: default; opacity: 0.4; }
:where(.${J.head}) { display: flex; align-items: center; justify-content: space-between; }
:where(.${J.hint}) { font-size: 10px; color: ${e.textMuted}; }
:where(.${J.done}) { border-radius: 0.25rem; background-color: ${e.surface2}; padding: 0.125rem 0.375rem; font-size: 11px; color: ${e.textSecondary}; }
:where(.${J.done}:hover) { color: ${e.textPrimary}; }
:where(.${J.brush}) { border-radius: 0.25rem; background-color: ${Ce(e.surface2, 50)}; padding: 0.375rem; }
:where(.${J.brush} > :not(:last-child)) { margin-block: 0 0.125rem; }
:where(.${J.erase}) { display: flex; align-items: center; gap: 0.375rem; padding: 0 0.125rem; font-size: 11px; color: ${e.textSecondary}; }
:where(.${J.colour}) { height: 0.875rem; width: 1.5rem; flex-shrink: 0; cursor: pointer; border-radius: 0.25rem; border: 1px solid ${e.borderSubtle}; background: transparent; padding: 0; }
:where(.${J.muted}) { color: ${e.textMuted}; }
:where(.${J.list} > :not(:last-child)) { margin-block: 0 0.125rem; }
:where(.${J.row}) { display: flex; cursor: pointer; align-items: center; gap: 0.375rem; border-radius: 0.25rem; padding: 0.25rem 0.375rem; font-size: 11px; color: ${e.textSecondary}; }
:where(.${J.row}:hover) { background-color: ${e.surface2}; }
:where(.${J.row}.${J.on}) { background-color: ${Ce(e.accent, 20)}; color: ${e.textPrimary}; }
:where(.${J.row}.${J.off}) { opacity: 0.5; }
:where(.${J.eye}) { flex-shrink: 0; border-radius: 0.25rem; padding: 0 0.125rem; color: ${e.textMuted}; }
:where(.${J.eye}.${J.hidden}) { color: ${Ce(e.textMuted, 40)}; }
:where(.${J.eye}:hover) { color: ${e.textPrimary}; }
:where(.${J.rename}) { min-width: 0; flex: 1 1 0%; border-radius: 0.25rem; background-color: ${e.surface3}; padding: 0 0.25rem; font-size: 11px; color: ${e.textPrimary}; outline: none; }
:where(.${J.name}) { flex: 1 1 0%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
:where(.${J.act}) { border-radius: 0.25rem; padding: 0 0.25rem; color: ${e.textMuted}; }
:where(.${J.act}:hover:not(:disabled)) { color: ${e.textPrimary}; }
:where(.${J.remove}) { border-radius: 0.25rem; padding: 0 0.25rem; color: ${e.textMuted}; }
:where(.${J.remove}:hover) { color: ${e.labelRed}; }
:where(.${J.reveal}) { opacity: 0; }
:where(.${J.row}:hover .${J.reveal}) { opacity: 1; }
:where(.${J.row}:hover .${J.reveal}:disabled) { cursor: default; opacity: 0.3; }
:where(.${J.editor}) { border-top: 1px solid ${e.borderSubtle}; padding-top: 0.5rem; }
:where(.${J.editor} > :not(:last-child)) { margin-block: 0 0.5rem; }
:where(.${J.section} > :not(:last-child)) { margin-block: 0 0.375rem; }
:where(.${J.caption}) { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: ${e.textMuted}; }
:where(.${J.reset}) { border-radius: 0.25rem; padding: 0 0.25rem; font-size: 10px; color: ${e.textMuted}; }
:where(.${J.reset}:hover) { color: ${e.textPrimary}; }
:where(.${J.addComponent}) { display: flex; width: 100%; align-items: center; justify-content: center; gap: 0.25rem; border-radius: 0.25rem; background-color: ${e.surface2}; padding: 0.25rem 0.5rem; font-size: 10px; color: ${e.textSecondary}; }
:where(.${J.addComponent}:hover) { color: ${e.textPrimary}; }
:where(.${J.addComponent}:disabled) { cursor: default; opacity: 0.4; }
html.sl-larger-text .${J.hint}, html.sl-larger-text .${J.addComponent}, html.sl-larger-text .${J.caption}, html.sl-larger-text .${J.reset} { font-size: 12px !important; }
html.sl-larger-text .${J.create}, html.sl-larger-text .${J.done}, html.sl-larger-text .${J.erase}, html.sl-larger-text .${J.row}, html.sl-larger-text .${J.rename} { font-size: 13px !important; line-height: 1.45 !important; }
html.sl-larger-text .${J.caption} { text-transform: none !important; letter-spacing: normal !important; }
`;
}
// src/highlight.ts
var Y = -1, X = 0, Z = 0, Q = null;
function Te() {
	Z += (X - Z) * .3, Math.abs(X - Z) < .01 && (Z = X), n().develop.setViewValues(Z > .002 ? {
		[d.highlight]: Y,
		[d.highlightStrength]: Z
	} : null), Q = Z === X ? null : requestAnimationFrame(Te);
}
function Ee(e) {
	let t = e !== null && e !== Y && Z > 0;
	e !== null && (Y = e), X = e === null ? 0 : p, Q === null && (t || Z !== X) && (Q = requestAnimationFrame(Te));
}
function De() {
	Q !== null && cancelAnimationFrame(Q), Q = null, Y = -1, X = 0, Z = 0;
}
// src/Panel.ts
var Oe = A.map((e, t) => ({
	value: String(t),
	label: e.label
}));
function ke() {
	let e = n(), { Panel: t, Slider: i } = e.components, { Select: a, tokens: s } = e.ui, c = e.stores.useDevelopStore, l = e.react, u = o()((e) => e.armed), d = o()((e) => e.activeLayerId), f = o()((e) => e.color), p = c((e) => e.paramBag), m = o()((e) => e.brushSize), h = o()((e) => e.brushFeather), g = o()((e) => e.brushOpacity), _ = o()((e) => e.brushFlow), v = o()((e) => e.brushErase), [y, b] = l.useState(null), x = e.develop.useCanvasToolHeld();
	l.useEffect(() => {
		u && !x && o().getState().setArmed(!1);
	}, [u, x]);
	let S = te(p), C = oe(S, d), [w, T] = l.useState(null), E = w ? S.findIndex((e) => e.id === w) : -1;
	l.useEffect(() => {
		Ee(E >= 0 ? E : null);
	}, [E]), l.useEffect(() => () => Ee(null), []);
	let ee = (e) => o().getState().setActiveLayer(e), D = () => {
		let e = de();
		e && ee(e);
	}, O = (e) => e ? ` ${J.on}` : "", k = (e) => (t) => {
		t.stopPropagation(), e();
	}, j = () => {
		if (!y) return;
		let e = y.value.trim(), t = S.find((e) => e.id === y.id);
		b(null), t && e && e !== t.name && G(t.id, { name: e }, "Rename Paint Layer");
	}, M = (e) => y?.id === e.id ? r("input", {
		autoFocus: !0,
		value: y.value,
		maxLength: 40,
		"aria-label": "Layer name",
		className: J.rename,
		onClick: (e) => e.stopPropagation(),
		onChange: (t) => b({
			id: e.id,
			value: t.currentTarget.value
		}),
		onBlur: j,
		onKeyDown: (e) => {
			e.key === "Enter" && e.currentTarget.blur(), e.key === "Escape" && b(null);
		}
	}) : r("span", {
		className: J.name,
		title: "Double-click to rename",
		onDoubleClick: (t) => {
			t.stopPropagation(), b({
				id: e.id,
				value: e.name
			});
		}
	}, e.name || "Untitled", r("span", { className: J.muted }, ` (${A[e.mode]?.label ?? "Normal"})`)), N = (e, t) => r("div", {
		key: e.id,
		title: "Paint on this layer",
		className: J.row + O(e.id === C?.id) + (e.visible ? "" : ` ${J.off}`),
		onClick: () => ee(e.id),
		onMouseEnter: () => T(e.id),
		onMouseLeave: () => T(null)
	}, r("button", {
		type: "button",
		title: e.visible ? "Hide" : "Show",
		"aria-label": e.visible ? `Hide ${e.name}` : `Show ${e.name}`,
		"aria-pressed": e.visible,
		className: J.eye + (e.visible ? "" : ` ${J.hidden}`),
		onMouseEnter: () => T(null),
		onMouseLeave: () => T(e.id),
		onClick: k(() => G(e.id, { visible: !e.visible }, e.visible ? "Hide Paint Layer" : "Show Paint Layer"))
	}, e.visible ? "◉" : "○"), M(e), r("button", {
		type: "button",
		title: "Move up",
		"aria-label": `Move ${e.name} up`,
		className: `${J.act} ${J.reveal}`,
		disabled: t === S.length - 1,
		onClick: k(() => pe(e.id, 1))
	}, "↑"), r("button", {
		type: "button",
		title: "Move down",
		"aria-label": `Move ${e.name} down`,
		className: `${J.act} ${J.reveal}`,
		disabled: t === 0,
		onClick: k(() => pe(e.id, -1))
	}, "↓"), r("button", {
		type: "button",
		title: "Delete layer",
		"aria-label": `Delete ${e.name}`,
		className: `${J.remove} ${J.reveal}`,
		onClick: k(() => fe(e.id))
	}, "×")), P = (e) => r("div", { className: J.editor }, r("div", { className: J.section }, r("div", { className: J.head }, r("span", { className: J.caption }, "Blending"), r("button", {
		type: "button",
		title: "Reset this layer's blend mode and opacity",
		className: J.reset,
		onClick: () => G(e.id, {
			mode: 0,
			opacity: 1
		}, "Reset Paint Layer")
	}, "Reset")), r(a, {
		value: String(e.mode),
		options: Oe,
		ariaLabel: "Blend mode",
		onChange: (t) => G(e.id, { mode: Number(t) }, "Paint Layer Blend Mode")
	}), r(i, {
		label: "Opacity",
		value: Math.round(e.opacity * 100),
		min: 0,
		max: 100,
		step: 1,
		defaultValue: 100,
		onChange: (t) => G(e.id, { opacity: t / 100 }),
		onCommit: () => me("Paint Layer Opacity")
	}), r("button", {
		type: "button",
		className: J.addComponent,
		disabled: e.dabs.length === 0,
		onClick: () => he(e.id)
	}, "Clear Layer"))), F = (e, t, n, a, s, c = 100) => r(i, {
		key: e,
		label: e,
		value: Math.round(t * 100),
		min: n,
		max: c,
		step: 1,
		defaultValue: a,
		onChange: (e) => {
			s(e / 100), o().getState().setBrushPreview(!0);
		},
		onCommit: () => o().getState().setBrushPreview(!1)
	}), I = o().getState(), L = S.map((e, t) => ({
		layer: e,
		slot: t
	})).reverse(), R = S.length >= 4, z = u ? C ? `${v ? "Erase from" : "Paint on"} ${C.name || "Untitled"}` : "Paint to add a layer" : `${S.length}/4 layers`;
	return r(t, {
		title: "Paint Layers",
		defaultOpen: !0
	}, r("div", { className: J.panel }, r("button", {
		type: "button",
		className: J.create,
		disabled: R,
		title: R ? "Layer limit reached (4)" : void 0,
		onClick: D
	}, "+ Add Layer"), r("div", { className: J.head }, r("span", { className: J.hint }, z), r("button", {
		type: "button",
		className: J.done,
		onClick: () => I.toggleArmed()
	}, u ? "Done" : "Paint")), u ? r("div", { className: J.brush }, r("label", { className: J.erase }, r("input", {
		type: "color",
		value: f,
		"aria-label": "Brush colour",
		className: J.colour,
		onChange: (e) => I.setColor(e.currentTarget.value)
	}), "Colour"), F("Size", m, 1, 8, (e) => I.setBrushSize(e), 50), F("Feather", h, 0, 50, (e) => I.setBrushFeather(e)), F("Opacity", g, 1, 100, (e) => I.setBrushOpacity(e)), F("Flow", _, 1, 100, (e) => I.setBrushFlow(e)), r("label", { className: J.erase }, r("input", {
		type: "checkbox",
		checked: v,
		onChange: (e) => I.setBrushErase(e.currentTarget.checked),
		style: { accentColor: s.sliderFill }
	}), "Erase", r("span", { className: J.muted }, "· Alt erase · [ ] size · ⇧ feather · , . opacity · ⇧, ⇧. flow"))) : null, S.length > 0 ? r("div", { className: J.list }, L.map(({ layer: e, slot: t }) => N(e, t))) : null, C ? P(C) : null));
}
// src/index.ts
var $ = null;
function Ae(e) {
	t(e), a(), e.registerStylesheet({
		id: Se,
		css: we(e.ui.tokens)
	}), e.registerProcessingStage(S()), $ = o().subscribe((t, n) => {
		t.armed !== n.armed && e.develop.setCanvasTool(t.armed ? xe : null);
	}), e.registerPanel({
		id: `${s}.panel`,
		title: "Paint Layers",
		component: ke,
		defaultDock: {
			module: "develop",
			direction: "right",
			order: 9,
			width: 250
		},
		onReset: () => void ge()
	});
}
function je() {
	try {
		o().getState().setArmed(!1), De(), $?.(), $ = null, n().develop.setCanvasTool(null), n().unregisterProcessingStage(c);
	} catch {}
}
export { Ae as activate, je as deactivate };

//# sourceMappingURL=index.js.map