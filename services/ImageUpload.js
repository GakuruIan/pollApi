const multer = require('multer')

const storage = multer.memoryStorage()

const Upload = multer({storage,limits:{fileSize: 10 * 1024 * 1024}}).single('photo')

module.exports = Upload