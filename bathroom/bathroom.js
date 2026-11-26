/* BathroomModule: large abandoned institutional bathroom (25 x 20 m, 10 m high).
   API: var bath = BathroomModule.build(THREE, { quality:'high'|'normal', renderer })
        bath.group        THREE.Group, add to scene (origin = north-west floor corner, y up)
        bath.update(dt)   flicker, drips, door animation
        bath.interactables [{id,name,pos:Vector3,radius,activate()}]
        bath.bounds       {room:{x0,z0,x1,z1,h}, colliders:[{x0,z0,x1,z1}]}
        bath.spawn        {x,y,z,yaw}
   three.js r128 only. Poly Haven CC0 textures, loaded lazily (2K normal, 4K colour in high). */
(function (global) {
  var W = 25, D = 20, H = 10;
  var PH = 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/';
  function build(THREE, opt) {
    opt = opt || {};
    var high = opt.quality === 'high';
    var G = new THREE.Group(); G.name = 'BathroomModule';
    var colliders = [], interact = [], flick = [], drips = [], doors = [];
    var maxAniso = opt.renderer ? opt.renderer.capabilities.getMaxAnisotropy() : 8;
    var TL = new THREE.TextureLoader(); TL.crossOrigin = 'anonymous';
    var texCache = {};
    function tex(url, srgb) {
      if (texCache[url]) return texCache[url];
      var t = TL.load(url); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = Math.min(high ? 16 : 8, maxAniso);
      if (srgb) t.encoding = THREE.sRGBEncoding; texCache[url] = t; return t;
    }
    // PBR material from a Poly Haven id. Colour 4K in high, 2K otherwise. normal/rough/AO 2K.
    function pbr(id, tint, ns) {
      var cr = high ? '4k' : '2k';
      var m = new THREE.MeshStandardMaterial({
        color: tint === undefined ? 0xffffff : tint,
        map: tex(PH + cr + '/' + id + '/' + id + '_diff_' + cr + '.jpg', true),
        normalMap: tex(PH + '2k/' + id + '/' + id + '_nor_gl_2k.jpg'),
        roughnessMap: tex(PH + '2k/' + id + '/' + id + '_rough_2k.jpg'),
        aoMap: tex(PH + '2k/' + id + '/' + id + '_ao_2k.jpg'), roughness: 1, metalness: 0
      });
      m.normalScale = new THREE.Vector2(ns || 1, ns || 1); return m;
    }
    function uvs(geo, su, sv) { // tile texture in metres
      var a = geo.attributes.uv; for (var i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * su, a.getY(i) * sv);
      geo.setAttribute('uv2', a.clone()); return geo;
    }
    function plane(w, h, tile) { return uvs(new THREE.PlaneGeometry(w, h), w / tile, h / tile); }
    function put(geo, mat, x, y, z, rx, ry, shadow) {
      var m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, 0);
      m.castShadow = !!shadow; m.receiveShadow = true; G.add(m); return m;
    }
    function box(w, h, d, mat, x, y, z, tile, shadow) {
      var g = new THREE.BoxGeometry(w, h, d);
      var a = g.attributes.uv, t = tile || 1;
      for (var i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * Math.max(w, d) / t, a.getY(i) * Math.max(h, Math.min(w, d)) / t);
      g.setAttribute('uv2', a.clone());
      return put(g, mat, x, y, z, 0, 0, shadow);
    }
    function inst(geo, mat, list, shadow) { // list of [x,y,z,ry,sx,sy,sz]
      var im = new THREE.InstancedMesh(geo, mat, list.length), d = new THREE.Object3D();
      for (var i = 0; i < list.length; i++) {
        var p = list[i]; d.position.set(p[0], p[1], p[2]); d.rotation.set(0, p[3] || 0, 0); d.scale.set(p[4] || 1, p[5] || 1, p[6] || 1); d.updateMatrix(); im.setMatrixAt(i, d.matrix);
      }
      im.castShadow = !!shadow; im.receiveShadow = true; G.add(im); return im;
    }
    function col(x0, z0, x1, z1) { colliders.push({ x0: x0, z0: z0, x1: x1, z1: z1 }); }

    // ---------- materials ----------
    var mFloor = pbr('brown_floor_tiles', 0x9a948c, 1.1);
    var mTile = pbr('long_white_tiles', 0xa9a79f, 1.0);
    var mPlaster = pbr('damaged_plaster', 0x8d8a84, 1.3);
    var mCeil = pbr('ceiling_interior', 0x77746e, 1.0);
    var mConc = pbr('chipped_concrete', 0x85827c, 1.2);
    var mPorc = new THREE.MeshStandardMaterial({ color: 0xbdb9ae, roughness: 0.28, metalness: 0.02 });
    var mPorcDirty = new THREE.MeshStandardMaterial({ color: 0x8e8a7c, roughness: 0.42, metalness: 0.02 });
    var mChrome = new THREE.MeshStandardMaterial({ color: 0x8f979c, roughness: 0.3, metalness: 0.85 });
    var mRust = new THREE.MeshStandardMaterial({ color: 0x4a2c1c, roughness: 0.75, metalness: 0.5 });
    var mPart = new THREE.MeshStandardMaterial({ color: 0x3f4a47, roughness: 0.55, metalness: 0.25 });
    var mMirror = new THREE.MeshStandardMaterial({ color: 0x0b1113, roughness: 0.06, metalness: 1, emissive: 0x050b0c, emissiveIntensity: 0.6 });
    var mWater = new THREE.MeshStandardMaterial({ color: 0x0c1412, roughness: 0.03, metalness: 0.2, transparent: true, opacity: 0.82 });

    // ---------- shell ----------
    put(plane(W, D, 2.0), mFloor, W / 2, 0, D / 2, -Math.PI / 2, 0);
    put(plane(W, D, 4.0), mCeil, W / 2, H, D / 2, Math.PI / 2, 0);
    function wallPlane(len, x, z, ry) { // tiled lower band 2.4m + plaster above
      var lo = new THREE.PlaneGeometry(len, 2.4); uvs(lo, len / 1.2, 2.4 / 1.2);
      var hi = new THREE.PlaneGeometry(len, H - 2.4); uvs(hi, len / 3.0, (H - 2.4) / 3.0);
      var g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
      var a = new THREE.Mesh(lo, mTile); a.position.y = 1.2; a.receiveShadow = true; g.add(a);
      var b = new THREE.Mesh(hi, mPlaster); b.position.y = 2.4 + (H - 2.4) / 2; b.receiveShadow = true; g.add(b);
      var trim = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.06), mConc); trim.position.set(0, 2.42, 0.02); g.add(trim);
      var base = new THREE.Mesh(new THREE.BoxGeometry(len, 0.14, 0.05), mConc); base.position.set(0, 0.07, 0.02); g.add(base);
      G.add(g);
    }
    wallPlane(W, W / 2, 0, 0);            // north, faces +z
    wallPlane(W, W / 2, D, Math.PI);      // south
    wallPlane(D, 0, D / 2, Math.PI / 2);  // west
    wallPlane(D, W, D / 2, -Math.PI / 2); // east
    col(-1, -1, W + 1, 0); col(-1, D, W + 1, D + 1); col(-1, -1, 0, D + 1); col(W, -1, W + 1, D + 1);

    // ---------- columns + ceiling beams ----------
    var colGeo = new THREE.BoxGeometry(0.7, H, 0.7); uvs(colGeo, 0.7, H / 2.5);
    [[8.3, 7], [16.7, 7], [8.3, 13], [16.7, 13]].forEach(function (p) {
      var c = new THREE.Mesh(colGeo, mConc); c.position.set(p[0], H / 2, p[1]); c.castShadow = true; c.receiveShadow = true; G.add(c); col(p[0] - 0.4, p[1] - 0.4, p[0] + 0.4, p[1] + 0.4);
      box(0.9, 0.35, 0.9, mConc, p[0], H - 0.18, p[1], 2); box(0.9, 0.5, 0.9, mConc, p[0], 0.25, p[1], 2);
    });
    for (var bz = 0; bz <= D; bz += 5) box(W, 0.6, 0.45, mConc, W / 2, H - 0.3, bz === 0 ? 0.25 : (bz === D ? D - 0.25 : bz), 2.5);
    for (var bx = 4; bx < W; bx += 8.3) box(0.45, 0.5, D, mConc, bx, H - 0.8, D / 2, 2.5);
    // pipes along the ceiling
    var pipeGeo = new THREE.CylinderGeometry(0.09, 0.09, W, 10); pipeGeo.rotateZ(Math.PI / 2);
    inst(pipeGeo, mRust, [[W / 2, H - 1.4, 2.0], [W / 2, H - 1.7, 2.3], [W / 2, H - 1.5, 17.8]]);
    var pipeV = new THREE.CylinderGeometry(0.07, 0.07, 3.0, 8);
    inst(pipeV, mRust, [[1.0, H - 2.9, 2.0], [24.0, H - 3.0, 17.8], [12.5, H - 2.9, 2.3]]);

    // ---------- toilet stalls (north wall, 8 stalls) ----------
    var stallW = 2.0, stallD = 1.9, x0 = 3.0, nSt = 8;
    var partGeo = new THREE.BoxGeometry(0.05, 1.9, stallD);
    var partList = [], bowls = [], tanks = [], seats = [];
    for (var s = 0; s <= nSt; s++) { partList.push([x0 + s * stallW, 0.25 + 0.95, stallD / 2, 0]); col(x0 + s * stallW - 0.03, 0, x0 + s * stallW + 0.03, stallD); }
    inst(partGeo, mPart, partList, true);
    var doorGeo = new THREE.BoxGeometry(stallW - 0.08, 1.8, 0.04); doorGeo.translate((stallW - 0.08) / 2, 0.9, 0);
    for (var s2 = 0; s2 < nSt; s2++) {
      var cx = x0 + s2 * stallW + stallW / 2;
      bowls.push([cx, 0.2, 0.75, 0]); tanks.push([cx, 0.62, 0.22, 0]); seats.push([cx, 0.43, 0.78, 0]);
      var dm = new THREE.Mesh(doorGeo, mPart); dm.position.set(x0 + s2 * stallW + 0.04, 0.25, stallD); dm.castShadow = true; dm.receiveShadow = true; G.add(dm);
      var open = (s2 % 3 === 1) ? -1.2 : (s2 % 4 === 3 ? -0.5 : 0); // some doors ajar
      dm.rotation.y = open; var dobj = { mesh: dm, target: open, cur: open }; doors.push(dobj);
      (function (dd, nm, px) {
        var isClosed = dd.target === 0;
        interact.push({ id: 'stall_' + nm, name: 'باب الحمام ' + (nm + 1), pos: new THREE.Vector3(px, 1, stallD + 0.6), radius: 1.6, activate: function () { dd.target = dd.target === 0 ? -1.4 : 0; } });
        if (isClosed) col(px - stallW / 2 + 0.05, stallD - 0.1, px + stallW / 2 - 0.05, stallD + 0.1);
      })(dobj, s2, cx);
    }
    inst(new THREE.CylinderGeometry(0.2, 0.15, 0.4, 14), mPorcDirty, bowls, true);
    inst(new THREE.BoxGeometry(0.42, 0.45, 0.2), mPorcDirty, tanks, true);
    inst(new THREE.CylinderGeometry(0.21, 0.21, 0.04, 14), mPorc, seats);
    var flushGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.05, 6); inst(flushGeo, mChrome, tanks.map(function (t) { return [t[0], 0.88, t[2] + 0.1]; }));

    // ---------- sinks + mirrors (south wall) ----------
    var sinkZ = D - 0.35, sinkX = [4.0, 7.2, 10.4, 14.6, 17.8, 21.0], sinkList = [], tapList = [], mirrorList = [];
    box(21.0, 0.1, 0.62, mConc, 12.5, 0.88, D - 0.36, 2); col(2.0, D - 0.7, 23, D);
    box(21.0, 0.8, 0.5, mPart, 12.5, 0.44, D - 0.3, 2);
    sinkX.forEach(function (sx) { sinkList.push([sx, 0.95, sinkZ - 0.02, 0]); tapList.push([sx, 1.08, D - 0.62, 0]); });
    inst(new THREE.CylinderGeometry(0.28, 0.2, 0.16, 16), mPorcDirty, sinkList, true);
    inst(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8), mChrome, tapList);
    var crack = (function () {
      var c = document.createElement('canvas'); c.width = 512; c.height = 512; var g = c.getContext('2d'); g.clearRect(0, 0, 512, 512);
      g.strokeStyle = 'rgba(220,235,235,0.55)'; g.lineWidth = 1.2;
      for (var k = 0; k < 7; k++) { var px = 256 + (Math.random() - .5) * 200, py = 256 + (Math.random() - .5) * 200; g.beginPath(); g.moveTo(px, py);
        for (var j = 0; j < 7; j++) { px += (Math.random() - .5) * 120; py += (Math.random() - .5) * 120; g.lineTo(px, py); } g.stroke(); }
      for (var q = 0; q < 70; q++) { g.fillStyle = 'rgba(40,36,30,' + (0.05 + Math.random() * 0.25) + ')'; g.fillRect(Math.random() * 512, Math.random() * 512, 3 + Math.random() * 28, 3 + Math.random() * 28); }
      var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
    })();
    var mCrack = new THREE.MeshBasicMaterial({ map: crack, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, fog: false });
    sinkX.forEach(function (sx, i) {
      var mm = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.25, 0.04), mMirror); mm.position.set(sx, 1.95, D - 0.03); mm.receiveShadow = true; G.add(mm);
      var fr = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.35, 0.03), mRust); fr.position.set(sx, 1.95, D - 0.015); G.add(fr);
      if (i !== 3) { var ck = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.25), mCrack); ck.position.set(sx, 1.95, D - 0.055); ck.rotation.y = Math.PI; G.add(ck); }
    });
    interact.push({ id: 'tap', name: 'الحنفية', pos: new THREE.Vector3(10.4, 1, D - 1.0), radius: 1.4, activate: function () { for (var i = 0; i < drips.length; i++) drips[i].fast = !drips[i].fast; } });

    // ---------- bathtubs (east wall) ----------
    var tubZ = [3.4, 7.2, 11.0, 14.8], tubBody = [], tubInner = [];
    tubZ.forEach(function (z) {
      var wx = W - 1.05; // length along z: 1.9
      box(0.9, 0.55, 1.9, mPorcDirty, wx, 0.28, z, 2, true);
      box(0.7, 0.04, 1.7, mWater, wx, 0.5, z, 2);
      col(W - 1.55, z - 0.97, W, z + 0.97);
      box(0.06, 0.4, 0.06, mChrome, W - 0.2, 0.75, z - 0.55, 1); box(0.2, 0.05, 0.05, mChrome, W - 0.3, 0.95, z - 0.55, 1);
    });
    // curtain rail remains + torn curtain
    var curtain = new THREE.MeshStandardMaterial({ color: 0x4a5a50, roughness: 0.95, side: THREE.DoubleSide });
    [3.4, 11.0].forEach(function (z) { var cg = new THREE.PlaneGeometry(1.7, 1.9, 6, 1); put(cg, curtain, W - 1.55, 1.3, z, 0, Math.PI / 2, false); });
    box(0.03, 0.03, 15.4, mChrome, W - 1.55, 2.3, 9.1, 1);

    // ---------- floor drains, puddles, debris ----------
    var drainMat = new THREE.MeshStandardMaterial({ color: 0x1b1b1a, roughness: 0.6, metalness: 0.6 });
    var drainList = []; [[6, 6], [12.5, 10], [19, 6], [6, 14], [19, 14], [12.5, 16]].forEach(function (p) { drainList.push([p[0], 0.012, p[1], 0]); });
    inst(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 20), drainMat, drainList);
    var puddle = new THREE.CircleGeometry(1, 28); puddle.rotateX(-Math.PI / 2);
    [[6, 6, 1.5], [12.5, 10, 2.1], [19, 6, 1.2], [6, 14, 1.8], [12.5, 16, 1.4], [15, 9, 1]].forEach(function (p) {
      var m = new THREE.Mesh(puddle, mWater); m.position.set(p[0] + 0.3, 0.014, p[1] - 0.2); m.scale.set(p[2], 1, p[2] * 0.75); m.renderOrder = 2; G.add(m);
    });
    var shard = new THREE.BoxGeometry(0.22, 0.02, 0.18), shardList = [];
    for (var sh = 0; sh < 36; sh++) shardList.push([2 + Math.random() * 21, 0.011, 2.4 + Math.random() * 15, Math.random() * 6, 0.5 + Math.random(), 1, 0.5 + Math.random()]);
    inst(shard, mPorcDirty, shardList);
    // drips from the ceiling pipes into puddles
    var dripGeo = new THREE.SphereGeometry(0.02, 6, 6), dripMat = new THREE.MeshStandardMaterial({ color: 0x9db4b8, roughness: 0.1, transparent: true, opacity: 0.8 });
    [[12.8, 9.8], [6.3, 6.2], [19.1, 5.8]].forEach(function (p, i) {
      var d = new THREE.Mesh(dripGeo, dripMat); d.position.set(p[0], H - 1.5, p[1]); G.add(d); drips.push({ m: d, x: p[0], z: p[1], t: Math.random() * 3, fast: false, y0: H - 1.5 });
    });

    // ---------- entrance double door (west wall) ----------
    var dGeo = new THREE.BoxGeometry(0.06, 2.5, 1.1); dGeo.translate(0, 1.25, 0.55);
    var mDoor = new THREE.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 0.8 });
    var d1 = new THREE.Mesh(dGeo, mDoor); d1.position.set(0.03, 0, 8.9); d1.castShadow = true; G.add(d1);
    var d2 = new THREE.Mesh(dGeo, mDoor); d2.position.set(0.03, 0, 11.1); d2.scale.z = -1; d2.castShadow = true; G.add(d2);
    var dg1 = { mesh: d1, target: 0, cur: 0, axis: 'y' }, dg2 = { mesh: d2, target: 0, cur: 0, axis: 'y' }; doors.push(dg1, dg2);
    interact.push({ id: 'entrance', name: 'الباب الكبير', pos: new THREE.Vector3(1.2, 1, 10), radius: 1.8, activate: function () { var o = dg1.target === 0; dg1.target = o ? 1.3 : 0; dg2.target = o ? -1.3 : 0; } });
    box(0.2, 2.6, 0.12, mConc, 0.1, 1.3, 8.8, 2); box(0.2, 2.6, 0.12, mConc, 0.1, 1.3, 11.2, 2); box(0.2, 0.15, 2.5, mConc, 0.1, 2.58, 10, 2);

    // ---------- high windows (blue night, fake light shafts) ----------
    var mWin = new THREE.MeshBasicMaterial({ color: 0x2a3d55, fog: false });
    var shaftMat = new THREE.MeshBasicMaterial({ color: 0x6f8fb0, transparent: true, opacity: 0.035, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    [4, 9, 14, 19].forEach(function (z) {
      put(new THREE.PlaneGeometry(1.4, 2.4), mWin, 0.06, 7.6, z, 0, Math.PI / 2);
      var sg = new THREE.PlaneGeometry(1.2, 9); sg.translate(0, -4.5, 0); var sm = new THREE.Mesh(sg, shaftMat); sm.position.set(0.5, 8.6, z); sm.rotation.set(0, Math.PI / 2, -0.55); G.add(sm);
    });

    // ---------- lights: 3 real flickering lights, fixtures are emissive ----------
    var fixMat = new THREE.MeshStandardMaterial({ color: 0xdfe8e4, emissive: 0xcfe0d8, emissiveIntensity: 1.5 });
    var fixList = [];
    [[6, 5], [12.5, 5], [19, 5], [6, 10], [12.5, 10], [19, 10], [6, 15], [12.5, 15], [19, 15]].forEach(function (p) { fixList.push([p[0], H - 0.9, p[1], 0]); });
    var fix = inst(new THREE.BoxGeometry(1.4, 0.06, 0.18), fixMat, fixList);
    var lampMats = [];
    fixList.forEach(function (p, i) {
      var m = fixMat.clone(); lampMats.push(m);
    });
    [[6.3, 4.0, 6.5], [12.5, 4.0, 10], [18.7, 4.0, 13.5]].forEach(function (p, i) {
      var L = new THREE.PointLight(0xcfe0d8, 1.1, 18, 2); L.position.set(p[0], p[1] + 3.2, p[2]); G.add(L); flick.push({ L: L, base: 1.1, ph: i * 2.1, bad: i === 1 });
    });
    G.add(new THREE.HemisphereLight(0x3a4658, 0x1a1612, high ? 0.5 : 0.4));

    // ---------- update ----------
    var T = 0;
    function update(dt) {
      T += dt;
      for (var i = 0; i < flick.length; i++) {
        var f = flick[i], k = f.bad ? (Math.random() < 0.05 ? 0.15 + Math.random() * 0.4 : 0.9 + Math.sin(T * 41) * 0.05) : 0.93 + Math.sin(T * 3 + f.ph) * 0.04 + (Math.random() < 0.01 ? -0.4 : 0);
        f.L.intensity = f.base * k;
      }
      fixMat.emissiveIntensity = 1.3 + Math.sin(T * 38) * 0.15 + (Math.random() < 0.03 ? -0.9 : 0);
      for (var j = 0; j < doors.length; j++) { var d = doors[j]; d.cur += (d.target - d.cur) * Math.min(1, dt * 4); d.mesh.rotation.y = d.cur; }
      for (var q = 0; q < drips.length; q++) {
        var dr = drips[q]; dr.t += dt * (dr.fast ? 2.6 : 1); var ph = dr.t % 2.2, y = dr.y0 - 0.5 * 9.8 * Math.max(0, ph - 1.2) * Math.max(0, ph - 1.2);
        dr.m.visible = ph > 1.2 && y > 0.02; dr.m.position.y = Math.max(0.02, y);
      }
    }
    return {
      group: G, update: update, interactables: interact,
      bounds: { room: { x0: 0, z0: 0, x1: W, z1: D, h: H }, colliders: colliders },
      spawn: { x: 2.0, y: 1.6, z: 10, yaw: -Math.PI / 2 }, size: { w: W, d: D, h: H }
    };
  }
  global.BathroomModule = { build: build, size: { w: W, d: D, h: H } };
})(typeof window !== 'undefined' ? window : this);
