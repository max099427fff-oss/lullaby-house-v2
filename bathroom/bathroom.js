/* BathroomModule: abandoned home bathroom (7.0 x 5.5 m, 2.6 m high; see SIZE below), horror-realistic.
   API: var bath = BathroomModule.build(THREE, { quality:'high'|'normal', renderer })
        bath.group, bath.update(dt), bath.interactables [{id,name,pos,radius,activate()}],
        bath.bounds {room:{x0,z0,x1,z1,h}, colliders:[{x0,z0,x1,z1}]}, bath.spawn {x,y,z,yaw}
   Origin = north-west floor corner, y up. three.js r128 only. Poly Haven CC0 textures (colour 4K in high, else 2K; normal/rough/AO 2K).
   The earlier 25x20x10 m hall version is kept in bathroom_hall_v1.js (not used). */
(function (global) {
  var SIZE = { w: 7.0, d: 5.5, h: 2.6 }; // <-- change the room size here (metres)
  var W = SIZE.w, D = SIZE.d, H = SIZE.h;
  var PH = 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/';
  function build(THREE, opt) {
    opt = opt || {};
    var high = opt.quality === 'high';
    var G = new THREE.Group(); G.name = 'BathroomModule';
    var colliders = [], interact = [], flick = [], doors = [], drips = [];
    var maxAniso = opt.renderer ? opt.renderer.capabilities.getMaxAnisotropy() : 8;
    var TL = new THREE.TextureLoader(); TL.crossOrigin = 'anonymous'; var tc = {};
    function tex(url, srgb) { if (tc[url]) return tc[url]; var t = TL.load(url); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = Math.min(high ? 16 : 8, maxAniso); if (srgb) t.encoding = THREE.sRGBEncoding; tc[url] = t; return t; }
    function pbr(id, tint, ns) {
      var cr = high ? '4k' : '2k';
      var m = new THREE.MeshStandardMaterial({ color: tint === undefined ? 0xffffff : tint, map: tex(PH + cr + '/' + id + '/' + id + '_diff_' + cr + '.jpg', true), normalMap: tex(PH + '2k/' + id + '/' + id + '_nor_gl_2k.jpg'), roughnessMap: tex(PH + '2k/' + id + '/' + id + '_rough_2k.jpg'), aoMap: tex(PH + '2k/' + id + '/' + id + '_ao_2k.jpg'), roughness: 1, metalness: 0 });
      m.normalScale = new THREE.Vector2(ns || 1, ns || 1); return m;
    }
    function uvs(g, su, sv) { var a = g.attributes.uv; for (var i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * su, a.getY(i) * sv); g.setAttribute('uv2', a.clone()); return g; }
    function add(geo, mat, x, y, z, ry, shadow) { var m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry || 0; m.castShadow = !!shadow; m.receiveShadow = true; G.add(m); return m; }
    function box(w, h, d, mat, x, y, z, tile, shadow) {
      var g = new THREE.BoxGeometry(w, h, d), a = g.attributes.uv, t = tile || 1;
      for (var i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * Math.max(w, d) / t, a.getY(i) * Math.max(h, Math.min(w, d)) / t);
      g.setAttribute('uv2', a.clone()); return add(g, mat, x, y, z, 0, shadow);
    }
    function col(x0, z0, x1, z1) { colliders.push({ x0: x0, z0: z0, x1: x1, z1: z1 }); }

    var mFloor = pbr('brown_floor_tiles', 0xa39d94, 1.1), mTile = pbr('long_white_tiles', 0xb3b0a6, 1.0), mPlaster = pbr('damaged_plaster', 0x8a8f8a, 1.3), mCeil = pbr('ceiling_interior', 0x7d7a74, 1.0), mConc = pbr('chipped_concrete', 0x85827c, 1.2);
    var mPorc = new THREE.MeshStandardMaterial({ color: 0xc4c0b3, roughness: 0.22, metalness: 0.02 });
    var mPorcD = new THREE.MeshStandardMaterial({ color: 0x9a9688, roughness: 0.38, metalness: 0.02 });
    var mChrome = new THREE.MeshStandardMaterial({ color: 0x9aa2a7, roughness: 0.28, metalness: 0.85 });
    var mRust = new THREE.MeshStandardMaterial({ color: 0x4a2c1c, roughness: 0.75, metalness: 0.5 });
    var mWood = new THREE.MeshStandardMaterial({ color: 0x3d2e22, roughness: 0.85, metalness: 0 });
    var mWater = new THREE.MeshStandardMaterial({ color: 0x0a0f0d, roughness: 0.03, metalness: 0.5, transparent: true, opacity: 0.88, emissive: 0x0a1418, emissiveIntensity: 0.4 });
    var mBlood = new THREE.MeshStandardMaterial({ color: 0x3a0606, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.9 });

    // ---------- shell ----------
    var fl = new THREE.PlaneGeometry(W, D); uvs(fl, W / 0.9, D / 0.9); fl.rotateX(-Math.PI / 2); add(fl, mFloor, W / 2, 0, D / 2);
    var cl = new THREE.PlaneGeometry(W, D); uvs(cl, W / 2, D / 2); cl.rotateX(Math.PI / 2); add(cl, mCeil, W / 2, H, D / 2);
    var TH = 1.5; // tiled height
    function wallPlane(len, x, z, ry) {
      var g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
      var lo = new THREE.PlaneGeometry(len, TH); uvs(lo, len / 0.6, TH / 0.6); var a = new THREE.Mesh(lo, mTile); a.position.y = TH / 2; a.receiveShadow = true; g.add(a);
      var hi = new THREE.PlaneGeometry(len, H - TH); uvs(hi, len / 1.4, (H - TH) / 1.4); var b = new THREE.Mesh(hi, mPlaster); b.position.y = TH + (H - TH) / 2; b.receiveShadow = true; g.add(b);
      var trim = new THREE.Mesh(new THREE.BoxGeometry(len, 0.04, 0.025), mConc); trim.position.set(0, TH + 0.01, 0.01); g.add(trim);
      var base = new THREE.Mesh(new THREE.BoxGeometry(len, 0.1, 0.02), mConc); base.position.set(0, 0.05, 0.01); g.add(base);
      G.add(g);
    }
    wallPlane(W, W / 2, 0, 0); wallPlane(W, W / 2, D, Math.PI); wallPlane(D, 0, D / 2, Math.PI / 2); wallPlane(D, W, D / 2, -Math.PI / 2);
    col(-1, -1, W + 1, 0); col(-1, D, W + 1, D + 1); col(-1, -1, 0, D + 1); col(W, -1, W + 1, D + 1);

    // ---------- bathtub along north wall (east half) ----------
    var tx0 = W - 1.95, tx1 = W - 0.03, tz1 = 0.78;
    box(tx1 - tx0, 0.12, tz1, mPorcD, (tx0 + tx1) / 2, 0.06, tz1 / 2, 1, true);               // base
    box(tx1 - tx0, 0.52, 0.07, mPorc, (tx0 + tx1) / 2, 0.38, tz1 - 0.035, 1, true);          // front wall
    box(0.07, 0.52, tz1, mPorc, tx0 + 0.035, 0.38, tz1 / 2, 1, true);                        // west end
    box(0.07, 0.52, tz1, mPorc, tx1 - 0.035, 0.38, tz1 / 2, 1, true);                        // east end
    box(tx1 - tx0 - 0.14, 0.04, tz1 - 0.1, mPorcD, (tx0 + tx1) / 2, 0.24, (tz1 - 0.07) / 2, 1);  // tub floor (inside)
    var wtr = new THREE.Mesh(new THREE.PlaneGeometry(tx1 - tx0 - 0.2, tz1 - 0.2), mWater); wtr.rotation.x = -Math.PI / 2; wtr.position.set((tx0 + tx1) / 2, 0.36, (tz1 - 0.05) / 2); G.add(wtr);
    var bl = new THREE.Mesh(new THREE.CircleGeometry(0.16, 20), mBlood); bl.rotation.x = -Math.PI / 2; bl.position.set(tx0 + 0.5, 0.372, 0.35); G.add(bl);
    col(tx0, 0, tx1, tz1 + 0.02);
    box(0.05, 0.3, 0.05, mChrome, tx0 + 0.9, 0.9, 0.06, 1); add(new THREE.CylinderGeometry(0.015, 0.015, 0.2, 8), mChrome, tx0 + 0.9, 0.78, 0.15).rotation.x = Math.PI / 2;
    box(0.03, 0.03, 0.9, mChrome, tx1 - 0.05, 1.85, 0.4, 1); box(1.5, 0.03, 0.03, mChrome, (tx0 + tx1) / 2, 1.85, tz1 + 0.03, 1);
    var curt = new THREE.MeshStandardMaterial({ color: 0x4d5d52, roughness: 0.95, side: THREE.DoubleSide }); var cg = new THREE.PlaneGeometry(0.9, 1.7, 5, 1);
    add(cg, curt, tx0 + 0.4, 0.97, tz1 + 0.04, 0);

    // ---------- toilet on east wall ----------
    var tzc = D * 0.55;
    var bowl = add(new THREE.CylinderGeometry(0.2, 0.15, 0.4, 16), mPorcD, W - 0.5, 0.2, tzc, 0, true); bowl.scale.set(1.15, 1, 1);
    add(new THREE.CylinderGeometry(0.21, 0.21, 0.04, 16), mPorc, W - 0.5, 0.42, tzc).scale.set(1.15, 1, 1);
    box(0.2, 0.46, 0.42, mPorcD, W - 0.14, 0.62, tzc, 1, true); box(0.22, 0.04, 0.44, mPorc, W - 0.14, 0.87, tzc, 1);
    col(W - 0.76, tzc - 0.3, W, tzc + 0.3);
    add(new THREE.CylinderGeometry(0.02, 0.02, 0.05, 6), mChrome, W - 0.14, 0.9, tzc);
    interact.push({ id: 'toilet', name: 'السيفون', pos: new THREE.Vector3(W - 0.9, 1, tzc), radius: 0.9, activate: function () { for (var i = 0; i < drips.length; i++) drips[i].fast = !drips[i].fast; } });

    // ---------- sink + mirror on west wall ----------
    var sz = D * 0.4;
    box(0.45, 0.8, 0.6, mWood, 0.23, 0.4, sz, 1, true);
    box(0.5, 0.06, 0.66, mPorc, 0.27, 0.83, sz, 1, true);
    var bowlS = add(new THREE.CylinderGeometry(0.22, 0.16, 0.1, 18), mPorcD, 0.27, 0.85, sz); bowlS.scale.set(0.9, 1, 1.1);
    add(new THREE.CylinderGeometry(0.018, 0.018, 0.2, 8), mChrome, 0.08, 0.96, sz);
    var tap = add(new THREE.TorusGeometry(0.07, 0.014, 8, 12, Math.PI), mChrome, 0.14, 1.06, sz); tap.rotation.set(0, Math.PI / 2, 0);
    col(0, sz - 0.34, 0.56, sz + 0.34);
    var mirTex = (function () {
      var c = document.createElement('canvas'); c.width = 256; c.height = 320; var g = c.getContext('2d');
      var gr = g.createLinearGradient(0, 0, 256, 320); gr.addColorStop(0, '#4a636a'); gr.addColorStop(0.5, '#7b9aa0'); gr.addColorStop(1, '#2c4048'); g.fillStyle = gr; g.fillRect(0, 0, 256, 320);
      g.fillStyle = 'rgba(200,222,228,0.2)'; g.fillRect(50, 0, 14, 320); g.fillRect(160, 0, 30, 320);
      for (var i = 0; i < 220; i++) { g.fillStyle = 'rgba(30,25,18,' + (Math.random() * 0.4) + ')'; g.fillRect(Math.random() * 256, Math.random() * 320, 1 + Math.random() * 14, 1 + Math.random() * 14); }
      g.strokeStyle = 'rgba(225,238,240,0.6)'; g.lineWidth = 1.3;
      for (var k = 0; k < 6; k++) { var px = 150 + (Math.random() - .5) * 60, py = 120 + (Math.random() - .5) * 60; g.beginPath(); g.moveTo(px, py); for (var j = 0; j < 6; j++) { px += (Math.random() - .5) * 90; py += (Math.random() - .5) * 90; g.lineTo(px, py); } g.stroke(); }
      var vg = g.createRadialGradient(128, 160, 40, 128, 160, 200); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)'); g.fillStyle = vg; g.fillRect(0, 0, 256, 320);
      var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
    })();
    var mMir = new THREE.MeshStandardMaterial({ color: 0xa5b2b6, roughness: 0.05, metalness: 0.9, map: mirTex, emissive: 0xffffff, emissiveMap: mirTex, emissiveIntensity: 0.75 });
    var mir = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.7), mMir); mir.position.set(0.035, 1.6, sz); mir.rotation.y = Math.PI / 2; G.add(mir);
    box(0.03, 0.78, 0.63, mRust, 0.016, 1.6, sz, 1); // frame behind mirror
    // shelf with jars above the toilet
    box(0.2, 0.03, 0.7, mWood, W - 0.11, 1.45, tzc, 1, true);
    [[-0.22, 0.09], [0, 0.13], [0.2, 0.07]].forEach(function (o, i) { var j = add(new THREE.CylinderGeometry(0.035, 0.035, o[1], 8), new THREE.MeshStandardMaterial({ color: [0x6a5a3a, 0x4a5a52, 0x5a3a3a][i], roughness: 0.4, metalness: 0.1 }), W - 0.11, 1.465 + o[1] / 2, tzc + o[0]); });


    // ---------- tub polish: rim, dirty water, taps ----------
    box(tx1 - tx0, 0.03, tz1, mPorc, (tx0 + tx1) / 2, 0.655, tz1 / 2 - 0.0, 1).scale.set(1, 1, 1);
    var tw = new THREE.Mesh(new THREE.PlaneGeometry(tx1 - tx0 - 0.16, tz1 - 0.14), new THREE.MeshStandardMaterial({ color: 0x1b2a1c, roughness: 0.04, metalness: 0.4, transparent: true, opacity: 0.93 }));
    tw.rotation.x = -Math.PI / 2; tw.position.set((tx0 + tx1) / 2, 0.5, (tz1 - 0.07) / 2); G.add(tw);
    add(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 8), mChrome, tx1 - 0.15, 0.7, 0.07); var tt = add(new THREE.CylinderGeometry(0.014, 0.014, 0.12, 8), mChrome, tx1 - 0.15, 0.78, 0.12); tt.rotation.x = Math.PI / 2;
    // ---------- Poly Haven CC0 props (glTF 1k), loaded async ----------
    function props() {
      var mgr = new THREE.LoadingManager(); mgr.setURLModifier(function (u) { return u.replace(/\/gltf\/1k\/([a-z_0-9]+)\/textures\//, '/jpg/1k/$1/'); });
      var L = new THREE.GLTFLoader(mgr); L.setCrossOrigin('anonymous');
      var B = 'https://dl.polyhaven.org/file/ph-assets/Models/gltf/1k/';
      function put(id, h, x, y, z, ry, rz) {
        L.load(B + id + '/' + id + '_1k.gltf', function (g) {
          var o = g.scene, bb = new THREE.Box3().setFromObject(o), sz3 = new THREE.Vector3(); bb.getSize(sz3);
          var k = h / Math.max(sz3.x, sz3.y, sz3.z); o.scale.setScalar(k); bb.setFromObject(o);
          o.position.set(x, y - bb.min.y, z); o.rotation.y = ry || 0; if (rz) o.rotation.z = rz;
          o.traverse(function (m) { if (m.isMesh) { m.castShadow = false; m.receiveShadow = true; if (m.material.map) m.material.map.anisotropy = 8; } });
          G.add(o);
        }, undefined, function () {});
      }
      put('plunger', 0.55, W - 0.2, 0, tzc + 0.62, 0.4, 0.18);
      put('multi_cleaner_bottle', 0.27, 0.3, 0.86, sz + 0.2, 1.0);
      put('medical_box', 0.26, W - 0.12, 1.465, tzc + 0.12, -1.57);
      put('rubber_duck_toy', 0.13, (tx0 + tx1) / 2 + 0.2, 0.47, 0.35, 2.5);
    }
    if (global.THREE && THREE.GLTFLoader) props();
    else { var sc = document.createElement('script'); sc.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js'; sc.onload = function () { if (THREE.GLTFLoader) props(); }; document.head.appendChild(sc); }
    // ---------- door on south wall, hinged at x=0.55 ----------
    var dw = 0.85, dg = new THREE.BoxGeometry(dw, 2.0, 0.04); dg.translate(dw / 2, 1.0, 0);
    var door = new THREE.Mesh(dg, mWood); door.position.set(0.55, 0, D - 0.02); door.castShadow = true; door.receiveShadow = true; G.add(door);
    var dd = { mesh: door, target: 0.5, cur: 0.5 }; doors.push(dd);
    box(0.06, 2.06, 0.1, mConc, 0.5, 1.03, D - 0.05, 1); box(0.06, 2.06, 0.1, mConc, 1.46, 1.03, D - 0.05, 1); box(0.96, 0.06, 0.1, mConc, 0.98, 2.06, D - 0.05, 1);
    add(new THREE.SphereGeometry(0.03, 8, 8), mChrome, 1.32, 1.0, D - 0.06);
    interact.push({ id: 'door', name: 'الباب', pos: new THREE.Vector3(1.0, 1, D - 0.5), radius: 1.1, activate: function () { dd.target = dd.target < 0.1 ? 1.6 : 0; } });
    var shut = { x0: 0.5, z0: D - 0.1, x1: 1.46, z1: D };

    // ---------- small boarded window (north wall, west half) ----------
    box(0.7, 0.8, 0.03, new THREE.MeshBasicMaterial({ color: 0x142030 }), 0.95, 1.65, 0.02, 1);
    for (var b = 0; b < 3; b++) { var pl = box(0.9, 0.1, 0.03, mWood, 0.95, 1.4 + b * 0.25, 0.05, 1); pl.rotation.z = (b - 1) * 0.08; }

    // ---------- floor: puddle, drain, tile debris, drips ----------
    var drain = add(new THREE.CylinderGeometry(0.1, 0.1, 0.015, 18), new THREE.MeshStandardMaterial({ color: 0x1a1a19, roughness: 0.6, metalness: 0.6 }), W * 0.45, 0.008, D * 0.5);
    var pg = new THREE.CircleGeometry(0.5, 32); pg.rotateX(-Math.PI / 2); (function () { var a = pg.attributes.position; for (var i = 1; i < a.count; i++) { var an = Math.atan2(a.getZ(i), a.getX(i)), k = 1 + 0.25 * Math.sin(an * 3 + 1) + 0.12 * Math.sin(an * 5 + 2); a.setXYZ(i, a.getX(i) * k, 0, a.getZ(i) * k); } })();
    var pud = new THREE.Mesh(pg, mWater); pud.position.set(W * 0.45, 0.006, D * 0.5 + 0.1); pud.scale.set(1.2, 1, 0.9); G.add(pud);
    var pud2 = new THREE.Mesh(pg, mBlood); pud2.position.set(W * 0.7, 0.007, D * 0.72); pud2.scale.set(0.6, 1, 0.5); G.add(pud2);
    for (var sh = 0; sh < 34; sh++) { var s = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.01, 0.07), mPorcD); s.position.set(0.6 + Math.random() * (W - 1.4), 0.006, 0.9 + Math.random() * (D - 1.6)); s.rotation.y = Math.random() * 6; G.add(s); }
    var dm = new THREE.MeshStandardMaterial({ color: 0x9db4b8, roughness: 0.1, transparent: true, opacity: 0.8 });
    var dr = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), dm); dr.position.set(tx0 + 0.9, 0.9, 0.15); G.add(dr); drips.push({ m: dr, t: 0, fast: false, y0: 0.82, x: tx0 + 0.9 });

    // ---------- ceiling lamp (one bulb) + stains ----------
    box(0.02, 0.5, 0.02, mChrome, W / 2, H - 0.25, D / 2, 1);
    var bulbM = new THREE.MeshBasicMaterial({ color: 0xffe2b0 }); var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), bulbM); bulb.position.set(W / 2, H - 0.55, D / 2); G.add(bulb);
    var L = new THREE.PointLight(0xffd9a0, 2.2, 11, 2); L.position.set(W / 2, H - 0.6, D / 2); L.castShadow = high; if (high) { L.shadow.mapSize.set(2048, 2048); L.shadow.bias = -0.0008; } G.add(L);
    flick.push({ L: L, base: 2.2, bulb: bulbM });
    G.add(new THREE.HemisphereLight(0x3a4658, 0x1a1612, high ? 0.55 : 0.45));
    var stT = (function () { var c = document.createElement('canvas'); c.width = 64; c.height = 256; var g = c.getContext('2d'); var gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(70,35,18,0)'); gr.addColorStop(0.12, 'rgba(70,35,18,0.55)'); gr.addColorStop(1, 'rgba(40,25,15,0)'); g.fillStyle = gr; g.fillRect(16, 0, 32, 256); return new THREE.CanvasTexture(c); })();
    var mSt = new THREE.MeshBasicMaterial({ map: stT, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
    [[1.5, 0.012, 0], [2.9, D - 0.012, Math.PI], [D * 0 + 0.012, 2.4, Math.PI / 2]].forEach(function (p, i) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 1.0), mSt); if (i === 2) m.position.set(0.012, 2.0, 2.4); else m.position.set(p[0], 2.0, p[1]); m.rotation.y = p[2]; G.add(m);
    });

    var T = 0;
    function update(dt) {
      T += dt;
      var f = flick[0], k = Math.random() < 0.035 ? 0.2 + Math.random() * 0.5 : 0.94 + Math.sin(T * 5) * 0.03 + Math.sin(T * 37) * 0.02;
      f.L.intensity = f.base * k; f.bulb.color.setRGB(1, 0.89 * (0.6 + 0.4 * k), 0.69 * (0.4 + 0.6 * k));
      for (var j = 0; j < doors.length; j++) { var d = doors[j]; d.cur += (d.target - d.cur) * Math.min(1, dt * 4); d.mesh.rotation.y = d.cur; }
      var open = dd.target > 0.1; shut.x0 = open ? 9 : 0.5; shut.x1 = open ? 9.1 : 1.46;
      for (var q = 0; q < drips.length; q++) { var r = drips[q]; r.t += dt * (r.fast ? 2.6 : 1); var ph = r.t % 2.4, e = Math.max(0, ph - 1.3), y = r.y0 - 0.5 * 9.8 * e * e; r.m.visible = ph > 1.3 && y > 0.37; r.m.position.set(r.x, Math.max(0.37, y), 0.15); }
    }
    colliders.push(shut);
    return { group: G, update: update, interactables: interact, bounds: { room: { x0: 0, z0: 0, x1: W, z1: D, h: H }, colliders: colliders }, spawn: { x: 1.0, y: 1.6, z: D - 1.1, yaw: 0 }, size: { w: W, d: D, h: H } };
  }
  global.BathroomModule = { build: build, size: { w: W, d: D, h: H } };
})(typeof window !== 'undefined' ? window : this);
