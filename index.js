#!/usr/bin/env node

var watch = require('node-watch');
var fs = require('fs');
var SFTPS = require('sftps');
var RJSON = require('relaxed-json');
var util = require('util');
var colors = require('colors');
var content = '';

// Clear console screen
util.print("\u001b[2J\u001b[0;0H");

console.log(colors.blue('Sublime SFTP directory watcher ' + process.version));
console.log('Watching directory: ' + process.cwd());

// Try to read sftp-config.json file
try {
  content = fs.readFileSync('./sftp-config.json','utf-8');
} catch(e) {
  throw "sftp-config.json not found!"
}

// Try to parse sftp-config.json file
try{
  var config = RJSON.parse(content);
} catch(e) {
  throw 'Unable to parse sftp-config.json';
}

var ignorePatterns = config.ignore_regexes;

// Create SFTP connection
var sftp = new SFTPS({
  host: config.host, // required 
  username: config.user, // required 
  password: config.password, // required 
  port: 22 // optional 
});

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
    var destination = config.remote_path + '/' + filename;
    console.log('Change detected in ' + filename + '. Uploading to -> ' + destination);
    sftp.put('.' + filename, config.remote_path + filename)
  }

});