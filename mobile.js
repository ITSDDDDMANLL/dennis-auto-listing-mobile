const DEALER_CODE = "10904";
const PHONE_DISPLAY = "2️⃣3️⃣6️⃣•8️⃣7️⃣8️⃣•4️⃣9️⃣8️⃣7️⃣";
const DISCLAIMER = "Price does not include $699 documentation fee, $789 prep fee, taxes, or accessories.";

const rawInput = document.querySelector("#rawInput");
const priceInput = document.querySelector("#priceInput");
const transmissionInput = document.querySelector("#transmissionInput");
const titleOutput = document.querySelector("#titleOutput");
const bodyOutput = document.querySelector("#bodyOutput");
const fieldList = document.querySelector("#fieldList");
const statusEl = document.querySelector("#status");

const featureRules = [
  { test: /\bsahara\b/i, label: "Sahara Unlimited Package" },
  { test: /\bunlimited\b|\b4\s*door\b|\bfour\s*door\b/i, label: "4 Door Wrangler" },
  { test: /\bleather\b/i, label: "Leather Interior", title: "Leather" },
  { test: /\bheated\s+seat/i, label: "Heated Seats", title: "Heated Seats" },
  { test: /\bheated\s+(wheel|steering)/i, label: "Heated Steering Wheel" },
  { test: /\bbackup\s+camera\b|\brear\s+camera\b/i, label: "Backup Camera" },
  { test: /\bremote\s+start\b/i, label: "Remote Start", title: "Remote Start" },
  { test: /\bnavigation\b|\bnav\b/i, label: "Navigation", title: "Navigation" },
  { test: /\bsunroof\b|\bmoonroof\b/i, label: "Sunroof", title: "Sunroof" },
  { test: /\bbluetooth\b/i, label: "Bluetooth" },
  { test: /\balloy\b/i, label: "Alloy Wheels" },
  { test: /\bawd\b|\b4wd\b|\b4x4\b/i, label: "4x4" },
];

let currentDraft = null;

function normalizeInput(value) {
  return value.replace(/\bWranglet\b/gi, "Wrangler").replace(/\s+/g, " ").trim();
}

