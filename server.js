'use strict'

const express = require('express');
const Prometheus = require('prom-client');
const expressEdge = require('express-edge');
const app = express();
const port = process.env.PORT || 8081;
const metricsInterval = Prometheus.collectDefaultMetrics();
const mongoose = require('mongoose');
const httpRequestDurationMicroseconds = new Prometheus.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.10, 5, 15, 50, 100, 200, 300, 400, 500]  // buckets for response time from 0.1ms to 500ms
});

// Runs before each requests
app.use((req, res, next) => {
  res.locals.startEpoch = Date.now();
  next();
});

app.use(express.static('public'));
app.use(expressEdge);
mongoose.connect('mongodb://localhost:27017/node-blog', { useNewUrlParser: true })
    .then(() => 'You are now connected to Mongo!')
    .catch(err => console.error('Something went wrong', err))

app.set('views', __dirname + '/views');
//console.log('dirname is : ' + __dirname)
app.get('/', (req, res, next) => {
  setTimeout(() => {
    res.render('index');
    //next();
  }, Math.round(Math.random() * 200))
});

//app.get('/', (req, res) => {
//	res.render('index');
//});

app.get('/test', function (req, res) {
	res.send('hello world');
});

app.get('/bad', (req, res, next) => {
  next(new Error('My Error'));
});

app.get('/posts/new', (req, res) => {
    res.render('create')
});

app.get('/metrics', (req, res) => {
  res.set('Content-Type', Prometheus.register.contentType)
  res.end(Prometheus.register.metrics())
});

// Error handler
app.use((err, req, res, next) => {
  res.statusCode = 500
  // Do not expose your error in production
  res.json({ error: err.message });
  next();
});

// Runs after each requests
app.use((req, res, next) => {
  const responseTimeInMs = Date.now() - res.locals.startEpoch

  httpRequestDurationMicroseconds
    .labels(req.method, req.path, res.statusCode)
    .observe(responseTimeInMs)

  next();
});

const server = app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`)
});

// Graceful shutdown
process.on('SIGTERM', () => {
  clearInterval(metricsInterval)

  server.close((err) => {
    if (err) {
      console.error(err)
      process.exit(1)
    }

    process.exit(0)
  });
});


module.exports = app;
