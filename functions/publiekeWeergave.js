// Publication is a read-time projection: generated documents remain the source.
// Unlike the website filters, uncertainty is never an editorial deletion (ADR-005).
export const VERVALLEN_SLEUTELS = new Set([
  "aannamescore", "onderbouwingHerschreven", "document", "audit",
  "bronbedragVastgesteld", "generatedBy", "bestand", "wikipagina",
]);

export const heeftMarkering = (tekst) => /needs verification|\(nv\)/i.test(tekst);

// Based on INTERN, VERVANG, filter_haakjes and filter_zinnen in bouw_website.py,
// and REDACTIE / work markers in bouw_verdieping.py. Bibliographic citations
// survive; local paths and editorial history have no meaning for a reader.
export const INTERN = /\b(?:Bart(?:s)?|Gijs|Maas)\b|\bBM-\d[\w-]*|\bA-\d{2}[a-z]?\b|auditregel|\brij\s+\d|werkbestand|werkblad|Eerder stond|voorstel,?\s*nog niet in uitvraag|besluit[^.;)]{0,40}20\d\d[-–]\d\d|conform de spec|\bAPI\b|gegenereerd|sectorconfig|versiestand|updatefeed|\bmerge\b|parameterregister|effect-spec|Uitleg effectmeting|Lokale kopie|PARAMETERS_|functions\/|raw\/|wiki\/|gedeeld\/|output\/|onderbouwing-[a-z]|UNIVERSEEL_|[^\s()]+\.(?:md|xlsx|docx|txt)\b/i;

const vervangingen = [
  // The rules document is published methodology, not a working file.
  [/Meetstandaard monetarisering aannames en rekenregels\.docx/g, "Meetstandaard monetarisering: aannames en rekenregels"],
  [/overgenomen van Bart Maas bij\s+([^.;()]+)/gi,"overgenomen van de oorspronkelijke uitwerking van $1"],
  [/\bis sinds 20\d\d-\d\d-\d\d\s+/gi, "is "],
  [/;\s*(?:Bart|het werkbestand|de outputmeting)\b(?:[^.;()]|\.(?=\d)|\([^()]*\))*/gi, ""],
  [/;\s*de oorspronkelijke formulering staat in het werkbestand[^.]*/gi, ""],
  [/;\s*in de dataset staat ten onrechte[^.]*/gi, ""],
  [/,\s*(afgerond )?in de dataset (?:op )?(€[\d.,]+)/gi, ", gepubliceerd als $2"],
  [/In de dataset staat als bron [^,]*, maar het bedrag/gi, "Het bedrag"],
  [/staat niet in de dataset/gi, "is niet vastgelegd"],
  [/is in de dataset niet (met een bron )?vastgelegd/gi, "is niet $1vastgelegd"],
  [/de bron is in de dataset niet vastgelegd/gi, "de bron is niet vastgelegd"],
  [/in de dataset/gi, "in deze meetstandaard"],
  [/Het werkbestand rekent met/gi, "De meetstandaard rekent met"],
  [/Bart (?:Maas )?beoordeelt (dit|het|die omzetting|de onderbouwing) (?:zelf )?als zwak/gi, "$1 is zwak onderbouwd"],
  [/Bart (?:Maas )?noemt die omzetting zelf verkeerd/gi, "Die omzetting is nog niet juist"],
  [/Bart noemt die kans zelf zwak(?: onderbouwd)?/g, "Die kans is zwak onderbouwd"],
  [/Bart rekende met/g, "De oorspronkelijke uitwerking rekende met"],
  [/noemde die kans zelf zwak/g, "noemde die kans zwak"],
  [/omdat Bart die daar uitsluit/gi,"omdat die daar is uitgesloten"],
  [/uit tabblad 11/gi, "van de meetstandaard"],
  [/(?:een )?(?:eigen )?(schatting|modelschatting|frictie-aanname|aanname|inschatting) van Bart Maas/gi, "een eigen $1"],
  [/indirect onderbouwd volgens Bart Maas/gi, "indirect onderbouwd"],
  [/,?\s*volgens Bart(?: Maas)?,?/gi, ""],
  [/ door Bart Maas omgezet/gi, " omgezet"],
  [/Barts onderbouwing/gi, "de oorspronkelijke onderbouwing"],
  [/Barts document/gi, "het oorspronkelijke onderbouwingsdocument"],
  [/overgenomen van Bart Maas( *[,.;])/gi, "overgenomen uit de oorspronkelijke uitwerking$1"],
  [/(?:een )?(indirecte afleiding) van Bart Maas/gi, "een $1"],
  [/\bBart Maas\b/gi, "de opsteller"],
  [/de vaste waarde uit het parameterregister/gi, "de vaste waarde in deze meetstandaard"],
  [/,?\s*via het parameterregister/gi, ""],
  [/het (?:gedeelde )?parameterregister/gi, "de vaste parameters van de meetstandaard"],
  [/\s*(?:\*\*)?\[checken\](?:\*\*)?\s*:?/gi, " "],
  [/,\s*aannamescores\b/gi, ""],
  [/\s*(?:Lage|Middelhoge|Hoge) aannamescore\./gi, ""],
  [/\s*Aannamescore hoog;[^.]*\./gi, ""],
  [/\s*\(aannamescore [^)]*\)/gi, ""],
  [/\bAannamescore\s+\d+\s*:\s*/gi, ""],
  [/,?\s*aannamescore\s+\d+/gi, ""],
  [/;\s*eerder \d[^;()]*?(?=\)|$)/gi, ""],
];

