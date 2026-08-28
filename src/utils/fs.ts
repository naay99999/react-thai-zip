import { access, lstat, mkdir, copyFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK)
    return true
  } catch {
    return false
  }
}

/**
 * Like pathExists, but does not follow symlinks: a symlink whose target is
 * missing still counts as existing.
 *
 * access() reports a dangling symlink as "nothing here", which let a link
 * planted at a destination slip past the overwrite guard — and copyFile then
 * followed it, writing the template through the link to wherever it pointed.
 * Use this on the write path; plain pathExists stays correct for detection.
 */
export async function pathExistsNoFollow(filePath: string): Promise<boolean> {
  try {
    await lstat(filePath)
    return true
  } catch {
    return false
  }
}

export async function copyFileEnsuringDir(source: string, destination: string): Promise<void> {
  await mkdir(path.dirname(destination), { recursive: true })
  await copyFile(source, destination)
}
