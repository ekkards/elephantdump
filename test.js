var fs = require('fs');
var aws = require('aws-sdk');
var dump = require('elephantdump');

var describe = dump.describeEc2AllRegions();        // alternatively describeEc2('eu-central-1')

if (!describe || describe == null) {
    console.err("failure in describe, aborting program, please set up AWS defaults");
    process.exit(1);
}
var count = 0;

describe
    .on('progress', function (percent, duration, operation, inregion) {
        console.log(inregion, operation);
        count++;
    })
    .on('complete', function (ec2data, errors) {
        console.log("Performed", count, "requests with", errors.length, "errors");
        for (var err = 0; err < errors.length; err++ )
            console.error(errors[err].text);

        // JSON
        fs.writeFileSync('Ec2.json', JSON.stringify(ec2data, null, 2) );

        // CSV
        var csvall = dump.transformCsv( dump.aggregateRegions( ec2data ));
        fs.writeFileSync( 'Ec2.csv', csvall );
    });


