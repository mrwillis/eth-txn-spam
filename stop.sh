echo "Stopping all spam containers"
docker rm $(docker stop $(docker ps -a -q --filter ancestor=txn-spam --format="{{.ID}}"))
