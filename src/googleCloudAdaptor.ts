import { Storage } from '@google-cloud/storage';
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
        
        const [files] = await bucket.getFiles({
            autoPaginate: true, // Pagination is handled automatically
            prefix: this.relativePath
        });

        const state: RState = {}
        for (const file of files) {
            const meta = await file.getMetadata();
            if (file.name.startsWith(this.relativePath)) {
                const name = file.name.substring(this.relativePath.length);
                state[name] = {
                    relativePath: name,
                    hash: Buffer.from(meta[0].md5Hash || '', 'base64').toString('hex'),
                    size: parseInt(meta[0].size?.toString() || '0'),
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