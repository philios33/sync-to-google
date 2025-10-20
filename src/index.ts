import 'dotenv/config'
import * as process from 'node:process';
import SyncManager from './syncManager';
import GoogleCloudAdaptor from './googleCloudAdaptor';
import * as path from 'path';

const registerGracefulShutdown = (shutdownFunc: (reason: string) => void) => {
    process.on('SIGINT', () => {
        shutdownFunc.call(this, 'SIGINT detected');
    })
}

(async () => {
    const config = {
        remoteGoogleBucket: process.env.REMOTE_GOOGLE_BUCKET || null,
        remotePath: process.env.REMOTE_PATH || '/meadow_cctv/',
        localPath: process.env.LOCAL_PATH || '../test'
    }
    if (config.remoteGoogleBucket === null) {
        throw new Error('Please specify process.env.REMOTE_GOOGLE_BUCKET in .env file');
    }
    console.log(new Date(), 'Starting up...', config);
    // Get the remote state of the remote storage
    const gca = new GoogleCloudAdaptor(config.remoteGoogleBucket, config.remotePath);
    const remoteState = await gca.getExistingFiles();

    const sm = new SyncManager(path.join(__dirname, config.localPath));

    const doShutdown = (reason: string) => {
        console.log(new Date(), 'Doing shutdown...', reason);
        sm.shutdown();
    }

    sm.watchForNewOrUpdatedFiles(async (fullPath, relativePath) => {
        // console.log('This path has changed, upload it', relativePath);
        try {
            await gca.uploadFileToPath(fullPath, relativePath)
        } catch(err) {
            console.error(err);
            doShutdown('Error occurred: ' + (err as Error).message);
        }
    });
    sm.startup(remoteState);

    registerGracefulShutdown(doShutdown);

    console.log(new Date(), 'Started');
})();

