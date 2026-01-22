const ident = [1, 0, 0, 0, 1, 0];

var to_screen = [20, 0, 0, 0, -20, 0];
let lw_scale = 1;

let sys;

let scale_centre;
let scale_start;
let scale_ts;

let reset_but;
let tile_sel;
let shape_sel;
let colscheme_sel;

let subst_button;
let translate_button;
let scale_button;
let dragging = false;
let uibox = true;

// --- DYNAMIC PARAMETERS ---
let param_a = 1.0;
let param_b = 1.0;
let param_curve = 0.6;
let substitutionLevel = 0;

let a_slider, b_slider, curve_slider;
let a_input, b_input, curve_input;
let mystic_check, lock_check;
let lbl_a, lbl_b, lbl_curve;
let lock_ab = true;
let remove_mystic = false;

const tile_names = [
	'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi',
	'Pi', 'Sigma', 'Phi', 'Psi'];

// Color map from Figure 5.3
const colmap53 = {
	'Gamma': [203, 157, 126],
	'Gamma1': [203, 157, 126],
	'Gamma2': [203, 157, 126],
	'Delta': [163, 150, 133],
	'Theta': [208, 215, 150],
	'Lambda': [184, 205, 178],
	'Xi': [211, 177, 144],
	'Pi': [218, 197, 161],
	'Sigma': [191, 146, 126],
	'Phi': [228, 213, 167],
	'Psi': [224, 223, 156]
};

const colmap_orig = {
	'Gamma': [255, 255, 255],
	'Gamma1': [255, 255, 255],
	'Gamma2': [255, 255, 255],
	'Delta': [220, 220, 220],
	'Theta': [255, 191, 191],
	'Lambda': [255, 160, 122],
	'Xi': [255, 242, 0],
	'Pi': [135, 206, 250],
	'Sigma': [245, 245, 220],
	'Phi': [0, 255, 0],
	'Psi': [0, 255, 255]
};

const colmap_mystics = {
	'Gamma': [196, 201, 169],
	'Gamma1': [196, 201, 169],
	'Gamma2': [156, 160, 116],
	'Delta': [247, 252, 248],
	'Theta': [247, 252, 248],
	'Lambda': [247, 252, 248],
	'Xi': [247, 252, 248],
	'Pi': [247, 252, 248],
	'Sigma': [247, 252, 248],
	'Phi': [247, 252, 248],
	'Psi': [247, 252, 248]
};

const colmap_pride = {
	'Gamma': [255, 255, 255],
	'Gamma1': [97, 57, 21],
	'Gamma2': [0, 0, 0],
	'Delta': [2, 129, 33],
	'Theta': [0, 76, 255],
	'Lambda': [118, 0, 136],
	'Xi': [229, 0, 0],
	'Pi': [255, 175, 199],
	'Sigma': [115, 215, 238],
	'Phi': [255, 141, 0],
	'Psi': [255, 238, 0]
};

let colmap = colmap_pride;

function pt(x, y) {
	return { x: x, y: y };
}

// Affine matrix inverse
function inv(T) {
	const det = T[0] * T[4] - T[1] * T[3];
	return [T[4] / det, -T[1] / det, (T[1] * T[5] - T[2] * T[4]) / det,
	-T[3] / det, T[0] / det, (T[2] * T[3] - T[0] * T[5]) / det];
};

// Affine matrix multiply
function mul(A, B) {
	return [A[0] * B[0] + A[1] * B[3],
	A[0] * B[1] + A[1] * B[4],
	A[0] * B[2] + A[1] * B[5] + A[2],

	A[3] * B[0] + A[4] * B[3],
	A[3] * B[1] + A[4] * B[4],
	A[3] * B[2] + A[4] * B[5] + A[5]];
}

function padd(p, q) {
	return { x: p.x + q.x, y: p.y + q.y };
}

function psub(p, q) {
	return { x: p.x - q.x, y: p.y - q.y };
}

function pframe(o, p, q, a, b) {
	return { x: o.x + a * p.x + b * q.x, y: o.y + a * p.y + b * q.y };
}

