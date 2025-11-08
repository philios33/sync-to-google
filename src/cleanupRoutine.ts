import GoogleCloudAdaptor from "./googleCloudAdaptor";

const deleteVideosOlderThanDays = 14;

export async function cleanupRoutine(gca: GoogleCloudAdaptor) {
    console.log('Doing cleanup routine');
    const latestDeleteCandidate = new Date();
    latestDeleteCandidate.setDate(latestDeleteCandidate.getDate() - deleteVideosOlderThanDays);

    const daysToDeleteFor = 7;
    for (let d=0; d<daysToDeleteFor; d++) {
        latestDeleteCandidate.setDate(latestDeleteCandidate.getDate() - 1);
        const deletionDate = latestDeleteCandidate.getFullYear() + '-' + (latestDeleteCandidate.getMonth() + 1) + '-' + latestDeleteCandidate.getDate();
        console.log('Finding files to delete in this date dir', deletionDate);
        await gca.deleteFilesForDate(deletionDate);
    }

    console.log('Finished cleanup routine');
}