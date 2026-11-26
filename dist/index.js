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
// src/brush.ts
function i(e, t) {
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
function a(e, t, n, r, i) {
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
function o(e, t, n) {
	return Math.hypot((t.x - e.x) * n, t.y - e.y);
}
function s(e) {
	return e.tip ? e.tip.spacing * 2 * e.brushSize : e.brushSize * .25;
}
function c(e, t, n, r) {
	return o(e, t, r) >= s(n);
}
function l(e, t, n, r, i, o, s, c) {
	let l = n.tip;
	if (!l) return [a(e, n, r, o, s)];
	let u = t.x * i, d = t.y, f = Math.hypot(u, d), p = f > 0 ? u / f : 1, m = f > 0 ? d / f : 0, h = Math.atan2(m, p), g = n.brushSize * 2, _ = [];
	for (let t = 0; t < l.count; t++) {
		let u = l.scatter * g * (2 * c() - 1), d = c(), f = c(), v = c(), y = s && t === 0, b = a({
			x: e.x + -m * u / i,
			y: e.y + p * u
		}, n, r, o, y);
		b.radius = Math.max(n.brushSize * .02, n.brushSize * (1 - l.sizeJitter * d)), b.flow = n.brushFlow * (1 - l.flowJitter * v), b.angle = l.angle + (l.followStroke ? h : 0) + l.angleJitter * Math.PI * (2 * f - 1), y && (b.tip = l.id), _.push(b);
	}
	return _;
}
function u(e, t, n, r, i, a, c = Math.random) {
	let u = Math.max(1, Math.ceil(o(e, t, i) / s(n))), d = {
		x: t.x - e.x,
		y: t.y - e.y
	}, f = [];
	for (let t = 1; t <= u; t++) {
		let o = t / u, s = {
			x: e.x + d.x * o,
			y: e.y + d.y * o
		};
		f.push(...l(s, d, n, r, i, a, t === 1, c));
	}
	return f;
}
function d(e) {
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
function f(e, t, n) {
	let r = t / 100, i = n / 100, a = r * Math.min(i, 1 - i), o = (t) => {
		let n = (t + e / 30) % 12, r = i - a * Math.max(-1, Math.min(n - 3, 9 - n, 1));
		return Math.round(Math.min(1, Math.max(0, r)) * 255).toString(16).padStart(2, "0");
	};
	return `#${o(0)}${o(8)}${o(4)}`;
}
// src/store.ts
var p = {
	brushSpacing: .25,
	brushScatter: 0,
	brushCount: 1,
	brushSizeJitter: 0,
	brushAngle: 0,
	brushAngleJitter: 0,
	brushFollowStroke: !1,
	brushFlowJitter: 0
};
function m(e) {
	return {
		brushSpacing: e?.spacing ?? p.brushSpacing,
		brushScatter: e?.scatter ?? p.brushScatter,
		brushCount: e?.count ?? p.brushCount,
		brushSizeJitter: e?.sizeJitter ?? p.brushSizeJitter,
		brushAngle: e?.angle ?? p.brushAngle,
		brushAngleJitter: e?.angleJitter ?? p.brushAngleJitter,
		brushFollowStroke: e?.followStroke ?? p.brushFollowStroke,
		brushFlowJitter: e?.flowJitter ?? p.brushFlowJitter
	};
}
var h = null;
function g() {
	let { defaults: e } = n().develop.brush;
	return h = n().stores.create((t) => ({
		armed: !1,
		activeLayerId: null,
		color: "#ffffff",
		colourHue: 0,
		colourSaturation: 0,
		colourLightness: 100,
		brushSize: e.size,
		brushFeather: e.feather,
		brushOpacity: e.opacity,
		brushFlow: e.flow,
		brushErase: !1,
		brushPreview: !1,
		tip: null,
		...p,
		setArmed: (e) => t({ armed: e }),
		toggleArmed: () => t((e) => ({ armed: !e.armed })),
		setActiveLayer: (e) => t({ activeLayerId: e }),
		setColourChannels: ({ hue: e, saturation: n, lightness: r }) => t({
			color: f(e, n, r),
			colourHue: e,
			colourSaturation: n,
			colourLightness: r
		}),
		setBrushSize: (e) => t({ brushSize: e }),
		setBrushFeather: (e) => t({ brushFeather: e }),
		setBrushOpacity: (e) => t({ brushOpacity: e }),
		setBrushFlow: (e) => t({ brushFlow: e }),
		setBrushErase: (e) => t({ brushErase: e }),
		setBrushPreview: (e) => t({ brushPreview: e }),
		pickTip: (e, n) => t(e === null ? { tip: null } : {
			tip: e,
			...m(n)
		}),
		setBrushDynamics: (e) => t(e)
	})), h;
}
function _() {
	if (!h) throw Error("[paint-layers] store used before activate()");
	return h;
}
// src/stage.ts
var v = "paint-layers", y = `${v}.composite`, b = {
	mode: 0,
	opacity: 1,
	visible: !0
}, x = (e, t) => `${y}.${e}${t}`, S = {
	layers: `${y}.layers`,
	highlight: `${y}.highlight`,
	highlightStrength: `${y}.highlightStrength`
}, C = [
	.9,
	.25,
	.25
], w = .5, T = [{
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
}], E = Array.from({ length: 4 }, (e, t) => t), D = (e) => [
	{
		key: `mode${e}`,
		glslType: "int",
		default: b.mode,
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
		default: b.opacity,
		range: {
			min: 0,
			max: 1
		},
		label: `Layer ${e + 1} opacity`
	},
	{
		key: `visible${e}`,
		glslType: "bool",
		default: b.visible,
		label: `Layer ${e + 1} visible`
	}
], ee = "\nfloat plLum(vec3 c) { return dot(c, vec3(0.3, 0.59, 0.11)); }\nfloat plSat(vec3 c) { return max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b)); }\nvec3 plClipColor(vec3 c) {\n  float l = plLum(c);\n  float n = min(c.r, min(c.g, c.b));\n  float x = max(c.r, max(c.g, c.b));\n  vec3 o = c;\n  if (n < 0.0) o = l + (o - l) * (l / (l - n));\n  if (x > 1.0) o = l + (o - l) * ((1.0 - l) / (x - l));\n  return o;\n}\nvec3 plSetLum(vec3 c, float l) { return plClipColor(c + (l - plLum(c))); }\nvec3 plSetSat(vec3 c, float s) {\n  float mx = max(c.r, max(c.g, c.b));\n  float mn = min(c.r, min(c.g, c.b));\n  return mx > mn ? (c - mn) * (s / (mx - mn)) : vec3(0.0);\n}\nfloat plDodge(float cb, float cs) { return cb <= 0.0 ? 0.0 : (cs >= 1.0 ? 1.0 : min(1.0, cb / (1.0 - cs))); }\nfloat plBurn(float cb, float cs) { return cb >= 1.0 ? 1.0 : (cs <= 0.0 ? 0.0 : 1.0 - min(1.0, (1.0 - cb) / cs)); }\nvec3 plHardLight(vec3 cb, vec3 cs) {\n  vec3 s2 = 2.0 * cs - 1.0;\n  return mix(cb + s2 - cb * s2, cb * (2.0 * cs), vec3(lessThanEqual(cs, vec3(0.5))));\n}\nfloat plSoftLight(float cb, float cs) {\n  if (cs <= 0.5) return cb - (1.0 - 2.0 * cs) * cb * (1.0 - cb);\n  float d = cb <= 0.25 ? ((16.0 * cb - 12.0) * cb + 4.0) * cb : sqrt(cb);\n  return cb + (2.0 * cs - 1.0) * (d - cb);\n}\nvec3 plBlend(int mode, vec3 cb, vec3 cs) {\n  if (mode == 1) return cb * cs;\n  if (mode == 2) return cb + cs - cb * cs;\n  if (mode == 3) return plHardLight(cs, cb);\n  if (mode == 4) return min(cb, cs);\n  if (mode == 5) return max(cb, cs);\n  if (mode == 6) return vec3(plDodge(cb.r, cs.r), plDodge(cb.g, cs.g), plDodge(cb.b, cs.b));\n  if (mode == 7) return vec3(plBurn(cb.r, cs.r), plBurn(cb.g, cs.g), plBurn(cb.b, cs.b));\n  if (mode == 8) return plHardLight(cb, cs);\n  if (mode == 9) return vec3(plSoftLight(cb.r, cs.r), plSoftLight(cb.g, cs.g), plSoftLight(cb.b, cs.b));\n  if (mode == 10) return abs(cb - cs);\n  if (mode == 11) return cb + cs - 2.0 * cb * cs;\n  if (mode == 12) return plSetLum(plSetSat(cs, plSat(cb)), plLum(cb));\n  if (mode == 13) return plSetLum(plSetSat(cb, plSat(cs)), plLum(cb));\n  if (mode == 14) return plSetLum(cs, plLum(cb));\n  if (mode == 15) return plSetLum(cb, plLum(cs));\n  return cs;\n}\nvec3 plComposite(vec3 c, vec4 paint, int mode, float opacity) {\n  float a = paint.a * clamp(opacity, 0.0, 1.0);\n  if (a <= 0.0) return c;\n  return mix(c, plBlend(mode, clamp(c, 0.0, 1.0), paint.rgb), a);\n}", [te, ne, re] = C, O = [...E.map((e) => `if (visible${e}) c = plComposite(c, layers(${e}, srcUv), mode${e}, opacity${e});`), `if (highlight >= 0) c = mix(c, vec3(${te}, ${ne}, ${re}), layers(highlight, srcUv).a * highlightStrength);`].join("\n");
function k() {
	return {
		id: y,
		name: "Paint Layers",
		phase: "effects",
		presetScope: "per-image",
		space: { encoding: "perceptual" },
		uniforms: [...E.flatMap(D), ...T],
		textures: [{
			key: "layers",
			kind: "paint"
		}],
		helpers: ee,
		glsl: O
	};
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
	return j(e.x) && j(e.y) && j(e.radius) && j(e.feather) && j(e.opacity) && j(e.flow) && typeof e.erase == "boolean" && (e.strokeStart === void 0 || typeof e.strokeStart == "boolean") && (e.tip === void 0 || typeof e.tip == "string") && (e.angle === void 0 || j(e.angle)) && Array.isArray(t) && t.length === 3 && t.every(j);
}
function P(e) {
	return Number.isInteger(e) && j(e) && e >= 0 && e < A.length ? e : b.mode;
}
function ie(e) {
	return j(e) && e >= 0 && e <= 1 ? e : b.opacity;
}
function F(e) {
	return typeof e == "boolean" ? e : j(e) ? e !== 0 : b.visible;
}
function ae(e) {
	let t = e[S.layers];
	return Array.isArray(t) ? t.slice(0, 4).map((t, n) => {
		let r = M(t) ? t : {};
		return {
			id: typeof r.id == "string" && r.id ? r.id : `layer-${n}`,
			name: typeof r.name == "string" ? r.name : `Layer ${n + 1}`,
			dabs: Array.isArray(r.dabs) ? r.dabs.filter(N) : [],
			mode: P(e[x("mode", n)]),
			opacity: ie(e[x("opacity", n)]),
			visible: F(e[x("visible", n)])
		};
	}) : [];
}
function I(e) {
	let t = { [S.layers]: L(e) };
	for (let n = 0; n < 4; n++) {
		let r = e[n];
		t[x("mode", n)] = r ? r.mode : b.mode, t[x("opacity", n)] = r ? r.opacity : b.opacity, t[x("visible", n)] = r ? r.visible : b.visible;
	}
	return t;
}
function L(e) {
	return e.map(({ id: e, name: t, dabs: n }) => ({
		id: e,
		name: t,
		dabs: n
	}));
}
function oe(e) {
	let t = new Set(e.map((e) => e.name)), n = 1;
	for (; t.has(`Layer ${n}`);) n++;
	return `Layer ${n}`;
}
function R(e, t) {
	return e.length >= 4 ? e : [...e, {
		id: t,
		name: oe(e),
		dabs: [],
		...b
	}];
}
function z(e, t) {
	return e.filter((e) => e.id !== t);
}
function se(e, t, n) {
	let r = e.findIndex((e) => e.id === t), i = r + n;
	if (r < 0 || i < 0 || i >= e.length) return e;
	let a = [...e];
	return [a[r], a[i]] = [a[i], a[r]], a;
}
function ce(e, t, n) {
	return e.map((e) => e.id === t ? {
		...e,
		...n
	} : e);
}
function le(e, t, n) {
	return e.some((e) => e.id === t) ? e.map((e) => e.id === t ? {
		...e,
		dabs: [...e.dabs, ...n]
	} : e) : e;
}
function ue(e, t) {
	return e.find((e) => e.id === t) ?? e[e.length - 1] ?? null;
}
// src/persistence.ts
function B() {
	return n().stores.useDevelopStore.getState();
}
var V = () => ae(B().paramBag);
function H() {
	return `layer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function U(e) {
	B().setDynParams(I(e));
}
function W(e, t) {
	U(e), B().commitEdit(t);
}
function de(e, t) {
	let n = V(), r = ue(n, e);
	if (r) return fe(r.id, t), r.id;
	let i = H();
	return U(le(R(n, i), i, t)), i;
}
function fe(e, t) {
	B().setDynParams({ [S.layers]: L(le(V(), e, t)) });
}
function G() {
	return B().commitEdit("Paint Stroke");
}
function pe() {
	let e = V(), t = H(), n = R(e, t);
	return n === e ? null : (W(n, "Add Paint Layer"), t);
}
function me(e) {
	W(z(V(), e), "Delete Paint Layer");
}
function he(e, t) {
	let n = V(), r = se(n, e, t);
	r !== n && W(r, "Move Paint Layer");
}
function K(e, t, n) {
	let r = ce(V(), e, t);
	n ? W(r, n) : U(r);
}
function ge(e) {
	B().commitEdit(e);
}
function _e(e) {
	W(ce(V(), e, { dabs: [] }), "Clear Paint Layer");
}
async function ve() {
	U([]), await B().commitEdit("Reset Paint Layers");
}
// src/Overlay.ts
var ye = {
	size: "brushSize",
	feather: "brushFeather",
	opacity: "brushOpacity",
	flow: "brushFlow"
};
function be(e) {
	let { brushSize: t, brushFeather: r, brushOpacity: a, brushFlow: o, brushErase: s } = e, c = i(e, n().develop.brushTips().map((e) => e.id));
	return {
		brushSize: t,
		brushFeather: r,
		brushOpacity: a,
		brushFlow: o,
		brushErase: s,
		...c ? { tip: c } : {}
	};
}
function xe() {
	let e = n().react, t = n().stores.useDevelopStore, i = _()((e) => e.armed), a = t((e) => e.photoId), o = _()((e) => e.brushSize), s = _()((e) => e.brushFeather), f = _()((e) => e.brushErase), p = _()((e) => e.brushPreview), m = _()((e) => e.tip), h = !n().develop.useBrushTips().some((e) => e.id === m), { rect: g, imageRect: v, toImage: y } = n().develop.useDevelopOverlay(), [b, x] = e.useState(!1), [S, C] = e.useState(null), w = e.useRef(null), T = e.useRef(null), E = i && !!g && !!a && !!y, D = v && v.h > 0 ? v.w / v.h : 1;
	return e.useEffect(() => {
		w.current = null, T.current = null;
	}, [a]), E ? r("div", {
		onPointerDown: (e) => {
			if (!E || e.button !== 0 || !y) return;
			let t = n().develop.framePoint(e.currentTarget, e.clientX, e.clientY), r = y(t.x, t.y);
			e.preventDefault(), e.stopPropagation(), e.currentTarget.setPointerCapture(e.pointerId);
			let i = be(_().getState()), a = d(_().getState().color), o = e.shiftKey && T.current ? u(T.current, r, i, a, D, e.altKey) : l(r, {
				x: 0,
				y: 0
			}, i, a, D, e.altKey, !0, Math.random), s = de(_().getState().activeLayerId, o);
			_().getState().setActiveLayer(s), T.current = r, w.current = {
				last: r,
				layerId: s
			}, C(t);
		},
		onPointerMove: (e) => {
			if (!E || !y) return;
			let t = n().develop.framePoint(e.currentTarget, e.clientX, e.clientY);
			C(t), x(e.altKey);
			let r = w.current;
			if (!r) return;
			let i = y(t.x, t.y), a = be(_().getState());
			if (!c(r.last, i, a, D)) return;
			let o = {
				x: i.x - r.last.x,
				y: i.y - r.last.y
			};
			fe(r.layerId, l(i, o, a, d(_().getState().color), D, e.altKey, !1, Math.random)), r.last = i, T.current = i;
		},
		onPointerUp: (e) => {
			w.current && (w.current = null, e.currentTarget.releasePointerCapture(e.pointerId), G());
		},
		onPointerLeave: () => {
			w.current || C(null);
		},
		style: {
			position: "absolute",
			inset: 0,
			touchAction: "none",
			cursor: n().cursors.resolve("crosshair"),
			overflow: "hidden"
		}
	}, r(n().develop.BrushCursor, {
		at: p ? "centre" : S,
		size: o,
		feather: h ? s : 0,
		erase: b || f
	})) : null;
}
function Se(e, t) {
	let r = _().getState(), i = n().develop.brush.step(e, {
		size: r.brushSize,
		feather: r.brushFeather,
		opacity: r.brushOpacity,
		flow: r.brushFlow
	});
	return i ? (t && _().setState({ [ye[i.key]]: i.value }), !0) : !1;
}
var Ce = {
	overlay: xe,
	zoomable: !0,
	onEscape: () => _().getState().setArmed(!1),
	onAction: (e) => Se(e, !0),
	wants: (e) => Se(e, !1)
}, q = "safelight-paint-layers", we = `${q}.styles`, J = {
	panel: `${q}-panel`,
	create: `${q}-create`,
	head: `${q}-head`,
	hint: `${q}-hint`,
	done: `${q}-done`,
	brush: `${q}-brush`,
	erase: `${q}-erase`,
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
	addComponent: `${q}-add-component`,
	tips: `${q}-tips`,
	tip: `${q}-tip`,
	round: `${q}-round`
}, Y = (e, t) => `color-mix(in srgb, ${e} ${t}%, transparent)`;
function Te(e) {
	return `
:where(.${J.panel} > :not(:last-child)) { margin-block: 0 0.5rem; }
:where(.${J.create}) { display: flex; width: 100%; align-items: center; justify-content: center; gap: 0.25rem; border-radius: 0.25rem; background-color: ${e.surface2}; padding: 0.375rem 0.5rem; font-size: 11px; color: ${e.textSecondary}; }
:where(.${J.create}:hover) { color: ${e.textPrimary}; }
:where(.${J.create}:disabled) { cursor: default; opacity: 0.4; }
:where(.${J.head}) { display: flex; align-items: center; justify-content: space-between; }
:where(.${J.hint}) { font-size: 10px; color: ${e.textMuted}; }
:where(.${J.done}) { border-radius: 0.25rem; background-color: ${e.surface2}; padding: 0.125rem 0.375rem; font-size: 11px; color: ${e.textSecondary}; }
:where(.${J.done}:hover) { color: ${e.textPrimary}; }
:where(.${J.brush}) { border-radius: 0.25rem; background-color: ${Y(e.surface2, 50)}; padding: 0.375rem; }
:where(.${J.brush} > :not(:last-child)) { margin-block: 0 0.125rem; }
:where(.${J.erase}) { display: flex; align-items: center; gap: 0.375rem; padding: 0 0.125rem; font-size: 11px; color: ${e.textSecondary}; }
:where(.${J.muted}) { color: ${e.textMuted}; }
:where(.${J.tips}) { display: flex; flex-wrap: wrap; gap: 0.125rem; }
:where(.${J.tip}) { display: flex; height: 2.25rem; width: 2.25rem; flex-shrink: 0; align-items: center; justify-content: center; overflow: hidden; border-radius: 0.25rem; padding: 0.125rem; }
:where(.${J.tip}:hover) { background-color: ${e.surface2}; }
:where(.${J.tip}.${J.on}) { background-color: ${Y(e.accent, 20)}; }
:where(.${J.tip} img) { height: 100%; width: 100%; border-radius: 0.125rem; object-fit: contain; }
:where(.${J.round}) { display: block; height: 100%; width: 100%; border-radius: 0.125rem; background: radial-gradient(circle, #ebebeb 35%, rgba(235, 235, 235, 0) 68%), #1c1c1c; }
:where(.${J.list} > :not(:last-child)) { margin-block: 0 0.125rem; }
:where(.${J.row}) { display: flex; cursor: pointer; align-items: center; gap: 0.375rem; border-radius: 0.25rem; padding: 0.25rem 0.375rem; font-size: 11px; color: ${e.textSecondary}; }
:where(.${J.row}:hover) { background-color: ${e.surface2}; }
:where(.${J.row}.${J.on}) { background-color: ${Y(e.accent, 20)}; color: ${e.textPrimary}; }
:where(.${J.row}.${J.off}) { opacity: 0.5; }
:where(.${J.eye}) { flex-shrink: 0; border-radius: 0.25rem; padding: 0 0.125rem; color: ${e.textMuted}; }
:where(.${J.eye}.${J.hidden}) { color: ${Y(e.textMuted, 40)}; }
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
var X = -1, Z = 0, Q = 0, $ = null;
function Ee() {
	Q += (Z - Q) * .3, Math.abs(Z - Q) < .01 && (Q = Z), n().develop.setViewValues(Q > .002 ? {
		[S.highlight]: X,
		[S.highlightStrength]: Q
	} : null), $ = Q === Z ? null : requestAnimationFrame(Ee);
}
function De(e) {
	let t = e !== null && e !== X && Q > 0;
	e !== null && (X = e), Z = e === null ? 0 : w, $ === null && (t || Q !== Z) && ($ = requestAnimationFrame(Ee));
}
function Oe() {
	$ !== null && cancelAnimationFrame($), $ = null, X = -1, Z = 0, Q = 0;
}
function ke(e) {
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
var Ae = /* @__PURE__ */ new Map();
function je(e) {
	let t = Ae.get(e.id);
	if (t !== void 0) return t;
	let n = Me(e);
	return Ae.set(e.id, n), n;
}
function Me(e) {
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
var Ne = A.map((e, t) => ({
	value: String(t),
	label: e.label
}));
function Pe() {
	let e = n(), { Panel: t, Slider: i } = e.components, { Select: a, ColourField: o, tokens: s } = e.ui, c = e.stores.useDevelopStore, l = e.react, u = _()((e) => e.armed), d = _()((e) => e.activeLayerId), f = _()((e) => e.colourHue), p = _()((e) => e.colourSaturation), h = _()((e) => e.colourLightness), g = c((e) => e.paramBag), v = _()((e) => e.brushSize), y = _()((e) => e.brushFeather), b = _()((e) => e.brushOpacity), x = _()((e) => e.brushFlow), S = _()((e) => e.brushErase), C = _()((e) => e.tip), w = _()((e) => e.brushSpacing), T = _()((e) => e.brushScatter), E = _()((e) => e.brushCount), D = _()((e) => e.brushSizeJitter), ee = _()((e) => e.brushAngle), te = _()((e) => e.brushAngleJitter), ne = _()((e) => e.brushFollowStroke), re = _()((e) => e.brushFlowJitter), O = e.develop.useBrushTips(), [k, j] = l.useState(null), M = e.develop.useCanvasToolHeld();
	l.useEffect(() => {
		u && !M && _().getState().setArmed(!1);
	}, [u, M]);
	let N = ae(g), P = ue(N, d), [ie, F] = l.useState(null), I = ie ? N.findIndex((e) => e.id === ie) : -1;
	l.useEffect(() => {
		De(I >= 0 ? I : null);
	}, [I]), l.useEffect(() => () => De(null), []);
	let L = (e) => _().getState().setActiveLayer(e), oe = () => {
		let e = pe();
		e && L(e);
	}, R = (e) => e ? ` ${J.on}` : "", z = (e) => (t) => {
		t.stopPropagation(), e();
	}, se = () => {
		if (!k) return;
		let e = k.value.trim(), t = N.find((e) => e.id === k.id);
		j(null), t && e && e !== t.name && K(t.id, { name: e }, "Rename Paint Layer");
	}, ce = (e) => k?.id === e.id ? r("input", {
		autoFocus: !0,
		value: k.value,
		maxLength: 40,
		"aria-label": "Layer name",
		className: J.rename,
		onClick: (e) => e.stopPropagation(),
		onChange: (t) => j({
			id: e.id,
			value: t.currentTarget.value
		}),
		onBlur: se,
		onKeyDown: (e) => {
			e.key === "Enter" && e.currentTarget.blur(), e.key === "Escape" && j(null);
		}
	}) : r("span", {
		className: J.name,
		title: "Double-click to rename",
		onDoubleClick: (t) => {
			t.stopPropagation(), j({
				id: e.id,
				value: e.name
			});
		}
	}, e.name || "Untitled", r("span", { className: J.muted }, ` (${A[e.mode]?.label ?? "Normal"})`)), le = (e, t) => r("div", {
		key: e.id,
		title: "Paint on this layer",
		className: J.row + R(e.id === P?.id) + (e.visible ? "" : ` ${J.off}`),
		onClick: () => L(e.id),
		onMouseEnter: () => F(e.id),
		onMouseLeave: () => F(null)
	}, r("button", {
		type: "button",
		title: e.visible ? "Hide" : "Show",
		"aria-label": e.visible ? `Hide ${e.name}` : `Show ${e.name}`,
		"aria-pressed": e.visible,
		className: J.eye + (e.visible ? "" : ` ${J.hidden}`),
		onMouseEnter: () => F(null),
		onMouseLeave: () => F(e.id),
		onClick: z(() => K(e.id, { visible: !e.visible }, e.visible ? "Hide Paint Layer" : "Show Paint Layer"))
	}, e.visible ? "◉" : "○"), ce(e), r("button", {
		type: "button",
		title: "Move up",
		"aria-label": `Move ${e.name} up`,
		className: `${J.act} ${J.reveal}`,
		disabled: t === N.length - 1,
		onClick: z(() => he(e.id, 1))
	}, "↑"), r("button", {
		type: "button",
		title: "Move down",
		"aria-label": `Move ${e.name} down`,
		className: `${J.act} ${J.reveal}`,
		disabled: t === 0,
		onClick: z(() => he(e.id, -1))
	}, "↓"), r("button", {
		type: "button",
		title: "Delete layer",
		"aria-label": `Delete ${e.name}`,
		className: `${J.remove} ${J.reveal}`,
		onClick: z(() => me(e.id))
	}, "×")), B = (e) => r("div", { className: J.editor }, r("div", { className: J.section }, r("div", { className: J.head }, r("span", { className: J.caption }, "Blending"), r("button", {
		type: "button",
		title: "Reset this layer's blend mode and opacity",
		className: J.reset,
		onClick: () => K(e.id, {
			mode: 0,
			opacity: 1
		}, "Reset Paint Layer")
	}, "Reset")), r(a, {
		value: String(e.mode),
		options: Ne,
		ariaLabel: "Blend mode",
		onChange: (t) => K(e.id, { mode: Number(t) }, "Paint Layer Blend Mode")
	}), r(i, {
		label: "Opacity",
		value: Math.round(e.opacity * 100),
		min: 0,
		max: 100,
		step: 1,
		defaultValue: 100,
		onChange: (t) => K(e.id, { opacity: t / 100 }),
		onCommit: () => ge("Paint Layer Opacity")
	}), r("button", {
		type: "button",
		className: J.addComponent,
		disabled: e.dabs.length === 0,
		onClick: () => _e(e.id)
	}, "Clear Layer"))), V = (e, t, n, a, o, s = 100, c = 100) => r(i, {
		key: e,
		label: e,
		value: Math.round(t * c),
		min: n,
		max: s,
		step: 1,
		defaultValue: a,
		onChange: (e) => {
			o(e / c), _().getState().setBrushPreview(!0);
		},
		onCommit: () => _().getState().setBrushPreview(!1)
	}), H = O.find((e) => e.id === C) ?? null, U = m(H?.brush), W = (e) => G.setBrushDynamics(e), de = (e) => {
		let t = je(e);
		return r("button", {
			key: e.id,
			type: "button",
			title: e.label,
			"aria-label": e.label,
			"aria-pressed": e.id === H?.id,
			className: J.tip + R(e.id === H?.id),
			onClick: () => G.pickTip(e.id, e.brush)
		}, t ? r("img", {
			src: t,
			alt: "",
			draggable: !1
		}) : null);
	}, fe = () => r("div", { className: J.section }, r("span", { className: J.caption }, "Brush"), r("div", { className: J.tips }, r("button", {
		type: "button",
		title: "Round",
		"aria-label": "Round",
		"aria-pressed": H === null,
		className: J.tip + R(H === null),
		onClick: () => G.pickTip(null)
	}, r("span", { className: J.round })), ke(O).flatMap((e) => e.group === void 0 ? e.tips.map(de) : [])), ...ke(O).filter((e) => e.group !== void 0).map((e) => r("div", {
		key: e.group,
		className: J.section
	}, r("span", { className: J.caption }, e.group), r("div", { className: J.tips }, e.tips.map(de)))), O.length === 0 ? r("span", { className: J.hint }, "Install Texture Brushes for fog, cloud and other brushes.") : null), G = _().getState(), ve = N.map((e, t) => ({
		layer: e,
		slot: t
	})).reverse(), ye = N.length >= 4, be = u ? P ? `${S ? "Erase from" : "Paint on"} ${P.name || "Untitled"}` : "Paint to add a layer" : `${N.length}/4 layers`;
	return r(t, {
		title: "Paint Layers",
		defaultOpen: !0
	}, r("div", { className: J.panel }, r("button", {
		type: "button",
		className: J.create,
		disabled: ye,
		title: ye ? "Layer limit reached (4)" : void 0,
		onClick: oe
	}, "+ Add Layer"), r("div", { className: J.head }, r("span", { className: J.hint }, be), r("button", {
		type: "button",
		className: J.done,
		onClick: () => G.toggleArmed()
	}, u ? "Done" : "Paint")), u ? r("div", { className: J.brush }, r(o, {
		label: "Colour",
		title: "The colour the brush paints",
		hue: f,
		saturation: p,
		lightness: h,
		onChange: (e) => G.setColourChannels({
			hue: e.hue,
			saturation: e.saturation ?? p,
			lightness: e.lightness ?? h
		})
	}), fe(), V("Size", v, 1, 8, (e) => G.setBrushSize(e), 50), H ? null : V("Feather", y, 0, 50, (e) => G.setBrushFeather(e)), V("Opacity", b, 1, 100, (e) => G.setBrushOpacity(e)), V("Flow", x, 1, 100, (e) => G.setBrushFlow(e)), H ? [
		V("Spacing", w, 1, Math.round(U.brushSpacing * 100), (e) => W({ brushSpacing: e }), 200),
		V("Scatter", T, 0, Math.round(U.brushScatter * 100), (e) => W({ brushScatter: e }), 200),
		V("Count", E, 1, U.brushCount, (e) => W({ brushCount: e }), 16, 1),
		V("Size jitter", D, 0, Math.round(U.brushSizeJitter * 100), (e) => W({ brushSizeJitter: e })),
		V("Angle", ee, -180, Math.round(U.brushAngle * 180 / Math.PI), (e) => W({ brushAngle: e }), 180, 180 / Math.PI),
		V("Angle jitter", te, 0, Math.round(U.brushAngleJitter * 100), (e) => W({ brushAngleJitter: e })),
		r("label", {
			key: "Follow stroke",
			className: J.erase
		}, r("input", {
			type: "checkbox",
			checked: ne,
			onChange: (e) => W({ brushFollowStroke: e.currentTarget.checked }),
			style: { accentColor: s.sliderFill }
		}), "Follow stroke"),
		V("Flow jitter", re, 0, Math.round(U.brushFlowJitter * 100), (e) => W({ brushFlowJitter: e }))
	] : null, r("label", { className: J.erase }, r("input", {
		type: "checkbox",
		checked: S,
		onChange: (e) => G.setBrushErase(e.currentTarget.checked),
		style: { accentColor: s.sliderFill }
	}), "Erase", r("span", { className: J.muted }, "· Alt erase · [ ] size · ⇧ feather · , . opacity · ⇧, ⇧. flow"))) : null, N.length > 0 ? r("div", { className: J.list }, ve.map(({ layer: e, slot: t }) => le(e, t))) : null, P ? B(P) : null));
}
// src/index.ts
var Fe = null;
function Ie(e) {
	t(e), g(), e.registerStylesheet({
		id: we,
		css: Te(e.ui.tokens)
	}), e.registerProcessingStage(k()), Fe = _().subscribe((t, n) => {
		t.armed !== n.armed && e.develop.setCanvasTool(t.armed ? Ce : null);
	}), e.registerPanel({
		id: `${v}.panel`,
		title: "Paint Layers",
		component: Pe,
		defaultDock: {
			module: "develop",
			direction: "right",
			order: 9,
			width: 250
		},
		modules: ["develop"],
		onReset: () => void ve()
	});
}
function Le() {
	try {
		_().getState().setArmed(!1), Oe(), Fe?.(), Fe = null, n().develop.setCanvasTool(null), n().unregisterProcessingStage(y);
	} catch {}
}
export { Ie as activate, Le as deactivate };

//# sourceMappingURL=index.js.map