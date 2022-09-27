/**
 * @author yutent<yutent.io@gmail.com>
 * @date 2020/09/19 16:39:59
 */

const fs = require('fs/promises')
const { createReadStream, createWriteStream } = require('fs')
const { resolve, join, parse } = require('path')

function ok() {
  return true
}
function noop(err) {
  return false
}
function no(err) {
  console.error(err + '')
}

class Stats {
  isFile() {
    return false
  }
  isDirectory() {
    return false
  }
  isSocket() {
    return false
  }
  isSymbolicLink() {
    return false
  }
}

const EMPTY_STAT = new Stats()

const Iofs = {
  origin: fs,

  /**
   * [cat 文件读取]
   * @param  {String} file [文件路径]
   * @param  {Function} cb   [回调] 可选
   */
  cat(file) {
    return fs.readFile(file).then(ok).catch(no)
  },

  /**
   * [ls 读取整个目录(不遍历子目录)]
   * @param  {string} dir [目标路径]
   * @param  {boolean} recursive [是否递归遍历子目录]
   * @return {array}      [返回目标目录所有文件名和子目录名, 不包括'.'和'..']
   */
  ls(dir, recursive) {
    return fs
      .readdir(dir)
      .then(async list => {
        list.forEach((it, i) => {
          list[i] = resolve(dir, it)
        })

        if (recursive) {
          let tmp = list.concat()
          for (let it of tmp) {
            if (await this.isdir(it)) {
              list = list.concat(await this.ls(it, recursive))
            }
          }
        }
        return list
      })
      .catch(no)
  },

  /**
   * [echo 写文件]
   * @param  {String|Buffer|Number} data   [要写入的数据]
   * @param  {String} file   [要写的文件]
   * @param  {Boolean} append [是否在后面追加，默认否]
   * @param  {String} encode [编码, 默认utf8]
   */
  async echo(data, file, append, encode) {
    if (!file) {
      return data
    }

    let updir = parse(file).dir
    let opt = {}
    if (!(await this.isdir(updir))) {
      await this.mkdir(updir)
    }

    if (append && typeof append === 'string') {
      encode = append
      append = false
      opt.encoding = encode
    } else {
      if (typeof encode === 'string') {
        opt.encoding = encode
      }
    }

    if (!!append) {
      return fs.appendFile(file, data, opt).then(ok).catch(no)
    } else {
      return fs.writeFile(file, data, opt).then(ok).catch(no)
    }
  },

  //修改权限
  chmod(path, mode) {
    return fs.chmod(path, mode).then(ok).catch(no)
  },

  //修改所属用户
  chown(path, uid, gid) {
    return fs.chown(path, uid, gid).then(ok).catch(no)
  },

  /**
   * [mv 移动文件&目录,兼具重命名功能]
   * @param  {String} origin [原路径/原名]
   * @param  {String} target   [目标路径/新名]
   */
  async mv(origin, target) {
    let updir = parse(target).dir
    if (!(await this.isdir(updir))) {
      await this.mkdir(updir)
    }

    return fs.rename(origin, target).catch(async err => {
      if (~err.message.indexOf('cross-device')) {
        return this.cp(origin, target)
          .then(_ => {
            this.rm(origin)
            return true
          })
          .catch(no)
      }
      console.error(err + '')
    })
  },

  /**
   * [cp 复制文件&目录]
   * @param  {String} origin [原路径]
   * @param  {String} target   [目标路径]
   */
  async cp(origin, target) {
    // 如果是目录, 则递归操作
    if (await this.isdir(origin)) {
      await this.mkdir(target)
      let list = await this.ls(origin)
      for (let it of list) {
        let name = parse(it).base
        await this.cp(it, join(target, name))
      }
    } else {
      let updir = parse(target).dir
      if (!(await this.isdir(updir))) {
        await this.mkdir(updir)
      }

      let rs = createReadStream(origin)
      let ws = createWriteStream(target)
      return rs
        .on('error', err => {
          console.error('???????????', err + '')
        })
        .pipe(ws)
    }
    return true
  },

  /**
   * [rm 删除文件/目录]
   * @param  {[type]} origin      [源文件/目录路径]
   */
  async rm(origin) {
    if (await this.isdir(origin)) {
      return fs.rmdir(origin, { recursive: true })
    } else {
      return fs.unlink(origin)
    }
  },

  /**
   * [stat 返回文件/目录的状态信息]
   * @param  {[string]} path [目标路径]
   */
  stat(path) {
    return fs.stat(path).catch(err => EMPTY_STAT)
  },

  /**
   * [isdir 判断目标是否为目录]
   * @param  {String} path [目标路径]
   */
  isdir(path) {
    return this.stat(path).then(r => r.isDirectory())
  },

  isfile(path) {
    return this.stat(path).then(r => r.isFile())
  },

  /**
   * [mkdir 新建目录]
   * @param  {String} dir [目标路径]
   * @param {Number} mode [目录权限, node v10.12起支持]
   */
  mkdir(dir, mode = 0o755) {
    return fs.mkdir(dir, { recursive: true, mode: mode })
  },

  /**
   * [exists 判断目标(文件/目录)是否存在]
   * @param  {String} file [目标路径]
   */
  exists(file) {
    return this.is(file, fs.constants.F_OK)
  },

  // 是否可读写
  is(file, mode) {
    return fs.access(file, mode).then(ok).catch(noop)
  }
}

module.exports = Iofs
