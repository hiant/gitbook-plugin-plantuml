var spawn = require('child_process').spawn;
var fs = require('fs');
var mkdirp = require('mkdirp');
var crypto = require('crypto');
var path = require('path');

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

    prc.on('error', function (err) {
        console.log('cannot spawn java');
    });

    prc.stdout.on('data', function(data) {
        console.log(data.toString());
    });

    prc.stderr.on('data', function(data) {
        console.log(data.toString());
    });

    prc.on('close', function(code) {
        if ("function" === typeof callback) callback(!!code);
    });
};

module.exports = {
    book: {
        assets: "./book",
        js: [
            "test.js"
        ],
        css: [
            "test.css"
        ],
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
        // For all the hooks, this represent the current generator

        // This is called before the book is generated
        "init": function() {
            console.log("init gitbook-plugin-plantuml!");
        },

        // This is called after the book generation
        "finish": function() {
            console.log("finish gitbook-plugin-plantuml!");
        },

        // The following hooks are called for each page of the book
        // and can be used to change page content (html, data or markdown)


        // Before parsing markdown
        "page:before": function(page) {
            // page.path is the path to the file
            // page.content is a string with the file markdown content
            var basePath = '/images/uml/';
            var dirPath = basePath + path.dirname(page.path);
            var baseName = path.basename(page.path, '.md');
            // console.log(dirPath);
            var linkBase = dirPath + '/' + baseName;
            // console.log(linkBase);
            var umlPath = '.' + linkBase + '.uml';

            var hasUml = parseUml(page, dirPath, umlPath);
            if (!hasUml) { return page; }
            
            console.log('processing uml... %j', page.path);

            var text = fs.readFileSync(umlPath, 'utf8');

            var md5sum = crypto.createHash('sha1').update(text).digest('hex');

            var lastmd5sum = ''

            try {
                lastmd5sum = fs.readFileSync(umlPath + '.sum');
            }
            catch (e) {
            }

            var isUpdateImageRequired = (lastmd5sum != md5sum);

            fs.writeFileSync(umlPath + '.sum', md5sum);

            var lines = text.split('```,');

            //console.log('%j', lines);

            //UML
            if (isUpdateImageRequired) {
                debugger;
                try {
                    execFile('java', [
                        //'-Dapple.awt.UIElement=true',
                        '-jar',
                        'plantuml.jar',
                        //'-nbthread auto',
                        //'-tsvg',
                        '-charset',
                        'UTF-8',
                        umlPath,
                        '-o',
                        '.'
                    ]);
                } catch (e) {};
            }

            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                if (i < (lines.length-1)) {
                    line += '```';
                }
                if (i == 0) {
                    page.content = page.content.replace(line, '![](' + linkBase + '.png)');
                    continue;
                }
                if (i < 10) {
                    page.content = page.content.replace(line, '![](' + linkBase + '_00' + i + '.png)');
                    continue;
                }
                if (i >= 10 && i < 100) {
                    page.content = page.content.replace(line, '![](' + linkBase + '_0' + i + '.png)');
                    continue;
                }
                if (i >= 100) {
                    page.content = page.content.replace(line, '![](' + linkBase + '_' + i + '.png)');
                    continue;
                }
            };
            //page.content = page.content.replace(/^```uml((.*\n)+?)?```$/g, '');
            // Example:
            //page.content = "# Title\n" + page.content;

            return page;
        },

        // Before html generation
        "page": function(page) {
            return page;
        }
    }
};