function titleCase(value) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => (/^(awd|fwd|rwd|4wd|4x4)$/i.test(word) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function parsePrice(rawValue, year, mileageValue) {
  const normalized = normalizeInput(rawValue);
  const explicitPrice = normalized.match(/(?:price|asking|ask|sale price)\s*[:\-]?\s*\$?\s*(\d{1,3}(?:,\d{3})+|\d{4,6})\b/i);
  const dollarPrice = normalized.match(/\$\s*(\d{1,3}(?:,\d{3})+|\d{4,6})\b/);
  const candidates = [];

  if (explicitPrice) candidates.push(explicitPrice[1]);
  if (dollarPrice) candidates.push(dollarPrice[1]);

  if (!candidates.length) {
    const numberMatches = [...normalized.matchAll(/\b(\d{1,3}(?:,\d{3})+|\d{4,6})\b/g)];
    for (const match of numberMatches) {
      const value = match[1];
      const compact = value.replace(/,/g, "");
      const after = normalized.slice(match.index + value.length, match.index + value.length + 8);
      if (value === year) continue;
      if (mileageValue && value === mileageValue.replace(/\s*km\b/i, "")) continue;
      if (/^\s*k?m\b/i.test(after)) continue;
      if (Number(compact) >= 1000 && Number(compact) <= 300000) candidates.push(value);
    }
  }

  return candidates[0] ? candidates[0].replace(/,/g, "") : "";
}

function stripPriceText(value) {
  return value
    .replace(/(?:price|asking|ask|sale price)\s*[:\-]?\s*\$?\s*(\d{1,3}(?:,\d{3})+|\d{4,6})\b/gi, "")
    .replace(/\$\s*(\d{1,3}(?:,\d{3})+|\d{4,6})\b/g, "")
    .replace(/\s*,\s*,/g, ",")
    .trim();
}

function parseVehicle(rawValue) {
  const normalized = normalizeInput(rawValue);
  const year = normalized.match(/\b(19|20)\d{2}\b/)?.[0] || "";
  const mileageWithUnit = normalized.match(/\b(\d{1,3}(?:,\d{3})+|\d{5,6})\s*kms?\b/i);
  const mileageMatch = mileageWithUnit || normalized.match(/\b\d{1,3}(?:,\d{3})+\b|\b\d{5,6}\b/);
  const mileageNumber = mileageWithUnit ? mileageWithUnit[1] : mileageMatch?.[0] || "";
  const mileage = mileageNumber ? `${mileageNumber} km` : "";
  const parsedPrice = parsePrice(normalized, year, mileage);

  let make = "";
  let model = "";
  const yearForward = year ? normalized.slice(normalized.indexOf(year) + year.length).trim() : normalized;
  const beforeMileage = mileageNumber ? yearForward.slice(0, yearForward.indexOf(mileageNumber)) : yearForward.split(",")[0];
  const nameParts = stripPriceText(beforeMileage).replace(/^[,.\s]+|[,.\s]+$/g, "").split(/\s+/).filter(Boolean);

  if (nameParts.length) {
    make = titleCase(nameParts[0]);
    model = titleCase(nameParts.slice(1).join(" "));
  }

  const features = unique(featureRules.filter((rule) => rule.test.test(normalized)).map((rule) => rule.label));
  if (/wrangler/i.test(model)) {
    if (!features.includes("Removable Top & Doors")) features.push("Removable Top & Doors");
    if (!features.includes("Off-Road Ready")) features.push("Off-Road Ready");
  }
  if (/\bwindshield\b/i.test(normalized) && /\b(fixed|repair|replace|replaced|repaired)\b/i.test(normalized)) {
    features.push("Windshield Will Be Replaced/Repaired");
  }

  const titleFeatures = unique(featureRules.filter((rule) => rule.title && rule.test.test(normalized)).map((rule) => rule.title));
  const titleName = [year, make, model].filter(Boolean).join(" ");

  return {
    year,
    make,
    model,
    mileage,
    mileageNumber: mileageNumber.replace(/,/g, ""),
    price: priceInput.value.trim() || parsedPrice,
    transmission: transmissionInput.value,
    features,
    title: [titleName, ...titleFeatures].filter(Boolean).join(" | "),
  };
}

function buildDescription(vehicle) {
  const detailRows = [
    ["Year", vehicle.year],
    ["Make", vehicle.make],
    ["Model", vehicle.model],
    ["Transmission", vehicle.transmission],
    ["Mileage", vehicle.mileage],
  ].filter(([, value]) => value);

  return [
    `Dealer #•${DEALER_CODE}`,
    "",
    "Key Highlights:",
    ...vehicle.features.map((feature) => `• ${feature}`),
    "",
    "Vehicle Details:",
    ...detailRows.map(([label, value]) => `• ${label}: ${value}`),
    "",
    `📞 ${PHONE_DISPLAY}`,
    "",
    "Disclaimer:",
    DISCLAIMER,
  ].join("\n");
}

function fieldRows(vehicle) {
  return [
    ["Title", vehicle.title],
    ["Price", vehicle.price],
    ["Year", vehicle.year],
    ["Make", vehicle.make],
    ["Model", vehicle.model],
    ["Mileage", vehicle.mileageNumber],
    ["Trans.", vehicle.transmission],
  ];
}

function setStatus(text) {
  statusEl.textContent = text;
  window.setTimeout(() => {
    statusEl.textContent = "Ready";
  }, 1400);
}

function generate() {
  const vehicle = parseVehicle(rawInput.value);
  if (!priceInput.value && vehicle.price) priceInput.value = vehicle.price;
  const description = buildDescription(vehicle);

  currentDraft = {
    raw: rawInput.value,
    title: vehicle.title,
    description,
    vehicle,
  };

  titleOutput.textContent = vehicle.title || "Vehicle Listing";
  bodyOutput.textContent = description;
  fieldList.innerHTML = "";

  for (const [label, value] of fieldRows(vehicle)) {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <span class="label"></span>
      <span class="value"></span>
      <button class="copyBtn" type="button">Copy</button>
    `;
    row.querySelector(".label").textContent = label;
    row.querySelector(".value").textContent = value || "-";
    row.querySelector("button").addEventListener("click", () => copyText(value || "", label));
    fieldList.append(row);
  }

  localStorage.setItem("mobileFbListingDraft", JSON.stringify(currentDraft));
  return currentDraft;
}

async function copyText(value, label) {
  if (!value) {
    setStatus("Empty");
    return;
  }
  await navigator.clipboard.writeText(value);
  setStatus(`${label} copied`);
}

function allText() {
  const draft = currentDraft || generate();
  return `${draft.title}\n\nPrice: ${draft.vehicle.price || ""}\nYear: ${draft.vehicle.year || ""}\nMake: ${draft.vehicle.make || ""}\nModel: ${draft.vehicle.model || ""}\nMileage: ${draft.vehicle.mileageNumber || ""}\n\n${draft.description}`;
}

document.querySelector("#generateBtn").addEventListener("click", () => {
  generate();
  setStatus("Generated");
});

document.querySelector("#copyAllBtn").addEventListener("click", () => copyText(allText(), "All"));
document.querySelector("#copyBodyBtn").addEventListener("click", () => copyText(bodyOutput.textContent, "Description"));

document.querySelector("#openMarketplaceBtn").addEventListener("click", () => {
  generate();
  window.open("https://www.facebook.com/marketplace/create/vehicle", "_blank", "noopener,noreferrer");
});

document.querySelector("#shareBtn").addEventListener("click", async () => {
  const text = allText();
  if (navigator.share) {
    await navigator.share({ title: currentDraft?.title || "Vehicle Listing", text });
  } else {
    await copyText(text, "All");
  }
});

rawInput.addEventListener("input", generate);
priceInput.addEventListener("input", generate);
transmissionInput.addEventListener("change", generate);

const saved = localStorage.getItem("mobileFbListingDraft");
if (saved) {
  try {
    const draft = JSON.parse(saved);
    if (draft.raw) rawInput.value = draft.raw;
    if (draft.vehicle?.price) priceInput.value = draft.vehicle.price;
    if (draft.vehicle?.transmission) transmissionInput.value = draft.vehicle.transmission;
  } catch {
    localStorage.removeItem("mobileFbListingDraft");
  }
}

generate();
