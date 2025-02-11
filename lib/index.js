/**
 * @typedef {import('vfile').VFileValue} Value
 * @typedef {import('vfile').VFileOptions} Options
 * @typedef {import('vfile').BufferEncoding} BufferEncoding
 *
 * @typedef {number|string} Mode
 * @typedef {BufferEncoding|{encoding?: null|BufferEncoding, flag?: string}} ReadOptions
 * @typedef {BufferEncoding|{encoding?: null|BufferEncoding, mode: Mode?, flag?: string}} WriteOptions
 *
 * @typedef {string|Uint8Array} Path Path of the file.
 * @typedef {Path|Options|VFile} Compatible Things that can be
 *   passed to the function.
 */

/**
 * @callback Callback
 * @param {NodeJS.ErrnoException|null} error
 * @param {VFile|null} file
 */

import fs from 'fs'
import path from 'path'
import buffer from 'is-buffer'
import {VFile} from 'vfile'

/**
 * Create a virtual file from a description.
 * If `options` is a string or a buffer, it’s used as the path.
 * If it’s a VFile itself, it’s returned instead.
 * In all other cases, the options are passed through to `vfile()`.
 *
 * @param {Compatible} [options]
 * @returns {VFile}
 */
export function toVFile(options) {
  if (typeof options === 'string' || buffer(options)) {
    options = {path: String(options)}
  }

  return options instanceof VFile ? options : new VFile(options)
}

toVFile.readSync = readSync
toVFile.writeSync = writeSync

/**
 * Create a virtual file and read it in, synchronously.
 *
 * @param {Compatible} description
 * @param {ReadOptions} [options]
 * @returns {VFile}
 */
function readSync(description, options) {
  var file = toVFile(description)
  file.value = fs.readFileSync(path.resolve(file.cwd, file.path), options)
  return file
}

/**
 * Create a virtual file and write it in, synchronously.
 *
 * @param {Compatible} description
 * @param {WriteOptions} [options]
 * @returns {VFile}
 */
function writeSync(description, options) {
  var file = toVFile(description)
  fs.writeFileSync(path.resolve(file.cwd, file.path), file.value || '', options)
  return file
}

toVFile.read =
  /**
   * @type {{
   *   (description: Compatible, options: ReadOptions, callback: Callback): void
   *   (description: Compatible, callback: Callback): void
   *   (description: Compatible, options?: ReadOptions): Promise<VFile>
   * }}
   */
  (
    /**
     * Create a virtual file and read it in, asynchronously.
     *
     * @param {Compatible} description
     * @param {ReadOptions} [options]
     * @param {Callback} [callback]
     */
    function (description, options, callback) {
      var file = toVFile(description)

      if (!callback && typeof options === 'function') {
        callback = options
        options = null
      }

      if (!callback) {
        return new Promise(executor)
      }

      executor(resolve, callback)

      /**
       * @param {VFile} result
       */
      function resolve(result) {
        callback(null, result)
      }

      /**
       * @param {(x: VFile) => void} resolve
       * @param {(x: Error, y?: VFile) => void} reject
       */
      function executor(resolve, reject) {
        /** @type {string} */
        var fp

        try {
          fp = path.resolve(file.cwd, file.path)
        } catch (error) {
          return reject(error)
        }

        fs.readFile(fp, options, done)

        /**
         * @param {Error} error
         * @param {Value} result
         */
        function done(error, result) {
          if (error) {
            reject(error)
          } else {
            file.value = result
            resolve(file)
          }
        }
      }
    }
  )

toVFile.write =
  /**
   * @type {{
   *   (description: Compatible, options: WriteOptions, callback: Callback): void
   *   (description: Compatible, callback: Callback): void
   *   (description: Compatible, options?: WriteOptions): Promise<VFile>
   * }}
   */
  (
    /**
     * Create a virtual file and write it in, asynchronously.
     *
     * @param {Compatible} description
     * @param {WriteOptions} [options]
     * @param {Callback} [callback]
     */
    function (description, options, callback) {
      var file = toVFile(description)

      // Weird, right? Otherwise `fs` doesn’t accept it.
      if (!callback && typeof options === 'function') {
        callback = options
        options = undefined
      }

      if (!callback) {
        return new Promise(executor)
      }

      executor(resolve, callback)

      /**
       * @param {VFile} result
       */
      function resolve(result) {
        callback(null, result)
      }

      /**
       * @param {(x: VFile) => void} resolve
       * @param {(x: Error, y?: VFile) => void} reject
       */
      function executor(resolve, reject) {
        /** @type {string} */
        var fp

        try {
          fp = path.resolve(file.cwd, file.path)
        } catch (error) {
          return reject(error)
        }

        fs.writeFile(fp, file.value || '', options, done)

        /**
         * @param {Error} error
         */
        function done(error) {
          if (error) {
            reject(error)
          } else {
            resolve(file)
          }
        }
      }
    }
  )
