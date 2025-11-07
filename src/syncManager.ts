import chokidar, { FSWatcher, Matcher } from 'chokidar';
import * as fs from 'fs';
import { RState } from './types';
// import * as crypto from 'crypto';
import * as path from 'path';

import { sync as md5File } from 'md5-file';

/**
 * This will get all local files and all remote files 
 * and work out which local files are missing on the remote side
 * It will keep track of remote files and assume it is the sole writer
 */

const generateFileMD5 = async (path: string) : Promise<string> => {
    return Promise.resolve(md5File(path));

    // const md5 = await md5sum(path)
    // https://stackoverflow.com/a/44643479/10440128
    /*
    return new Promise((resolve, reject) => {
      let hash: crypto.Hash | null = crypto.createHash('md5')
      let stream: fs.ReadStream | null = fs.createReadStream(path)
      const cleanup = () => {
        if (stream) {
            stream.removeAllListeners();
            stream.close();
            stream.destroy();
            stream = null;
        }
        if (hash) {
            hash.removeAllListeners();
            hash.destroy();
            hash = null;
        }
      }
      stream.on('error', err => {
        cleanup();
        reject(err);
      })
      stream.on('data', chunk => hash?.update(chunk))
      stream.on('end', () => {
        if (hash) {
            const result = hash.digest('hex');
            cleanup();
            resolve(result);
        } else {
            cleanup();
            reject(new Error('Hash invalid'));
        }
      })
    })
    */
  }

export default class SyncManager {
    localPath: string;
    watcher: FSWatcher | null;
    files: Record<string, any>;
    callback: (fullPath: string, relativePath: string) => Promise<void>;
    remoteState: RState;
    num: number;
    
    constructor(localPath: string, /*adaptor: ICloudAdaptor*/) {
        this.localPath = fs.realpathSync(localPath);
        //this.adaptor = adaptor;
        this.watcher = null;
        this.files = {};
        this.callback = async (fullPath: string, relativePath: string) => {}
        this.remoteState = {};
        this.num = 0;
    }

    /**
     * This takes in a remote state so we don't duplicate triggering writes to the same files!
     * @param remoteState The state of all the existing remote files
     */
    startup(remoteState: RState, readyFunc: () => void) {
        this.remoteState = remoteState;
        
        this.watcher = chokidar.watch(this.localPath).on('all', (event, path) => {
            this.num++;
            console.log('ALL', event, path, this.num);
            if (path.startsWith(this.localPath)) {
                path = path.substring(this.localPath.length + 1);
            } else {
                throw new Error('Why doesnt it start with ' + this.localPath + ' ' + path);
            }
            if (event === 'add' || event === 'change') {
                this.registerFile(path);
            }
        }).on('ready', () => {
            console.log('Chokidar is ready!');
            readyFunc.call(this);
        });
    }

    private async registerFile(relativeFilePath: string) {
        const now = new Date();
        const creationDate = /^(\d{4})-(\d{2})-(\d{2})\//
        const matches = creationDate.exec(relativeFilePath);
        if (matches) {
            const year = parseInt(matches[1] || '');
            const month = parseInt(matches[2] || '');
            const day = parseInt(matches[3] || '');
            const createdDate = new Date(year, month - 1, day);
            const ageSecs = Math.round((now.getTime() - createdDate.getTime()) / 1000);
            console.log(relativeFilePath, createdDate, ageSecs);
        } else {
            console.log('Did not match regexp: ' + relativeFilePath);
        }

        // Read the size and last modified time of this file and POST back as an event.
        const filePath = path.join(this.localPath, relativeFilePath);
        const stats = fs.statSync(filePath);
        const md5Hash = await generateFileMD5(filePath);
        // console.log('MD5 hash was', md5Hash);

        // Determine whether we should write this file
        let upload = false;
        if (!(relativeFilePath in this.remoteState)) {
            // File does not exist yet
            // console.log('File does not exist yet', relativeFilePath);
            upload = true;
        } else {
            // Should we upload?
            const existing = this.remoteState[relativeFilePath];
            if (existing?.hash !== md5Hash) {
                // console.log('Hash differs', existing?.hash, md5Hash);
                upload = true;
            }
            if (existing?.size !== stats.size) {
                // console.log('Size differs', existing?.size, stats.size);
                upload = true;
            }
        }

        if (upload) {
            this.remoteState[relativeFilePath] = {
                relativePath: relativeFilePath,
                size: stats.size,
                hash: md5Hash
            }
            this.callback.apply(this, [filePath, relativeFilePath]);
        }
    }

    watchForNewOrUpdatedFiles(callback: (fullPath: string, relativePath: string) => Promise<void>) {
        this.callback = callback;
    }

    async shutdown() {
        if (this.watcher) {
            await this.watcher.close();
        }
    }

}