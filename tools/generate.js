/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function mustRead(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing file: ${filePath}`);
  return fs.readFileSync(filePath, "utf8");
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatKRW(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "-";
  return `${num.toLocaleString("ko-KR")}원`;
}

function safeId(id) {
  const s = String(id ?? "").trim().toLowerCase();
  if (!/^[a-z0-9-]+$/.test(s)) {
    throw new Error(`Invalid product.id "${id}". Use only a-z, 0-9, hyphen (-).`);
  }
  return s;
}

function render(template, dict) {
  let out = template;
  for (const [k, v] of Object.entries(dict)) {
    out = out.replaceAll(`{{${k}}}`, v);
  }
  return out;
}

function buildMaterialsIndex(products) {
  // 1) 카테고리별 그룹
  const groups = new Map();
  for (const p of products) {
    const cat = p.category || "기타";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(p);
  }

  // 2) 정렬: 카테고리명, 그 안에서 brand/series/code
  const sortedCats = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b, "ko"));
  for (const cat of sortedCats) {
    groups.get(cat).sort((a, b) => {
      const aa = `${a.brand || ""} ${a.series || ""} ${a.code || ""}`.trim();
      const bb = `${b.brand || ""} ${b.series || ""} ${b.code || ""}`.trim();
      return aa.localeCompare(bb, "ko");
    });
  }

  // 3) 테이블 섹션 HTML
  const sections = sortedCats
    .map((cat) => {
      const items = groups
        .get(cat)
        .map((p) => {
          const title = `${p.brand || ""} ${p.series || ""} ${p.code || ""}`.trim();
          const href = `./${safeId(p.id)}.html`;
          const price = formatKRW(p.price);

          const meta = [
            p.brand ? `브랜드: ${p.brand}` : null,
            p.series ? `시리즈: ${p.series}` : null,
            p.code ? `코드: ${p.code}` : null,
          ]
            .filter(Boolean)
            .join(" · ");

          return `
<tr>
  <td style="padding:12px;border-bottom:1px solid #eee;">
    <div style="font-weight:700;">${escapeHtml(title)}</div>
    <div style="margin-top:6px;font-size:12px;color:#666;line-height:1.4;">
      ${escapeHtml(meta || "")}
    </div>
    ${
      p.usage
        ? `<div style="margin-top:6px;font-size:12px;color:#888;">용도: ${escapeHtml(p.usage)}</div>`
        : ""
    }
  </td>

  <td style="padding:12px;border-bottom:1px solid #eee;color:#666;">
    ${escapeHtml(p.spec || "-")}
  </td>

  <td style="padding:12px;border-bottom:1px solid #eee;font-weight:700;">
    ${escapeHtml(price)}
  </td>

  <td style="padding:12px;border-bottom:1px solid #eee;">
    <a href="${href}" style="display:inline-block;border:1px solid #e5e5e5;background:#fff;padding:7px 10px;text-decoration:none;color:#222;">
      보기
    </a>
  </td>
</tr>`.trim();
        })
        .join("\n");

      return `
<h2 style="margin:28px 0 10px;font-size:18px;">${escapeHtml(cat)}</h2>

<table style="width:100%;border-collapse:collapse;">
  <thead>
    <tr>
      <th style="text-align:left;padding:12px;border-bottom:1px solid #ddd;background:#fafafa;width:45%;">제품</th>
      <th style="text-align:left;padding:12px;border-bottom:1px solid #ddd;background:#fafafa;width:30%;">규격</th>
      <th style="text-align:left;padding:12px;border-bottom:1px solid #ddd;background:#fafafa;width:15%;">가격</th>
      <th style="text-align:left;padding:12px;border-bottom:1px solid #ddd;background:#fafafa;width:10%;">링크</th>
    </tr>
  </thead>
  <tbody>
${items}
  </tbody>
</table>`.trim();
    })
    .join("\n\n");

  // ✅ 중요: 아래 <script> 안에서는 절대 백틱(`) 안 씀 (중첩 방지)
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>자재 목록 | 동경바닥재</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <style>
    .controls{
      max-width:960px;margin:0 auto 18px auto;padding:0;
      display:flex;gap:10px;flex-wrap:wrap;align-items:center;
    }
    .controls input{
      flex:1;min-width:240px;padding:10px 12px;border:1px solid #e5e5e5;border-radius:12px;font-size:14px;
    }
    .controls select{
      padding:10px 12px;border:1px solid #e5e5e5;border-radius:12px;font-size:14px;background:#fff;
    }
    .cats{display:flex;gap:8px;flex-wrap:wrap}
    .cats button{
      border:1px solid #e5e5e5;background:#fff;border-radius:999px;
      padding:8px 10px;font-size:13px;cursor:pointer;
    }
    .cats button.active{background:#111;color:#fff;border-color:#111}
  </style>
</head>

<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans KR',Arial,sans-serif;margin:0;background:#fff;color:#222;">
  <div style="max-width:960px;margin:0 auto;padding:32px 20px 80px;">
    <div style="display:flex;gap:12px;align-items:center;margin-bottom:18px;">
      <a href="../index.html" style="font-size:13px;color:#444;text-decoration:none;border:1px solid #e5e5e5;padding:8px 10px;background:#fafafa;">← 홈</a>
    </div>

    <h1 style="font-size:26px;margin:0 0 6px;">자재 목록</h1>
    <div style="font-size:14px;color:#666;margin:0 0 18px;">카테고리별로 정리된 기준표</div>

    <div class="controls">
      <input id="q" type="search" placeholder="검색: 제품명/브랜드/시리즈/코드" />
      <div id="cats" class="cats"></div>
      <select id="sort">
        <option value="default">정렬: 기본</option>
        <option value="price_asc">가격: 낮은→높은</option>
        <option value="price_desc">가격: 높은→낮은</option>
      </select>
    </div>

${sections}

    <div style="margin-top:60px;font-size:13px;color:#888;">※ 가격/재고는 현장 상황에 따라 변동될 수 있습니다.</div>
  </div>

  <script>
  (function () {
    var q = document.getElementById('q');
    var cats = document.getElementById('cats');
    var sort = document.getElementById('sort');

    var sections = [].slice.call(document.querySelectorAll('h2')).map(function (h2) {
      var table = h2.nextElementSibling;
      var tbody = table ? table.querySelector('tbody') : null;
      var rows = tbody ? [].slice.call(tbody.querySelectorAll('tr')) : [];
      return {
        h2: h2,
        table: table,
        tbody: tbody,
        rows: rows,
        cat: (h2.textContent || '').trim()
      };
    }).filter(function (s) { return s.table && s.tbody; });

    // 카테고리 버튼 생성 (백틱 금지)
    var catList = ['전체'].concat(sections.map(function (s) { return s.cat; }));
    cats.innerHTML = catList.map(function (c, i) {
      return '<button type="button" data-cat="' + c + '" class="' + (i === 0 ? 'active' : '') + '">' + c + '</button>';
    }).join('');

    function rowText(row) {
      return (row.textContent || '').replace(/\\s+/g, ' ').trim().toLowerCase();
    }

    function rowPrice(row) {
      var td = row.querySelector('td:nth-child(3)');
      var t = td ? td.textContent : '';
      var n = parseInt(String(t).replace(/[^\\d]/g, ''), 10);
      return isNaN(n) ? 0 : n;
    }

    function apply() {
      var query = (q.value || '').trim().toLowerCase();
      var activeBtn = cats.querySelector('button.active');
      var activeCat = activeBtn ? activeBtn.getAttribute('data-cat') : '전체';
      var mode = sort.value || 'default';

      sections.forEach(function (sec) {
        var showCat = (activeCat === '전체' || sec.cat === activeCat);

        if (!showCat) {
          sec.h2.style.display = 'none';
          sec.table.style.display = 'none';
          return;
        }

        // 정렬
        if (mode === 'price_asc') sec.rows.sort(function (a, b) { return rowPrice(a) - rowPrice(b); });
        if (mode === 'price_desc') sec.rows.sort(function (a, b) { return rowPrice(b) - rowPrice(a); });
        sec.rows.forEach(function (r) { sec.tbody.appendChild(r); });

        // 검색 필터
        var anyVisible = false;
        sec.rows.forEach(function (r) {
          var ok = (!query || rowText(r).indexOf(query) !== -1);
          r.style.display = ok ? '' : 'none';
          if (ok) anyVisible = true;
        });

        // 비면 섹션 숨김
        sec.h2.style.display = anyVisible ? '' : 'none';
        sec.table.style.display = anyVisible ? '' : 'none';
      });
    }

    cats.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      [].slice.call(cats.querySelectorAll('button')).forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      apply();
    });

    q.addEventListener('input', apply);
    sort.addEventListener('change', apply);

    apply();
  })();
  </script>
