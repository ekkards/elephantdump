# elephantdump
-------------------------
Modules for extracting configuration data from AWS and displaying them

install:

% sudo npm install -g .



usage:

% extractEc2 > Ecdata.json

% transformEc2 < Ec2data.json > Ec2data.csv

% extractEc2 | transformEc2 > Ec2data.csv


prerequisites:

* node installed
* AWS credentials configured
  
