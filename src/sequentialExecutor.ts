export default class SequentialExecutor {

    allJobs: Array<() => Promise<any>>;

    constructor(allJobs: Array<() => Promise<any>>) {
        this.allJobs = allJobs;
    }

    async trigger() {
        // Attempts to exhaust the queue of jobs if there are any left
        while (this.allJobs.length > 0) {
            const promise = this.allJobs.shift();
            console.log('There are ' + this.allJobs.length + ' more jobs to execute');
            if (promise) {
                try {
                    await promise();
                } catch(err) {
                    console.error('Failed to execute promise in sequential executor: ' + (err as Error).message);
                    throw err;
                }
            }            
        }
    }
}