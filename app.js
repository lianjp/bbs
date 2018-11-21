const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const multer = require('multer')
const path = require('path')
const sqlite = require('sqlite')

const upload = multer({dest: path.join(__dirname, './user-uploaded')})

const port = 3000

var dbPromise = sqlite.open('./bbs.db', {Promise})

var sessions = {}

const app = express()

app.set('views', './templates')
app.locals.pretty = true

app.use((req, res, next) => {
  console.log(req.method, req.url)
  next()
})

app.use('/static', express.static('./static'))
app.use('/avatars', express.static('./user-uploaded'))
app.use(cookieParser('aaabbbccc'))
app.use(bodyParser.urlencoded())

app.use(function sessionMiddleware(req, res, next) {
  if(!req.cookies.sessionId) {
    res.cookie('sessionId', Math.random().toString(16).substr(2))
  }
  next()
})

app.use(async (req, res, next) => {
  req.user = await db.get("SELECT * FROM users WHERE id=?", req.signedCookies.userId)
  console.log(req.user)
  next()
})

app.get('/', async (req, res, next) => {
  var posts = await db.all("SELECT * FROM posts")
  res.render('index.pug', {posts, user: req.user})  
})

app.route('/add-post')
  .get((req, res, next) => {
    res.render('add-post.pug', {user: req.user})
  })
  .post(async (req, res, next) => {

    if (req.signedCookies.userId) {
      await db.run("INSERT INTO posts (userId, title, content, timestamp) VALUES (?, ?, ?, ?)", req.signedCookies.userId, req.body.title, req.body.content, Date.now())
      var newPost = await db.get("SELECT * FROM posts ORDER BY timestamp DESC LIMIT 1")
      res.redirect('/post/' + newPost.id)
    } else {
      res.send('you are not logged in!')
    }

  })

app.route('/register')
  .get((req, res, next) => {
    res.render('register.pug')
  })
  .post(upload.single('avatar'), async (req, res, next) => {
    var user = await db.get("SELECT * FROM users WHERE name=?", req.body.username)
    if (user) {
      res.send('username hase been registered')
    }else {
      await db.run("INSERT INTO users (name, password, avatar) VALUES (?,?, ?)", req.body.username, req.body.password, req.file && req.file.filename)
      res.redirect('/login')
    }        
  })

app.get('/user/:userId', async (req, res, next) => {
  // var user = await db.get("SELECT * FROM users WHERE id=?", req.params.userId)  //先再users表中查出有无此用户  
  if (req.user) {
    var userPosts = await db.all("SELECT * FROM posts WHERE userId=?", req.params.userId)  //如果有再再posts表中查出此用户所有发过的贴子
    var userComment = await db.all("SELECT comments.*, title as postTitle FROM comments JOIN posts ON comments.userId=posts.userId WHERE comments.userId=?", req.params.userId)
    res.render('user.pug', {
      user: req.user,
      posts: userPosts,
      comments: userComment
    })
  }else {
    res.render('user.pug', {user: req.user})
  }
})

app.get('/logout', (req, res, next) => {
  res.clearCookie('userId')
  res.redirect('/')
})

app.route('/login')
  .get((req, res, next) => {
    res.render('login.pug', {user: req.user})
  })
  .post(async (req, res, next) => {
    if (req.body.captcha !== sessions[req.cookies.sessionId].captcha) {
      res.end('captcha not corect')
      return
    }
    var user = await db.get("SELECT * FROM users WHERE name=? AND password=?", req.body.username, req.body.password)
    if (user) {
      res.cookie('userId', user.id, {
        signed: true,
      })
      res.redirect('/')
    } else {
      res.send('username or password is not correct')
    }
  })

app.get('/captcha', async (req, res, next) => {
  var captcha = Math.random().toString().substr(2, 4)
  sessions[req.cookies.sessionId] = {
    captcha: captcha
  }

  res.setHeader('Content-Type', 'image/svg+xml')
  res.end(`
  <svg width="100" 
  height="50"
  version="1.1"
  xmlns="http://www.w3.org/2000/svg">
    <text x="0" y="20">${
      captcha
    }</text>
  </svg>`)
  
})

app.get('/post/:postId', async (req, res, next) => {
  var post = await db.get("SELECT posts.*, name, avatar FROM posts JOIN users ON posts.userId=users.id WHERE posts.id=?", req.params.postId) 
  if (post) {
    var comments = await db.all("SELECT comments.*, name, avatar FROM comments JOIN users ON comments.userId=users.id WHERE comments.postId=?", req.params.postId)
    res.render('post.pug', {post, comments, user: req.user})
  } else {
    res.status(404).render('post-not-found.pug')
  }
})

app.post('/add-comment', async (req, res, next) => {
  if (req.signedCookies.userId) {
    await db.run(`
      INSERT INTO comments (postId, userId, content, timestamp) 
      VALUES (?, ?, ?, ?)
    `, req.body.postId, req.signedCookies.userId, req.body.content, Date.now())

    res.redirect('/post/' + req.body.postId)
  } else {
    res.send('not allowed to comment, you are not logged in.')
  }
})

;(async () => {
  db = await dbPromise
  app.listen(port, () => {
    console.log('server listening on port', port)
  })
})()
