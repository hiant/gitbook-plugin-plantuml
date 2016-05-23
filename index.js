var spawn = require('child_process').spawn;
var fs = require('fs');
var mkdirp = require('mkdirp');
var crypto = require('crypto');
var path = require('path');
var blockRegex = /^```uml((.*[\r\n]+)+?)?```$/img;

function processBlockList(page, umlPath) {
    var basePath = '/images/uml/';
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
        fs.exists(umlPath, function(exists) {
            if (!exists) {
                fs.writeFileSync(umlPath, blockContent);
            }
        })
        var lastmd5sum = ''
        try {
            lastmd5sum = fs.readFileSync(umlPath + '.sum');
        } catch (e) {}
        var md5sum = crypto.createHash('sha1').update(blockContent).digest('hex');
        var isUpdateImageRequired = (lastmd5sum != md5sum);
        //UML
        if (isUpdateImageRequired) {
            fs.writeFileSync(umlPath, blockContent);
            fs.writeFileSync(umlPath + '.sum', md5sum);
            debugger;
            try {
                execFile('java', [
                    //'-Dapple.awt.UIElement=true',
                    '-jar', 'plantuml.jar',
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

function parseUml(page, dirPath, umlPath) {
    uml = page.content.match(/^```uml((.*[\r\n]+)+?)?```$/img);
    // console.log(uml);
    if (uml) {
        mkdirp.sync(path.dirname(umlPath));
        fs.writeFileSync(umlPath, uml);
        return true;
    }
    return false;
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
};
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
        // Before parsing markdown
        "page:before": processBlockList
    }
};
