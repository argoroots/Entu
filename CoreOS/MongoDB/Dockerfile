############################################################
# Dockerfile to build MongoDB container images for Entu
############################################################

FROM debian:stable

MAINTAINER Argo Roots <argo@roots.ee>

# Import MongoDB public GPG key AND create a MongoDB list file
RUN apt-key adv --keyserver keyserver.ubuntu.com --recv 7F0CEB10 && echo "deb http://repo.mongodb.org/apt/debian "$(lsb_release -sc)"/mongodb-org/3.0 main" | tee /etc/apt/sources.list.d/mongodb-org-3.0.list

# Update apt-get sources AND install MongoDB
RUN apt-get update && apt-get install -y mongodb-org

# Create the MongoDB data directory
RUN mkdir -p /data/db
VOLUME /data/db

# Expose port #27017 from the container to the host
EXPOSE 27017

# Set /usr/bin/mongod as the dockerized entry-point application
ENTRYPOINT ["/usr/bin/mongod"]