// Rotation matrix
function trot(ang) {
	const c = cos(ang);
	const s = sin(ang);
	return [c, -s, 0, s, c, 0];
}

// Translation matrix
function ttrans(tx, ty) {
	return [1, 0, tx, 0, 1, ty];
}

function transTo(p, q) {
	return ttrans(q.x - p.x, q.y - p.y);
}

function rotAbout(p, ang) {
	return mul(ttrans(p.x, p.y),
		mul(trot(ang), ttrans(-p.x, -p.y)));
}

// Matrix * point
function transPt(M, P) {
	return pt(M[0] * P.x + M[1] * P.y + M[2], M[3] * P.x + M[4] * P.y + M[5]);
}

// Match unit interval to line segment p->q
function matchSeg(p, q) {
	return [q.x - p.x, p.y - q.y, p.x, q.y - p.y, q.x - p.x, p.y];
};

// Match line segment p1->q1 to line segment p2->q2
function matchTwo(p1, q1, p2, q2) {
	return mul(matchSeg(p2, q2), inv(matchSeg(p1, q1)));
};

function drawPolygon(shape, T, f, s, w) {
	if (f != null) {
		fill(...f);
	} else {
		noFill();
	}
	if (s != null) {
		stroke(0);
		strokeWeight(w); // / lw_scale );
	} else {
		noStroke();
	}
	beginShape();
	for (let p of shape) {
		const tp = transPt(T, p);
		vertex(tp.x, tp.y);
	}
	endShape(CLOSE);
}

function streamPolygon(shape, T, f, s, w) {

}

class Shape {
	constructor(pts, quad, label) {
		this.pts = pts;
		this.quad = quad;
		this.label = label;
	}

	draw(S) {
		drawPolygon(this.pts, S, colmap[this.label], [0, 0, 0], 0.1);
	}

	getBounds(S, bounds) {
		for (let p of this.pts) {
			const tp = transPt(S, p);
			bounds.minx = min(bounds.minx, tp.x);
			bounds.miny = min(bounds.miny, tp.y);
			bounds.maxx = max(bounds.maxx, tp.x);
			bounds.maxy = max(bounds.maxy, tp.y);
		}
	}

	streamSVG(S, stream) {
		var s = '<polygon points="';
		var at_start = true;
		for (let p of this.pts) {
			const sp = transPt(S, p);
			if (at_start) {
				at_start = false;
			} else {
				s = s + ' ';
			}
			s = s + `${sp.x},${sp.y}`;
		}
		const col = colmap[this.label];

		s = s + `" stroke="black" stroke-weight="0.1" fill="rgb(${col[0]},${col[1]},${col[2]})" />`;
		stream.push(s);
	}
}

class CurvyShape {
	constructor(pts, quad, label) {
		this.quad = quad;
		this.label = label;

		// Convert to S-curves using 'twiddle' logic from monotile.js
		this.pts = [pts[0]];
		for (let i = 0; i < pts.length; i++) {
			const p1 = pts[i];
			const p2 = pts[(i + 1) % pts.length];

			const dx = p2.x - p1.x;
			const dy = p2.y - p1.y;

			const nx = dy;
			const ny = -dx;

			this.pts.push(pt(p1.x + dx / 2 - param_curve * nx, p1.y + dy / 2 - param_curve * ny));
			this.pts.push(pt(p1.x + dx / 2 + param_curve * nx, p1.y + dy / 2 + param_curve * ny));
			this.pts.push(p2);
		}
	}

	draw(S) {
		fill(...colmap[this.label]);
		strokeWeight(0.1);
		stroke(0);

		beginShape();
		const tp = transPt(S, this.pts[0]);
		vertex(tp.x, tp.y);

		for (let idx = 1; idx < this.pts.length; idx += 3) {
			const a = transPt(S, this.pts[idx]);
			const b = transPt(S, this.pts[idx + 1]);
			const c = transPt(S, this.pts[idx + 2]);

			bezierVertex(a.x, a.y, b.x, b.y, c.x, c.y);
		}
		endShape(CLOSE);
	}

