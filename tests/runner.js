"use strict";

const fs = require("fs");
const glob = require("glob");
const path = require("path");
const jsdocFlow = require("../index");
const assert = require("assert");
const inputDir = path.join(__dirname, "/input");
const outputDir = path.join(__dirname, "/expected_output");

glob(inputDir + "/*.js", function(err, files) {
    if (err) {
        console.error(err);
        process.exit(1);
        return;
    }

    let numFails = 0;
    files.forEach(function(f) {
        f = path.resolve(f); // convert \ to / so we can replace with out dir
        const outFile = f.replace(inputDir, outputDir);
        const expectedOutput = fs.readFileSync(outFile, "utf8");
        const actualOutput = new String(jsdocFlow(fs.readFileSync(f, "utf8")));
        try {
            assert.deepStrictEqual(actualOutput.valueOf(), expectedOutput)
        } catch (error) {
            console.error(error.message);
            numFails += 1;
        }
    });
    console.log("%s test failures out of %s tests.", numFails, files.length);
    process.exit(numFails > 0 ? 1 : 0);
});
