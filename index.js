var spawn = require('child_process').spawn;
var fs = require('fs');
var mkdirp = require('mkdirp');
var crypto = require('crypto');
var path = require('path');
var async = require("async");
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
// cursively make dir 
function mkdirs(p, mode, f, made) {
    if (typeof mode === 'function' || mode === undefined) {
        f = mode;
        mode = 0777 & (~process.umask());
    }
    if (!made) made = null;
    var cb = f || function() {};
    if (typeof mode === 'string') mode = parseInt(mode, 8);
    p = path.resolve(p);
    fs.mkdir(p, mode, function(er) {
        if (!er) {
            made = made || p;
            return cb(null, made);
        }
        switch (er.code) {
            case 'ENOENT':
                mkdirs(path.dirname(p), mode, function(er, made) {
                    if (er) {
                        cb(er, made);
                    } else {
                        mkdirs(p, mode, cb, made);
                    }
                });
                break;
                // In the case of any other error, just see if there's a dir
                // there already.  If so, then hooray!  If not, then something
                // is borked.
            default:
                fs.stat(p, function(er2, stat) {
                    // if the stat fails, then that's super weird.
                    // let the original error be the failure reason.
                    if (er2 || !stat.isDirectory()) {
                        cb(er, made);
                    } else {
                        cb(null, made)
                    };
                });
                break;
        }
    });
}
// single file copy
function copyFile(file, toDir, cb) {
    async.waterfall([

        function(callback) {
            fs.exists(toDir, function(exists) {
                if (exists) {
                    callback(null, false);
                } else {
                    callback(null, true);
                }
            });
        },
        function(need, callback) {
            if (need) {
                mkdirs(path.dirname(toDir), callback);
            } else {
                callback(null, true);
            }
        },
        function(p, callback) {
            var reads = fs.createReadStream(file);
            var writes = fs.createWriteStream(path.join(path.dirname(toDir), path.basename(file)));
            reads.pipe(writes);
            //don't forget close the  when  all the data are read
            reads.on("end", function() {
                writes.end();
                callback(null);
            });
            reads.on("error", function(err) {
                console.log("error occur in reads");
                callback(true, err);
            });
        }
    ], cb);
}
// cursively count the  files that need to be copied
function _ccoutTask(from, to, cbw) {
    async.waterfall([

        function(callback) {
            fs.stat(from, callback);
        },
        function(stats, callback) {
            if (stats.isFile()) {
                cbw.addFile(from, to);
                callback(null, []);
            } else if (stats.isDirectory()) {
                fs.readdir(from, callback);
            }
        },
        function(files, callback) {
            if (files.length) {
                for (var i = 0; i < files.length; i++) {
                    _ccoutTask(path.join(from, files[i]), path.join(to, files[i]), cbw.increase());
                }
            }
            callback(null);
        }
    ], cbw);
}
// wrap the callback before counting
function ccoutTask(from, to, cb) {
    var files = [];
    var count = 1;

    function wrapper(err) {
        count--;
        if (err || count <= 0) {
            cb(err, files)
        }
    }
    wrapper.increase = function() {
        count++;
        return wrapper;
    }
    wrapper.addFile = function(file, dir) {
        files.push({
            file: file,
            dir: dir
        });
    }
    _ccoutTask(from, to, wrapper);
}

function copyDir(from, to) {
    cb = function() {};
    async.waterfall([

        function(callback) {
            fs.exists(from, function(exists) {
                if (exists) {
                    callback(null, true);
                } else {
                    console.log(from + " not exists");
                    callback(true);
                }
            });
        },
        function(exists, callback) {
            fs.stat(from, callback);
        },
        function(stats, callback) {
            if (stats.isFile()) {
                // one file copy
                copyFile(from, to, function(err) {
                    if (err) {
                        // break the waterfall
                        callback(true);
                    } else {
                        callback(null, []);
                    }
                });
            } else if (stats.isDirectory()) {
                ccoutTask(from, to, callback);
            }
        },
        function(files, callback) {
            // prevent reaching to max file open limit		    
            async.mapLimit(files, 10, function(f, cb) {
                copyFile(f.file, f.dir, cb);
            }, callback);
        }
    ], cb);
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
            copyDir('.' + basePath, config.output);
        }
    }
};
