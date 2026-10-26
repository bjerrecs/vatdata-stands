import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const root = fileURLToPath(new URL('../', import.meta.url));
const airportDirectory = path.join(root, 'airports');
const exampleFile = path.join(root, 'examples', 'airport.json');
const schema = JSON.parse(await readFile(path.join(root, 'schema', 'airport.schema.json'), 'utf8'));
const validator = new Ajv({ allErrors: true });
addFormats(validator);
const validate = validator.compile(schema);
const today = new Date().toISOString().slice(0, 10);
const requestedFiles = process.argv.slice(2);
const files = requestedFiles.length
  ? requestedFiles.map((filename) => path.resolve(filename))
  : [
      ...(await readdir(airportDirectory)).sort().map((filename) => path.join(airportDirectory, filename)),
      exampleFile,
    ];
let failures = 0;
let standCount = 0;

for (const filename of files) {
  const relativeFilename = path.relative(root, filename);
  const errors = [];
  try {
    const data = JSON.parse(await readFile(filename, 'utf8'));
    if (!validate(data)) {
      errors.push(...validate.errors.map((error) => (error.instancePath || '/') + ' ' + error.message));
    } else {
      if (filename !== exampleFile) {
        if (path.dirname(filename) !== airportDirectory || path.basename(filename) !== data.airport.icao.toLowerCase() + '.json') {
          errors.push('Airport must be stored as airports/<lowercase ICAO>.json matching airport.icao.');
        }
        if (data.airport.icao === 'ZZZZ' || data.sources.some((source) => ['example.com', 'example.org', 'example.net'].includes(new URL(source.url).hostname))) {
          errors.push('Replace fictional identifiers and example source URLs before submitting airport data.');
        }
      }
      const sourceIds = new Set();
      for (const source of data.sources) {
        if (sourceIds.has(source.id)) errors.push('Duplicate source ID: ' + source.id);
        sourceIds.add(source.id);
        if (source.accessed_at > today) errors.push('Source ' + source.id + ': accessed_at cannot be in the future.');
      }
      if (data.reviewed_at && data.reviewed_at > today) errors.push('reviewed_at cannot be in the future.');
      if (data.data_status === 'reviewed' && data.sources.every((source) => source.kind === 'import')) {
        errors.push('Reviewed data must cite an original vACC, AIM, or AIP source, not only an import.');
      }
      const standIds = new Set();
      for (const stand of data.stands) {
        const normalizedId = stand.id.toUpperCase();
        if (standIds.has(normalizedId)) errors.push('Duplicate stand ID: ' + stand.id);
        standIds.add(normalizedId);
        for (const sourceId of stand.source_ids) {
          if (!sourceIds.has(sourceId)) errors.push('Stand ' + stand.id + ': unknown source ID ' + sourceId);
        }
        for (const aircraft of stand.approved_aircraft ?? []) {
          if (stand.prohibited_aircraft?.includes(aircraft)) errors.push('Stand ' + stand.id + ': ' + aircraft + ' is both approved and prohibited.');
        }
        if (stand.legacy_aircraft_code && !stand.source_ids.some((sourceId) => data.sources.some((source) => source.id === sourceId && source.kind === 'import'))) {
          errors.push('Stand ' + stand.id + ': legacy_aircraft_code requires an import source.');
        }
      }
      standCount += data.stands.length;
    }
  } catch (error) {
    errors.push(error.message);
  }
  if (errors.length) {
    failures += 1;
    console.error('FAIL ' + relativeFilename + '\n' + errors.map((error) => '  ' + error).join('\n'));
  } else {
    console.log('OK   ' + relativeFilename);
  }
}

if (failures) {
  console.error('\n' + failures + ' file(s) failed validation.');
  process.exitCode = 1;
} else {
  console.log('\nValidated ' + files.length + ' file(s), ' + standCount + ' stand(s).');
}
