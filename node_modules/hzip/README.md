hzip 定向压缩或者解压缩ZIP文件
====

```javascript
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
```
由于Excel2007以上的版本其实都是zip文件,里面就是xml文档
那么,你懂的,它可以用来导入导出Excel2007或者以上的版本
实际项目中已经在用了

安装:
npm install hzip

hzip.updateEntry(fileName,fileBuf,callback)
第一个参数是文件在压缩包里面的路径,如果这个路径fileName不存在,则会自动创建这个文件夹
如果这个路径上已经有这个文件了,则会覆盖这个文件,
第二个参数是fileBuf,需要压缩的文件的buffer对象,如果为undefined或者null值,则会删除这个文件fileName

捐赠鼓励支持此项目:

![捐赠鼓励支持此项目](http://a2.qpic.cn/psb?/730a4bd2-76fb-497d-ae09-25f9b8e0ed42/B7.ST*EXAdd7J9RiXwK42TY4oQ0PidoxIvJOGciAuq0!/b/dAcAAAAAAAAA&bo=AAEAAQAAAAADByI!&rf=viewer_4)
