const fs = require('./inject/fs.js')

fs.cp('./demo.txt', './foo/demo.txt')
  .then(r => {
    console.log('success: ', r)
  })
  .catch(err => {
    console.log('>>>', err)
  })