	getBounds(S, bounds) {
		for (let p of this.pts) {
			const tp = transPt(S, p);
			bounds.minx = Math.min(bounds.minx, tp.x);
			bounds.miny = Math.min(bounds.miny, tp.y);
			bounds.maxx = Math.max(bounds.maxx, tp.x);
			bounds.maxy = Math.max(bounds.maxy, tp.y);
		}
	}

	streamSVG(S, stream) {
		const tp = transPt(S, this.pts[0]);
		vertex(tp.x, tp.y);

		var s = `<path d="M ${tp.x} ${tp.y}`;

		for (let idx = 1; idx < this.pts.length; idx += 3) {
			const a = transPt(S, this.pts[idx]);
			const b = transPt(S, this.pts[idx + 1]);
			const c = transPt(S, this.pts[idx + 2]);

			s = s + ` C ${a.x} ${a.y} ${b.x} ${b.y} ${c.x} ${c.y}`;
		}
		const col = colmap[this.label];

		s = s + `" stroke="black" stroke-weight="0.1" fill="rgb(${col[0]},${col[1]},${col[2]})" />`;
		stream.push(s);
	}
}

class Meta {
	constructor() {
		this.geoms = [];
		this.quad = [];
	}

	addChild(g, T) {
		this.geoms.push({ geom: g, xform: T });
	}

	draw(S) {
		for (let g of this.geoms) {
			g.geom.draw(mul(S, g.xform));
		}
	}

	getBounds(S, bounds) {
		for (let g of this.geoms) {
			g.geom.getBounds(mul(S, g.xform), bounds);
		}
	}

	streamSVG(S, stream) {
		for (let g of this.geoms) {
			g.geom.streamSVG(mul(S, g.xform), stream);
		}
	}
}

function getDynamicSpectrePoints(a, b) {
	const { cos, sin, PI } = Math;
	const c = cos(PI / 3);
	const s = sin(PI / 3);

	// Normalize a and b for scale consistency
	const avg = (a + b) / 2.0;
	const na = (avg > 0) ? a / avg : 0;
	const nb = (avg > 0) ? b / avg : 0;

	// Use moves from monotile.js because they are guaranteed to close for any a, b.
	// We negate the X coordinate to match the handedness expected by the tiling rules.
	const moves = [
		[c * nb, s * nb], [nb, 0], [0, na], [s * na, c * na], [c * nb, -s * nb],
		[-c * nb, -s * nb], [s * na, -c * na], [0, -na], [0, -na], [-s * na, -c * na],
		[-c * nb, s * nb], [-nb, 0], [0, na], [-s * na, c * na]
	];

	let pts = [pt(0, 0)];
	let curr = pts[0];
	for (let m of moves) {
		curr = pt(curr.x - m[0], curr.y + m[1]);
		pts.push(curr);
	}
	pts.pop(); // 14 points

	// Rotate -90 degrees to align with standard orientation
	const rot90 = trot(-PI / 2);
	for (let i = 0; i < pts.length; i++) {
		pts[i] = transPt(rot90, pts[i]);
	}

	return pts;
}

function buildSpectreBase(curved) {
	const spectre = getDynamicSpectrePoints(param_a, param_b);

	const spectre_keys = [
		spectre[1], spectre[3], spectre[5], spectre[9]
	];

	const ret = {};

	for (lab of ['Delta', 'Theta', 'Lambda', 'Xi',
		'Pi', 'Sigma', 'Phi', 'Psi']) {
		if (curved) {
			ret[lab] = new CurvyShape(spectre, spectre_keys, lab);
		} else {
			ret[lab] = new Shape(spectre, spectre_keys, lab);
		}
	}

	const mystic = new Meta();
	const m = mul(ttrans(spectre[6].x, spectre[6].y),
		mul(trot(PI / 6), ttrans(-spectre[12].x, -spectre[12].y)));

	const should_remove = remove_mystic && (Math.abs(param_a - param_b) > 0.0001);

	if (curved) {
		mystic.addChild(
			new CurvyShape(spectre, spectre_keys, 'Gamma1'), ident);
		if (!should_remove) {
			mystic.addChild(
				new CurvyShape(spectre, spectre_keys, 'Gamma2'), m);
		}
	} else {
		mystic.addChild(new Shape(spectre, spectre_keys, 'Gamma1'), ident);
		if (!should_remove) {
			mystic.addChild(new Shape(spectre, spectre_keys, 'Gamma2'), m);
		}
	}
	mystic.quad = spectre_keys;
	ret['Gamma'] = mystic;

	return ret;
}

