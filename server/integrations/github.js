const config = require('../../env/config.json');
const request = require('request');

const User = require('../models/user');

const createIssue = (params, body) => new Promise((resolve, reject) => {
  if (params.type !== 'github') {
    resolve();

    return;
  }

  const options = {
    url: `${config.github.api_url}/repos/${params.output_meta}/issues`,
    method: 'POST',
    headers: {
      Authorization: `token ${params.integration_meta}`,
      'User-Agent': config.github.user_agent
    },
    body: {
      title: body.title,
      body:
        + `**to:** ${body.to}\n` // eslint-disable-line
        + `**from:** ${body.from}\n`
        + `**subject:** ${body.title}\n`
        + `**body:** ${body.comment}\n`
        + `---\n`
        + `**Attachments and screenshots (if provided):**\n`
        + `![attachment](${body.attachment})\n`
        + `![alt text](${body.screenshot})\n`
    },
    json: true
  };

  request(options, (err) => {
    if (err) {
      reject(err);
    }

    resolve();
  });
});

module.exports.createIssue = createIssue;

module.exports.register = (req, res) => {
  const options = {
    url: config.github.token_url,
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    json: true,
    body: `client_id=${config.github.client_id}`
          + `&client_secret=${config.github.secret}`
          + `&code=${req.query.code}`
  };

  request(options, (err, githubRes, body) => {
    if (!body.access_token || !req.session.user || err) {
      res.status(400).json({ error: 'failed to authenticate with github' });

      return;
    }

    User.update(
      { ghtoken: body.access_token },
      { where: { id: req.session.user.id } }
    ).then(() => {
      res.redirect('/dashboard');
    });
  });
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

  User.findOne({ where: { id: req.session.user.id } })
  .then((user) => {
    if (!user) {
      res.status(500).json({ error: config.messages.server_error });

      return;
    }
    if (user.ghtoken === null) {
      res.status(400).json({ error: config.messages.github_no_auth });

      return;
    }

    const options = {
      url: `${config.github.api_url}/user/repos`,
      method: 'GET',
      headers: {
        Authorization: `token ${user.ghtoken}`,
        'User-Agent': config.github.user_agent
      },
      json: true
    };

    request(options, (err, githubRes, body) => {
      if (err || !Array.isArray(body)) {
        res.status(400).json({ error: config.messages.github_no_auth });
      } else {
        res.json(body.map((repo) => ({ full_name: repo.full_name })));
      }
    });
  });
};
