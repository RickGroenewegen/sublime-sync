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
var remotePath = '';
var isMac = /^darwin/.test(process.platform);

var start = function() {

  console.log('Watching directory: ' + process.cwd());

  // Create SFTP connection
  var sftp = new SFTPS({
    host: host, // required 
    username: username, // required 
    password: password, // required 
    port: 22 // optional 
  });

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
      
      var exists = fs.existsSync('./' + filename);
      var destination = remotePath + '/' + filename;
       
      if(exists) {
        console.log('Change detected in ' + filename + '. Uploading to -> ' + destination);
        sftp.put('./' + filename, destination);
      } else {
        console.log('Delete detected on ' + filename + '. Deleting server file -> ' + destination);
        sftp.rm(destination);
      }

    }

  });
}

var writeConfig = function(obj) {
  fs.writeFileSync('./sftp-config.json',JSON.stringify(obj,null,4),{ encoding: 'utf8'});
}

// Clear console screen
util.print("\u001b[2J\u001b[0;0H");

console.log(colors.blue('Sublime SFTP directory watcher v' + settings.version));

// Try to read sftp-config.json file
if(fs.existsSync(configLocation)) {
  content = fs.readFileSync(configLocation,'utf-8');
  // Try to parse sftp-config.json file
  try{
    var config = RJSON.parse(content);
    host = config.host;
    username = config.user;
    password = config.password;
    ignorePatterns = config.ignore_regexes;
    remotePath = config.remote_path;
    
    // If password is set in config file (Like in Sublime) then use that
    if(config.password) {
      password = config.password;
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
