/* Kéo từ ô PnL của vị thế để tạo TP/SL.
   Long: kéo lên = TP, kéo xuống = SL. Short: ngược lại.
   Kéo ô PnL của TP/SL để dời, bấm × để huỷ.
   Line TP/SL kéo về trùng line entry (line PnL) -> xoá lệnh đó (SL hoặc TP). */
(function () {
  'use strict';
  var root = document.querySelector('.entry-preview');
  if (!root) return;

  // Chỉnh theo hợp đồng của bạn
  var C = { entry: 4763.30, point: 5, qty: 1, ppp: 8, tick: 0.25, pad: 14 }; // ppp = px / 1 điểm giá

  var side = root.dataset.side || 'long';
  var last = 4762.80;
  var entryY = parseFloat(getComputedStyle(root).getPropertyValue('--entry-y')) || 100;
  var posPnl = root.querySelector('.entry-pnl');
  var posPnlText = root.querySelector('.entry-pnl-text');
  var posQty = root.querySelector('.entry-quantity');
  var orders = { tp: null, sl: null };
  var drag = null;

  function fmt(n) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function money(v) { return (v < 0 ? '-$' : '$') + fmt(Math.abs(v)); }
  // Snap tâm tag (cao H px) để mép trên rơi đúng pixel màn hình -> viền TP/SL/PnL sắc nét, giống nhau ở mọi zoom
  var H = 26;
  // Làm tròn mọi kích thước của tag về pixel màn hình thật (zoom lẻ như 125% cũng không bị nhoè/lệch viền)
  function applyGrid() {
    var dpr = window.devicePixelRatio || 1;
    function q(v) { return Math.max(1, Math.round(v * dpr)) / dpr; }
    var line = dpr >= 2 ? 1 : Math.ceil(64 / dpr) / 64, cell = q(24); // viền = đúng 1 pixel màn hình (>=2x giữ 1px CSS)
    var vars = { '--line': line, '--cell-h': cell, '--w-pnl': q(108), '--w-qty': q(30), '--w-close': q(28), '--tag-w': q(85), '--tag-gap': q(16) };
    // Snap theo chiều ngang: mép phải của tag giá và của cụm [PnL | SL | ×] rơi đúng pixel màn hình
    var rr = root.getBoundingClientRect().right;
    function snapX(off) { return rr - Math.round((rr - off) * dpr) / dpr; } // off = khoảng cách từ mép phải root
    var gap = snapX(q(16));
    vars['--tag-gap'] = gap;
    for (var k in vars) root.style.setProperty(k, vars[k] + 'px');
    var tagsRight = snapX(gap + q(85) + q(window.innerWidth <= 520 ? 8 : 24));
    root.style.setProperty('--tags-right', tagsRight + 'px');
    H = cell + 2 * line;
    root.classList.toggle('px-snap', Math.abs(dpr - Math.round(dpr)) > 0.01);
  }
  function snapY(y) {
    var dpr = window.devicePixelRatio || 1, top = root.getBoundingClientRect().top;
    return Math.round((top + y - H / 2) * dpr) / dpr - top + H / 2;
  }
  function yFor(p) { return snapY(entryY - (p - C.entry) * C.ppp); }
  function snapEntry() {
    applyGrid();
    root.style.removeProperty('--entry-y');
    entryY = parseFloat(getComputedStyle(root).getPropertyValue('--entry-y')) || 100;
    entryY = snapY(entryY);
    root.style.setProperty('--entry-y', entryY + 'px');
    ['tp', 'sl'].forEach(function (t) { if (orders[t]) render(orders[t]); });
  }
  function snap(p) { return Math.round(p / C.tick) * C.tick; }
  function est(p) { return (side === 'long' ? p - C.entry : C.entry - p) * C.point * C.qty; }
  function clampY(y) { return Math.min(Math.max(y, C.pad), root.clientHeight - C.pad); }
  function priceFor(y) { return snap(C.entry + (entryY - clampY(y)) / C.ppp); }

  // TP phải nằm phía lãi, SL phía lỗ (cách entry ít nhất 1 tick)
  function valid(type, p) {
    var profit = side === 'long' ? 1 : -1;
    var dir = type === 'tp' ? profit : -profit;
    if ((p - C.entry) * dir < C.tick) p = C.entry + dir * C.tick;
    return p;
  }

  function render(o) {
    o.el.style.setProperty('--y', yFor(o.price) + 'px');
    o.pnl.textContent = '~ ' + money(est(o.price));
    o.px.textContent = fmt(o.price);
  }
  function removeOrder(o) { if (!o) return; o.el.remove(); orders[o.type] = null; }
  function clearOrders() { removeOrder(orders.tp); removeOrder(orders.sl); }

  function makeOrder(type) {
    var el = document.createElement('div');
    el.className = 'order ' + type;
    el.innerHTML =
      '<div class="order-line"></div>' +
      '<div class="order-tag">' +
        '<div class="order-pnl" title="Kéo để dời ' + (type === 'tp' ? 'Take Profit' : 'Stop Loss') + '"><span class="order-grip"></span><span class="order-pnl-text"></span></div>' +
        '<div class="order-qty">' + C.qty + '</div>' +
        '<button class="order-close" type="button" aria-label="Huỷ ' + (type === 'tp' ? 'TP' : 'SL') + '">×</button>' +
      '</div>' +
      '<div class="order-price"></div>';
    root.appendChild(el);
    var o = { type: type, el: el, price: C.entry, pnl: el.querySelector('.order-pnl-text'), px: el.querySelector('.order-price') };
    el.querySelector('.order-pnl').addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return; e.preventDefault(); startDrag({ mode: 'move', o: o, base: yFor(o.price) }, e);
    });
    el.querySelector('.order-close').addEventListener('click', function () { removeOrder(o); });
    orders[type] = o;
    return o;
  }

  function startDrag(d, e) { d.startY = e.clientY - root.getBoundingClientRect().top; drag = d; document.body.classList.add('entry-dragging'); }

  posPnl.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return; e.preventDefault(); startDrag({ mode: 'create', made: {}, base: entryY }, e);
  });

  window.addEventListener('pointermove', function (e) {
    if (!drag) return;
    // Mọi thứ tính theo LINE (không theo tag): line của lệnh = vị trí gốc + quãng chuột đã kéo
    var y = drag.base + (e.clientY - root.getBoundingClientRect().top - drag.startY);
    // Line TP/SL trùng line entry (cách < 1 tick) -> XOÁ lệnh đó. Tag có thể chồng lên ô PnL, chưa xoá khi line chưa trùng.
    var inPnlZone = Math.abs(y - entryY) < C.ppp * C.tick;
    var lineType = ((y < entryY) === (side === 'long')) ? 'tp' : 'sl';   // line nằm phía lãi = TP, phía lỗ = SL
    if (drag.mode === 'move') {
      if (inPnlZone || lineType !== drag.o.type) { removeOrder(drag.o); endDrag(); return; }  // trùng hoặc vượt qua entry line
      drag.o.price = valid(drag.o.type, priceFor(y));
      render(drag.o);
      return;
    }
    // create: line chưa rời khỏi entry line thì chưa tạo; kéo ngược về trùng entry line thì xoá
    if (inPnlZone) {
      if (drag.type && orders[drag.type]) { removeOrder(orders[drag.type]); drag.made[drag.type] = false; }
      return;
    }
    var p = priceFor(y);
    var type = lineType;
    // Hướng kéo đầu tiên quyết định TP hay SL và được khoá cho tới khi thả chuột:
    // kéo xuống (Long) chỉ điều khiển SL; kéo ngược lên chỉ để tắt SL, không bao giờ tạo/đụng tới TP.
    if (!drag.type) drag.type = type;
    if (type !== drag.type) {            // đã vượt sang phía bên kia entry -> tắt lệnh vừa tạo, không làm gì khác
      if (orders[drag.type]) { removeOrder(orders[drag.type]); drag.made[drag.type] = false; }
      return;
    }
    var o = orders[type];
    if (!o) { o = makeOrder(type); drag.made[type] = true; }
    o.price = valid(type, p);
    render(o);
  });

  function endDrag() { drag = null; document.body.classList.remove('entry-dragging'); }
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  root.querySelector('.entry-close').addEventListener('click', function () { clearOrders(); root.classList.add('closed'); });

  function setPrice(p) {
    last = p;
    var v = (side === 'long' ? p - C.entry : C.entry - p) * C.point * C.qty;
    posPnlText.textContent = (v < 0 ? '-$' : '$') + fmt(Math.abs(v));
    root.dataset.pnl = v < 0 ? 'loss' : 'win';
  }
  function setSide(s) {
    side = s; root.dataset.side = s;
    posQty.textContent = (s === 'short' ? '-' : '') + C.qty;
    clearOrders(); setPrice(last);
  }

  window.entryOverlay = {
    setPrice: setPrice,
    setSide: setSide,
    clearOrders: clearOrders,
    setClosed: function (b) { root.classList.toggle('closed', !!b); if (b) clearOrders(); }
  };
  setPrice(last);
  snapEntry();
  window.addEventListener('resize', snapEntry);
})();
