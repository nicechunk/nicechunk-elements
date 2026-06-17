import { initI18n, t } from "../src/i18n.js";
import { elementCategories, elementNameKey, elementsCatalog } from "../src/elementsCatalog.js";
import { blockAtlas } from "../src/data/blockAtlas.js";
import { elementDefinitionsBySymbol } from "../src/data/elements.js";
import "./style.css";
import "../src/site-header.css";
import { finishSiteLoading, setSiteLoadingProgress } from "../src/site-ui.js";

const tableView = document.querySelector("#tableView");
const detailView = document.querySelector("#detailView");
const table = document.querySelector("#periodicTable");
const detailRoot = document.querySelector("#elementDetailPage");
const legend = document.querySelector("#categoryLegend");
const categoryFilter = document.querySelector("#categoryFilter");
const elementStats = document.querySelector("#elementStats");
const protocolCards = document.querySelector("#elementProtocolCards");

let activeCategory = "all";

const discoveredElementSymbols = new Set(
  blockAtlas.flatMap((entry) => (entry.composition ?? []).map(([symbol]) => symbol)),
);
const discoveredElementCount = elementsCatalog.filter((element) => discoveredElementSymbols.has(element.symbol)).length;

setSiteLoadingProgress(34);
await initI18n();
setSiteLoadingProgress(58);
renderElementsPage();
finishSiteLoading();

window.addEventListener("nicechunk:languagechange", renderElementsPage);
window.addEventListener("popstate", renderElementsPage);

function renderElementsPage() {
  renderStats();
  renderCategoryFilters();
  renderProtocolCards();
  renderLegend();
  renderPeriodicTable();

  const symbol = routeSymbol();
  if (symbol) {
    renderDetailRoute(symbol);
  } else {
    showTableRoute();
  }
}

function renderStats() {
  const naturalCount = elementsCatalog.filter((element) => element.naturalOccurrence).length;
  const cards = [
    ["elements.page.stat.discovered", `${discoveredElementCount}/${elementsCatalog.length}`],
    ["elements.page.stat.elements", elementsCatalog.length],
    ["elements.page.stat.categories", elementCategories.length],
    ["elements.page.stat.natural", naturalCount],
    ["elements.page.stat.versioned", "v1"],
  ];

  elementStats.replaceChildren(
    ...cards.map(([labelKey, value]) => {
      const card = document.createElement("article");
      const valueNode = document.createElement("strong");
      valueNode.textContent = String(value);
      const label = document.createElement("span");
      label.textContent = t(labelKey);
      card.append(valueNode, label);
      return card;
    }),
  );
}

function renderCategoryFilters() {
  const options = ["all", ...elementCategories];
  categoryFilter.replaceChildren(
    ...options.map((category) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "filter-chip";
      button.classList.toggle("active", category === activeCategory);
      button.textContent = category === "all" ? t("elements.page.filterAll") : t(`elements.category.${category}`);
      button.setAttribute("aria-pressed", String(category === activeCategory));
      button.addEventListener("click", () => {
        activeCategory = category;
        renderCategoryFilters();
        renderPeriodicTable();
      });
      return button;
    }),
  );
}

function renderProtocolCards() {
  const notes = ["resourceGene", "forgingInput", "visualGene", "verification"];
  protocolCards.replaceChildren(
    ...notes.map((key, index) => {
      const card = document.createElement("article");
      card.className = "protocol-card";
      const indexNode = document.createElement("span");
      indexNode.textContent = `0${index + 1}`;
      const title = document.createElement("strong");
      title.textContent = t(`elements.page.protocol.${key}.title`);
      const body = document.createElement("p");
      body.textContent = t(`elements.page.protocol.${key}.body`);
      card.append(indexNode, title, body);
      return card;
    }),
  );
}

function renderLegend() {
  legend.replaceChildren(
    ...elementCategories.map((category) => {
      const item = document.createElement("span");
      item.className = `legend-item category-${category}`;
      const swatch = document.createElement("i");
      swatch.setAttribute("aria-hidden", "true");
      const label = document.createElement("span");
      label.textContent = t(`elements.category.${category}`);
      item.append(swatch, label);
      return item;
    }),
  );
}

