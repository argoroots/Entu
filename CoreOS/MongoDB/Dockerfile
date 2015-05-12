############################################################
# Dockerfile to build MongoDB container images for Entu
############################################################

FROM ubuntu:14.04

MAINTAINER Argo Roots <argo@roots.ee>

# Set New Relic license key
ENV NEW_RELIC_LICENSE_KEY YOUR_LICENSE_KEY

# Configure the New Relic apt repository and trust the New Relic GPG key
RUN echo "deb http://apt.newrelic.com/debian/ newrelic non-free" >> /etc/apt/sources.list.d/newrelic.list && wget -O- https://download.newrelic.com/548C16BF.gpg | apt-key add -

# Import MongoDB public GPG key and create a MongoDB list file
RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10 && echo "deb http://repo.mongodb.org/apt/ubuntu "$(lsb_release -sc)"/mongodb-org/3.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-3.0.list

# Update apt-get sources and install MongoDB and New Relic monitor
RUN apt-get update && apt-get install -y mongodb-org newrelic-sysmond

# Expose port #27017 from the container to the host
EXPOSE 27017

# Add New Relic license key to config file, start the New Relic daemon and start /usr/bin/mongod as dockerized entry-point application
ENTRYPOINT nrsysmond-config --set license_key=$NEW_RELIC_LICENSE_KEY && /etc/init.d/newrelic-sysmond start && /usr/bin/mongod
