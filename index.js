const spawnSync = require('child_process').spawnSync;
const fs = require('fs')
const fse = require('fs-extra')
const crypto = require('crypto');
const path = require('path');
const blockRegex = /^```uml((.*[\r\n]+)+?)?```$/im;
const basePath = '.uml/';
fse.mkdirsSync(basePath);
var outputBasePath;
const umlList = new Array();
const pngMap = {};

function processBlockList(page, umlPath) {
    var dirPath = path.dirname(page.path);
    var baseName = path.basename(page.path, '.md');
    var match;
    var index = 0;
    while ((match = blockRegex.exec(page.content))) {
        var indexBaseName = baseName + '_' + (index++);
        var relativePath = dirPath + '/' + indexBaseName;
        var pngOutPath = outputBasePath + relativePath + '_uml.png';
        var assetsPathPrefix = basePath + relativePath;
        var linkPath = indexBaseName + '_uml.png';
        var umlPath = assetsPathPrefix + '.uml';
        var pngPath = assetsPathPrefix + '.png';
        pngMap[pngPath] = pngOutPath;
        var rawBlock = match[0];
        var blockContent = match[1];
        var isUpdateImageRequired = !fs.existsSync(umlPath);
        var md5sum = crypto.createHash('sha1').update(blockContent).digest('hex');
        if (!isUpdateImageRequired) {
            var lastmd5sum = '';
            var sumPath = umlPath + '.sum';
            if (fs.existsSync(sumPath)) {
                try {
                    lastmd5sum = fs.readFileSync(sumPath, encoding = 'utf-8');
                } catch (e) {}
                isUpdateImageRequired = (lastmd5sum != md5sum);
            } else {
                isUpdateImageRequired = true;
            }
        }
        if (!isUpdateImageRequired) {
            isUpdateImageRequired = !fs.existsSync(pngPath);
        }
        //UML
        console.log('%j-> %j-> %j %j', page.path, umlPath, pngPath, isUpdateImageRequired);
        if (isUpdateImageRequired) {
            fse.mkdirsSync(path.dirname(umlPath));
            fse.outputFileSync(umlPath, blockContent);
            fse.outputFileSync(umlPath + '.sum', md5sum, encoding = 'utf-8');
            umlList.push(umlPath);
        }
        page.content = page.content.replace(rawBlock, '![](' + linkPath + ')');
    }
    return page;
}
module.exports = {
    hooks: {
        "init": function() {
            outputBasePath = this.output.root() + '/';
        },
        // Before parsing markdown
        "page:before": processBlockList,
        "finish:before": function() {
            if (umlList.length > 0) {
                try {
                    var exe = spawnSync('java', ['-jar', 'node_modules/gitbook-plugin-plantuml/plantuml.jar',
                        umlList
                    ]);
                    console.log(exe.stdout.toString());
                } catch (e) {
                    console.log(e);
                }
            }
            for(var pngPath in pngMap) {
                fse.copySync(pngPath, pngMap[pngPath]);
            }
        }
    }
};