# VATSIM Stand Data

A worldwide, community-maintained dataset of airport stands for **VATSIM** tools. Each airport has one JSON file with stand positions, maximum wingspan, aircraft code letters, and documented approved/prohibited aircraft types.

This is a **data repository**, not a stand-occupancy website. It is independent of any vACC, region, or client. **For flight simulation only; not for real-world navigation or operational decisions.**

## Sources and trust

Use the responsible **vACC** and the country's official **AIM/AIP**. Cite the exact document, section/chart, effective date when available, and access date. Distinguish VATSIM-specific procedures from real-world restrictions in notes. Explain conflicting sources in the PR rather than silently combining rules.

Only contribute information you may redistribute. Publicly accessible charts are not automatically licensed for republication: link to them instead of uploading charts, PDFs, screenshots, or copied prose. Ask the publisher or maintainers if rights are unclear.


## Layout

| Path | Contents |
| --- | --- |
| airports/ | One lowercase ICAO-named JSON file per airport |
| examples/airport.json | Fictional starting template |
| schema/airport.schema.json | Machine-readable format definition |
| scripts/validate.mjs | Schema and cross-reference checks |
| .github/ | PR template and automatic validation |
| LICENSE | GPL-3.0 license |

No separate airport index needs updating. Discover airports from files in airports/. This named-field format is not a drop-in replacement for the upstream application's positional arrays.

## Add an airport

1. Identify its ICAO code and obtain current stand information from its vACC and/or official AIM/AIP. Check redistribution permissions.
2. Copy [examples/airport.json](examples/airport.json) to `airports/<icao>.json`, for example `airports/egll.json`. Use a **lowercase filename** and **uppercase ICAO identifier** inside.
3. Replace all fictional airport details, sources, coordinates, and stands. Never submit placeholders as real data.
4. Assign each source a unique id. Reference supporting sources from each stand's source_ids. Explain which source supports which restriction in notes if necessary.
5. Keep unknown values null. Never estimate limits from imagery, code letters, or an aircraft that happened to park there.
6. Keep data_status as unreviewed and reviewed_at as null unless the whole file has been checked against cited publications. A reviewer can set reviewed with the actual review date; this is not official airport or VATSIM approval.
7. Validate and submit a PR using the instructions below.

### Complete example

**Fictional example only:** ZZZZ, the source URL, coordinates, and limits are illustrative, not operational data.

~~~json
{
  "$schema": "../schema/airport.schema.json",
  "schema_version": 1,
  "airport": {
    "icao": "ZZZZ",
    "name": "Example International Airport",
    "country": "Example country",
    "latitude": 55.0,
    "longitude": 12.0
  },
  "data_status": "unreviewed",
  "reviewed_at": null,
  "sources": [
    {
      "id": "example-aip",
      "kind": "aip",
      "url": "https://example.com/aip/ZZZZ",
      "reference": "Example AIP AD 2 ZZZZ, aircraft parking chart",
      "effective_date": null,
      "accessed_at": "2026-10-26"
    }
  ],
  "stands": [
    {
      "id": "A1",
      "latitude": 55.001,
      "longitude": 12.001,
      "max_wingspan_m": 36.0,
      "aircraft_code": "C",
      "approved_aircraft": ["A320", "B738"],
      "prohibited_aircraft": ["B739"],
      "source_ids": ["example-aip"],
      "notes": "Illustrative restrictions only."
    }
  ]
}
~~~

### Airport and source fields

| Field | Meaning |
| --- | --- |
| $schema | Keep ../schema/airport.schema.json for editor validation. |
| schema_version | Format version, currently 1. |
| airport.icao | Four uppercase letters matching the filename. |
| airport.name, airport.country | Airport and country/territory names. |
| airport.latitude, airport.longitude | Airport reference position, WGS84 decimal degrees. |
| data_status | unreviewed or reviewed; applies to the whole airport. |
| reviewed_at | Actual review date, YYYY-MM-DD, otherwise null. |
| sources | At least one source, with unique IDs referenced by stands. |
| sources[].kind | vacc, aim, aip, or import. New contributions should cite original publications. |
| sources[].url | HTTP(S) link. For expiring chart links, use a stable landing page and exact reference. |
| sources[].reference | Document title, section/chart identifier, and relevant revision. |
| sources[].effective_date | Source effective date, YYYY-MM-DD, or null if unavailable. |
| sources[].accessed_at | Actual access date, YYYY-MM-DD. |

Do not substitute access dates for unknown effective/review dates. Update sources and review metadata when changing data. Access and completed-review dates cannot be in the future.

### Stand fields

