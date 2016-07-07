var _ = require( 'lodash' );

var cQuo = '"';
var cSep = ';';         // , for US, ; for German
var cCrLf = '\r\n';


function getHeaders( type, a ) {
    var hdrs = [];
    var idproperty = type.slice(0,-1) + 'Id';
    var nameproperty = type.slice(0,-1) + 'Name';

    for( i=0; i < a.length; i++ ) {
        if( typeof a[i] === 'object' && !Array.isArray(a[i]) ) {
            o = a[i];
            for( var prop in o ) {
                if( hdrs.indexOf( prop) < 0 ) {
                    if( prop === idproperty )
                        hdrs.unshift( prop );
                    else if( prop === nameproperty ) {
                        if( hdrs[0] === idproperty )
                            hdrs.splice( 1, 0, prop );
                        else
                            hdrs.unshift(prop);
                    }
                    else
                        hdrs.push( prop );
                }
            }
        }
    }
    //console.log( "getHeaders:", hdrs );
    return hdrs;
}

function strHeaders(hdrs ) {
    var str = '';
    if( hdrs.length > 0 ) {
        for( i=0; i < hdrs.length; i++ ) {
            str += strString( hdrs[i] ) ;
            if( i < hdrs.length -1 )
                str += cSep;
        }
        return str;
    }
}

function strRow( o, hdrs ) {
    var str = '';
    if( hdrs.length > 0 ) {
        for( var i=0; i < hdrs.length; i++ ) {
            if( hdrs[i] ) {
                if( o[hdrs[i]] ) {
                    if (hdrs[i] === "Tags") {
                        str += strString( strTags(o[hdrs[i]]) );     // (name,value)
                    }
                    else if( hdrs[i] === "Associations" ) {
                        var idkey = ""
                        var idvalue = "";
                        var idignore = "";
                        if (hdrs.indexOf("NetworkAclId") >= 0) {
                            idkey = "NetworkAclId";
                            idvalue = o[idkey];
                            idignore = "NetworkAclAssociationId";
                        }
                        else if (hdrs.indexOf("RouteTableId") >= 0) {
                            idkey = "RouteTableId";
                            idvalue = o[idkey];
                            idignore = "RouteTableAssociationId";
                        }
                        str += strString( strAssociations( o[hdrs[i]], idkey, idvalue, idignore ) );
                    }
                    else if ( hdrs[i] === "IpPermissions"  || hdrs[i] === 'IpPermissionsEgress' ) {
                        str += "see table below";
                    }
                    else if ( hdrs[i] === "Entries" ) {
                        str += strString(strListOfObjects(o[hdrs[i]]));
                    }
                    else if ( hdrs[i] === "Routes" ) {
                        str += "see table below";
                    }
                    else if ( hdrs[i] === "DhcpConfigurations" ||  hdrs[i] === "Attachments" ) {
                        str += strString(strListOfObjects(o[hdrs[i]]));
                    }
                    else {
                        str += strString( o[hdrs[i]] );     // value
                    }
                }
                else {
                    str += strString( '' );    // empty cell in CSV
                }
                if (i < hdrs.length - 1)
                    str += cSep;
            }
        }
        return str;
    }
}

function strString( s ) {
    var str = '';
    if( s  ) {
        if( typeof(s) === 'string') {
            str = s;
            if( s.match( /\d{12}$/ ) )
                str = "'" + s;     // ' inhibits Excel to convert accountID back to number like 5.12345E+11
        }
        else if( typeof(s) === 'number') {
            str = s.toString();
        }
        else if( typeof(s) === 'object' ) {
            str = s.toString();
            if( str.includes('[object Object]') ) {
                str = JSON.stringify(s);
            }
        }
        else {
            str = s.toString();
        }

        str = str.replace(cQuo, cQuo + cQuo); // replace quotes by double quotes
    }
    return cQuo + str + cQuo;
}

function strTags( t ) {
    var str = '';
    if( t && typeof t === 'object' ) {
        for( i=0; i < t.length; i++ ) {
            str += '(' + t[i].Key + "=" + t[i].Value + ')';
            if( i < t.length-1 )
                str += ' ';
        }
    }
    return str;
}

function getNameFromTags( t ) {
    var name = _.find( t, { Key: "Name"} );
    if( name )
        return name.Value;
    else
        return '';
}

function insertName(table, idproperty, nameproperty ) {
    var newtable = [];
    for( i=0; i < table.length; i++ ) {
        var record = table[i];
        if( record[idproperty] )
            record[nameproperty] = getNameFromTags( record.Tags );
        newtable.push( record );
    }
    return newtable;
}

