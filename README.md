# elephantdump
-------------------------
Modules for extracting configuration data from AWS and displaying them

Install as node module
----------------------

npm install elephantdump



Install as command line tools
-----------------------------

% sudo npm install elephantshop -g


Prerequisites:
---------------

* node installed
* AWS credentials configured


Sample
------
Have a look at test.js for the complete code sample
```
var dump = require('elephantdump');
dump.describeEc2AllRegions()
    .on('progress', function (percent, duration, operation, inregion) {
        console.log(inregion, operation);
    })
    .on('complete', function (ec2data, errors) {
        var csvall = dump.transformCsv( dump.aggregateRegions( ec2data ));        // JSON to CSV
    });
```

Usage as command line tools
---------------------------
```
% extractEc2 > Ecdata.json
% transformEc2 < Ec2data.json > Ec2data.csv
% extractEc2 | transformEc2 > Ec2data.csv
```
