import 'dotenv/config'
import * as process from 'node:process';
import SyncManager from './syncManager';
import GoogleCloudAdaptor from './googleCloudAdaptor';
import * as path from 'path';
import ParallelExecutor from './parallelExecutor';
import { cleanupRoutine } from './cleanupRoutine';

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

    await cleanupRoutine(gca);
    const cleanupInterval = setInterval(() => {
        cleanupRoutine(gca);
    }, 1000 * 60 * 60 * 24);

    const remoteState = await gca.getExistingFiles();

    const executor = new ParallelExecutor(2);
    

    const sm = new SyncManager(path.join(__dirname, config.localPath));

    const doShutdown = (reason: string) => {
        console.log(new Date(), 'Doing shutdown...', reason);
        executor.shutdown();
        sm.shutdown();
        clearInterval(cleanupInterval);
    }

    // TODO: This has proven to be an issue with the number of file watchers.
    // We can't and probably shouldn't watch on every file.
    // Can we continue to watch on every dir? so we get new file events?

    // We can do an initial scan using a normal fs scan.

    // Otherwise: We need to detect the ISO date dir and decide if we need full file watching or not
    // Or do some kind

    sm.watchForNewOrUpdatedFiles(async (fullPath, relativePath) => {
        // console.log('This path has changed, upload it', relativePath);
        // This will flood so we need to batch up the promises
        try {
            executor.enqueueJob(async () => {
                await gca.uploadFileToPath(fullPath, relativePath)
            });
        } catch(err) {
            console.error(err);
            doShutdown('Error occurred: ' + (err as Error).message);
        }
    });
    sm.startup(remoteState, () => {
        executor.startup();
    });

    registerGracefulShutdown(doShutdown);

    console.log(new Date(), 'Started');
})();

