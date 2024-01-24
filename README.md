# pkg打包nodejs应用步骤
### 完整安装Nodejs
完整安装node-v18.15.0-x64.msi，选择完整安装，安装同时勾选 安装c++编译模块的构建工具。构建工具是因为一些npm模块需要使用C/C++编译，如果想要编译这些模块，则需要安装这个工具。如果不安装这个构建工具，在之后使用 npm 安装模块的时候，会报错。
![nodejs编译构建工具](/nodejs_install.png)

### 全局安装pkg
```js
npm install pkg -g
```
### 修改nodejs应用下的package.json文件
```js
{
  "name": "123",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "",
  "license": "ISC",
  "dependencies": {
    "chalk": "^2.4.2",
    "csv-parser": "^3.0.0",
    "detect-file-encoding-and-language": "^2.4.0",
    "exceljs": "^4.4.0",
    "fast-csv": "^5.0.0",
    "iconv-lite": "^0.6.3",
    "inquirer": "^5.0.0",
    "ora": "^5.4.1"
  },
  "bin":"app.js",
  "pkg":{
    "outputPath":"executables",
    "targets":[
      "node18-win-x64"
    ]
  }
}

```
bin: pkg打包入口
outputPath: 输出应用路径
targets: 编译目标平台
### 首次编译尝试
在nodejs应用路径下执行 **pkg .** 运行打包过程，执行**pkg .** 或者**pkg package.json**命令。如果有错误提示，查看错误提示需要使用的编译组件是哪个版本的node-vx.x.x-win-x64，比如这里是需要加载node-v18.5.0-win-x64 组件

### 下载编译组件
登录https://github.com/vercel/pkg-fetch/releases    在页面上的v3.4更新日志记录中找到Assets链接，点开下面折叠的各版本组件，node-v18.5.0-win-x64，下载后重命名为fetched-v18.5.0-win-x64

### 拷贝编译组件到pkg-cache目录
在pkg缓存目录中新建v3.4文件夹 C:\Users\Administrator\.pkg-cache\v3.4 并将fetched-v18.5.0-win-x64拷贝到v3.4目录下

### 再次编译
重新执行pkg .或者pkg package.json命令进行打包


### pkg打包nodejs应用的一些坑
1. 项目中不要使用esmodule规范导入模块，改用commonjs规范
2. 项目中不要使用各平台不一致的库，比如v8 模块
3. 项目中如果使用path.join方法拼接__dirname或__filename路径，拼接中的变量如果在其他目录中，就必须在package.json中配置pkg的"asset"s:[]配置项，以指定无法被自动打包的路径。建议使用process.cwd()拼接
4. 如果打包出来的应用闪退，可以在命令行中调用该应用，在命令行中可以看见错误信息