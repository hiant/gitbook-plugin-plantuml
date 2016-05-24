const execFileSync = require('child_process').execFileSync;
const fs = require('fs')
const fse = require('fs-extra')
const crypto = require('crypto');
const path = require('path');
const blockRegex = /^```uml((.*[\r\n]+)+?)?```$/im;
const basePath = 'images/uml/';

function processBlockList(page, umlPath) {
    var dirPath = path.dirname(page.path);
    var baseName = path.basename(page.path, '.md');
    var outputDir = '_book/images/uml/' + dirPath;
    var match;
    var index = 0;
    while ((match = blockRegex.exec(page.content))) {
        var indexBaseName = baseName + '_' + (index++);
        var assetsPathPrefix = basePath + dirPath + '/' + indexBaseName;
        var linkPath = assetsPathPrefix + '.png';
        var umlPath = './' + assetsPathPrefix + '.uml';
        var pngPath = './' + linkPath;
        var rawBlock = match[0];
        var blockContent = match[1];
        var isUpdateImageRequired = !fs.existsSync(umlPath);
        var md5sum;
        if (!isUpdateImageRequired) {
            var lastmd5sum = '';
            var sumPath = umlPath + '.sum';
            if (fs.existsSync(sumPath)) {
                try {
                    lastmd5sum = fs.readFileSync(sumPath, encoding = 'utf-8');
                } catch (e) {}
                md5sum = crypto.createHash('sha1').update(blockContent).digest('hex');
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
            try {
                execFileSync('java', [
                    '-jar', 'node_modules/gitbook-plugin-plantuml/plantuml.jar',
                    '-charset', 'UTF-8',
                    umlPath, '-o', '.'
                ]);
                fse.mkdirsSync(outputDir);
                //console.log(outputDir + '/' + indexBaseName + '.png');
                fse.copySync(pngPath, outputDir + '/' + indexBaseName + '.png');
            } catch (e) {
                console.log(e);
            };
        }
        page.content = page.content.replace(rawBlock, '![](' + linkPath + ')');
    }
    return page;
}

module.exports = {
    hooks: {
        // Before parsing markdown
        "page:before": processBlockList
    }
};