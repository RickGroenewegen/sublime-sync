#!/usr/bin/env node

var watch = require('node-watch');
var fs = require('fs');
var SFTPS = require('sftps');
var RJSON = require('relaxed-json');
var util = require('util');
var colors = require('colors');
var keychain = require('keychain');
var prompt = require('prompt');

var content = '';
var settings = require('./package.json');
var jobs = [];
var scanInterval = 1000;
var configLocation = './sftp-config.json';
var ignorePatterns = '';
var host = '';
var username = '';
var password = '';
var sshOptions = {};
var port = 22;
var remotePath = '';
var isMac = /^darwin/.test(process.platform);

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

var start = function() {

  console.log('Watching directory: ' + process.cwd());

  var options = {
    host: host, // required
    username: username, // required
    port: port,
    autoConfirm: true
  }

  if(password && password.length > 0) {
    options['password'] = password;
  } 

  if(Object.keys(sshOptions).length > 0) {
    options['sshOptions'] = sshOptions;
  }

  // Create SFTP connection
  var sftp = new SFTPS(options);

  var syncDirectory = function(localFilename,destination) {
    var filename = '';
    var isDirectory = false;

    destination = destination.replace(/\\/g,"/");
    destination = destination.replace(/\/\/+/g, '/');

    sftp.raw('mkdir ' + destination);
    var dirList = fs.readdirSync('./' + localFilename);

    for(var i=0;i<dirList.length;i++) {
      filename = dirList[i];      
      isDirectory = fs.lstatSync(localFilename + '/' + filename).isDirectory();
      if(isDirectory) {
        syncDirectory(localFilename + '/' + filename,destination)
      } else {
        console.log('Uploading to -> ' + destination);
        sftp.put(localFilename + '/' + filename, destination);
      }
    }   
  }

  // Create scan function that runs & empties the SFTP queue every second
  var scan = function() {
    if(sftp.cmds.length > 0) {
      sftp.exec(function(err,res) {
        if(err) {
          console.log(colors.red(err));
        }
        else if(res.data) {
          var numberOfItems = res.data.split('\n').length - 1;
          console.log(colors.green('Succesfully uploaded ' + numberOfItems + ' file(s)'));
        }
      });
    }
    setTimeout(scan, scanInterval);
  };
  setTimeout(scan, scanInterval);


  // Initiate the watcher
  watch('.', function(filename) {

    // See if it matches 'ignore_regexes'
    var matches = false;
    for(var i=0;i<ignorePatterns.length;i++) {
      var res = filename.match(ignorePatterns[i]);
      if(res) {
        matches = true;
        break;
      }
    }

    // Upload if it doesn't match the ignorePatterns
    if(!matches) {

      console.log('Change detected: ' + colors.magenta(filename));

      var isDirectory = false;      
      var exists = fs.existsSync('./' + filename);
      var destination = remotePath + '/' + filename;

      destination = destination.replace(/\\/g,'/');
      destination = destination.replace(/\/\/+/g, '/');

      if(exists) {
        console.log('Uploading to -> ' + destination);
        isDirectory = fs.lstatSync('./' + filename).isDirectory();
        if(isDirectory) {
          syncDirectory(filename,destination);
        } else {
          sftp.put('./' + filename, destination);
        }        
      } else {
        console.log('Delete detected on ' + filename + '. Deleting server file -> ' + destination);
        sftp.rm(destination);
        sftp.raw('rm '+ destination + '/*');
        sftp.raw('rmdir ' + destination);
      }

    }

  });
}

var writeConfig = function(obj) {
  fs.writeFileSync('./sftp-config.json',JSON.stringify(obj,null,4),{ encoding: 'utf8'});
}

// Clear console screen
console.log("\u001b[2J\u001b[0;0H");

console.log(colors.magenta('Sublime SFTP directory watcher v' + settings.version));

// Try to read sftp-config.json file
if(fs.existsSync(configLocation)) {
  content = fs.readFileSync(configLocation,'utf-8');
  // Try to parse sftp-config.json file
  try{
    var config = RJSON.parse(content);

    host = config.host;
    username = config.user;

    if(config.password) {
      password = config.password;
    }

    ignorePatterns = config.ignore_regexes;
    remotePath = config.remote_path;

    // If port is set in config file (Like in Sublime) then use that, default is 22
    if (config.port) {
      port = config.port;
    }

    // If password is set in config file (Like in Sublime) then use that
    if(config.password) {
      password = config.password;
      start();
    }

    // Look for SSH options and read all the SFTP flags from the config
    else if(config.sftp_flags) {
      config.sftp_flags.forEach(function(flag) {
        flag = flag.replace('-o ','');
        var flagName = flag.split('=')[0];
        var flagValue = flag.split('=')[1];
        sshOptions[flagName] = flagValue;
      });
      start();
    // Otherwise on Mac check the keychain for the password
    } else if(isMac) {
      var serviceName = 'sublime-sync-' + host + '-' + username;
      keychain.getPassword({ account: 'foo', service: serviceName }, function(err, pass) {
        password = pass;
        start();
        // Prints: Password is baz
      });
    } else {
      console.log(colors.red('Error: Unable to retrieve passwrod from sftp-config.json or keychain!'));
      process.exit();
    }

  } catch(e) {
    console.log(colors.red('Error: Unable to parse sftp-config.json!'));
    process.exit();
  }
} else {
  console.log('No sftp-config.json found. Manually create file');
  prompt.start({
    'message': 'Please enter',
  });

  var schema = {
    properties: {
      host: {
        description: "Host",
        required: true
      },
      username: {
        description: "Username",
        required: true
      },
      password: {
        description: "Password",
        required: true,
        hidden: true
      },
      remotePath: {
        description: "Remote path",
        required: true
      }
    }
  };

  prompt.get(schema, function (err, result) {

    var obj = {
      host: result.host,
      user: result.username,
      remote_path: result.remotePath,
      ignore_regexes: [
          "\\.sublime-(project|workspace)", "sftp-config.json","node_modules","WEB-INF","web.config","bin",
          "sftp-settings\\.json", "/venv/", "\\.svn/", "\\.hg/", "\\.git/", ".sass-cache",
          "\\.bzr", "_darcs", "CVS", "\\.DS_Store", "Thumbs\\.db", "desktop\\.ini"
      ]
    }

    host = result.host;
    username = result.username;
    password = result.password;
    remotePath = result.remotePath;
    ignorePatterns = obj.ignore_regexes;

    // If it's OSX: Set password in the kechain stead of the file
    if(isMac) {
      var serviceName = 'sublime-sync-' + host + '-' + username;
      console.log('Storing password in keychain under key: ' + serviceName);
      keychain.setPassword({ account: 'foo', service: serviceName, password: password }, function(err) {
        if(err) throw err;
        writeConfig(obj);
        start();
      });
    } else {
      obj["password"] = result.password;
      writeConfig(obj);
      start();
    }

  });

}
