# log.rabbitmq项目主要作用是解析前端传来的Log数据。然后将解析的数据发送到消息队列进行缓存。

- 项目结构(leancloud的云引擎的项目结构)
  - ./cloud.js 是本项目的核心部分
    - func creatInstallation主要是为sdk完成注册。
        - 生成一个代表该终端的_Installation（senz.log.tracer中的_Installation）条目。
        - 如果是初次注册的终端则会生成一个tracker，在（senz.log.tracer中的_User中，且type字段不为developer，这个要在新架构中作区分，developer跟tracker的集合区分开)。
        - 前端传递的数据格式和response格式见 https://trello.com/c/6F7YBpiR
        - func里面需要做的事儿就是关联 Application(senz.log.tracer中的Application),developer,tracker。同时防止重复。能将终端映射为数据分析系统中的唯一标识。
    - before save Log func 主要作用是对log进行预处理，然后将处理后的log存入到db。
        - 坐标为ios传来的坐标。也就是坐标系为WGS坐标时，即 pre_type == "location" && pre_source == "internal"。需要将WGS转为Baidu坐标
        - 当前端传来的是压缩的传感器数据以及结果时，包括几种情况：
           ( (pre_type == "accSensor" || pre_type ==  "magneticSensor" || pre_type == "sensor")  && (compressed == "gzip" || compressed == "gzipped") 
           将压缩后的str用base64解码，然后用gzipp解压缩。
    - after save Log func主要是将各种类型的数据且已经存入到db后，发送到rabbitmq的各个channel上（新架构这部分作废）。其中包括一个坐标系检查的部分代码
        - type的各个字段的具体值见 
           - android （https://trello.com/c/PkklPTbs）  
           - ios（https://github.com/petchat/senz.sdk.ios/wiki/%E5%86%85%E9%83%A8%E5%BC%80%E5%8F%91%E6%96%87%E6%A1%A3 下部）
    
    
    
  - ./essential_modules/rabbit_lib 为rabbitmq相关配置
  - ./essential_modules/utils 为部分工具
     - bug_catch.js bugsnag的wrapper
     - coordinate_trans.js 包括GSW转GCJ转baidu等方法
     - logger.js logentries的wrapper
     - send_notify.js 是经纬度检查的通知群邮箱。
     
         