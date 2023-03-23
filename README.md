# GhostCMS ActivityPub
This is a simple ExpressJS server that integrates with GhostCMS webhooks and implements basic ActivityPub features such as accepting `Follow` requests and publishing to followers' inboxes whenever a GhostCMS post is published via `Create` `Article` actions.

## Mandatory Warning
This project is currently experimental and could un-recoverably break something between versions. It should be used with caution, as only happy-path, Mastodon-compatible interaction has been tested. Although it should be safe to run after configuration, do not experiment with this code or config on your primary domain as you might find yourself ban-listed by a Mastodon instance for spam, should anything go wrong. Consider hosting locally and proxying via [ngrok](https://ngrok.com) to create a throw-away domain.

## Issues and Feature Requests
Feature requests and bugs can be tracked and reported at this project's [Codeberg issue](https://codeberg.org/quigs/ghostcms-activitypub/issues) tracker.

## Installation
Download and install Node.js. This project has only been tested on Node.js 19, but earlier versions may be compatible.
Installation is done using the npm install command:

```
$ npm install
```

Be sure to set the appropriate configuration settings by copying `.env.template` to `.env` and following the instructions in the file. Then run the project:
```
$ npm run dev # Debug
$ npm run start # Production
```

### Running As A Service
A systemd service file is provided as well. You can follow the configuration instructions in the file and then copy that to `/etc/systemd/system/` and enable and run the service:

```
$ sudo systemctl enable ghostcms_activitypub && sudo systemctl start ghostcms_activitypub
```

### Proxying
The only 'acknowledged' way to use `ghostcms-activitypub` (I do not provide support, sorry!) is to use a [reverse proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/). This allows you to serve activitypub content directly from your root domain (eg: https://example.com) but you can also configure the project to use a subdomain as well.

If you use a root domain, be sure to set the `API_ROOT_PATH` config option to something like `/activitypub` to avoid potential path namespace collisions with Ghost.

```
location /.well-known/webfinger {
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_pass http://127.0.0.1:3000; # ActivityPub server
}


# Assuming `API_ROOT_PATH` is `/activitypub` Rewrite activitypub API calls (that may conflict with Ghost) to the path, but remove the prefix from the proxy
location /activitypub/ { # The trailing slash is required to proxy all sub-paths
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_pass http://127.0.0.1:3000; # The trailing / and the headers ensure that /activitypub/foo gets rewritten to just /foo
}
```

## Features
* GhostCMS Webhook
* A single ActivityPub actor for your site (@username@yoursite.tld)

## License
MIT