function expandMasterDetail( mastertable, idproperty, detailproperty ){
    var newtable = [];
    for( i=0; i < mastertable.length; i++ ) {
        var master = mastertable[i];
        var id = master[idproperty];
        var name = getNameFromTags( master.Tags );
        var details = master[detailproperty];
        for( var j=0; j < details.length; j++ ) {
            var product = _.clone( details[j]);
            product[idproperty] = id;
            product['Name'] = name;
            if( master.Region ) product.Region = master.Region;
            newtable.push( product );
        }
        if( details.length == 0 ) {
            var product = {};
            product[idproperty] = id;
            product['Name'] = name;
            if( master.Region ) product.Region = master.Region;
            newtable.push( product );
        }
    }
    return newtable;
}

function transformIpPermissions( accountID, securitygroups, property, defaultaccess )
{
    // collects IpPermissions within SecurityGroups
    var ipperms = [];
    for (i = 0; i < securitygroups.length; i++) {
        var sgid = securitygroups[i].GroupId;
        var ip = securitygroups[i][property];
        for (var j = 0; j < ip.length; j++) {
            ip[j].GroupId = sgid;               // explicitly add relation
            ip[j].GroupName = getNameFromTags( securitygroups[i].Tags );
            var newIp = JSON.parse(JSON.stringify(ip[j]));
            delete newIp.IpRanges;              // we expand this field
            delete newIp.UserIdGroupPairs;      // we expand this field
            if (newIp.FromPort == newIp.ToPort)
                newIp.ToPort = "";              // remove redundancy
            if (newIp.IpProtocol === "-1")
                newIp.IpProtocol = "all";
            if (ip[j].IpRanges && ip[j].IpRanges.length > 0) {
                var ipr = ip[j].IpRanges;
                for (var k = 0; k < ipr.length; k++) {
                    if ("CidrIp" in ipr[k])
                        newIp.Source = ipr[k].CidrIp;
                    else
                        newIp.Source = "unknown range";
                    if( securitygroups[i].Region ) newIp.Region = securitygroups[i].Region;
                    ipperms.push(newIp);              // add all IPs for all IpRanges
                }
            }
            if (ip[j].UserIdGroupPairs && ip[j].UserIdGroupPairs.length > 0) {
                var ugp = ip[j].UserIdGroupPairs;
                for (var k = 0; k < ugp.length; k++) {
                    if ("UserId" in ugp[k] && "GroupId" in ugp[k]) {
                        if (ugp[k].UserId === accountID)
                            newIp.Source = ugp[k].GroupId;
                        else
                            newIp.Source = '(' + ugp[k].UserId + ',' + ugp[k].GroupId + ')';
                    }
                    else
                        newIp.Source = "unknown userid group pair";
                    if( securitygroups[i].Region ) newIp.Region = securitygroups[i].Region;
                    ipperms.push(newIp);      // add all IPs for all UserIdGroupPairs
                }
            }
            if (( !ip[j].IpRanges || ip[j].IpRanges.length <= 0 )
                && ( !ip[j].UserIdGroupPairs || ip[j].UserIdGroupPairs.length <= 0 )) {
                newIp.Source = "not set";
                if( securitygroups[i].Region ) newIp.Region = securitygroups[i].Region;
                ipperms.push(newIp);    // create at least one line with empty source
            }
        }
        if (ip.length === 0)
            ipperms.push({GroupId: sgid, Region: securitygroups[i].Region, FromPort: defaultaccess, IpProtocol: defaultaccess, Source: defaultaccess});        // empty line = no access
    }
    return printArray(property, ipperms) + '\r\n';
}

function strAssociations( assoc, idkey, idvalue, idignore ) {
    // leaves out redundant information from CSV
    if( ! Array.isArray( assoc )  )
        return '';  // something wrong
    if( idkey==='' || idvalue==='' || idignore==='' )
        return strListOfObjects( assoc );

    var str = '';
    for( var i= 0; i <assoc.length; i++ ) {
        if (typeof assoc[i] === "object") {
            for (var prop in assoc[i]) {
                if( prop === idignore
                    || ( prop == idkey && assoc[i][prop] === idvalue ) ) {
                    // do nothing
                }
                else if( prop === "Main" && assoc[i][prop] ) {
                    str += '(main)';
                }
                else {
                    str += assoc[i][prop];
                }
            }
        }
        else {
            str+= assoc[i].toString();
        }
        if( i < assoc.length -1 )
            str += ',';
    }
    return str;
}

