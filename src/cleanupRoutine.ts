import GoogleCloudAdaptor from "./googleCloudAdaptor";
import ParallelExecutor from "./parallelExecutor";

const deleteVideosOlderThanDays = 14;

function twoCharStr(num: number) {
    if (num < 1) {
        throw Error('Too low');
    }
    if (num > 9) {
        return num.toString();
    } else {
        return "0" + num;
    }
}

export async function cleanupRoutine(gca: GoogleCloudAdaptor, executor: ParallelExecutor) {
    console.log('Doing cleanup routine');
    const latestDeleteCandidate = new Date();
    latestDeleteCandidate.setDate(latestDeleteCandidate.getDate() - deleteVideosOlderThanDays);

    const daysToDeleteFor = 14;
    for (let d=0; d<daysToDeleteFor; d++) {
        latestDeleteCandidate.setDate(latestDeleteCandidate.getDate() - 1);
        const deletionDate = latestDeleteCandidate.getFullYear() + '-' + twoCharStr(latestDeleteCandidate.getMonth() + 1) + '-' + twoCharStr(latestDeleteCandidate.getDate());
        console.log('Finding files to delete in this date dir', deletionDate);
        const files = await gca.getFilesForDate(deletionDate);

        for (const file of files) {
            executor.enqueueJob(async () => {
                await gca.deleteFileAtPath(file.name);
            })
        }
    }

    console.log('Finished cleanup routine');
}