function renderPeriodicTable() {
  table.replaceChildren(
    ...elementsCatalog.map((element) => {
      const name = catalogDisplayName(element);
      const isDiscovered = discoveredElementSymbols.has(element.symbol);
      const button = document.createElement("button");
      button.className = `element-cell category-${element.category}`;
      button.classList.toggle("discovered", isDiscovered);
      button.classList.toggle("undiscovered", !isDiscovered);
      button.classList.toggle("muted", activeCategory !== "all" && activeCategory !== element.category);
      button.type = "button";
      button.dataset.symbol = element.symbol;
      button.style.gridColumn = String(element.tableColumn);
      button.style.gridRow = String(element.tableRow);
      button.setAttribute("aria-label", t("elements.page.elementAria", { name, symbol: element.symbol, atomicNumber: element.atomicNumber }));
      button.addEventListener("click", () => navigateToElement(element.symbol));

      const number = document.createElement("span");
      number.className = "atomic-number";
      number.textContent = String(element.atomicNumber);
      const symbol = document.createElement("strong");
      symbol.textContent = element.symbol;
      const title = document.createElement("span");
      title.className = "element-name";
      title.textContent = name;
      button.append(number, symbol, title);
      return button;
    }),
  );
}

function showTableRoute() {
  document.title = t("elements.page.title");
  tableView.hidden = false;
  detailView.hidden = true;
  table.querySelectorAll(".element-cell").forEach((cell) => cell.classList.remove("active"));
}

function renderDetailRoute(rawSymbol) {
  const catalogElement = findCatalogElement(rawSymbol);
  const symbol = catalogElement?.symbol ?? rawSymbol;
  const definition = elementDefinitionsBySymbol[symbol];

  tableView.hidden = true;
  detailView.hidden = false;
  table.querySelectorAll(".element-cell").forEach((cell) => {
    cell.classList.toggle("active", cell.dataset.symbol === symbol);
  });

  if (!definition) {
    const displayName = catalogElement ? catalogDisplayName(catalogElement) : symbol;
    document.title = t("elements.detail.missingTitle", { symbol });
    renderMissingDetail(symbol, displayName);
    return;
  }

  document.title = t("elements.detail.documentTitle", { symbol: definition.symbol, name: elementDisplayName(definition) });
  renderElementDetail(definition);
}

function renderMissingDetail(symbol, displayName) {
  const card = document.createElement("article");
  card.className = "missing-detail";
  const symbolText = document.createElement("strong");
  symbolText.textContent = symbol;
  const title = document.createElement("h1");
  title.textContent = displayName;
  const zh = document.createElement("p");
  zh.textContent = t("elements.detail.missingZh");
  const en = document.createElement("p");
  en.textContent = t("elements.detail.missingEn");
  card.append(symbolText, title, zh, en);
  detailRoot.replaceChildren(card);
}

