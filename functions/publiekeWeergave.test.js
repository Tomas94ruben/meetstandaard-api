import { test } from "node:test";
import assert from "node:assert/strict";
import { publiekeWeergave, filterTekst, isVrijeTekst } from "./publiekeWeergave.js";
import { STANDAARDEN, handleMeetstandaard } from "./meetstandaard.js";
import { fakeFirestore, fakeResponse } from "./versionedResource.test.js";

const VERBODEN = /needs verification|\(nv\)|wiki\/|raw\/|tabblad|werkbestand|werkblad|\b(?:Bart(?:s)?|Gijs|Maas)\b|Besluit[^.;)]{0,40}20\d\d[-–]\d\d|aannamescore|onderbouwingHerschreven|Eerder stond|\bA-\d{2}[a-z]?\b|\bBM-\d|\brij\s+\d|\S+\.(?:md|xlsx|docx|pdf|txt)\b|besluit (?:gebruiker|opdrachtgever)|sinds 20\d\d-\d\d-\d\d|bijgewerkt 20\d\d|kennisbank/i;
// Independent contract oracle: removing editorial metadata is the only exception
// to equality. Every retained number/null, array index and object is checked.
const weg = (key, parent, waarde) => (["aannamescore", "onderbouwingHerschreven", "document", "audit",
  "bronbedragVastgesteld", "generatedBy", "bestand", "wikipagina"].includes(key)
  && !(key === "bestand" && typeof waarde === "string" && /^https?:\/\//i.test(waarde)))
  || (key === "toelichting" && ["stellingen", "situatieschetsen"].includes(parent));
const eigenMarkering = (x) => typeof x === "string" ? /needs verification|\(nv\)/i.test(x)
  : Array.isArray(x) && x.some(eigenMarkering);

const controleer = (volledig, publiek, pad = []) => {
  const naam = pad.join(".");
  if (typeof volledig === "string") {
    assert.equal(typeof publiek, "string", naam);
    assert.doesNotMatch(publiek, /Google Drive|Onderbouwingsdocument|de opsteller,/i, naam);
    const kleineZinsstarts = (tekst) => (tekst.match(/\. \p{Ll}/gu) || []).length;
    // Backticks are stripped for readers, so ". `veldnaam`" legitimately becomes ". veldnaam".
    assert.ok(kleineZinsstarts(publiek) <= kleineZinsstarts(volledig.replace(/`/g, "")), `${naam}: new lowercase sentence start`);
    const key = pad.filter((deel) => typeof deel === "string").at(-1);
    for (const url of volledig.match(/https?:\/\/[^\s)\]]+/g) || []) {
      assert.ok(publiek.includes(url), `${naam}: URL lost ${url}`);
    }
    // Independent citation oracle excludes local paths and editorial dates.
    const citatie = volledig.replace(/20\d\d-\d\d-\d\d/g, "")
      .replace(/\S+\.(?:md|txt|docx)\b/g, "");
    if (/https?:\/\/|[\p{L}][^;]*\b(?:19|20)\d{2}\b/u.test(citatie)) {
      assert.ok(publiek.trim(), `${naam}: citation emptied`);
    }
    if (!isVrijeTekst(key, volledig)) {
      assert.equal(publiek, volledig, `${naam}: opaque value`);
      return;
    }
    assert.doesNotMatch(publiek.replace(/https?:\/\/[^\s)\]]+/g, ""), VERBODEN, naam);
    const markeringen = (volledig.match(/needs verification|\(nv\)/gi) || []).length;
    assert.ok((publiek.match(/voorlopige aanname/gi) || []).length >= markeringen, naam);
    assert.doesNotMatch(publiek, / {2,}|\(\s*\)|\[\s*\]|(?<!\.)\.{2}(?!\.)|\.{4,}/, naam);
    const stack = [];
    for (const teken of publiek) {
      if (teken === "(" || teken === "[") stack.push(teken);
      if (teken === ")" || teken === "]") assert.equal(stack.pop(), teken === ")" ? "(" : "[", naam);
    }
    assert.equal(stack.length, 0, naam);
    return;
  }
  if (volledig === null || typeof volledig !== "object") {
    assert.equal(publiek, volledig, naam);
    return;
  }
  if (Array.isArray(volledig)) {
    assert.ok(Array.isArray(publiek), naam);
    assert.equal(publiek.length, volledig.length, naam);
    volledig.forEach((x, i) => controleer(x, publiek[i], [...pad, i]));
    return;
  }
  const verwachtVoorlopig = Object.values(volledig).some(eigenMarkering);
  assert.equal(publiek.voorlopig === true, verwachtVoorlopig || volledig.voorlopig === true, naam);
  const parent = pad.filter((deel) => typeof deel === "string").at(-1);
  const sleutels = Object.keys(volledig).filter((k) => !weg(k, parent, volledig[k]));
  if (verwachtVoorlopig && !sleutels.includes("voorlopig")) sleutels.push("voorlopig");
  assert.deepEqual(Object.keys(publiek).sort(), sleutels.sort(), naam);
  for (const [key, x] of Object.entries(volledig)) {
    if (weg(key, parent, x)) assert.equal(key in publiek, false, `${naam}.${key}`);
    else controleer(x, publiek[key], [...pad, key]);
  }
};

for (const [sector, { documenten }] of Object.entries(STANDAARDEN)) {
  for (const doc of documenten) {
    test(`${sector} ${doc.meta.version}: public text, exact numbers/nulls, structure and uncertainty owners`, () => {
      const origineel = structuredClone(doc);
      const publiek = publiekeWeergave(doc);
      controleer(doc, publiek);
      assert.deepEqual(doc, origineel, "projection must not mutate a generated document");
      assert.deepEqual(publiekeWeergave(publiek), publiek, "projection is idempotent");
    });
  }
}

test("Zingeving niveau 3 preserves the contradictory calculation and its warning", () => {
  const doc = STANDAARDEN.arbeidsparticipatie.documenten.at(-1);
  const proxies = doc.effecten.flatMap((e) => e.monetarisering.niveaus.flatMap((n) => n.proxies));
  const proxy = proxies.find((p) => p.onderbouwing?.includes("afgerond in de dataset op €225"));
  assert.ok(proxy, "real workbook example must remain in this regression test");
  const publiek = publiekeWeergave(proxy);
  assert.match(publiek.onderbouwing, /€141, gepubliceerd als €225/);
  assert.match(publiek.onderbouwing, /\(voorlopige aanname: berekening en bedrag sluiten niet op elkaar aan\)/);
  assert.match(publiek.onderbouwing, /Korteling et al\., 2025, NEMESIS-3/);
  assert.equal(publiek.bedrag, proxy.bedrag);
  assert.equal(publiek.voorlopig, true);
});

test("real bibliographic author/year/page citations survive internal parenthetical clauses", () => {
  const bron = "Een QALY telt voor €50.000 (Koopmans et al., 2016, pp. 63–64; parameterregister).";
  assert.equal(filterTekst(bron), "Een QALY telt voor €50.000 (Koopmans et al., 2016, pp. 63–64).");
  assert.equal(filterTekst("Kanfer et al. (2001), p. 844; Liu et al. (2014), p. 14"),
    "Kanfer et al. (2001), p. 844; Liu et al. (2014), p. 14");
  assert.equal(filterTekst("Besluit tarieven in strafzaken 2003 (Staatsblad 2024, 381)"),
    "Besluit tarieven in strafzaken 2003 (Staatsblad 2024, 381)");
  assert.equal(filterTekst("(Vragenlijst Wijkonderzoek Rotterdam 2023.pdf, p. 6)"),
    "(Vragenlijst Wijkonderzoek Rotterdam 2023, p. 6)");
});

test("internal sentences disappear without removing their neighbouring public sentences", () => {
  assert.equal(filterTekst("Dit is een eigen schatting. Besluit 2026-10-22. De uitkomst is onzeker."),
    "Dit is een eigen schatting. De uitkomst is onzeker.");
  for (const intern of ["Zie wiki/effecten/voorbeeld.md.", "Bron: raw/werk.xlsx.",
    "Zie werkbestand.", "Gijs controleert dit.", "Auditregel A-01 en BM-12.", "Eerder stond hier een andere waarde.",
    "Voorstel, nog niet in uitvraag."]) assert.equal(filterTekst(intern), "", intern);
  assert.equal(filterTekst("Lees [[wiki/effecten/voorbeeld.md|de definitie]]."), "Lees de definitie.");
});

test("markers belong to the nearest object, including removed notes and string arrays", () => {
  const doc = { effecten: [{ monetarisering: { niveaus: [{ score: 3, proxies: [
    { bedrag: null, bedragTekst: "needs verification", bron: "CBS (2025), p. 3 (nv)" },
    { bedrag: 15, onderbouwing: "Een bedrag zonder markering." },
  ] }] }, stellingen: [{ stelling: "Een stelling.", toelichting: "needs verification" }],
  situatieschetsen: [{ situatieschets: "Een situatie (nv)." }] }],
  notities: ["needs verification: de bron ontbreekt"] };
  const publiek = publiekeWeergave(doc);
  controleer(doc, publiek);
  assert.equal(publiek.effecten[0].voorlopig, undefined);
  assert.equal(publiek.effecten[0].monetarisering.niveaus[0].voorlopig, undefined);
  assert.equal(publiek.effecten[0].monetarisering.niveaus[0].proxies[0].bedragTekst, "voorlopige aanname");
  assert.equal(publiek.effecten[0].stellingen[0].voorlopig, true);
  assert.equal(publiek.effecten[0].situatieschetsen[0].voorlopig, true);
  assert.equal(publiek.voorlopig, true);
});

const haal = async (sector, suffix = "", query, headers = {}, docs) => {
  const standaard = STANDAARDEN[sector];
  const firestore = fakeFirestore(docs ?? Object.fromEntries(standaard.documenten.map((doc) => [doc.meta.version, doc])), standaard.collection);
  const response = fakeResponse();
  await handleMeetstandaard(firestore, { path: `/api/v1/meetstandaard/${sector}${suffix}`, query, headers }, response);
  return response;
};

for (const [sector, { documenten }] of Object.entries(STANDAARDEN)) {
  test(`${sector}: latest and pinned public routes, unchanged full route, cache isolation and 304`, async () => {
    for (const suffix of ["", `/${documenten.at(-1).meta.version}`]) {
      const volledig = await haal(sector, suffix);
      const publiek = await haal(sector, suffix, { weergave: "publiek" });
      assert.equal(volledig.statusCode, 200);
      assert.equal(publiek.statusCode, 200);
      assert.equal(volledig.body, JSON.stringify(documenten.at(-1)));
      assert.deepEqual(JSON.parse(publiek.body), publiekeWeergave(documenten.at(-1)));
      assert.equal(publiek.headers["X-Meetstandaard-Weergave"], "publiek");
      assert.equal(volledig.headers["X-Meetstandaard-Weergave"], "volledig");
      assert.match(publiek.headers["Access-Control-Expose-Headers"], /X-Meetstandaard-Weergave/);
      assert.equal(publiek.headers["X-Meetstandaard-Version"], documenten.at(-1).meta.version);
      assert.equal(publiek.headers["Cache-Control"], `public, max-age=${suffix ? 31536000 : 300}`);
      assert.notEqual(publiek.headers.ETag, volledig.headers.ETag);
      for (const [query, etag] of [[{ weergave: "publiek" }, volledig.headers.ETag], [undefined, publiek.headers.ETag]]) {
        assert.equal((await haal(sector, suffix, query, { "if-none-match": etag })).statusCode, 200);
      }
      const herhaald = await haal(sector, suffix, { weergave: "publiek" }, { "if-none-match": publiek.headers.ETag });
      assert.equal(herhaald.statusCode, 304);
      assert.equal(herhaald.headers["X-Meetstandaard-Weergave"], "publiek");
      assert.equal(herhaald.body, undefined);
    }
  });
}

test("query validation rejects unknown, empty, repeated and object values before a database read", async () => {
  for (const weergave of ["volledig", "anders", "", ["publiek", "publiek"], { waarde: "publiek" }]) {
    const response = fakeResponse();
    await handleMeetstandaard(null, { path: "/meetstandaard/energiearmoede", query: { weergave }, headers: {} }, response);
    assert.equal(response.statusCode, 400);
    assert.match(response.body.error, /weergave=publiek/);
  }
});

test("public cache namespace is distinct even when projection leaves a document identical", async () => {
  const docs = { "1.0": { meta: { version: "1.0" }, bedrag: 12 } };
  const volledig = await haal("energiearmoede", "/1.0", undefined, {}, docs);
  const publiek = await haal("energiearmoede", "/1.0", { weergave: "publiek" }, {}, docs);
  assert.equal(publiek.body, volledig.body);
  assert.notEqual(publiek.headers.ETag, volledig.headers.ETag);
});

test("version and sector indexes accept the view without projecting index contents", async () => {
  const volledig = await haal("energiearmoede", "/versions");
  const publiek = await haal("energiearmoede", "/versions", { weergave: "publiek" });
  assert.equal(publiek.body, volledig.body);
  assert.notEqual(publiek.headers.ETag, volledig.headers.ETag);
  const response = fakeResponse();
  await handleMeetstandaard(null, { path: "/meetstandaard", query: { weergave: "publiek" }, headers: {} }, response);
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["X-Meetstandaard-Weergave"], "publiek");
});


for (const [invoer, uitvoer] of [
  [
    "... gewogen met 0,774 (needs verification). Energiearmoede rekent sinds 2026-10-22 met dezelfde post, inclusief de weging. Berekening: 0,05 × €50.000 × 0,774 = €1.935.",
    "... gewogen met 0,774 (voorlopige aanname). Energiearmoede rekent met dezelfde post, inclusief de weging. Berekening: 0,05 × €50.000 × 0,774 = €1.935."
  ],
  [
    "Sinds 2026-10-22 overgenomen uit arbeidsparticipatie (groep huishouden_energiekosten). Komt alleen bij EFF-09 voor. EFF-09 is sinds 2026-10-26 een outputmeting; de overlap geldt tussen de outputmeting en de effecten. Effectenlijst bijgewerkt 2026-10-22 (gelijktrekken met arbeidsparticipatie).",
    "Overgenomen uit arbeidsparticipatie (groep huishouden_energiekosten). Komt alleen bij EFF-09 voor. EFF-09 is een outputmeting; de overlap geldt tussen de outputmeting en de effecten."
  ],
  [
    "CPB (2023), Onbenut recht: ... (prijspeil 2024); Onderbouwingsdocument Bart Maas, Google Drive map energiearmoede, bijgewerkt 2026-10-13",
    "CPB (2023), Onbenut recht: ... (prijspeil 2024)"
  ],
  [
    "overgenomen van Bart Maas bij buurtcohesie",
    "overgenomen van de oorspronkelijke uitwerking van buurtcohesie"
  ],
  ["CBS (2024); Drive-map energiearmoede, interne notities", "CBS (2024)"],
  [
    "Bureau Anderzoek (2025), Maatschappelijke prijslijst, tabblad Prijzen WMO 2025, rij 10: huishoudelijke hulp basis/midden €38 per uur",
    "Bureau Anderzoek (2025), Maatschappelijke prijslijst, Prijzen WMO 2025: huishoudelijke hulp basis/midden €38 per uur"
  ],
  [
    "UWV (2025): gemiddelde WIA/WAO-uitkering per jaar; parameterregister",
    "UWV (2025): gemiddelde WIA/WAO-uitkering per jaar"
  ],
  [
    "Meetstandaard Arbeidsparticipatie - september 2026.xlsx, tabblad 'Meetstandaard 1.0', kolom 'Situatieomschrijving per score'",
    "Meetstandaard Arbeidsparticipatie (september 2026)"
  ],
  [
    "Overgenomen uit arbeidsparticipatie (EFF-02); onderbouwing in wiki/monetarisering/fysieke-gezondheid.md; aangevuld met luchtwegklachten (besluit 2026-10-26): luchtwegklachten",
    "Overgenomen uit arbeidsparticipatie (EFF-02); aangevuld met luchtwegklachten: luchtwegklachten"
  ],
  [
    "(onderzoek naar buurtcohesie; sociale cohesie volgt sinds 2026-10-22 de uitwerking van buurtcohesie in energiearmoede, besluit gebruiker)",
    "(onderzoek naar buurtcohesie; sociale cohesie volgt de uitwerking van buurtcohesie in energiearmoede)"
  ],
  [
    "Energiearmoede rekent sinds 2026-10-20 met dezelfde waarde.",
    "Energiearmoede rekent met dezelfde waarde."
  ],
  [
    "Het voorstel aan Bart is te rekenen met het kengetal per vordering: 13 schuldeisers × €72,80 = €946,40. De kosten liggen bij de schuldeisers.",
    "De kosten liggen bij de schuldeisers."
  ],
  [
    "Het bedrag is de gemiddelde WIA-uitkering van €21.123 per jaar (UWV, 2025; parameterregister); Bart rekent met €25.807. Aanname: 2% kans.",
    "Het bedrag is de gemiddelde WIA-uitkering van €21.123 per jaar (UWV, 2025). Aanname: 2% kans."
  ],
  [
    "Aanname: 30% kans op instroom. Bart noemt die kans zelf zwak, en landelijk loopt ongeveer 1,0% van de verzekerden een Ziektewet-uitkering (UWV, 2025).",
    "Aanname: 30% kans op instroom. Die kans is zwak onderbouwd, en landelijk loopt ongeveer 1,0% van de verzekerden een Ziektewet-uitkering (UWV, 2025)."
  ],
  [
    "Bart nam hier geen verzuimpost op naast de WIA; die WIA-kans is nu 2%.",
    "Die WIA-kans is nu 2%."
  ],
  [
    "Hiervoor zijn twee aannames nodig: 68 uur verzuim per jaar, overgenomen van Bart Maas, en 60% van de deelnemers werkt (needs verification).",
    "Hiervoor zijn twee aannames nodig: 68 uur verzuim per jaar, overgenomen uit de oorspronkelijke uitwerking, en 60% van de deelnemers werkt (voorlopige aanname)."
  ],
  [
    "Werkgroep discontovoet 2025, via Meetstandaard monetarisering aannames en rekenregels.docx, par. 3.4",
    "Werkgroep discontovoet 2025, via Meetstandaard monetarisering: aannames en rekenregels, par. 3.4"
  ],
  [
    "Effectenlijst bijgewerkt 2026-10-22 (gelijktrekken met arbeidsparticipatie).",
    ""
  ],
  [
    "Een toelichting (bron CBS, kennisbank 2026-10-26)",
    "Een toelichting (bron CBS)"
  ],
  [
    "in deze kennisbank nog geen directe bron",
    "nog geen directe bron"
  ],
  [
    "Besluit vergoeding voor buitengerechtelijke incassokosten",
    "Besluit vergoeding voor buitengerechtelijke incassokosten"
  ],
  [
    "Besluit tarieven in strafzaken 2003",
    "Besluit tarieven in strafzaken 2003"
  ],
  [
    "https://deepblue.lib.umich.edu/bitstream/handle/2027.42/85349/HPLP_II-Dimensions.pdf?sequence=2",
    "https://deepblue.lib.umich.edu/bitstream/handle/2027.42/85349/HPLP_II-Dimensions.pdf?sequence=2"
  ],
  [
    "https://fetzer.org/sites/default/files/images/stories/pdf/selfmeasures/SELF-ESTEEM-ROSENBERG_SELF-ESTEEM.pdf",
    "https://fetzer.org/sites/default/files/images/stories/pdf/selfmeasures/SELF-ESTEEM-ROSENBERG_SELF-ESTEEM.pdf"
  ]
]) {
  test(`fragment regression: ${invoer}`, () => assert.equal(filterTekst(invoer), uitvoer));
}

test("opaque identifiers, enum values, URLs and numeric strings remain exact", () => {
  const invoer = {
    id: "A-01", slug: "wiki/test.md", uid: "Bart:01", version: "1.2",
    statusKengetal: "needs verification", niveau: "3", bedragTekst: "-4.224,60",
    onbekend: "wiki/private.md", opmerkingen: "https://example.org/bron.pdf?sequence=2",
  };
  const publiek = publiekeWeergave(invoer);
  for (const [key, waarde] of Object.entries(invoer)) assert.equal(publiek[key], waarde);
  assert.equal(publiek.voorlopig, true);
});

test("AP level calculation retains the complete public calculation", () => {
  const doc = STANDAARDEN.arbeidsparticipatie.documenten.at(-1);
  const origineel = doc.effecten[0].monetarisering.niveaus[0].berekening;
  assert.equal(filterTekst(origineel), origineel.replace(/ in tabblad 5/, "")
    .replace(/ \(tabblad 8\)/, ""));
});

test("mixed source preserves the literal public continuation", () => {
  assert.equal(filterTekst("Overgenomen uit arbeidsparticipatie (EFF-02); onderbouwing in wiki/monetarisering/fysieke-gezondheid.md; aangevuld met luchtwegklachten (besluit 2026-10-26): ..."),
    "Overgenomen uit arbeidsparticipatie (EFF-02); aangevuld met luchtwegklachten: ...");
});

test("every source URL survives across complete served documents, including bestand", () => {
  const verzamel = (waarde) => {
    if (typeof waarde === "string") return waarde.match(/https?:\/\/[^\s)\]]+/g) || [];
    if (!waarde || typeof waarde !== "object") return [];
    return Object.values(waarde).flatMap(verzamel);
  };
  for (const { documenten } of Object.values(STANDAARDEN)) {
    for (const doc of documenten) {
      const publiek = verzamel(publiekeWeergave(doc));
      for (const url of verzamel(doc)) assert.ok(publiek.includes(url), url);
    }
  }
});
