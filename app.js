const express = require('express')
const bodyParser = require('body-parser')
const path = require('path')

const port = 3000

const users = [{
  name: 'zs',
  password: '123456',
  id: 1,
}, {
  name: 'ls',
  password: '123456',
  id: 2,
}, {
  name: 'ww',
  password: '123456',
  id: 3,
}]
users.maxid = 4

const posts = [{
  id: 1,
  title: 'hello',
  content: 'hello hello',
  timestamp: Date.now(),
  userid: 2,
}, {
  id: 2,
  title: 'world',
  content: 'world world',
  timestamp: Date.now() - 100000,
  userid: 3,
}, {
  id: 3,
  title: 'foo',
  content: 'foo foo',
  timestamp: Date.now() - 200000,
  userid: 1,
}]
posts.maxid = 4

const comments = [{
  id: 1,
  postid: 2,
  userid: 1,
  content: '顶',
  timestamp: Date.now() - 56789,
}, {
  id: 2,
  postid: 2,
  userid: 2,
  content: '顶',
  timestamp: Date.now() - 56789,
}, {
  id: 3,
  postid: 2,
  userid: 3,
  content: '顶',
  timestamp: Date.now() - 56789,
}, {
  id: 4,
  postid: 2,
  userid: 1,
  content: '顶',
  timestamp: Date.now() - 56789,
}, {
  id: 5,
  postid: 2,
  userid: 2,
  content: '顶',
  timestamp: Date.now() - 56789,
}]
comments.maxid = 6


const app = express()

app.set('views', './templates')
app.locals.pretty = true

app.use((req, res, next) => {
  console.log(req.method, req.url)
  next()
})

app.use(express.static('./static'))
app.use(bodyParser.urlencoded())

app.get('/', (req, res, next) => {
  res.render('index.pug', {posts})  
})

app.route('/register')
  .get((req, res, next) => {
    res.sendFile(path.join(__dirname, './static/register.html'))
  })
  .post((req, res, next) => {
    if (users.find(it => it.name == req.body.username)) {
      res.end('用户名已经注册')
    }else {
      users.push({
        id: users.maxid++,
        name: req.body.username,
        password: req.body.password,
      })
      res.redirect('/login')
    }        
  })

app.get('/user/:userid', (req, res, next) => {
  var user = users.find(it => it.id == req.params.userid)
  var userPosts = posts.filter(it => it.userid == req.params.userid)
  if (user) {
    res.render('user.pug', {
      user,
      posts: userPosts
    })
  }else {
    res.render('user.pug', {user: null})
  }
})

app.route('/login')
  .get((req, res, next) => {
    res.render('login.pug')
  })

app.get('/post/:postid', (req, res, next) => {
  var postid = req.params.postid
  var post = posts.find(it => it.id == postid)
  var comment = comments.filter(it => it.postid == postid)
  if (post) {
    res.render('post.pug', {post, comment})
  } else {
    res.status(404).render('post-not-found.pug')
  }
})

app.post('/add-comment', (req, res, next) => {
  console.log(req.headers, req.body)
  comments.push({
    id: comments.maxid++,
    postid: req.body.postid,
    userid: 2,
    content: req.body.content,
    timestamp: Date.now()
  })
  res.redirect('/post/' + req.body.postid)
})

app.listen(port, () => {
  console.log('server listening on port', port)
})