#!/usr/bin/env node

var watch = require('node-watch');
var fs = require('fs');
var SFTPS = require('sftps');
var RJSON = require('relaxed-json');
var util = require('util');
var colors = require('colors');
var content = '';
var settings = require('./package.json');
var jobs = [];
var scanInterval = 1000;

// Clear console screen
util.print("\u001b[2J\u001b[0;0H");

console.log(colors.blue('Sublime SFTP directory watcher v' + settings.version));

// Try to read sftp-config.json file
try {
  content = fs.readFileSync('./sftp-config.json','utf-8');
} catch(e) {
  console.log(colors.red('Error: sftp-config.json not found!'));
  process.exit();
}

// Try to parse sftp-config.json file
try{
  var config = RJSON.parse(content);
} catch(e) {
  console.log(colors.red('Error: Unable to parse sftp-config.json!'));
  process.exit();
}

console.log('Watching directory: ' + process.cwd());

var ignorePatterns = config.ignore_regexes;

// Create SFTP connection
var sftp = new SFTPS({
  host: config.host, // required 
  username: config.user, // required 
  password: config.password, // required 
  port: 22 // optional 
});

// Create scan function that runs & empties the SFTP queue every second
var scan = function() { 
  if(sftp.cmds.length > 0) {
    sftp.exec(function(err,res) {
      if(err) throw err;
      if(res.data) {
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
    var destination = config.remote_path + '/' + filename;
     
    if(exists) {
      console.log('Change detected in ' + filename + '. Uploading to -> ' + destination);
      sftp.put('./' + filename, destination);
    } else {
      console.log('Delete detected on ' + filename + '. Deleting server file -> ' + destination);
      sftp.rm(destination);
    }

  }

});