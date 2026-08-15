#!/bin/sh
set -eu

repo=/home/ubuntu/gray/repo/course

/usr/bin/node "$repo/server.js" --selftest >/dev/null
/usr/bin/node "$repo/course-validate.mjs" >/dev/null
/usr/bin/install -m 0644 "$repo/deploy/nginx.kolibri.alignment.id.conf" \
  /etc/nginx/sites-enabled/kolibri.alignment.id.conf
/usr/sbin/nginx -t
/bin/systemctl restart kolibri-waitlist.service
/bin/systemctl reload nginx
