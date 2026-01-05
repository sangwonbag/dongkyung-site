/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");

const ROOT = process.cwd();
const EXCEL_PATH = path.join(ROOT, "data", "products.xlsx");
const OUT_JSON = path.join(ROOT, "data", "products.json");

function main() {
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error("❌ products.xlsx not found:", EXCEL_PATH);
    process.exit(1);
  }

  const wb = xlsx.readFile(EXCEL_PATH);
  const sheet = wb.Sheets["products"];
  if (!sheet) {
    console.error("❌ Sheet name must be 'products'");
    process.exit(1);
  }

  const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

  const site = {
    phone: "02-487-9775",
    hours: "평일 07:00 - 18:00 / 주말 07:00 - 12:00",
    copyright: "ⓒ 2025 DongKyung Flooring. All rights reserved."
  };

  const products = rows.map((r) => ({
    id: String(r.id).trim(),
    category: r.category,
    brand: r.brand,
    series: r.series,
    code: r.code,
    spec: r.spec,
    unit: r.unit,
    price: Number(r.price),
    usage: r.usage,
    note: r.note,
    image: r.image
  }));

  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify({ site, products }, null, 2),
    "utf8"
  );

  console.log(`✅ Converted ${products.length} products → data/products.json`);
}

main();
