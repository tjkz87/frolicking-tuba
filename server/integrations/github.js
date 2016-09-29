const config = require('../../env/config.json');
const https = require('https');
const Integration = require('../models/integration');
const key = require('../controllers/key');

const parseRes = (res) =>
  res
  .split('&')
  .reduce((sum, cur) => {
    const parts = cur.split('=');
    const newSum = sum;

    newSum[parts[0]] = parts[1];

    return newSum;
  }, {});

module.exports.createIssue = (repo, issue) => {
  const options = {
    host: config.github.api_url,
    path: `/repos/${repo}/issues`,
    method: 'POST',
    headers: { 'User-Agent': 'frolicking tuba' },
    auth: `${config.github.username}:${config.github.password}`
  };

  const req = https.request(options, (res) => {
    res.setEncoding('utf8');
    res.on('data', (part) => {
      console.log(part);
    });
  });

  req.write(JSON.stringify(issue));
  //req.end();
};

module.exports.register = (req, res) => {
  const apiHost = 'github.com';
  const apiPath = '/login/oauth/access_token';

  const options = {
    host: apiHost,
    path: apiPath,
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  };

  const githubReq = https.request(options, (githubRes) => {
    console.log('starting auth with github');

    githubRes.setEncoding('utf8');
    let githubResData = '';

    githubRes.on('data', (part) => {
      githubResData += part;
    });

    githubRes.on('end', () => {
      const fromGithub = parseRes(githubResData);

      console.log('github gave back', fromGithub);

      if (!fromGithub.access_token || !req.session.user) {
        res.status(400).json({ error: 'failed to authenticate with github' });

        return;
      }

      console.log('creating integration');
      Integration.create({
        type: 'github',
        meta: fromGithub.access_token,
        userId: req.session.user.id
      }).then(() => {
        console.log('creating key');
        key.createKey(req, res);
      });
    });
  });

  githubReq.write(
`client_id=${config.github.client_id}\
&client_secret=${config.github.secret}\
&code=${req.query.code}`);

  githubReq.end();
};

module.exports.redirectTo = (req, res) => {
  res.redirect(
    `${config.github.auth_url}?client_id=${config.github.client_id}&scope=repo`
  );
};

module.exports.repoList = (req, res) => {
  if (!req.session.user) {
    res.status(400).json({ error: config.messages.not_logged_in });

    return;
  }

  Integration.findOne({ where: { userId: req.session.id } })
    .then((integration) => {
      const options = {
        host: config.github.api_url,
        path: '/user/repos',
        method: 'POST',
        headers: { Authorization: `token ${integration.meta}` }
      };

      const githubReq = https.request(options, (githubRes) => {
        let githubData = '';

        githubRes.setEncoding('utf8');

        githubRes.on('data', (part) => {
          githubData += part;
        });

        githubRes.on('end', () => {
          githubData = JSON.parse(githubData);
          githubData = githubData.map((repo) => repo.full_name);
          res.json(githubData);
        });
      });

      githubReq.end();
    });
};

module.exports.repoSelect = (req, res) => {
  if (!req.session.user) {
    res.status(400).json({ error: config.messages.not_logged_in });

    return;
  }

  Integration.findOne({ where: { userId: req.session.user.id } })
    .then((integration) => {
      const alteredIntegration = integration;

      //yes... it's really fucking ugly and bad
      alteredIntegration.meta += `|${req.body.name}`;
      alteredIntegration.save();

      //temporary, i hope
      res.json({ error: null });
    });
};
