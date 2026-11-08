const fs = require("fs/promises");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");

async function readJson(filename) {
  const filePath = path.join(DATA_DIR, filename);
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

async function writeJson(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

module.exports = { readJson, writeJson };