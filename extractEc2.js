#!/usr/bin/env node
const os = require('os');
const fs = require('fs');
var program = require('commander');
var describeEc2 = require('./describeEc2.js');

program
    .version('0.0.5')
    .option('-o, --outfile <path>', 'output filename (defaults to stdout)')
    .option('-e, --errfile <path>', 'error filename (defaults to stderr)')
    .option('-r, --region <string>', 'region to list (defaults to all)')
    .option('-v, --verbose', 'verbose (defaults to non-verbose)')
    .parse(process.argv);

var outfile = program.outfile;
var errfile = program.errfile;
var region = program.region;
var verbose = program.verbose;

var count = 0;
var start = Date.now();
var describe;
if (region)
    describe = describeEc2.describeEc2(region);
else
    describe = describeEc2.describeEc2AllRegions();

if (!describe || describe == null) {
    console.err("failure in describe, aborting program, please set up AWS defaults");
    process.exit(1);
}

describe
    .on('complete', function (ec2data, errors) {
        if (verbose)
            console.error("Performed", count, " requests with", errors.length, "errors in", Math.round((Date.now() - start) / 100) / 10, "seconds");

        var errText = "";
        for (var err = 0; err < errors.length; err++ )
            errText += errors[err].text + os.EOL;
        if (errfile)
            fs.writeFileSync(errfile, errText);
        else
            console.error(errText);
        var data = JSON.stringify(ec2data, null, 2);
        if (outfile)
            fs.writeFileSync(outfile, data );
        else
            console.log( data );
        process.exitCode = 0;       // do not exit directly here, because it would stop the stream
    })
    .on('progress', function (percent, duration, operation, inregion) {
        if (verbose)
            console.error(inregion, operation);
        count++;
    });