function buildHatTurtleBase(hat_dominant) {
	const r3 = 1.7320508075688772;
	const hr3 = 0.8660254037844386;

	function hexPt(x, y) {
		return pt(x + 0.5 * y, -hr3 * y);
	}

	function hexPt2(x, y) {
		return pt(x + hr3 * y, -0.5 * y);
	}

	const hat = [
		hexPt(-1, 2), hexPt(0, 2), hexPt(0, 3), hexPt(2, 2), hexPt(3, 0),
		hexPt(4, 0), hexPt(5, -1), hexPt(4, -2), hexPt(2, -1), hexPt(2, -2),
		hexPt(1, -2), hexPt(0, -2), hexPt(-1, -1), hexPt(0, 0)];

	const turtle = [
		hexPt(0, 0), hexPt(2, -1), hexPt(3, 0), hexPt(4, -1), hexPt(4, -2),
		hexPt(6, -3), hexPt(7, -5), hexPt(6, -5), hexPt(5, -4), hexPt(4, -5),
		hexPt(2, -4), hexPt(0, -3), hexPt(-1, -1), hexPt(0, -1)
	];

	const hat_keys = [
		hat[3], hat[5], hat[7], hat[11]
	];
	const turtle_keys = [
		turtle[3], turtle[5], turtle[7], turtle[11]
	];

	const ret = {};

	if (hat_dominant) {
		for (lab of ['Delta', 'Theta', 'Lambda', 'Xi',
			'Pi', 'Sigma', 'Phi', 'Psi']) {
			ret[lab] = new Shape(hat, hat_keys, lab);
		}

		const mystic = new Meta();
		mystic.addChild(new Shape(hat, hat_keys, 'Gamma1'), ident);
		mystic.addChild(new Shape(turtle, turtle_keys, 'Gamma2'),
			ttrans(hat[8].x, hat[8].y));
		mystic.quad = hat_keys;
		ret['Gamma'] = mystic;
	} else {
		for (lab of ['Delta', 'Theta', 'Lambda', 'Xi',
			'Pi', 'Sigma', 'Phi', 'Psi']) {
			ret[lab] = new Shape(turtle, turtle_keys, lab);
		}

		const mystic = new Meta();
		mystic.addChild(new Shape(turtle, turtle_keys, 'Gamma1'), ident);
		mystic.addChild(new Shape(hat, hat_keys, 'Gamma2'),
			mul(ttrans(turtle[9].x, turtle[9].y), trot(PI / 3)));
		mystic.quad = turtle_keys;
		ret['Gamma'] = mystic;
	}

	return ret;
}

function buildHexBase() {
	const hr3 = 0.8660254037844386;

	const hex = [
		pt(0, 0),
		pt(1.0, 0.0),
		pt(1.5, hr3),
		pt(1, 2 * hr3),
		pt(0, 2 * hr3),
		pt(-0.5, hr3)
	];

	const hex_keys = [hex[1], hex[2], hex[3], hex[5]];

	const ret = {};

	for (lab of ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi',
		'Pi', 'Sigma', 'Phi', 'Psi']) {
		ret[lab] = new Shape(hex, hex_keys, lab);
	}

	return ret;
}