function renderElementDetail(element) {
  const hero = document.createElement("section");
  hero.className = "element-file-hero";
  hero.classList.add(`category-${categoryKeyFromDefinition(element)}`);
  hero.append(renderHeroSymbol(element), renderHeroSummary(element));

  const cards = [
    sectionCard("elements.detail.sections.identity", [
      valueRow("elements.detail.field.id", element.id),
      valueRow("elements.detail.field.atomicNumber", element.atomicNumber),
      valueRow("elements.detail.field.symbol", element.symbol),
      valueRow("elements.detail.field.name", elementDisplayName(element)),
      valueRow("elements.detail.field.category", categoryLabel(element.identity.category)),
      valueRow("elements.detail.field.period", element.identity.period),
      valueRow("elements.detail.field.group", element.identity.group),
      valueRow("elements.detail.field.block", element.identity.block),
      valueRow("elements.detail.field.standardState", stateLabel(element.identity.standardState)),
      boolRow("elements.detail.field.naturalOccurrence", element.identity.naturalOccurrence),
    ]),
    sectionCard("elements.detail.sections.atomic", [
      valueRow("elements.detail.field.atomicMass", element.atomic.atomicMass),
      unitRow("elements.detail.field.atomicRadiusPm", element.atomic.atomicRadiusPm, "pm"),
      unitRow("elements.detail.field.covalentRadiusPm", element.atomic.covalentRadiusPm, "pm"),
      valueRow("elements.detail.field.electronConfig", element.atomic.electronConfig),
      valueRow("elements.detail.field.valenceElectrons", element.atomic.valenceElectrons),
      chipsRow("elements.detail.field.commonOxidationStates", element.atomic.commonOxidationStates),
      valueRow("elements.detail.field.maxOxidationState", element.atomic.maxOxidationState),
      valueRow("elements.detail.field.minOxidationState", element.atomic.minOxidationState),
    ]),
    sectionCard("elements.detail.sections.physical", [
      unitRow("elements.detail.field.densityKgM3", element.physical.densityKgM3, "kg/m³"),
      valueRow("elements.detail.field.referenceDimensions", formatDimensions(element.physical.referenceDimensionsM)),
      unitRow("elements.detail.field.referenceMassKg", element.physical.referenceMassKg, "kg"),
      unitRow("elements.detail.field.meltingPointC", element.physical.meltingPointC, "°C"),
      unitRow("elements.detail.field.boilingPointC", element.physical.boilingPointC, "°C"),
      scoreRow("elements.detail.field.hardness", element.physical.hardness),
      scoreRow("elements.detail.field.toughness", element.physical.toughness),
      scoreRow("elements.detail.field.ductility", element.physical.ductility),
      scoreRow("elements.detail.field.brittleness", element.physical.brittleness),
      scoreRow("elements.detail.field.electricalConductivity", element.physical.electricalConductivity),
      scoreRow("elements.detail.field.thermalConductivity", element.physical.thermalConductivity),
      scoreRow("elements.detail.field.heatResistance", element.physical.heatResistance),
      scoreRow("elements.detail.field.magnetism", element.physical.magnetism),
      scoreRow("elements.detail.field.transparencyTendency", element.physical.transparencyTendency),
    ]),
    sectionCard("elements.detail.sections.chemical", [
      valueRow("elements.detail.field.electronegativity", element.chemical.electronegativity),
      scoreRow("elements.detail.field.reactivity", element.chemical.reactivity),
      scoreRow("elements.detail.field.stability", element.chemical.stability),
      scoreRow("elements.detail.field.oxidationTendency", element.chemical.oxidationTendency),
      scoreRow("elements.detail.field.corrosiveness", element.chemical.corrosiveness),
      scoreRow("elements.detail.field.toxicity", element.chemical.toxicity),
      scoreRow("elements.detail.field.radioactivity", element.chemical.radioactivity),
      scoreRow("elements.detail.field.flammability", element.chemical.flammability),
      scoreRow("elements.detail.field.explosiveTendency", element.chemical.explosiveTendency),
      signedRow("elements.detail.field.acidBaseTendency", element.chemical.acidBaseTendency),
    ]),
    sectionCard("elements.detail.sections.game", Object.entries(element.game).map(([key, value]) => scoreRow(`elements.detail.field.${key}`, value))),
    sectionCard("elements.detail.sections.processing", [
      unitRow("elements.detail.field.requiredTemperatureC", element.processing.requiredTemperatureC, "°C"),
      valueRow("elements.detail.field.minFurnaceTier", element.processing.minFurnaceTier),
      valueRow("elements.detail.field.minToolTier", element.processing.minToolTier),
      valueRow("elements.detail.field.requiredFuelTier", element.processing.requiredFuelTier),
      boolRow("elements.detail.field.oxygenSensitive", element.processing.oxygenSensitive),
      boolRow("elements.detail.field.waterSensitive", element.processing.waterSensitive),
      boolRow("elements.detail.field.requiresInertAtmosphere", element.processing.requiresInertAtmosphere),
      boolRow("elements.detail.field.forgeable", element.processing.forgeable),
      boolRow("elements.detail.field.castable", element.processing.castable),
      boolRow("elements.detail.field.crystallizable", element.processing.crystallizable),
      boolRow("elements.detail.field.alloyable", element.processing.alloyable),
      chipsRow("elements.detail.field.preferredProcesses", element.processing.preferredProcesses, localizedProcess),
      ...Object.entries(element.processing.processingRisks).map(([key, value]) => scoreRow(`elements.detail.field.risk.${key}`, value)),
    ]),
    sectionCard("elements.detail.sections.affinity", Object.entries(element.affinity).map(([key, value]) => scoreRow(`elements.detail.field.${key}`, value))),
    sectionCard("elements.detail.sections.visualGene", [
      colorRow("elements.detail.field.baseColor", element.visualGene.baseColor),
      colorRow("elements.detail.field.secondaryColor", element.visualGene.secondaryColor),
      colorRow("elements.detail.field.oxidizedColor", element.visualGene.oxidizedColor),
      colorRow("elements.detail.field.darkStateColor", element.visualGene.darkStateColor),
      colorRow("elements.detail.field.emissionColor", element.visualGene.emissionColor),
      valueRow("elements.detail.field.materialLook", localizedVisual(element.visualGene.materialLook)),
      valueRow("elements.detail.field.textureType", localizedVisual(element.visualGene.textureType)),
      valueRow("elements.detail.field.oreTextureType", localizedVisual(element.visualGene.oreTextureType)),
      scalarRow("elements.detail.field.metallic", element.visualGene.metallic),
      scalarRow("elements.detail.field.roughness", element.visualGene.roughness),
      scalarRow("elements.detail.field.transparency", element.visualGene.transparency),
      scalarRow("elements.detail.field.emissionStrength", element.visualGene.emissionStrength),
      scalarRow("elements.detail.field.grain", element.visualGene.grain),
      scalarRow("elements.detail.field.scratchDensity", element.visualGene.scratchDensity),
      scalarRow("elements.detail.field.veinDensity", element.visualGene.veinDensity),
      scalarRow("elements.detail.field.crackDensity", element.visualGene.crackDensity),
      scalarRow("elements.detail.field.oxidationPattern", element.visualGene.oxidationPattern),
      valueRow("elements.detail.field.particleEffect", localizedVisual(element.visualGene.particleEffect)),
      valueRow("elements.detail.field.animationEffect", localizedVisual(element.visualGene.animationEffect)),
    ]),
    descriptionCard(element),
  ];

  const grid = document.createElement("section");
  grid.className = "detail-card-grid";
  grid.append(...cards);
  detailRoot.replaceChildren(hero, grid);
}

