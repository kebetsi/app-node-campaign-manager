// @flow

import {Database} from 'better-sqlite3';
import {User} from '../business';

/**
 * If user exists, register the User to res.locals.user,
 *
 *
 * @param req
 * @param res
 * @param next
 * @returns {express$Response}
 */
module.exports = (params: {
  db: Database,
}) => {
  return (req: express$Request, res: express$Response, next: express$NextFunction): void => {
    const query: mixed = req.query;
    if (query == null || query.username == null) {
      return missingUsername(res);
    }

    const username: string = query.username;
    const user: User = params.db.users.getOne({
      username: username
    });

    if (user == null) {
      return userNotExists(username, res);
    }

    res.locals.user = user;
    next();
  };
};

function missingUsername(res: express$Response): express$Response {
  return res.status(400)
    .json({
      error: 'Missing username'
    });
}

function userNotExists(username: string, res: express$Response): express$Response {
  return res.status(400)
    .json({
      error: 'User "' + username + '" does not exist.'
    });
}