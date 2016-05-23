var spawn = require('child_process').spawn;
var fs = require('fs');
var mkdirp = require('mkdirp');
var crypto = require('crypto');
var path = require('path');
var copyDir = require("copy-dir");
var config;
var blockRegex = /^```uml((.*[\r\n]+)+?)?```$/im;
var basePath = '/images/uml/';

function processBlockList(page, umlPath) {
    var dirPath = basePath + path.dirname(page.path);
    var baseName = path.basename(page.path, '.md');
    // console.log(dirPath);
    var linkBase = dirPath + '/' + baseName;
    // console.log(linkBase);
    var match;
    var index = 0;
    while ((match = blockRegex.exec(page.content))) {
        var indexLinkBase = linkBase + '_' + (index++);
        var umlPath = '.' + indexLinkBase + '.uml';
        console.log('processing uml... %j %j', page.path, umlPath);
        var rawBlock = match[0];
        var blockContent = match[1];
        mkdirp.sync(path.dirname(umlPath));
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
        //UML
        if (isUpdateImageRequired) {
            fs.writeFileSync(umlPath, blockContent);
            fs.writeFileSync(umlPath + '.sum', md5sum, encoding = 'utf-8');
            debugger;
            try {
                execFile('java', [
                    //'-Dapple.awt.UIElement=true',
                    '-jar', 'node_modules/gitbook-plugin-plantuml/plantuml.jar',
                    //'-nbthread auto',
                    //'-tsvg',
                    '-charset', 'UTF-8',
                    umlPath, '-o', '.'
                ]);
            } catch (e) {};
        }
        page.content = page.content.replace(rawBlock, '![](' + indexLinkBase + '.png)');
    }
    return page;
}

function execFile(command, args, callback) {
    var prc = spawn(command, args);
    prc.on('error', function(err) {
        console.log('cannot spawn java');
    });
    prc.stdout.on('data', function(data) {
        console.log(data.toString());
    });
    prc.stderr.on('data', function(data) {
        console.log(data.toString());
    });
    prc.on('close', function(code) {
        if ("function" === typeof callback) callback( !! code);
    });
}

module.exports = {
    book: {
        html: {
            "html:start": function() {
                return "<!-- Start book " + this.options.title + " -->"
            },
            "html:end": function() {
                return "<!-- End of book " + this.options.title + " -->"
            },
            "head:start": "<!-- head:start -->",
            "head:end": "<!-- head:end -->",
            "body:start": "<!-- body:start -->",
            "body:end": "<!-- body:end -->"
        }
    },
    hooks: {
        "init": function() {
            config = this.options;
        },
        // Before parsing markdown
        "page:before": processBlockList,
        "finish": function() {
            // 最终写入索引数据
            copyDir.sync('.' + basePath, path.join(config.output , './images/uml'));
        }
    }
};