function renderHeroSymbol(element) {
  const panel = document.createElement("div");
  panel.className = "hero-symbol-panel";
  panel.style.setProperty("--element-glow", element.visualGene.emissionColor);
  panel.style.setProperty("--element-base", element.visualGene.baseColor);
  panel.style.setProperty("--element-secondary", element.visualGene.secondaryColor);
  panel.style.setProperty("--element-oxidized", element.visualGene.oxidizedColor);
  panel.style.setProperty("--element-dark", element.visualGene.darkStateColor);
  panel.style.setProperty("--element-metallic", String(element.visualGene.metallic));
  panel.style.setProperty("--element-roughness", String(element.visualGene.roughness));
  panel.style.setProperty("--element-grain", String(element.visualGene.grain));

  const stage = document.createElement("div");
  stage.className = "element-cube-stage";
  stage.setAttribute("aria-label", `${element.atomicNumber} ${element.symbol} ${elementDisplayName(element)}`);

  const cube = document.createElement("div");
  cube.className = "element-cube";

  const front = cubeFace("front");
  const number = document.createElement("span");
  number.className = "cube-number";
  number.textContent = String(element.atomicNumber);
  const symbol = document.createElement("strong");
  symbol.className = "cube-symbol";
  symbol.textContent = element.symbol;
  const names = document.createElement("p");
  names.className = "cube-name";
  names.textContent = elementDisplayName(element);
  fitCubeText(names, { max: 1.12, min: 0.62, threshold: 11, step: 0.045 });
  front.append(number, symbol, names);

  const back = cubeFace("back");
  back.append(cubeFaceLabel(t("elements.detail.field.atomicMass")), cubeFaceValue(element.atomic.atomicMass));
  const right = cubeFace("right");
  right.append(cubeFaceLabel(t("elements.detail.field.category")), cubeFaceValue(categoryLabel(element.identity.category)));
  const left = cubeFace("left");
  left.append(cubeFaceLabel(t("elements.detail.field.materialLook")), cubeFaceValue(localizedVisual(element.visualGene.materialLook)));
  const top = cubeFace("top");
  top.append(cubeFaceLabel(t("elements.detail.field.textureType")), cubeFaceValue(localizedVisual(element.visualGene.textureType)));
  const bottom = cubeFace("bottom");
  bottom.append(cubeFaceLabel(t("elements.detail.field.rarity")), cubeFaceValue(scoreText(element.game.rarity)));

  cube.append(front, back, right, left, top, bottom);
  stage.append(cube);
  panel.append(stage);
  return panel;
}

