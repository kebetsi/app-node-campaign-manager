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
import {Campaign, User, Invitation} from '../../src/business';

const DB_PATH = config.get('database:path');

describe('invitations', () => {

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

  let user1: User;
  let user2: User;
  let campaign1: Campaign;
  let campaign2: Campaign;

  before(() => {
    user1 = fixtures.addUser();
    user2 = fixtures.addUser();
    campaign1 = fixtures.addCampaign({user: user1});
    campaign2 = fixtures.addCampaign({user: user2});
  });

  function makeUrl(params: {
    username: string
  }): string {
    return '/' + params.username + '/invitations';
  }

  describe('when creating an invitation', () => {

    it('should return a 400 when the requester does not exist', () => {
      const requester = {
        id: 'idontexist',
        username: 'idontexist'
      };
      const campaign = fixtures.getCampaign({user: requester});

      const invitation = fixtures.getInvitation({
        campaign: campaign,
        requester: requester
      });

      return request(app)
        .post(makeUrl({username: requester.username}))
        .send(invitation)
        .expect(400)
        .then(res => {
          res.body.should.have.property('error');
        });
    });

    it('should return a 400 when the campaign does not exist', () => {

      const requester: User = fixtures.addUser();
      const requestee: User = fixtures.addUser();
      const unexistantCampaign = fixtures.getCampaign({user: requester});

      const invitation = fixtures.getInvitation({
        requester: requester,
        requestee: requestee,
        campaign: unexistantCampaign
      });

      return request(app)
        .post(makeUrl({username: requester.username}))
        .send(invitation)
        .expect(400)
        .then(res => {
          res.body.should.have.property('error');
        });
    });

    it('should return a 400 when the invitation schema is not respected', () => {

      const requester: User = fixtures.addUser();
      const requestee: User = fixtures.addUser();
      const campaign = fixtures.getCampaign({user: requester});

      const invalidInvitation = {
        invalidKey: 'blopblopblop'
      };

      return request(app)
        .post(makeUrl({username: requester.username}))
        .send(invalidInvitation)
        .expect(400)
        .then(res => {
          res.body.should.have.property('error');
        });
    });

  });

  describe('for a registered user', () => {

    it('should create the invitation in the database, return the created invitation with status 201', () => {
      const requester = fixtures.addUser({appOnly: true});
      const requestee = fixtures.addUser({appOnly: true});
      const campaign = fixtures.addCampaign({user: requester});

      const invitation = {
        campaign: _.pick(campaign, ['id']),
        requester: _.pick(requester, ['username']),
        requestee: _.pick(requestee, ['username']),
      };

      return request(app)
        .post(makeUrl({username: requester.username}))
        .send(invitation)
        .expect(201)
        .then(res => {
          res.body.should.have.property('invitation').which.is.an.Object();
          const createdInvitation = res.body.invitation;
          campaign.should.be.eql(new Campaign(createdInvitation.campaign));
          requester.should.be.eql(new User(createdInvitation.requester));
          requestee.should.be.eql(new User(createdInvitation.requestee));

          const requesterInvitations = db.getInvitations({user: requester});
          let found = null;
          requesterInvitations.forEach((i) => {
            if (i.id === createdInvitation.id) {
              found = i;
            }
          });
          should.exist(found);

          const requesteeInvitations = db.getInvitations({user: requestee});
          found = null;
          requesteeInvitations.forEach((i) => {
            if (i.id === createdInvitation.id) {
              found = i;
            }
          });
          should.exist(found);
        });
    });

    it('should return an error with status 400 if the requestee does not exist', () => {
      const requester = fixtures.addUser();
      const requestee = {
        username: 'idontexist'
      };

      const campaign = fixtures.addCampaign({user: requester});

      const invitation = fixtures.getInvitation({
        campaign: campaign,
        requester: requester,
        requestee: requestee
      });

      return request(app)
        .post(makeUrl({username: requester.username}))
        .send(invitation)
        .expect(400)
        .then(res => {
          res.body.should.have.property('error');
        });
    });

    it('should return an error with status 400 if the invitation already exists', () => {
      const requester = fixtures.addUser();
      const requestee = fixtures.addUser();
      const campaign = fixtures.addCampaign({user: requester});
      const invitation = fixtures.addInvitation({
        campaign: campaign,
        requester: requester,
        requestee: requestee
      });

      return request(app)
        .post(makeUrl({username: requester.username}))
        .send(invitation)
        .expect(400)
        .then(res => {
          res.body.should.have.property('error');
        });
    });

  });

  describe('that is accepted or refused', () => {

    it('should create create the invitation in the database, return the created invitation with status 201', async () => {
      const requester = fixtures.addUser();
      const requestee = fixtures.addUser({pryvOnly: true});
      const campaign = fixtures.addCampaign({user: requester});

      const invitation = {
        status: 'accepted',
        campaign: _.pick(campaign, ['id']),
        requester: _.pick(requester, ['username']),
        requestee: _.pick(requestee, ['pryvUsername']),
      };

      const response = await request(app)
        .post(makeUrl({username: requester.username}))
        .send(invitation);

      const body = response.body;
      const status = response.status;
      if (body.err) {
        console.log('err', body);
        console.log('err', body.details[0].params);
      }
      should.not.exist(body.error);

      status.should.eql(201);

      body.should.have.property('invitation').which.is.an.Object();
      const createdInvitation = body.invitation;

      createdInvitation.campaign.id.should.be.eql(invitation.campaign.id);
      createdInvitation.requestee.pryvUsername.should.be.eql(invitation.requestee.pryvUsername);
      createdInvitation.requester.id.should.be.eql(requester.id);
      createdInvitation.status.should.be.eql(invitation.status);

      const invitations = db.getInvitations({user: requester});
      let found = null;
      invitations.forEach((i) => {
        if (i.id === createdInvitation.id) {
          found = i;
        }
      });
      should.exist(found);
    })

  });

  describe('when fetching invitations', () => {

    let user1: User;
    let campaign1, campaign2: Campaign;
    let invitation1, invitation2, invitation3: Invitation;

    before(() => {
      user1 = fixtures.addUser();
      user2 = fixtures.addUser();
      campaign1 = fixtures.addCampaign({user: user1});
      invitation1 = fixtures.addInvitation({
        requester: user1,
        requestee: user2,
        campaign: campaign1
      });
      invitation2 = fixtures.addInvitation({
        campaign: campaign1,
        requester: user1,
        requestee: user2
      });
      campaign2 = fixtures.addCampaign({user: user2});
      invitation3 = fixtures.addInvitation({
        requester: user2,
        requestee: user1,
        campaign: campaign2
      });
    });

    it('should return the user\'s invitations', () => {

      return request(app)
        .get(makeUrl({username: user1.username}))
        .expect(200)
        .then(res => {
          res.body.should.have.property('invitations');
          let found1, found2, found3;
          let invitations = res.body.invitations;
          invitations.forEach((i) => {
            if (i.id === invitation1.id) {
              found1 = i;
            }
            if (i.id === invitation2.id) {
              found2 = i;
            }
            if (i.id === invitation3.id) {
              found3 = i;
            }
          });
          should.exist(found1);
          should.exist(found2);
          should.exist(found3);
          new Invitation(found1).should.be.eql(invitation1);
          new Invitation(found2).should.be.eql(invitation2);
          new Invitation(found3).should.be.eql(invitation3);
        });
    });

    it('should return an error if the user does not exist', () => {

      return request(app)
        .get(makeUrl({username: 'unexistantUser'}))
        .expect(400)
        .then(res => {
          res.body.should.have.property('error');
        });
    });

  });

});