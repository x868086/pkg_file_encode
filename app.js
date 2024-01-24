// import path from 'path';

// import { createReadStream, createWriteStream, unlink } from 'node:fs';
// import csv from 'fast-csv';


const path = require('path')
const { createReadStream, createWriteStream } = require('node:fs');
const unlink = require('node:fs').unlink;
const csv = require('fast-csv');

// import ExcelJS from 'exceljs';
// import ora from 'ora';
const ExcelJS = require('exceljs');
const ora = require('ora');

// import { promises as fs } from 'fs';
const fs = require('fs').promises;

// import inquirer from 'inquirer';
// import chalk from 'chalk'
const inquirer = require('inquirer');
const chalk = require('chalk');


// import languageEncoding from 'detect-file-encoding-and-language'
// import iconv from 'iconv-lite'

const languageEncoding = require('detect-file-encoding-and-language');
const iconv = require('iconv-lite');


// import v8 from 'v8';
// const v8 = require('v8');
// const heapStatistics = v8.getHeapStatistics();
// const defaultHeapSize = (heapStatistics.heap_size_limit / 1024 / 1024).toFixed(2)

const loading2 = ora({
    color: 'green',
    text: 'Loading...',
    prefixText: '解析表格',
});


const loading = ora({
    color: 'green',
    text: 'Loading...',
    prefixText: '文件编码',
});




