// @flow

import express from 'express';
const bodyParser = require('body-parser');
import Ajv from 'ajv';

const logger: any = require('./logger');
import {Database} from './database';
const config = require('./config');
import {callLoger, getUser, checkAuth} from './middleware';
import schema from './schemas';
import {campaigns, invitations, users, auth} from './routes';

const app: express$Application = express();
module.exports = app;

const database: Database = new Database({
  path: config.get('database:path')
});

app.use(callLoger);
app.use(bodyParser.json());
app.all('/:username/invitations', getUser({db: database}));
app.all('/:username/campaigns', getUser({db: database}));
app.all('/:username/campaigns/:campaignId', getUser({db: database}));
app.all('/users/:username', getUser({db: database}));

app.get('/:username/invitations', checkAuth({db: database}));
app.post('/:username/invitations', checkAuth({db: database}));
app.put('/:username/invitations', checkAuth({db: database}));

app.get('/:username/campaigns', checkAuth({db: database}));
app.post('/:username/campaigns', checkAuth({db: database}));

app.get('/:username/campaigns/:campaignId', checkAuth({db: database}));

app.get('/users/:username', checkAuth({db: database}));
app.post('/users/:username', checkAuth({db: database}));
app.put('/users/:username', checkAuth({db: database}));

app.use((req: express$Request, res: express$Response, next: express$NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT");
  res.header("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, Authorization");
  next();
});

// not sure if needed
app.options('*', (req: express$Request, res: express$Response) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.status(200).end();
});

app.use('/users', users);
app.use('/:username/invitations', invitations);
app.use('/:username/campaigns', campaigns);
app.use('/auth', auth);
