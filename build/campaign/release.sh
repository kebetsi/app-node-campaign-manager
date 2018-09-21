#!/bin/bash
set -e
source /pd_build/buildconfig

target_dir="/app/bin"
log_dir="/app/log"
conf_dir="/app/conf"

header "Install application from release.tar"

run mkdir -p $target_dir
run chown app $target_dir

# Unpack the application and run npm install.
cd $target_dir
run run tar -x --owner app -f \
  /pd_build/release.tar .

PYTHON=$(which python2.7) NODE_ENV=production run yarn install --prod --ignore-engines

# Perform a release build of the source code. (-> lib)
run npm run release
rm -r source && mv lib source

# Copy the config file
run mkdir -p $conf_dir && \
  cp /pd_build/config/campaign.json $conf_dir/campaign.json

# Create the log dir
run mkdir -p $log_dir && \
  touch $log_dir/campaign.log && chown -R app:app $log_dir

# Install the script that runs the campaign service
run mkdir /etc/service/campaign
run cp /pd_build/runit/campaign /etc/service/campaign/run

# Enable CRON for nightly job
run rm /etc/service/cron/down
