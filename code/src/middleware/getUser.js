// @flow

import {Database} from 'better-sqlite3';
import {User} from '../business';

/**
 * If user exists, register the User to reg.params.user,
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
    if(req.params.username === 'all')
      return next();
    const user: User = params.db.users.getOne({
      username: req.params.username
    });
    if (! user) {
      return userNotExists(res);
    }
    res.locals.user = user;
    next();
  };
};

function userNotExists(res: express$Response): express$Response {
  return res.status(400)
    .json({
      error: 'User does not exist.'
    });
}
