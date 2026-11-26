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

    var mFloor = pbr('brown_floor_tiles', 0xa39d94, 1.1), mTile = pbr("long_white_tiles", 0x8d8b84, 1.0), mPlaster = pbr('damaged_plaster', 0x8a8f8a, 1.3), mCeil = pbr('ceiling_interior', 0x7d7a74, 1.0), mConc = pbr('chipped_concrete', 0x85827c, 1.2);
    mTile.color.setHex(0x1e3d44); mTile.roughness = 0.4; mTile.metalness = 0.05;
    mPlaster = new THREE.MeshStandardMaterial({ color: 0x3c4147, roughness: 0.92, metalness: 0 });
    mCeil = new THREE.MeshStandardMaterial({ color: 0x25272b, roughness: 0.95, metalness: 0 });
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
    var cm = add(cg, curt, tx1 - 0.3, 0.97, tz1 + 0.04, 0); cm.scale.set(0.5, 1, 1);

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
      put('rubber_duck_toy', 0.2, (tx0 + tx1) / 2 - 0.1, 0.47, 0.4, 2.2);
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

    // ---------- extra furniture ----------
    var mDark = new THREE.MeshStandardMaterial({ color: 0x2c241d, roughness: 0.8, metalness: 0 });
    box(1.1, 1.9, 0.45, mDark, W - 1.0, 0.95, D - 0.25, 1, true); box(0.5, 0.8, 0.02, mWood, W - 1.28, 1.2, D - 0.49, 1); box(0.5, 0.8, 0.02, mWood, W - 0.72, 1.2, D - 0.49, 1); // wall cabinet
    col(W - 1.6, D - 0.5, W - 0.4, D);
    var bk = add(new THREE.CylinderGeometry(0.28, 0.22, 0.6, 14, 1, true), new THREE.MeshStandardMaterial({ color: 0x5b4630, roughness: 0.95, side: THREE.DoubleSide }), W - 2.2, 0.3, D - 0.45, 0, true); col(W - 2.55, D - 0.8, W - 1.85, D - 0.1);
    box(1.2, 0.03, 0.3, mWood, 2.2, 1.7, D - 0.16, 1, true); box(0.05, 0.25, 0.05, mRust, 1.7, 1.58, D - 0.14, 1); box(0.05, 0.25, 0.05, mRust, 2.7, 1.58, D - 0.14, 1);
    box(0.45, 0.4, 0.45, mConc, 3.7, 0.2, 0.3, 1, true); col(3.45, 0, 3.95, 0.55); // concrete stool by the north wall

    // ---------- floor: puddle, drain, tile debris, drips ----------
    var drain = add(new THREE.CylinderGeometry(0.1, 0.1, 0.015, 18), new THREE.MeshStandardMaterial({ color: 0x1a1a19, roughness: 0.6, metalness: 0.6 }), W * 0.45, 0.008, D * 0.5);
    var pg = new THREE.CircleGeometry(0.5, 32); pg.rotateX(-Math.PI / 2); (function () { var a = pg.attributes.position; for (var i = 1; i < a.count; i++) { var an = Math.atan2(a.getZ(i), a.getX(i)), k = 1 + 0.25 * Math.sin(an * 3 + 1) + 0.12 * Math.sin(an * 5 + 2); a.setXYZ(i, a.getX(i) * k, 0, a.getZ(i) * k); } })();
    // puddle removed (user: clean floor)
    var pud2 = new THREE.Mesh(pg, mBlood); pud2.position.set(W * 0.7, 0.007, D * 0.72); pud2.scale.set(0.6, 1, 0.5); G.add(pud2);
    // tile debris removed (user: clean floor)
    var dm = new THREE.MeshStandardMaterial({ color: 0x9db4b8, roughness: 0.1, transparent: true, opacity: 0.8 });
    var dr = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), dm); dr.position.set(tx0 + 0.9, 0.9, 0.15); G.add(dr); drips.push({ m: dr, t: 0, fast: false, y0: 0.82, x: tx0 + 0.9 });

    // ---------- ceiling lamp (one bulb) + stains ----------
    box(1.3, 0.06, 0.16, new THREE.MeshStandardMaterial({ color: 0x777b7d, roughness: 0.6 }), W / 2, H - 0.03, D / 2, 1);
    var bulbM = new THREE.MeshBasicMaterial({ color: 0xdff0ff }); var bulb = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.03, 0.1), bulbM); bulb.position.set(W / 2, H - 0.075, D / 2); G.add(bulb);
    var L = new THREE.SpotLight(0xcfe6ff, 16, 9, 0.95, 0.85, 2); L.position.set(W / 2, H - 0.15, D / 2); L.target.position.set(W / 2, 0, D / 2); G.add(L.target); L.castShadow = high; if (high) { L.shadow.mapSize.set(2048, 2048); L.shadow.bias = -0.0008; } G.add(L);
    flick.push({ L: L, base: 16, bulb: bulbM });
    G.add(new THREE.HemisphereLight(0x1c2630, 0x0a0b0c, 0.015));
    var stT = (function () { var c = document.createElement('canvas'); c.width = 64; c.height = 256; var g = c.getContext('2d'); var gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(70,35,18,0)'); gr.addColorStop(0.12, 'rgba(70,35,18,0.55)'); gr.addColorStop(1, 'rgba(40,25,15,0)'); g.fillStyle = gr; g.fillRect(16, 0, 32, 256); return new THREE.CanvasTexture(c); })();
    var mSt = new THREE.MeshBasicMaterial({ map: stT, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });


    // ---------- horror decals: grime, cracks, handprints, blood trail, rust ----------
    function cv(w, h, fn) { var c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t; }
    function decal(tx, w, h, x, y, z, ry, rx) { var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, 0); m.renderOrder = 2; G.add(m); return m; }
    var tGrime = cv(8, 256, function (g, w, h) { var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(8,6,4,0)'); gr.addColorStop(0.55, 'rgba(8,6,4,0.35)'); gr.addColorStop(1, 'rgba(6,5,3,0.88)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    var gm = new THREE.MeshBasicMaterial({ map: tGrime, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    var tCrack = cv(256, 256, function (g) { g.strokeStyle = 'rgba(8,6,4,0.95)'; g.lineCap = 'round'; function br(x, y, a, l, w) { if (l < 8 || w < 0.4) return; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); var nx = x + Math.cos(a) * l, ny = y + Math.sin(a) * l; g.lineTo(nx, ny); g.stroke(); br(nx, ny, a + (Math.random() - .5) * 0.8, l * 0.8, w * 0.8); if (Math.random() < 0.5) br(nx, ny, a + (Math.random() > .5 ? 1 : -1) * (0.6 + Math.random() * 0.6), l * 0.6, w * 0.6); } br(128, 128, Math.random() * 6, 46, 3.2); br(128, 128, Math.random() * 6, 40, 2.8); br(128, 128, Math.random() * 6, 36, 2.4); });
    var tHand = cv(128, 160, function (g) { g.fillStyle = 'rgba(95,8,8,0.88)'; g.beginPath(); g.ellipse(64, 108, 30, 34, 0, 0, 7); g.fill(); [[28, 70, -0.25, 44], [48, 56, -0.08, 52], [68, 52, 0.06, 54], [88, 60, 0.2, 46]].forEach(function (f) { g.save(); g.translate(f[0], f[1]); g.rotate(f[2]); g.fillRect(-7, -f[3] + 20, 14, f[3]); g.restore(); }); g.save(); g.translate(104, 96); g.rotate(0.9); g.fillRect(-6, -34, 13, 40); g.restore(); for (var i = 0; i < 6; i++) { g.fillRect(30 + Math.random() * 60, 130 + Math.random() * 20, 3, 10 + Math.random() * 28); } });
    var tDrop = cv(128, 128, function (g) { g.fillStyle = 'rgba(70,4,4,0.92)'; g.beginPath(); g.ellipse(64, 64, 40, 28, 0, 0, 7); g.fill(); for (var i = 0; i < 7; i++) { g.beginPath(); g.arc(64 + (Math.random() - .5) * 110, 64 + (Math.random() - .5) * 90, 2 + Math.random() * 6, 0, 7); g.fill(); } });
    var tRust = cv(64, 256, function (g, w, h) { var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(90,40,14,0.7)'); gr.addColorStop(1, 'rgba(60,28,10,0)'); g.fillStyle = gr; g.fillRect(18, 0, 10, h); g.fillRect(34, 0, 6, h * 0.7); g.fillRect(26, 0, 6, h * 0.9); });
    // cracked tiles
    decal(tCrack, 0.9, 0.9, 2.5, 1.0, 0.014, 0); decal(tCrack, 0.8, 0.8, 4.2, 0.9, 0.014, 0); decal(tCrack, 0.9, 0.9, 0.014, 1.0, 2.0, Math.PI / 2); decal(tCrack, 0.8, 0.8, W - 0.014, 1.0, 3.5, -Math.PI / 2); decal(tCrack, 1.0, 1.0, W * 0.4, 0.007, D * 0.55, 0, -Math.PI / 2);
    // handprints on tiles (low and smeared, leading toward the tub)
    decal(tHand, 0.26, 0.32, 3.4, 1.15, 0.014, 0).rotation.z = 0.2; decal(tHand, 0.26, 0.32, 3.75, 0.9, 0.014, 0).rotation.z = -0.15; decal(tHand, 0.26, 0.32, 4.15, 1.2, 0.014, 0).rotation.z = 0.1; decal(tHand, 0.26, 0.32, 0.014, 0.95, 3.4, Math.PI / 2); decal(tHand, 0.26, 0.32, 0.014, 1.2, 3.0, Math.PI / 2).rotation.z = 0.3;
    // sparse blood trail from the door to the tub, drops getting bigger
    for (var bt = 0; bt < 11; bt++) { var u = bt / 10; var dsz = 0.12 + u * 0.22 + (bt % 3) * 0.04; decal(tDrop, dsz, dsz * 0.8, 1.3 + u * (W - 3.7) + Math.sin(bt * 2.1) * 0.12, 0.009, D - 0.9 - u * (D - 1.9) + Math.cos(bt * 1.7) * 0.1, bt * 0.7, -Math.PI / 2); }

    var T = 0, fk = { seq: null, i: 0, t: 0, next: 4 };
    function update(dt) {
      T += dt;
      var f = flick[0], k = 1;
      if (!fk.seq && T >= fk.next) { fk.seq = [[0.07, 0.1], [0.09, 1], [0.05, 0.0], [0.06, 0.8], [0.04, 0.05], [0.25, 1]]; fk.i = 0; fk.t = T; }
      if (fk.seq) { var st = fk.seq[fk.i]; k = st[1]; if (T - fk.t >= st[0]) { fk.t = T; fk.i++; if (fk.i >= fk.seq.length) { fk.seq = null; fk.next = T + 6 + Math.random() * 9; k = 1; } } }
      f.L.intensity = f.base * k; var kk = 0.25 + 0.75 * k; f.bulb.color.setRGB(0.87 * kk, 0.94 * kk, kk);
      for (var j = 0; j < doors.length; j++) { var d = doors[j]; d.cur += (d.target - d.cur) * Math.min(1, dt * 4); d.mesh.rotation.y = d.cur; }
      var open = dd.target > 0.1; shut.x0 = open ? 9 : 0.5; shut.x1 = open ? 9.1 : 1.46;
      for (var q = 0; q < drips.length; q++) { var r = drips[q]; r.t += dt * (r.fast ? 2.6 : 1); var ph = r.t % 2.4, e = Math.max(0, ph - 1.3), y = r.y0 - 0.5 * 9.8 * e * e; r.m.visible = ph > 1.3 && y > 0.37; r.m.position.set(r.x, Math.max(0.37, y), 0.15); }
    }
    colliders.push(shut);
    return { group: G, update: update, interactables: interact, bounds: { room: { x0: 0, z0: 0, x1: W, z1: D, h: H }, colliders: colliders }, spawn: { x: 1.0, y: 1.6, z: D - 1.1, yaw: 0 }, size: { w: W, d: D, h: H } };
  }
  global.BathroomModule = { build: build, size: { w: W, d: D, h: H } };
})(typeof window !== 'undefined' ? window : this);
