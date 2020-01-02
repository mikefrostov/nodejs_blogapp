docker build -t mymongo .
docker run --name mongo-dev -d -v /opt/mongodb:/data/db -p 27017:27017 mymongo
