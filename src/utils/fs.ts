import { access, mkdir, copyFile } from 'node:fs/promises'
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

export async function copyFileEnsuringDir(source: string, destination: string): Promise<void> {
  await mkdir(path.dirname(destination), { recursive: true })
  await copyFile(source, destination)
}
