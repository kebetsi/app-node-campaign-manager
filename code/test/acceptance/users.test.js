// @flow

/* global describe, it, before, after */

const request: any = require('supertest');
const should: any = require('should');

import fs from 'fs';
import _ from 'lodash';

const app: express$Application = require('../../src/app');
const config = require('../../src/config');

import {Fixtures} from '../support/Fixtures';
import {Database} from '../../src/database';
import {User} from '../../src/business';

const DB_PATH = config.get('database:path');

describe('users', () => {

  let fixtures: Fixtures;
  let db: Database;

  before(() => {
    fixtures = new Fixtures();
    db = new Database({path: DB_PATH});
  });

  after(() => {
    fixtures.close();
    //fs.unlinkSync(DB_PATH);
  });

  function makeUrl(option:? string): string {
    const base = '/users';
    return option ? base + '/' + option : base;
  }

  describe('when creating a user', () => {

    it('should create a user in the users table, return a 201', () => {

      const user = _.pick(
        fixtures.getUser({appOnly: true}),
        ['username']);

      return request(app)
        .post(makeUrl())
        .send(user)
        .then(res => {
          res.status.should.be.eql(201);
          const createdUser = db.getUser({username: user.username});
          should.exist(createdUser);
          createdUser.username.should.eql(user.username);
        });
    });

    it('should return a 400, if the username is already taken', () => {

      const user: User = fixtures.addUser();

      return request(app)
        .post(makeUrl())
        .send(_.pick(user, ['username', 'password']))
        .then(res => {
          res.status.should.eql(400);
          should.exist(res.error);
        });
    });

  });

  describe('when creating a Pryv user', () => {

    it('should create a user in the pryv_users and users tables, return a 201', () => {

      const user: User = _.pick(fixtures.getUser({pryvOnly: true}),
        ['pryvUsername']);

      return request(app)
        .post(makeUrl())
        .send(user)
        .then(res => {
          res.status.should.eql(201);

          const createdPryvUser = db.getUser({pryvUsername: user.pryvUsername});
          should.exist(createdPryvUser);
          createdPryvUser.pryvUsername.should.eql(user.pryvUsername);
          should.exist(createdPryvUser.id);
          should.exist(createdPryvUser.pryvId);
        })
    });

    it('should return a 400 if the pryv_user already exists', () => {

      const user: User = fixtures.addUser({pryvOnly: true});

      return request(app)
        .post(makeUrl())
        .send({user: user.pryvUsername})
        .then(res => {
          res.status.should.eql(400);
          should.exist(res.error);
        });
    });

  });

  describe('when merging accounts', () => {

    it('should delete a user and link its pryv_user to the user\'s account, return a 200');

    it('should return a 400 when the user is missing');

    it('should return a 400 when the pryvUser is missing')

  });

});