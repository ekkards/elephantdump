/* describeEc2.js, Ekkard Schnedermann, elephantshop 2016 */
/* license: ICS, see npm package */

const aws = require('aws-sdk');

const EventEmitter = require('events');
const util = require('util');
function MyEmitter() {
    EventEmitter.call(this);
}

exports.describeEc2 = describeEc2;
exports.describeEc2AllRegions = describeEc2AllRegions;

function describeEc2AllRegions(credentials ) {
    var regions = [
        'ap-northeast-1',
        'ap-northeast-2',
        'ap-south-1',
        'ap-southeast-1',
        'ap-southeast-2',
        'eu-central-1',
        'eu-west-1',
        'sa-east-1',
        'us-east-1',
        'us-west-1',
        'us-west-2'
    ];
    var requests = [];
    for (var i in regions) {
        Array.prototype.push.apply(requests, createEc2Requests(regions[i], credentials));
    }
    return runRequests(requests);
}

function describeEc2(region, credentials) {
    return runRequests(createEc2Requests(region, credentials));
}

function createEc2Requests(region, credentials) {
    //console.log("createEc2Requests(", region, credentials ? credentials.AccessKeyId : "", ")");
    var options = {region: region};
    if (credentials)
        options = {
            region: region,
            accessKeyId: credentials.AccessKeyId,
            secretAccessKey: credentials.SecretAccessKey,
            sessionToken: credentials.SessionToken
        };
    var ec2 = new aws.EC2(options);

    var requestsEc2 = [
        ec2.describeAccountAttributes(null),
        ec2.describeAddresses(null),
        ec2.describeBundleTasks(null),
        ec2.describeConversionTasks(null),
        ec2.describeExportTasks(null),
        ec2.describeHosts(null),
        ec2.describeIdFormat(null),
        ec2.describeImportImageTasks(null),
        ec2.describeImportSnapshotTasks(null),
        //ec2.describeInstanceAttribute(null),
        ec2.describeInstances(null),
        ec2.describeInstanceStatus(null),
        ec2.describeKeyPairs(null),
        ec2.describeMovingAddresses(null),
        //ec2.describeNetworkInterfaceAttribute(),
        ec2.describeNetworkInterfaces(null),
        ec2.describePlacementGroups(null),
        ec2.describeReservedInstances(null),
        ec2.describeReservedInstancesModifications(null),
        //ec2.describeScheduledInstanceAvailability(),
        ec2.describeScheduledInstances(null),
        //ec2.describeSpotFleetInstances(),
        //ec2.describeSpotFleetRequestHistory(),
        ec2.describeSpotFleetRequests(null),
        ec2.describeSpotInstanceRequests(null),
        ec2.describeTags(null),
        //ec2.describeVolumeAttribute(),
        ec2.describeVolumes(null),
        ec2.describeVolumeStatus(null)
    ];

    var requestsEc2Public = [
        ec2.describeAvailabilityZones(null),
        //ec2.describeImageAttribute(),
        ec2.describeImages(null),                 // really big
        ec2.describePrefixLists(null),
        ec2.describeRegions(null),
        ec2.describeReservedInstancesListings(null),
        ec2.describeReservedInstancesOfferings(null),
        ec2.describeSnapshots(null),
        //ec2.describeSnapshotAttribute(),      // mandatory attribute
        ec2.describeSpotDatafeedSubscription(null),
        ec2.describeSpotPriceHistory(null),
    ];

    var requestsVpc = [
        ec2.describeCustomerGateways(null),
        ec2.describeDhcpOptions(null),
        ec2.describeFlowLogs(null),
        ec2.describeInternetGateways(null),
        ec2.describeNatGateways(null),
        ec2.describeNetworkAcls(null),
        ec2.describeRouteTables(null),
        //ec2.describeSecurityGroupReferences(),
        ec2.describeSecurityGroups(null),
        //ec2.describeStaleSecurityGroups(),
        ec2.describeSubnets(null),
        //ec2.describeVpcAttribute(),
        ec2.describeVpcEndpoints(null),
        ec2.describeVpcEndpointServices(null),
        ec2.describeVpcPeeringConnections(null),
        ec2.describeVpcs(null),
        ec2.describeVpnConnections(null),
        ec2.describeVpnGateways(null)
    ];
    // UnsupportedOperation: The functionality you requested is not available in this region.
    if (options.region != 'eu-central-1' && options.region != 'sa-east-1' && options.region != 'ap-south-1') {
        requestsVpc.push(ec2.describeVpcClassicLink(null));
        requestsVpc.push(ec2.describeClassicLinkInstances(null));
        requestsVpc.push(ec2.describeVpcClassicLinkDnsSupport(null));
    }
    Array.prototype.push.apply( requestsEc2, requestsVpc );
    return requestsEc2;
}

function runRequests( requests ) {
    var event = new EventEmitter.EventEmitter();
    util.inherits(MyEmitter, EventEmitter);
    var myEmitter = new MyEmitter();

    var ec2data = {TimeRead: new Date().toJSON(), codeversion: 'ES_20160707'};  // a big container
    var errors = [];
    var sent = 0;
    var completed = 0;
    for (var i in requests) {
        requests[i]
            .on('error', function (error, response) {
                var errTxt = "Error '" + error.code + "' in region " + this.httpRequest.region + " for function '" +  this.operation + "':" + error.message;
                errors.push( {code: error.code, region: this.httpRequest.region, operation: this.operation, message: error.message, text: errTxt } );
                //console.error(errTxt);
            })
            .on('success', function (response) {
                var property = Object.keys(response.data) [0];
                //if( ! this.operation.endsWith( property ) )
                //    console.log( "success: operation=", this.operation, "<->", property, " delivered")
                var region = this.httpRequest.region;
                if( !ec2data[region] )
                    ec2data[region] = {};
                if (property == "Vpcs" && response.data[property] && response.data[property][0]) {
                    // do not overwrite Vpcs information
                    if ('ClassicLinkEnabled' in response.data[property][0])
                        ec2data[region]['VpcClassicLinks'] = response.data["Vpcs"];
                    else if('ClassicLinkDnsSupported' in response.data[property][0])
                        ec2data[region]['VpcClassicLinkDnsSupported'] = response.data["Vpcs"];  // do not overwrite Vpcs information
                    else
                        ec2data[region][property] = response.data[property];  // copies the JSON from array to object
                }
                else
                    ec2data[region][property] = response.data[property];  // copies the JSON from array to object
            })
            .on('complete', function(response) {
                if( ++completed >= requests.length ) {
                    myEmitter.emit( 'complete', ec2data, errors );
                }
                else {
                    if( sent < requests.length )
                        requests[sent++].send();
                    var from = this.startTime.valueOf();
                    var duration = (Date.now().valueOf() - from)/1000;
                    myEmitter.emit( 'progress', completed / requests.length, duration, this.operation, this.httpRequest.region );
                }
            });
    }
    for ( sent=0; sent < requests.length; sent++) {
        requests[sent].send();
    }

    return myEmitter;
}
