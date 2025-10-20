export type RemoteFile = {
    relativePath: string
    size: number
    hash: string
}

export type RState = Record<string, RemoteFile>