const tableHeadReg = /([\u3002|\uff1f|\uff01|\uff0c|\u3001|\uff1b|\uff1a|\u201c|\u201d|\u2018|\u2019|\uff08|\uff09|\u300a|\u300b|\u3008|\u3009|\u3010|\u3011|\u300e|\u300f|\u300c|\u300d|\ufe43|\ufe44|\u3014|\u3015|\u2026|\u2014|\uff5e|\ufe4f|\uffe5]+)|([\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*`·+,\-.\/:;<=>?@\[\]^{|}~]+)/g

const commaReg = /[\uff0c]+|,+/g

const fileTypeHandle = {
    'xlsx': fileSaveAsCsv,
    'xls': fileSaveAsCsv,
    'csv': csvMethod
}


// 生成DDL时间戳函数
function getFormattedDateTime() {
    var date = new Date();
    var month = (date.getMonth() + 1).toString().padStart(2, '0'); // 月份从0开始，需要加1
    var day = date.getDate().toString().padStart(2, '0');
    var hours = date.getHours().toString().padStart(2, '0');
    var minutes = date.getMinutes().toString().padStart(2, '0');
    var seconds = date.getSeconds().toString().padStart(2, '0');

    var formattedDateTime = month + day + hours + minutes + seconds;
    return formattedDateTime;
}

function cleanComma(str, commaReg) {
    return str.replaceAll(commaReg, '')
}




//异步读取文件列表
async function getFileList(filePath) {
    try {
        const files = await fs.readdir(filePath)
        const excelFiles = files.filter(file => path.extname(file) === '.xlsx' || path.extname(file) === '.xls' || path.extname(file) === '.csv');
        return excelFiles
    } catch (error) {
        throw `❌   读取当前目录文件出错${error}`
    }
}

// 打印文件列表
async function diyFiles(lists) {
    try {
        const promptList = [
            {
                type: 'list',
                message: '请选择一个选项:',
                name: 'choice',
                choices: lists,
            },
        ];

        let answers = await inquirer.prompt(promptList)
        return answers.choice
    } catch (error) {
        throw new Error(`打印文件信息错误 ${error}`)
    }

}



//检测文件编码格式
async function detectEncode(fileName) {
    try {
        let filePath = path.join(process.cwd(), fileName)
        const fileInfo = await languageEncoding(filePath)
        let souceType = fileInfo.encoding
        console.log(souceType)
        let dict = {
            'UTF-8': chalk.bgGreen(`${souceType}`),
            'GB18030': chalk.bgYellow(`${souceType}`)
        }
        console.log(`文件当前编码格式:${dict[souceType]} 文件名称:${fileName}`)
        return {
            fileName,
            souceType
        }
    } catch (error) {
        throw new Error(`检测文件编码格式错误, ${error}`)
    }

}



// csv格式文件转码另存
async function encodeSave(fileName, souceType) {
    try {
        console.log(chalk.yellow(`当前格式为${souceType},正在转换成UTF-8`))
        let outPath = path.join(process.cwd(), `${fileName}.temp.csv`);
        const readStream = createReadStream(fileName);
        const writeStream = createWriteStream(outPath);

        readStream.on('data', e => {
            loading.text = 'Loading...'
            loading.start()
        })

        readStream
            .pipe(iconv.decodeStream(souceType.toLowerCase()))
            .pipe(iconv.encodeStream('utf8'))
            .pipe(writeStream);

        // writeStream.on('finish', () => {
        //     loading.succeed(`文件成功编码为${chalk.bgGreen('UTF-8')}`);
        //     loading.stop()
        // })

        await new Promise((resolve, reject) => {
            writeStream.on('finish', () => {
                loading.succeed(`文件成功编码为${chalk.bgGreen('UTF-8')}`);
                loading.stop()
                resolve()
            })
            writeStream.on('error', (err) => {
                reject(new Error('文件编码错误'))
            })
        })
        return {
            codeType: 'UTF-8',
            fileName: fileName,
            outPath: outPath
        }
    } catch (error) {
        throw new Error(`CSV文件编码另存错误, ${error}`)
    }

}





async function csvMethod(choice) {
    try {
        let { fileName, souceType } = await detectEncode(choice)
        if (souceType === 'UTF-8') {
            return {
                codeType: souceType,
                fileName: fileName,
                outPath: path.join(process.cwd(), fileName)
            }
        } else if (souceType === 'GB18030') {
            let { codeType, outPath } = await encodeSave(fileName, souceType)
            return {
                codeType: codeType,
                fileName: fileName,
                outPath: outPath
            }
        } else {
            console.log(`❌ 不支持的文件编码格式`)
            return false
        }
    } catch (error) {
        throw new Error(`处理CSV文件错误, ${error}`)
    }

}


async function fileSaveAsCsv(filename) {
    try {
        let tempFilePath = path.join(process.cwd(), 'temp.utf8.csv')
        const writeStream = createWriteStream(tempFilePath);
        // 创建csv写入流,与ExcelJS的写入流pipe
        const csvStream = csv.format({ headers: true })
        csvStream.pipe(writeStream)
        const options = {
            sharedStrings: 'cache',
            hyperlinks: 'emit',
            worksheets: 'emit',
        };
        const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(filename, options);
        workbookReader.read();

        workbookReader.on('worksheet', worksheet => {
            loading2.text = 'Loading...'
            loading2.start()
            worksheet.on('row', row => {
                // loading2.suffixText = `  MemoryUsed ${(((process.memoryUsage()).heapTotal) / 1024 / 1024).toFixed(2)} MB`
                // 只读取第一个sheet
                if (row.worksheet.id === 1) {
                    // 第一轮遍历将单元格公式转换成具体的值
                    var cellContent = row.values.map(e => {
                        return (e instanceof Object && e['result']) ? e['result'] : e
                    })
                        //第二轮遍历去除逗号,避免转换csv文件中的逗号出错
                        .map(e => {
                            return (typeof (e) === 'string') ? cleanComma(e, commaReg) : e
                        })
                    // console.log(row.number)
                    // 逐行读取表格，并写入到csvStream中，忽略第一个列（行号）,exceljs库读取时每行第一个单元格是空
                    csvStream.write(cellContent.slice(1))
                } else {
                    return
                }
            });
        });

        workbookReader.on('end', () => {
            // 所有表格读取完成后，调用写入.end()方法
            csvStream.end()
            loading2.succeed('临时表格创建完成');
            loading2.stop()
        });
        workbookReader.on('error', (err) => {
            console.log(`❌ 解析表格错误${err}`)
            loading2.fail('解析表格错误')
        });

        await new Promise((resolve, reject) => {
            csvStream.on('end', () => {
                // csvStream.end()方法触发writeStream.end()
                writeStream.end()
                resolve('WTF!!!!!')
            })
            csvStream.on('error', () => {
                reject(new Error('临时表格创建错误'))
            })
        })

        return {
            codeType: 'UTF-8',
            fileName: filename,
            outPath: tempFilePath
        }
    } catch (error) {
        throw new Error(`Excel转换CSV文件错误, ${error}`)
    }


}

async function renameHeader(tempFilePath, fileName) {
    try {
        const inputFilePath = tempFilePath;
        const outputFilePath = path.join(process.cwd(), fileName + '.utf8.csv');

        // 创建可读流和可写流
        const readStream = createReadStream(inputFilePath, { encoding: 'utf8' });
        const writeStream = createWriteStream(outputFilePath, { encoding: 'utf8' });

        // 处理未捕获的读取流错误
        readStream.on('error', (err) => {
            console.error(`❌   写入表格错误${err}`);
        });

        // 当写入流关闭时（即所有数据都已被写入）
        writeStream.on('finish', () => {
            // 删除当前目录下inputFilePath文件
            unlink(inputFilePath, (err) => {
                if (err) {
                    console.error(`❌   删除文件错误${err}`);
                }
            });
            // console.log('Output file written successfully!');
        });


        let firstRow = 0
        let ddlHeader = []
        const csvWriter = csv.format({ headers: true })
            .transform(row => {
                firstRow += 1
                if (firstRow === 1) {
                    return row.map((e, i, a) => {
                        // return (typeof (e) === 'string') ? e.replaceAll(tableHeadReg, '') : e
                        if (typeof (e) === 'string') {
                            let step0 = e.replaceAll(' ', '');
                            let step1 = step0.replaceAll(tableHeadReg, '')
                            let step2 = /^(\d)/.test(step1) ? `修正${step1}` : step1
                            let step3 = step2.length > 15 ? step2.slice(0, 15) : step2
                            let str = (e.trim().length === 0) ? `空字段${i + 1}` : step3
                            ddlHeader.push(str)
                            return str
                        } else {
                            return `非字符串列${i}`
                        }
                    })
                } else {
                    return row
                }
            });

        csvWriter.pipe(writeStream)

        csvWriter.on('end', () => {
            writeStream.end()
            loading2.suffixText = ``
            loading2.succeed(`表格写入完成, 导入文件路径-->: ${outputFilePath}`);
            loading2.stop()
        })
        await new Promise((resolve, reject) => {
            csv.parseStream(readStream)
                .on('error', error => {
                    console.log(`❌ 写入表格错误${error}`)
                    reject(new Error('重写表格错误'))
                })
                .on('data', (row) => {
                    loading2.prefixText = '重建表格'
                    loading2.text = 'Loading...'
                    loading2.start()
                    // loading2.suffixText = `  MemoryUsed ${(((process.memoryUsage()).heapTotal) / 1024 / 1024).toFixed(2)} MB`
                    csvWriter.write(row)
                })
                .on('end', rowCount => {
                    console.log(`
    ✔️ 成功写入${rowCount}行`)
                    csvWriter.end()
                    resolve()
                });
        })
        return {
            ddlHeader, fileName
        }
    } catch (error) {
        throw new Error(`清洗表头重写文件错误 ${error}`)
    }

}


// 创建表 DDL
async function createDDL(arr, tableName, fileName) {
    try {
        let str = '';
        arr.forEach((e, i, a) => {
            if (i === a.length - 1) {
                str += `${e} varchar(255)`
            } else {
                str += `${e} varchar(255),
                `
            }

        })
        let ddl = `
        CREATE TABLE ${tableName} 
        (
                ${str}
        );`
        // DDL写入到文本文件
        let ddlPath = path.join(process.cwd(), fileName + '.DDL.txt')
        try {
            await fs.writeFile(ddlPath, ddl)
        } catch (error) {
            console.error(`❌ 写入DDL文件时发生错误: ${error}`);
        }

        return { ddl, ddlPath }
    } catch (error) {
        throw new Error(`创建表DDL错误 ${error}`)
    }

}


async function handleFile(filePath) {
    try {
        let files = await getFileList(filePath)
        let choice = await diyFiles(files)
        // debug flag
        // let choice = '2024年1月以移带固.xlsx'
        // let choice = '67890.xlsx'
        // let choice = 'demo3.csv'
        const extension = path.extname(choice)
        const extensionWithoutDot = extension.replace(/^\./, '');
        if ((/\.xlsx$|\.xls$|\.csv$/g).test(extension)) {
            // 不同类型文件调用不同方法 - table drive 
            let { codeType, fileName, outPath } = await fileTypeHandle[extensionWithoutDot](choice)
            let { ddlHeader } = await renameHeader(outPath, fileName)
            let { ddl, ddlPath } = await createDDL(ddlHeader, `IMPORT_${getFormattedDateTime()}`, fileName)
            // console.log(ddl)
            console.log(`
    ✔️ DDL文件创建成功, DDL路径-->: ${ddlPath}`)
        } else {
            console.log(`❌ ${chalk.green(暂不支持该文件格式)}`)
            return false
        }
    } catch (error) {
        throw new Error(`文件操作发生错误 ${error}`)
    }

}

handleFile(process.cwd()).catch(err => {
    console.log(`❌ 命令行错误：, ${err}`)
    throw err
})