function strListOfObjects( ao ) {
    if( ! Array.isArray( ao ) )
        return '';
    var str = '';
    for( var i= 0; i <ao.length; i++ ) {
        if (typeof ao[i] === "object") {
            var strTuple = '(';
            for (var prop in ao[i]) {
                // console.log("o[" + i  + "]." + prop + "=" + ao[i][prop] );
                if( !strTuple.endsWith( '(' )  )
                    strTuple += ',';
                strTuple += prop + '=' + ao[i][prop];
            }
            strTuple += ')';
        }
        str += strTuple;
        if( i < ao.length -1 )
            str += ' ';
    }
    return str;
}

function printArray( type, a ) {
    if( a.length  === 0 && type && type !== "" )
        return strString('Type') + cCrLf + strString( type ) + cCrLf;   // named placeholder for empty array

    var str = '';
    if( type && type !== "" )
        str += strString('Type') + cSep;

    var hdrs = getHeaders( type, a );
    if( hdrs.length > 0 )
        str +=  strHeaders( hdrs );
    str += cCrLf;
    for (var i = 0; i < a.length; i++) {
        if( type && type !== "" )
            str += strString (type) + cSep;
        if( typeof(a[i]) === 'object' )
            str += strRow((a[i]), hdrs) + cCrLf;
        else
            str += strString(a[i]) + cCrLf;
    }

    return str;
}

function flattenAttribute( records, attribute ) {
    var results = [];
    for( i=0; i<records.length; i++ ) {
        var record = _.clone(records[i]);
        if( typeof record[attribute] === 'object' ) {
            var o = record[attribute];
            for( var property in o ) {
                record[attribute+'.'+property] = o[property]; // flatten
            }
            delete record[attribute];
        }
        results.push( record );
    }
    return results;
}

function transformCsv(ec2) {
    var csv = "sep=" + cSep + cCrLf;    // tell Excel our separator
    for (var attr in ec2) {        // strings first
        if (typeof ec2[attr] === 'string') {
            // console.log("ec2." + attr + "=" + ec2[attr]);
            csv += strString(attr) + cSep + strString(ec2[attr]) + cCrLf;
        }
    }
    if (csv !== "") csv += '\r\n';

    for (var prop in ec2) {      // arrays then
        //console.log("prop1:", prop);
        if (Array.isArray(ec2[prop])) {
            var idproperty = prop.slice(0,-1) + "Id";
            var nameproperty = prop.slice(0,-1) + "Name";
            csv += printArray(prop, insertName( ec2[prop], idproperty, nameproperty ) ) + '\r\n';
        }
        else if (typeof ec2[prop] === "object") {
            debugger;
        }
    }
    csv += printArray( "NetworkAcl.Entries", flattenAttribute( expandMasterDetail( ec2['NetworkAcls'], "NetworkAclId", "Entries" ), "PortRange" ) );
    if (csv !== "") csv += '\r\n';
    csv += printArray( "RouteTable.Routes", expandMasterDetail( ec2['RouteTables'], "RouteTableId", "Routes" ) );
    if (csv !== "") csv += '\r\n';
    csv += transformIpPermissions(ec2.accountID, ec2['SecurityGroups'], "IpPermissions", "forbidden");
    if (csv !== "") csv += '\r\n';
    csv += transformIpPermissions(ec2.accountID, ec2['SecurityGroups'], "IpPermissionsEgress", "allowed");
    return csv;
}

function aggregateRegions(ec2){
    var aggregate = { TimeRead: ec2.TimeRead, codeversion: ec2.codeversion, accountID: ec2.accountID };
    for (var region in ec2) {      // region.type.[...] --> type[<region>...]
        var o = ec2[region];       //
        if (typeof o === "object") {
            for( var type in o ) {
                var asrc = o[type];
                if (Array.isArray(asrc)) {
                    if( !aggregate[type] )
                        aggregate[type] = [];     // create the property
                    var adest = aggregate[type];
                    for( var i in asrc ) {
                        var item = asrc[i];
                        item.Region = region;
                        adest.push( item );
                    }
                    if( asrc.length == 0 && false ) {
                        adest.push( { Region: region });    // at least one empty record
                    }
                }
            }
        }
    }
    return aggregate;
}

exports.transformCsv = transformCsv;
exports.aggregateRegions = aggregateRegions;