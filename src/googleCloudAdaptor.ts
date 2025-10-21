import { Storage, File } from '@google-cloud/storage';
import { RState } from './types';
import * as path from 'path';

export interface ICloudAdaptor {
    getExistingFiles() : Promise<RState>;
    uploadFileToPath(fullPath: string, relativePath: string) : Promise<void>;
}

/**
 * This class handles fetching the remote state for a google storage bucket
 * it also writes/uploads changed files
 */
export default class GoogleCloudAdaptor implements ICloudAdaptor {
    bucketName: string;
    relativePath: string;
    storage: Storage;

    constructor(bucketName: string, relativePath: string) {
        this.bucketName = bucketName;
        this.relativePath = relativePath;
        this.storage = new Storage();
    }

    async getExistingFiles() : Promise<RState> {
        const bucket = this.storage.bucket(this.bucketName);
        
        /*
        const [files] = await bucket.getFiles({
            autoPaginate: true, // Pagination is handled automatically
            prefix: this.relativePath,
            maxResults: 1000,
        });
        */


        const files = await new Promise<Array<File>>((resolve, reject) => {
            const files: Array<File> = [];
            bucket.getFilesStream()
            .on('error', (err) => reject(err))
            .on('data', function(file: File) {
                // file is a File object.
                console.log('Received file', file.name);
                files.push(file);
            })
            .on('end', function() {
                // All files retrieved.
                console.log('Resolving with', files.length);
                resolve(files);
            });
        })
        
        const state: RState = {}
        for (const file of files) {
            const meta = file.metadata;
            if (file.name.startsWith(this.relativePath)) {
                const name = file.name.substring(this.relativePath.length);
                state[name] = {
                    relativePath: name,
                    hash: Buffer.from(meta.md5Hash || '', 'base64').toString('hex'),
                    size: parseInt(meta.size?.toString() || '0'),
                }
            } else {
                throw new Error('Why doesnt it');
            }
        }
        // console.log('Returning RState', state);
        return state
    }

    async uploadFileToPath(fullPath: string, relativePath: string) : Promise<void> {
        console.log(new Date(), 'Uploading...', fullPath);
        await this.storage.bucket(this.bucketName).upload(fullPath, {
            destination: path.join(this.relativePath, relativePath),
        })
        console.log(new Date(), 'Successfully uploaded', fullPath);
    }

}