</body>
</html>`;
}

function main() {
  const dataPath = path.join(ROOT, "data", "products.json");
  const tplPath = path.join(ROOT, "templates", "material.html");
  const outDir = path.join(ROOT, "materials");

  const raw = mustRead(dataPath);
  const data = JSON.parse(raw);
  const site = data.site || {};
  const products = Array.isArray(data.products) ? data.products : [];

  if (products.length === 0) {
    console.log("No products found in data/products.json");
  }

  const template = mustRead(tplPath);
  ensureDir(outDir);

  // 각 상품 페이지 생성
  for (const p of products) {
    const pid = safeId(p.id);
    const title = `${p.brand || ""} ${p.series || ""} ${p.code || ""}`.trim();
    const filePath = path.join(outDir, `${pid}.html`);

    const html = render(template, {
      TITLE: escapeHtml(title),
      H1: escapeHtml(title),
      SUBTITLE: escapeHtml(`${p.category || ""} · ${p.usage || ""}`.replace(" · ", " · ").trim()),
      CATEGORY: escapeHtml(p.category || "-"),
      BRAND: escapeHtml(p.brand || "-"),
      SERIES: escapeHtml(p.series || "-"),
      CODE: escapeHtml(p.code || "-"),
      SPEC: escapeHtml(p.spec || "-"),
      UNIT: escapeHtml(p.unit || "-"),
      PRICE: escapeHtml(formatKRW(p.price)),
      USAGE: escapeHtml(p.usage || "-"),
      NOTE: escapeHtml(p.note || "-"),
      IMAGE: escapeHtml(p.image || "images/placeholder.jpg"),
      PHONE: escapeHtml(site.phone || "02-487-9775"),
      HOURS: escapeHtml(site.hours || ""),
      COPYRIGHT: escapeHtml(site.copyright || "")
    });

    fs.writeFileSync(filePath, html, "utf8");
  }

  // 자재 목록 페이지 생성
  const indexHtml = buildMaterialsIndex(products);
  fs.writeFileSync(path.join(outDir, "index.html"), indexHtml, "utf8");

  console.log(`Generated ${products.length} product pages + materials/index.html`);
}

main();
