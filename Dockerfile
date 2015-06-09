FROM google/nodejs-runtime
ADD install.sh /app
RUN bash install.sh

