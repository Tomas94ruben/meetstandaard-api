# Architecture Decision Records

Why we chose what we chose. Prevents relitigating settled decisions.

---

## ADR-001: A published version is immutable and served forever

**Date:** 2026-08-17 · **Status:** Accepted

### Context

Meetstandaarden change: tariffs are corrected, statements reworded, monetisation refined. A measurement valued in 2026 must still be explainable in 2030, when the standaard has moved several versions on.

### Decision

A published version is immutable. Corrections ship as a **new** version; old versions are served indefinitely. Nothing is ever removed.

Consumers pin a version explicitly and persist `meta.version` next to every stored measurement. Upgrading is deliberate handwork on the consumer's side.

### Consequences

- No deprecation machinery, no lifecycle states, no automatic migration — all of that exists to manage *automatic* upgrades, which do not happen here. An earlier design had `preview`/`stable`/`deprecated`, `Sunset` headers and successor links; it was removed as ceremony.
- Firestore rules must forbid client writes to published collections, or immutability is a promise nothing enforces. See `docs/pitfalls.md#deploy-firestore-rules-full-replace`.
- Re-seeding a version in place is a contract violation once anyone has pinned it.
- Every response states its own version, in `meta.version` and the `X-Meetstandaard-Version` header, so it is always visible which one you are on.

---

## ADR-002: Keep the versioning layer small

**Date:** 2026-08-17 · **Status:** Accepted

### Context

`versionedResource.js` briefly grew to ~215 lines: semver prerelease ordering, lifecycle states, deprecation and sunset headers, a `releases[]` index, a `/latest` alias, and cache policies that varied by lifecycle.

### Decision

Cut it back to ~106 lines. Three routes (`{resource}`, `{resource}/{version}`, `versions`), one cache policy, numeric version ordering, `latest` = highest version.

### Consequences

- Fully backwards compatible: `{versions: [...]}` unchanged, `latest` resolution identical, pinned bodies byte-identical. Verified against the real datasets.
- Version ids must be dot-separated numbers. Anything else is a `404`, which also keeps a hostile segment away from Firestore's `doc()`.
- If automatic migration is ever needed, the removed machinery is in git history — but it should not return without that need.

---

## ADR-003: Cross-sector comparability is derived, never declared

**Date:** 2026-08-17 · **Status:** Accepted

### Context

Effects with the same name exist in several sectors. The workbooks carry a `crossSectorBenchmarkbaar` column asserting which are comparable.

### Decision

Two effects are cross-sector **only if their question sets are exactly identical**, and this is computed from the instrument rather than read from a flag.

### Consequences

- The authored column is a claim, and measurement showed it wrong twice (EFF-12 and EFF-13 assert verbatim reuse; only 2/4 and 3/5 statements match).
- Measured against current data, exactly **one** effect qualifies.
- A derived value is self-maintaining: rewording a question drops that effect out automatically, so a wording change elsewhere cannot silently make a stale flag wrong.
- Implementation (an instrument hash on each effect) is deferred until the new arbeidsparticipatie wording is public — comparing against the current data would measure wording that is about to change.

---

## ADR-004: The panel is read-only; authoring belongs in the workbook

**Date:** 2026-08-17 · **Status:** Accepted

### Context

The panel used to be a CRUD editor over `categories`/`effects`/`questions` — a form on top of the production database, with no versioning and no review step.

### Decision

The panel displays standaarden and does not edit them. Authoring happens in the workbook, which is generated, committed, reviewed as a diff, and seeded.

### Consequences

- **The 31 effects in arbeidsparticipatie and gelijke kansen cannot currently be edited at all.** They are on pipeline B, which has no workbook yet. This is a real cost, accepted deliberately; `docs/migratie-standaarden.md` is the way out.
- Enforced, not just intended: the Firestore rules deny client writes to published collections.
- The panel needs no write path, which is why every renderer is presentational.

---

## ADR-005: Publish what is uncertain rather than hiding it

**Date:** 2026-08-17 · **Status:** Accepted

### Context

The source workbooks contain values that are provisional, absent, or internally inconsistent. A clean-looking document would have to either invent numbers or quietly drop rows.

### Decision

Publish the uncertainty as data. Every generated document carries a `controle` block; unavailable values are `null` with their verbatim source text.

### Consequences

- `controle.somAfwijkingen` names two energiearmoede niveaus whose stated total disagrees with the sum of their proxies — a source defect, surfaced rather than reconciled.
- `controle.zonderKengetal` names 42 of 114 interventions with no usable CO₂ figure.
- Consumers must handle `null` and must not render it as `0`. The handoff docs say so explicitly.
- This follows the workbooks' own rule — *geen kengetallen verzinnen* — and is the whole point of a transparency standard: a figure you cannot trace is worse than a gap you can see.

