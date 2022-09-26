/**
 * @author yutent<yutent.io@gmail.com>
 * @date 2020/09/19 16:39:59
 */

const fs = require('fs/promises')
const { resolve, join, parse } = require('path')

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

const VERSION = +process.versions.node.split('.').slice(0, 2).join('.')

const EMPTY_STAT = new Stats()

const Iofs = {
  origin: fs,

  /**
   * [cat 文件读取]
   * @param  {String} file [文件路径]
   * @param  {Function} cb   [回调] 可选
   */
  cat(file) {
    return fs.readFile(file)
  },

  /**
   * [ls 读取整个目录(不遍历子目录)]
   * @param  {string} dir [目标路径]
   * @param  {boolean} recursive [是否递归遍历子目录]
   * @return {array}      [返回目标目录所有文件名和子目录名, 不包括'.'和'..']
   */
  async ls(dir, recursive) {
    let list = fs.readdirSync(dir)

    list.forEach((it, i) => {
      list[i] = resolve(dir, it)
    })

    if (recursive) {
      let tmp = list.concat()
      tmp.forEach(async it => {
        if (await this.isdir(it)) {
          list = list.concat(await this.ls(it, recursive))
        }
      })
    }
    return list
  },

  /**
   * [echo 写文件]
   * @param  {String|Buffer|Number} data   [要写入的数据]
   * @param  {String} file   [要写的文件]
   * @param  {Boolean} append [是否在后面追加，默认否]
   * @param  {String} encode [编码, 默认utf8]
   */
  async echo(data, file, append, encode, debug) {
    if (!file) {
      return data
    }

    var updir = parse(file).dir
    var opt = {}
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
      return fs.appendFile(file, data, opt)
    } else {
      return fs.writeFile(file, data, opt)
    }
  },

  //修改权限
  chmod(path, mode) {
    return fs.chmod(path, mode)
  },

  //修改所属用户
  chown(path, uid, gid) {
    fs.chown(path, uid, gid)
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
        return this.cp(origin, target).then(_ => {
          this.rm(origin)
        })
      }
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
      list.forEach(val => {
        let name = parse(val).base
        this.cp(val, join(target, name))
      })
    } else {
      let updir = parse(target).dir
      if (!(await this.isdir(updir))) {
        await this.mkdir(updir)
      }

      let rs = fs.createReadStream(origin)
      let ws = fs.createWriteStream(target)
      rs.pipe(ws)
    }
  },

  /**
   * [rm 删除文件/目录]
   * @param  {[type]} origin      [源文件/目录路径]
   */
  rm(origin, debug) {
    try {
      if (this.isdir(origin)) {
        if (VERSION > 12.1) {
          FS.rmdirSync(origin, { recursive: true })
        } else {
          var list = this.ls(origin)
          list.forEach(it => this.rm(it))
          FS.rmdirSync(origin)
        }
      } else {
        FS.unlinkSync(origin)
      }
      return true
    } catch (err) {
      debug && console.error('call rm(): ', err + '')
      return false
    }
  },

  /**
   * [stat 返回文件/目录的状态信息]
   * @param  {[string]} path [目标路径]
   * @param  {[boolean]} debug [是否静默检测, 是否不打印错误日志]
   */
  stat(path, debug) {
    try {
      return FS.statSync(path)
    } catch (err) {
      debug && console.error('call stat(): ', err + '')
      return EMPTY_STAT
    }
  },

  /**
   * [isdir 判断目标是否为目录]
   * @param  {String} path [目标路径]
   */
  isdir(path) {
    try {
      return this.stat(path).isDirectory()
    } catch (err) {
      return false
    }
  },

  isfile(path) {
    try {
      return this.stat(path).isFile()
    } catch (err) {
      return false
    }
  },

  /**
   * [mkdir 新建目录]
   * @param  {String} dir [目标路径]
   * @param {Number} mode [目录权限, node v10.12起支持]
   */
  mkdir(dir, mode = 0o755, debug) {
    try {
      if (VERSION > 10.12) {
        FS.mkdirSync(dir, { recursive: true, mode: mode })
      } else {
        var updir = PATH.parse(dir).dir
        if (!updir) {
          debug && console.error('call mkdir(): ', 'Wrong dir path')
          return false
        }

        if (!this.isdir(updir)) {
          this.mkdir(updir)
        }

        FS.mkdirSync(dir)
        this.chmod(dir, mode)
      }
      return true
    } catch (err) {
      debug && console.error('call mkdir(): ', err + '')
      return false
    }
  },

  /**
   * [exists 判断目标(文件/目录)是否存在]
   * @param  {String} file [目标路径]
   */
  exists(file) {
    return this.is(file, FS.constants.F_OK)
  },

  // 是否可读写
  is(file, mode) {
    try {
      FS.accessSync(file, mode)
      return true
    } catch (e) {
      return false
    }
  }
}

module.exports = Iofs
