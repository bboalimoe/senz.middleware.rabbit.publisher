/**
 * Created by zhanghengyang on 15/8/13.
 */


/**
 * Created by zhanghengyang on 15/8/13.
 */
/**
 *
 *  ios 存储到后台的是火星坐标
 *
 */


// 定义经纬度结构体


var Location = function(){

    return this
}

LocationMake = function(lng, lat){

    var loc = new Location();
    loc.lng = lng;
    loc.lat = lat;
    return loc

}


///  WGS-84 到 GCJ-02 的转换
///
pi = 3.14159265358979324;


//
// Krasovsky 1940
//
// a = 6378245.0, 1/f = 298.3
// b = a * (1 - f)
// ee = (a^2 - b^2) / a^2;
a = 6378245.0
ee = 0.00669342162296594323



transformFromWGSToGCJ = function( wgLoc)
{
    mgLoc = new Location();
    if (outOfChina(wgLoc.lat, wgLoc.lng))
    {
        mgLoc = wgLoc;
        return mgLoc;
    }
    dLat = transformLat(wgLoc.lng - 105.0, wgLoc.lat - 35.0);
    dLon = transformLon(wgLoc.lng - 105.0, wgLoc.lat - 35.0);
    radLat = wgLoc.lat / 180.0 * pi;
    var magic = Math.sin(radLat);
    magic = 1 - ee * magic * magic;
    sqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * pi);
    dLon = (dLon * 180.0) / (a / sqrtMagic * Math.cos(radLat) * pi);
    mgLoc.lat = wgLoc.lat + dLat;
    mgLoc.lng = wgLoc.lng + dLon;

    return mgLoc;
}

outOfChina = function(lat, lon){

    if (lon < 72.004 || lon > 137.8347)
        return true;
    if (lat < 0.8293 || lat > 55.8271)
        return true;
    return false;
}



transformLat = function(x, y){

    ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * pi) + 20.0 *Math.sin(2.0 * x * pi)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(y * pi) + 40.0 * Math.sin(y / 3.0 * pi)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(y / 12.0 * pi) + 320 * Math.sin(y * pi / 30.0)) * 2.0 / 3.0;
    return ret;
}



transformLon = function(x, y){

    ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * pi) + 20.0 * Math.sin(2.0 * x * pi)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(x * pi) + 40.0 * Math.sin(x / 3.0 * pi)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(x / 12.0 * pi) + 300.0 * Math.sin(x / 30.0 * pi)) * 2.0 / 3.0;
    return ret;
}




///
///  GCJ-02 坐标转换成 BD-09 坐标
///

x_pi = 3.14159265358979324 * 3000.0 / 180.0;
bd_encrypt = function( gcLoc)
{
    x = gcLoc.lng, y = gcLoc.lat;
    z = Math.sqrt(x * x + y * y) + 0.00002 * Math.sin(y * x_pi);
    theta = Math.atan2(y, x) + 0.000003 * Math.cos(x * x_pi);
    return LocationMake(z * Math.cos(theta) + 0.0065, z * Math.sin(theta) + 0.006);
}

///
///   BD-09 坐标转换成 GCJ-02坐标
///
///
bd_decrypt = function( bdLoc)
{
    x = bdLoc.lng - 0.0065, y = bdLoc.lat - 0.006;
    z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * x_pi);
    theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * x_pi);
    return LocationMake(z * Math.cos(theta), z * Math.sin(theta));
}

//
//test_pre = LocationMake(116.303064, 39.9746293)
////console.log(test_pre)
////test_suf1 = bd_encrypt(transformFromWGSToGCJ(test_pre))
//test_suf2 = bd_encrypt(test_pre)
////console.log(test_suf2)
//
//116.30953451054
//39.980757752447

exports.toBaiduCoordinate = function(lng, lat){

    return bd_encrypt(transformFromWGSToGCJ(LocationMake(lng, lat)))
};

var test_standard_to_baidu = function(lng, lat){

    return bd_encrypt(transformFromWGSToGCJ(LocationMake(lng, lat)))
};


//console.log(test_standard_to_baidu(116.29650493,39.97297579))  //如果这个坐标是火星，转百度，output  { lng: 116.30293895647829, lat: 39.97920639188935 }

//Distanc calculation by baidu


function fD(a, b, c) {
    for (; a > c;)
        a -= c - b;
    for (; a < b;)
        a += c - b;
    return a;
};
function jD(a, b, c) {
    b != null && (a = Math.max(a, b));
    c != null && (a = Math.min(a, c));
    return a;
};
function yk(a) {
    return Math.PI * a / 180
};
function Ce(a, b, c, d) {
    var dO = 6370996.81;
    return dO * Math.acos(Math.sin(c) * Math.sin(d) + Math.cos(c) * Math.cos(d) * Math.cos(b - a));
};
function getDistance(a, b) {
    if (!a || !b)
        return 0;
    a.lng = fD(a.lng, -180, 180);
    a.lat = jD(a.lat, -74, 74);
    b.lng = fD(b.lng, -180, 180);
    b.lat = jD(b.lat, -74, 74);
    return Ce(yk(a.lng), yk(b.lng), yk(a.lat), yk(b.lat));
};
//console.log("fuck")
//116.439643,39.9263871
//console.log(getDistance({lng : 116.309101, lat: 39.9805045},{lng : 116.3092094,lat :39.9803396}));
//console.log("fuck hi")
exports.isCoordinateInChaos = function(geo1){

    geo2 = {lng:116.309101,lat: 39.9805045 }

    if (getDistance(geo1,geo2) > 600){
        return true
    }else{
        return false
    }
}