---

## ADR-006: A tariff shift is not valued, because the model cannot express one

**Date:** 2026-08-17 · **Status:** Accepted

### Context

`EG11` "Apparaten op nachttarief" carried a literal `0` for gas, elektra and water in the workbook, so the generator produced "€0 saved, 0 kg CO₂e per year".

Both figures looked defensible for different reasons, and only one was:

- **0 kg CO₂e is arguably right.** A night tariff moves consumption in time, not in volume, so total emissions genuinely do not change.
- **€0 saved is not.** Saving money is the entire point of the intervention. But `aannames` holds a *single* electricity price, so a day/night tariff difference cannot be represented anywhere in the model.

Its `statusKengetal` of `direct brongetal` made this worse rather than better: it lent a modelling gap the appearance of a sourced result.

### Decision

Blank the consumption cells so both figures parse to `null`, and let `EG11` join `controle.zonderKengetal`. Do not invent a tariff spread to produce a number.

### Consequences

- The document now states "not quantified" where it previously stated "no saving". Only the first is true.
- No interventie in milieu-circulariteit 0.9 publishes a hard `0`.
- **Valuing this properly requires a second electricity tariff in `aannames`** (and a way to express which share of consumption shifts). That is a modelling decision for the workbook, not something to infer in the generator.
- The CO₂ figure was lost along with the euro figure, because the two are computed from the same consumption cells. Accepted: a correct `0 kg` alongside a wrong `€0` still ships a wrong row, and the pair cannot currently be separated.
- Generalises beyond this row: a literal `0` in a source is indistinguishable from a measured zero, so where the model *cannot represent* the effect, blank the cell. See `docs/pitfalls.md#data-never-invent-a-kengetal`.

---

## ADR-007: Publish the workbook's three uitkomsten, total included, with the components beside it

**Date:** 2026-08-17 · **Status:** Accepted

### Context

The interventiebibliotheek workbook was restructured into three named outcomes per intervention — 1. energiebesparing (kWh), 2. besparing huishouden (EUR), 3. maatschappelijke besparing (EUR) — plus `Totale waarde = 2 + 3`.

That total conflicts with what the handoff doc previously told consumers: *"`besparingEurPerJaar` is cash; `monetairCo2` is societal value. Adding them together mixes two different things."* The warning was right about the arithmetic and wrong about the conclusion: adding a private benefit to a societal one is standard MKBA practice, and refusing to publish the sum only means every consumer computes it themselves, unlabelled.

The same restructuring introduced a second electricity price. Households on a green contract pay a GvO surcharge, so the savings column now bills electricity at a weighted price (`=B2+B10*B11` = €0,25585/kWh) instead of the bare €0,25.

### Decision

Mirror the workbook: publish all three outcomes and the total in `berekend`, name them for what they measure (`besparingHuishoudenEurPerJaar`, `maatschappelijkeBesparingEurPerJaar`, `totaleWaardeEurPerJaar`), and ship the caveat *as data* in `berekening.waarschuwing` rather than only in prose a consumer may not read.

Bill electricity savings at the weighted price. Leave the emission factor location-based: a green contract is a contractual instrument, it does not change the physical netmix. The workbook decided this on 2026-07-24 and the generator does not second-guess it.

### Consequences

- `berekend` renamed its fields; `monetairCo2EurPerEenheid` became `maatschappelijkeBesparingEurPerEenheid`. Version 0.9 was not yet in use by any consumer, so this shipped as an in-place correction rather than 0.10. Any later rename needs a new version.
- The admin panel shows the total in bold with both components in the columns beside it, and renders `berekening.waarschuwing` under the table. The total never appears alone.
- Two prices now exist in `aannames` and they are not interchangeable. `elektriciteitsprijs` is an input to the derived one; only `elektriciteitsprijs-gewogen-incl-groenestroomopslag` is used in a savings figure. A test pins which one the published numbers follow.
- The derived aanname carries `afgeleid: true` and its verbatim `formule`, so a consumer can re-derive it rather than trust it.

---

## ADR-008: Een ontbrekende polariteit is positief, en wordt gemarkeerd als afgeleid

**Date:** 2026-08-24 · **Status:** Accepted

### Context

Arbeidsparticipatie en gelijke kansen worden als momentopname uit de `effects`-collectie gepubliceerd, zodat hun versie uit de API komt in plaats van uit `src/standaarden.js`.

Daarbij bleek `posNeg` — het enige veld dat vastlegt of een stelling omgepoold is — nauwelijks gevuld: **21 van 86 stellingen** bij arbeidsparticipatie, en die 21 zeggen allemaal `"negative"`. Bij gelijke kansen is het 52 van 53, mét beide waarden.