function cubeFace(position) {
  const face = document.createElement("div");
  face.className = `cube-face cube-${position}`;
  return face;
}

function cubeFaceLabel(value) {
  const label = document.createElement("span");
  label.className = "cube-face-label";
  label.textContent = value;
  return label;
}

function cubeFaceValue(value) {
  const output = document.createElement("strong");
  output.className = "cube-face-value";
  output.textContent = valueText(value);
  fitCubeText(output, { max: 1.1, min: 0.5, threshold: 11, step: 0.035 });
  return output;
}

function fitCubeText(node, { max, min, threshold, step }) {
  const length = Array.from(node.textContent.trim()).length;
  const fontSize = Math.max(min, max - Math.max(0, length - threshold) * step);
  node.style.fontSize = `${fontSize.toFixed(2)}rem`;
}

function renderHeroSummary(element) {
  const panel = document.createElement("div");
  panel.className = "hero-summary-panel";
  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = t("elements.detail.fileEyebrow");
  const title = document.createElement("h1");
  title.textContent = elementDisplayName(element);
  const description = document.createElement("p");
  description.textContent = localizedDescription(element, "short");
  const meta = document.createElement("div");
  meta.className = "hero-meta-grid";
  meta.append(
    metaItem("elements.detail.field.atomicNumber", element.atomicNumber),
    metaItem("elements.detail.field.category", categoryLabel(element.identity.category)),
    metaItem("elements.detail.field.standardState", stateLabel(element.identity.standardState)),
    metaItem("elements.detail.field.rarity", scoreText(element.game.rarity)),
    metaItem("elements.detail.field.baseValue", scoreText(element.game.baseValue)),
  );
  panel.append(eyebrow, title, description, meta);
  return panel;
}

function sectionCard(titleKey, rows) {
  const card = document.createElement("article");
  card.className = "detail-card";
  const title = document.createElement("h2");
  title.textContent = t(titleKey);
  const list = document.createElement("div");
  list.className = "detail-row-list";
  list.append(...rows);
  card.append(title, list);
  return card;
}

function descriptionCard(element) {
  const card = document.createElement("article");
  card.className = "detail-card description-card";
  const title = document.createElement("h2");
  title.textContent = t("elements.detail.sections.description");
  const summary = document.createElement("p");
  summary.textContent = localizedDescription(element, "short");
  const role = document.createElement("p");
  role.textContent = localizedDescription(element, "gameplayRole");
  card.append(title, summary, role);
  return card;
}

function valueRow(labelKey, value) {
  return baseRow(labelKey, valueText(value));
}

function unitRow(labelKey, value, unit) {
  return baseRow(labelKey, value == null ? t("elements.detail.notAvailable") : `${valueText(value)} ${unit}`);
}

function boolRow(labelKey, value) {
  return baseRow(labelKey, value ? t("elements.detail.yes") : t("elements.detail.no"), "bool-row");
}