// Explicit inventory of free-text keys in the 18 served documents. Unknown
// keys and machine values pass through unchanged pending schema review.
export const VRIJE_TEKST_SLEUTELS = new Set([
  "label",
  "leeswijzer", "eenheid", "overlaptMetEffect", "betrouwbaarheid",
  "source",
  "toelichting",
  "interventie",
  "primaireEffecten",
  "rekenmodel",
  "monetarisatiebron",
  "onderbouwing",
  "afbakening",
  "kosten",
  "nietCo2Monetair",
  "co2ePerEenheidTekst",
  "parameter",
  "bron",
  "besparingHuishoudenEurPerJaar",
  "co2eKgPerJaar",
  "maatschappelijkeBesparingEurPerJaar",
  "totaleWaardeEurPerJaar",
  "maatschappelijkeBesparingEurPerEenheid",
  "waarschuwing",
  "onderwerp",
  "tekst",
  "overlapMotivering",
  "effect",
  "definitie",
  "stelling",
  "gebruikteSchaal",
  "situatieschets",
  "bronDefinitie",
  "monetariseerbaarheid",
  "origineleSchaal",
  "berekening",
  "proxy",
  "bronBedrag",
  "apaReferentie",
  "pagina",
  "opmerkingen",
  "opmerking",
  "methode",
  "motivering",
  "probleem",
  "voorgesteldeActie",
  "waarde",
  "relevantieSector",
  "crossSectorBenchmarkbaar",
  "doelgroep",
  "herkomstBestaandeStandaard",
  "stellingRechts",
  "belangrijksteAannames",
  "centraleWaardeTekst",
  "rangeLaagTekst",
  "rangeHoogTekst",
  "bedragTekst",
  "bronEffectProxyRelatie",
  "toelichtingProxykeuze",
  "aannames",
  "titel",
  "interpretatie",
  "driver",
  "uitkomstMaat",
  "vraag",
  "antwoordopties",
  "invuller",
  "oorspronkelijkeVraag",
  "schaal",
  "plaatsInVragenlijst",
  "gebruik"
]);
export const isVrijeTekst = (sleutel, waarde) => VRIJE_TEKST_SLEUTELS.has(sleutel)
  && !/^https?:\/\/\S+$/.test(waarde)
  && !/^[+-]?[\d.,]+$/.test(waarde);

export const heeftCitatie = (tekst) => /https?:\/\//i.test(tekst)
  || /[\p{L}][^;]*\b(?:19|20)\d{2}\b/u.test(
    tekst.replace(/20\d\d-\d\d-\d\d/g, "").replace(/\S+\.(?:md|txt|docx)\b/g, ""));

const onzekerheidsnotities = (tekst) => tekst.match(/voorlopige aanname(?:\s*:[^)\]\n]*)?/gi) || [];

const vervangMetOnzekerheid = (tekst, patroon, vervanging) => tekst.replace(patroon, (match) => {
  const nieuw = match.replace(new RegExp(patroon.source, patroon.flags), vervanging);
  const notities = onzekerheidsnotities(match);
  const behouden = onzekerheidsnotities(nieuw).length;
  return nieuw + notities.slice(behouden).map((notitie) => ` (${notitie})`).join("");
});

