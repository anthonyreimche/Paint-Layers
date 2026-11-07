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
}, u = (e, t) => `${c}.${e}${t}`, d = { layers: `${c}.layers` }, f = Array.from({ length: 4 }, (e, t) => t), p = (e) => [
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
], m = "\nfloat plLum(vec3 c) { return dot(c, vec3(0.3, 0.59, 0.11)); }\nfloat plSat(vec3 c) { return max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b)); }\nvec3 plClipColor(vec3 c) {\n  float l = plLum(c);\n  float n = min(c.r, min(c.g, c.b));\n  float x = max(c.r, max(c.g, c.b));\n  vec3 o = c;\n  if (n < 0.0) o = l + (o - l) * (l / (l - n));\n  if (x > 1.0) o = l + (o - l) * ((1.0 - l) / (x - l));\n  return o;\n}\nvec3 plSetLum(vec3 c, float l) { return plClipColor(c + (l - plLum(c))); }\nvec3 plSetSat(vec3 c, float s) {\n  float mx = max(c.r, max(c.g, c.b));\n  float mn = min(c.r, min(c.g, c.b));\n  return mx > mn ? (c - mn) * (s / (mx - mn)) : vec3(0.0);\n}\nfloat plDodge(float cb, float cs) { return cb <= 0.0 ? 0.0 : (cs >= 1.0 ? 1.0 : min(1.0, cb / (1.0 - cs))); }\nfloat plBurn(float cb, float cs) { return cb >= 1.0 ? 1.0 : (cs <= 0.0 ? 0.0 : 1.0 - min(1.0, (1.0 - cb) / cs)); }\nvec3 plHardLight(vec3 cb, vec3 cs) {\n  vec3 s2 = 2.0 * cs - 1.0;\n  return mix(cb + s2 - cb * s2, cb * (2.0 * cs), vec3(lessThanEqual(cs, vec3(0.5))));\n}\nfloat plSoftLight(float cb, float cs) {\n  if (cs <= 0.5) return cb - (1.0 - 2.0 * cs) * cb * (1.0 - cb);\n  float d = cb <= 0.25 ? ((16.0 * cb - 12.0) * cb + 4.0) * cb : sqrt(cb);\n  return cb + (2.0 * cs - 1.0) * (d - cb);\n}\nvec3 plBlend(int mode, vec3 cb, vec3 cs) {\n  if (mode == 1) return cb * cs;\n  if (mode == 2) return cb + cs - cb * cs;\n  if (mode == 3) return plHardLight(cs, cb);\n  if (mode == 4) return min(cb, cs);\n  if (mode == 5) return max(cb, cs);\n  if (mode == 6) return vec3(plDodge(cb.r, cs.r), plDodge(cb.g, cs.g), plDodge(cb.b, cs.b));\n  if (mode == 7) return vec3(plBurn(cb.r, cs.r), plBurn(cb.g, cs.g), plBurn(cb.b, cs.b));\n  if (mode == 8) return plHardLight(cb, cs);\n  if (mode == 9) return vec3(plSoftLight(cb.r, cs.r), plSoftLight(cb.g, cs.g), plSoftLight(cb.b, cs.b));\n  if (mode == 10) return abs(cb - cs);\n  if (mode == 11) return cb + cs - 2.0 * cb * cs;\n  if (mode == 12) return plSetLum(plSetSat(cs, plSat(cb)), plLum(cb));\n  if (mode == 13) return plSetLum(plSetSat(cb, plSat(cs)), plLum(cb));\n  if (mode == 14) return plSetLum(cs, plLum(cb));\n  if (mode == 15) return plSetLum(cb, plLum(cs));\n  return cs;\n}\nvec3 plComposite(vec3 c, vec4 paint, int mode, float opacity) {\n  float a = paint.a * clamp(opacity, 0.0, 1.0);\n  if (a <= 0.0) return c;\n  return mix(c, plBlend(mode, clamp(c, 0.0, 1.0), paint.rgb), a);\n}", h = f.map((e) => `if (visible${e}) c = plComposite(c, layers(${e}, srcUv), mode${e}, opacity${e});`).join("\n");
function g() {
	return {
		id: c,
		name: "Paint Layers",
		phase: "effects",
		presetScope: "per-image",
		space: { encoding: "perceptual" },
		uniforms: f.flatMap(p),
		textures: [{
			key: "layers",
			kind: "paint"
		}],
		helpers: m,
		glsl: h
	};
}
// src/brush.ts
var _ = .25;
function v(e, t, n, r, i) {
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
function y(e, t, n) {
	return Math.hypot((t.x - e.x) * n, t.y - e.y);
}
function b(e, t, n, r) {
	return y(e, t, r) >= n.brushSize * _;
}
function ee(e, t, n, r, i, a) {
	let o = Math.max(1, Math.ceil(y(e, t, i) / (n.brushSize * _))), s = [];
	for (let i = 1; i <= o; i++) {
		let c = i / o, l = {
			x: e.x + (t.x - e.x) * c,
			y: e.y + (t.y - e.y) * c
		};
		s.push(v(l, n, r, a, i === 1));
	}
	return s;
}
function x(e) {
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
var S = {
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
function C(e, t) {
	let n = S[e];
	if (!n) return null;
	let r = Math.round((t[n.key] + n.step) * 100) / 100;
	return { [n.key]: Math.max(n.min, Math.min(n.max, r)) };
}
// src/blend.ts
var w = [
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
Object.fromEntries(w.map((e, t) => [e.id, t]));
// src/layers.ts
var T = (e) => typeof e == "number" && Number.isFinite(e), E = (e) => typeof e == "object" && !!e;
function D(e) {
	if (!E(e)) return !1;
	let t = e.color;
	return T(e.x) && T(e.y) && T(e.radius) && T(e.feather) && T(e.opacity) && T(e.flow) && typeof e.erase == "boolean" && (e.strokeStart === void 0 || typeof e.strokeStart == "boolean") && Array.isArray(t) && t.length === 3 && t.every(T);
}
function O(e) {
	return Number.isInteger(e) && T(e) && e >= 0 && e < w.length ? e : l.mode;
}
function k(e) {
	return T(e) && e >= 0 && e <= 1 ? e : l.opacity;
}
function A(e) {
	return typeof e == "boolean" ? e : T(e) ? e !== 0 : l.visible;
}
function j(e) {
	let t = e[d.layers];
	return Array.isArray(t) ? t.slice(0, 4).map((t, n) => {
		let r = E(t) ? t : {};
		return {
			id: typeof r.id == "string" && r.id ? r.id : `layer-${n}`,
			name: typeof r.name == "string" ? r.name : `Layer ${n + 1}`,
			dabs: Array.isArray(r.dabs) ? r.dabs.filter(D) : [],
			mode: O(e[u("mode", n)]),
			opacity: k(e[u("opacity", n)]),
			visible: A(e[u("visible", n)])
		};
	}) : [];
}
function M(e) {
	let t = { [d.layers]: N(e) };
	for (let n = 0; n < 4; n++) {
		let r = e[n];
		t[u("mode", n)] = r ? r.mode : l.mode, t[u("opacity", n)] = r ? r.opacity : l.opacity, t[u("visible", n)] = r ? r.visible : l.visible;
	}
	return t;
}
function N(e) {
	return e.map(({ id: e, name: t, dabs: n }) => ({
		id: e,
		name: t,
		dabs: n
	}));
}
function P(e) {
	let t = new Set(e.map((e) => e.name)), n = 1;
	for (; t.has(`Layer ${n}`);) n++;
	return `Layer ${n}`;
}
function F(e, t) {
	return e.length >= 4 ? e : [...e, {
		id: t,
		name: P(e),
		dabs: [],
		...l
	}];
}
function I(e, t) {
	return e.filter((e) => e.id !== t);
}
function te(e, t, n) {
	let r = e.findIndex((e) => e.id === t), i = r + n;
	if (r < 0 || i < 0 || i >= e.length) return e;
	let a = [...e];
	return [a[r], a[i]] = [a[i], a[r]], a;
}
function L(e, t, n) {
	return e.map((e) => e.id === t ? {
		...e,
		...n
	} : e);
}
function R(e, t, n) {
	return e.some((e) => e.id === t) ? e.map((e) => e.id === t ? {
		...e,
		dabs: [...e.dabs, ...n]
	} : e) : e;
}
function z(e, t) {
	return e.find((e) => e.id === t) ?? e[e.length - 1] ?? null;
}
// src/persistence.ts
function B() {
	return n().stores.useDevelopStore.getState();
}
var V = () => j(B().paramBag);
function H() {
	return `layer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function U(e) {
	B().setDynParams(M(e));
}
function W(e, t) {
	U(e), B().commitEdit(t);
}
function ne(e, t) {
	let n = V(), r = z(n, e);
	if (r) return G(r.id, t), r.id;
	let i = H();
	return U(R(F(n, i), i, t)), i;
}
function G(e, t) {
	B().setDynParams({ [d.layers]: N(R(V(), e, t)) });
}
function K() {
	return B().commitEdit("Paint Stroke");
}
function re() {
	let e = V(), t = H(), n = F(e, t);
	return n === e ? null : (W(n, "Add Paint Layer"), t);
}
function ie(e) {
	W(I(V(), e), "Delete Paint Layer");
}
function q(e, t) {
	let n = V(), r = te(n, e, t);
	r !== n && W(r, "Move Paint Layer");
}
function J(e, t, n) {
	let r = L(V(), e, t);
	n ? W(r, n) : U(r);
}
function Y(e) {
	B().commitEdit(e);
}
function ae(e) {
	W(L(V(), e, { dabs: [] }), "Clear Paint Layer");
}
async function oe() {
	U([]), await B().commitEdit("Reset Paint Layers");
}
// src/Overlay.ts
var X = {
	position: "absolute",
	display: "none",
	transform: "translate(-50%, -50%)",
	borderRadius: "50%",
	boxShadow: "0 0 0 1px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.35)",
	pointerEvents: "none"
};
function Z(e) {
	let { brushSize: t, brushFeather: n, brushOpacity: r, brushFlow: i, brushErase: a } = e;
	return {
		brushSize: t,
		brushFeather: n,
		brushOpacity: r,
		brushFlow: i,
		brushErase: a
	};
}
function se(e) {
	return e instanceof HTMLElement && (e.tagName === "INPUT" || e.tagName === "TEXTAREA" || e.isContentEditable);
}
function ce() {
	let e = n().react, t = n().stores.useDevelopStore, i = o()((e) => e.armed), a = o()((e) => e.color), s = t((e) => e.photoId), c = o()((e) => e.brushSize), l = o()((e) => e.brushFeather), u = o()((e) => e.brushErase), d = o()((e) => e.brushPreview), { rect: f, imageRect: p, toImage: m, toScreen: h, radiusToScreen: g } = n().develop.useDevelopOverlay(), [_, y] = e.useState(!1), [S, C] = e.useState(!1), w = e.useRef(!1), T = e.useRef(null), E = e.useRef(null), D = e.useRef(null), O = e.useRef(null), k = e.useRef({
		lx: 0,
		ly: 0,
		shown: !1
	}), A = i && !!f && !!s && !!m && !!h && !!g, j = p && p.h > 0 ? p.w / p.h : 1, M = (e) => {
		w.current = e, y(e);
	};
	e.useEffect(() => {
		if (A && !_) return n().develop.setCanvasCursor("none", { priority: 20 });
	}, [A, _]), e.useEffect(() => {
		D.current = null, O.current = null;
	}, [s]), e.useEffect(() => {
		if (!A) {
			M(!1);
			return;
		}
		let e = (e) => {
			se(e.target) || ((e.code === "Space" || e.ctrlKey || e.metaKey) && M(!0), e.altKey && C(!0));
		}, t = (e) => {
			e.code !== "Space" && (e.ctrlKey || e.metaKey) || M(!1), e.altKey || C(!1);
		}, n = () => {
			M(!1), C(!1);
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
		a(T.current, Math.max(3, i) * 2, n), a(E.current, Math.max(1, i * (1 - r.brushFeather)) * 2, n);
	};
	e.useEffect(() => {
		k.current.shown && N(k.current.lx, k.current.ly, !0);
	}, [c, l]), e.useEffect(() => {
		_ && D.current && (D.current = null, K(), N(0, 0, !1));
	}, [_]);
	let P = (e) => {
		let t = e.currentTarget.getBoundingClientRect(), r = n().stores.useSettings.getState().uiScale || 1;
		return {
			lx: (e.clientX - t.left) / r,
			ly: (e.clientY - t.top) / r
		};
	}, F = (e) => {
		if (!A || w.current || e.button !== 0 || !m) return;
		let { lx: t, ly: n } = P(e), r = m(t, n);
		e.preventDefault(), e.stopPropagation(), e.currentTarget.setPointerCapture(e.pointerId);
		let i = Z(o().getState()), a = x(o().getState().color), s = e.shiftKey && O.current ? ee(O.current, r, i, a, j, e.altKey) : [v(r, i, a, e.altKey, !0)], c = ne(o().getState().activeLayerId, s);
		o().getState().setActiveLayer(c), O.current = r, D.current = {
			last: r,
			layerId: c
		}, N(t, n, !0);
	}, I = (e) => {
		if (!A || w.current || !m) return;
		let { lx: t, ly: n } = P(e);
		N(t, n, !0), C(e.altKey);
		let r = D.current;
		if (!r) return;
		let i = m(t, n), a = Z(o().getState());
		b(r.last, i, a, j) && (G(r.layerId, [v(i, a, x(o().getState().color), e.altKey, !1)]), r.last = i, O.current = i);
	}, te = (e) => {
		D.current && (D.current = null, e.currentTarget.releasePointerCapture(e.pointerId), K());
	};
	if (!A) return null;
	let L = S || u, R = `1.5px ${L ? "dashed" : "solid"} ${L ? "rgba(255,107,107,0.95)" : "rgba(255,255,255,0.9)"}`, z = f && g ? g(c) : 0, B = (e, t, n) => ({
		...X,
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
			D.current || N(0, 0, !1);
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
		ref: T,
		style: {
			...X,
			border: R
		}
	}), r("div", {
		ref: E,
		style: {
			...X,
			border: "1px solid rgba(255,255,255,0.45)"
		}
	}), d && f ? r("div", { style: {
		position: "absolute",
		inset: 0,
		pointerEvents: "none"
	} }, r("div", { style: B(Math.max(3, z) * 2, "1.5px solid rgba(255,255,255,0.9)", a) }), r("div", { style: B(Math.max(1, z * (1 - l)) * 2, "1px solid rgba(255,255,255,0.45)") })) : null);
}
function Q(e, t) {
	let n = C(e, o().getState());
	return n ? (t && o().setState(n), !0) : !1;
}
var le = {
	overlay: ce,
	zoomable: !0,
	onEscape: () => o().getState().setArmed(!1),
	onAction: (e) => Q(e, !0),
	wants: (e) => Q(e, !1)
}, ue = w.map((e, t) => ({
	value: String(t),
	label: e.label
}));
function de() {
	let e = n(), t = e.components.Slider, { Button: i, Field: a, Row: s, Section: c, Select: l, Stack: u, TextInput: d, Toggle: f, tokens: p } = e.ui, m = e.stores.useDevelopStore, h = e.react, g = o()((e) => e.armed), _ = o()((e) => e.activeLayerId), v = o()((e) => e.color), y = m((e) => e.paramBag), b = o()((e) => e.brushSize), ee = o()((e) => e.brushFeather), x = o()((e) => e.brushOpacity), S = o()((e) => e.brushFlow), C = o()((e) => e.brushErase), w = h.useRef(!1), T = e.develop.useCanvasToolHeld();
	h.useEffect(() => {
		g && !T && o().getState().setArmed(!1);
	}, [g, T]);
	let E = j(y), D = z(E, _), O = {
		fontSize: "10px",
		lineHeight: 1.4,
		color: p.textMuted
	}, k = (e) => o().getState().setActiveLayer(e), A = () => {
		let e = re();
		e && k(e);
	}, M = (e, t) => r(s, {
		key: e.id,
		gap: 4
	}, r(f, {
		checked: e.visible,
		ariaLabel: e.visible ? `Hide ${e.name}` : `Show ${e.name}`,
		onChange: (t) => J(e.id, { visible: t }, t ? "Show Paint Layer" : "Hide Paint Layer")
	}), r(i, {
		size: "sm",
		variant: "ghost",
		active: e.id === D?.id,
		title: "Paint on this layer",
		style: {
			flex: 1,
			justifyContent: "flex-start",
			minWidth: 0,
			overflow: "hidden"
		},
		onClick: () => k(e.id)
	}, e.name || "Untitled"), r(i, {
		size: "sm",
		variant: "ghost",
		title: "Move up",
		"aria-label": `Move ${e.name} up`,
		disabled: t === E.length - 1,
		onClick: () => q(e.id, 1)
	}, "↑"), r(i, {
		size: "sm",
		variant: "ghost",
		title: "Move down",
		"aria-label": `Move ${e.name} down`,
		disabled: t === 0,
		onClick: () => q(e.id, -1)
	}, "↓"), r(i, {
		size: "sm",
		variant: "ghost",
		title: "Delete layer",
		"aria-label": `Delete ${e.name}`,
		onClick: () => ie(e.id)
	}, "×")), N = (e) => r(u, { gap: 6 }, r(a, { label: "Name" }, r(d, {
		value: e.name,
		maxLength: 40,
		"aria-label": "Layer name",
		onChange: (t) => {
			w.current = !0, J(e.id, { name: t });
		},
		onBlur: () => {
			w.current && (w.current = !1, Y("Rename Paint Layer"));
		}
	})), r(a, { label: "Blend mode" }, r(l, {
		value: String(e.mode),
		options: ue,
		ariaLabel: "Blend mode",
		onChange: (t) => J(e.id, { mode: Number(t) }, "Paint Layer Blend Mode")
	})), r(t, {
		label: "Opacity",
		value: Math.round(e.opacity * 100),
		min: 0,
		max: 100,
		step: 1,
		defaultValue: 100,
		onChange: (t) => J(e.id, { opacity: t / 100 }),
		onCommit: () => Y("Paint Layer Opacity")
	})), P = (e, n, i, a, s, c = 100) => r(t, {
		key: e,
		label: e,
		value: Math.round(n * 100),
		min: i,
		max: c,
		step: 1,
		defaultValue: a,
		onChange: (e) => {
			s(e / 100), o().getState().setBrushPreview(!0);
		},
		onCommit: () => o().getState().setBrushPreview(!1)
	}), F = o().getState(), I = E.map((e, t) => ({
		layer: e,
		slot: t
	})).reverse();
	return r(u, {
		gap: 10,
		style: { padding: "6px 8px 8px" }
	}, r(c, {
		title: "Layers",
		right: r(i, {
			size: "sm",
			disabled: E.length >= 4,
			onClick: A
		}, "Add layer")
	}, E.length === 0 ? r("span", { style: O }, "No layers yet. Add one, or turn the brush on and paint.") : r(u, { gap: 2 }, I.map(({ layer: e, slot: t }) => M(e, t))), D ? N(D) : null), r(c, {
		title: "Brush",
		right: r(i, {
			size: "sm",
			active: g,
			onClick: () => o().getState().toggleArmed()
		}, g ? "Done" : "Paint")
	}, r(s, { gap: 8 }, r("input", {
		type: "color",
		value: v,
		"aria-label": "Brush colour",
		title: "Brush colour",
		onChange: (e) => o().getState().setColor(e.currentTarget.value),
		style: {
			width: "32px",
			height: "22px",
			padding: 0,
			border: `1px solid ${p.border}`,
			borderRadius: "3px",
			background: "transparent",
			cursor: "pointer"
		}
	}), r("span", { style: {
		fontSize: "11px",
		color: p.textSecondary
	} }, "Colour")), r(u, { gap: 1 }, P("Size", b, 1, 8, (e) => F.setBrushSize(e), 50), P("Feather", ee, 0, 50, (e) => F.setBrushFeather(e)), P("Flow", S, 1, 100, (e) => F.setBrushFlow(e)), P("Opacity", x, 1, 100, (e) => F.setBrushOpacity(e))), r(s, {
		gap: 8,
		justify: "space-between"
	}, r(f, {
		checked: C,
		onChange: (e) => F.setBrushErase(e),
		label: "Erase"
	}), r(i, {
		size: "sm",
		variant: "ghost",
		disabled: !D || D.dabs.length === 0,
		onClick: () => D && ae(D.id)
	}, "Clear layer")), g ? r("span", { style: O }, "Alt erases, Shift+click paints a straight line, Ctrl or Space pans and zooms, Esc when done.") : null));
}
// src/index.ts
var $ = null;
function fe(e) {
	t(e), a(), e.registerProcessingStage(g()), $ = o().subscribe((t, n) => {
		t.armed !== n.armed && e.develop.setCanvasTool(t.armed ? le : null);
	}), e.registerPanel({
		id: `${s}.panel`,
		title: "Paint Layers",
		component: de,
		defaultDock: {
			module: "develop",
			direction: "right",
			order: 9,
			width: 250
		},
		onReset: () => void oe()
	});
}
function pe() {
	try {
		o().getState().setArmed(!1), $?.(), $ = null, n().develop.setCanvasTool(null), n().unregisterProcessingStage(c);
	} catch {}
}
export { fe as activate, pe as deactivate };

//# sourceMappingURL=index.js.map