All fields except notes and legacy_aircraft_code are required. Keep unknown nullable values as null rather than omitting them.

| Field | Meaning |
| --- | --- |
| id | Published identifier as a string, preserving suffixes and leading zeroes; unique within the airport. |
| latitude, longitude | Stand position, WGS84 decimal degrees; not reversed. |
| max_wingspan_m | Maximum permitted aircraft wingspan in **metres**, or null. This is the width limit, **not** physical bay width, radius, or aircraft length. |
| aircraft_code | Published aerodrome reference code letter A through F, or null. Not an aircraft type designator. Never infer it from wingspan or treat it as a complete approval. |
| approved_aircraft | Explicit, exhaustive allowlist of ICAO aircraft **type designators**, e.g. A320, B738, B77W; null means no documented allowlist is available. |
| prohibited_aircraft | Explicit list of prohibited ICAO type designators, or null if unknown. |
| source_ids | Nonempty list of IDs from this airport's sources. |
| notes | Optional conditions, source conflicts, VATSIM rules, or unresolved limitations. |
| legacy_aircraft_code | Import-only preservation of a nonstandard upstream category, not a validated ICAO code or suitability rule. |

**Unknown is not unrestricted.** Null means the source has not established that rule. An empty prohibited_aircraft array means the source explicitly reports no type-specific prohibitions, not that every aircraft fits. An empty approved_aircraft array explicitly allows no aircraft; never use it as a placeholder. If a source only gives examples of suitable types, keep the allowlist null and explain examples in notes rather than inventing an exhaustive list.

Use uppercase ICAO aircraft type designators, not IATA codes (738), marketing names (737-800), callsigns, or airline codes. Check the authoritative type reference; validation checks syntax, not whether a designator exists.

### Suitability and overlaps

Consumers must apply known restrictions together: prohibited types are unsuitable, a non-null allowlist must include the type, and known wingspan limits must not be exceeded. A type cannot appear in both lists. Missing rules, unreviewed imports, and conditions in notes may leave suitability **unknown**; the dataset must not automatically authorize assignments.

Represent overlapping stands such as 12, 12L, and 12R separately. Preserve published identifiers and useful drawing order (large stand before overlapping substands). This format does not encode simultaneous-use conflicts, closures, length, pavement strength, or conditional rule logic. Explain these in notes and the PR; consumers must not treat them as machine-checked rules.

## Validate locally

Install Node.js 22 or later and run from the repository root:

~~~sh
npm ci
npm run validate
~~~

To check one airport while editing:

~~~sh
npm run validate -- airports/egll.json
~~~

Checks cover the JSON schema, filenames, duplicate stand/source IDs, source references, conflicting aircraft lists, and review dates. Full validation also checks the example. GitHub Actions runs these checks on every PR. Passing validation does **not** establish source accuracy, redistribution permission, actual compatibility, or operational correctness.

## Submit via pull request

### GitHub website (no local tools needed)

1. **Fork** this repository.
2. In your fork, create a branch such as add-egll-stands or update-ekch-stands.
3. In airports/, choose **Add file > Create new file** for a new airport, or edit its existing file. Follow the template and keep changes focused.
4. Save changes to your branch with a descriptive commit message.
5. Choose **Contribute > Open pull request**, with this repository as the base and your branch as the compare branch.
6. Fill in the PR template: airport, exact sources, effective/access dates, changes, and uncertainties or VATSIM-specific rules.
7. Check **Validate airport data**. Fix failures in the same branch; the PR updates automatically. Respond to reviewers and wait for a maintainer to merge.

### Git command line

Fork on GitHub, clone **your fork**, then:

~~~sh
git switch -c add-egll-stands
~~~

Create/edit airports/egll.json, then:

~~~sh
npm ci
npm run validate
git add airports/egll.json
git commit -m "Add EGLL stand data"
git push -u origin add-egll-stands
~~~

Use GitHub's **Compare & pull request** button to target this repository's default branch. Corrections follow the same process: explain old versus new values and cite evidence. Avoid unrelated reformatting or changes to other airports. Leave uncertain values unknown and explain why rather than guessing.

## Attribution and license

Seed data comes from [VATSIM Scandinavia / stands](https://github.com/Vatsim-Scandinavia/stands), created by [Daniel L.](https://github.com/blt950), whose README credits [Alex Toff's stand plugin](https://github.com/atoff/vatsim-stand-status). The upstream [GPL-3.0 license](LICENSE) and attribution are retained; imported data is not relicensed as MIT or public domain. Contributions use the repository license, subject to third-party publishers' actual rights. No official affiliation or endorsement by VATSIM or an aviation authority is implied.