const filterTekstIntern = (ruw, statistiek) => {
  const markeringen = ruw.match(/needs verification|\(nv\)/gi) || [];
  if (statistiek) statistiek.vervangenMarkeringen += markeringen.length;
  let tekst = ruw.replace(/needs verification/gi, "voorlopige aanname")
    .replace(/\(nv\)/gi, "(voorlopige aanname)");
  tekst = tekst.replace(/\.{3}/g, "ELLIPSISTOKEN");
  const urls = [];
  tekst = tekst.replace(/https?:\/\/[^\s)\]]+/g, (url) => {
    urls.push(url);
    return `URLTOKEN${urls.length - 1}END`;
  });
  for (const [patroon, vervanging] of vervangingen) tekst = vervangMetOnzekerheid(tekst, patroon, vervanging);
  tekst = vervangMetOnzekerheid(tekst,
    /\b(?:Onderbouwingsdocument|Google Drive|Drive-map)\b(?:(?!\.\s+\p{Lu}|;)[\s\S])*/giu, "");
  tekst = tekst.replace(/\[\[([^\]]+)\]\]/g, (_, link) => {
    const [doel, alias] = link.split("|");
    return alias || doel.split("/").pop().replace(/\.md$/i, "").replace(/-/g, " ");
  });
  // Keep the readable label of a local Markdown link, never its local target.
  tekst = tekst.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (link, label, doel) => INTERN.test(doel) ? label : link);
  tekst = tekst.replace(/niet aangetroffen in raw\//gi, "niet aangetroffen in het bronmateriaal");
  // URLs are opaque, including document extensions and query strings.
  tekst = tekst.replace(/Voorstel,?\s*nog niet in uitvraag\.?/gi, "")
    .replace(/\bin deze kennisbank\s*/gi, "")
    .replace(/\bkennisbank(?:\s+20\d\d-\d\d-\d\d)?/gi, "")
    .replace(/\s*[-–]\s*([a-z]+\s+20\d\d)\.xlsx/gi, " ($1)")
    .replace(/\btabblad\s+['"]?([^,;()'"]+)['"]?/gi, (_, titel) =>
      /^\d+$/.test(titel.trim()) ? "" : titel.trim())
    .replace(/\b(?:rij\s+\d+(?:\s*[-–]\s*\d+)?|kolom\s+['"][^'"]+['"])/gi, "")
    .replace(/\.(?:pdf|xlsx)\b/gi, "")
    .replace(/\bUNIVERSEEL_/g, "")
    .replace(/\bvia parameterregister\b/gi, "")
    .replace(/\bTabbladen\b/gi, "Onderdelen")
    .replace(/\btabbladen\b/gi, "onderdelen")
    .replace(/\binterventietabbladen\b/gi, "interventieonderdelen")
    .replace(/,\s*Meetstandaard 1\.0(?=,|$)/g, "")
    // A dated "sinds" only says when a fact entered the standard; the fact
    // itself stays public, so drop the date rather than the sentence.
    .replace(/(^|[.!?]\s+)Sinds 20\d\d-\d\d-\d\d,?\s+(\p{L})/gu, (_, voor, letter) => voor + letter.toUpperCase())
    .replace(/\s*\bsinds 20\d\d-\d\d-\d\d\b/gi, "");
  const geschiedenis = /\bbijgewerkt 20\d\d|\bEerder stond/i;
  const intern = new RegExp(INTERN.source + "|besluit\\s+(?:gebruiker|opdrachtgever)|kennisbank|aannamescore", "i");
  const fragment = (deel) => {
    deel = deel.replace(/\bparameterregister\s+arbeidsparticipatie:\s*/gi, "")
      .replace(/\b(?:in|uit)\s*(?=GROEPTOKEN\d+END|\(bruto\))/g, "");
    if (!intern.test(deel) && !geschiedenis.test(deel)) return deel;
    const behoudenGroepen = (deel.match(/GROEPTOKEN\d+END/g) || []).filter((token) =>
      !geschiedenis.test(deel)
      || /voorlopige aanname/i.test(groepen[Number(token.match(/\d+/)[0])])
      || heeftCitatie(groepen[Number(token.match(/\d+/)[0])]));
    const urlsInDeel = deel.match(/URLTOKEN\d+END/g) || [];
    const notities = onzekerheidsnotities(deel);
    return [...behoudenGroepen, ...urlsInDeel, ...notities.map((n) => `(${n})`)].join(" ");
  };
  // Parentheses, semicolons and commas delimit editorial fragments. Never
  // discard an enclosing citation merely because one fragment is internal.
  const groepen = [];
  // Work from inner parentheses outwards, shielding surviving groups from
  // the surrounding comma/semicolon split.
  // A comma between digits is a Dutch decimal separator, never a fragment
  // boundary; running prose only splits on semicolons so a dropped clause
  // cannot strand a lowercase remainder.
  const schoonDelen = (inhoud, scheiding = /([;]|,(?!\d))/) => inhoud.split(scheiding).map((deel) =>
    /^[;,]$/.test(deel) ? deel : fragment(deel)).join("")
    .replace(/([;,])\s*(?=[;,:.]|$)/g, "").replace(/^[;,\s]+/, "").trim();
  while (/(?<!\])\([^()]*\)/.test(tekst)) {
    tekst = tekst.replace(/(?<!\])\(([^()]*)\)/g, (_, binnen) => {
      const schoon = schoonDelen(binnen);
      if (!schoon) return "";
      groepen.push(`(${schoon})`);
      return `GROEPTOKEN${groepen.length - 1}END`;
    });
  }
  tekst = tekst.split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-Þ])/u)
    .map((zin) => {
      // Editorial history owns the whole sentence, including trailing clauses.
      // Within parentheses it still owns only its comma/semicolon fragment.
      let schoon = geschiedenis.test(zin) ? fragment(zin).trim() : schoonDelen(zin, /([;])/);
      // A source line is a comma list, not prose: keep its citation fragments.
      if (!schoon && heeftCitatie(zin)) schoon = schoonDelen(zin);
      // Dropping a leading internal clause must not leave a lowercase sentence.
      if (/^\p{Lu}/u.test(zin) && /^\p{Ll}/u.test(schoon)) schoon = schoon[0].toUpperCase() + schoon.slice(1);
      return schoon && zin.endsWith(".") && !schoon.endsWith(".") ? schoon + "." : schoon;
    }).join(" ");
  for (let i = groepen.length - 1; i >= 0; i--) {
    tekst = tekst.replaceAll(`GROEPTOKEN${i}END`, groepen[i]);
  }
  tekst = tekst.replace(/([;,])\s*(?=[;,:.]|$)/g, "")
    .replace(/^[;,\s]+/, "");
  return balanceerHaakjes(tekst).replace(/`/g, "").replace(/\s+en\s*\./g, ".")
    .replace(/\(\s*[;,]?\s*\)|\[\s*\]/g, "")
    .replace(/\s+([.,;:!?])/g, "$1").replace(/\.{2,}/g, ".")
    .replace(/\s*[—–-]\s*(?=[.;]|$)/g, "")
    .replace(/\s+/g, " ").replace(/^[;,.\s]+|[;\s]+$/g, "").trim()
    .replace(/URLTOKEN(\d+)END/g, (_, i) => urls[Number(i)])
    .replace(/ELLIPSISTOKEN/g, "...")
    // Replacements can land at a sentence start where the source had a capital.
    .replace(/([.!?]\s+)(voorlopige aanname|de opsteller|die omzetting|dit is zwak|het is zwak|de onderbouwing is zwak|in deze meetstandaard)/g,
      (_, voor, woorden) => voor + woorden[0].toUpperCase() + woorden.slice(1));
};

export const filterTekst = (tekst) => filterTekstIntern(tekst);

const balanceerHaakjes = (tekst) => {
  const open = [];
  const weg = new Set();
  for (let i = 0; i < tekst.length; i++) {
    if (tekst[i] === "(" || tekst[i] === "[") open.push(i);
    if (tekst[i] !== ")" && tekst[i] !== "]") continue;
    const verwacht = tekst[i] === ")" ? "(" : "[";
    if (open.length && tekst[open.at(-1)] === verwacht) open.pop();
    else weg.add(i);
  }
  for (const i of open) weg.add(i);
  return tekst.split("").filter((_, i) => !weg.has(i)).join("");
};

export const vervalt = (sleutel, pad = [], waarde) => (VERVALLEN_SLEUTELS.has(sleutel)
  && !(sleutel === "bestand" && typeof waarde === "string" && /^https?:\/\//i.test(waarde)))
  || (sleutel === "toelichting" && ["stellingen", "situatieschetsen"].includes(pad.at(-1)));

// Mark the nearest object containing a marker, including string arrays; do not
// propagate a proxy's flag to its niveau/effect/document.
const eigenMarkering = (waarde) => typeof waarde === "string" ? heeftMarkering(waarde)
  : Array.isArray(waarde) && waarde.some(eigenMarkering);

export const publiekeWeergaveMetStatistiek = (document) => {
  const statistiek = { verwijderdeZinnen: 0, vervangenMarkeringen: 0 };
  const bezoek = (waarde, pad = []) => {
    if (typeof waarde === "string") return isVrijeTekst(pad.at(-1), waarde) ? filterTekstIntern(waarde, statistiek) : waarde;
    if (Array.isArray(waarde)) return waarde.map((item) => bezoek(item, pad));
    if (waarde === null || typeof waarde !== "object") return waarde;
    const resultaat = {};
    for (const [sleutel, inhoud] of Object.entries(waarde)) {
      if (!vervalt(sleutel, pad, inhoud)) resultaat[sleutel] = bezoek(inhoud, [...pad, sleutel]);
    }
    // Also flag uncertainty in a removed editorial field on this very object.
    if (Object.values(waarde).some(eigenMarkering)) resultaat.voorlopig = true;
    return resultaat;
  };
  return { document: bezoek(document), statistiek };
};

export const publiekeWeergave = (document) => publiekeWeergaveMetStatistiek(document).document;