function scoreRow(labelKey, value) {
  const row = baseRow(labelKey, scoreText(value), "score-row");
  row.append(progressBar(value));
  return row;
}

function scalarRow(labelKey, value) {
  const score = Math.round(Number(value) * 100);
  const row = baseRow(labelKey, valueText(value), "score-row");
  row.append(progressBar(score));
  return row;
}

function signedRow(labelKey, value) {
  const row = baseRow(labelKey, valueText(value), "score-row");
  row.append(progressBar(Math.abs(Number(value))));
  return row;
}

function chipsRow(labelKey, values = [], formatValue = String) {
  const row = baseRow(labelKey, "", "chip-row");
  const chips = document.createElement("div");
  chips.className = "chips";
  if (!values.length) {
    const chip = document.createElement("span");
    chip.textContent = t("elements.detail.notAvailable");
    chips.append(chip);
  }
  values.forEach((value) => {
    const chip = document.createElement("span");
    chip.textContent = formatValue(value);
    chips.append(chip);
  });
  row.append(chips);
  return row;
}

function colorRow(labelKey, value) {
  const row = baseRow(labelKey, value, "color-row");
  const swatch = document.createElement("i");
  swatch.style.background = value;
  row.append(swatch);
  return row;
}

function baseRow(labelKey, value, className = "") {
  const row = document.createElement("div");
  row.className = `detail-row ${className}`.trim();
  const label = document.createElement("span");
  label.className = "detail-label";
  label.textContent = t(labelKey);
  const output = document.createElement("strong");
  output.className = "detail-value";
  output.textContent = value;
  row.append(label, output);
  return row;
}

function metaItem(labelKey, value) {
  const item = document.createElement("div");
  const label = document.createElement("span");
  label.textContent = t(labelKey);
  const output = document.createElement("strong");
  output.textContent = String(value);
  item.append(label, output);
  return item;
}

function progressBar(value) {
  const wrapper = document.createElement("div");
  wrapper.className = "progress-track";
  const bar = document.createElement("i");
  bar.style.width = `${Math.max(0, Math.min(100, Number(value) || 0))}%`;
  wrapper.append(bar);
  return wrapper;
}

function navigateToElement(symbol) {
  history.pushState({}, "", `/elements/${symbol}`);
  renderElementsPage();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function routeSymbol() {
  const match = window.location.pathname.match(/^\/elements\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : "";
}

function findCatalogElement(symbol) {
  const normalized = symbol.toLowerCase();
  return elementsCatalog.find((element) => element.symbol.toLowerCase() === normalized);
}

function valueText(value) {
  return value == null ? t("elements.detail.notAvailable") : String(value);
}

function formatDimensions(dimensionsM) {
  return [dimensionsM.width, dimensionsM.height, dimensionsM.depth]
    .map((value) => `${valueText(value)} m`)
    .join(" x ");
}

function scoreText(value) {
  return `${valueText(value)} / 100`;
}

function elementDisplayName(element) {
  return translatedElementName(element.symbol, element.name);
}

function localizedDescription(element, field) {
  const key = `elements.description.${element.symbol}.${field}`;
  const translated = t(key);
  return translated === key ? (element.description[field] ?? "") : translated;
}

function categoryKeyFromDefinition(element) {
  return element.identity.category ?? "unknown_properties";
}

function catalogDisplayName(element) {
  return translatedElementName(element.symbol, element.name);
}

function translatedElementName(symbol, fallback) {
  const key = elementNameKey(symbol);
  const translated = t(key);
  return translated === key ? fallback : translated;
}

function categoryLabel(category) {
  const key = `elements.category.${category}`;
  const translated = t(key);
  return translated === key ? category : translated;
}

function stateLabel(state) {
  const key = `elements.state.${state}`;
  const translated = t(key);
  return translated === key ? state : translated;
}

function localizedProcess(process) {
  const key = `elements.process.${process}`;
  const translated = t(key);
  return translated === key ? process : translated;
}

function localizedVisual(value) {
  const key = `elements.visual.${value}`;
  const translated = t(key);
  return translated === key ? value : translated;
}