Het patroon wees één kant op: 19 van de 21 effecten hebben precies één gemarkeerde stelling, en de ongemarkeerde lezen onmiskenbaar positief ("Ik voel me gezond" naast `negative` op "Ik heb vaak pijn of lichamelijk ongemak"). Bij het invoeren van de vragenlijst zijn alleen de omgepoolde items aangevinkt.

Dit is het gevaarlijkste veld om fout te hebben: een omgepoolde stelling die als positief wordt gescoord draait de uitkomst van het effect om.

### Decision

De conventie is bevestigd (2026-08-24): **niet geregistreerd betekent positief.** De generator vult dat in, maar zet er `herkomstRichting` naast — `"vastgelegd"` of `"afgeleid"` — en bewaart de letterlijke bronwaarde in `bronPosNeg`.

### Consequences

- Beide standaarden zijn scoorbaar in plaats van alleen leesbaar. 65 stellingen bij arbeidsparticipatie en 1 bij gelijke kansen zijn afgeleid; `controle.afgeleideRichting` noemt ze allemaal bij naam.
- Een consument die niet op een afgeleide polariteit wil varen, filtert op `herkomstRichting`. Dat kan alleen omdat afgeleid en vastgelegd apart blijven — vandaar dat er een test op staat.
- Dit is hetzelfde patroon als `afgeleid: true` op een afgeleide aanname in ADR-007: de waarde is bruikbaar, en dat hij is afgeleid blijft zichtbaar.
- **De duurzame oplossing ligt in de bron, niet hier.** Zolang `posNeg` in de `effects`-collectie leeg blijft, leidt elke regeneratie het opnieuw af. Zet het veld expliciet bij de migratie uit `docs/migratie-standaarden.md`, dan verdwijnt de afleiding vanzelf.
- Het alternatief — `null` publiceren — is verworpen omdat het een bevestigde conventie behandelt als onbekend, en daarmee 65 stellingen onbruikbaar maakt zonder dat er iets onzeker aan is.

---

## ADR-009: A public view removes internal provenance, while keeping uncertainty visible

**Date:** 2026-11-11 · **Status:** Accepted

### Context

The website needs the published standard without local file paths, team notes or editorial history. Removing provisional findings would make the standard appear more certain than its sources (ADR-005).

### Decision

Serve `?weergave=publiek` as a pure function projection at read time, for every sector and version in `STANDAARDEN`. The default response and generated documents keep their full contents.

| Public view | Reason |
|---|---|
| Remove `aannamescore`, `onderbouwingHerschreven`, `document`, `bestand`, `wikipagina`, `audit`, `bronbedragVastgesteld`, `generatedBy` | Retired rating, editorial workflow or local provenance |
| Remove `stellingen[].toelichting` and `situatieschetsen[].toelichting` | Internal formulation notes; other `toelichting` fields remain |
| Filter inventoried free-text keys in `VRIJE_TEKST_SLEUTELS` | Remove the smallest internal fragment bounded by parentheses, commas, semicolons or sentence boundaries. Preserve readable report and chapter titles, authors, years and pages |
| Keep identifiers, slugs, uid, enum values, standalone URLs and numeric strings exact | Unknown keys pass through pending schema review. Free-text array items inherit their field policy |
| Protect every HTTP(S) URL before text filtering | Preserve PDF filenames, paths and query strings inside source URLs |
| Keep `bestand` when its value is an HTTP(S) URL | Older wijkbedrijven sources store public CBS webpublications in this field |
| Preserve a nonempty source field whenever its original text contains a citation | Regression invariants cover every served document, source URLs and author/organisation plus year |
| Replace free-text `needs verification` / `(nv)` with `voorlopige aanname` and add `voorlopig: true` to the containing object | Enum markers remain exact. The flag also records markers in removed notes |
| Keep numbers, `null`, arrays, `controle`, original scales, overlap fields and previous effect ids | ADR-005: expose missing values and source contradictions; never reconcile them in presentation |

### Consequences

- The function decides what is public, as it already does for feedback. No seed or Firestore change is involved.
- Flags belong to the nearest containing object, including parameters and source objects; they do not propagate from a proxy to a niveau. A marker in a string array flags that array's containing object.
- Deleted metadata can contain numbers (for example an old assumption rating). All numbers in retained fields stay identical, including every amount and total.
- ETags are calculated after projection and use a separate public namespace, including identical bodies and indexes. Cache URLs include the query; `X-Meetstandaard-Weergave` names the representation.
- The document version pins source data. The public editorial projection follows function code; changing it requires deploying that code. Consumers cache by full URL and view, and respect the returned cache lifetime.
- Tests cover every registered document and version, exact retained numbers/nulls, array lengths, uncertainty ownership and routing/cache isolation. New fields need an explicit publication review.
