/**
 * {通用注入脚本}
 * @author yutent<yutent.io@gmail.com>
 * @date 2022/09/26 16:57:36
 */

const { ipcRenderer, shell, contextBridge } = require('electron')
const fetch = require('node-fetch')
const fs = require('./fs.js')

contextBridge.exposeInMainWorld('we', {
  /**
   * 使用本地浏览器打开url
   */
  open(url) {
    shell.openExternal(url)
  },

  /**
   * 网络请求
   */
  fetch,

  fs
})
