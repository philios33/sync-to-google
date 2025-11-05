import SequentialExecutor from "./sequentialExecutor";

export default class ParallelExecutor {

    threads: number;
    allJobs: Array<() => Promise<any>>;
    executors: Array<SequentialExecutor>;
    trigger: boolean;
    running: boolean;
    interval: NodeJS.Timeout | null;

    constructor(threads: number) {
        this.threads = threads;
        this.allJobs = [];
        this.executors = [];
        this.trigger = false;
        this.running = false;
        this.interval = null;
    }

    startup() {
        for (let i = 0; i < this.threads; i++) {
            const executor = new SequentialExecutor(this.allJobs);
            this.executors.push(executor);
        }

        console.log('Starting up ' + this.threads + ' uploading threads');

        this.interval = setInterval(async () => {
            if (!this.running && this.trigger) {
                this.running = true;
                this.trigger = false;
                try {
                    await Promise.all(this.executors.map(e => e.trigger()))
                } catch(err) {
                    console.error(err);
                    process.exit(1);
                } finally {
                    this.running = false;
                }
            }
        }, 5000);
    }

    shutdown() {
        if (this.interval) {
            clearInterval(this.interval);
        }
    }

    enqueueJob(job: () => Promise<any>) {
        this.allJobs.push(job);
        this.trigger = true;
    }


}