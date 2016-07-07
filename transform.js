#!/usr/bin/env node
const os = require('os');
const fs = require('fs');
var program = require('commander');
var transformCsv = require('./transformCsv.js');

program
    .version('0.0.1')
    .option('-o, --infile <path>', 'output filename (defaults to stdin)')
    .option('-o, --outfile <path>', 'output filename (defaults to stdout)')
    .option('-v, --verbose', 'verbose (defaults to non-verbose)')
    .parse(process.argv);

var infile = program.infile;
var outfile = program.outfile;
var verbose = program.verbose;

var ec2data = {}; var data = [];
if( infile ) {
    data = fs.readFileSync(infile);
    run(data);
}
else {
    process.stdin.setEncoding('utf8');
    process.stdin.on('readable', () => {
        var chunk = process.stdin.read();
        if (chunk !== null) {
            data+= chunk;
            console.error( "on(readable) with chunk", chunk );
        }
    });

    process.stdin.on('data', function(chunk) {
        console.error( "on(data) with chunk", chunk );
        data+= chunk;
    });

    process.stdin.on('end', () => {
        console.error( "on(end)" );
        run( data );
    });
return;
}


function run( data ) {
    var ec2data = JSON.parse(data);

    var csvall = transformCsv.transformCsv(transformCsv.aggregateRegions(ec2data));
    if (!csvall || csvall == null) {
        console.err("failure in transformCsv, aborting program, please check input");
        exit(1);
    }

    if (outfile)
        fs.writeFileSync(outfile, csvall);
    else
        console.log(csvall);
}


