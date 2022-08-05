#  ./init.sh setup ~/Documents/development/matic/v3 --data-dir-path ~/borv3 -v 3
if [ ! -d "./dist" ]; then
    npm install
    npm run compile  
fi
node dist/init.js "$@"