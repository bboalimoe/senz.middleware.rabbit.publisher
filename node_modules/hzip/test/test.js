var fs = require("fs");
var zlib = require("zlib");
var Hzip = require("../hzip");

var hzip = new Hzip(fs.readFileSync("./test.zip"),"GBK");

//替换或增加文件
hzip.updateEntry("testDir/中文test.txt",fs.readFileSync("./test.txt"),function(err,buffer){
	if(err) {
		console.log(err);
		return;
	}
	if(fs.existsSync("./test2.zip") === true) fs.unlinkSync("./test2.zip");
	fs.writeFileSync("./test2.zip",buffer);
	
	//解压文件
	var entry = hzip.getEntry("testDir/test.txt");
	zlib.inflateRaw(entry.cfile,function(err,buf){
		console.log(buf.toString());
	});
});