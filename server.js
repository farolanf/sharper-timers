const fs = require('fs')
const express = require('express')
const bodyParser = require('body-parser')

const app = express()

app.use(express.static('public'))
app.use(bodyParser.text())

app.post('/timers', (req, res, next) => {
    fs.writeFile('public/timers.json', req.body, next)
    res.send('ok')
})

const port = 3100

app.listen(port, () => console.log('Timer server listening on port ' + port + ' http://localhost:' + port))