function buildSupertiles(sys) {
	const quad = sys['Delta'].quad;
	const R = [-1, 0, 0, 0, 1, 0];

	const t_rules = [
		[60, 3, 1], [0, 2, 0], [60, 3, 1], [60, 3, 1],
		[0, 2, 0], [60, 3, 1], [-120, 3, 3]];

	const Ts = [ident];
	let total_ang = 0;
	for (const [ang, from, to] of t_rules) {
		total_ang += ang;
		const rot = trot(total_ang * Math.PI / 180.0);

		// 1. Calculate where the child's 'to' vertex would be after rotation
		const child_v_rotated = transPt(rot, quad[to]);
		// 2. Calculate where the parent's 'from' vertex is globally
		const parent_v_global = transPt(Ts[Ts.length - 1], quad[from]);

		// 3. Create the translation that snaps them together
		const ttt = ttrans(parent_v_global.x - child_v_rotated.x,
			parent_v_global.y - child_v_rotated.y);

		Ts.push(mul(ttt, rot));
	}

	for (let idx = 0; idx < Ts.length; ++idx) {
		Ts[idx] = mul(R, Ts[idx]);
	}

	const super_rules = {
		'Gamma': ['Pi', 'Delta', 'null', 'Theta', 'Sigma', 'Xi', 'Phi', 'Gamma'],
		'Delta': ['Xi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
		'Theta': ['Psi', 'Delta', 'Pi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
		'Lambda': ['Psi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
		'Xi': ['Psi', 'Delta', 'Pi', 'Phi', 'Sigma', 'Psi', 'Phi', 'Gamma'],
		'Pi': ['Psi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Psi', 'Phi', 'Gamma'],
		'Sigma': ['Xi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Pi', 'Lambda', 'Gamma'],
		'Phi': ['Psi', 'Delta', 'Psi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
		'Psi': ['Psi', 'Delta', 'Psi', 'Phi', 'Sigma', 'Psi', 'Phi', 'Gamma']
	};
	const super_quad = [
		transPt(Ts[6], quad[2]),
		transPt(Ts[5], quad[1]),
		transPt(Ts[3], quad[2]),
		transPt(Ts[0], quad[1])];

	const ret = {};

	for (const [lab, subs] of Object.entries(super_rules)) {
		const sup = new Meta();
		for (let idx = 0; idx < 8; ++idx) {
			if (subs[idx] == 'null') {
				continue;
			}
			sup.addChild(sys[subs[idx]], Ts[idx]);
		}
		sup.quad = super_quad;

		ret[lab] = sup;
	}

	return ret;
}

function isButtonActive(but) {
	return but.elt.style.border.length > 0;
}

function setButtonActive(but, b) {
	but.elt.style.border = (b ? "3px solid black" : "");
}

function setup() {
	createCanvas(windowWidth, windowHeight);

	sys = buildSpectreBase();

	let lab = createSpan('Shapes');
	lab.position(10, 10);
	lab.size(125, 15);

	shape_sel = createSelect();
	shape_sel.position(10, 30);
	shape_sel.size(125, 25);
	shape_sel.option('Tile(1,1)');
	shape_sel.option('Spectres');
	shape_sel.option('Hexagons');
	shape_sel.option('Turtles in Hats');
	shape_sel.option('Hats in Turtles');
	shape_sel.changed(function () {
		updateSystem();
		updateControlVisibility();
		to_screen = [20, 0, 0, 0, -20, 0];
		lw_scale = 1;
		loop();
	});

	subst_button = createButton("Build Supertiles");
	subst_button.position(10, 60);
	subst_button.size(125, 25);
	subst_button.mousePressed(function () {
		substitutionLevel++;
		sys = buildSupertiles(sys);
		loop();
	});

	lab = createSpan('Category');
	lab.position(10, 100);
	lab.size(125, 15);

	tile_sel = createSelect();
	tile_sel.position(10, 120);
	tile_sel.size(125, 25);
	for (let name of tile_names) {
		tile_sel.option(name);
	}
	tile_sel.value('Delta');
	tile_sel.changed(loop);

	lab = createSpan('Colours');
	lab.position(10, 150);
	lab.size(125, 15);

	colscheme_sel = createSelect();
	colscheme_sel.position(10, 170);
	colscheme_sel.size(125, 25);
	colscheme_sel.option('Pride');
	colscheme_sel.option('Mystics');
	colscheme_sel.option('Figure 5.3');
	colscheme_sel.option('Bright');
	colscheme_sel.changed(loop);

	translate_button = createButton("Translate");
	setButtonActive(translate_button, true);
	translate_button.position(10, 210);
	translate_button.size(125, 25);
	translate_button.mousePressed(function () {
		setButtonActive(translate_button, true);
		setButtonActive(scale_button, false);
		loop();
	});

	scale_button = createButton("Scale");
	scale_button.position(10, 240);
	scale_button.size(125, 25);
	scale_button.mousePressed(function () {
		setButtonActive(translate_button, false);
		setButtonActive(scale_button, true);
		loop();
	});

	let save_button = createButton("Save PNG");
	save_button.position(10, 280);
	save_button.size(125, 25);
	save_button.mousePressed(function () {
		uibox = false;
		draw();
		save("output.png");
		uibox = true;
		draw();
	});

	let svg_button = createButton("Save SVG");
	svg_button.position(10, 310);
	svg_button.size(125, 25);
	svg_button.mousePressed(function () {
		const stream = [];
		stream.push(`<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`);
		stream.push(`<g transform="translate(${width / 2},${height / 2})">`);

		sys[tile_sel.value()].streamSVG(to_screen, stream);

		stream.push('</g>');
		stream.push('</svg>');

		saveStrings(stream, 'output', 'svg');
	});

	mystic_check = createCheckbox('Remove Mystic', remove_mystic);
	mystic_check.position(10, 340);
	mystic_check.changed(() => {
		remove_mystic = mystic_check.checked();
		updateSystem();
		loop();
	});

	// --- SLIDERS AND LABELS ---
	let y_pos = 380;

	const length_datalist = createElement('datalist');
	length_datalist.id('length-values');
	length_datalist.child(createElement('option').attribute('value', '0'));
	length_datalist.child(createElement('option').attribute('value', '1'));
	length_datalist.child(createElement('option').attribute('value', '1.732'));
	length_datalist.child(createElement('option').attribute('value', '4'));
	length_datalist.elt.parentNode || document.body.appendChild(length_datalist.elt);

	const curve_datalist = createElement('datalist');
	curve_datalist.id('curve-values');
	curve_datalist.child(createElement('option').attribute('value', '0'));
	curve_datalist.child(createElement('option').attribute('value', '0.25'));
	curve_datalist.child(createElement('option').attribute('value', '0.5'));
	curve_datalist.child(createElement('option').attribute('value', '0.6'));
	curve_datalist.child(createElement('option').attribute('value', '1'));
	curve_datalist.elt.parentNode || document.body.appendChild(curve_datalist.elt);

	lock_check = createCheckbox('Lock A and B', lock_ab);
	lock_check.position(10, y_pos);
	lock_check.changed(() => {
		lock_ab = lock_check.checked();
		if (lock_ab) {
			param_a = 1.0;
			param_b = 1.0;
			a_slider.value(param_a);
			b_slider.value(param_b);
			a_input.value(param_a.toFixed(3));
			b_input.value(param_b.toFixed(3));
			updateSystem();
		}
	});

	y_pos += 30;
	lbl_a = createSpan('Param A: ');
	lbl_a.position(10, y_pos);
	a_input = createInput(param_a.toFixed(3));
	a_input.position(70, y_pos);
	a_input.size(45);
	a_input.changed(() => {
		let val = parseFloat(a_input.value());
		if (!isNaN(val)) {
			param_a = val;
			a_slider.value(param_a);
			if (lock_ab) {
				param_b = param_a;
				b_slider.value(param_b);
				b_input.value(param_b.toFixed(3));
			}
			updateSystem();
		}
	});

	a_slider = createSlider(0, 4, param_a, 0.001);
	a_slider.position(10, y_pos + 20);
	a_slider.attribute('list', 'length-values');
	a_slider.input(() => {
		param_a = a_slider.value();
		a_input.value(param_a.toFixed(3));
		if (lock_ab) {
			param_b = param_a;
			b_slider.value(param_b);
			b_input.value(param_b.toFixed(3));
		}
		updateSystem();
	});

	y_pos += 50;
	lbl_b = createSpan('Param B: ');
	lbl_b.position(10, y_pos);
	b_input = createInput(param_b.toFixed(3));
	b_input.position(70, y_pos);
	b_input.size(45);
	b_input.changed(() => {
		let val = parseFloat(b_input.value());
		if (!isNaN(val)) {
			param_b = val;
			b_slider.value(param_b);
			if (lock_ab) {
				param_a = param_b;
				a_slider.value(param_a);
				a_input.value(param_a.toFixed(3));
			}
			updateSystem();
		}
	});

	b_slider = createSlider(0, 4, param_b, 0.001);
	b_slider.position(10, y_pos + 20);
	b_slider.attribute('list', 'length-values');
	b_slider.input(() => {
		param_b = b_slider.value();
		b_input.value(param_b.toFixed(3));
		if (lock_ab) {
			param_a = param_b;
			a_slider.value(param_a);
			a_input.value(param_a.toFixed(3));
		}
		updateSystem();
	});

	y_pos += 50;
	lbl_curve = createSpan('Curve: ');
	lbl_curve.position(10, y_pos);
	curve_input = createInput(param_curve.toFixed(3));
	curve_input.position(70, y_pos);
	curve_input.size(45);
	curve_input.changed(() => {
		let val = parseFloat(curve_input.value());
		if (!isNaN(val)) {
			param_curve = val;
			curve_slider.value(param_curve);
			updateSystem();
		}
	});

	curve_slider = createSlider(0, 1, param_curve, 0.001);
	curve_slider.position(10, y_pos + 20);
	curve_slider.attribute('list', 'curve-values');
	curve_slider.input(() => {
		param_curve = curve_slider.value();
		curve_input.value(param_curve.toFixed(3));
		updateSystem();
	});

	// --- RIGHT SIDE CONTROLS ---
	let zoom_in_button = createButton("+");
	zoom_in_button.position(width - 40, 10);
	zoom_in_button.size(30, 30);
	zoom_in_button.mousePressed(() => {
		for (let i = 0; i < 6; i++) {
			to_screen[i] *= 1.1;
		}
		lw_scale *= 1.1;
		loop();
	});

	let zoom_out_button = createButton("-");
	zoom_out_button.position(width - 40, 50);
	zoom_out_button.size(30, 30);
	zoom_out_button.mousePressed(() => {
		for (let i = 0; i < 6; i++) {
			to_screen[i] *= 0.9;
		}
		lw_scale *= 0.9;
		loop();
	});

	let center_button = createButton("Center");
	center_button.position(width - 70, 90);
	center_button.size(60, 25);
	center_button.mousePressed(() => {
		const bounds = { minx: Infinity, miny: Infinity, maxx: -Infinity, maxy: -Infinity };
		sys[tile_sel.value()].getBounds(ident, bounds);
		if (bounds.minx !== Infinity) {
			const cx = (bounds.minx + bounds.maxx) / 2;
			const cy = (bounds.miny + bounds.maxy) / 2;
			const current_pos = transPt(to_screen, pt(cx, cy));
			to_screen[2] -= current_pos.x;
			to_screen[5] -= current_pos.y;
			loop();
		}
	});

	let fit_button = createButton("Fit");
	fit_button.position(width - 70, 120);
	fit_button.size(60, 25);
	fit_button.mousePressed(() => {
		const bounds = { minx: Infinity, miny: Infinity, maxx: -Infinity, maxy: -Infinity };
		sys[tile_sel.value()].getBounds(ident, bounds);
		if (bounds.minx !== Infinity) {
			const b_width = bounds.maxx - bounds.minx;
			const b_height = bounds.maxy - bounds.miny;
			const cx = (bounds.minx + bounds.maxx) / 2;
			const cy = (bounds.miny + bounds.maxy) / 2;

			// Add 10% padding
			const available_w = width * 0.9;
			const available_h = height * 0.9;

			let sc = Math.min(available_w / b_width, available_h / b_height);

			// to_screen is [m00, m01, m02, m10, m11, m12] 
			// which is [scale_x, 0, trans_x, 0, scale_y, trans_y] for simple scale/trans
			// But it can be more complex. Let's simplify and reset to a clean state.
			// We want to_screen(cx, cy) = (0, 0) and scale to be 'sc'.
			// The original to_screen was [20, 0, 0, 0, -20, 0]
			// We keep the y-flip (as standard in this app it seems)
			to_screen = [sc, 0, -sc * cx, 0, -sc, sc * cy];
			lw_scale = sc / 20.0;
			loop();
		}
	});

	updateSystem();
	updateControlVisibility();
}

function updateControlVisibility() {
	const isSpectre = shape_sel.value() === 'Spectres';

	const controls = [
		mystic_check,
		lock_check,
		lbl_a, a_input, a_slider,
		lbl_b, b_input, b_slider,
		lbl_curve, curve_input, curve_slider
	];

	for (let c of controls) {
		if (c) {
			if (isSpectre) {
				c.show();
			} else {
				c.hide();
			}
		}
	}
}

function updateSystem() {
	const s = shape_sel.value();
	if (s == 'Hexagons') {
		sys = buildHexBase();
	} else if (s == 'Turtles in Hats') {
		sys = buildHatTurtleBase(true);
	} else if (s == 'Hats in Turtles') {
		sys = buildHatTurtleBase(false);
	} else if (s == 'Spectres') {
		sys = buildSpectreBase(true);
	} else {
		sys = buildSpectreBase(false);
	}

	for (let i = 0; i < substitutionLevel; i++) {
		sys = buildSupertiles(sys);
	}
	loop();
}

function draw() {
	background(255);

	push();
	translate(width / 2, height / 2);

	applyMatrix(
		to_screen[0], to_screen[3],
		to_screen[1], to_screen[4],
		to_screen[2], to_screen[5]);

	const s = colscheme_sel.value();
	if (s == 'Figure 5.3') {
		colmap = colmap53;
	} else if (s == 'Bright') {
		colmap = colmap_orig;
	} else if (s == 'Pride') {
		colmap = colmap_pride;
	} else {
		colmap = colmap_mystics;
	}

	sys[tile_sel.value()].draw(ident);

	pop();

	if (uibox) {
		stroke(0);
		strokeWeight(0.5);
		fill(255, 220);
		rect(5, 5, 135, 560);
	}
	noLoop();
}

function windowResized() {
	resizeCanvas(windowWidth, windowHeight);
}

function mousePressed() {
	if (uibox && mouseX > 5 && mouseX < 140 && mouseY > 5 && mouseY < 565) {
		return;
	}
	dragging = true;
	if (isButtonActive(scale_button)) {
		scale_centre = transPt(inv(to_screen), pt(width / 2, height / 2));
		scale_start = pt(mouseX, mouseY);
		scale_ts = [...to_screen];
	}
	loop();
}

function mouseDragged() {
	if (dragging) {
		if (isButtonActive(translate_button)) {
			to_screen = mul(ttrans(mouseX - pmouseX, mouseY - pmouseY),
				to_screen);
		} else if (isButtonActive(scale_button)) {
			let sc = dist(mouseX, mouseY, width / 2, height / 2) /
				dist(scale_start.x, scale_start.y, width / 2, height / 2);
			to_screen = mul(
				mul(ttrans(scale_centre.x, scale_centre.y),
					mul([sc, 0, 0, 0, sc, 0],
						ttrans(-scale_centre.x, -scale_centre.y))),
				scale_ts);
			lw_scale = mag(to_screen[0], to_screen[1]) / 20.0;
		}
		loop();
		return false;
	}
}

function mouseReleased() {
	dragging = false;
	loop();
}
