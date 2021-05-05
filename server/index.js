const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')

const db = require('./db')
const userRouter = require('./routes/userRoutes')
const imageRouter = require('./routes/imageRoutes')

const app = express()
const apiPort = 3000

app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors())
app.use(bodyParser.json())

db.on('error', console.error.bind(console, 'MongoDB connection error:'))

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.use('/user', userRouter)
app.use('/image', imageRouter)

app.listen(apiPort, () => console.log(`Server running on port ${apiPort}`))