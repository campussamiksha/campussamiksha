/**
 * Importer test — no database. Verifies the CSV parser edge cases and the
 * row→record mapping (enum aliases, aka split, booleans, validation).
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/import-test.ts
 */
import { parseCsv } from "../lib/csv";
import { rowsToRecords } from "../lib/institutionImport";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}` + (extra !== undefined ? `  (${JSON.stringify(extra)})` : "")); }
}

// --- CSV parser ---
console.log("[CSV parser]");
const csv =
  'name,city,note\n' +
  '"St. Stephen\'s, Delhi",New Delhi,"line1\nline2"\n' +
  'Plain College,Pune,"He said ""hi"""\n' +
  '\n'; // trailing blank line
const rows = parseCsv(csv);
check("row count excludes blank line", rows.length === 3, rows.length);
check("quoted comma kept in one field", rows[1][0] === "St. Stephen's, Delhi", rows[1][0]);
check("newline inside quotes preserved", rows[1][2] === "line1\nline2", rows[1][2]);
check("escaped quotes unescaped", rows[2][2] === 'He said "hi"', rows[2][2]);

// --- Row mapping ---
console.log("\n[Row mapping]");
const data = parseCsv(
  "name,type,ownership,aka,ugc_recognized,nirf_rank_overall,naac_cgpa\n" +
  '"Indian Institute of Technology Bombay",iit,government,IIT Bombay;IITB,,3,\n' +
  '"Delhi University",central,govt,DU,true,,3.28\n' +
  '"Bad Row No Type",,,,,,\n' +
  '"Weird Type Row",spaceship,,,,,\n',
);
const { records, errors } = rowsToRecords(data);
check("valid rows mapped", records.length === 2, records.length);
check("bad rows collected as errors", errors.length === 2, errors);
check("type alias iit → INI", records[0].type === "institute_of_national_importance", records[0].type);
check("type alias central → central_university", records[1].type === "central_university", records[1].type);
check("ownership alias govt → government", records[1].ownership === "government", records[1].ownership);
check("aka split on ';'", records[0].aka.length === 2 && records[0].aka[1] === "IITB", records[0].aka);
check("slug generated", records[0].slug === "indian-institute-of-technology-bombay", records[0].slug);
check("int parsed / blank → null", records[0].nirfRankOverall === 3 && records[1].nirfRankOverall === null);
check("bool parsed / blank → null", records[1].ugcRecognized === true && records[0].ugcRecognized === null);
check("float parsed", records[1].naacCgpa === 3.28, records[1].naacCgpa);
check("error mentions missing name/type reason", errors.some((e) => /type/.test(e.reason)));

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
