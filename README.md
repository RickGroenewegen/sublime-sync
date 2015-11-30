# sublime-sync

A command-line watcher / sync tool for the Sublime SFT plugin (https://wbond.net/sublime_packages/sftp). 
It monitors your working directory and automatically syncs modified files with the remote SFTP directory.
 
## Installation
Install with npm for Node.js. sublime-sync required sshpass to allow password verification without a command prompot.

This is [an example](http://www.cyberciti.biz/faq/noninteractive-shell-script-ssh-password-provider// "Title") inline link.

```
brew install https://raw.githubusercontent.com/kadwanev/bigboybrew/master/Library/Formula/sshpass.rb
npm install sublime-sync -g
```

## Usage
 
You can start the watcher by going to the directory you want to watch and call 'sublime-sync':

```
cd ~/myDir
sublime-sync
```

## Support

If you have any questions, feel free to contact me.

Rick Groenewegen

rick@aanzee.nl

## License
The ISC License (ISC)

Copyright (c) 2015 Rick Groenewegen

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.